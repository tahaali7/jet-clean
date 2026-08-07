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

// ============================================
// استخراج رابط مباشر من DATABASE_URL (بدون PgBouncer)
// ============================================
function getDirectUrl(): string {
  // 1. لو DIRECT_URL موجود، استخدمه
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL

  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl.startsWith('postgres')) return ''

  try {
    const url = new URL(dbUrl)

    // 2. لو الرابط فيه -pooler (Neon)، نستبدله بالإصدار المباشر
    let hostname = url.hostname
    if (hostname.includes('-pooler')) {
      hostname = hostname.replace('-pooler', '')
      url.hostname = hostname
      url.port = '5432'
    }

    // 3. نزيل معاملات PgBouncer
    url.searchParams.delete('pgbouncer')
    url.searchParams.delete('prepared_statements')
    url.searchParams.delete('statement_cache_size')

    // 4. نضيف sslmode لو ما موجودش
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require')
    }

    return url.toString()
  } catch {
    return dbUrl
  }
}

// ============================================
// ترحيل تلقائي
// ============================================
const MIGRATIONS = [
  // CarEntry
  `ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "entryTime" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "extraCars" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "extraAmount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "customPrices" TEXT NOT NULL DEFAULT '{}'`,
  // Employee
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hasLogin" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'employee'`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "startDate" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "endDate" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "multiBranchIds" TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false`,
  // Branch
  `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "config" TEXT`,
  // WorkerExpense
  `ALTER TABLE "WorkerExpense" ADD COLUMN IF NOT EXISTS "jsonData" TEXT`,
  // Treasury
  `ALTER TABLE "Treasury" ADD COLUMN IF NOT EXISTS "cash" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Treasury" ADD COLUMN IF NOT EXISTS "later" INTEGER NOT NULL DEFAULT 0`,
]

async function runMigrationsWithPg() {
  const directUrl = getDirectUrl()
  if (!directUrl) {
    console.log('[Migration] No postgres URL available')
    return false
  }

  try {
    const pg = await import('pg')
    const client = new pg.Client({
      connectionString: directUrl,
      ssl: directUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
    })
    await client.connect()

    for (const sql of MIGRATIONS) {
      try {
        await client.query(sql)
        console.log('[Migration] OK:', sql.substring(7, 50))
      } catch (error: any) {
        const msg = error?.message || String(error)
        if (msg.includes('already exists')) {
          console.log('[Migration] Skip (exists):', sql.substring(7, 50))
        } else {
          console.error('[Migration] Error:', sql.substring(7, 50), msg)
        }
      }
    }

    await client.end()
    return true
  } catch (error: any) {
    console.error('[Migration] pg failed:', error?.message || error)
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
        console.log('[Migration-prisma] Skip:', sql.substring(7, 50))
      } else {
        console.error('[Migration-prisma] Error:', sql.substring(7, 50), msg)
      }
    }
  }
}

async function runMigrations() {
  // نحاول بالاتصال المباشر (pg) أولاً — يتجاوز PgBouncer
  const pgOk = await runMigrationsWithPg()
  if (!pgOk) {
    // لو فشل، نحاول بـ Prisma
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
