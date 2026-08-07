const BASE_URL = 'https://my-project-tan-gamma-26.vercel.app'

async function test() {
  // Test branches API
  console.log('=== Branches ===')
  try {
    const res = await fetch(`${BASE_URL}/api/branches`)
    console.log('Status:', res.status, 'OK:', res.ok)
    if (res.ok) { const d = await res.json(); console.log('Count:', d.length) }
  } catch(e) { console.error(e) }

  // Test car-entries GET
  console.log('\n=== Car Entries ===')
  try {
    const res = await fetch(`${BASE_URL}/api/car-entries?date=2026-08-07&branchId=test`)
    console.log('Status:', res.status, 'OK:', res.ok)
    if (res.ok) { const d = await res.json(); console.log('Type:', typeof d) }
  } catch(e) { console.error(e) }

  // Test notifications GET  
  console.log('\n=== Notifications ===')
  try {
    const res = await fetch(`${BASE_URL}/api/notifications?all=true`)
    console.log('Status:', res.status, 'OK:', res.ok)
    if (res.ok) { const d = await res.json(); console.log('Count:', Array.isArray(d) ? d.length : 'not array') }
  } catch(e) { console.error(e) }

  // Test maintenance
  console.log('\n=== Maintenance ===')
  try {
    const res = await fetch(`${BASE_URL}/api/maintenance`)
    console.log('Status:', res.status, 'OK:', res.ok)
    if (res.ok) { const d = await res.json(); console.log('Data:', d) }
  } catch(e) { console.error(e) }
}

test()
