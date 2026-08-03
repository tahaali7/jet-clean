# -*- coding: utf-8 -*-

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ============================================================
# Strategy: Add vertical-align:middle to ALL td cells in report
# The cleanest way: add it to the base style variables
# ============================================================

# 1. buildRoomTableHTML - cellPad variable (line ~2175)
old = "var cellPad = 'padding:3px 4px;';"
new = "var cellPad = 'padding:5px 4px;vertical-align:middle;';"
if old in content:
    content = content.replace(old, new, 1)  # first occurrence only (buildRoomTableHTML)
    print("OK: buildRoomTableHTML cellPad - added vertical-align:middle")
    changes += 1
else:
    print("FAIL: buildRoomTableHTML cellPad")

# 2. buildEmptyRoomTableHTML - cellPad variable (line ~2442)
# This is the second occurrence of the same pattern
idx2 = content.find("var cellPad = 'padding:3px 4px;'", 2200)
if idx2 >= 0:
    content = content[:idx2] + "var cellPad = 'padding:5px 4px;vertical-align:middle;';" + content[idx2 + len("var cellPad = 'padding:3px 4px;'")]
    print("OK: buildEmptyRoomTableHTML cellPad - added vertical-align:middle")
    changes += 1
else:
    print("FAIL: buildEmptyRoomTableHTML cellPad")

# 3. Page 2 treasury - tCellPad variable (line ~2353)
old3 = "var tCellPad = 'padding:4px 6px;border:1px solid #333;';"
new3 = "var tCellPad = 'padding:5px 6px;border:1px solid #333;vertical-align:middle;';"
if old3 in content:
    content = content.replace(old3, new3)
    print("OK: Treasury tCellPad - added vertical-align:middle")
    changes += 1
else:
    print("FAIL: Treasury tCellPad")

# 4. Page 2 worker expenses - hardcoded padding cells
# These don't use cellPad, they have inline styles
# Room rows (line ~2317-2320)
old4a = "'<td style=\"padding:4px 8px;border:1px solid #333;font-size:11px;text-align:center;\">'"
new4a = "'<td style=\"padding:5px 8px;border:1px solid #333;font-size:11px;text-align:center;vertical-align:middle;\">'"
if old4a in content:
    content = content.replace(old4a, new4a)
    print("OK: Worker room name cells - added vertical-align:middle")
    changes += 1

old4b = "'<td style=\"padding:4px 8px;border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;\">'"
new4b = "'<td style=\"padding:5px 8px;border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;vertical-align:middle;\">'"
if old4b in content:
    content = content.replace(old4b, new4b)
    print("OK: Worker value cells - added vertical-align:middle")
    changes += 1

# Cleanliness label cell
old4c = "'<td style=\"padding:4px 8px;border:1px solid #333;font-size:11px;font-weight:bold;text-align:center;\">'"
# This was already replaced by 4a if same pattern, let me check uniqueness
# Actually the cleanliness cell has a different style, let me find it directly
idx_clean = content.find("\\u{1F9F9}")
if idx_clean >= 0:
    # Find the td before it
    td_start = content.rfind("<td style=\"", 0, idx_clean)
    td_end = content.find("\">", td_start) + 2
    old_td_clean = content[td_start:td_end]
    if "vertical-align" not in old_td_clean:
        new_td_clean = old_td_clean.replace("text-align:center;\"", "text-align:center;vertical-align:middle;\"")
        content = content[:td_start] + new_td_clean + content[td_end:]
        print("OK: Cleanliness label cell - added vertical-align:middle")
        changes += 1

# Cleanliness value cell
old4d = "font-size:12px;font-weight:bold;color:#b45309;\\'>"
new4d = "font-size:12px;font-weight:bold;color:#b45309;vertical-align:middle;\\'>"
if old4d in content:
    content = content.replace(old4d, new4d)
    print("OK: Cleanliness value cell - added vertical-align:middle")
    changes += 1

# 5. Room table header/title cells (colspan cells that have inline styles without cellPad)
# Title cell (room name)
old5a = "style=\"border:1px solid #333;padding:3px 4px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;\""
new5a = "style=\"border:1px solid #333;padding:5px 4px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;vertical-align:middle;\""
if old5a in content:
    content = content.replace(old5a, new5a)
    print("OK: Room title cells - added vertical-align:middle + more padding")
    changes += 1

# Worker expenses header cell
old5b = "style=\"padding:4px 8px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;border:1px solid #333;\""
new5b = "style=\"padding:5px 8px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;border:1px solid #333;vertical-align:middle;\""
if old5b in content:
    content = content.replace(old5b, new5b)
    print("OK: Worker expenses header cell - added vertical-align:middle")
    changes += 1

# Treasury header cells (4-column header row)
old5c = "'<td style=\"' + tValueStyle + '\">دخل</td>'"
new5c = "'<td style=\"' + tValueStyle + '\">دخل</td>'"
# These use tValueStyle which now has vertical-align:middle via tCellPad - already covered!

# 6. Empty room table - العامل and التاريخ cells (line ~2458-2459)
# These use cellPad which is now updated, but check if they have explicit padding
# Actually they use cellPad variable which we already fixed

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n=== {changes} changes applied for perfect centering ===")
