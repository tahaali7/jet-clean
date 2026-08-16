/**
 * Migration Script: Hash existing plain-text passwords with bcrypt
 * Run: npx tsx scripts/migrate-passwords.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Use the DATABASE_URL from .env (SQLite)
const db = new PrismaClient()

async function isBcryptHash(str: string): boolean {
  return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$')
}

async function migratePasswords() {
  console.log('🔄 Starting password migration...')

  // 1. Hash Admin password
  try {
    const admin = await db.adminAccount.findUnique({ where: { id: 'admin' } })
    if (admin) {
      if (admin.password && !isBcryptHash(admin.password)) {
        const hashed = await bcrypt.hash(admin.password, 12)
        await db.adminAccount.update({
          where: { id: 'admin' },
          data: { password: hashed }
        })
        console.log('✅ Admin password hashed')
      } else if (isBcryptHash(admin.password)) {
        console.log('⏭️  Admin password already hashed — skipping')
      } else {
        console.log('⚠️  Admin has no password — skipping')
      }
    } else {
      console.log('⚠️  No admin account found')
    }
  } catch (err: any) {
    console.error('❌ Error migrating admin password:', err?.message)
  }

  // 2. Hash Employee passwords
  try {
    const employees = await db.employee.findMany({
      where: {
        hasLogin: true,
        deleted: false
      }
    })

    let hashedCount = 0
    let skippedCount = 0

    for (const emp of employees) {
      if (!emp.password || emp.password === '') {
        skippedCount++
        continue
      }

      if (isBcryptHash(emp.password)) {
        skippedCount++
        continue
      }

      const hashed = await bcrypt.hash(emp.password, 12)
      await db.employee.update({
        where: { id: emp.id },
        data: { password: hashed }
      })
      console.log(`✅ Employee "${emp.name}" password hashed`)
      hashedCount++
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   Hashed: ${hashedCount} passwords`)
    console.log(`   Skipped: ${skippedCount} (already hashed or empty)`)
  } catch (err: any) {
    console.error('❌ Error migrating employee passwords:', err?.message)
  }

  console.log('✅ Migration complete!')
}

migratePasswords()
  .catch(err => {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
