AREA: Feature gaps (features that exist elsewhere but not in Volyume)

VOLYUME CURRENT: Volyume ships a deterministic (no-AI) coaching spine and a wide
feature surface. From the nav-psychology map: a weekly coaching output and review
(`CoachReview` HomeStack `RootNavigator.js:300`/ProgressStack `:346`; `CoachOutput`
"Precision Coaching™" ProfileStack `:388`, GATED) with a `Methodology` "How Precision
Coaching works" screen (`:389`); a weekly check-in (`WeeklyCheckIn` `:387`, GATED) that
the day-3 notification routes into (`notificationRoute.js:58-65`); a volume heatmap with
MAV/MRV volume-status bands already in the theme tokens (`VolumeHeatmap` `:298,345`;
`theme.js:469-492`, MAV/MRV bands `:485-492`); training-block periodisation
(`MesocycleBuilder` "Training Blocks" `:326`); food diary, search, barcode/label scan,
meal plan, recipes and meals (DiaryStack `:225-276`, all Pro-gated at the root); nutrition
targets (`NutritionTargets` `:384`, GATED); cardio logging/history (`:251,256,357,358`);
analytics, lifts, consistency, body metrics, year-of-lifts/recaps (ProgressStack
`:342-358`); an exercise library/detail (`ExerciseDetail` `:323,351`); and partner
accountability (`Partner` "Training partner" `:350`). A `WellbeingCheck` screen exists
(`:399`). The ED-safety system is referenced separately (CLAUDE.md, `src/coaching/safety/`).

BEST IN CLASS:
- Form video tied to the exact exercise slot: TrueCoach — uploaded to the exercise slot,
  time-stamped comments + drawing tools (the feature Trainerize users beg for, 115 votes).
  https://truecoach.co/features/ — VERIFIED (research §4, F4.1).
- Deterministic load/fatigue/form model: TrainingPeaks PMC (CTL 42-day EWMA, ATL 7-day EWMA,
  TSB = CTL − ATL), generalised to RPE-only by intervals.icu (offline-capable).
  https://www.trainingpeaks.com/coach-blog/a-coachs-guide-to-atl-ctl-tsb/ — VERIFIED (F2.1).
- Adaptive nutrition coaching without a human: MacroFactor — dynamic TDEE, flexible,
  non-shaming weekly adjustment. — VERIFIED (F4 table / §4).
- Readiness gating: Whoop (green/amber/red recovery) + Oura (personal-baseline scoring,
  PARTIAL) gating daily prescribed strain/volume. — VERIFIED/PARTIAL (F2.2).
- Nutrition-budgeting UX: YNAB — "give every unit a job" + rollover + guilt-free flexibility.
  https://www.ynab.com/ynab-method — VERIFIED (F2.3).
- Gentle, safe gamification: Finch (bird never dies) + Duolingo streak freeze. — VERIFIED (F6.1, F6.4).
- Auto-deload in a lifting app: Alpha Progression + Stronger by the Day. — VERIFIED/PARTIAL (F3.4).
- Pantry-aware meals: Samsung Food (photo→suggestions, PARTIAL) + Paprika (scaling + pantry
  auto-uncheck, VERIFIED). — VERIFIED/PARTIAL (F1.4, F2.6).
- Bar velocity/VBT: Metric — auto-measures bar speed/ROM/path → estimated 1RM.
  https://metric.coach/ — VERIFIED as a gap-confirming existence proof (F3.5).

TOP 50 RANGE: 50+ apps researched (research §1, above the 20-app floor). The spectrum runs
from minimalist loggers that deliberately give no feedback and no readiness/deload logic
(Strong, Hevy, FitNotes, StrengthLog) — Hevy "logs what you do but doesn't tell you what you
should do next" (F4.3, PARTIAL) — through adaptive auto-progression/auto-deload loggers
(Alpha Progression, Stronger by the Day, Fitbod), rigid calendar-periodised programs (RP
Hypertrophy fixed 4–6wk meso+deload, criticised as rigid; JuggernautAI), AI black-box
programs users distrust (RP, JuggernautAI — "want to know why"), human/async-coach platforms
(TrueCoach, Trainerize, CoachRx, Future, Caliber, PT Distinction), single-purpose specialists
(TrainingPeaks/intervals.icu load model; Metric VBT; Drop It/Lunaletics/Wild.AI cycle-synced),
to gamification and cross-category exemplars (Duolingo, Strava, Finch, Apple Fitness, YNAB,
Daylio, Paprika/Samsung Food). No single app unifies nutrition + training + recovery into one
model (F1.3, PARTIAL) and none prominently ships an honest "back off / deload" warning
(F1.1, NOT FOUND).

NEWBIE VERDICT: Volyume already shields the Day-1 beginner well — the `FreeStarter` "three
plain questions" difficulty-0 on-ramp and a pre-answered "today's session" hero
(`RootNavigator.js:472-475`), plus a `Methodology` explainer (`:389`) and `WellbeingCheck`
(`:399`). But against the market the beginner-protective gaps bite hardest: no form-video
self-review/demos-in-context (F7.1, F4.1), no audio coaching during the set (F7.2), no
in-context per-exercise coaching notes (F5.5), no explicit humane "you missed a session,
here's what to do" recovery flow (F7.5, NTC flow NOT FOUND), and no readiness/overreaching
warning to protect a novice from doing too much too soon (F1.1, F2.2). The volume grammar a
beginner meets is also advanced: MAV/MRV bands surface in the heatmap (`theme.js:485-492`)
without a beginner-legible MEV/MAV/MRV landmark layer over raw sets (F3.1).

ATHLETE VERDICT: The competitor gets the deterministic spine, `MesocycleBuilder` block
periodisation (`:326`), the MAV/MRV volume bands (`theme.js:485-492`) and weekly coaching
output. What an experienced lifter must still leave Volyume for: a fitness-fatigue-form load
curve to time deloads by fatigue rather than by hand (F2.1), an RPE/RIR trend graph to catch
creeping fatigue (F3.3) — note the nav map shows no RPE-trend screen — fatigue-triggered
(not date-locked) auto-deload (F3.4), bar-velocity/tempo (F3.5), durable form-video history
tied to a lift across blocks (F4.1), injury/pain logging with auto-rotation (F3.6), and
(for female competitors) menstrual-phase-tagged strength trends (F3.8).

WHERE WE LEAD:
- A deterministic, no-AI engine can give a plain rationale for every recommendation honestly
  — "the rule is the rationale" — where AI programs are a distrusted black box and CoachRx
  charges for explaining the "why" via Loom (F1.2 VERIFIED; F4.4 the verbatim "explain why"
  quote NOT FOUND, held PARTIAL). Volyume already has the surface for it (`CoachOutput`/
  `Methodology` `:388-389`).
- The ED-safety stance (calorie floors, rapid-loss threshold; CLAUDE.md) plus a deterministic
  engine uniquely position Volyume to ship the honest "you're overreaching → deload" warning
  no consumer app ships (F1.1 NOT FOUND elsewhere = white-space).
- Volume-status MAV/MRV bands are already a top-level Progress tile (`VolumeHeatmap` `:298,345`;
  `theme.js:485-492`) where minimalist loggers (Strong/Hevy) map raw sets to no landmark
  (F3.1, Hevy raw-only VERIFIED).
- Partner accountability is already first-class (`Partner` `:350`); the market's social-proof
  driver (Strava kudos, F6.2 VERIFIED academic) maps onto an existing surface.
- Weekly check-in as the accountability/data-capture backbone is already shipped
  (`WeeklyCheckIn` `:387`), matching Trainerize's most-valued communication pattern (F5.2 VERIFIED).

WHERE WE LAG:
- No RPE/RIR trend surfaced to detect creeping fatigue (logging exists everywhere; trend
  graph does not — F3.3, logging VERIFIED / trend PARTIAL); no such screen in the nav map.
- No readiness/recovery traffic-light gating daily volume from sleep + RPE + bodyweight trend
  (F2.2 VERIFIED/PARTIAL); no readiness screen in the nav map.
- No fitness-fatigue-form (CTL/ATL/TSB) load model driving deload timing (F2.1 VERIFIED).
- No fatigue-triggered auto-deload (F3.4 VERIFIED/PARTIAL).
- No beginner-legible MEV/MAV/MRV landmark layer over raw set counts, despite the MAV/MRV
  theme bands existing (F3.1 VERIFIED gap / PARTIAL competitor source).
- No pantry-aware meal suggestions, no auto grocery list, no recipe scaling to macro targets,
  despite a meal engine being present (DiaryStack `:226,266-276`; F1.4/F2.6 VERIFIED Paprika /
  PARTIAL others).
- No YNAB-style macro rollover / "give every macro a job" guilt-free flexibility (F2.3 VERIFIED).

MISSING ENTIRELY (confirmed absent from the nav-psychology map):
- Form-check video attached to a specific logged set/exercise for self-review, with in-context
  per-exercise notes (F3.7/F4.1/F5.5; TrueCoach VERIFIED, self-attach PARTIAL). No video/media
  attachment screen anywhere in `RootNavigator.js`.
- Audio coaching during the set (Freeletics/Aaptiv/Peloton; F7.2 VERIFIED). No audio-cue surface.
- Bar speed / velocity (VBT) and tempo tracking (Metric; F3.5 VERIFIED). Absent.
- Injury / pain / joint logging with auto-rotation around it (F3.6 PARTIAL). Absent.
- Menstrual-cycle phase effect on lifts / phase-tagged strength trends (Drop It, Lunaletics,
  Wild.AI; F3.8 VERIFIED). Absent. (Gate check: Precision-Coaching-adjacent → likely Pro;
  confirm against FREE/PRO matrix before any build — research §5 caveat.)
- Streak + streak-freeze gamification; closure-ring targets; consistency/PR partner leaderboard
  (Duolingo/Apple Fitness/Strava/Finch; F6.1/F6.4/F2.7/F6.3, mostly VERIFIED). No streak, ring,
  badge or leaderboard surface in the map. (Must respect ED-safety: no coercive ratcheting,
  never streak-shame a deload — research §5 caveat.)
- Daylio-style mood↔activity correlation engine with a confidence label (F2.4 VERIFIED).
  `WellbeingCheck` (`:399`) captures wellbeing but the map shows no correlation-output surface
  — correlation engine NOT DETERMINED present (treat as missing pending Phase-1 per-screen brief).

USER SENTIMENT (what users want that no app provides — from the fragment):
- An honest "stop, back off, you're overreaching / take a deload" signal: no consumer app was
  found shipping it; apps appear to fear telling paying users to train less (F1.1, NOT FOUND).
- The "why" behind a changed program — AI programs are a distrusted black box; users want the
  rationale, which is currently sold as a premium (CoachRx Loom) (F1.2; F4.4 verbatim NOT FOUND).
- One unified nutrition + training + recovery model, not three bundled trackers (F1.3, PARTIAL).
- Pantry-aware meal suggestions cross-referencing what users already own — "most apps still do
  not" (F1.4, PARTIAL).
- Verbatim coaching-communication asks: "add videos/pictures to their workout comments...
  instead of having to navigate out...to the messenger" (Nick Cowell, VERIFIED); "TrueCoach...
  upload the video directly to the exercise slot" (Jack Suljevic, VERIFIED); "I just wish
  messaging was a little more noticeable" (Chris D., VERIFIED).

VERIFICATION STATUS: NOT all-VERIFIED. This block leans on the following non-VERIFIED items
carried at their fragment status:
- NOT FOUND: honest overreaching/deload warning as a shipped feature (F1.1); a verbatim "explain
  why my program changed" user quote (F4.4); an explicit NTC missed-workout recovery flow (F7.5).
- PARTIAL: unified nutrition+training+recovery model (F1.3); pantry-aware suggestions for
  non-Paprika apps (F1.4/F2.6); deterministic equipment-aware substitution (F1.5); RPE/RIR trend
  gap (F3.3); recovery/HRV/fatigue-carryover gap (F3.2); MEV/MAV/MRV landmark competitor source
  (F3.1); auto-deload rigidity framing (F3.4); pain-logging (F3.6); self-attach form-video gap
  (F3.7); bodyweight-vs-strength correlation (F3.9); Oura baseline / Runna re-plan (F2.2/F2.8);
  Hevy "no feedback" review source and per-exercise notes line (F4.3/F5.5); Strava leagues
  decomposition source (F6.3); Habitica hollow-progression source (F6.5).
- Sourcing caveat carried from the fragment: reddit.com (400/blocked) and trustpilot.com (403)
  were unreachable; all Reddit/Trustpilot sentiment is held at PARTIAL, never promoted
  (founder rule 2026-06-12). Self-interested competitor-comparison sites (arvo.guru, askvora.com,
  setgraph.app, gymgod.app) used only at PARTIAL.
- Nav-map caveat: the Daylio-style correlation-output surface is treated as missing because it is
  not in the nav-psychology map; element-level per-screen confirmation is the Phase-1 per-screen
  brief's job, not this map (NOT DETERMINED IN CODE here).
