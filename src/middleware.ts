import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, isPublicPath, API_PERMISSIONS } from '@/lib/auth'

// مسارات لا تحتاج حماية
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api' // health check
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // نحمي فقط مسارات /api/ (ما عدا العامة)
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // التحقق هل المسار عام
  if (PUBLIC_PATHS.some(p => pathname === p)) {
    return NextResponse.next()
  }

  // استخراج الـ token
  const token = req.cookies.get('auth-token')?.value ||
    (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')!.substring(7) : null)

  // لو ما فيه token → رفض
  if (!token) {
    return NextResponse.json(
      { error: 'يرجى تسجيل الدخول أولاً', code: 'NO_TOKEN' },
      { status: 401 }
    )
  }

  // التحقق من صحة الـ token
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: 'انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجدداً', code: 'TOKEN_EXPIRED' },
      { status: 401 }
    )
  }

  // التحقق من صلاحية الدور للمسار المطلوب
  const method = req.method.toUpperCase()
  const cleanPath = pathname.split('?')[0]

  // إيجاد أقرب تطابق في صلاحيات الـ API
  const matchedPath = findMatchingPermission(cleanPath)
  if (matchedPath && API_PERMISSIONS[matchedPath]) {
    const perms = API_PERMISSIONS[matchedPath][method]
    if (perms && !perms.includes(payload.role as any) && !perms.includes('any-authenticated')) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية للقيام بهذه العملية', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }

  // إضافة معلومات المستخدم في headers للـ API
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', payload.id)
  requestHeaders.set('x-user-name', payload.name)
  requestHeaders.set('x-user-role', payload.role)
  requestHeaders.set('x-user-branch', payload.branchId || '')

  return NextResponse.next({
    request: { headers: requestHeaders }
  })
}

// إيجاد أقرب تطابق للمسار في جدول الصلاحيات
function findMatchingPermission(path: string): string | null {
  // تطبيق مباشر
  if (API_PERMISSIONS[path]) return path

  // تطبيق جزئي (أب)
  const parts = path.split('/')
  for (let i = parts.length; i >= 2; i--) {
    const parent = parts.slice(0, i).join('/')
    if (API_PERMISSIONS[parent]) return parent
  }

  return null
}

// تحديد المسارات اللي يطبق عليها الـ middleware
export const config = {
  matcher: [
    '/api/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}
