#!/usr/bin/env python3
# Fix PDF export - replace the entire handleExportPDF function body

filepath = '/home/z/my-project/src/app/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the export section
old_section = """      if (dates.length === 0) { setExporting(false); return }

      // Load html2canvas and jsPDF dynamically
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.default

      // Fetch all car entries for the date range
      for (const date of dates) {
        const params = new URLSearchParams()
        params.set('date', date)
        const res = await fetch(`/api/car-entries?${params}`)
        const dateEntries: CarEntry[] = res.ok ? await res.json() : []

        if (dateEntries.length === 0) continue

        // Group by branch
        const branchGroups: Record<string, CarEntry[]> = {}
        dateEntries.forEach(e => {
          if (!branchGroups[e.branchId]) branchGroups[e.branchId] = []
          branchGroups[e.branchId].push(e)
        })

        let firstBranch = true
        for (const bid in branchGroups) {
          if (!firstBranch) {
            // Will be handled in the loop
          }
          firstBranch = false
          const br = branches.find(b => b.id === bid)
          const bName = br ? br.name : ''
          const bEntries = branchGroups[bid]

          const pages = buildCarReportHTML(date, bid, bName, bEntries)
          const reportArea = pdfAreaRef.current
          if (!reportArea) continue

          // Page 1
          reportArea.innerHTML = pages.page1
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas1 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgData1 = canvas1.toDataURL('image/png')
          const imgHeight1 = (canvas1.height * 210) / canvas1.width

          if (reportArea.style.position) {
            reportArea.style.position = ''
            reportArea.style.top = ''
            reportArea.style.left = ''
            reportArea.style.width = ''
          }

          // Page 2
          reportArea.innerHTML = pages.page2
          reportArea.style.position = 'fixed'
          reportArea.style.top = '0'
          reportArea.style.left = '-99999px'
          reportArea.style.width = '800px'

          await new Promise(r => setTimeout(r, 200))
          const canvas2 = await html2canvas(reportArea, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const imgData2 = canvas2.toDataURL('image/png')
          const imgHeight2 = (canvas2.height * 210) / canvas1.width

          if (reportArea.style.position) {
            reportArea.style.position = ''
            reportArea.style.top = ''
            reportArea.style.left = ''
            reportArea.style.width = ''
          }
          reportArea.innerHTML = ''

          // Create PDF for this branch/date
          const pdf = new jsPDF('p', 'mm', 'a4')
          const pageWidth = pdf.internal.pageSize.getWidth()
          pdf.addImage(imgData1, 'PNG', 0, 0, pageWidth, imgHeight1)
          pdf.addPage()
          pdf.addImage(imgData2, 'PNG', 0, 0, pageWidth, imgHeight2)
          pdf.save(`تقرير_${bName}_${date}.pdf`)
        }
      }

      setShowExportModal(false)
      alert('تم التصدير بنجاح!')"""

new_section = """      if (dates.length === 0) { setExporting(false); return }

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
            '<div style="text-align:center;margin-bottom:15px;">' +
            '<h1 style="font-size:18px;margin:0;color:#333;">\\u0645\\u063a\\u0633\\u0644\\u0629 \\u062c\\u064a\\u062a \\u0643\\u0644\\u064a\\u0646</h1>' +
            '<p style="font-size:12px;color:#666;margin:4px 0 0 0;">\\u0627\\u0644\\u062a\\u0627\\u0631\\u064a\\u062e: ' + formatDateShort(date) + '</p>' +
            '</div>' +
            '<h2 style="font-size:20px;color:#999;margin-top:60px;">\\u0644\\u0627 \\u062a\\u0648\\u062c\\u062f \\u0628\\u064a\\u0627\\u0646\\u0627\\u062a \\u0641\\u064a ' + formatDateShort(date) + '</h2>' +
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
        pdf.save('\\u062a\\u0642\\u0631\\u064a\\u0631_\\u0645\\u063a\\u0627\\u0633\\u0644_\\u062c\\u064a\\u062a_\\u0643\\u0644\\u064a\\u0646.pdf')
        setShowExportModal(false)
        alert('\\u062a\\u0645 \\u0627\\u0644\\u062a\\u0635\\u062f\\u064a\\u0631 \\u0628\\u0646\\u062c\\u0627\\u062d! (' + exportedCount + ' \\u0635\\u0641\\u062d\\u0629)')
      } else {
        alert('\\u0644\\u0627 \\u062a\\u0648\\u062c\\u062f \\u0628\\u064a\\u0627\\u0646\\u0627\\u062a \\u0644\\u0644\\u062a\\u0635\\u062f\\u064a\\u0631 \\u0641\\u064a \\u0627\\u0644\\u0641\\u062a\\u0631\\u0629 \\u0627\\u0644\\u0645\\u062d\\u062f\\u062f\\u0629')
      }"""

count = content.count(old_section)
print(f"Found {count} occurrences")

if count > 0:
    content = content.replace(old_section, new_section)
    print("Replaced!")
else:
    print("NOT FOUND - trying character by character comparison")
    # Find the start marker
    idx = content.find("if (dates.length === 0) { setExporting(false); return }")
    if idx >= 0:
        print(f"Found marker at index {idx}")
        # Find the end marker
        end_idx = content.find("alert('\u062a\u0645 \u0627\u0644\u062a\u0635\u062f\u064a\u0631 \u0628\u0646\u062c\u0627\u062d!')", idx)
        if end_idx >= 0:
            print(f"Found end marker at index {end_idx}")
            # Show the area
            snippet = content[idx:end_idx+50]
            print(f"Snippet length: {len(snippet)}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
