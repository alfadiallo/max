# Max Quick Start Guide

Get the Max transcription platform running locally in 30 minutes.

---

## Prerequisites

- Node.js 18+ installed (`node --version`)
- npm or yarn
- Git
- Supabase account (free at https://supabase.com)
- OpenAI account with API credits
- Anthropic account with API key

---

## Step 1: Clone & Install (5 minutes)

```bash
# Clone repository
git clone https://github.com/yourusername/max.git
cd max

# Install dependencies
npm install

# Verify installation
npm run type-check
```

---

## Step 2: Create Supabase Project (3 minutes)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
   - Organization: Your default org
   - Name: `max-dev`
   - Database Password: Generate strong password (save it!)
   - Region: Closest to you
3. Wait for initialization (~2 minutes)
4. Go to **Settings > API** → Copy and save:
   - Project URL
   - `anon` key
   - `service_role` key

---

## Step 3: Create Storage Buckets (2 minutes)

1. In Supabase Dashboard, go to **Storage**
2. Create bucket: `max-audio`
   - Make **Public**
3. Create bucket: `max-transcripts`
   - Make **Public**

---

## Step 4: Set Up Environment Variables (2 minutes)

Create `.env.local` in project root:

```bash
# Copy template
cp .env.example .env.local

# Edit with your values
nano .env.local
```

Paste your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=xi-...   # Optional for now

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Step 5: Initialize Database (5 minutes)

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy entire contents from `/scripts/seed-basic-data.sql` (in your repo)
4. Paste into SQL editor
5. Click **Run**
6. Wait for tables to be created (~1 minute)

Expected result:
```
✅ 13 tables created
✅ 7 project types seeded
```

---

## Step 6: Start Development Server (1 minute)

```bash
npm run dev
```

Server starts at `http://localhost:3000`

Watch for logs:
```
✓ Ready in 2.3s
```

---

## Step 7: Test the System (15 minutes)

### 1. Register User

1. Open http://localhost:3000/register
2. Fill in:
   - Email: `test@max.local`
   - Password: `TestPass123!`
   - Full Name: `Test User`
3. Click "Register"
4. You should be redirected to dashboard

### 2. Check Diagnostic

1. Open http://localhost:3000/api/health in browser
2. Should see:
   ```json
   {
     "success": true,
     "database": "✅ Connected",
     "storage_buckets": "✅ Exist"
   }
   ```

### 3. Create Project

1. Go to http://localhost:3000/dashboard
2. Click "New Project"
3. Fill in:
   - Name: "Test Lecture"
   - Project Type: "Lecture"
   - Location: "Test Location"
   - Date: Today
4. Click "Create"

### 4. Upload Audio

1. Go to your project
2. Click "Upload Audio"
3. Drag-drop an MP3 file (or download test file below)
4. Confirm upload
5. Audio should appear in project

### 5. Test Transcription

1. Click audio file
2. Click "Transcribe"
3. Wait for Whisper to process (1-2 minutes for short audio)
4. Review transcription with timestamps

**✅ Success!** If you got here, your system is working.

---

## Downloading Test Audio

Need a test audio file? Here are options:

**Option A: Generate from text**
```bash
# Using macOS/Linux
say "Hello everyone, welcome to today's lecture on endodontics. 
Today we'll discuss modern root canal treatment techniques." \
-o test-audio.m4a

# Convert to MP3 (requires ffmpeg)
ffmpeg -i test-audio.m4a test-audio.mp3
```

**Option B: Download sample**
- [Download sample dental lecture audio (2 min)](https://example.com/sample.mp3)

**Option C: Record yourself**
1. Open any voice recorder app
2. Record 1-2 minutes of speech
3. Export as MP3

---

## Troubleshooting

### "Cannot connect to Supabase"
```
❌ Error: Invalid API key
```

**Fix:**
1. Double-check `.env.local` values
2. Verify Supabase project is running (should be green in dashboard)
3. Restart dev server: `npm run dev`

### "Tables not found"
```
❌ Error: relation "transcriptions" does not exist
```

**Fix:**
1. Go to Supabase SQL Editor
2. Verify tables exist: `SELECT * FROM information_schema.tables;`
3. If empty, re-run migration SQL from Step 5

### "Upload fails"
```
❌ Error: max-audio bucket not found
```

**Fix:**
1. Go to Supabase Dashboard > Storage
2. Create bucket named `max-audio` (must be exact)
3. Set to Public

### "Transcription times out"
```
❌ Error: Transcription timeout after 30s
```

**Reasons:**
- Audio file too large (>25MB)
- OpenAI API slow/down
- Whisper API key invalid

**Fix:**
1. Check OPENAI_API_KEY in `.env.local`
2. Try smaller audio file (<5 minutes)
3. Check OpenAI status: https://status.openai.com

### "Can't login after register"
```
❌ Error: Invalid credentials
```

**Fix:**
1. Go to Supabase Dashboard > Authentication > Users
2. Verify user email is confirmed
3. Try resetting password or registering new account

---

## File Structure for Reference

Key files you'll be working with:

```
max/
├── .env.local ← Your secrets go here
├── scripts/
│   └── seed-basic-data.sql ← Run this to create tables
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── register/page.tsx ← Registration
│   │   ├── (dashboard)/
│   │   │   └── page.tsx ← Main dashboard
│   │   └── api/
│   │       ├── transcribe/route.ts ← Whisper integration
│   │       └── health/route.ts ← Diagnostics
│   ├── components/
│   │   ├── projects/ ← Project management UI
│   │   ├── audio/ ← Upload UI
│   │   └── transcription/ ← Editor UI
│   └── lib/
│       ├── api/
│       │   ├── whisper.ts ← Transcription logic
│       │   └── claude.ts ← Translation/summaries
│       └── supabase/
│           └── client.ts ← DB connection
```

---

## Next Steps After Setup

### Immediate (Complete MVP)

1. **Test the entire flow:**
   - Upload → Transcribe → Edit → Save version ✓

2. **Implement translation:**
   - Create Spanish translation
   - Edit translation
   - Mark ready for ElevenLabs

3. **Test summary generation:**
   - Generate email summary
   - Edit summary
   - Finalize to create feedback log

4. **Test dictionary:**
   - Add term to dictionary
   - Verify it applies to translations

### Short-term (This week)

- [ ] Test with Dr. Soto's actual audio
- [ ] Refine UI/UX based on feedback
- [ ] Add more test projects
- [ ] Optimize transcription for dental terminology
- [ ] Test all 8 languages

### Medium-term (This month)

- [ ] Deploy to Vercel
- [ ] Configure usemax.io domain (GoDaddy → Vercel)
- [ ] Set up proper backups
- [ ] Create user documentation
- [ ] Share with team for testing

---

## Performance Tips

### Speed up development

```bash
# Fast refresh (changes reflect immediately)
npm run dev

# Check for TypeScript errors
npm run type-check

# Format code
npx prettier --write src/
```

### Speed up transcription testing

Use short audio files (30-60 seconds) during development:
- Faster Whisper processing
- Lower OpenAI API costs
- Easier to debug

### Speed up Supabase queries

Enable Query Performance:
1. Supabase Dashboard > SQL Editor
2. Run: `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`
3. Then view slow queries

---

## Database Management

### Backup your data

```bash
# Download database backup from Supabase Dashboard
# Settings > Backups > Download

# Or use Supabase CLI
supabase db pull
```

### Reset database (if needed)

```bash
# In Supabase Dashboard > SQL Editor:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Then re-run migration from Step 5
```

### View database contents

**In browser:**
1. Supabase Dashboard > Table Editor
2. Browse tables, data, relationships

**In terminal:**
```bash
# Install Supabase CLI
npm install -g supabase

# Connect to remote database
supabase link --project-ref xxxxx

# View data
supabase db pull
```

---

## Common Commands

```bash
# Start development server
npm run dev

# Check for errors
npm run type-check

# Run migrations (if needed)
npm run db:migrate

# Seed database
npm run db:seed

# Generate TypeScript types from Supabase
npm run generate:types

# Build for production
npm run build

# Deploy to Vercel
git push origin main  # Auto-deploys if connected to Vercel

# Run tests
npm run test
```

---

## Getting Help

### Debugging Tips

1. **Check browser console** (F12):
   - Frontend errors appear here
   - Network tab shows API requests/responses

2. **Check terminal logs**:
   - Server errors appear where you ran `npm run dev`
   - Look for `[ERROR]`, `[WARN]` prefixes

3. **Check Supabase Dashboard**:
   - Logs: Real-time database logs
   - SQL Editor: Test queries
   - Table Editor: View data directly

4. **Use diagnostic endpoints**:
   - `http://localhost:3000/api/health`
   - `http://localhost:3000/api/check-profile`
   - `http://localhost:3000/api/check-schema`

### Common Issues Database

| Issue | Cause | Fix |
|-------|-------|-----|
| "Cannot POST /api/..." | Route doesn't exist | Check route path in `/app/api/` |
| "Supabase key invalid" | Wrong copy-paste | Re-copy from Dashboard > Settings > API |
| "CORS error" | Storage bucket private | Make bucket Public in Storage tab |
| "Token expired" | Session too old | Log out and log back in |
| "File upload fails" | File too large | Keep under 500MB |

---

## Making Your First Change

Let's test that everything works by making a small change:

### Edit the Dashboard

1. Open `src/app/(dashboard)/page.tsx`
2. Find the heading "Dashboard"
3. Change to "Max Dashboard"
4. Save file
5. Refresh browser
6. You should see change immediately ✓

This confirms hot-reload is working!

---

## What's Next?

You now have:

✅ Next.js development environment  
✅ Supabase database connected  
✅ Storage buckets configured  
✅ User authentication working  
✅ API routes ready  
✅ Sample data seeded  

You're ready to:

1. Understand the architecture (read `MAX-PROJECT-STRUCTURE.md`)
2. Implement features (follow `MAX-API-ROUTES.md`)
3. Deploy to production (see `MAX-SETUP-GUIDE.md`)

---

## Quick Reference

### Supabase Dashboard Links

After logging in:
- **Tables:** https://app.supabase.com/project/[id]/editor
- **Storage:** https://app.supabase.com/project/[id]/storage/buckets
- **Users:** https://app.supabase.com/project/[id]/auth/users
- **Logs:** https://app.supabase.com/project/[id]/logs/postgres-logs

### API Test URLs

```
GET  http://localhost:3000/api/health
GET  http://localhost:3000/api/projects
GET  http://localhost:3000/api/projects/types
POST http://localhost:3000/api/transcribe
```

### Key Credentials (Keep Secret!)

Never commit to Git:
```
SUPABASE_SERVICE_ROLE_KEY    ← Database admin key
ANTHROPIC_API_KEY            ← Claude API key
OPENAI_API_KEY               ← Whisper API key
ELEVENLABS_API_KEY           ← Voice synthesis key
```

Store in `.env.local` only (git-ignored).

---

## Success Checklist

- [ ] Node.js installed
- [ ] Supabase project created
- [ ] Storage buckets created
- [ ] `.env.local` filled in
- [ ] Database tables migrated
- [ ] Dev server running (`npm run dev`)
- [ ] Can register user
- [ ] Can create project
- [ ] Can upload audio
- [ ] Can transcribe audio
- [ ] API health check passes

**If all checked ✓, you're ready to build!**

---

## Need More Help?

- **Setup issues?** See `MAX-SETUP-GUIDE.md`
- **Database questions?** See `MAX-DATABASE-SCHEMA.md`
- **API endpoints?** See `MAX-API-ROUTES.md`
- **Project structure?** See `MAX-PROJECT-STRUCTURE.md`