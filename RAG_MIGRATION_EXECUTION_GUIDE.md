# RAG Migration - Execution Guide for Phase 1

## Quick Start: Execute Migration

### Step 1: Verify Environment ✅

Check your Supabase connection:
```bash
# If you have psql installed
psql --version

# If using Supabase CLI
supabase --version
```

---

### Step 2: Get Supabase Credentials 🔑

You'll need one of these connection methods:

**Option A: Connection String (Easiest)**
```bash
# Get from Supabase dashboard
# Project Settings > Database > Connection string
# Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
```

**Option B: Supabase CLI**
```bash
# If you have Supabase CLI linked
supabase link --project-ref your-project-ref
```

**Option C: Manual (SQL Editor)**
- Go to Supabase dashboard
- SQL Editor
- Copy/paste the migration SQL
- Run it

---

### Step 3: Backup Database (CRITICAL) 💾

```bash
# Create backup before migration
pg_dump $DATABASE_URL > backup_pre_rag_$(date +%Y%m%d_%H%M%S).sql

# Or using Supabase CLI
supabase db dump -f backup_pre_rag.sql
```

**⚠️ NEVER skip this step!**

---

### Step 4: Execute Migration 🚀

**Method 1: Command Line (Recommended)**

```bash
# Navigate to project root
cd /Users/alfadiallo/max

# Run migration
psql $DATABASE_URL -f sql/migrations/supabase-rag-extension-option-a.sql

# Or if using connection string inline
psql "postgresql://postgres:PASSWORD@HOST:5432/postgres" \
  -f sql/migrations/supabase-rag-extension-option-a.sql
```

**Method 2: Supabase CLI**

```bash
# If linked to project
supabase db push

# Or direct
supabase db execute -f sql/migrations/supabase-rag-extension-option-a.sql
```

**Method 3: SQL Editor (Manual)**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open file: `sql/migrations/supabase-rag-extension-option-a.sql`
4. Copy all SQL
5. Paste into SQL Editor
6. Click "Run"

---

### Step 5: Verify Migration Success ✅

Run these verification queries:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'insight_chunks' 
  AND column_name IN ('segment_markers', 'final_version_reference_id');

-- Should return 2 rows

-- Check insight_transcripts columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'insight_transcripts' 
  AND column_name IN ('indexed_final_version_id', 'indexed_at', 'indexed_by');

-- Should return 3 rows

-- Check max_transcription_versions column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'max_transcription_versions' 
  AND column_name = 'is_final';

-- Should return 1 row

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'insight_chunks' 
  AND indexname = 'idx_insight_chunks_final_version_ref';

-- Should return 1 row

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'search_insight_chunks';

-- Should return 1 row
```

---

### Step 6: Test Existing Queries Still Work ✅

```sql
-- Your existing queries should work unchanged
SELECT COUNT(*) FROM insight_chunks;
SELECT COUNT(*) FROM insight_chunks WHERE embedding IS NOT NULL;
SELECT * FROM insight_chunks LIMIT 5;
```

If these work, migration was successful! 🎉

---

## Troubleshooting

### Error: "relation already exists"
**Solution:** The columns already exist. Safe to ignore - migration uses `IF NOT EXISTS`.

### Error: "extension vector does not exist"
**Solution:** You need to enable pgvector. The migration file should do this automatically, but if not:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "permission denied"
**Solution:** You need superuser or database owner permissions. Check your Supabase role.

### Error: "connection refused"
**Solution:** Check your connection string and network access.

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Restore from backup
psql $DATABASE_URL < backup_pre_rag_20250125_120000.sql
```

Or uncomment the rollback section in the migration file and run it.

---

## Next Steps After Successful Migration

Once migration passes:

1. ✅ Mark Phase 1 complete
2. 📝 Document any issues encountered
3. 🚀 Proceed to Phase 2 (Code Updates)
4. 📊 Test with real data

---

## Do You Need Help?

Tell me:
1. **Which method** do you want to use? (CLI, SQL Editor, etc.)
2. **Do you have** Supabase access credentials?
3. **Any issues** during execution?

I'll guide you through whichever method you prefer! 🎯

