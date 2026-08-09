import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const branchId = searchParams.get('branchId')

    const where: Record<string, unknown> = {}
    if (date) where.date = date
    if (branchId) where.branchId = branchId

    const treasuries = await db.treasury.findMany({
      where,
      orderBy: { id: 'asc' }
    })
    return NextResponse.json(treasuries)
  } catch (error) {
    console.error('Get treasury error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { date, branchId, total, cash, later } = await req.json()
    if (!date || !branchId) {
      return NextResponse.json({ error: 'التاريخ والفرع مطلوبان' }, { status: 400 })
    }

    // Upsert: find existing for this date+branch
    const existing = await db.treasury.findFirst({
      where: { date, branchId }
    })

    if (existing) {
      const updated = await db.treasury.update({
        where: { id: existing.id },
        data: { total: total ?? 0, cash: cash ?? 0, later: later ?? 0 }
      })
      return NextResponse.json(updated)
    }

    const treasury = await db.treasury.create({
      data: { date, branchId, total: total ?? 0, cash: cash ?? 0, later: later ?? 0 }
    })
    return NextResponse.json(treasury)
  } catch (error) {
    console.error('Upsert treasury error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
