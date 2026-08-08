import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const entries = await db.carEntry.findMany({ orderBy: { createdAt: 'desc' } })
    
    // Group by room to find potential duplicates
    const roomGroups = new Map<string, typeof entries>()
    entries.forEach(e => {
      const key = `${e.branchId}|${e.date}|${e.room}`
      if (!roomGroups.has(key)) roomGroups.set(key, [])
      roomGroups.get(key)!.push({
        id: e.id,
        empId: e.empId,
        empName: e.empName,
        room: e.room,
        date: e.date,
        branchId: e.branchId,
        totalCars: e.totalCars,
        totalAmount: e.totalAmount,
        createdAt: e.createdAt?.toISOString() || ''
      })
    })

    // Find rooms with multiple entries
    const duplicates: any[] = []
    for (const [key, group] of roomGroups) {
      if (group.length > 1) {
        duplicates.push({ key, entries: group })
      }
    }

    return NextResponse.json({
      total: entries.length,
      duplicates,
      allEntries: entries.map(e => ({
        id: e.id, empId: e.empId, empName: e.empName,
        room: e.room, date: e.date, branchId: e.branchId,
        totalCars: e.totalCars, totalAmount: e.totalAmount
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
