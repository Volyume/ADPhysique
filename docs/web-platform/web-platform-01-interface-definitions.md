# Web platform — Phase 1: interface definitions

Status: COMPLETE | Date: 2026-06-05 | Depends on: Phase 0 pre-work.

Defines the precise scope of the three web interfaces, derived from the existing
mobile feature set (`src/screens/`, `src/lib/`) and the locked architecture in
Phase 0. No external research here, this is scope, not benchmarking (that is
Phase 2). The guiding principle from Phase 0: the web is **a new client on a
mature backend**, an extension of the mobile app, not a separate product.

The mobile surface, for reference (from the repo): Train (home, active workout,
build workout, plans, plan library, manual/mesocycle builders), Progress
(analytics, consistency, lift progress, volume heatmap, year-of-lifts, cardio
history, body metrics), Diary (food, water, cardio line), You (Precision
Coaching / coach output + held-decision history, weekly check-in, nutrition
targets, goal lock, settings sub-pages), and the Pro onboarding wizard.

---

## INTERFACE 1 — USER WEB APPLICATION (`app.volyume.app`)

A companion web app for existing Volyume users. The mobile app is the primary
surface; the web is the **big-screen analysis and management** surface.

### What the web does that mobile already does (parity, re-skinned for desktop)
- **Plan viewing**: the active plan, every workout day, exercises with sets/
  reps/rest, the mesocycle "Week X of Y" status. Reads `programmes`,
  `routines`, `routine_exercises`, `mesocycles`, `mesocycle_weeks`.
- **Progress**: PRs, lift progress, weekly volume by muscle, body-weight trend,
  consistency, cardio history. Reads `workouts`, `workout_sets`,
  `morning_weights`, `body_metric_log`, `cardio_log`, `weekly_checkins_v2`.
- **Diary viewing/editing**: the food log by day + meal slot, water, the day's
  macros vs targets. Reads `food_entries`, `daily_intake_rollups`,
  `daily_water`, `nutrition_targets`.
- **Precision Coaching™ output**: the weekly review, what changed and why, the
  full decision history. Reads `coach_outputs`.
- **Profile, goals, preferences, subscription, settings** management.

### What the web uniquely enables (its reason to exist)
- **Desktop-class data visualisation.** The mobile charts are necessarily
  small; on web the progress charts get a real canvas: multi-year lift curves,
  a full-body volume heatmap at size, side-by-side muscle-group comparison,
  a dense PR table sortable by lift/date/estimated-1RM, the morning-weight EWMA
  trend with the coach's target band overlaid across a long window. This is the
  single strongest web-specific value: **the depth of the existing data made
  legible on a large screen.**
- **Plan management at desk**: review and reorganise the plan, read the coach's
  rationale in full prose, change goals/phase and rebuild (the "Update your
  plan" flow) with the comfort of a keyboard and a wide layout.
- **Account & subscription management** in a proper settings surface (billing
  status, manage/cancel, data export, privacy/consent) — easier on web than a
  phone for the "sit down and sort my account" job.
- **Data export / print**: CSV export and a printable training/nutrition
  summary, a genuinely desktop job.
- **SEO-able logged-out marketing/landing** at the root (the only public-
  indexed surface; everything behind auth is private by design).

### What must NOT be on the web (mobile-only by nature)
- **Active workout logging.** Logging sets at the rack is a phone-in-hand,
  one-thumb, haptic, offline task (`ActiveWorkoutScreen` + the "COMPLETE SET is
  the largest button" rule). It is wrong on desktop and must stay mobile-only.
  The web may *show* an in-progress session read-only, but never be the logging
  surface.
- **Barcode scanning / label OCR / progress photos** (camera-bound).
- **Push-notification-driven nudges** (mobile OS feature).
- Anything that depends on the phone's sensors (steps via Health, motion).

### Sync with mobile (from Phase 0 §B6)
The web writes to the **same** Supabase tables under the user's JWT + RLS; a web
edit bumps `updated_at`, the mobile app reconciles on its next pull via the
locked LWW/merge strategy. Freshness model (Supabase Realtime vs trigger-pull)
is decided in Phase 4; for a launch, read-live + last-write-wins is sufficient,
real-time push to an open mobile app is a Phase-4 enhancement.

---

## INTERFACE 2 — ADMIN & SYSTEM MANAGEMENT (`admin.volyume.app`)

Internal tool for the Volyume team. Access-controlled to staff only (Phase 4
security). Reads/writes via the **service-role key, server-side only**.

### Scope (each item maps to existing data/infra from Phase 0)
- **Dashboard**: headline metrics — total users, active (DAU/WAU/MAU), new
  signups, Pro vs Free split, trial cascade state counts, revenue proxy, churn.
  Source: `users_profile`, `tier_history`, `engine_telemetry` (signup funnel
  m036, lifecycle m037, engagement m063, payments m038).
- **User management**: search/filter the user list; open an individual user;
  view their tier, activity, consent state, deletion state; **suspend, delete,
  adjust subscription** (delete via the existing `delete-account` Edge Function;
  tier via `upgrade_tier_for_user` RPC, never a raw UPDATE). View-but-respect-
  privacy on personal data (GDPR scoping, Phase 4).
- **Push notification management**: compose, segment-target (all / Pro / Free /
  inactive / cohort), schedule, send, and **measure delivery + open rates**.
  Builds directly on the existing **Expo push pipeline** (`device_push_tokens`
  m053 + the `send-push` Edge Function) and the notification telemetry
  (`notification_sent/tapped/failed` m040). This is the highest-leverage admin
  feature and the infra already half-exists.
- **App configuration / content management**: the **exercise + cardio library**
  (`exercises`, cardio activities), **plan templates / plan library**, and
  **feature flags** — content that should change without an app release.
- **Analytics**: DAU/MAU, conversion funnel (signup→onboard→Pro), feature
  usage, retention, revenue trends — a UI over the **existing telemetry
  pipeline** (Phase 0 §B7), not a new analytics system.
- **Support tools**: look up an individual user's data to diagnose a sync/coach
  issue, reset an account, re-trigger a deletion, inspect their last telemetry/
  errors (ties to the Sentry + `engine_telemetry` substrate).

### What admin must respect
- The locked rules: no `UPDATE … SET user_id`; tier only via the RPC; deletion
  only via the Edge Function/RPC; consent audit trail (`account_deletions_log`,
  `consent_log`) is never wiped. GDPR: staff access to personal data is logged
  and scoped (Phase 4).

---

## INTERFACE 3 — B2B COACH PLATFORM (`coaches.volyume.app`)

The greenfield piece. A coach manages multiple clients who use Volyume. **This
is the only interface that needs genuinely new backend modelling** (Phase 0
§C2: no coach/client tables exist today).

### Scope
- **Client management**: a coach adds/invites a client (an existing Volyume
  user consents to be coached, or the coach provisions a seat the user claims);
  see the client list with status, last-active, and a compliance summary.
- **Individual client view**: full read of that client's training, progress,
  check-ins, food-diary compliance, cardio/steps compliance, body-weight trend
  — i.e. a coach-facing read of the same rich data the user sees, scoped by a
  **new coach↔client relationship + RLS policy**.
- **Plan assignment & customisation**: assign a Volyume plan to a client,
  customise it (exercise swaps, volume, days), push it to their account. Reuses
  the existing `planEngine` + plan tables, with the coach as the author.
- **Communication**: notify/message a client or a group (rides the same Expo
  push infra; in-app messaging is a scope decision for Phase 3/6).
- **Progress monitoring & alerts**: surface clients who missed sessions, are
  off their weight trend, flagged on recovery, or stopped logging — the coach's
  daily triage. Built from the same signals the Precision Coach already
  computes.
- **Billing / seats**: a coach subscription tier with a **client-seat** model
  (coach pays per active client, the dominant B2B pattern, confirmed in Phase 2
  research). New billing surface, routed through the payment infra.
- **Branding / white-label**: whether a coach can put their name/logo on the
  client-facing experience. Decided in Phase 3 (gap analysis) — research-led,
  not assumed.

### Volyume's unique B2B advantage (to be evidenced in Phase 3)
Volyume already has what most coaching platforms lack: **division-specific
programming** (Men's Physique/Classic/Bikini/Wellness/Figure via the plan
engine), an **explainable Precision Coaching™ engine** (autoregulation, RED-S/
FFM safety, written rationale per decision), and **deep structured check-in +
compliance data**. A coach platform built on that is materially differentiated
from the generic "assign a plan + message" tools. Phase 2/3 will evidence this
against Trainerize/TrueCoach/Everfit et al. with citations before it is claimed
as a positioning.

---

## Cross-cutting decisions recorded here (carried to Phase 4)
- **Three separate deployments on subdomains** (`app.`, `admin.`, `coaches.`),
  not one app with route separation, for blast-radius/security/independent
  deploys (rationale in `docs/HOSTING_RECOMMENDATION.md` and re-confirmed in
  Phase 4). Admin and B2B must never share a bundle with the public user app.
- **Shared component library** from the `theme.js` tokens powers all three; the
  skins differ in density/tone (Phase 5), not in brand.
- **New backend, minimal and additive**: coach↔client relationship + RLS (B2B),
  admin service-role access, notification-composer plumbing, optional Realtime.
  Everything else reads existing tables.

Next: Phase 2 — deep competitor research (live web, cited):
`web-platform-02-competitor-research.md`.
