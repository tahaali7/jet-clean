import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// تنظيف المداخلات المكررة في قاعدة البيانات
// يحتفظ بالأحدث فقط لكل (empId + room + date + branchId)
export async function POST() {
  try {
    const allEntries = await db.carEntry.findMany({ orderBy: { createdAt: 'asc' } })

    const groups = new Map<string, typeof allEntries>()
    allEntries.forEach(entry => {
      const key = `${entry.empId}|${entry.room}|${entry.date}|${entry.branchId}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(entry)
    })

    let deletedCount = 0
    const toDeleteIds: string[] = []
    for (const [, entries] of groups) {
      if (entries.length > 1) {
        const dupes = entries.slice(0, -1)
        dupes.forEach(entry => {
          toDeleteIds.push(entry.id)
          deletedCount++
        })
      }
    }

    // حذف كل التكرارات
    for (const id of toDeleteIds) {
      try { await db.carEntry.delete({ where: { id } }) } catch {}
    }

    return NextResponse.json({
      success: true,
      totalEntries: allEntries.length,
      duplicateGroups: groups.size,
      deletedCount,
      remainingCount: allEntries.length - deletedCount
    })
  } catch (error: any) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
