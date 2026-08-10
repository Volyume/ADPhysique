# Campaign 5 — Phases 5, 6 and 9: the input-necessity matrix

Lane: Phases 5 (profile input audit), 6 (goal / phase comprehension) and 9
(units and basic preferences) of the founder's Campaign 5 order
(`c5-CAMPAIGN5-ORDER.txt` lines 134-142, 144-152, 177-185). Branch
`claude/campaign5-first-use`. **Audit only: no source, test, doc or
configuration outside this file was modified, and nothing was committed,
pushed or stashed by this lane.**

**Method.** Every input below was found by reading the screens, not by
trusting a summary. Every class assignment carries the downstream
consumption trace that justifies it — who reads the value, from which
file:line, and when. Where the order asks a comprehension question, the
answer quotes the rendered copy. The Phase 1 lane's journey map
(`CURRENT-FIRST-USE-JOURNEY.md`) was read for orientation and its input
inventory (§6) was re-verified against source before use; two of its
readings are corrected here (see §7 C5-P9-05 and the note on
`ProOnboardingScreen.js:471-482`).

**Bounds honoured.** No proposal below adds AI, cardio, a feature, a
social/gamification surface, an advanced control in first use, a
migration, or a redesign; none weakens Article 9, ED/wellbeing semantics
or D92-11; none touches billing architecture or copy; ONBOARDING_QUIZ_FIRST
stays off with its rollback infrastructure intact. Findings that would need
any of those are marked FOUNDER-GATED and carry no proposed execution.

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| C5-P5-01 | DEFECT | HIGH | First name blocks the whole journey on both paths, yet no engine reads it and every consumer already has a safe fallback. |
| C5-P5-02 | FOUNDER-GATED | HIGH | `ProGoalSetupScreen` silently defaults a missing sex to **male** (and height to 175cm, age to 28), defeating the blocking sex gate downstream of it. |
| C5-P5-03 | FOUNDER-GATED | HIGH | Completing the Wellbeing check performs a destructive whole-row write that NULLs sex, date of birth and height on `user_body_profile`, and syncs the nulls. |
| C5-P9-01 | DEFECT | MEDIUM | The height-unit choice made in onboarding is never persisted, and both canonical height editors are ft+in only, so a user who entered cm can never see cm again. |
| C5-P5-04 | IMPROVEMENT | MEDIUM | `trainingPhase` is pre-set to `lean_gain` (a calorie surplus) and persists as if chosen; the gate only tests truthiness. |
| C5-P5-05 | DEFECT | MEDIUM | "Create my first week of meals" on the setup-complete screen builds an omnivore week for everyone, because diet is never asked and defaults to `omnivore`. |
| C5-P6-01 | IMPROVEMENT | MEDIUM | One control carries five different names across one screen ("training focus", "your goal", "the broad goal", "what are you focused on right now?", "Goal phase"). |
| C5-P6-02 | IMPROVEMENT | MEDIUM | The canonical goal editor opens a non-competitor with the OPTIONAL competition question, the reverse of onboarding's order, under the title "Update goal and phase". |
| C5-P5-06 | IMPROVEMENT | MEDIUM | Age is collected and justified, but the first-plan path never passes it to the engine, so `ageMultipliers` never applies; a sibling path does pass it. |
| C5-P5-07 | IMPROVEMENT | LOW | Step 3 is a whole wizard step for one optional field, with no skip control (only a Continue button and a sentence in the header). |
| C5-P5-08 | IMPROVEMENT | LOW | The free path's three answers are consumed then discarded — never written to the profile — and use a different equipment vocabulary from the Pro wizard. |
| C5-P6-07 | IMPROVEMENT | LOW | Weak points offer a division-scoped option set in onboarding and the full 16-muscle list in the canonical editor: one field, two option sets. |
| C5-P6-05 | IMPROVEMENT | LOW | `shouldShowGoalLockOnboarding()` is exported dead code — class H residue of the goal-lock interstitial removed from onboarding in 2026-05. |
| C5-P5-10 | IMPROVEMENT | LOW | Three source comments describe onboarding inputs that onboarding does not collect (diet preference, days-per-week, body-weight units). |
| C5-P5-11 | FOUNDER-GATED | — | FR-1: the Sex/Age/Height duplication across onboarding, Settings → Profile and the Nutrition Targets calculator, documented with its UX consequence only. |
| C5-P5-09 | CLEAN | — | Sex, body weight, height and age are correctly class B/C, explicit-entry, no prefill, with the button gate and the advance gate reading the same predicate. |
| C5-P6-03 | CLEAN | — | The "Not competing" path reads as normal, not as an exception, on every surface that renders it. |
| C5-P6-04 | CLEAN | — | Goal lock is absent from first use; its only entry point is Coach → Safety checks (Pro). |
| C5-P6-06 | CLEAN | — | No bodyweight-goal / target-weight input exists in first use, so Phase 6's "weight goal" has no first-use subject. |
| C5-P9-02 | CLEAN | — | Body-weight unit is asked at the exact moment of need, and the onboarding value IS the canonical Settings value (same store action). |
| C5-P9-03 | CLEAN | — | kcal/kJ is never asked in first use, defaults to kcal, and is display-only in Display & accessibility. |
| C5-P9-04 | CLEAN | — | No measurement unit is asked in first use; body measurements are cm-only everywhere and Pro-gated. |
| C5-P9-05 | CLEAN | — | The free path asks no unit because it needs none: gym weights are kg-only by product law and every body-weight surface is Pro-gated. (Resolves Phase 1's C5-P1-11 UNCERTAIN.) |

Counts: **3 DEFECT, 9 IMPROVEMENT, 3 FOUNDER-GATED, 8 CLEAN, 0 UNCERTAIN.**

---

## 2. The complete first-use input inventory

Every control a first-use user can be asked, in journey order, across both
paths. "Blocking" means progress is refused until it is answered.

### 2.1 Account path (both tiers)

| # | Input | Asked at | Blocking |
|---|---|---|---|
| 1 | Apple / Google OAuth, **or** email + password | `LoginScreen.js:159-289` (OAuth split `OAuthButtons.js:40,75`) | Yes (no anonymous mode) |
| 2 | Article 9 consent checkbox | `Article9ConsentScreen.js:181-303` | Yes, unskippable, fail-closed |

### 2.2 PRO path — the default for a normal online new user

Wizard step 1 is auto-skipped in the live flow
(`ProOnboardingScreen.js:462-483`).

| # | Input | Asked at | Blocking |
|---|---|---|---|
| 3 | First name | `ProOnboardingScreen.js:1179-1193` | **Yes** (`:651-654`, `:1158`) |
| 4 | Biological sex | `:1196-1205` | **Yes** (`:657-660`, `:1159`) |
| 5 | Age | `:1207-1222` | **Yes** (`:674-677`, `:1161`) |
| 6 | Height units (ft+in / cm) | `:1229-1244` | No — pre-set `'imperial'` (`:354`) |
| 7 | Height | `:1247-1292` | **Yes** (`:682-686`, `:1162`) |
| 8 | Body-weight units (st / kg / lbs) | `:1295-1307` | No — pre-set `'st'` (`:336`) |
| 9 | Current body weight | `:1309-1360` | **Yes** (`:664-673`, `:1160`) |
| 10 | Body fat % | `:1406-1422` | No — genuinely optional |
| 11 | Body-fat source | `:1423-1438` (only once a value is typed) | No — pre-set `'visual'` (`:353`) |
| 12 | Training experience | `:1477-1487` | **Yes** (`:705`, `:1459`) |
| 13 | Session length | `:1489-1498` | No — pre-set `60` (`:375`) |
| 14 | Training days per week | `:1500-1509` | No — pre-set `4` (`:376`) |
| 15 | Equipment | `:1511-1520` | **Yes** (`:705`, `:1459`) |
| 16 | Training phase ("What are you focused on right now?") | `:1602-1617` | No — pre-set `'lean_gain'` (`:384`) |
| 17 | Competition division (optional) | `:1622-1632` | No — pre-set `'general'` (`:380`) |
| 18 | Weak points (max 3, division-scoped) | `:1637-1656` | No |
| 19 | Protein tier (collapsible) | `:1659-1713` | No — engine suggestion (`:395-398`) |
| 20 | Recovery rating | `:1818-1826` | **Yes** (`:785-788`, `:1735`) |
| 21 | Morning weigh-in hour | `:1852-1877` | No — pre-set `7` (`:434`) |
| 22 | Weekly check-in day | `:1899-1924` | No — pre-set `0` = Sunday (`:435`) |
| 23 | OS notification permission | `:840` (after the prefs write at `:839`) | No |

**8 blocking, 9 pre-set answers that persist as if chosen, 5 genuinely
optional, 1 OS prompt.** Five further profile fields are derived without a
question: `goalPhase`, `phaseStartedAt`, `goalStartDate`,
`trainingFreqBucket`, `goal` (`:920-959`).

### 2.3 FREE path (reached when the trial cascade failed or is spent)

| # | Input | Asked at | Blocking |
|---|---|---|---|
| 24 | First name | `FirstRunScreen.js:75-89` | **Yes** (`:38`, `:96`) |
| 25 | "What do you want from training?" | `freeStarter.js:26-33` | Yes to reach the result, but "Skip" is always visible |
| 26 | "Where will you train?" | `freeStarter.js:34-42` | Same |
| 27 | "How many days a week can you train?" | `freeStarter.js:43-51` | Same |

**No unit question, no permission prompt, no body data.**

### 2.4 Inputs that arrive in first use but after setup completes

| # | Input | Asked at | Blocking |
|---|---|---|---|
| 28 | Readiness: soreness / sleep / energy | `HomeScreen.js:109-128`, rendered `:2166-2196` | No — tapping a selected chip clears it |
| 29 | Session intent | same sheet, `:2150-2157` | The tap starts the session; "Skip" starts with all nulls (`:1254-1264`) |

Phase 13/17 own these; they are listed so the matrix is complete.
`NotificationSettings`, `CoachingReminders`, `NutritionEducation` and
`Methodology` are registered in `ProOnboardingStack`
(`RootNavigator.js:703-726`) and reachable from `ProSetupCompleteScreen`
(`:268`, `:317`, `:511`), but none is required and none asks a new input
that setup did not already write.

---

## 3. Phase 5 — the input-necessity matrix

Classes: **A** required before any safe product use; **B** required before
training prescription; **C** required before nutrition prescription; **D**
useful personalisation, deferrable; **E** optional; **F** state-gated; **G**
advanced, do not ask in first use; **H** legacy / no longer needed.

### 3.1 The matrix

| Input | Class | Engine needs it NOW? | If not, defer to | Skip / default behaviour | Canonical Settings owner | Onboarding == canonical? |
|---|---|---|---|---|---|---|
| OAuth / email+password | **A** | Yes — identity is the key for every per-uid store | — | None. No anonymous mode | Settings → Account | n/a |
| Article 9 consent | **A** | Yes — gates every health-data write | — | None, fail-closed | Settings → Privacy (withdrawal) | Yes |
| First name | **E** | **No** — no engine reads it | Never needed; fallbacks already exist | **Blocks both paths** | Settings → Profile (`SettingsProfileScreen.js:208-225`) | Yes (same `saveLocalProfile` field) |
| Biological sex | **C** (founder-mandated blocking) | **Yes** — ED floor + BMR | — | No default, no prefill, gate clamped on draft restore | Settings → Profile (`:176-202`, confirm dialog) | Yes (both write profile + body profile) |
| Age | **C** | Yes for BMR; **not used** by the first-plan path (C5-P5-06) | — | Empty, 13-100 band | Settings → Profile (`:150-169`) | Yes (age → dateOfBirth both sides) |
| Height | **C** | Yes — BMR, FFM | — | Empty, 120-250cm band | Settings → Profile (`:124-144`, 100-250cm band) | Value yes; **unit no** (C5-P9-01) |
| Height units | **D** | No — input mode only | — | Pre-set `imperial`; **never persisted** | None | **No** (C5-P9-01) |
| Body-weight units | **D** | No — display only | — | Pre-set `'st'` | Settings → Workout & units (`SettingsWorkoutScreen.js:95-122`) | **Yes** (identical store action) |
| Current body weight | **C** | Yes — BMR, protein, FFM, trend seed | — | Empty, 30-300kg band | Today weigh-in / Body metrics (Pro) | Yes |
| Body fat % | **E** | No — sharpens BMR when present | First nutrition surface | Optional; blank → Mifflin BMR | Nutrition Targets, Body metrics | Yes |
| Body-fat source | **E** | Only when a % exists | With the % | Pre-set `visual`; only shown once a % is typed | Nutrition Targets | Yes |
| Training experience | **B** | Yes — volume landmarks, RIR, split, exercise complexity | — | No default; blocks | Coach → Update goal and phase (`ProGoalSetupScreen.js:527-532`) | Yes (identical option list) |
| Session length | **B** | Yes — time-budget trim | — | Pre-set 60 | Same screen (`:546-552`) | Yes |
| Days per week | **B** + **C** | Yes — split AND TDEE activity level | — | Pre-set 4 | Same screen (`:535-544`) | Yes |
| Equipment | **B** | Yes — exercise pool is a hard filter | — | No default; blocks | Same screen (`:559-564`) | Values yes; labels differ cosmetically |
| Training phase | **B** + **C** | Yes — calorie direction and volume tuning | — | **Pre-set `lean_gain`** (C5-P5-04) | Same screen (`:510-520`) | Yes (same list, same wording) |
| Competition division | **E** | No for a non-competitor (`GOAL_OVERLAYS.general = {}`) | Already optional | Pre-set `general` → renders "Not competing" | Same screen (`:445-455`) | Yes |
| Weak points | **E** | No — a balanced plan is the no-answer outcome | — | Empty | Same screen (`:458-477`) | **Option set differs** (C5-P6-07) |
| Protein tier | **G**-adjacent, offered as **E** | No — engine picks by goal | — | Collapsed; engine suggestion | Same screen (`:579-620`), Nutrition Targets | Yes |
| Recovery rating | **B** | Yes — MEV/MRV multipliers | — | No default; blocks | Same screen (`:567-576`) | Yes |
| Morning weigh-in hour | **D** | No — notification schedule only | First weigh-in prompt | Pre-set 7am | Coach → Coaching reminders | Yes (hour range aligned, see `:190-194`) |
| Check-in day | **D** | No — schedule + check-in gate | First check-in | Pre-set Sunday; **written before the OS prompt** so a denial cannot discard it | Coach → Coaching reminders | Yes |
| Notification permission | **F** | No | — | Denial leaves the prefs intact | OS settings via Campaign 3's Open Settings | n/a |
| Free: goal / location / days | **B** (consumed instantly) | Yes — they pick the plan | — | "Skip, I'll choose myself" always visible | None — **discarded after use** (C5-P5-08) | **No** |
| Diet preference | **C** for meal suggestions | **Not asked at all** — but one first-use affordance consumes it (C5-P5-05) | Correctly deferred to the first meal surface | Silent `'omnivore'` | Settings → Profile, Settings → Dietary | n/a |
| Readiness / intent | **E** / **F** | No — nulls are written honestly when skipped | — | Skip writes null, never a fabricated value | Settings (ask-off switch) | n/a |

### 3.2 Consumption traces (the evidence behind each class)

- **First name — class E.** Read by exactly five surfaces, all
  display-only, all already safe without it:
  `HomeScreen.js:87-89` (`const name = firstName ? ', ' + firstName : ''`),
  `ProSetupCompleteScreen.js:44` (`|| 'there'`),
  `YouScreen.js:302-304` and `AthleteProfileScreen.js:280-282`
  (`|| email prefix || 'Athlete'`), and
  `notifications/scheduler.js:62-72` (`greetName()` returns `''` when
  absent). `blockAdvisor.js:26,238` names it in a doc comment and never
  reads it. **No engine input, no gate, no persistence requirement.**
- **Biological sex — class C, blocking by founder law.** The single choke
  point into the engine is `coachingGoals.js:369-374`; the floor itself is
  `nutritionEngine.js:670-672` (`kcalFloorForSex`), BMR at `:603-605`,
  the FFM fallback fraction at `:652`, the energy-availability caution line
  at `:728-737`. Also gates the menstrual-cycle question
  (`WeeklyCheckInScreen.js:263,312`; `SettingsCoachingScreen.js:107,266`).
  Pinned by `src/lib/__tests__/proOnboarding.sexGate.test.js`, whose header
  states the law verbatim: "must never be silently defaulted (e.g. to male)
  downstream".
- **Age — class C.** `nutritionEngine.js:603-605` (Mifflin term
  `- 5 * ageYears`). ALSO a volume input via
  `planEngine.js:91-97` (`ageMultipliers`) → `computeLandmarks(…, age)` at
  `:103-106`, but see C5-P5-06.
- **Height — class C.** `nutritionEngine.js:604` (`6.25 * heightCm`); the
  engine keeps its own clamp, the screen refuses a default
  (`ProOnboardingScreen.js:888-894`).
- **Body weight — class C.** BMR (`nutritionEngine.js:598-605`), FFM floor
  (`:630-653`), protein per kg, plus two writes at completion:
  `logBodyMetric` and `logMorningWeight`
  (`ProOnboardingScreen.js:966-982`) — the second exists so the check-in
  gate counts enrolment day.
- **Body fat % + source — class E.** Switches BMR to Katch-McArdle
  (`nutritionEngine.js:586-601`) but only the *authoritative* sources
  (`dexa`/`caliper`/`bia`, `:575-577`) may move the FFM floor
  (`:636-641`). A visual estimate therefore sharpens the target without
  ever loosening a safety floor.
- **Experience — class B.** `planEngine.js:69-74` (`EXP_MULT`), `:743-747`
  (starting RIR), `:1223-1236` (exercise complexity), `:1455-1468` (split
  choice); and in nutrition, `:904` (`SURPLUS_EXP_MULT`) and `:1014`
  (`GAIN_RATE_TARGETS`) via `experienceLevel`.
- **Session length — class B.** `planEngine.js:891-896` and `:990`
  (`trimToTimeBudget`). It is also the one word the build sequence names
  back to the user (`ProOnboardingScreen.js:746`).
- **Days per week — class B and C.** Split selection
  (`planEngine.js:1455-1468`) and, separately, the TDEE activity
  multiplier via `daysToActivityLevel` (`coachingGoals.js:324-329` →
  `nutritionEngine.js:896`). It is the only input that changes both the
  plan and the calories.
- **Equipment — class B.** A hard filter on the exercise pool
  (`planEngine.js:1211+`), reported honestly on shortfall
  (`planAutoGen.js:112-116`).
- **Training phase — class B and C.** `coachingGoals.js:300-321`
  (`phaseToNutritionKey` → `PHASE_ADJUSTMENTS`; `phaseToCoachingKey` →
  `NUT_MULT` at `planEngine.js:82-89` and the weekly coach's phase
  config), plus `PHASE_OVERLAYS` at `coachingGoals.js:604-610`.
- **Division — class E.** `GOAL_OVERLAYS` (`coachingGoals.js:455-589`);
  `general` is the empty overlay (`:456`), so a non-competitor's answer
  changes nothing. It also gates the advanced macro cycle
  (`:215-217`, competitors and advanced cutters only).
- **Weak points — class E.** `planEngine.js` `applyGoalOverlay(…,
  weakPointKeys, …)` (`:130+`). Empty means balanced.
- **Recovery rating — class B.** `planEngine.js:76-80` (`REC_MULT`) and,
  for later blocks, `blockLedgerGather.js:340-346`. It is **not** read by
  `weeklyCoach.js` or `coachApply.js` (verified by grep), so it is purely a
  plan-shaping input.
- **Morning hour / check-in day — class D.** `notifications` scheduling
  (`ProOnboardingScreen.js:842-850`) and the check-in day read back at
  `YouScreen.js:121-128`. The first check-in reminder is deliberately held
  until `FIRST_CHECKIN_MIN_DAYS` (`:848-850`), so a day-0 reminder can
  never invite a new user into a locked screen.
- **Free path's three answers — class B, consumed instantly.**
  `freeStarter.js:73-152` — a pure, deterministic scoring of difficulty-0
  library plans, equipment as a hard filter (`:77-79`). Used at
  `FreeStarterScreen.js:108-131` and then dropped.

### 3.3 Findings

#### C5-P5-01 — DEFECT (HIGH). A display-only name blocks the entire first-use journey.

**Evidence.** Free path: `FirstRunScreen.js:38`
(`const hasName = firstName.trim().length > 0;`) and `:96`
(`disabled={!hasName}`), with no skip control anywhere on the screen. Pro
path: `ProOnboardingScreen.js:651-654` (alert and return) and `:1158`
(`!!firstName.trim() &&` inside `canContinue`), with the refusal hint
"Complete your name, sex, age, height and body weight to continue."
(`:1364`).

**Consumption.** See §3.2 — five display sites, every one already
fallback-safe, and `ProSetupCompleteScreen.js:44` proves the neutral
fallback is already written and shipped (`userProfile?.firstName ||
'there'`).

**User scenario.** A user who does not want to give a name to a fitness
app — a common privacy posture, and one this app's own Article 9 screen
invites by naming exactly what it does and does not collect — cannot reach
any part of the product on either tier. There is no "prefer not to say".
On the free path the name is the *only* thing standing between consent and
the first plan.

**Which law.** First-use law 1 (minimum required information): a value no
engine consumes must not gate the journey. It is class **E**, asked as
though it were class A.

**Proposed minimal fix (needs a D96 ruling; not executed here).** Let
`Continue` proceed with an empty name on both paths and rely on the
existing fallbacks — no new screen, no new copy surface, no schema change.
Free path: drop `disabled={!hasName}` and the `if (!hasName) return;` in
`finish()`. Pro path: drop the `firstName` term from `canContinue` and the
`advanceFrom2` guard. `HomeScreen.js:87-89` already renders "Morning."
cleanly, and Settings → Profile remains the place to add a name later.

#### C5-P5-02 — FOUNDER-GATED (HIGH). A downstream screen silently defaults sex to male.

**Evidence.** `ProGoalSetupScreen.js:306-308`:

```js
const safeHeightCm = (typeof wp.heightCm === 'number' && wp.heightCm > 0) ? wp.heightCm : 175;
const safeAge      = (typeof wp.age === 'number' && wp.age > 0) ? wp.age : 28;
const safeSex      = wp.sex === 'female' ? 'female' : 'male';
```

These three values are then passed straight into
`buildNutritionEngineInputs` (`:342-344`) and the recalculated targets are
persisted (`:354-357`) and used to rebuild the plan (`:390`).

**Why it matters here.** The whole reason sex blocks step 2 is the founder
rule of 2026-07-01, and the guard test states it must "never be silently
defaulted (e.g. to male) **downstream**"
(`src/lib/__tests__/proOnboarding.sexGate.test.js:1-13`). The engine's own
choke point is built to *surface* a missing sex rather than invent one:
`coachingGoals.js:369-374` logs `nutrition.sexMissing` to Sentry precisely
so an enforcement gap is caught. Inventing the sex at line 308 means that
guard can never fire from this path — the telemetry that exists to detect
the gap is silenced by the gap itself.

**Reachability.** Only if `userProfile.sex` is absent when this screen
saves. That is not hypothetical: C5-P5-03 below is a live mechanism that
empties the canonical body-profile row, and `userProfile` itself is
AsyncStorage-backed and rebuilt from cloud on a new device
(`useAppStore.js:939-969`).

**Direction of error.** A female profile defaulted to male gets the male
Mifflin constant (`+5` instead of `-161`, `nutritionEngine.js:603-605`), a
~166 kcal higher BMR, and the 1500 rather than 1200 floor
(`:670-672`). The floor moves in the safe direction; the *target* does
not, and the energy-availability caution line switches from the more
protective female 40 kcal/kg to the male line (`:728-737`).

**Classification.** FOUNDER-GATED. This is the ED-safety system (sex,
floors, energy-availability caution). Documented only; no fix is proposed
or executed by this lane. The founder/lead options are recorded, not
recommended: (a) refuse the recalculation and route the user to the
profile field when sex is missing; (b) let the engine's existing
`nutrition.sexMissing` path run instead of pre-empting it; (c) accept as
designed and record why.

#### C5-P5-03 — FOUNDER-GATED (HIGH). The Wellbeing check erases sex, date of birth and height from the canonical row.

**Evidence.** `WellbeingCheckScreen.js:77`:

```js
await saveUserBodyProfile(user.id, { scoffScore: score })
```

`saveUserBodyProfile` is a **destructive whole-row UPDATE**
(`database.js:4768-4790`): every column is written from the passed object
with `?? null`, so this call sets `sex`, `date_of_birth`, `height_cm`,
`experience_level`, `training_age_years`, `primary_goal` to NULL and
`gdpr_consented` to 0. Every other caller merges first —
`SettingsProfileScreen.js:139-140`, `:164-165`, `:183-184` all read
`getUserBodyProfile` and spread `...(existing || {})`, and that file's own
comment at `:171-175` states the reason ("saveUserBodyProfile writes the
whole row").

**Propagation.** The nulled row is pushed to Supabase by
`sync.js:1094-1112`, which maps `p.sex ?? null`, `p.dateOfBirth ?? null`,
`p.heightCm ?? null` — so the erasure reaches the cloud row and any second
device.

**Concrete user consequence.** A female Pro user opens Coach → Safety
checks → Wellbeing check and answers the five SCOFF questions. From that
moment `getUserBodyProfile(...).sex` is null, so:
`WeeklyCheckInScreen.js:263,312` stops offering her the menstrual-cycle
question, `SettingsCoachingScreen.js:107,266` hides the cycle setting,
`NutritionTargetsScreen.js:376-385` prefills a blank sex/height/age form,
and `SettingsProfileScreen.js:96-113` shows empty height and age fields.
Nothing tells her anything was lost.

**Article 9 is NOT weakened by this.** The consent gate reads
`users_profile.health_data_consent` (`RootNavigator.js:1367,1382`) and the
per-uid local cache, not `user_body_profile.gdpr_consented`. Flagged to the
Phase 3 lane for independent confirmation.

**Classification.** FOUNDER-GATED. The write lives in the ED/wellbeing
screen and the erased field is the ED-floor input, so this lane documents
and does not execute. The obvious minimal shape — read-merge-write, exactly
as the three `SettingsProfileScreen` callers already do — is recorded as
evidence of an existing in-repo pattern, **not** proposed for autonomous
execution.

#### C5-P5-04 — IMPROVEMENT (MEDIUM). A defaulted calorie direction persists as a choice.

**Evidence.** `ProOnboardingScreen.js:381-384` sets
`trainingPhase = 'lean_gain'` with the reasoning "Default to lean gain
(lean bulk) rather than an empty greyed picker". The gate only tests
truthiness (`:714`: `if (!trainingGoal || !trainingPhase)`), so an
untouched dropdown always passes. The value is written to the profile
(`:937`), drives `calculateNutritionTargets` (`:906-918`), sets
`goal: phaseToNutritionKey(trainingPhase)` (`:958`) and thereafter reads
back as the user's phase everywhere (`YouScreen.js:104-114`,
`ProSetupCompleteScreen.js:205`).

`lean_gain` is a calorie **surplus** (`coachingGoals.js:229-232`: "A small
calorie surplus"). A user who came to lose fat and never opened the
dropdown is enrolled in a surplus.

**Mitigation already present.** The provisional figure is shown live from
the same engine call the final plan uses, and is honestly labelled:
"Provisionally about {N} kcal a day for this focus. Your exact targets are
set when your plan is built." (`:1613-1615`). Whether a number a user has
no baseline for is a sufficient signal that a *direction* was chosen for
them is the open question.

**Bound.** Calorie direction is ED-adjacent. Any ruling must leave the
1500/1200 floors, the FFM floor, the rapid-loss gate and the
energy-availability caution untouched — none of which is affected by
whether the picker starts empty. Recorded for a lead ruling; no change
proposed here.

#### C5-P5-05 — DEFECT (MEDIUM). The first meal week is built omnivore for everyone.

**Evidence.** `ProSetupCompleteScreen.js:384-393` renders "Create my first
week of meals" during first run; `:142-150` calls
`planNextWeek(user.id, userProfile, { repeat: false })`;
`mealPlanService.js:106` reads `diet: p.dietPreference || 'omnivore'`.
`dietPreference` is written by exactly two surfaces, both post-onboarding
(`SettingsProfileScreen.js:309` and the dietary editor) — grep over `src/`
confirms onboarding never sets it.

**User scenario.** A vegan finishes Pro setup, taps the one optional
"head start" the screen offers, and gets a week of meals containing meat,
persisted and waiting in Meal planning. Nothing on the screen states an
assumption was made.

**Which law.** Law 1 read in the correct direction: diet is rightly *not*
asked during setup (it is class C for meal suggestions and belongs at the
first meal surface) — but an affordance that consumes it has been placed
*inside* first use, so at that moment the information is required and is
being invented.

**Proposed minimal fix (lead ruling, two options, neither pre-decided).**
(a) The affordance states its assumption in the existing caption and links
to the dietary preference control that already exists (Campaign 3's
contextual-entry pattern), or (b) the affordance is not offered until a
diet preference exists. No new screen, no new feature, no engine change.

#### C5-P5-06 — IMPROVEMENT (MEDIUM). Age is collected but the first plan ignores it.

**Evidence.** `planEngine.js:91-97` defines `ageMultipliers` (a 62-year-old
gets `MRV × 0.75`, a 25-year-old `MRV × 1.05`) and `computeLandmarks`
takes `age` as its fourth parameter (`:103-106`). But
`planAutoGen.buildPlanInputs` (`:79-105`) never puts `age` in the object,
the onboarding `planProfile` (`ProOnboardingScreen.js:1024-1033`) has no
`age` key, and `_generatePlanInner` defaults `age = null`
(`planEngine.js:2759`) — so `ageMultipliers(null)` returns the neutral
1.00/1.00 (`:92`). Meanwhile `blockLedgerGather.profileAdjustedPrior`
**does** pass `userProfile.age ?? null` (`:340-346`).

**Consequence.** The same profile produces age-adjusted landmarks in the
block-seeding prior and age-blind landmarks in the plan the user actually
trains from. A 60-year-old beginner's first plan is built at a
30-something's recovery ceiling.

**Note on honesty.** The onboarding copy does not overclaim: age's hint is
"Used with your height and weight to set your calorie targets."
(`ProOnboardingScreen.js:1209`), which is exactly what happens. So this is
not a false-personalisation breach — it is an unused capability.

**Bound.** Passing age would change training prescription for existing
users, so this is a lead ruling with a regression-test requirement, not a
first-use copy fix. Recorded, not proposed for execution.

#### C5-P5-07 — IMPROVEMENT (LOW). A whole wizard step for one optional field, with no skip control.

**Evidence.** Step 3 (`ProOnboardingScreen.js:1388-1454`) carries exactly
one optional input plus its conditional source picker. `advanceFrom3`
(`:696-699`) has no gate at all. The word "Skip" appears nowhere as a
control — only in the header sentence "An honest estimate sharpens your
first plan. Skip this if you are not sure." (`:1396`) — so the only way
past is the button labelled **Continue**, which reads as an obligation.

The step exists for a good reason (L04-6, `:58-64`: step 2 previously
carried up to seven fields at the highest-abandon-risk moment). The
observation is narrower: a one-field optional step is a full screen of
first-use weight whose only exit is labelled as if something is required.

**Deferrable to.** Nutrition Targets and Body metrics both already accept
body fat with the same source picker and the same validation, so nothing is
lost by asking there.

#### C5-P5-08 — IMPROVEMENT (LOW). The free path's answers are used once and thrown away.

**Evidence.** `FreeStarterScreen.js:39` holds `answers` in component
state; `handleStartPlan` (`:108-131`) copies and activates the plan and
calls `completeFirstRun()`; no `saveLocalProfile` call exists anywhere in
the file. On a kill before the tap, `:505` behaviour applies — the quiz
restarts from question 1.

**Consequences.** (i) A free user who returns to the quiz from Home's
no-plan card re-answers all three. (ii) The equipment vocabulary differs
between the two paths — free uses `full_gym | dumbbell | home`
(`freeStarter.js:37-41`), Pro uses six values
(`ProOnboardingScreen.js:174-181`) — so even if the answers were kept they
would not be directly reusable.

**Counter-weight (deliberate, and correct).** These three questions are the
cleanest example of law 1 in the product: asked at the exact moment of
need, consumed immediately, deterministic, and with a visible skip on every
step. Persisting them would be a convenience, not a necessity — recorded
for a ruling, with the note that adding profile writes to the free path
must not create a partial Pro profile.

#### C5-P5-10 — IMPROVEMENT (LOW). Three source comments describe an onboarding that does not exist.

- `useAppStore.js:1792-1795`: diet preference "Set in onboarding, editable
  in Settings" — onboarding never sets it (C5-P5-05).
- `ProOnboardingScreen.js:106-107`: "Default days per week, used for
  nutrition calc **without asking the user**" — days per week has been a
  step-4 question since the L04-6 split (`:1500-1509`).
- `SettingsProfileScreen.js:227-231`: body-weight units "come from
  onboarding (the morning-weight setup screen)" and "aren't user-editable
  from Settings any more" — they are editable, at
  `SettingsWorkoutScreen.js:95-122`, and there is no "morning-weight setup
  screen".

Class H documentation drift. Comment-only corrections are inside bounds but
belong to whichever lane lands a change in those files; recorded here, not
executed.

#### C5-P5-09 — CLEAN. The body-data block is correctly specified and correctly enforced.

Checks run and passed: sex has no default and no prefill
(`ProOnboardingScreen.js:355-360`); age, height and body weight all start
empty with their example values in placeholders only (OB-5/ONBOARD-001,
`:341-347`, `:363-371`); the button predicate and the advance function
compute the same values through the same shared resolvers
(`resolveHeightCm` at `:147-156`, used by both `:682` and `:1156`), so
there is no enabled-then-alert gap; a corrupt draft cannot restore past the
sex gate (`:533-538`); and the completion path re-validates everything and
refuses rather than falling back
(`:875-885`: "Volyume will not build targets from fallback body data.").
Every field carries a purpose hint naming what it is for. This is the
correct shape for class C inputs.

---

## 4. Phase 6 — goal vs phase comprehension

### 4.1 The question the order asks

> first use must prove the user can distinguish: WHAT ARE YOU TRYING TO
> ACHIEVE? vs WHAT ARE YOU FOCUSING ON RIGHT NOW?

**Answer from the code: for a non-competitor there is only ONE question, so
there is nothing to distinguish — but the copy gives that one question five
different names.**

The two-axis model is real and documented at `coachingGoals.js:8-19`:
`PHYSIQUE_GOALS` = "Which body are you building?" (volume distribution,
optional, secondary) and `TRAINING_PHASES` = "What are you focused on right
now?" (calories + tuning, primary). Onboarding renders exactly that: the
phase dropdown first (`ProOnboardingScreen.js:1602-1617`), the division
dropdown second and marked optional (`:1622-1632`). The ordering is right.

### 4.2 C5-P6-01 — IMPROVEMENT (MEDIUM). One control, five names.

Everything below is on the same screen, describing the same dropdown:

| Surface | Rendered words | Evidence |
|---|---|---|
| Step chip | "Step 5 of 6 - **Targets**" | `:66`, `:248` |
| Step title | "**Set your training focus**" | `:1589` |
| Step sub | "**Your goal** sets the calorie direction, training bias and nutrition target." | `:1590` |
| "This step sets" chip | "**Goal phase**" | `:86` |
| Group title / sub | "**Goal and targets**" / "Start with **the broad goal**. Competitive category and weak points are optional refinements." | `:1599-1600` |
| Field label | "**What are you focused on right now?**" | `:1604` |
| Field tooltip | "Your current aim: lose fat (cut), gain muscle slowly (lean-gain) or hold steady (maintain)." | `coachGlossary.js:58-59` |

A first-time reader meets "focus", "your goal", "the broad goal", "Goal
phase" and "what are you focused on right now" in one scroll and has no way
to know they are one input. "Goal phase" is worse than a synonym: it is the
internal key name (`goalPhase`, written at `ProOnboardingScreen.js:920,939`)
surfaced verbatim in an outcome chip, and the order is explicit that "the
user should not need to understand internal phase translators". The tooltip
then defines "phase", a word the visible label deliberately avoids.

**Proposed minimal fix (lead ruling; copy only, no structural change).**
Pick one noun for this control and use it in all five places. Nothing else
changes — no engine value, no option list, no ordering, no new screen.

### 4.3 C5-P6-02 — IMPROVEMENT (MEDIUM). The canonical editor leads a non-competitor with a competition question.

`ProGoalSetupScreen.js` — the screen a user reaches to change any of this
later, titled "**Update goal and phase**" (`:430`) — renders in this order:

1. "Competing in a category? (optional)" (`:445-455`)
2. Weak points (`:458-477`)
3. Show date, competition divisions only (`:482-505`)
4. "What are you focused on right now?" (`:510-520`)

So the first thing a non-competitor sees on the canonical goal screen is a
competition question, and the question that actually governs their calories
is fourth. Onboarding gets this right; its own canonical counterpart
inverts it. The order's Phase 6 instruction is "Avoid asking secondary
competition/physique questions prominently of users who do not compete".

The header title also uses **both** contested words ("goal and phase"),
which is the same conflation as C5-P6-01 on the surface best placed to
teach the distinction.

**Proposed minimal fix (lead ruling).** Move the focus/phase block above
the competition block on that screen, matching onboarding. Pure reorder of
existing JSX; no value, option list, save path or gating changes.

### 4.4 C5-P6-03 — CLEAN. "Not competing" reads as normal.

Verified on every surface that renders it:

- The value is **pre-selected**, not empty:
  `ProOnboardingScreen.js:380` (`useState('general')`), so the control
  shows the option label "Not competing"
  (`coachingGoals.js:30`) rather than an unanswered placeholder —
  `Dropdown.js:49` renders `selected?.label ?? placeholder`, so the
  placeholder "Not competing, General" is only a fallback and the user sees
  a clean, already-answered field.
- The label carries "(optional)" and the hint scopes it explicitly: "Only
  if you are chasing a competitive physique." (`:1624-1625`).
- Its overlay is the empty object (`coachingGoals.js:456`,
  `general: {}, // no per-muscle bias, balanced volume`), so choosing
  nothing genuinely changes nothing.
- The weak-point chips are hidden entirely unless the division supports
  them, and `general` falls back to the balanced list
  (`coachingGoals.js:163-165`).
- Afterwards, `YouScreen.js:104-114` deliberately **suppresses** the string
  from the profile line (`goal && goal !== 'Not competing' ? goal : null`),
  so a non-competitor's profile summary reads "Build muscle (lean gain) -
  4 days/week" with no trace of a category they declined.

### 4.5 C5-P6-04 — CLEAN. Goal lock stays advanced.

The onboarding interstitial was removed by founder decision 2026-05-29 and
the removal is documented at the decision point
(`ProOnboardingScreen.js:718-724`). The only live entry is Coach → Safety
checks → "Goal lock", Pro-only (`YouScreen.js:553-562`,
`navigate('GoalLockConsent', { editMode: true })`). No first-use surface
references it. Nothing in this lane's proposals surfaces it more
aggressively.

### 4.6 C5-P6-05 — IMPROVEMENT (LOW). Dead goal-lock selector.

`coachingGoals.js:183-187` exports `shouldShowGoalLockOnboarding({
trainingGoal, trainingPhase, experience })` and grep over `src/` returns
**no call sites** — it is residue of the removed interstitial (class H).
Recorded, not removed: dead-code removal was Campaign 4's lane and this
lane changes nothing. Flagged because a future reader could mistake it for
live gating and "restore" an interstitial the founder deleted.

### 4.7 C5-P6-06 — CLEAN. No weight goal exists to confuse.

Phase 6 lists "weight goal" among the things to audit. Grep for
`targetWeight` / `goalWeight` across `src/` returns only per-exercise lift
goals (`ExerciseDetailScreen.js:281,430-435`, `exercise_goals` table at
`database.js:8302-8322`) and the set-progression internals in
`algorithms.js:427-486`. **There is no bodyweight-goal input anywhere in
first use, and none in the profile.** The weight direction is carried
entirely by the phase, which is the simpler model and needs no defending.

### 4.8 C5-P6-07 — IMPROVEMENT (LOW). Weak points: one field, two option sets.

Onboarding renders `weakPointSetForGoal(trainingGoal)`
(`ProOnboardingScreen.js:1646`) — the division-scoped list from
`coachingGoals.js:152-165` — and prunes selections when the division
changes (`:418-422`). The canonical editor renders the **full**
`WEAK_POINT_MUSCLES` list (`ProGoalSetupScreen.js:467`) with no division
scoping. The same profile field therefore offers, for example, a Bikini
competitor 6 options during setup and 16 afterwards. Campaign 3's ownership
rule wants the canonical surface and the onboarding surface to be
equivalent; here they are not. Recorded for a ruling on which direction is
correct (narrowing Settings is a behaviour change for existing users).

---

## 5. Phase 9 — units and basic preferences

### 5.1 What is asked, and when

| Unit | Asked in first use? | Where | Verdict |
|---|---|---|---|
| Gym weight (kg/lb) | **Never** | Forced `'kg'` — `useAppStore.js:1753-1760` coerces any argument to `'kg'`; `FirstRunScreen.js:34` states "Gym weights are kg-only (UK). No unit choice." | Correct by product law; nothing to ask |
| Body weight (st/kg/lbs) | Pro only | `ProOnboardingScreen.js:1295-1307`, immediately above the field that needs it | Correct timing (C5-P9-02) |
| Height (ft+in / cm) | Pro only | `:1229-1244`, on the height field | Correct timing, **broken persistence** (C5-P9-01) |
| Food energy (kcal/kJ) | **Never** | Default `'kcal'` (`useAppStore.js:1923`), canonical in Settings → Display & accessibility (`SettingsDisplayScreen.js:99-122`) | Correct (C5-P9-03) |
| Body measurements (cm/in) | **Never** | No choice exists; cm everywhere (`BodyMetricsScreen.js:1388,1442,1448`) | Correct (C5-P9-04) |

### 5.2 C5-P9-01 — DEFECT (MEDIUM). The height-unit choice is thrown away, and cm never appears again.

**Evidence.**
1. Onboarding offers a real choice, defaulted to imperial:
   `ProOnboardingScreen.js:354` (`useState('imperial')`) and the ft+in / cm
   radio group at `:1229-1244`.
2. The choice is saved into the resume **draft** (`:512`, `:552`) but
   **not** into the profile: the `merged` object written at `:928-959`
   carries `units` and `bodyWeightUnits` and no height-unit key. The draft
   is then cleared at `:1078-1079`.
3. Both canonical later editors are ft+in only, sharing one component:
   `SettingsProfileScreen.js:270-277` and `NutritionTargetsScreen.js:664-668`,
   both `HeightFeetInchesField` (`HeightFeetInchesField.js:19-22`), which
   has no cm mode at all.
4. The app already **encodes the intended rule** as a pure function —
   `units.js:120-126`:
   ```js
   /** Returns true when the given bodyWeightUnits implies imperial height (ft/in).
    *  UK users who use st or lbs for body weight also use ft/in for height. */
   export function usesImperialHeight(bodyWeightUnits) {
     return bodyWeightUnits === 'st' || bodyWeightUnits === 'lbs';
   }
   ```
   Grep over `src/` returns **zero callers**. By that rule a user on `kg`
   should see cm; both editors give them ft+in.

**User scenario.** A metric user selects "cm" and types 178 during setup. To
correct a typo later they open Settings → Profile and find two boxes
labelled feet and inches showing 5 and 10. They must convert their own
height to edit it. The same is true in the Nutrition Targets calculator.
Nothing in the app ever shows them cm again.

**Which law / phase.** Phase 9's own test: "onboarding value matches
canonical Settings value; changes persist; a user can change them later."
The unit preference fails all three. Campaign 3 ownership: the canonical
surface does not honour what onboarding captured.

**Proposed minimal fix (lead ruling; two shapes, neither pre-decided).**
(a) Persist the choice on the profile alongside `bodyWeightUnits` and have
`HeightFeetInchesField` render a cm input when it is metric — one
component, both call sites, no schema change (the profile blob is already
free-form and syncs by field). (b) Derive it with the function that already
exists, `usesImperialHeight(bodyWeightUnits)`, and drop the separate
onboarding toggle so there is exactly one unit decision. Both are
display-layer only; neither touches stored values (`heightCm` is stored in
cm throughout) or any engine input.

**Related, recorded not proposed:** the three height editors validate
against three different bands — onboarding 120-250cm
(`ProOnboardingScreen.js:139-140`), Settings → Profile 100-250cm
(`SettingsProfileScreen.js:28-29`), and the Nutrition Targets calculator no
band at all (`NutritionTargetsScreen.js:426` checks only
`heightFt.trim()`). See C5-P5-11.

### 5.3 C5-P9-02 — CLEAN. Body-weight unit: right moment, one owner.

Asked immediately above the body-weight field it governs
(`ProOnboardingScreen.js:1295-1307` then `:1309-1360`), with the field's
input shape switching to the chosen unit — so it is asked because the app
"genuinely needs it to interpret input", exactly the order's test. The
value is written through `setBodyWeightUnits` at `:865`, and the canonical
Settings control calls the **same store action**
(`SettingsWorkoutScreen.js:112`), which single-writes the field, stamps it
for per-field sync and mirrors it to the profile blob
(`useAppStore.js:1775-1789`). Onboarding value == Settings value, by
construction. Reachable free or Pro at Settings → Workout & units
(`SettingsScreen.js:55-57`, no tier guard).

### 5.4 C5-P9-03 — CLEAN. kcal/kJ is not asked, and should not be.

Default `'kcal'` (`useAppStore.js:1923`, "Display-only"), changed in
Settings → Display & accessibility (`SettingsDisplayScreen.js:99-122`)
whose own copy states the boundary: "This changes the display only. Your
targets and coaching stay the same." Every food surface reads it reactively
(`MacroRings.js:243`, `EntryRow.js:38`, `FoodRow.js`, via
`format.js:64-99`), so a change applies immediately with no reload. A first
-use user never meets a food surface before the choice exists, and the
default is the one the engine speaks. This is the correct handling of a
display preference under Phase 9's "do not ask for display preferences
before they matter".

### 5.5 C5-P9-04 — CLEAN. Measurements are never asked in first use.

Body measurements are cm-only with no user choice anywhere
(`BodyMetricsScreen.js:452,1388,1442,1448,1511`), and the screen is
Pro-gated with a read-only guard for lapsed users
(`RootNavigator.js:218`). Nothing to ask, nothing to mismatch.

### 5.6 C5-P9-05 — CLEAN. The free path asks no unit because it needs none.

This **resolves the Phase 1 lane's C5-P1-11 UNCERTAIN**. Verified: a free
user never meets a body-weight entry or display surface, so the store's
`'st'` default (`useAppStore.js:1775`) is never rendered to them.

- The Today weigh-in strip is Pro-only: `HomeScreen.js:1811`
  (`{tier === 'pro' && user?.id && (<TodayStrip …`).
- Body metrics uses the read-only Pro guard, which shows the plain locked
  gate to a free user with no data (`RootNavigator.js:218`).
- Weekly check-in, Nutrition targets, Coach output and the progress-photo
  weight line are all Pro (`RootNavigator.js:208-249`).
- Gym weights, the one thing a free user does enter, are kg by product law
  with no choice to offer (`useAppStore.js:1753-1760`).

The free path's silence on units is therefore correct minimum-information
behaviour, not a gap.

---

## 6. C5-P5-11 — FOUNDER-GATED. FR-1: Sex / Age / Height duplication, UX consequence only

**The ruling is founder-gated (order line 142). Nothing below is a
recommendation.** What follows is the documented UX consequence the order
asks for.

**The three places the same three values are entered.**

| Surface | Sex | Age | Height | Writes back to the canonical row? |
|---|---|---|---|---|
| Onboarding step 2 | `ProOnboardingScreen.js:1196-1205` | `:1207-1222` | `:1247-1292` (ft+in **or cm**) | **Yes** — profile (`:928-961`) and `user_body_profile` (`:984-994`) |
| Settings → Profile | `SettingsProfileScreen.js:243-257` (confirm dialog) | `:279-290` | `:260-278` (ft+in only) | **Yes** — both, merged (`:139-140,164-165,183-184`) |
| Nutrition Targets calculator | `NutritionTargetsScreen.js:644-663` | same block | `:663-668` (ft+in only) | **No** |

**Consequence 1 — the calculator's edits do not stick.** The calculator
prefills from `user_body_profile` (`:371-385`), so it does not re-ask
blindly; that part is fine. But grep confirms `saveUserBodyProfile` has no
call site in `NutritionTargetsScreen.js`. A user who corrects their height
there gets new targets from the corrected figure, while the canonical row
keeps the old one — so the next recalculation from any other surface
(`ProGoalSetupScreen.js:306`, which reads the store profile) silently
reverts to the pre-correction body data. The user sees their targets move
back with no action of their own.

**Consequence 2 — three validation bands for one value.** 120-250cm at
onboarding, 100-250cm in Settings, unbounded in the calculator (§5.2). The
same typo is refused, refused, and accepted depending on which of the three
doors the user walks through.

**Consequence 3 — the unit asymmetry.** Only onboarding offers cm; the two
editable surfaces are ft+in only (C5-P9-01). A metric user's one chance to
speak metric is the screen they see once.

**Consequence 4 — a second consent checkbox.** The calculator requires "I
consent to storing this data on my device" before it will calculate
(`NutritionTargetsScreen.js:262`, `:426`, rendered `:689-702` and
`:928-939`), which a user has already granted, more thoroughly, at the
Article 9 gate. This is Article 9 legal content: **documented only**, and
flagged to the Phase 3 lane, which owns consent comprehension.

**Founder question this evidence supports (not answered here).** Should
Sex/Age/Height remain editable in the calculator at all, given that two
other surfaces own them and one of the three does not persist? Options
recorded without a recommendation: (a) keep all three doors and make the
calculator write back and share the band; (b) make the calculator's copies
read-only with a link to the canonical field; (c) leave as is.

---

## 7. Checks run and clean (named)

- **Sex gate integrity at onboarding** — verified against
  `src/lib/__tests__/proOnboarding.sexGate.test.js` (five source-level
  regression guards) and the code they pin. Enforced correctly. Classified
  honestly under the founder law as class C, blocking; **no weakening is
  proposed anywhere in this document.** The two findings that touch sex
  (C5-P5-02, C5-P5-03) argue the law is *under*-enforced downstream, never
  over-enforced.
- **No first-use input feeds a false-personalisation claim.** Every hint on
  every field states a mechanism in the future or present tense ("Used by
  the calorie formula and safety floors", "This sets your starting trend
  and first calorie target", "This sets your starting volume"), and the one
  number shown back is labelled "Provisionally … Your exact targets are set
  when your plan is built" (`ProOnboardingScreen.js:1613-1615`). No input's
  copy claims prior history. Campaign 2 provenance law: clean across
  Phases 5, 6 and 9.
- **No jargon leak in the inputs audited** — grep over the wizard, first
  run and free starter for `mesocycle`, `MEV`, `MRV`, `deload`,
  `hypertroph`, `RIR`: no matches in rendered copy. "Volume" appears three
  times and carries `GLOSSARY.volume` each time (`:1481`, `:1821`, plus the
  reworded build-sequence line at `:742-747`).
- **No cardio and no AI in any input, label, option list or hint** across
  `ProOnboardingScreen`, `FirstRunScreen`, `FreeStarterScreen`,
  `freeStarter.js`, `coachingGoals.js`, `ProSetupCompleteScreen`: zero
  matches.
- **ONBOARDING_QUIZ_FIRST untouched.** The wizard's quiz prefill
  (`ProOnboardingScreen.js:400-414`) is the rollback path's consumer and
  no-ops when the flag is off (`if (!q) return;`). It is class H
  infrastructure that **must remain**; nothing here proposes touching it.
- **Notification-preference write ordering** — the prefs blob is written
  BEFORE the OS prompt (`:825-839`), so a denial cannot discard the chosen
  check-in day, and the hour ranges match the canonical editor
  (`:190-194`, `:832`). Correct; no change proposed. Phase 27/28 own the
  depth.
- **Correction to the Phase 1 lane's reading.** `CURRENT-FIRST-USE-JOURNEY.md`
  §7 C5-P1-01 quotes the auto-advance effect as
  `if (userProfile) return; setAccountCreated(true); setStep(2);` at
  `:479-481`. The live code checks the persisted-session flag first
  (`:471-475`, `if (proOnboardingAccountCreated) { … return; }`) and the
  `userProfile` early-return is the *second* branch (`:479`). The finding
  itself still stands for the relaunch case, since
  `proOnboardingAccountCreated` is in-memory; the quoted snippet is
  incomplete. Flagged to the Phase 29/43 lanes so the reproduction is
  described accurately.

---

## 8. Notes handed to other lanes

- **Phase 3 (Article 9):** C5-P5-03's destructive write also resets
  `user_body_profile.gdpr_consented` to 0. This lane verified the Article 9
  gate does not read that column (`RootNavigator.js:1367,1382` reads
  `users_profile.health_data_consent`), so consent is not weakened —
  please confirm independently. Also: the Nutrition Targets calculator's
  second on-device consent checkbox (§6, consequence 4).
- **Phase 4 (wellbeing):** C5-P5-03 lives in `WellbeingCheckScreen.js:77`.
  Any wellbeing-lane change to that file should not land before this
  finding has a ruling, and vice versa.
- **Phase 7/8 (free vs Pro, trial):** the free path collects **no body
  data at all** (§2.3), which is the strongest argument that Free is a real
  product rather than a stripped Pro — it is not missing questions, it
  genuinely does not need them.
- **Phase 12 (Home):** first name is the only input Home's greeting
  consumes, and it degrades cleanly (`HomeScreen.js:87-89`) — relevant if
  C5-P5-01 is ruled on.
- **Phase 13/17 (first workout, feedback):** the readiness/intent sheet
  (§2.4) is the only place first use asks a question after setup; skipping
  writes null, never a fabricated value (`HomeScreen.js:1254-1264`).
- **Phase 21/22 (nutrition, weigh-in):** C5-P5-05 (omnivore meal week) and
  the enrolment-day morning-weight seed
  (`ProOnboardingScreen.js:966-982`) both land in that lane's territory.
- **Phase 29/30 (interruption, back navigation):** the draft persists 24 of
  24 wizard answers (`:550-556`) including the height-unit choice that the
  completion path then discards (C5-P9-01) — the draft is more faithful
  than the profile.
- **Phase 40 (test matrix):** this lane's findings suggest three pins that
  do not exist today — (i) no first-use input may block on a value with no
  engine consumer; (ii) `saveUserBodyProfile` callers must merge (a
  source-level guard in the same style as the sex-gate test); (iii) no
  downstream surface may substitute a biological sex. All three are test
  proposals only; writing them belongs to the test lane after a D96 ruling.

---

*Phases 5, 6 and 9 evidence file. Audit only: no source, test, doc or
configuration outside this file was modified, and nothing was committed,
pushed or stashed by this lane.*
