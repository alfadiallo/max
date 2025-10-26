# Max - Product Requirements Document (PRD)

**Project Name:** Max  
**Version:** 1.0 MVP  
**Status:** Development  
**Last Updated:** October 25, 2025

---

## 🎯 Product Overview

Max is a specialized transcription and content generation platform designed for dental professionals. It enables users to:
- Upload audio recordings of lectures, procedures, or discussions
- Transcribe audio using OpenAI Whisper with dental terminology accuracy
- Correct transcriptions with version history and audit trails
- Translate transcriptions to 8 languages with automatic dental term corrections
- Generate professional summaries (email, LinkedIn, blog) using Claude
- Manage terminology dictionaries to ensure consistency across all translations

**Primary User:** Dr. Soto and dental education teams  
**Target Timeline:** MVP launch within 1 month

---

## 📊 Core Features (MVP)

### 1. User Authentication & Profiles
- **Requirement:** Secure user registration and login via Supabase
- **Scope:**
  - Email/password registration with validation
  - Login with session management
  - User profile with full name and preferences
  - Logout functionality
- **Status:** In Scope for MVP
- **Priority:** P0 (Critical)

### 2. Project Management
- **Requirement:** Organize recordings into logical projects
- **Scope:**
  - Create/edit/archive projects
  - Assign project types (Lecture, Procedure, Webinar, etc.)
  - Store metadata (location, date, description)
  - List and filter projects
- **Status:** In Scope for MVP
- **Priority:** P0 (Critical)

### 3. Audio Upload & Management
- **Requirement:** Drag-and-drop audio file uploads
- **Scope:**
  - Upload MP3/WAV/M4A audio files (up to 500MB)
  - Store in Supabase Storage (max-audio bucket)
  - Display upload progress
  - List audio files per project
  - Basic audio player for preview
- **Status:** In Scope for MVP
- **Priority:** P0 (Critical)

### 4. Transcription (Whisper Integration)
- **Requirement:** Convert audio to text using OpenAI Whisper
- **Scope:**
  - Call Whisper API with audio file
  - Extract raw text and JSON with timestamps
  - Store transcription with version tracking (T-1 = initial)
  - Display transcription with timeline
  - Auto-detect language
- **Status:** In Scope for MVP
- **Priority:** P0 (Critical)

### 5. Transcription Editing & Versioning
- **Requirement:** Allow users to correct transcriptions with full history
- **Scope:**
  - Edit transcription text inline
  - Auto-save drafts every 5 minutes (no versioning)
  - Create formal versions (H-1, H-2, etc.) on "Save & Close"
  - View version history with diff highlighting
  - Compare any two versions
  - Revert to previous version (if needed post-MVP)
- **Status:** In Scope for MVP
- **Priority:** P0 (Critical)

### 6. Dictionary Management
- **Requirement:** Store and apply dental terminology corrections
- **Scope:**
  - Add dental terms with corrections (e.g., "endodontist" → "Endodontist")
  - Export/import dictionary as CSV
  - View all dictionary entries
  - Apply dictionary to translations automatically
  - Search dictionary by term
- **Status:** In Scope for MVP
- **Priority:** P1 (High)

### 7. Translation (Claude + Custom)
- **Requirement:** Translate transcriptions to 8 languages
- **Scope:**
  - Support: Spanish, Portuguese, French, German, Italian, Chinese, Hindi, Arabic
  - Use Claude for translation (respects dental terminology via dictionary)
  - Store translated text with version tracking (H-1-es = human-edited Spanish v1)
  - Edit translations inline
  - Apply dictionary corrections to all translations
  - Create versions when translating to new language
- **Status:** In Scope for MVP
- **Priority:** P1 (High)

### 8. Generated Summaries (Claude)
- **Requirement:** Generate professional summaries in multiple formats
- **Scope:**
  - Generate summaries for: Email, LinkedIn post, Blog article
  - Use Claude with editable prompt templates
  - Compare generated vs. user-edited version
  - Store generation with version history
  - Finalize summaries (creates feedback log for improvement)
  - Support markdown in templates
- **Status:** In Scope for MVP
- **Priority:** P1 (High)

### 9. Prompt Template Management
- **Requirement:** Allow admins to customize Claude prompts
- **Scope:**
  - Create/edit prompt templates for each summary type (email/linkedin/blog)
  - Store markdown-formatted prompts
  - Version templates (track changes)
  - Apply new templates only to new generations (retroactively optional)
  - Use feedback_log to track quality improvements
- **Status:** In Scope for MVP
- **Priority:** P2 (Medium)

### 10. Dashboard & Navigation
- **Requirement:** Main interface for project management
- **Scope:**
  - Sidebar navigation with project/transcription lists
  - Project card overview
  - Quick access to recent items
  - Search and filter functionality
  - Settings access
- **Status:** In Scope for MVP
- **Priority:** P0 (Critical)

---

## 🏗️ Technical Architecture

### Technology Stack
| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Next.js 13+ (App Router), TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, TypeScript |
| **Database** | Supabase (PostgreSQL) with 13 tables |
| **Storage** | Supabase Storage (max-audio, max-transcripts buckets) |
| **Auth** | Supabase Auth (JWT) |
| **AI APIs** | OpenAI Whisper, Anthropic Claude, ElevenLabs (optional) |
| **Hosting** | Vercel (frontend + backend), Supabase cloud |
| **Domain** | GoDaddy (usemax.io) |

### Database Schema (13 Tables)
1. `auth.users` - Supabase managed auth
2. `users` - Application user profiles
3. `project_types` - Fixed list (Lecture, Procedure, etc.)
4. `projects` - User projects
5. `audio_files` - Uploaded audio recordings
6. `transcriptions` - Initial Whisper output (T-1)
7. `transcription_versions` - Human edits (H-1, H-2, etc.)
8. `dictionary` - Dental terminology lookup
9. `translations` - Per-language translations
10. `translation_versions` - Edited translations (H-1-es, etc.)
11. `generated_summaries` - Email/LinkedIn/Blog summaries
12. `prompt_templates` - Claude prompt templates
13. `feedback_log` - Track improvements for future refinement

### API Structure
- **Base URL:** `/api`
- **Auth:** JWT token in Authorization header
- **Response Format:** `{ success: boolean, data?: T, error?: string }`
- **Error Codes:** 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)

### Key Integrations
1. **OpenAI Whisper** - Transcription (POST /api/transcribe)
2. **Anthropic Claude** - Translation & summaries (internal API calls)
3. **ElevenLabs** - Text-to-speech (future, not MVP)

---

## 📋 User Workflows

### Workflow 1: Audio Upload → Transcription → Edit
**Timeline:** ~15 minutes per recording
1. Register/login to Max
2. Create new project ("Endo 101 Lecture")
3. Upload MP3 file (~10 min lecture)
4. System calls Whisper, displays transcription
5. User reviews and corrects errors
6. User clicks "Save & Close" to create version H-1
7. Transcription stored with full audit trail

### Workflow 2: Translate with Dictionary
**Timeline:** ~30 minutes for single translation
1. Open transcription from Workflow 1
2. Click "Translate to Spanish"
3. System calls Claude with dictionary context
4. Spanish translation appears
5. User reviews and corrects medical terms
6. Dictionary auto-applies any new terms to Spanish
7. Click "Finalize" to create version H-1-es

### Workflow 3: Generate Professional Summary
**Timeline:** ~10 minutes per summary
1. Open transcription with translations ready
2. Click "Generate Summary"
3. Select template (Email, LinkedIn, or Blog)
4. Claude generates summary using template
5. User reviews and edits summary
6. Click "Finalize" - stores diff and creates feedback log
7. Summary ready to copy/export

### Workflow 4: Manage Terminology Dictionary
**Timeline:** ~5 minutes per term
1. Go to Settings → Dictionary
2. View existing terms (e.g., "endodontist" → "Endodontist")
3. Add new term (e.g., "pulpal" → "Pulpal")
4. Export dictionary as CSV
5. Future translations automatically use new term

---

## 🎨 UI/UX Requirements

### Layout
- **Navigation:** Sidebar on desktop (projects, transcriptions, settings)
- **Mobile:** Hamburger menu with collapsible sidebar
- **Color Scheme:** Professional dental theme (blues, grays, light backgrounds)
- **Typography:** Clear hierarchy, readable font for content

### Key Pages
1. **Dashboard** (/dashboard) - Project overview
2. **Projects** (/projects) - Project list and create
3. **Project Detail** (/projects/[id]) - Audio files and project info
4. **Transcription Editor** (/transcriptions/[id]) - Main editor with timeline
5. **Translation Editor** (/transcriptions/[id]/translate) - Per-language translation
6. **Summary Generator** (/transcriptions/[id]/generate) - Summary creation
7. **Settings** (/settings) - Dictionary, prompts, account

### Interactions
- **Auto-save:** Every 5 minutes during editing (shows "draft" status)
- **Version History:** Timeline view of all versions
- **Diff Viewer:** Side-by-side comparison of versions
- **Dictionary Highlights:** Medical terms highlighted in editor
- **Responsive:** Mobile-first design

---

## 🔐 Security & Compliance

### Authentication
- Email/password registration with validation
- Supabase JWT tokens (3600 second expiry)
- Refresh token rotation
- Session management with middleware

### Data Protection
- All user data encrypted at rest (Supabase)
- HTTPS/TLS for all transmissions
- User can only access their own projects
- API endpoints check user_id ownership

### Privacy
- User data not shared with external APIs (except Whisper/Claude)
- Audio files stored in private bucket (user-scoped)
- Audit trail of all edits (transcription_versions)

### Future Compliance
- HIPAA compatibility (health data handling)
- GDPR compliance (data export, deletion)
- SOC 2 readiness

---

## 📈 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Dashboard load | <2s | Cached projects list |
| Transcription edit | <500ms | Auto-save debounced |
| Whisper latency | 2-5min | Depends on audio length |
| Translation latency | 30-60s | Claude API with context |
| Summary generation | 20-40s | Claude 3 model |
| Version switch | <200ms | In-memory state |

---

## 🚀 Deployment & Launch

### Pre-Launch Checklist
- [ ] All API endpoints tested end-to-end
- [ ] Database migrations run successfully
- [ ] Environment variables configured in Vercel
- [ ] Supabase backups enabled
- [ ] SSL/TLS certificate configured
- [ ] Domain DNS configured (GoDaddy → Vercel)
- [ ] Error logging enabled (Sentry optional)
- [ ] Performance monitoring enabled

### Launch Plan
1. **Week 1:** Internal testing with Dr. Soto
2. **Week 2:** Bug fixes and refinements
3. **Week 3:** User documentation + training
4. **Week 4:** Production deployment to usemax.io

---

## 📚 Post-MVP Features (Future)

### Phase 2 (Month 2)
- [ ] ElevenLabs text-to-speech for translations
- [ ] Multi-user collaboration (comments, suggestions)
- [ ] Advanced search with full-text indexing
- [ ] API for third-party integrations
- [ ] Export to PDF/Word
- [ ] Scheduling and workflow automation

### Phase 3 (Month 3+)
- [ ] Multi-language UI (Spanish, Portuguese)
- [ ] Custom branding (logos, colors)
- [ ] Team management and permissions
- [ ] Batch processing (multiple files)
- [ ] AI-powered grammar checking
- [ ] Integration with LMS systems

---

## 📞 Success Metrics

### Usage Metrics
- Daily active users (DAU)
- Projects created per user
- Audio hours transcribed
- Translations generated
- Summaries created

### Quality Metrics
- Transcription error rate (manually verified sample)
- Translation accuracy (vs. manual translation)
- Feature usage distribution
- User satisfaction (NPS survey)

### Performance Metrics
- API response times
- Error rates
- Uptime (99.9% target)
- Database query performance

---

## 🎯 MVP Scope Summary

**In Scope:**
- ✅ User auth and profiles
- ✅ Project management
- ✅ Audio upload (Supabase Storage)
- ✅ Transcription (Whisper)
- ✅ Transcription editing with versioning
- ✅ Dictionary management
- ✅ Translation with Claude
- ✅ Summary generation with templates
- ✅ Dashboard and navigation
- ✅ Responsive mobile UI

**Out of Scope (Post-MVP):**
- ❌ Text-to-speech (ElevenLabs)
- ❌ Multi-user collaboration
- ❌ Advanced analytics
- ❌ Custom branding
- ❌ API for external integrations
- ❌ Scheduled jobs/workflows

---

## 📋 Sign-Off

**Product Owner:** [Your Name]  
**Technical Lead:** [Your Name]  
**Design Lead:** [Your Name]  

**Approval Date:** [Date]

---

## 📖 Related Documents

- `MAX-ARCHITECTURE-WORKFLOW.md` - System architecture and data flows
- `MAX-DATABASE-SCHEMA.md` - Complete database schema with examples
- `MAX-API-ROUTES.md` - All API endpoints with request/response formats
- `MAX-PROJECT-STRUCTURE.md` - File organization and component hierarchy
- `MAX-QUICK-START.md` - Setup instructions