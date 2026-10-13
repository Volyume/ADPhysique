# VOLYUME - MASTER PRODUCT MAP (start here)

Version audited: 2.14.0, 2026-10-13, repository `main` plus this session's branch. Built by tracing code, not by summarising old docs. It supersedes `_FULL-APP-PRODUCT-MAP.md`, `APPMAP.md`, `ARCHITECTURE.md`, `VOLYUME_DEEPMAP.md` and `CURRENT-STATE-DOSSIER.md` (all describe v1.2.0).

## How to use this folder (for an AI agent)

| File | Read it for |
|---|---|
| **00 (this file)** | The whole product on one page: identity, structure, how areas connect, status register, ranked decision-relevant findings |
| 01-shell-onboarding-settings | Boot, navigation gate order, deep links, all 109 `src/screens` entries with reachability, store slices, onboarding wizard, auth, Home and Coach tabs, Settings, widgets, feature flags, dependencies |
| 02-training-coaching | Three planner generations, the structure engine, mesocycle/blocks, workout logger, exercise library, weekly coach, progress/analytics, recovery, ED-safety as it touches training |
| 03-nutrition-body-media | Food diary and engine, body metrics and weight trend, goals and goal lock, progress photos and scan, share cards, notifications, Beat UK placement, local SQLite schema (~62 tables) |
| 04-community-backend-release | Community (25 screens), sync (two tracks), 189 migrations by domain, 8 edge functions, dormant payments, observability, build/release/test posture |
| 05-strategy-state-and-laws | Version trail, founder laws, held items, open work, which docs to trust |
| _BRIEF | The rules every survey agent followed |

Evidence discipline: each survey cites file paths and labels OBSERVED / INFERRED / NOT TRACED. Statuses mean "registered and referenced in code", not device-confirmed. Surveys did not run the app, query the live database or run lint/tests. The lead re-read the code for the claims marked VERIFIED below.

---

## 1. The product in one page

Volyume is a fully free, no-ads, offline-first physique-coaching app (React Native 0.81 / Expo 54 managed, JavaScript, SQLCipher SQLite as device truth, Supabase EU-Dublin as sync and Community backend). It combines: an adaptive training planner and workout logger; a deterministic weekly coach; a full food diary with barcode/label scanning and a macro engine; body-weight trend, progress photos and a photo "scan"; shareable cards; a Community network (profiles, feed, follow, DMs, groups, challenges); and a layered eating-disorder (ED) safety system. It is built for a founder-led, UK-first audience (British English, kg and stone, Beat UK) with a men's-physique and bodybuilding bias in its plan logic.

Hard identity facts: free forever (D137); no AI in the coaching engine; Article 9 health-data consent gate; no anonymous mode; Apple + Google + email sign-in; Android is the live store product, iOS is TestFlight.

## 2. Structure at a glance

Six tabs (internal id / title): HomeTab Today, PlansTab Train, DiaryTab Nutrition, ProgressTab Progress, CommunityTab Community, ProfileTab Coach (also hosts all Settings). Gate order actually run by `RootNavigator` (VERIFIED in survey 01): signed out -> Welcome; signed in but consent false/unresolved-new -> Article 9 consent; not first-run-complete -> 8-step wizard; else the tabs behind an opt-in biometric lock. Tier is no longer a gate.

```
            +-----------------------------------------------------------+
            |  UI: 103 registered screens, 112 components (6 tab stacks)|
            +----------------------+------------------------------------+
                                   |
        +--------------------------v---------------------------+
        |  Domain logic src/lib (243 entries)                   |
        |  Deterministic engines (pure):                        |
        |   planEngine / structure engine / plan (D219)         |
        |   nutritionEngine / weeklyCoach / coachApply          |
        |   mesocycle / recovery / edPatternDetector / wellbeing|
        +------+---------------------------+--------------------+
               |                           |
   +-----------v-----------+     +---------v------------------+
   | SQLite (SQLCipher)    |     | Zustand store (session,    |
   | database.js ~62 tables|     | consent, prefs, active     |
   | food/db.js            |     | workout snapshot)          |
   +-----------+-----------+     +-----------------------------+
               |
   +-----------v---------------------------------------------+
   | Sync: registry engine (22 migrated tables) + legacy      |
   | sync.js (3,308 lines) + syncQueue (7 op types)           |
   +-----------+---------------------------------------------+
               |
   +-----------v---------------------------------------------+
   | Supabase EU: 189 migrations, RLS, RPCs, 8 edge functions |
   | (send-push, community-notify, community-public,          |
   |  delete-account, partner-cheer*, 3 billing*)  *dormant   |
   +---------------------------------------------------------+
   Native: modules/live-activity, rest-timer-live, progress-scan-image;
   Android widgets via react-native-android-widget.
```

## 3. Feature areas and how they tie together

| Area | What it is for the user | Core code (see survey) | Feeds / is fed by |
|---|---|---|---|
| **Onboarding** (01) | Account, consent, 8-step profile wizard (sex/age/height/weight block progression), builds first plan and nutrition targets | ProOnboardingScreen (3,945 lines), Article9ConsentScreen | Writes profile -> nutritionEngine targets + planAutoGen plan + Community join + notification setup |
| **Today** (01) | One ranked "today line", next session, weigh-in, evidence panel, friends row, plateau banner | HomeScreen (3,817), `lib/home/*` | Reads plan position, coach decision, recovery, ED/calm state, Community |
| **Train** (02) | Programmes, library, builder, block history | `lib/structure/*` (live planner), planAutoGen, planEngine (style pools only) | Plan -> Today and logger; coach edits plan weekly |
| **Workout logger** (02) | Live set logging, rest timer, PR detection, live activity, summary and share | ActiveWorkoutScreen (8,014 lines) | Writes sets -> analytics, coach, widgets, Community auto-post |
| **Weekly coach** (02, 03) | Weekly check-in -> training and nutrition decisions the user confirms | weeklyCoach, coachApply, CoachOutputScreen | Reads sets, weights, food, recovery, wellbeing; writes plan changes and calorie targets |
| **Nutrition** (03) | Diary, barcode/label scan, recipes, meal plan, targets, calorie slider, higher-calorie day | nutritionEngine, `lib/food/*` | Targets <- profile + goal + weight trend; adherence -> coach |
| **Progress** (02, 03) | Analytics, lift progress, volume heatmap, consistency, recovery, body metrics, photos and scan, year-in-lifts | `lib/progress`, `lib/recovery`, useWeightTrend | Reads sets/weights; feeds coach and share cards |
| **Safety layer** (02, 03) | ED pattern flag, calm mode, wellbeing check, goal lock, floors, Beat UK | edPatternDetector, wellbeing, nutritionEngine floors | Cuts across coach, notifications, sharing, photos, Community |
| **Community** (04) | Profile, feed, follow, DMs, groups/chat, challenges, presence, gyms, public web pages | `lib/community/*`, 25 screens, edge functions | Reads workouts for auto-posts; gated by ED/calm and age |
| **Sharing** (03) | Image cards for workouts, weekly recap, progress | `lib/shareCard`, ShareCardScreen | Reads session/PR data; photo cards withheld under calm/ED |
| **Notifications** (03, 04) | Local reminders + server pushes (Community) | `lib/notifications`, send-push, community-notify | ED flag should suppress weight/food ones |
| **Sync/backend** (04) | Push on save, queued retry, pull at restore, LWW | `lib/sync`, `sync.js`, `supabase/` | Everything above persists through it |
| **Dormant billing** (04) | Subscription stack on disk, inert | `lib/payments/*`, 4 screens, 3 edge functions | Re-arming = flag + re-register + test plan |

Key cross-links that matter for any change: (1) profile -> targets and plan; (2) weigh-ins -> weight trend -> coach -> calorie/volume decisions -> targets and plan; (3) logged sets -> PRs, recovery, coach, widgets, Community posts, share cards; (4) the ED flag/calm mode -> coach holds, photo withholding, Community withholding, notifications, recap card; (5) every table -> sync registry or legacy sync; (6) flags in `featureFlags.js` gate each cloud column push to match applied migrations.

## 4. Release switches and flags (VERIFIED where marked; full table in 01 and 02)

| Flag | Value | File | Meaning |
|---|---|---|---|
| FULL_ACCESS_FOR_ALL | true | lib/proGate.js:43 | Free product; forces tier 'pro' internally |
| STRUCTURE_ENGINE | true (VERIFIED) | lib/structure/release.js:24 | New plan builder live since 2026-10-12; header still says OFF |
| PLANNER_V2 | true | lib/plan/release.js:22 | D219 planner; build path unreachable behind the structure engine |
| ONBOARDING_QUIZ_FIRST | false (VERIFIED) | lib/onboarding/quizFlow.js:24 | Quiz and PlanPreview screens unreachable |
| PLAN_FACTS_PUSH, ENTRY_TYPED_PUSH, CIRCUIT_SYNC_COLUMNS_ENABLED | true | lib/sync/featureFlags.js | Cloud columns pushed (migrations 188, 189 applied per README) |
| PROTECTED_PROGRAMME_IDS | founder's plan id (VERIFIED) | lib/structure/release.js | No automatic path may delete or rebuild it; shipped in the bundle |

## 5. Status register

LIVE and reachable: all tab-root screens, the logger, coach, diary and food scanning, body metrics, photos/scan, analytics set, Community (25 screens), all Settings except the two below, Android widgets.
CONDITIONAL: Article 9 consent (new/unresolved users), wizard (until first run complete), Community features (need a profile; gated by ED/calm and age), DebugLog (7-tap gesture), capability consent lane (HowYouTrain).
ORPHANED (registered, nothing navigates there): `CoachReviewScreen` (720 lines; VERIFIED no navigate call) and `MealNamesScreen` (removed by founder order).
UNREACHABLE by flag: `QuizScreen`, `PlanPreviewScreen` (quiz flag off); `SettingsHealthScreen` (`isHealthAvailable()` hard-wired false).
DORMANT billing: ProUpgrade, Subscription, SubscriptionPolicy, CascadeGate, `payments/*`, 3 billing edge functions.
RETIRED but residual: Partners (cloud `partner_*` tables, `partner-cheer` function, local tables, `/partner/<CODE>` rewrite to a Hub card, `public/partner`); cardio (`cardio_log` table + sync handler, no writer, no screen); per-day offsets (still syncing).
BACKGROUND: widgets snapshot writer, daily background-fetch sync, periodic 15-minute sync, plan rebuild at next session.

## 6. Decision-relevant findings, ranked

Severity is the lead's judgement from the evidence; items 1 to 4 are ED-safety or Article 9 adjacent, so under CLAUDE.md section 2 they are "stop and ask the founder" matters, not drive-by fixes. Nothing here was changed.

**A. Safety and privacy**
1. **Beat UK helpline text is nearly absent from the app (VERIFIED).** `WELLBEING_HELPLINE` renders only in the Body metrics calm interstitial. A Beat link appears on the Coach ED lockout card (per survey 02/03) and Community physique pages. `WellbeingCheckScreen` shows no Beat reference (a YouScreen comment says it does). The nutrition-target floor banner and the energy-availability caution carry no signpost. CLAUDE.md says signposting is woven through; the real coverage is thin.
2. **Calm mode and the ED flag are not honoured by the food screens (VERIFIED for Food Insights and Food Search: zero references).** The Diary has some checks; Food Search and Insights show calories and adherence regardless. Body metrics, photos, scan scores, energy slider, weekly recap and before/after cards do withhold. Higher-calorie day is gated on an open ED flag and a floored target, not calm mode, and is local-only (no sync found).
3. **An open ED flag cancels only weigh-in reminders (survey inference, not tested).** Meal-log, planned-meal, missed-check-in and activation notifications are OS repeats or depend on the foreground handler, so they could fire after a flag is raised while the app is backgrounded.
4. **The weekly recap share card prints "weight lost this week X kg" on cut weeks (VERIFIED in `greatWeek.js`), which conflicts with the CLAUDE.md rule that bodyweight appears on only one approved card.** It is suppressed under `suppress`, but the rule itself is the question.
5. **ED-flag cloud push is only half-armed.** Server-side withhold (migrate_180) and push RPC (migrate_182) are applied, but no shipped build pushes a flag, and the sync registry labels `ed_pattern_flags` pull-only. So the server's ED arm has nothing to act on yet.
6. **Community sharing defaults to public-audience for adults** (migrations 184 to 187 plus ambient auto-post): every finished workout becomes an "everyone" post unless switched off. A founder decision (D194), but worth knowing as a privacy posture; minors start off or followers-only.

**B. Product coherence**
7. **Three planner generations coexist.** The structure engine builds all new plans; the D219 planner's build path is unreachable but its modules still serve the logger and check-ins; legacy `planEngine` still builds kettlebell/circuit style-pool plans. One "Apply training change" button writes through four different paths (D219 placement, structure check-in, legacy volume apply, authored coach). Highest maintenance and regression surface in the app.
8. **Dead or misnamed surfaces:** CoachReviewScreen (dead), MesocycleBuilderScreen (shows history and advice only, no builder), MealNames, SettingsHealth, Quiz/PlanPreview, `blockReview.reviewSections` (exported, unused), Login (a thin duplicate of Welcome).
9. **Giant files** concentrate risk: ActiveWorkoutScreen 8,014, ProOnboardingScreen 3,945, HomeScreen 3,817, CoachOutputScreen 3,760, `database.js` ~10.7k, `sync.js` 3,308, `useAppStore.js` 2,512.
10. **Men's-physique bias is baked into the generic product**: a hard-coded founder programme id ships in the bundle, a library plan is named after the founder, and division logic is in the planner. Decide whether Volyume is "a physique app" or "a lifting app for everyone".

**C. Platform and release hygiene**
11. **iOS widgets and Live Activity UI probably do not ship (VERIFIED partly: `withVolyumeWidget`/`live-activity` are absent from `app.json`),** yet Settings tells iOS users they have home and lock-screen widgets. Android widgets are wired.
12. **`expo-application` is imported statically in three files but not declared in `package.json`** (VERIFIED: 0 matches). `react-native-webview` and `promise` have no importer. `app.json` has no `updates` block (VERIFIED), so the OTA check in `App.js` is likely dead while comments assume OTA works. `App.js` bypasses the payments barrel.
13. **Residual tier checks** (`tier === 'pro'`) remain in the notification scheduler, SettingsData and blockAdvisor; they pass only because the tier is coerced to 'pro'. Re-arming monetisation would silently change behaviour.
14. **Docs and comments drift:** README describes `migrate_191` tables that do not match the SQL; the local `database.js` comment for `entry_typed` still says "cloud NOT applied" (VERIFIED), contradicting CLAUDE.md; README headers still say "132 files"; the scratch table `claude_apply_scratch` was left in production; a `build-ios.yml` header says it auto-builds on push though it is dispatch-only; the Android manifest declares a `/p` deep link with no route.
15. **Test strength is real:** about 1,575 test files, 378 guard tests, 763 files that read source to pin founder rules. All builds are manual dispatch. This is the app's strongest asset for safe change.

## 7. Opportunity map for product decisions

- Make the safety layer coherent before adding surface area: a single calm/ED read used by every calorie-showing screen, and Beat signposting where the engine already intervenes (floor banner, energy caution, wellbeing check). Needs founder approval (ED-safety lane).
- Collapse planner generations: retire D219 build path and legacy generator once style pools move to the structure engine; unify the four "apply" paths.
- Resolve orphan/dormant surfaces (delete or wire): CoachReview, MesocycleBuilder rename, MealNames, SettingsHealth (a real health integration is absent), cardio (decide to build or drop the table).
- Decide the iOS story: widgets/Live Activity plugin wiring, Google sign-in on iOS (no client id), OTA configuration.
- Community: moderation/growth levers exist (feed scopes, groups, challenges, presence, public pages); the sharing-default posture and the half-armed ED server arm are the main risks to settle first.
- Breadth gaps visible in the code: no cardio logging, no health-platform sync, no exercise media (held), no AI input (held), no monetisation (free by law). These are decisions, not oversights.

## 8. What was not verified (aggregate)

Live Supabase state (applied migrations, function versions, `claude_apply_scratch`), whether `web/` is deployed, native Swift/Kotlin internals, device behaviour of any screen, whether Sentry honours the telemetry opt-out, the CoachOutput ED-lockout card's exact copy, large screens that were only partly read (Diary, NutritionTargets, MealPlan, ProgressPhotos, scan vision files), and the `ProOnboarding` internals beyond step structure. Line numbers in the surveys are approximate in places. The TASKBOARD's open-work states were read, not reconciled with the live repo.
