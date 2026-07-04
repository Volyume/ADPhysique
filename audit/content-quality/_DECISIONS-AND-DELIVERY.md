# Content-Quality Audit — Delivery, Decisions & Checklist

**Date:** 2026-07-04. Orchestrated by Fable; four Opus agents generated and
inspected REAL outputs (plan builder, advanced techniques, meal builder, coach
voice) and benchmarked them against current evidence (web-verified). Full audits:
`plan-builder.md`, `plan-builder-techniques.md`, `meal-builder.md`,
`coach-voice.md`.

---

## Headline verdicts (all four, honestly)

1. **Training programmes: genuinely good and evidence-based, not arbitrary.**
   Exercise selection, rep/rest/RIR by phase, MEV→MRV ramp with deload, and
   safety caps are principled. Inputs genuinely drive differentiated output
   (Bikini vs Men's Physique produce bespoke splits; experience moves weekly sets
   45→82). The one real weakness is a *time-budget trimmer* that floors volume
   below the engine's own MEV at 60-min sessions — an engine decision, below.
2. **Supersets: PRINCIPLED, not random.** 274/274 generated pairings pass the
   "would a coach object?" test — the engine never pairs competing muscles, never
   pairs a heavy compound, protects the opener, caps at 2/workout, excludes
   beginners. Drop sets can't be mis-placed (they're user-selected in the logger,
   not generated). One real rest-timer bug found (below).
3. **Meals: sensible at normal calories, number-fitting at the extremes.**
   Combinations are all real UK meals; per-meal protein spaces well at 1600–3300
   kcal. At a hard/floored target the solver dumps load on one staple (297 g steak
   in one meal) and uses low-density foods as macro sinks (500 g green beans).
4. **Coach voice: reads as a real, knowledgeable, calm British coach** — one of
   the strongest bodies of copy in the app. Defects were concentrated in the older
   `whyThisTemplates.js` (which, unlike every other coach module, didn't guard
   dashes). Fixed this turn.

---

## APPLIED this turn (safe, unambiguous, non-engine — done + gate green)

Coach-voice copy fixes (British register, house-style, non-ED), full suite green
(430 suites / 5925 tests), locked snapshot updated for the intentional change:
- `whyThisTemplates.js` — removed inferred-feeling filler ("This is what good
  progress feels like"); replaced the clipped command "Come back stronger." with
  "...so the next block starts fresher."; fixed two live en-dashes ("1–2 more
  reps"→"1 to 2", "48–72 hours"→"48 to 72").
- `CoachOutputScreen.js` — "Change nothing. The plan is working." → "Nothing to
  change. The plan is working." (softens the clipped imperative on the app's best
  week).

## QUEUED safe fixes (documented with exact edits in the audit files; not engine)

Surfaced transparently — this turn's git-recovery incident consumed the session,
so these clearly-safe items are itemised ready-to-apply, not silently dropped:
- **Coach voice (coach-voice.md):** 3 remaining copy nits + add a dash-assertion
  to `whyThisTemplates.clean()` so a live dash can never ship again (every other
  coach module already guards it).
- **Coach-surface design (coach-voice.md):** convert the non-ED hand-rolled boxes
  on `CoachOutputScreen` (`coachLeadCard`, `focusCard`, `planEditCard`,
  `countdownCard`) to `Card` and hand-rolled `fontSize+fontWeight` to `type.*`
  roles — the ED/safety boxes stay bespoke and founder-supervised. (Folds into the
  coaching-screen hands-on Card pass already planned.)
- **Plan builder (plan-builder.md):** one "Why this plan?" progression copy line
  overstates weekly progression; exact wording fix in the doc.

---

## DECISIONS FOR THE FOUNDER (engine / deterministic-output / ED — NOT auto-changed)

Each has full evidence + a proposed change in its audit file. Nothing here was
touched. One-line "do X" unblocks each.

### Training engine (plan-builder.md)
- **T-A · 60-min sessions floor volume below MEV.** At the default 60-min budget
  the trimmer floors 6 muscles to 3 sets, dropping e.g. back to 6 direct
  sets/week — below the engine's own intermediate MEV (10). Options: raise the
  floor, protect priority muscles from the trimmer, or nudge users to a longer
  session when volume can't fit. **Engine change → your call.**
- **T-B · 5-day PPL puts legs at 1×/week** (below the ≥2× frequency benchmark).
- **T-C · de-emphasised structural muscles fall under their own maintenance floor.**
- **T-D · beginner full-body carries a 2:1 pull:push imbalance.**

### Advanced techniques (plan-builder-techniques.md)
- **K-1 · Rest timer never fires *between superset rounds*.** Within-pair rest is
  correctly suppressed (A→B, no timer) — good — but the auto-jump is
  order-agnostic so B also jumps straight back to A, so the ~60–120s post-pair
  rest never fires, contradicting the code's own comment. **This is a clear
  behavioural bug with an exact patch in the doc — recommend applying;** flagged
  as a decision only because it changes live in-session timing. Your go and I fix
  it with a test.
- **K-2 · Superset pairing is a safe *filter*, not a deliberate antagonist
  matcher** (greedy first-compatible-adjacent walk → skews to small-muscle
  filler). Safe today; a tier-ranked antagonist matcher would make pairings
  better. **Engine change → your call.**

### Meals (meal-builder.md) — deterministic output; some ED-adjacent
- **M-1 · Solver uses low-density veg/free foods as macro sinks** (500 g green
  beans; a 177 kcal trailing "meal"). Proposed: exclude veg/free from the staple
  solver + tighten the veg gram range. Changes generated meals → **your call.**
- **M-2 · Per-meal protein distribution not enforced near a floored target**
  (297 g steak = 103 g protein in one meal for a floored female profile).
  **ED-SAFETY-ADJACENT — HOLD-only, never auto-fixed.** The target itself
  (P165 @ 1200 kcal) is set upstream in `nutritionEngine.js` (floor territory).
- **M-3 · Vegan variety is thin** (library gap: ~4 vegan breakfasts) — a content
  addition, not code.

### Coach voice — ED-safety HOLDs (coach-voice.md) — never rewritten
- **V-1 · `ED_PATTERN_CLEARED_COPY` "Take this gently"** matches a phrase the
  locked voice spec explicitly REJECTED. **Flagged, not changed** — ED wording.
- **V-2 · "we"-framing** diverges from the locked Surface-1 register in
  lockout/rapid-loss copy.
- **V-3 · `RapidLossAlert` "Consider eating a little more"** register check.
  All three are ED-safety copy — founder + the locked spec decide.

---

## ON-DEVICE SPOT-CHECK CHECKLIST (physical Android, EAS build)

1. **Generated plan — superset pairings:** build a plan likely to include
   supersets (intermediate+, hypertrophy, 4–5 days). Confirm each superset pairs
   sensible accessories (e.g. biceps+triceps, calves+abs), never two competing
   compounds, never the opener. In-session: confirm NO rest timer between the two
   paired exercises, and note whether a rest timer fires *after* the pair before
   the next round (K-1 — expected to be MISSING until fixed).
2. **Generated day of meals:** open a generated day at a normal target (~2200
   kcal) — confirm each meal is a real plate with a protein anchor. Then a
   low/floored target — watch for a single oversized staple or a tiny trailing
   meal (M-1/M-2, expected until decided).
3. **Coach output screen wording + design:** trigger a weekly review. Read every
   line as a sceptical British lifter — confirm no dashes, no clipped commands, no
   AI tells. Note whether the coach cards look consistent with the newer Card
   surfaces or read as an older generation (design queue item).

---

## PROCESS NOTE (for the founder)

A concurrency incident occurred during the parallel UI codemod: a nested agent
ran `git stash` in the shared working tree, which swept up every parallel agent's
uncommitted edits. No committed or production code was lost; the work was
recovered from the stash and the codemod batch shipped green. **Fix adopted: no
more concurrent file-mutating agents in one working tree — codemod work now runs
sequentially or worktree-isolated.** The Mesocycle and Plans screens were reverted
to a clean base and are queued for a safe redo.
