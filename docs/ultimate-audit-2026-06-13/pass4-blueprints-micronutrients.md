# PASS-4 BLUEPRINT — Micronutrients / NRV (cluster: NUTRITION-SCHEMA; spine item, hand-written)

Mandated format per `_AUDIT-SPEC.md:252-271`. Schema migration → DB rules apply (docs/rules/supabase.md); written
hands-on, not by an agent. Decision: `pass3-v2-founder-decisions.md` Section A "ACCEPTED (build)". **NOT FINAL —
blocked by open NA-mn-1 (Pass-1 Q1 schema authority).** Tags: [P1:file:line] · [P2] · [P3] · [INFERENCE].

## ID / CLUSTER / TITLE
MN-1 / NUTRITION-SCHEMA / Micronutrient + NRV tracking
- PRIORITY TIER: Tier-2. IMPACT: medium-high (Cronometer-grade depth; UK NRV). EFFORT: LARGE (schema migration
  across local SQLite + Supabase + sync + seed + display). PRIORITY SCORE: [INFERENCE] high-effort → sequence
  ALONE, after the schema-authority question is resolved.

## CURRENT STATE
- The food schema carries macros + fibre/sodium/sugar per 100g ONLY, no vitamins/minerals: `foods` and
  `custom_foods` insert columns `kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g, sodium_100g,
  sugar_100g` [P1:src/lib/food/db.js:239-240,:1298-1306].
- Resolution/logging reads those same fields [P1:src/lib/food/db.js:733-737,:1139-1143].
- Seed sources: OpenFoodFacts-UK (branded) + CoFID-UK (~3k generic) [P1:src/lib/food/seed.js:7-13]. CoFID is
  rich in micronutrients in its source dataset [INFERENCE — must verify actual columns imported, NA-mn-2].
- Diary shows macros + fibre + water, no micronutrients [P3:pass3-comparison-matrix.md NU MISSING].

## THE GAP
[P3] No vitamin/mineral tracking vs NRV; below the Cronometer micronutrient bar [pass3-comparison-matrix.md NU/FL].

## THE EVIDENCE
[P2] Cronometer = the micronutrient-depth bar (84 nutrients, nutrient reports) — VERIFIED, Claude live-browsed
[pass2-input-v2-02-claude.md, D4]. Corroborated by Gemini [pass2-input-v2-03-gemini.md] (SIMULATED). Not a top
behaviour-change driver per the same research, but a credibility/depth feature.

## NEWBIE EXPERIENCE AFTER CHANGE
Optional, behind a tap; a beginner is never confronted with 84 nutrients. Plain framing ("key vitamins and
minerals"), not jargon.

## ATHLETE EXPERIENCE AFTER CHANGE
A competitor can check micronutrient sufficiency vs UK NRV during a long cut.

## IMPLEMENTATION BLUEPRINT
FILES TO CHANGE:
- `src/lib/food/db.js:239-240,:1298-1306` [P1] — add NEW micronutrient columns to `foods` + `custom_foods`.
- `src/lib/food/db.js:733-737,:1139-1143` [P1] — extend resolve/log to carry the new fields.
- `src/lib/food/seed.js:7-13` [P1] — import micronutrient columns from CoFID (and OFF where present).
- Supabase migration (new file under `supabase/`) + sync mapping [P1: NEEDS ANSWER NA-mn-3 for the sync registry
  file]. Local SQLite migration alongside.
- Diary display (a micronutrient panel behind a tap) [P1:src/screens/DiaryScreen.js — MacroRings region].
- NRV reference table NEW (UK NRV values) [INFERENCE].

DATA: NEW columns (vitamins/minerals per 100g) on `foods` + `custom_foods`; NEW UK-NRV reference constants.
Missing micros render as "unknown", never 0 [P3 honesty].

COMPONENT STRUCTURE: new `MicronutrientPanel` under the diary day [INFERENCE]; parent `src/screens/DiaryScreen.js`.

USER FLOW: log food as today → optional "vitamins & minerals" panel shows totals vs UK NRV for the day/window.

ENTITLEMENT GATING: PRO (food domain) [P1: same Pro gate as Diary — NEEDS ANSWER NA-mn-4].

EMPTY STATE: "We don't have the vitamin and mineral data for some of these foods yet." [British, plain.]
LOADED STATE: per-nutrient total vs UK NRV. ERROR STATE: standard load failure copy.

EDGE CASES: foods lacking micro data → "unknown" not 0; UK label law deducts fibre from carbs (already handled)
— keep NRV maths UK-compliant [P2:pass2-input-v2-03-gemini.md D4 UK-specific, SIMULATED].

DUAL-AUDIENCE DESIGN: off by default / behind a tap (newbie-safe); full depth available to athletes.

## VERIFICATION — NOT FINAL (open NA-ids)
- **NA-mn-1 (BLOCKING):** Pass-1 Q1 schema authority — which of setup_complete.sql (252 cols) / schema.sql (187)
  / migrations (114) is authoritative? A schema migration cannot be written until resolved
  [P3:_AUDIT-STATUS-AND-RESUME.md; pass4-deferred.md carried item]. files: supabase/setup_complete.sql,
  supabase/schema.sql, supabase/migrate_*.sql
- NA-mn-2: which micronutrient columns does the CoFID import actually carry? | files: src/lib/food/seed.js, the
  CoFID snapshot builder, assets/seed/cofid_uk.dat
- NA-mn-3: the sync registry/mapping file for new food columns | files: src/lib/sync.js, src/lib/food/libraryDelta.js
- NA-mn-4: exact Pro gate fn for the diary/food surfaces | files: src/components/ProGate.js, RootNavigator.js
INVARIANT TESTS: migration idempotent; unknown micros render unknown not 0; NRV maths UK-compliant; sync round-trips
the new columns.
