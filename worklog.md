---
Task ID: 4
Agent: Main Agent
Task: حماية التطبيق - نظام JWT + Middleware + صلاحيات الأدوار

Work Log:
- أخذ باك اب كامل للتطبيق (كود + ملفات) في download/pre-security-backup/
- تثبيت مكتبة jose لـ JWT tokens
- إنشاء src/lib/auth.ts: نظام توكنات JWT كامل (إنشاء، تحقق، cookie management)
- إنشاء src/middleware.ts: حماية كل مسارات /api/ بالتحقق من الجلسة + صلاحيات الأدوار
- تحديث src/app/api/auth/login/route.ts: إرجاع JWT token في HttpOnly cookie
- إضافة GET endpoint للتحقق من الجلسة + DELETE endpoint لتسجيل الخروج
- تحديث الواجهة (page.tsx): logout ينظف الـ cookie عبر API + فحص صلاحية الجلسة
- إضافة credentials: 'include' لكل الـ fetch calls الحساسة (backup, restore, admin)
- إضافة JWT_SECRET في .env
- بناء إنتاجي ناجح (next build)

Stage Summary:
- ✅ كل APIs محمية الآن عبر Middleware (عدا /api/auth/login)
- ✅ صلاحيات حسب الدور: admin يصل لكل شيء، employee يصل لتسجيل السيارات، viewer يعرض فقط
- ✅ JWT Token في HttpOnly Cookie آمنة
- ✅ انتهاء صلاحية تلقائي بعد 24 ساعة
- ✅ تسجيل الخروج ينظف الـ cookie
- ✅ فحص صلاحية الجلسة عند فتح التطبيق
- ✅ الـ API endpoints الإدارية (backup, restore, maintenance, admin/password) محمية للمسؤول فقط
- ✅ بناء إنتاجي ناجح بدون أخطاء
