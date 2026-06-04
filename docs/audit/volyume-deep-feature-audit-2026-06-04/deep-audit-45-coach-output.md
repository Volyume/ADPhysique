# Deep Feature Audit — Item 44: Coach Output (Precision Coaching) screen

**Document:** deep-audit-45-coach-output.md
**Item:** 44 of master inventory (screen #44 — `CoachOutputScreen` 🔒; "Precision Coaching" weekly output)
**File:** `src/screens/CoachOutputScreen.js` (2143 → 2068 lines)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added roles to the header back (icon-only, + label), the two "Done"/"Got it" buttons, and the two ED-lockout CTAs; removed 20 verified dead styles. The three other flagged keys (`milestoneData`, `refeed`, `macroCycle`) are not styles and were left. Attribute-only + dead-style removal; no behaviour or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The weekly "Precision Coaching" output: the coach's read of the week (calorie /
volume adjustments with apply/hold), what's working, adherence, an explainer state
for users still building a trend, a share-this-week action, and an **ED-pattern
safety lockout** surface with support links. Dates render in local time.

### Findings
1. **Substantial, careful surface.** The apply/hold coach actions and the
   ED-pattern lockout (sensitive, support-first copy) are well-handled, and **most
   interactive controls already had a11y** (the coach action buttons and share).
   Clean: **no em dashes**, local dates.
2. **A11y: ~5 controls remained** — the icon-only **header back**, the two **"Done"
   / "Got it"** buttons, and the two **ED-lockout CTAs** (support / read-more).
3. **20 dead style keys (verified).** Three removed feature sections
   (`adaptiveTDEE*` ×5, `amberCard*` ×5, `adherenceCard`/`adherenceText`), an old
   `header*` set (×4, replaced by the navigation header), `confidencePill*` ×2,
   `centred`, `loadingText`. **Three other flagged keys — `milestoneData`,
   `refeed`, `macroCycle` — are NOT styles** (a nav param and two domain-data
   objects); verified against `styles.<key>` with no `styles` destructuring, and
   left in place.
4. **Copy** not line-by-line reviewed, but no em dashes; the ED-lockout copy is a
   thoughtful, sensitive surface.

### Design assessment (values cited)
- On-system: `surface` cards, `warning`-tinted alert surfaces, `primary` apply
  actions, scale tokens, the share row, and a support-first ED-lockout. No
  fingerprints; the removed `adaptiveTDEE*`/`amberCard*`/`adherence*` styles were
  the last trace of three retired sections.

### Flow / integration assessment
- Reads the weekly coach result; renders adjustments + apply/hold, what's working,
  adherence, or an explainer/lockout state. Share routes to the milestone card.
  Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Weekly coaching summaries present highlights + adherence + adaptive
  recommendations; accessibility is a named UX best practice. Volyume's output
  matches the shape. [Athlytic; NIX United]

---

## STEP C — COMPARISON

### Where Volyume leads
- A genuine weekly coach read with a safety lockout and apply/hold actions.

### Where Volyume lags
- A11y on a few controls (fixed); 20 dead styles (removed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Remove the 20 verified dead styles** (explicitly not the 3 false positives).
   [Cleanup — Low]
2. **A11y.** `accessibilityRole="button"` + `accessibilityLabel="Back"` on the
   header back; `accessibilityRole="button"` on the two "Done"/"Got it" buttons
   and the two ED-lockout CTAs. [A11y — Low]

### COPY CHANGES
None.

### What to keep (with evidence)
- The coach actions, the explainer, the share, the ED-lockout, and all copy.
  [Athlytic; NIX United]

### IMPACT / EFFORT
- **Impact: Low–Medium.** A large dead-style cleanup; a few controls completed.
- **Effort: Low–Medium.** eslint 0 problems; the CoachOutput mount fuzz (12
  tests) stays green, and the three false-positive identifiers remain intact
  (`refeed` ×21, `macroCycle` ×15, `milestoneData` ×1).

### SOURCES
- Athlytic — AI fitness coach (weekly insights):
  https://apps.apple.com/us/app/athlytic-ai-fitness-coach/id1543571755
- NIX United — fitness app development (UX, accessibility):
  https://nix-united.com/blog/fitness-app-development/
