# Max RAG - Planning Document

**Project:** Max RAG Knowledge Platform  
**Domain:** www.max.keyelements.co  
**Planning Date:** 2025-11-07  
**Target Launch:** Q1 2026  
**Last Updated:** 2025-11-08 (worker + dashboard validated end-to-end)

---

## Strategic Overview

### Project Mission
Transform Dr. Karla Soto's 8+ hours of dental education video lectures into an intelligent, searchable knowledge platform that delivers role-specific insights to internal teams, Align representatives, and dental professionals.

### Business Objectives

**Primary Goals:**
1. **Increase Content Accessibility:** Make expert knowledge instantly searchable and discoverable
2. **Enable Role-Based Learning:** Deliver personalized experiences for 6 distinct user profiles
3. **Scale Education Impact:** Reach hundreds of dental professionals with Key Elements methodology
4. **Support Sales Enablement:** Equip Align reps with on-demand answers for doctor questions
5. **Accelerate Content Creation:** Help internal teams rapidly create marketing materials

**Success Metrics:**
- 200+ active users within 6 months of launch
- 4.0+ average helpfulness rating
- 80%+ content utilization (segments viewed at least once)
- 3+ average queries per user session
- 60%+ weekly active user rate

---

## Development Phases

### Phase 0: Foundation & Setup (Weeks 1-2)

**Objectives:**
- Establish development environment
- Set up infrastructure and tooling
- Define technical architecture
- Create project scaffolding

**Deliverables:**
- [ ] GitHub repository with branch strategy
- [ ] Supabase project created (database, auth, storage)
- [ ] Vercel project linked to GitHub
- [ ] Domain DNS configured (www.max.keyelements.co)
- [ ] Next.js 14 app scaffolded with TypeScript
- [ ] Database schema v1.0 deployed
- [ ] Authentication flow implemented
- [ ] Development, staging, production environments
- [ ] CI/CD pipeline configured

**Key Decisions:**
- ✅ Tech stack: Next.js + Supabase + Claude AI
- ✅ AI routing: Claude Sonnet 4 primary, Gemini 2.0 Flash fallback
- ✅ Embedding model: OpenAI text-embedding-3-large
- ✅ Authentication: Supabase Auth with RLS
- ✅ Hosting: Vercel with Edge Functions

**Team Allocation:**
- Developer: Full-time on setup
- Alfa: Architecture review, decision approval

---

### Progress Snapshot — 2025-11-08

- ✅ End-user “Push to Max RAG” workflow now enqueues jobs via `submit_to_rag` (Edits + Final tabs).
- ✅ Background worker (`process_rag_queue` edge function) processes queued transcripts, generates OpenAI embeddings, and writes segments/relevance records (production migrations `003_rag_core.sql`, `004_rag_version_links.sql` applied 2025-11-08).
- ✅ Core storage tables deployed (`content_segments`, `segment_relevance`, `kg_entities`, `kg_relationships`, `segment_entities`, `user_queries`) and populated by first processed transcript.
- ✅ Admin RAG dashboard (`/admin/rag`) surfaces queue metrics, processed content, and recent user queries.
- ✅ User RAG search UI (`/rag`) powered by the new `match_rag_content` RPC with query logging.
- ⏳ Knowledge graph enrichment (entity + relationship creation) is stubbed; Phase 3 will integrate Claude extraction for KG writes.

**Validation Notes (2025-11-08)**
- Pushed sample H-1 transcript → queue row created (`status='queued'`) → worker completed after migrations with `segments_processed` summary, `content_segments` row, and `rag_ingestion_queue.status='complete'`.
- `/rag` search for “alignment workflow” returns segments sourced from new pipeline; Claude synthesis generates answer using selected chunk IDs.
- `/admin/rag` dashboard reflects queue item counts, indexed segment totals, and logs the above user query in `user_queries`.
- Remaining to validate: knowledge-graph entity extraction, persona-specific relevance scoring, automated retry escalation, scheduled invocations (currently manual).

---

### Phase 1: Core RAG System (Weeks 3-6)

**Objectives:**
- Build content ingestion pipeline
- Implement AI-powered processing
- Create basic search functionality
- Establish knowledge graph foundation

**Features:**

**F1.1: Transcript Upload (Admin)**
- Upload interface for JSON/TXT transcripts with timestamps
- Source metadata form (title, date, speaker, type, Zoom URL)
- Validation: Required fields, timestamp format checking
- Status tracking: Draft → Processing → Complete

**F1.2: AI Content Processing**
- Claude Sonnet 4 integration for entity extraction
- Relevance scoring per user profile (dentist, assistant, hygienist, coordinator, align rep)
- Content classification (procedure, philosophy, case study, etc.)
- Confidence scoring with review flagging (<0.6 requires review)
- Error handling with retry logic

**F1.3: Embeddings Generation**
- OpenAI text-embedding-3-large integration
- Batch processing for efficiency
- Caching to avoid duplicate embedding generation
- Vector storage in Supabase pgvector

**F1.4: Knowledge Graph Construction**
- Entity table population (procedures, concepts, anatomy, materials, tools)
- Relationship extraction (PREREQUISITE_OF, RELATED_TO, USED_IN, etc.)
- Segment-to-entity linking
- Graph traversal query functions

**F1.5: Basic Vector Search**
- Query embedding generation
- pgvector similarity search
- Top-K retrieval (20 segments)
- Simple ranking by cosine similarity

**Technical Tasks:**
- [x] Supabase Edge Function: `process_rag_queue` (queued transcript worker)
- [x] Database tables: `content_sources`, `content_segments`, `segment_relevance`
- [x] Database tables: `kg_entities`, `kg_relationships`, `segment_entities`
- [x] API routes: `/api/rag/send-to-rag`, `/api/insight/rag-search`, `/api/insight/rag-synthesize`
- [x] Background job queue (Supabase Edge Function cron-friendly workflow)
- [x] Admin upload UI component (existing Sonix import + RAG submission)
- [x] Processing status dashboard (`/admin/rag`)

**Success Criteria:**
- Upload and process 2+ sample transcripts end-to-end
- Entity extraction accuracy >80% (manual validation)
- Search returns relevant results for basic queries
- Processing completes within 5 minutes per 1-hour lecture
- Zero data loss during processing

**Team Allocation:**
- Developer: Full-time on implementation
- Alfa: Daily progress review, sample transcript preparation
- Dr. Soto: Content validation (1-2 hours/week)

---

### Phase 2: Authentication & Access Control (Weeks 7-8)

**Objectives:**
- Implement secure user authentication
- Build role-based access control
- Create user invitation system
- Enable profile-based content filtering

**Features:**

**F2.1: User Registration & Login**
- Invitation-based registration (no public signup)
- Email + password authentication
- Password reset via email
- Session management with secure tokens

**F2.2: User Profiles**
- Profile creation flow (role, organization, experience level)
- Role selection: internal, align_rep, dentist, dental_assistant, hygienist, treatment_coordinator
- Profile editing capability
- Account settings page

**F2.3: Admin User Management**
- Invite users via email (single and bulk)
- View user list with filtering (role, status, organization)
- Deactivate/reactivate accounts
- View user activity logs

**F2.4: Row-Level Security (RLS)**
- Supabase RLS policies per user role
- Content visibility rules (internal sees all, external filtered by relevance)
- Query history privacy (users see only their own)
- Admin override capability

**Technical Tasks:**
- [ ] Supabase Auth setup with email provider
- [ ] Database tables: `user_profiles`, `user_invitations`
- [ ] RLS policies on all content tables
- [ ] API routes: `/api/auth/*`, `/api/users/*`, `/api/invitations/*`
- [ ] Login/registration UI components
- [ ] Profile completion flow
- [ ] Admin user management dashboard
- [ ] Email templates (invitation, password reset)

**Success Criteria:**
- Users can register via invitation link
- Login persists across browser sessions
- Profile-based content filtering works correctly
- Admin can manage users without database access
- RLS prevents unauthorized data access (security audit)

**Team Allocation:**
- Developer: Full-time on auth implementation
- Alfa: User testing, security review

---

### Phase 3: Profile-Aware Search (Weeks 9-11)

**Objectives:**
- Implement hybrid search (vector + graph)
- Build profile-aware filtering and ranking
- Create conversational UI
- Enable query understanding with Claude

**Features:**

**F3.1: Query Understanding**
- Claude Sonnet 4 intent classification
- Entity extraction from user queries
- Query expansion with related concepts
- Implicit need detection based on user role

**F3.2: Hybrid Retrieval**
- Vector similarity search (embedding-based)
- Graph traversal (relationship-based)
- Combined ranking algorithm (vector 40%, graph 30%, relevance 20%, recency 10%)
- Relevance threshold per profile type

**F3.3: Response Generation**
- Claude Sonnet 4 for role-specific formatting
- Include video timestamps
- Related concepts section
- Suggested follow-up queries
- Source citations (lecture title, date)

**F3.4: Conversational UI**
- Prominent search bar on landing page
- Streaming response (show as generated)
- Rich formatting (headers, bullet points, code blocks)
- Video timestamp links
- "Was this helpful?" feedback mechanism

**Technical Tasks:**
- [ ] API route: `/api/query` (main search endpoint)
- [ ] Query understanding service (Claude integration)
- [ ] Hybrid search algorithm implementation
- [ ] Graph traversal functions (recursive CTEs)
- [ ] Response generation service (Claude integration)
- [ ] Search UI component with streaming support
- [ ] Results display component
- [ ] Feedback capture mechanism

**Success Criteria:**
- Query response time <5 seconds
- Relevant results for 90% of test queries
- Role-appropriate formatting (validated with users)
- Users can jump to video timestamps
- Feedback mechanism works reliably

**Team Allocation:**
- Developer: Full-time on search implementation
- Alfa: Test query preparation, UI/UX review
- Dr. Soto: Result validation (2 hours/week)

---

### Phase 4: Query History & Analytics (Weeks 12-13)

**Objectives:**
- Track user queries for analytics
- Enable query history for users
- Build admin analytics dashboard
- Identify content gaps

**Features:**

**F4.1: Query Logging**
- Store all queries with user context
- Track segments returned and clicked
- Capture user feedback (helpful/not helpful)
- Record response time and performance metrics

**F4.2: User Query History**
- View past queries in profile
- Re-run previous searches
- Export query history (CSV)
- Delete query history (privacy)

**F4.3: Admin Analytics**
- Popular queries per role
- Query success rate (clicks + positive feedback)
- Content coverage heatmap
- Knowledge gaps report
- User engagement metrics (DAU, WAU, MAU)

**Technical Tasks:**
- [ ] Database table: `user_queries` with full schema
- [ ] Query logging middleware
- [ ] User query history UI
- [ ] Admin analytics dashboard components
- [ ] Data aggregation queries and views
- [ ] Export functionality
- [ ] Privacy: 90-day auto-deletion job

**Success Criteria:**
- All queries logged with complete metadata
- Users can access their history
- Admin can identify trending queries
- Analytics reveal content gaps
- Privacy controls work correctly

**Team Allocation:**
- Developer: 50% on implementation
- Alfa: Analytics requirement definition, dashboard mockups

---

### Phase 5: Polish & Testing (Weeks 14-16)

**Objectives:**
- Comprehensive testing across all user roles
- UI/UX refinement
- Performance optimization
- Bug fixes and edge case handling

**Activities:**

**Testing:**
- [ ] Unit tests for critical functions (entity extraction, search ranking)
- [ ] Integration tests for API endpoints
- [ ] End-to-end tests for user flows (signup → search → feedback)
- [ ] Security audit (RLS, auth, data privacy)
- [ ] Performance testing (concurrent users, large queries)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile responsive testing (iOS, Android)

**Polish:**
- [ ] Refine UI based on beta user feedback
- [ ] Improve loading states and error messages
- [ ] Add empty states with helpful guidance
- [ ] Optimize images and assets
- [ ] Implement skeleton loaders
- [ ] Add subtle animations (Framer Motion)
- [ ] Accessibility audit (WCAG 2.1 AA)

**Performance:**
- [ ] Database query optimization (indexes, explain analyze)
- [ ] Implement caching for common queries (Redis or Supabase cache)
- [ ] Optimize bundle size (code splitting, lazy loading)
- [ ] CDN setup for static assets
- [ ] Monitor and optimize AI API usage

**Documentation:**
- [ ] User guide for each profile type
- [ ] Admin manual for content management
- [ ] API documentation (if needed for future integrations)
- [ ] Troubleshooting guide

**Success Criteria:**
- 95%+ test coverage for critical paths
- <2 second page load time
- <5 second search response time
- Zero security vulnerabilities (audit)
- 4.5+/5 average usability rating (beta testers)
- Mobile experience equals desktop

**Team Allocation:**
- Developer: Full-time on testing and polish
- Alfa: User testing coordination, feedback collection
- Beta testers: 10+ users (2 per profile type)

---

### Phase 6: Launch Preparation (Week 17)

**Objectives:**
- Deploy to production
- Train initial users
- Set up monitoring and support
- Plan post-launch iteration

**Activities:**

**Deployment:**
- [ ] Final production deployment checklist
- [ ] Database migration to production
- [ ] Environment variable verification
- [ ] Domain SSL certificate verification
- [ ] DNS verification and propagation
- [ ] Smoke testing in production

**Content:**
- [ ] Upload all 8+ hours of processed content
- [ ] Verify all segments searchable
- [ ] Test sample queries across all roles
- [ ] Validate video timestamp links

**Training:**
- [ ] Create onboarding videos (one per profile type)
- [ ] Write quick-start guide
- [ ] Prepare FAQ document
- [ ] Schedule training sessions for Align reps

**Monitoring:**
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Create alerting rules (downtime, errors, slow queries)
- [ ] Dashboard for key metrics (queries/day, active users, feedback)

**Support:**
- [ ] Create support email (support@keyelements.co)
- [ ] Designate support responder (Alfa initially)
- [ ] Set up feedback collection process
- [ ] Plan weekly review cadence

**Success Criteria:**
- Production environment stable and secure
- All content accessible and searchable
- Monitoring in place with alerts configured
- Training materials complete
- Support process defined

**Team Allocation:**
- Developer: Deployment and monitoring setup
- Alfa: Content upload, training material creation
- Dr. Soto: Content validation, training video recording

---

## Post-Launch: Iteration & Growth

### First 30 Days

**Focus: Stability & User Feedback**

**Week 1-2:**
- Monitor system stability (uptime, errors, performance)
- Collect user feedback actively (surveys, interviews)
- Identify and fix critical bugs
- Track engagement metrics daily

**Week 3-4:**
- Analyze query patterns to identify content gaps
- Quick wins: UI tweaks, performance improvements
- Begin planning Phase 2 features based on feedback
- Communicate progress to stakeholders

**Key Metrics to Watch:**
- Daily active users (DAU)
- Average queries per session
- Query success rate (clicks + positive feedback)
- Content coverage percentage
- System uptime and response times

**Actions if Metrics Miss Target:**
- Low engagement → Improve onboarding, add training
- Low query success → Refine relevance scoring, add content
- Slow response → Optimize queries, add caching
- High error rate → Debug and hot-fix immediately

---

### Phase 2 Features (Months 2-4)

**Priority 1: Enhanced Video Integration**
- Embedded Zoom player with deep-linking
- Inline video playback
- Video clip generation for sharing

**Priority 2: Human Review Workflow**
- Admin review queue for low-confidence extractions
- Manual relevance score overrides
- Vocabulary management interface
- Entity merging tools

**Priority 3: Learning Pathways**
- Prerequisite-based course sequences
- Beginner → Advanced tracks per topic
- Progress tracking
- Completion badges

**Priority 4: Advanced Search**
- Filters (date range, source type, complexity)
- Save searches and alerts
- Advanced query syntax (AND/OR/NOT)
- Search result export

**Priority 5: Collaboration Features**
- Share queries and results with colleagues
- Personal annotations on segments
- Team workspaces for practices

**Feature Prioritization Process:**
1. Collect user feedback and feature requests
2. Analyze usage data to identify needs
3. Score features: Impact × Effort matrix
4. Validate with key users (1-2 from each profile)
5. Update roadmap monthly

---

### Phase 3 Features (Months 5-12)

**Expansion:**
- Multilingual support (Spanish, Portuguese)
- Mobile apps (iOS, Android)
- Content generation (study guides, patient handouts)
- Third-party integrations (Zapier, Slack, practice management software)

**AI Enhancements:**
- Multimodal processing (slides, diagrams)
- Active learning from user feedback
- Personalized recommendations
- Clinical question routing to experts

---

## Technical Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│  Next.js 14 App (React 18, TypeScript)                  │
│  • Landing page & search UI                              │
│  • Authentication pages                                  │
│  • Admin dashboard                                       │
│  • User profile & settings                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTPS (TLS 1.3)
                 │
┌────────────────▼────────────────────────────────────────┐
│                    VERCEL EDGE                           │
│  • Serverless Functions                                  │
│  • Edge Functions (optional)                             │
│  • CDN for static assets                                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├──────────────────┬──────────────────────┐
                 │                  │                       │
┌────────────────▼────┐  ┌─────────▼──────┐  ┌───────────▼────────┐
│  SUPABASE           │  │  ANTHROPIC API │  │  OPENAI API        │
│  PostgreSQL + Auth  │  │  Claude Sonnet │  │  Embeddings        │
│                     │  │  4              │  │  text-embed-3-lg   │
│  • user_profiles    │  └────────────────┘  └────────────────────┘
│  • content_sources  │           │                     │
│  • content_segments │           │                     │
│  • kg_entities      │   ┌───────▼─────────────────────▼─────┐
│  • kg_relationships │   │     BACKGROUND JOBS                │
│  • user_queries     │   │  (Inngest or Supabase Functions)   │
│  • pgvector indices │   │  • Transcript processing            │
│                     │   │  • Entity extraction                │
│  RLS Policies       │   │  • Embedding generation             │
│  • Role-based access│   │  • Graph construction               │
└─────────────────────┘   └─────────────────────────────────────┘
```

### Data Flow: Content Processing

```
1. Admin uploads transcript
   ↓
2. Store in content_sources (status: pending)
   ↓
3. Queue background job: process-transcript
   ↓
4. For each segment:
   a. Call Claude Sonnet 4: Extract entities, score relevance
   b. Call OpenAI: Generate embedding
   c. Store in content_segments + segment_relevance
   d. Link entities in segment_entities
   ↓
5. Build knowledge graph:
   a. Create/update entities in kg_entities
   b. Extract relationships → kg_relationships
   c. Generate entity embeddings
   ↓
6. Update content_sources (status: complete)
   ↓
7. Admin reviews and approves → status: published
```

### Data Flow: User Query

```
1. User enters query in search bar
   ↓
2. Frontend calls /api/query
   ↓
3. Backend:
   a. Authenticate user (Supabase Auth)
   b. Load user profile (role, experience level)
   c. Call Claude Sonnet 4: Understand intent, extract entities
   d. Call OpenAI: Generate query embedding
   ↓
4. Hybrid Search:
   a. Vector search: pgvector similarity (top 50)
   b. Graph expansion: Traverse relationships (depth 2)
   c. Profile filtering: Apply relevance threshold per role
   d. Ranking: Combine vector + graph + relevance + recency
   e. Top 20 results
   ↓
5. Response Generation:
   a. Call Claude Sonnet 4: Format for user role
   b. Include video timestamps
   c. Add related concepts
   d. Suggest follow-up queries
   ↓
6. Log query in user_queries table
   ↓
7. Stream response to frontend
   ↓
8. Display results with feedback UI
```

---

## Development Workflow

### Git Workflow

**Branches:**
- `main` - Production (protected, requires PR approval)
- `staging` - Pre-production testing
- `develop` - Integration branch
- `feature/*` - Feature development
- `fix/*` - Bug fixes

**Commit Message Format:**
```
[Session N] <type>: <description>

<optional body>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example:**
```
[Session 5] feat: implement profile-aware search filtering

- Add relevance threshold per user role
- Filter search results based on profile type
- Update RLS policies for content access

Closes #23
```

### Code Review Process

**Requirements:**
- All code must be reviewed before merging to `main`
- Reviewer checklist:
  - [ ] Code follows project conventions
  - [ ] Tests pass and coverage maintained
  - [ ] No security vulnerabilities
  - [ ] Performance considerations addressed
  - [ ] Documentation updated if needed

### Testing Strategy

**Unit Tests:**
- Entity extraction functions
- Relevance scoring logic
- Search ranking algorithms
- Auth utilities

**Integration Tests:**
- API endpoints (/api/query, /api/upload, etc.)
- Database queries with RLS
- Background job processing

**End-to-End Tests:**
- User signup and login flow
- Search and view results
- Admin upload and approve content
- Feedback submission

**Testing Tools:**
- Vitest for unit and integration tests
- React Testing Library for component tests
- Playwright for E2E tests (Phase 2)

---

## Infrastructure & DevOps

### Environments

**Development:**
- URL: localhost:3000
- Database: Local Supabase (Docker)
- AI APIs: Development keys with rate limits
- Purpose: Local development and testing

**Staging:**
- URL: staging.www.max.keyelements.co
- Database: Supabase staging project
- AI APIs: Staging keys
- Purpose: Pre-production testing, demo environment

**Production:**
- URL: www.max.keyelements.co
- Database: Supabase production project
- AI APIs: Production keys with higher limits
- Purpose: Live user environment

### Deployment Process

**Staging Deployment:**
1. Merge feature branch to `develop`
2. CI runs tests automatically
3. If tests pass, deploy to staging (Vercel auto-deploy)
4. Run smoke tests in staging
5. Notify team for manual testing

**Production Deployment:**
1. Create PR from `develop` to `main`
2. Code review and approval required
3. Merge to `main`
4. CI runs full test suite
5. If tests pass, deploy to production (Vercel auto-deploy)
6. Run smoke tests in production
7. Monitor for errors/issues
8. Notify stakeholders of deployment

### Monitoring & Alerting

**Metrics to Monitor:**
- Uptime (target: 99.5%)
- Response time (p50, p95, p99)
- Error rate
- Database query performance
- AI API usage and costs
- User engagement (DAU, queries per user)

**Alerting Rules:**
- Critical: Uptime <99%, error rate >5%, response time >10s
- Warning: Error rate >1%, response time >5s
- Info: New user signups, content uploads

**Tools:**
- Vercel Analytics for performance
- Sentry for error tracking
- Supabase Dashboard for database metrics
- Custom dashboard for business metrics

---

## Risk Management

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI API downtime | Medium | High | Retry logic, queue-based processing, status page |
| Poor search quality | Medium | High | Iterative prompt tuning, user feedback loop |
| Slow database queries | Low | Medium | Proper indexing, query optimization, caching |
| Security breach | Low | Critical | RLS policies, security audit, penetration testing |
| Data loss | Very Low | Critical | Daily backups, point-in-time recovery |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low user adoption | Medium | High | User interviews, onboarding optimization, training |
| Content coverage gaps | Medium | Medium | Query analysis, prioritize new content uploads |
| Insufficient differentiation | Low | Medium | A/B test relevance thresholds, user testing |
| Competitor emerges | Low | Medium | Focus on quality, rapid iteration, unique data |

### Mitigation Actions

**For AI API Downtime:**
- Implement circuit breaker pattern
- Queue jobs with retry logic (exponential backoff)
- Cache previous extractions for similar content
- Monitor API status proactively

**For Poor Search Quality:**
- Collect user feedback on every query
- Track click-through rate and dwell time
- A/B test different relevance thresholds
- Iterate on AI prompts based on data

**For Low User Adoption:**
- User interviews in weeks 1, 2, 4, 8
- Analyze drop-off points in funnel
- Create role-specific onboarding videos
- Implement in-app guidance and tooltips

---

## Budget & Resources

### Development Costs (16 weeks)

**Personnel:**
- Developer (full-time): $30,000 - $50,000 (contract or internal allocation)
- Product Owner (Alfa, part-time): Internal
- Subject Matter Expert (Dr. Soto, 2 hrs/week): Internal

**Infrastructure:**
- Supabase Pro: $25/month × 4 months = $100
- Vercel Pro: $20/month × 4 months = $80
- Domain (GoDaddy): $20/year
- Email service (SendGrid): $15/month × 4 months = $60
- Monitoring (Sentry): Free tier initially

**AI API Costs (Estimate):**
- Anthropic Claude Sonnet 4:
  - Processing 8 hours content: ~$50
  - User queries (500/day): ~$150/month
- OpenAI Embeddings:
  - Initial embedding generation: ~$20
  - Query embeddings: ~$30/month
- Total AI: ~$300 for development, ~$180/month post-launch

**Total Development Phase:** $30,000 - $50,000 + $560 + $300 = $31,000 - $51,000

### Ongoing Costs (Monthly)

**Infrastructure:**
- Supabase Pro: $25
- Vercel Pro: $20
- Email service: $15
- Monitoring: $0 (free tier) → $29 (paid tier later)

**AI APIs:**
- Claude Sonnet 4: ~$150 (500 queries/day)
- OpenAI Embeddings: ~$30
- Buffer for growth: ~$50

**Total Monthly:** ~$290 initially, scaling to ~$350 as usage grows

### ROI Considerations

**Value Created:**
- **Content Creation Efficiency:** Internal team saves 10+ hours/week finding source material
  - Time saved: 40 hours/month × $50/hr = $2,000/month
- **Sales Enablement:** Align reps answer doctor questions faster, improving conversion
  - Estimated value: Harder to quantify, but improves sales effectiveness
- **Education Access:** 100+ dental professionals gain on-demand access to expert knowledge
  - Value to members: Increased practice success, retention

**Break-Even Analysis:**
- Development cost: ~$40,000 (midpoint estimate)
- Monthly operating cost: ~$300
- Internal efficiency savings: ~$2,000/month
- Break-even: ~20 months from internal savings alone
- With external value (sales, education): Break-even likely within 12 months

---

## Success Factors

### Critical Success Factors

**1. Content Quality & Coverage**
- Must have comprehensive coverage of core topics
- Extraction accuracy must be high (>80%)
- Video timestamps must be accurate

**2. Search Relevance**
- Results must match user intent (>70% success rate)
- Role-based filtering must feel natural and helpful
- Response time must be fast (<5 seconds)

**3. User Experience**
- Interface must be intuitive (minimal training needed)
- Mobile experience must be excellent
- Empty states and errors must guide users effectively

**4. User Adoption**
- Onboarding must be smooth (>80% completion)
- Users must return weekly (>60% WAU rate)
- Positive word-of-mouth from early users

**5. Technical Stability**
- System must be reliable (>99% uptime)
- Security must be rock-solid (zero breaches)
- Performance must remain fast as content grows

### Key Performance Indicators (KPIs)

**Engagement:**
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Queries per user per session (target: 3+)
- Session duration (target: 5+ minutes)
- Weekly return rate (target: 60%+)

**Quality:**
- Query success rate (clicks + positive feedback) (target: 70%+)
- Average helpfulness rating (target: 4.0+/5.0)
- Content coverage (% of segments viewed at least once) (target: 80%+)
- Search result relevance (manual evaluation) (target: 90%+)

**Technical:**
- Uptime (target: 99.5%+)
- Average response time (target: <5 seconds)
- Error rate (target: <1%)
- Database query performance (p95 <500ms)

**Business:**
- Total users (target: 200+ by month 6)
- User distribution across roles (balanced representation)
- Content utilization (all major topics covered)
- Feature adoption (users using advanced features)

---

## Stakeholder Communication

### Weekly Updates (During Development)

**Audience:** Alfa, Dr. Soto, Key stakeholders  
**Format:** Email or Slack update  
**Content:**
- Progress this week (features completed, tasks done)
- Blockers or risks identified
- Next week's goals
- Screenshots or demo link if applicable

**Schedule:** Every Friday EOD

### Monthly Reviews (Post-Launch)

**Audience:** Alfa, Dr. Soto, Key Elements leadership  
**Format:** 30-minute video call + dashboard walkthrough  
**Content:**
- Key metrics review (engagement, quality, technical)
- User feedback highlights
- Content gap analysis
- Roadmap updates
- Budget and resource needs

**Schedule:** First Monday of each month

### User Feedback Sessions

**Audience:** 2-3 users from each profile type  
**Format:** 30-minute 1-on-1 interviews or surveys  
**Content:**
- What's working well?
- What's frustrating?
- What features are missing?
- How often do you use Max RAG?
- Would you recommend it to colleagues?

**Schedule:** 
- Week 2 (beta testing)
- Week 4 (pre-launch)
- Week 6 (post-launch)
- Week 10 (post-launch)
- Then quarterly

---

## Dependencies & Assumptions

### External Dependencies

**Third-Party Services:**
- Anthropic API availability and pricing stability
- OpenAI API availability and pricing stability
- Supabase uptime and performance
- Vercel deployment platform
- Email service (SendGrid/Resend) deliverability

**Content:**
- Dr. Soto's availability for content validation (2 hours/week)
- Transcript quality and formatting consistency
- Zoom video accessibility and permissions

### Assumptions

**Technical:**
- Claude Sonnet 4 extraction quality remains high
- Supabase can scale to 100+ concurrent users
- pgvector performance is adequate for 10,000+ segments
- Vercel serverless functions handle AI API latency well

**Business:**
- Users have basic technical literacy (can use search)
- Dental professionals value on-demand expert knowledge
- Align reps will actively use tool for doctor questions
- Key Elements membership continues to grow

**Organizational:**
- Alfa available for daily decision-making
- Development resources remain allocated to project
- Budget approved for AI API costs
- Domain and hosting permissions granted

---

## Contingency Plans

### If Search Quality is Poor

**Symptoms:**
- Low click-through rate on results
- High "not helpful" feedback rate
- Users stop using platform after a few tries

**Actions:**
1. Analyze queries with poor results
2. Review and adjust AI prompts
3. Lower or raise relevance thresholds per role
4. Add more content to fill gaps
5. Consider hybrid search weight adjustments
6. Manual review of entity extractions

### If User Adoption is Low

**Symptoms:**
- <50% of invited users activate accounts
- Low query volume (<1 per user per week)
- Users don't return after first session

**Actions:**
1. User interviews to understand barriers
2. Simplify onboarding flow
3. Create more training materials
4. Add in-app guidance and tooltips
5. Email campaigns highlighting value
6. Identify and address specific pain points

### If AI API Costs Exceed Budget

**Symptoms:**
- Monthly AI costs >$500
- Costs growing faster than user growth

**Actions:**
1. Implement more aggressive caching
2. Batch API calls where possible
3. Switch to cheaper models for some tasks (Gemini)
4. Optimize prompts to reduce token usage
5. Consider rate limiting per user
6. Evaluate alternative AI providers

### If Performance Degrades

**Symptoms:**
- Query response time >10 seconds
- Database queries slow (>1 second)
- User complaints about slowness

**Actions:**
1. Add database indexes
2. Implement query result caching (Redis)
3. Optimize vector search (reduce top-K)
4. Use database read replicas
5. Profile and optimize slow queries
6. Consider scaling infrastructure

---

## Documentation Plan

### Technical Documentation

**Architecture Docs:**
- System architecture diagram
- Data flow diagrams
- Database schema with relationships
- API endpoint documentation
- Authentication and authorization flow

**Developer Docs:**
- Setup guide (local development)
- Coding conventions and style guide
- Testing guidelines
- Deployment process
- Troubleshooting common issues

**AI Integration Docs:**
- Prompt templates and versioning
- Entity extraction guidelines
- Relevance scoring methodology
- Graph traversal algorithms
- Model selection decision tree

### User Documentation

**User Guides (per role):**
- Getting started (signup, first query)
- How to search effectively
- Understanding results and relevance
- Video timestamp navigation
- Profile settings and preferences

**Admin Manual:**
- User management (invite, deactivate)
- Content upload process
- Review and approval workflow
- Analytics dashboard walkthrough
- Troubleshooting user issues

**Training Materials:**
- Video tutorials (5-10 minutes per role)
- Quick-start cheat sheets
- FAQ document
- Best practices guide

---

## Appendices

### A. Technology Stack Details

**Frontend:**
- Next.js 14.2.0+
- React 18.3.0+
- TypeScript 5.4.0+
- Tailwind CSS 3.4.0+
- shadcn/ui components
- Framer Motion 11.0.0+ (animations)
- React Hook Form 7.50.0+ (forms)
- Zod 3.22.0+ (validation)

**Backend:**
- Node.js 20+ (Vercel runtime)
- Supabase Client 2.39.0+
- Supabase Edge Functions (Deno runtime)

**Database:**
- PostgreSQL 15+ (Supabase)
- pgvector extension 0.6.0+

**AI & ML:**
- @anthropic-ai/sdk 0.20.0+
- @google/generative-ai 0.2.0+
- openai 4.28.0+

**Development:**
- pnpm 8.15.0+
- ESLint 8.57.0+
- Prettier 3.2.0+
- Vitest 1.3.0+
- React Testing Library 14.2.0+

### B. Database Migration Strategy

**Version Control:**
- All schema changes in version-controlled SQL files
- Migration files numbered sequentially: `001_initial_schema.sql`, `002_add_user_queries.sql`
- Use Supabase migrations or custom migration tool

**Testing:**
- Test migrations on local database first
- Apply to staging environment
- Validate data integrity
- Apply to production with backups ready

**Rollback Plan:**
- Keep rollback scripts for each migration
- Test rollback on staging before production
- Point-in-time recovery as last resort

### C. Security Checklist

**Before Launch:**
- [ ] All API keys in environment variables (not code)
- [ ] RLS policies tested and verified
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection enabled
- [ ] HTTPS enforced everywhere
- [ ] Secure cookie settings (httpOnly, secure, sameSite)
- [ ] Rate limiting implemented
- [ ] User input validation (frontend and backend)
- [ ] Error messages don't leak sensitive info
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Dependencies scanned for vulnerabilities
- [ ] Penetration testing completed
- [ ] Privacy policy and terms of service published

### D. Content Upload Checklist

**For Each New Lecture:**
1. [ ] Obtain transcript with timestamps
2. [ ] Verify timestamp format consistency
3. [ ] Collect source metadata (title, date, speaker, type, Zoom URL)
4. [ ] Upload via admin interface
5. [ ] Monitor processing status
6. [ ] Review AI-generated metadata (spot check 5-10 segments)
7. [ ] Validate extracted entities against controlled vocabulary
8. [ ] Test sample queries that should match this content
9. [ ] Verify video timestamp links work
10. [ ] Approve for publication

---

**Document Owner:** Alfa  
**Contributors:** Development Team, Dr. Karla Soto  
**Review Cycle:** Weekly during development, monthly post-launch  
**Version History:**
- v1.0 (2025-11-07): Initial planning document