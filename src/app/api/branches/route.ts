import { NextRequest, NextResponse } from 'next/server'
import { db, ensureMigrations } from '@/lib/db'

export async function GET() {
  try {
    await ensureMigrations()
    const branches = await db.branch.findMany({
      include: { employees: true },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(branches)
  } catch (error) {
    console.error('Get branches error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, config } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'الرجاء كتابة اسم الفرع' }, { status: 400 })
    }
    const branch = await db.branch.create({ data: { name: name.trim(), config: config || null } })
    return NextResponse.json(branch)
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'هذا الفرع موجود مسبقاً' }, { status: 409 })
    }
    console.error('Create branch error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'معرف الفرع مطلوب' }, { status: 400 })
    }
    // Delete employees first (cascade not available for SQLite)
    await db.record.deleteMany({ where: { branchId: id } })
    await db.employee.deleteMany({ where: { branchId: id } })
    await db.carEntry.deleteMany({ where: { branchId: id } })
    await db.workerExpense.deleteMany({ where: { branchId: id } })
    await db.treasury.deleteMany({ where: { branchId: id } })
    await db.closedDay.deleteMany({ where: { branchId: id } })
    await db.branch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete branch error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
