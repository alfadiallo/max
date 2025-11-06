# How to Fix Corrections for #2 Intro Audio File

## Method: Browser Console (Easiest)

1. **Go to https://usemax.io**
   - Make sure you're logged in as Admin

2. **Open Browser Console**
   - **Chrome/Edge**: Press `Cmd+Option+J` (Mac) or `Ctrl+Shift+J` (Windows)
   - **Firefox**: Press `Cmd+Option+K` (Mac) or `Ctrl+Shift+K` (Windows)
   - **Safari**: Press `Cmd+Option+C` (Mac) - first enable Developer menu in Preferences → Advanced

3. **Paste this code in the console and press Enter:**

```javascript
// Better version with error handling
async function fixCorrections() {
  try {
    const response = await fetch('/api/admin/fix-corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_file_name: "#2 Intro to the software and tools.m4a" })
    })
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Server returned non-JSON:', text.substring(0, 500))
      alert(`Error: Server returned ${response.status}. Check console.`)
      return
    }
    
    const result = await response.json()
    if (result.success) {
      alert(`✅ Fixed ${result.data.corrections_fixed} corrections!`)
    } else {
      alert(`❌ Error: ${result.error}`)
    }
  } catch (error) {
    console.error('Error:', error)
    alert(`Failed: ${error.message}`)
  }
}
fixCorrections()
```

**Or use the improved version from `FIX_CORRECTIONS_DEBUG.js` file for better debugging.**

4. **Check the console output**
   - You should see a success message
   - The corrections should now show only the changed words

## Alternative: Using curl (Terminal)

If you prefer using terminal:

```bash
curl -X POST https://usemax.io/api/admin/fix-corrections \
  -H "Content-Type: application/json" \
  -H "Cookie: $(your-session-cookie)" \
  -d '{"audio_file_name": "#2 Intro to the software and tools.m4a"}'
```

Note: This requires your session cookie, so browser console is easier.

## What it does:

- Finds the H-1 version for "#2 Intro to the software and tools.m4a"
- Computes minimal text diffs (only changed words, not entire segments)
- Updates the `dictionary_corrections_applied` in the database
- Shows you the result

## Expected Result:

**Before:**
- Original: "Hi guys, welcome back, I'm Carla Soto and in this session we are going to talk about"
- Corrected: "Hi guys, welcome back, I'm Karla Soto and in this session we are going to talk about"

**After:**
- Original: "Carla"
- Corrected: "Karla"
- Context: Shows surrounding words

