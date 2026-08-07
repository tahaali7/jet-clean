import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function esc(s: string) { return String(s || '').replace(/'/g, "''") }

// فحص وإنشاء جدول الإشعارات تلقائياً
let tableReady: boolean | null = null
async function ensureTable() {
  if (tableReady === true) return
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        "branchId" TEXT,
        type TEXT DEFAULT 'normal',
        "createdBy" TEXT DEFAULT '',
        "readBy" TEXT DEFAULT '[]',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    tableReady = true
  } catch (e) {
    console.error('Failed to create Notification table:', e)
    tableReady = false
    throw e
  }
}

// دالة فحص: هل الفرع مستهدف في التنبيه؟
// branchId في الداتا: null = كل الفروع، "id1" = فرع واحد، '["id1","id2"]' = عدة فروع
function isBranchTargeted(notifBranchId: string | null, empBranchId: string): boolean {
  if (!notifBranchId) return true // كل الفروع
  try {
    const parsed = JSON.parse(notifBranchId)
    if (Array.isArray(parsed)) return parsed.includes(empBranchId)
  } catch {}
  return notifBranchId === empBranchId // فرع واحد
}

// تحويل branchId لعرض مناسب
function parseNotif(entry: any) {
  let readBy: string[] = []
  try { readBy = JSON.parse(entry.readBy || '[]') } catch {}
  return {
    ...entry,
    readBy,
    createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const empId = searchParams.get('empId')
    const branchId = searchParams.get('branchId')
    const all = searchParams.get('all')

    if (all === 'true') {
      const entries: any[] = await db.$queryRawUnsafe(
        `SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT 50`
      )
      return NextResponse.json(entries.map(parseNotif))
    }

    // الموظف: يجلب كل الإشعارات ثم يفلتر
    const entries: any[] = await db.$queryRawUnsafe(
      `SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT 50`
    )

    // فلترة حسب الفرع
    const filtered = entries.filter(n => isBranchTargeted(n.branchId, branchId || ''))

    // فلترة: يبقى فقط الإشعارات اللي الموظف ما قرأها
    if (empId) {
      const unread = filtered.filter((n: any) => {
        try {
          const readBy: string[] = JSON.parse(n.readBy || '[]')
          return !readBy.includes(empId)
        } catch { return true }
      })
      return NextResponse.json(unread.map(parseNotif))
    }

    return NextResponse.json(filtered.map(parseNotif))
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const data = await req.json()
    const { message, branchIds, type, createdBy } = data

    if (!message?.trim()) {
      return NextResponse.json({ error: 'الرجاء كتابة نص التنبيه' }, { status: 400 })
    }

    const newId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)

    // branchIds: مصفوفة أو null (كل الفروع)
    let branchIdValue: string | null = null
    if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
      branchIdValue = JSON.stringify(branchIds)
    }

    await db.$executeRawUnsafe(
      `INSERT INTO "Notification" (id, message, "branchId", type, "createdBy", "readBy", "createdAt")
       VALUES ('${esc(newId)}', '${esc(message.trim())}', ${branchIdValue ? `'${esc(branchIdValue)}'` : 'NULL'}, '${esc(type || 'normal')}', '${esc(createdBy || '')}', '[]', NOW())`
    )

    const entries: any[] = await db.$queryRawUnsafe(
      `SELECT * FROM "Notification" WHERE id = '${esc(newId)}'`
    )

    return NextResponse.json(parseNotif(entries[0] || { id: newId }))
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال التنبيه' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTable()
    const data = await req.json()
    const { id, empId } = data

    if (!id || !empId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const entries: any[] = await db.$queryRawUnsafe(
      `SELECT "readBy" FROM "Notification" WHERE id = '${esc(id)}'`
    )

    if (entries.length === 0) {
      return NextResponse.json({ error: 'التنبيه غير موجود' }, { status: 404 })
    }

    let readBy: string[] = []
    try { readBy = JSON.parse(entries[0].readBy || '[]') } catch {}

    if (!readBy.includes(empId)) {
      readBy.push(empId)
    }

    await db.$executeRawUnsafe(
      `UPDATE "Notification" SET "readBy" = '${esc(JSON.stringify(readBy))}' WHERE id = '${esc(id)}'`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'معرف مطلوب' }, { status: 400 })

    await db.$executeRawUnsafe(`DELETE FROM "Notification" WHERE id = '${esc(id)}'`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
