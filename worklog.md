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

---
Task ID: 1
Agent: main
Task: Fix PDF report design - improve colors, contrast, and text visibility for branch expenses export

Work Log:
- Analyzed handleExportExpensesPDF function (lines 2147-2325) to identify styling issues
- Found root cause: date header rows used dark background (rgba(30,41,59,0.8)) with light text (#94a3b8, #e2e8f0) on white page, causing poor contrast
- Expense item rows had #94a3b8 (gray) text on white - hard to read
- Table header was #e0e0e0 with dark text - acceptable but inconsistent
- Total row used light red #fde2e2 with dark red #dc2626 text - acceptable

- Fixed date header rows: changed to #1e40af (blue) background with white text
- Fixed expense item rows: changed to #f8fafc (very light blue) bg with #1e293b (dark navy) text
- Fixed row borders: changed from #555 to #cbd5e1 for cleaner look
- Fixed amounts color: kept #b91c1c (dark red) for contrast
- Fixed table header: changed to #1e40af with white text for consistency
- Fixed total row: changed to #b91c1c (red) background with white text
- Updated page header: larger title, blue color (#1e40af), thicker border
- Added styled section heading with left border accent (#b91c1c)

- Fixed withdrawals/shortages page (page 2) with same design system
- Type badges now use white text on colored backgrounds (amber/red) instead of colored text on white
- Summary rows: amber (#d97706) for withdrawals, red (#dc2626) for shortages, dark navy (#0f172a) for grand total

Stage Summary:
- PDF report now uses consistent blue (#1e40af) header theme
- All text is high-contrast: dark text (#1e293b) on light backgrounds, white text (#fff) on dark backgrounds
- Date separators are clearly visible blue bars with white text
- Type badges (سحب/عجز) are now colored pills with white text
- Build successful, no errors
