import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  migrationsRan: boolean
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''
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

// ترحيل تلقائي
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

async function runMigrationsWithRawPg() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''
  if (!directUrl || !directUrl.startsWith('postgres')) {
    console.log('[Migration] No postgres URL, skipping raw pg migration')
    return false
  }

  try {
    const pg = await import('pg')
    const client = new pg.Client({ connectionString: directUrl })
    await client.connect()

    for (const sql of MIGRATIONS) {
      try {
        await client.query(sql)
        console.log('[Migration-pg] OK:', sql.substring(7, 50))
      } catch (error: any) {
        const msg = error?.message || String(error)
        if (msg.includes('already exists')) {
          console.log('[Migration-pg] Already exists:', sql.substring(7, 50))
        } else {
          console.error('[Migration-pg] Error:', sql.substring(7, 50), msg)
        }
      }
    }

    await client.end()
    return true
  } catch (error: any) {
    console.error('[Migration-pg] Failed:', error?.message || error)
    return false
  }
}

async function runMigrationsWithPrisma() {
  for (const sql of MIGRATIONS) {
    try {
      await db.$executeRawUnsafe(sql)
      console.log('[Migration-prisma] OK:', sql.substring(7, 50))
    } catch (error: any) {
      const msg = error?.message || String(error)
      if (msg.includes('already exists')) {
        console.log('[Migration-prisma] Already exists:', sql.substring(7, 50))
      } else {
        console.error('[Migration-prisma] Error:', sql.substring(7, 50), msg)
      }
    }
  }
}

async function runMigrations() {
  const pgSuccess = await runMigrationsWithRawPg()
  if (!pgSuccess) {
    await runMigrationsWithPrisma()
  }
}

export async function ensureMigrations() {
  if (globalForPrisma.migrationsRan) return
  globalForPrisma.migrationsRan = true
  await runMigrations()
}

export async function forceMigrations() {
  globalForPrisma.migrationsRan = false
  await runMigrations()
}
