'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: '40px', fontFamily: 'Cairo, sans-serif', direction: 'rtl', background: '#0f172a', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#f87171', fontSize: '24px' }}>⚠️ خطأ في التطبيق</h1>
      <p style={{ marginTop: '16px', color: '#94a3b8' }}>الرسالة: {error.message}</p>
      <p style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>Digest: {error.digest || 'N/A'}</p>
      <pre style={{ marginTop: '16px', padding: '16px', background: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '400px' }}>
        {error.stack}
      </pre>
      <button
        onClick={reset}
        style={{ marginTop: '20px', padding: '12px 24px', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
      >
        🔄 إعادة المحاولة
      </button>
    </div>
  )
}
