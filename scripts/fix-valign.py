# -*- coding: utf-8 -*-

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Cleanliness label cell (worker expenses in buildCarReportHTML)
old1 = "font-size:11px;font-weight:bold;text-align:center;\">\\u{1F9F9} النظافة</td>"
new1 = "font-size:11px;font-weight:bold;text-align:center;vertical-align:middle;\">\\u{1F9F9} النظافة</td>"
if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("OK: Cleanliness label vertical-align")

# 2. Cleanliness value cell
old2 = "font-size:12px;font-weight:bold;color:#b45309;\">"
new2 = "font-size:12px;font-weight:bold;color:#b45309;vertical-align:middle;\">"
if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("OK: Cleanliness value vertical-align")

# 3. الإجمالي label in worker expenses
old3 = "font-size:12px;font-weight:bold;text-align:center;\">الإجمالي</td>"
new3 = "font-size:12px;font-weight:bold;text-align:center;vertical-align:middle;\">الإجمالي</td>"
if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("OK: Worker total label vertical-align")

# 4. الإجمالي value in worker expenses
old4 = "font-size:14px;font-weight:bold;color:#1b7a3d;\">"
new4 = "font-size:14px;font-weight:bold;color:#1b7a3d;vertical-align:middle;\">"
if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print("OK: Worker total value vertical-align")

# 5. Room name cell (worker expenses)
old5 = "font-size:11px;text-align:center;\">"
new5 = "font-size:11px;text-align:center;vertical-align:middle;\">"
if old5 in content:
    content = content.replace(old5, new5)
    changes += 1
    print("OK: Room name vertical-align")

# 6. Room value cell (worker expenses) - already has vertical-align from step in apply-centering
# but let's double-check
old6 = "font-size:12px;font-weight:bold;\">"
# This is too generic, skip

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n=== {changes} vertical-align fixes applied ===")
