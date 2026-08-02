# -*- coding: utf-8 -*-
import re

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. HIDE export PDF button from employee (non-admin) view
# ============================================================

# In employeeLogin, after hiding admin elements, also hide export button
old_emp_login = """            // Hide admin-only elements
            document.getElementById('adminModeToggleBtn').classList.add('hidden');
            document.getElementById('adminBranchSelector').classList.add('hidden');
            document.getElementById('empDatePicker').value = todayISO();"""

new_emp_login = """            // Hide admin-only elements
            document.getElementById('adminModeToggleBtn').classList.add('hidden');
            document.getElementById('adminBranchSelector').classList.add('hidden');
            document.getElementById('empExportPdfBtn').classList.add('hidden');
            document.getElementById('empDatePicker').value = todayISO();"""

if old_emp_login in content:
    content = content.replace(old_emp_login, new_emp_login)
    print("OK: Hide export btn on employee login")
else:
    print("FAIL: Could not find employee login hide block")

# In switchToCarEntry (admin mode), show the export button
old_switch_car = """            // Show admin-only elements in employee screen
            document.getElementById('adminModeToggleBtn').classList.remove('hidden');
            document.getElementById('adminBranchSelector').classList.remove('hidden');"""

new_switch_car = """            // Show admin-only elements in employee screen
            document.getElementById('adminModeToggleBtn').classList.remove('hidden');
            document.getElementById('adminBranchSelector').classList.remove('hidden');
            document.getElementById('empExportPdfBtn').classList.remove('hidden');"""

if old_switch_car in content:
    content = content.replace(old_switch_car, new_switch_car)
    print("OK: Show export btn on admin switch to car entry")
else:
    print("FAIL: Could not find admin switch car entry block")

# In goToLogin, also hide the export button
old_go_login = """            // Hide admin-only elements
            document.getElementById('adminModeToggleBtn').classList.add('hidden');
            document.getElementById('adminBranchSelector').classList.add('hidden');
            showScreen('loginScreen');"""

new_go_login = """            // Hide admin-only elements
            document.getElementById('adminModeToggleBtn').classList.add('hidden');
            document.getElementById('adminBranchSelector').classList.add('hidden');
            document.getElementById('empExportPdfBtn').classList.add('hidden');
            showScreen('loginScreen');"""

if old_go_login in content:
    content = content.replace(old_go_login, new_go_login)
    print("OK: Hide export btn on go to login")
else:
    print("FAIL: Could not find go to login hide block")


# ============================================================
# 2. HIDE treasury from employee view (admin only)
# ============================================================

old_emp_render = """            document.getElementById('grandTotalAmount').textContent = grandTotalAmount + ' د.ل';
            document.getElementById('grandTotalCars').textContent = grandTotalCars + ' سيارة';
            document.getElementById('grandTotalNet').textContent = grandTotalNet + ' د.ل';
            // مصاريف العمال
            var workerExpTotal = renderWorkerExpenses(currentBranchName, date, roomNetMap) || 0;
            renderTreasury(currentBranchName, date, grandTotalAmount, workerExpTotal);
            grandCard.classList.remove('hidden');"""

new_emp_render = """            document.getElementById('grandTotalAmount').textContent = grandTotalAmount + ' د.ل';
            document.getElementById('grandTotalCars').textContent = grandTotalCars + ' سيارة';
            document.getElementById('grandTotalNet').textContent = grandTotalNet + ' د.ل';
            // مصاريف العمال (للموظف - بدون خزينة)
            var workerExpTotal = renderWorkerExpenses(currentBranchName, date, roomNetMap) || 0;
            // إخفاء الخزينة للموظف - تظهر للمسؤول فقط
            document.getElementById('workerExpTreasuryRow').classList.remove('hidden');
            var treasurySection = document.querySelector('#workerExpTreasuryRow > div > div:nth-child(2)');
            if (treasurySection) treasurySection.style.display = 'none';
            grandCard.classList.remove('hidden');"""

if old_emp_render in content:
    content = content.replace(old_emp_render, new_emp_render)
    print("OK: Hide treasury for employee mode")
else:
    print("FAIL: Could not find employee render treasury block")


# ============================================================
# 3. Show admin-entered rooms to employee
# ============================================================

old_emp_filter = """            const empEntries = carEntries.filter(e => e.empId === currentEmployee.id && e.date === date);"""

new_emp_filter = """            // الموظف يرى مدخلاته + مدخلات المسؤول لنفس الفرع والتاريخ
            var adminEmpId = 'admin_' + currentEmployee.branchId;
            const empEntries = carEntries.filter(e =>
                (e.empId === currentEmployee.id || e.empId === adminEmpId) && e.date === date
            );"""

if old_emp_filter in content:
    content = content.replace(old_emp_filter, new_emp_filter)
    print("OK: Employee sees admin entries too")
else:
    print("FAIL: Could not find employee entries filter")


# ============================================================
# 4. Fix treasury auto-calculation (oninput argument bug)
#    The oninput was: onTreasuryFieldChange('key, branchName')
#    This passes ONE string argument, not two!
#    Fix: onTreasuryFieldChange('key','branchName')
# ============================================================

# Fix for income column input (line ~1444)
old_oninput_income = """oninput="onTreasuryFieldChange('" + key + ', ' + branchName + ')" style="' + inputStyle + 'color:#34d399;"""
new_oninput_income = """oninput="onTreasuryFieldChange('" + key + "','" + branchName + "')" style="' + inputStyle + 'color:#34d399;"""

if old_oninput_income in content:
    content = content.replace(old_oninput_income, new_oninput_income)
    print("OK: Fixed oninput income column argument")
else:
    print("FAIL: Could not find income oninput pattern")

# Fix for expense column input (line ~1450)
old_oninput_expense = """oninput="onTreasuryFieldChange('" + key + ', ' + branchName + ')" style="' + inputStyle + 'color:#fca5a5;"""
new_oninput_expense = """oninput="onTreasuryFieldChange('" + key + "','" + branchName + "')" style="' + inputStyle + 'color:#fca5a5;"""

if old_oninput_expense in content:
    content = content.replace(old_oninput_expense, new_oninput_expense)
    print("OK: Fixed oninput expense column argument")
else:
    print("FAIL: Could not find expense oninput pattern")


# ============================================================
# 5. Show treasury for admin in employee screen
# ============================================================

old_admin_render = """            // مصاريف العمال
            var workerExpTotal = renderWorkerExpenses(branchName, date, roomNetMap) || 0;
            renderTreasury(branchName, date, grandTotalAmount, workerExpTotal);
            grandCard.classList.remove('hidden');
            return;"""

new_admin_render = """            // مصاريف العمال
            var workerExpTotal = renderWorkerExpenses(branchName, date, roomNetMap) || 0;
            renderTreasury(branchName, date, grandTotalAmount, workerExpTotal);
            // إظهار الخزينة للمسؤول
            document.getElementById('workerExpTreasuryRow').classList.remove('hidden');
            var treasurySection = document.querySelector('#workerExpTreasuryRow > div > div:nth-child(2)');
            if (treasurySection) treasurySection.style.display = '';
            grandCard.classList.remove('hidden');
            return;"""

if old_admin_render in content:
    content = content.replace(old_admin_render, new_admin_render)
    print("OK: Show treasury for admin in employee screen")
else:
    print("FAIL: Could not find admin render treasury block")


# ============================================================
# 6. Employee mode: iterate entries per room (not just first)
#    Show admin entries as read-only, employee entries as editable
# ============================================================

old_emp_loop_start = """            branchAvailableRooms.forEach(room => {
                const entry = empEntries.find(e => e.room === room);
                if (!entry) return;

                grandTotalAmount += entry.totalAmount;
                grandTotalCars += entry.totalCars;
                var net = getNetAmount(entry.totalAmount, currentBranchName, room);
                grandTotalNet += net;
                roomNetMap[room] = net;"""

new_emp_loop_start = """            // تجميع المدخلات حسب الغرفة (مدخلات الموظف + المسؤول)
            var empRoomEntries = {};
            empEntries.forEach(function(entry) {
                if (!empRoomEntries[entry.room]) empRoomEntries[entry.room] = [];
                empRoomEntries[entry.room].push(entry);
            });

            branchAvailableRooms.forEach(room => {
                var roomEntries = empRoomEntries[room];
                if (!roomEntries || roomEntries.length === 0) return;

                roomEntries.forEach(function(entry) {
                grandTotalAmount += entry.totalAmount;
                grandTotalCars += entry.totalCars;
                var net = getNetAmount(entry.totalAmount, currentBranchName, room);
                grandTotalNet += net;
                roomNetMap[room] = (roomNetMap[room] || 0) + net;"""

if old_emp_loop_start in content:
    content = content.replace(old_emp_loop_start, new_emp_loop_start)
    print("OK: Changed employee room loop to iterate all entries")
else:
    print("FAIL: Could not find employee room loop start")

# Change card header to show who entered and hide edit for admin entries
old_emp_card_html = """                html += `
                    <div class="room-card bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg">
                        <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">
                            <h3 class="text-lg font-bold text-cyan-400 flex items-center gap-2">
                                ${ROOM_ICONS[room] || '🏠'} ${room}
                            </h3>
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">${entry.totalCars} سيارة</span>
                                <button onclick="editCarEntry('${entry.room}')" class="text-cyan-400 hover:text-cyan-300 text-xs bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 hover:bg-cyan-500/20 transition">✏️ تعديل</button>
                                <button onclick="deleteCarEntry('${entry.id}')" class="text-rose-400 hover:text-rose-300 text-xs bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition">🗑️</button>
                            </div>
                        </div>"""

new_emp_card_html = """                var isAdminEntry = entry.empId === adminEmpId;
                var entryLabel = isAdminEntry ? '👨‍💼 المسؤول' : entry.empName;
                var labelColor = isAdminEntry ? 'text-amber-400' : 'text-cyan-400';
                var borderColor = isAdminEntry ? 'border-amber-500/20' : 'border-slate-700';

                html += '<div class="room-card bg-slate-800 border ' + borderColor + ' rounded-2xl p-5 shadow-lg">';
                html += '<div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-700">';
                html += '<h3 class="text-lg font-bold ' + labelColor + ' flex items-center gap-2">';
                html += (ROOM_ICONS[room] || '🏠') + ' ' + room + ' <span style="font-size:11px;color:#94a3b8;font-weight:400;">(' + entryLabel + ')</span>';
                html += '</h3>';
                html += '<div class="flex items-center gap-2">';
                html += '<span class="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">' + entry.totalCars + ' سيارة</span>';
                if (!isAdminEntry) {
                    html += '<button onclick="editCarEntry(\\'' + entry.room + '\\')" class="text-cyan-400 hover:text-cyan-300 text-xs bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 hover:bg-cyan-500/20 transition">✏️ تعديل</button>';
                    html += '<button onclick="deleteCarEntry(\\'' + entry.id + '\\')" class="text-rose-400 hover:text-rose-300 text-xs bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition">🗑️</button>';
                }
                html += '</div></div>';"""

if old_emp_card_html in content:
    content = content.replace(old_emp_card_html, new_emp_card_html)
    print("OK: Changed employee card to show entry source and hide admin edit buttons")
else:
    print("FAIL: Could not find employee card HTML pattern")

# Now we need to also close the template literal properly for the card body
# The old code uses template literals (backticks) for the card body
# We changed the header but the body still uses template literals
# Let me find the card body section and convert it

# The card body starts with detailsHtml and ends with the card div close
# Let me find what follows our replacement

# After our header replacement, the next lines should be:
#                <div class="space-y-1.5">
#                    ${detailsHtml}
#                </div>
# ...
#                </div>
#                `;

# Let me find and replace the template literal body
old_card_body = """                <div class="space-y-1.5">
                            ${detailsHtml}
                        </div>
                        <div class="mt-4 pt-3 border-t border-slate-700">
                            <div class="flex justify-between items-center">
                                <span class="text-slate-300 font-semibold text-sm">إجمالي ${room}:</span>
                                <span class="text-xl font-black text-emerald-400">${entry.totalAmount} د.ل</span>
                            </div>
                            <div class="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-600">
                                <span class="text-cyan-300 font-semibold text-sm">الصافي:</span>
                                <span class="text-lg font-black text-cyan-400">${getNetAmount(entry.totalAmount, currentBranchName, room)} د.ل</span>
                            </div>
                            <p class="text-[10px] text-slate-500 mt-1 text-left">(${getNetFormulaText(currentBranchName, room)})</p>
                        </div>
                    </div>
                `;"""

new_card_body = """                html += '<div class="space-y-1.5">';
                html += detailsHtml;
                html += '</div>';
                html += '<div class="mt-4 pt-3 border-t border-slate-700">';
                html += '<div class="flex justify-between items-center">';
                html += '<span class="text-slate-300 font-semibold text-sm">إجمالي ' + room + ':</span>';
                html += '<span class="text-xl font-black text-emerald-400">' + entry.totalAmount + ' د.ل</span>';
                html += '</div>';
                html += '<div class="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-600">';
                html += '<span class="text-cyan-300 font-semibold text-sm">الصافي:</span>';
                html += '<span class="text-lg font-black text-cyan-400">' + getNetAmount(entry.totalAmount, currentBranchName, room) + ' د.ل</span>';
                html += '</div>';
                html += '<p class="text-[10px] text-slate-500 mt-1 text-left">(' + getNetFormulaText(currentBranchName, room) + ')</p>';
                html += '</div></div>';"""

if old_card_body in content:
    content = content.replace(old_card_body, new_card_body)
    print("OK: Changed employee card body to string concatenation")
else:
    print("FAIL: Could not find employee card body pattern")

# Close the inner forEach(entry) loop
old_emp_loop_end = """            });

            grid.innerHTML = html;

            // Show grand total"""

new_emp_loop_end = """                }); // نهاية حلقة المدخلات لكل غرفة
            });

            grid.innerHTML = html;

            // Show grand total"""

if old_emp_loop_end in content:
    content = content.replace(old_emp_loop_end, new_emp_loop_end)
    print("OK: Added closing for inner forEach(entry) loop")
else:
    print("FAIL: Could not find employee loop end")


# ============================================================
# Save
# ============================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n=== All replacements completed ===")
