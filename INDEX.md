# Documentation Index - Max Project

**Quick navigation to all documentation**

---

## 📍 Session Tracking

| Document | Purpose | Location |
|----------|---------|----------|
| **Sessions.md** | Track coding sessions & accomplishments | Root directory |
| Session Template | Copy this for new sessions | In Sessions.md |

---

## 📋 Planning & Requirements

| Document | Purpose | Location |
|----------|---------|----------|
| **PRD** | Product requirements & features | docs/planning/prd.md |
| **Roadmap** | 4-week development timeline | docs/planning/roadmap.md |
| **Tasks** | Detailed task breakdown (optional) | docs/planning/tasks.md |

---

## 🏗️ Technical Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| **Architecture** | System design, workflows, data flows | docs/technical/architecture.md |
| **Database** | All 13 tables, relationships, queries | docs/technical/database.md |
| **API Routes** | All endpoints with request/response | docs/technical/api-routes.md |
| **Setup Guide** | Local dev setup (30 min quick start) | docs/technical/setup.md |
| **Project Structure** | File organization & conventions | docs/technical/project-structure.md |
| **Technical Specs** | System requirements & constraints | docs/technical/specifications.md |

---

## 🎯 Quick Lookup by Topic

### Authentication
- Requirements: `docs/planning/prd.md` → "User Authentication"
- Endpoints: `docs/technical/api-routes.md` → "/api/auth/*"
- Implementation: `Sessions.md` → Session notes

### Projects
- Requirements: `docs/planning/prd.md` → "Project Management"
- Endpoints: `docs/technical/api-routes.md` → "/api/projects"
- Database: `docs/technical/database.md` → "projects" table

### Audio Upload
- Requirements: `docs/planning/prd.md` → "Audio Upload"
- Endpoints: `docs/technical/api-routes.md` → "/api/audio/upload"
- Database: `docs/technical/database.md` → "audio_files" table
- Workflow: `docs/technical/architecture.md` → "Audio Upload Flow"

### Transcription (Whisper)
- Requirements: `docs/planning/prd.md` → "Transcription"
- Endpoints: `docs/technical/api-routes.md` → "/api/transcribe"
- Database: `docs/technical/database.md` → "transcriptions" table
- Workflow: `docs/technical/architecture.md` → "Transcription Flow"
- Setup: `docs/technical/setup.md` → "Configure Whisper"

### Editing & Versioning
- Requirements: `docs/planning/prd.md` → "Transcription Editing"
- Endpoints: `docs/technical/api-routes.md` → "/api/transcriptions/*/save-version"
- Database: `docs/technical/database.md` → "transcription_versions" table
- Strategy: `docs/technical/architecture.md` → "Versioning Strategy"

### Dictionary
- Requirements: `docs/planning/prd.md` → "Dictionary Management"
- Endpoints: `docs/technical/api-routes.md` → "/api/dictionary/*"
- Database: `docs/technical/database.md` → "dictionary" table
- Application: `docs/technical/architecture.md` → "Dictionary System"

### Translation (Claude)
- Requirements: `docs/planning/prd.md` → "Translation"
- Endpoints: `docs/technical/api-routes.md` → "/api/translations/*"
- Database: `docs/technical/database.md` → "translations", "translation_versions"
- Workflow: `docs/technical/architecture.md` → "Translation Flow"
- Setup: `docs/technical/setup.md` → "Configure Claude"

### Summary Generation
- Requirements: `docs/planning/prd.md` → "Generated Summaries"
- Endpoints: `docs/technical/api-routes.md` → "/api/summaries/*"
- Database: `docs/technical/database.md` → "generated_summaries", "prompt_templates"
- Workflow: `docs/technical/architecture.md` → "Summary Generation Flow"

---

## 🗓️ Timeline Navigation

### Week 1: Foundation
- Tasks: `docs/planning/roadmap.md` → "Phase 1"
- Focus: Auth, Projects, Audio Upload
- Track: `Sessions.md` → Session 2, 3

### Week 2: Transcription
- Tasks: `docs/planning/roadmap.md` → "Phase 2"
- Focus: Whisper, Editor, Versions
- Track: `Sessions.md` → Session 4, 5

### Week 3: Translation
- Tasks: `docs/planning/roadmap.md` → "Phase 3"
- Focus: Dictionary, Claude translation
- Track: `Sessions.md` → Session 6, 7

### Week 4: Summaries & Deploy
- Tasks: `docs/planning/roadmap.md` → "Phase 4, 5"
- Focus: Summary generation, Testing, Deploy
- Track: `Sessions.md` → Session 8, 9, 10

---

## 🛠️ Common Tasks

### "I need to implement feature X"
1. Requirements: Check `docs/planning/prd.md`
2. Architecture: Check `docs/technical/architecture.md`
3. Database: Check `docs/technical/database.md`
4. API: Check `docs/technical/api-routes.md`
5. Document: Update `Sessions.md`

### "I need to query the database"
1. Schema: `docs/technical/database.md`
2. Relationships: `docs/technical/database.md` → "Data Relationships"
3. Queries: `docs/technical/database.md` → "Query Patterns"
4. Example: Copy from API routes or architecture docs

### "I need to create an API endpoint"
1. Pattern: `docs/technical/api-routes.md` → Similar endpoint
2. Types: `docs/technical/api-routes.md` → Request/Response examples
3. Auth: Check middleware patterns in architecture
4. Database: Check `docs/technical/database.md` for tables
5. Document: Update `Sessions.md` with endpoint created

### "I'm stuck on something"
1. Check `Sessions.md` → Previous session notes
2. Check `docs/technical/setup.md` → Troubleshooting
3. Check relevant technical doc for patterns
4. Document blocker in current `Sessions.md` entry

---

## 📂 File Organization

```
max/
├── Sessions.md                    # ← Your session tracking
├── README.md                      # ← Main entry point
├── INDEX.md                       # ← This file (navigation)
├── docs/
│   ├── technical/
│   │   ├── architecture.md        # System design & workflows
│   │   ├── database.md            # Database schema (13 tables)
│   │   ├── api-routes.md         # All API endpoints
│   │   ├── setup.md              # Setup instructions
│   │   ├── project-structure.md  # File organization
│   │   └── specifications.md     # Technical requirements
│   └── planning/
│       ├── prd.md                # Product requirements
│       ├── roadmap.md            # Development timeline
│       └── tasks.md              # Detailed tasks
└── [rest of project files]
```

---

## 🎯 Quick Reference Table

| Need | Document | Section |
|------|----------|---------|
| What am I building? | prd.md | "Product Overview" |
| What's this week? | roadmap.md | Current phase |
| How does X work? | architecture.md | Relevant workflow |
| Database tables? | database.md | "Core Tables" |
| API endpoints? | api-routes.md | Endpoint reference |
| Setup issues? | setup.md | Troubleshooting |
| What did I do? | Sessions.md | Latest session |
| Where do I start? | README.md | Quick Start |

---

## 🔄 Document Updates

**Update these docs as you progress:**
1. **Sessions.md** → After every coding session
2. **PRD** → When requirements change
3. **Roadmap** → When timeline shifts
4. **Technical docs** → When implementing new features

**Keep documents in sync:**
- If you add a table → Update database.md
- If you add an endpoint → Update api-routes.md
- If you complete a phase → Update roadmap.md
- If you make a decision → Update Sessions.md

---

## 💡 Tips

- **Start sessions:** Always open Sessions.md first
- **Find info fast:** Use this INDEX.md (Cmd+F)
- **Check progress:** Sessions.md shows what's done
- **Understand system:** Read architecture.md once
- **Debug issues:** Check setup.md troubleshooting
- **Plan work:** Check roadmap.md current phase

---

**Happy coding! Track your sessions in [Sessions.md](./Sessions.md)! 🚀**
