import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''
  const separator = dbUrl.includes('?') ? '&' : '?'
  const poolUrl = `${dbUrl}${separator}connection_limit=3&pool_timeout=10`

  const client = new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: poolUrl
      }
    }
  })

  return client
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// الحفاظ على singleton في كل البيئات (مهم لـ serverless)
globalForPrisma.prisma = db
