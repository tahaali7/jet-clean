import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: 'كلمة المرور مطلوبة' }, { status: 400 })
    }
    const admin = await db.adminAccount.update({
      where: { id: 'admin' },
      data: { password }
    })
    return NextResponse.json({ success: true, name: admin.name })
  } catch (error) {
    console.error('Update admin password error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
