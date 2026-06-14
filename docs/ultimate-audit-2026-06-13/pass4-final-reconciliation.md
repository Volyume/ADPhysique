# PASS-4 — FINAL RECONCILIATION (exit gate)

Per `_AUDIT-SPEC.md:273-282`. Honest status: the gap-accounting passes; the gate as a whole is **BLOCKED until the
NEEDS-ANSWER register is cleared** (read-answerable NA-ids resolved + founder-decision NA-ids decided).

## 1. Every Pass-3 gap resolves to blueprint / deferral / no-action (zero lost)
Source of gaps: `pass3-comparison-matrix.md` (15 areas + 7 v2 domains) + `pass3-v2-founder-decisions.md`.
- **BLUEPRINT (19 approved build items)** — across: `pass4-blueprint-calorie-banking.md` (CB-1),
  `pass4-blueprints-micronutrients.md` (MN-1), `pass4-blueprints-nutrition.md` (raw/cooked, grocery list, gate
  cycling, protein-consistency, windows), `pass4-blueprints-coaching-progress.md` (recomp view, autonomy modes,
  plan diff), `pass4-blueprints-workout-recap.md` (keyboard-complete, mid-session swap, recap share/monthly/
  relative), `pass4-blueprints-cardio-ux.md` (passive cardio, cardio trend, timeline logging, core-haptics).
- **DEFERRED** — `pass4-deferred.md`: paid UK food DB; velocity/tempo; VBT; mood correlation; wellbeing-output;
  commission device-walk; UX teardown; PG breadth parse; EL size parse; carried Q1.
- **NO-ACTION** — `pass4-no-action.md`: 18 founder-dismissed gaps + the CONFIRMED-YES leads.
**Accounting: every gap maps to exactly one disposition. None vanished. ✓**

## 2. Material findings from blueprinting (read-confirmed — REDUCE the build)
Several "approved build" items are **already largely built** (the audit/decisions overstated them):
- Recap **share/export + monthly cadence**: already built under prior "COMP-005" (`YearOfLiftsScreen.js:167-249,
  :425-471`; `ShareCardScreen.js:603-705`; `scheduler.js:893-908`) → near no-op; only a relative anchor on the
  tonnage hero remains.
- Mid-session **swap** already exists and is routine-safe (`ActiveWorkoutScreen.js:319-342`); only the "keeps
  volume tracking" clause is unmet.
- **Passive cardio** infra mostly exists (`cardio_log` cols `database.js:1221-1223`; cursor `health.js:588-656`).
- **Cardio trend** pieces exist (`summariseWeekCardio`, `cardioComplianceFromLog`).
- **Timeline logging**: meal model already a flexible numbered ladder (`mealSlots.js`), not fixed buckets.
→ RECOMMEND: reclassify the already-built recap items toward no-action in a founder review; net new build is
smaller than the 19-item list implies.

## 3. NEEDS-ANSWER status — 66 OPEN → GATE BLOCKED
`pass4-needs-answer-register.md`: 66 NA-ids open (nutrition 10, coaching 16, workout/recap 11, cardio/UX 20,
calorie-banking 5, micronutrients 4). Categorised: most ANSWERABLE BY TARGETED READ; a defined set are FOUNDER
DECISIONS; one BLOCKED on Q1 schema authority. Per `_AUDIT-SPEC.md:270-271,277-278`, NO blueprint is final and
the gate cannot pass while any NA-id is open.

## 4. Voice / tagging check
Blueprints written to the locked voice (British English, no em/en dashes, no banned phrases, jargon only via
opt-in/tap). Source-tagging present on factual sentences; spot-checks of agent tags (SettingsCoaching:36-39,
coachApply:202/220, RootNavigator:152/154/320/388, database:1221-1223, package.json:63) all VERIFIED — no
fabrication found. A full banned-phrase + untagged-claim sweep is part of clearing the gate.

## GATE VERDICT: **NOT YET PASSED** (gap-accounting ✓; blocked on 66 open NA-ids).
TO PASS: (a) Opus-8 read pass answers every read-answerable NA-id with file:line; (b) founder decides the
FOUNDER-DECISION NA-ids; (c) Q1 schema authority resolved (unblocks MN-1); (d) full banned-phrase/untagged-claim
sweep. Then re-run this gate.
