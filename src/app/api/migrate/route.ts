import { NextResponse } from 'next/server'
import { db, forceMigrations } from '@/lib/db'

export async function GET() {
  const result: any = { steps: [] }

  // الخطوة 1: فحص اتصال قاعدة البيانات
  try {
    const branches = await db.branch.findMany({ take: 1 })
    result.steps.push({ step: 'DB Connection', ok: true, msg: `Connected, ${branches.length} branches` })
  } catch (error: any) {
    result.steps.push({ step: 'DB Connection', ok: false, msg: error?.message || String(error) })
    return NextResponse.json({ success: false, result })
  }

  // الخطوة 2: فحص جدول CarEntry بدون استعلام entryTime
  try {
    const entries = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "CarEntry"`)
    const count = (entries as any[])[0]?.count || 0
    result.steps.push({ step: 'CarEntry table', ok: true, msg: `${count} entries exist` })
  } catch (error: any) {
    result.steps.push({ step: 'CarEntry table', ok: false, msg: error?.message || String(error) })
    return NextResponse.json({ success: false, result })
  }

  // الخطوة 3: فحص هل عمود entryTime موجود
  try {
    const cols = await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'CarEntry' AND column_name = 'entryTime'`)
    const exists = (cols as any[]).length > 0
    result.steps.push({ step: 'entryTime column exists', ok: exists, msg: exists ? 'Column exists' : 'Column NOT found' })
  } catch (error: any) {
    result.steps.push({ step: 'entryTime column check', ok: false, msg: error?.message || String(error) })
  }

  // الخطوة 4: محاولة إضافة العمود بـ pg مباشرة
  try {
    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
    if (dbUrl.startsWith('postgres')) {
      let url = dbUrl
      // تحويل رابط pooler إلى رابط مباشر
      try {
        const parsed = new URL(dbUrl)
        if (parsed.hostname.includes('-pooler')) {
          parsed.hostname = parsed.hostname.replace('-pooler', '')
          parsed.port = '5432'
          parsed.searchParams.delete('pgbouncer')
          url = parsed.toString()
        }
      } catch {}

      const pg = await import('pg')
      const client = new pg.Client({
        connectionString: url,
        ssl: url.includes('sslmode') || url.includes('@ep-') ? { rejectUnauthorized: false } : undefined
      })
      await client.connect()

      try {
        await client.query(`ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "entryTime" TEXT NOT NULL DEFAULT ''`)
        result.steps.push({ step: 'Add entryTime (pg direct)', ok: true, msg: 'Column added successfully' })
      } catch (alterErr: any) {
        result.steps.push({ step: 'Add entryTime (pg direct)', ok: false, msg: alterErr?.message || String(alterErr) })

        // محاولة بـ Prisma
        try {
          await db.$executeRawUnsafe(`ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "entryTime" TEXT NOT NULL DEFAULT ''`)
          result.steps.push({ step: 'Add entryTime (prisma)', ok: true, msg: 'Column added via Prisma' })
        } catch (pErr: any) {
          result.steps.push({ step: 'Add entryTime (prisma)', ok: false, msg: pErr?.message || String(pErr) })
        }
      }

      // تشغيل باقي الترحيلات
      const otherMigrations = [
        `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hasLogin" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'employee'`,
        `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "startDate" TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "endDate" TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "multiBranchIds" TEXT NOT NULL DEFAULT '[]'`,
        `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "config" TEXT`,
        `ALTER TABLE "WorkerExpense" ADD COLUMN IF NOT EXISTS "jsonData" TEXT`,
      ]
      for (const sql of otherMigrations) {
        try { await client.query(sql) } catch {}
      }

      await client.end()
    } else {
      result.steps.push({ step: 'Add entryTime', ok: false, msg: 'No postgres URL found' })
    }
  } catch (error: any) {
    result.steps.push({ step: 'pg connection', ok: false, msg: error?.message || String(error) })
  }

  // الخطوة 5: إعادة فحص Prisma بعد الترحيل
  try {
    const entries = await db.carEntry.findMany({ take: 3, orderBy: { createdAt: 'desc' } })
    result.steps.push({ step: 'Prisma query OK', ok: true, msg: `Found ${entries.length} entries, first: ${entries[0]?.empName || 'none'} - ${entries[0]?.room || ''}` })
  } catch (error: any) {
    result.steps.push({ step: 'Prisma query', ok: false, msg: error?.message || String(error) })
  }

  // تشغيل forceMigrations كمان
  try { await forceMigrations() } catch {}

  return NextResponse.json({ success: true, result })
}
