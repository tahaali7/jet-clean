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
