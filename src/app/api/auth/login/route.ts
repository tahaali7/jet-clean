import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken, createAuthCookie, clearAuthCookie } from '@/lib/auth'

// Retry helper for connection issues
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 800): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const msg = err?.message || ''
      if (i < retries) {
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
      let admin = null
      try {
        admin = await withRetry(() =>
          db.adminAccount.findUnique({ where: { id: 'admin' } })
        )
      } catch (dbErr: any) {
        console.error('Admin DB error:', dbErr?.message)
        return NextResponse.json({ success: false, error: 'حدث خطأ في الاتصال - حاول مرة أخرى' }, { status: 500 })
      }
      if (!admin || admin.password !== password) {
        return NextResponse.json({ success: false, error: 'رمز المرور غير صحيح' }, { status: 401 })
      }

      // إنشاء token وحفظه في cookie
      const token = await createToken({ id: 'admin', name: admin.name, role: 'admin' })
      const response = createAuthCookie(token)
      const loginData = { success: true, user: { id: 'admin', name: admin.name, role: 'admin' as const } }
      return new NextResponse(JSON.stringify(loginData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': response.headers.get('Set-Cookie') || ''
        }
      })
    }

    // Employee login
    let employee = null
    try {
      employee = await withRetry(() =>
        db.employee.findUnique({ where: { id: empId } })
      )
    } catch (dbErr: any) {
      console.error('Employee DB error:', dbErr?.message)
      return NextResponse.json({ success: false, error: 'حدث خطأ في الاتصال - حاول مرة أخرى' }, { status: 500 })
    }
    if (!employee) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 })
    }

    // Check deleted status safely
    if ((employee as any).deleted === true) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 })
    }

    if (employee.password !== password) {
      return NextResponse.json({ success: false, error: 'رمز المرور غير صحيح' }, { status: 401 })
    }

    // إنشاء token وحفظه في cookie
    const token = await createToken({
      id: employee.id,
      name: employee.name,
      role: (employee.role || 'employee') as 'employee' | 'viewer',
      branchId: employee.branchId || undefined,
      shift: employee.shift
    })
    const response = createAuthCookie(token)
    const loginData = {
      success: true,
      user: {
        id: employee.id,
        name: employee.name,
        role: (employee.role || 'employee') as 'employee' | 'viewer',
        branchId: employee.branchId,
        shift: employee.shift
      }
    }
    return new NextResponse(JSON.stringify(loginData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': response.headers.get('Set-Cookie') || ''
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'حدث خطأ في الخادم - حاول مرة أخرى' }, { status: 500 })
  }
}

// تسجيل الخروج
export async function DELETE() {
  const response = clearAuthCookie()
  return response
}

// التحقق من الجلسة الحالية
export async function GET(req: NextRequest) {
  const { cookies } = req
  const token = cookies.get('auth-token')?.value
  const authHeader = req.headers.get('authorization')
  const tokenValue = token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null)

  if (!tokenValue) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const { verifyToken } = await import('@/lib/auth')
  const payload = await verifyToken(tokenValue)

  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: payload.id,
      name: payload.name,
      role: payload.role,
      branchId: payload.branchId
    }
  })
}
