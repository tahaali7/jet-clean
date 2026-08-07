import { NextRequest, NextResponse } from 'next/server'
import { db, ensureMigrations, forceMigrations } from '@/lib/db'

function parseJsonFields(entry: any) {
  let priceCounts = {}
  let customPrices = {}
  try { priceCounts = JSON.parse(entry.priceCounts || '{}') } catch {}
  try { customPrices = JSON.parse(entry.customPrices || '{}') } catch {}
  return {
    ...entry,
    priceCounts,
    customPrices,
    entryTime: entry.entryTime || ''
  }
}

// جلب البيانات باستخدام raw SQL — لا يعتمد على مطابقة السكيمة بالضبط
async function fetchEntriesRaw(date?: string | null, branchId?: string | null, empId?: string | null) {
  let sql = `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "entryTime", "createdAt" FROM "CarEntry" WHERE 1=1`
  const params: any[] = []
  
  if (date) {
    params.push(date)
    sql += ` AND date = $${params.length}`
  }
  if (branchId) {
    params.push(branchId)
    sql += ` AND "branchId" = $${params.length}`
  }
  if (empId) {
    params.push(empId)
    sql += ` AND "empId" = $${params.length}`
  }
  sql += ` ORDER BY "createdAt" DESC`

  return db.$queryRawUnsafe(sql, ...params)
}

// جلب البيانات بدون عمود entryTime — كبديل لو العمود غير موجود
async function fetchEntriesSafe(date?: string | null, branchId?: string | null, empId?: string | null) {
  let sql = `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "createdAt" FROM "CarEntry" WHERE 1=1`
  const params: any[] = []
  
  if (date) {
    params.push(date)
    sql += ` AND date = $${params.length}`
  }
  if (branchId) {
    params.push(branchId)
    sql += ` AND "branchId" = $${params.length}`
  }
  if (empId) {
    params.push(empId)
    sql += ` AND "empId" = $${params.length}`
  }
  sql += ` ORDER BY "createdAt" DESC`

  return db.$queryRawUnsafe(sql, ...params)
}

export async function GET(req: NextRequest) {
  try {
    await ensureMigrations()
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

      const entries: any[] = await fetchEntriesSafe(startDate, branchId)
      const filtered = entries.filter((e: any) => e.date >= startDate && e.date <= endDate)
      const dateSet = new Set(filtered.map((e: any) => e.date))
      return NextResponse.json(Array.from(dateSet))
    }

    // محاولة 1: raw SQL مع entryTime
    let entries: any[] = []
    try {
      entries = await fetchEntriesRaw(date, branchId, empId) as any[]
    } catch (error: any) {
      console.log('[API] fetchEntriesRaw failed, trying safe mode:', error?.message)
      // محاولة 2: بدون entryTime
      try {
        entries = await fetchEntriesSafe(date, branchId, empId) as any[]
      } catch (error2: any) {
        console.log('[API] fetchEntriesSafe failed, running migrations:', error2?.message)
        // محاولة 3: تشغيل الترحيل وإعادة المحاولة
        await forceMigrations()
        try {
          entries = await fetchEntriesRaw(date, branchId, empId) as any[]
        } catch (error3: any) {
          entries = await fetchEntriesSafe(date, branchId, empId) as any[]
        }
      }
    }

    const parsed = entries.map(parseJsonFields)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Get car entries error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureMigrations()
    const data = await req.json()

    // تشغيل الترحيل أول ما نضيف بيانات جديدة
    try {
      await forceMigrations()
    } catch {}

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
