import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// إعداد WebSocket لبيئة serverless (مطلوب لـ Neon)
if (typeof WebSocket === 'undefined') {
  // @ts-ignore
  globalThis.WebSocket = ws
}

// تعطيل خيار WebSocket الجاهز في Neon لاستخدام ws بدلاً منه
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || ''

  // في الإنتاج (Vercel + Neon): استخدام Neon adapter مع connection pooling
  if (process.env.NODE_ENV === 'production' && databaseUrl.includes('postgresql')) {
    // استخدام connection pooling عبر pgbouncer
    const pooledUrl = databaseUrl.includes('/pooler')
      ? databaseUrl
      : databaseUrl.replace(/\/([^/]+)\?/, '/$1?').replace('?', '?pgbouncer=true&') + 'connect_timeout=15&sslmode=require'

    const pool = new Pool({ connectionString: pooledUrl, max: 3 })
    const adapter = new PrismaNeon(pool)

    return new PrismaClient({
      adapter,
      log: [],
    })
  }

  // في التطوير المحلي: اتصال عادي
  return new PrismaClient({
    log: [],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// الحفاظ على singleton في كل البيئات (مهم لـ serverless)
globalForPrisma.prisma = db
