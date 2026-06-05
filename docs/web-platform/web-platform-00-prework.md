# Web platform — Phase 0: pre-work (design identity + Supabase architecture)

Status: COMPLETE | Date: 2026-06-05 | Binding reference for all later phases.

This document is the foundation every web-interface proposal is built on. It is
extracted entirely from the repository, no external research, no fabrication.
Where a claim is made, the source file is named. Where this document and the
live code ever disagree, **the code wins** (the same rule `docs/DESIGN_SYSTEM.md`
applies to itself).

The binding instruction from `docs/DESIGN_SYSTEM.md` and `CLAUDE.md`: the web
interfaces must read as **extensions of the mobile app, a serious, private,
precision instrument**, not a separate product and never as AI-generated output.

---

## PART A — VOLYUME DESIGN IDENTITY

Sources: `src/styles/theme.js` (the live tokens, source of truth),
`docs/DESIGN_SYSTEM.md` (the governing doc, aligned to the theme 2026-05-30),
`CLAUDE.md` (voice rules).

### A1. What Volyume is (and is not)

From `docs/DESIGN_SYSTEM.md` § "What Volyume Is Not" and § "Product Feeling":

> Volyume is a serious, private, precision instrument for people who treat
> training as a craft. The reference feeling is **Whoop / Linear / Stripe**, a
> calm, dense, exact tool, not Headspace/Calm softness or gym-bro hype.

Not: a generic AI fitness app; a dark SaaS dashboard template; a gym-bro hype
product; a wellness/lifestyle brand; a social-first platform; a supplement
aesthetic; "RP Hypertrophy with different colours".

Product feeling: Elite, Serious, Precise (numbers are the hero), Scientific
(explainable, not magic), Premium (restraint over decoration), Fast
(performance is a design value), Minimalist-not-bland, Bodybuilding-specific,
Private and purposeful (no social feed, no leaderboard, no public profiles).

### A2. Colour palette (exact, from `theme.js`)

**Dark-only is a deliberate decision** (`DESIGN_SYSTEM.md` § Dark mode:
Whoop/Oura/Robinhood precedent; no light theme planned). The web must be
dark-first too (see Phase 5 for per-interface nuance).

Elevation ladder (depth by lightening layers, not shadows; a faint warm pull):
| Token | Hex | Use |
|---|---|---|
| `background` | `#0D0D0D` | app base, near-black not pure black (halation) |
| `surface` | `#191917` | cards, sheets (1st elevation) |
| `surfaceElevated` | `#222220` | card nested in a card |
| `surface2` | `#2A2A27` | inputs, chips, secondary cards |
| `surface3` | `#343431` | skeletons, fills, highest |
| `border` | `#6E6E6E` | 1px card edges/dividers (WCAG 1.4.11, 3.81:1) |
| `borderSubtle` | `#2E2E2C` | hairline dividers inside a card |

Accent, amber (the only non-achromatic colour outside semantic states):
| Token | Value | Use |
|---|---|---|
| `primary` | `#F5A623` | small marks, icons, key data values, text-on-dark |
| `primaryFill` | `#E08C0B` | large filled buttons (deepened, no optical vibration) |
| `primaryDim` | `#B45309` | pressed/disabled amber |
| `primaryBg` | `rgba(245,166,35,0.12)` | soft accent fills, active chips |

Semantic: `success #4CAF50`, `warning #FFC107`, `error #F44336` (each with a
`…Bg` soft fill + a colour-blind-safe swap). Text: `textPrimary #FFFFFF`,
`textSecondary #9E9E9E`, `textMuted #9B9B9B`, `textDisabled #727272`. Chart:
`chartLine #F59E0B`, `chartFill rgba(245,158,11,0.08)`. Scrim
`rgba(0,0,0,0.55)`. Trophy: `gold #FFD700`, `silver #C0C0C0`, `bronze #CD7F32`.

Accent discipline (binding): amber only on primary actions, active navigation,
and key data values. Everything else achromatic. **No decorative gradients,
orbs, or glows** — gradient is permitted only as a functional data encoding
(e.g. a volume bar MEV→MAV→MRV green→amber→red).

Accessibility swaps live in `applyAccessibility()` (`theme.js:170`): higher
contrast, Okabe–Ito colour-blind-safe (`success→#56B4E9`, `error→#CC79A7`),
and larger text (×1.2). The web component library must carry the same swaps.

### A3. Typography (exact, `theme.js` `type.*`; `DESIGN_SYSTEM.md` § Typography)

Platform system font (SF Pro / Roboto); Inter is a deferred optional upgrade.
The ramp is what matters and applies regardless. **Use the `type` roles, never
hand-assemble `{fontSize, fontWeight}`** (CI-enforced on mobile; the web library
must expose the same roles).

| Role | Size | Weight | Tracking | Line-height | Use |
|---|---|---|---|---|---|
| `display` | 40 | 800 | −0.5 | 1.2 | the one hero number per screen |
| `h1` | 32 | 700 | −0.5 | 1.2 | screen title when it is the focus |
| `h2` | 24 | 700 | −0.25 | 1.35 | section headers |
| `h3` | 20 | 600 | −0.25 | 1.35 | card titles |
| `title` | 17 | 600 | 0 | 1.35 | list-row titles, exercise names |
| `body` | 16 | 400 | 0 | 1.5 | running copy |
| `bodyStrong` | 16 | 600 | 0 | 1.5 | emphasised body, primary data labels |
| `label` | 13 | 500 | +0.2 | 1.35 | metadata |
| `caption` | 11 | 400 | +0.4 | 1.35 | timestamps, finest print |

**Numbers are content: `type.num(role)` applies `font-variant: tabular-nums`**
to every number read as data (weight, reps, %, kcal, dates). Described as "the
single highest-craft typography rule". Weight discipline: 900 hero number only;
700 headers/buttons/exercise names; 600 card titles/primary data; 500 secondary
labels/nav; 400 body. Emphasis by weight and colour, never italic or underline.
One `display` element per screen, max.

### A4. Spacing, radius, motion (exact, `theme.js`)

Spacing: `hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32,
xxxl 48`. Radius tiers: `xs 4` (micro), `sm 6`, `md 10` (inputs/chips/toast),
`lg 14` (cards/buttons), `xl 20` (modal/sheet top corners only), `full 999`
(pills), `circle(size)`. Cards are `radius.lg`; a modal corner is not a button
corner (tiered radii are deliberate).

Motion (`motion.*`): `micro 120ms`, `state 200ms`, `enter 320ms`
(emphasized-decelerate), `exit 220ms` (emphasized-accelerate), `hero 440ms`,
spring `{stiffness 150, damping 18, mass 1}` (≈ iOS 0.8 damping). Curves follow
Material 3. **Reduce-motion gates every animation.** Unified press feel
(scale 0.97 + opacity dip), once-on-focus content entrance, staggered list
entrance, restrained hero-number transitions (cross-fade value, never bounce).

### A5. Components (the primitives the web library must mirror)

From `DESIGN_SYSTEM.md` and the mobile component set (`src/components/`):
- **Card** (surface, 1px border, `radius.lg`, depth by tonal ladder not shadow).
- **Button**: Primary (`primaryFill`, dark bold label), Completion (`success`),
  Destructive (`error`), Secondary (`surface2` + 1px border), Tertiary/ghost
  (amber label). Min tap target 48px.
- **PressableCard** (the one spring press model app-wide).
- Charts: amber line + faint amber fill; `src/lib/chartGeometry.js` is the
  geometry layer (paddedDomain, plotPoints, tabular labels) — the web charts
  must reproduce its conventions (Phase 5 picks the web chart lib).
- Volume encoding: MEV→MAV→MRV mapped to muted→success→warning→error via
  `volumeStatusColor()`; the body heatmap and volume bars depend on it.

The "amber affordance" (the single amber control on an otherwise achromatic
row) is described as the brand; decorative icons on every row dilute it.

### A6. Voice and copy (binding, `CLAUDE.md` + `DESIGN_SYSTEM.md` § Microcopy)

Direct, precise, no fluff. Data before description. **British English**
(optimise, colour, behaviour; UK locale and timezone always). **No em dashes**
(full stop/comma/colon). **No AI tells** ("Let me", "ensure", "seamless",
"streamline", "leverage", "dive into", "robust" as filler, hedging clusters,
auto-generated three-bullet summaries). No emoji in functional UI. No
encouragement nobody asked for ("Great job!"); celebrations reserved for genuine
PRs. No fitness-jargon creep. Errors state the problem plainly ("Set not saved,
try again"). The whole `CLAUDE.md` "No AI fingerprint, ever" section applies to
**every web string** identically.

Design fingerprints to avoid (from `CLAUDE.md`): three-card dashboards with
parallel CTAs added to balance a page; generic icons as decoration on every
row; hero gradients/orbs/glows; centred-feature carousels with dots; over-
rounded corners; "coming soon" placeholders; checkmark-bullet lists everywhere;
2×2 stat grids by symmetry rather than importance. The test: would a lifter who
built this for themselves choose this arrangement?

### A7. App mark

Icon: rounded square / adaptive, a single strong `V` letterform or minimal
controlled-load glyph, `#0D0D0D` background, amber mark, Swiss precision
(Bloomberg terminal, not MyFitnessPal). No dumbbells/flames/lightning/muscle
silhouettes/gradients. Wordmark: `VOLYUME`, geometric sans, slightly wide
tracking, all caps, amber or white on dark, no tagline/gradient/shadow. The
shipped wordmark asset is `assets/volyume-wordmark.png`; the tagline used in app
is "Less thinking. More lifting." Brand name "Precision Coaching™" (founder
direction 2026-06-05).

---

## PART B — SUPABASE / BACK-END ARCHITECTURE

Sources: `supabase/*.sql` (60+ migrations), `supabase/README.md` (the migration
tracker), `src/lib/database.js` (local SQLite schema + cloud mirror), `src/lib/
sync*`, `src/lib/supabase.js`, `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`,
`docs/SYNC_ARCHITECTURE_LOCKED.md` (referenced), `docs/COMPLETE_TIER_SCOPE_
LOCKED.md`.

### B1. Stack

Postgres + Auth + Edge Functions on Supabase (project ref derived from
`EXPO_PUBLIC_SUPABASE_URL`). The mobile client is offline-first: it writes to
**local SQLite** and a **sync runner** (`src/lib/sync*`) pushes/pulls to
Supabase. A web app would talk to the **same** Supabase project directly (no
SQLite), reading live cloud rows.

### B2. Identity and ownership model (LOCKED, `IDENTITY_AND_OWNERSHIP_LOCKED.md`)

Four locked decisions govern everything:
1. **No anonymous mode** — every user has a real account from the first row.
2. **Sign-out wipes local SQLite** (web has no SQLite, so n/a there).
3. **Every user-scoped table is `PRIMARY KEY (user_id, id)`** (composite PKs,
   migration 018/021/024).
4. **No destructive cleanup of existing data.**
Hard rule: **never `UPDATE … SET user_id = ?`** — `user_id` is set at INSERT and
never changes (CI-grep enforced). Any web write path must obey this.

Auth: Supabase Auth (email/password + Google + Apple OAuth, per
`src/lib/supabase.js` and `ProOnboardingScreen`). Sessions are JWT; the mobile
app stores tokens in SecureStore. A web app uses `@supabase/ssr` cookies.

### B3. Entitlement / tier model

Two tiers: **Free** and **Pro** (the 3-tier "Complete" model was consolidated
to 2, migration 033; `COMPLETE_TIER_SCOPE_LOCKED.md` + founder override
2026-05-25). Tier lives on `users_profile` (+ `tier_history` table, migration
030). Pro is granted via Play Billing; the **`upgrade_tier_for_user` RPC**
(service-role only, migration 042) is called by the **Play Billing RTDN
webhook**. A trial **cascade** (migrations 031/038) governs trial→paid→free
transitions. Any web subscription management must route through the same RPC +
webhook, not write tier directly.

### B4. Core data tables (user-scoped, RLS own-rows, composite PK)

From `database.js` CREATE TABLE + the migrations. All carry `user_id` and RLS
that restricts every row to its owner (RLS hardening migrations 005/007).

- **Training:** `routines`, `routine_exercises`, `programmes`, `mesocycles`,
  `mesocycle_weeks`, `planned_muscle_volume`(+`_sync`), `workouts`,
  `workout_sets` (incl. unilateral `left_reps`/`right_reps`, migration 054),
  `workout_notes`, `exercises` (global library) + `custom_exercises`
  (migration 020), `exercise_goals`, `exercise_user_notes`.
- **Coaching:** `coach_outputs` (the Precision Coaching decision history),
  `weekly_checkins` / `weekly_checkins_v2` (incl. `cardio_adherence` m050,
  `steps_avg` m058), `adaptation_events`(+`_sync`), `ed_pattern_flags`
  (RED-S/ED safety, m017), `nutrition_targets` (m009).
- **Body + activity:** `body_metric_log` / `body_metrics`, `morning_weights`
  (m060 updated_at), `daily_steps` (m056), `daily_water` (m052 reconcile),
  `cardio_log` (m064).
- **Food:** `foods`, `food_entries` (meal slots incl. peri-workout m057 +
  numbered `meal_N` m059), `daily_intake_rollups`, `recipes` +
  `recipe_ingredients` (m046 soft-delete), `saved_meals`, `food_favourites`
  (fav/dislike `kind`, m048), `food_frequents` (m051 nightly pg_cron cache),
  `custom_foods` (barcode, m023).
- **System:** `user_body_profile`, `user_insights`, `sync_meta`,
  `pending_sync_ops`, `notification_preferences` (m044),
  `device_push_tokens` (m053), `engine_telemetry` / telemetry events,
  `consent_log` (m019/024), `account_deletions_log` (m039),
  `tier_history` (m030).

### B5. RLS, RPCs, Edge Functions

- **RLS:** own-rows on every user table (migrations 005, 007). A web client uses
  the **anon key** + the user's JWT; RLS enforces data isolation. The web admin
  and B2B interfaces need **explicitly scoped** access (see Phase 4 security):
  admin via the **service-role key (server-only)**; coach→client access needs a
  **new RLS policy / relationship table** that does not exist yet.
- **RPCs (SECURITY DEFINER, search_path pinned, m061):** `delete_user_data`
  (fallback erase, m062), `record_health_consent`, `record_engine_telemetry`
  (telemetry allow-list, extended through m063), `upgrade_tier_for_user`
  (m042), `refresh_food_frequents` / `food_frequents_pull` (m051),
  `record_account_deletion_started/completed` (m039).
- **Edge Functions** (`supabase/functions/`): `delete-account` (admin
  deleteUser + cascade), `send-push` (Expo fan-out from `device_push_tokens`),
  and the Play Billing RTDN webhook caller. **Push infrastructure already
  exists** (Expo tokens + send-push); the admin "compose & send notification"
  feature builds on it rather than from scratch.

### B6. Sync + conflict model (relevant to web↔mobile real-time)

`src/lib/sync/conflict.js`: per-table strategy from a registry, `last_write_wins`
(timestamp, robust to null), `server_wins`, or `merge` (per-column via
`column_updates_at jsonb`, m045, used for `users_profile`). Soft-delete +
`updated_at` touch triggers on the LWW tables. The web app, writing to cloud
directly, participates in the **same** model: a web write bumps `updated_at`;
the mobile app's next pull reconciles it (LWW). True real-time (Supabase
Realtime channels) is **not currently used** by the mobile app — it polls on
sync triggers, so "real-time sync" on web means either Supabase Realtime
subscriptions (new) or the same trigger-based pull (Phase 4 decides).

### B7. Telemetry + analytics substrate (feeds the admin dashboard)

A structured telemetry pipeline already exists: `record_engine_telemetry` with a
**server-side allow-list** of event names (signup funnel m036, lifecycle m037,
payments/cascade m038, notifications m040, consent m041, sync-conflict m043,
engagement workout_started/completed/plan_activated m063). `engine_telemetry`
rows + `TELEMETRY_DASHBOARDS_LOCKED.md` define the metric set. **The admin
analytics interface reads this existing pipeline**, it does not need a new
analytics system, it needs a UI over `engine_telemetry` + the user/tier tables.

### B8. What the web platform must NOT break (old-AAB contract)

`CLAUDE.md` release policy + every migration header: the current closed-test AAB
stays in place until the whole project is built; schema changes must remain
additive and keep the old build syncing (NULL-tolerant). **Any new table/column
the web needs must be additive and old-AAB-compatible**, the same discipline the
mobile migrations follow.

---

## PART C — IMPLICATIONS FOR THE WEB PLATFORM (carried into later phases)

1. **One design system, three skins.** A shared web component library built
   from the exact `theme.js` tokens and `type` roles, dark-first, amber-
   disciplined, tabular numerals, reduce-motion-aware. Same voice rules.
2. **The backend is mature, the web is a new client, not a new backend.** Most
   user-web features read existing tables. The genuinely new backend work is:
   (a) a **coach↔client relationship model + RLS** for B2B (does not exist),
   (b) **admin service-role access** patterns, (c) optionally Supabase Realtime,
   (d) a **notification composer** over the existing Expo push infra.
3. **Entitlement and identity are locked.** Web subscription/account flows route
   through the existing RPCs/webhook and obey the no-re-key, composite-PK,
   own-rows rules.
4. **Telemetry already exists** for the admin analytics; build the UI, not the
   pipeline.

---

## Open items to resolve in later phases
- Confirm exact `users_profile` columns + RLS policy text by reading
  migrations 001/004/005/007/030/033/045/055 line-by-line (done at Phase 4).
- Confirm whether any coach/B2B tables or `partners` concept already exist
  (grep so far: none, B2B is greenfield).
- Decide Supabase Realtime vs trigger-pull for web↔mobile freshness (Phase 4).

Next: Phase 1 — interface definitions (`web-platform-01-interface-definitions.md`).
