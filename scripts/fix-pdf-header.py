# -*- coding: utf-8 -*-

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Modify Page 1 header:
#    - Remove المسؤول and الموظف
#    - Title = branch name
#    - Below title = date
# ============================================================

old_page1_header = """            var page1Html = '<div style="width:780px;background:#fff;color:#000;padding:15px 10px;font-family:Cairo,sans-serif;" dir="rtl">' +
                '<div style="text-align:center;margin-bottom:10px;border-bottom:2px solid #000;padding-bottom:8px;">' +
                '<h1 style="font-size:18px;font-weight:bold;margin:0;">نموذج مغاسل جيت كلين</h1>' +
                '</div>' +
                '<div style="display:flex;gap:0;border:1px solid #000;margin-bottom:10px;">' +
                '<div style="flex:1;padding:4px 8px;border-left:1px solid #000;font-size:11px;">المسؤول: ' + ADMIN_ACCOUNT.name + '</div>' +
                '<div style="flex:1;padding:4px 8px;border-left:1px solid #000;font-size:11px;">الموظف: ' + (empLabel || allEmpNames.join(' / ')) + '</div>' +
                '<div style="flex:1;padding:4px 8px;font-size:11px;">التاريخ: ' + formatDateShort(selectedDate) + '</div>' +
                '</div>' +
                roomsGridHtml +
                totalsHtml +
                '</div>';"""

new_page1_header = """            var page1Html = '<div style="width:780px;background:#fff;color:#000;padding:15px 10px;font-family:Cairo,sans-serif;" dir="rtl">' +
                '<div style="text-align:center;margin-bottom:10px;border-bottom:2px solid #000;padding-bottom:8px;">' +
                '<h1 style="font-size:22px;font-weight:bold;margin:0;">مغسلة جيت كلين - ' + branchName + '</h1>' +
                '<p style="font-size:13px;margin:4px 0 0 0;color:#333;">تقرير تسجيل السيارات</p>' +
                '<p style="font-size:12px;margin:2px 0 0 0;color:#555;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
                '</div>' +
                roomsGridHtml +
                totalsHtml +
                '</div>';"""

if old_page1_header in content:
    content = content.replace(old_page1_header, new_page1_header)
    print("OK: Page 1 header updated")
else:
    print("FAIL: Page 1 header not found")

# ============================================================
# 2. Modify Page 2 header:
#    - Remove المسؤول and الموظف
#    - Title = branch name
#    - Below title = date
# ============================================================

old_page2_header = """            var page2Html = '<div style="width:780px;background:#fff;color:#000;padding:15px 10px;font-family:Cairo,sans-serif;" dir="rtl">' +
                '<div style="text-align:center;margin-bottom:10px;border-bottom:2px solid #000;padding-bottom:8px;">' +
                '<h1 style="font-size:16px;font-weight:bold;margin:0;">مصاريف العمال والخزينة</h1>' +
                '</div>' +
                '<div style="display:flex;gap:0;border:1px solid #000;margin-bottom:10px;">' +
                '<div style="flex:1;padding:4px 8px;border-left:1px solid #000;font-size:11px;">المسؤول: ' + ADMIN_ACCOUNT.name + '</div>' +
                '<div style="flex:1;padding:4px 8px;border-left:1px solid #000;font-size:11px;">الموظف: ' + (empLabel || allEmpNames.join(' / ')) + '</div>' +
                '<div style="flex:1;padding:4px 8px;font-size:11px;">التاريخ: ' + formatDateShort(selectedDate) + '</div>' +
                '</div>' +
                sideBySideHtml +
                '</div>';"""

new_page2_header = """            var page2Html = '<div style="width:780px;background:#fff;color:#000;padding:15px 10px;font-family:Cairo,sans-serif;" dir="rtl">' +
                '<div style="text-align:center;margin-bottom:10px;border-bottom:2px solid #000;padding-bottom:8px;">' +
                '<h1 style="font-size:20px;font-weight:bold;margin:0;">مغسلة جيت كلين - ' + branchName + '</h1>' +
                '<p style="font-size:13px;margin:4px 0 0 0;color:#333;">مصاريف العمال والخزينة</p>' +
                '<p style="font-size:12px;margin:2px 0 0 0;color:#555;">التاريخ: ' + formatDateShort(selectedDate) + '</p>' +
                '</div>' +
                sideBySideHtml +
                '</div>';"""

if old_page2_header in content:
    content = content.replace(old_page2_header, new_page2_header)
    print("OK: Page 2 header updated")
else:
    print("FAIL: Page 2 header not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n=== PDF report header updated ===")
