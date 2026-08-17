import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken, createAuthCookie, clearAuthCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Retry helper for connection issues - محسّن بـ timeout أطول
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: any = null
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      const msg = err?.message || ''
      // لو الخطأ مش مشكلة اتصال، لا داعي للإعادة
      if (i < retries && (
        msg.includes('connect') ||
        msg.includes('timeout') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('fetch failed') ||
        msg.includes('Could not connect') ||
        msg.includes('socket hang up') ||
        msg.includes('Prisma')
      )) {
        await new Promise(r => setTimeout(r, delay * (i + 1)))
        continue
      }
      if (i < retries) {
        await new Promise(r => setTimeout(r, delay * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('Failed after retries')
}

// Timeout wrapper - يمنع الانتظار اللانهائي
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timer = setTimeout(() => {
    throw new Error(`${label} - انتهى وقت الانتظار`)
  }, ms)
  try {
    const result = await promise
    clearTimeout(timer)
    return result
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

export const maxDuration = 30 // 30 ثانية كحد أقصى (الافتراضي 10 ثوانٍ في Vercel hobby)

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
        admin = await withTimeout(
          withRetry(() =>
            db.adminAccount.findUnique({ where: { id: 'admin' } })
          ),
          20000,
          'البحث عن حساب المسؤول'
        )
      } catch (dbErr: any) {
        console.error('Admin DB error:', dbErr?.message)
        return NextResponse.json({
          success: false,
          error: 'خطأ في الاتصال بقاعدة البيانات - يرجى المحاولة مرة أخرى',
          code: 'DB_CONNECTION_ERROR'
        }, { status: 503 })
      }
      if (!admin) {
        return NextResponse.json({ success: false, error: 'رمز المرور غير صحيح' }, { status: 401 })
      }
      // الدعم المؤقت: مقارنة نصية للكلمات القديمة + bcrypt للجديدة
      let passwordValid = false
      if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
        passwordValid = await bcrypt.compare(password, admin.password)
      } else if (admin.password === password) {
        // كلمة مرور نصية قديمة — هاشها فوراً وحدّث
        const hashed = await bcrypt.hash(password, 12)
        await db.adminAccount.update({ where: { id: 'admin' }, data: { password: hashed } }).catch(() => {})
        passwordValid = true
      }
      if (!passwordValid) {
        return NextResponse.json({ success: false, error: 'رمز المرور غير صحيح' }, { status: 401 })
      }

      // إنشاء token وحفظه في cookie
      const token = await createToken({ id: 'admin', name: admin.name, role: 'admin' })
      const response = createAuthCookie(token)
      const loginData = { success: true, user: { id: 'admin', name: admin.name, role: 'admin' as const }, token }
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
      employee = await withTimeout(
        withRetry(() =>
          db.employee.findUnique({ where: { id: empId } })
        ),
        20000,
        'البحث عن الموظف'
      )
    } catch (dbErr: any) {
      console.error('Employee DB error:', dbErr?.message)
      return NextResponse.json({
        success: false,
        error: 'خطأ في الاتصال بقاعدة البيانات - يرجى المحاولة مرة أخرى',
        code: 'DB_CONNECTION_ERROR'
      }, { status: 503 })
    }
    if (!employee) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 })
    }

    // Check deleted status safely
    if ((employee as any).deleted === true) {
      return NextResponse.json({ success: false, error: 'الموظف غير موجود' }, { status: 404 })
    }

    // الدعم المؤقت: مقارنة نصية للكلمات القديمة + bcrypt للجديدة
    let passwordValid = false
    if (employee.password.startsWith('$2a$') || employee.password.startsWith('$2b$')) {
      passwordValid = await bcrypt.compare(password, employee.password)
    } else if (employee.password === password) {
      // كلمة مرور نصية قديمة — هاشها فوراً وحدّث
      const hashed = await bcrypt.hash(password, 12)
      await db.employee.update({ where: { id: employee.id }, data: { password: hashed } }).catch(() => {})
      passwordValid = true
    }
    if (!passwordValid) {
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
      },
      token
    }
    return new NextResponse(JSON.stringify(loginData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': response.headers.get('Set-Cookie') || ''
      }
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? (error.stack || '').substring(0, 300) : ''
    console.error('Login error:', errMsg, errStack)
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ في الخادم - يرجى المحاولة مرة أخرى',
      code: 'SERVER_ERROR',
      debug: errMsg.substring(0, 200)
    }, { status: 500 })
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
