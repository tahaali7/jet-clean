import { NextRequest, NextResponse } from 'next/server'
import { db, ensureMigrations } from '@/lib/db'

function parseJsonFields(entry: any) {
  return {
    ...entry,
    priceCounts: JSON.parse(entry.priceCounts || '{}'),
    customPrices: JSON.parse(entry.customPrices || '{}')
  }
}

// تشغيل الترحيل ثم المحاولة - لو فشل الاستعلام الأول (العمود مفقود) نعيد الترحيل والمحاولة
async function withMigration<T>(fn: () => Promise<T>): Promise<T> {
  await ensureMigrations()
  try {
    return await fn()
  } catch (error: any) {
    // لو الخطأ بسبب عمود مفقود، أعد الترحيل بقوة وحاول مرة تانية
    const msg = error?.message || ''
    if (msg.includes('does not exist') || msg.includes('column') || msg.includes('relation')) {
      console.log('[Retry] Re-running migrations after column error...')
      const { forceMigrations } = await import('@/lib/db')
      await forceMigrations()
      return await fn()
    }
    throw error
  }
}

export async function GET(req: NextRequest) {
  try {
    const result = await withMigration(async () => {
      const { searchParams } = new URL(req.url)
      const date = searchParams.get('date')
      const branchId = searchParams.get('branchId')
      const empId = searchParams.get('empId')
      const datesOnly = searchParams.get('datesOnly')
      const month = searchParams.get('month')

      if (datesOnly === 'true' && branchId && month) {
        const startDate = month + '-01'
        const [year, mon] = month.split('-').map(Number)
        const daysInMonth = new Date(year, mon, 0).getDate()
        const endDate = month + '-' + String(daysInMonth).padStart(2, '0')

        const entries = await db.carEntry.findMany({
          where: { branchId, date: { gte: startDate, lte: endDate } },
          select: { date: true },
        })
        const dateSet = new Set(entries.map((e: any) => e.date))
        return Array.from(dateSet)
      }

      const where: Record<string, unknown> = {}
      if (date) where.date = date
      if (branchId) where.branchId = branchId
      if (empId) where.empId = empId

      const entries = await db.carEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      })

      return entries.map(parseJsonFields)
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get car entries error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureMigrations()
    const data = await req.json()
    const entry = await db.carEntry.create({
      data: {
        date: data.date,
        branchId: data.branchId,
        empId: data.empId,
        empName: data.empName,
        room: data.room,
        totalCars: data.totalCars || 0,
        totalAmount: data.totalAmount || 0,
        extraCars: data.extraCars || 0,
        extraAmount: data.extraAmount || 0,
        priceCounts: JSON.stringify(data.priceCounts || {}),
        customPrices: JSON.stringify(data.customPrices || {}),
        entryTime: data.entryTime || ''
      }
    })
    return NextResponse.json(parseJsonFields(entry))
  } catch (error) {
    console.error('Create car entry error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureMigrations()
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({ error: 'معرف مطلوب' }, { status: 400 })

    const updateData: Record<string, unknown> = {}
    if (data.date !== undefined) updateData.date = data.date
    if (data.branchId !== undefined) updateData.branchId = data.branchId
    if (data.empId !== undefined) updateData.empId = data.empId
    if (data.empName !== undefined) updateData.empName = data.empName
    if (data.room !== undefined) updateData.room = data.room
    if (data.totalCars !== undefined) updateData.totalCars = data.totalCars
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount
    if (data.extraCars !== undefined) updateData.extraCars = data.extraCars
    if (data.extraAmount !== undefined) updateData.extraAmount = data.extraAmount
    if (data.priceCounts !== undefined) updateData.priceCounts = JSON.stringify(data.priceCounts)
    if (data.customPrices !== undefined) updateData.customPrices = JSON.stringify(data.customPrices)
    if (data.entryTime !== undefined) updateData.entryTime = data.entryTime

    const entry = await db.carEntry.update({ where: { id }, data: updateData })
    return NextResponse.json(parseJsonFields(entry))
  } catch (error) {
    console.error('Update car entry error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'معرف مطلوب' }, { status: 400 })
    await db.carEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete car entry error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
