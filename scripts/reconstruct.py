# -*- coding: utf-8 -*-
"""
Reconstruct the corrupted file by:
1. Taking the good first half (up to buildEmptyRoomTableHTML start)
2. Rebuilding buildEmptyRoomTableHTML with proper centering
3. Rebuilding exportCarEntryPDF
4. Adding all remaining functions and closing tags
"""

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the buildEmptyRoomTableHTML function start (the first occurrence - good one)
func_start = content.find('        function buildEmptyRoomTableHTML(room) {')
if func_start < 0:
    print("Cannot find buildEmptyRoomTableHTML!")
    exit(1)

# Keep everything up to and including the function signature line
sig_end = content.find('\n', func_start)
good_part = content[:sig_end + 1]

print(f"Good part ends at char {sig_end}, length {len(good_part)}")

# Now append the complete buildEmptyRoomTableHTML body + all remaining functions
remaining = '''
            var prices = getPricesForRoom(room);
            var cellPad = 'padding:5px 4px;vertical-align:middle;';
            var cellFs = 'font-size:10px;';
            var rowsHtml = '';
            prices.forEach(function(price, idx) {
                var isExtra = EXTRA_PRICES.includes(price);
                var displayPrice = isExtra ? (price - 5) : price;
                rowsHtml += '<tr>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + (idx + 1) + '</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">' + displayPrice + ' د.ل</td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;"></td>' +
                    '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '"></td>' +
                    '</tr>';
            });
            return '<table style="width:100%;border-collapse:collapse;font-family:Cairo,sans-serif;">' +
                '<tr><td colspan="4" style="border:1px solid #333;padding:5px 4px;text-align:center;font-size:12px;font-weight:bold;background:#e8e8e8;vertical-align:middle;">' + room + '</td></tr>' +
                '<tr>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">العامل: ............</td>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + '">التاريخ: / / </td>' +
                '</tr>' +
                '<tr style="background:#f0f0f0;">' +
                '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">م</td>' +
                '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">السعر</td>' +
                '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">العدد</td>' +
                '<td style="' + cellPad + 'border:1px solid #333;text-align:center;' + cellFs + 'font-weight:bold;">الإجمالي</td>' +
                '</tr>' +
                rowsHtml +
                '<tr style="background:#f0f0f0;">' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;font-weight:bold;text-align:center;">إجمالي الغرفة</td>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;"></td>' +
                '</tr>' +
                '<tr>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;font-size:10px;color:#555;text-align:center;">الصافي</td>' +
                '<td colspan="2" style="' + cellPad + 'border:1px solid #333;text-align:center;font-size:11px;font-weight:bold;"></td>' +
                '</tr>' +
                '</table>';
        }

        async function exportCarEntryPDF() {
            var date = document.getElementById('empDatePicker').value;
            if (!date) return alert('الرجاء تحديد التاريخ أولاً');

            var branchId, branchName, entries, empLabel;

            if (isAdminMode) {
                if (!adminSelectedBranch) return alert('الرجاء اختيار الفرع أولاً');
                branchId = adminSelectedBranch;
                var branch = branches.find(function(b) { return b.id === branchId; });
                branchName = branch ? branch.name : '';
                empLabel = 'المسؤول';
                var adminEmpId = 'admin_' + branchId;
                entries = carEntries.filter(function(e) { return (e.branchId === branchId || e.empId === adminEmpId) && e.date === date; });
            } else {
                if (!currentEmployee) return;
                branchId = currentEmployee.branchId;
                var branch = branches.find(function(b) { return b.id === branchId; });
                branchName = branch ? branch.name : '';
                empLabel = currentEmployee.name + ' (' + currentEmployee.shift + ')';
                entries = carEntries.filter(function(e) { return e.empId === currentEmployee.id && e.date === date; });
            }

            if (entries.length === 0) return alert('لا توجد تسجيلات في هذا التاريخ للتصدير');

            try {
                var reportArea = document.getElementById('pdfReportArea');
                var pages = buildCarReportHTML(date, branchId, branchName, entries, empLabel);

                var jsPDF = window.jspdf.jsPDF;
                var pdf = new jsPDF('p', 'mm', 'a4');
                var pageWidth = pdf.internal.pageSize.getWidth();
                var pageHeight = pdf.internal.pageSize.getHeight();

                reportArea.innerHTML = pages.page1;
                await new Promise(function(resolve) { setTimeout(resolve, 200); });
                var canvas1 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                var imgData1 = canvas1.toDataURL('image/png');
                var imgHeight1 = (canvas1.height * pageWidth) / canvas1.width;
                pdf.addImage(imgData1, 'PNG', 0, 0, pageWidth, imgHeight1);

                pdf.addPage();
                reportArea.innerHTML = pages.page2;
                await new Promise(function(resolve) { setTimeout(resolve, 200); });
                var canvas2 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                var imgData2 = canvas2.toDataURL('image/png');
                var imgHeight2 = (canvas2.height * pageWidth) / canvas2.width;
                pdf.addImage(imgData2, 'PNG', 0, 0, pageWidth, imgHeight2);

                var fileName = 'نموذج_مغاسل_' + branchName + '_' + date + '.pdf';
                pdf.save(fileName);
                reportArea.innerHTML = '';
            } catch (err) {
                console.error(err);
                alert('حدث خطأ أثناء إنشاء ملف PDF. الرجاء المحاولة مرة أخرى.');
            }
        }

        // ==================== DAILY CLOSING ====================
        function openClosingModal() {
            renderClosingModalBody();
            document.getElementById('closingModal').classList.remove('hidden');
            document.getElementById('closingModal').classList.add('flex');
        }

        function renderClosingModalBody() {
            const selectedDate = document.getElementById('datePicker').value;
            const closed = isDayClosed(selectedDate);

            let grandWithdrawals = 0;
            let grandShortages = 0;
            let branchesHtml = '';

            branches.forEach(branch => {
                const branchEmps = employees.filter(e => e.branchId === branch.id);
                if (branchEmps.length === 0) return;

                let branchWithdrawals = 0;
                let branchShortages = 0;
                let rowsHtml = '';

                branchEmps.forEach(emp => {
                    const empRecords = records.filter(r => r.empId === emp.id && r.date === selectedDate);
                    const withdrawals = empRecords.filter(r => r.type === 'withdrawal').reduce((sum, r) => sum + r.amount, 0);
                    const shortages = empRecords.filter(r => r.type === 'shortage').reduce((sum, r) => sum + r.amount, 0);
                    if (empRecords.length === 0) return;

                    branchWithdrawals += withdrawals;
                    branchShortages += shortages;
                    grandWithdrawals += withdrawals;
                    grandShortages += shortages;

                    rowsHtml += '<div class="flex justify-between items-center text-xs bg-slate-900/70 px-3 py-2 rounded-lg">' +
                        '<span class="text-slate-200 font-semibold">' + emp.name + '</span>' +
                        '<span class="text-amber-400">سحب: ' + withdrawals + ' د.ل</span>' +
                        '<span class="text-rose-400">عجز: ' + shortages + ' د.ل</span>' +
                        '</div>';
                });

                if (rowsHtml === '') return;

                const isBranchClosed = closed && closed[branch.id];
                const statusBadge = isBranchClosed
                    ? '<span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">مقفل ✓</span>'
                    : '<span class="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full">مفتوح</span>';

                branchesHtml += '<div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3">' +
                    '<div class="flex justify-between items-center mb-3">' +
                    '<h4 class="text-sm font-bold text-cyan-400">' + branch.name + ' ' + statusBadge + '</h4>' +
                    '<div class="flex gap-2 text-xs">' +
                    '<span class="text-amber-400">سحب: ' + branchWithdrawals + '</span>' +
                    '<span class="text-rose-400">عجز: ' + branchShortages + '</span>' +
                    '</div></div>' +
                    '<div class="space-y-1.5">' + rowsHtml + '</div>' +
                    '</div>';
            });

            if (branchesHtml === '') {
                branchesHtml = '<div class="text-center text-slate-400 py-6">لا توجد حركات مالية لهذا اليوم</div>';
            }

            const closedCount = Object.keys(closed || {}).length;
            const totalBranches = branches.length;
            const allClosed = closedCount >= totalBranches;

            document.getElementById('closingModalBody').innerHTML =
                '<div class="space-y-2 mb-4">' +
                '<div class="flex justify-between items-center text-sm">' +
                '<span class="text-slate-300">إجمالي السحوبات:</span>' +
                '<span class="text-amber-400 font-bold">' + grandWithdrawals + ' د.ل</span>' +
                '</div>' +
                '<div class="flex justify-between items-center text-sm">' +
                '<span class="text-slate-300">إجمالي العجوزات:</span>' +
                '<span class="text-rose-400 font-bold">' + grandShortages + ' د.ل</span>' +
                '</div>' +
                '</div>' +
                branchesHtml +
                '<div class="flex gap-3 mt-4 pt-3 border-t border-slate-700">' +
                '<button onclick="closeAllDays()" class="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl text-sm">' +
                (allClosed ? 'إعادة فتح الكل' : 'إغلاق جميع الفروع') +
                '</button>' +
                '<button onclick="closeModal(\'closingModal\')" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-sm">إغلاق</button>' +
                '</div>';
        }

        function isDayClosed(dateStr) {
            return closedDays[dateStr] || null;
        }

        function closeAllDays() {
            const selectedDate = document.getElementById('datePicker').value;
            if (!selectedDate) return;
            if (!closedDays[selectedDate]) closedDays[selectedDate] = {};
            const allClosed = Object.keys(closedDays[selectedDate]).length >= branches.length;
            if (allClosed) {
                delete closedDays[selectedDate];
            } else {
                branches.forEach(function(b) { closedDays[selectedDate][b.id] = true; });
            }
            saveData();
            renderApp();
            renderClosingModalBody();
        }

        // ==================== ADMIN PDF EXPORT ====================
        function openExportModal() {
            document.getElementById('exportModal').classList.remove('hidden');
            document.getElementById('exportModal').classList.add('flex');
        }

        function toggleExportRangeInputs() {
            var type = document.getElementById('exportRangeType').value;
            document.getElementById('exportMonthField').classList.toggle('hidden', type !== 'month');
            document.getElementById('exportDayField').classList.toggle('hidden', type !== 'day');
            document.getElementById('exportRangeFields').classList.toggle('hidden', type !== 'range');
        }

        async function exportPDF() {
            var rangeType = document.getElementById('exportRangeType').value;
            var dates = [];
            if (rangeType === 'month') {
                var monthVal = document.getElementById('exportMonth').value;
                if (!monthVal) return alert('الرجاء اختيار الشهر');
                var year = parseInt(monthVal.split('-')[0]);
                var month = parseInt(monthVal.split('-')[1]);
                var daysInMonth = new Date(year, month, 0).getDate();
                for (var d = 1; d <= daysInMonth; d++) {
                    var mm = month < 10 ? '0' + month : '' + month;
                    var dd = d < 10 ? '0' + d : '' + d;
                    dates.push(year + '-' + mm + '-' + dd);
                }
            } else if (rangeType === 'day') {
                var dayVal = document.getElementById('exportDay').value;
                if (!dayVal) return alert('الرجاء اختيار اليوم');
                dates.push(dayVal);
            } else {
                var from = document.getElementById('exportFrom').value;
                var to = document.getElementById('exportTo').value;
                if (!from || !to) return alert('الرجاء تحديد الفترة');
                var start = new Date(from);
                var end = new Date(to);
                var curr = new Date(start);
                while (curr <= end) {
                    dates.push(curr.toISOString().split('T')[0]);
                    curr.setDate(curr.getDate() + 1);
                }
            }
            if (dates.length === 0) return;
            try {
                var jsPDF = window.jspdf.jsPDF;
                var pdf = new jsPDF('p', 'mm', 'a4');
                var pageWidth = pdf.internal.pageSize.getWidth();
                var reportArea = document.getElementById('pdfReportArea');
                for (var di = 0; di < dates.length; di++) {
                    if (di > 0) pdf.addPage();
                    var date = dates[di];
                    var dateEntries = carEntries.filter(function(e) { return e.date === date; });
                    if (dateEntries.length === 0) {
                        reportArea.innerHTML = '<div style="width:780px;background:#fff;color:#000;padding:40px;font-family:Cairo,sans-serif;text-align:center;" dir="rtl"><h2 style="font-size:20px;color:#999;">لا توجد بيانات في ' + formatDateShort(date) + '</h2></div>';
                        await new Promise(function(r) { setTimeout(r, 100); });
                        var c = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff' });
                        var h = (c.height * pageWidth) / c.width;
                        pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, h);
                        continue;
                    }
                    var branchGroups = {};
                    dateEntries.forEach(function(e) {
                        if (!branchGroups[e.branchId]) branchGroups[e.branchId] = [];
                        branchGroups[e.branchId].push(e);
                    });
                    var firstBranch = true;
                    for (var bid in branchGroups) {
                        if (!firstBranch) pdf.addPage();
                        firstBranch = false;
                        var br = branches.find(function(b) { return b.id === bid; });
                        var bName = br ? br.name : '';
                        var bEntries = branchGroups[bid];
                        var pages = buildCarReportHTML(date, bid, bName, bEntries, '');
                        reportArea.innerHTML = pages.page1;
                        await new Promise(function(r) { setTimeout(r, 200); });
                        var canvas1 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                        var imgH1 = (canvas1.height * pageWidth) / canvas1.width;
                        pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgH1);
                        pdf.addPage();
                        reportArea.innerHTML = pages.page2;
                        await new Promise(function(r) { setTimeout(r, 200); });
                        var canvas2 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                        var imgH2 = (canvas2.height * pageWidth) / canvas2.width;
                        pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgH2);
                    }
                }
                pdf.save('تقرير_مغاسل_جيت_كلين.pdf');
                reportArea.innerHTML = '';
                closeModal('exportModal');
            } catch (err) {
                console.error(err);
                alert('حدث خطأ أثناء التصدير');
            }
        }

        // ==================== UTILITY ====================
        function formatDateShort(dateStr) {
            if (!dateStr) return '';
            var parts = dateStr.split('-');
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        }

        function saveData() {
            localStorage.setItem('gc_branches', JSON.stringify(branches));
            localStorage.setItem('gc_employees', JSON.stringify(employees));
            localStorage.setItem('gc_records', JSON.stringify(records));
            localStorage.setItem('gc_closedDays', JSON.stringify(closedDays));
            localStorage.setItem('gc_carEntries', JSON.stringify(carEntries));
            localStorage.setItem('gc_workerExpenses', JSON.stringify(workerExpenses));
        }

        function todayISO() {
            var d = new Date();
            var mm = d.getMonth() + 1;
            var dd = d.getDate();
            return d.getFullYear() + '-' + (mm < 10 ? '0' + mm : mm) + '-' + (dd < 10 ? '0' + dd : dd);
        }

        // ==================== MODAL HELPERS ====================
        function openBranchModal() {
            document.getElementById('branchModal').classList.remove('hidden');
            document.getElementById('branchModal').classList.add('flex');
        }

        function openEmpModal() {
            var select = document.getElementById('empBranch');
            select.innerHTML = '';
            branches.forEach(function(b) {
                select.innerHTML += '<option value="' + b.id + '">' + b.name + '</option>';
            });
            document.getElementById('empModal').classList.remove('hidden');
            document.getElementById('empModal').classList.add('flex');
        }

        function openPasswordsModal() {
            var body = document.getElementById('passwordsModalBody');
            var html = '';
            employees.forEach(function(emp) {
                var branch = branches.find(function(b) { return b.id === emp.branchId; });
                html += '<div class="bg-slate-900/50 rounded-lg p-3 mb-2">' +
                    '<div class="flex justify-between items-center mb-2">' +
                    '<span class="text-slate-200 text-sm font-semibold">' + emp.name + ' (' + (branch ? branch.name : '') + ')</span>' +
                    '</div>' +
                    '<input type="text" id="pwd_' + emp.id + '" value="' + emp.password + '" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm" />' +
                    '<button onclick="updatePassword(\\'' + emp.id + '\\')" class="mt-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">تحديث</button>' +
                    '</div>';
            });
            html += '<div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3">' +
                '<div class="flex justify-between items-center mb-2">' +
                '<span class="text-amber-300 text-sm font-semibold">المسؤول: ' + ADMIN_ACCOUNT.name + '</span>' +
                '</div>' +
                '<input type="text" id="pwd_admin" value="' + ADMIN_ACCOUNT.password + '" class="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm" />' +
                '<button onclick="updateAdminPassword()" class="mt-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">تحديث</button>' +
                '</div>';
            body.innerHTML = html;
            document.getElementById('passwordsModal').classList.remove('hidden');
            document.getElementById('passwordsModal').classList.add('flex');
        }

        function updatePassword(empId) {
            var input = document.getElementById('pwd_' + empId);
            if (!input) return;
            var emp = employees.find(function(e) { return e.id === empId; });
            if (emp) {
                emp.password = input.value;
                saveData();
                alert('تم تحديث كلمة المرور لـ ' + emp.name);
            }
        }

        function updateAdminPassword() {
            var input = document.getElementById('pwd_admin');
            if (!input) return;
            ADMIN_ACCOUNT.password = input.value;
            localStorage.setItem('gc_adminAccount', JSON.stringify(ADMIN_ACCOUNT));
            alert('تم تحديث كلمة مرور المسؤول');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.add('hidden');
            document.getElementById(modalId).classList.remove('flex');
        }

        function saveBranch() {
            var name = document.getElementById('branchName').value.trim();
            if (!name) return alert('الرجاء إدخال اسم الفرع');
            var id = 'b' + Date.now();
            branches.push({ id: id, name: name });
            saveData();
            document.getElementById('branchName').value = '';
            closeModal('branchModal');
            renderApp();
        }

        function saveEmployee() {
            var name = document.getElementById('empName').value.trim();
            var branchId = document.getElementById('empBranch').value;
            var shift = document.getElementById('empShift').value;
            var password = document.getElementById('empPassword').value.trim();
            if (!name || !branchId || !password) return alert('الرجاء ملء جميع الحقول');
            var id = 'e' + Date.now();
            employees.push({ id: id, branchId: branchId, name: name, shift: shift, password: password });
            saveData();
            document.getElementById('empName').value = '';
            document.getElementById('empPassword').value = '';
            closeModal('empModal');
            populateLoginDropdown();
        }

        function saveRecord() {
            var empId = document.getElementById('recordEmpId').value;
            var type = document.getElementById('recordType').value;
            var date = document.getElementById('recordDate').value;
            var amount = parseFloat(document.getElementById('recordAmount').value) || 0;
            var note = document.getElementById('recordNote').value.trim();
            if (!empId || !date || amount <= 0) return alert('الرجاء ملء البيانات المطلوبة');
            var record = { id: 'r' + Date.now(), empId: empId, type: type, date: date, amount: amount, note: note };
            records.push(record);
            saveData();
            closeModal('recordModal');
            renderApp();
        }

        // ==================== ADMIN RENDER ====================
        function renderApp() {
            var selectedDate = document.getElementById('datePicker').value;
            var container = document.getElementById('branchesContainer');
            var grandW = 0, grandS = 0;
            var html = '';

            branches.forEach(function(branch) {
                var branchEmps = employees.filter(function(e) { return e.branchId === branch.id; });
                if (branchEmps.length === 0) return;

                var branchW = 0, branchS = 0;
                var empCardsHtml = '';

                branchEmps.forEach(function(emp) {
                    var empRecords = records.filter(function(r) { return r.empId === emp.id && r.date === selectedDate; });
                    var withdrawals = empRecords.filter(function(r) { return r.type === 'withdrawal'; }).reduce(function(sum, r) { return sum + r.amount; }, 0);
                    var shortages = empRecords.filter(function(r) { return r.type === 'shortage'; }).reduce(function(sum, r) { return sum + r.amount; }, 0);
                    branchW += withdrawals;
                    branchS += shortages;

                    var rowsHtml = '';
                    empRecords.forEach(function(rec) {
                        var isW = rec.type === 'withdrawal';
                        rowsHtml += '<div class="flex justify-between items-center text-xs bg-slate-900/50 px-3 py-1.5 rounded-lg">' +
                            '<span class="text-slate-400 text-[11px]">' + (rec.note || (isW ? 'سلفة' : 'عجز')) + '</span>' +
                            '<span class="' + (isW ? 'text-amber-400' : 'text-rose-400') + ' font-bold text-xs">' + rec.amount + ' د.ل</span>' +
                            '</div>';
                    });

                    empCardsHtml += '<div class="bg-slate-900/30 rounded-xl p-4 border border-slate-700/50">' +
                        '<div class="flex justify-between items-center mb-2">' +
                        '<div class="flex items-center gap-2">' +
                        '<div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">' + emp.name.charAt(0) + '</div>' +
                        '<div><p class="text-slate-200 text-sm font-semibold">' + emp.name + '</p>' +
                        '<p class="text-slate-500 text-[11px]">' + emp.shift + '</p></div></div>' +
                        '<div class="flex gap-2">' +
                        '<span class="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">' + withdrawals + ' سحب</span>' +
                        '<span class="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full">' + shortages + ' عجز</span>' +
                        '</div></div>' +
                        (rowsHtml ? '<div class="mt-2 space-y-1">' + rowsHtml + '</div>' : '<p class="text-slate-500 text-[11px] mt-1">لا توجد حركات</p>') +
                        '<button onclick="openRecordModal(\\'' + emp.id + '\\', \\' ' + emp.name + '\\')" class="mt-2 w-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs font-semibold py-1.5 rounded-lg transition">+ إضافة حركة</button>' +
                        '</div>';
                });

                grandW += branchW;
                grandS += branchS;

                var isClosed = closedDays[selectedDate] && closedDays[selectedDate][branch.id];
                var statusBadge = isClosed ? '<span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">مقفل</span>' : '';

                html += '<div class="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">' +
                    '<div class="flex justify-between items-center mb-4">' +
                    '<h2 class="text-lg font-bold text-cyan-400 flex items-center gap-2">📍 ' + branch.name + ' ' + statusBadge + '</h2>' +
                    '<div class="flex gap-2 text-xs">' +
                    '<span class="text-amber-400">سحب: ' + branchW + '</span>' +
                    '<span class="text-rose-400">عجز: ' + branchS + '</span>' +
                    '</div></div>' +
                    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + empCardsHtml + '</div>' +
                    '</div>';
            });

            container.innerHTML = html || '<div class="col-span-full text-center text-slate-400 py-10">لا توجد بيانات</div>';
            document.getElementById('totalWithdrawals').textContent = grandW + ' د.ل';
            document.getElementById('totalShortages').textContent = grandS + ' د.ل';

            var dayStatus = document.getElementById('dayStatusBanner');
            var closedCount = Object.keys(closedDays[selectedDate] || {}).length;
            if (closedCount > 0 && closedCount >= branches.length) {
                dayStatus.innerHTML = '<div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center"><span class="text-emerald-400 font-bold">يوم ' + formatDateShort(selectedDate) + ' - مقفل ✓</span></div>';
            } else if (closedCount > 0) {
                dayStatus.innerHTML = '<div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center"><span class="text-amber-400 font-bold">يوم ' + formatDateShort(selectedDate) + ' - ' + closedCount + '/' + branches.length + ' فروع مقفلة</span></div>';
            } else {
                dayStatus.innerHTML = '';
            }
        }

        function openRecordModal(empId, empName) {
            document.getElementById('recordEmpId').value = empId;
            document.getElementById('recordModal').querySelector('#modalTitle').textContent = 'إضافة حركة - ' + empName;
            document.getElementById('recordDate').value = document.getElementById('datePicker').value;
            document.getElementById('recordAmount').value = '';
            document.getElementById('recordNote').value = '';
            document.getElementById('recordModal').classList.remove('hidden');
            document.getElementById('recordModal').classList.add('flex');
        }

        function editAdminCarEntry2(entryId, roomName) {
            if (!isAdminMode) return;
            var date = document.getElementById('empDatePicker').value;
            var adminEmpId = 'admin_' + adminSelectedBranch;
            var entry = carEntries.find(function(e) { return e.id === entryId; });
            if (!entry) return;
            document.getElementById('roomSelect').value = roomName;
            renderCarEntry();
            setTimeout(function() {
                var prices = getPricesForRoom(roomName);
                prices.forEach(function(price) {
                    var el = document.getElementById('carCount_' + price);
                    if (el) el.value = (entry.priceCounts && entry.priceCounts[price]) || 0;
                });
                if (entry.customPrices) {
                    Object.keys(entry.customPrices).forEach(function(key) {
                        var item = entry.customPrices[key];
                        addCustomPriceInput2(item.price, item.count);
                    });
                }
                var extraEl = document.getElementById('extraCarCount');
                if (extraEl && entry.extraCars) extraEl.value = entry.extraCars;
            }, 100);
        }

        function addCustomPriceInput2(price, count) {
            adminCustomPricesData['custom_' + Date.now()] = { price: price, count: count };
            renderCarEntry();
        }

        // ==================== INIT ====================
        populateLoginDropdown();
    </script>
</body>
</html>'''

# Combine
final_content = good_part + remaining

# Verify
opens = final_content.count('{')
closes = final_content.count('}')
parens_o = final_content.count('(')
parens_c = final_content.count(')')
brackets_o = final_content.count('[')
brackets_c = final_content.count(']')

print(f"Braces: {{ {opens}, }} {closes}, diff {opens - closes}")
print(f"Parens: ( {parens_o}, ) {parens_c}, diff {parens_o - parens_c}")
print(f"Brackets: [ {brackets_o}, ] {brackets_c}, diff {brackets_o - brackets_c}")
print(f"Total lines: {final_content.count(chr(10)) + 1}")
print(f"Has </html>: {'</html>' in final_content}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("\nFile reconstructed successfully!")
