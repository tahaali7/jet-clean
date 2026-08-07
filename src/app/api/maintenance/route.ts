import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// فحص وإنشاء جدول الصيانة تلقائياً
let tableReady: boolean | null = null
async function ensureTable() {
  if (tableReady === true) return
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Maintenance" (
        id TEXT PRIMARY KEY DEFAULT 'main',
        enabled BOOLEAN DEFAULT false,
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `)
    // إدراج صف افتراضي
    await db.$executeRawUnsafe(`
      INSERT INTO "Maintenance" (id, enabled) SELECT 'main', false
      WHERE NOT EXISTS (SELECT 1 FROM "Maintenance" WHERE id = 'main')
    `)
    tableReady = true
  } catch (e) {
    console.error('Failed to create Maintenance table:', e)
    tableReady = false
    throw e
  }
}

// GET: فحص حالة الصيانة
export async function GET() {
  try {
    await ensureTable()
    const rows: any[] = await db.$queryRawUnsafe(
      `SELECT enabled, "updatedAt" FROM "Maintenance" WHERE id = 'main'`
    )
    if (rows.length === 0) {
      return NextResponse.json({ enabled: false })
    }
    return NextResponse.json({ enabled: rows[0].enabled === true })
  } catch (error) {
    // لو الجدول ما اشتغل، رجّع false عشان ما يوقف الموقع
    return NextResponse.json({ enabled: false })
  }
}

// PUT: تشغيل/إيقاف الصيانة
export async function PUT(req: NextRequest) {
  try {
    await ensureTable()
    const data = await req.json()
    const enabled = data.enabled === true

    await db.$executeRawUnsafe(
      `UPDATE "Maintenance" SET enabled = ${enabled}, "updatedAt" = NOW() WHERE id = 'main'`
    )

    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('Toggle maintenance error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
