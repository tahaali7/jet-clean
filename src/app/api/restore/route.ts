import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'معرف النسخة مطلوب' }, { status: 400 })

    const backupFile = await db.backupFile.findUnique({ where: { id } })
    if (!backupFile) return NextResponse.json({ error: 'النسخة الاحتياطية غير موجودة' }, { status: 404 })

    const backup = JSON.parse(backupFile.data)
    const data = backup.data

    // Delete existing data
    await db.record.deleteMany({})
    await db.carEntry.deleteMany({})
    await db.workerExpense.deleteMany({})
    await db.treasury.deleteMany({})
    await db.closedDay.deleteMany({})
    await db.employee.deleteMany({})
    await db.branch.deleteMany({})
    await db.adminAccount.deleteMany({})

    // Restore in order
    for (const branch of data.branches || []) {
      await db.branch.create({ data: { id: branch.id, name: branch.name } })
    }
    for (const admin of data.adminAccount || []) {
      await db.adminAccount.create({ data: { id: admin.id, name: admin.name, password: admin.password } })
    }
    for (const emp of data.employees || []) {
      await db.employee.create({
        data: {
          id: emp.id, name: emp.name, branchId: emp.branchId, shift: emp.shift,
          password: emp.password || '', role: emp.role || 'employee', hasLogin: emp.hasLogin ?? false
        }
      })
    }
    for (const entry of data.carEntries || []) {
      await db.carEntry.create({
        data: {
          id: entry.id, date: entry.date, branchId: entry.branchId, empId: entry.empId, empName: entry.empName,
          room: entry.room, totalCars: entry.totalCars || 0, totalAmount: entry.totalAmount || 0,
          extraCars: entry.extraCars || 0, extraAmount: entry.extraAmount || 0,
          priceCounts: entry.priceCounts || '{}', customPrices: entry.customPrices || '{}',
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
        }
      })
    }
    for (const we of data.workerExpenses || []) {
      await db.workerExpense.create({
        data: { id: we.id, date: we.date, branchId: we.branchId, amount: we.amount || 0, note: we.note || '', jsonData: we.jsonData || null }
      })
    }
    for (const tr of data.treasuries || []) {
      await db.treasury.create({
        data: { id: tr.id, date: tr.date, branchId: tr.branchId, total: tr.total || 0, cash: tr.cash || 0, later: tr.later || 0 }
      })
    }
    for (const rec of data.records || []) {
      await db.record.create({
        data: { id: rec.id, empId: rec.empId, type: rec.type, amount: rec.amount, note: rec.note || '', date: rec.date, branchId: rec.branchId }
      })
    }
    for (const cd of data.closedDays || []) {
      await db.closedDay.create({ data: { id: cd.id, date: cd.date, branchId: cd.branchId } })
    }

    return NextResponse.json({ success: true, message: 'تمت الاستعادة بنجاح' })
  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: 'خطأ في الاستعادة: ' + error.message }, { status: 500 })
  }
}
