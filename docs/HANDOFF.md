# Volyume Complete: session handoff

**Last updated:** 2026-05-23 (resumed after compaction; concentrated push round)
**Last session ended at commit:** ddcf99b (Insights + macro targets + CSV export)
**Active branch:** `claude/volyume-food-logging-app-B9JZv`

If you're a Claude session picking this up cold, read this document
end to end before doing anything. The previous session crashed or
ended; this is the rescue document.

---

## 1. What this project is, in 90 seconds

Volyume is a UK iOS / Android coaching app for resistance training
and nutrition. Currently in Play Store closed testing as v1.1.0
(versionCode 4). The big strategic shift in flight is **Volyume
Complete**: a three-tier ladder (Free, Pro, Complete) that adds food
logging and the FFM-aware safety guardrail to the existing adaptive
training engine.

The coach engine is called **Precision Coaching** in user-facing
copy. That name appears in Play/App Store listings, the welcome
screen, the weekly check-in surface, notifications, subscription
copy. Always use it as a proper noun ("Precision Coaching has held
your target") or possessive ("your Precision Coaching adjusts at the
next check-in"). Never use "the engine" / "the system" / "the AI" in
user-facing copy. Internal code comments and architectural
documentation can refer to "the engine" as a developer concept.

There is no LLM in Precision Coaching. It is a deterministic rules
engine. Don't ever describe it as AI or ML in user-facing copy.

User name: Allan. Email: allansdouglas1983@gmail.com. Tone:
direct, calls out mistakes quickly, expects me to think before doing.

---

## 2. The complete locked doc set (read these for context)

All in `docs/`. Read in this order if cold:

**Strategy and direction (read first):**

- `MASTER_VISION_AND_PLAN.md` -- the single index. Start here.
- `RESEARCH_FINDINGS_SYNTHESISED.md` -- three-AI deep research output, locked
- `BRIEF_C_CLAUDE_ADJUDICATION.md` -- the adjudication that locked direction
- `OPEN_QUESTIONS_RESOLVED.md` -- ED override, retention policy, pricing copy
- `COMPLETE_TIER_SCOPE_LOCKED.md` -- tier features, cascade, prices

**Foundation:**

- `DATABASE_SCHEMA_LOCKED.md` -- every new table, RLS, RPC
- `SYNC_ARCHITECTURE_LOCKED.md` -- registry pattern, conflict resolution
- `FOOD_DATA_STRATEGY_LOCKED.md` -- £0 stack, OFF / CoFID / USDA, OCR write-back
- `BUDGET_POSTURE_LOCKED.md` -- free-tier-first, no speculative spend
- `PRODUCTION_READINESS_LOCKED.md` -- sync, testing, observability bars

**User-facing:**

- `UI_FLOWS_LOCKED.md` -- screen-by-screen specs
- `ONBOARDING_SEQUENCE_LOCKED.md` -- 12-screen onboarding incl. Article 9 consent + goal lock
- `PRIVACY_CONSENT_LOCKED.md` -- Article 9 + FTC HBNR + sub-processors
- `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` -- RevenueCat, 17-state cascade
- `NOTIFICATIONS_LOCKED.md` -- push only at v1, no ED-flag push

**Quality:**

- `TELEMETRY_DASHBOARDS_LOCKED.md` -- events, dashboards, alerts
- `TESTING_STRATEGY_LOCKED.md` -- Jest + Maestro + k6
- `RELEASE_PLAN_LOCKED.md` -- phases A-F

**Phase 2 scoped (deferred but documented):**

- `B2B_COACH_PHASE_2_SCOPED.md` -- coach pays, client gets Complete free

**Move-level integration plans:**

- `MOVE_0_CODE_CORRECTIONS.md` -- citation fix + jargon blocklist (shipped)
- `MOVE_0_5_VOICE_RETROFIT.md` -- string-by-string voice retrofit (shipped, partial)
- `MOVE_1_FOOD_FOUNDATION_AND_FFM.md` -- food schema + FFM floor (shipped, mostly)
- `MOVE_1_5_BARCODE_AND_OCR.md` -- camera + MLKit + OCR write-back (not started)
- `MOVE_2_ED_PATTERN_DETECTION.md` -- multi-signal lockout (not started)
- `MOVE_3_UPWARD_GATE_COMPRESSION.md` -- upward-only gate compression (not started)
- `MOVE_4_DIFFERENTIAL_PAYWALL.md` -- 6 conversion contexts (not started)
- `MOVE_5_TIER_INFRASTRUCTURE.md` -- proGate, cascade, RevenueCat (not started)

**Coaching voice research (separate three-AI round):**

- `COACHING_VOICE_RESEARCH_BRIEF.md` -- the brief sent to ChatGPT/Gemini/Claude
- `COACHING_VOICE_PASS_1_GEMINI.md` -- Gemini's response
- `COACHING_VOICE_PASS_2_CHATGPT.md` -- ChatGPT's response
- `COACHING_VOICE_PASS_3_CLAUDE.md` -- Claude's response
- `COACHING_VOICE_CITATION_AUDIT.md` -- pressure-test of every citation
- `COACHING_VOICE_SYNTHESIS_LOCKED.md` -- locked synthesis (the source of truth for voice)

**Existing-before-this-session docs (read for app context):**

- `CLAUDE.md` (root, not docs/) -- voice rules, branch policy
- `DESIGN_SYSTEM.md` -- colours, typography, button style, microcopy rules
- `USER_FACING_COPY_AUDIT.md` -- existing copy + flagged issues
- `SCREEN_COMPONENT_INVENTORY.md` -- existing screens
- `BACKLOG.md` -- IMPORTANT: see Section 6 below on strategic overrides
- `PRODUCT_DIRECTION.md` -- product narrative
- `PRODUCT_UX_MAP.md` -- existing tab structure
- `KNOWN_ISSUES_FROM_QA.md` -- bugs and known issues
- `OBSERVABILITY.md`, `SENTRY_SETUP.md` -- existing telemetry
- `QA_TEST_PLAN.md`, `SUBMISSION_CHECKLIST.md`
- `APP_STORE_CONNECT_LISTING.md`, `PLAY_STORE_LISTING.md`
- `VOLYUME_RESEARCH_BRIEF.md` -- earlier research

---

## 3. What shipped this session

In chronological order, every commit:

1. `docs: lock coaching voice synthesis (citations pending audit)` -- the
   synthesis doc combining the three deep-research passes
2. `docs: scope Move 0.5 voice retrofit` -- the mechanical pass plan
3. `docs: fold citation audit results into voice synthesis` -- replaced
   every PENDING AUDIT marker with verified citations, dropped one
   fabrication (Cronin 2022)
4. `Move 0.5: voice retrofit of whyThisTemplates` -- Precision Coaching
   naming on decision-attributed outputs + 14 new tests
5. `Move 0.5: voice retrofit of weeklyCoach WHY_LIBRARY` -- 5 voice
   compliance tests
6. `Move 0.5: remove surface-copy jargon in HomeScreen and SettingsScreen`
   -- "RIR 2" became "stop 2 short of failure", "mesocycles" became
   "training blocks"
7. `Move 1: food schema migrations (015 + 016)` -- Supabase tables +
   sync RPCs
8. `Move 1: computeFFMFloor + 17 property tests` -- the pure function
9. `Move 1: wire FFM floor into runWeeklyCoach + computeAdaptiveTDEEAdjustment`
   -- the safety guardrail is real
10. `Move 1: SQLite migration + food data layer skeleton` -- client
    schema, db.js, waterfall.js, sanityChecks.js, localCache.js
11. `Move 1: DiaryScreen, AddCustomFoodScreen, new Diary tab`
12. `Move 1: Today's intake card on HomeScreen`

Then a research round and a concentrated build push picked up after
the context summary:

13. Growth strategy three-AI research (ChatGPT non-deep, Gemini DR,
    Claude DR) commissioned and archived in `docs/GROWTH_STRATEGY_PASS_*.md`.
14. Citation pressure-test audit run as a background agent, then
    folded into `GROWTH_STRATEGY_SYNTHESIS_LOCKED.md` as a 29-row
    verified-citations table. 21 verified, 8 miscited URL drift, 1
    fabrication (TrueCoach pricing) caught and replaced.
15. `feat(sync): wire food domain into hand-rolled sync engine`. Six
    `getAllXSince` fetchers + six `applyXFromCloud` appliers on
    `food/db.js`. `_pushFoodChanges` and `_pullFoodChanges` in
    `sync.js` calling the `food_sync_push` / `food_sync_pull` RPCs
    from migration 016. `migrateLocalUserId` extended to re-stamp
    food tables on sign-in. 12 new tests on the appliers and
    fetchers.
16. `feat(food): search-first add flow and 7-day intake on body
    metrics`. New `FoodSearchScreen` with 250ms debounced waterfall,
    recents, favourites, source chips, long-press favourite, and a
    ServingPicker modal. Diary's Add food button now routes here.
    `BodyMetricsScreen` reads `getRecentIntakeSummary` and surfaces
    a 7-day average intake line inside the weight-trend card.
17. `feat(food): macro targets on diary, 7-day insights, CSV export`.
    `MacroSummary` reads `nutrition_targets` and shows
    consumed-vs-target progress bars plus a kcal-remaining number.
    New `FoodInsightsScreen` with 7-day bar chart, macro adherence
    rates, and CSV export. Diary header gains a chart icon that
    routes there. CSV writer split into a pure formatter
    (`buildDiaryCsv`, 5 tests) and a thin I/O wrapper.

**Test state:** 565 passing (548 baseline + 17 new across sync +
CSV), 25 snapshots locked, 1 pre-existing failure (rapid-loss test
that Move #3 will address) and 1 pre-existing suite-load failure
(screen-mount mocking expo-image). Both predate this session.

---

## 4. Move status (current)

| Move | Status |
| --- | --- |
| Move #0 -- code corrections (jargon blocklist + SportRxiv citation fix) | SHIPPED |
| Move #0.5 -- voice retrofit | SHIPPED PARTIAL. whyThisTemplates, weeklyCoach WHY_LIBRARY, HomeScreen mesocycle chip, SettingsScreen done. Deeper screen-by-screen surface audit (PRICE strings, onboarding screens) not yet done. |
| Move #1 -- food foundation + FFM floor | SHIPPED. Migrations, FFM floor function + wiring, food data layer, Diary screen with macro-target progress bars, Add custom food, Diary tab, Today's intake card, food sync wired both directions to migration 016 RPCs, FoodSearchScreen with waterfall + recents + favourites + serving picker, BodyMetrics 7-day intake line, FoodInsightsScreen with 7-day bar chart + macro adherence + CSV export. Remaining polish (not launch-blocking): MacroRings Skia component, ServingPicker as a sheet rather than modal, food detail sheet for edit (currently a modal). |
| Move #1.5 -- barcode + OCR | NOT STARTED. Camera + MLKit + OCR + OFF write-back. |
| Move #2 -- ED-pattern detection | NOT STARTED. The Article 9 consent screen + Goal lock screen are also part of this. |
| Move #3 -- upward gate compression | NOT STARTED. |
| Move #4 -- differential paywall | NOT STARTED. |
| Move #5 -- tier infrastructure + RevenueCat | NOT STARTED. |

---

## 5. What's pending right now (resume points, in priority)

Move #1 is shipped. The remaining work is split between launch
polish, growth-strategy follow-through, and the next moves.

**Move #1 polish (nice-to-have, not blocking):**

1. **MacroRings (Skia).** Currently progress bars in
   `DiaryScreen.MacroSummary`. Skia rings per UI_FLOWS_LOCKED.md.
   Roughly 2 hours; defer until post-launch unless user pushes.
2. **Food detail sheet for edits.** Diary entries are currently
   delete-or-keep; no edit path. Plan calls for a long-press
   "Edit quantity" / "Move meal" flow.
3. **ServingPicker as a bottom sheet.** Currently a centred modal in
   `FoodSearchScreen`; the locked spec wants a sheet that ladders
   from the bottom for one-thumb reach.

**Growth strategy follow-through (from synthesis):**

1. **Cascade telemetry events (synthesis §6).** No event pipeline
   exists yet. Need: an `engine_telemetry` SQLite table, a push
   helper into `engine_telemetry_daily` on Supabase (column already
   reserved per locked plan), hooks on tier transitions (cascade
   start, Pro downgrade, Free hold, paid conversions, churn at gate).
   The Hold-at-Pro mechanic is the variable to instrument.
2. **Onboarding disqualifier copy (synthesis §9.1, churn risk #1).**
   Founder writes the copy per synthesis. Engineering scope: add a
   "Who Volyume is for" block on `WelcomeScreen.js` above the tier
   cards, with copy provided by the founder. Do not ship Claude-
   written copy here.
3. **Cohort dashboard (synthesis §9.3).** Day 1 completion %,
   Day 7-14 first/second workout %, retention by 3-workout cohort.
   Likely a Supabase view + a coach-only screen.

**Move #2 (ED-pattern detection, separate work stream):**

1. Read MOVE_2_ED_PATTERN_DETECTION.md end to end.
2. Apply COACHING_VOICE_SYNTHESIS_LOCKED.md Surface 1 + Surface 7
   redrafts for the lockout / cleared copy. Don't use the old draft
   copy in MOVE_2 -- the synthesis Section 5 has the corrected
   coach-voice versions.
3. Build `src/lib/edPatternDetector.js`. The synthesis Section 3
   patterns apply. Add property tests covering the goal-lock 2-vs-3
   signal threshold.
4. Build the Article 9 consent screen + Goal Lock onboarding screen.
5. Wire into `runWeeklyCoach` so the detector reads the same
   morning weights + intake + check-in inputs the FFM floor already
   consumes.

---

## 6. Critical context the user has called out

These are landmines from this session and earlier:

**a) BACKLOG.md says food logging and coach/client mode are
permanently excluded.** Specifically:
- Line 15: "Food / meal logging -- Out of scope permanently. Volyume
  is a training logbook, not a diet tracker."
- Line 19: "Coach / client mode -- Volyume is a self-coaching tool.
  No role separation, no athlete roster, no coach-controlled plan
  assignment."

The strategic decision to ship Volyume Complete with food integration
and coach handoff REVERSES both. This was not yet reconciled in
BACKLOG.md. The user wanted to confirm the mechanism (update
BACKLOG.md vs. write a separate STRATEGIC_OVERRIDES.md) before any
file change. **Do not touch BACKLOG.md without explicit confirmation
from the user.**

**b) "The engine" naming in surface copy is wrong.** Use Precision
Coaching. Code identifiers (`weeklyCoach.js`, `engine_overrides`
table, etc.) can keep architectural names. User-facing strings must
say Precision Coaching.

**c) No em dashes in any doc or copy.** Use full stop, comma, or
colon. Rewrite if needed. CLAUDE.md is explicit. The user noticed
when I had 62 em dashes across 13 docs.

**d) No fake autonomy on locked decisions.** "You could try X" when
the engine has already set X is dishonest. Use direct factual
prescription. Reserve "could/might/consider" for places where the
user genuinely has a choice. See Pattern 15 in
COACHING_VOICE_SYNTHESIS_LOCKED.md.

**e) The 2025 Cronin et al. JMIR mHealth citation is fabricated.**
Don't use it. The "tone-driven abandonment" claim stands on Kidman
et al. 2024 (verified) and Eikey 2017/2021 (verified).

**f) Don't push to a branch that isn't this one.** The branch policy
is set per session in the system prompt. This session is
`claude/volyume-food-logging-app-B9JZv`. Never push elsewhere.

**g) The CI workflow `.github/workflows/build-android.yml` has a
paths-ignore filter** so `docs/**` and `*.md` changes don't trigger
the APK + AAB build. Source changes still build. If a doc edit
triggers a build, the filter has been removed; restore it.

**h) Sentry source-map upload is intentionally disabled.** The
`SENTRY_AUTH_TOKEN` was added in error in a previous session. The
build workflow sets `SENTRY_DISABLE_AUTO_UPLOAD: 'true'`. Sentry
still captures crashes via the DSN at runtime; only symbolication is
off. Don't re-add the auth token.

**i) Don't go running off without confirming.** The user pushed back
hard on multiple sessions where I executed things before being
asked. When in doubt, ask. Especially on:
- Destructive git operations
- Changes to BACKLOG.md
- Changes that would create user-visible UI redesign
- Adding paid third-party services

**j) The user is paying for this. Be efficient with credit.** Don't
re-do work that's already done. Don't search for things repeatedly.
Don't over-test. Don't over-document the obvious.

**k) Always commit and push before ending a session.** A stop hook
enforces this; untracked files block clean exit.

---

## 7. Open decisions (still need user input)

These were noted in various locked docs but never resolved:

1. **How to handle BACKLOG.md food/coach exclusion reversal.** Two
   options on the table: update BACKLOG with a dated reversal note,
   or create STRATEGIC_OVERRIDES.md. User asked to confirm before
   touching.
2. **Share-pack PDF format** (single page, multi-page, branded
   template). Locked in COMPLETE_TIER_SCOPE_LOCKED.md as v1.1 work.
3. **Coach-link mechanism** for phase 2 v1. Locked as one-time share
   URL with expiry. No further input needed unless changing.
4. **Photo timeline storage at Complete tier.** Locked as on-device
   only, no cloud sync ever. User confirmed.
5. **Email at v1.** Locked as no, push only. User confirmed.

Decisions LOCKED this session that older session might not know:

- Three voice registers: cold-start factual (weeks 0-2),
  warmed-by-data (week 3+), safety-cold (any time hold fires)
- "No fake autonomy on locked decisions" is Pattern 15 of the voice
  synthesis
- The Diary tab landed as a 5th tab between Plans and Progress
  (not a rename of Progress)
- The FFM floor only fires when 5+ days of food data exist in a
  7-day window (data sufficiency gate)
- Coach pricing: tiered flat (£29.99 / £59.99 / £119.99), 60-day
  trial standard, founding programme = first 100 coaches get 6
  months free + lifetime 50% off
- Three-tier cascade: 14 days Complete → 14 days Pro → Free
- Open beta pricing (4 weeks at GA): Pro £0.99, Complete £1.99,
  locked for life on continuous subscription
- Founders pricing (12 weeks after open beta): Pro £1.49, Complete
  £3.49
- Standard pricing (after founders): Pro £2.99, Complete £6.99

---

## 8. Critical files and what they do

**Engine:**

- `src/lib/nutritionEngine.js` -- BMR, TDEE, protein calc,
  `computeFFMFloor`, `computeAdaptiveTDEEAdjustment` (now with FFM
  floor integration via `ffmFloorContext` parameter)
- `src/lib/weeklyCoach.js` -- the weekly output assembly.
  `runWeeklyCoach()` accepts food-context inputs
  (`bodyFatPercent`, `bodyFatSource`, `sex`,
  `recentIntakeAvgKcal`, `recentIntakeDaysLogged`). Returns
  `ffmFloorHeld` and `ffmFloorContext` fields. WHY_LIBRARY has new
  `ffm_floor_hold` key.
- `src/lib/whyThisTemplates.js` -- 12 exported template functions.
  Voice-retrofitted: decision outputs name Precision Coaching;
  descriptive outputs stay factual.
- `src/lib/algorithms.js` -- 1RM, set selection, mesocycle math
- `src/lib/insightsEngine.js` -- 6 insight types, deterministic
- `src/lib/proGate.js` -- two tiers currently (free, pro). Move #5
  will add Complete + isPaidTier helper.

**Food layer (NEW):**

- `src/lib/food/db.js` -- SQLite CRUD for the food domain. Functions:
  `logFoodEntry`, `updateFoodEntry`, `deleteFoodEntry`,
  `getFoodEntriesForDay`, `getRecentFoodEntries`, `insertCustomFood`,
  `getCustomFoodById`, `getAllCustomFoods`, `recomputeRollup`,
  `getRollupForDay`, `getRollupsForRange`, `getRecentIntakeSummary`
  (the FFM-context helper), `toggleFavourite`, `getFavourites`,
  `setWater`, `getWater`. All call `_scheduleSync()` after mutation.
- `src/lib/food/waterfall.js` -- search and barcode orchestrators.
  Currently calls only the local cache. Steps 2-5 (bundled OFF,
  CoFID, live OFF, USDA) ship in Move #1.5.
- `src/lib/food/sources/localCache.js` -- SQLite search and barcode
  lookup with prefix-rank-then-substring ordering
- `src/lib/food/sanityChecks.js` -- macro plausibility, mass
  coherence, kcal-vs-macros drift

**Database:**

- `src/lib/database.js` -- existing SQLite layer. SCHEMA_MIGRATIONS
  array has v9 entry for the food tables.
- `supabase/migrate_015_food_logging.sql` -- foods, custom_foods,
  food_entries, daily_intake_rollups (with recompute trigger),
  saved_meals, recipes, recipe_ingredients, food_favourites,
  daily_water. RLS on every user-scoped table.
- `supabase/migrate_016_food_sync_rpcs.sql` -- food_sync_pull,
  food_sync_push. Last-write-wins per record, scoped to auth.uid().

**UI (NEW):**

- `src/screens/DiaryScreen.js` -- the food diary.
- `src/screens/AddCustomFoodScreen.js` -- manual food entry with
  sanity-check warnings.
- `src/screens/HomeScreen.js` -- extended with the "Today's intake"
  card and `loadTodayIntake` parallel fetch.
- `src/navigation/RootNavigator.js` -- has DiaryStack and the new
  DiaryTab in the 5-tab nav.

**Tests:**

- `src/lib/__tests__/ffmFloor.test.js` -- 17 tests
- `src/lib/__tests__/ffmFloor.adaptive.test.js` -- 8 tests
- `src/lib/__tests__/weeklyCoach.ffmFloor.test.js` -- 8 tests
- `src/lib/__tests__/whyThisTemplates.snapshot.test.js` -- 14 tests
  with 25 inline snapshots locked
- `src/lib/__tests__/weeklyCoach.voice.snapshot.test.js` -- 5 voice
  compliance tests
- `src/lib/__tests__/food.sanityChecks.test.js` -- 18 tests
- `src/lib/__tests__/jargonBlocklist.test.js` -- 25 tests (Move #0)

Pre-existing failures (not my fault, will be fixed in later moves):

- `src/lib/__tests__/weeklyCoach.test.js` -- the
  `weight dropping too fast on cut → apply calorie increase` test
  fails. Move #3 (upward gate compression) will resolve.
- `src/__tests__/screen-mount.test.js` -- suite fails to load due to
  missing `expo-image` mock setup. Pre-existing, unrelated.

---

## 9. The voice rules (apply to everything)

From `CLAUDE.md`, `DESIGN_SYSTEM.md`, and
`COACHING_VOICE_SYNTHESIS_LOCKED.md`:

- No em dashes. Full stop, comma, or colon. Rewrite if needed.
- British English: optimise, colour, behaviour, centre. Code
  identifiers keep ecosystem spelling.
- No AI tells: no "let me", "I'll", "I'd be happy to", "certainly",
  "absolutely", "dive into", "delve into", "leverage", "utilise",
  "facilitate", "robust", "seamless", "streamline",
  "comprehensive", "ensure" as filler, "may potentially", "could
  possibly".
- No marketing jargon: "perfect", "guaranteed", "beast mode",
  "crush", "shred", "hacks", "AI Builder", "level up".
- No emoji in functional UI copy.
- No motivational filler. Celebrations reserved for genuine PRs.
- Numbers before narrative. Data before description.
- Plain English. No MEV/MAV/MRV/RIR/RPE in surface copy. No
  "metabolic adaptation", "training stimulus", "stimulus-to-fatigue
  ratio". No bare researcher surnames (Helms, Schoenfeld, Morton,
  Mountjoy, Eikey, Refalo, Trexler) in user-facing text.
- Volyume sits alongside coaches, not above them. Never imply
  Volyume replaces a human coach.
- Precision Coaching is the named decider for engine output.
- The honesty test: would this sentence still be true if the user
  did nothing but kept logging? If no, rewrite.
- Mirror data, never infer emotional state. Say "your log shows X",
  not "you've been struggling".
- No fake autonomy on locked decisions. Reserve "could/might" for
  genuine choices.

---

## 10. CI and infrastructure state

- **Branch:** `claude/volyume-food-logging-app-B9JZv` on
  `allansdouglas1983-cmyk/adphysique`.
- **Build workflow:** `.github/workflows/build-android.yml`. Runs on
  push to main and `claude/**` with `paths-ignore` for docs and
  markdown. Sentry source-map upload disabled.
- **Test command:** `npx jest` (548 tests pass, 1 pre-existing
  failure, 2 pre-existing suite-load failures).
- **Lint command:** check repo for existing setup.
- **Test database state:** SCHEMA_MIGRATIONS now has 9 entries
  (last was indexes; my food schema added at index 8 / v9). Existing
  installs will run the new migration on next boot.

---

## 11. How to resume in a fresh session

A fresh Claude session needs to:

1. Read this HANDOFF.md end to end.
2. Spot-check `git log --oneline -20` to confirm the commit list.
3. Spot-check `git status` (should be clean).
4. Run `npx jest` (should be 548 pass, 1 fail).
5. Ask the user what they want next, referencing Section 5 (pending
   work in priority order).
6. Read the specific Move doc before starting any new chunk.
7. Don't touch BACKLOG.md without confirmation.
8. Don't run off and do work without confirming direction.

---

## 12. End-of-session protocol (every session, going forward)

Per Allan's instruction, every session ends with:

1. All work committed and pushed to the active branch.
2. This HANDOFF.md updated to reflect the new state.
3. The handoff lists: what shipped, what's pending, what's open, any
   landmines that came up.
4. The user gets a final summary in the chat with the commit list
   and a "resume here" pointer.

If the session crashes mid-flight, the previous handoff is the
rescue document. Always overwrite this file; don't append. The
git history preserves prior handoffs.
