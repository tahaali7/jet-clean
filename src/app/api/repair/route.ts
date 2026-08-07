import { NextResponse } from 'next/server'
import { db, forceMigrations } from '@/lib/db'

// GET: فحص شامل للبيانات
export async function GET() {
  const report: any = {}

  // ===== 1. تشغيل الترحيل =====
  try {
    await forceMigrations()
    report.migration = 'OK'
  } catch (e: any) {
    report.migration = 'FAILED: ' + (e?.message || e)
    return NextResponse.json({ success: false, report })
  }

  // ===== 2. فحص البيانات بالـ SQL المباشر =====
  try {
    const raw: any[] = await db.$queryRawUnsafe(
      `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "priceCounts", "createdAt" FROM "CarEntry" ORDER BY "createdAt" DESC`
    )
    report.rawCount = raw.length

    // تجميع حسب التاريخ والموظف
    const summary: any = {}
    for (const r of raw) {
      const key = `${r.date} | ${r.empName} | ${r.room}`
      summary[key] = { id: r.id, cars: r.totalCars, amount: r.totalAmount }
    }
    report.entries = summary

    // فحص الأعمدة الموجودة فعلياً
    const columns: any[] = await db.$queryRawUnsafe(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'CarEntry' ORDER BY ordinal_position`
    )
    report.columns = columns.map((c: any) => c.column_name)
  } catch (e: any) {
    report.rawError = e?.message || String(e)
  }

  // ===== 3. فحص الباكب =====
  try {
    const backups: any[] = await db.$queryRawUnsafe(
      `SELECT id, label, "createdAt" FROM "BackupFile" ORDER BY "createdAt" DESC LIMIT 5`
    )
    report.backups = backups
  } catch (e: any) {
    report.backupsError = e?.message || String(e)
  }

  return NextResponse.json({ success: true, report })
}

// POST: استعادة من آخر باكب
export async function POST() {
  try {
    // جلب آخر باكب
    const backups: any[] = await db.$queryRawUnsafe(
      `SELECT id, label, data, "createdAt" FROM "BackupFile" ORDER BY "createdAt" DESC LIMIT 1`
    )

    if (backups.length === 0) {
      return NextResponse.json({ success: false, error: 'لا يوجد نسخ احتياطية' })
    }

    const backup = backups[0]
    let backupData: any
    try {
      backupData = JSON.parse(backup.data)
    } catch {
      return NextResponse.json({ success: false, error: 'النسخة الاحتياطية تالفة' })
    }

    // تشغيل الترحيل
    await forceMigrations()

    // استعادة CarEntry
    const carEntries = backupData.carEntries || []
    let restored = 0
    for (const entry of carEntries) {
      try {
        const eid = String(entry.id || '').replace(/'/g, "''")
        const existing: any[] = await db.$queryRawUnsafe(`SELECT id FROM "CarEntry" WHERE id = '${eid}'`)
        if (existing.length === 0) {
          const vals = {
            id: String(entry.id || ''),
            date: String(entry.date || ''),
            branchId: String(entry.branchId || ''),
            empId: String(entry.empId || ''),
            empName: String(entry.empName || ''),
            room: String(entry.room || ''),
            totalCars: Number(entry.totalCars) || 0,
            totalAmount: Number(entry.totalAmount) || 0,
            extraCars: Number(entry.extraCars) || 0,
            extraAmount: Number(entry.extraAmount) || 0,
            priceCounts: JSON.stringify(entry.priceCounts || {}),
            customPrices: JSON.stringify(entry.customPrices || {}),
            entryTime: String(entry.entryTime || ''),
            createdAt: String(entry.createdAt || new Date().toISOString())
          }
          await db.$queryRawUnsafe(
            `INSERT INTO "CarEntry" (id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "entryTime", "createdAt")
             VALUES ('${vals.id.replace(/'/g, "''")}', '${vals.date.replace(/'/g, "''")}', '${vals.branchId.replace(/'/g, "''")}', '${vals.empId.replace(/'/g, "''")}', '${vals.empName.replace(/'/g, "''")}', '${vals.room.replace(/'/g, "''")}', ${vals.totalCars}, ${vals.totalAmount}, ${vals.extraCars}, ${vals.extraAmount}, '${vals.priceCounts.replace(/'/g, "''")}', '${vals.customPrices.replace(/'/g, "''")}', '${vals.entryTime.replace(/'/g, "''")}', '${vals.createdAt.replace(/'/g, "''")}')
             ON CONFLICT (id) DO NOTHING`
          )
          restored++
        }
      } catch (e: any) {
        console.error('Restore error:', e?.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم فحص ${carEntries.length} سجل، استعيد ${restored} سجل مفقود`,
      backupDate: backup.createdAt,
      totalInBackup: carEntries.length,
      restored
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'فشل الاستعادة' })
  }
}
