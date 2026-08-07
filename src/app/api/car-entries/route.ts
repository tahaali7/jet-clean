import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function parseJson(entry: any) {
  let priceCounts = {}
  let customPrices = {}
  try { priceCounts = JSON.parse(entry.priceCounts || '{}') } catch {}
  try { customPrices = JSON.parse(entry.customPrices || '{}') } catch {}
  return { ...entry, priceCounts, customPrices, entryTime: entry.entryTime || '' }
}

function esc(s: string) { return String(s || '').replace(/'/g, "''") }

// فحص هل عمود entryTime موجود في الداتا بيز
let columnExists: boolean | null = null
async function checkEntryTimeColumn(): Promise<boolean> {
  if (columnExists !== null) return columnExists
  try {
    const cols: any[] = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'CarEntry' AND column_name = 'entryTime'`
    )
    columnExists = cols.length > 0
    return columnExists
  } catch {
    columnExists = false
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
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

    const hasEntryTime = await checkEntryTimeColumn()

    let entries: any[]
    if (hasEntryTime) {
      entries = await db.$queryRawUnsafe(
        `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "entryTime", "createdAt"
         FROM "CarEntry" ${where} ORDER BY "createdAt" DESC`
      ) as any[]
    } else {
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
    const data = await req.json()
    const hasEntryTime = await checkEntryTimeColumn()

    if (hasEntryTime) {
      // استخدام raw SQL لحفظ entryTime
      const newId = 'cuid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
      await db.$executeRawUnsafe(
        `INSERT INTO "CarEntry" (id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "entryTime", "createdAt")
         VALUES ('${esc(newId)}', '${esc(data.date)}', '${esc(data.branchId)}', '${esc(data.empId)}', '${esc(data.empName)}', '${esc(data.room)}', ${data.totalCars || 0}, ${data.totalAmount || 0}, ${data.extraCars || 0}, ${data.extraAmount || 0}, '${esc(JSON.stringify(data.priceCounts || {}))}', '${esc(JSON.stringify(data.customPrices || {}))}', '${esc(data.entryTime || '')}', NOW())`
      )
      const entries: any[] = await db.$queryRawUnsafe(
        `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "entryTime", "createdAt" FROM "CarEntry" WHERE id = '${esc(newId)}'`
      )
      return NextResponse.json(parseJson(entries[0] || { id: newId }))
    } else {
      // Fallback: Prisma بدون entryTime
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
    }
  } catch (error) {
    console.error('Create car entry error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({ error: 'معرف مطلوب' }, { status: 400 })

    const hasEntryTime = await checkEntryTimeColumn()

    if (hasEntryTime) {
      // استخدام raw SQL لتحديث البيانات بما فيها entryTime
      const setClauses: string[] = []
      if (data.date !== undefined) setClauses.push(`date = '${esc(data.date)}'`)
      if (data.branchId !== undefined) setClauses.push(`"branchId" = '${esc(data.branchId)}'`)
      if (data.empId !== undefined) setClauses.push(`"empId" = '${esc(data.empId)}'`)
      if (data.empName !== undefined) setClauses.push(`"empName" = '${esc(data.empName)}'`)
      if (data.room !== undefined) setClauses.push(`room = '${esc(data.room)}'`)
      if (data.totalCars !== undefined) setClauses.push(`"totalCars" = ${data.totalCars}`)
      if (data.totalAmount !== undefined) setClauses.push(`"totalAmount" = ${data.totalAmount}`)
      if (data.extraCars !== undefined) setClauses.push(`"extraCars" = ${data.extraCars}`)
      if (data.extraAmount !== undefined) setClauses.push(`"extraAmount" = ${data.extraAmount}`)
      if (data.priceCounts !== undefined) setClauses.push(`"priceCounts" = '${esc(JSON.stringify(data.priceCounts))}'`)
      if (data.customPrices !== undefined) setClauses.push(`"customPrices" = '${esc(JSON.stringify(data.customPrices))}'`)
      // تحديث entryTime فقط إذا تم إرساله
      if (data.entryTime !== undefined) setClauses.push(`"entryTime" = '${esc(data.entryTime)}'`)

      if (setClauses.length === 0) {
        return NextResponse.json({ error: 'لا بيانات للتحديث' }, { status: 400 })
      }

      await db.$executeRawUnsafe(
        `UPDATE "CarEntry" SET ${setClauses.join(', ')} WHERE id = '${esc(id)}'`
      )
      const entries: any[] = await db.$queryRawUnsafe(
        `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "entryTime", "createdAt" FROM "CarEntry" WHERE id = '${esc(id)}'`
      )
      return NextResponse.json(parseJson(entries[0] || { id }))
    } else {
      // Fallback: Prisma بدون entryTime
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
    }
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
