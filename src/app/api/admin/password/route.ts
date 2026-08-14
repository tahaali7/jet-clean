import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: 'كلمة المرور مطلوبة' }, { status: 400 })
    }
    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await db.adminAccount.update({
      where: { id: 'admin' },
      data: { password: hashedPassword }
    })
    return NextResponse.json({ success: true, name: admin.name })
  } catch (error) {
    console.error('Update admin password error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
