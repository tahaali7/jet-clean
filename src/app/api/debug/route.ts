import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const admin = await db.adminAccount.findUnique({ where: { id: 'admin' } })
    const empCount = await db.employee.count()
    const recCount = await db.record.count()
    const branchCount = await db.branch.count()
    return NextResponse.json({ admin: admin ? 'found' : 'not found', empCount, recCount, branchCount })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error), stack: error?.stack?.substring(0, 500) }, { status: 500 })
  }
}
