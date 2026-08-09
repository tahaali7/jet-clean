import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: فحص حالة الصيانة
export async function GET() {
  try {
    let maintenance = await db.maintenance.findUnique({ where: { id: 'main' } })
    if (!maintenance) {
      // إنشاء صف افتراضي
      maintenance = await db.maintenance.create({
        data: { id: 'main', enabled: false }
      })
    }
    return NextResponse.json({ enabled: maintenance.enabled })
  } catch (error) {
    // لو الجدول ما اشتغل، رجّع false عشان ما يوقف الموقع
    console.error('Get maintenance error:', error)
    return NextResponse.json({ enabled: false })
  }
}

// PUT: تشغيل/إيقاف الصيانة
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const enabled = data.enabled === true

    const maintenance = await db.maintenance.upsert({
      where: { id: 'main' },
      update: { enabled, updatedAt: new Date() },
      create: { id: 'main', enabled }
    })

    return NextResponse.json({ enabled: maintenance.enabled })
  } catch (error) {
    console.error('Toggle maintenance error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
