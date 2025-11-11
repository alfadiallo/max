# RAG Background Worker

A long-running background worker that processes RAG ingestion jobs without timeout constraints.

## Why This Exists

Supabase Edge Functions have a hard 120-second timeout, which is insufficient for processing large transcripts with many segments. This standalone worker runs independently and can process jobs of any size.

## Architecture

```
User uploads → Next.js API → Supabase DB (rag_ingestion_queue)
                                    ↓
                            Background Worker (polls queue)
                                    ↓
                            Processes embeddings + Claude analysis
                                    ↓
                            Updates status → Complete
```

## Local Development

### Prerequisites

- Node.js 18+ installed
- `.env.local` file with required environment variables

### Required Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (required for embeddings)
OPENAI_API_KEY=sk-...

# Anthropic (optional, for Claude analysis)
ANTHROPIC_API_KEY=sk-ant-...
RAG_ENABLE_CLAUDE_ANALYSIS=false

# Worker Configuration (optional)
RAG_POLL_INTERVAL_MS=10000  # Poll every 10 seconds
RAG_EMBEDDING_CHAR_LIMIT=1200
RAG_EMBEDDING_BATCH=16
RAG_CLAUDE_CONCURRENCY=3
```

### Running Locally

```bash
# Start the worker
npm run worker:rag

# You should see:
# 🚀 RAG Background Worker starting...
# ✅ Worker ready. Polling for jobs...
```

The worker will:
1. Poll the `rag_ingestion_queue` table every 10 seconds
2. Pick up jobs with `status='queued'`
3. Process the entire transcript without timeout constraints
4. Update progress in real-time
5. Mark jobs as `complete` when done

### Testing

1. Upload a transcript via the UI
2. Watch the worker logs - you'll see:
   ```
   📦 Processing job abc-123
     📄 Version: H-1
     📊 Segments: 52
     🔄 Processing segment 1/52 (seq: 1)
       ✅ Segment 1 embedded (1 chunks)
     🔄 Processing segment 2/52 (seq: 2)
       ✅ Segment 2 embedded (1 chunks)
     ...
   ✅ Job abc-123 completed in 45.2s
   ```

3. Check the dashboard - job should show `status='complete'`

## Production Deployment

### Option 1: Railway (Recommended)

Railway offers a generous free tier and is perfect for long-running workers.

1. **Create a Railway account**: https://railway.app

2. **Create a new project**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Initialize project
   railway init
   ```

3. **Add environment variables** in Railway dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY` (optional)
   - `RAG_ENABLE_CLAUDE_ANALYSIS=false`

4. **Create `railway.json`**:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run worker:rag",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

### Option 2: Render

1. Go to https://render.com
2. Create a new "Background Worker"
3. Connect your GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm run worker:rag`
6. Add environment variables
7. Deploy

### Option 3: Fly.io

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Create `fly.toml`:
   ```toml
   app = "max-rag-worker"
   
   [build]
     builder = "heroku/buildpacks:20"
   
   [[services]]
     internal_port = 8080
     protocol = "tcp"
   
   [env]
     NODE_ENV = "production"
   ```

3. Deploy:
   ```bash
   fly launch
   fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=...
   fly deploy
   ```

### Option 4: Your Own Server

If you have a VPS or server:

```bash
# SSH into your server
ssh user@your-server.com

# Clone the repo
git clone https://github.com/your-username/max.git
cd max

# Install dependencies
npm install

# Create .env.local with your environment variables
nano .env.local

# Install PM2 for process management
npm install -g pm2

# Start the worker
pm2 start npm --name "rag-worker" -- run worker:rag

# Make it start on boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs rag-worker
```

## Monitoring

### Health Checks

The worker doesn't expose an HTTP endpoint by default. To add health checks:

1. Add express to dependencies
2. Add a simple HTTP server that responds to `/health`
3. Configure your deployment platform to ping `/health`

### Logs

- **Local**: Logs print to console
- **Railway/Render**: View logs in their dashboard
- **PM2**: `pm2 logs rag-worker`

### Alerts

Consider adding Slack/Discord webhooks for:
- Job failures
- Worker crashes
- Long-running jobs (> 5 minutes)

## Scaling

### Horizontal Scaling

To process multiple jobs in parallel:

1. Deploy multiple worker instances
2. Add a `worker_id` field to track which worker is processing
3. Use database locks to prevent race conditions:
   ```sql
   UPDATE rag_ingestion_queue
   SET status = 'processing', worker_id = 'worker-1'
   WHERE id = (
     SELECT id FROM rag_ingestion_queue
     WHERE status = 'queued'
     ORDER BY submitted_at
     LIMIT 1
     FOR UPDATE SKIP LOCKED
   )
   RETURNING *;
   ```

### Vertical Scaling

For very large transcripts (1000+ segments):
- Increase memory allocation in your deployment platform
- Adjust `RAG_EMBEDDING_BATCH` to process more chunks per API call
- Enable `RAG_ENABLE_CLAUDE_ANALYSIS=false` to focus on embeddings only

## Troubleshooting

### Worker not picking up jobs

1. Check database connection:
   ```bash
   # Test Supabase connection
   curl https://your-project.supabase.co/rest/v1/rag_ingestion_queue \
     -H "apikey: your-service-role-key"
   ```

2. Check job status:
   ```sql
   SELECT id, status, submitted_at, error_detail
   FROM rag_ingestion_queue
   ORDER BY submitted_at DESC
   LIMIT 10;
   ```

3. Verify environment variables are set correctly

### Jobs stuck in "processing"

1. Check worker logs for errors
2. Restart the worker
3. Manually reset stuck jobs:
   ```sql
   UPDATE rag_ingestion_queue
   SET status = 'queued'
   WHERE status = 'processing'
   AND updated_at < NOW() - INTERVAL '10 minutes';
   ```

### OpenAI API errors

- Check API key is valid
- Verify you have credits
- Check rate limits: https://platform.openai.com/account/limits

## Cost Estimates

For a 1-hour transcript (~50 segments):
- **OpenAI embeddings**: ~$0.01 (text-embedding-3-small)
- **Claude analysis** (if enabled): ~$0.50-1.00 (claude-3-sonnet)
- **Hosting**: Free (Railway/Render free tier)

**Total**: ~$0.01-1.00 per hour of content

## Future Improvements

- [ ] Add Claude analysis support
- [ ] Add health check endpoint
- [ ] Add Slack/Discord notifications
- [ ] Add job retry logic with exponential backoff
- [ ] Add metrics (jobs processed, avg duration, etc.)
- [ ] Add support for processing multiple jobs in parallel
- [ ] Add graceful shutdown handling

