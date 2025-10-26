# Max Project Structure

## Directory Tree

```
max/
├── .env.local                    # Local environment variables (git-ignored)
├── .env.example                  # Template for environment variables
├── .gitignore
├── .cursorrules                  # Cursor IDE rules for this project
├── package.json
├── package-lock.json
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.js
│
├── public/                       # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── bg-pattern.svg
│
├── src/
│   ├── app/                      # Next.js 13+ App Router
│   │   ├── layout.tsx            # Root layout (navbar, auth check)
│   │   ├── page.tsx              # Home / landing page
│   │   ├── error.tsx             # Error boundary
│   │   ├── not-found.tsx
│   │   │
│   │   ├── (auth)/               # Auth-related routes (grouped layout)
│   │   │   ├── layout.tsx        # Auth layout (different from app layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── forgot-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/          # Protected routes (require auth)
│   │   │   ├── layout.tsx        # Dashboard layout (sidebar, header)
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx      # Projects list
│   │   │   │   ├── [projectId]/
│   │   │   │   │   ├── page.tsx  # Project detail
│   │   │   │   │   ├── edit/page.tsx
│   │   │   │   │   └── upload/page.tsx
│   │   │   │
│   │   │   ├── transcriptions/
│   │   │   │   ├── page.tsx      # All transcriptions (filterable)
│   │   │   │   ├── [transcriptionId]/
│   │   │   │   │   ├── page.tsx  # Transcription detail + edit
│   │   │   │   │   ├── translate/page.tsx
│   │   │   │   │   └── generate/page.tsx
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx      # Settings home
│   │   │   │   ├── prompts/page.tsx
│   │   │   │   ├── dictionary/page.tsx
│   │   │   │   └── account/page.tsx
│   │   │   │
│   │   │   ├── admin/            # Admin-only (if needed later)
│   │   │   │   ├── page.tsx
│   │   │   │   └── seed-data/page.tsx
│   │   │
│   │   ├── api/                  # API routes
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── route.ts      # GET /api/projects, POST /api/projects
│   │   │   │   ├── [projectId]/route.ts
│   │   │   │   └── types/route.ts  # GET /api/projects/types (project types)
│   │   │   │
│   │   │   ├── audio/
│   │   │   │   ├── upload/route.ts
│   │   │   │   ├── [fileId]/route.ts
│   │   │   │   └── list/route.ts
│   │   │   │
│   │   │   ├── transcriptions/
│   │   │   │   ├── route.ts      # List transcriptions
│   │   │   │   ├── [transcriptionId]/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── save-version/route.ts
│   │   │   │   │   └── auto-save/route.ts
│   │   │   │
│   │   │   ├── transcribe/
│   │   │   │   └── route.ts      # POST /api/transcribe (calls Whisper)
│   │   │   │
│   │   │   ├── translations/
│   │   │   │   ├── route.ts
│   │   │   │   ├── create/route.ts
│   │   │   │   ├── [translationId]/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── save-version/route.ts
│   │   │   │
│   │   │   ├── dictionary/
│   │   │   │   ├── route.ts
│   │   │   │   ├── add/route.ts
│   │   │   │   └── apply/route.ts
│   │   │   │
│   │   │   ├── summaries/
│   │   │   │   ├── generate/route.ts
│   │   │   │   ├── [summaryId]/route.ts
│   │   │   │   └── finalize/route.ts
│   │   │   │
│   │   │   ├── prompts/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [templateId]/route.ts
│   │   │   │   ├── update/route.ts
│   │   │   │   └── versions/route.ts
│   │   │   │
│   │   │   ├── health/route.ts   # GET /api/health (diagnostic)
│   │   │   ├── seed-data/route.ts
│   │   │   └── seed-project-types/route.ts
│   │   │
│   ├── components/               # Reusable React components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── LogoutButton.tsx
│   │   │
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectForm.tsx    # Create/edit project modal
│   │   │   ├── ProjectTypeSelector.tsx
│   │   │   └── ProjectMetadata.tsx
│   │   │
│   │   ├── audio/
│   │   │   ├── AudioUpload.tsx    # Drag-drop file upload
│   │   │   ├── AudioUploadModal.tsx
│   │   │   ├── AudioFileCard.tsx
│   │   │   ├── AudioPlayer.tsx
│   │   │   └── UploadProgress.tsx
│   │   │
│   │   ├── transcription/
│   │   │   ├── TranscriptionEditor.tsx
│   │   │   ├── TranscriptionTimeline.tsx (timestamps + text)
│   │   │   ├── TranscriptionViewer.tsx
│   │   │   ├── TranscriptionDiff.tsx
│   │   │   ├── TranscriptionVersionHistory.tsx
│   │   │   ├── AutoSaveIndicator.tsx
│   │   │   └── TranscriptionSegment.tsx (single chunk)
│   │   │
│   │   ├── translation/
│   │   │   ├── TranslationLanguageSelector.tsx
│   │   │   ├── TranslationEditor.tsx
│   │   │   ├── TranslationViewer.tsx
│   │   │   ├── TranslationDictionary.tsx
│   │   │   └── DictionaryCorrectionsPanel.tsx
│   │   │
│   │   ├── dictionary/
│   │   │   ├── DictionaryTable.tsx
│   │   │   ├── DictionaryForm.tsx
│   │   │   ├── DictionaryImport.tsx
│   │   │   └── DictionaryExport.tsx
│   │   │
│   │   ├── summaries/
│   │   │   ├── SummaryGenerator.tsx
│   │   │   ├── SummaryCard.tsx
│   │   │   ├── SummaryEditor.tsx
│   │   │   ├── SummaryDiff.tsx
│   │   │   └── SummaryFeedback.tsx
│   │   │
│   │   ├── prompts/
│   │   │   ├── PromptTemplateEditor.tsx
│   │   │   ├── PromptTemplateCard.tsx
│   │   │   ├── PromptVersionHistory.tsx
│   │   │   ├── PromptPreview.tsx
│   │   │   └── PromptImportance.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Loader.tsx
│   │   │   ├── Alert.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Pagination.tsx
│   │   │
│   │   └── layout/
│   │       ├── DashboardLayout.tsx
│   │       ├── AuthLayout.tsx
│   │       └── PageContainer.tsx
│   │
│   ├── lib/                      # Utility functions & helpers
│   │   ├── supabase/
│   │   │   ├── client.ts         # Supabase client setup
│   │   │   ├── server.ts         # Server-side Supabase
│   │   │   ├── auth.ts           # Auth helpers
│   │   │   ├── database.ts       # DB query helpers
│   │   │   ├── storage.ts        # Storage helpers
│   │   │   └── types.ts          # TypeScript types from DB
│   │   │
│   │   ├── api/
│   │   │   ├── whisper.ts        # OpenAI Whisper wrapper
│   │   │   ├── claude.ts         # Anthropic Claude wrapper
│   │   │   ├── elevenlabs.ts     # ElevenLabs wrapper (future)
│   │   │   └── fetch-utils.ts    # Reusable fetch logic
│   │   │
│   │   ├── helpers/
│   │   │   ├── format-time.ts
│   │   │   ├── diff-text.ts      # Diff algorithm
│   │   │   ├── apply-dictionary.ts
│   │   │   ├── validate-email.ts
│   │   │   ├── json-diff.ts
│   │   │   ├── debounce.ts
│   │   │   └── parse-timestamp.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts        # Auth context hook
│   │   │   ├── useUser.ts        # User data hook
│   │   │   ├── useAutoSave.ts    # Auto-save hook for editors
│   │   │   ├── useTranscription.ts
│   │   │   ├── useTranslation.ts
│   │   │   ├── useProjects.ts
│   │   │   └── useApi.ts         # Generic API hook
│   │   │
│   │   ├── constants/
│   │   │   ├── languages.ts      # Language codes & names
│   │   │   ├── project-types.ts
│   │   │   ├── api-endpoints.ts
│   │   │   └── ui-constants.ts
│   │   │
│   │   └── middleware/
│   │       ├── auth-middleware.ts
│   │       └── error-handler.ts
│   │
│   ├── context/                  # React Context for state
│   │   ├── AuthContext.tsx       # Global auth state
│   │   ├── AppContext.tsx        # Global app state
│   │   └── providers.tsx         # Context providers wrapper
│   │
│   ├── styles/                   # Global styles
│   │   ├── globals.css
│   │   ├── animations.css
│   │   └── variables.css
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Main type exports
│   │   ├── database.ts           # DB table types
│   │   ├── api.ts                # API request/response types
│   │   └── ui.ts                 # Component prop types
│   │
│   └── middleware.ts             # Next.js middleware (auth redirects)
│
├── scripts/                      # Build & utility scripts
│   ├── seed-database.ts          # Seed script
│   ├── export-schema.ts
│   └── migrate.ts                # Run migrations
│
├── tests/                        # Test files (optional for MVP)
│   ├── api/
│   ├── components/
│   └── lib/
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── API-ROUTES.md
│   ├── COMPONENTS.md
│   └── DATABASE.md
│
└── .cursor/                      # Cursor-specific config
    └── rules.md

```

---

## Key Design Patterns

### 1. Route Organization

**Auth Routes** (grouped layout)
```
(auth)/
  ├── login
  ├── register
  └── forgot-password
```

No sidebar, simple layout.

**Dashboard Routes** (protected, with sidebar)
```
(dashboard)/
  ├── projects
  ├── transcriptions
  ├── settings
  └── admin
```

All require authentication via middleware.

### 2. API Route Structure

**Organizational principle:** Endpoint name matches data entity

```
POST /api/projects              → Create project
GET  /api/projects              → List projects
GET  /api/projects/[projectId]  → Get project
PUT  /api/projects/[projectId]  → Update project
DELETE /api/projects/[projectId] → Delete project

POST /api/audio/upload          → Upload audio file
GET  /api/audio/list            → List audio files
GET  /api/audio/[fileId]        → Get audio file

POST /api/transcribe            → Start transcription
GET  /api/transcriptions        → List transcriptions
POST /api/transcriptions/[id]/save-version  → Save version
POST /api/transcriptions/[id]/auto-save     → Auto-save draft
```

### 3. Component Hierarchy

**Page Components** (`/app/.../*.tsx`)
```tsx
// Single responsibility: orchestrate page layout
// Use sub-components for actual content

export default function ProjectPage() {
  return (
    <PageContainer title="Project">
      <ProjectDetail id={id} />
    </PageContainer>
  )
}
```

**Feature Components** (`/components/.../*.tsx`)
```tsx
// Composed of smaller components
// Handle feature-level logic

export default function ProjectDetail({ id }) {
  const [project, setProject] = useState()
  
  return (
    <div>
      <ProjectHeader project={project} />
      <ProjectMetadata project={project} />
      <AudioFilesList projectId={id} />
    </div>
  )
}
```

**Primitive Components** (`/components/common/*.tsx`)
```tsx
// Reusable, no business logic
// Props-only, can be used anywhere

export default function Button({ children, onClick, variant }) {
  return <button className={`btn btn-${variant}`}>{children}</button>
}
```

### 4. State Management

**Auth State** → React Context (`AuthContext.tsx`)
```tsx
// User logged in? Name? ID?
const { user, loading } = useAuth()
```

**Page-level State** → React Hooks
```tsx
const [transcription, setTranscription] = useState()
const [editing, setEditing] = useState(false)
```

**Form State** → Form library (consider React Hook Form)
```tsx
const { register, watch, handleSubmit } = useForm()
```

**API State** → Custom hook (`useApi.ts`)
```tsx
const { data, loading, error, call } = useApi('/api/projects')
```

### 5. File Naming Conventions

```
Components:
  ✅ ProjectCard.tsx (PascalCase, descriptive)
  ❌ project-card.tsx
  ❌ projectCard.tsx

Utilities:
  ✅ format-time.ts (kebab-case)
  ❌ formatTime.ts
  ❌ format_time.ts

Hooks:
  ✅ useAutoSave.ts (camelCase with 'use' prefix)
  ❌ auto-save.ts

API routes:
  ✅ route.ts (standardized Next.js name)
  ❌ projects-endpoint.ts
```

---

## Component Architecture

### Transcription Editor (Complex Example)

```
TranscriptionEditor (Container)
├── EditorHeader
│   ├── FileInfo
│   ├── VersionSelector
│   └── ActionButtons (Save, Discard, History)
│
├── EditorBody
│   ├── EditorSidebar
│   │   ├── SearchBox
│   │   ├── DictionarySuggestions
│   │   └── VersionHistory
│   │
│   └── MainEditor
│       ├── TranscriptionTimeline
│       │   └── TranscriptionSegment (repeating)
│       │       ├── Timestamp
│       │       ├── EditableText
│       │       └── DictionaryHighlight
│       │
│       └── AutoSaveIndicator
│
└── EditorFooter
    ├── CharCount
    └── LastSavedTime
```

### Generated Summaries (Complex Example)

```
SummaryGenerator (Container)
├── TemplateSelector (email / linkedin / blog)
├── GenerateButton
│
└── SummaryResults
    ├── SummaryCard (email)
    │   ├── GeneratedText (read-only)
    │   ├── UserEditedText (editable)
    │   ├── DiffView (generated vs edited)
    │   └── FinalizeButton
    │
    ├── SummaryCard (linkedin)
    │   └── ...
    │
    └── SummaryCard (blog)
        └── ...
```

---

## Type Safety

### Core Types (`/src/types/database.ts`)

```tsx
// Generated from Supabase types (automatic)
export interface Project {
  id: string
  name: string
  project_type_id: string
  metadata: {
    location?: string
    date?: string
    misc?: string
  }
  created_by: string
  created_at: string
  updated_at: string
  archived: boolean
}

export interface Transcription {
  id: string
  audio_file_id: string
  transcription_type: 'T-1'
  language_code: 'en'
  raw_text: string
  json_with_timestamps: TranscriptionSegment[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  speaker: string
}

export interface Translation {
  id: string
  transcription_id: string
  language_code: LanguageCode
  translated_text: string
  json_with_timestamps: TranscriptionSegment[]
  dictionary_corrections_applied: DictionaryCorrection[]
  created_at: string
  updated_at: string
}

export interface GeneratedSummary {
  id: string
  transcription_id: string
  summary_type: 'email' | 'linkedin' | 'blog'
  generated_text: string
  user_edited_text?: string
  edited_by?: string
  edited_at?: string
  generated_at: string
  finalized_at?: string
}

export type LanguageCode = 'es' | 'pt' | 'fr' | 'de' | 'it' | 'zh' | 'hi' | 'ar'
```

---

## Build & Development Scripts

### `package.json` Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:seed": "ts-node scripts/seed-database.ts",
    "db:migrate": "ts-node scripts/migrate.ts",
    "db:pull": "supabase db pull",
    "generate:types": "supabase gen types typescript --local > src/lib/supabase/types.ts"
  }
}
```

### Environment Variables (`.env.example`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# OpenAI
OPENAI_API_KEY=[your-key]

# Anthropic
ANTHROPIC_API_KEY=[your-key]

# ElevenLabs
ELEVENLABS_API_KEY=[your-key]

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Testing Strategy (Optional for MVP)

```
tests/
├── api/
│   ├── transcribe.test.ts
│   ├── translate.test.ts
│   └── summaries.test.ts
│
├── components/
│   ├── TranscriptionEditor.test.tsx
│   ├── SummaryGenerator.test.tsx
│   └── ProjectCard.test.tsx
│
└── lib/
    ├── apply-dictionary.test.ts
    ├── diff-text.test.ts
    └── format-time.test.ts
```

Run with: `npm run test`

---

## Performance Optimization

### Code Splitting

```tsx
// Lazy load heavy components
import dynamic from 'next/dynamic'

const TranscriptionEditor = dynamic(
  () => import('@/components/transcription/TranscriptionEditor'),
  { loading: () => <Loader /> }
)
```

### Image Optimization

```tsx
import Image from 'next/image'

<Image src="/logo.svg" alt="Logo" width={40} height={40} />
```

### Database Query Optimization

```tsx
// Use limits and pagination
const results = await supabase
  .from('projects')
  .select('*')
  .limit(20)
  .range(0, 19)
```

---

## Deployment Considerations

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Deploy → Success! 🚀
```

### GoDaddy Domain Setup

1. Buy `usemax.io` on GoDaddy
2. Add CNAME to GoDaddy DNS pointing to Vercel
3. Vercel auto-validates
4. Domain ready!

---

## Summary

| Layer | Technology | Location |
|-------|-----------|----------|
| **Routing** | Next.js App Router | `/app` |
| **Components** | React | `/components` |
| **State** | Context + Hooks | `/context` + `/lib/hooks` |
| **Database** | Supabase PostgreSQL | Queries in `/lib/supabase` |
| **API** | Next.js API Routes | `/app/api` |
| **Utilities** | TypeScript | `/lib` |
| **Styling** | Tailwind CSS | `/styles` + inline classes |
| **Hosting** | Vercel | Deployed via Git |

This structure scales well for a 5-user internal tool and is easy to modify as requirements evolve.