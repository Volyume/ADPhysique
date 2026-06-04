# Deep Feature Audit — Item 33: My Recipes screen

**Document:** deep-audit-34-my-recipes.md
**Item:** 33 of master inventory (screen #31 — `MyRecipesScreen`; Diary sub-stack, recipe-list modal)
**File:** `src/screens/MyRecipesScreen.js` (206 lines), components `BackHeader`, `SkeletonRow`, libs `food/db` (`listRecipes`, `deleteRecipe`, `applyRecipeToDiary`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added an `accessibilityHint` so the row's long-press delete is announced, and `accessibilityRole="button"` to the "New recipe" header button, the edit button, and the empty-state CTA. Attribute-only; no behaviour, layout, or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The user's composed recipes. Tap a row to log one serving to the slot/date you
came from, the pencil edits, long-press deletes, the header plus builds a new one.
Skeleton while loading, a clear empty state with a "Build a recipe" CTA. The
delete confirm is genuinely helpful ("The recipe goes from your list. Past entries
you logged from it stay in your diary.").

### Findings
1. **Clean and well-built.** Log-as-one-line recipes, honest delete copy, good
   empty state, an in-flight `loggingId` guard. Clean: **no dead styles, no em
   dashes, tokens throughout**; the shared `BackHeader` back button is already
   fully accessible (role + "Go back").
2. **A11y gaps.** The row had a button role and a "Log {name}" label, but its
   **long-press delete was an invisible gesture with no hint** — a screen-reader or
   switch user could not discover or trigger it (priority). The **"New recipe"**
   header button, the **edit** button, and the **empty-state CTA** had labels/text
   but no `accessibilityRole="button"`.
3. **Copy clean and on-voice.** Nothing to reword.

### Design assessment (values cited)
- On-system: plain bordered rows, `primary` add-affordance + edit/new glyphs,
  `textMuted` meta, scale tokens. The only row icons are the functional edit
  pencil and the add-circle affordance, not decoration. No fingerprints.

### Flow / integration assessment
- `useFocusEffect` reloads on focus (so a return from the builder shows fresh).
  Tap → `applyRecipeToDiary` (one serving) → back; returns null when the recipe
  has no ingredients, surfaced as a toast. Edit/create push the builder with the
  slot/date carried forward. Delete confirms then soft-deletes and reloads. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- A hidden long-press action should be **announced via `accessibilityHint`** so it
  is discoverable, and ideally backed by a **visible button alternative**, since
  motor and switch-control users cannot long-press. This is the basis for the
  finding-2 hint (and the flagged design follow-up). [TestParty; Deque]

---

## STEP C — COMPARISON

### Where Volyume leads
- Log-a-recipe-as-one-line plus the honest delete explanation (past entries stay).

### Where Volyume lags
- The long-press-only delete (no hint, no visible alternative) and the missing
  control roles.

### Critical gaps
- None functional, but the long-press delete was a real discoverability blocker
  for assistive tech (now announced via the hint).

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Recipe row.** `accessibilityHint="Long press to delete"` so the delete
   gesture is announced (matches the Manual Builder exercise-row pattern). [A11y — Low]
2. **"New recipe" header button.** `accessibilityRole="button"`. [A11y — Low]
3. **Edit button.** `accessibilityRole="button"` (label already present). [A11y — Low]
4. **Empty-state CTA.** `accessibilityRole="button"` + label. [A11y — Low]

### Flagged for the founder (design, not coded)
- Delete is long-press-only with no visible alternative, so motor/switch users
  cannot reach it even with the hint. A visible delete affordance (or
  swipe-to-reveal) would be the fuller fix. [TestParty]

### COPY CHANGES
None.

### What to keep (with evidence)
- The tap-to-log flow, edit, the create CTA, and all copy. [TestParty; Deque]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The long-press delete was undiscoverable to assistive
  tech; the controls now all announce as buttons.
- **Effort: Low.** Attribute-only. eslint 0 problems; not in the screen-mount
  sweep (modal), so lint is the gate.

### SOURCES
- TestParty — mobile accessibility patterns (gestures, visible alternatives):
  https://testparty.ai/blog/mobile-accessibility-patterns
- Deque University — VoiceOver iOS gestures:
  https://dequeuniversity.com/screenreaders/voiceover-ios-shortcuts
