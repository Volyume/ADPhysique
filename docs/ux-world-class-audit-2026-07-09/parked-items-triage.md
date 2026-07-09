# Parked-items triage — "the 18 unapproved-parked items" (2026-07-09)

Read-only triage against the founder's no-silent-parking rule (CLAUDE.md
Section 4, 2026-07-03): every previously parked/held/deferred item must be
surfaced as a question, not left sitting. This document is the search record,
the per-item status, and the resulting short list of genuinely open
questions.

## 1. Provenance — there is no standalone "18-item register"

I searched exhaustively and did not find any document, section, or list
anywhere under `docs/` that is titled, numbered, or counted as "18
unapproved-parked items."

What I checked:
- Both 2026-07-03 directive files in full:
  `docs/directive-2026-07-03-next-level-disposition.md` and
  `docs/directive-2026-07-03-usability-disposition.md` — the ones the task
  brief already flagged as not containing the list on a quick grep. Confirmed:
  they contain APPROVED/REJECTED/HELD dispositions (9 REJECTED+HELD items
  across both — P1,P2,P4,P5,P6,P8,P12 REJECTED, P3,P11 HELD; plus D6,D9,D10
  HELD/GATED and a D1-D7 FOUNDER DECISION PACK) but never state a count of 18
  anywhere, and are not structured as a single register.
- `docs/next-level-proposal-2026-07-03.md` (the source proposal behind the
  next-level directive): 15 items, P1-P15. Not 18, no "18" string present.
- `docs/decision-pack-2026-07-03-d1-d7.md`: the D1-D7 pack referenced above.
  All of D1, D2, D3, D4, D5, D7 are recorded as DECIDED in this same file
  (dated 2026-07-03) — they were resolved the same day they were raised.
- `grep -rn "18" docs/**/*.md` for anything reading "18 item(s)",
  "18 parked", "18 unapproved": the only hit is the queue line itself in
  `docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md:150-152`,
  which is where this task's brief number originates — and that line says
  in its own words that the register was "not found by quick grep in the
  2026-07-03 directive files." It is a forward-looking task description, not
  a citation of an existing list.
- `docs/CODE_TRUTH_SURVEY.md:2575` has an item numbered "18" (v1.1 deferred
  features), but that is position 18 in an unrelated long enumerated survey,
  not a count of parked items.
- `docs/ultimate-audit-2026-06-13/_AUDIT-STATUS-AND-RESUME.md` — the file
  CLAUDE.md's own STATUS banner cites for the 6 decision-gated items 11-16
  (named autonomy modes, raw/cooked toggle, mid-session-swap wording,
  Core-Haptics dependency, timeline food logging, micronutrients/NRV) — read
  in full. It is a 19-item numbered blueprint list (1-17 plus 19 total
  approved items), of which 1-10 and 17 are shipped to `main`; 11-16 remain
  decision-gated. Six items, not 18, and CLAUDE.md already surfaces these at
  the top of the constitution — they are not a hidden register.
- `docs/volyume-elite-audit/WHOLE-APP-FAILURE-REGISTER-2026-07-04.md`: a
  separate, later "nothing was parked" register with its own 4-item
  "Track B" founder-decision list (ED fail-closed sweep, ED-5 consent copy,
  NAV-2 BodyMetrics edit/delete, VC-1 selected-state grammar/amber). Not 18
  either, and its own closing line explicitly states nothing in it was
  parked — items are either Track A (safe, no decision needed) or Track B
  (explicit decision required).
- Broad greps for "parked", "held", "for later", "tunable", "deferred" across
  all of `docs/**/*.md` (see command log): dozens of hits, the large
  majority of which are either (a) already-recorded founder decisions in one
  of the dated decision registers below, (b) explicit "not parked, only
  surfaced" disclaimers written by prior sessions in direct response to the
  founder's 2026-07-02 correction ("I did not park anything... only the
  founder parks/kills, in his own words" — `docs/decisions-2026-07-02-e15-e8-e9.md`),
  or (c) unrelated uses of the word (e.g. a sync-queue row "parked a year
  out" after max retries, `docs/sync-architecture-evidence-2026-07-02.md`).

**Conclusion on provenance:** no 18-item register exists. The number in the
queue line appears to be either an estimate written before this search was
done, or an approximate tally of scattered founder-decision items across
several audits that was never actually enumerated as one list. I have not
found a combination of items across the corpus that totals exactly 18
through any documented grouping — I checked several candidate groupings
(the two 07-03 directives' REJECTED+HELD+DECISION-PACK items combine to 9+9
if D8 and D10 are excluded, which is close but not a natural "register" and
those 07-03 items are almost entirely already resolved — see section 3).
Per the task's fallback instruction, I therefore assembled the register from
primary sources: every parked/held/deferred/"for later" marker in `docs/`
that does not have a recorded founder decision against it.

## 2. Decision registers checked (so nothing settled gets re-asked)

- `docs/directive-2026-07-03-next-level-disposition.md` (founder directive,
  = a decision register in itself)
- `docs/directive-2026-07-03-usability-disposition.md` (ditto)
- `docs/decision-pack-2026-07-03-d1-d7.md` (D1-D7 resolved same day)
- `docs/design-usability-audit-2026-07-09/DECISIONS-2026-07-09.md` (D1-D7,
  large set of resolved lanes/gated items)
- `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` (assessment
  + dietary rulings)
- `docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md` (running
  log — the FABLE ADVERSARIAL REVIEW hold, exercise-planning docs, etc.)
- `docs/decisions-2026-07-02-e15-e8-e9.md` (the founder's own correction
  that "unselected ≠ parked")
- `docs/ultimate-audit-2026-06-13/_AUDIT-STATUS-AND-RESUME.md` +
  `pass3-v2-founder-decisions.md` (items 1-17, decision-gated 11-16)
- `docs/volyume-elite-audit/PHASE-2-DECISIONS-AND-PLAN.md` (D1-D6 for that
  audit's own gated items — a different D1-D6 to the ones above, same
  naming convention reused across audits)

Anything ruled REJECTED / HOLD / NO / "not ruled on, do not re-surface" in
any of these is treated as settled below and NOT re-asked.

## 3. Per-item status

### 3a. `directive-2026-07-03-next-level-disposition.md` items

| Item | Status | Evidence |
|---|---|---|
| P1/P2/P4 store listing/ASO copy | **SUPERSEDED — REJECTED**, out of scope until launch declared | Directive itself |
| P5 iOS production release | **SUPERSEDED — REJECTED** | Directive itself; also STANDING CORRECTION reinforces "store-related is out of scope" |
| P6 Android widget family | **SUPERSEDED — REJECTED** ("parked with all distribution work") | Directive itself |
| P8 year-in-review / shareable stats | **SUPERSEDED — REJECTED** | Directive itself |
| P12 coach partnerships | **SUPERSEDED — REJECTED** | Directive itself |
| P3 ED-safety as marketing copy | **SUPERSEDED — HELD** by founder directive, reconfirmed as HOLD 2026-07-09 (paywall social proof "NO. Stays dark.") | `DECISIONS-2026-07-09` (ux-world-class) |
| P11 exercise media | **SUPERSEDED — HELD**, reconfirmed 2026-07-09 ("Exercise media programme: HOLD... do not re-propose") | `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` |
| A1 UK food-data hit-rate | Approved; **status not re-verified this pass** (large workstream, own audit trail) | `docs/audit/a1-uk-food-hitrate.md` referenced in directive |
| A2 rest-day notification surface | **STILL OPEN — not built.** Grepped `src/lib/notifications/` for a rest-day category: none found. The D5 decision (decision-pack) attached a condition that "the A2 rest-day surface must be re-specified before build" (trigger + copy), and that re-specification was never produced. | Code grep (no match); `decision-pack-2026-07-03-d1-d7.md:118-123` |
| A3 E12 sync consolidation steps 2-3 | Ongoing background engineering, not a parked decision | `docs/e12-sync-consolidation-memo-2026-07-03.md` |
| A4 bundle cut 4 | **Founder-side action still outstanding** ("Cut 4 seed walk" listed under FOUNDER-SIDE in the current handover) — not a founder decision, a device-walk action | `_HANDOVER-AND-RESUME.md:171` |
| A5 quick-win basket | **PARTIALLY DONE.** `getCoachOutputHistory` (database.js:6284) still has **no `deleted_at` filter** on its query — confirmed by direct read, this sub-item was never built. RootNavigator's `lazy` item appears moot/already resolved differently (the file uses a custom `lazyScreen()` code-splitting helper, not React Navigation's Screen `lazy` prop). PR-5 batching and the vitals-cadence item: vitals item was explicitly dropped by the STANDING CORRECTION ("A5 loses the vitals-cadence item"). | Code read, `src/lib/database.js:6284-6288`; `src/navigation/RootNavigator.js` |
| A6 Wear OS 7 scoping memo | **DONE** — `docs/wearos7-scoping-memo-2026-07-03.md` exists (memo only, no build, matching the approved scope) | File exists |

### 3b. `directive-2026-07-03-usability-disposition.md` items

| Item | Status | Evidence |
|---|---|---|
| Wave A-D build items | Large approved backlog; largely built across the 2026-07 waves per `wave-a-build-status-2026-07-03.md` and later handovers — not re-audited line by line in this pass (out of scope for a parking triage; nothing here reads as silently parked) | |
| D1-D7 decision pack | **ALL RESOLVED same day** (D2, D3, D5 decided; D1, D4, D7 decided via founder-delegated wording) | `decision-pack-2026-07-03-d1-d7.md` |
| D6 exercise demo media | **SUPERSEDED — HELD**, reconfirmed 2026-07-09 | as above |
| D9 quiz-first flag | **SUPERSEDED — HELD** (stays OFF) | Directive itself |
| D10 What's New currency | **SUPERSEDED — settled as a process note**, and device checklists were separately retired entirely by the STANDING CORRECTION | Directive itself + STANDING CORRECTION |
| D8 CoachReviewScreen free-tier derivation drift (weeksSinceLastDeload hardcoded, jointPain type mismatch) | **APPEARS ALREADY FIXED.** Current code (`CoachReviewScreen.js:360-378`) computes `weeksSinceLighter` dynamically from real set data — no hardcoded `99` found anywhere in the file. The jointPain read at line 158 uses `(c.jointPain || c.jointDiscomfort || 0) >= 1`, a defensive OR-fallback that handles both shapes. No open bug reproduced by reading; recommend a quick confirmation test rather than treating as still open. | `src/screens/CoachReviewScreen.js:158,360-378` |

### 3c. Ultimate-Audit decision-gated items 11-16

**Not re-surfaced as new findings** — CLAUDE.md's own STATUS banner already
names these explicitly at the top of the constitution (11 named autonomy
modes, 12 raw/cooked toggle, 13 mid-session-swap wording, 14 Core-Haptics
dependency, 15 timeline food logging, 16 micronutrients/NRV = MN-1). They are
**STILL PARKED, needs founder decision** in the sense that no decision has
landed, but they are already the most visible open item in the whole repo,
not a hidden 18-item list. Source: `docs/ultimate-audit-2026-06-13/_AUDIT-STATUS-AND-RESUME.md:322-333`. I looked for evidence any of the six shipped since
the 2026-06-26 STATUS UPDATE and found none (no autonomy-mode UI, no
raw/cooked toggle, no Core-Haptics dependency in `package.json`).

### 3d. WHOLE-APP-FAILURE-REGISTER Track B (2026-07-04) — 4 items

| Item | Status | Evidence |
|---|---|---|
| ED fail-closed sweep (ED-1,2,3,4,6,7,8) | **LIKELY DONE**, not exhaustively re-verified. A code sample across `HomeScreen.js`, `DiaryScreen.js`, `CoachOutputScreen.js`, `WorkoutSummaryScreen.js`, `YearOfLiftsScreen.js`, `WeeklyStoryScreen.js`, `CoachHeldHistoryScreen.js` shows the fail-open `.catch(() => null)`/`false` pattern replaced everywhere sampled by a `'read_failed'` sentinel (treated as suppressing), and `BodyMetricsScreen.js:508` explicitly does `.catch(() => setEdFlagOpen(true))` (fail-closed). No fail-open site found in this sample. Recommend a dedicated regression-guard confirmation pass before calling it fully closed, but there is no live "still parked" question here. | Code grep across 10 files |
| ED-5 Article 9 consent-copy accuracy (`isLocalDbEncrypted()`) | **LIKELY DONE** — `isLocalDbEncrypted()` exists and is referenced near the Article 9 consent copy path (`database.js:150` comment: "read isLocalDbEncrypted() to keep privacy copy honest") | `src/lib/database.js:27,150` |
| NAV-2 BodyMetrics edit/delete of a logged weigh-in | **STILL OPEN — no founder decision found, not built.** Grepped `BodyMetricsScreen.js` for edit/delete/update handlers: none found. | Code grep, no match |
| VC-1 selected-state grammar + amber hue (bright `#F5A623` vs deep `#E08C0B`) | **AMBIGUOUS — appears de-facto resolved by using both**, not via a recorded founder decision. `theme.js` now defines `primary: '#F5A623'` (bright, small accents) and `primaryFill: '#E08C0B'` (deep, large fills) as two distinct token roles rather than picking one. This reads like an implementer default rather than an explicit founder call recorded anywhere I found. Related and still genuinely open: `theme.js:183-200` flags the whole light-theme colour set (including a retuned `warning` token) as "**Pending founder brand sign-off**" before public release — this matches the "LT-3 light-elevation policy... stay founder-decision items" note in the 2026-07-09 handover. | `src/styles/theme.js:53-54,183-200,194-200` |

### 3e. Other genuinely open items found (not part of any settled register)

| Item | Status | Evidence |
|---|---|---|
| CoachOutput RED-S/autoregulation footer tooltip wording | **STILL OPEN.** Explicitly recorded as not-yet-decided in two separate 2026-07-09 decision registers ("still open... needs founder-reviewed wording"). | `design-usability-audit-2026-07-09/DECISIONS-2026-07-09.md:219-220`; `ux-world-class-audit-2026-07-09/_CAMPAIGN-STATUS-AND-RESUME.md:317` |
| LT-3 light-elevation policy / CP-10 restart-free theming (StyleSheet-baking means theme/a11y toggles need an app restart) | **STILL OPEN**, explicitly named as staying a founder-decision item in the current handover, and CP-10 separately flagged as "architectural, not in this round" | `_HANDOVER-AND-RESUME.md` queue section; `DECISIONS-2026-07-09` (design-usability) D7 close |
| Exercise-planning plan-A (library expansion, 5 questions) | **STILL OPEN**, ready-formed MCQs already exist in the source doc | `docs/exercise-planning-2026-07-09/plan-A-library-expansion.md:403-447` |
| Exercise-planning plan-B (weak-point set-stacking fix, 6 questions) | **STILL OPEN**, ready-formed MCQs already exist in the source doc | `docs/exercise-planning-2026-07-09/plan-B-weak-point-sets.md:470-533` |
| FABLE adversarial review findings R1 (mealAdditions carry no FSA tags, can show an allergen the profile is meant to filter) and R2 (nutritionEngine.js:402 D4 naming violation, "The Coach has held" in an ED-safety insight) | **RECORDED, NOT FIXED, but under an explicit founder HOLD** ("adversarial whole-diff review HELD until everything else is done... do not fix until the review resumes") — this is a founder-directed pause, not a silent park; no new question needed until the review resumes | `_HANDOVER-AND-RESUME.md:249-262` |
| Halal/kosher diet axis | **SUPERSEDED — explicitly deferred by founder** as a separate future decision (not a silent park; a recorded choice to defer) | `ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:28` |
| Billing default reconciliation, apply-all, giant sets | **SUPERSEDED** — founder ruling on record: "Not ruled on. Do not build; do not re-surface unprompted." This is itself the founder's decision (to leave it unruled and not be asked again) | `ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:20` |
| A5 `getCoachOutputHistory` deleted_at filter (see 3a) | Small, already-approved fix, not awaiting a decision — just unbuilt | Code read |

## 4. Counts

- Items reviewed across all sources above: 33 named items/clusters.
- **ALREADY DONE / appears fixed in code:** A6 (Wear OS memo), D8 (CoachReview bug), ED fail-closed sweep (sampled), ED-5 (consent copy accuracy) — 4.
- **SUPERSEDED by a recorded founder decision (settled, not re-asked):** P1,P2,P4,P5,P6,P8,P12 (REJECTED), P3,P11,D6,D9,D10 (HELD), D1-D5+D7 (decision pack, all decided), billing/apply-all/giant-sets (explicit no-touch), Halal/kosher (explicit defer), R1/R2 (explicit hold) — 19.
- **STILL OPEN, genuinely needs a founder decision:** A2 rest-day surface re-specification, NAV-2 BodyMetrics edit/delete, VC-1/light-theme sign-off, CoachOutput RED-S tooltip wording, LT-3/CP-10 restart-free theming, Ultimate-Audit items 11-16 (already visible in CLAUDE.md), exercise-planning plan-A, exercise-planning plan-B — **8 clusters** (11-16 counts as one already-surfaced cluster of six).
- **Approved-but-unbuilt (no decision needed, just a to-do):** A5 deleted_at filter, A4 bundle-cut device walk — 2.

No 18-item register exists anywhere in `docs/`. The above is the full,
evidence-checked substitute, built from primary sources per the task's
fallback instruction.

## 5. Founder decision questions (genuinely open only)

1. **A2 rest-day notification surface.** The original decision pack flagged
   this as needing re-specification (trigger + copy) before any build, and
   that re-spec was never produced. Do you want this re-specified and
   presented now, or should it stay off the active queue?
   a) Re-specify now (produces a fresh decision pack: trigger source, copy,
      quiet-hours/ED suppression, before any code).
   b) Leave off the queue for now; revisit later.
   c) Kill it outright — no rest-day notification, ever.

2. **NAV-2 — BodyMetrics edit/delete of a logged weigh-in.** No edit/delete
   path exists today for a mis-logged weight entry. The 2026-07-04 audit
   flagged this as founder-owned because of the ED-adjacency of any new
   weight-write path.
   a) Approve edit-only (correct a mis-typed value, no delete).
   b) Approve edit + delete + "see all" history.
   c) Leave as-is (no edit/delete surface).

3. **VC-1 / light-theme colour sign-off.** `theme.js` already carries a
   working light-theme palette (including a retuned `warning` token) but
   flags it explicitly as "Pending founder brand sign-off before public
   release." Are the current light-theme colours (background `#FAFAF7`,
   primary ink `#8A5200`, warning `#6E6300`, etc., `theme.js:185-206`)
   approved as-is, or do you want an on-device review first?
   a) Approved as coded — ship it.
   b) I want to review it on-device before it ships.
   c) Something specific needs changing — state what.

4. **CoachOutput RED-S / autoregulation glossary + footer tooltip wording.**
   Two ED-adjacent copy entries are still waiting on founder-reviewed exact
   wording before the footer tooltip can ship.
   a) Draft the wording now for your review (STRONG/hands-on, ED-safety
      review before ship).
   b) Leave the footer tooltip unbuilt for now.

5. **LT-3 light-elevation policy / CP-10 restart-free theming.** Today,
   theme and accessibility toggles (e.g. font-scale, contrast) require an
   app restart because styles are baked at StyleSheet-creation time. This is
   an architectural change (would need components to re-render on token
   change, not just re-read a static object).
   a) Worth the architectural work — scope it as its own project.
   b) Leave it as "toggle then restart" for now; not worth the churn.

6. **Exercise-planning plan-A (library expansion).** Five questions are
   already fully written as multiple-choice in
   `docs/exercise-planning-2026-07-09/plan-A-library-expansion.md`
   section 6 (sizing option A/B/C, whether to add the empty "Bands" filter's
   ~14 exercises now, whether ab rotation becomes a required subregion,
   whether distance-cardio belongs in the strength library, and a front-delt
   machine-press reclassification call). Do you want to answer those five
   now?

7. **Exercise-planning plan-B (weak-point set-stacking fix).** Six questions
   are already fully written as multiple-choice in
   `docs/exercise-planning-2026-07-09/plan-B-weak-point-sets.md` section 5
   (set cap 3 vs 4, preserve vs trim weekly MRV totals, exercises-per-muscle
   ceiling, thin-equipment fallback behaviour, scope to auto-gen only or also
   the manual builder, and grandfather vs prompt vs force-migrate existing
   over-stacked plans). Do you want to answer those six now? Note Q6 option
   C (silently force-rewriting existing routines) is flagged in the source
   doc as very likely undesirable and is included only so you can explicitly
   rule it out.

8. **Ultimate-Audit items 11-16** (already named at the top of CLAUDE.md,
   repeated here only because the no-parking rule requires every open item
   to be an active question, not passively referenced): named autonomy
   modes (11, safety-adjacent — auto-apply during a coaching hold), raw/
   cooked toggle (12 — needs a sourced conversion factor, none exists in
   code today), mid-session-swap wording (13 — small build once wording is
   confirmed), Core-Haptics (14 — new native dependency, needs name+licence
   approval), timeline food logging (15 — replace vs toggle the existing
   entry UI), micronutrients/NRV (16 — new `migrate_088+` schema). For each:
   proceed now / hold further / reject outright?

## 6. What I did not do

Per the read-only constraint, no code or docs were changed. Per the no-
silent-parking rule, nothing above is presented as a recommendation for the
"lighter" option — each question lists the real choices including the
option to build in full. Items already settled by a recorded founder
ruling (section 3, "SUPERSEDED") are listed for completeness only and are
NOT repeated as questions in section 5.
