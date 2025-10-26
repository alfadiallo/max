# Max Technical Specifications

Technical requirements, constraints, and detailed specifications for the Max platform.

---

## System Requirements

### Development Environment

```
Node.js:     18.17.0 or higher
npm:         9.0 or higher (or yarn 3+)
Git:         2.30+
Database:    PostgreSQL 14+ (via Supabase)
Storage:     S3-compatible (via Supabase)
RAM:         4GB minimum (8GB recommended)
Disk:        20GB available (audio files can be large)
```

### Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |
| IE 11 | | ❌ Not Supported |

### Third-Party Services

```
OpenAI Whisper
  - API key required
  - Rate: 3 requests/min (free tier)
  - Cost: $0.006 per minute of audio
  - Max file: 25MB

Anthropic Claude
  - API key required
  - Rate: 50k tokens/day limit
  - Cost: $0.003 per 1K tokens (input), $0.015 per 1K tokens (output)
  - Model: claude-3-sonnet (recommended for balance of cost/quality)

Supabase
  - Free tier: 500MB storage, 1GB database
  - Paid tier: $25/month (sufficient for 5 users)
  - Authentication: Built-in Supabase Auth
  - Storage: S3-compatible buckets
  - Database: PostgreSQL 14+

ElevenLabs (Future)
  - Free tier: 1000 characters/month
  - Paid tier: $5+/month
  - Models: Multi-lingual voices
  - Voice cloning: Custom voices ($10+ per month)

GoDaddy Domain
  - Cost: ~$12/year for .io domain
  - DNS management: Simple CNAME to Vercel

Vercel Hosting
  - Free tier: 100GB bandwidth/month
  - Pro tier: $20/month (recommended for production)
  - Serverless functions: Included
  - CDN: Global
```

---

## Software Architecture

### Frontend Stack

```
Framework:       Next.js 13+ (React framework)
UI Library:      React 18+
Styling:         Tailwind CSS 3+
Type System:     TypeScript 5+
Form Handling:   React Hook Form (recommended)
State:           React Context + Hooks
API Client:      Fetch API + custom hooks
Real-time:       Supabase Realtime (optional)
```

### Backend Stack

```
Runtime:         Node.js (via Vercel Serverless)
Framework:       Next.js API Routes
Database ORM:    Supabase SDK (or use raw SQL)
Authentication:  Supabase Auth
File Storage:    Supabase Storage SDK
External APIs:   
  - OpenAI SDK (whisper-1 model)
  - Anthropic SDK (claude-3-sonnet)
  - ElevenLabs SDK
Validation:      Zod or Joi
Logging:         Console (or Winston/Pino)
Error Tracking:  Sentry (optional)
```

### Database

```
Provider:        Supabase (PostgreSQL 14+)
Tables:          13 core tables
Max Connections: 20 (free tier) / 100 (paid tier)
Backups:         Daily (7-day retention)
Encryption:      At-rest encryption included
Row-Level Security: Supported
Realtime:        Websocket support available
```

### Storage

```
Provider:        Supabase Storage (S3-compatible)
Max File Size:   500MB per file
Bucket 1:        max-audio (public read, auth write)
Bucket 2:        max-transcripts (public read)
CDN:             Integrated with Vercel
Retention:       No auto-cleanup (manual delete)
```

---

## Performance Specifications

### Load Times

```
Page Load:
  Time to First Byte (TTFB):  < 200ms
  First Contentful Paint:     < 1.5s
  Largest Contentful Paint:   < 2.5s

API Response Times:
  Auth endpoints:             < 1000ms
  Project CRUD:               < 500ms
  Transcription start:        < 1000ms
  List operations:            < 500ms (paginated)

Large Operations:
  Whisper transcription:      1-5min (depends on audio length)
  Claude translation:         20-60s
  Summary generation:         15-30s per summary
  Dictionary apply:           < 500ms
```

### Database Performance

```
Query Latency:
  Simple SELECT (indexed):    < 50ms
  Complex JOIN:               < 100ms
  Full-text search:           < 200ms (if implemented)

Connection Pool:
  Max connections:            20 (free) / 100 (paid)
  Connection timeout:         30 seconds
  Query timeout:              30 seconds

Indexes:
  24 indexes created
  All foreign keys indexed
  Composite indexes on frequent queries
```

### Concurrent Users

```
Simultaneous Users:    5 (target)
Max Concurrent:        20 (before scaling needed)
API Rate Limits:       100 req/min per user
Upload Concurrency:    10 max
Transcription Queue:   5 max (Whisper API limit)
Translation Queue:     10 max (Claude limit)
```

---

## Data Specifications

### Audio Files

```
Supported Formats:  MP3, WAV, M4A, FLAC, OGG
Max File Size:      500MB
Max Duration:       2 hours (Whisper limit)
Sample Rate:        Any (Whisper handles resampling)
Channels:           Mono, Stereo, Multi-channel
Encoding:           Any lossless or lossy codec
```

### Transcriptions

```
Max Text Length:     1,000,000 characters (limited by database)
Timestamp Precision: 0.1 seconds (100ms)
Languages:          English only (initial transcription)
Speaker Support:    One speaker (Dr. Soto) - hardcoded
Segments:           Typically 5-30 seconds per segment
```

### Translations

```
Supported Languages: 8
  - Spanish (es)
  - Portuguese (pt)
  - French (fr)
  - German (de)
  - Italian (it)
  - Mandarin Chinese (zh)
  - Hindi (hi)
  - Arabic (ar)
Timestamp Sync:      Preserved from English transcription
Max Translations:    1 per language per English transcription
Dictionary Coverage: Used for all translation languages
```

### Generated Content

```
Summary Types:       3
  - Email (2-3 sentences, ~150 words)
  - LinkedIn (150 characters max)
  - Blog (300-500 words)

Max Summaries:       3 per transcription
Versions:            Unlimited (each edit creates new version)
Finalized Logs:      Every edit creates feedback entry
Template Versions:   Unlimited (full history kept)
```

### Dictionary

```
Max Terms:           10,000 (practical limit)
Term Length:         255 characters max
Languages:           8
Usage Tracking:      Incremented each time applied
Correction Match:    Case-insensitive, word boundary
Priority:            Longest term first (prevent partial match)
```

---

## API Specifications

### Rate Limiting

```
Global Rate Limit:           100 requests/minute per user
Authentication Rate Limit:   10 requests/minute (login/register)
Upload Rate Limit:           10 concurrent uploads
Transcription Queue:         5 parallel transcriptions
Translation Rate Limit:      10 per day per language
Download Rate Limit:         100 MB/minute
```

### Response Format

```
Success (200-201):
{
  "success": true,
  "data": { ... }
}

Error (4xx-5xx):
{
  "success": false,
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "details": { ... }
}

Pagination (GET with multiple results):
{
  "success": true,
  "data": [ ... ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### Error Codes

```
Authentication:
  401 UNAUTHORIZED          - No token or invalid token
  401 TOKEN_EXPIRED         - Token needs refresh
  403 FORBIDDEN             - Insufficient permissions

Validation:
  400 VALIDATION_ERROR      - Invalid request body
  400 MISSING_REQUIRED      - Missing required field
  400 INVALID_FORMAT        - Wrong data type

Resources:
  404 NOT_FOUND             - Resource doesn't exist
  409 ALREADY_EXISTS        - Duplicate resource
  409 CONFLICT              - Can't perform action

Server:
  500 SERVER_ERROR          - Unexpected error
  503 SERVICE_UNAVAILABLE   - Third-party service down
  504 TIMEOUT               - Operation took too long
```

---

## Security Specifications

### Authentication

```
Method:              Email + Password
Password Rules:      Minimum 8 characters
Password Hash:       Supabase (bcrypt)
Session Duration:    1 hour (JWT expiry)
Refresh Token:       7 days
MFA:                 Optional (future)
HTTPS:               Required (all traffic)
```

### Authorization

```
Access Control:      Role-based (future)
Current Model:       All users = all permissions
File Access:         By owner or shared project
API Keys:            No API key authentication yet
Audit Trail:         All edits logged with user_id
```

### Data Protection

```
Encryption at Rest:  Yes (Supabase handled)
Encryption in Transit: HTTPS 1.3
SSL Certificate:     Let's Encrypt (via Vercel)
API Keys in Code:    Never (.env.local git-ignored)
Database Backups:    Daily (7-day retention)
Personal Data:       Email stored (necessary for login)
```

### Compliance

```
GDPR:                Data deletion on account delete
CCPA:                Supported (Supabase)
Jurisdiction:        US (Supabase hosting)
Third-party SDKs:    OpenAI, Anthropic have their own policies
```

---

## Scalability

### Current Capacity (5 users)

```
Storage:             55GB (50GB audio + 5GB transcripts)
Database:            ~100,000 rows
API Calls/Month:     ~10,000
Bandwidth:           ~50GB/month
Cost:                ~$50/month (Supabase + API calls)
```

### Growth Scenarios

**10 users:**
- Storage: 110GB
- Database: 200k rows
- Cost: ~$75/month

**50 users:**
- Storage: 550GB → Upgrade storage tier
- Database: 1M rows → Add indexes, partition tables
- Cost: ~$200/month
- Solution: Implement caching (Redis), queue jobs (Bull)

**100+ users:**
- Full scaling required
- Elasticsearch for search
- CDN optimization
- Database sharding
- Cost: $500+/month

### Optimization Opportunities

```
Current:
  - Single database instance
  - No caching layer
  - Synchronous processing

Optimized:
  - Redis cache for frequently accessed data
  - Bull queue for transcription jobs
  - Horizontal scaling with replicas
  - Read replicas for analytics
```

---

## Deployment Specifications

### Environments

```
Development:
  URL: http://localhost:3000
  Database: Supabase Dev Project
  API Keys: Local .env.local
  Backups: None

Staging:
  URL: staging.usemax.io (optional)
  Database: Staging project
  API Keys: Staging keys
  Backups: Daily

Production:
  URL: https://usemax.io
  Database: Supabase Prod Project
  API Keys: Encrypted in Vercel
  Backups: Daily (7 day retention)
```

### Deployment Process

```
Trigger: git push origin main

Pipeline:
1. GitHub Actions (if configured)
   - Run tests
   - Run linter
   - Check types
2. Vercel
   - npm install
   - npm run build
   - Deploy to CDN
   - Propagate DNS
3. Users
   - Access new version via https://usemax.io
   - ~30 seconds total deployment time
```

### Rollback

```
Automated: Vercel keeps last 5 deployments
Manual: Click "Rollback" in Vercel Dashboard
Database: Keep backups (7 days)
Warning: Breaking DB changes require migration strategy
```

---

## Monitoring & Observability

### Metrics to Track

```
Frontend:
  - Page load times (TTFB, FCP, LCP)
  - JavaScript error rate
  - API error rate
  - User interactions

Backend:
  - API response times
  - Error rate (4xx, 5xx)
  - Database query times
  - External API latency

Infrastructure:
  - Bandwidth usage
  - Storage usage
  - Database connections
  - CPU/Memory (Vercel limited)
```

### Logging

```
Frontend: Browser console
Backend: Console logs with prefixes
  [API] /api/endpoint
  [DB] SELECT query
  [ERROR] Error message
  [WARN] Warning message
Aggregation: Sentry (optional)
Retention: 30 days (local), 90 days (Sentry)
```

### Alerts (Optional)

```
Configure in Vercel:
- High error rate (> 5% for 5 min)
- High response time (> 2s avg)
- Build failure
- Out of memory

Configure in Supabase:
- High database connections
- Slow queries
- Storage near limit
```

---

## Testing Specifications

### Unit Tests (Optional for MVP)

```
Coverage Target:     80% (lib functions)
Framework:          Jest + React Testing Library
Files:              /tests/lib/*, /tests/components/*
Run:                npm run test
CI/CD:              Optional (not required for MVP)
```

### Integration Tests (Optional)

```
Coverage Target:     50% (key workflows)
Scope:
  - Auth flow
  - Transcription creation
  - Translation creation
  - Summary generation
Database:           Test database clone
Cleanup:            Between each test
```

### Manual Testing Checklist

```
Authentication:
  ☐ Register new user
  ☐ Login with email/password
  ☐ Logout
  ☐ Try invalid credentials

Projects:
  ☐ Create project
  ☐ Edit project metadata
  ☐ List projects
  ☐ Delete project

Audio Upload:
  ☐ Upload MP3 file
  ☐ Upload WAV file
  ☐ Show upload progress
  ☐ Cancel upload

Transcription:
  ☐ Transcribe audio
  ☐ Display with timestamps
  ☐ Edit transcription
  ☐ Auto-save draft
  ☐ Save as H-1 version
  ☐ View version history
  ☐ Revert to previous

Translation:
  ☐ Create Spanish translation
  ☐ Apply dictionary
  ☐ Edit translation
  ☐ Show dictionary corrections

Summaries:
  ☐ Generate 3 summaries
  ☐ Edit summaries
  ☐ Finalize + log feedback

Dictionary:
  ☐ Add term to dictionary
  ☐ Search dictionary
  ☐ View usage count
  ☐ Export dictionary

Prompts:
  ☐ View prompt templates
  ☐ Edit prompt
  ☐ See version history
  ☐ Revert to previous

Error Handling:
  ☐ Test with no network
  ☐ Test with invalid file
  ☐ Test with 504 timeout
  ☐ Verify error messages
```

---

## Maintenance

### Regular Tasks

```
Daily:
  - Monitor error rates
  - Check Supabase logs
  - Monitor costs

Weekly:
  - Review database growth
  - Check backup integrity
  - Update dependencies (optional)

Monthly:
  - Review usage metrics
  - Plan new features
  - Update documentation

Quarterly:
  - Security audit
  - Performance optimization
  - Database maintenance
```

### Dependency Updates

```
Next.js:             Test before updating major versions
React:               Follow semantic versioning
Tailwind:            Update with Next.js
TypeScript:          Update monthly
Supabase SDK:        Check changelog before updating
```

### Database Maintenance

```
Backups:             Automatic daily (Supabase)
Restoration Test:    Monthly (restore to test database)
Index Optimization:  Quarterly (if needed)
Vacuum/Analyze:      Automatic (Supabase)
```

---

## Cost Estimation

### Monthly Recurring Cost (5 Users)

```
Supabase:
  Database:          $25/month (1GB, includes storage)
  Authentication:    Free (included)
  Storage:           Free (included)
  Subtotal:          $25/month

OpenAI Whisper API:
  Estimate:          $50/month (average 500 min audio)
  
Anthropic Claude API:
  Estimate:          $30/month (2000 translations + summaries)
  
Domain (GoDaddy):    $1/month
  
Vercel:
  Free tier:         $0/month (sufficient for 5 users)
  
Total:               ~$106/month

Annual:              ~$1,272/year
Per User:            ~$21/month
```

### Cost Optimization

```
Reduce Whisper:      Use smaller audio files, cache results
Reduce Claude:       Implement prompt optimization, reuse
Reduce Vercel:       Free tier is fine (100GB BW/month)
Reduce Supabase:     Free tier (500MB) → $25/month tier
```

---

## Disaster Recovery

### Backup Strategy

```
Type:       Full database backups (Supabase)
Frequency:  Daily
Retention:  7 days
Location:   Supabase-managed (geo-redundant)
Recovery:   1-click restore in Supabase Dashboard
RTO:        30 minutes
RPO:        24 hours
```

### Recovery Procedures

**Database Corruption:**
1. Verify issue in Supabase Dashboard
2. Restore from yesterday's backup
3. Verify data integrity
4. Notify users of data loss
5. Document incident

**Storage Bucket Loss:**
1. Original audio files can be re-uploaded
2. Transcripts regenerated from audio
3. User data still in database

**Complete System Failure:**
1. Failover Vercel deployment
2. Restore database from backup
3. Point domain to failover instance
4. Verify all systems operational

---

## Compliance & Legal

### Data Retention

```
User Account:        Kept until deleted
Audio Files:         Indefinite (user can delete)
Transcriptions:      Indefinite (user can delete)
Translations:        Indefinite (user can delete)
Summaries:           Indefinite (user can delete)
Logs:                30 days (audit)
Backups:             7 days (automatic)
```

### Account Deletion

```
Request Method:      Settings > Delete Account
Process:
  1. Delete from auth
  2. Delete user_profiles record
  3. Soft-delete projects
  4. Soft-delete audio files
  5. Soft-delete transcriptions
  6. Final deletion after 30 days
Data Recovery:       Not possible after 30 days
Notification:        Send email confirmation
```

---

## Success Criteria

### MVP Success Metrics

```
Feature Completeness:
  ☐ Audio upload working
  ☐ Whisper transcription working
  ☐ Transcription editing with versions
  ☐ Dictionary system functional
  ☐ Claude translation working
  ☐ Summary generation working
  ☐ Prompt template editing
  ☐ Deployment to Vercel

Performance:
  ☐ Page load < 2.5s
  ☐ API response < 1s (except Whisper)
  ☐ 5 concurrent users supported

Stability:
  ☐ 99% uptime over 2 weeks
  ☐ No data loss incidents
  ☐ Error rate < 1%

User Experience:
  ☐ No UI crashes
  ☐ Clear error messages
  ☐ Intuitive workflows
  ☐ Team tested and approved
```

---

## Next Phase Considerations

### Post-MVP Enhancements

```
Phase 2:
  - Multi-speaker support
  - Language-specific dictionary per user
  - ElevenLabs voice synthesis integration
  - Advanced analytics/dashboard
  - Team collaboration (shared projects)

Phase 3:
  - Multiple languages for original recording
  - Automatic subtitle generation
  - Video annotation support
  - API for third-party integrations
  - Mobile app (iOS/Android)

Phase 4:
  - Enterprise features
  - Custom branding
  - White-label deployment
  - HIPAA/SOC 2 compliance
```

---