#!/bin/bash
# ============================================
# سكريبت تحويل قاعدة البيانات من SQLite إلى PostgreSQL
# (Supabase أو Neon - مجاني)
# ============================================
#
# الاستخدام:
#   bash scripts/migrate-to-postgres.sh
#
# المتطلبات:
#   1. إنشاء مشروع مجاني على Supabase أو Neon
#   2. نسخ رابط الاتصال وتحديث ملف .env
#
# === Supabase ===
# 1. اذهب إلى https://supabase.com/dashboard
# 2. أنشئ مشروع جديد (مجاني)
# 3. اذهب إلى Settings > Database
# 4. انسخ Connection string > URI
# 5. الصقه في ملف .env: DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
#
# === Neon ===
# 1. اذهب إلى https://console.neon.tech
# 2. أنشئ مشروع جديد (مجاني)
# 3. انسخ Connection string
# 4. الصق في ملف .env:
#    DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DB]?sslmode=require&pgbouncer=true
#    DIRECT_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DB]?sslmode=require
# ============================================

set -e

cd /home/z/my-project

echo "🔄 بدء التحويل إلى PostgreSQL..."
echo ""

# 1. التحقق من ملف .env
if ! grep -q "postgresql://" .env 2>/dev/null; then
    echo "❌ الرابط في .env ليس PostgreSQL!"
    echo "   يرجى تحديث DATABASE_URL في ملف .env برابط PostgreSQL"
    echo ""
    echo "   مثال Supabase:"
    echo "   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
    echo ""
    echo "   مثال Neon:"
    echo "   DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DB]?sslmode=require"
    exit 1
fi

echo "✅ تم العثور على رابط PostgreSQL في .env"

# 2. نسخ schema لـ PostgreSQL
echo "📋 نسخ schema.postgresql.prisma إلى schema.prisma..."
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# 3. تثبيت pg driver إذا لم يكن مثبتًا
if ! node -e "require('pg')" 2>/dev/null; then
    echo "📦 تثبيت @prisma/adapter-pg و pg..."
    npm install @prisma/adapter-pg pg 2>/dev/null || bun add @prisma/adapter-pg pg 2>/dev/null
fi

# 4. توليد Prisma Client
echo "⚙️ توليد Prisma Client..."
npx prisma generate

# 5. دفع الـ Schema لقاعدة البيانات
echo "🗄️ إنشاء الجداول في PostgreSQL..."
npx prisma db push --accept-data-loss

# 6. نقل البيانات من SQLite إلى PostgreSQL
echo "📤 نقل البيانات..."

node -e "
const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('better-sqlite3');

async function migrate() {
    // Connect to SQLite
    const sqlite = new sqlite3.default('/home/z/my-project/db/custom.db');
    
    // Connect to PostgreSQL
    const pg = new PrismaClient();
    
    try {
        // Migrate Branches
        const branches = sqlite.prepare('SELECT * FROM Branch').all();
        console.log('   Branches: ' + branches.length);
        for (const b of branches) {
            await pg.branch.upsert({
                where: { id: b.id },
                update: { name: b.name },
                create: { id: b.id, name: b.name }
            });
        }
        
        // Migrate AdminAccount
        const admins = sqlite.prepare('SELECT * FROM AdminAccount').all();
        console.log('   AdminAccount: ' + admins.length);
        for (const a of admins) {
            await pg.adminAccount.upsert({
                where: { id: a.id },
                update: { name: a.name, password: a.password },
                create: { id: a.id, name: a.name, password: a.password }
            });
        }
        
        // Migrate Employees
        const employees = sqlite.prepare('SELECT * FROM Employee').all();
        console.log('   Employees: ' + employees.length);
        for (const e of employees) {
            await pg.employee.upsert({
                where: { id: e.id },
                update: { name: e.name, branchId: e.branchId, shift: e.shift, password: e.password },
                create: { id: e.id, name: e.name, branchId: e.branchId, shift: e.shift, password: e.password }
            });
        }
        
        console.log('✅ تم نقل البيانات بنجاح!');
    } catch (err) {
        console.error('❌ خطأ في نقل البيانات:', err.message);
        process.exit(1);
    } finally {
        sqlite.close();
        await pg.\$disconnect();
    }
}

migrate();
" 2>&1 || echo "⚠️ لم يتم نقل البيانات تلقائياً - يمكن نقلها يدوياً من لوحة التحكم"

# 7. إعادة البناء
echo "🔨 إعادة بناء التطبيق..."
npx next build

echo ""
echo "✅ تم التحويل بنجاح!"
echo ""
echo "📌 ملخص:"
echo "   - schema.prisma تم تحديثه لـ PostgreSQL"
echo "   - الجداول تم إنشاؤها في PostgreSQL"
echo "   - البيانات تم نقلها (إذا نجح السكريبت)"
echo "   - التطبيق تم إعادة بنائه"
echo ""
echo "🔄 للرجوع إلى SQLite:"
echo "   bash scripts/migrate-to-sqlite.sh"
