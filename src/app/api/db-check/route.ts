import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const result: Record<string, unknown> = {}

    // Basic counts
    try {
      result.branchCount = await db.branch.count()
    } catch (e: any) { result.branchError = e.message }

    try {
      result.employeeCount = await db.employee.count()
    } catch (e: any) { result.employeeError = e.message }

    try {
      result.carEntryCount = await db.carEntry.count()
    } catch (e: any) { result.carEntryError = e.message }

    try {
      result.recordCount = await db.record.count()
    } catch (e: any) { result.recordError = e.message }

    // Check empId matching between CarEntry and Employee
    try {
      const emps = await db.employee.findMany({ select: { id: true } })
      const empIds = new Set(emps.map(e => e.id))
      const entries = await db.carEntry.findMany({ take: 10, orderBy: { createdAt: 'desc' }, select: { empId: true, empName: true, date: true } })
      const unmatched = entries.filter(e => !empIds.has(e.empId))
      result.recentEntries = entries
      result.unmatchedEmpIds = unmatched
      result.empIdsSample = emps.slice(0, 3).map(e => e.id)
    } catch (e: any) { result.matchError = e.message }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
