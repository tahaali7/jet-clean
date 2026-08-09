import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Export all data from all tables
    const [branches, employees, carEntries, workerExpenses, treasuries, records, closedDays, adminAccount] = await Promise.all([
      db.branch.findMany(),
      db.employee.findMany(),
      db.carEntry.findMany(),
      db.workerExpense.findMany(),
      db.treasury.findMany(),
      db.record.findMany(),
      db.closedDay.findMany(),
      db.adminAccount.findMany()
    ])

    const backup = {
      version: 1,
      date: new Date().toISOString(),
      data: {
        branches,
        employees,
        carEntries,
        workerExpenses,
        treasuries,
        records,
        closedDays,
        adminAccount
      }
    }

    // Delete old backups (keep only 5 latest)
    const existing = await db.backupFile.findMany({ orderBy: { createdAt: 'desc' } })
    for (let i = 4; i < existing.length; i++) {
      await db.backupFile.delete({ where: { id: existing[i].id } })
    }

    // Save backup to database
    const saved = await db.backupFile.create({
      data: {
        data: JSON.stringify(backup),
        label: `نسخة - ${new Date().toLocaleDateString('ar-LY')}`
      }
    })

    return NextResponse.json({ success: true, message: 'تم النسخ الاحتياطي بنجاح', id: saved.id, label: saved.label, records: {
      branches: branches.length,
      employees: employees.length,
      carEntries: carEntries.length,
      records: records.length
    }})
  } catch (error: any) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'حدث خطأ في النسخ الاحتياطي: ' + error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const backups = await db.backupFile.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, label: true, createdAt: true }
    })
    return NextResponse.json({ backups })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
