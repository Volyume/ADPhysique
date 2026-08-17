# CAMPAIGN 24 — HOSTILE REVIEW

Fresh adversarial pass, no stake in the campaign's success. Branch
`claude/campaign24-whole-app` at HEAD `d4cc0f5d`, baseline main `e5319811`
(both verified exact via `git log`/`git diff`). British English throughout.

Scope note on classification: **CONFIRMED** = reproducible from source
right now, exact path given. **PLAUSIBLE** = the source supports it but a
device/runtime condition is needed to observe the user-visible effect.
**REFUTED-ON-INSPECTION** = attack attempted, defence held; recorded as
coverage evidence, not as padding.

---

## 0. Headline: the tree is not green

`npm test` (jest, full suite) at HEAD: **5 failed suites, 13 failed tests**,
988 passed suites / 13430 passed tests otherwise. `npm run lint` is clean.
`npm run check:imports` fails with 1 unresolved-import error. This directly
contradicts CLAUDE.md §4 landing discipline ("run `npm run lint && npm
test`... report the exact output... small per-feature commits... then
push") and the branch's own "waves commit individually after lead review"
claim, and it means `npm run release:check` — the project's declared
"final arbiter" — currently fails outright, because `check:imports` is
wired into `release:quality` which `release:check` runs before tests even
start. See §1 and §2 for root causes (both confirmed, both cheap to fix,
neither is a live safety regression on inspection — the fixed logic moved,
the guards weren't moved with it).

---

## 1. CONFIRMED findings

### F1 — `npm test` fails on 5 suites at the proposed merge point (process/landing-discipline defect)

Route: n/a (test infrastructure). Files: as below. Production impact: none
directly (these are dev-time guards, not shipped code), but it falsifies
the "green tree, ready to merge" claim carried by every wave commit and by
CLAUDE.md §4's non-negotiable landing gate.

- **`src/navigation/__tests__/rootNavigatorAuthLatch.guard.test.js:45`**
  expects the literal `const authLatchTimer = setTimeout(() =>
  setInitialAuthResolved(true), 8000)` in `RootNavigator.js`. Wave E
  (`f47ea44e`) deliberately rewrote this exact callback into a multi-line
  block (`src/navigation/RootNavigator.js:1244-1247`) that also sets
  `authGaveUp`. The guard was never updated to match its own wave's
  headline fix, so the test that is supposed to pin the fix's contract now
  fails against the fixed code.
- **`src/lib/__tests__/deletionRetry.test.js:121`** ("the retry is AWAITED
  inside the sign-in pipeline, before the cross-account gate") does a raw
  `indexOf` search for the string `@volyume_last_supabase_user_id` in
  `RootNavigator.js` and asserts it comes after the retry call. Wave E
  added an earlier, unrelated occurrence of that same string at
  `RootNavigator.js:1229` (the new `hadPriorSession` marker read), which
  the crude string search now finds first, breaking the assertion. I
  manually re-verified the actual Article‑17 ordering the test intends to
  guard (`RootNavigator.js:1378` retry await vs `:1394` real gate read) is
  still correct — **the erasure-retry ordering itself is fine**, but the
  regression guard for it is now blind to future breakage.
- **`src/__tests__/campaign1.integrity.test.js:504`** ("P0-7:
  permissive-default defects are closed") expects `jointRated.length` to
  appear in `HomeScreen.js`. The global cohesion commit (`d4cc0f5d`)
  extracted this exact ED-adjacent joint/soreness-averaging logic out of
  `HomeScreen.js` into `buildLast4WeekDeloadBuckets`
  (`src/lib/algorithms.js:607-680`). I manually re-verified the
  answered-only averaging invariant (never coercing an unrated value to
  zero) is intact at the new location (`algorithms.js:655-680`) — **the
  safety property survives**, but this P0-7 guard no longer checks it and
  will not catch a future regression in `algorithms.js`.
- **`src/__tests__/campaign6.longTerm.test.js:332`** ("R-12: a gap week is
  an accumulation boundary, never fatigue evidence") reads
  `src/hooks/useProgressData.js` looking for `if (wkSets.length === 0)
  return wk;`. The same `d4cc0f5d` commit moved this logic into
  `buildLast4WeekDeloadBuckets` too. I verified the rule survives verbatim
  at `algorithms.js:711` (`if (wkSets.length === 0) return wk; //
  accumulation boundary, not a rest week`) — **again safety-intact,
  guard-blind**.
- **`src/__tests__/lazyScreens.guard.test.js:96`** ("screen requires exist
  only in RootNavigator, inside lazyScreen loaders") fails with one
  offence: `lib/partners/signals.js`. Root cause is the same JSDoc comment
  discussed in F2 below — see there for detail. One stray comment breaks
  two independent regression suites simultaneously.

Net effect: four of five failures are the direct, traceable result of
Campaign 24's own refactors (Wave E's auth-latch rewrite, the global
cohesion pass's bucket-builder extraction) outrunning the regression
guards meant to pin them, and the fifth (F2) is a documentation artefact
in a doc comment. None reflect a live product regression I could find —
but "the guard tests are broken, trust the manual re-audit instead" is
precisely the failure mode CLAUDE.md's test discipline exists to prevent,
and it means the safety invariants in `algorithms.js` are currently
**unguarded by any automated regression test** until these four suites are
repointed.

### F2 — `check:imports` fails: a JSDoc comment in `signals.js` is parsed as a real import, and also trips the lazy-screens guard

Route: n/a (build-time script + regression test). File:
**`src/lib/partners/signals.js:77`**. Introduced by Wave D (`d8ad7e2a`).

The doc comment on `maxPartnersForTier` (lines 69-83) quotes, verbatim,
RootNavigator's own lazy-loader line to justify why the free-tier branch
is dead code:

```
withProGuard(require('../screens/PartnerScreen').default, 'Training
partner'))
```

`scripts/check-imports.cjs` deliberately does **not** strip block comments
(its own header explains why — line-comment stripping is enough for every
other case in the repo), so this require-shaped string inside a `/** */`
block is treated as a real dependency. Resolved relative to
`src/lib/partners/` (not `src/navigation/`, where the quoted line actually
lives), `../screens/PartnerScreen` points at the non-existent
`src/lib/screens/PartnerScreen`, and the checker reports it UNRESOLVED.
The same match trips `lazyScreens.guard.test.js`'s "no bare `require`
outside RootNavigator" rule, since it doesn't know the string is inside a
comment either (F1 above).

Impact: `npm run check:imports` — wired into `release:quality` and thus
`release:check` (`package.json:27`, `"npx tsc --noEmit --strict && npm run
lint && npm run check:imports && npm test"`) — fails on a clean checkout
of this exact branch. **`release:check`, the project's declared final
arbiter, cannot currently pass.** This is not a runtime bug (nothing in
the shipped app reads this comment), but it blocks the CI gate the whole
campaign is supposed to be merging behind.

### F3 — `NutritionTargetsScreen.js` (Wave F, marked NO_CHANGE_REQUIRED) has 4 confirmed hardcoded-kg sites, the exact defect class Waves A/D fixed elsewhere

Route: ProfileTab → NutritionTargets (`src/screens/NutritionTargetsScreen.js`,
register row 147, gated Pro). File does **not** import
`src/lib/units.js` or read the store's `bodyWeightUnits` field anywhere
(`grep` for both returns zero hits) — despite the app having a real,
user-facing body-weight unit preference (`st` / `kg` / `lbs`, defaulting
to stone, `useAppStore.js:1904`) that Waves A and D spent real effort
wiring through `WorkoutSummaryScreen`, `BlockReflectionScreen`,
`WeightTrendCard`, `BodyMetricsScreen`, `ProgressPhotosScreen` and
`YearOfLiftsScreen` via `formatBodyWeight`/`formatBodyWeightRate`.

Four sites, all rendered directly to the user, all hardcoding `kg`
regardless of the user's chosen display unit:

- `NutritionTargetsScreen.js:1083` — the collapsed-form summary chip:
  `` `${sex...} - ${age}yrs - ${heightFt}ft... - ${weight}kg - ${phase}` ``.
  A UK user who has set stone/lbs display (the app's own default) sees
  their own body weight relabelled in a unit they never chose.
- `NutritionTargetsScreen.js:1389` and `:1391` — the "why" explanation
  copy for gain/cut targets: `` `...roughly ${rateAbs.toFixed(2)} kg/week.` ``,
  inside text that otherwise carefully converts calories via
  `formatEnergy`/`energyUnitLabel` (i.e. the screen clearly knows how to
  respect a unit preference — it just never does it for weight-rate).
- `NutritionTargetsScreen.js:1641` — the rate summary line: `` `${sign}${results.targetRateKgPerWeek} kg/week` ``.

Impact: any Pro user who set body-weight display to stone or pounds sees
a `kg/week` figure and an `Xkg` body-weight chip on their own targets
screen, contradicting the unit convention every sibling screen now
follows post-campaign. This is a direct miss by Wave F's audit of a
screen it explicitly certified "passed, no material change" — the exact
class of defect (UNIT_DEFECT, hardcoded kg) that the campaign spent two
whole waves correcting elsewhere.

### F4 — `FINDINGS-LEDGER.md` is stale/contradicted by the very commits it should index

File: **`docs/whole-app-coherence-campaign-24-2026-08-17/FINDINGS-LEDGER.md`**,
rows 14 and 15-17. The ledger states, as of the current HEAD:

> `RoutineDetailScreen.js` STATE_DEFECT — "Recorded — silent no-op on
> invalid sets/reps save; correction specified (change plan item 4), **not
> yet applied**"
>
> `MesocycleBuilderScreen.js` AUTHORITY_DEFECT (Class C) — "Recorded —
> duplicate deload judgement... correction specified, **not yet applied**"

Both are false at HEAD. `git show --stat 909fbd76` (Wave A) and direct
source inspection confirm both fixes shipped in that very commit:
`RoutineDetailScreen.js:297-319` now shows a warning toast
(`toast.show('Enter a value for sets and reps before saving', { variant:
'warning' })`) instead of the silent no-op, with an inline comment citing
this exact ledger row; `MesocycleBuilderScreen.js:98-110` documents, in
detail, the removal of the `evaluateAutoReg`/`predictDeloadWeek` advisory
call site. The ledger's own header claims it is "the index" for these
findings — an index that contradicts the commits it indexes undermines
the "register truth" claim for the whole campaign, not just these two
rows. (I did not exhaustively check every "not yet applied" row against
source — these two were sampled as part of the vector-1 screen sweep and
both turned out to be stale in the same direction, i.e. under-claiming
progress rather than over-claiming it. Founder-facing risk is low but the
document cannot currently be trusted as a status source without
cross-checking source.)

### F5 — Two "lead ruling recorded" claims in commit messages point at rulings that do not exist in any decisions document

This is the most serious finding in the review: it's a governance gap on
exactly the two items the campaign itself flagged as requiring a
non-delegable, explicitly recorded decision — one of which is
ED-safety-adjacent.

**F5a — CoachReviewScreen deload-derivation fork.**
`WAVE-C-FINDINGS.md` (and `FINDINGS-LEDGER.md:27`) record this as a
"FOUNDER FORK... three resolution options presented, not yet decided."
`GLOBAL-COHERENCE-DECISIONS.md:359` states explicitly: **"`CoachReviewScreen.js:356-431`
— EXCLUDED pending a founder ruling"**, and `:417`: "no change unless/until
the founder rules on §2.3's fork." Yet the final commit, `d4cc0f5d`,
claims in its own message: *"Global cohesion... lead ruling recorded for
the CoachReview fork"* — and the code was in fact changed:
`CoachReviewScreen.js:373-390` now calls the shared
`buildLast4WeekDeloadBuckets` on the "D6-correct answered-only path,"
explicitly described in-line as *"a deliberate, disclosed change to this
screen's deload-signal sensitivity."* I grepped
`GLOBAL-COHERENCE-DECISIONS.md` (the exact file the commit cites) for
`"lead ruling"`, `"D6-correct"` and `"unifies onto"` — **zero hits on all
three**. The only place this ruling's rationale exists is an inline code
comment; no decisions document anywhere in the repo (`GLOBAL-COHERENCE-DECISIONS.md`,
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`, or any
other) records that a lead ruling was actually made, by whom, or why —
despite CLAUDE.md's own D33 law: *"Every ruling is recorded with
rationale in the decisions register."*

**F5b — BodyMetricsScreen ED-safety fork.** `WAVE-D-FINDINGS.md:582-624`
flags this even more strongly: it is explicitly Section-2 ED-safety
territory, **not** a D33-delegable item ("requires explicit founder
sign-off before any code changes... Section 2 STOP-and-ask... independent
of the unit fixes at the same screen"). Commit `d8ad7e2a`'s message
nonetheless claims *"lead ruling recorded for the ED-safety item"* — and
the code was changed: `BodyMetricsScreen.js:597` now derives through the
shared `deriveWeightTrend`, wiring the calm/ED suppression through to this
screen for the first time. I searched the entire campaign docs folder for
any record of this fork's resolution outside `WAVE-D-FINDINGS.md` itself
— **none exists.** On inspection the shipped code is technically sound
(§2 confirms the raw chart still renders under suppression, only the
rate/maintenance commentary is withheld, matching the Progress root
exactly) — but CLAUDE.md is unambiguous that Section 2 inviolables
(including "if a task touches [ED-safety]: STOP and ask first") are
**not** transferred by D33 delegation, and there is no evidence anywhere
in the repository that the founder was actually asked or actually
answered before this ED-safety-adjacent surface was changed.

**F5c — three of five promised working-record files don't exist.**
`CAMPAIGN-24-OVERVIEW.md:50-56` names five "Working records": `FINDINGS-LEDGER.md`,
`CROSS-SCREEN-AUTHORITY-FINDINGS.md`, `GLOBAL-COHERENCE-DECISIONS.md`,
`FOUNDER-RULINGS.md`, `FINAL-LANDING.md`. Only the first three exist as
files; `FOUNDER-RULINGS.md` (explicitly the file meant to hold "only
genuinely undecidable forks... target: zero") and `FINAL-LANDING.md` (the
promised "33-section handover at close") were never created (`find
docs/whole-app-coherence-campaign-24-2026-08-17 -type f` confirms this).
Given F5a/F5b, `FOUNDER-RULINGS.md` not existing is not a minor
housekeeping gap — it is the one document that should have made these two
rulings auditable, and it was never written.

### F6 — the screen register still describes a decision as "pending" that the campaign's own final commit resolved

Route: n/a (documentation). File:
**`docs/ux-screen-programme-2026-08-17/SCREEN-UX-REGISTER.md:87`**. The
`CoachReview` row's status note reads: *"Campaign 24 Wave C: deload
authority decision pending (see WAVE-C-FINDINGS.md); device validation
pending"* — but per F5a, that decision was made and shipped by the very
last commit on the branch (`d4cc0f5d`). The register was not
re-synchronised after the campaign's own closing commit, so a reader of
the register at HEAD is told a decision is outstanding when the code
already reflects an answer.

### F7 — the sign-out marker used by the new auth-boot gate is never cleared, so a genuinely signed-out device can be shown the retry wall instead of Welcome

Route: cold app launch, WelcomeStack vs. the new `auth_retry` state
(`src/navigation/RootNavigator.js`, decision function
`src/lib/authBootGate.js`). `grep -rn "volyume_last_supabase_user_id"`
across the whole `src/` tree returns exactly four hits, all in
`RootNavigator.js`: two reads used to compute `hadPriorSession`
(`:1229`, `:1512`), one read for the cross-account gate (`:1394`), and
**one write, on sign-in only** (`:1524`,
`AsyncStorage.setItem('@volyume_last_supabase_user_id', session.user.id)`).
There is no `removeItem` for this key anywhere in the codebase — sign-out
does not clear it.

`classifyAuthBoot` (`src/lib/authBootGate.js:52-58`) returns `'auth_retry'`
whenever `authGaveUp && !hasUser && hadPriorSession`. Since the marker is
permanent once written, **any device that has ever signed in retains
`hadPriorSession = true` forever, including after an explicit, deliberate
sign-out.** So: user signs in once, later signs out on purpose, later
reopens the app on a stalled/slow network where `bootstrap()` doesn't
answer within the 8-second latch (`authGaveUp` fires) — this device now
shows the bounded `auth_retry` screen (styled like the `dbInitFailed`
error state, per Wave E's own commit message) instead of going straight to
Welcome. There is a "Go to sign in" escape hatch, so nobody is
technically stranded, but a user who deliberately signed out is shown
what reads as an error/retry screen rather than the expected
tier-selection Welcome page — the precise inverse of Wave E's own stated
product law ("never speculatively render logged-out/tier UI" — this
over-corrects into speculatively rendering an error state for a genuinely
logged-out device). Classified CONFIRMED for the source fact (marker never
cleared, logic deterministic); the specific user-visible trigger (slow
network at the exact moment after a sign-out) needs a device to observe,
so treat the on-screen consequence as high-confidence PLAUSIBLE.

---

## 2. PLAUSIBLE findings

- **P1** (= F7's on-device manifestation): a signed-out user seeing the
  retry wall instead of Welcome requires a real slow/stalled network at
  cold boot; the logic path is confirmed in source but I cannot trigger a
  live network stall from a read-only static review. Recommend a
  device test: sign in, sign out, force airplane-mode-then-partial-network
  or throttle to trigger the 8s latch, cold-launch, and confirm which
  screen appears.

No other PLAUSIBLE findings survived — everything else attempted either
confirmed cleanly from source or was refuted on inspection (below).

---

## 3. REFUTED-ON-INSPECTION (attacks attempted, defence held)

- **CoachReview gate coverage (vector 3).** Attempted to show the
  `inScheduledRecovery` gate could miss either the "What to watch" row or
  the recommendations list. Both are gated by the same
  `deloadSuggestionEligible` derivation
  (`CoachReviewScreen.js:443`, consumed at `:612` for the empty-state and
  `:655` for the actual InsightRow, and independently at `:115` inside
  `buildRecommendations`). Defence holds — single source of truth, both
  surfaces covered.
- **BodyMetrics ED-suppressed state hiding the chart it shouldn't
  (vector 3).** Attempted to show the raw trend chart disappears under
  suppression. `WeightTrendChart` (`BodyMetricsScreen.js:219-264`) renders
  unconditionally once `allWeights.length >= 2`; `edFlagOpen` is only
  threaded into the `weightTakeaway` narrative text, never into the
  chart's render gate. Defence holds.
- **Startup-flash: FRESH device stranded by `authGaveUp` (vector 3).**
  `classifyAuthBoot` only returns `'auth_retry'` when `hadPriorSession` is
  true; a fresh install has no marker, so `authGaveUp` alone routes to
  `'navigate'` → Welcome, exactly as intended. Defence holds.
- **Startup-flash: genuine resolution racing the 8s timer (vector 3).**
  Every genuine-resolution branch (`RootNavigator.js:1049, 1069, 1156,
  1203`) sets `authGenuinelyResolvedRef.current = true` synchronously
  before/alongside its own `setInitialAuthResolved(true)` call; the
  give-up branches (`:1221, 1235, 1245`) all gate `setAuthGaveUp(true)` on
  that same ref being false. `initialAuthResolved` is a one-shot latch
  (never reset to `false` anywhere — confirmed by the still-passing "never
  reset" guard test). No interleaving in JS's single-threaded execution
  model produces a stuck retry screen over a genuine resolution. Defence
  holds.
- **Locked-surface diff audit (vector 4).**
  `git diff e5319811..HEAD -- src/screens/ActiveWorkoutScreen.js` → **zero
  diff**. `git diff e5319811..HEAD -- src/screens/AnalyticsScreen.js` →
  **zero diff**. `git diff e5319811..HEAD -- src/screens/HomeScreen.js` →
  two hunks: an import-line addition (`buildLast4WeekDeloadBuckets`) and
  the corresponding call-site swap, exactly as claimed — no other change
  in the file. All three locked-surface claims hold exactly as stated.
- **NOTIFICATIONS_LOCKED.md reconciliation vs. shipped code (vector 6).**
  Verified `EVENT_PRIORITY` in `src/lib/notifications/budget.js:43-57`
  (10 items, including `activation_nudge` and `planned_meal_confirm`)
  matches the reconciled table exactly; manually counted the `CATEGORY`
  enum in `src/lib/notifications/categories.js:17-51` at 22 live entries,
  matching the corrected count; confirmed the morning-weight on/off switch
  claim against `CoachingRemindersScreen.js:104-110, 473-481` (a real,
  wired `Switch`/`handleMorningToggle`). No gate or suppression wording
  was touched by any of the three reconciliations. Defence holds.
- **Em dashes in user-facing copy (vector 2).** `grep -rln '—'
  src/screens` returns 14 files; every occurrence sampled
  (`WorkoutSummaryScreen.js`, `CoachOutputScreen.js`,
  `WeeklyStoryScreen.js` and others) is inside a `//` or `/** */` code
  comment, never inside a rendered string. Lint (`eslint . --max-warnings
  0`) passes clean. Defence holds.
- **Prescriptive/authority copy outside authoritative surfaces (vector
  2).** The only live hit for "add weight when you are ready" is
  `ActiveWorkoutScreen.js:130`, inside the FOUNDER_ACCEPTED,
  zero-diff-against-baseline live-prescription surface — explicitly the
  kind of surface CLAUDE.md's own audit language exempts
  ("livePrescription consumers"). No survivor found on a non-authoritative
  display surface.
- **Register acceptance counts (vector 7).** Recounted directly:
  61 `NO_CHANGE_REQUIRED` + 24 `IMPLEMENTED` + 1 `FOUNDER_ACCEPTED` = 86
  status-carrying rows, matching the claimed total exactly (the 87th
  table row, `paywallExcerpts.js`, is explicitly marked "Not a production
  screen" and correctly excluded from the count). Defence holds on the
  arithmetic, even though F6 shows one row's narrative text is stale.
- **Sampled NO_CHANGE_REQUIRED screens (vector 1): `SettingsHealthScreen.js`
  and `WellbeingCheckScreen.js` read in full.** No unit literals (Health
  screen has no weight display, only permission toggles), no dead CTAs,
  no guilt/shame language (`WellbeingCheckScreen.js:89-93`'s SCOFF
  follow-up copy is calm and non-judgemental, matching
  `COACHING_VOICE_SYNTHESIS_LOCKED.md`'s stated voice), correct
  accessibility treatment of the five-question radiogroup (`:116-151`),
  and an accurate, previously-corrected dual-storage privacy disclosure
  (`:175-181`). Both screens' Wave F/G "passed" verdicts hold up under
  direct reading.

---

## 4. Verdicts by vector

1. **Screens marked done without real review.** One confirmed miss out of
   10 sampled `NO_CHANGE_REQUIRED`/passed rows (`NutritionTargetsScreen.js`,
   F3) plus one register-narrative staleness (F6, CoachReview). 8 of 10
   sampled rows held up completely under direct reading.
2. **Stale authority residue.** No confirmed hits. The one prescriptive
   string found lives on the explicitly authorised, zero-diff
   ActiveWorkout surface.
3. **The campaign's own fixes.** CoachReview gate and BodyMetrics chart
   both refuted as attack targets (defences hold); the startup-flash state
   machine holds for fresh-device and race-condition attacks but **fails**
   the sign-out-then-slow-network attack (F7).
4. **Locked-surface regressions.** None. ActiveWorkout and Analytics are
   byte-identical to baseline; Home's diff is exactly the claimed
   bucket-dedup import+call.
5. **Cross-screen semantics.** One confirmed unit-literal survivor
   (F3, 4 sites in one screen). No week-boundary or duplicate-CTA issues
   found in the material sampled.
6. **Safety/suppression leaks.** None found. Notification doc
   reconciliations verified accurate against shipped code; no gate wording
   touched.
7. **Register truth.** Acceptance counts verified correct (arithmetic
   holds); but the underlying process documents (F4, F5, F6) show the
   campaign's own truth-telling about *what was decided and by whom* is
   the weakest part of this campaign, not the code.

---

## 5. Report summary

1. **File written:** `docs/whole-app-coherence-campaign-24-2026-08-17/HOSTILE-REVIEW.md`.
2. **CONFIRMED findings: 7** —
   F1: 5 failing test suites at HEAD (auth-latch guard, deletion-retry
   ordering guard, two ED-adjacent P0-7/R-12 guards, lazy-screens guard) —
   all traceable to Campaign 24's own refactors outrunning their pinning
   tests, no live safety regression found on manual re-check.
   F2: `check:imports` fails (and doubles as F1's fifth cause) due to a
   JSDoc comment in `signals.js` quoting a `require()` path verbatim,
   blocking `release:check`.
   F3: `NutritionTargetsScreen.js` hardcodes `kg` at 4 user-facing sites,
   ignoring the user's `bodyWeightUnits` preference, in a screen Wave F
   certified NO_CHANGE_REQUIRED.
   F4: `FINDINGS-LEDGER.md` contradicts its own indexed commits on at
   least 2 rows (claims "not yet applied" for fixes that shipped).
   F5: two "lead ruling recorded" commit-message claims (CoachReview
   deload fork, BodyMetrics ED-safety fork) point at rulings that do not
   exist in any decisions document anywhere in the repository — one of
   these is explicitly Section-2 ED-safety territory that CLAUDE.md says
   is never D33-delegable; `FOUNDER-RULINGS.md` and `FINAL-LANDING.md`,
   the two files meant to make such rulings auditable, were never created.
   F6: the screen register still marks the CoachReview decision "pending"
   after the campaign's own final commit resolved it.
   F7: the sign-out flow never clears the `hadPriorSession` marker the new
   auth-boot gate relies on, so a deliberately signed-out device can be
   shown the bounded retry/error screen instead of Welcome on a slow
   network.
3. **PLAUSIBLE findings: 1** — P1, the on-device manifestation of F7
   (needs a real network stall to observe; the logic is deterministic and
   already confirmed in source).
4. **Refuted-attack count per vector:** vector 1 — 2 of 10 sampled rows
   held with findings, 8 clean; vector 2 — 2 attacks refuted (em dashes,
   prescriptive copy), 0 confirmed; vector 3 — 4 attacks refuted (CoachReview
   double-gate, BodyMetrics chart, fresh-device strand, genuine-resolution
   race), 1 confirmed (F7); vector 4 — 3 attacks refuted (all three locked
   files), 0 confirmed; vector 5 — 1 confirmed (F3), no other semantic
   drift found in sampled material; vector 6 — 3 attacks refuted
   (EVENT_PRIORITY, category count, morning-weight toggle), 0 confirmed;
   vector 7 — 1 attack refuted (acceptance-count arithmetic), 3 confirmed
   against the surrounding process documents (F4, F5, F6).
5. **Locked-surface diff-audit verdict:** **PASS, exactly as claimed** —
   `ActiveWorkoutScreen.js` zero diff, `AnalyticsScreen.js` zero diff,
   `HomeScreen.js` only the bucket-dedup import+call (verified hunk by
   hunk against `e5319811`).
6. **`check:imports` result:** **FAIL** — 1 problem,
   `UNRESOLVED src/lib/partners/signals.js -> ../screens/PartnerScreen`,
   a false positive from a JSDoc comment (F2), but a real, currently
   blocking failure of the `release:check` gate as configured today.
