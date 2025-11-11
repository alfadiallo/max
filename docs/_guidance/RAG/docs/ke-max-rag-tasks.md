# Max RAG - Tasks & Implementation Guide

**Project:** Max RAG Knowledge Platform  
**Domain:** www.max.keyelements.co  
**Document Type:** Actionable Task Breakdown  
**Last Updated:** 2025-11-11

---

## ✅ MAJOR MILESTONE ACHIEVED

**RAG SEARCH IS NOW OPERATIONAL!** 🎉

- ✅ User-facing search returning relevant results
- ✅ 115 content segments indexed and searchable
- ✅ Vector similarity working with optimized threshold
- ✅ Claude synthesis generating answers from search results
- ✅ Query logging capturing user searches for analytics

**See:** `docs/RAG_SEARCH_IMPLEMENTATION_COMPLETE.md` for full details.

---

## Overview

This document breaks down the Max RAG project into concrete, actionable tasks organized by development phase. Each task includes:
- **Description:** What needs to be done
- **Dependencies:** What must be completed first
- **Estimated Effort:** Time estimate in hours or days
- **Acceptance Criteria:** How to know it's done
- **Owner:** Who is responsible

---

## Phase 0: Foundation & Setup (Weeks 1-2)

### Task 0.1: Project Initialization

**ID:** TASK-0.1  
**Description:** Create GitHub repository and set up project structure  
**Owner:** Developer  
**Effort:** 2 hours  
**Dependencies:** None

**Steps:**
1. Create GitHub repository: `elevate-knowledge-platform`
2. Initialize with `.gitignore` (Node.js, Next.js)
3. Add README.md with project overview
4. Set up branch protection rules:
   - `main` requires PR approval
   - Require status checks to pass
5. Create initial branches: `develop`, `staging`
6. Add project documentation files: PRD.md, PLANNING.md, TASKS.md, AI_GUIDANCE.md

**Acceptance Criteria:**
- [ ] Repository created and accessible
- [ ] Branch protection configured
- [ ] Documentation files committed
- [ ] Team members have access

---

### Task 0.2: Supabase Project Setup

**ID:** TASK-0.2  
**Description:** Create and configure Supabase project for database, auth, and storage  
**Owner:** Developer  
**Effort:** 3 hours  
**Dependencies:** None

**Steps:**
1. Create Supabase project: `elevate-production`
2. Create Supabase project: `elevate-staging`
3. Note project URLs and API keys
4. Enable pgvector extension in SQL editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. Configure authentication:
   - Enable email provider
   - Set up email templates (confirmation, password reset)
   - Configure redirect URLs
6. Set up environment-specific configurations
7. Create service role keys for server-side operations

**Acceptance Criteria:**
- [ ] Both projects created (production, staging)
- [ ] pgvector extension enabled
- [ ] Email auth configured
- [ ] API keys documented securely
- [ ] Connection from local works

---

### Task 0.3: Database Schema Implementation

**ID:** TASK-0.3  
**Description:** Create all database tables, indexes, and RLS policies  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-0.2

**Steps:**
1. Create migration file: `001_initial_schema.sql`
2. Implement core tables (copy from PRD):
   - `user_profiles`
   - `user_invitations`
   - `content_sources`
   - `content_segments`
   - `segment_relevance`
   - `kg_entities`
   - `kg_relationships`
   - `segment_entities`
   - `user_queries`
   - `controlled_vocabulary`
   - `audit_logs`
3. Create all indexes (vector, lookup, full-text search)
4. Implement RLS policies for each table
5. Test RLS policies with different user roles
6. Create database helper functions (if needed)
7. Apply schema to staging environment
8. Validate schema with test data

**Acceptance Criteria:**
- [ ] All tables created successfully
- [ ] Indexes created and functional
- [ ] RLS policies prevent unauthorized access
- [ ] Migration script is idempotent (can run multiple times safely)
- [ ] Schema documentation updated

**SQL File Location:** `/database/migrations/001_initial_schema.sql`

---

### Task 0.4: Next.js Application Scaffold

**ID:** TASK-0.4  
**Description:** Create Next.js 14 application with TypeScript and Tailwind CSS  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-0.1

**Steps:**
1. Initialize Next.js with TypeScript:
   ```bash
   pnpm create next-app@latest elevate --typescript --tailwind --app --src-dir
   ```
2. Install core dependencies:
   ```bash
   pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
   pnpm add @anthropic-ai/sdk openai
   pnpm add @radix-ui/react-* (shadcn/ui components)
   pnpm add react-hook-form zod @hookform/resolvers
   pnpm add framer-motion
   ```
3. Install dev dependencies:
   ```bash
   pnpm add -D @types/node eslint prettier vitest
   ```
4. Configure TypeScript (`tsconfig.json`)
5. Configure Tailwind CSS (`tailwind.config.ts`)
6. Set up ESLint and Prettier
7. Create folder structure:
   ```
   /src
     /app
       /api
       /auth
       /search
       /admin
       layout.tsx
       page.tsx
     /components
       /ui (shadcn components)
       /shared
     /lib
       /supabase
       /ai
       /utils
     /types
     /hooks
   ```
8. Create environment variable template (`.env.example`)

**Acceptance Criteria:**
- [ ] Application runs locally (`pnpm dev`)
- [ ] No TypeScript errors
- [ ] Tailwind CSS working
- [ ] Folder structure organized
- [ ] ESLint and Prettier configured

---

### Task 0.5: Supabase Client Setup

**ID:** TASK-0.5  
**Description:** Configure Supabase client for server and browser contexts  
**Owner:** Developer  
**Effort:** 2 hours  
**Dependencies:** TASK-0.4

**Steps:**
1. Create Supabase client utilities:
   - `/lib/supabase/client.ts` (browser)
   - `/lib/supabase/server.ts` (server)
   - `/lib/supabase/middleware.ts` (auth middleware)
2. Set up environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
3. Create TypeScript types from database schema:
   ```bash
   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
   ```
4. Test connection with simple query
5. Set up auth middleware in Next.js

**Acceptance Criteria:**
- [ ] Supabase client connects successfully
- [ ] Auth middleware working
- [ ] TypeScript types generated
- [ ] No connection errors

**File Locations:**
- `/src/lib/supabase/client.ts`
- `/src/lib/supabase/server.ts`
- `/src/types/database.ts`

---

### Task 0.6: Vercel Deployment Setup

**ID:** TASK-0.6  
**Description:** Connect GitHub repo to Vercel and configure deployments  
**Owner:** Developer  
**Effort:** 2 hours  
**Dependencies:** TASK-0.4

**Steps:**
1. Create Vercel project linked to GitHub repo
2. Configure build settings:
   - Framework: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
3. Set up environments:
   - Production: `main` branch → www.max.keyelements.co
   - Staging: `staging` branch → staging.www.max.keyelements.co
4. Add environment variables to Vercel:
   - Supabase URL and keys
   - AI API keys (placeholder for now)
5. Configure domain in Vercel
6. Update GoDaddy DNS:
   - CNAME record for www.max.keyelements.co → Vercel
7. Test deployment

**Acceptance Criteria:**
- [ ] Vercel project created and linked
- [ ] Automatic deployments working
- [ ] Domain configured and SSL working
- [ ] Environment variables set
- [ ] Staging environment accessible

---

### Task 0.7: CI/CD Pipeline

**ID:** TASK-0.7  
**Description:** Set up GitHub Actions for automated testing and deployment  
**Owner:** Developer  
**Effort:** 3 hours  
**Dependencies:** TASK-0.4, TASK-0.6

**Steps:**
1. Create GitHub Actions workflow: `.github/workflows/ci.yml`
2. Configure workflow to run on PR and push:
   - Lint code (ESLint)
   - Type check (TypeScript)
   - Run tests (Vitest)
   - Build application
3. Set up test database for CI (Supabase test project or Docker)
4. Configure deployment trigger to Vercel
5. Add status badges to README

**Acceptance Criteria:**
- [ ] Workflow runs on every PR
- [ ] Linting, type checking, tests pass
- [ ] Status visible in GitHub PR
- [ ] Failed checks block merging

**File Location:** `.github/workflows/ci.yml`

---

## Phase 1: Core RAG System (Weeks 3-6)

### Task 1.1: AI Service Setup

**ID:** TASK-1.1  
**Description:** Create AI service layer for Claude and OpenAI integrations  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-0.5

**Steps:**
1. Set up API keys in environment:
   ```env
   ANTHROPIC_API_KEY=
   OPENAI_API_KEY=
   GOOGLE_AI_API_KEY=
   ```
2. Create AI service modules:
   - `/lib/ai/claude.ts` (Anthropic SDK wrapper)
   - `/lib/ai/openai.ts` (OpenAI SDK wrapper)
   - `/lib/ai/embeddings.ts` (Embedding generation)
3. Implement error handling and retry logic
4. Create model selection utility (Claude vs Gemini based on size)
5. Write unit tests for each service
6. Test with sample queries

**Acceptance Criteria:**
- [ ] Claude Sonnet 4 integration working
- [ ] OpenAI embeddings working
- [ ] Error handling robust
- [ ] Tests passing

**File Locations:**
- `/src/lib/ai/claude.ts`
- `/src/lib/ai/openai.ts`
- `/src/lib/ai/embeddings.ts`

---

### Task 1.2: Admin Upload Interface

**ID:** TASK-1.2  
**Description:** Create UI for admins to upload transcript files  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-0.5

**Steps:**
1. Create admin layout: `/app/admin/layout.tsx`
2. Create upload page: `/app/admin/upload/page.tsx`
3. Build upload form component:
   - File upload (JSON/TXT with transcript segments)
   - Metadata fields: Title, date, speaker, type, Zoom URL, duration
   - Validation with Zod schema
4. Create API route: `/app/api/admin/upload/route.ts`
5. Implement file parsing and validation
6. Store in `content_sources` table with status: `draft`
7. Return upload confirmation with source ID
8. Add error handling and user feedback

**Acceptance Criteria:**
- [ ] Admin can upload transcript file
- [ ] Metadata form validates correctly
- [ ] File parsing handles JSON and TXT formats
- [ ] Upload creates record in database
- [ ] Error messages are clear and helpful
- [ ] Only admins can access (auth check)

**File Locations:**
- `/src/app/admin/upload/page.tsx`
- `/src/app/api/admin/upload/route.ts`
- `/src/components/admin/UploadForm.tsx`

---

### Task 1.3: Entity Extraction Service

**ID:** TASK-1.3  
**Description:** Implement Claude-powered entity extraction from transcript segments  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-1.1, TASK-1.2

**Steps:**
1. Create extraction service: `/lib/ai/entity-extraction.ts`
2. Implement Claude prompt for entity extraction (copy from AI_GUIDANCE.md)
3. Parse JSON response and validate structure
4. Handle extraction confidence scoring
5. Flag low-confidence extractions for review
6. Extract entities by category:
   - Procedures, concepts, anatomy, materials, tools, key_elements_terms
7. Extract relationships between entities
8. Store entities in `kg_entities` table (create or link existing)
9. Store relationships in `kg_relationships` table
10. Link segment to entities in `segment_entities` table
11. Write unit tests with sample segments
12. Test with real transcript segments

**Acceptance Criteria:**
- [ ] Extracts entities with >80% accuracy (manual validation)
- [ ] Handles JSON parsing errors gracefully
- [ ] Confidence scoring works correctly
- [ ] Relationships extracted properly
- [ ] Database updates correctly
- [ ] Tests passing

**File Location:** `/src/lib/ai/entity-extraction.ts`

---

### Task 1.4: Relevance Scoring Service

**ID:** TASK-1.4  
**Description:** Implement Claude-powered relevance scoring per user profile  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-1.1

**Steps:**
1. Create scoring service: `/lib/ai/relevance-scoring.ts`
2. Implement Claude prompt for relevance scoring (copy from AI_GUIDANCE.md)
3. Generate scores for all profile types:
   - dentist, dental_assistant, hygienist, treatment_coordinator, align_rep
4. Parse JSON response with scores (0-100 range)
5. Classify content type and complexity
6. Extract topic tags
7. Store in `segment_relevance` table
8. Handle cases where confidence is low (<0.6)
9. Write unit tests with diverse segment types
10. Validate scores make sense (manual review)

**Acceptance Criteria:**
- [ ] Scores generated for all profiles
- [ ] Scores are reasonable (spot check)
- [ ] Content classification accurate
- [ ] Topic tags relevant
- [ ] Low-confidence segments flagged
- [ ] Tests passing

**Status (2025-11-08):** Relevance scores stubbed at 0 in `process_rag_queue`; full Claude scoring scheduled for next milestone.

**File Location:** `/src/lib/ai/relevance-scoring.ts`

---

### Task 1.5: Background Processing Job

**ID:** TASK-1.5  
**Description:** Create background job to process uploaded transcripts  
**Owner:** Developer  
**Effort:** 10 hours  
**Dependencies:** TASK-1.3, TASK-1.4

**Steps:**
1. Choose job queue system (Inngest or Supabase Edge Functions)
2. Create job definition: `process-transcript`
3. Implement processing workflow:
   a. Fetch transcript segments from `content_segments`
   b. For each segment:
      - Generate embedding (OpenAI)
      - Extract entities (Claude)
      - Score relevance (Claude)
      - Store results in database
   c. Update source status to `complete` or `error`
4. Implement batching (5 segments at a time)
5. Add retry logic for API failures
6. Create progress tracking
7. Handle rate limits
8. Add logging for debugging
9. Test with sample transcript
10. Monitor processing time

**Acceptance Criteria:**
- [x] Job processes transcript end-to-end
- [ ] Handles API failures gracefully
- [x] Progress tracked in database
- [ ] Processing completes in <5 min per 1-hour lecture
- [x] Logs are helpful for debugging
- [ ] Tests passing

**Status (2025-11-08):** `process_rag_queue` Edge Function drains `rag_ingestion_queue`, generates embeddings, writes `content_segments` + `segment_relevance`; scheduled via `pg_cron` every 2 minutes. KG + Claude extraction still TODO.

**File Location:** `/src/lib/jobs/process-transcript.ts` or Supabase Edge Function

---

### Task 1.6: Admin Processing Dashboard

**ID:** TASK-1.6  
**Description:** Create UI for admins to monitor processing status  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-1.5

**Steps:**
1. Create processing page: `/app/admin/processing/page.tsx`
2. Build status table component:
   - List all content sources
   - Show processing status (pending, processing, complete, error)
   - Display progress percentage
   - Show processing time
   - Show error messages if failed
3. Add actions:
   - Retry processing
   - View details
   - Delete draft
4. Create API route: `/app/api/admin/processing/route.ts`
5. Implement real-time updates (polling or Supabase real-time)
6. Add filtering and sorting

**Acceptance Criteria:**
- [ ] Admin can view all sources
- [ ] Status updates in real-time
- [ ] Can retry failed processing
- [ ] Error messages displayed clearly
- [ ] Only admins can access

**Status (2025-11-08):** `/admin/rag` dashboard shipped; shows queue counts, processed content, graph placeholders, and recent queries. Retry action + real-time updates scheduled for follow-up.

**File Locations:**
- `/src/app/admin/rag/page.tsx`

---

### Task 1.7: Embedding Generation

**ID:** TASK-1.7  
**Description:** Generate embeddings for all content segments  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-1.1

**Steps:**
1. Create embedding service: `/lib/ai/embeddings.ts`
2. Implement OpenAI text-embedding-3-large integration
3. Batch embedding generation (up to 100 segments at a time)
4. Store embeddings in `content_segments.embedding` column
5. Implement caching to avoid duplicate generation
6. Handle API rate limits
7. Test with sample segments
8. Verify embeddings stored correctly

**Acceptance Criteria:**
- [ ] Embeddings generated for all segments
- [ ] Batch processing efficient
- [ ] Rate limiting handled
- [ ] Embeddings stored in database
- [ ] Vector similarity search works

**File Location:** `/src/lib/ai/embeddings.ts`

---

### Task 1.8: Vector Search Implementation

**ID:** TASK-1.8  
**Description:** Implement vector similarity search using pgvector  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-1.7

**Steps:**
1. Create search service: `/lib/search/vector-search.ts`
2. Implement query embedding generation
3. Write vector similarity SQL query:
   ```sql
   SELECT *, embedding <-> $queryEmbedding AS distance
   FROM content_segments
   WHERE embedding IS NOT NULL
   ORDER BY distance
   LIMIT 50;
   ```
4. Add filters (source type, date range, etc.)
5. Return results with similarity scores
6. Optimize query performance (use HNSW index)
7. Test with sample queries
8. Benchmark performance

**Acceptance Criteria:**
- [ ] Vector search returns relevant results
- [ ] Query time <200ms for 95th percentile
- [ ] Results ranked by similarity
- [ ] Filters work correctly
- [ ] Tests passing

**File Location:** `/src/lib/search/vector-search.ts`

---

### Task 1.9: Knowledge Graph Traversal

**ID:** TASK-1.9  
**Description:** Implement graph traversal for related concept discovery  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-1.3

**Steps:**
1. Create graph service: `/lib/graph/traversal.ts`
2. Implement entity lookup by name
3. Write recursive CTE for relationship traversal:
   ```sql
   WITH RECURSIVE graph_traversal AS (
     -- Base case: starting entities
     SELECT id, canonical_name, 0 as depth
     FROM kg_entities
     WHERE id = ANY($startEntityIds)
     
     UNION ALL
     
     -- Recursive case: follow relationships
     SELECT e.id, e.canonical_name, gt.depth + 1
     FROM kg_entities e
     JOIN kg_relationships r ON e.id = r.target_entity_id
     JOIN graph_traversal gt ON r.source_entity_id = gt.id
     WHERE gt.depth < $maxDepth
       AND r.strength > $minStrength
   )
   SELECT * FROM graph_traversal;
   ```
4. Filter by relationship types
5. Return entity subgraph
6. Test with sample entities
7. Optimize query performance

**Acceptance Criteria:**
- [ ] Graph traversal finds related entities
- [ ] Respects max depth parameter
- [ ] Filters by relationship strength
- [ ] Query time <500ms
- [ ] Tests passing

**File Location:** `/src/lib/graph/traversal.ts`

---

### Task 1.10: Basic Search API

**ID:** TASK-1.10  
**Description:** Create API endpoint for basic search functionality  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-1.8, TASK-1.9

**Steps:**
1. Create API route: `/app/api/search/route.ts`
2. Implement search logic:
   a. Generate query embedding
   b. Vector similarity search (top 50)
   c. Extract entities from top results
   d. Graph traversal for related concepts
   e. Filter by user role (apply relevance threshold)
   f. Rank and return top 20 results
3. Add authentication check
4. Return results with metadata (source, timestamp, similarity)
5. Add error handling
6. Test with sample queries
7. Monitor performance

**Acceptance Criteria:**
- [ ] API returns relevant results
- [ ] Authentication enforced
- [ ] Response time <5 seconds
- [ ] Error handling works
- [ ] Tests passing

**File Location:** `/src/app/api/search/route.ts`

---

## Phase 2: Authentication & Access Control (Weeks 7-8)

### Task 2.1: Authentication Pages

**ID:** TASK-2.1  
**Description:** Create login, signup, and password reset pages  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-0.5

**Steps:**
1. Create auth pages:
   - `/app/auth/login/page.tsx`
   - `/app/auth/signup/page.tsx`
   - `/app/auth/reset-password/page.tsx`
   - `/app/auth/callback/route.ts` (OAuth callback)
2. Build login form component with validation
3. Build signup form component (invitation-based)
4. Build password reset form component
5. Implement Supabase auth methods:
   - `signInWithPassword()`
   - `signUp()`
   - `resetPasswordForEmail()`
6. Handle auth state changes
7. Redirect after successful auth
8. Add error messages
9. Style with Tailwind CSS

**Acceptance Criteria:**
- [ ] Users can log in with email/password
- [ ] Password reset flow works
- [ ] Invitation-based signup works
- [ ] Error messages clear
- [ ] Redirects work correctly
- [ ] Mobile responsive

**File Locations:**
- `/src/app/auth/login/page.tsx`
- `/src/app/auth/signup/page.tsx`
- `/src/app/auth/reset-password/page.tsx`

---

### Task 2.2: User Profile Creation

**ID:** TASK-2.2  
**Description:** Create profile completion flow for new users  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-2.1

**Steps:**
1. Create profile page: `/app/profile/setup/page.tsx`
2. Build multi-step form:
   - Step 1: Role selection (internal/external type)
   - Step 2: Organization and experience level
   - Step 3: Specializations (if applicable)
3. Validate form data with Zod
4. Create API route: `/app/api/profile/setup/route.ts`
5. Update `user_profiles` table
6. Set `profile_completed = true`
7. Redirect to main app
8. Add progress indicator

**Acceptance Criteria:**
- [ ] New users complete profile
- [ ] Form validation works
- [ ] Profile data saved correctly
- [ ] Cannot skip profile setup
- [ ] Mobile responsive

**File Locations:**
- `/src/app/profile/setup/page.tsx`
- `/src/app/api/profile/setup/route.ts`
- `/src/components/profile/SetupForm.tsx`

---

### Task 2.3: User Invitation System

**ID:** TASK-2.3  
**Description:** Create admin UI and backend for inviting users  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-2.1

**Steps:**
1. Create invite page: `/app/admin/users/invite/page.tsx`
2. Build invitation form:
   - Email address
   - Role selection
   - Organization
   - Bulk invite (CSV upload optional)
3. Create API route: `/app/api/admin/invitations/route.ts`
4. Generate secure invitation token
5. Store in `user_invitations` table
6. Send invitation email with link
7. Create email template
8. Set 7-day expiration
9. Handle invitation acceptance
10. Create user account on acceptance

**Acceptance Criteria:**
- [ ] Admin can invite users
- [ ] Invitation email sent successfully
- [ ] Invitation link works
- [ ] Token expires after 7 days
- [ ] User account created on acceptance
- [ ] Bulk invite works (if implemented)

**File Locations:**
- `/src/app/admin/users/invite/page.tsx`
- `/src/app/api/admin/invitations/route.ts`
- `/src/lib/email/invitation-template.tsx`

---

### Task 2.4: User Management Dashboard

**ID:** TASK-2.4  
**Description:** Create admin UI for viewing and managing users  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-2.3

**Steps:**
1. Create users page: `/app/admin/users/page.tsx`
2. Build user table component:
   - List all users
   - Show role, organization, status, last login
   - Filter by role, status
   - Search by name or email
   - Sort by columns
3. Add user actions:
   - View details
   - Edit role
   - Deactivate/reactivate
   - Delete (with confirmation)
4. Create API routes for user management
5. Implement pagination
6. Add audit logging for actions

**Acceptance Criteria:**
- [ ] Admin can view all users
- [ ] Filtering and search work
- [ ] User actions functional
- [ ] Pagination works
- [ ] Actions logged in audit table
- [ ] Only admins can access

**File Locations:**
- `/src/app/admin/users/page.tsx`
- `/src/components/admin/UserTable.tsx`
- `/src/app/api/admin/users/route.ts`

---

### Task 2.5: Row-Level Security Implementation

**ID:** TASK-2.5  
**Description:** Implement and test RLS policies for all tables  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-0.3, TASK-2.1

**Steps:**
1. Review RLS policies in database schema
2. Test policies with different user roles:
   - Internal user can see all content
   - Dentist sees dentist-relevant content
   - Assistant sees assistant-relevant content
   - Etc.
3. Create test suite for RLS:
   - Create test users with different roles
   - Attempt to access content
   - Verify correct filtering
4. Fix any policy gaps
5. Document RLS behavior
6. Add monitoring for RLS bypasses

**Acceptance Criteria:**
- [ ] RLS prevents unauthorized access
- [ ] Each role sees appropriate content
- [ ] Query performance not degraded
- [ ] Tests passing for all roles
- [ ] Documentation updated

**Test File:** `/tests/rls-policies.test.ts`

---

### Task 2.6: Session Management

**ID:** TASK-2.6  
**Description:** Implement secure session management  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-2.1

**Steps:**
1. Configure Supabase Auth session settings:
   - Session duration: 30 days
   - Refresh token rotation
   - Secure cookie settings
2. Implement auth middleware:
   - Check session on protected routes
   - Refresh token if expired
   - Redirect to login if unauthenticated
3. Add "Remember me" option
4. Implement "Logout from all devices"
5. Track last login time
6. Test session expiration and refresh

**Acceptance Criteria:**
- [ ] Sessions persist for 30 days
- [ ] Auto-refresh works
- [ ] Protected routes enforced
- [ ] Logout clears session
- [ ] Last login tracked

**File Location:** `/src/middleware.ts`

---

## Phase 3: Profile-Aware Search (Weeks 9-11)

### Task 3.1: Query Understanding Service

**ID:** TASK-3.1  
**Description:** Implement Claude-powered query understanding  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-1.1

**Steps:**
1. Create service: `/lib/ai/query-understanding.ts`
2. Implement Claude prompt for intent classification
3. Extract key entities from query
4. Determine implicit needs based on user role
5. Suggest search strategy (keywords, concepts to expand)
6. Return structured output (intent, entities, strategy)
7. Handle edge cases (very short queries, typos)
8. Test with diverse sample queries
9. Cache results for common queries

**Acceptance Criteria:**
- [ ] Intent classification accurate (>80%)
- [ ] Key entities extracted correctly
- [ ] Search strategy reasonable
- [ ] Edge cases handled
- [ ] Tests passing

**File Location:** `/src/lib/ai/query-understanding.ts`

---

### Task 3.2: Profile-Aware Filtering

**ID:** TASK-3.2  
**Description:** Implement relevance filtering based on user profile  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-1.10, TASK-2.5

**Steps:**
1. Create filtering service: `/lib/search/profile-filter.ts`
2. Define relevance thresholds per role:
   - Internal: 10 (see almost everything)
   - Dentist: 50
   - Dental Assistant: 60
   - Hygienist: 70
   - Treatment Coordinator: 60
   - Align Rep: 60
3. Apply threshold in search query
4. Consider experience level (lower threshold for beginners)
5. Test with different user profiles
6. Validate results match expectations
7. Add A/B testing capability (Phase 2)

**Acceptance Criteria:**
- [ ] Different roles see different results
- [ ] Thresholds filter appropriately
- [ ] Experience level considered
- [ ] Tests passing for all roles

**File Location:** `/src/lib/search/profile-filter.ts`

---

### Task 3.3: Hybrid Search Ranking

**ID:** TASK-3.3  
**Description:** Implement combined ranking algorithm (vector + graph + relevance)  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-1.8, TASK-1.9, TASK-3.2

**Steps:**
1. Create ranking service: `/lib/search/ranking.ts`
2. Implement scoring algorithm:
   - Vector similarity: 40%
   - Graph distance: 30%
   - Relevance score: 20%
   - Recency: 10%
3. Normalize scores to 0-1 range
4. Calculate weighted sum
5. Sort by final score
6. Return top 20 results
7. Test with sample queries
8. Tune weights based on feedback
9. Add configuration for weight adjustment

**Acceptance Criteria:**
- [ ] Ranking algorithm produces sensible order
- [ ] Weights configurable
- [ ] Performance acceptable (<500ms)
- [ ] Tests passing

**File Location:** `/src/lib/search/ranking.ts`

---

### Task 3.4: Response Generation Service

**ID:** TASK-3.4  
**Description:** Implement Claude-powered response generation  
**Owner:** Developer  
**Effort:** 10 hours  
**Dependencies:** TASK-3.1, TASK-3.3

**Steps:**
1. Create service: `/lib/ai/response-generation.ts`
2. Implement role-specific prompt templates:
   - Dentist format (clinical, detailed)
   - Assistant format (procedural, checklist)
   - Hygienist format (patient education)
   - Coordinator format (communication scripts)
   - Align rep format (sales-appropriate)
3. Include retrieved segments in context
4. Add related concepts from graph
5. Include video timestamps
6. Generate suggested follow-up queries
7. Format response (headers, bullets, emphasis)
8. Handle streaming response
9. Test with sample queries and profiles
10. Validate response quality

**Acceptance Criteria:**
- [ ] Responses appropriate for each role
- [ ] Video timestamps included
- [ ] Related concepts suggested
- [ ] Formatting clean and readable
- [ ] Streaming works smoothly
- [ ] Quality high (manual review)

**File Location:** `/src/lib/ai/response-generation.ts`

---

### Task 3.5: Search UI Component

**ID:** TASK-3.5  
**Description:** Build conversational search interface  
**Owner:** Developer  
**Effort:** 10 hours  
**Dependencies:** TASK-3.4

**Steps:**
1. Create search page: `/app/search/page.tsx`
2. Build search bar component:
   - Prominent placement
   - Auto-focus on load
   - Keyboard shortcuts (Cmd+K)
   - Voice input (Phase 2)
3. Build results display component:
   - Streaming response support
   - Rich formatting (markdown)
   - Video timestamp links
   - Related concepts chips
   - Source citations
   - Follow-up query suggestions
4. Add loading states (skeleton)
5. Add empty state (no results)
6. Add error handling
7. Implement feedback UI (helpful/not helpful)
8. Style with Tailwind CSS
9. Make mobile responsive
10. Test across browsers

**Acceptance Criteria:**
- [ ] Search bar prominent and usable
- [ ] Streaming response works smoothly
- [ ] Results display well-formatted
- [ ] Video links functional
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation)

**File Locations:**
- `/src/app/search/page.tsx`
- `/src/components/search/SearchBar.tsx`
- `/src/components/search/ResultsDisplay.tsx`

---

### Task 3.6: Enhanced Search API

**ID:** TASK-3.6  
**Description:** Upgrade search API with full profile-aware functionality  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-3.1, TASK-3.2, TASK-3.3, TASK-3.4

**Steps:**
1. Update API route: `/app/api/search/route.ts`
2. Implement full search pipeline:
   a. Authenticate user and load profile
   b. Query understanding (Claude)
   c. Generate query embedding
   d. Vector similarity search
   e. Graph traversal
   f. Profile-aware filtering
   g. Hybrid ranking
   h. Response generation (Claude)
   i. Log query
3. Add streaming support (Server-Sent Events)
4. Implement caching for common queries
5. Add rate limiting (100 queries/hour per user)
6. Monitor performance
7. Test end-to-end

**Acceptance Criteria:**
- [ ] Full search pipeline works
- [ ] Streaming functional
- [ ] Response time <5 seconds
- [ ] Caching improves performance
- [ ] Rate limiting works
- [ ] Tests passing

**File Location:** `/src/app/api/search/route.ts`

---

### Task 3.7: Landing Page

**ID:** TASK-3.7  
**Description:** Create main landing page with search and content discovery  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** TASK-3.5

**Steps:**
1. Create landing page: `/app/page.tsx`
2. Design layout:
   - Hero section with prominent search bar
   - Topic browse section
   - Recent lectures section
   - Personalized recommendations
3. Fetch data for recommendations based on user role
4. Create topic browse component
5. Create recent lectures component
6. Style with Tailwind CSS
7. Add animations (Framer Motion, subtle)
8. Make mobile responsive
9. Test loading performance
10. Add empty states for new users

**Acceptance Criteria:**
- [ ] Landing page loads quickly (<2 seconds)
- [ ] Search bar prominent
- [ ] Content sections populated
- [ ] Recommendations relevant to user role
- [ ] Mobile responsive
- [ ] Visually appealing

**File Locations:**
- `/src/app/page.tsx`
- `/src/components/home/TopicBrowse.tsx`
- `/src/components/home/RecentLectures.tsx`

---

## Phase 4: Query History & Analytics (Weeks 12-13)

### Task 4.1: Query Logging Implementation

**ID:** TASK-4.1  
**Description:** Implement comprehensive query logging  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-3.6

**Steps:**
1. Create logging service: `/lib/logging/query-logger.ts`
2. Log every query with full context:
   - User ID
   - Query text and embedding
   - Intent and entities (from query understanding)
   - Segments returned (IDs)
   - Response time
   - Timestamp
3. Track user interactions:
   - Segments clicked
   - Time to first click
   - Session duration
4. Implement asynchronously (don't block response)
5. Handle logging failures gracefully
6. Test logging works

**Acceptance Criteria:**
- [ ] All queries logged successfully
- [ ] Logging doesn't impact response time
- [ ] Data complete and accurate
- [ ] No logging errors

**File Location:** `/src/lib/logging/query-logger.ts`

---

### Task 4.2: Feedback Capture

**ID:** TASK-4.2  
**Description:** Implement user feedback on search results  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-3.5

**Steps:**
1. Add feedback UI to results display:
   - "Was this helpful?" buttons
   - Optional comment field
2. Create API route: `/app/api/feedback/route.ts`
3. Store feedback in `user_queries` table
4. Show thank you message after feedback
5. Prevent duplicate feedback on same query
6. Test feedback flow

**Acceptance Criteria:**
- [ ] Users can provide feedback
- [ ] Feedback stored correctly
- [ ] UI updates after submission
- [ ] Can't submit duplicate feedback

**File Locations:**
- `/src/components/search/FeedbackButtons.tsx`
- `/src/app/api/feedback/route.ts`

---

### Task 4.3: User Query History

**ID:** TASK-4.3  
**Description:** Create user-facing query history page  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-4.1

**Steps:**
1. Create history page: `/app/profile/history/page.tsx`
2. Fetch user's past queries from database
3. Display query list with:
   - Query text
   - Timestamp
   - Result count
   - Feedback given
4. Add search within history
5. Add filter by date range
6. Implement "re-run query" action
7. Add "export history" (CSV)
8. Add "delete history" option
9. Implement pagination
10. Style and make responsive

**Acceptance Criteria:**
- [ ] Users can view query history
- [ ] Search and filters work
- [ ] Can re-run past queries
- [ ] Export works
- [ ] Delete works (with confirmation)
- [ ] Pagination functional

**File Locations:**
- `/src/app/profile/history/page.tsx`
- `/src/components/profile/QueryHistory.tsx`

---

### Task 4.4: Admin Analytics Dashboard

**ID:** TASK-4.4  
**Description:** Create analytics dashboard for admins  
**Owner:** Developer  
**Effort:** 12 hours  
**Dependencies:** TASK-4.1

**Steps:**
1. Create analytics page: `/app/admin/analytics/page.tsx`
2. Design dashboard layout with cards for key metrics
3. Implement metric queries:
   - Total users (DAU, WAU, MAU)
   - Total queries (daily, weekly, monthly)
   - Average queries per user
   - Query success rate (clicks + positive feedback)
   - Popular queries (top 20)
   - Content coverage (% of segments viewed)
   - Most viewed segments
   - Least viewed segments (knowledge gaps)
4. Create visualizations:
   - Line chart: Queries over time
   - Bar chart: Popular topics
   - Heatmap: Content coverage
   - Pie chart: Queries by role
5. Add date range filter
6. Add export capability
7. Style with charts library (Recharts)
8. Make responsive

**Acceptance Criteria:**
- [ ] Dashboard displays key metrics
- [ ] Visualizations clear and helpful
- [ ] Date filters work
- [ ] Export works
- [ ] Updates with latest data
- [ ] Only admins can access

**File Locations:**
- `/src/app/admin/analytics/page.tsx`
- `/src/components/admin/AnalyticsDashboard.tsx`
- `/src/lib/analytics/metrics.ts`

---

### Task 4.5: Content Performance Tracking

**ID:** TASK-4.5  
**Description:** Track which content segments are most/least used  
**Owner:** Developer  
**Effort:** 6 hours  
**Dependencies:** TASK-4.1

**Steps:**
1. Create performance page: `/app/admin/content-performance/page.tsx`
2. Query segment usage data:
   - View count per segment
   - Helpfulness ratings
   - Most referenced timestamps
3. Identify underutilized content
4. Display in table format:
   - Segment text (truncated)
   - Source lecture
   - View count
   - Average rating
   - Last viewed
5. Add filters (source, date, rating)
6. Add sorting
7. Export capability
8. Make responsive

**Acceptance Criteria:**
- [ ] Shows content performance metrics
- [ ] Identifies underutilized content
- [ ] Filters and sorting work
- [ ] Export works
- [ ] Only admins can access

**File Locations:**
- `/src/app/admin/content-performance/page.tsx`
- `/src/components/admin/ContentPerformanceTable.tsx`

---

### Task 4.6: Privacy Controls

**ID:** TASK-4.6  
**Description:** Implement privacy controls for user data  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-4.3

**Steps:**
1. Add privacy settings to user profile page
2. Implement "Delete query history" action
3. Implement "Delete account" action (with confirmation)
4. Create data export functionality (GDPR compliance)
5. Update privacy policy page
6. Add consent tracking
7. Test deletion flows

**Acceptance Criteria:**
- [ ] Users can delete query history
- [ ] Users can delete account
- [ ] Data export works (JSON format)
- [ ] Deletions are permanent
- [ ] Privacy policy updated

**File Locations:**
- `/src/app/profile/settings/page.tsx`
- `/src/app/api/profile/delete/route.ts`
- `/src/app/privacy/page.tsx`

---

## Phase 5: Polish & Testing (Weeks 14-16)

### Task 5.1: Unit Tests

**ID:** TASK-5.1  
**Description:** Write comprehensive unit tests  
**Owner:** Developer  
**Effort:** 16 hours  
**Dependencies:** All previous development tasks

**Steps:**
1. Set up Vitest testing framework
2. Write tests for AI services:
   - Entity extraction
   - Relevance scoring
   - Query understanding
   - Response generation
   - Embeddings
3. Write tests for search services:
   - Vector search
   - Graph traversal
   - Ranking algorithm
   - Profile filtering
4. Write tests for utilities:
   - Auth helpers
   - Data validation
   - Error handling
5. Aim for >80% code coverage
6. Run tests in CI pipeline

**Acceptance Criteria:**
- [ ] 80%+ code coverage
- [ ] All critical paths tested
- [ ] Tests passing in CI
- [ ] No flaky tests

**Test Location:** `/tests/unit/`

---

### Task 5.2: Integration Tests

**ID:** TASK-5.2  
**Description:** Write integration tests for API endpoints  
**Owner:** Developer  
**Effort:** 12 hours  
**Dependencies:** TASK-5.1

**Steps:**
1. Set up test database (Supabase test project)
2. Write API tests:
   - `/api/search` (with different user roles)
   - `/api/upload` (admin only)
   - `/api/invitations` (admin only)
   - `/api/feedback`
   - `/api/profile/setup`
3. Test RLS policies with different users
4. Test error cases (unauthorized, invalid input, etc.)
5. Run tests in CI pipeline

**Acceptance Criteria:**
- [ ] All API endpoints tested
- [ ] RLS enforcement verified
- [ ] Error handling works
- [ ] Tests passing in CI

**Test Location:** `/tests/integration/`

---

### Task 5.3: End-to-End Tests

**ID:** TASK-5.3  
**Description:** Write E2E tests for critical user flows  
**Owner:** Developer  
**Effort:** 10 hours  
**Dependencies:** TASK-5.2

**Steps:**
1. Set up Playwright for E2E testing
2. Write E2E tests:
   - User signup and profile setup
   - User login and session management
   - Search and view results flow
   - Admin upload and approve content
   - Admin invite user
   - Feedback submission
3. Test across browsers (Chrome, Firefox, Safari)
4. Test mobile viewport
5. Run tests in CI pipeline

**Acceptance Criteria:**
- [ ] All critical flows tested
- [ ] Cross-browser compatibility verified
- [ ] Mobile flows work
- [ ] Tests passing in CI

**Test Location:** `/tests/e2e/`

---

### Task 5.4: Performance Optimization

**ID:** TASK-5.4  
**Description:** Optimize application performance  
**Owner:** Developer  
**Effort:** 12 hours  
**Dependencies:** All development complete

**Steps:**
1. Run Lighthouse audit on all pages
2. Optimize database queries:
   - Add missing indexes
   - Use EXPLAIN ANALYZE to find slow queries
   - Optimize N+1 queries
3. Implement caching:
   - Cache common queries (Redis or Supabase cache)
   - Cache AI responses for identical queries
   - Cache static data (topics, recent lectures)
4. Optimize bundle size:
   - Code splitting
   - Lazy loading components
   - Remove unused dependencies
5. Optimize images:
   - Compress images
   - Use Next.js Image component
   - Implement CDN
6. Monitor performance:
   - Set up Vercel Analytics
   - Track Core Web Vitals
7. Test performance improvements

**Acceptance Criteria:**
- [ ] Lighthouse score >90 on all pages
- [ ] Page load time <2 seconds
- [ ] Search response time <5 seconds
- [ ] Database queries <500ms (p95)
- [ ] Bundle size optimized

**Monitoring:** Vercel Analytics, Sentry

---

### Task 5.5: Security Audit

**ID:** TASK-5.5  
**Description:** Conduct security review and fix vulnerabilities  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** All development complete

**Steps:**
1. Run security checklist (from PLANNING.md):
   - API keys in env variables (not code)
   - RLS policies tested
   - SQL injection prevention
   - XSS prevention
   - CSRF protection
   - HTTPS enforced
   - Secure cookies
   - Rate limiting
   - Input validation
   - Error messages don't leak info
   - Security headers
2. Scan dependencies for vulnerabilities:
   ```bash
   pnpm audit
   ```
3. Fix any issues found
4. Consider penetration testing (external service)
5. Document security measures
6. Update security policy

**Acceptance Criteria:**
- [ ] Security checklist complete
- [ ] No critical vulnerabilities
- [ ] Dependencies up to date
- [ ] Security documentation updated

**Documentation:** `/docs/SECURITY.md`

---

### Task 5.6: Accessibility Audit

**ID:** TASK-5.6  
**Description:** Ensure WCAG 2.1 AA compliance  
**Owner:** Developer  
**Effort:** 8 hours  
**Dependencies:** All UI complete

**Steps:**
1. Run automated accessibility tests (axe DevTools)
2. Test keyboard navigation on all pages
3. Test with screen reader (VoiceOver, NVDA)
4. Check color contrast ratios
5. Add ARIA labels where needed
6. Ensure form labels correct
7. Add skip links
8. Test with zoom (200%)
9. Fix all issues found
10. Document accessibility features

**Acceptance Criteria:**
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] No accessibility errors

**Documentation:** `/docs/ACCESSIBILITY.md`

---

### Task 5.7: UI/UX Refinement

**ID:** TASK-5.7  
**Description:** Polish UI based on user feedback  
**Owner:** Developer  
**Effort:** 12 hours  
**Dependencies:** Beta testing (Task 5.8)

**Steps:**
1. Collect feedback from beta testers
2. Identify pain points and confusions
3. Refine UI elements:
   - Improve loading states
   - Better error messages
   - Add helpful empty states
   - Enhance visual hierarchy
   - Improve form UX
4. Add subtle animations (Framer Motion)
5. Improve mobile experience
6. Add tooltips for complex features
7. Update help text
8. Test changes with users

**Acceptance Criteria:**
- [ ] Beta tester feedback addressed
- [ ] UI feels polished and professional
- [ ] Animations subtle and purposeful
- [ ] Mobile experience excellent
- [ ] User satisfaction improved

**Feedback Tracking:** GitHub Issues

---

### Task 5.8: Beta Testing

**ID:** TASK-5.8  
**Description:** Conduct beta testing with representative users  
**Owner:** Alfa (coordination)  
**Effort:** 2 weeks (parallel with other tasks)  
**Dependencies:** Search functional, auth working

**Steps:**
1. Recruit beta testers:
   - 2 internal team members
   - 2 Align reps
   - 2 dentists (different experience levels)
   - 2 dental assistants
   - 1 hygienist
   - 1 treatment coordinator
2. Provide beta access and training
3. Collect feedback:
   - User interviews (30 min each)
   - Usage surveys
   - Bug reports
   - Feature requests
4. Analyze feedback and prioritize fixes
5. Track metrics (engagement, query success rate)
6. Iterate based on feedback
7. Final round of testing after fixes

**Acceptance Criteria:**
- [ ] 10+ beta testers recruited
- [ ] All testers complete testing
- [ ] Feedback collected and analyzed
- [ ] Critical issues fixed
- [ ] Average usability rating 4.5+/5

**Feedback Collection:** Google Forms, User Interviews

---

### Task 5.9: Documentation

**ID:** TASK-5.9  
**Description:** Create comprehensive user and admin documentation  
**Owner:** Developer + Alfa  
**Effort:** 12 hours  
**Dependencies:** All features complete

**Steps:**
1. Write user guides (one per profile):
   - Getting started
   - How to search effectively
   - Understanding results
   - Video navigation
   - Profile settings
2. Write admin manual:
   - User management
   - Content upload
   - Processing monitoring
   - Analytics interpretation
   - Troubleshooting
3. Create video tutorials (5-10 min each):
   - Overview for each role
   - Common workflows
4. Write FAQ document
5. Create quick-start cheat sheets
6. Update in-app help text
7. Publish to help center or wiki

**Acceptance Criteria:**
- [ ] User guides complete for all roles
- [ ] Admin manual comprehensive
- [ ] Video tutorials recorded
- [ ] FAQ covers common questions
- [ ] Documentation accessible

**Documentation Location:** `/docs/` or help.keyelements.co

---

## Phase 6: Launch Preparation (Week 17)

### Task 6.1: Production Deployment

**ID:** TASK-6.1  
**Description:** Deploy application to production environment  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** All testing complete

**Steps:**
1. Review production deployment checklist:
   - Environment variables set
   - Database migrations applied
   - SSL certificate valid
   - DNS configured
   - Monitoring configured
2. Deploy to production (merge to `main` branch)
3. Run smoke tests in production:
   - Login works
   - Search works
   - Content accessible
   - Admin functions work
4. Verify performance metrics
5. Check error logs (should be clean)
6. Notify team of deployment

**Acceptance Criteria:**
- [ ] Application deployed successfully
- [ ] All smoke tests pass
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Team notified

**Deployment:** Vercel auto-deploy from `main` branch

---

### Task 6.2: Content Upload

**ID:** TASK-6.2  
**Description:** Upload all 8+ hours of processed content  
**Owner:** Alfa  
**Effort:** 8 hours  
**Dependencies:** TASK-6.1

**Steps:**
1. Prepare all transcript files
2. Upload via admin interface (one at a time or bulk)
3. Monitor processing status
4. Review AI-generated metadata (spot check)
5. Validate entities and relationships
6. Approve all content for publication
7. Test sample queries across all topics
8. Verify video timestamp links work

**Acceptance Criteria:**
- [ ] All content uploaded
- [ ] Processing complete (no errors)
- [ ] Metadata quality acceptable
- [ ] Content searchable
- [ ] Video links functional

**Content Tracking:** Spreadsheet or Notion board

---

### Task 6.3: Monitoring Setup

**ID:** TASK-6.3  
**Description:** Configure monitoring and alerting  
**Owner:** Developer  
**Effort:** 4 hours  
**Dependencies:** TASK-6.1

**Steps:**
1. Set up error tracking (Sentry):
   - Configure project
   - Add Sentry SDK to app
   - Test error reporting
2. Configure uptime monitoring:
   - Use Vercel or third-party (UptimeRobot)
   - Set up health check endpoint
3. Create alerting rules:
   - Critical: Uptime <99%, error rate >5%
   - Warning: Response time >5s, error rate >1%
4. Set up metrics dashboard:
   - Daily active users
   - Queries per day
   - Response times
   - Error rates
5. Configure alerts to Slack or email
6. Test alerting

**Acceptance Criteria:**
- [ ] Error tracking works
- [ ] Uptime monitoring active
- [ ] Alerts configured
- [ ] Metrics dashboard accessible
- [ ] Test alerts received

**Tools:** Sentry, Vercel Analytics, UptimeRobot (optional)

---

### Task 6.4: User Invitation

**ID:** TASK-6.4  
**Description:** Invite initial users to platform  
**Owner:** Alfa  
**Effort:** 4 hours  
**Dependencies:** TASK-6.1, TASK-6.2

**Steps:**
1. Prepare user list:
   - Internal team (all members)
   - Align reps (selected group)
   - Dentists (early adopters)
   - Support staff (assistants, coordinators)
2. Send invitations via admin interface
3. Follow up with welcome email:
   - Link to documentation
   - Link to training video
   - Support contact
4. Track invitation acceptance
5. Follow up with non-responders
6. Schedule onboarding calls if needed

**Acceptance Criteria:**
- [ ] All initial users invited
- [ ] Welcome emails sent
- [ ] >80% acceptance rate
- [ ] Users complete profile setup

**User Tracking:** CRM or spreadsheet

---

### Task 6.5: Training Sessions

**ID:** TASK-6.5  
**Description:** Conduct live training for initial users  
**Owner:** Alfa + Dr. Soto (optional)  
**Effort:** 6 hours (prep + sessions)  
**Dependencies:** TASK-6.4

**Steps:**
1. Schedule training sessions by role:
   - Internal team: 30 min
   - Align reps: 45 min
   - Dental professionals: 30 min per role
2. Prepare training agenda:
   - Platform overview
   - How to search
   - Understanding results
   - Video navigation
   - Q&A
3. Record sessions for future reference
4. Conduct training sessions
5. Collect feedback
6. Share recordings and resources
7. Follow up with individual support

**Acceptance Criteria:**
- [ ] Training sessions held for all roles
- [ ] Recorded and shared
- [ ] Feedback collected
- [ ] Users feel confident using platform

**Training Materials:** Slides, demo videos, handouts

---

### Task 6.6: Support System Setup

**ID:** TASK-6.6  
**Description:** Set up user support process  
**Owner:** Alfa  
**Effort:** 4 hours  
**Dependencies:** TASK-6.1

**Steps:**
1. Create support email: support@keyelements.co
2. Set up email forwarding or help desk (Zendesk, Intercom)
3. Create support response templates:
   - Password reset help
   - Search tips
   - Feature explanations
   - Bug report acknowledgment
4. Designate support responder (Alfa initially)
5. Create escalation process:
   - Technical issues → Developer
   - Content questions → Dr. Soto
6. Set response time SLA (24 hours)
7. Create support knowledge base (FAQ)
8. Test support workflow

**Acceptance Criteria:**
- [ ] Support email active
- [ ] Response templates ready
- [ ] Escalation process defined
- [ ] Knowledge base published
- [ ] Team trained on support

**Tools:** Email or Zendesk/Intercom

---

### Task 6.7: Launch Communication

**ID:** TASK-6.7  
**Description:** Communicate launch to stakeholders  
**Owner:** Alfa  
**Effort:** 4 hours  
**Dependencies:** TASK-6.1

**Steps:**
1. Draft launch announcement:
   - Internal team email
   - External user email
   - Social media posts (if applicable)
2. Highlight key features and benefits
3. Include links to:
   - Platform: www.max.keyelements.co
   - Documentation
   - Training videos
   - Support contact
4. Share success metrics goals
5. Invite feedback
6. Send announcements
7. Post on internal channels (Slack)
8. Schedule stakeholder update meeting

**Acceptance Criteria:**
- [ ] Launch announcement sent
- [ ] Key stakeholders informed
- [ ] Users have access to resources
- [ ] Feedback channels open

**Communication Channels:** Email, Slack, social media

---

## Post-Launch: Week 1 Tasks

### Task 7.1: Daily Monitoring

**ID:** TASK-7.1  
**Description:** Monitor system stability and user engagement daily  
**Owner:** Developer + Alfa  
**Effort:** 1 hour/day  
**Dependencies:** TASK-6.3

**Steps:**
1. Check error logs (Sentry)
2. Review uptime metrics
3. Check response time metrics
4. Monitor user signups and activations
5. Track query volume
6. Review user feedback
7. Address critical issues immediately
8. Create bug tickets for non-critical issues
9. Report daily summary to stakeholders

**Acceptance Criteria:**
- [ ] Monitoring conducted daily
- [ ] Critical issues addressed same day
- [ ] Stakeholders kept informed

**Duration:** Ongoing (first 30 days critical)

---

### Task 7.2: User Feedback Collection

**ID:** TASK-7.2  
**Description:** Actively collect user feedback  
**Owner:** Alfa  
**Effort:** 4 hours/week  
**Dependencies:** TASK-6.4

**Steps:**
1. Send user survey (after 1 week of use):
   - What's working well?
   - What's frustrating?
   - What features are missing?
   - Would you recommend to colleagues?
2. Conduct user interviews (2-3 per week)
3. Monitor in-app feedback (helpful/not helpful)
4. Track support requests for patterns
5. Analyze feedback for themes
6. Prioritize issues and requests
7. Share findings with team weekly

**Acceptance Criteria:**
- [ ] Survey responses collected (>50% response rate)
- [ ] User interviews conducted
- [ ] Feedback analyzed and categorized
- [ ] Action items prioritized

**Tools:** Google Forms, Calendly, Notion

---

### Task 7.3: Bug Fixes

**ID:** TASK-7.3  
**Description:** Fix bugs reported by users  
**Owner:** Developer  
**Effort:** Varies (ongoing)  
**Dependencies:** TASK-7.2

**Steps:**
1. Triage bug reports (critical, high, medium, low)
2. Fix critical bugs immediately (deploy hot-fix)
3. Fix high-priority bugs within 3 days
4. Schedule medium/low bugs for next sprint
5. Test fixes in staging
6. Deploy to production
7. Notify users of fixes
8. Update bug tracker

**Acceptance Criteria:**
- [ ] Critical bugs fixed same day
- [ ] High-priority bugs fixed within 3 days
- [ ] Users notified of fixes
- [ ] Bug tracker up to date

**Bug Tracking:** GitHub Issues

---

### Task 7.4: Quick Wins Implementation

**ID:** TASK-7.4  
**Description:** Implement small improvements based on feedback  
**Owner:** Developer  
**Effort:** 4-8 hours  
**Dependencies:** TASK-7.2

**Steps:**
1. Identify "quick win" improvements:
   - UI tweaks (colors, spacing, labels)
   - Better error messages
   - Improved empty states
   - Additional tooltips
   - Performance optimizations
2. Implement changes
3. Test in staging
4. Deploy to production
5. Notify users of improvements
6. Track impact on engagement

**Acceptance Criteria:**
- [ ] 3-5 quick wins implemented in week 1
- [ ] User satisfaction improves
- [ ] No regressions introduced

**Deployment:** Continuous (as completed)

---

## Ongoing Tasks (Post-Launch)

### Task 8.1: Weekly Analytics Review

**ID:** TASK-8.1  
**Description:** Review analytics and metrics weekly  
**Owner:** Alfa + Developer  
**Effort:** 1 hour/week  
**Dependencies:** TASK-6.3

**Steps:**
1. Review key metrics:
   - DAU, WAU, MAU
   - Queries per user
   - Query success rate
   - Content coverage
   - Response times
2. Identify trends (up/down)
3. Investigate anomalies
4. Identify top queries and content gaps
5. Document findings
6. Share with team
7. Plan actions based on data

**Acceptance Criteria:**
- [ ] Weekly review conducted
- [ ] Findings documented
- [ ] Actions identified

**Schedule:** Every Monday

---

### Task 8.2: Content Gap Analysis

**ID:** TASK-8.2  
**Description:** Identify and fill content gaps  
**Owner:** Alfa + Dr. Soto  
**Effort:** 2 hours/week  
**Dependencies:** TASK-8.1

**Steps:**
1. Review queries with no good results
2. Review least-viewed content segments
3. Identify missing topics
4. Prioritize new content needs
5. Record new lectures or source existing
6. Upload and process new content
7. Monitor impact on query success

**Acceptance Criteria:**
- [ ] Content gaps identified weekly
- [ ] New content prioritized
- [ ] 1-2 new sources uploaded per month

**Schedule:** Bi-weekly

---

### Task 8.3: User Engagement Campaigns

**ID:** TASK-8.3  
**Description:** Run campaigns to increase user engagement  
**Owner:** Alfa  
**Effort:** 2 hours/week  
**Dependencies:** TASK-6.4

**Steps:**
1. Send weekly email to users:
   - Highlight new content
   - Share popular queries
   - Provide search tips
   - Success stories
2. Create in-app notifications (Phase 2)
3. Run webinars or Q&A sessions
4. Share testimonials and case studies
5. Track campaign impact on engagement

**Acceptance Criteria:**
- [ ] Weekly email sent
- [ ] Engagement metrics improve
- [ ] Users appreciate communication (survey feedback)

**Schedule:** Weekly

---

### Task 8.4: Feature Roadmap Updates

**ID:** TASK-8.4  
**Description:** Update feature roadmap based on feedback  
**Owner:** Alfa + Developer  
**Effort:** 2 hours/month  
**Dependencies:** TASK-7.2

**Steps:**
1. Review accumulated feedback and requests
2. Analyze usage data for insights
3. Prioritize features using Impact × Effort matrix
4. Update roadmap document
5. Communicate roadmap to stakeholders
6. Plan next development phase
7. Allocate resources

**Acceptance Criteria:**
- [ ] Roadmap reviewed monthly
- [ ] Priorities clear and justified
- [ ] Stakeholders informed

**Schedule:** First Monday of each month

---

## Appendix: Task Templates

### Bug Report Template

```markdown
**Bug ID:** BUG-XXX
**Severity:** Critical | High | Medium | Low
**Reported By:** User name or internal
**Date:** YYYY-MM-DD

**Description:**
Brief description of the bug

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Screenshots/Videos:**
(if applicable)

**Environment:**
- Browser: Chrome 120
- Device: Desktop
- OS: macOS 14

**Related Issues:**
Link to related bugs or tasks

**Fix:**
Description of fix implemented

**Deployed:**
Yes/No - Date deployed
```

---

### Feature Request Template

```markdown
**Feature ID:** FEAT-XXX
**Requested By:** User role or internal
**Priority:** High | Medium | Low
**Date:** YYYY-MM-DD

**Problem Statement:**
What problem does this solve?

**Proposed Solution:**
How should this work?

**User Impact:**
How many users benefit? How much?

**Effort Estimate:**
Small (1-4 hrs) | Medium (1-2 days) | Large (3-5 days) | XL (1-2 weeks)

**Dependencies:**
What must be done first?

**Alternative Solutions:**
Other ways to solve this

**Decision:**
Approved | Declined | Deferred

**Implementation Plan:**
(if approved)

**Deployed:**
Yes/No - Date deployed
```

---

## Summary

This tasks document provides a comprehensive, actionable breakdown of the Max RAG project. Each task includes:
- Clear description and acceptance criteria
- Effort estimates
- Dependencies
- File locations

**Total Estimated Effort:**
- Phase 0: 24 hours (2 weeks)
- Phase 1: 60 hours (4 weeks)
- Phase 2: 46 hours (2 weeks)
- Phase 3: 66 hours (3 weeks)
- Phase 4: 36 hours (1.5 weeks)
- Phase 5: 80 hours (3 weeks)
- Phase 6: 30 hours (1 week)
- **Total:** ~342 hours (~17 weeks at 20 hrs/week or ~8.5 weeks full-time)

**Critical Path:**
Phase 0 → Phase 1 (Core RAG) → Phase 3 (Search) → Phase 5 (Testing) → Phase 6 (Launch)

Phases 2 (Auth) and 4 (Analytics) can partially overlap with other phases to optimize timeline.

---

**Document Owner:** Developer + Alfa  
**Review Cycle:** Weekly during development  
**Last Updated:** 2025-11-07