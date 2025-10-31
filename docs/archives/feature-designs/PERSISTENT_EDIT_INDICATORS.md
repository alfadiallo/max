# Persistent Edit Indicators Design

## Current Behavior

**While Editing:**
- ✅ Orange badges appear on edited segments
- ✅ "X segments edited" counter visible
- ✅ Yellow highlight on current edited segment

**After Saving:**
- ❌ All orange badges disappear
- ❌ No indication which segments were changed
- ❌ Can't see edit history visually

---

## Proposed Solution

### **Persistent Visual Indicators**

Use the `dictionary_corrections_applied` data stored in the database to show permanent visual cues.

---

## Display Modes

### Mode 1: **While Editing** (Current Behavior)
- Orange badges on segments you're editing RIGHT NOW
- Shows real-time changes

### Mode 2: **Saved Versions** (NEW)
- Show which segments were edited when that version was created
- Use stored `dictionary_corrections_applied` data
- Permanent visual reference

---

## Visual Design

### Option A: Subtle Badge (Recommended)
```
┌──────────────────────────────────────┐
│ [0:45-0:48]                         │
│ ✓ Edited                             │ ← Small gray badge
│ This is the Smile Architect software │
└──────────────────────────────────────┘
```
- Small gray badge instead of orange
- Less intrusive
- Indicates historical edit

### Option B: Border Highlight
```
┌──────────────────────────────────────┐ ← Light gray border
│ [0:45-0:48]                         │
│ This is the Smile Architect software │
└──────────────────────────────────────┘
```
- Colored border around edited segments
- Simple, clean

### Option C: Icon Only
```
┌──────────────────────────────────────┐
│ [0:45-0:48]         ✏️               │ ← Small icon
│ This is the Smile Architect software │
└──────────────────────────────────────┘
```
- Tiny pencil icon
- Minimally invasive

### Option D: Combination (Best UX)
```
┌──────────────────────────────────────┐
│ [0:45-0:48]    ✏️ ✓ Edited          │
│ This is the Smile Architect software │
└──────────────────────────────────────┘
```
- Icon + small badge
- Clear visual cue without being overwhelming

---

## Implementation

### 1. Fetch Edit Data on Load

When displaying saved versions, check if `dictionary_corrections_applied` exists:

```typescript
// In the version display code
const versionWithEdits = version.dictionary_corrections_applied || []
const editedPositions = versionWithEdits.map(edit => ({
  start: edit.position_start,
  end: edit.position_end
}))
```

### 2. Match Segments to Edits

For each segment, check if it contains any edits:

```typescript
const segmentWasEdited = editedPositions.some(edit => 
  seg.start >= edit.start && seg.end <= edit.end
)
```

### 3. Apply Visual Indicator

If segment was edited, add the badge/icon/border:

```typescript
{segmentWasEdited && (
  <span className="text-xs text-gray-500 px-2 py-0.5 rounded border border-gray-300">
    ✏️ Edited
  </span>
)}
```

---

## Benefits

### For User
- ✅ **Quick scan:** See edit history at a glance
- ✅ **Review changes:** Identify what was corrected
- ✅ **Version comparison:** Compare H-1 vs H-2 vs H-3
- ✅ **Confidence:** Know what's been reviewed vs untouched

### For Workflow
- ✅ **QA process:** Verify corrections were made
- ✅ **Training:** See patterns of corrections
- ✅ **Audit trail:** Visual history of changes

---

## Edge Cases

### What if no edit data exists?
- Show nothing (graceful degradation)
- Only applies to versions saved with the new system

### What if edit data is corrupted?
- Fall back to no indicators
- Don't break the display

### Performance with many edits?
- Cache the edit positions
- Only calculate once per version load

---

## Recommendation

**Option D: Combination (Icon + Small Badge)**
- `✏️ ✓ Edited` badge
- Light gray color scheme (not orange)
- Right-aligned in the timestamp row
- Hover tooltip: "Edited in this version"

---

## Next Steps

Would you like me to implement persistent indicators?

**Implementation Plan:**
1. Modify version display to check for edit data
2. Add visual indicators to edited segments
3. Test with existing saved versions
4. Ensure graceful handling of versions without edit data

