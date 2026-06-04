# Deep Feature Audit — Item 39: Year of Lifts screen

**Document:** deep-audit-40-year-of-lifts.md
**Item:** 39 of master inventory (screen #38 — `YearOfLiftsScreen`; Progress sub-stack, year-in-review)
**File:** `src/screens/YearOfLiftsScreen.js` (516 lines), components `GradientCard`, lib `database` (`getYearOfLiftsData`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added roles to the share and close buttons and the empty-state Done button, and gave the rewind/advance tap zones roles + "Previous card" / "Next card" labels so a screen reader can navigate the story. Attribute-only; no behaviour, layout, or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A Spotify-Wrapped-style swipe story: intro → stat cards (sessions, volume, sets,
busiest month) → top-lifts and PR lists → outro. Empty cards are filtered out so
a new user does not get a stretched deck. Navigation is horizontal swipe plus
narrow tap zones (left = back, right = advance), with progress pips, a
share-the-year button, and a close.

### Findings
1. **Well-built and on-brand.** `GradientCard` renders **flat** (a Card with a
   tone accent border — the locked "no gradients" rule is honoured; `intensity` is
   accepted but ignored), so no fingerprint. Dates use **local** components, so the
   year framing is correct. Clean: **no dead styles, no em dashes**,
   evocative-but-honest copy. The pips + swipe story is the legitimate intended
   format (justified in the header comment), not a template fingerprint.
2. **A11y gaps.** The **share** and **close** buttons had labels but no role; the
   empty-state **Done** button had no role or label; and the **tap zones**
   (rewind/advance) were unlabelled invisible `Pressable`s — so a screen-reader
   user had no accessible way to move through the story.
3. **Copy clean and on-voice.** "That's consistency." is a factual observation,
   not banned cheerleading. Nothing to reword.

### Design assessment (values cited)
- On-system: flat `GradientCard` story cards with tone accent, `primary` current
  pip, `borderSubtle` icon chips, big hero numbers (96px/44px, documented
  `no-restricted-syntax` exemptions), scale tokens. The share card carries factual
  stats only (no bodyweight/private data). No fingerprints.

### Flow / integration assessment
- `getYearOfLiftsData` → `buildCards` (drops zero-value cards) → horizontal
  `FlatList` (paging) with a narrow tap-zone band layered above (kept narrow so the
  FlatList owns the swipe gesture — a documented past Android fix). Share routes to
  the milestone `ShareCard`. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Story formats are usually swipe-only, a known accessibility weak point; the fix
  is **labelled tap/button alternatives** so a screen reader can advance/rewind.
  This is the basis for the tap-zone labels. [Spotify Design; Spotify a11y]

---

## STEP C — COMPARISON

### Where Volyume leads
- A genuine Wrapped-style year story, flat and on-brand, with a factual share card
  and a tight (empty-filtered) deck.

### Where Volyume lags
- Story navigation was not reachable by a screen reader (unlabelled tap zones) +
  missing roles (fixed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Share button.** `accessibilityRole="button"` (label present). [A11y — Low]
2. **Close button.** `accessibilityRole="button"` (label present). [A11y — Low]
3. **Done button (empty state).** `accessibilityRole="button"` + label. [A11y — Low]
4. **Tap zones.** `accessibilityRole="button"` + "Previous card" / "Next card"
   labels, so the story is navigable with a screen reader. [A11y — Low]

### Flagged (minor, not coded)
- A "Card X of N" position announcement would be nice, but the pips row also holds
  the share/close buttons, so wrapping it risks the flex layout — skipped.

### COPY CHANGES
None.

### What to keep (with evidence)
- The swipe story, the pips, the flat cards, share, and all copy. [Spotify Design]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The story could not be navigated by a screen reader
  without the labelled tap zones.
- **Effort: Low.** Attribute-only. eslint 0 problems; all YearOfLifts screen-mount
  variants pass (incl. a11y and rapid-tap fuzz).

### SOURCES
- Spotify Design — accessibility:
  https://spotify.design/stories/noted/accessibility
- Spotify for Developers — accessibility guidelines:
  https://developer.spotify.com/documentation/accessibility
