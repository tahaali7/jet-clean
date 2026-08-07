import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// دالة فحص: هل الفرع مستهدف في التنبيه؟
// branchId في الداتا: null = كل الفروع، "id1" = فرع واحد، '["id1","id2"]' = عدة فروع
function isBranchTargeted(notifBranchId: string | null, empBranchId: string): boolean {
  if (!notifBranchId) return true // كل الفروع
  try {
    const parsed = JSON.parse(notifBranchId)
    if (Array.isArray(parsed)) return parsed.includes(empBranchId)
  } catch {}
  return notifBranchId === empBranchId // فرع واحد
}

// تحويل branchId لعرض مناسب
function parseNotif(entry: any) {
  let readBy: string[] = []
  try { readBy = JSON.parse(entry.readBy || '[]') } catch {}
  return {
    ...entry,
    readBy,
    createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const empId = searchParams.get('empId')
    const branchId = searchParams.get('branchId')
    const all = searchParams.get('all')

    if (all === 'true') {
      const entries = await db.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
      })
      return NextResponse.json(entries.map(parseNotif))
    }

    // الموظف: يجلب كل الإشعارات ثم يفلتر
    const entries = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // فلترة حسب الفرع
    const filtered = entries.filter(n => isBranchTargeted(n.branchId, branchId || ''))

    // فلترة: يبقى فقط الإشعارات اللي الموظف ما قرأها
    if (empId) {
      const unread = filtered.filter((n: any) => {
        try {
          const readBy: string[] = JSON.parse(n.readBy || '[]')
          return !readBy.includes(empId)
        } catch { return true }
      })
      return NextResponse.json(unread.map(parseNotif))
    }

    return NextResponse.json(filtered.map(parseNotif))
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { message, branchIds, type, createdBy } = data

    if (!message?.trim()) {
      return NextResponse.json({ error: 'الرجاء كتابة نص التنبيه' }, { status: 400 })
    }

    // branchIds: مصفوفة أو null (كل الفروع)
    let branchIdValue: string | null = null
    if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
      branchIdValue = JSON.stringify(branchIds)
    }

    const entry = await db.notification.create({
      data: {
        message: message.trim(),
        branchId: branchIdValue,
        type: type || 'normal',
        createdBy: createdBy || ''
      }
    })

    return NextResponse.json(parseNotif(entry))
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال التنبيه' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, empId } = data

    if (!id || !empId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const entry = await db.notification.findUnique({ where: { id } })
    if (!entry) {
      return NextResponse.json({ error: 'التنبيه غير موجود' }, { status: 404 })
    }

    let readBy: string[] = []
    try { readBy = JSON.parse(entry.readBy || '[]') } catch {}
    if (!readBy.includes(empId)) readBy.push(empId)

    await db.notification.update({
      where: { id },
      data: { readBy: JSON.stringify(readBy) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'معرف مطلوب' }, { status: 400 })
    await db.notification.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
