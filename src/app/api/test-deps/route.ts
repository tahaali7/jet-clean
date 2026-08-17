import { NextResponse } from 'next/server'

export const maxDuration = 10

// نختبر كل import بشكل منفصل لمعرفة أي واحد يفشل
let prismaOk = false
let bcryptOk = false
let joseOk = false
let dbOk = false
let errorMsg = ''

try {
  const { PrismaClient } = require('@prisma/client')
  prismaOk = true
} catch (e: any) {
  errorMsg += 'PRISMA_FAIL:' + (e?.message || 'unknown') + ' | '
}

try {
  require('bcryptjs')
  bcryptOk = true
} catch (e: any) {
  errorMsg += 'BCRYPT_FAIL:' + (e?.message || 'unknown') + ' | '
}

try {
  require('jose')
  joseOk = true
} catch (e: any) {
  errorMsg += 'JOSE_FAIL:' + (e?.message || 'unknown') + ' | '
}

export async function GET() {
  let dbTest = 'not_tested'
  if (prismaOk) {
    try {
      const { db } = require('@/lib/db')
      // محاولة استعلام بسيط
      const result = await db.adminAccount.findFirst({ select: { id: true } })
      dbOk = true
      dbTest = 'ok'
    } catch (e: any) {
      dbTest = 'FAIL:' + (e?.message || 'unknown').substring(0, 100)
      errorMsg += 'DB_FAIL:' + (e?.message || 'unknown') + ' | '
    }
  }

  return NextResponse.json({
    prisma: prismaOk,
    bcrypt: bcryptOk,
    jose: joseOk,
    db: dbOk,
    dbTest,
    error: errorMsg || null
  })
}