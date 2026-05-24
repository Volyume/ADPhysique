# Volyume Complete: session handoff

**Last updated:** 2026-05-24 (post delete-account + sign-out wipe + tab inset fix + exercises bulk-push removal + FoodLayerIntro removal)
**Last session ended at commit:** `b240188` (revert: delete migration 026 silencer). Active branch: `claude/volyume-food-logging-app-B9JZv`.

Recent landmarks (in push order):
- `b240188` revert migration 026 silencer (founder direction: fix source, don't silence)
- `c49e596` sync.js fix: only push customs to `custom_exercises`, stop hitting `exercises` RLS
- `a54df93` remove FoodLayerIntro onboarding screen (did nothing)
- `67bf5f6` one-shot SQL to nuke an orphan uid + verify queries
- `5873e67` migration 024 + audit doc updates
- `7c0dce8` sign-out wipes AsyncStorage fully (no carve-outs)
- `aa0d2b7` migration 025 (delete_user_data completeness) + scope-wipe (later replaced by 7c0dce8)
- `75ed020` tab leaf screens: drop double bottom inset (fixed black band under content)
- `29f92a6` consent Continue unblocked when cloud RPC fails
- `4b5c3de` Move #1.5 phase 3 OCR + OFF write-back + barcode persistence
- `be8e1cc` identity + ownership refactor

If you're a Claude session picking this up cold, read this document
end to end before doing anything. The previous session ended; this
is the rescue document. **The founder is allansdouglas1983@gmail.com,
direct, low tolerance for guesses presented as facts.** Always
verify against code or database before claiming something works or
broke.

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

The 2026-05-24 round shipped a packed series of fixes plus the
three deferred polish items, then Move #2 in full, then Move #3:

18. Launch-crash fix on missing Sentry DSN, AthleteHub check-in
    title reading the chosen day, enrolment prefs writing where
    readers look, early-deload gates (≥2 check-ins, block week ≥2),
    Plans "My plans" matching Plan Library layout, morning weight
    unit visible, dismissible heads-up banner.
19. Jargon sweep (heatmap legend stripped MEV/MRV terminology),
    check-in cluster (enrolment weight counts as a reading,
    single header on Precision Coaching, "Got it" exits to Hub),
    re-introduced ddcf99b after a prior revert.
20. Debug-log noise (`coach_outputs.applied` migration, orphan
    cleanup before push), Diary header grouping with a Today pill,
    goal-change summary copy now tells the truth about the
    rerolled plan.
21. Plans archive system: auto-archive other plans on goal change,
    Archived collapsible section, restore action.
22. **Food polish block (Move #1 remaining):** MacroRings Skia
    component replaces the linear bars, FoodDetailSheet bottom
    sheet replaces the centred picker modal in FoodSearch AND
    handles tap-to-edit on diary entries (long-press-delete
    footgun killed). Three deferred polish items now done.
23. **Move #2 (ED-pattern detection) — SHIPPED FULL.** Detector
    with 4 signals + thresholds, 23 unit/property tests,
    weeklyCoach integration, locked verbatim copy in
    HeldDecisionsCard, GoalLockConsentScreen, YouHub edit row,
    Supabase migration 017.
24. **Move #3 (cascade telemetry) — SHIPPED.** Local-first event
    log, debounced push helper, sign-in drain hook,
    tier_changed + ED-flag + goal_lock events wired.
25. **WelcomeScreen disqualifier (Claude draft).** "Who Volyume
    is for" block above tier cards. Founder to edit in place.

**Test state:** 1036 passing, 2 pre-existing failures
(off-target threshold gating in weeklyCoach.test.js — Move #3
won't fix these, they're a separate issue from the rapid-loss
test mentioned earlier). 23 new tests added this session for the
ED-pattern detector.

---

## 4. Move status (current)

| Move | Status |
| --- | --- |
| Move #0 -- code corrections (jargon blocklist + SportRxiv citation fix) | SHIPPED |
| Move #0.5 -- voice retrofit | SHIPPED PARTIAL. whyThisTemplates, weeklyCoach WHY_LIBRARY, HomeScreen mesocycle chip, SettingsScreen done. Deeper screen-by-screen surface audit (PRICE strings, onboarding screens) not yet done. |
| Move #1 -- food foundation + FFM floor | SHIPPED FULL. Migrations 015 + 016, FFM floor function + wiring, food data layer, Diary screen with MacroRings (Skia), Add custom food, Diary tab, Today's intake card, food sync wired both directions, FoodSearchScreen with waterfall + recents + favourites + bottom-sheet picker, BodyMetrics 7-day intake line, FoodInsightsScreen with 7-day bar chart + macro adherence + CSV export, FoodDetailSheet handling both add and edit. |
| Move #1.5 -- barcode + OCR | SHIPPED FULL. Three phases: (1) live OFF + USDA waterfall sources, (2) camera barcode scan screen + Diary scan FAB, (3) OCR (vision-camera + MLKit), OFF write-back queue, custom_foods.barcode_ean persistence. Migrations 022 (telemetry allow-list extension) + 023 (barcode column + food_sync_push update). Bundled OFF snapshot + CoFID remain deferred per FOOD_DATA_STRATEGY_LOCKED.md (live paths cover the miss surface). |
| Move #2 -- ED-pattern detection | SHIPPED FULL including Article 9 consent. edPatternDetector with 4 signals + thresholds, 23 unit/property tests, weeklyCoach integration, locked verbatim copy in HeldDecisionsCard with Get-support + Read-more CTAs, GoalLockConsentScreen registered in nav + reachable from AthleteHub, migration 017 (engine RPC + RLS). Article 9 health-data consent screen (Article9ConsentScreen, migration 019) shipped as the locked Move #2 deferral — onboarding screen 3 per ONBOARDING_SEQUENCE_LOCKED.md. |
| Move #3 -- cascade telemetry + upward gate compression | SHIPPED PARTIAL (telemetry done). engine_telemetry local table + Supabase mirror, record_engine_telemetry RPC, allow-listed event taxonomy extended in migration 022 to include food_lookup_barcode + ocr_writeback_attempted, debounced push helper, sign-in drain. Hooks: tier_changed, ed_pattern_flag_fired/_cleared, goal_lock_set/_cleared. The upward-gate-compression scope (separate work stream per MOVE_3_UPWARD_GATE_COMPRESSION.md) is NOT STARTED. |
| Identity + data ownership refactor | SHIPPED in migrations 018 + 020 + 021 + 024 and code commit `be8e1cc`. Composite `(user_id, id)` PKs on every user-scoped table; sign-out wipes local SQLite; no anonymous mode; custom_exercises split from mixed-ownership exercises; food_sync_push updated to composite-conflict pattern; old-client safety triggers on child tables (routine_exercises, mesocycle_weeks, recipe_ingredients); CI grep blocks `SET user_id` in src/. Step 7 of the locked sequence (existing-user data fix-up) runs automatically on the next sync cycle after the schema lands. |
| Move #4 -- differential paywall | NOT STARTED. |
| Move #5 -- tier infrastructure + RevenueCat | NOT STARTED. |

---

## 4a. State of in-flight things at the end of this session

This session ended in frustration. Be honest about what's actually
done and what's still unverified.

**Cloud SQL the founder confirmed running:**
- Migrations 019, 020, 021, 022, 023, 024 — all applied. Founder
  ran a verify query (`pg_get_function_arguments` against
  `record_engine_telemetry` + `record_health_consent`) and got the
  expected two rows.
- Migration 025 (delete_user_data completeness) — pushed to
  branch; founder applied. NOT independently verified by running
  Delete Account from the device after applying — the founder
  tried Delete Account earlier in the session, the Edge Function
  500'd with "Auth deletion failed: Database error deleting
  user", and we never re-verified after 025 landed. Open question
  whether migration 025 actually finishes the delete or whether
  something else still blocks `auth.admin.deleteUser`.
- `supabase/nuke_uid_a7379dc8.sql` — one-shot SQL to hard-delete
  the orphan account `a7379dc8-a597-4d00-9ebf-5693ae8450cb` that
  earlier failed deletes left half-alive. Founder unclear whether
  they've run it. Verify queries at the bottom of the file say
  exactly which rows remain.

**Code changes pushed this session that need the next APK build
to take effect (founder does NOT build APKs locally; the branch
build pipeline produces the artifact):**
- `c49e596` `sync.js` — only push customs to `custom_exercises`,
  no more bulk push of library rows to `exercises`. Fix for the
  `42501` warns the founder kept seeing on fresh signups. Until
  this is in an installed APK, those warns will keep firing.
- `a54df93` removed `FoodLayerIntroScreen` from the onboarding
  flow.
- `75ed020` removed the double bottom-inset (black band under tab
  content) from `HomeScreen`, `PlansScreen`, `AthleteHubScreen`,
  `AnalyticsScreen`.
- `7c0dce8` sign-out now `AsyncStorage.clear()`s everything (no
  carve-outs, per founder direction).
- `29f92a6` consent screen "Continue" no longer strands user when
  cloud RPC fails.

**Things that were proposed and explicitly rejected:**
- Migration 026 `BEFORE INSERT` trigger on `exercises` to silently
  drop the bulk-push 42501s. Founder: "silently dropping errors
  is not acceptable, fix the source". Deleted in `b240188`. The
  source fix is `c49e596`.

**Outstanding diagnostic questions the founder hasn't confirmed
either way:**
1. Does Delete Account complete cleanly on cloud after migration
   025? If not, what does the Edge Function return now?
2. After the next build with `c49e596` is installed, do the
   `sync.syncExercises 42501` warns stop?
3. Is the orphan `a7379dc8` account fully nuked?

## 5. What's pending right now (resume points, in priority)

Moves #1, #1.5, #2 (full including Article 9 consent), #3 (telemetry
slice), and the identity refactor are all shipped. Cloud migrations
018–025 are all in branch and applied. The remaining work splits
into verification of this session's fixes, release prep, growth-
strategy follow-through, and the next moves.

**Release policy (still locked 2026-05-24):**

> The current Play Console closed testing build (pre-Eat-component
> version) stays in place until the WHOLE project is built out — not
> half done. No new app version goes to closed testers until the user
> explicitly approves. Cloud Supabase migrations DO apply now, to
> support continued building on the branch; the old app on closed
> testing is required to keep functioning against the new cloud
> schema (sync errors in log are acceptable; total break is not).
> Every new migration must satisfy that contract or it can't ship
> to cloud either.

**Things needing user action outside the app:**

1. **Edit the WelcomeScreen disqualifier copy in place.** Currently
   Claude-drafted per founder instruction; founder to revise.
2. **Optional: re-build APK and re-test the consent + Move #1.5
   flows on device.** The branch carries the unblocked-on-cloud-
   failure consent fix (`29f92a6`), the migration 020 + 022 fixes,
   and the full Move #1.5 surface (scan + OCR + write-back). The
   founder paused new closed-testing releases under the locked
   release policy; a personal sideload build is the way to verify
   end-to-end before the project is fully built out.

**Post Move #2 follow-through (housekeeping):**

1. **Onboarding navigator refactor.** Insert Article 9 → goal
   selection → conditional goal lock → SCOFF → activity → equipment
   → Food layer intro → notifications → summary, per
   ONBOARDING_SEQUENCE_LOCKED.md. The screens themselves all
   exist (`Article9ConsentScreen`, `GoalLockConsentScreen`,
   `FoodLayerIntroScreen`); the wiring is what's outstanding for
   the new-user flow.
2. **Cohort dashboard (synthesis §9.3).** `engine_telemetry_daily`
   view lives in migration 017 and is readable from Supabase Studio.
   Open question: do you want an in-app coach-only dashboard
   surface, or is reading from Studio sufficient for the founder
   weekly review?
3. **Cascade events instrumentation.** The allow-list already
   includes `cascade_started`, `cascade_advanced`,
   `cascade_skipped_ahead`, `paid_converted`, `churn_at_gate`. No
   callers yet — these belong to Move #4 / Move #5 (the cascade
   mechanic and tier infrastructure) and have nowhere to fire from
   until those ship.
4. **Bundled OFF snapshot + CoFID source.** Listed in
   `FOOD_DATA_STRATEGY_LOCKED.md` as steps 2 + 3 of the waterfall.
   Deferred because the live OFF + USDA + OCR write-back path
   covers the miss surface at zero static-coverage cost. Revisit
   when day-30 hit-rate plateaus below the locked target.

**Next moves (in spec, not started):**

- **Move #3 (upward gate compression)** -- the separate work stream
  per MOVE_3_UPWARD_GATE_COMPRESSION.md, distinct from the
  telemetry slice shipped earlier.
- **Move #4** -- differential paywall + cascade mechanic.
- **Move #5** -- tier infrastructure + RevenueCat.

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
  `recentIntakeAvgKcal`, `recentIntakeDaysLogged`). Also accepts
  Move #2 inputs (`recentWeeklyHistory`, `goalLockAdvanced`,
  `edPatternOpen`). Returns `ffmFloorHeld`, `ffmFloorContext`,
  `edPatternFired`, `edPatternSignals`,
  `edPatternClearedThisWeek`, `goalLockAdvanced`. WHY_LIBRARY has
  `ffm_floor_hold` and (via whyThisTemplates) the locked verbatim
  copy for ED-pattern lockout + cleared.
- `src/lib/edPatternDetector.js` -- NEW (Move #2). Pure logic
  with 4 signals (rapid loss, low energy, under adherence,
  weight-only check-ins). Threshold 2 normally, 3 with
  goal_lock_advanced. Exports `detectEdPatternFlag`,
  `hasEdPatternCleared`, `ED_PATTERN_CONSTANTS`.
- `src/lib/engineTelemetry.js` -- NEW (Move #3). Local-first
  event log. `track(userId, event, payload)` + allow-list +
  debounced push helper. `flushPendingTelemetry()` for explicit
  drains on app sign-in.
- `src/lib/whyThisTemplates.js` -- 12 exported template functions.
  Voice-retrofitted: decision outputs name Precision Coaching;
  descriptive outputs stay factual. Plus
  `ED_PATTERN_LOCKOUT_COPY`, `ED_PATTERN_CLEARED_COPY`,
  `ED_SUPPORT_LINKS`, `getEdSupportLink(locale)` for Move #2.
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
  has entries through food schema, the `coach_outputs.applied`
  fix (this session), and the Move #2/3 block (this session)
  which adds `ed_pattern_flags`, `engine_telemetry`,
  `user_body_profile.goal_lock_advanced`,
  `user_body_profile.goal_lock_set_at`. Helper functions:
  `getOpenEdPatternFlag`, `getRecentEdPatternFlags`,
  `raiseEdPatternFlag`, `clearEdPatternFlag`,
  `setGoalLockAdvanced`, `getGoalLockAdvanced`,
  `recordEngineTelemetry`, `getUnpushedEngineTelemetry`,
  `markEngineTelemetryPushed`. Plans helpers:
  `unarchivePlan`, `getArchivedPlansForUser`,
  `archiveOtherUserPlans` (Plans archive system, this session).
- `supabase/migrate_015_food_logging.sql` -- foods, custom_foods,
  food_entries, daily_intake_rollups (with recompute trigger),
  saved_meals, recipes, recipe_ingredients, food_favourites,
  daily_water. RLS on every user-scoped table.
- `supabase/migrate_016_food_sync_rpcs.sql` -- food_sync_pull,
  food_sync_push. Last-write-wins per record, scoped to auth.uid().
- `supabase/migrate_017_ed_pattern_and_telemetry.sql` -- NEW
  (Move #2 + #3). `ed_pattern_flags` table + RLS,
  `user_body_profile.goal_lock_*` columns, `clear_goal_lock` RPC,
  `engine_telemetry` table + RLS, `record_engine_telemetry` RPC
  with the locked event allow-list, `engine_telemetry_daily`
  view for the cohort dashboard, `engine_overrides` table
  (groundwork for B2B phase 2). **NEEDS USER ACTION:** paste into
  Supabase Dashboard → SQL Editor → Run.

**UI:**

- `src/screens/DiaryScreen.js` -- the food diary. Uses MacroRings
  + FoodDetailSheet for tap-to-edit.
- `src/screens/AddCustomFoodScreen.js` -- manual food entry with
  sanity-check warnings.
- `src/screens/FoodSearchScreen.js` -- search/recents/favourites,
  uses FoodDetailSheet for add.
- `src/screens/FoodInsightsScreen.js` -- 7-day bar chart, macro
  adherence rates, CSV export.
- `src/screens/HomeScreen.js` -- extended with the "Today's intake"
  card and `loadTodayIntake` parallel fetch.
- `src/screens/CoachOutputScreen.js` -- renders MacroRings,
  routes the ed_pattern_lockout held-decision into the rich
  variant, persists ED-pattern state machine transitions,
  fires telemetry events.
- `src/screens/GoalLockConsentScreen.js` -- NEW (Move #2). Two
  radio options with the locked Screen 6 copy. Used in
  onboarding (when wired) and from AthleteHub Goal lock row in
  edit mode.
- `src/screens/WelcomeScreen.js` -- now carries the disqualifier
  block above the tier cards (Claude draft, founder to edit).
- `src/components/food/MacroRings.js` -- NEW. Skia hero kcal ring
  + three macro mini-rings.
- `src/components/food/FoodDetailSheet.js` -- NEW. Bottom sheet
  used by both FoodSearch (add mode) and Diary (edit mode).
- `src/navigation/RootNavigator.js` -- has DiaryStack, the
  5-tab nav, GoalLockConsent screen registered, sign-in flush
  hook for engineTelemetry.

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
- `src/lib/__tests__/csvExport.test.js` -- 5 tests for diary CSV
  formatter
- `src/lib/__tests__/edPatternDetector.test.js` -- NEW. 23 tests
  covering each signal in isolation, the goal-lock threshold
  flip, missing-data edge cases, and the four locked acceptance
  properties from MOVE_2_ED_PATTERN_DETECTION.md.
- `src/__tests__/screen-mount.test.js` -- 449 mount tests
  covering every screen at four data states.

Pre-existing failures (not from this session):

- `src/lib/__tests__/weeklyCoach.test.js` -- the
  `weight dropping too fast on cut → apply calorie increase` test
  + `lean bulk gaining too fast → apply calorie reduction` test
  both fail. Predate this session and survived all changes.
  Belong to the off-target threshold gating logic.

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
- **Test command:** `npx jest` (1036 pass, 2 pre-existing
  off-target failures unchanged).
- **Lint command:** check repo for existing setup.
- **Test database state:** SCHEMA_MIGRATIONS extended this session
  with the `coach_outputs.applied` ALTER and the Move #2/3 block
  (ed_pattern_flags, user_body_profile.goal_lock_*,
  engine_telemetry). Existing installs run the new entries on
  next boot; the migration runner ignores duplicate-column
  errors so a re-run is a no-op.
- **Supabase migration state:** migration 017 written but
  **NOT YET APPLIED** to the production project. Apply via
  Dashboard → SQL Editor before Move #2 / #3 telemetry can
  round-trip.

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
