import { NextRequest, NextResponse } from 'next/server'
import { db, addEntryTimeColumn } from '@/lib/db'

function parseJson(entry: any) {
  let priceCounts = {}
  let customPrices = {}
  try { priceCounts = JSON.parse(entry.priceCounts || '{}') } catch {}
  try { customPrices = JSON.parse(entry.customPrices || '{}') } catch {}
  return { ...entry, priceCounts, customPrices, entryTime: entry.entryTime || '' }
}

function esc(s: string) { return String(s || '').replace(/'/g, "''") }

export async function GET(req: NextRequest) {
  try {
    // محاولة إضافة العمود (باكب تلقائي + ترحيل آمن)
    await addEntryTimeColumn()

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const branchId = searchParams.get('branchId')
    const empId = searchParams.get('empId')
    const datesOnly = searchParams.get('datesOnly')
    const month = searchParams.get('month')

    // تواريخ فقط (للتقويم)
    if (datesOnly === 'true' && branchId && month) {
      const startDate = month + '-01'
      const [year, mon] = month.split('-').map(Number)
      const daysInMonth = new Date(year, mon, 0).getDate()
      const endDate = month + '-' + String(daysInMonth).padStart(2, '0')
      const rows: any[] = await db.$queryRawUnsafe(
        `SELECT DISTINCT date FROM "CarEntry" WHERE "branchId" = '${esc(branchId)}' AND date >= '${esc(startDate)}' AND date <= '${esc(endDate)}'`
      )
      return NextResponse.json(rows.map(r => r.date))
    }

    // بناء WHERE
    let where = 'WHERE 1=1'
    if (date) where += ` AND date = '${esc(date)}'`
    if (branchId) where += ` AND "branchId" = '${esc(branchId)}'`
    if (empId) where += ` AND "empId" = '${esc(empId)}'`

    // محاولة 1: مع entryTime
    let entries: any[]
    try {
      entries = await db.$queryRawUnsafe(
        `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "entryTime", "createdAt"
         FROM "CarEntry" ${where} ORDER BY "createdAt" DESC`
      ) as any[]
    } catch {
      // محاولة 2: بدون entryTime
      entries = await db.$queryRawUnsafe(
        `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "createdAt"
         FROM "CarEntry" ${where} ORDER BY "createdAt" DESC`
      ) as any[]
    }

    return NextResponse.json(entries.map(parseJson))
  } catch (error) {
    console.error('Get car entries error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await addEntryTimeColumn()
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
        customPrices: JSON.stringify(data.customPrices || {})
      }
    })
    return NextResponse.json(parseJson(entry))
  } catch (error) {
    console.error('Create car entry error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await addEntryTimeColumn()
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

    const entry = await db.carEntry.update({ where: { id }, data: updateData })
    return NextResponse.json(parseJson(entry))
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
