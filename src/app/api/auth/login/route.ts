import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Retry helper for connection issues
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('max') && msg.includes('client') && i < retries) {
        await new Promise(r => setTimeout(r, delay * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error('Failed after retries')
}

export async function POST(req: NextRequest) {
  try {
    const { empId, password } = await req.json()

    if (!empId || !password) {
      return NextResponse.json({ success: false, error: 'الرجاء إدخال جميع البيانات' }, { status: 400 })
    }

    // Admin login
    if (empId === 'admin') {
      const admin = await withRetry(() =>
        db.adminAccount.findUnique({ where: { id: 'admin' } })
      )
      if (!admin || admin.password !== password) {
        return NextResponse.json({ success: false, error: 'رمز المرور غير صحيح' }, { status: 401 })
      }
      return NextResponse.json({
        success: true,
        user: { id: 'admin', name: admin.name, role: 'admin' as const }
      })
    }

    // Employee login
    const employee = await withRetry(() =>
      db.employee.findUnique({ where: { id: empId } })
    )
    if (!employee || employee.deleted) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 })
    }

    if (employee.password !== password) {
      return NextResponse.json({ success: false, error: 'رمز المرور غير صحيح' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: employee.id,
        name: employee.name,
        role: (employee.role || 'employee') as 'employee' | 'viewer',
        branchId: employee.branchId,
        shift: employee.shift,
        password: employee.password
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'حدث خطأ في الخادم - حاول مرة أخرى' }, { status: 500 })
  }
}
