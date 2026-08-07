import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function esc(s: string) { return String(s || '').replace(/'/g, "''") }

// فحص وإنشاء جدول سجل النشاطات تلقائياً
let tableReady: boolean | null = null
async function ensureTable() {
  if (tableReady === true) return
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "userName" TEXT NOT NULL,
        "userRole" TEXT NOT NULL,
        "branchId" TEXT,
        "branchName" TEXT,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        details TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    // محاولة إنشاء الفهارس (لو فشلت ما تمنع العمل)
    try { await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_activity_createdAt" ON "ActivityLog" ("createdAt")`) } catch {}
    try { await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_activity_branchId" ON "ActivityLog" ("branchId")`) } catch {}
    try { await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_activity_userId" ON "ActivityLog" ("userId")`) } catch {}
    tableReady = true
  } catch (e) {
    console.error('Failed to create ActivityLog table:', e)
    tableReady = false
    throw e
  }
}

// جلب سجل النشاطات
export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')))

    const conditions: string[] = ['1=1']
    const params: string[] = []
    let paramIdx = 1

    if (branchId) { conditions.push(`"branchId" = $${paramIdx}`); params.push(branchId); paramIdx++ }
    if (userId) { conditions.push(`"userId" = $${paramIdx}`); params.push(userId); paramIdx++ }
    if (category) { conditions.push(`category = $${paramIdx}`); params.push(category); paramIdx++ }
    if (from) { conditions.push(`"createdAt" >= $${paramIdx}`); params.push(from); paramIdx++ }
    if (to) { conditions.push(`"createdAt" <= $${paramIdx}`); params.push(to); paramIdx++ }

    const where = 'WHERE ' + conditions.join(' AND ')
    const offset = (page - 1) * limit

    const entries: any[] = await db.$queryRawUnsafe(
      `SELECT id, "userId", "userName", "userRole", "branchId", "branchName", action, category, details, ip, "createdAt" FROM "ActivityLog" ${where} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`,
      ...params
    )

    // جلب العدد الكلي
    const countResult: any[] = await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int as total FROM "ActivityLog" ${where}`,
      ...params
    )
    const total = Number(countResult[0]?.total) || 0

    return NextResponse.json({
      entries: entries.map((e: any) => ({
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
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString()
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Get activity log error:', error)
    return NextResponse.json({ error: 'حدث خطأ', details: String(error) }, { status: 500 })
  }
}

// إضافة سجل نشاط جديد
export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const data = await req.json()
    const { userId, userName, userRole, branchId, branchName, action, category, details, ip } = data

    if (!userId || !action || !category) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const newId = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)

    await db.$executeRawUnsafe(
      `INSERT INTO "ActivityLog" (id, "userId", "userName", "userRole", "branchId", "branchName", action, category, details, ip, "createdAt")
       VALUES ('${esc(newId)}', '${esc(userId)}', '${esc(userName)}', '${esc(userRole)}',
        ${branchId ? `'${esc(branchId)}'` : 'NULL'}, ${branchName ? `'${esc(branchName)}'` : 'NULL'},
        '${esc(action)}', '${esc(category)}', '${esc(details || '')}', '${esc(ip || '')}', NOW())`
    )

    return NextResponse.json({ success: true, id: newId })
  } catch (error) {
    console.error('Create activity log error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

// حذف سجلات النشاطات (حسب العمر أو الكل)
export async function DELETE(req: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const olderThan = searchParams.get('olderThan') // عدد الأيام
    const all = searchParams.get('all')

    if (all === 'true') {
      await db.$executeRawUnsafe(`DELETE FROM "ActivityLog"`)
      return NextResponse.json({ success: true, deleted: 'all' })
    }

    if (olderThan) {
      const days = parseInt(olderThan)
      await db.$executeRawUnsafe(`DELETE FROM "ActivityLog" WHERE "createdAt" < NOW() - INTERVAL '${days} days'`)
      return NextResponse.json({ success: true, deleted: `older_than_${days}_days` })
    }

    return NextResponse.json({ error: 'لم يتم تحديد معايير الحذف' }, { status: 400 })
  } catch (error) {
    console.error('Delete activity log error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
