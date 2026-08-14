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

    if (mode === 'backup-data' && searchParams.get('id')) {
      const id = searchParams.get('id')!
      const backup = await db.backupFile.findUnique({ where: { id } })
      if (!backup) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const parsed = JSON.parse(backup.data)
      const bData = parsed.data || parsed
      return NextResponse.json({
        id: backup.id,
        label: backup.label,
        counts: {
          branches: (bData.branches || []).length,
          employees: (bData.employees || []).length,
          carEntries: (bData.carEntries || []).length,
          workerExpenses: (bData.workerExpenses || []).length,
          treasuries: (bData.treasuries || []).length,
          records: (bData.records || []).length,
          closedDays: (bData.closedDays || []).length
        }
      })
    }

    // وضع restore-by-id: استعادة نسخة احتياطية محددة
    if (mode === 'restore-backup' && searchParams.get('id')) {
      const id = searchParams.get('id')!
      const backup = await db.backupFile.findUnique({ where: { id } })
      if (!backup) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const parsed = JSON.parse(backup.data)
      const bData = parsed.data || parsed

      // حذف البيانات الحالية
      try { await db.record.deleteMany({}) } catch {}
      try { await db.carEntry.deleteMany({}) } catch {}
      try { await db.workerExpense.deleteMany({}) } catch {}
      try { await db.treasury.deleteMany({}) } catch {}
      try { await db.closedDay.deleteMany({}) } catch {}
      try { await db.employee.deleteMany({}) } catch {}
      try { await db.branch.deleteMany({}) } catch {}

      // إعادة إنشاء الفروع
      for (const branch of (bData.branches || [])) {
        try {
          await db.branch.create({
            data: {
              id: branch.id,
              name: branch.name,
              ...(branch.config ? { config: branch.config } : {})
            }
          })
        } catch (e: any) { console.error('Branch:', e.message) }
      }

      // إعادة إنشاء الموظفين
      for (const emp of (bData.employees || [])) {
        try {
          const empData: Record<string, unknown> = {
            id: emp.id,
            name: emp.name,
            shift: emp.shift || '',
            password: emp.password || '',
          }
          if (emp.branchId !== undefined && emp.branchId !== null) empData.branchId = emp.branchId
          if (emp.role) empData.role = emp.role
          if (emp.hasLogin !== undefined) empData.hasLogin = emp.hasLogin
          if (emp.multiBranchIds) empData.multiBranchIds = emp.multiBranchIds
          if (emp.startDate) empData.startDate = emp.startDate
          if (emp.endDate) empData.endDate = emp.endDate
          if (emp.deleted !== undefined) empData.deleted = emp.deleted
          await db.employee.create({ data: empData as any })
        } catch (e: any) { console.error('Employee:', e.message) }
      }

      // إعادة إنشاء السيارات
      for (const entry of (bData.carEntries || [])) {
        try {
          await db.carEntry.create({
            data: {
              id: entry.id, date: entry.date, branchId: entry.branchId,
              empId: entry.empId, empName: entry.empName, room: entry.room,
              totalCars: entry.totalCars || 0, totalAmount: entry.totalAmount || 0,
              extraCars: entry.extraCars || 0, extraAmount: entry.extraAmount || 0,
              priceCounts: entry.priceCounts || '{}', customPrices: entry.customPrices || '{}',
              entryTime: entry.entryTime || '',
              createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
            }
          })
        } catch (e: any) { console.error('CarEntry:', e.message) }
      }

      // إعادة إنشاء المصروفات
      for (const we of (bData.workerExpenses || [])) {
        try {
          await db.workerExpense.create({
            data: {
              id: we.id, date: we.date, branchId: we.branchId,
              amount: we.amount || 0, note: we.note || '',
              jsonData: we.jsonData || null
            }
          })
        } catch (e: any) { console.error('WorkerExpense:', e.message) }
      }

      // إعادة إنشاء الخزينة
      for (const tr of (bData.treasuries || [])) {
        try {
          await db.treasury.create({
            data: {
              id: tr.id, date: tr.date, branchId: tr.branchId,
              total: tr.total || 0, cash: tr.cash || 0, later: tr.later || 0
            }
          })
        } catch (e: any) { console.error('Treasury:', e.message) }
      }

      // إعادة إنشاء السجلات
      for (const rec of (bData.records || [])) {
        try {
          await db.record.create({
            data: {
              id: rec.id, empId: rec.empId, type: rec.type,
              amount: rec.amount, note: rec.note || '',
              date: rec.date, branchId: rec.branchId
            }
          })
        } catch (e: any) { console.error('Record:', e.message) }
      }

      // إعادة إنشاء الأيام المقفلة
      for (const cd of (bData.closedDays || [])) {
        try {
          await db.closedDay.create({
            data: { id: cd.id, date: cd.date, branchId: cd.branchId }
          })
        } catch (e: any) { console.error('ClosedDay:', e.message) }
      }

      return NextResponse.json({
        success: true,
        message: 'تمت الاستعادة من النسخة الاحتياطية',
        label: backup.label,
        counts: {
          branches: (bData.branches || []).length,
          employees: (bData.employees || []).length,
          carEntries: (bData.carEntries || []).length,
          workerExpenses: (bData.workerExpenses || []).length,
          treasuries: (bData.treasuries || []).length,
          records: (bData.records || []).length,
          closedDays: (bData.closedDays || []).length
        }
      })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
