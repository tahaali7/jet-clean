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

export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const empId = searchParams.get('empId')
    const branchId = searchParams.get('branchId')
    const all = searchParams.get('all')

    let where = 'WHERE 1=1'

    if (all === 'true') {
      // المسؤول يطّلع على كل الإشعارات
      const entries: any[] = await db.$queryRawUnsafe(
        `SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT 50`
      )
      return NextResponse.json(entries.map(parseNotif))
    }

    // الموظف: يعرض إشعارات فرعه + الإشعارات العامة
    const conditions: string[] = []
    if (branchId) {
      conditions.push(`"branchId" IS NULL`)
      conditions.push(`"branchId" = '${esc(branchId)}'`)
    } else {
      conditions.push(`"branchId" IS NULL`)
    }

    const entries: any[] = await db.$queryRawUnsafe(
      `SELECT * FROM "Notification" WHERE (${conditions.join(' OR ')}) ORDER BY "createdAt" DESC LIMIT 50`
    )

    // فلترة: يبقى فقط الإشعارات اللي الموظف ما قرأها (لو empId موجود)
    if (empId) {
      const filtered = entries.filter((n: any) => {
        try {
          const readBy: string[] = JSON.parse(n.readBy || '[]')
          return !readBy.includes(empId)
        } catch { return true }
      })
      return NextResponse.json(filtered.map(parseNotif))
    }

    return NextResponse.json(entries.map(parseNotif))
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const data = await req.json()
    const { message, branchId, type, createdBy } = data

    if (!message?.trim()) {
      return NextResponse.json({ error: 'الرجاء كتابة نص التنبيه' }, { status: 400 })
    }

    const newId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)

    await db.$executeRawUnsafe(
      `INSERT INTO "Notification" (id, message, "branchId", type, "createdBy", "readBy", "createdAt")
       VALUES ('${esc(newId)}', '${esc(message.trim())}', ${branchId ? `'${esc(branchId)}'` : 'NULL'}, '${esc(type || 'normal')}', '${esc(createdBy || '')}', '[]', NOW())`
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

    // إضافة empId لقائمة readBy
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

function parseNotif(entry: any) {
  let readBy: string[] = []
  try { readBy = JSON.parse(entry.readBy || '[]') } catch {}
  return {
    ...entry,
    readBy,
    createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString()
  }
}
