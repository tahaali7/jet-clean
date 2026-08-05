---
Task ID: 1
Agent: Main Agent
Task: تحويل قاعدة البيانات من SQLite إلى PostgreSQL (Supabase)

Work Log:
- قراءة ملف schema.prisma الحالي (SQLite) وفهم الجداول والعلاقات
- تصدير البيانات الحالية: 4 فروع، 7 موظفين، 1 حساب مسؤول
- إنشاء prisma/schema.postgresql.prisma بـ provider = "postgresql"
- إنشاء scripts/migrate-to-postgres.sh و migrate-to-sqlite.sh
- إنشاء scripts/migrate-data.py سكريبت نقل البيانات
- تحديث package.json بإضافة npm run db:to-pg و db:to-sqlite
- إنشاء مشروع Supabase مجاني (المستخدم أنشأه يدوياً)
- تحديث .env برابط Supabase PostgreSQL الحقيقي
- إضافة IP لقائمة المسموحات في Supabase (Allow all IPs)
- تثبيت pg driver و Prisma generate
- prisma db push - إنشاء كل الجداول في Supabase PostgreSQL بنجاح
- نقل البيانات: 4 فروع + 7 موظفين + 1 مسؤول عبر pg node driver
- حل مشكلة: DATABASE_URL كان مُصدّر في shell ويتجاوز .env
- إزالة pgbouncer=true من URL (يسبب مشكلة مع Prisma)
- اختبار API: /api/branches يعمل بنجاح على PostgreSQL
- بناء إنتاجي ناجح: npx next build

Stage Summary:
- ✅ التحويل مكتمل: التطبيق يعمل على Supabase PostgreSQL
- ✅ كل البيانات تم نقلها بنجاح (4 فروع، 7 موظفين، 1 مسؤول)
- ✅ Prisma queries تستخدم صيغة PostgreSQL ("public"."Branch"."id")
- ✅ بناء إنتاجي ناجح
- ملاحظة: DATABASE_URL مُصدّر في shell - يحتاج تحديث في بيئة الإنتاج
