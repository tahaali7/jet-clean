import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const result: Record<string, unknown> = {}

    // Check raw table counts using queryRaw
    try {
      const branchCount = await db.$queryRaw`SELECT COUNT(*)::int as count FROM "Branch"`
      result.branchCount = branchCount
    } catch (e: any) { result.branchError = e.message }

    try {
      const empCount = await db.$queryRaw`SELECT COUNT(*)::int as count FROM "Employee"`
      result.employeeCount = empCount
    } catch (e: any) { result.employeeError = e.message }

    try {
      const adminCount = await db.$queryRaw`SELECT COUNT(*)::int as count FROM "AdminAccount"`
      result.adminCount = adminCount
    } catch (e: any) { result.adminError = e.message }

    try {
      const carCount = await db.$queryRaw`SELECT COUNT(*)::int as count FROM "CarEntry"`
      result.carEntryCount = carCount
    } catch (e: any) { result.carEntryError = e.message }

    try {
      const recordCount = await db.$queryRaw`SELECT COUNT(*)::int as count FROM "Record"`
      result.recordCount = recordCount
    } catch (e: any) { result.recordError = e.message }

    // Check Employee table columns
    try {
      const columns = await db.$queryRaw`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'Employee' 
        ORDER BY ordinal_position
      `
      result.employeeColumns = columns
    } catch (e: any) { result.columnsError = e.message }

    // Check AdminAccount data
    try {
      const admins = await db.$queryRaw`SELECT * FROM "AdminAccount"`
      result.adminData = admins
    } catch (e: any) { result.adminDataError = e.message }

    // Check Prisma schema info
    try {
      const dims = (Prisma as any).dmmf?.datamodel?.models?.map((m: any) => m.name)
      result.prismaModels = dims
    } catch {}

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
