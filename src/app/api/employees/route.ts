import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    const employees = await db.employee.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: true },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Get employees error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, branchId, shift, password } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'الرجاء كتابة اسم الموظف' }, { status: 400 })
    if (!branchId) return NextResponse.json({ error: 'الرجاء اختيار الفرع' }, { status: 400 })
    if (!password?.trim()) return NextResponse.json({ error: 'الرجاء إدخال رمز المرور' }, { status: 400 })

    const id = name.trim().replace(/\s+/g, '_') + '_' + branchId + '_' + Date.now()
    const employee = await db.employee.create({
      data: { id, name: name.trim(), branchId, shift: shift || 'الفترة الصباحية', password: password.trim() }
    })
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, password } = await req.json()
    if (!id) return NextResponse.json({ error: 'معرف الموظف مطلوب' }, { status: 400 })
    const employee = await db.employee.update({
      where: { id },
      data: { password }
    })
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Update employee error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'معرف الموظف مطلوب' }, { status: 400 })
    await db.record.deleteMany({ where: { empId: id } })
    await db.carEntry.deleteMany({ where: { empId: id } })
    await db.employee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete employee error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
