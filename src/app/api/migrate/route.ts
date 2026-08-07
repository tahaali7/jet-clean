import { NextResponse } from 'next/server'
import { ensureMigrations, forceMigrations } from '@/lib/db'

export async function GET() {
  try {
    // تشغيل كل الترحيلات بالقوة
    await forceMigrations()
    return NextResponse.json({
      success: true,
      message: 'تم تشغيل الترحيلات بنجاح - جميع الأعمدة الجديدة تم إضافتها'
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'فشل الترحيل'
    }, { status: 500 })
  }
}
