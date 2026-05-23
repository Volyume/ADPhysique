# Volyume Complete: master vision and plan

The single index for everything Volyume Complete touches. Each
numbered section either references a locked doc or names a doc to be
created in the next pass. Sections marked **DECISION NEEDED** require
your call before the supporting doc can be locked.

Locked 2026-05-23.

---

## 0. The vision in one paragraph

Volyume is a coaching engine that sits alongside coaches, not above
them. It tells the user what to train, what to eat, and when to back
off, with the working out shown rather than hidden. The Free tier is
useful on its own. Pro adds the adaptive engine with food data. Complete
adds longer memory, deeper planning, body composition tracking, photos,
and the coach handoff workflow. The engine never paywalls safety. The
voice is plain, British English, no jargon, no marketing tells, no
em dashes. The brand sits in the same colour and shape language across
every surface, owns its data on-device first and syncs everywhere, and
respects the at-risk subgroup that calorie-tracking apps have
historically harmed.

---

## 1. Product positioning

Locked. See `RESEARCH_FINDINGS_SYNTHESISED.md` Section 1 and
`docs/PRODUCT_DIRECTION.md` for the broader product narrative.

Key differentiators versus MyFitnessPal, Cronometer, MacroFactor, RP
Hypertrophy, JuggernautAI, Hevy, and Strong:

- Single app for training + nutrition + check-in, not two apps.
- Adaptive engine outputs the *why* in plain English.
- Safety guardrails (FFM floor, ED-pattern lockout) tier-blind.
- Coach handoff is a first-class workflow at Complete tier, not a
  bolt-on.
- UK-first regulatory posture (Article 9 consent, FTC HBNR aware).

---

## 2. Tiers, pricing, cascade

Locked. See `COMPLETE_TIER_SCOPE_LOCKED.md`.

Headlines:

- Free, Pro, Complete.
- Open beta four weeks: £0.99 / £1.99 (locked for life on
  continuous subscription).
- Founders 12 weeks after open beta: £1.49 / £3.49.
- Standard thereafter: £2.99 / £6.99.
- 28-day cascade (14 Complete → 14 Pro → Free), hold-at-any-stage,
  one-time entitlement.

**LOCKED 2.1: Open beta access mechanism.** Waitlist with rolling
invites. Paces at 200-500 sign-ups per week, protects engine
telemetry from spam, supports controlled load-on the support and
observability stack.

Operational specifics:

- Waitlist signup screen on volyume.app with email capture and an
  optional "how did you hear about us" field.
- Invites sent in weekly batches of 200 to 500 based on observability
  capacity. Pace adjusted weekly based on crash-free session rate and
  sync failure rate.
- Each invite includes a one-time signup link valid 14 days from
  issue.
- Waitlist position visible to user on the marketing page (anchors
  expectation, reduces support load).

**LOCKED 2.2: Subscription billing provider.** RevenueCat on top of
native IAP (Apple StoreKit 2, Google Play Billing).

Reasoning: the cascade state machine is the highest-risk new logic
and outsourcing receipt validation, cross-platform subscription
state, and refund handling to RevenueCat reduces that risk
substantially for a 1% revenue cost. RevenueCat dashboards also give
us conversion telemetry out of the box.

---

## 3. Engine and safety guardrails

Locked. See `RESEARCH_FINDINGS_SYNTHESISED.md` Section 3-4 and
`OPEN_QUESTIONS_RESOLVED.md` Q1.

Five guardrails:

1. FFM-aware energy floor (30 kcal/kg FFM/day, Mountjoy 2014/2023).
2. ED-pattern lockout (multi-signal, goal-lock raises threshold).
3. Rapid-loss compressed upward gate (1-week instead of 2).
4. Protein cap via Morton 2018 when BF% unknown.
5. Adherence-quality gate before insight generation.

---

## 4. Voice and copy

Locked. See `CLAUDE.md` and `RESEARCH_FINDINGS_SYNTHESISED.md`
Section 7.

Jargon blocklist (extended): the original seven plus
`metabolic adaptation`, `training stimulus`, `stimulus-to-fatigue
ratio`, bare researcher surnames in surface copy.

Code correction owed before move #1:

- `src/lib/whyThisTemplates.js`: extend `JARGON_BLOCKLIST` and
  `checkJargon` tests.
- `src/lib/nutritionEngine.js`: replace the fabricated SportRxiv
  2024 citation with the Pontzer 2016 / Davy 2025 note.
- Surface copy audit across `src/screens/` for bare researcher
  surnames; move to `InfoTooltip`.

---

## 5. Database schema (all new tables)

**New doc required: `docs/DATABASE_SCHEMA_LOCKED.md`.**

Will name every new table introduced across moves 1-5, with columns,
types, RLS policies, indexes, foreign keys, and triggers. Tables in
scope:

- `foods` (canonical food records)
- `food_entries` (user logs)
- `daily_intake_rollups` (derived totals for engine reads)
- `custom_foods` (user-created)
- `saved_meals` (user-created meal templates)
- `recipes` and `recipe_ingredients`
- `food_favourites`
- `daily_water`
- `ed_pattern_flags`
- `engine_telemetry_daily`
- `tier_history`
- `engine_overrides` (B2B phase 2 groundwork)
- `sync_queue` (client-side mirror table for sync state)
- `photo_progress` (Complete-only)
- `body_composition_log` (Complete-only)

Plus RPC functions:

- `food_sync_pull(last_pulled_at)`
- `food_sync_push(changes_json)`
- `upgrade_tier(user_id, from_tier, to_tier, payment_token)`
- `clear_goal_lock(user_id)` (returns ED-flag detector to standard
  sensitivity)

---

## 6. Sync architecture

Locked at the principle level in `PRODUCTION_READINESS_LOCKED.md`
Section 1.

**New doc required: `docs/SYNC_ARCHITECTURE_LOCKED.md`.**

Will name:

- The `sync.js` module structure and registry pattern.
- Conflict resolution algorithm per table.
- Sync queue schema.
- Background sync triggers (foreground, network reconnect, debounced
  write, 15-minute interval).
- Multi-device pull-on-first-run mechanics.
- Soft-delete tombstone propagation.
- Sync telemetry events.
- Test matrix per table.

**LOCKED 6.1: Sync engine library.** Hand-rolled on top of existing
SQLite (expo-sqlite) + Supabase REST.

Reasoning: the current SQLite layer is working in production. A
sync-engine migration (WatermelonDB or PowerSync) is a multi-week
rebuild for a benefit that isn't yet justified by scale. Revisit at
v2 if hand-rolled sync hits scaling issues. The sync architecture
doc (Section 6) will name the queue pattern, conflict resolution, and
table registry that make the hand-rolled approach maintainable.

---

## 7. Food data strategy

**New doc required: `docs/FOOD_DATA_STRATEGY_LOCKED.md`.**

Will name the waterfall:

1. Local SQLite cache (user-logged + curated).
2. Bundled OpenFoodFacts UK snapshot (185K products, ~20-40 MB
   compressed at install).
3. Live OpenFoodFacts API (free, 1 call per scan rule).
4. USDA FoodData Central (free key).
5. CoFID bundled (3,300 UK generic foods, OGL v3.0).
6. OCR fallback at custom food entry.

Cost: £0 recurring. Hit-rate target: ≥85% UK supermarket coverage
out of the box, ≥90% after 30 days of OCR write-back contributions.

**LOCKED 7.1: Barcode scan timing.** Deferred to move #1.5, between
moves #1 and #2.

Reasoning: move #1 already bundles food schema, manual entry UI, and
the FFM floor guardrail. Adding camera, vision-camera, MLKit and the
OCR write-back loop doubles its surface area. Shipping manual entry
first validates the schema and engine integration with the smaller
blast radius; barcode and OCR land in move #1.5 once the foundation
is stable.

---

## 8. UI flows (screen-by-screen)

**New doc required: `docs/UI_FLOWS_LOCKED.md`.**

Will cover:

- Diary tab (new): date pager, four meal slots, macro rings, food
  rows, swipe-delete, long-press multi-select, copy-yesterday.
- Search tab (new): tabbed Recents / Favourites / Frequents / My
  Foods / My Recipes / Database.
- Scan flow (when barcode lands): full-screen camera modal, haptic
  on read, freeze frame, lookup, food detail sheet.
- Add Custom Food (new): per-100g + per-serving form.
- Food detail sheet (new): serving picker, quantity, meal assign.
- Insights tab (extended): 7-day macro adherence, weight trend
  smoothing, CSV export.
- You tab (extended): goal lock toggle, units (g/oz, ml/fl oz),
  reminders, tier management, sign-out, privacy.
- Train tab (extended): "Today's intake" card showing macros vs
  targets pulled from the same source.
- Body Metrics screen (extended): 7-day intake average line.
- Onboarding (extended): see Section 9.

Design system reuse: existing `theme.js`, `BrandMark`, `EmptyState`,
`InfoTooltip`. New: `MacroRings`, `MealSection`, `FoodRow`,
`ServingPicker`, `EntryRow`, `SourceChip`.

---

## 9. Onboarding sequence

**New doc required: `docs/ONBOARDING_SEQUENCE_LOCKED.md`.**

Locked flow (revisions to existing onboarding):

1. Welcome screen (unchanged).
2. Sign in or create account (unchanged).
3. **NEW: Article 9 explicit consent** ("Health and nutrition data
   consent"). Separate from ToS. Lists categories: weight, body
   composition, dietary intake, energy/recovery scores, ED-pattern
   detection signals. User must tick to proceed.
4. Basic stats (height, weight, sex, DOB) — unchanged.
5. Goal selection — unchanged structure, but:
6. **NEW: Goal lock screen** (only shown for "physique competition"
   or "advanced recomp"). Self-attested experience confirmation. Sets
   `goal_lock_advanced = true` on user record. Can be cleared from
   You tab later.
7. SCOFF screener (unchanged, position unchanged).
8. Activity level (unchanged).
9. Equipment + frequency (unchanged for training surface).
10. **NEW: Food logging intro** (one screen). Explains the food
    layer in two sentences. "Skip for now" available; user can
    enable later from Diary tab.
11. Notifications permission (unchanged).
12. First-run summary (unchanged).

Copy for the Article 9 consent and goal lock screens will be written
in the supporting doc with voice rules applied.

---

## 10. Trial cascade and subscription state

Locked at the structure level in `COMPLETE_TIER_SCOPE_LOCKED.md`.

**New doc required: `docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md`.**

Will cover:

- Trial state machine (every transition with triggers).
- `proGate.js` API: `isPaidTier`, `hasFeature`, `hasGoalUnlock`.
- `upgrade_tier()` RPC contract.
- Payment provider integration (depends on DECISION 2.2).
- Receipt validation flow.
- Cross-platform subscription state sync.
- Cancellation and refund handling.
- Grace period (3 days post-payment-failure before tier downgrade).
- Re-entry rules (a user who skipped cascade cannot re-enter; a user
  whose subscription lapses re-enters at the trial-expired state, not
  back into Complete).

---

## 11. Notifications strategy

**New doc required: `docs/NOTIFICATIONS_LOCKED.md`.**

Locked principles:

- All notifications respect a quiet-hours window (default 22:00 to
  07:00 local).
- ED-pattern flag fires in-app only, never push, never email. Push
  notifying someone about a possible eating disorder is the harm
  pattern.
- Cascade gate notifications fire at day 12, 14, 26, 28 of the
  trial.
- Daily check-in reminder: one per day, user-configurable time,
  default 19:00 local.
- Weekly check-in reminder: Sunday 18:00 local by default.
- Push provider: Expo Push (already wired) for v1. Move to FCM /
  APNs direct if Expo Push limits become a problem at scale.

**LOCKED 11.1: Email notifications at v1.** No. Push only for v1.
Email lands in v1.1 once the core flows are stable in production.

Exception: coach-facing emails are in scope from phase 2 launch
(trial-ending alerts at day 45/55/59, billing confirmations).
Coaches read email; clients react to push.

---

## 12. Privacy and consent

**New doc required: `docs/PRIVACY_CONSENT_LOCKED.md`.**

Will cover:

- Article 9 consent screen exact copy.
- Privacy policy revision (FTC HBNR notification language, named
  sensitive tables, retention periods per data type).
- Data export functionality (CSV at Pro and above, PDF share pack
  at Complete only).
- Account deletion path (existing flow, extended to wipe new
  tables).
- Incident response runbook for `ed_pattern_flags` breach scenario.
- Sentry scrub rules (already partially recorded in
  `PRODUCTION_READINESS_LOCKED.md`).

---

## 13. Performance targets

Locked. Repeated here for the single index.

| Metric | Target |
| --- | --- |
| Cold start to Diary visible | <1.0s |
| Search keystroke to first results (local) | <120ms |
| Search keystroke to first results (network) | <450ms |
| Barcode scan to "add" sheet (cache hit) | <250ms |
| Barcode scan to "add" sheet (cold lookup) | <1500ms |
| Diary write persisted locally | <30ms |
| Sync push 50 entries on 4G | <2s |
| Weekly engine run (server-side) | <300ms p95 |
| UK barcode hit rate after 30 days | ≥85% (free stack) |

---

## 14. Telemetry, dashboards, alerts

Locked at the principle level in `PRODUCTION_READINESS_LOCKED.md`
Section 3.

**New doc required: `docs/TELEMETRY_DASHBOARDS_LOCKED.md`.**

Will name every event, every dashboard panel, every alert threshold.

---

## 15. Testing strategy

Locked at the principle level in `PRODUCTION_READINESS_LOCKED.md`
Section 2.

**New doc required: `docs/TESTING_STRATEGY_LOCKED.md`.**

Will name the simulator scenarios, property-based test invariants,
snapshot test boundaries, E2E flow list, sync regression matrix.

---

## 16. Release plan

**New doc required: `docs/RELEASE_PLAN_LOCKED.md`.**

Phased release:

- **Phase A: Internal closed test continues** (current state). New
  builds go to internal testers as the moves land. No public users.
- **Phase B: Open beta opens at GA-minus-4 weeks.** Open beta
  pricing live. Waitlist invites going out (pending DECISION 2.1).
- **Phase C: Founders window opens at GA.** Open beta price
  conversions lock in. Founders pricing replaces open beta pricing
  for new signups. Standard 28-day cascade active.
- **Phase D: Standard pricing window opens at GA+12 weeks.**
  Founders pricing closes; founders signups keep their price as long
  as subscription stays active.

Move ship order (within Phase A → B transition):

1. Move #0 (immediate code corrections: blocklist extension, citation
   fix, surname audit).
2. Move #1 (food schema + manual entry + FFM floor).
3. Move #1.5 (barcode scan + OCR fallback).
4. Move #2 (ED-pattern detection).
5. Move #3 (upward gate compression).
6. Move #4 (differential paywall output).
7. Move #5 (three-tier infrastructure, cascade live).

Phase B can begin once moves #0 through #4 are stable in Phase A.
Phase C requires move #5 fully live.

---

## 17. B2B coach surface (phase 2)

**New doc required: `docs/B2B_COACH_PHASE_2_SCOPED.md`.**

Locked even though deferred so the phase 1 schema groundwork
(`engine_overrides` table, `coach_id` foreign keys) is correctly
shaped.

Will cover:

- Coach account model.
- Coach-client linking flow (one-time share URL with expiry, vs.
  Volyume B2B account model — pending DECISION 17.1 below).
- Coach dashboard layout (web app or in-app surface? — pending
  DECISION 17.2).
- Override mechanism (engine reads override at output, original
  feeds trends).
- Notification (in-app and email) of coach changes.
- Coach pricing model.

**LOCKED 17.1: Coach-client linking mechanism.** One-time share URL
with expiry, for phase 2 v1. Coach signs up to Volyume Coach, sends a
scoped link to each client. Client taps, signs in or creates a
Volyume account, and the link is established for the life of the
coach's subscription.

Coach account model upgrades to a full B2B account in phase 2 v2 if
pull justifies the build (multi-coach studios, agency accounts, role
permissions).

**LOCKED 17.2: Coach dashboard location.** Web app at
coach.volyume.app. Separate codebase optimised for the table-heavy
review workflow a coach needs.

Reasoning: every mobile-only coach platform has eventually shipped
web (Trainerize, TrueCoach). Coaches review 10 to 50 clients at a
time; that's a desktop workflow. Native mobile app for coaches lands
later if there's demand for on-the-go review.

**LOCKED 17.3: Coach pricing model.**

Principle: the coach pays. The client gets Complete tier free for the
duration of the active coach link. Charging the client twice (their
coach plus Volyume Complete) for the coach's convenience was the
wrong call; corrected to match industry norm (Trainerize, TrueCoach,
MyPTHub all charge the coach).

Coach price tiers:

| Tier | Price | Client cap |
| --- | --- | --- |
| Starter | £29.99/month | Up to 5 active clients |
| Pro Coach | £59.99/month | Up to 20 active clients |
| Studio | £119.99/month | Up to 50 active clients |
| Enterprise | Custom | 50+ active clients |

Each linked client gets Complete tier free for the life of the
active link. If coach billing pauses, client Complete entitlement
reverts to whatever they were paying personally (Pro, Free, or
self-paid Complete). Client data is preserved through the lapse.

**LOCKED 17.4: Coach trial structure.**

Coach migration is real work (2-4 weeks for a typical book of 10-20
clients). A 14-day trial like TrueCoach barely covers migration, let
alone evaluation. Locked trial:

- **Standard trial: 60 days**, no card required to start.
- Trial includes the full Studio tier (50-client cap) regardless of
  which tier the coach picks at trial end.
- Clients linked during the trial get Complete tier free for the
  trial duration.
- Trial-ending notifications at day 45, 55, and 59 (in-app and
  email; email matters for coaches).
- Auto-downgrade at trial end: coach picks tier or defaults to
  Starter. Clients above the new cap revert to non-linked status; data
  is preserved.

**LOCKED 17.5: Founding Coach programme.**

For the first 100 coach sign-ups during open beta plus the founders
window:

- **6 months free** instead of 60 days.
- **Lifetime 50% off** the published rate as long as subscription
  stays continuously active. Founding-coach rates: Starter £14.99,
  Pro Coach £29.99, Studio £59.99 per month.
- Featured in the coach directory at launch (directory itself is
  separately scoped; see migration tools below).

**LOCKED 17.6: Coach migration tools (phase 2 scope expansion).**

A trial is wasted without tooling. The phase 2 coach scope must
include, before the trial offer is published:

- Bulk client invite (paste email list; sends Volyume invites with
  pre-linked coach relationship).
- CSV import for client weight history and programme assignments.
- Programme templates applied to multiple clients at once.
- Exercise library import (CSV with mapping to Volyume's exercise
  registry).

Without these, even 60 days does not beat the migration cost of
leaving Trainerize or TrueCoach. With them, the trial becomes a
viable switching window.

---

## 18. Move-level integration plans

**New docs required, one per move:**

- `docs/MOVE_0_CODE_CORRECTIONS.md` (citation fix, blocklist
  extension, surname audit). Smallest doc, can ship first.
- `docs/MOVE_1_FOOD_FOUNDATION_AND_FFM.md` (food schema, manual
  entry, FFM floor).
- `docs/MOVE_1_5_BARCODE_AND_OCR.md` (camera, MLKit, write-back).
- `docs/MOVE_2_ED_PATTERN_DETECTION.md` (state machine, lockout
  copy, goal-lock interaction).
- `docs/MOVE_3_UPWARD_GATE_COMPRESSION.md` (engine math change,
  test additions).
- `docs/MOVE_4_DIFFERENTIAL_PAYWALL.md` (output block, paywall
  trigger, conversion copy).
- `docs/MOVE_5_TIER_INFRASTRUCTURE.md` (proGate extension, tier
  history, payment integration, cascade state machine).

Each will name every new file, every modified file, every new
Supabase migration, every new test file, and the acceptance
criteria.

---

## 18a. Budget posture (cross-cutting)

Locked. See `BUDGET_POSTURE_LOCKED.md`.

Headline: every third-party tool starts on its free tier; every
feature ships at MVP scope at v1; no speculative paid spend.
Photo cloud sync, refeed automation, body composition deep view,
share-pack PDF, and recipe URL importer defer to v1.1 to keep v1
lean. All five engine guardrails, Article 9 consent, FTC HBNR
language, Sentry, and account deletion are non-negotiable at v1
regardless of budget.

## 19. Explicit out-of-scope (do not build at v1)

Recorded so they aren't accidentally added by scope creep:

- AI photo logging (cost, accuracy, ED-amplification risk).
- Recipe URL importer (deferred to v1.1).
- Year of Fuel (food-adherence badges) — ruled out as ED-pattern
  accelerant. See Claude adjudication Section A.7.
- Adaptive macro algorithm beyond what the engine already does.
- Micronutrient dashboards beyond fibre, sodium, sugar.
- Social, community, friends features.
- Wearable HRV / sleep direct integration (out of v1 scope; HealthKit
  / Health Connect read-only for weight only, no nutrition writes).
- Internationalisation beyond British English at v1.
- Apple Watch app.
- Web app (besides the eventual coach dashboard in phase 2).

---

## 20. Decisions summary (all locked)

All eight open decisions resolved 2026-05-23.

| ID | Decision | Locked value |
| --- | --- | --- |
| 2.1 | Open beta access | Waitlist with rolling invites (200-500/week) |
| 2.2 | Billing provider | RevenueCat on native IAP |
| 6.1 | Sync engine library | Hand-rolled on SQLite + Supabase |
| 7.1 | Barcode scan timing | Move #1.5 (after move #1) |
| 11.1 | Email notifications at v1 | No (push only); v1.1 adds cascade gate emails. Coach emails in scope from phase 2 |
| 17.1 | Coach-client linking | One-time share URL with expiry |
| 17.2 | Coach dashboard location | Web app at coach.volyume.app |
| 17.3 | Coach pricing model | Tiered flat £29.99 / £59.99 / £119.99; client gets Complete free during link |
| 17.4 | Coach trial length | 60 days standard, full Studio tier |
| 17.5 | Founding Coach programme | First 100; 6 months free + lifetime 50% off |
| 17.6 | Coach migration tools | Bulk invite, CSV import, programme templates, exercise library import |

Open beta pricing (£0.99 / £1.99), founders window length (12 weeks
after open beta), and goal-lock signal threshold (3 instead of 2)
also locked previously.

---

## 21. What lands next

Once the open decisions in Section 20 are resolved:

1. I write the 13 supporting docs named above, in batches.
2. You review each, push back, lock or tweak.
3. We start work on Move #0 (the immediate code corrections — does
   not need any open decisions resolved).
4. Move #1 file-level plan goes deep enough that the implementation
   is a translation exercise, not a design exercise.
5. Move #1 ships to internal testing first, then the rest of the
   moves in order.

---

## Document tree

All locked docs:

**Strategy and direction**
- `BRIEF_C_CLAUDE_ADJUDICATION.md`
- `RESEARCH_FINDINGS_SYNTHESISED.md`
- `COMPLETE_TIER_SCOPE_LOCKED.md`
- `OPEN_QUESTIONS_RESOLVED.md`
- (this doc) `MASTER_VISION_AND_PLAN.md`

**Foundation (data, sync, food, posture)**
- `DATABASE_SCHEMA_LOCKED.md`
- `SYNC_ARCHITECTURE_LOCKED.md`
- `FOOD_DATA_STRATEGY_LOCKED.md`
- `BUDGET_POSTURE_LOCKED.md`
- `PRODUCTION_READINESS_LOCKED.md`

**User-facing**
- `UI_FLOWS_LOCKED.md`
- `ONBOARDING_SEQUENCE_LOCKED.md`
- `PRIVACY_CONSENT_LOCKED.md`
- `SUBSCRIPTION_AND_PAYMENT_LOCKED.md`
- `NOTIFICATIONS_LOCKED.md`

**Quality and observability**
- `TELEMETRY_DASHBOARDS_LOCKED.md`
- `TESTING_STRATEGY_LOCKED.md`
- `RELEASE_PLAN_LOCKED.md`

**Phase 2 scoped**
- `B2B_COACH_PHASE_2_SCOPED.md`

**Move-level integration plans**
- `MOVE_0_CODE_CORRECTIONS.md`
- `MOVE_1_FOOD_FOUNDATION_AND_FFM.md`
- `MOVE_1_5_BARCODE_AND_OCR.md`
- `MOVE_2_ED_PATTERN_DETECTION.md`
- `MOVE_3_UPWARD_GATE_COMPRESSION.md`
- `MOVE_4_DIFFERENTIAL_PAYWALL.md`
- `MOVE_5_TIER_INFRASTRUCTURE.md`
