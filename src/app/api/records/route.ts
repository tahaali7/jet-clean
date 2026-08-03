import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const empId = searchParams.get('empId')
    const date = searchParams.get('date')
    const branchId = searchParams.get('branchId')

    const where: Record<string, unknown> = {}
    if (empId) where.empId = empId
    if (date) where.date = date
    if (branchId) where.branchId = branchId

    const records = await db.record.findMany({
      where,
      include: { employee: true },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(records)
  } catch (error) {
    console.error('Get records error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { empId, type, amount, note, date, branchId } = await req.json()
    if (!empId || !type || !amount || !date || !branchId) {
      return NextResponse.json({ error: 'جميع البيانات مطلوبة' }, { status: 400 })
    }

    const record = await db.record.create({
      data: { empId, type, amount, note: note || '', date, branchId }
    })
    return NextResponse.json(record)
  } catch (error) {
    console.error('Create record error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'معرف مطلوب' }, { status: 400 })
    await db.record.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete record error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
