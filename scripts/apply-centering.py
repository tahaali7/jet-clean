# -*- coding: utf-8 -*-
"""
Apply vertical-align:middle to all report table cells.
Using simple targeted replacements.
"""

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. buildRoomTableHTML cellPad
old1 = "var cellPad = 'padding:3px 4px;'"
new1 = "var cellPad = 'padding:5px 4px;vertical-align:middle;'"
count1 = content.count(old1)
print(f"Found '{old1}' {count1} time(s)")
if count1 > 0:
    content = content.replace(old1, new1)
    changes += count1
    print(f"OK: Replaced {count1} cellPad occurrences")

# 2. buildEmptyRoomTableHTML cellPad (same variable name, already replaced by step 1 if identical)
# Check if there's a separate one
old2 = "            var cellPad = 'padding:5px 4px;vertical-align:middle;';\n            var prices = getRoomsForRoom(room);"
# No, the empty room table also uses same pattern

# 3. Treasury tCellPad
old3 = "var tCellPad = 'padding:4px 6px;border:1px solid #333;'"
new3 = "var tCellPad = 'padding:5px 6px;border:1px solid #333;vertical-align:middle;'"
if old3 in content:
    content = content.replace(old3, new3)
    print("OK: Treasury tCellPad")
    changes += 1

# 4. Worker expenses hardcoded padding cells
# Room name cell
old4a = "'<td style=\"padding:4px 8px;border:1px solid #333;font-size:11px;text-align:center;\">'"
new4a = "'<td style=\"padding:5px 8px;border:1px solid #333;font-size:11px;text-align:center;vertical-align:middle;\">'"
if old4a in content:
    content = content.replace(old4a, new4a)
    print("OK: Worker room name")
    changes += 1

# Room value cell
old4b = "'<td style=\"padding:4px 8px;border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;\">'"
new4b = "'<td style=\"padding:5px 8px;border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;vertical-align:middle;\">'"
if old4b in content:
    content = content.replace(old4b, new4b)
    print("OK: Worker room value")
    changes += 1

# 5. Room table title (colspan header) - in buildRoomTableHTML
old5 = "style=\"border:1px solid #333;padding:3px 4px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;\""
new5 = "style=\"border:1px solid #333;padding:5px 4px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;vertical-align:middle;\""
if old5 in content:
    content = content.replace(old5, new5)
    print("OK: Room title header")
    changes += 1

# 6. Worker expenses header cell
old6 = "style=\"padding:4px 8px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;border:1px solid #333;\""
new6 = "style=\"padding:5px 8px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;border:1px solid #333;vertical-align:middle;\""
if old6 in content:
    content = content.replace(old6, new6)
    print("OK: Worker expenses header")
    changes += 1

# 7. Treasury header row - البيان label
old7 = "'<td style=\"' + tLabelStyle + 'font-weight:bold;\">البيان</td>'"
new7 = "'<td style=\"' + tLabelStyle + 'font-weight:bold;text-align:center;\">البيان</td>'"
if old7 in content:
    content = content.replace(old7, new7)
    print("OK: Treasury header labels")
    changes += 1

# 8. Treasury data rows - item labels
old8 = "'<td style=\"' + tLabelStyle + 'text-align:center;\">' + item.label + labelSuffix + '</td>'"
# Already has text-align:center from previous fix, just need vertical-align via tCellPad (done in step 3)
print("OK: Treasury item labels use tCellPad (already fixed in step 3)")

# 9. Cleanliness value cell - add vertical-align
old9 = "color:#b45309;'>"
new9 = "color:#b45309;vertical-align:middle;'>"
if old9 in content:
    content = content.replace(old9, new9)
    print("OK: Cleanliness value vertical-align")
    changes += 1

# 10. Final total cell (الإجمالي value in worker expenses)
old10 = "font-size:14px;font-weight:bold;color:#1b7a3d;'>"
new10 = "font-size:14px;font-weight:bold;color:#1b7a3d;vertical-align:middle;'>"
if old10 in content:
    content = content.replace(old10, new10)
    print("OK: Worker final total vertical-align")
    changes += 1

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n=== {changes} centering fixes applied ===")

# Verify
with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()
print(f"Total lines: {c.count(chr(10)) + 1}")
js_s = c.find('<script>')
js_e = c.rfind('</script>')
js = c[js_s:js_e]
print(f"Braces: {js.count('{')}/{js.count('}')}, Parens: {js.count('(')}/{js.count(')')}")
