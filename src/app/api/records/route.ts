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
    if (branchId) where.branchId = branchId
    // إذا التاريخ بالشكل "YYYY-MM" → بحث بالشهر (startsWith)
    // إذا التاريخ بالشكل "YYYY-MM-DD" → بحث باليوم
    if (date) {
      if (date.length === 7) {
        where.date = { startsWith: date }
      } else {
        where.date = date
      }
    }

    const records = await db.record.findMany({
      where,
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

export async function PUT(req: NextRequest) {
  try {
    const { id, amount, note } = await req.json()
    if (!id || amount === undefined) {
      return NextResponse.json({ error: 'معرف ومبلغ مطلوبان' }, { status: 400 })
    }
    const record = await db.record.update({
      where: { id },
      data: { amount, note: note || '' }
    })
    return NextResponse.json(record)
  } catch (error) {
    console.error('Update record error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
