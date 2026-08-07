import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  let dbUrl = process.env.DATABASE_URL || ''
  const separator = dbUrl.includes('?') ? '&' : '?'
  // pgbouncer: يحسن إدارة الاتصالات في serverless (Neon)
  // connection_limit=3: تقليل عدد الاتصالات simultaneous
  dbUrl = `${dbUrl}${separator}pgbouncer=true&connection_limit=3&pool_timeout=5`

  return new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: dbUrl
      }
    }
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// في الإنتاج: نحافظ على الاتصال نفسه (global singleton)
if (process.env.NODE_ENV === 'production') {
  globalForPrisma.prisma = db
}
