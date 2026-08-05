import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "config" JSONB;`)
    return NextResponse.json({ success: true, message: 'Migration: added config column to Branch' })
  } catch (error: any) {
    if (error?.message?.includes('already') || error?.code === '0') {
      return NextResponse.json({ success: true, message: 'Already migrated' })
    }
    console.error('Migration error:', error)
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 })
  }
}
