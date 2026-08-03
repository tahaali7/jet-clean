import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=3&pool_timeout=10&connect_timeout=5'
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
