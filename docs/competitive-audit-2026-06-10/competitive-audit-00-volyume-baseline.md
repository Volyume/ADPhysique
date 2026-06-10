# Competitive Audit 2026-06-10 — Document 00: Volyume Baseline

This is the definitive picture of what Volyume is today, verified against the
codebase on branch `claude/tender-albattani-crloK` (v1.2.0, versionCode 28).
Every competitive finding in documents 01-03 is measured against this
baseline. Sources: direct code reads of `src/` (~122,000 lines),
`docs/CURRENT_STATUS.md`, `docs/HANDOFF.md`, `docs/DESIGN_SYSTEM.md`,
`CLAUDE.md`, and the locked spec set.

---

## 1. Product identity

- **Volyume** — a UK Android-first coaching app for resistance training and
  nutrition, live on Google Play with paying users.
- Positioning: a serious, private, precision instrument. Reference feel is
  Whoop / Linear / Stripe, not a wellness app or gym-bro hype. Dark-only,
  amber accent, numbers-first.
- **The coaching engine ("Precision Coaching") is deterministic. No LLM, no
  AI, no randomness.** This is a sacred architectural rule and also a
  potential market differentiator (explainable, auditable coaching).
- Offline-first: SQLite on device is the source of truth; Supabase
  (EU Dublin) is the sync target only; components never query the cloud
  directly. Every feature works with no connection.
- British English throughout. No PII to any external service. UK GDPR
  Article 9 explicit consent for health data.
- iOS pipeline exists (EAS/TestFlight) but Android is the live platform.
  A web platform exists as an experimental parallel track.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 (managed, never eject), React 19 |
| State | Zustand (`useAppStore`) with `useShallow` selectors |
| Local DB | expo-sqlite (39+ tables, versioned migrations) |
| Cloud | Supabase EU (Postgres + Auth + RLS + Edge Functions + pg_cron) |
| Auth | Email + native Google Sign-In + Apple (browser) via Supabase |
| Payments | Google Play Billing direct via react-native-iap 15 (no RevenueCat) |
| Camera/OCR | react-native-vision-camera + ML Kit text recognition (on-device) |
| Health | Health Connect (Android) / HealthKit bridge in `src/lib/health.js` |
| Errors | Sentry (PII-scrubbed, 5% trace sampling) |
| Tests | Jest: 200 suites / 3,154 tests green; screen-mount harness taps every control; 12 locked engine-simulator scenarios; Maestro E2E scaffolding |
| CI | GitHub Actions: build-android per push, main-ci (jest+lint+doctor), pages deploy |

## 3. Tiering and monetisation

- **2-tier: Free + Pro.**
  - Free: Plan Library, training builder, workout logging, exercise library,
    personal bests, progress stats.
  - Pro: food diary, barcode scanning, smart meal suggestions, nutrition
    targets/macros, cardio, steps, weekly check-ins, Precision Coaching
    adjustments, division-specific plans, safety systems, wearable
    integration, Training Partners.
- Pricing: **£4.99/month (`volyume_pro_monthly`), £29.99/year
  (`volyume_pro_annual`)**, Google as merchant of record.
- Trial: **14 cardless in-app days, then a 7-day Google Play intro trial
  (21 free days total)**. Cascade state machine server-side
  (`start_cascade`, pg_cron worker); server-authoritative purchase grant via
  the `play-billing-rtdn` Edge Function verifying the Play token.
- Paywall surfaces: `PaywallScreen`, `CascadeGateScreen` (day-21 gate),
  `ProUpgradeScreen`, `SubscriptionScreen`, differential paywall detector
  (`differentialPaywall.js`) that triggers on usage signals.

## 4. Onboarding and first run

Flow: `WelcomeScreen` → auth (no anonymous mode; email/Google/Apple) →
Article 9 health-data consent (starts the trial) → Pro onboarding
(`ProOnboardingScreen`, `ProGoalSetupScreen`, body stats incl. body fat,
goal selection, `ProSetupCompleteScreen` reveal with kcal ring) → first-run
plan path (Plan Library / builder). Goal changes go through
`GoalChangeSummaryScreen` and a goal-lock consent (`GoalLockConsentScreen`)
for safety-relevant goals. A `WellbeingCheckScreen` exists for the ED-safety
path. Time-to-first-value depends on account creation + consent + goal
setup before a plan exists — measurably longer than log-first competitors.

## 5. Training: plans and the engine

- **Plan generation** (`planEngine.js`, 2,315 lines): deterministic
  generator from experience, days/week (3-6), session length, equipment,
  goal (7 goals incl. V-taper, X-frame, weak-point specialisation), weak
  points (15 options), recovery rating. Selects split, picks exercises by
  stimulus-to-fatigue ranking, applies goal overlays to volume landmarks,
  trims to time budget, annotates advanced set types, attaches per-exercise
  "why this" rationale. Plans use accessible loadable staples (no
  unloadable bodyweight feats).
- **Volume landmark system**: per-muscle weekly hard-set targets
  (MEV/MAV/MRV, 18 muscle groups), personalised over time by
  `computeAdaptiveLandmarks` from session feedback. One source of truth
  shared by the generator and the trackers.
- **Mesocycles** (`mesocycle.js`, `MesocycleBuilderScreen`): block
  periodisation, accumulation→peak→deload multipliers, auto-regulation from
  rolling feedback, deload prediction, `BlockReflectionScreen` at block end,
  `blockAdvisor.js` next-block recommendation.
- **Progression**: one RIR contract via `computeSetTargets` (canonical);
  double progression with jump caps, layoff penalty, consecutive-miss
  detection; missing RIR holds rather than auto-increasing.
- **Exercise library**: ~448 seeded exercises with derived metadata
  (muscle, subregion, equipment, movement pattern, SFR, fatigue cost),
  custom exercise creation everywhere via `ExercisePickerModal`,
  SFR-ranked substitutes (`swapEngine.js`) including auto-swap on repeated
  joint-discomfort patterns.
- **Demonstrations**: `DemoCard` start↔end frame loops from a public-domain
  set plus **two licensed MoveKit sample videos** proving the premium video
  path. Structured form cues (setup/execution/cues/common mistakes) for
  flagship lifts; `cueEngine.js`. **Full-library licensing (MoveKit) is an
  open founder decision — coverage today is thin.**
- Travel mode (minimal-equipment plan adaptation), time-crunch mode (drops
  exercises / cuts rest to fit a target duration).

## 6. Workout logging (the core surface)

`ActiveWorkoutScreen.js` (~2,700 lines) — just overhauled this cycle:

- **Table-as-input logging** (Strong/Hevy idiom, shipped vCode 28): a
  SET | PREVIOUS | KG | REPS | ✓ table where the active row IS the input —
  bold tinted fields bound to shared state, a filled circular tick button
  that runs the same validated commit path (PR detection, rest timer,
  supersets, prefill). Warm-up rows flagged with a flame icon; extra-set
  row appears past plan; "+ Complete Extra Set" choice never auto-advances
  away (auto-advance removed after on-device feedback).
- Previous-session data per row; prefill from last session; progressive
  overload nudge ("Same weight as last time. Can you hit N+1 reps?");
  live Est. 1RM read-out for working sets.
- Set types: straight, warm-up, dropset, superset, myo-reps, AMRAP,
  rest-pause, cluster (with cluster flow). Unilateral exercise handling.
- Rest timer: slim single-row bar (time, −15/+15, Skip), auto-start on
  commit, haptic completion, sticky in-workout notification.
- PR detection on every set (1RM/weight/reps) with celebration overlay
  (reduce-motion gated); plate calculator; exercise swap mid-session;
  workout crash recovery (in-progress sessions survive app kill).
- `WorkoutSummaryScreen`: tonnage, sets, PRs, per-muscle volume status vs
  landmarks, session feedback (pump/soreness/fatigue) feeding
  auto-regulation, partner signal line, share card.
- Spoken-cue TTS was tried and removed (device audio unreliable).

## 7. Precision Coaching: check-in and weekly review

- `WeeklyCheckInScreen` (1,554 lines): weekly check-in collecting weight
  trend context, adherence (calories, training, steps, cardio — prefilled
  from actual logs), recovery; records completion and prefills on re-entry.
- `weeklyCoach.js` (1,304 lines): deterministic weekly decision engine —
  adaptive TDEE (EWMA weight trend + logged intake adherence factor),
  calorie adjustments capped at ±5% with cooldowns, training volume signal
  from week-over-week working sets, steps targets (NEAT first), cardio
  dosing **only when a cut stalls**, deload and diet-break advice,
  data-hold when evidence is insufficient.
- **Confirm-then-apply everywhere**: nothing writes until the user taps
  Apply on `CoachOutputScreen` (2,099 lines). Calories/diet-break →
  nutrition targets; training/deload → next week's planned volume; steps/
  cardio → profile fields that gate next check-in's adherence.
- Held decisions surface in `CoachHeldHistoryScreen`; pre-workout volume
  status in `CoachReviewScreen`.
- **Safety systems (untouchable, in `src/coaching/safety/`)**: calorie
  floors 1,200 kcal (women) / 1,500 kcal (men); FFM/RED-S-aware floor that
  holds cuts but never blocks increases; rapid-loss threshold 1.5%
  bodyweight/week with upward-gate compression; 4-signal ED-pattern
  detector with Beat UK signposting; goal locks; wellbeing check. ED/floor
  notifications are in-app only by policy.
- Voice: locked coaching voice spec, snapshot-tested copy, jargon blocklist
  (no researcher/brand/formula names in user-facing text).

## 8. Nutrition and food

- **Targets** (`nutritionEngine.js`, `NutritionTargetsScreen` 1,849 lines):
  BMR (standard or lean-mass-adjusted when body fat is known), TDEE,
  goal-phased kcal, protein approaches (standard/optimised/advanced/custom,
  clamped 3.5 g/kg), fat floor, carbs as remainder, confidence + warnings,
  "Why these numbers for you?" narrative.
- **Food data**: bundled OFF UK snapshot (~25k products, regenerated weekly
  by CI) + CoFID UK generic foods (~3k, OGL v3) + live Open Food Facts +
  USDA, orchestrated by a first-hit-wins waterfall with cache promotion.
  Strong UK coverage by design. Community write-back to OFF (consent
  gated). Macro sanity checks gate implausible entries.
- **Diary** (`DiaryScreen`): meal sections, macro rings, swipe delete,
  copy-yesterday, water tracker, cardio line, date pager; barcode scanning
  (vision-camera, torch, freeze-on-read); label OCR → parsed macros →
  custom food; recipes + saved meals + favourites/dislikes; frequent foods;
  smart meal suggestions; 7-day insights chart + CSV export; local-day
  keying (DST-safe).
- Food logged feeds the coach's adherence factor and the RED-S floor.

## 9. Progress and analytics

- Progress landing with compact volume summary; **Lifts** surface (merged
  PR wall + per-lift progress, est-1RM trends, strength standards vs
  bodyweight); Consistency surface (streaks, calendar); volume heatmap vs
  MEV/MAV/MRV; `useProgressData` hook as the data layer.
- Body metrics: weight (stone/kg/lbs for body, kg-only for gym weights),
  9 circumferences, body fat with source; morning-weight logging with
  notification prompt; trend EWMAs.
- Insights engine (1-3 ranked insights: volume trend, plateau, fatigue,
  overreaching, frequency); recovery/readiness EMAs with cardio load line;
  poor-sleep signal.
- Year of Lifts (365-day unlock), share cards (PNG, privacy toggles),
  daily narrative one-liner on Home.

## 10. Cardio and steps

- Cardio: ~36-activity library (MET × intensity), user-led logging
  (`LogCardioScreen`: favourites/recents/search, duration, intensity, live
  kcal as feedback only — never added to targets), Diary + Plans surfaces,
  history with soft delete, recovery-load (decayed additive sum) surfaced
  at high load, coach doses cardio only on a stalled cut. Synced.
- Steps: pedometer/Health Connect read, step targets set by the coach
  (NEAT before formal cardio), check-in adherence prefill.
- Wearable HR/HRV import deliberately out of scope for now.

## 11. Accountability: Training Partners (new this cycle)

- Private circles ("Training Partners") — Pro feature: share-link + QR
  invite (react-native-qrcode-svg; deep link `volyume://partner/<token>`,
  single-use), weekly signal derivation (`publishSignal.js`) shown on the
  partner screen, Home card (`PartnersHomeCard`), and a post-workout
  partner line on the summary. Deliberately *not* a feed: no likes, no
  comments, no public profiles. Privacy-first accountability.

## 12. Design system and UX quality bar

- Tokens-only styling (CI-enforced: no hardcoded hex, no raw font
  literals, no em dashes in copy). Amber `#F5A623` single accent on
  near-black `#0D0D0D` tonal elevation ladder; semantic
  green/amber/red; tabular figures for all data numbers; type roles;
  spacing tokens; radius tiers; one press feel (`PressableCard` spring);
  intent-named haptics map; motion tokens with mandatory reduce-motion
  gating; skeletons not spinners; designed empty states with hand-built
  SVG illustrations; themed in-app alerts (no native Alert).
- Accessibility: larger text, higher contrast, colour-blind-safe palette,
  reduce motion (Settings → Display).
- Dark-only by deliberate decision. System font (custom face deferred).
- Microcopy: direct, data-first, no emoji, no motivational filler;
  celebrations reserved for genuine PRs.

## 13. Notifications

12-file notification module: Android channels, quiet hours (22:00-07:00,
wrap-aware), per-category preferences (SQLite-backed), morning-weight
prompt, check-in reminders, per-training-day reminders, coach-review-ready
one-off (only when a real review exists), sticky active-workout
notification, telemetry on sent/tapped/failed. Push infrastructure
(`send-push` Edge Function) deployed.

## 14. Sync, reliability, privacy

- Modular per-table sync registry (15 cloud tables; pull-only where server
  is authoritative; LWW elsewhere; per-column merge for profiles),
  watermark-advance only on clean pass, FK-ordered, per-row failure
  surfacing; legacy `sync.js` still coexists (known drift). 60s foreground
  throttle + 2s debounced write sync.
- Hardened this quarter against an adversarial QA pass: sign-out can no
  longer wipe unpushed data; workout crash recovery; LWW restore; local
  calendar-day keying; NaN-safe writes; notification timezone handling.
- Account deletion end-to-end (Edge Function, audit log surviving the
  cascade); consent withdrawal flow; Sentry PII scrub; analytics opt-out.
- "Last synced" + pending-changes surfacing in Settings.

## 15. Honest quality bar per area (the measuring stick)

| Area | State | Honest grade vs world-class |
|---|---|---|
| Logging UX | Table-as-input just shipped, fast, prev data inline | Strong; newest surface, needs device-mileage polish |
| Plan generation | Deep deterministic engine, goal overlays, rationale | Strong engine; reveal/experience plainer than RP/Juggernaut |
| Coaching | Weekly deterministic coach, confirm-then-apply, safety floors | Differentiated (safety + explainability); weekly-only cadence, no daily touchpoint |
| Nutrition coaching | Adaptive TDEE, capped adjustments, explained targets | Competitive with MacroFactor conceptually; younger, less proven |
| Food logging | UK-first waterfall, barcode, OCR, recipes | Good; database depth/speed unproven vs MFP/MacroFactor scale |
| Progress | Solid surfaces, insights, heatmap | Functional; less emotionally celebratory than best-in-class |
| Onboarding | Thorough but long; consent + account before value | Likely a drop-off risk vs log-first apps |
| Exercise demos | ~448 exercises, cues; video for only a handful | Weakest content area; licence decision pending |
| Monetisation | Clean 2-tier, 21-day trial, compliant | Reasonable; differential paywall novel |
| Design | Token-disciplined, premium-dark, dense | High floor; some screens denser than delightful |
| Reliability | Offline-first, hardened sync, 3.1k tests | Strong for category |
| Accountability | Partners (QR invite + weekly signal) just shipped | Novel privacy-first angle; unproven, minimal surface |
| Check-in | Full pipeline live, prefills from real data | Strong bones; review length/feel untested at scale |
| Cardio/steps | User-led, coach-dosed, recovery-aware | Thoughtful; no wearable HR yet |

## 16. Known gaps and open items (from code and docs, pre-competitive)

1. Exercise demonstration coverage: 2 licensed videos + a few frame loops
   out of ~448 exercises; MoveKit full-library licence undecided.
2. Demo video on-device playback confirmation pending (inline autoplay
   loop held until verified).
3. No daily coaching touchpoint between weekly reviews (daily narrative
   one-liner only).
4. Two sync layers coexist (consolidation planned).
5. (Corrected 2026-06-10) Refeeds, diet breaks, and high/low-day macros are SHIPPED (confirm-then-apply, safety-gated); the dead-code note was from a stale survey.
6. `cycleOverride` (menstrual-cycle awareness) is a dead input — coach
   reads it, no UI sets it.
7. Wearable integration listed as a Pro feature but HR/HRV import is out
   of scope; Health Connect steps only.
8. iOS built but not shipped; web experimental.
9. English-only; UK-only food positioning (a strength domestically, a
   ceiling internationally).
10. No widgets, Wear OS, or watch surface.
