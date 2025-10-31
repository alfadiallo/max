# RAG Workflow - Quick Reference

## 🎯 Two-Step Indexing Process

### Step 1: Send to Insight
```
User clicks "🚀 Send to Insight"
    ↓
Creates insight_transcripts record
    ↓
Extracts metadata with Claude
    ↓
Button shows: "✓ Sent to Insight"
```

### Step 2: Index for RAG
```
"🤖 Index for RAG" button appears
    ↓
Checks: chunks already exist? → No
    ↓
Generates chunks (500-800 tokens each)
    ↓
Creates OpenAI embeddings (1536-dim)
    ↓
Stores in insight_chunks
    ↓
Success: "✅ Indexed with X chunks"
```

---

## 🔒 Duplicate Prevention

| Check | Message |
|-------|---------|
| Insight exists | "Already sent to Insight" |
| Chunks exist | "Already indexed for RAG" |

---

## 🎬 Where to Find It

**Navigate:** Dashboard → Projects → Select Audio → Final Version Tab

**Buttons:**
1. "Send for Analysis" (blue)
2. "🚀 Send to Insight" (purple)
3. "🤖 Index for RAG" (purple-pink) ← appears after #2

---

## 📊 What Gets Indexed

**Source:** Final Version (latest H-X or T-1)

**Tracking:**
- `source_final_version_id` → Which H-version
- `indexed_at` → When indexed
- `indexed_by` → Who indexed

---

## 🔍 Search It

**Navigate:** Dashboard → RAG Search

**Flow:**
1. Enter question
2. See semantic results
3. Select chunks
4. Ask Claude
5. Get synthesized answer with timestamps

---

## ⚠️ Common Errors

| Error | Fix |
|-------|-----|
| "No final version" | Promote a version to Final |
| "Not sent to Insight" | Complete Step 1 first |
| "Already indexed" | Already done - search it |

---

## ✅ Best Practice

1. Edit transcript thoroughly
2. Promote best version to Final
3. Send to Insight
4. Index for RAG
5. Search and enjoy

---

## 🎨 Visual Flow

```
┌─────────────────────────────────┐
│  Edit Transcript (H-1, H-2...) │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│   Promote to Final (H-3) ✅     │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│   🚀 Send to Insight            │
│   Creates metadata extraction   │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│   🤖 Index for RAG              │
│   Chunks + Embeddings           │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│   🔍 RAG Search                 │
│   Semantic search ready!        │
└─────────────────────────────────┘
```

