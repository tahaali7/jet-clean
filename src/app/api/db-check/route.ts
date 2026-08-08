import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result: Record<string, unknown> = {}

    // 1. Total counts
    result.totalRecords = await db.record.count()
    result.employeeCount = await db.employee.count()
    result.branchCount = await db.branch.count()
    result.carEntryCount = await db.carEntry.count()

    // 2. Current month records (2026-08)
    const monthRecords = await db.record.findMany({
      where: { date: { startsWith: '2026-08' } }
    })
    result.month2026_08_count = monthRecords.length
    result.month2026_08_withdrawals = monthRecords.filter(r => r.type === 'withdrawal').reduce((s, r) => s + r.amount, 0)
    result.month2026_08_shortages = monthRecords.filter(r => r.type === 'shortage').reduce((s, r) => s + r.amount, 0)
    result.month2026_08_sample = monthRecords.slice(0, 5).map(r => ({
      empId: r.empId, type: r.type, amount: r.amount, date: r.date, branchId: r.branchId
    }))

    // 3. All records sample
    const allRecords = await db.record.findMany({ take: 10, orderBy: { date: 'desc' } })
    result.allRecordsSample = allRecords.map(r => ({
      empId: r.empId, type: r.type, amount: r.amount, date: r.date, branchId: r.branchId
    }))

    // 4. Branches
    const branches = await db.branch.findMany()
    result.branches = branches.map(b => ({ id: b.id, name: b.name }))

    // 5. Employees
    const emps = await db.employee.findMany()
    result.employees = emps.map(e => ({ id: e.id, name: e.name, branchId: e.branchId, hasLogin: e.hasLogin, deleted: e.deleted }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
