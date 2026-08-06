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
    const { name, branchId, shift, password, role, hasLogin, startDate, endDate } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'الرجاء كتابة اسم الموظف' }, { status: 400 })
    if (role !== 'viewer' && !branchId) return NextResponse.json({ error: 'الرجاء اختيار الفرع' }, { status: 400 })
    if (hasLogin && !password?.trim()) return NextResponse.json({ error: 'الرجاء إدخال رمز المرور' }, { status: 400 })

    const id = name.trim().replace(/\s+/g, '_') + '_' + (branchId || 'viewer') + '_' + Date.now()
    const employee = await db.employee.create({
      data: {
        id,
        name: name.trim(),
        branchId: branchId || null,
        shift: role === 'viewer' ? 'مشاهد' : (shift || 'الفترة الصباحية'),
        password: hasLogin ? password.trim() : '',
        role: role || 'employee',
        hasLogin: !!hasLogin,
        startDate: startDate || '',
        endDate: endDate || '',
      }
    })
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Create employee error:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'حدث خطأ: ' + errMsg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, shift, password, role, hasLogin, branchId, startDate, endDate } = await req.json()
    if (!id) return NextResponse.json({ error: 'معرف الموظف مطلوب' }, { status: 400 })
    const data: Record<string, any> = {}
    if (name !== undefined && name !== null) data.name = String(name).trim()
    if (shift !== undefined && shift !== null) data.shift = String(shift)
    if (role !== undefined && role !== null) data.role = String(role)
    if (hasLogin !== undefined && hasLogin !== null) data.hasLogin = hasLogin === true
    if (password !== undefined && password !== null && String(password).trim() !== '') data.password = String(password).trim()
    if (branchId !== undefined && branchId !== null) data.branchId = branchId
    if (startDate !== undefined && startDate !== null) data.startDate = String(startDate)
    if (endDate !== undefined && endDate !== null) data.endDate = String(endDate)
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 })
    }
    const employee = await db.employee.update({
      where: { id },
      data
    })
    return NextResponse.json(employee)
  } catch (error: any) {
    console.error('Update employee error:', error)
    return NextResponse.json({ error: 'حدث خطأ: ' + (error?.message || '') }, { status: 500 })
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
