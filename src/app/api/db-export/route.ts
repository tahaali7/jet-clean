import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ⚠️ TEMPORARY endpoint — احذفه بعد استعادة البيانات
// يُرجع بيانات أحدث نسخة احتياطية أو بيانات الحالية
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'current'

    if (mode === 'current') {
      // جلب البيانات الحالية مباشرة
      const [branches, employees, carEntries, workerExpenses, treasuries, records, closedDays] = await Promise.all([
        db.branch.findMany(),
        db.employee.findMany(),
        db.carEntry.findMany(),
        db.workerExpense.findMany(),
        db.treasury.findMany(),
        db.record.findMany(),
        db.closedDay.findMany()
      ])

      return NextResponse.json({
        mode: 'current',
        counts: {
          branches: branches.length,
          employees: employees.length,
          carEntries: carEntries.length,
          workerExpenses: workerExpenses.length,
          treasuries: treasuries.length,
          records: records.length,
          closedDays: closedDays.length
        }
      })
    }

    if (mode === 'backup-list') {
      const backups = await db.backupFile.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, label: true, createdAt: true }
      })
      return NextResponse.json({ backups })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
