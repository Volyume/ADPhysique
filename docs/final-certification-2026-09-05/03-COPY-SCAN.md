# 03 — Copy scan (mechanical)

Final whole-product adversarial certification (2026-09-05), Part 3. Founder
brief authority: 2026-09-05 "final whole-product adversarial certification",
Parts 16 (British English), 17 (no AI tells), 26 (no commercial residue),
28 (placeholders), 31 (raw errors, partially — see Category 5).

**Tool:** `scripts/certification/copy-scan.mjs` — deterministic, read-only,
no new dependencies (`@babel/parser` + `@babel/traverse` are already present
in `node_modules` as transitive deps of the project's existing eslint/babel
toolchain; nothing was added to `package.json`). Run with:

```
node scripts/certification/copy-scan.mjs
```

Exit code is always 0 (a discovery scan, not a CI gate). Full structured
output: `docs/final-certification-2026-09-05/data/copy-scan.json`
(generated `2026-09-05T15:59:13.089Z` for the numbers in this report — the
script reflects whatever `src/` looks like at run time, and this repo has
other in-flight work landing concurrently, so a re-run before acting on any
finding is cheap insurance).

**Method:** parses each in-scope file into a real AST (not a text grep) and
walks it for `StringLiteral` / `TemplateLiteral` / `JSXText` nodes, the same
way the repo's existing ESLint copy rules do it. A literal counts as
**user-facing** if it contains a space and starts with a capital letter, or
sits on a JSX attribute / object property named `title`, `subtitle`,
`label`, `text`, `message`, `body`, `description`, `accessibilityLabel`,
`accessibilityHint`, `placeholder` or `hint`. Excluded by construction:
`__tests__`/`__mocks__`, import/require paths, object *keys*, the first
argument of `logError`/`logWarn`/`logInfo`/`track*` calls, any `Sentry.*`
call argument, SQL (detected by content, not just a leading keyword — see
script comments), and the argument to `new Error(...)`/`new TypeError(...)`
etc (a diagnostic string is not copy unless something later reads
`.message` back out into real copy, which Category 5 catches separately).

## Scope

409 candidate files were inspected file-by-file before this run; the final
scan covers **404 files** in the main scope plus **22** in a separate
"dormant billing" bucket (never counted against the main findings).

**Brief-mandated directories/files**, scanned whole:
`src/screens`, `src/components`, `src/lib/food`, `src/lib/notifications`,
`src/lib/capability`, `src/lib/weeklyCoach.js`, `src/lib/coachApply.js`.

**Directories included whole** because every file in them is a dedicated
copy/UI-text surface: `src/lib/coachOutput`, `src/lib/onboarding`,
`src/lib/partners`, `src/lib/shareCard`, `src/lib/progress`,
`src/lib/widgets`.

**77 individual `src/lib` files** inspected one at a time (grepped for real
string-literal content, not just comments) and included because they
clearly produce narrative/explanatory copy rendered in the UI — the full
list, with the file-by-file discovery reasoning, is the header comment of
`scripts/certification/copy-scan.mjs`. Headline examples: `coachStory.js`,
`weeklyStory.js`, `coachGlossary.js`, `blockExplain.js`, `planRationale.js`,
`nutritionEngine.js`, `wellbeing.js` (the Beat UK signposting line —
ED-safety voice), `edPatternDetector.js`, `milestones.js`,
`progressCaptureGuide.js`, `progressScanVision.js`, `trialActivation.js`,
`workoutHelpers.js`.

**Explicitly excluded from `src/lib`**, each inspected before being left
out (full reasoning in the script header):
- **Catalogue/seed data, not narrative copy** (exercise/routine *names*, a
  separate campaign concern, huge volume): `seedExercises.js`,
  `seedRoutines.js`, `exerciseCorpus/**`, `exerciseMetadata.js`,
  `exerciseDisplay.js`, `exerciseFuzzySearch.js`,
  `exercisePickerSections.js`, `planEngine.js`, `travelMode.js`,
  `exercise/{canonicalId,continuity,generation,movementConstraints,
  prescription,stylePools,swapScope,intent,loadSemantics,movementFamily,
  volumeAudit}.js`.
- **Schema/technical/sync internals** (SQL, not copy): `database.js`,
  `src/lib/database/**`, `sync.js`, `syncQueue.js`, `src/lib/sync/**`,
  `dbCrypto.js`, `dbSnapshot.js`, `sqliteBoundary.js`,
  `sheetA11yIsolation.js`.
- **Telemetry/logging/observability** (excluded per brief):
  `errorLog.js`, `engineTelemetry.js`, `sentry.js`, `observability.js`,
  `src/lib/observability/**`, `src/lib/telemetry/**`,
  `src/lib/partners/telemetry.js`.
- **GDPR consent logic**: `src/lib/consent/**` — inspected, 0 real-copy
  hits (the actual consent-screen text lives in `src/screens`, already in
  scope).
- **Everything else in `src/lib`** not named in the script header: grepped
  with a `>=3 sentence-shaped literals` heuristic and confirmed to be pure
  engine/validation/utility code with no or negligible real copy.

**Dormant billing bucket** (scanned separately, never counted in the
headline numbers, listed here so the lead can confirm every one is
genuinely unreachable):

| File | Status |
|---|---|
| `src/screens/ProUpgradeScreen.js` | Named in CLAUDE.md. Not registered in `RootNavigator.js` (confirmed — see `RootNavigator.js:148-149`). |
| `src/screens/CascadeGateScreen.js` | Named in CLAUDE.md. Not registered. |
| `src/screens/SubscriptionScreen.js` | Named in CLAUDE.md. Not registered. |
| `src/screens/SubscriptionPolicyScreen.js` | Named in CLAUDE.md. Not registered. |
| `src/screens/paywallExcerpts.js` | Named in CLAUDE.md as "content, not billing logic". Its own header states its only consumer is `ProUpgradeScreen.js`. |
| `src/components/ProGate.js` | Named in CLAUDE.md. `RootNavigator.js:225-226` confirms it "stays on disk as a DORMANT module". |
| `src/components/CancelReasonSheet.js` | **Not named in CLAUDE.md.** Traced: only imported by `SubscriptionScreen.js` (dormant, above). No other consumer found. |
| `src/components/TierComparisonStrip.js` | **Not named in CLAUDE.md.** Traced: only imported by `SubscriptionScreen.js` and `ProUpgradeScreen.js` (both dormant, above). |
| `src/components/PostLapseSheet.js` | **Not named in CLAUDE.md.** Traced: no importer anywhere in `src/screens` or `App.js`; its own trigger, `shouldShowPostLapseSheet()`, lives in `src/lib/payments/winbackState.js` (dormant payments). |
| `src/components/food/TodaysPlateTeaser.js` | **Not named in CLAUDE.md.** Traced: only imported by `ProGate.js` (dormant, above). |
| `src/lib/differentialPaywall.js` | **Not named in CLAUDE.md.** Traced: only imported by `weeklyCoach.js`, which reads it as `FULL_ACCESS_FOR_ALL ? { shown: false } : detectDifferentialTrigger(...)` — `FULL_ACCESS_FOR_ALL` is the compile-time-`true` flag in `src/lib/proGate.js`, so the real function never runs. |
| `src/lib/payments/**` | Named in CLAUDE.md as the dormant billing module tree. |

**One item that could *not* be cleanly excluded at file granularity**:
`src/lib/notifications/scheduler.js` is the app-wide notification scheduler
and is overwhelmingly live code, so the whole file stays in the main scan —
but its `CASCADE_19_COPY`/`CASCADE_21_COPY` constants and
`schedule/cancelCascadeGateNotifications` functions are dead code by the
same test (their only caller is `src/lib/payments/cascade.js`, dormant,
confirmed by grep finding no other call site). The three findings this
produces are individually annotated as dead-code below rather than the
whole file being dropped from scope.

## Already enforced by lint (do not duplicate)

`eslint.config.js` already gates `src/screens/**` and `src/components/**`
(plus `HomeScreen.js` and `ShareCardScreen.js` individually, flat-config
requires the repeat) on:
- **em dash (—)** in `Literal`/`JSXText` — `eslint.config.js:247-254`
  (repeated `328-334`, `359-364`).
- **delve / leverage / utilise / utilize / facilitate / seamless(ly) /
  streamline(s/d/ing) / robust / comprehensive** — `256-262` (`336-342`,
  `367-373`).
- **", always" / ", ever" / ", forever" clipped-drama tail** — `268-275`
  (`379-386`).

This scan still checks all of those rules across the *whole* scan surface
(the lib files above are **not** covered by lint), for one complete
cross-check number. Result: **zero hits for any of them, anywhere in
scope** — src/screens + src/components are clean as the lint gate
promises, and the additional 77 lib files carry none either.

## Counts

| Category | Main scope (404 files) | Dormant bucket (22 files, informational) |
|---|---:|---:|
| 1. US spelling | 5 | 0 |
| 2. AI tells | 14 | 2 |
| 3. Commercial residue | 6 | 94 |
| 4. Placeholders/unfinished | 0 | 0 |
| 5. Internal-term leaks | 2 | 0 |
| 6. Unclear counts | 16 | 0 |
| 7. Duplicate labels | 5 candidates, **0 confirmed** (all reviewed, see below) | 1 (informational) |

Parse errors: **0** (every in-scope file parsed cleanly).

The dormant bucket's 94 commercial-residue hits are exactly what you would
expect from unregistered billing screens (`Pro`, `subscription`, `trial`,
`paywall`, `£`...) — listed in the JSON for the lead to spot-check, not
reproduced line-by-line here.

## Category 1 — US spelling (5, full list)

| File:line | Word | Value (truncated) | Note |
|---|---|---|---|
| `src/lib/capability/directory/conditions.js:323` | tire (noun) | "Plain wording and no hurry matter when concentration tires; nothing in logging runs against a clock." | **False positive on read-back**: "tires" here is the *verb* ("concentration tires" = gets fatigued), not the vehicle-wheel noun. Correct British English as written; no change needed. |
| `src/lib/capability/directory/injuries.js:35` | toward | "…volume rebuilds gradually toward your own plan." | Genuine — UK usually writes "towards". Low-stakes single-word fix. |
| `src/lib/coachStory.js:217` | toward | "…the sets it reduced build back toward your plan, one week at a time." | Genuine — same fix. |
| `src/screens/WorkoutSummaryScreen.js:1696` | program(s) | "…what your plan **programs** each week…" | **Verb usage** ("the plan programs a muscle"), not the training-programme noun sense. "Programs" as a verb is standard in both dialects; likely no change needed, but flagged as instructed since the rule cannot itself tell noun from verb. |
| `src/screens/WorkoutSummaryScreen.js:1699` | program(s) | "Once a plan **programs** a muscle they follow what it aims at…" | Same verb usage as above. |

Net: **2 genuine, low-stakes "toward" → "towards" fixes**; the other 3 are
false positives caught on manual read-back (documented so the lead does not
have to re-derive this). Deliberately **not** flagged, per the brief:
"check" (cheque sense — too rare to detect reliably against the ordinary
verb "check"), "learnt"/"learned" (brief: both UK-acceptable), "whilst"
(brief: fine).

## Category 2 — AI tells (14, full list)

| File:line | Tell | Value (truncated) |
|---|---|---|
| `src/components/BiometricLockScreen.js:37` | unlock | "Unlock with Face ID, your fingerprint, or your device passcode to continue." |
| `src/components/BiometricLockScreen.js:43` | unlock | "Unlock Volyume" |
| `src/lib/biometricLock.js:134` | unlock | "Unlock Volyume" |
| `src/lib/progressScanResultsContract.js:259` | unlock | "…to unlock comparison." |
| `src/components/BodyDiagramHeatmap.js:381` | elevate | "…triangle up means elevated for …, triangle down means capped" |
| `src/components/ProgressSections.js:290` | elevate | "Load is elevated (above 1.3). Monitor how you feel." |
| `src/lib/exercise/adaptedSetup.js:123` | elevate | "A smaller shoulder elevation shortens the range…" |
| `src/lib/capability/directory/conditions.js:564` | tailored | "UK guidance puts tailored exercise at the centre for osteoarthritis…" |
| `src/lib/capability/directory/conditions.js:583` | tailored | "UK guidance recommends tailored strength and fitness exercise as core care for osteoarthritis." |
| `src/lib/coachGlossary.js:60` | tailored | "…your plan is tailored to what that division is judged on." |
| `src/lib/mesocycle.js:214` | personalised | "Keep logging sessions and we'll start making personalised adjustments." |
| `src/lib/nutritionEngine.js:101` | personalised | "…if your coach or dietitian has given you a personalised target." |
| `src/screens/NutritionTargetsScreen.js:776` | personalised | "Calculate your personalised daily calorie and protein targets." |
| `src/screens/PrivacyPolicyScreen.js:24` | personalised | "Volyume collects information you provide directly…" (the word appears later in the same block) |

Read-back assessment (lead still decides): the four `unlock` hits are the
**literal, correct** sense (unlock the phone/app via biometrics; unlock a
scan comparison once the data exists) — none read as premium-gating
marketing language. `elevate`/`tailored` are clinical/physiological usage
(NICE osteoarthritis guidance language, heart-rate-zone terminology), not
marketing flourish. `personalised` is the **correct UK spelling** of a word
the brief still asks to have reported regardless of spelling, since the
underlying concept ("personalised targets") is the thing being flagged,
not the letter. None of these read as an AI-slop tell on inspection; kept
in the list because the brief asks for report-and-lead-judge on this
whole word group.

Everything else the rule set checks for came back **zero** across all 404
files: em dash, journey, smart, intelligent(ly), seamless(ly), empower,
supercharge, effortless, crush, level up, game-changer, delve, "based on
your data", "things you told", "we've got you", "you've got this", "let's
… dive", and the "your X, your Y" rhetorical tagline pattern (a first pass
of this last rule matched loosely and produced 48 false positives from
ordinary sentences with two unrelated possessives — e.g. "...the better
Volyume understands how **your** body responds, so it can suggest **your**
next..." — tightened to only match when the "your X, your Y" shape is
essentially the *whole* sentence, a short tagline-shaped rhetorical
flourish, which produced zero genuine hits).

**Emoji-in-copy**: a first pass over-matched the arrows block (→, used
correctly as a "Profile → Settings" breadcrumb in `ImportScreen.js`) and
the plain tick "✓" (`HowYouTrainScreen.js`) as if they were emoji. Narrowed
to the genuine pictograph ranges; result is **zero** genuine emoji in
copy.

**Exclamation marks in copy**: **zero** hits.

## Category 3 — Commercial residue (6, full list)

| File:line | Word | Value | Status |
|---|---|---|---|
| `src/lib/notifications/scheduler.js:726` | Pro, trial | "Your free Pro trial ends in two days" | **Dead code** — see below |
| `src/lib/notifications/scheduler.js:730` | free plan | "You're back on the free plan" | **Dead code** — see below |
| `src/lib/notifications/scheduler.js:731` | Pro, go Pro | "…You can go Pro again any time." | **Dead code** — see below |
| `src/screens/CoachOutputScreen.js:543` | trial | "Based on the MATADOR trial (2017). This is a suggestion, not a requirement." | **False positive** — MATADOR is a real diet-break research trial name (2017), not a billing free-trial reference. No action. |

The three `scheduler.js` hits are `CASCADE_19_COPY`/`CASCADE_21_COPY`, the
day-19/day-21 cascade-gate notification templates. Traced: their only
caller, `scheduleCascadeGateNotifications`, is invoked from exactly one
place in the whole tree — `src/lib/payments/cascade.js:173` — which is
itself part of the CLAUDE.md-named dormant `src/lib/payments/**` tree,
gated behind the same `FULL_ACCESS_FOR_ALL` flag as everything else in
that module. These three lines are therefore dead code, functionally
identical to the dormant-bucket findings, just not eligible for whole-file
exclusion because `scheduler.js` itself is very much live for every other
notification it schedules.

**Net result: after tracing every hit to its actual reachability, there is
zero live, user-reachable commercial residue anywhere in the 404-file main
scope.** Every genuine "Pro"/"trial"/"subscription"/"paywall"/"£" mention
in the whole app either lives in the CLAUDE.md-named dormant screens, in
one of the four additional dormant components/modules this scan traced and
is listing for the lead to confirm (`CancelReasonSheet.js`,
`TierComparisonStrip.js`, `PostLapseSheet.js`,
`food/TodaysPlateTeaser.js`, `differentialPaywall.js`), or in the three
dead cascade-notification lines above.

**Recommendation for the lead**: since these four components and one lib
module contain the same class of "Pro"/"subscription"/"trial" copy as the
named dormant surfaces but are *not* on CLAUDE.md's list, worth a decision
on whether to (a) add them to that list explicitly so future audits don't
have to re-derive the trace, or (b) delete them outright as genuinely dead
code with no live caller (same question applies to the three dead lines in
`scheduler.js`). This is a Section 4 "no silent parking" fork — surfaced
here as a founder/lead decision, not resolved unilaterally.

## Category 4 — Placeholders/unfinished (0)

`TODO`, `FIXME`, `XXX`, "coming soon", "lorem", "placeholder", "TBD", "WIP"
— **zero hits** in any user-facing string across the whole 404-file main
scope (and zero in the 22-file dormant bucket too).

## Category 5 — Internal-term leaks (2, full list)

| File:line | Term | Value (truncated) |
|---|---|---|
| `src/screens/Article9ConsentScreen.js:252` | Supabase | "In Supabase in the EU region for cloud-backed account data, with row-level security so only you and the team supporting your account can see it…" |
| `src/screens/PrivacyPolicyScreen.js:42` | Supabase | "…synchronised to our secure cloud database in Supabase's EU region. All data in transit is encrypted…" |

Both are on GDPR consent/privacy-policy screens, where naming the actual
data sub-processor is typically a *requirement* of transparent disclosure
under UK GDPR, not an accidental implementation-detail leak. Flagged per
the brief's instruction to report every "Supabase" occurrence regardless;
the lead's call is whether the vendor name reads as reassuring/compliant
disclosure (current read) or should be genericised to "our cloud
provider"/similar.

**MEV/MRV/MAV/RIR, evidence_class, watermark, "sync queue", RPC, SQLite,
null, undefined, NaN, `[object Object]`, snake_case tokens inside
sentences, raw UPPER_SNAKE enum values interpolated into copy, and raw
`error.message` shown in Alert/Toast/Text: zero hits** across the whole
scan.

Two detectors needed correction after a first pass produced false
positives, both documented in the script:
- **Raw SQL leaking through as "copy"**: `src/lib/food/db.js` (in scope as
  part of the required `src/lib/food` directory) has large inline SQL
  template literals (`WITH live AS (…`, `INSERT OR REPLACE INTO…`) that a
  naive "starts with SELECT" SQL detector missed because they open with a
  CTE (`WITH`) or `INSERT OR REPLACE/IGNORE INTO` rather than a bare
  `INSERT INTO`. Broadened to a content-based detector (keyword anywhere in
  the string, not just at position 0), which correctly suppressed all 82
  SQL-fragment false positives this produced.
- **UPPER_SNAKE constants interpolated into copy**: a first pass flagged
  every `${SOME_CONSTANT}` inside a template literal as a potential raw
  enum leak, which caught 8 hits that were all either a numeric threshold
  constant (`BLOCK_PLANNED_WEEKS`, `MIN_WEIGH_INS`, `FIRST_CHECKIN_MIN_DAYS`)
  or a pre-written English sentence fragment being composed into a longer
  sentence (`PHOTO_SENTENCE`, `RECAP_GATE`, `BASELINE_FIRST_POSE_SENTENCE`,
  `CONFLICT_ROUTINE_SENTENCE`, `BLOCK_START_SENTENCE`) — both completely
  normal, neither a leak. Narrowed to skip names ending in a suffix that
  reliably signals "number or sentence, not an enum tag"
  (`_SENTENCE/_TEXT/_COPY/_LABEL/_MESSAGE/_WEEKS/_DAYS/_MINS/_MAX/_COUNT/
  _THRESHOLD/_GATE/_LIMIT/_INS`), which cleared all 8 false positives.

## Category 6 — Unclear counts (16, full list)

All 16 use the word "things" (12) or "items" (2 real content hits, plus
`SettingsDataScreen.js`'s "(N items)" progress toast). None use "stuff",
"information saved" or "data saved".

| File:line | Word | Value (truncated) |
|---|---|---|
| `src/lib/capability/directory/conditions.js:631` | things | "…shaped around how things are week to week." |
| `src/lib/capability/directory/conditions.js:952` | things | "…a supporter can help set things up once and the plan then repeats." |
| `src/lib/capability/directory/injuries.js:33` | things | "…or things are getting worse rather than better, a professional needs to see it…" |
| `src/lib/capability/directory/injuries.js:247` | things | "…some people trim it while things settle." |
| `src/lib/capability/directory/injuries.js:356` | things | "There are things you can do yourself to ease it…" |
| `src/lib/capability/directory/injuries.js:385` | things | "There are things you can do to ease the pain." |
| `src/lib/coachIntervention.js:606` | things | "Since we …, things have moved into the range we were aiming for." |
| `src/lib/coachIntervention.js:608` | things | "Since we …, things have not moved much yet." |
| `src/lib/coachIntervention.js:610` | things | "Since we …, things have moved further from where we were aiming." |
| `src/lib/progressScanCoachResolver.js:81` | things | "…That supports holding things as they are." |
| `src/screens/CreditsScreen.js:85` | items | "…Used for imported items and occasional UK gaps." |
| `src/screens/HowYouTrainAddScreen.js:538` | things | "Getting things ready." |
| `src/screens/HowYouTrainAddScreen.js:642` | things | "Only changes how Volyume words things. It never contacts anyone." |
| `src/screens/NutritionTargetsScreen.js:1490` | things | "High protein does two things: it gives your muscles what they need to rebuild…" |
| `src/screens/PrivacyPolicyScreen.js:85` | things | "…things like which screens open, when a sync runs, and whether a purchase flow completes." |
| `src/screens/SettingsDataScreen.js:182` | items | "Food library updated (N items)." |

These are all colloquial, plain-English uses ("there are things you can
do", "getting things ready") rather than a vague stand-in for a specific
countable quantity the copy dodges naming — the brief's actual concern
("information saved"/"data saved" style vagueness) has zero hits. Reported
in full per the brief regardless; none look like a genuine clarity defect
on read-back, but the lead should make the final call per string.

## Category 7 — Duplicate labels (5 candidates flagged, 0 confirmed)

The script's first pass flagged every `accessibilityLabel`/`title` string
reused twice-or-more in the same file — 19 candidates, dominated by
completely normal reuse (e.g. every `Close`/`Back` button in a file, or the
same button rendered per-item in a list). Narrowed with two filters: (a)
generic single-word labels are excluded outright (`close`, `back`,
`cancel`, `save`, `done`, `ok`, `continue`, `skip`, `delete`, `edit`, `add`,
`next`, `yes`, `no`, `retry`, `dismiss`) and short (<3 word) labels are
excluded; (b) for the survivors, the script now looks at each occurrence's
`onPress`/`onNavigate`/`onSubmit`/`onDismiss`/`onConfirm`/`onCancel`/
`onClose`/`onChange` handler (raw source text) and only keeps a candidate
if at least two occurrences have **genuinely different** handlers — the
same label with the same (or no) handler at every occurrence reads as one
action rendered in more than one conditional branch, not a labelling bug.

This left 5 candidates, each manually read back against its source:

| File | Label | Lines | Verdict |
|---|---|---|---|
| `src/components/TodayStrip.js` | "Log morning weight" | 167, 213, 252 | Same conceptual action (log today's weight) exposed via three different entry-point controls (the log button, tapping the row, a compact "Log" button) in the same weight-logging component. Not a bug. |
| `src/screens/DiaryScreen.js` | "Open nutrition trends and export" | 1799, 2081 | Both navigate to `FoodInsights` — a Chip and a bottom-sheet row offering the same destination from two places on the same screen. Not a bug. |
| `src/screens/MesocycleBuilderScreen.js` | "View block summary" | 263, 328 | Same `Button` rendered once per mesocycle card (`finished &&` / `!isActive &&` branches), navigating to `BlockReflection` for that card's own `mesocycleId` each time. Same action, different instance, not a bug. The handler-signature check flagged it as a candidate because the raw source text differs (`activeMeso.id` vs `meso.id`) — a known limitation of a text-signature comparison, noted here rather than silently accepted. |
| `src/screens/ScanBarcodeScreen.js` | "Enter barcode number" | 385, 408 | One occurrence is the trigger button (`onPress={openManual}`); the other is the `accessibilityLabel` on the `BottomSheet` that button opens (`onClose={closeManual}`, picked up by the handler-signature check as if it were an action handler). The label is describing the same feature from its trigger and its destination — a deliberate, correct pairing, not a bug. |
| `src/screens/WorkoutSummaryScreen.js` | "Save this workout to reuse" | 1969, 2047 | Same pattern as above: the trigger button (`onPress={handleSaveAsTemplate}`) and the `BottomSheet` it opens (`onClose={...}`) share the label describing the one feature. Not a bug. |

**Net: zero confirmed duplicate-label bugs.** All 5 automated candidates
were manually traced to source and found to be the same action exposed via
multiple entry points, or a trigger/destination pair sharing a label by
design — exactly the "container's dismiss handler looks like a different
action" and "same button in a per-item list" failure modes the brief's
"report only clear cases" instruction is there to filter out.

## Summary for the lead

- **Clean**: placeholders (0), em dash / delve / seamless / marketing-tell
  word list (0, cross-checked against the lint gate), duplicate labels (0
  confirmed), most internal-term categories (0) except two GDPR-disclosure
  "Supabase" mentions.
- **Genuine, low-stakes fixes**: 2× "toward" → "towards"
  (`capability/directory/injuries.js:35`, `coachStory.js:217`).
- **Founder/lead decision needed**: five components + one lib module carry
  dormant-billing-style "Pro"/"subscription"/"trial" copy but are **not**
  on CLAUDE.md's named dormant-billing list (`CancelReasonSheet.js`,
  `TierComparisonStrip.js`, `PostLapseSheet.js`,
  `food/TodaysPlateTeaser.js`, `differentialPaywall.js`), plus three dead
  lines inside the otherwise-live `notifications/scheduler.js` — all
  traced to zero live callers, all worth either naming on the list or
  deleting outright.
- **Lead judgement calls** (reported per brief instruction, assessed on
  read-back above): 4× "unlock" (all read as literal/correct, not
  marketing), 3× "tailored", 3× "elevate"/"elevated" (clinical/
  physiological usage), 4× "personalised" (correct UK spelling, concept
  still flagged per brief), 2× GDPR "Supabase" disclosures.
