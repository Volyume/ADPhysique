# Web platform — Phase 6b: ADMIN CONSOLE (screen-by-screen)

Status: PROPOSAL — awaiting approval before Phase 6c (B2B) | Date: 2026-06-05 |
Depends on: Phases 0-5, 6a.

`admin.volyume.app`. The founder's internal **operations console**: see the user
base, watch the coaching engine, catch sync/data-integrity problems early, manage
the curated content, and support individual users. Single operator today (the
founder), built so a small team could use it later.

This is the one web surface that **does need new back-end**. The user web (6a)
reads the caller's own rows under RLS; the admin console reads *across* users, so
it cannot use the user RLS model. It needs an elevated, server-only access model
with a full audit trail. That model is the spine of this proposal and is treated
with the Rule 5 caution due permissions + database contracts.

Design language is the same instrument as 6a: dark `#0D0D0D`, amber-disciplined,
tabular numerals, facts over prose. Admin leans denser (more tables, more rows
per screen) because the operator wants data, not whitespace, but the same bans
hold: no gradients, no decorative-icon rows, no symmetry-for-its-own-sake.

---

## 0. Access model & security posture (the spine — read first)

Admin is not "the same login with a flag". It is a separate, gated surface.

- **Allow-list, not a role on the user record.** Admin identities live in a
  dedicated `admin_users` table (additive migration), keyed by `user_id`, with a
  granular capability set (read-only / support / content / billing / superadmin).
  Being a Volyume user grants nothing here.
- **Server-only service role.** Cross-user reads/writes run through the Next.js
  server (route handlers / server actions) using the Supabase **service role key,
  which never reaches the browser**. The browser holds only a short-lived admin
  session cookie. No service-role key, no cross-user query, ever runs client-side.
- **Second factor.** Admin sign-in requires the account's normal auth **plus** a
  second factor (TOTP). The closed-testing/solo phase can gate on a single
  allow-listed identity; the mechanism is built in from day one, not retrofitted.
- **Immutable audit log.** Every admin action that reads PII or writes anything is
  appended to an `admin_audit_log` table (who, capability used, action, target
  user/row, timestamp, before/after for writes). Append-only, never edited from
  the app. This is a hard requirement, not a nice-to-have.
- **Least privilege + locked-rule compliance.** Admin **cannot** bypass the locked
  back-end rules: no `UPDATE ... SET user_id` anywhere; subscription tier is
  changed **only** by the Play Billing webhook + `upgrade_tier_for_user` RPC, the
  admin console never writes tier; account deletion goes through the existing
  `delete-account` Edge Function. Admin surfaces and diagnoses these; it does not
  re-implement them.
- **Read-mostly by default.** The default capability is read + diagnose. Writes
  (content edits, support actions, flags) are separately granted, confirmed, and
  audited.

**New back-end for admin (all additive, tracked per Rule 6 in `supabase/README.md`):**
`admin_users`, `admin_audit_log`, a set of **service-role admin read views/RPCs**
(aggregate KPIs, per-user diagnostic bundles), and audited write paths for content
management and feature flags. No change to any user-facing table's shape. Every
migration: numbered, purpose, applied-local/remote flags, re-run-safe, rollback
notes, app-version dependency. The closed-testing build must keep working against
the new schema (additive only, Release policy 2026-05-24).

---

## Global chrome (every admin screen)

- **Left rail**, achromatic, amber on the active item: Overview, Users, Coaching,
  Data health, Billing, Content, Flags, Audit. Volyume wordmark + a small "ADMIN"
  tag so it is never mistaken for the user app.
- **Top bar**: environment badge (prod / staging), the admin's identity + active
  capability, the current UK date/time, a global user-search box (admin needs
  search-everything; the user app did not).
- Dense tables, sortable columns, tabular numerals, keyboard row-nav. Reduce-motion
  honoured. No bottom tab bar.

---

## 1. Overview — operations dashboard
- **Path**: `/` (admin root) · **Purpose**: the health of the whole system at a
  glance, the operator's morning screen.
- **Contents** (laid out by importance, not a KPI grid for symmetry):
  - **Users**: total, active (7d / 28d), new this week, churned, with small trend
    sparklines.
  - **Tier split**: Free / Pro counts, trials live, cascade/grace states.
  - **Coaching engine**: weekly reviews generated (last 7d), failures, median
    generation latency.
  - **Sync & data health**: current sync-error rate, conflicts reconciled, any
    integrity-invariant breach flagged red (see screen 4).
  - **Billing**: active subscriptions, MRR, this week's conversions/cancellations.
- **Data**: admin aggregate read RPCs over `users_profile`, `workouts`,
  `coach_outputs`, subscription state, sync telemetry. Read-only, service-role.
- **Design**: the few numbers that change the operator's day, large; everything
  else one click away. No encouragement copy, no vanity metrics dressed up.

## 2. Users — directory & per-user detail
- **Path**: `/users`, `/users/:id` · **Purpose**: find a user, understand their
  state, support them, all audited.
- **List**: searchable/filterable table (email, joined, tier, last active, last
  sync, plan state). Sort by any column. Filters: tier, activity, error-flagged.
- **Detail (`/users/:id`)** — a diagnostic bundle, read-first:
  - **Profile**: the calc inputs and preferences (`users_profile`,
    `user_body_profile`). PII access is itself audited.
  - **Subscription**: current tier, trial/cascade, renewal, the Play Billing
    event history for this user (read-only). No tier write here.
  - **Plan state**: active programme/mesocycle, week-of, last rebuild.
  - **Activity**: recent workouts, last diary day, last morning weight, last
    check-in, last sync timestamp + last sync error if any.
  - **Coaching**: this user's recent `coach_outputs` (what the engine told them).
  - **Support actions** (separately granted, each confirmed + audited):
    re-trigger a stuck weekly review; resend a transactional email; flag for
    follow-up; open the delete-account flow (which calls the existing Edge
    Function, the console never deletes rows directly). **No tier edits, no
    `user_id` rewrites, no raw row surgery.**
- **Design**: a left identity/subscription column, a wide activity/diagnostic pane.
  Dense, legible, every PII reveal logged.

## 3. Coaching engine — throughput & quality monitor
- **Path**: `/coaching` · **Purpose**: is Precision Coaching™ running correctly
  and saying sensible things?
- **Contents**:
  - **Throughput**: reviews generated per day/week, failures + reasons, latency
    distribution.
  - **Quality spot-checks**: a sampled feed of recent `coach_outputs` (anonymised
    by default, full detail behind an audited reveal) to eyeball the calls the
    engine is making, calorie/training/cardio adjustments, deload/diet-break flags.
  - **Anomaly flags**: outputs outside expected bounds (e.g. an implausible
    calorie swing), surfaced for review.
- **Data**: `coach_outputs` + engine telemetry, via admin read RPCs.
- **Design**: throughput chart up top, the sampled-review table beneath. This is
  how the founder keeps the signature feature honest at scale.

## 4. Data health — sync & integrity
- **Path**: `/data-health` · **Purpose**: catch the class of bug the locked rules
  exist to prevent, before users feel it.
- **Contents**:
  - **Sync error feed**: recent push/pull failures, grouped by type, with counts
    and trend. Distinguishes "acceptable old-build noise" (Release policy) from
    new breakage.
  - **Conflict/LWW stats**: composite-PK upserts reconciled, last-writer-wins
    resolutions, anything stuck.
  - **Integrity invariants** (the heart of this screen): automated checks that the
    locked ownership rules hold, every user-scoped table is `PRIMARY KEY
    (user_id, id)`, **no row has had its `user_id` rewritten**, no orphaned rows.
    A breach is a red, top-of-screen alert. This is the operational tripwire for
    the identity/ownership invariants in `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`.
  - **Migration status**: which migrations are applied local vs remote (mirrors
    `supabase/README.md`), flags drift.
- **Design**: alerts first (red only when real), feeds and counts below. The
  operator should learn about a design-level data problem here, not from a user.
- **Note**: this screen **diagnoses**; fixes follow the "diagnose before fixing
  data" rule, design fix first, then a tracked clean-down, never a silent suppress.

## 5. Billing & subscriptions
- **Path**: `/billing` · **Purpose**: revenue and entitlement health, read-only on
  the money.
- **Contents**: active subscriptions, tier split, MRR, trials and cascade/grace
  states, conversions and cancellations over time, the **Play Billing webhook
  event log** (the source of truth for tier), refunds/chargebacks as reported by
  the store. Per-user drill-through links to the user detail.
- **Locked rule, restated**: tier is set **only** by the Play Billing webhook +
  `upgrade_tier_for_user` RPC. This screen **reads** subscription state and the
  webhook event stream; it never writes tier and offers no "grant Pro" button that
  bypasses the store path. A genuine comp/grant, if ever needed, must go through
  the sanctioned entitlement mechanism, not a console row edit.
- **Design**: revenue summary up top, the event log as a dense audited table.

## 6. Content & library management
- **Path**: `/content` · **Purpose**: maintain the curated data the app depends on.
- **Contents** (each write versioned + audited):
  - **Food database**: the curated foods (the answer to MFP's inaccuracy, Phase 2),
    search/add/edit/retire entries, with macro QA. Changes versioned so a bad edit
    is reversible.
  - **Exercise library**: movements, muscle mappings, equipment, the data the plan
    generator and the volume heatmap rely on.
  - **Training-science parameters**: the MEV/MAV/MRV landmarks and related
    constants. **Runtime-critical**: these feed the coaching engine and the
    sanctioned volume bands, so edits are gated, reviewed, audited, and ideally
    staged before prod. Treated with Rule 5 caution.
  - **Notification templates**: the cross-device copy, kept in Volyume voice (the
    no-AI-tells, British-English, no-em-dash rules apply to anything shipped here).
- **Design**: a library list + an edit pane with a visible version/audit trail.
  Destructive/retire actions isolated and confirmed.

## 7. Feature flags & runtime config
- **Path**: `/flags` · **Purpose**: controlled rollout and kill switches.
- **Contents**: the runtime flags (e.g. gating the web surfaces themselves, or a
  new engine behaviour), with on/off, audience/rollout %, and a clear **kill
  switch** per flag. Every change audited (who, when, from→to).
- **Design**: a flat, scannable flag table. No clever UI, this is a safety control.
- **Note**: flags are operational levers, not a way to bypass the locked rules.

## 8. Audit log
- **Path**: `/audit` · **Purpose**: the immutable record of everything admin did.
- **Contents**: append-only feed of admin actions, filterable by admin, capability,
  action type, target user, and date. PII reveals, support actions, content edits,
  flag flips, all here. Exportable for review.
- **Design**: a dense, filterable table, read-only by construction. The app cannot
  edit or delete audit rows; that is enforced at the database (RLS/grants), not
  just the UI.

---

## New back-end required for admin (summary)
Unlike the user web, admin **does** add contracts, all additive and tracked:
1. `admin_users` (allow-list + capabilities).
2. `admin_audit_log` (append-only, DB-enforced immutability).
3. Service-role **admin read** views/RPCs (cross-user aggregates + per-user
   diagnostic bundles), server-only.
4. Audited **write** paths for content management and feature flags.
5. The integrity-invariant checks behind Data health (scheduled or on-demand).

No change to any existing user-facing table's shape. Every item gets a numbered
migration with the Rule 6 header and a `supabase/README.md` entry, and must keep
the current closed-testing build working (additive, Release policy 2026-05-24).

## What admin deliberately is NOT
- Not a place to edit tier (store webhook + RPC only).
- Not a place to rewrite `user_id` or do raw row surgery on user data.
- Not a second deletion path (the `delete-account` Edge Function is the only one).
- Not a marketing/CMS suite. It manages the data the app runs on, nothing more.
- Not multi-tenant B2B coaching (that is Phase 6c, a different access model again).

## How this earns its keep
1. **Catches design-level data bugs early** — the integrity tripwire operationalises
   the exact incident class the locked rules were written after.
2. **Keeps the signature feature honest** — coaching throughput + quality spot-checks
   at scale.
3. **Real support without rule-breaking** — diagnose and act through sanctioned
   paths only, every touch audited.
4. **Maintains the curated edge** — the food/exercise/science data that differentiates
   Volyume stays clean and versioned.

---

**STOP — awaiting approval of the admin console proposal before producing Phase 6c
(B2B). No application code until a build is approved.**
