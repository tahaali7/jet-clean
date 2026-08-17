import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

// Secret key - من متغيرات البيئة مع قيمة احتياطية
const getSecret = () => {
  const secret = process.env.JWT_SECRET || 'jet-clean-fallback-secret-key-2024'
  return new TextEncoder().encode(secret)
}

export interface SessionUser {
  id: string
  name: string
  role: 'admin' | 'employee' | 'viewer'
  branchId?: string
  shift?: string
}

export interface AuthSession extends SessionUser {
  exp: number
  iat: number
}

// إنشاء JWT token
export async function createToken(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    role: user.role,
    branchId: user.branchId || '',
    shift: user.shift || ''
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // تنتهي بعد 24 ساعة
    .sign(getSecret())
  return token
}

// التحقق من JWT token
export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as AuthSession
  } catch {
    return null
  }
}

// استخراج الـ token من الطلب (Cookie أو Header)
export function getTokenFromRequest(req: NextRequest): string | null {
  // أولاً: من Cookie
  const cookieToken = req.cookies.get('auth-token')?.value
  if (cookieToken) return cookieToken

  // ثانياً: من Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

// التحقق من الجلسة وتعيين المتغيرات
export async function getSession(req: NextRequest): Promise<{ user: AuthSession | null; response: NextResponse | null }> {
  const token = getTokenFromRequest(req)

  if (!token) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'يرجى تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }
  }

  const user = await verifyToken(token)
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجدداً' },
        { status: 401 }
      )
    }
  }

  return { user, response: null }
}

// تعريف الصلاحيات لكل API
export type Permission = 'admin' | 'employee' | 'viewer' | 'any-authenticated'

// الأدوار المطلوبة للوصول
export const API_PERMISSIONS: Record<string, Record<string, Permission[]>> = {
  '/api/branches': {
    GET: ['admin', 'viewer', 'employee'],
    POST: ['admin'],
    PUT: ['admin'],
    DELETE: ['admin']
  },
  '/api/employees': {
    GET: ['admin', 'viewer'],
    POST: ['admin'],
    PUT: ['admin', 'employee'],
    DELETE: ['admin']
  },
  '/api/car-entries': {
    GET: ['admin', 'viewer', 'employee'],
    POST: ['admin', 'employee'],
    PUT: ['admin', 'employee'],
    DELETE: ['admin']
  },
  '/api/car-entries/upsert': {
    POST: ['admin', 'employee']
  },
  '/api/car-entries/cleanup': {
    POST: ['admin']
  },
  '/api/records': {
    GET: ['admin', 'viewer', 'employee'],
    POST: ['admin', 'employee'],
    PUT: ['admin', 'employee'],
    DELETE: ['admin']
  },
  '/api/worker-expenses': {
    GET: ['admin', 'viewer', 'employee'],
    POST: ['admin', 'employee'],
    DELETE: ['admin']
  },
  '/api/treasury': {
    GET: ['admin', 'viewer', 'employee'],
    POST: ['admin', 'employee']
  },
  '/api/closed-days': {
    GET: ['admin', 'viewer', 'employee'],
    POST: ['admin'],
    DELETE: ['admin']
  },
  '/api/notifications': {
    GET: ['admin', 'viewer', 'employee'],
    POST: ['admin'],
    PUT: ['admin', 'employee'],
    DELETE: ['admin']
  },
  '/api/backup': {
    GET: ['admin'],
    POST: ['admin']
  },
  '/api/restore': {
    POST: ['admin']
  },
  '/api/maintenance': {
    GET: ['admin', 'employee', 'viewer'],
    PUT: ['admin']
  },
  '/api/admin/password': {
    PUT: ['admin']
  },
  '/api/activity-log': {
    GET: ['admin', 'viewer'],
    POST: ['admin'],
    DELETE: ['admin']
  },
  '/api/db-check': {
    GET: ['admin']
  },
  '/api/add-entry-time': {
    GET: ['admin']
  }
}

// المسارات اللي لا تحتاج حماية (عامة)
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api' // الـ root API health check
]

// التحقق من صلاحية الوصول
export function hasPermission(userRole: string, requiredPermissions: Permission[]): boolean {
  if (requiredPermissions.includes('any-authenticated')) return true
  return requiredPermissions.includes(userRole as Permission)
}

// المسارات اللي لا تحتاج تسجيل دخول
export function isPublicPath(pathname: string): boolean {
  // إزالة query string
  const cleanPath = pathname.split('?')[0]
  return PUBLIC_PATHS.some(p => cleanPath === p || cleanPath.startsWith(p + '/'))
}

// إنشاء cookie آمنة مع الـ token
export function createAuthCookie(token: string): NextResponse {
  const response = NextResponse.json({ success: true })
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 ساعة
    path: '/'
  })
  return response
}

// مسح cookie عند تسجيل الخروج
export function clearAuthCookie(): NextResponse {
  const response = NextResponse.json({ success: true })
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  return response
}

// ========== Middleware Guard ==========
// دالة مساعدة: تُستدعى في بداية كل API محمي
export async function requireAuth(
  req: NextRequest,
  requiredRoles?: Permission[]
): Promise<{ user: AuthSession | null; error: NextResponse | null }> {
  // 1. التحقق من الجلسة
  const { user, response: authError } = await getSession(req)
  if (authError) return { user: null, error: authError }

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
  }

  // 2. التحقق من الصلاحية حسب الدور
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasPermission(user.role, requiredRoles)) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'ليس لديك صلاحية للقيام بهذه العملية' },
          { status: 403 }
        )
      }
    }
  }

  return { user, error: null }
}
