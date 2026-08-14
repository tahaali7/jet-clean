---
Task ID: 2
Agent: Main Agent
Task: استعادة البيانات من الباك اب إلى PostgreSQL على Vercel

Work Log:
- استخراج البيانات من ملفات الباك اب (branches_backup.json, employees_backup.json)
- إنشاء سكريبت شامل (seed-vercel.js) لنقل البيانات عبر API
- إنشاء حساب المسؤول على Vercel عبر /api/setup
- استعادة 5 فروع و 16 موظف عبر /api/restore
- إصلاح middleware: السماح بـ GET /api/branches و /api/employees بدون auth (لصفحة تسجيل الدخول)
- التحقق النهائي: كل شيء يعمل (فروع، موظفين، تسجيل دخول، endpoints محمية)

Stage Summary:
- تم نقل البيانات بنجاح: 5 فروع، 13 موظف نشط، 4 قادرين على تسجيل الدخول
- صفحة تسجيل الدخول تعرض الآن: المسؤول + إياد عماد + حقي + عبدالخالق + هاشم
- كلمات المرور في قاعدة البيانات نصية (ستُهاش تلقائياً عند أول تسجيل دخول)
- الـ endpoints المحمية (restore, backup, etc.) تعمل بشكل صحيح
---
Task ID: 1
Agent: Main Agent
Task: أخذ باك أب كامل + إنشاء نسخة تجريبية + تنفيذ ميزة التصكيرة

Work Log:
- أخذ باك أب كامل للكود (tar.gz 61MB + ملفات فردية) في download/backup-before-coverage/
- أخذ باك أب للداتا بيز SQLite + ملفات الإعدادات
- إنشاء نسخة تجريبية منفصلة في /home/z/my-project-test/
- تثبيت node_modules + SQLite schema + seed بيانات تجريبية
- تحديث Prisma Schema: إضافة حقول جديدة (type, workerName, room, coverageStatus لـ WorkerExpense + Record + Treasury) + جدول CoverageRecord جديد
- إنشاء API /api/coverage (GET للتحليل + POST للتنفيذ)
- إضافة إذن الوصول في auth.ts
- اختبار تحليل التصكيرة: ✅
- اختبار تنفيذ التصكيرة (تغطية بالكاش): ✅
- اختبار النقل بين الفروع: ✅

Stage Summary:
- الباك أب الكامل محفوظ في: /home/z/my-project/download/backup-before-coverage/
- النسخة التجريبية في: /home/z/my-project-test/
- Schema محدث بالحقول الجديدة + جدول CoverageRecord
- API /api/coverage يعمل (تحليل + تنفيذ + نقل بين فروع)
- كل الاختبارات الثلاثة ناجحة
- الداتا الأصلية في التطبيق الحقيقي لم تتأثر إطلاقاً
