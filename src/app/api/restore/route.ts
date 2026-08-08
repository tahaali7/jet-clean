import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// دالة مشتركة لاستعادة الداتا
async function restoreData(data: any) {
  // Delete existing data (order matters for foreign keys)
  try { await db.record.deleteMany({}) } catch {}
  try { await db.carEntry.deleteMany({}) } catch {}
  try { await db.workerExpense.deleteMany({}) } catch {}
  try { await db.treasury.deleteMany({}) } catch {}
  try { await db.closedDay.deleteMany({}) } catch {}
  try { await db.employee.deleteMany({}) } catch {}
  try { await db.branch.deleteMany({}) } catch {}
  try { await db.adminAccount.deleteMany({}) } catch {}

  // Restore branches (include config if exists)
  for (const branch of data.branches || []) {
    try {
      await db.branch.create({
        data: {
          id: branch.id, name: branch.name,
          ...(branch.config ? { config: branch.config } : {})
        }
      })
    } catch (e: any) {
      console.error('Restore branch error:', branch.name, e.message)
    }
  }
  // Restore admin accounts
  for (const admin of (data.adminAccounts || data.adminAccount || [])) {
    try {
      await db.adminAccount.create({ data: { id: admin.id, name: admin.name, password: admin.password } })
    } catch (e: any) {
      console.error('Restore admin error:', e.message)
    }
  }
  // Restore employees with flexible field handling
  for (const emp of data.employees || []) {
    try {
      const empData: Record<string, unknown> = {
        id: emp.id,
        name: emp.name,
        shift: emp.shift || '',
        password: emp.password || '',
      }
      // Only set branchId if it exists in the backup
      if (emp.branchId !== undefined && emp.branchId !== null) empData.branchId = emp.branchId
      if (emp.role) empData.role = emp.role
      if (emp.hasLogin !== undefined) empData.hasLogin = emp.hasLogin
      if (emp.multiBranchIds) empData.multiBranchIds = emp.multiBranchIds
      if (emp.startDate) empData.startDate = emp.startDate
      if (emp.endDate) empData.endDate = emp.endDate
      if (emp.deleted !== undefined) empData.deleted = emp.deleted
      await db.employee.create({ data: empData as any })
    } catch (e: any) {
      console.error('Restore employee error:', emp.name, e.message)
    }
  }
  for (const entry of data.carEntries || []) {
    await db.carEntry.create({
      data: {
        id: entry.id, date: entry.date, branchId: entry.branchId, empId: entry.empId, empName: entry.empName,
        room: entry.room, totalCars: entry.totalCars || 0, totalAmount: entry.totalAmount || 0,
        extraCars: entry.extraCars || 0, extraAmount: entry.extraAmount || 0,
        priceCounts: entry.priceCounts || '{}', customPrices: entry.customPrices || '{}',
        entryTime: entry.entryTime || '',
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
  // Keep existing backups intact (don't delete them)
}

// استعادة من نسخة محفوظة في قاعدة البيانات (بالـ id)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // إذا فيه uploadData = استعادة من ملف رفعته
    if (body.uploadData) {
      const backup = JSON.parse(body.uploadData)
      const data = backup.data || backup
      await restoreData(data)
      // حفظ النسخة في قاعدة البيانات أيضاً للرجوع لها لاحقاً
      await db.backupFile.create({
        data: {
          data: body.uploadData,
          label: `نسخة مستعادة - ${new Date().toLocaleDateString('ar-LY')}`
        }
      })
      return NextResponse.json({ 
        success: true, 
        message: 'تمت الاستعادة من الملف المرفوع بنجاح',
        stats: {
          branches: (data.branches || []).length,
          employees: (data.employees || []).length,
          carEntries: (data.carEntries || []).length,
          records: (data.records || []).length,
          workerExpenses: (data.workerExpenses || []).length,
          closedDays: (data.closedDays || []).length
        }
      })
    }

    // الاستعادة العادية من نسخة محفوظة (بالـ id)
    const { id } = body
    if (!id) return NextResponse.json({ error: 'معرف النسخة مطلوب' }, { status: 400 })

    const backupFile = await db.backupFile.findUnique({ where: { id } })
    if (!backupFile) return NextResponse.json({ error: 'النسخة الاحتياطية غير موجودة' }, { status: 404 })

    const backup = JSON.parse(backupFile.data)
    const data = backup.data
    await restoreData(data)

    return NextResponse.json({ success: true, message: 'تمت الاستعادة بنجاح' })
  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: 'خطأ في الاستعادة: ' + error.message }, { status: 500 })
  }
}
