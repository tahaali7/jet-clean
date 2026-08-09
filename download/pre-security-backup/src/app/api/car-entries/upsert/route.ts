import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function parseJson(entry: any) {
  let priceCounts = {}
  let customPrices = {}
  try { priceCounts = JSON.parse(entry.priceCounts || '{}') } catch {}
  try { customPrices = JSON.parse(entry.customPrices || '{}') } catch {}
  return { ...entry, priceCounts, customPrices, entryTime: entry.entryTime || '' }
}

export async function POST(req: NextRequest) {
  try {
    const {
      empId, room, date, branchId,
      empName, totalCars, totalAmount, extraCars, extraAmount,
      priceCounts, customPrices, entryTime
    } = await req.json()

    if (!empId || !room || !date || !branchId) {
      return NextResponse.json({ error: 'empId, room, date, branchId مطلوبة' }, { status: 400 })
    }

    // البحث عن مدخل موجود: نفس empId + room + date + branchId
    const existing = await db.carEntry.findFirst({
      where: { empId, room, date, branchId }
    })

    if (existing) {
      // تعديل المدخل الموجود
      const updated = await db.carEntry.update({
        where: { id: existing.id },
        data: {
          totalCars: totalCars || 0,
          totalAmount: totalAmount || 0,
          extraCars: extraCars || 0,
          extraAmount: extraAmount || 0,
          priceCounts: JSON.stringify(priceCounts || {}),
          customPrices: JSON.stringify(customPrices || {}),
        }
      })
      return NextResponse.json({ ...parseJson(updated), action: 'updated' })
    } else {
      // إنشاء مدخل جديد
      const created = await db.carEntry.create({
        data: {
          date, branchId, empId, empName: empName || '',
          room, totalCars: totalCars || 0, totalAmount: totalAmount || 0,
          extraCars: extraCars || 0, extraAmount: extraAmount || 0,
          priceCounts: JSON.stringify(priceCounts || {}),
          customPrices: JSON.stringify(customPrices || {}),
          entryTime: entryTime || ''
        }
      })
      return NextResponse.json({ ...parseJson(created), action: 'created' })
    }
  } catch (error: any) {
    console.error('Upsert car entry error:', error)
    return NextResponse.json({ error: 'حدث خطأ: ' + (error.message || '') }, { status: 500 })
  }
}
