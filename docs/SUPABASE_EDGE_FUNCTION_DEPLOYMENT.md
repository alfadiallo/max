# Supabase Edge Function - Audio Compression Deployment Guide

## Overview

We've moved audio compression to a Supabase Edge Function (`compress-audio`) to avoid Vercel bundle size limits. The Edge Function uses FFmpeg.wasm to compress audio files to Opus/OGG format.

## Prerequisites

1. Supabase CLI installed and configured
2. `SUPABASE_SERVICE_ROLE_KEY` set in Vercel environment variables
3. `NEXT_PUBLIC_SUPABASE_URL` set in Vercel environment variables

## Deployment Steps

### 1. Deploy the Edge Function to Supabase

```bash
# Make sure you're in the project root
cd /path/to/max

# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the Edge Function
npx supabase functions deploy compress-audio
```

**Note:** Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID (found in your Supabase project settings → API).

### 2. Set Environment Variables in Supabase

The Edge Function needs access to your Supabase project:

```bash
# Set environment variables for the Edge Function
npx supabase secrets set SUPABASE_URL=YOUR_SUPABASE_URL
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Or set them via Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to **Edge Functions** → **Settings**
3. Add secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (⚠️ Keep this secret!)

### 3. Verify Vercel Environment Variables

Make sure these are set in your Vercel project:

- `SUPABASE_SERVICE_ROLE_KEY` - Required for calling Edge Functions
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL

**To check/update in Vercel:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Verify both variables are set

### 4. Test the Edge Function

You can test the Edge Function directly:

```bash
# Test locally (if you have Supabase CLI set up)
npx supabase functions serve compress-audio

# Or test against deployed function
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/compress-audio \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_data": "BASE64_ENCODED_AUDIO_DATA",
    "filename": "test.wav",
    "target_size_mb": 20
  }'
```

## How It Works

1. **User uploads large audio file** (> 25MB)
2. **Transcription API route** detects file size > 25MB
3. **Calls Supabase Edge Function** with base64-encoded audio data
4. **Edge Function compresses** using FFmpeg.wasm to Opus/OGG format
5. **Returns compressed audio** (base64-encoded)
6. **Transcription route** sends compressed audio to OpenAI Whisper

## Edge Function Features

- ✅ Uses FFmpeg.wasm for Deno compatibility
- ✅ Compresses to Opus/OGG format (best quality/size ratio)
- ✅ Progressive bitrate reduction (96k → 64k → 48k → 32k)
- ✅ Handles files up to several hundred MB
- ✅ Returns helpful errors if compression fails

## Troubleshooting

### Edge Function Not Found (404)

**Problem:** Getting 404 when calling Edge Function

**Solution:**
- Verify Edge Function is deployed: `npx supabase functions list`
- Check the URL matches your project reference ID
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct

### FFmpeg.wasm Loading Issues

**Problem:** Edge Function fails with FFmpeg.wasm errors

**Solution:**
- FFmpeg.wasm may take time to load (first request can be slow)
- Check Edge Function logs in Supabase Dashboard
- Consider using system FFmpeg if available in Supabase runtime

### Timeout Issues

**Problem:** Edge Function times out

**Solution:**
- Supabase Edge Functions have timeout limits (typically 60 seconds)
- Very large files (> 500MB) may timeout
- Consider splitting large files or using client-side compression

## Monitoring

Check Edge Function logs in Supabase Dashboard:
1. Go to **Edge Functions** → **compress-audio**
2. Click **Logs** to see execution logs
3. Monitor for errors or performance issues

## Fallback

If Edge Function compression fails, users will see an error message suggesting:
- Delete and re-upload (uses client-side compression)
- Compress manually before uploading
- Split file into smaller chunks

## Next Steps

After deployment:
1. ✅ Deploy Edge Function to Supabase
2. ✅ Set environment variables
3. ✅ Deploy Next.js app to Vercel (with updated code)
4. ✅ Test with a large audio file (> 25MB)
5. ✅ Verify compression works and transcription succeeds

