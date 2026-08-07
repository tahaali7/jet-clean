import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  columnAdded: boolean
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
// باكب تلقائي لكل بيانات CarEntry قبل أي تعديل
// ============================================
export async function autoBackup() {
  try {
    const entries = await db.$queryRawUnsafe(
      `SELECT id, date, "branchId", "empId", "empName", room, "totalCars", "totalAmount", "extraCars", "extraAmount", "priceCounts", "customPrices", "createdAt"
       FROM "CarEntry" ORDER BY "createdAt" DESC`
    )
    const records = await db.$queryRawUnsafe(
      `SELECT id, "empId", type, amount, note, date, "branchId" FROM "Record" ORDER BY date DESC`
    )
    const employees = await db.$queryRawUnsafe(
      `SELECT id, name, "branchId", shift, password, role, "hasLogin", "startDate", "endDate", "multiBranchIds", deleted FROM "Employee"`
    )

    const backupData = JSON.stringify({ carEntries: entries, records, employees, timestamp: new Date().toISOString() })

    await db.$executeRawUnsafe(
      `INSERT INTO "BackupFile" (id, label, data, "createdAt") VALUES (gen_random_uuid()::text, 'auto-before-entryTime', '${backupData.replace(/'/g, "''")}', NOW())`
    )
    console.log('[AutoBackup] Saved backup before entryTime migration')
    return true
  } catch (error: any) {
    console.error('[AutoBackup] Failed:', error?.message)
    return false
  }
}

// ============================================
// ترحيل آمن: إضافة عمود entryTime فقط
// ============================================
export async function addEntryTimeColumn() {
  if (globalForPrisma.columnAdded) return true
  globalForPrisma.columnAdded = true

  try {
    // فحص هل العمود موجود
    const cols: any[] = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'CarEntry' AND column_name = 'entryTime'`
    )
    if (cols.length > 0) {
      console.log('[Migration] entryTime column already exists')
      return true
    }

    // باكب تلقائي قبل التعديل
    await autoBackup()

    // إضافة العمود
    await db.$executeRawUnsafe(
      `ALTER TABLE "CarEntry" ADD COLUMN "entryTime" TEXT NOT NULL DEFAULT ''`
    )
    console.log('[Migration] entryTime column added successfully')
    return true
  } catch (error: any) {
    console.error('[Migration] Failed to add entryTime:', error?.message)
    // لو فشل، ما نعيد المحاولة - البيانات القديمة تظل شغالة
    return false
  }
}
