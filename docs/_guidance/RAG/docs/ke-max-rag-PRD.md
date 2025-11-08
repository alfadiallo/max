# Max RAG - Product Requirements Document (PRD)

**Project:** Max RAG Knowledge Platform  
**Domain:** www.max.keyelements.co  
**Version:** 1.0  
**Date:** 2025-11-07  
**Status:** Planning Phase

---

## Executive Summary

**Max RAG** is a Graph RAG-powered knowledge platform that transforms Dr. Karla Soto's dental education video lectures into a searchable, role-based learning system. The platform serves internal Key Elements teams and external users (Align reps, dentists, dental assistants, hygienists, treatment coordinators) with personalized, conversational access to 8+ hours of transcribed educational content.

### Key Differentiators
- **Role-based content filtering:** Same content, different views per user profile
- **Graph RAG architecture:** Semantic search + knowledge graph traversal
- **Video timestamp integration:** Jump directly to relevant lecture moments
- **AI-powered metadata:** Automated relevance scoring and entity extraction
- **Conversational interface:** Natural language queries, not keyword search

---

### Implementation Status — 2025-11-08

- **RAG Submission Workflow:** Editors can push any H-version directly to the queue; `rag_submit_transcript` normalizes transcripts and enqueues jobs.
- **Automated Processing:** `process_rag_queue` runs on Supabase Edge Functions, generates OpenAI embeddings, and writes `content_segments` + `segment_relevance`.
- **Search Experience:** `/rag` page uses the new `match_rag_content` RPC and logs queries in `user_queries`; Claude synthesis consumes the same segments.
- **Observability:** `/admin/rag` dashboard tracks queue depth, processed segments, graph entity counts, and recent queries (with transcript usage rollups).
- **Next Up:** Knowledge graph extraction (entities/relationships) and richer answer formatting remain in-flight.

---

## Product Vision

**Mission Statement:**  
*"Make Dr. Soto's dental education expertise instantly accessible to the right person, in the right format, at the right time."*

**Success Metrics:**
- User engagement: Average 3+ queries per session
- Content discovery: 80% of segments viewed at least once within 90 days
- Query satisfaction: 4.5+/5 average helpfulness rating
- Time to answer: <10 seconds from query to first useful result
- Role accuracy: 90%+ of responses appropriate for user profile

---

## Target Users & Use Cases

### 1. Internal Team (Content Creators)

**Profile:**
- Marketing team, content writers, social media managers
- Need: Source material for campaigns, blog posts, email sequences

**Primary Use Cases:**
- UC1.1: Find quotes for social media posts
- UC1.2: Extract content for blog articles
- UC1.3: Create email newsletter content
- UC1.4: Pull video clips for promotional materials
- UC1.5: Cross-reference concepts across multiple lectures

**Success Criteria:**
- Find relevant content in <2 minutes
- Export content with proper source attribution
- Access raw transcripts and video timestamps
- Edit metadata and tag new content

---

### 2. Align Technology Representatives

**Profile:**
- Sales and education support professionals
- Need: Help doctors understand Key Elements methodology
- Context: Customer-facing, non-clinical audience

**Primary Use Cases:**
- UC2.1: Answer doctor questions about pre-restorative alignment ROI
- UC2.2: Find case presentation strategies
- UC2.3: Get talking points for practice consultations
- UC2.4: Share educational resources with doctors
- UC2.5: Understand workflow integration challenges

**Success Criteria:**
- Receive sales-appropriate content (no internal strategy)
- Get curated answers, not raw transcripts
- Access shareable resources (PDFs, video links)
- Find before/after case examples
- Overcome common objections with scripted responses

---

### 3. Dentists (Treatment Providers)

**Profile:**
- General dentists, cosmetic dentists, prosthodontists
- Experience levels: Beginner to advanced
- Need: Clinical guidance, treatment planning, technique refinement

**Primary Use Cases:**
- UC3.1: Learn crown preparation protocols
- UC3.2: Understand pre-restorative alignment indications
- UC3.3: Master facial-driven smile design workflow
- UC3.4: Troubleshoot clinical challenges
- UC3.5: Stay current with Key Elements methodology updates

**Success Criteria:**
- Receive clinically detailed, evidence-based guidance
- Access step-by-step protocols with video demonstrations
- Find prerequisite knowledge when needed
- Get material selection and technique recommendations
- See integration with digital workflow tools

---

### 4. Dental Assistants (Chairside Support)

**Profile:**
- Clinical support staff, treatment coordinators (clinical role)
- Need: Setup procedures, 4-handed dentistry, material preparation

**Primary Use Cases:**
- UC4.1: Learn proper setup for crown preparation procedures
- UC4.2: Master retraction cord placement technique
- UC4.3: Understand impression taking assistance
- UC4.4: Anticipate dentist needs during procedures
- UC4.5: Prepare materials and instruments efficiently

**Success Criteria:**
- Receive procedural checklists and timing sequences
- Access chairside efficiency tips
- Find setup diagrams and material lists
- Learn doctor preferences and workflow patterns
- Get video demonstrations of assistance techniques

---

### 5. Dental Hygienists (Prevention Specialists)

**Profile:**
- Oral health educators, preventive care providers
- Need: Patient education, maintenance protocols, health implications

**Primary Use Cases:**
- UC5.1: Understand periodontal implications of restorative work
- UC5.2: Learn patient education for crown/veneer maintenance
- UC5.3: Master home care instructions for restored teeth
- UC5.4: Identify signs of restoration problems during hygiene visits
- UC5.5: Coordinate with dentist on patient health concerns

**Success Criteria:**
- Receive patient-education-ready language
- Access home care instruction scripts
- Find maintenance protocols for different restoration types
- Learn what to monitor during hygiene appointments
- Get preventive care recommendations

---

### 6. Treatment Coordinators (Case Presentation)

**Profile:**
- Front office, financial coordinators, case presentation specialists
- Need: Patient communication strategies, case acceptance techniques

**Primary Use Cases:**
- UC6.1: Learn how to present treatment value to patients
- UC6.2: Master case acceptance strategies
- UC6.3: Overcome common patient objections
- UC6.4: Explain treatment timelines and processes
- UC6.5: Present financial options effectively

**Success Criteria:**
- Receive conversation scripts and talking points
- Access before/after cases for patient presentations
- Find value framing language (not just cost)
- Learn objection handling techniques
- Get patient communication best practices

---

## Core Features & Requirements

### F1: User Authentication & Access Control

**F1.1: Invitation-Based User Provisioning**
- Admin invites users via email address
- System generates secure invitation link with 7-day expiration
- New user completes profile during first login
- Password requirements: 12+ chars, mixed case, numbers, symbols

**F1.2: Role-Based Access Control (RBAC)**
- Roles: `internal`, `align_rep`, `dentist`, `dental_assistant`, `hygienist`, `treatment_coordinator`
- Content visibility controlled by user role
- Row-Level Security (RLS) in Supabase enforces access rules
- Admin dashboard for user management

**F1.3: Profile Completion**
- Required fields: Full name, role, organization
- Optional fields: Experience level, specializations, practice type
- Profile data drives content personalization
- Update profile anytime from settings

**F1.4: Password Management**
- Forgot password flow with email reset link
- Force password reset on first login
- Optional: 2FA for admin accounts (Phase 2)

**F1.5: Session Management**
- 30-day session duration with auto-refresh
- "Remember me" option
- Logout from all devices option

**Technical Requirements:**
- Supabase Auth for authentication
- PostgreSQL RLS for authorization
- Email service for invitations (SendGrid/Resend)
- Secure token generation (JWT)

---

### F2: Content Ingestion & Processing

**F2.1: Transcript Upload Interface (Admin)**
- Upload transcript file (JSON/TXT format with timestamps)
- Metadata form: Title, date, speaker, source type, Zoom URL, duration
- Bulk upload support (multiple lectures at once)
- Draft/Published status toggle

**F2.2: Automated AI Processing**
- Entity extraction (procedures, concepts, anatomy, materials, tools)
- Relevance scoring per user profile (0-100 scale)
- Content classification (procedure/philosophy/case_study/etc.)
- Controlled vocabulary matching and updates
- Knowledge graph relationship building
- **Status (2025-11-08):** Worker deployed (`process_rag_queue`) with OpenAI embeddings + `segment_relevance`; KG enrichment pending (planned for next iteration).

**F2.3: Segment Storage**
- Store segments with timestamps in `content_segments` table
- Generate embeddings (OpenAI ada-002 or text-embedding-3-large)
- Link segments to source lectures
- Index for vector similarity search
- **Status:** `content_segments` live with embeddings populated during queue processing.

**F2.4: Processing Status Dashboard**
- View processing status (pending/processing/complete/error)
- See extraction confidence scores
- Review flagged segments requiring human attention
- Approve/publish content batches
- **Status:** `/admin/rag` dashboard shipped (queue depth, processed vs. queued, error visibility).

**Technical Requirements:**
- Claude Sonnet 4 for entity extraction and metadata generation
- Gemini 2.0 Flash for transcripts >150K tokens
- OpenAI API for embeddings
- Supabase for storage with pgvector extension
- Background job queue (Supabase Edge Functions or Inngest)

**Input Format:**
```json
{
  "source": {
    "title": "Digital Workflow Integration",
    "date": "2024-10-15",
    "speaker": "Dr. Karla Soto",
    "type": "virtual_lecture",
    "zoom_url": "https://zoom.us/rec/share/abc123",
    "duration_seconds": 5025
  },
  "segments": [
    {
      "sequence_number": 1,
      "text": "Welcome everyone...",
      "start_time": "00:00:15",
      "end_time": "00:02:34"
    }
  ]
}
```

---

### F3: Knowledge Graph Construction

**F3.1: Entity Management**
- Store entities in `kg_entities` table
- Canonical names with aliases
- Entity types: concept, procedure, anatomy, material, tool, key_elements_term
- Entity embeddings for semantic similarity

**F3.2: Relationship Graph**
- Relationship types: PREREQUISITE_OF, RELATED_TO, USED_IN, PART_OF, AFFECTS, CONTRASTS_WITH, DEMONSTRATES, EXPLAINS, MENTIONS
- Strength scoring (0.0-1.0)
- Bidirectional traversal support
- Context preservation (why relationship exists)

**F3.3: Segment-Entity Linking**
- Many-to-many relationship via `segment_entities` table
- Relevance score per entity-segment pair
- Mention type (primary/secondary/passing)

**F3.4: Concept Clustering**
- Identify related concept groups
- Cross-lecture concept tracking
- Prerequisite chain detection
- Learning pathway generation (Phase 2)

**Technical Requirements:**
- PostgreSQL for graph storage
- Recursive CTEs for graph traversal
- Materialized views for common paths
- Indexes on entity and relationship lookups

---

### F4: Search & Retrieval System

**F4.1: Conversational Search Interface**
- Prominent search bar on all pages
- Natural language query input
- Streaming response (show results as they arrive)
- Voice input support (Phase 2)

**F4.2: Hybrid Search Strategy**
- Vector similarity search (embedding-based)
- Graph traversal (relationship-based)
- Keyword matching (fallback)
- Combined ranking algorithm

**F4.3: Profile-Aware Filtering**
- Automatic filtering based on user role
- Relevance threshold per profile type
- Content type preferences
- Experience level matching

**F4.4: Query Understanding**
- Extract intent (definition/procedure/troubleshooting/etc.)
- Identify key entities
- Determine implicit needs based on role
- Expand query with related concepts

**F4.5: Response Generation**
- Role-specific formatting (protocols for dentists, scripts for coordinators)
- Include video timestamps for visual demonstrations
- Link to related concepts
- Suggest follow-up queries
- Cite sources (lecture title, date)

**Technical Requirements:**
- OpenAI embeddings for query vectorization
- Supabase pgvector for similarity search
- Claude Sonnet 4 for response generation
- Caching layer (Redis or Supabase cache) for common queries

**Search Query Flow:**
```
User Query
  ↓
Query Understanding (Claude) → Extract entities, intent
  ↓
Vector Search (pgvector) → Find similar segments
  ↓
Graph Expansion → Traverse related concepts
  ↓
Profile Filtering → Apply role-based relevance threshold
  ↓
Ranking & Reranking → Combine vector + graph + recency scores
  ↓
Response Generation (Claude) → Format for user role
  ↓
Display Results → Show answer + sources + related concepts
```

---

### F5: Query History & Analytics

**F5.1: Query Logging**
- Store every user query with timestamp
- Track which segments were returned
- Log which results user clicked
- Record user feedback (helpful/not helpful)
- Associate queries with user profile
- **Status (2025-11-08):** Implemented via `user_queries` insert in `/api/insight/rag-search`; dashboard renders latest queries.

**F5.2: User Query History**
- View past queries in profile
- Re-run previous queries
- Export query history
- Delete query history (privacy control)

**F5.3: Admin Analytics Dashboard**
- Most common queries per role
- Query success rate (clicks + feedback)
- Content coverage (which segments are never retrieved)
- User engagement metrics
- Knowledge gaps identification
- **Status:** `/admin/rag` v1 shows queue metrics, indexed segment count, recent queries, and top-used transcripts.

**F5.4: Content Performance Tracking**
- Views per segment
- Helpfulness ratings per segment
- Most referenced video timestamps
- Underutilized content flagging

**Technical Requirements:**
- `user_queries` table with full-text search
- `user_query_clicks` table for engagement tracking
- `user_feedback` table for ratings
- Analytics views and aggregations
- Privacy: 90-day query retention, anonymize after

**Schema:**
```sql
CREATE TABLE user_queries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536),
  intent VARCHAR(50),
  extracted_entities JSONB,
  
  -- Response metadata
  segments_returned UUID[],
  total_results INTEGER,
  response_time_ms INTEGER,
  
  -- User interaction
  segments_clicked UUID[],
  time_to_first_click_ms INTEGER,
  feedback VARCHAR(50), -- 'helpful', 'not_helpful', null
  feedback_comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queries_user ON user_queries(user_id);
CREATE INDEX idx_queries_created ON user_queries(created_at);
CREATE INDEX idx_queries_embedding ON user_queries USING ivfflat (query_embedding vector_cosine_ops);
```

---

### F6: Video Integration

**F6.1: Zoom Video Linking (Phase 1)**
- Store Zoom recording URL per lecture
- Display video link in search results
- Show timestamp reference in text format
  - Example: "See demonstration at 00:23:45"
- Click to open Zoom in new tab

**F6.2: Embedded Video Player (Phase 2)**
- Embed Zoom player directly in results
- Deep link to specific timestamp
- Play inline without leaving platform
- Closed captioning support

**F6.3: Video Clip Extraction (Future)**
- Generate shareable clips for specific segments
- Download clips for presentations
- Automatic thumbnail generation

**Technical Requirements:**
- Zoom OAuth for video access (Phase 2)
- Video player embed permissions
- Timestamp URL parameter support
- CDN for video delivery optimization

---

### F7: User Interface & Experience

**F7.1: Portal Layout**

**Landing Page (After Login):**
```
┌─────────────────────────────────────────────────────────┐
│  Max RAG                                   [User Avatar] │
│  Key Elements Knowledge Platform                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🔍  Ask Max RAG anything...                            │
│      ┌──────────────────────────────────────────────┐  │
│      │  How do I prepare anterior teeth for veneers?│  │
│      └──────────────────────────────────────────────┘  │
│                                            [Search →]    │
│                                                          │
│  ──────────────────────────────────────────────────────│
│                                                          │
│  📚 Explore by Topic                                    │
│  [Crown Prep] [Impressions] [Aligners] [Smile Design]  │
│                                                          │
│  🎬 Recent Lectures                                     │
│  • Digital Workflow Integration (Oct 2024)              │
│  • Patient Communication Mastery (Sep 2024)             │
│  • Advanced Margin Design (Aug 2024)                    │
│                                                          │
│  ⭐ Recommended for You (Based on Role: Dentist)        │
│  • Pre-Restorative Alignment Indications                │
│  • Facial-Driven Treatment Planning                     │
│  • Material Selection for Anterior Restorations         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Search Results Page:**
```
┌─────────────────────────────────────────────────────────┐
│  ←  Max RAG                                [User Avatar] │
├─────────────────────────────────────────────────────────┤
│  Query: "crown preparation anterior teeth"              │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                          │
│  💡 Direct Answer                                       │
│                                                          │
│  For anterior crown preparation, follow this protocol:  │
│                                                          │
│  1. Occlusal Reduction: 1.5-2mm clearance               │
│     • Use depth cutter to verify reduction               │
│     • Maintain incisal edge anatomy when possible        │
│                                                          │
│  2. Axial Reduction: 1-1.5mm with 6° taper             │
│     • Chamfer finish line for all-ceramic restorations  │
│     • Avoid sharp line angles                            │
│                                                          │
│  3. Gingival Margin: 0.5mm subgingival for esthetics   │
│     • Supragingival on facial if tissue is thin          │
│                                                          │
│  [📹 Watch Full Demonstration: 15:32-22:18]             │
│                                                          │
│  ──────────────────────────────────────────────────────│
│                                                          │
│  📖 Source Material (3 segments from 2 lectures)        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🎥 Advanced Crown Preparation                     │  │
│  │    Dr. Karla Soto • March 2024 • Virtual Lecture │  │
│  │    [15:32 - 18:45]                                │  │
│  │                                                    │  │
│  │ "The key to anterior crown prep is preserving    │  │
│  │  as much tooth structure as possible while       │  │
│  │  achieving adequate reduction..."                 │  │
│  │                                                    │  │
│  │  [🎬 Jump to video]  [📋 Copy text]              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  💡 Related Concepts                                    │
│     • Margin Design Principles                           │
│     • Impression Techniques for Anterior Teeth           │
│     • Temporary Fabrication for Esthetics                │
│                                                          │
│  🔍 Related Queries You Might Ask                       │
│     • "What materials work best for anterior crowns?"    │
│     • "How to handle tight gingival margins?"            │
│     • "Temporary crown techniques for anterior teeth"    │
│                                                          │
│  ──────────────────────────────────────────────────────│
│                                                          │
│  Was this helpful?  [👍 Yes]  [👎 No]                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**F7.2: Responsive Design**
- Mobile-first design approach
- Tablet and desktop optimized layouts
- Touch-friendly interface elements
- Progressive Web App (PWA) support

**F7.3: Accessibility**
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- High contrast mode
- Font size adjustment

**F7.4: Visual Design System**
- Key Elements brand colors and typography
- Consistent component library
- Loading states and skeletons
- Empty states with helpful guidance
- Error states with recovery suggestions

**Technical Requirements:**
- Next.js 14+ with App Router
- React 18+ with Server Components
- Tailwind CSS for styling
- shadcn/ui for component library
- Framer Motion for animations (subtle)

---

### F8: Admin Dashboard

**F8.1: User Management**
- View all users (searchable, filterable)
- Invite new users (bulk invite support)
- Edit user roles and permissions
- Deactivate/reactivate accounts
- View user activity logs

**F8.2: Content Management**
- Upload new transcripts
- View processing status
- Review AI-generated metadata
- Approve content for publication
- Edit segment metadata manually (override AI)
- Delete or archive old content

**F8.3: Controlled Vocabulary Management**
- View all entities (procedures, concepts, anatomy, etc.)
- Merge duplicate entities
- Add canonical terms and aliases
- Deprecate outdated terminology
- Review AI-proposed new terms

**F8.4: Analytics & Insights**
- User engagement metrics
- Popular queries by role
- Content coverage heatmap
- Knowledge gaps report
- Query success rate
- System performance metrics

**F8.5: System Configuration**
- Feature flags (enable/disable features)
- API key management
- Processing queue management
- Cache invalidation
- Email template editing

**Technical Requirements:**
- Admin-only routes with authentication check
- Role verification: `user.role === 'internal' && user.is_admin === true`
- Data tables with sorting, filtering, pagination
- Bulk operations support
- Audit logging for all admin actions

---

## Data Architecture

### Database Schema (Supabase PostgreSQL)

**Core Tables:**

```sql
-- User authentication and profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  
  -- Role and permissions
  role VARCHAR(50) NOT NULL, -- 'internal' or 'external'
  external_type VARCHAR(50), -- 'align_rep', 'dentist', 'dental_assistant', 'hygienist', 'treatment_coordinator'
  is_admin BOOLEAN DEFAULT false,
  
  -- Profile context
  organization VARCHAR(255),
  experience_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  specializations TEXT[],
  member_tier VARCHAR(50), -- 'basic', 'premium', null
  
  -- Account management
  account_status VARCHAR(50) DEFAULT 'active', -- 'pending', 'active', 'suspended'
  invited_by UUID REFERENCES auth.users(id),
  profile_completed BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User invitations
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  external_type VARCHAR(50),
  organization VARCHAR(255),
  invited_by UUID REFERENCES auth.users(id),
  invitation_token VARCHAR(255) UNIQUE,
  
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content sources (lectures, videos)
CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source metadata
  title VARCHAR(500) NOT NULL,
  speaker VARCHAR(255) DEFAULT 'Dr. Karla Soto',
  source_type VARCHAR(50) NOT NULL, -- 'in_person_lecture', 'virtual_lecture', 'how_to_video', 'webinar'
  event_date DATE,
  duration_seconds INTEGER,
  
  -- Video reference
  zoom_url TEXT,
  video_platform VARCHAR(50) DEFAULT 'zoom', -- Future: 'youtube', 'vimeo'
  
  -- Access control
  visibility_internal BOOLEAN DEFAULT true,
  visibility_align_reps BOOLEAN DEFAULT false,
  visibility_members BOOLEAN DEFAULT false,
  member_tier_required VARCHAR(50),
  
  -- Processing status
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'complete', 'error', 'published'
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_error TEXT,
  
  -- Approval workflow
  proofread_by UUID REFERENCES auth.users(id),
  proofread_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content segments (chunked transcript)
CREATE TABLE content_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES content_sources(id) ON DELETE CASCADE,
  
  -- Segment content
  segment_text TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  
  -- Timestamps
  start_timestamp INTERVAL NOT NULL, -- Converted from "00:15:32"
  end_timestamp INTERVAL NOT NULL,
  duration_seconds INTEGER,
  
  -- Embeddings for vector search
  embedding VECTOR(1536), -- OpenAI ada-002 or text-embedding-3-large
  
  -- Language support (future)
  language_code VARCHAR(10) DEFAULT 'en',
  
  -- Processing metadata
  entity_extraction_complete BOOLEAN DEFAULT false,
  extraction_confidence FLOAT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_id, sequence_number)
);

-- Profile-based relevance scores
CREATE TABLE segment_relevance (
  segment_id UUID PRIMARY KEY REFERENCES content_segments(id) ON DELETE CASCADE,
  
  -- Relevance scores (0-100) per profile type
  relevance_dentist FLOAT DEFAULT 0,
  relevance_dental_assistant FLOAT DEFAULT 0,
  relevance_hygienist FLOAT DEFAULT 0,
  relevance_treatment_coordinator FLOAT DEFAULT 0,
  relevance_align_rep FLOAT DEFAULT 0,
  
  -- Content classification
  content_type VARCHAR(50), -- 'procedure', 'philosophy', 'case_study', 'troubleshooting', 'patient_communication', 'team_coordination'
  clinical_complexity VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  primary_focus TEXT,
  
  -- Topics for filtering
  topics TEXT[],
  
  -- Minimum experience to view (null = all levels)
  min_experience_level VARCHAR(50),
  
  -- AI processing metadata
  extraction_model VARCHAR(50), -- 'claude-sonnet-4', 'gemini-2.0-flash'
  extraction_confidence FLOAT,
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge graph: Entities
CREATE TABLE kg_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity identification
  entity_type VARCHAR(50) NOT NULL, -- 'concept', 'procedure', 'anatomy', 'material', 'tool', 'key_elements_term'
  canonical_name VARCHAR(255) NOT NULL,
  aliases TEXT[],
  
  -- Entity metadata
  definition TEXT,
  domain VARCHAR(100), -- 'endodontics', 'prosthodontics', 'orthodontics', 'cosmetic', 'general'
  complexity_level INTEGER, -- 1-5
  
  -- Embedding for semantic similarity
  embedding VECTOR(1536),
  
  -- Usage statistics
  mention_count INTEGER DEFAULT 0,
  last_mentioned_at TIMESTAMPTZ,
  
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(entity_type, canonical_name)
);

-- Knowledge graph: Relationships
CREATE TABLE kg_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship structure
  source_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  target_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'PREREQUISITE_OF', 'RELATED_TO', 'USED_IN', etc.
  
  -- Relationship strength
  strength FLOAT DEFAULT 1.0, -- 0.0-1.0
  confidence FLOAT DEFAULT 1.0, -- AI extraction confidence
  
  -- Context
  context TEXT, -- Why this relationship exists
  source_segment_id UUID REFERENCES content_segments(id), -- Where relationship was found
  
  -- Validation
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Segment to entity mapping
CREATE TABLE segment_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES content_segments(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
  
  -- Relevance of entity to segment
  relevance_score FLOAT DEFAULT 1.0, -- 0.0-1.0
  mention_type VARCHAR(50) DEFAULT 'primary', -- 'primary', 'secondary', 'passing'
  
  extraction_confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(segment_id, entity_id)
);

-- User queries and search history
CREATE TABLE user_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Query data
  query_text TEXT NOT NULL,
  query_embedding VECTOR(1536),
  
  -- Query understanding (AI-extracted)
  intent VARCHAR(50), -- 'seeking_definition', 'seeking_procedure', etc.
  extracted_entities JSONB,
  
  -- Response metadata
  segments_returned UUID[],
  total_results INTEGER,
  response_time_ms INTEGER,
  
  -- User interaction
  segments_clicked UUID[],
  time_to_first_click_ms INTEGER,
  session_duration_ms INTEGER,
  
  -- Feedback
  feedback VARCHAR(50), -- 'helpful', 'not_helpful', null
  feedback_comment TEXT,
  feedback_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Controlled vocabulary (canonical terms)
CREATE TABLE controlled_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  category VARCHAR(50) NOT NULL, -- 'procedure', 'concept', 'anatomy', 'material', 'tool'
  canonical_term VARCHAR(255) NOT NULL,
  aliases TEXT[],
  definition TEXT,
  
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  added_by VARCHAR(50) DEFAULT 'ai', -- 'ai' or 'manual'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  deprecated BOOLEAN DEFAULT false,
  replaced_by UUID REFERENCES controlled_vocabulary(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(category, canonical_term)
);

-- System audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL, -- 'user_invited', 'content_uploaded', 'segment_edited', etc.
  entity_type VARCHAR(50), -- 'user', 'content_source', 'segment', etc.
  entity_id UUID,
  
  changes JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes for Performance:**

```sql
-- Vector search indexes
CREATE INDEX idx_segments_embedding ON content_segments USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_entities_embedding ON kg_entities USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_queries_embedding ON user_queries USING ivfflat (query_embedding vector_cosine_ops);

-- Lookup indexes
CREATE INDEX idx_segments_source ON content_segments(source_id);
CREATE INDEX idx_segments_sequence ON content_segments(source_id, sequence_number);
CREATE INDEX idx_relationships_source ON kg_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON kg_relationships(target_entity_id);
CREATE INDEX idx_segment_entities_segment ON segment_entities(segment_id);
CREATE INDEX idx_segment_entities_entity ON segment_entities(entity_id);
CREATE INDEX idx_queries_user ON user_queries(user_id);
CREATE INDEX idx_queries_created ON user_queries(created_at);

-- Full-text search indexes
CREATE INDEX idx_segments_text_search ON content_segments USING gin(to_tsvector('english', segment_text));
CREATE INDEX idx_entities_name_search ON kg_entities USING gin(to_tsvector('english', canonical_name || ' ' || array_to_string(aliases, ' ')));

-- Filtering indexes
CREATE INDEX idx_sources_status ON content_sources(processing_status);
CREATE INDEX idx_sources_visibility ON content_sources(visibility_internal, visibility_align_reps, visibility_members);
CREATE INDEX idx_profiles_role ON user_profiles(role, external_type);
```

**Row-Level Security Policies:**

```sql
-- Enable RLS on all user-facing tables
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_queries ENABLE ROW LEVEL SECURITY;

-- Internal users see everything
CREATE POLICY "internal_full_access" ON content_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'internal'
        AND account_status = 'active'
    )
  );

-- External users see role-appropriate content
CREATE POLICY "external_role_based_access" ON content_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN segment_relevance sr ON sr.segment_id = content_segments.id
      JOIN content_sources cs ON cs.id = content_segments.source_id
      WHERE up.id = auth.uid()
        AND up.account_status = 'active'
        AND cs.processing_status = 'published'
        AND (
          (up.external_type = 'dentist' AND sr.relevance_dentist >= 50)
          OR (up.external_type = 'dental_assistant' AND sr.relevance_dental_assistant >= 50)
          OR (up.external_type = 'hygienist' AND sr.relevance_hygienist >= 50)
          OR (up.external_type = 'treatment_coordinator' AND sr.relevance_treatment_coordinator >= 50)
          OR (up.external_type = 'align_rep' AND sr.relevance_align_rep >= 50)
        )
    )
  );

-- Users can only see their own queries
CREATE POLICY "users_own_queries" ON user_queries
  FOR ALL
  USING (user_id = auth.uid());

-- Admins can see all queries
CREATE POLICY "admins_all_queries" ON user_queries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND is_admin = true
    )
  );
```

---

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript 5+
- **UI Library:** React 18+
- **Styling:** Tailwind CSS 3+
- **Components:** shadcn/ui
- **State Management:** React Context + Server Components
- **Forms:** React Hook Form + Zod validation
- **Animations:** Framer Motion (subtle)

### Backend
- **Database:** Supabase (PostgreSQL 15+)
- **Authentication:** Supabase Auth
- **Vector Search:** pgvector extension
- **Storage:** Supabase Storage (for future file uploads)
- **Edge Functions:** Supabase Edge Functions (Deno runtime)

### AI & ML
- **Entity Extraction:** Claude Sonnet 4 (Anthropic API)
- **Large Transcripts:** Gemini 2.0 Flash (Google AI API)
- **Embeddings:** OpenAI text-embedding-3-large
- **Response Generation:** Claude Sonnet 4

### Infrastructure
- **Hosting:** Vercel
- **Domain:** www.max.keyelements.co (GoDaddy DNS)
- **Email:** SendGrid or Resend
- **Monitoring:** Vercel Analytics + Sentry
- **Background Jobs:** Inngest or Supabase Edge Functions

### Development Tools
- **IDE:** Cursor (preferred) or VS Code
- **Version Control:** GitHub
- **Package Manager:** pnpm
- **Linting:** ESLint + Prettier
- **Testing:** Vitest + React Testing Library

---

## Non-Functional Requirements

### Performance
- **Page Load:** <2 seconds for initial load
- **Search Response:** <5 seconds from query to first result
- **Concurrent Users:** Support 100+ simultaneous users
- **Database Queries:** <500ms for 95th percentile
- **Vector Search:** <200ms for similarity queries

### Security
- **Authentication:** JWT tokens with secure httpOnly cookies
- **Authorization:** Row-Level Security enforced in database
- **Encryption:** TLS 1.3 for all connections
- **API Keys:** Stored in environment variables, never committed
- **Rate Limiting:** 100 requests/minute per user
- **CORS:** Restricted to www.max.keyelements.co domain

### Reliability
- **Uptime:** 99.5% availability target
- **Data Backup:** Daily automated backups (Supabase)
- **Error Recovery:** Graceful degradation on AI API failures
- **Monitoring:** Real-time error tracking (Sentry)

### Scalability
- **Database:** PostgreSQL with read replicas if needed
- **Caching:** Redis/Supabase cache for common queries
- **CDN:** Vercel Edge Network for static assets
- **Background Jobs:** Queue-based processing for AI tasks

### Compliance
- **Data Privacy:** GDPR-compliant data handling
- **User Consent:** Clear terms of service and privacy policy
- **Data Retention:** 90-day query history retention
- **Right to Delete:** User can request account and data deletion

---

## Success Criteria & Metrics

### Launch Criteria (MVP)
- [ ] 8+ hours of content processed and searchable
- [ ] All 6 user profiles supported with differentiated experiences
- [ ] Authentication and authorization fully functional
- [ ] Search returns relevant results in <5 seconds
- [ ] Mobile-responsive interface
- [ ] Admin can upload and approve new content
- [ ] Video timestamps display correctly
- [ ] 10+ internal beta testers complete testing

### Post-Launch Metrics (30 days)

**Engagement:**
- [ ] 80%+ of invited users activate accounts
- [ ] Average 3+ queries per user session
- [ ] 60%+ users return within 7 days
- [ ] <5% bounce rate on search results

**Quality:**
- [ ] 4.0+/5.0 average helpfulness rating
- [ ] <10% "not helpful" feedback rate
- [ ] 70%+ of queries result in content click
- [ ] <5 seconds average time to first click

**Coverage:**
- [ ] 80%+ of content segments viewed at least once
- [ ] All major topics represented in queries
- [ ] <5% of queries return zero results

**Technical:**
- [ ] 99%+ uptime
- [ ] <500ms average query response time
- [ ] Zero data breaches or security incidents
- [ ] <1% error rate across all operations

---

## Risks & Mitigation

### Technical Risks

**R1: AI API Rate Limits or Downtime**
- **Risk:** Claude/Gemini APIs unavailable during processing
- **Impact:** HIGH - Blocks content ingestion
- **Mitigation:** 
  - Implement retry logic with exponential backoff
  - Queue-based processing with pause/resume
  - Fallback to cached extractions for similar content
  - Monitor API status proactively

**R2: Vector Search Performance Degradation**
- **Risk:** Slow queries as content library grows
- **Impact:** MEDIUM - User experience suffers
- **Mitigation:**
  - Implement aggressive caching for common queries
  - Use materialized views for frequent graph paths
  - Add read replicas if needed
  - Monitor query performance continuously

**R3: Inaccurate AI Metadata Generation**
- **Risk:** Relevance scores don't match actual user needs
- **Impact:** MEDIUM - Users see irrelevant content
- **Mitigation:**
  - Track user feedback on result quality
  - Implement human review for low-confidence extractions
  - Use feedback to retrain/adjust scoring algorithms
  - A/B test prompt variations

### Business Risks

**R4: Low User Adoption**
- **Risk:** External users don't see value and stop using
- **Impact:** HIGH - Product fails to achieve goals
- **Mitigation:**
  - Conduct user interviews during beta
  - Measure and optimize onboarding flow
  - Implement user feedback mechanisms
  - Provide training materials and demos

**R5: Content Coverage Gaps**
- **Risk:** Key topics not well-represented in initial content
- **Impact:** MEDIUM - Users can't find what they need
- **Mitigation:**
  - Analyze query patterns to identify gaps
  - Prioritize new content uploads based on demand
  - Surface "content gap" reports to admin
  - Allow users to request topics

**R6: Insufficient Content Differentiation by Role**
- **Risk:** All users see similar results regardless of profile
- **Impact:** MEDIUM - Role-based value prop fails
- **Mitigation:**
  - A/B test relevance thresholds per role
  - Conduct role-specific user testing
  - Iterate on AI prompts for better classification
  - Collect feedback on result appropriateness

### Operational Risks

**R7: Content Processing Bottleneck**
- **Risk:** Can't keep up with content upload demand
- **Impact:** MEDIUM - Delays in making new content available
- **Mitigation:**
  - Batch processing during off-peak hours
  - Scale AI API concurrency limits
  - Implement admin queue visibility and prioritization
  - Set expectations on processing timelines

**R8: Privacy Breach or Data Leak**
- **Risk:** Unauthorized access to user queries or content
- **Impact:** CRITICAL - Legal and reputational damage
- **Mitigation:**
  - Implement comprehensive RLS policies
  - Regular security audits
  - Minimize PII collection
  - Encrypt sensitive data at rest
  - Employee security training

---

## Future Enhancements (Post-MVP)

### Phase 2 Features (3-6 months post-launch)

**Embedded Video Player**
- Deep-link Zoom videos to specific timestamps
- Inline video playback without leaving platform
- Closed captions and transcript sync

**Advanced Analytics**
- Personal learning dashboard (queries over time, topics explored)
- Admin insights (user behavior patterns, content performance)
- ROI reporting for Align reps

**Human-in-the-Loop Review**
- Admin review queue for low-confidence AI extractions
- Manual override of relevance scores
- Vocabulary management interface

**Learning Pathways**
- AI-generated course sequences based on prerequisites
- "Beginner → Intermediate → Advanced" tracks
- Progress tracking and achievements

**Enhanced Search**
- Filter by date range, source type, complexity
- Save searches and set up alerts
- Advanced query syntax (AND/OR/NOT operators)

### Phase 3 Features (6-12 months post-launch)

**Multilingual Support**
- Translate content to Spanish, Portuguese, etc.
- Multilingual entity recognition
- Cross-lingual semantic search

**Collaborative Features**
- Share queries and results with colleagues
- Annotate segments with personal notes
- Team workspaces for practices

**Content Generation**
- Auto-generate study guides from knowledge graph
- Create patient education handouts
- Generate protocol checklists

**Mobile App**
- Native iOS and Android apps
- Offline mode with cached content
- Push notifications for new content

**Integrations**
- Export to PowerPoint, Google Slides
- Zapier integration for workflow automation
- Slack bot for quick queries
- Practice management software integration

---

## Appendices

### A. User Profile Examples

**Dentist - Beginner:**
- Name: Dr. Sarah Chen
- Practice: General dentistry, recently opened practice
- Goals: Learn Key Elements methodology, build clinical confidence
- Needs: Step-by-step protocols, video demonstrations, beginner-friendly explanations

**Dental Assistant - Intermediate:**
- Name: Maria Rodriguez
- Practice: Cosmetic practice, 5 years experience
- Goals: Improve chairside efficiency, learn advanced techniques
- Needs: Setup checklists, timing cues, how to anticipate dentist needs

**Treatment Coordinator - Advanced:**
- Name: Jennifer Walsh
- Practice: High-end cosmetic practice, 10 years in role
- Goals: Increase case acceptance, master objection handling
- Needs: Advanced communication scripts, value framing, financial presentations

### B. Sample Queries by Role

**Dentist Queries:**
- "What's the protocol for crown prep on anterior teeth?"
- "How do I determine if a patient needs pre-restorative alignment?"
- "Material selection for all-ceramic crowns"
- "Troubleshooting tight margins during impression"

**Dental Assistant Queries:**
- "Setup checklist for crown preparation"
- "When to place retraction cord during impression"
- "How to prepare temporary material efficiently"
- "What instruments to have ready for veneer prep"

**Hygienist Queries:**
- "Home care instructions for patients with new crowns"
- "What to look for during hygiene visit after restorative work"
- "Periodontal health before starting restorative treatment"
- "How to educate patients on maintaining veneers"

**Treatment Coordinator Queries:**
- "How to present the value of pre-restorative alignment"
- "Script for explaining crown vs veneer to patients"
- "Overcoming 'that's too expensive' objection"
- "How to present treatment timelines to patients"

### C. Content Processing Example

**Input Transcript Segment:**
```json
{
  "sequence_number": 5,
  "text": "When you're doing crown preparation, the most critical aspect is margin placement. For anterior teeth, I recommend 0.5mm subgingival for optimal esthetics. Your assistant should have the retraction cord ready before you finish the prep. Use a hemostatic agent if there's any bleeding - it's essential for a clean impression.",
  "start_time": "00:15:32",
  "end_time": "00:16:48"
}
```

**AI-Generated Metadata:**
```json
{
  "relevance": {
    "dentist": 90,
    "dental_assistant": 75,
    "hygienist": 15,
    "treatment_coordinator": 10,
    "align_rep": 20
  },
  "content_type": "procedure",
  "clinical_complexity": "intermediate",
  "primary_focus": "crown preparation margin placement",
  "topics": [
    "crown_preparation",
    "margin_placement",
    "impression_taking",
    "tissue_management",
    "anterior_restorations"
  ],
  "entities": {
    "procedures": ["crown preparation", "impression taking"],
    "concepts": ["margin placement", "subgingival margin", "tissue management"],
    "anatomy": ["anterior teeth", "gingival margin"],
    "materials": ["retraction cord", "hemostatic agent"],
    "tools": [],
    "key_elements_terms": []
  },
  "confidence_score": 0.94
}
```

---

**Document Owner:** Alfa (Product Owner)  
**Contributors:** Development Team, Key Elements Stakeholders  
**Review Cycle:** Bi-weekly during development  
**Version History:**
- v1.0 (2025-11-07): Initial PRD