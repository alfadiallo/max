# Fix Supabase Storage File Size Limit

## Problem

When uploading files larger than ~50-100MB, you get an error:
> "The object exceeded the maximum allowed size"

## Cause

Supabase Storage buckets have default file size limits:
- **Free tier**: Usually 50MB per file
- **Pro tier**: 5GB per file (configurable)

## Solution 1: Configure Bucket File Size Limit (Recommended)

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Storage Settings**
   - Click **Storage** in the left sidebar
   - Click on the `max-audio` bucket

3. **Edit Bucket Settings**
   - Click the **Settings** tab (or gear icon)
   - Find **File size limit** setting
   - Change it to your desired limit:
     - For 500MB: Enter `524288000` (500 * 1024 * 1024)
     - For 1GB: Enter `1073741824` (1024 * 1024 * 1024)
     - For 5GB: Enter `5368709120` (5 * 1024 * 1024 * 1024)
   - Click **Save**

4. **Verify**
   - Try uploading your file again

## Solution 2: Upgrade Supabase Plan

If you need files larger than 5GB:

1. **Upgrade to Pro Plan** ($25/month)
   - Supports up to 5GB per file
   - Can be configured higher if needed

2. **Contact Supabase Support** for custom limits if needed

## Solution 3: Alternative - Chunked Upload (Advanced)

For very large files (>5GB), you could implement chunked uploads, but this requires:
- Splitting files into chunks client-side
- Uploading chunks sequentially or in parallel
- Reassembling on Supabase Storage

**Note**: This is complex and usually not necessary for audio files.

## Current Configuration

Your code allows up to **500MB** per file, but the Supabase bucket may have a lower limit set.

## Quick Check

To see your current bucket limit:

1. Go to Supabase Dashboard → Storage → `max-audio` bucket
2. Check the **Settings** tab for "File size limit"
3. If it's less than your needs, increase it

## Recommended Settings

For audio transcription workflows:
- **File size limit**: `524288000` (500MB) - Good for most audio files
- **Bucket type**: Public (for audio files)
- **Allowed MIME types**: `audio/*` (or leave unrestricted)

---

**After configuring, your 116MB file should upload successfully!**

