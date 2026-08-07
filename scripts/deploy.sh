#!/bin/bash
# سكريبت النشر التلقائي - بناء + رفع + نشر
cd /home/z/my-project

echo "🔨 جاري البناء..."
npx next build 2>&1 | tail -5

if [ $? -eq 0 ]; then
  echo "📦 جاري رفع الكود..."
  git add -A
  git commit -m "update: $(date '+%Y-%m-%d %H:%M')" --allow-empty
  git push origin main 2>&1 | tail -3
  echo "✅ تم الرفع بنجاح! Vercel سينشر تلقائياً خلال دقيقتين"
else
  echo "❌ خطأ في البناء"
fi
