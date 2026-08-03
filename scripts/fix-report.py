#!/usr/bin/env python3
# Remove العامل and التاريخ rows from room tables in PDF report

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: buildRoomTableHTML - remove worker/date row (lines 2209-2212)
old1 = """'<tr>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">\u0627\u0644\u0639\u0627\u0645\u0644: ' + empLabelStr + '</td>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">\u0627\u0644\u062a\u0627\u0631\u064a\u062e: ' + formatDateShort(document.getElementById('empDatePicker').value) + '</td>' +
                '</tr>' +"""

new1 = ""

count1 = content.count(old1)
print(f"Fix 1 (buildRoomTableHTML): Found {count1} occurrences")
if count1 > 0:
    content = content.replace(old1, new1)

# Fix 2: buildEmptyRoomTableHTML - remove worker/date row (lines 2458-2461)
old2 = """'<tr>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">\u0627\u0644\u0639\u0627\u0645\u0644: ............</td>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">\u0627\u0644\u062a\u0627\u0631\u064a\u062e: / / </td>' +
                '</tr>' +"""

new2 = ""

count2 = content.count(old2)
print(f"Fix 2 (buildEmptyRoomTableHTML): Found {count2} occurrences")
if count2 > 0:
    content = content.replace(old2, new2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
