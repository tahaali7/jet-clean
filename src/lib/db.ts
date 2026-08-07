import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  migrationsRan: boolean
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''
  // Add connection limits for PgBouncer
  const separator = dbUrl.includes('?') ? '&' : '?'
  const poolUrl = `${dbUrl}${separator}connection_limit=5&pool_timeout=10`

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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ترحيل تلقائي: إضافة أعمدة جديدة إذا لم تكن موجودة
const MIGRATIONS = [
  `ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "entryTime" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hasLogin" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'employee'`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "startDate" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "endDate" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "multiBranchIds" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "config" TEXT`,
  `ALTER TABLE "WorkerExpense" ADD COLUMN IF NOT EXISTS "jsonData" TEXT`,
]

async function runMigrations() {
  for (const sql of MIGRATIONS) {
    try {
      await db.$executeRawUnsafe(sql)
      console.log('[Migration] OK:', sql.substring(7, 50))
    } catch (error: any) {
      const msg = error?.message || String(error)
      if (msg.includes('already exists')) {
        console.log('[Migration] Already exists:', sql.substring(7, 50))
      } else {
        console.error('[Migration] Error:', sql.substring(7, 50), msg)
      }
    }
  }
}

export async function ensureMigrations() {
  if (globalForPrisma.migrationsRan) return
  globalForPrisma.migrationsRan = true
  await runMigrations()
}

// إعادة تشغيل الترحيل بالقوة (عند فشل الاستعلام بسبب عمود مفقود)
export async function forceMigrations() {
  globalForPrisma.migrationsRan = false
  await runMigrations()
}
