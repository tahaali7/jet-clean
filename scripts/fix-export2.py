#!/usr/bin/env python3
# Fix PDF export - replace by indices

filepath = '/home/z/my-project/src/app/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find start and end markers
start_marker = "if (dates.length === 0) { setExporting(false); return }"
end_marker = "alert('\u062a\u0645 \u0627\u0644\u062a\u0635\u062f\u064a\u0631 \u0628\u0646\u062c\u0627\u062d!')"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

print(f"Start: {start_idx}, End: {end_idx}")

if start_idx < 0 or end_idx < 0:
    print("Markers not found!")
    exit(1)

# Find the full end (including the closing brace and semicolon)
# Look for the "}" and ";" after the alert
tail = content[end_idx:]
# Find the end of this statement: alert('...!')
close_idx = tail.find('}') + end_idx
semi_idx = tail.find(';') + end_idx
actual_end = max(close_idx, semi_idx) + 1

print(f"Actual end: {actual_end}")

old_text = content[start_idx:actual_end]

new_text = """if (dates.length === 0) { setExporting(false); return }

      // Load html2canvas and jsPDF dynamically
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default

      const reportArea = pdfAreaRef.current
      if (!reportArea) { setExporting(false); return alert('خطأ في عنصر التقرير') }

      // Create a single PDF for all dates
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      let firstPage = true
      let exportedCount = 0

      for (const date of dates) {
        // Fetch car entries for this date
        const params = new URLSearchParams()
        params.set('date', date)
        const res = await fetch(`/api/car-entries?${params}`)
        const dateEntries: CarEntry[] = res.ok ? await res.json() : []

        if (dateEntries.length === 0) {
          // Generate "no data" page
          const noDataHtml = '<div style="width:780px;background:#fff;color:#000;padding:40px;font-family:Cairo,sans-serif;text-align:center;" dir="rtl">' +
            '<h1 style="font-size:18px;margin:0;color:#333;">مغسلة جيت كلين</h1>' +
            '<p style="font-size:12px;color:#666;margin:4px 0 0 0;">التاريخ: ' + formatDateShort(date) + '</p>' +
            '<h2 style="font-size:20px;color:#999;margin-top:60px;">لا توجد بيانات في ' + formatDateShort(date) + '</h2>' +
            '</div>'

          reportArea.innerHTML = noDataHtml
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgHeight = (canvas.height * pageWidth) / canvas.width

          reportArea.style.position = ''
          reportArea.style.top = ''
          reportArea.style.left = ''
          reportArea.style.width = ''
          reportArea.innerHTML = ''

          if (!firstPage) pdf.addPage()
          firstPage = false
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight)
          exportedCount++
          continue
        }

        // Group entries by branch
        const branchGroups: Record<string, CarEntry[]> = {}
        dateEntries.forEach(e => {
          if (!branchGroups[e.branchId]) branchGroups[e.branchId] = []
          branchGroups[e.branchId].push(e)
        })

        for (const bid in branchGroups) {
          const br = branches.find(b => b.id === bid)
          const bName = br ? br.name : ''
          const bEntries = branchGroups[bid]

          const pages = buildCarReportHTML(date, bid, bName, bEntries)

          // Render Page 1
          reportArea.innerHTML = pages.page1
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas1 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgHeight1 = (canvas1.height * pageWidth) / canvas1.width

          reportArea.style.position = ''
          reportArea.style.top = ''
          reportArea.style.left = ''
          reportArea.style.width = ''

          // Render Page 2
          reportArea.innerHTML = pages.page2
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas2 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgHeight2 = (canvas2.height * pageWidth) / canvas2.width

          reportArea.style.position = ''
          reportArea.style.top = ''
          reportArea.style.left = ''
          reportArea.style.width = ''
          reportArea.innerHTML = ''

          if (!firstPage) pdf.addPage()
          firstPage = false
          pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight1)
          pdf.addPage()
          pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight2)
          exportedCount++
        }
      }

      if (exportedCount > 0) {
        pdf.save('تقرير_مغاسل_جيت_كلين.pdf')
        setShowExportModal(false)
        alert('تم التصدير بنجاح! (' + exportedCount + ' صفحة)')
      } else {
        alert('لا توجد بيانات للتصدير في الفترة المحددة')
      }"""

content = content[:start_idx] + new_text + content[actual_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced successfully!")
print(f"Old length: {len(old_text)}, New length: {len(new_text)}")
