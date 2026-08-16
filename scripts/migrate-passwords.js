/**
 * Migration Script: Hash existing plain-text passwords with bcrypt
 * Uses direct SQLite access
 * Run: node scripts/migrate-passwords.js
 */

const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

const DB_PATH = '/home/z/my-project/db/custom.db'

function isBcryptHash(str) {
  return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$')
}

async function migratePasswords() {
  console.log('🔄 Starting password migration (direct SQLite)...')
  
  const sqlite = new Database(DB_PATH)
  
  // 1. Hash Admin password
  try {
    const admin = sqlite.prepare('SELECT * FROM AdminAccount WHERE id = ?').get('admin')
    if (admin) {
      if (admin.password && !isBcryptHash(admin.password)) {
        const hashed = bcrypt.hashSync(admin.password, 12)
        sqlite.prepare('UPDATE AdminAccount SET password = ? WHERE id = ?').run(hashed, 'admin')
        console.log('✅ Admin password hashed')
      } else if (isBcryptHash(admin.password)) {
        console.log('⏭️  Admin password already hashed — skipping')
      } else {
        console.log('⚠️  Admin has no password — skipping')
      }
    } else {
      console.log('⚠️  No admin account found')
    }
  } catch (err) {
    console.error('❌ Error migrating admin password:', err.message)
  }

  // 2. Hash Employee passwords (all non-empty, non-hashed)
  try {
    const employees = sqlite.prepare('SELECT id, name, password FROM Employee').all()
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

      const hashed = bcrypt.hashSync(emp.password, 12)
      sqlite.prepare('UPDATE Employee SET password = ? WHERE id = ?').run(hashed, emp.id)
      console.log(`✅ Employee "${emp.name}" (${emp.id}) password hashed`)
      hashedCount++
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   Hashed: ${hashedCount} passwords`)
    console.log(`   Skipped: ${skippedCount} (already hashed or empty)`)
  } catch (err) {
    console.error('❌ Error migrating employee passwords:', err.message)
  }

  sqlite.close()
  console.log('✅ Migration complete!')
}

migratePasswords().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
