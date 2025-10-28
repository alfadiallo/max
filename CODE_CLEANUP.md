# Code Cleanup Analysis

## Files/Code to PURGE (Unused or Dead Code)

### 1. **src/lib/utils/diffGenerator.ts** - DELETE ENTIRE FILE
**Reason:** 
- Broken diff algorithm created 427 false corrections
- Completely disabled and replaced with UI-based tracking
- Not used anywhere in the codebase

**Status:** ⚠️ Can be safely deleted

---

### 2. **src/app/api/transcriptions/[id]/versions/route.ts** - CLEAN UP
**Unused imports:**
```typescript
import { prepareEditTrackingData } from '@/lib/utils/diffGenerator' // Line 3
```

**Unused code block (lines 130-144):**
```typescript
// Get the previous version text for diff comparison
let previousText = transcription.raw_text; // Start with T-1
if (latestVersion) {
  // Get the previous version's edited_text
  const { data: prevVersion } = await supabase
    .from('max_transcription_versions')
    .select('edited_text')
    .eq('transcription_id', transcriptionId)
    .eq('version_number', latestVersion.version_number)
    .single()
  
  if (prevVersion) {
    previousText = prevVersion.edited_text
  }
}
```
**Reason:** This was used for the old diff generator, which is disabled

---

### 3. **src/components/audio/TranscriptionView.tsx** - CLEAN UP
**Unused state variable:**
```typescript
const [showExport, setShowExport] = useState<string | null>(null) // Line 69
```
**Reason:** 
- Was used for "Hide/Show Dubbing Script Format" button
- Button was removed in Session 7
- No longer referenced in the code

---

## Files/Code to KEEP (Currently Used)

### ✅ KEEP
- **src/lib/utils/transcriptionFormat.ts** - Used to convert segments to text
- **src/app/api/corrections/route.ts** - Corrections dashboard API (actively used)
- **src/app/corrections/page.tsx** - Corrections dashboard UI (actively used)
- **sql/migrations/supabase-add-transcription-edit-tracking.sql** - Database schema (needed)
- **sql/migrations/supabase-purge-h6-entries.sql** - Data cleanup (needed for H-6 cleanup)

---

## Recommended Actions

### High Priority
1. **Delete** `src/lib/utils/diffGenerator.ts` (entire file)
2. **Remove** unused import in `src/app/api/transcriptions/[id]/versions/route.ts`
3. **Remove** unused `previousText` code block in versions route
4. **Remove** unused `showExport` state in TranscriptionView.tsx

### Low Priority
- Review other unused imports across the codebase
- Consider consolidating duplicate code patterns

---

## Summary

**Total files to delete:** 1 (diffGenerator.ts)  
**Files to clean up:** 2 (versions route, TranscriptionView)  
**Lines of code to remove:** ~150-200 lines

**Risk Level:** 🟢 LOW - All identified code is confirmed unused and safe to remove.

