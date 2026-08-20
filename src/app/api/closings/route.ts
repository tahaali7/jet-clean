import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/closings?branchId=xxx — list closings for a branch
export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId')
    if (!branchId) {
      return NextResponse.json([])
    }
    const closings = await db.closing.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      include: { coverageRecords: true },
    })
    return NextResponse.json(closings)
  } catch (err: any) {
    console.error('Closings GET error:', err?.message)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

// POST /api/closings — create a closing with coverage
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { branchId, dates, transferToDate, coverageRecords, cashRemaining, createdBy } = body

    if (!branchId || !dates || dates.length === 0) {
      return NextResponse.json({ error: 'branchId and dates required' }, { status: 400 })
    }

    // 1. Gather all data for the selected dates
    const workerExpenses = await db.workerExpense.findMany({
      where: { branchId, date: { in: dates } },
    })

    const records = await db.record.findMany({
      where: { branchId, date: { in: dates } },
    })

    // 2. Calculate totals
    let expensesTotal = 0
    let transferTotal = 0
    let debtsCovered = 0

    // Sum expenses and transfer from treasury
    for (const we of workerExpenses) {
      const jData = we.jsonData as any
      if (jData?.treasury) {
        for (const [key, val] of Object.entries(jData.treasury)) {
          if (key.startsWith('\u0645\u0635\u0631\u0648\u0641_') && val && typeof val === 'object' && 'expense' in val) {
            if (we.expType === 'expense') {
              expensesTotal += (val as any).expense || 0
            }
          }
          if (key === '\u062a\u0645_\u0627\u0644\u062a\u062d\u0648\u064a\u0644' && val && typeof val === 'object' && 'expense' in val) {
            transferTotal += (val as any).expense || 0
          }
        }
      }
    }

    const deficit = (expensesTotal + (cashRemaining || 0)) - transferTotal

    // 3. Process coverage records
    const coverageIds: string[] = []
    if (coverageRecords && coverageRecords.length > 0) {
      for (const cr of coverageRecords) {
        if (cr.amount <= 0) continue
        debtsCovered += cr.amount
        const created = await db.coverageRecord.create({
          data: {
            branchId,
            recordId: cr.recordId || null,
            weId: cr.weId || null,
            amount: cr.amount,
            coverageType: 'cash',
            sourceDate: cr.sourceDate || '',
            targetDate: cr.targetDate || '',
          },
        })
        coverageIds.push(created.id)

        // Mark the source record as covered
        if (cr.recordId) {
          await db.record.update({
            where: { id: cr.recordId },
            data: { coverageStatus: 'covered' },
          })
        }
      }
    }

    // 4. If there's a deficit, create a record on the target date
    let actualDeficit = 0
    if (deficit < 0) {
      actualDeficit = Math.abs(deficit)
      if (transferToDate) {
        const uncoveredRecords = records.filter(
          (r) => (r.type === 'withdrawal' || r.type === 'shortage') && r.coverageStatus === 'pending'
        )
        if (uncoveredRecords.length > 0) {
          await db.record.create({
            data: {
              empId: uncoveredRecords[0].empId,
              type: 'withdrawal',
              amount: actualDeficit,
              note: 'عجز مقفل من فترة ' + dates[0] + ' إلى ' + dates[dates.length - 1],
              date: transferToDate,
              branchId,
            },
          })
        }
      }
    }

    // 5. Mark treasuries as in closing period
    await db.treasury.updateMany({
      where: { branchId, date: { in: dates } },
      data: { isInClosingPeriod: true },
    })

    // 6. Create the closing record
    const closing = await db.closing.create({
      data: {
        branchId,
        dates: JSON.stringify(dates),
        expensesTotal,
        transferTotal,
        cashRemaining: cashRemaining || 0,
        deficit: actualDeficit,
        debtsCovered,
        transferToDate: transferToDate || '',
        coverageIds: JSON.stringify(coverageIds),
        createdBy: createdBy || '',
      },
      include: { coverageRecords: true },
    })

    // 7. Log activity
    try {
      await db.activityLog.create({
        data: {
          userId: createdBy || 'admin',
          userName: createdBy || 'مدير',
          userRole: 'admin',
          branchId,
          branchName: '',
          action: 'إنشاء إقفال',
          category: 'closing',
          details: `إقفال ${dates.length} أيام | تحويل: ${transferTotal} | عجز: ${actualDeficit}`,
        },
      })
    } catch {}

    return NextResponse.json(closing)
  } catch (err: any) {
    console.error('Closing POST error:', err?.message, err?.stack)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
