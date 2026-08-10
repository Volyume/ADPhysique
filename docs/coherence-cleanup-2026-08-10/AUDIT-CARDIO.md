# AUDIT-CARDIO — Campaign 4 Phase 2/2A/2B/2C/2D cardio closure audit

**Status:** READ-ONLY AUDIT. Nothing in this document has been executed.
Every removal below is a PROPOSAL with proof; the lead executes, not this
agent.

**Baseline:** branch `claude/campaign4-coherence` = main `92b9644e`
(HEAD `0f4d868e`, "Open Campaign 4 on the coordination docs").

**Authority chain**
1. Campaign 4 order, ABSOLUTE PRODUCT BOUNDARIES: *"CARDIO LOGGING:
   PERMANENTLY OUT OF SCOPE"* and *"Cardio logging now has a direct current
   founder ruling that it is not part of Volyume. The user-facing and
   non-load-bearing implementation should therefore be removed
   systematically. Historical user data and destructive schema deletion
   require special care."*
2. `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:2369-2379`
   (D92-1, FOUNDER BOUNDARY): *"Volyume is not a cardio logging product.
   Cardio logging is intentionally OUT OF SCOPE... Clean removal belongs to
   the later whole-product coherence/dead-code campaign. Exception: a cardio
   VALUE feeding a non-cardio safety decision may be corrected for
   correctness."*
3. Founder ruling 2026-08-06, quoted verbatim at
   `src/screens/__tests__/progressAndBrief.founderRulings.guard.test.js:7-8`:
   *"Also the logging cardio thing in Progress. That's not progress."* — the
   Progress-tab cardio card was deleted then; the Coach-tab entry was kept.
4. Campaign 3 hand-off:
   `docs/discoverability-audit-2026-08-10/SETTINGS-INVENTORY.md:137` and
   `SETTINGS-OWNERSHIP.md:94-96` explicitly record the live "Cardio logging"
   toggle as untouched and **"Out of scope for Campaign 3 changes (cardio
   bound)"** — i.e. deliberately handed to Campaign 4.
   `src/__tests__/campaign3.discoverability.test.js:99-104` pins that
   Campaign 3 added no cardio entry point.

**One correction to the prior record up front.** D92-1 (2026-08-10) states
*"the only cardio entry navigates to an unregistered route"*. That is
**stale as of current main.** Cardio logging is today a fully wired, live,
Pro-gated feature: two registered routes in three stacks
(`RootNavigator.js:399-408, 460, 523-524`), a live entry point
(`YouScreen.js:494-501`), two settings toggles, a coach prescription with an
Apply button, a check-in question, a paywall blurb and an in-app FAQ promise.
Campaign 4 is removing a LIVE feature, not sweeping a dead remnant. Sizing and
device-testing must be planned on that basis.

---

## 0. HEADLINE ANSWERS

### 0.1 Does removing cardio logging alter an otherwise identical user's training or nutrition prescription?

**NO — not by one kilocalorie, one set, one step or one safety gate.** Full
trace in §4. Summary of the proof:

- The five cardio inputs to the engine are declared at
  `src/lib/weeklyCoach.js:645-655`: `currentCardioTarget`,
  `cardioSessionsLogged`, `cardioWeekSummary`, `cardioEnabled`,
  `cardioCompliance`.
- They are read in exactly three places, all inside the cardio block:
  `:1264-1272` (the cardio dose), `:1285-1287` (a non-cut acknowledgement
  string), `:1292-1294` (an advisory recovery string).
- `calorieAdjustment` is fully settled by `:1194` (FFM-floor hold at
  `:1177-1185`, intake-read hold at `:1191-1194`) — **before** the cardio
  block begins at `:1241`. `stepsAdjustment` is settled by `:1239`.
  Training volume, deload, rapid-loss and every ED gate live from `:1296`
  onward and contain **no cardio token** (a full grep of `weeklyCoach.js`
  returns cardio matches only at lines 12, 590, 641-655, 720, 1202, 1226,
  1242-1294, 1793, 1797-1800, 1867, 1905 — nothing between 1294 and 1793).
- `cardio_adherence` (cloud migration 050, local column `database.js:1192`)
  reaches the engine only as `cardioCompliance`
  (`src/screens/CoachOutputScreen.js:1757-1759`), and is consumed only by
  `nextCardioTarget`'s `complianceOverride`
  (`src/lib/cardio/cardioEngine.js:164-166`) — i.e. only the next cardio
  dose.
- `est_kcal` is never added to a target, by design and by three independent
  statements of that design: `src/lib/cardio/cardioMath.js:6-12`,
  `src/lib/database.js:5511-5512`, `supabase/migrate_064_cardio_log.sql`
  header. `src/lib/nutritionEngine.js` contains **zero** cardio references.
- `cardioFatigueContribution` (`cardioMath.js:86-88`) is **not** wired into
  `computeRecoveryEMAs`; `cardioRecoveryLoad` feeds only a display string at
  `src/components/ReadinessCards.js:224-231`.
- `src/lib/coachApply.js`, `coachingGoals.js`, `planEngine.js`,
  `edPatternDetector.js`, `wellbeing.js` contain **zero** cardio references
  (none of them appears in a repo-wide `-il cardio` file list).
  *(Brief-correction: the task brief anticipated "coachingGoals cardio
  mentions". There are none on current main.)*

**What genuinely changes for that identical user** (none of it a training or
nutrition prescription): (a) `adjustments.cardio` disappears from the coach
output; (b) the `cardioFlag` / `cardioAcknowledgement` advisory lines
disappear; (c) the check-in loses the "Prescribed cardio" question, so
`fastEligible` (`WeeklyCheckInScreen.js:700`) stops being gated on it, which
strictly *widens* the fast path; (d) the ReadinessCards high-load note
disappears.

**Pre-existing incoherence that removal resolves:**
`weeklyCoach.js:1249` computes `cardioConditionsMet` **without consulting
`cardioEnabled`**, so today a stalling-cut user who switched the toggle OFF
can still be prescribed cardio by the coach, and then asked about it on the
check-in. The toggle's own copy (`SettingsCoachingScreen.js:169`, "Off. No
cardio logging or library.") is therefore already partly untrue.

### 0.2 The safest retirement posture (order lines 559-571)

| Posture requirement | How it is met | Residue retained |
|---|---|---|
| NO NEW WRITES | delete `insertCardioLog`, `updateCardioLog`, `cardioExtIdExists`, `importNewCardio`, `LogCardioScreen` | — |
| NO UI | delete both screens, both toggles, the You NavRow, the check-in question, the CoachOutput card row + notes, the ReadinessCards note | — |
| NO PRODUCT READER | delete `getCardioLogRange/ForDate/Recent/ById` call sites | sync-internal readers only, if pull is retained (§5, ruling H1) |
| NO COACHING CONSUMER | delete the `weeklyCoach` cardio block + `src/lib/cardio/` | — |
| NO FALSE PROMISE | ProGate blurb, FAQ answer, `weeklyCoach.js:1226` steps note, public support/app-map pages | store listings = founder action (H4) |
| historical data deletable/exportable | UNCHANGED: local `cardio_log` table + `weekly_checkins.cardio_adherence`, cloud `cardio_log`, migrations 050/064/087, `migrate_096:151-154` DELETE, `wipeAllUserData` entry `database.js:4865` | **all of it** |

**No destructive migration is proposed, written or run.** Migrations 132-135
remain unapplied; 134 is unaffected (§5.6).

---

## 1. SCOPE SEPARATION — the three concepts (order lines 423-441)

These are **not** collapsed. Everything in the KEEP columns is class **A**
and must survive untouched; a naive `cardio` grep would destroy them, which
is precisely the Phase 2D trap.

### 1.1 REMOVE — cardio LOGGING
The `cardio_log` write/read/coach loop: `LogCardioScreen`,
`CardioHistoryScreen`, `src/lib/cardio/*`, the `weeklyCoach` cardio block,
the two toggles, the check-in question, the passive Health cardio import.

### 1.2 KEEP — steps / general activity (class A, untouched)
- `daily_steps` local table `src/lib/database.js:1220-1240`
- registry entry `src/lib/sync/registry.js:107-117`
- `src/lib/sync/tables/dailySteps.js` (whole file)
- `src/lib/activitySteps.js` (whole file **except** lines 210-213, the cardio
  import trigger)
- `weekly_checkins.steps_avg` (`supabase/migrate_058_weekly_checkins_steps_avg.sql`),
  `steps_adherence`
- the entire steps lever `src/lib/weeklyCoach.js:1196-1239`, `stepsBand`,
  `stepsEnabled`, `currentStepsTarget`, `userProfile.stepsTarget`
- **Proof of independence:** the steps prescription completes at `:1239`,
  before the cardio block opens at `:1241`, and reads no cardio variable.

### 1.3 KEEP — writing completed strength workouts to health (class A)
`src/lib/health.js` `'workouts'` write scope and the SettingsHealth "Write
workouts" row. Separate scope from `'cardio'`
(`health.js:17`, `:60-62`, `:199-204`, `:278`). Removing the `'cardio'`
scope must not touch `'weight'` or `'workouts'`.

### 1.4 KEEP — exercise-library cardio/conditioning entries (class A)
`src/lib/seedExercises.js:957-970` (`Sled Push`, `Assault Bike`,
`Battle Ropes`, `Prowler Drag`, `Tyre Flip`, `Stair Running`...) plus the
`equipment: 'cardio'` tag and `exerciseType: 'duration'|'distance'` handling
(`src/lib/__tests__/workoutHelpers.test.js:195-215`,
`supabase/migrate_091_exercise_type.sql:34`,
`src/lib/seedExercises.js:1287, 1305`). These are **strength-log** exercises
in the FREE workout logger. They are not cardio logging and must not be
touched or grep-banned.

---

## 2. PHASE 2A — USER SURFACE INVENTORY

| # | Item | file:line | Class | Verdict / removal plan |
|---|---|---|---|---|
| U1 | **"Cardio logging" toggle** (Settings > Coaching, Pro block) | `src/screens/SettingsCoachingScreen.js:161-183`; state `:33`; writer `:174-177`; header comment `:17`, `:31-32` | **G** | Remove the whole `SettingRow` block + the `cardioEnabled` state/writer. **What it actually hides today: only `YouScreen.js:494`.** It does NOT hide the routes, the SettingsHealth cardio row, the coach's cardio prescription (`weeklyCoach.js:1249` ignores it), the check-in question, or the ReadinessCards note — so `:169`'s "Off. No cardio logging or library." is already partly false. Keep `userProfile.cardioEnabled` as inert historical profile-blob storage (class E) — it rides `user_prefs`, so deleting the key is a needless write. |
| U2 | **"Log cardio" NavRow — the ONLY live entry point** | `src/screens/YouScreen.js:490-501` | **G** | Delete the block including the 2026-08-06 comment. After this, no UI reaches `LogCardio`. |
| U3 | `LogCardio` / `CardioHistory` **route registrations** | wrappers `RootNavigator.js:237-238`; ProfileStack `:399-408`; HomeStack `:460`; ProgressStack `:523-524` | **G** (ProfileStack) / **F** (Home + Progress) | Delete all four registrations + both `Gated*` consts + the header comment at `:234-235`. **The HomeStack and ProgressStack registrations are already dead independent of the boundary:** their justifying comments name entry points that were deleted on 2026-08-06 — `:458-459` "launched from the Today tab's CardioCard" (`CardioPlanCard.js` no longer exists, tombstoned at `progressAndBrief.founderRulings.guard.test.js:36`) and `:521-522` "launched from the Progress tab (AnalyticsScreen)" (`AnalyticsScreen.js:748-750` records the card's removal). |
| U4 | `LogCardioScreen.js` (351 lines) | whole file | **G** | Delete. Sole entries: U2 and `CardioHistoryScreen.js:227`. |
| U5 | `CardioHistoryScreen.js` (312 lines) | whole file; entry `LogCardioScreen.js:175` | **G** | Delete. Surfaces lost: `BackHeader "Cardio history"` `:203`, loading a11y label `:206`, error empty state `:212-216`, "No cardio yet" empty state `:220-224`, per-row delete `:250`, trend block `:85-104`, source tag `:247`. |
| U6 | **ProOnboarding cardio step** | chip `ProOnboardingScreen.js:93`; state `:437-441`; draft `:538,:564,:577`; write `:952`; section `:1939-1965`; a11y `:1961` | **G** | Delete the section, the chip, the state and the `cardioEnabled: cardioOn` write. Step 6 drops from 3 chips to 2. `ProOnboardingScreen.polish.guard.test.js:44-50` pins `accessibilityLabel="Make cardio available"` and must be deleted with it (Phase 17 class B). |
| U7 | **Pro paywall blurb** | `src/components/ProGate.js:38` — `Cardio: 'Log cardio so your sessions and the energy they burn feed into your weekly plan.'` | **G** | Delete the key. It is the `withProGuard(..., 'Cardio')` upgrade-prompt copy — a live Pro value proposition promising cardio logging. Third Cleanup Law. |
| U8 | **In-app FAQ Pro list** | `src/screens/SettingsFaqScreen.js:47` — `"...meal suggestions, calorie and macro targets, cardio logging, weekly check-ins..."` | **G** | Strike `cardio logging, `. No price/product/trial claim changes — billing-rule safe. |
| U9 | **"Read cardio sessions" toggle** (passive import) | `SettingsHealthScreen.js:14,29-30,38,46,104-131,205-226` | **F** already, **G** to remove | The whole screen is unreachable: `SettingsScreen.js:22` `healthOn = isHealthAvailable()`, gate at `:119`; `health.js:100-118` hard-returns null modules ("permanently false"). Already recorded class **F** at `SETTINGS-INVENTORY.md:259` ("Whole screen unreachable. Record for Campaign 4; do not resurrect"). Remove the cardio row + `handleToggleCardio` + `healthCardioStatus`; **the screen's own fate belongs to another Campaign 4 lane, not this one.** |
| U10 | **ReadinessCards cardio-fatigue note** | `src/components/ReadinessCards.js:27,29,120-122,148-154,224-231`; styles `:335-341,:390-391` | **G** | A live product READER of `cardio_log` on the readiness surface ("Your cardio is adding to your fatigue this week..."). Removal is display-only: no prescription reads `cardioLoad` (it is local `useState`, rendered at `:224-231` and nowhere else). |
| U11 | **Check-in "Prescribed cardio" question** | `WeeklyCheckInScreen.js:1091-1116`; review row `:1279,:1293-1297`; prefill `:271-292`; state `:331-334`; gate `:347`; re-entry `:536`; fast-path `:700`; save `:781,:881` | **G** (UI) | Delete the step, the prefill and the `hasCardioPrescription` gate. `:700`'s `(!hasCardioPrescription \|\| cardioAdherence != null)` clause simply drops — the fast check-in path widens, never narrows. The stored column is class **E** (§5.2). |
| U12 | **CoachOutput cardio row + Apply + notes** | `CoachOutputScreen.js:35,64,260-265,317-331,1262-1290,1691-1701,1757-1759,1807-1810,2131-2132,2199-2200,2397,2400,2502-2504,2736-2750`; styles `:2933-2937,:3524` | **G** | Delete the NextWeekCard cardio row, `handleApplyCardio` (which writes `userProfile.cardioPrescription` + `cardioTarget`), the week-summary read, the five engine inputs, the D16 autonomy auto-apply branch at `:2131-2132`, and the `cardioFlag`/`cardioAcknowledgement` render blocks. |
| U13 | **Live coach copy promising cardio inside the STEPS lever** | `src/lib/weeklyCoach.js:1226` — `"Steps are already near the upper limit. If more deficit is needed, light cardio is the next lever."` | **G** | Copy-only change (Third Cleanup Law). The steps branch's numeric behaviour is untouched. Needs a replacement line ruled by the lead; it is user-facing coaching voice. |
| U14 | **Public web surfaces** | `public/support/index.html:89`; `public/app-map/index.html:125,192,233,245,258`; `public/app-map/data-outputs.html:58,153,165-180,232,262,312` | **G** | Live shipped pages promising cardio logging as a Pro feature and documenting the cardio activity library. Update with the removal. |
| U15 | **Store listings / marketing fact base** | `docs/PLAY_STORE_LISTING.md:41,44,56,149,202-203,296`; `docs/APP_STORE_CONNECT_LISTING.md:326`; `marketing/FACT-BASE.md:111,200,311` | **I → founder** | The repo docs can be corrected, but the **live** Play/App Store listings are founder-published copy and a release-adjacent action. Ruling **H4**. |
| U16 | Deep links | `RootNavigator.js:759-818` | **A** | **No cardio path exists.** `volyume://` maps only `workout/start`, `diary/:date?`, `routine/:planId`, `progress`, `coach`, `checkin`. No old link can resurrect cardio UI. Nothing to do. |
| U17 | Notifications | `src/lib/notifications/**` | **A** | **Zero** cardio references repo-wide. No cardio notification configuration exists. Nothing to do. |
| U18 | Telemetry / analytics | `src/lib/engineTelemetry.js`, `src/lib/observability/**` | **A** | **Zero** cardio events exist. Phase 18's "cardio-specific telemetry should disappear from live emitters" has **nothing to remove** — record it as already clean rather than inventing an event catalogue. |
| U19 | Widgets / quick actions / Android intents | `app.json:87-100`, `modules/**` | **A** | No cardio surface. |
| U20 | Stale comment: TodayStrip | `src/components/TodayStrip.js:6` | **E** | "Cardio and meal logging live in their own flows" — becomes untrue. Comment truth fix. `TodayStrip.test.js:127-134` already guards cardio shortcuts OUT of that slot (keep, §7). |
| U21 | Stale comments: naming precedents | `AnalyticsScreen.js:867,1345`; `AthleteProfileScreen.js:65-66`; `CreditsScreen.js:162`; `FirstRunScreen.js:138`; `GoalChangeSummaryScreen.js:387`; `WeeklyStoryScreen.js:189`; `ImportScreen.js:337`; `ProgressSections.js:161`; `HomeScreen.js:1808`; `PlansScreen.js:97-99,1243` | **E** | These name `CardioHistoryScreen` / `LogCardioScreen` / `CardioTrend` as the *styling precedent* for `buildLiveStyles`. They become dangling references once the files go. Fix the comments (point at a surviving precedent); do **not** treat them as cardio surfaces. `PlansScreen.js:97-99` documents a "weekly cardio card" that no longer renders — a lying comment (Phase 15). |

---

## 3. PHASE 2B — ENGINE / COACHING DEPENDENCIES

| # | Item | file:line | Class | Verdict |
|---|---|---|---|---|
| E1 | `src/lib/cardio/cardioEngine.js` (207 lines) | whole file | **G** | Delete once U11/U12/U5 go. Live consumers today: `weeklyCoach.js:12`, `CoachOutputScreen.js:64`, `WeeklyCheckInScreen.js:47`, `CardioHistoryScreen.js`. |
| E1a | `healthCardioTarget` (`cardioEngine.js:51-62`) and `nextCardioTarget`'s health branch (`:158`) | | **F today** | **Already unreachable on current main, independent of the boundary.** The only producers of a target are `cutCardioTarget()` (`mode: 'deficit'`, `:34`) and `nextCardioTarget`, which preserves `cur.mode` (`:155`). `weeklyCoach.js:1272` only ever seeds `cutCardioTarget()`. Nothing constructs `mode: 'health'`. Evidence for Phase 4's dead-function census. |
| E2 | `weeklyCoach` cardio block | `weeklyCoach.js:12` (import), `:641-655` (params), `:720` (`cardio: null` in the insufficient-data output), `:1241-1294` (the block), `:1793` (`cardio: cardioAdjustment`), `:1797-1800` (`cardioFlag`, `cardioAcknowledgement`), `:1867`, `:1905` (`cardio: null`) | **G** | Delete the params, the block and the three output keys. `MAX_CARDIO_SESSIONS` cap (`cardioEngine.js:24`) dies with it. |
| E3 | `src/lib/cardio/cardioMath.js` (130 lines) | whole file | **G** | `metFor`/`estimateActivityKcal` used only by `LogCardioScreen.js:32,119,143`; `cardioRecoveryLoad`/`cardioLoadLevel` used only by `ReadinessCards.js:29,153`. |
| E3a | `deriveCardioMetadata` (`cardioMath.js:67-75`) | | **F today** | **Zero callers, test or otherwise.** Its docstring claims it "Drives the 'Low impact' filter and the coach's hypertrophy-block steer" — it drives nothing. Independent dead-code evidence for Phase 4. |
| E3b | `cardioFatigueContribution` (`cardioMath.js:86-88`) | | **C** | Internal-only, called solely by `cardioRecoveryLoad` (`:117`). Its docstring says "the caller feeds {value, at} into the existing EMA" — **no caller does**; it is not wired into `computeRecoveryEMAs`. Important negative proof for §0.1. |
| E4 | `src/lib/cardio/cardioActivities.js` (155 lines) | whole file | **G** | The cardio activity/MET library. Sole consumer `LogCardioScreen.js:30`. |
| E5 | `src/lib/cardio/cardioHistoryView.js` (58 lines) | whole file | **G** | Sole consumer `CardioHistoryScreen.js:36`. |
| E6 | Coach HTML report cardio row | `src/lib/coachReport.js:191-193` | **G** | Delete the row. |
| E6a | **Cycle-redaction comment + its law** | `coachReport.js:60` (comment); test `coachReport.test.js:194-201` | **A — MUST SURVIVE** | The comment explains why the menstrual-cycle redaction regex tolerates the word "cycling". The **redaction behaviour is a privacy law, not cardio code.** The test currently proves it with a cardio fixture. Phase 17 case A: **re-anchor the test on a non-cardio fixture containing "cycling" before touching anything**, then fix the comment. Never delete this coverage. |
| E7 | `getPosingConditioningMessage` conditioning branch | `src/lib/whyThisTemplates.js:416-428` ("low-impact cardio added after each session"); zero non-test callers (`whyThisTemplates.snapshot.test.js:125-127,181,223-224` only) | **I — not my lane** | Contest-prep / Peak Week copy, not cardio logging. Belongs to Phase 5 (dead copy generators) and Phase 9 (Peak Week). **Do not delete under the cardio boundary**; hand across with this note. |
| E8 | `src/lib/coachOutputZones.js:10` comment naming "calories/steps/cardio rows" | | **E** | Comment truth fix. |
| E9 | `nutritionEngine.js`, `coachApply.js`, `coachingGoals.js`, `planEngine.js`, `mesocycle.js`, `edPatternDetector.js`, `wellbeing.js`, `recoveryEMA` | — | **A** | **Zero cardio references.** No calorie floor, FFM floor, rapid-loss gate, ED detector, activity multiplier, TDEE path or training-volume path consults cardio. Nothing to change; this is the §0.1 guarantee. |
| E10 | Local `coach_outputs.cardio_prescription` column | `database.js:547`; never in the INSERT column list (`:6737-6740`) | **E** | Dead local column, **never written**. Historical storage, not a runtime control. Leave it — a SQLite column drop is a table rebuild for zero gain. Document, do not remove. |
| E11 | `userProfile.cardioPrescription` / `cardioTarget` / `cardioFavourites` | writers `CoachOutputScreen.js:1279-1280`, `LogCardioScreen.js:129`; readers `WeeklyCheckInScreen.js:274-275,347`, `CardioHistoryScreen.js:123`, `weeklyCoach` via `CoachOutputScreen.js:1807` | **G** (writers/readers) / **E** (persisted keys) | Delete every read and write. Leave any values already sitting in the profile blob; they become inert. |

---

## 4. PHASE 2B — THE PRESCRIPTION-INVARIANCE TRACE (full working)

Requested explicitly by the brief. Read `weeklyCoach.js` top-to-bottom:

```
:645-655   cardio inputs enter runWeeklyCoach (all defaulted so every prior
           caller is a no-op)
...
:1160-1185 FFM-floor gate  -> may null calorieAdjustment      [no cardio]
:1191-1194 intake-read hold -> may null calorieAdjustment      [no cardio]
:1196-1239 STEPS PRESCRIPTION -> stepsAdjustment settled       [no cardio,
           except the :1226 note STRING which mentions cardio]
:1241-1279 CARDIO PRESCRIPTION -> cardioAdjustment             [cardio in]
:1281-1288 non-cut acknowledgement string                       [cardio in]
:1290-1294 cardioFlag advisory string                           [cardio in]
:1296-1306 rapid-weight-loss safety flag                        [no cardio]
:1308+     deload / recovery-week suggestion                    [no cardio]
...        training volume, macros, held decisions              [no cardio]
:1793-1800 output: adjustments.cardio, cardioFlag, cardioAcknowledgement
```

Nothing downstream of `:1294` reads a cardio variable, and nothing upstream of
`:1241` does either — the calorie and steps decisions are already final when
the cardio block runs. `cardioAdjustment` is a leaf: it is written into the
output object and consumed only by `CoachOutputScreen`'s cardio row
(`:317-331`) and `handleApplyCardio` (`:1262-1290`), which writes only
`cardioPrescription` / `cardioTarget` back to the profile.
`src/lib/coachApply.js` — the module that applies calorie, training, deload
and diet-break adjustments — has **no cardio reference at all**.

**Conclusion (to be pinned behaviourally, §7.3):** for identical inputs, the
post-removal engine returns identical `adjustments.calories`,
`adjustments.training`, `adjustments.steps`, macro targets, deload
suggestion, rapid-loss flag and every ED gate. Only cardio-domain keys
vanish.

---

## 5. PHASE 2C — SYNC AND DATA RETENTION

### 5.1 Local table `cardio_log` — **class H, KEEP**
`database.js:1252-1275` (original block), `:1316-1339` (the corrective
re-create after the mid-array insertion incident, documented `:1303-1314`),
`:1453-1454` (`ext_id` column + partial unique index). Real user rows exist
on real devices. Dropping it is data-destructive → **founder ruling
required, not proposed.** Keep the CREATE blocks exactly where they are;
`SCHEMA_MIGRATIONS` is append-only and re-ordering it is the exact incident
`migrations.cardioLog.test.js` exists to prevent.

### 5.2 Local column `weekly_checkins.cardio_adherence` — **class E, KEEP**
`database.js:1192` (migration), mapper `:5974`, insert list `:7237,:7244`.
Stop writing it (delete `cardioAdherence` from the check-in save payload at
`WeeklyCheckInScreen.js:781`); leave the column. SQLite column drops are
table rebuilds; the cloud column already exists and is nullable.

### 5.3 `src/lib/database/activity.js` — accessor-by-accessor
| Accessor | line | Class | Verdict |
|---|---|---|---|
| `insertCardioLog` | `:59-100` | **G** | Remove — writer. |
| `updateCardioLog` | `:112-136` | **G** | Remove — writer. |
| `cardioExtIdExists` | `:102-110` | **G** | Remove — import-only writer helper. |
| `getCardioLogForDate` | `:160-169` | **F** | **Zero callers already** (grep of all non-test src). Dead today. |
| `getCardioLogRange` | `:171-181` | **G** | Remove with U10/U11/U12/U5. |
| `getCardioLogById` | `:150-158` | **G** | Internal to `updateCardioLog`; dies with it. |
| `getRecentCardioLog` | `:183-191` | **G** | Remove with U4/U5. |
| `deleteCardioLog` | `:138-148` | **H/I** | **Do not delete without a ruling.** Today it is the user's only per-row erasure path (`CardioHistoryScreen.js:190`). With the screen gone, per-row deletion has no surface — see ruling **H3**. |
| `getCardioLogForPush` | `:193-202` | **G** or **E** | Dies iff push is removed (ruling H1). |
| `getCardioLogUpdatedAt` | `:204-212` | **E** | Retain iff pull is retained. |
| `insertCardioLogFromCloud` | `:214-245` | **E** | Retain iff pull is retained. |

### 5.4 Sync registry + handlers — **the SECOND CLEANUP LAW fork**
`registry.js:118-128` (`cardio_log`, `pk (user_id,id)`, `last_write_wins`,
`softDelete: true`, `direction: 'bidirectional'`);
`src/lib/sync/tables/cardioLog.js` (153 lines);
`transport.js:43,89,109,137`.

**Recommended posture — class E (LEGACY-LOAD-BEARING), the order's own
fallback at lines 575-580:**
- **Push: remove.** Nothing new is ever written, so the push handler can only
  re-upload rows the cloud already has. Removing it strands nothing.
- **Pull: RETAIN**, and flip the registry entry to `direction: 'pull_only'`.

**Why pull must stay.** Cloud `cardio_log` was created by migration 064 and
**applied 2026-06-06** (`supabase/README.md:89`), so live rows exist in
Dublin. `cardio_log` is in the sign-out/account-switch wipe set
(`database.js:4865`), so every sign-out clears it locally. And `cardio_log`
is **NOT** in `BACKUP_TABLES` (`database.js:5203-5247`) and the CSV export is
workouts-only (`SettingsDataScreen.js:134`, `buildWorkoutCSV`). Drop pull and
a user who signs out has **no path whatsoever** back to health data that
still exists on Volyume's servers — exactly the "strand historical data in a
way that violates export/delete expectations" case the order names.

**Alternative (deregister entirely) = class H**, needs a founder ruling,
because it silently strands cloud-resident special-category health data with
no export.

### 5.5 Passive Health cardio import — **class F already**
`health.js:731-999` (`CARDIO_IMPORT_KEY_PFX`, `getLastCardioImportMs`,
`setLastCardioImportMs`, `readCardioSessionsSince`, `planCardioImport`,
`cardioSessionToLog`, `importNewCardio`), the `'cardio'` scope at `:17,60-62,
199-204,278,952`, and the foreground trigger `activitySteps.js:210-213`.
Already inert: `health.js:100-118` returns null native modules, so
`isHealthAvailable()` is permanently false and `importNewCardio` cannot run.
Removing it is **class G** and touches no steps code — `activitySteps.js`
loses only lines 210-213.

### 5.6 Cloud migrations — **class E/A, never edited**
| Migration | Status | Class | Note |
|---|---|---|---|
| `migrate_050_weekly_checkins_cardio_adherence.sql` | applied 2026-06-01 (`docs/CURRENT_STATUS.md`) | **E** | Historical. Never edit, never DROP. |
| `migrate_064_cardio_log.sql` | **applied 2026-06-06** (`supabase/README.md:89`) | **E** | Historical. Its header `:21-25` is what put the `cardio_log` DELETE into `delete_user_data`. |
| `migrate_087_cardio_log_ext_id.sql` | applied | **E** | Historical. |
| `migrate_096_delete_user_data_completeness2.sql:151-154` — `DELETE FROM cardio_log WHERE user_id = uid` | applied | **A — MUST SURVIVE** | The Article 17 erasure obligation. Header `:153` calls cardio history "special-category health data". Never remove. |
| `migrate_134_stale_write_triggers.sql:15` | **UNAPPLIED** | **A** | Names `cardio_log` only in a prose list of the eight tables that *already* carry a touch trigger. 134 adds triggers to nine *other* tables. **Cardio retirement changes nothing about 134.** 132-135 stay unapplied. |

**No new migration is required for cardio retirement, and none is proposed.**
A destructive `DROP TABLE cardio_log` would be **FOUNDER RULING REQUIRED**
with the exact data consequence: permanent loss of every user's logged cardio
session history (activity, duration, intensity, MET, estimated kcal,
recovery impact, per day, since 2026-06-06).

### 5.7 Erasure / portability coverage (Phase 20 pre-check)
| Path | Covers cardio? | Evidence |
|---|---|---|
| Sign-out / account-switch local wipe | **YES** | `database.js:4865` `'cardio_log'` in `LOCAL_USER_TABLES`; pinned by `wipeAllUserData.test.js:89` |
| Cloud account deletion | **YES** | `migrate_096:151-154` + FK cascade (`migrate_096:14`) |
| Local JSON backup / restore | **NO** | `cardio_log` absent from `BACKUP_TABLES` (`database.js:5203-5247`) |
| CSV export | **NO** | workouts only (`SettingsDataScreen.js:134,317`) |
| Per-row delete | **only via `CardioHistoryScreen.js:190`** | dies with U5 |

**This is a pre-existing Article 20 portability gap**, not one Campaign 4
creates. But retirement is the moment it becomes permanent, so it must be
ruled on rather than inherited silently (rulings **H2**, **H3**).

---

## 6. FULL CLASS REGISTER — everything else that matched `cardio`

Comment-only precedent references, all **class E** (fix the wording where it
lies; they are not cardio surfaces):
`src/lib/sync/tables/_missingTable.js:12`, `_paginate.js:5`,
`dailySteps.js:4-5,76`, `partners.js:17`, `planFolders.js:9,55`,
`perDayTargetOffsets.js:19`, `src/lib/food/db.js:1627`,
`src/lib/database.js:2207,3425,5475-5476`,
`src/lib/sync/registry.js:108`.
These document `cardio_log` as the *architectural precedent* for
soft-delete/LWW/missing-table handling. The precedent remains true because
the table is retained. Leave them; they are load-bearing documentation of a
real contract.

---

## 7. PHASE 2D — THE BOUNDARY GUARD SPECIFICATION

### 7.1 What it MUST pin
1. **Routes gone.** `RootNavigator.js` contains no `name="LogCardio"`, no
   `name="CardioHistory"`, no `GatedLogCardio`, no `GatedCardioHistory`.
2. **Tombstones.** `fs.existsSync('src/screens/LogCardioScreen.js') === false`
   and the same for `CardioHistoryScreen.js` — mirroring the existing
   `CardioPlanCard` tombstone idiom at
   `progressAndBrief.founderRulings.guard.test.js:36`.
3. **No CTA.** No file under `src/screens/` or `src/components/` matches
   `navigate\(['"]LogCardio` or `navigate\(['"]CardioHistory`.
4. **No setting.** Comment-stripped `SettingsCoachingScreen.js` and
   `ProOnboardingScreen.js` contain no `cardioEnabled` state or writer and no
   `accessibilityLabel="Make cardio available"`.
5. **No Pro promise.** Comment-stripped `src/components/ProGate.js` has no
   `Cardio:` blurb key; comment-stripped `SettingsFaqScreen.js`,
   `ProUpgradeScreen.js`, `SubscriptionScreen.js`,
   `SubscriptionPolicyScreen.js`, `paywallExcerpts.js` match no `/cardio/i`.
6. **No coaching dependency — pinned BEHAVIOURALLY, not textually.** Run the
   **real** `runWeeklyCoach` on a stalled-cut fixture with steps at the band
   ceiling (the exact condition `weeklyCoach.js:1249` used to fire on) and
   assert `output.adjustments.cardio === undefined`, `output.cardioFlag ===
   undefined`, `output.cardioAcknowledgement === undefined` — **and** that
   `output.adjustments.calories` and `output.adjustments.steps` are
   unchanged against a recorded baseline. This is the pin that actually
   discharges §0.1; a source grep would not.
7. **Anti-overreach — the survival half (order lines 615-623, and Review A
   question 9).** Positively assert that steps/activity and health-workout
   integration survived: `daily_steps` is still in `SYNC_REGISTRY`;
   `src/lib/activitySteps.js` and `src/lib/sync/tables/dailySteps.js` still
   exist; the same fixture still returns a `steps` adjustment;
   `seedExercises.js` still contains `'Assault Bike'`; `health.js` still
   carries the `'workouts'` write scope.
8. **Compatibility coherence.** `LOCAL_USER_TABLES` still contains
   `'cardio_log'`; `migrate_096` still contains
   `DELETE FROM cardio_log`; the `CREATE TABLE IF NOT EXISTS cardio_log`
   block is still present in `database.js`.

### 7.2 What it MUST NOT do — the naive-grep traps
**No repo-wide `/cardio/i` ban.** Every assertion must be scoped to a NAMED
file and a NAMED symbol, with comments stripped first (reuse the
`stripComments(read(...))` idiom already in
`campaign3.discoverability.test.js:100-104`). The guard must **never** flag:

| Must not forbid | Why | Evidence |
|---|---|---|
| `docs/**` | decision docs must be able to say cardio is out of scope; `campaign1.integrity.test.js:348` literally *requires* the phrase in the register | order line 617 |
| `supabase/migrate_*.sql` | historical migrations 050/064/087/096/134 are immutable | order line 619 |
| `src/lib/activitySteps.js`, `dailySteps.js`, `daily_steps`, `steps_avg`, `stepsAdherence` | legitimate steps/activity | order line 621 |
| `src/lib/seedExercises.js`, `equipment: 'cardio'`, `exerciseType: 'duration'\|'distance'` | strength exercise library, FREE tier | §1.4 |
| `health.js` `'weight'` / `'workouts'` scopes | separate integrations | §1.3 |
| retained `cardio_log` schema + wipe entries in `database.js`, `weekly_checkins.cardio_adherence`, `coach_outputs.cardio_prescription` | documented compatibility | order line 623, §5.1-5.2 |
| `src/lib/__tests__/migrations.cardioLog.test.js` | pins the append-only SCHEMA_MIGRATIONS law using cardio_log as fixture; the table is retained | §7.4 |
| `wipeAllUserData.test.js:89` | pins the erasure obligation | §5.7 |
| precedent comments listed in §6 | load-bearing architecture documentation | §6 |

The cleanest mechanism: an explicit `RETAINED_CARDIO_COMPATIBILITY`
allowlist constant inside the guard, each entry carrying its file, symbol and
one-line reason — so a future engineer adding any new cardio token must
consciously edit the allowlist rather than silently slip past a loose regex.

### 7.3 Tests to DELETE with the implementation (Phase 17 case B)
`src/lib/cardio/__tests__/cardioEngine.test.js`,
`cardioHistoryView.test.js`, `cardioLibrary.test.js`;
`src/screens/__tests__/CardioHistoryScreen.test.js`,
`LogCardioScreen.durationStepper.guard.test.js`;
`src/lib/__tests__/cardioImport.test.js`;
`src/screens/__tests__/ProOnboardingScreen.polish.guard.test.js:44-50`
(that assertion only).

### 7.4 Tests whose LAW must move before anything is deleted (Phase 17 case A — do not lose coverage)
| Test | Law it protects | Action |
|---|---|---|
| `coachReport.test.js:194-201` | menstrual-cycle redaction must not eat the word "cycling" — **a privacy law** | Re-anchor on a non-cardio fixture containing "cycling" **first**, then remove the cardio fixture. |
| `checkinIntegrity.a7.guard.test.js:113-115` | a pre-filled check-in answer must name its provenance | Keep the law on the surviving calories/steps/training prefills. |
| `phaseVocab.en4.replay.test.js:163-166` | the dead `agg_cut` vocabulary can never resurrect an interval boost (EN-4, founder 2026-07-02) | Re-anchor onto the surviving EN-4 assertions; do not silently drop. |
| `progressAndBrief.founderRulings.guard.test.js:29-42` | ruling 2: cardio is not a Progress surface | **Will FAIL on removal** — `:40-42` currently asserts YouScreen *contains* `navigate('LogCardio')`. Invert it into the boundary guard; keep the Progress half `:30-36` verbatim. |
| `TodayStrip.test.js:127-134` | no cardio/meal/step shortcut returns to the premium Today slot | Already a never-reintroduce guard. Keep as-is; fold into the boundary suite. |
| `campaign1.integrity.test.js:340-348` | D92-1 is recorded in the register | Stays green and stays true. Keep. |
| `campaign3.discoverability.test.js:99-104` | no cardio entry point in You/Diary/BodyMetrics/Plans | Strengthens after removal. Keep. |
| `migrations.cardioLog.test.js` | SCHEMA_MIGRATIONS is append-only (the "no such table: cardio_log" incident) | **KEEP — class E.** Not a cardio-feature test; the table it pins is retained. |
| `wipeAllUserData.test.js:89` | `cardio_log` is wiped on every user boundary | **KEEP — class A.** |
| `sync.cardioLog.test.js` | push + pull round-trip | Keep the pull half, delete the push half (per ruling H1). |
| `activityRepository.test.js` | accessor coverage | Trim to the retained accessors. |

### 7.5 Mechanical test updates
`proScreenGating.guard.test.js:13,106,125-131`;
`lapsedReadOnly.guard.test.js:10,36-43`;
`screen-mount.test.js:616,631`;
`e8FlashList.guard.test.js:5,50-51`;
`chromePolish.test.js:75-78`;
`coachOutputApplyMorph.guard.test.js:33`;
`cp10Stage3CoachLiveTheme.test.js:50`;
`coachRegister.test.js:40,156,273` and `coachResponse.test.js:26,288,303,332,473,613` (`cardio: null` fixtures);
`coachReport.test.js:64,99,216,253`;
`sync.registry.test.js:27`;
`sync.regressionMatrix.test.js:179,222-224`;
`sync.runner.integration.test.js:50-52,162`;
`weeklyCoach.test.js` (40 cardio references).

---

## 8. FOUNDER RULINGS REQUIRED (class H — surfaced, never pre-decided)

- **H1 — `cardio_log` sync retirement.** (a) `direction: 'pull_only'`, push
  handler removed, pull retained as LEGACY-LOAD-BEARING *(this audit's
  recommendation, per order lines 575-580)*; or (b) deregister `cardio_log`
  from sync entirely, accepting that cloud-resident history becomes
  unreachable from any device. Consequence of (b): a sign-out permanently
  separates the user from special-category health data that still exists in
  Dublin.
- **H2 — portability.** Add `cardio_log` to `BACKUP_TABLES`
  (`database.js:5203`) to close the Article 20 gap, or accept
  deletion-only coverage. Caveat the founder must weigh: `BACKUP_TABLES`
  also drives `restoreAllTables` (`database.js:5272-5300`), so adding it
  creates a restore WRITE path — arguably a compatibility restore of the
  user's own rows rather than a new product write, but it is a genuine
  tension with "NO NEW WRITES" and is the founder's call.
- **H3 — per-row erasure surface.** With `CardioHistoryScreen` gone, no UI
  can delete an individual historical cardio session; only account delete
  and sign-out wipe. Acceptable, or does retirement need a minimal
  read/delete surface? (Note: a read/delete surface is arguably still "no
  product reader" — but it is a UI, and the boundary says no UI. Founder's
  call, not this agent's.)
- **H4 — live store listings + public site.** `docs/PLAY_STORE_LISTING.md`
  (7 cardio claims incl. a whole "Cardio (Pro)" section at `:202-203`),
  `docs/APP_STORE_CONNECT_LISTING.md:326`, `public/support/index.html:89`,
  `public/app-map/*`. Repo copy can be corrected in-campaign; the **live**
  listings are founder-published and release-adjacent.
- **H5 — inert storage confirmation.** Recommend KEEPING, non-destructively:
  local `cardio_log` + indices, `weekly_checkins.cardio_adherence`,
  `coach_outputs.cardio_prescription` (already never written),
  `userProfile.cardioEnabled/cardioTarget/cardioPrescription/cardioFavourites`
  values already on device. Confirm.
- **H6 — replacement copy for `weeklyCoach.js:1226`.** The steps-at-ceiling
  note currently promises cardio as "the next lever". It is live coaching
  voice on a live prescription; its replacement wording is a product-voice
  decision.

---

## 9. CLASS COUNTS

| Class | Count | Items |
|---|---|---|
| **A** LIVE — KEEP | 11 | steps/activity stack (§1.2), health workout-write scope (§1.3), exercise-library cardio entries (§1.4), deep links U16, notifications U17, telemetry U18, widgets U19, `migrate_096` DELETE, `wipeAllUserData` entry, `coachReport` cycle-redaction law E6a, engine modules with zero cardio E9 |
| **B** LIVE-CONDITIONAL — KEEP | 0 | — |
| **C** INTERNAL AND REQUIRED — KEEP | 1 | `cardioFatigueContribution` E3b (dies with its module, but is not independently dead) |
| **D** INTENTIONAL ROLLBACK SEAM — KEEP | 0 | none found; no cardio rollback switch exists |
| **E** LEGACY BUT LOAD-BEARING — KEEP, DOCUMENT | 12 | local `cardio_log` accessors for pull (`insertCardioLogFromCloud`, `getCardioLogUpdatedAt`), `weekly_checkins.cardio_adherence` §5.2, `coach_outputs.cardio_prescription` E10, `userProfile.cardio*` persisted keys E11, migrations 050/064/087 §5.6, `migrations.cardioLog.test.js`, precedent comments §6, stale comments U20/U21, `coachOutputZones.js:10` E8, `coachReport.js:60` comment, pull handler under ruling H1 |
| **F** CONFIRMED DEAD — REMOVE | 6 | HomeStack `LogCardio` registration (U3), ProgressStack registrations (U3), SettingsHealth screen reachability (U9), `healthCardioTarget`+health branch (E1a), `deriveCardioMetadata` (E3a), `getCardioLogForDate` (§5.3) |
| **G** PRODUCT-BOUNDARY REMNANT — REMOVE WHERE NON-DESTRUCTIVE | 24 | U1, U2, U3(ProfileStack), U4, U5, U6, U7, U8, U9(row), U10, U11, U12, U13, U14, E1, E2, E3, E4, E5, E6, E11(readers/writers), §5.3 writers+readers, §5.5 passive import, push handler |
| **H** DEAD BUT DATA-DESTRUCTIVE — STOP / RULING | 6 | H1 sync retirement, H2 portability, H3 per-row erasure (`deleteCardioLog`), H4 store listings, H5 storage retention, local+cloud `cardio_log` table drop (never proposed) |
| **I** UNCERTAIN — DO NOT DELETE | 2 | `getPosingConditioningMessage` cardio branch E7 (Peak-Week/dead-copy lane, not cardio logging), `docs/PLAY_STORE_LISTING.md` + `APP_STORE_CONNECT_LISTING.md` + `marketing/FACT-BASE.md` U15 (founder-published) |

---

## 10. RESIDUAL RISK REGISTER FOR THE LEAD

1. **This is a live-feature removal, not a remnant sweep.** Real Pro users
   have logged cardio since 2026-06-06 and will lose a working screen. The
   device checklist must cover: You tab has no "Log cardio" row; Settings >
   Coaching has no cardio toggle; a stalling-cut coach run produces no cardio
   card; the weekly check-in has no cardio step; ProOnboarding step 6 shows 2
   chips; existing cardio history is still on the device (table intact) and
   still deleted by sign-out.
2. **`progressAndBrief.founderRulings.guard.test.js:40-42` will fail** the
   moment U2 lands. Plan the inversion in the same commit or the tree is red.
3. **Do not remove `deleteCardioLog` before H3 is ruled** — it is an erasure
   affordance, and Section 2's GDPR bounds bind every delegated ruling.
4. **Do not touch `migrate_096:151-154`** under any circumstance.
5. **Steps overreach is the single likeliest mistake.** `activitySteps.js`
   loses exactly lines 210-213 and nothing else.
