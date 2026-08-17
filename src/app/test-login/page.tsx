'use client'
import { useState } from 'react'

export default function TestLoginPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testEndpoint = (url: string, method: string = 'GET', body?: string) => {
    setLoading(true)
    setResult('جاري الإرسال...')
    
    const xhr = new XMLHttpRequest()
    xhr.open(method, url, true)
    if (body) xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.timeout = 30000
    
    xhr.onload = function () {
      const info = `STATUS: ${xhr.status}\nSTATUS TEXT: ${xhr.statusText}\nCONTENT-TYPE: ${xhr.getResponseHeader('content-type')}\nRESPONSE:\n${xhr.responseText.substring(0, 500)}`
      setResult(info)
      setLoading(false)
    }
    
    xhr.onerror = function () {
      setResult('ONERROR: فشل الاتصال بالخادم - لم يتم استلام أي رد')
      setLoading(false)
    }
    
    xhr.ontimeout = function () {
      setResult('ONTIMEOUT: انتهت مهلة 30 ثانية')
      setLoading(false)
    }
    
    try {
      xhr.send(body || null)
    } catch (e: any) {
      setResult('SEND ERROR: ' + (e?.message || 'unknown'))
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ padding: 20, fontFamily: 'monospace', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ color: '#0ea5e9' }}>صفحة تشخيص تسجيل الدخول</h2>
      <p style={{ color: '#94a3b8', fontSize: 14 }}>هذه الصفحة لفحص الاتصال بالخادم - لا تستخدمها لتسجيل الدخول الحقيقي</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        <button
          onClick={() => testEndpoint('/api/health?' + Date.now())}
          disabled={loading}
          style={{ padding: 12, background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
        >
          1. اختبار /api/health (GET)
        </button>
        
        <button
          onClick={() => testEndpoint('/api/auth/login?' + Date.now(), 'POST', JSON.stringify({ empId: 'admin', password: 'test' }))}
          disabled={loading}
          style={{ padding: 12, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
        >
          2. اختبار /api/auth/login (POST)
        </button>

        <button
          onClick={() => testEndpoint('/api/test-deps?' + Date.now())}
          disabled={loading}
          style={{ padding: 12, background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
        >
          3. اختبار /api/test-deps (GET)
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 20, padding: 15, background: '#1e293b', borderRadius: 8, border: '1px solid #334155', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 13, color: '#e2e8f0' }}>
          {result}
        </div>
      )}
    </div>
  )
}
