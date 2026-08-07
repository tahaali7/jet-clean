import { NextResponse } from 'next/server'
import { db, forceMigrations } from '@/lib/db'

// endpoint تشخيصي - يعرض البيانات الخام من قاعدة البيانات
export async function GET() {
  const result: any = { steps: [] }

  try {
    // 1. اتصال قاعدة البيانات
    const count = await db.carEntry.count()
    result.steps.push({ step: '1. DB OK', totalEntries: count })

    // 2. تشغيل الترحيل
    await forceMigrations()
    result.steps.push({ step: '2. Migration done' })

    // 3. جلب البيانات الخام
    const allEntries = await db.$queryRawUnsafe(
      `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "entryTime", "createdAt" FROM "CarEntry" ORDER BY "createdAt" DESC LIMIT 20`
    )
    result.steps.push({ step: '3. Raw entries', count: (allEntries as any[]).length, data: allEntries })

    // 4. الفروع
    const branches = await db.branch.findMany({ select: { id: true, name: true } })
    result.steps.push({ step: '4. Branches', data: branches })

    // 5. الموظفين
    const employees = await db.$queryRawUnsafe(
      `SELECT id, name, "branchId" FROM "Employee" LIMIT 20`
    )
    result.steps.push({ step: '5. Employees', data: employees })

    // 6. فحص Prisma
    try {
      const prismaEntries = await db.carEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      })
      result.steps.push({ step: '6. Prisma OK', count: prismaEntries.length, data: prismaEntries.map((e: any) => ({ id: e.id, empName: e.empName, room: e.room, date: e.date, branchId: e.branchId, entryTime: e.entryTime })) })
    } catch (error: any) {
      result.steps.push({ step: '6. Prisma FAILED', error: error?.message })
    }

  } catch (error: any) {
    result.error = error?.message || String(error)
  }

  return NextResponse.json(result)
}
