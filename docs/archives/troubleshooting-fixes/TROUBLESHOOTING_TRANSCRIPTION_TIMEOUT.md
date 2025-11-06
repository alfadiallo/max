# Troubleshooting Transcription Timeout Errors

## Problem

Getting "Transcription failed: Connection error" with a 500 status code after ~1.3 minutes.

## Root Cause

**Vercel Serverless Function Timeout Limits:**
- **Free Tier**: 10 seconds maximum
- **Pro Tier**: 60 seconds (1 minute) maximum  
- **Enterprise**: Up to 300 seconds (5 minutes)

Your transcription request is taking longer than the timeout limit, causing the function to be terminated.

## Why It Takes So Long

1. **Downloading 116MB file** from Supabase Storage: ~10-30 seconds
2. **OpenAI Whisper API call**: Can take 1-5 minutes for long audio files
3. **Total time**: Often exceeds 60 seconds, hitting Vercel's timeout

## Solutions

### Solution 1: Upgrade Vercel Plan (Recommended for Production)

**Upgrade to Vercel Pro ($20/month):**
- Increases timeout to 60 seconds
- Still may not be enough for very long audio files

**Upgrade to Vercel Enterprise:**
- Can configure up to 300 seconds (5 minutes)
- Best for production with long audio files

### Solution 2: Implement Async Processing (Best for Long Files)

**Use Background Jobs:**
1. API route immediately returns "processing" status
2. Background job handles transcription
3. Client polls for completion or uses webhooks

**Implementation options:**
- Use Supabase Edge Functions (longer timeout)
- Use a job queue (BullMQ, Inngest, Trigger.dev)
- Use Vercel Cron Jobs with database polling

### Solution 3: Split Audio Files (Quick Fix)

**For users:**
- Split long audio files into chunks (< 5 minutes each)
- Transcribe each chunk separately
- Combine transcriptions manually

### Solution 4: Use Supabase Edge Functions Instead

**Migrate transcription to Supabase Edge Function:**
- Edge Functions have longer timeout limits
- Can handle larger files better
- Located closer to Supabase Storage (faster download)

**Implementation:**
1. Create Supabase Edge Function at `supabase/functions/transcribe/`
2. Call OpenAI Whisper from Edge Function
3. Return result or use webhooks

### Solution 5: Optimize Current Implementation

**Reduce download time:**
- ✅ Already implemented: Direct client upload to Supabase Storage
- Use signed URLs with expiration
- Compress audio before upload

**Optimize OpenAI call:**
- Use streaming if available
- Reduce audio quality if acceptable
- Process in chunks server-side

## Current Status

The code now includes:
- ✅ Better error handling for timeouts
- ✅ Timeout configuration for OpenAI client (5 minutes)
- ✅ Download timeout (30 seconds)
- ✅ Detailed error messages
- ✅ File size warnings

**But Vercel function timeout still applies!**

## Check Your Vercel Plan

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Check "Settings" → "General" → "Function Timeout"
4. Current limit will be shown

## Recommended Next Steps

### For Immediate Fix:
1. **Upgrade to Vercel Pro** ($20/month) - Gets you 60 seconds
2. Test with shorter audio files (< 5 minutes) first

### For Production Solution:
1. **Implement async processing** with database polling
2. Or migrate to **Supabase Edge Functions**
3. Or use a **dedicated job queue service**

## Quick Test

To verify it's a timeout issue:
1. Try transcribing a short audio file (< 2 minutes)
2. If it works → confirms timeout issue
3. If it still fails → different problem (check logs)

## Check Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" → Latest deployment
3. Click "Functions" tab
4. Look for `/api/audio/transcribe` function logs
5. Check for timeout errors or other issues

---

**The 116MB file is likely too long for your current Vercel plan timeout. Try upgrading or implementing async processing.**

