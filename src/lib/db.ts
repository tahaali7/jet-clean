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
export async function ensureMigrations() {
  if (globalForPrisma.migrationsRan) return
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "CarEntry" ADD COLUMN IF NOT EXISTS "entryTime" TEXT NOT NULL DEFAULT ''`)
    await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "hasLogin" BOOLEAN NOT NULL DEFAULT false`)
    await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'employee'`)
    await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "startDate" TEXT NOT NULL DEFAULT ''`)
    await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "endDate" TEXT NOT NULL DEFAULT ''`)
    await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "multiBranchIds" TEXT NOT NULL DEFAULT '[]'`)
    await db.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false`)
    await db.$executeRawUnsafe(`ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "config" TEXT`)
    await db.$executeRawUnsafe(`ALTER TABLE "WorkerExpense" ADD COLUMN IF NOT EXISTS "jsonData" TEXT`)
    globalForPrisma.migrationsRan = true
  } catch (error: any) {
    // إذا كان العمود موجوداً بالفعل، نتجاهل الخطأ
    const msg = error?.message || ''
    if (msg.includes('already exists') || msg.includes('relation') || msg.includes('does not exist')) {
      globalForPrisma.migrationsRan = true
    } else {
      console.error('Migration error:', error)
      globalForPrisma.migrationsRan = true // لا نعيد المحاولة
    }
  }
}
