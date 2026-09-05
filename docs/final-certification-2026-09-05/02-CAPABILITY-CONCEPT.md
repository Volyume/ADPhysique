# 02 — "How you train": complete concept evidence model

Authority: founder brief 2026-09-05 "final whole-product adversarial
certification", Parts 12-15 and 43 (P1 comprehension defect: the label does
not communicate purpose; the populated state says "Built around 4 things you
told it"). Read-only discovery pass. The lead rules the new name; this
document is the evidence the rename must be systemic against.

Scope note: every line below is file:line against the working tree at
2026-09-05. Nothing here recommends a name.

---

## A. SURFACE INVENTORY — every user-facing appearance

### A.1 The feature's own screens

| Surface | file:line | Exact string | State that produces it |
|---|---|---|---|
| Settings home, page title | `src/screens/HowYouTrainScreen.js:1247` | `How you train` | always |
| Intro body | `HowYouTrainScreen.js:1264-1267` | "If you have an injury, pain, a long-term condition or a disability, tell Volyume about it here. It will build your plans and your workouts around it." | always |
| Intro hint | `:1268-1271` | "You do not need a diagnosis, or even a name for it. Just say what you cannot do. Volyume leaves those movements out and trains the same muscle groups another way." | always |
| Primary CTA | `:1274-1278` | `Add something` / a11y "Add something Volyume should build your training around" | always |
| Empty hint | `:1280-1282` | "Takes about a minute. Whatever you add is either part of how you train from now on, or worked around for a while..." | `nothingYet` |
| Read-failure notice | `:1249-1252` | "Volyume could not read this right now. Nothing has changed; pull back in a moment." | `state.unavailable` |
| Plan status line | `:113-121` | "Checking your current plan." / "Volyume could not read your plan just now." / "Your current plan matches how you train." | plan-check state |
| Directory row | `:1428-1432` | `Looking for a specific condition or injury?` — "Optional. Finding it selects better questions; you never need a name to get the same support." | always |
| Energy row | `:1439-1444` | `My energy varies, or I keep sessions short` | always |
| Add wizard headings | `HowYouTrainAddScreen.js:806-823` | "What is it about?" / "Which of these?" / "Which shoulder?" / **"Is this how you train generally, or temporary?"** / "Since when?" / "Roughly how long?" / "Check and save" / "One thing first" / "Your current plan" / "Saved" | per step |
| Role options | `lib/capability/addFlow.js:88-91` | `How I train generally` ("Part of your normal setup...") vs `Temporary, for now` | WHEN step |
| Role readback | `addFlow.js:268` | `How you train generally` \| `Temporary, for now` | check step |
| What-next copy | `addFlow.js:397,407,410` | "...remove this any time under How you train." / "...end it under How you train..." / "...change or remove it any time under How you train." | DONE step |
| Directory screen | `TrainingConsiderationsScreen.js:151,162,175,223,242` | "Tapping one opens How you train with the answer filled in..." / "If none of these fit, How you train covers anything else." / "...describe how you train under How you train instead." | always / no-results |

### A.2 Entry rows outside the feature (four separate homes — D134)

- **Coach tab root** `src/screens/YouScreen.js:510-517` — SectionLabel `Your body`, NavRow label `How you train`, `sub={hytSummary.sub}` (the live summary, section B).
- **Train tab** `src/screens/PlansScreen.js:1661-1677` — SectionLabel `Plan tools`, first card, label `How you train`, sub `hytSummary.sub`, a11y `` `How you train. ${hytSummary.sub}` ``.
- **Settings** `src/screens/SettingsScreen.js:42-47` — label `How you train`, sub "Injuries, pain, long-term conditions and disabilities. Anything Volyume should build your training around." (a11y identical). Comment at `:35-41` records the deliberate reason: an identity-first door misroutes, so the label names the EFFECT and the subtitle carries searchable words.
- **Onboarding** `ProOnboardingScreen.js:88` step label `How you train`; step 5 title `Anything Volyume should build around?` (`:2334`), sub at `:2335`, buttons "Nothing in particular" / "Yes, let's set that up" / "Later, from Settings" (`:2340-2358`), hint "...at any time under Settings, in How you train." (`:2363`).

### A.3 Today / Home

- One-time offer card `src/components/HomeHowYouTrainOfferCard.js:23,29,31,36,37`: a11y + title `Anything Volyume should build your training around?`; body "Injury, pain, a long-term condition or a disability. Tell Volyume once and every plan and workout is built around it. Entirely optional, and you can change it any time."; buttons `Set it up` / `No thanks`. Gated in `HomeScreen.js:320`.
- Grouped section `HomeScreen.js:2627` — `<SectionLabel tone="muted">How you train</SectionLabel>`, rendered only when `hasConstraintRows` (`:1830-1837`).
  - Works-around line `:2634-2638` ← `lib/homeCoachBrief.js:21-25`: "Training leaves {subject} out at the moment." else "Training works around your temporary change." (needs an active APPLIED **episode** + an active plan).
  - Awaiting line `:2647-2656` ← `HomeScreen.js:1821-1826`: "You thought you'd be back to {subject} by about now. Still need it?" / "You thought this would be done by about now. Still need it?"
  - Undecided line `:2665-2674`: "A change to how you train is waiting for your decision." (a11y adds "Open How you train").
  - Ramp line `:2683-2688` (non-tappable).
  - Read-failure line `:2698-2704`: "Volyume could not check how you train just now."

### A.4 Train / session surfaces

- Picker `components/ExercisePickerModal.js:170` "Involves {demand}, which you keep out under how you train"; `:177` same for a family; `:178` "You keep this movement out under How you train."; `:368` + `:901` "How you train could not be checked right now, so nothing is filtered for it."; `:481` "...If that's changed, update it under How you train first."; `:485` button `Update How you train`.
- Conflict sheet `components/ExerciseConflictSheet.js:166,181,201` — button `Update How you train`, a11y "Update How you train for {name}", footnote "...It stays out of suggestions until you allow it again under How you train."
- Active workout `ActiveWorkoutScreen.js:4446` — the in-session notice label is `'How you train'` for a **baseline or unknown** conflict and `'Temporary change'` for an episode one (D112 R6 vocabulary law).
- Workout summary `WorkoutSummaryScreen.js:1637-1640` — onward link labelled `How you train`.
- Plan preview `components/PlanPreviewSheet.js:311,340` — "...have no match inside how you train." / "{n} slots have no match inside how you train."
- Plan library `PlanLibraryScreen.js:50,810` collection + badge `Fits how you train`; plan detail `PlanDetailScreen.js:457` badge `Fits how you train`.
- Plan rationale `lib/planRationale.js:84,92` — "This sits outside how you train while your temporary change lasts..." / "This sits outside how you train."
- Plan engine whyThis `lib/planEngine.js:2801` — `result.capability = 'Built around how you train.'` (only when `inputs.capabilityShaped`).
- Goal setup `ProGoalSetupScreen.js:93-94` — "{n} movements sat outside how you train, so your plan works without them."
- Division diff `lib/divisionDiff.js:187` — "...nothing that fits your equipment and how you train covers {list}..."
- Preference lane cross-link `AvoidedMovementsScreen.js:114,117` — "Things your body needs training built around live under How you train."

### A.5 Coach, check-in, release notes

- Weekly coach `lib/weeklyCoach.js:2611-2620` — six variants, all ending "...you can adjust things under How you train." / "...you can end that under How you train."
- Weekly check-in `WeeklyCheckInScreen.js:1303-1304` — "...you can end this under How you train and everything comes back."
- Preflight dialog `lib/capability/preflight.js:48-49` — title **"How you train could not be checked"**, body "Volyume could not read how you train just now. You can hold suggestions until it loads, or continue without those adjustments this once.", buttons `Hold suggestions` / `Continue without checks`.
- Directory copy `lib/capability/directory/conditions.js:28,173,625,628,675,720` — six condition notes referencing "How you train" by name.
- What's New 1.3.0 `components/WhatsNewSheet.js:57` — "You can tell Volyume what to build your training around, and which side it affects. **Settings, then How you train.**" (a shipped release note naming the label — a rename orphans it).
- Store listings `docs/PLAY_STORE_LISTING.md`, `docs/APP_STORE_CONNECT_LISTING.md` (1 each).

### A.6 NOT present
No occurrence in `src/lib/notifications/**` (only an unrelated comment at `scheduler.js:1584`), nor in Progress/Analytics screens.

---

## B. STATE MODEL — what is actually stored

Source: `src/lib/capability/model.js`, `store.js`, `resolve.js`, `phrase.js`, `summary.js`.

**One row = one rule.** `model.js:93-119` validates a row of
`{role, source, ruleKind, ruleValue, laterality, startsAt, endsAt, episodeGroupId}`.

- `role` (`model.js:17-22`): `baseline` = "defines this user's NORMAL training (CAP-1), open-ended, no planned end" (`:109-111` forbids `endsAt`/`episodeGroupId`); `episode` = "a temporary departure from their normal", requires an `episodeGroupId`.
- `source` (`:24-29`): `self` or `clinician_reported` — "the USER reports a professional's instruction. Volyume never verifies it".
- `ruleKind` (`:31-36`): `demand` (a functional axis), `family` (movement family), `exercise` (one exercise id), `exercise_allow` (a per-exercise ALLOWANCE — an inclusion, not a restriction).
- `ruleValue` for `demand` is one of the **ten** closed axes (`:59-73`): standing, floor_access, overhead_position, grip_bar, bilateral_upper, bilateral_lower, axial_load, impact, balance_high, weight_bearing_hands.
- `laterality` (`:50`): `left` | `right` | null; only the five side-carveable axes carry it (`phrase.js:41-47`: grip→hand, weight_bearing_hands→wrist, overhead_position→shoulder, bilateral_upper→arm, bilateral_lower→leg).
- Lifecycle: `state` active/ended, `endedReason` expired/user_ended/superseded/promoted, plus `acknowledgedAt`, `effectiveChoice` (Apply/Decline standing), `adaptationMode` (`hold`/`propose`, the "just hold my plan" valve — `store.js:154-165`).

**No condition names are ever stored.** The directory (`TrainingConsiderationsScreen.js:1-16`) is explicitly **STATELESS**: "this screen stores nothing, emits nothing, and never writes"; condition names are permitted on that surface alone (GC-D4) and route into the add flow as a *preselect suggestion* (`addFlow.js:97-114`, `from`), never a write.

**Sensitive fields.** Everything stored is functional, but the whole lane is Article 9 health data (`store.js:8-13`: writes fail closed without granular capability consent). The two fields that carry inference risk are (a) `source = clinician_reported` — it asserts a professional was involved, and (b) the *existence* of rows at all. Rule values themselves are the user's own functional words, which is why `phrase.js:12-16` states its law: "only the user's own words come back out... no diagnosis vocabulary".

**What `summary.js` can produce** (`howYouTrainSummary`, `summary.js:26-60`):

| Condition | Exact `sub` |
|---|---|
| `state == null` | `Checking.` |
| `state.unavailable` | `Could not check just now.` |
| no baseline, no episodes | `Injury, pain, a condition or a disability? Volyume builds around it.` (`HOW_YOU_TRAIN_OFFER`, `:19`) |
| episode, nameable | `Working around {subject}, until about {date}` / `..., until you end it` / `..., still need it?` |
| episode, unnameable | `Working around a temporary change, {tail}` |
| >1 episode | `· {n} more` appended |
| baseline only, nameable | `Built around {subject}` |
| **baseline only, unnameable** | **`Built around {n} thing(s) you told it`** (`:54`) |
| baseline + episode | `· {n} permanent` |

**What a "thing" in the count is: one CONSTRAINT ROW.** `baseline.length`
(`summary.js:51-57`) counts rows pushed one-per-row in `store.js:52-61`, and
`addFlow.js:draftRows` (`:339-366`) writes **one row per axis, per family and
per exercise** in a single draft. So one add of "overhead positions + gripping
a bar + loading the spine + impact" = 4 rows = "4 things you told it". The
count is an artefact of storage granularity, not of anything the user said
four of.

**Is a recognisable subject label derivable? YES — the data exists; the
current formatter refuses it.** `phrase.js:150-160` `subjectPhrase` returns
null when (a) any rule is unnameable, (b) `phrases.length > maxItems`
(**default 2**), or (c) the joined string exceeds `maxLength` (**48**), and it
joins with `' and '`. So the exact defect: a user with 3+ distinct baseline
rules always falls to the count, even though every rule has a ready English
phrase in `DEMAND_PHRASES` (`phrase.js:24-35`: "standing work", "overhead
work", "gripping a bar", "loading your spine", "jumping and impact work",
"unsupported balance work", "taking weight through your hands") and a sided
row label in `SIDED_ROW_LABELS` (`:68-74`, e.g. "Overhead work with your left
shoulder"). A "Shoulder · lower back · grip"-style line is derivable from
`ruleValue` + `laterality` alone with no new storage and no sensitive
disclosure — the constraint is a formatter policy (`maxItems`, the `and`
join, the one-unnameable-rule veto at `:154`), not the state model. Two
cautions the lead must respect: `exercise`-kind rules need a library lookup
(`nameOf`) and return null without one, and `exercise_allow` rules
deliberately return null (`:133-141`) because a bare name INVERTS the meaning
after "without/around/back to" — `summary.js:36` already filters allowances
out before phrasing.

---

## C. CONSUMERS — the truth chain

`resolve.js` is the single IO point (`:300-317`). On read failure it serves
the session's last-known state with `unavailable:true, stale:true`, else an
empty state with `unavailable:true` (i.e. **nothing is filtered**).
`capabilityKnown` (`:281-284`) is the "may an ACTION consult this" predicate.
`blockingConflicts` (`:383-395`) is the decision layer: an allowance carves
self-declared conflicts but never a clinician-reported one.

| Consumer | file:line | Baseline | Episode | Fail direction |
|---|---|---|---|---|
| New-plan generation filter | `lib/exercise/generation.js:66-92` (`generationBlockReason`), `planAutoGen.js:39` | both roles filtered (same `capabilityBlockReason`) | same | **Fails closed at the UI** via preflight; the module itself sees `state.empty` and does nothing |
| Plan auto-gen slot verdicts | `planAutoGen.js:463-481` (episode: `episodeConflicts`/`removalExcusalConflicts`), `:531-542` (baseline: `baselineConflicts`) | `capabilityIneligible` | `capabilityAffected` / `capabilityEpisodeOpen` | read error ⇒ `capabilityAffected = true` (`:483-490`, "UNKNOWN IS NOT NONE"); `capabilityUnavailable` surfaced at `:792` |
| Preflight gate (user choice) | `capability/preflight.js:35-54` | n/a (whole state) | n/a | **fail closed**: "Hold suggestions" vs "Continue without checks" |
| — its callers | `PlansScreen.js:733`, `PlanUpdateScreen.js:164,267`, `ProOnboardingScreen.js:1701,1751`, `BuildWorkoutScreen.js:214`, `lib/startWithPlan.js:88` | | | |
| Exercise picker | `ExercisePickerModal.js:420,617,1030` | filtered | filtered | **fails OPEN with a visible notice** (`:901`, a11y announce `:368`) |
| Swaps / conflict sheet | `sessionEffective.js:45,158,307,410,558,629,669`; `ExerciseConflictSheet.js` | via `blockingConflicts` | via `blockingConflicts` | notice, per surface |
| Active workout | `ActiveWorkoutScreen.js:1502-1507,1604-1605,3847-3849` | notice labelled "How you train" | notice labelled "Temporary change" | honest "could not check" line |
| Library-plan compatibility | `capability/planCompat.js:29-46,52-74` | counted | counted | read failure ⇒ empty Map ⇒ **no chips rendered**, no guess |
| — surfaced at | `PlanLibraryScreen.js:416-419,810`; `PlanDetailScreen.js:136-139,457` | | | |
| Weekly coach | `CoachOutputScreen.js:1937-1993` → `weeklyCoach.js:636,1370,2609-2620` | **NEVER** — `:1945-1946` filters `role === 'episode'` only | yes, and `adaptationMode !== 'hold'` excluded | `capabilityKnown` false ⇒ `physicalConstraint = null`, coach behaves as before the fact existed |
| Coach apply safety | `lib/coachApplySafety.js:13,28` | both | both | best effort |
| Learning eligibility / block ledger | `capability/eligibility.js:28-32,51-70`; `blockLedgerRunner.js:53` | **NEVER** — `episodeScopeRows` keeps episode rows + allowances only (scope law, `:15-17`: "Baseline rules are the user's normal and NEVER suspend learning") | yes, definite conflicts only | unknowns excluded on purpose |
| Today / Home | `HomeScreen.js:1698-1699` | not shown | shown | honest "could not check" line `:2698` |
| Exercise detail swap pool | `ExerciseDetailScreen.js:416-427` | filtered | filtered | pool unfiltered if not `capabilityKnown` |
| Volume heatmap | `VolumeHeatmapScreen.js:193-215` | via `filterLibraryForGeneration` | same | skips when unavailable |
| Database swap-cause / muscles | `database.js:5167-5168, 11365-11375` | `baselineBlockedMuscles` | | |

**Where it is NOT consulted (name these precisely):**

1. **Notifications** — no capability import anywhere in `src/lib/notifications/**`. Scheduling, quiet hours, categories and budget are capability-blind.
2. **Progress / Analytics / LiftProgress / Consistency** — no capability consultation (VolumeHeatmap is the only Progress-stack exception).
3. **`MesocycleBuilderScreen.js`** — no capability reference at all.
4. **`ManualBuilderScreen.js`** — no preflight and no direct capability call; it inherits filtering **only** because it renders `ExercisePickerModal` (`:10,1149`), which fails OPEN on an unreadable state. A hand-built plan is therefore constraint-aware only per exercise the user picks through that modal.
5. **`poolGenerator.js`** — no capability logic (comments at `:165-168` note the pool it is handed is already filtered upstream; it does no checking of its own).
6. **The weekly coach never sees BASELINE constraints** (see table). A permanent disability or long-term condition shapes generation, pickers and plan compatibility, but contributes nothing to weekly coaching copy, volume holds or excusal.
7. **Library plans are advisory, not filtered** — `planCompat` produces three honest counts and a `Fits how you train` badge; installing a conflicting library plan is permitted and routed to `ExerciseConflictSheet`.

**Defensibility of "takes them into account when choosing exercises and
building your training":** TRUE for auto-generated plans (`planAutoGen` +
`generation.js`), the exercise picker, swaps, the active session and library-plan
compatibility reporting — including the kettlebell and circuit style plans,
which go through the *same* `computePlanCompatibility` (pinned by
`src/lib/__tests__/stylePlans.capability.test.js:1-33`). It is FALSE, or true
only indirectly, for notifications, Progress, mesocycle building and weekly
coaching of baseline-role rules; and for manual plan building it is true only
at the picker, which fails open.

---

## D. SEPARATION from training SETUP

Training setup lives in a different screen with a different name:
`PlanUpdateScreen.js:344` `BackHeader title="Adjust training"`, carrying
`Experience` (`:391`), `Training days per week` (`:403`), `Session length`
(`:414`), `Equipment` (`:423`), `Recovery` (`:435`). Session length and rest
behaviour also sit in `SettingsWorkoutScreen.js:99` "Workout & units".
Preference-lane exclusions live in `AvoidedMovementsScreen.js:105`
"Avoided movements".

**Confusion risks (all real, all in the current build):**

1. `PlansScreen.js:1661` puts `How you train` as the FIRST row under the
   heading **`Plan tools`**, immediately above `Training blocks` and
   `Avoided movements · N` — three rows that read as setup, one of which is
   the Article 9 health lane. Nothing on the row says it is about injury,
   pain or disability unless the summary line happens to say so.
2. The label collides with the wizard's own role question, "Is this **how
   you train generally**, or temporary?" (`HowYouTrainAddScreen.js:815`) and
   the readback value `How you train generally` (`addFlow.js:268`). The
   feature name and one of its two internal role values are the same words.
3. `QuizScreen.js:4` uses "how you train" for the pre-account training-style
   quiz — a genuinely different concept, same phrase.
4. `HowYouTrainScreen.js:1439` routes the energy question to
   `SettingsWorkout` (session length), so the capability screen hands the
   user off into setup mid-lane.
5. `AvoidedMovementsScreen.js:117` is the only place the two lanes are
   distinguished in words, and it does so from the preference side only.

---

## E. DISCOVERABILITY — exact tap paths and every label on the way

**Coach tab (`ProfileTab`, title "Coach" → `YouScreen`)**
Coach → section `Your body` → row `How you train` (+ live summary line) →
`Add something` → "What is it about?" → `A movement or position` →
"Which of these?" → `Overhead positions` → "Which shoulder?" →
`Left shoulder` / `Right shoulder` / `Both shoulders` →
"Is this how you train generally, or temporary?" → `How I train generally`
("Part of your normal setup. Full progression and coaching, no special
labels.") or `Temporary, for now` → [episode only: "Since when?" → `Today` /
`About a week ago` / `About two weeks ago`; "Roughly how long?" → `Until I
end it` / `About a week` / `About two weeks` / `About a month`] →
"Check and save" (rows: what, How long, Since, Side, `A clinician asked for
this` Yes/No) → first save only: "One thing first" (consent) → "Your current
plan" (if a diff exists) → "Saved".
[`YouScreen.js:510-517`; `HowYouTrainScreen.js:1274`; `HowYouTrainAddScreen.js:806-818`;
`addFlow.js:76-95`, `:307-333`]

**Train tab** — Train → `Plan tools` → `How you train` → identical wizard.
[`PlansScreen.js:1661-1677`]

**Settings** — Coach → gear (`YouScreen.js:388`) → `How you train`
("Injuries, pain, long-term conditions and disabilities. Anything Volyume
should build your training around.") → identical wizard.
[`SettingsScreen.js:42-47`]

**Today** — only for a user with nothing set up and no ranked banner:
the offer card "Anything Volyume should build your training around?" →
`Set it up`. Once anything exists the card retires and Today shows only the
muted `How you train` status group. [`HomeHowYouTrainOfferCard.js:23-38`;
`HomeScreen.js:320,2627`]

**Onboarding** — step 5 "Anything Volyume should build around?" →
`Yes, let's set that up` → the same `HowYouTrain` screen (not an inline step).
[`ProOnboardingScreen.js:2334-2358`]

Per target:
- **Shoulder problem** — WHAT `A movement or position` → WHICH `Overhead positions` → SIDE "Which shoulder?" (the only path that names a shoulder; there is no body-part picker).
- **Grip limitation** — WHICH `Gripping a bar or handle firmly` (+ optionally `Taking weight through the hands and wrists`) → SIDE "Which hand?" / "Which wrist?".
- **Long-term disability** — same wizard; the ONLY thing that marks it long-term is choosing `How I train generally` at the WHEN step. There is no disability-specific path; the optional directory (`How you train` → `Looking for a specific condition or injury?` → search → a profile's question) only *preselects* axes and stores nothing (`TrainingConsiderationsScreen.js:1-16`, `:151`).
- **Temporary episode** — same wizard, `Temporary, for now`, then SINCE and UNTIL.

Discoverability defects visible from the paths: nothing on any entry row
distinguishes the four targets; "disability" appears only in the Settings
subtitle, the Home offer body and the HowYouTrain intro — never in a label;
and the only place the word "injury" appears in a control is the directory
row.

---

## RENAME BLAST RADIUS

Matching LINES for `How you train` / `how you train`, counted per file
(`grep -c`). Totals: src non-test **39 files / 167 lines**; tests
**30 files / 79 lines**; docs **25 files / 119 lines**. **A rename must also re-word 29 non-test sentences reading "…under How you
train" plus 39 more of the "outside / inside / around / Fits how you train"
forms, the role value `How you train generally`, and the WhatsNewSheet 1.3.0
release note, which has already shipped.**

**src, non-test — 39 files, 167 lines:**
`screens/HowYouTrainScreen.js` 16 · `screens/HomeScreen.js` 13 ·
`screens/ActiveWorkoutScreen.js` 11 · `components/ExercisePickerModal.js` 11 ·
`screens/ProOnboardingScreen.js` 10 · `screens/PlansScreen.js` 10 ·
`screens/TrainingConsiderationsScreen.js` 9 · `screens/HowYouTrainAddScreen.js` 8 ·
`screens/RoutineDetailScreen.js` 7 · `lib/capability/addFlow.js` 7 ·
`lib/weeklyCoach.js` 6 · `lib/capability/directory/conditions.js` 6 ·
`components/ExerciseConflictSheet.js` 6 · `screens/AvoidedMovementsScreen.js` 5 ·
`screens/PlanLibraryScreen.js` 4 · `screens/YouScreen.js` 3 ·
`screens/WorkoutSummaryScreen.js` 3 · `screens/WeeklyCheckInScreen.js` 3 ·
`screens/SettingsScreen.js` 2 · `screens/ProGoalSetupScreen.js` 2 ·
`navigation/RootNavigator.js` 2 · `lib/sessionEffective.js` 2 ·
`lib/planRationale.js` 2 · `lib/capability/preflight.js` 2 ·
`components/PlanPreviewSheet.js` 2 · `components/HomeHowYouTrainOfferCard.js` 2 ·
`screens/QuizScreen.js` 1 · `screens/PlanUpdateScreen.js` 1 ·
`screens/PlanDetailScreen.js` 1 · `screens/CoachOutputScreen.js` 1 ·
`screens/BuildWorkoutScreen.js` 1 · `lib/planEngine.js` 1 ·
`lib/planAutoGen.js` 1 · `lib/divisionDiff.js` 1 · `lib/capability/summary.js` 1 ·
`lib/capability/directory/index.js` 1 · `components/WhatsNewSheet.js` 1 ·
`components/SettingsPrimitives.js` 1 · `components/OptionCard.js` 1.

**Tests that pin the label — 30 files, 79 lines, all need updating:**
`components/__tests__/capabilityVocabulary.guard.test.js` 10 ·
`lib/__tests__/capabilityCoach.test.js` 9 ·
`screens/__tests__/AvoidedMovementsScreen.crossLane.guard.test.js` 6 ·
`screens/__tests__/howYouTrainEntries.guard.test.js` 5 ·
`screens/__tests__/ProOnboardingScreen.capabilityBlockedState.guard.test.js` 5 ·
`screens/__tests__/swapSheetCapabilityNarrowing.guard.test.js` 4 ·
`src/__tests__/capabilityPicker.test.js` 4 ·
`screens/__tests__/RoutineDetailScreen.capabilityPlanMarkers.guard.test.js` 3 ·
`screens/__tests__/HomeScreen.capabilityVisibility.guard.test.js` 3 ·
`screens/__tests__/WorkoutSummaryScreen.constraintEffectLine.guard.test.js` 2 ·
`screens/__tests__/HowYouTrainAddScreen.wizard.guard.test.js` 2 ·
`lib/capability/__tests__/addFlow.test.js` 2 ·
`lib/__tests__/planRationale.capabilityLaneStop.guard.test.js` 2 ·
`lib/__tests__/planEngine.test.js` 2 ·
`lib/__tests__/capabilityW5.suspensionAndReview.test.js` 2 ·
`lib/__tests__/capabilityPosture.w1.guard.test.js` 2 ·
`lib/__tests__/capabilityPlanRewrite.test.js` 2 ·
`lib/__tests__/campaign9.dryRunPreview.test.js` 2 ·
plus 1 each: `screens/__tests__/ProGoalSetupScreen.capabilityBlockedToast.guard.test.js`,
`screens/__tests__/PlansScreen.capabilityBlockedToast.guard.test.js`,
`screens/__tests__/PlanDetailScreen.d139.guard.test.js`,
`screens/__tests__/HowYouTrainScreen.capabilityFlows.guard.test.js`,
`screens/__tests__/BuildWorkoutScreen.travelDrops.guard.test.js`,
`screens/__tests__/ActiveWorkoutScreen.sideCarveNote.guard.test.js`,
`lib/exercise/__tests__/campaign9.closeout.test.js`,
`lib/capability/__tests__/summary.test.js`,
`lib/__tests__/stylePlans.capability.test.js`,
`lib/__tests__/capabilityCensus.guard.test.js`,
`src/__tests__/screen-mount.test.js`, `src/__tests__/capabilityGuards.test.js`.

**Docs — 25 files, 119 lines** — including
`docs/PLAY_STORE_LISTING.md` (1) and `docs/APP_STORE_CONNECT_LISTING.md` (1),
which are published external copy; plus the campaign records under
`docs/capability-campaign-25-2026-08-20/`, `docs/injury-disability-audit-2026-08-28/`,
`docs/how-you-train-usability-audit-2026-09-03/AUDIT.md`,
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` (9),
`docs/TASKBOARD.md` (4).

**"things you told it" pattern — 2 occurrences only:**
`src/lib/capability/summary.js:54` (the producer) and
`src/lib/capability/__tests__/summary.test.js:56` (the pin,
`'Built around 1 thing you told it'`; `:40` pins `'Built around loading your spine'`).
Related producer to keep consistent: `src/lib/planEngine.js:2801`
`'Built around how you train.'`, pinned at `lib/__tests__/planEngine.test.js:431,436`.

**Route and component identifiers (not user-facing, but they carry the name):**
routes `HowYouTrain` and `HowYouTrainAdd` registered in five stacks
(`RootNavigator.js:455-456, 493-494, 538-539, 576-577` and `:492-495`),
files `screens/HowYouTrainScreen.js`, `screens/HowYouTrainAddScreen.js`,
`components/HomeHowYouTrainOfferCard.js`, the exported constant
`HOW_YOU_TRAIN_OFFER` and function `howYouTrainSummary`
(`lib/capability/summary.js:19,26`), and the reachability sweep
`navigation/__tests__/capabilityRoutesReachable.test.js`.

---

## SEMANTIC CONSTRAINTS THE NEW NAME MUST RESPECT

1. **Disability is not an injury, and neither is a long-term condition.**
   The lane deliberately covers four things at one door: injury, pain,
   long-term condition, disability (`SettingsScreen.js:45`;
   `HowYouTrainScreen.js:1264`). The directory's own chip vocabulary is
   `Injury` vs `Long-term` (`TrainingConsiderationsScreen.js:48`).
2. **Baseline is NOT a problem state.** `model.js:19` — baseline "defines
   this user's NORMAL training (CAP-1)". `effective.js:6-10` — "a
   baseline-shaped plan simply IS the user's plan, and no marker, record or
   line ever frames it otherwise". A name implying limitation, restriction,
   damage or exception breaks CAP-1/2.
3. **Episode vs baseline must stay nameable separately.** The D112 R6
   vocabulary law is live in code: `ActiveWorkoutScreen.js:4438-4446` labels
   a baseline/unknown notice "How you train" and an episode notice
   "Temporary change"; `summary.js:9-11` notes "never 'injury' on a permanent
   rule — the word attaches only to temporary framing".
4. **No self-classification at the door.** `SettingsScreen.js:35-41` records
   the ONS evidence that an identity-first door ("are you disabled?")
   misroutes under half the intended audience; the current label names the
   EFFECT on training for that reason.
5. **No diagnosis vocabulary and no clinical claim** (CAP-3/CAP-18,
   `phrase.js:12-16`, `directory/schema.js` validator).
6. **Free by law (CAP-19)** — routes are registered unguarded; a rename must
   not move it behind any gate.
7. The name must survive being used mid-sentence 68 times in non-test src ("…under X",
   "…sits outside X", "…no match inside X", "Fits X", "Update X") and as a
   step label in onboarding.
