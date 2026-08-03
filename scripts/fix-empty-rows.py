#!/usr/bin/env python3
# Remove empty pricing rows (count=0) from room tables in PDF report
# Only show rows that have actual car counts > 0

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix buildRoomTableHTML: skip rows with count=0
# Old code shows all rows even empty ones
old1 = """            // بناء صفوف الأسعار - عرض كل الصفوف حتى الفارغة للتنسيق الثابت
            var rowsHtml = '';
            prices.forEach(function(price, idx) {
                var count = mergedCounts[price] || 0;
                var countStyle = count > 0 ? 'font-weight:bold;' : '';
                // للأسعار الإكسترا: عرض السعر بعد خصم 5 د.ل (مثل الموقع)
                var isExtra = EXTRA_PRICES.includes(price);
                var displayPrice = isExtra ? (price - 5) : price;
                var rowAmount = count > 0 ? displayPrice * count : 0;
                rowsHtml += '<tr>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + (idx + 1) + '</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + displayPrice + ' د.ل</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;' + countStyle + '">' + (count > 0 ? count : '') + '</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + (count > 0 ? rowAmount + ' د.ل' : '') + '</td>' +
                    '</tr>';
            });"""

new1 = """            // بناء صفوف الأسعار - إظهار الصفوف التي بها سيارات فقط
            var rowsHtml = '';
            var rowNum = 0;
            prices.forEach(function(price, idx) {
                var count = mergedCounts[price] || 0;
                if (count === 0) return; // تخطي الصفوف الفارغة
                rowNum++;
                var isExtra = EXTRA_PRICES.includes(price);
                var displayPrice = isExtra ? (price - 5) : price;
                var rowAmount = displayPrice * count;
                rowsHtml += '<tr>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + rowNum + '</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + displayPrice + ' د.ل</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;">' + count + '</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + rowAmount + ' د.ل</td>' +
                    '</tr>';
            });"""

count1 = content.count(old1)
print(f"Fix 1 (buildRoomTableHTML): Found {count1} occurrences")
if count1 > 0:
    content = content.replace(old1, new1)
    print("Fixed!")
else:
    print("NOT FOUND - trying to locate...")
    # Search for the comment
    import re
    m = re.search(r'بناء صفوف الأسعار.*?عدد السيارات', content)
    if m:
        print(f"Found comment at position {m.start()}: {content[m.start():m.start()+60]}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
