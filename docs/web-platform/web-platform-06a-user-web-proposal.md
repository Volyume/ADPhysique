# Web platform — Phase 6a: USER WEB APPLICATION (screen-by-screen)

Status: PROPOSAL — awaiting approval before Phase 6b (admin) | Date: 2026-06-05 |
Depends on: Phases 0-5.

`app.volyume.app`. The companion **analysis + management cockpit** for existing
Volyume users. Thesis (Phase 3): the category treats web as an afterthought;
Volyume's web is **richer than mobile** for analysis, and never the active-workout
logger. Dark-only, amber-disciplined, tabular numerals, Volyume voice (Phase 5).

Global chrome (every logged-in screen):
- **Left rail** (collapsible), achromatic, amber only on the active item:
  Dashboard, Plan, Progress, Diary, Coaching, Account. Volyume wordmark top.
  No decorative icons, the active-state amber bar is the affordance (Phase 0 §A5).
- **Top bar**: current date (local, UK), a quiet sync/“last updated” line, the
  avatar menu. No search-everything bar unless a screen needs it.
- **No bottom tab bar** (that is mobile). Keyboard: `g d/p/r/i` to jump sections.
- Every number tabular; one `display` element per screen; reduce-motion honoured.

Auth: `@supabase/ssr` cookie session, same account as mobile. All reads are the
user's own rows under RLS (Phase 4). No screen here writes a workout set.

---

## 1. Landing / home — logged out
- **Path**: `/` · **Purpose**: explain Volyume, convert to sign-up, sign-in.
- **Contents**: a single restrained hero, the wordmark, one line ("Less
  thinking. More lifting."), one sentence on what Volyume is (precision training
  + nutrition coaching, private), and **one** primary CTA (Create account) + a
  text Sign in. Below: three honest capability strips (not three parallel
  marketing cards), the Precision Coaching™ engine, the depth of progress data,
  privacy by design, each a short factual line, no checkmark walls. Footer:
  privacy, terms, the "built on published training science" credential line
  (the legally-safe one from the mobile app).
- **Design**: `#0D0D0D`, generous whitespace, large `display`/`h1`, amber only on
  the CTA. **No hero gradient/orbs, no carousel-with-dots** (Phase 5 bans). The
  only marketing-leaning surface in the whole app, still unmistakably the brand.
- **Copy**: in voice, no hype, no AI tells. Sign-up routes to the existing
  Supabase auth (email/Google/Apple).
- **Data**: none (public). **New infra**: none.
- **Vs competitors**: most fitness landing pages are template SaaS splashes; this
  reads like the instrument it sells (the DESIGN_SYSTEM "Bloomberg, not MFP" bar).
- **Connects to**: sign-up/sign-in → Dashboard.

## 2. Dashboard — logged in
- **Path**: `/dashboard` · **Purpose**: today's state + the jump-off to depth.
- **Contents** (progressive disclosure, Whoop pattern, Phase 2):
  - **Hero strip**: the one `display` figure that matters today, e.g. current
    weight-trend rate (EWMA, kg/wk) with on-target/off-target colour, or the
    week's training status. One hero, not four.
  - **Active plan card**: plan name, "Week X of Y · phase", next workout name +
    exercise count, a "view plan" link (no "start workout", that's mobile).
    Reads `programmes`/`routines`/`mesocycles`/`mesocycle_weeks`.
  - **This week**: sessions done vs planned, weekly volume sparkline, last
    session summary. Reads `workouts`/`workout_sets`.
  - **Precision Coaching™ strip**: the latest weekly review headline + "read the
    full review" (→ Coaching). Reads `coach_outputs`.
  - **Nutrition strip**: today's kcal/protein vs target, a small ring. Reads
    `daily_intake_rollups`/`nutrition_targets`.
- **Design**: a deliberate, asymmetric layout by importance (not a 2×2 grid by
  symmetry, Phase 5). Hero left/top, supporting cards in a content column.
- **Copy**: facts, no encouragement ("4 of 4 sessions", not "Great week!").
- **New infra**: none. **Vs**: richer and calmer than Hevy's web home; a single
  hero like Whoop's recovery score, but training-led.

## 3. Plan — view & manage
- **Path**: `/plan` (active), `/plan/history`, `/plan/update`
- **Purpose**: read the current plan in full; review history; change goals/rebuild.
- **Contents**:
  - **Active plan**: the mesocycle with each training day expanded, exercises
    with sets × rep-range × rest, the muscle-coverage per day, the "Week X of Y"
    progress, the deload week marked. Big-screen affordance: **all days visible
    at once** (mobile shows one at a time).
  - **Why this plan**: the coach's plan rationale in full prose (the mobile
    `whyThis`), readable at size.
  - **History**: past blocks/mesocycles with their outcomes (block reflection
    data), `mesocycles`/`coach_outputs`.
  - **Update your plan**: the goal/phase/schedule/equipment/experience change
    flow (the mobile "Update your plan" with the dropdowns), rebuilds plan +
    nutrition targets, history kept. Writes via the existing plan-gen path under
    the user's `user_id`.
- **Design**: a left plan-day index + a wide detail pane; exercise rows are dense
  but legible, the amber affordance on the active day. Reuses the volume-coverage
  encoding.
- **Vs**: no competitor shows an *explained, autoregulated, division-specific*
  plan, this is Volyume-only depth (Phase 3).
- **Explicitly excluded**: starting/logging a workout (mobile-only). The plan is
  read + manage only.

## 4. Progress — the analysis cockpit (the flagship)
- **Path**: `/progress` with sub-views `/progress/lifts`, `/volume`, `/body`,
  `/cardio`, `/prs`, `/year`
- **Purpose**: the single most important thing to get right (Phase 3), the depth
  the phone can't show.
- **Contents**:
  - **Lift progress**: a large multi-series line chart per lift (estimated 1RM +
    top-set weight) over a long window, lift selector, hover for exact values.
    Reads `workout_sets` via the existing progress computations.
  - **Volume**: the **full-size body heatmap** + per-muscle weekly volume bars vs
    MEV/MAV/MRV (the sanctioned green→amber→red band), side-by-side muscle
    comparison. Reads `planned_muscle_volume` + computed weekly volume.
  - **Body**: morning-weight **EWMA trend with the coach's target band overlaid**
    across months, plus body-fat / measurement trends. Reads `morning_weights`,
    `body_metric_log`.
  - **Cardio**: sessions, minutes, trend. Reads `cardio_log`.
  - **PRs**: a sortable, filterable PR **table** (lift / date / est-1RM), a real
    desktop table, not phone cards.
  - **Year of lifts**: the annual summary at size.
- **Design**: chart-first, each view a hero chart + a supporting table; amber
  series + muted comparison series (accent discipline); tabular labels; hover
  tooltips; progressive disclosure (headline → trend → detail). All via the
  shared `chartGeometry.js` rendered as SVG (Phase 4/5).
- **New infra**: none (all data exists). Optionally a couple of read RPCs to
  shape long-window aggregates server-side for speed.
- **Vs**: directly beats Whoop's and MFP's thin desktop (Phase 2), this is the
  whole reason the web app exists.

## 5. Diary — food log view & management
- **Path**: `/diary` (`?date=YYYY-MM-DD`, local day-key)
- **Purpose**: review and edit the food log on a real screen (Cronometer-grade,
  not MFP-afterthought, Phase 2).
- **Contents**: a day view with meal sections (incl. peri-workout / numbered
  meals), each entry with macros, the day's totals vs targets (rings + numbers),
  water, a date navigator + a week strip. **Add/edit/remove food entries**
  (search the curated DB, set quantity, assign meal) and water. Macro/target
  context from `nutrition_targets`. Reads/writes `food_entries`,
  `daily_intake_rollups`, `daily_water` (composite-PK upsert, `updated_at` touch;
  mobile reconciles via LWW, Phase 0 §B6).
- **Excluded**: barcode scan / label OCR (camera, mobile-only); manual search +
  add is the web path.
- **Design**: a wide two-column day (meals left, totals/targets right), dense but
  calm; the amber affordance on "add". Tabular macro columns.
- **Vs**: a genuine desktop diary like Cronometer, but legible (answers
  Cronometer's overwhelm) and on curated data (answers MFP's inaccuracy).

## 6. Coaching — Precision Coaching™ review + history
- **Path**: `/coaching`, `/coaching/history`
- **Purpose**: read what the coach changed and why; the full decision history.
- **Contents**: the latest weekly review in full (headline, what's working,
  off-track items, focus, the calorie/training/steps/cardio notes, the "why this
  week" rationale, the deload/diet-break notes), then the chronological
  **decision history**, every past call and its reason. Reads `coach_outputs`.
  Also surfaces the weekly check-in status (when the next one is due) and links to
  do it on mobile (the check-in is a mobile task; web shows the output).
- **Design**: a readable prose column (max ~70ch) for the rationale, with the
  numeric adjustments in tabular call-outs. Progressive: this week expanded,
  history collapsed.
- **Vs**: **no competitor has this** (an explainable, stored coaching record),
  Volyume's signature web surface alongside Progress.

## 7. Account & profile
- **Path**: `/account` (profile), `/account/goals`
- **Purpose**: personal details, goals, preferences.
- **Contents**: name, units, biological sex/age/height (the calc inputs), diet
  preference, goal/phase summary (link to /plan/update to change), training
  preferences. Reads/writes `users_profile`/`user_body_profile` (per-column merge,
  m045; never re-key `user_id`).
- **Design**: a focused settings layout (label + control rows), not a template
  dashboard. Functional copy.

## 8. Subscription management
- **Path**: `/account/subscription`
- **Purpose**: plan status, billing, upgrade, cancel, export.
- **Contents**: current tier (Free/Pro), trial/cascade state, renewal info,
  upgrade CTA (routes to the existing entitlement path; **tier is changed only by
  the Play Billing webhook + `upgrade_tier_for_user` RPC**, the web never writes
  tier directly, Phase 0 §B3), manage/cancel, **data export** (CSV/JSON, the
  desktop-natural job), and the health-data consent + delete-account controls
  (via the existing `delete-account` Edge Function).
- **Design**: clear status block first, actions below; destructive actions
  isolated (mirrors the mobile Settings discipline).
- **Note**: billing display reads subscription state; purchase itself follows the
  locked payment model (store billing), the web surfaces and manages, it does not
  re-implement payments.

## 9. Settings
- **Path**: `/settings`
- **Purpose**: all configurable preferences (the web-relevant subset of the
  mobile Settings).
- **Contents**: notifications (preferences that make sense cross-device, written
  to `notification_preferences`), display/accessibility (the larger-text/contrast/
  colour-blind swaps applied to the web tokens), privacy & data (consent, OFF
  sharing, usage data, privacy policy), about. Mirrors the restructured mobile
  Settings categories. Excludes mobile-only items (health-app permissions, etc.).
- **Design**: the same category-landing → focused-page pattern the mobile
  Settings now uses.

---

## New back-end required for the user web: **none of substance**
Everything reads existing tables; writes (diary, profile, plan rebuild) use
existing paths and obey the locked rules. Optional, not required for launch: a
few read-only aggregate RPCs for long-window Progress charts, and Supabase
Realtime for live cross-device updates.

## What the user web deliberately omits (mobile-only)
Active workout logging, barcode/label camera, progress-photo capture, push-driven
nudges, sensor/Health reads. The web may *show* an in-progress session read-only;
it is never the logging surface (Phase 1).

## How this beats the field (summary, evidenced in Phase 2)
1. **Progress is richer than mobile** — the category's blind spot (Whoop/MFP web
   are thinner than their apps).
2. **Coaching review + decision history** — depth no competitor's data supports.
3. **A genuine desktop diary** — Cronometer-grade but legible, on curated data.
4. **One instrument, faithfully** — the Volyume identity (dark, amber, numbers-
   as-hero) is already the premium bar the references embody.

---

**STOP — awaiting approval of the user web proposal before producing Phase 6b
(admin). No code until the proposal is approved.**
