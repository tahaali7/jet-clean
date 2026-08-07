const BASE_URL = 'https://my-project-tan-gamma-26.vercel.app'

async function test() {
  console.log('=== Test Activity Log (detailed error) ===')
  try {
    const res = await fetch(`${BASE_URL}/api/activity-log?page=1&limit=5`)
    const text = await res.text()
    console.log('Status:', res.status)
    console.log('Body:', text.substring(0, 500))
  } catch(e) { console.error(e) }

  // Try again after a delay
  console.log('\n=== Retry after 3s ===')
  await new Promise(r => setTimeout(r, 3000))
  try {
    const res = await fetch(`${BASE_URL}/api/branches`)
    const text = await res.text()
    console.log('Status:', res.status)
    console.log('Body:', text.substring(0, 500))
  } catch(e) { console.error(e) }
}

test()
