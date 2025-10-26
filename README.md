# Max - Dental Transcription & Content Platform

**Professional transcription, translation, and content generation for dental education**

---

## 🚀 Quick Start

1. **Review documentation** in this README
2. **Track your sessions** in [Sessions.md](./Sessions.md)
3. **Check [INDEX.md](./INDEX.md)** for file navigation
4. **Start coding** following the docs below

---

## 📚 Documentation Index

### Core Documents (Start Here)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[Sessions.md](./Sessions.md)** | Track coding sessions & accomplishments | Every session |
| **[INDEX.md](./INDEX.md)** | Find information fast | Need to look something up |
| **[docs/planning/prd.md](./docs/planning/prd.md)** | Product requirements & features | Understanding what to build |
| **[docs/planning/roadmap.md](./docs/planning/roadmap.md)** | 4-week development timeline | Planning your work |
| **[docs/technical/architecture.md](./docs/technical/architecture.md)** | System design & workflows | Understanding how it works |
| **[docs/technical/database.md](./docs/technical/database.md)** | All 13 database tables | Working with data |
| **[docs/technical/api-routes.md](./docs/technical/api-routes.md)** | API endpoints reference | Building backend |
| **[docs/technical/setup.md](./docs/technical/setup.md)** | Local dev setup (30 min) | First-time setup |

---

## 🎯 What is Max?

Max is a specialized platform for Dr. Karla Soto that enables:

### Core Features
- **Audio Upload** → Upload dental education recordings
- **Transcription** → Automatic transcription via OpenAI Whisper
- **Editing** → User-friendly editor with auto-save & versioning
- **Translation** → Translate to 8 languages (Spanish, Portuguese, French, German, Italian, Chinese, Hindi, Arabic)
- **Summaries** → Generate professional summaries (Email, LinkedIn, Blog)
- **Dictionary** → Manage dental terminology corrections

### Tech Stack
- **Frontend:** Next.js 13+, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **AI:** OpenAI Whisper, Anthropic Claude
- **Hosting:** Vercel + GoDaddy domain (usemax.io)

---

## 🏗️ System Architecture

### Main Workflow
```
Audio Upload → Whisper Transcription (T-1)
         ↓
   User Edit & Version (H-1, H-2...)
         ↓
   Claude Translation → 8 Languages (H-1-es, H-1-pt...)
         ↓
   Summary Generation → Email/LinkedIn/Blog
```

### Versioning Strategy
- **T-1:** Initial transcription (from Whisper)
- **H-1, H-2, ...** Human-edited transcriptions (new version each edit)
- **H-1-es, H-1-pt, ...** Edited translations per language
- All versions stored with full audit trail

---

## 📊 Development Timeline (4 Weeks)

| Week | Phase | Focus |
|------|-------|-------|
| 1 | Foundation | Auth, Projects, Audio Upload |
| 2 | Transcription | Whisper integration, Editor, Versions |
| 3 | Translation | Dictionary, Claude translation |
| 4 | Summaries & Deploy | Summary generation, Testing, Launch |

**Target Launch:** November 25, 2025

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key
- Anthropic (Claude) API key

### Setup Steps
1. Clone repository
2. Run `npm install`
3. Create Supabase project
4. Configure `.env.local` (see [setup.md](./docs/technical/setup.md))
5. Run database migrations
6. Start: `npm run dev`

**Full setup:** [docs/technical/setup.md](./docs/technical/setup.md)

---

## 📁 Project Structure

```
max/
├── Sessions.md           # ← Track your coding sessions here!
├── README.md            # ← You are here
├── INDEX.md            # ← Quick navigation
├── docs/
│   ├── technical/      # Architecture, database, API routes, setup
│   └── planning/       # PRD, roadmap, tasks
├── src/
│   ├── app/           # Next.js pages & API routes
│   ├── components/    # React components
│   └── lib/           # Utilities & helpers
└── [rest of project]
```

---

## 🎓 How to Use Documentation

### Daily Workflow
1. **Start session:** Open [Sessions.md](./Sessions.md), create new session
2. **Check roadmap:** Review [docs/planning/roadmap.md](./docs/planning/roadmap.md)
3. **Build feature:** Reference technical docs as needed
4. **End session:** Update Sessions.md with accomplishments

### Need to Find Something?
- **What to build?** → [docs/planning/prd.md](./docs/planning/prd.md)
- **How it works?** → [docs/technical/architecture.md](./docs/technical/architecture.md)
- **Database structure?** → [docs/technical/database.md](./docs/technical/database.md)
- **API endpoints?** → [docs/technical/api-routes.md](./docs/technical/api-routes.md)
- **Setup issues?** → [docs/technical/setup.md](./docs/technical/setup.md)

---

## 🎯 Key Features

### 1. Transcription
- Upload audio → Transcribe via Whisper
- Edit with full version history
- Auto-save every 5 minutes
- Manual versioning (H-1, H-2, etc.)

### 2. Translation
- Translate to 8 languages using Claude
- Dictionary-based terminology corrections
- Edit translations with versioning
- Ready for ElevenLabs (text-to-speech) integration

### 3. Summary Generation
- Generate email, LinkedIn, blog summaries
- Editable prompt templates
- Track generated vs. edited (feedback loop)
- Finalize with audit logging

### 4. Dictionary Management
- Add dental terminology corrections
- Apply to all future translations automatically
- Export/import CSV
- Track usage statistics

---

## 🔑 Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run type-check      # Check TypeScript
npm run build          # Build for production

# Database
npm run db:seed        # Seed database
npm run db:migrate    # Run migrations

# Sessions (manual)
# Open Sessions.md and create new session entry
```

---

## 📈 Progress Tracking

- **Current Phase:** Ready for Phase 1 (Foundation)
- **Next Milestone:** Start Session 2 - Setup & Authentication
- **Sessions Logged:** 1 (Complete)
- **Status:** ✅ Documentation ready, starting development
- **Target Launch:** November 25, 2025

---

## 🚨 Important Guidelines

### Coding Sessions
- **Always update [Sessions.md](./Sessions.md)** after each session
- Use `[Session N]` prefix for git commits
- Document decisions, blockers, and learnings
- Keep sessions focused on one feature when possible

### File Organization
- Technical docs go in `docs/technical/`
- Planning docs go in `docs/planning/`
- Sessions tracking stays in root `Sessions.md`
- README and INDEX in root for visibility

### Git Workflow
1. Create session in Sessions.md
2. Work on feature
3. Commit with `[Session N]` prefix
4. Update Sessions.md with results
5. Prepare next session notes

---

## ❓ Questions?

- **What should I build today?** → Check [docs/planning/roadmap.md](./docs/planning/roadmap.md)
- **How do I implement X?** → Check [docs/technical/architecture.md](./docs/technical/architecture.md)
- **Where's the database schema?** → [docs/technical/database.md](./docs/technical/database.md)
- **What did I do last session?** → [Sessions.md](./Sessions.md)

---

## 🎉 Ready to Build!

**You have everything you need:**
- ✅ Clear requirements (PRD)
- ✅ Detailed architecture docs
- ✅ Database schema
- ✅ API specifications
- ✅ Development timeline
- ✅ Session tracking system

**Start by:**
1. Reading [Sessions.md](./Sessions.md)
2. Creating Session 2
3. Following [docs/planning/roadmap.md](./docs/planning/roadmap.md) Phase 1

**Let's build Max! 🚀**
