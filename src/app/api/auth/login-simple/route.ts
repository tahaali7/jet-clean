// هذا endpoint بسيط جداً لاختبار الاتصال - لا يستخدم Prisma أو bcrypt
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    return NextResponse.json({ 
      success: false, 
      error: 'اتصال ناجح - المشكلة في قاعدة البيانات',
      receivedBody: body.substring(0, 50)
    })
  } catch (e: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'اتصال ناجح ولكن فشل قراءة البيانات',
      errorMsg: e?.message || 'unknown'
    })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'login-simple endpoint works', time: new Date().toISOString() })
}