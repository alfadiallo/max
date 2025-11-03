// Copy and paste this entire block into your browser console at https://usemax.io

fetch('/api/admin/fix-corrections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audio_file_name: "#2 Intro to the software and tools.m4a" })
})
.then(r => r.json())
.then(result => {
  console.log('Result:', result)
  if (result.success) {
    alert(`✅ Fixed ${result.data.corrections_fixed} corrections!`)
    console.log('Fixed corrections:', result.data.corrections)
  } else {
    alert(`❌ Error: ${result.error}`)
  }
})
.catch(error => {
  console.error('Error:', error)
  alert('Failed to fix corrections. Check console for details.')
})

