---
Task ID: 1
Agent: Main Agent
Task: تحويل قاعدة البيانات من SQLite إلى PostgreSQL مع إعداد سكريبتات التحويل

Work Log:
- قراءة ملف schema.prisma الحالي (SQLite) وفهم الجداول والعلاقات
- تصدير البيانات الحالية: 4 فروع، 7 موظفين، 1 حساب مسؤول
- إنشاء prisma/schema.postgresql.prisma بـ provider = "postgresql" + directUrl لـ Neon
- إنشاء scripts/migrate-to-postgres.sh - سكريبت تحويل كامل
- إنشاء scripts/migrate-to-sqlite.sh - سكريبت رجوع لـ SQLite
- إنشاء scripts/migrate-data.py - سكريبت نقل البيانات (Python)
- تحديث package.json بإضافة npm run db:to-pg و db:to-sqlite
- تحديث .env بتعليمات واضحة لـ Supabase و Neon
- التأكد من أن التطبيق يعمل: بناء ناجح + API يعمل + 4 فروع ظاهرة

Stage Summary:
- التطبيق يعمل حالياً على SQLite مع كل البيانات سليمة
- كل الإعداد جاهز للتحويل لـ PostgreSQL - يحتاج المستخدم فقط إنشاء مشروع مجاني
- سكريبتات التحويل جاهزة في scripts/
- API Routes متوافقة بدون تغييرات (Prisma يتكفل بالفرق)
