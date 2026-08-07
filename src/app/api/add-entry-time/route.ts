import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function esc(s: string) { return String(s || '').replace(/'/g, "''") }

export async function GET() {
  try {
    // 1. فحص هل العمود موجود
    const cols: any[] = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'CarEntry' AND column_name = 'entryTime'`
    )

    if (cols.length > 0) {
      return NextResponse.json({ success: true, message: 'عمود entryTime موجود بالفعل' })
    }

    // 2. باكب تلقائي لكل البيانات قبل التعديل
    const entries = await db.$queryRawUnsafe(
      `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "createdAt"
       FROM "CarEntry" ORDER BY "createdAt" DESC`
    )
    const records = await db.$queryRawUnsafe(
      `SELECT id, "empId", type, amount, note, date, "branchId" FROM "Record" ORDER BY date DESC`
    )
    const employees = await db.$queryRawUnsafe(
      `SELECT id, name, "branchId", shift, password, role, "hasLogin", "startDate", "endDate", "multiBranchIds", deleted FROM "Employee"`
    )

    const backupData = JSON.stringify({ carEntries: entries, records, employees, timestamp: new Date().toISOString() })

    await db.$executeRawUnsafe(
      `INSERT INTO "BackupFile" (id, label, data, "createdAt") VALUES (gen_random_uuid()::text, 'auto-before-entryTime', '${esc(backupData)}', NOW())`
    )

    // 3. محاولة إضافة العمود
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "CarEntry" ADD COLUMN "entryTime" TEXT NOT NULL DEFAULT ''`
      )
      return NextResponse.json({
        success: true,
        message: 'تم إضافة عمود entryTime بنجاح مع باكب تلقائي',
        backedUpRows: entries.length
      })
    } catch (alterError: any) {
      return NextResponse.json({
        success: false,
        message: 'تم حفظ الباكب بنجاح لكن فشل إضافة العمود بسبب PgBouncer. يرجى إضافة العمود يدوياً من لوحة تحكم Supabase:',
        sql: `ALTER TABLE "CarEntry" ADD COLUMN "entryTime" TEXT NOT NULL DEFAULT '';`,
        backedUpRows: entries.length,
        error: alterError?.message
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message
    }, { status: 500 })
  }
}
