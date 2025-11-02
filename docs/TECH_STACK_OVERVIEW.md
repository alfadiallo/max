# Max Platform - Full Stack Framework Overview

## 🏗️ Architecture Pattern

**Full-Stack Next.js Application** with Serverless Functions
- **Monorepo**: Single codebase for frontend + backend
- **Hybrid Rendering**: Server-Side Rendering (SSR) + Client-Side Rendering (CSR)
- **API Routes**: Backend logic runs as serverless functions on Vercel

---

## 📦 Core Technology Stack

### **Frontend Layer**

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Next.js | 14.0+ | React framework with App Router |
| **UI Library** | React | 18.2+ | Component-based UI |
| **Language** | TypeScript | 5.3+ | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 3.3+ | Utility-first CSS framework |
| **Icons** | Lucide React | 0.552 | Icon library |
| **State Management** | React Hooks | Built-in | useState, useEffect, Context |

**Key Features:**
- File-based routing (`/app` directory)
- Server Components (default)
- Client Components (`'use client'`)
- Middleware for auth/route protection
- Image optimization
- Automatic code splitting

---

### **Backend Layer**

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js (Vercel Serverless) | JavaScript runtime |
| **API Framework** | Next.js API Routes | RESTful endpoints in `/app/api` |
| **Authentication** | Supabase Auth | JWT-based user auth |
| **Database Client** | Supabase SDK (`@supabase/supabase-js`) | PostgreSQL ORM |
| **Server-Side Client** | Supabase SSR (`@supabase/ssr`) | Auth session management |

**API Endpoints Structure:**
```
/app/api/
├── audio/
│   ├── upload/route.ts      # File upload (direct to Supabase Storage)
│   ├── transcribe/route.ts  # OpenAI Whisper integration
│   └── delete/route.ts      # File deletion
├── projects/route.ts        # Project CRUD
├── transcriptions/          # Transcription management
├── translations/            # Translation management
├── insight/                 # RAG & content analysis
├── speech/                  # ElevenLabs voice synthesis
└── admin/                   # Admin-only endpoints
```

---

### **Database & Storage**

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | Supabase (PostgreSQL 14+) | Relational database |
| **Storage** | Supabase Storage (S3-compatible) | Audio files, generated content |
| **ORM/SDK** | Supabase JS SDK | Database queries & mutations |
| **Row-Level Security** | Supabase RLS Policies | Data access control |
| **Real-time** | Supabase Realtime (WebSockets) | Optional real-time updates |

**Key Features:**
- PostgreSQL with JSONB support
- Automatic backups
- Row-Level Security (RLS) for multi-tenant access
- Direct client-side uploads (bypasses API size limits)
- Foreign key constraints
- Indexed queries

---

### **External AI Services**

| Service | SDK/Library | Purpose |
|---------|------------|---------|
| **Transcription** | OpenAI SDK (`openai`) | Speech-to-text (Whisper model) |
| **Translation/Content** | Anthropic SDK (`@anthropic-ai/sdk`) | Claude AI for translation & analysis |
| **Voice Synthesis** | ElevenLabs SDK (`@elevenlabs/elevenlabs-js`) | Text-to-speech |

---

### **Infrastructure & Deployment**

| Component | Service | Purpose |
|-----------|---------|---------|
| **Hosting** | Vercel | Frontend + API routes (serverless) |
| **Domain** | GoDaddy → Vercel | DNS management |
| **CDN** | Vercel Edge Network | Global content delivery |
| **Environment** | Vercel Environment Variables | Secret management |
| **Database Hosting** | Supabase Cloud | Managed PostgreSQL |
| **Storage Hosting** | Supabase Storage | S3-compatible object storage |

**Deployment Flow:**
```
GitHub → Vercel (auto-deploy on push to main)
  ├── Build Next.js app
  ├── Deploy serverless functions
  └── Serve via global CDN
```

---

## 🗂️ Project Structure

```
max/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (pages)/           # Route pages
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── login/
│   │   │   └── ...
│   │   ├── api/               # API routes (backend)
│   │   │   ├── audio/
│   │   │   ├── projects/
│   │   │   └── ...
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── audio/            # Audio-related components
│   │   └── ...
│   ├── lib/                   # Utilities & helpers
│   │   ├── supabase/         # Supabase clients (server/client)
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Utility functions
│   │   └── prompts/          # AI prompt templates
│   └── middleware.ts          # Next.js middleware (auth/routing)
├── supabase/
│   └── functions/            # Edge functions (optional)
├── sql/
│   └── migrations/           # Database migration scripts
├── public/                   # Static assets
├── next.config.js            # Next.js config
├── tailwind.config.js        # Tailwind config
├── tsconfig.json             # TypeScript config
└── package.json              # Dependencies
```

---

## 🔄 Data Flow Architecture

### **Request Flow**

```
1. User Action (Browser)
   ↓
2. React Component (Frontend)
   ↓
3. Next.js API Route (/app/api/*)
   ↓
4. Supabase Client (Server-side)
   ↓
5. Supabase/External APIs
   ├── PostgreSQL (database)
   ├── Storage (files)
   ├── OpenAI (transcription)
   ├── Anthropic (translation/analysis)
   └── ElevenLabs (voice)
   ↓
6. Response → Frontend → User
```

### **File Upload Flow (Large Files)**

```
1. Client Component (AudioUpload.tsx)
   ↓
2. Direct Upload to Supabase Storage (bypasses API)
   ↓
3. API Route (/api/audio/upload) - metadata only
   ↓
4. Database record created
   ↓
5. Success response
```

---

## 🔐 Authentication & Authorization

**Method:** JWT (JSON Web Tokens) via Supabase Auth

**Flow:**
1. User logs in → Supabase Auth
2. JWT token stored in HTTP-only cookies
3. Middleware validates token on each request
4. API routes extract user from token
5. RLS policies enforce data access by role

**Roles:**
- **Admin**: Full access
- **Editor**: Limited access (projects, transcriptions, edits only)

---

## 🎨 Styling Architecture

**Framework:** Tailwind CSS (Utility-first)

**Features:**
- Dark mode support (`dark:` classes)
- Responsive design (mobile-first)
- Custom theme colors
- Component-based styling

**Example:**
```tsx
<div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
    Title
  </h1>
</div>
```

---

## 📊 State Management

**Pattern:** React Hooks (no external state library)

- **Local State**: `useState` for component state
- **Global State**: React Context (if needed)
- **Server State**: Supabase queries (client-side)
- **Form State**: Controlled components
- **Auth State**: Supabase `onAuthStateChange` listener

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Vercel Edge Network (CDN)       │
│  ┌─────────────┐  ┌─────────────┐     │
│  │   Static    │  │  Serverless │     │
│  │   Assets    │  │  Functions  │     │
│  └─────────────┘  └─────────────┘     │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼──────┐   ┌────────▼────────┐
│   Supabase   │   │  External APIs  │
│  PostgreSQL  │   │  OpenAI/Claude  │
│  Storage     │   │  ElevenLabs     │
└──────────────┘   └─────────────────┘
```

---

## 🔧 Development Tools

| Tool | Purpose |
|------|---------|
| **TypeScript** | Type checking & IntelliSense |
| **ESLint** | Code linting (Next.js config) |
| **PostCSS** | CSS processing |
| **Autoprefixer** | CSS vendor prefixes |
| **Git** | Version control |
| **npm** | Package management |

---

## 📈 Scalability Considerations

1. **Serverless Functions**: Auto-scale on Vercel
2. **Database**: Supabase handles connection pooling
3. **Storage**: Direct uploads reduce API load
4. **CDN**: Static assets cached globally
5. **RLS Policies**: Database-level access control

---

## 🔒 Security Features

- **HTTPS**: Enforced by Vercel
- **JWT Tokens**: HTTP-only cookies
- **Row-Level Security**: Database-level access control
- **Environment Variables**: Secrets stored in Vercel
- **CORS**: Configured via middleware
- **Input Validation**: TypeScript + runtime checks

---

## 📝 Key Design Decisions

1. **Monorepo**: Single codebase simplifies deployment
2. **Next.js App Router**: Modern routing with server components
3. **Direct Storage Uploads**: Bypasses API body size limits
4. **TypeScript**: Type safety across full stack
5. **Supabase**: Unified auth, database, and storage
6. **Serverless**: Cost-effective, auto-scaling backend

---

This architecture provides a modern, scalable, and maintainable full-stack application with clear separation of concerns and efficient data flows.

