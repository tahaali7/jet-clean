import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''
  const separator = dbUrl.includes('?') ? '&' : '?'
  // تقليل عدد الاتصالات لتجنب استهلاك الحد الأقصى في Neon
  const poolUrl = `${dbUrl}${separator}connection_limit=3&pool_timeout=5`

  return new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: poolUrl
      }
    }
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// في الإنتاج: نحافظ على الاتصال نفسه (global singleton)
if (process.env.NODE_ENV === 'production') {
  globalForPrisma.prisma = db
}
