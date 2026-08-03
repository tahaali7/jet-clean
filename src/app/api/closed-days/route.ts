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

    const closedDays = await db.closedDay.findMany({ where })
    return NextResponse.json(closedDays)
  } catch (error) {
    console.error('Get closed days error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { date, branchId } = await req.json()
    if (!date || !branchId) {
      return NextResponse.json({ error: 'التاريخ والفرع مطلوبان' }, { status: 400 })
    }

    // Check if exists and toggle
    const existing = await db.closedDay.findFirst({ where: { date, branchId } })

    if (existing) {
      await db.closedDay.delete({ where: { id: existing.id } })
      return NextResponse.json({ closed: false })
    } else {
      await db.closedDay.create({ data: { date, branchId } })
      return NextResponse.json({ closed: true })
    }
  } catch (error) {
    console.error('Toggle closed day error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const branchId = searchParams.get('branchId')
    if (!date || !branchId) {
      return NextResponse.json({ error: 'التاريخ والفرع مطلوبان' }, { status: 400 })
    }
    await db.closedDay.deleteMany({ where: { date, branchId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete closed day error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
