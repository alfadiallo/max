# OpenAI File Size Limit - Solutions & Workarounds

## The Problem

OpenAI Whisper API has a **hard 25MB (26,214,400 bytes) limit** per file. This cannot be increased - it's set by OpenAI.

**Your file**: 110.97 MB → Must be reduced to < 25MB to transcribe

---

## Why We Can't Increase It

- ✅ OpenAI's API limitation (not something we control)
- ✅ Applied at the API level
- ✅ Cannot be bypassed or increased
- ❌ Not a Vercel or Supabase limit
- ❌ Not something we can configure

---

## Solutions

### Solution 1: Client-Side Compression (✅ Already Implemented)

**What we did:**
- Automatic compression for files > 20MB
- Reduces file size before upload
- Ensures files stay under 25MB

**How it works:**
- Files > 20MB are automatically compressed
- Target: < 20MB (safe margin under 25MB limit)
- Compression happens in browser before upload

**Status**: ✅ **Already in place** - Works for NEW uploads

**For existing files**: Delete and re-upload (compression will run automatically)

---

### Solution 2: Pre-Process Audio Files (User Action)

**Before uploading**, compress your audio files:

#### Option A: Using Audacity (Free)
1. Download Audacity: https://www.audacityteam.org/
2. Open your audio file
3. File → Export → Export as MP3
4. Choose quality: **128 kbps** (good balance of quality/size)
5. Save and upload the compressed version

#### Option B: Using Online Tools
- **CloudConvert**: https://cloudconvert.com/wav-to-mp3
- **Online Audio Converter**: https://online-audio-converter.com/
- Upload WAV → Choose MP3 @ 128kbps → Download → Upload to Max

#### Option C: Using FFmpeg (Command Line)
```bash
# Convert to MP3 with 128kbps bitrate
ffmpeg -i "input.wav" -b:a 128k "output.mp3"

# Or reduce sample rate for smaller files
ffmpeg -i "input.wav" -ar 22050 -b:a 96k "output.mp3"
```

---

### Solution 3: Split Large Files (Manual)

For very long audio files (> 2 hours), split into chunks:

1. Use Audacity or similar tool
2. Split into 30-60 minute segments
3. Each segment should be < 25MB when compressed
4. Upload and transcribe each separately
5. Combine transcriptions manually (or implement auto-merge)

---

### Solution 4: Server-Side Compression (✅ **IMPLEMENTED**)

**What we implemented:**
- ✅ Server-side audio compression using **Opus codec** (via FFmpeg)
- ✅ Automatic compression when file > 25MB during transcription
- ✅ Uses Opus/OGG format (superior quality at lower bitrates)
- ✅ Progressive bitrate reduction (96k → 64k → 48k → 32k)
- ✅ Compresses files from Supabase Storage before sending to OpenAI

**How it works:**
1. File is downloaded from Supabase Storage
2. If file > 25MB, automatically compresses to Opus/OGG
3. Progressive bitrate reduction until file < 25MB
4. Compressed file is sent to OpenAI Whisper

**Benefits of Opus:**
- **Better quality** at lower bitrates than MP3
- **Smaller file sizes** (Opus 96k = MP3 128k quality, but ~25% smaller)
- **Supported by Whisper** (OGG container)
- **Excellent for speech** (optimized for voice content)

**Example compression:**
- Original: 110MB WAV
- After Opus compression @ 64k: ~15-20MB (well under 25MB limit)
- Quality: Excellent (comparable to MP3 @ 96-128k)

---

### Solution 5: Chunked Transcription (Advanced)

**Concept:**
1. Split audio file into smaller chunks server-side
2. Transcribe each chunk separately
3. Merge transcriptions with proper timestamps
4. Return combined result

**Implementation Complexity:** High
**Requires:**
- Audio splitting logic
- Managing multiple OpenAI API calls
- Merging results with timestamp alignment
- Error handling for partial failures

---

## Current Implementation Status

### ✅ What's Working Now:

1. **Client-side compression** (files > 20MB automatically compressed before upload)
2. **Server-side compression** (files > 25MB automatically compressed during transcription using Opus)
3. **File size validation** before transcription
4. **Clear error messages** when files are too large
5. **Progress indicators** during compression
6. **Dual-layer protection**: Both client and server-side compression

### ❌ Edge Cases:

- Extremely long audio files (> 2 hours) that may still exceed 25MB even at minimum bitrate (32k Opus)
- Files that are too long: Very long recordings may need to be split manually

---

## Recommended Workflow

### For New Uploads:
1. Upload file → Automatic compression if > 20MB
2. File is automatically reduced to < 25MB
3. Transcription works seamlessly

### For Existing Large Files:
1. **Option A**: Just try transcribing - server-side compression will handle it automatically! ✅
2. **Option B**: Delete and re-upload - client-side compression will compress during upload
3. **Option C**: Compress locally first for faster processing

---

## File Size Guidelines

| Audio Duration | Recommended Format | Expected Size |
|---------------|-------------------|---------------|
| 5 minutes     | MP3 @ 128kbps      | ~5MB          |
| 10 minutes    | MP3 @ 128kbps      | ~10MB         |
| 30 minutes    | MP3 @ 128kbps      | ~30MB → **Compress to 96kbps** → ~22MB |
| 60 minutes    | MP3 @ 96kbps       | ~43MB → **Split or compress to 64kbps** → ~29MB |
| 2 hours       | MP3 @ 96kbps       | ~86MB → **Must split into chunks** |

**Note**: WAV files are uncompressed and much larger. Always convert to MP3 for transcription.

---

## Quick Fix for Your 110MB File

**Your file**: "1.3 What type of cases.wav" (110.97 MB, 10:05 duration)

**Recommended approach:**
1. **Download the original file** (if you have it)
2. **Compress to MP3 @ 128kbps**
   - Should reduce to ~10-15MB (well under 25MB limit)
   - Quality will still be fine for transcription
3. **Delete the WAV file** from Max
4. **Upload the compressed MP3**
5. **Transcribe** - Should work perfectly!

**Or use the automatic compression:**
- Delete current file
- Re-upload → Compression runs automatically
- Should reduce to acceptable size

---

## Technical Details

### OpenAI Whisper Limits:
- **Max file size**: 25MB (hard limit)
- **Max duration**: 2 hours (soft limit, but file size usually hits first)
- **Supported formats**: MP3, MP4, MPEG, MPGA, M4A, WAV, WebM

### Why WAV Files Are Large:
- Uncompressed format
- 10 minutes of WAV @ 44.1kHz stereo = ~100MB
- Same audio as MP3 @ 128kbps = ~10MB

### Compression Ratios:
- WAV → MP3 @ 128kbps: ~10:1 compression
- WAV → MP3 @ 96kbps: ~13:1 compression  
- WAV → MP3 @ 64kbps: ~20:1 compression
- **WAV → Opus @ 96kbps: ~12:1 compression (better quality than MP3 @ 128kbps)**
- **WAV → Opus @ 64kbps: ~18:1 compression (excellent quality for speech)**
- **WAV → Opus @ 48kbps: ~24:1 compression (very good quality for speech)**

---

## Summary

**Can we increase OpenAI's limit?** ❌ No - it's a hard API limit

**What can we do?** ✅ **Dual compression system**:
1. **Client-side**: Compresses during upload (files > 20MB)
2. **Server-side**: Compresses during transcription (files > 25MB) using **Opus codec**

**Best solution:** Just upload and transcribe - compression happens automatically! 🎉

**For your 110MB file:** 
- **Option 1**: Just click transcribe - server-side Opus compression will handle it automatically
- **Option 2**: Delete and re-upload - client-side compression will reduce it during upload

