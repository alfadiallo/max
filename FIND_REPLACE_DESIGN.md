# Find & Replace Panel Design

## Concept

**Two-column display:**
- **Left column:** Original text occurrences (what you're searching for)
- **Right column:** Replacement suggestions (what they'll become)

User can review, accept, or reject each replacement individually.

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Find & Replace                                         │
├─────────────────────────┬───────────────────────────────┤
│                         │                               │
│  ORIGINAL (Find)        │  REPLACEMENT (Replace)        │
│                         │                               │
│  ✓ small architect      │    Smile Architect            │
│    [0:45-0:48]          │                               │
│    "...then use the     │  "...then use the            │
│     small architect to  │   Smile Architect to         │
│     create..."          │   create..."                 │
│                         │                               │
│  ✓ small architect      │    Smile Architect            │
│    [2:15-2:18]          │                               │
│    "The small architect │  "The Smile Architect        │
│     software is..."     │   software is..."            │
│                         │                               │
│  □ small architect      │    Smile Architect            │
│    [5:30-5:33]          │                               │
│    "...how the small    │  "...how the Smile           │
│     architect works"    │   architect works"           │
│                         │                               │
├─────────────────────────┴───────────────────────────────┤
│  Actions: [ ✓ Apply Selected (2) ] [ ✕ Cancel ]        │
└─────────────────────────────────────────────────────────┘
```

---

## How It Works

1. **User clicks "Find & Replace" button** (in editor)
2. **Panel opens** with search fields
3. **User enters:**
   - Find: "small architect"
   - Replace with: "Smile Architect"
4. **System scans all segments** for matches
5. **Panel populates with two-column list:**
   - Left: Each occurrence with context
   - Right: Preview of replacement
6. **User reviews and checks boxes** for ones to apply
7. **User clicks "Apply Selected"**
8. **System updates** only checked segments
9. **User saves** the version normally

---

## Features

### Visual Design
- **Side-by-side comparison** (original | replacement)
- **Checkbox per occurrence** for selective replacement
- **Context around each match** (2-3 sentences)
- **Timestamps** for each occurrence
- **Match count** at top (e.g., "3 occurrences found")

### Functionality
- **Select All / Deselect All** checkbox
- **Preview before applying**
- **Case-sensitive toggle**
- **Whole word only** toggle (optional)
- **Cancel** to close without applying

### After Apply
- All checked replacements **immediately applied** to segments
- **Orange badges** appear on updated segments
- User can **save version** normally
- **Undo** functionality could revert the entire operation

---

## UI Placement

**Option 1:** Modal/Overlay
- Large popup over the editor
- Focused on the operation
- Doesn't disrupt current view

**Option 2:** Panel at Top
- Drops down above the side-by-side editor
- Stays visible while reviewing
- Can collapse/minimize

**Option 3:** Side Panel
- Slides in from the right
- Editor stays visible on left
- Can drag to resize

---

## Example Interaction

1. **User in Edits tab** editing H-3
2. **Clicks "Find & Replace"** button (next to "Edit" button)
3. **Panel opens** with:
   ```
   Find: [________________]  Replace: [________________]
   ```
4. **User types:**
   ```
   Find: "small architect"
   Replace: "Smile Architect"
   ```
5. **System finds 3 occurrences** across segments
6. **Panel shows list** with checkboxes
7. **User checks 2 of 3** occurrences
8. **Clicks "Apply Selected (2)"**
9. **Panel closes**, segments updated
10. **Orange badges** appear on the 2 edited segments
11. **User clicks "Save Version"**
12. **Done!** Only those 2 replacements saved

---

## Edge Cases

- **No matches:** Show message "No occurrences found"
- **Very long list:** Paginate or virtual scroll (50+ matches)
- **Partial word matches:** Option to toggle whole-word-only
- **Case variations:** Case-insensitive search by default
- **Special characters:** Handle quotes, parentheses, etc.
- **Empty replacement:** Allow clearing text (replace with nothing)

---

## Next Step

**Would you like me to build this?**

If yes, I'll implement:
1. Find & Replace button in the Edits tab
2. Modal panel with two-column view
3. Search logic to find all occurrences
4. Checkbox list with context
5. Apply functionality
6. Integration with existing save flow

**Alternative:** Start with simpler version (just text fields + Apply All button) and iterate?

