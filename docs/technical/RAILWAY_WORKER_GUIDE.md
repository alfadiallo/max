# Railway Worker Deployment Guide

**Purpose:** Deploy standalone RAG processing worker to Railway.app  
**Status:** ⏸️ **OPTIONAL - Not Currently Needed**  
**When to Implement:** See "Decision Criteria" below  
**Estimated Time:** 3-4 hours  
**Monthly Cost:** $5-10

---

## Executive Summary

Railway provides a platform to run the RAG background worker **without timeout limits**, solving the Supabase Edge Function 90-second timeout constraint. This is not currently needed but the code is ready for deployment when required.

---

## Current vs Railway Architecture

### Current Setup (Supabase Edge Function)

**Pros:**
- ✅ No additional cost
- ✅ Integrated with Supabase
- ✅ Simple deployment

**Cons:**
- ❌ 90-second hard timeout
- ❌ Requires resumable batch processing
- ❌ Multiple invocations for large transcripts
- ❌ Fragile (progress must be saved frequently)

### Railway Setup (Standalone Worker)

**Pros:**
- ✅ No timeout limits
- ✅ Process entire transcripts in one run
- ✅ Simpler code (no resume logic)
- ✅ Continuous logging
- ✅ Better debugging

**Cons:**
- ❌ $5-10/month cost
- ❌ Separate deployment to manage
- ❌ Additional monitoring needed

---

## Decision Criteria

### When to Deploy Railway

Deploy Railway worker if **ANY** of these conditions are met:

1. **Timeout Frequency:** Edge Function times out **>2 times per month**
2. **Transcript Length:** Processing transcripts **>2 hours** (200+ segments)
3. **Processing Time:** Average processing time **>30 minutes per transcript**
4. **User Experience:** Need ingestion turnaround **<5 minutes**
5. **Reliability Issues:** Resumable processing fails **>10% of the time**

### Current Status: Not Needed

As of November 2025:
- ✅ Transcripts are <1 hour (35-50 segments max)
- ✅ Edge Function completing with resume logic
- ✅ Processing time <10 minutes per transcript
- ✅ No critical timeout issues

**Recommendation:** Monitor and deploy Railway if conditions change.

---

## Implementation Plan

### Phase 1: Code Preparation (✅ Already Complete)

**Files Ready:**
- `workers/rag-processor.ts` - Standalone Node.js worker
- `workers/README.md` - Documentation
- `package.json` - Scripts and dependencies (`worker:rag`)

**Dependencies:**
- `tsx` - TypeScript execution
- `dotenv` - Environment variable loading
- `@supabase/supabase-js` - Database client
- `openai` - Embeddings API
- `@anthropic-ai/sdk` - Claude API

---

### Phase 2: Railway Account Setup (15 minutes)

1. **Create Account**
   - Go to https://railway.app
   - Sign up with GitHub account
   - Verify email

2. **Create Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access `alfadiallo/max` repository

3. **Configure Project**
   - Project name: `max-rag-worker`
   - Root directory: `/` (default)
   - Framework: Node.js (auto-detected)

---

### Phase 3: Environment Variables (10 minutes)

In Railway project settings, add these variables:

```bash
# Supabase Connection
SUPABASE_URL=https://sutzvbpsflwqdzcjtscr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# AI APIs
OPENAI_API_KEY=<openai_key>
ANTHROPIC_API_KEY=<anthropic_key>

# Worker Configuration
RAG_ENABLE_CLAUDE_ANALYSIS=true
RAG_SEGMENTS_PER_RUN=50
RAG_WORKER_POLL_INTERVAL=30000
RAG_EMBEDDING_CHAR_LIMIT=1200
RAG_CLAUDE_CONCURRENCY=5

# Logging
NODE_ENV=production
LOG_LEVEL=info
```

**Security Note:** These are already set in Supabase. Copy from:
```bash
supabase secrets list --project-ref sutzvbpsflwqdzcjtscr
```

---

### Phase 4: Build & Deploy Configuration (10 minutes)

**Railway.json** (optional, auto-detected by default):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm run worker:rag",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Alternative: Use Railway Dashboard**
- Build command: `npm install`
- Start command: `npm run worker:rag`
- Auto-restart: Enable

---

### Phase 5: Deploy & Verify (30 minutes)

1. **Trigger Deployment**
   - Push to `main` branch (auto-deploys)
   - Or click "Deploy" in Railway dashboard

2. **Monitor Logs**
   ```
   Railway Dashboard → Project → Deployments → View Logs
   ```
   
   Expected logs:
   ```
   [RAG Worker] Starting polling...
   [RAG Worker] Poll interval: 30s
   [RAG Worker] Checking for queued jobs...
   [RAG Worker] No jobs found, waiting...
   ```

3. **Test with Upload**
   - Go to `/admin/rag` on website
   - Upload test transcript
   - Watch Railway logs process it
   - Verify completion in database

4. **Verify Results**
   ```sql
   SELECT 
     id, 
     status, 
     processed_at, 
     result_summary
   FROM rag_ingestion_queue
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

### Phase 6: Disable Supabase Edge Function (15 minutes)

Once Railway worker is stable:

1. **Stop Edge Function Cron**
   ```bash
   # Remove scheduled invocations
   supabase functions delete process_rag_queue --project-ref sutzvbpsflwqdzcjtscr
   ```

2. **Keep Edge Function Code**
   - Don't delete the code
   - Useful for local testing
   - Can re-enable if Railway fails

3. **Update Admin UI** (optional)
   - Update status messages to reference Railway
   - Add Railway logs link

---

## Monitoring & Maintenance

### Health Checks

**Daily:**
- Check Railway dashboard for crashes
- Verify logs show polling activity
- Confirm jobs completing successfully

**Weekly:**
- Review resource usage (RAM, CPU)
- Check processing times trending
- Verify no stalled jobs in queue

**Monthly:**
- Review Railway bill (~$5-10)
- Analyze job completion rates
- Optimize polling interval if needed

### Alerts Setup

**Railway Dashboard:**
1. Go to Project Settings → Notifications
2. Enable alerts for:
   - Deployment failures
   - Crash loops (>3 restarts)
   - Resource usage >80%

**Supabase:**
```sql
-- Create view for stalled jobs
CREATE VIEW stalled_rag_jobs AS
SELECT *
FROM rag_ingestion_queue
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '30 minutes';
```

Set up daily email if `stalled_rag_jobs` has rows.

---

## Cost Analysis

### Railway Pricing

**Starter Plan:** $5/month
- 512 MB RAM
- 1 vCPU (shared)
- 5 GB storage
- **Sufficient for current needs**

**Developer Plan:** $10/month
- 8 GB RAM
- 8 vCPU (shared)
- 100 GB storage
- **Overkill unless processing 10+ hours/day**

### Cost Comparison

**Current (Supabase Edge Function):**
- $0/month additional cost
- But: Limited by timeouts
- But: Multiple invocations = more API calls

**Railway:**
- $5-10/month
- But: One-run processing = fewer API calls
- But: Faster = better UX

**Break-Even Analysis:**
- If timeout issues cause >1 hour/month debugging: Railway pays for itself
- If faster processing enables more users: ROI positive

---

## Troubleshooting

### Worker Not Starting

**Check:**
1. Railway logs for errors
2. Environment variables set correctly
3. Build completed successfully
4. Start command correct: `npm run worker:rag`

**Fix:**
```bash
# Test locally first
npm run worker:rag

# If works locally but not Railway:
# - Check Railway Node.js version matches local
# - Verify all dependencies in package.json
# - Check Railway build logs for errors
```

### Worker Crashing

**Common Causes:**
1. Out of memory (upgrade to Developer plan)
2. API rate limits (add retry logic)
3. Database connection issues (check Supabase)

**Fix:**
- Review Railway logs for stack traces
- Add more try/catch blocks
- Reduce `RAG_SEGMENTS_PER_RUN` to conserve memory

### Jobs Stuck in Queue

**Check:**
1. Worker polling correctly?
2. Database connection working?
3. Job status = 'queued' (not 'processing')?

**Fix:**
```sql
-- Reset stuck jobs
UPDATE rag_ingestion_queue
SET status = 'queued', 
    updated_at = NOW()
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '1 hour';
```

---

## Rollback Plan

If Railway worker fails:

1. **Immediate: Re-enable Supabase Edge Function**
   ```bash
   supabase functions deploy process_rag_queue
   ```

2. **Stop Railway Worker**
   - Go to Railway dashboard
   - Pause deployment
   - Don't delete project (preserve config)

3. **Verify Fallback**
   - Upload test transcript
   - Confirm Edge Function processes it
   - Monitor for timeout issues

4. **Debug Railway Issues**
   - Review logs offline
   - Fix issues locally
   - Re-deploy when ready

---

## Performance Expectations

### Processing Speed (Railway)

**Small Transcript (50 segments):**
- Edge Function: ~10 minutes (2 runs with resume)
- Railway: ~2 minutes (1 continuous run)
- **Improvement:** 5x faster

**Large Transcript (500 segments):**
- Edge Function: ~100 minutes (20 runs with resume) 😱
- Railway: ~15 minutes (1 continuous run)
- **Improvement:** 6-7x faster

### Resource Usage

**RAM:** ~200-300 MB (Starter plan sufficient)  
**CPU:** <10% average, spikes to 50% during processing  
**Network:** ~100 MB/hour (API calls)  
**Storage:** <1 GB

---

## Code Reference

### Worker Entry Point

**File:** `workers/rag-processor.ts`

**Key Functions:**
- `pollQueue()` - Checks for queued jobs every 30s
- `processJob()` - Main processing logic
- `generateEmbeddings()` - OpenAI API calls
- `analyzeWithClaude()` - Claude API calls
- `updateProgress()` - Database updates

**Logging:**
```typescript
console.log('[RAG Worker] Starting polling...')
console.log('[RAG Worker] Processing job:', jobId)
console.log('[RAG Worker] Completed:', stats)
```

### Environment Variables

**Used by Worker:**
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access
- `OPENAI_API_KEY` - Embeddings
- `ANTHROPIC_API_KEY` - Claude analysis
- `RAG_ENABLE_CLAUDE_ANALYSIS` - Enable/disable Claude
- `RAG_SEGMENTS_PER_RUN` - Batch size (50 recommended)
- `RAG_WORKER_POLL_INTERVAL` - Polling frequency (30000ms = 30s)

---

## Deployment Checklist

Before deploying Railway worker:

- [ ] Test worker locally: `npm run worker:rag`
- [ ] Verify all environment variables set in Railway
- [ ] Confirm Supabase connection working
- [ ] Test with sample transcript upload
- [ ] Monitor Railway logs during first run
- [ ] Verify completion in database
- [ ] Check processing time vs Edge Function
- [ ] Set up health check alerts
- [ ] Document Railway login credentials
- [ ] Add Railway to team password manager
- [ ] Update admin dashboard (optional)
- [ ] Disable Edge Function cron (after confirmation)
- [ ] Test rollback to Edge Function
- [ ] Document any issues in this file

---

## Future Enhancements

### Potential Improvements

1. **Parallel Processing**
   - Process multiple jobs simultaneously
   - Requires more RAM (Developer plan)

2. **Smart Polling**
   - Use Supabase Realtime to trigger immediately
   - Reduce polling interval idle time

3. **Progress WebSockets**
   - Stream progress to admin dashboard
   - Show real-time processing status

4. **Auto-Scaling**
   - Spin up multiple workers during high load
   - Railway supports horizontal scaling

5. **Metrics Dashboard**
   - Track processing times over time
   - Identify bottlenecks
   - Optimize batch sizes

---

## Additional Resources

**Railway Documentation:**
- Deployment: https://docs.railway.app/deploy/deployments
- Environment Variables: https://docs.railway.app/develop/variables
- Monitoring: https://docs.railway.app/monitor/logs

**Worker Code:**
- Main script: `/workers/rag-processor.ts`
- Documentation: `/workers/README.md`
- Package config: `/package.json` (see `worker:rag` script)

**Support:**
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

**Document Owner:** Alfa Diallo  
**Last Updated:** November 11, 2025  
**Status:** Ready for deployment when needed  
**Next Review:** When timeout issues occur or transcript length increases

