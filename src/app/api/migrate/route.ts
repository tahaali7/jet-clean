import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    // Add entryTime column if it doesn't exist
    await db.$executeRaw(Prisma.sql`ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "entryTime" TEXT NOT NULL DEFAULT ''`)
    return NextResponse.json({ success: true, message: 'تم إضافة عمود entryTime بنجاح' })
  } catch (error: any) {
    if (error?.message?.includes('already exists')) {
      return NextResponse.json({ success: true, message: 'العمود موجود بالفعل' })
    }
    console.error('Migration error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'فشل الترحيل' }, { status: 500 })
  }
}
