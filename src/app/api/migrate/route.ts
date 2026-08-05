import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    await db.$executeRaw(Prisma.raw(`ALTER TABLE "Employee" ALTER COLUMN "branchId" DROP NOT NULL;`))
    return NextResponse.json({ success: true, message: 'Migration completed: branchId is now nullable' })
  } catch (error: any) {
    if (error?.message?.includes('already') || error?.code === '0') {
      return NextResponse.json({ success: true, message: 'Already migrated' })
    }
    console.error('Migration error:', error)
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 })
  }
}
