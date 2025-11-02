// Copy and paste this ENTIRE block into your browser console at https://usemax.io
// This version includes better error handling and debugging

async function fixCorrections() {
  try {
    console.log('🚀 Starting corrections fix...')
    
    const response = await fetch('/api/admin/fix-corrections', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ audio_file_name: "#2 Intro to the software and tools.m4a" })
    })
    
    console.log('📡 Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
    
    // Check content type
    const contentType = response.headers.get('content-type')
    console.log('📄 Content-Type:', contentType)
    
    if (!contentType || !contentType.includes('application/json')) {
      // Response is not JSON - likely HTML error page
      const text = await response.text()
      console.error('❌ Response is not JSON!')
      console.error('Response text (first 500 chars):', text.substring(0, 500))
      alert(`❌ Error: Server returned ${response.status} ${response.statusText}\n\nResponse type: ${contentType}\n\nCheck console for full response.`)
      return
    }
    
    const result = await response.json()
    console.log('✅ Result:', result)
    
    if (result.success) {
      alert(`✅ Fixed ${result.data.corrections_fixed} corrections!`)
      console.log('Fixed corrections:', result.data.corrections)
    } else {
      alert(`❌ Error: ${result.error}`)
      if (result.details) {
        console.error('Error details:', result.details)
      }
    }
  } catch (error) {
    console.error('❌ Fetch error:', error)
    alert(`❌ Failed to call API: ${error.message}\n\nCheck console for details.`)
  }
}

// Run it
fixCorrections()

