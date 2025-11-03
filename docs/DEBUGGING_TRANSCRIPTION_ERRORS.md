# Debugging Transcription Errors

## How to Debug Connection Errors

### Method 1: Browser Developer Tools (Recommended)

1. **Open Chrome Developer Tools**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Or right-click → "Inspect"

2. **Go to Console Tab**
   - Click "Console" tab
   - Look for error messages (red text)
   - Copy any error messages you see

3. **Go to Network Tab**
   - Click "Network" tab
   - Filter by "Fetch/XHR" or "All"
   - Try transcribing again
   - Look for the `/api/audio/transcribe` request
   - Click on it to see:
     - **Headers**: Request/response headers
     - **Payload**: What was sent
     - **Response**: What the server returned
     - **Timing**: How long it took

4. **Check the Response**
   - Look at the **Status Code**:
     - `200` = Success
     - `400` = Bad Request (invalid data)
     - `401` = Unauthorized (not logged in)
     - `500` = Server Error
     - `503` = Service Unavailable
     - `504` = Gateway Timeout
   - Look at the **Response body** for error details

### Method 2: Check Vercel Logs (Server-Side)

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project (`usemax.io`)

2. **View Logs**
   - Click "Deployments" → Latest deployment
   - Click "Functions" tab
   - Find `/api/audio/transcribe`
   - Click to see server logs

3. **Real-Time Logs**
   - Go to "Logs" tab in Vercel
   - Filter by function name: `transcribe`
   - Try transcribing again while watching logs

### Method 3: Check Browser Console (What I Can See)

I can access your browser console through debugging tools. Share:
- The exact error message from the console
- The Network tab details for the `/api/audio/transcribe` request
- The Response status code and body

### Common Error Messages & Solutions

#### "Connection error"
- **Possible causes:**
  - Server timeout (Vercel function exceeded time limit)
  - Network connectivity issue
  - Server crashed/error
- **Check:**
  - Network tab → Look at request status
  - Response time (if > 60 seconds, likely timeout)

#### "Transcription failed: Connection error" with 500 status
- **Likely cause:** Vercel serverless function timeout
- **Solution:** Upgrade Vercel plan or reduce file size

#### "Failed to download audio file"
- **Possible causes:**
  - Supabase Storage URL invalid
  - File doesn't exist
  - Network issue downloading from Supabase

#### Request takes > 1 minute
- **Likely cause:** Vercel timeout
- **Solution:** File too large or OpenAI API slow

## Quick Debugging Steps

1. **Check Network Tab**
   ```
   - Open DevTools (F12)
   - Network tab
   - Filter: "transcribe"
   - Click on the failed request
   - Check Status Code and Response
   ```

2. **Check Console**
   ```
   - Console tab
   - Look for red errors
   - Copy error messages
   ```

3. **Check Vercel Logs**
   ```
   - Vercel Dashboard → Your Project
   - Deployments → Latest → Functions
   - Find transcribe function
   - Check logs for errors
   ```

## Share Debug Info

When reporting an error, provide:

1. **Browser Console Errors**
   - Copy any red error messages

2. **Network Request Details**
   - Status code (e.g., 500)
   - Response body (what the server returned)
   - Request duration (how long it took)

3. **Vercel Logs**
   - Any error messages from server logs

4. **File Details**
   - File size
   - File format
   - Duration (if known)

This helps identify the exact issue!

