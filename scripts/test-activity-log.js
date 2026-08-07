// Test the activity log API
const BASE_URL = process.env.TEST_URL || 'https://my-project-tan-gamma-26.vercel.app'

async function test() {
  console.log('=== Test 1: Create a log entry ===')
  try {
    const res = await fetch(`${BASE_URL}/api/activity-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test_user',
        userName: 'تجربة',
        userRole: 'admin',
        branchId: '',
        branchName: '',
        action: 'اختبار النظام',
        category: 'تسجيل الدخول',
        details: 'هذا سجل اختباري'
      })
    })
    console.log('Status:', res.status)
    const data = await res.json()
    console.log('Response:', data)
  } catch (e) {
    console.error('Error:', e)
  }

  console.log('\n=== Test 2: Get log entries ===')
  try {
    const res = await fetch(`${BASE_URL}/api/activity-log?page=1&limit=10`)
    console.log('Status:', res.status)
    const data = await res.json()
    console.log('Total:', data.total)
    console.log('Entries:', data.entries?.length || 0)
    if (data.entries?.length > 0) {
      console.log('First entry:', JSON.stringify(data.entries[0], null, 2))
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

test()
