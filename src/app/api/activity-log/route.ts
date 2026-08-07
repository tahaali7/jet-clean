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
    // إضافة فهرس للبحث السريع حسب التاريخ والفرع
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_activity_log_createdAt" ON "ActivityLog" ("createdAt" DESC)
    `)
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_activity_log_branchId" ON "ActivityLog" ("branchId")
    `)
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_activity_log_userId" ON "ActivityLog" ("userId")
    `)
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    let where = 'WHERE 1=1'
    if (branchId) where += ` AND "branchId" = '${esc(branchId)}'`
    if (userId) where += ` AND "userId" = '${esc(userId)}'`
    if (category) where += ` AND category = '${esc(category)}'`
    if (from) where += ` AND "createdAt" >= '${esc(from)}'`
    if (to) where += ` AND "createdAt" <= '${esc(to)}'`

    const offset = (page - 1) * limit

    const entries: any[] = await db.$queryRawUnsafe(
      `SELECT * FROM "ActivityLog" ${where} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`
    )

    // جلب العدد الكلي
    const countResult: any[] = await db.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "ActivityLog" ${where}`
    )
    const total = countResult[0]?.total || 0

    return NextResponse.json({
      entries: entries.map((e: any) => ({
        ...e,
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString()
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
