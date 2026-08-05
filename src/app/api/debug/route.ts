import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result = await db.$queryRawUnsafe(`SELECT id, "name", password FROM "AdminAccount"`)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 })
  }
}
