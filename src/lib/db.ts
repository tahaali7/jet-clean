import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // إعدادات محسّنة لبيئة serverless (Vercel + Neon)
    ...(process.env.NODE_ENV === 'production' ? {
      transactionOptions: {
        timeout: 15000, // 15 ثانية timeout للمعاملات
        maxWait: 10000, // أقصى انتظار 10 ثواني للحصول على اتصال
      },
    } : {}),
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// الحفاظ على singleton في كل البيئات (مهم لـ serverless)
globalForPrisma.prisma = db
