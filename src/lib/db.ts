import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL || ''

  // في الإنتاج: إضافة إعدادات اتصال أفضل لـ Neon
  let connectionString = url
  if (process.env.NODE_ENV === 'production' && url.includes('postgresql')) {
    const separator = url.includes('?') ? '&' : '?'
    connectionString = url + separator + 'connect_timeout=30&sslmode=require'
  }

  return new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: connectionString,
      },
    },
    ...(process.env.NODE_ENV === 'production' ? {
      transactionOptions: {
        timeout: 20000,
        maxWait: 15000,
      },
    } : {}),
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// الحفاظ على singleton في كل البيئات (مهم لـ serverless)
globalForPrisma.prisma = db
