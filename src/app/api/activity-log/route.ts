import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// جلب سجل النشاطات
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')))

    const where: Record<string, unknown> = {}
    if (branchId) where.branchId = branchId
    if (userId) where.userId = userId
    if (category) where.category = category

    const [entries, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.activityLog.count({ where })
    ])

    return NextResponse.json({
      entries: entries.map(e => ({
        id: e.id,
        userId: e.userId,
        userName: e.userName,
        userRole: e.userRole,
        branchId: e.branchId,
        branchName: e.branchName,
        action: e.action,
        category: e.category,
        details: e.details,
        ip: e.ip,
        createdAt: e.createdAt.toISOString()
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Get activity log error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// إضافة سجل نشاط جديد
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { userId, userName, userRole, branchId, branchName, action, category, details, ip } = data

    if (!userId || !action || !category) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const entry = await db.activityLog.create({
      data: {
        userId,
        userName,
        userRole,
        branchId: branchId || null,
        branchName: branchName || null,
        action,
        category,
        details: details || '',
        ip: ip || ''
      }
    })

    return NextResponse.json({ success: true, id: entry.id })
  } catch (error) {
    console.error('Create activity log error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حذف سجلات النشاطات (حسب العمر أو الكل)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const olderThan = searchParams.get('olderThan')
    const all = searchParams.get('all')

    if (all === 'true') {
      await db.activityLog.deleteMany()
      return NextResponse.json({ success: true, deleted: 'all' })
    }

    if (olderThan) {
      const days = parseInt(olderThan)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      await db.activityLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } }
      })
      return NextResponse.json({ success: true, deleted: `older_than_${days}_days` })
    }

    return NextResponse.json({ error: 'لم يتم تحديد معايير الحذف' }, { status: 400 })
  } catch (error) {
    console.error('Delete activity log error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
