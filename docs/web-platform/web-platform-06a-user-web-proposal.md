# Web platform — Phase 6a: USER WEB APPLICATION (screen-by-screen)

Status: APPROVED & LOCKED (founder, 2026-06-05) | Date: 2026-06-05 |
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
- **New infra**: no new write contracts. **Sanctioned** (founder, 2026-06-05): a
  small set of **read-only aggregate RPCs** to shape long-window Progress data
  server-side (est-1RM-per-lift series, weekly volume per muscle, EWMA body
  trend), so the browser fetches summarised rows instead of full set history.
  Read-only, RLS-scoped to the caller, additive, safe to re-run. Detailed in the
  deep-dive appendix below.
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

# Appendix — deep detail on the four core screens

Approved direction (founder, 2026-06-05): 6a locked as-is, with a second pass of
depth on Progress, Coaching, Plan and Diary, and read-only aggregate RPCs
sanctioned. Scope lines confirmed: logging stays mobile-only; no new back-end of
substance; read aggregate RPCs allowed. This appendix expands those four screens
to build-brief depth. It adds nothing to scope, it sharpens what is already there.

## A. Progress cockpit — sub-view by sub-view

The flagship. The rule across every sub-view: one hero chart, a supporting table
beneath, amber for the primary series, a single muted series for any comparison,
tabular axis labels, hover for exact values, headline → trend → detail.

- **`/progress/lifts`** — per-lift est-1RM and top-set weight over a long window.
  - Controls: lift selector, window (8w / 6m / 1y / all), an optional second lift
    as the muted series.
  - Chart: est-1RM line (amber) + top-set markers; hover gives date, weight, reps,
    est-1RM. A faint band for the working range.
  - Table below: every qualifying set for the window, sortable by date / weight /
    est-1RM, with the session it came from.
  - Reads: `workout_sets` joined to `workouts`; long windows via the
    `lift_progress` read RPC (below).
- **`/progress/volume`** — the full-size body heatmap as the hero, per-muscle
  weekly bars vs MEV/MAV/MRV beneath.
  - Heatmap: front/back body, each muscle shaded by the week's volume against its
    landmark band (green within target, amber approaching MRV, red over). The
    sanctioned encoding, at desktop size, all muscles legible at once.
  - Bars: weekly sets per muscle with MEV/MAV/MRV reference lines; a muscle picker
    to pin two or three for side-by-side.
  - Reads: `planned_muscle_volume` for landmarks + computed actual weekly volume
    via the `weekly_muscle_volume` read RPC.
- **`/progress/body`** — morning-weight EWMA trend with the coach's target band
  overlaid, across months.
  - Chart: raw morning weights as faint dots, the EWMA line (amber) on top, the
    coach's target-rate band as a shaded corridor; on/off-target reads at a glance.
  - Secondary: body-fat and measurement trends (waist, etc.) on the same time axis.
  - Reads: `morning_weights`, `body_metric_log`; EWMA via the `body_trend` read RPC
    so the corridor maths is server-side and identical to mobile.
- **`/progress/cardio`** — sessions, minutes, and trend from `cardio_log`; a simple
  hero line (weekly minutes) + a session table.
- **`/progress/prs`** — a true desktop PR table: lift / date / est-1RM / the set
  that set it, sortable and filterable by lift and movement pattern. No phone cards.
- **`/progress/year`** — the year-of-lifts summary at size: total volume, sessions,
  PRs, biggest movers, rendered as one readable annual page, not a social card.

**Read RPCs (read-only, RLS-scoped, additive, safe to re-run):**
`lift_progress(lift_id, window)`, `weekly_muscle_volume(window)`,
`body_trend(window)`. Each returns pre-aggregated rows for the caller's own data
only. No write RPCs. These are an optimisation of reads that already work against
the base tables, so the screen degrades gracefully if an RPC is absent.

## B. Coaching review + decision history — full shape

- **`/coaching`** — the latest weekly review, expanded:
  - Headline call (e.g. "Hold calories, add a set to back").
  - What's working / off-track, as short factual lines (no encouragement).
  - The numeric adjustments in tabular call-outs: calories, training change,
    steps target, cardio note, deload / diet-break flags.
  - The "why this week" rationale as readable prose (max ~70ch column).
  - Check-in status: when the next weekly check-in is due, with a note that the
    check-in itself is done on mobile (web shows the output, never collects it).
- **`/coaching/history`** — the chronological decision record: every past weekly
  call, its date, the change made, and its reason, collapsed by default, each
  entry expandable to the full rationale. This is the stored, explainable coaching
  trail no competitor's data supports.
- Reads: `coach_outputs` only. No new contract. Prose first, numbers in tabular
  call-outs, this week expanded, history collapsed (progressive disclosure).

## C. Plan view & manage — full shape

- **`/plan`** — the active mesocycle, all training days visible at once (the
  desktop advantage over the one-day-at-a-time phone view):
  - A left day-index (amber on the active day), a wide detail pane per day.
  - Each exercise row: sets × rep-range × rest, the muscles it covers, dense but
    legible.
  - "Week X of Y · phase" progress, the deload week marked.
  - "Why this plan": the coach's full plan rationale (mobile `whyThis`) at size.
- **`/plan/history`** — past blocks/mesocycles with their outcomes and block
  reflections. Reads `mesocycles`, `coach_outputs`.
- **`/plan/update`** — the goal / phase / schedule / equipment / experience change
  flow (mobile's "Update your plan" dropdowns). Rebuilds plan + nutrition targets
  through the existing plan-generation path under the caller's own `user_id`,
  history retained. Never re-keys `user_id`.
- **Excluded, restated:** starting or logging a workout. The plan is read + manage
  only; logging is mobile.

## D. Diary — full shape

- **`/diary?date=YYYY-MM-DD`** (local UK day-key via `localDayKey` / `parseLocalDay`,
  never UTC):
  - Two-column day: meal sections left (incl. peri-workout / numbered meals), the
    day's totals vs targets right (rings + tabular numbers), water below.
  - Each entry: food, quantity, the macro columns, an edit and a remove control.
  - **Add/edit/remove**: search the curated food DB, set quantity, assign a meal;
    edit quantity/meal inline; remove with confirm. Water add/adjust.
  - Date navigator + a week strip for quick day hops.
  - Reads/writes: `food_entries`, `daily_intake_rollups`, `daily_water` via the
    locked composite-PK upsert with an `updated_at` touch; mobile reconciles by
    last-writer-wins (Phase 0 §B6). No new write contract.
- **Excluded, restated:** barcode scan / label OCR (camera, mobile-only). Manual
  search + add is the web path. The day always buckets by the user's local UK
  calendar day.

---

**STOP — user web proposal (6a) is approved and locked. Proceeding to Phase 6b
(admin) per the founder's order (6b → 6c → summary). No application code until a
build is approved.**
