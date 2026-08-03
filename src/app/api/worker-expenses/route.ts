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

    const expenses = await db.workerExpense.findMany({
      where,
      orderBy: { id: 'asc' }
    })
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Get worker expenses error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, date, branchId, amount, note } = await req.json()
    if (!date || !branchId) {
      return NextResponse.json({ error: 'التاريخ والفرع مطلوبان' }, { status: 400 })
    }

    // Upsert: find existing or create new
    const existing = id
      ? await db.workerExpense.findUnique({ where: { id } })
      : null

    if (existing) {
      const updated = await db.workerExpense.update({
        where: { id: existing.id },
        data: { amount: amount ?? 0, note: note || '' }
      })
      return NextResponse.json(updated)
    }

    const expense = await db.workerExpense.create({
      data: { date, branchId, amount: amount ?? 0, note: note || '' }
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Upsert worker expense error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'معرف مطلوب' }, { status: 400 })
    await db.workerExpense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete worker expense error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
