import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: فحص حالة الصيانة
export async function GET() {
  try {
    const entries = await db.$queryRawUnsafe(
      `SELECT enabled, "updatedAt" FROM "Maintenance" WHERE id = 'main'`
    ) as any[]
    if (entries.length === 0) {
      return NextResponse.json({ enabled: false })
    }
    return NextResponse.json({ enabled: entries[0].enabled === true })
  } catch (error) {
    // لو الجدول ما اشتغل، رجّع false عشان ما يوقف الموقع
    return NextResponse.json({ enabled: false })
  }
}

// PUT: تشغيل/إيقاف الصيانة
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const enabled = data.enabled === true

    await db.$executeRawUnsafe(
      `UPDATE "Maintenance" SET enabled = ${enabled}, "updatedAt" = NOW() WHERE id = 'main'`
    )

    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('Toggle maintenance error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
