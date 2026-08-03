# -*- coding: utf-8 -*-

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Remove totalsHtml from page 1
# ============================================================

old_page1 = """                roomsGridHtml +
                totalsHtml +
                '</div>';

            // الصفحة الثانية"""

new_page1 = """                roomsGridHtml +
                '</div>';

            // الصفحة الثانية"""

if old_page1 in content:
    content = content.replace(old_page1, new_page1)
    print("OK: Removed totals from page 1")
else:
    print("FAIL: Could not find totalsHtml in page 1")

# ============================================================
# 2. Center-align numbers in all report table cells
#    buildRoomTableHTML - bottom rows (إجمالي الغرفة, الصافي)
# ============================================================

# Fix: إجمالي الغرفة value cell - add text-align:center
old_room_total = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;">' + roomTotalAmount + ' د.ل</td>' +
                '</tr>' +
                // الصافي"""
new_room_total = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;">' + roomTotalAmount + ' د.ل</td>' +
                '</tr>' +
                // الصافي"""
if old_room_total in content:
    content = content.replace(old_room_total, new_room_total)
    print("OK: Centered room total amount")

# Fix: الصافي value cell - add text-align:center (already has it, but ensure font-size match)
old_room_net = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;">' + roomNet + ' د.ل</td>' +
                '</tr>' +
                '</table>';"""
new_room_net = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:12px;font-weight:bold;">' + roomNet + ' د.ل</td>' +
                '</tr>' +
                '</table>';"""
if old_room_net in content:
    content = content.replace(old_room_net, new_room_net)
    print("OK: Centered room net amount")

# Fix: العامل and التاريخ header row - center the cells
old_emp_date_row = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;' + cellFs + '">العامل: ' + empLabelStr + '</td>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;' + cellFs + '">التاريخ: ' + formatDateShort(document.getElementById('empDatePicker').value) + '</td>'"""
new_emp_date_row = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">العامل: ' + empLabelStr + '</td>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">التاريخ: ' + formatDateShort(document.getElementById('empDatePicker').value) + '</td>'"""
if old_emp_date_row in content:
    content = content.replace(old_emp_date_row, new_emp_date_row)
    print("OK: Centered employee/date row")

# Fix: إجمالي الغرفة label - center it
old_room_total_label = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;font-weight:bold;">إجمالي الغرفة</td>'"""
new_room_total_label = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>'"""
if old_room_total_label in content:
    content = content.replace(old_room_total_label, new_room_total_label)
    print("OK: Centered room total label")

# Fix: الصافي label - center it
old_net_label = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;color:#555;">الصافي</td>'"""
new_net_label = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;color:#555;text-align:center;">الصافي</td>'"""
if old_net_label in content:
    content = content.replace(old_net_label, new_net_label)
    print("OK: Centered net label")

# Fix: إكسترا label - center it
old_extra_label = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;font-weight:bold;color:#b45309;">إكسترا</td>'"""
new_extra_label = """'<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;font-weight:bold;color:#b45309;text-align:center;">إكسترا</td>'"""
if old_extra_label in content:
    content = content.replace(old_extra_label, new_extra_label)
    print("OK: Centered extra label")

# ============================================================
# 3. Center numbers in page 2 tables (worker expenses + treasury)
# ============================================================

# Worker expenses: room name cell - center
old_worker_room = """'<td style="padding:4px 8px;border:1px solid #333;font-size:11px;">' + icon + ' ' + room + '</td>'"""
new_worker_room = """'<td style="padding:4px 8px;border:1px solid #333;font-size:11px;text-align:center;">' + icon + ' ' + room + '</td>'"""
if old_worker_room in content:
    content = content.replace(old_worker_room, new_worker_room)
    print("OK: Centered worker expenses room names")

# Worker expenses: النظافة label - center
old_clean_label = "'<td style=\"padding:4px 8px;border:1px solid #333;font-size:11px;font-weight:bold;\">" + "\U0001F9F9" + " النظافة</td>'"
new_clean_label = "'<td style=\"padding:4px 8px;border:1px solid #333;font-size:11px;font-weight:bold;text-align:center;\">" + "\U0001F9F9" + " النظافة</td>'"
if old_clean_label in content:
    content = content.replace(old_clean_label, new_clean_label)
    print("OK: Centered cleanliness label")

# Worker expenses: الإجمالي label - center
old_worker_total_label = """'<td style="padding:5px 8px;border:2px solid #333;font-size:12px;font-weight:bold;">الإجمالي</td>'"""
new_worker_total_label = """'<td style="padding:5px 8px;border:2px solid #333;font-size:12px;font-weight:bold;text-align:center;">الإجمالي</td>'"""
if old_worker_total_label in content:
    content = content.replace(old_worker_total_label, new_worker_total_label)
    print("OK: Centered worker total label")

# Treasury: label cells - center
old_treasury_label = """'<td style="' + tLabelStyle + '">' + item.label + labelSuffix + '</td>'"""
new_treasury_label = """'<td style="' + tLabelStyle + 'text-align:center;">' + item.label + labelSuffix + '</td>'"""
if old_treasury_label in content:
    content = content.replace(old_treasury_label, new_treasury_label)
    print("OK: Centered treasury labels")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n=== All PDF report changes applied ===")
