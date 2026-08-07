import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// الحفاظ على singleton في كل البيئات (مهم لـ serverless)
globalForPrisma.prisma = db
