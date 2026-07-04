# 04 · Feature-by-Feature Audit

**Author:** Fable, synthesising all 15 inputs per feature area. **Date:** 2026-07-04.
Each row: what it is, quality, user value, business value, and the top
opportunity. Severity/effort of each opportunity is in `10-prioritised-roadmap.md`.
Integration scores are O1's (10 = fully woven into the product, 5 = parallel system).

---

## Core (free tier — the top of the funnel)

### Workout logging & the training core — **8/10, elite**
- **What:** plan library, builder, active-workout logging, editable/deletable
  in-session sets, rest timer, mesocycle builder, exercise library, PB tracking.
- **Quality:** the app's spine; haptics, Skeleton, entrance motion, PR celebration
  (which honestly does *not* fake a first-ever lift as a record — O3 praises this).
  The log-a-set flow is the a11y reference (S2).
- **Value:** high user value (the daily loop), high business value (the generous
  free tier is the reputational asset O7 says the market resents the absence of).
- **Top opportunity:** it runs on **legacy sync** (S4-§1) — de-risk the
  highest-traffic table or pin it with a regression matrix (P1-12). Otherwise
  protect and polish.

### Progress & analytics — **7–8/10**
- **What:** analytics dashboards, body metrics, volume heatmap, consistency,
  streaks, year-of-lifts, lift-progress.
- **Quality:** strong data model and empty state (the Analytics zero-data state is
  a reference, O1); some dead-end empty states (VolumeHeatmap, Consistency).
- **Top opportunity:** the **solo weekly streak has no re-engagement push** (O4-HB1)
  — the largest half-open retention loop for the partnerless majority (P1-9).

## Pro tier — nutrition & coaching (the revenue engine)

### Food diary & nutrition — **8/10 model, spinner chrome**
- **What:** food logging, barcode, macro/calorie targets (incl. per-day-of-week,
  floor-clamped), recipes, meal suggestions, insights, kcal⇄kJ.
- **Quality:** conceptually excellent (the data model is a genuine strength);
  chrome lags — hand-rolled close-headers on 5 modals, bare spinners not Skeleton
  (O1). Barcode is a differentiator vs MFP's resented barcode-gate (O7).
- **Top opportunity:** apply the component/Skeleton pass (P1-4, P2-3); the model
  doesn't need work, the chrome does.

### Deterministic coaching — **8.5/10, the reference standard**
- **What:** `runWeeklyCoach`, weekly check-in, CoachOutput, coaching goals,
  mesocycle, cardio engine, contest-prep, ED-safety floors.
- **Quality:** CoachOutput and WeeklyCheckIn are the integration bar the rest of
  the app should copy (O1). The no-AI determinism is now a *trust differentiator*,
  not a gap (O7).
- **Top opportunity:** **package the weekly run as an anticipated weekly moment**
  (WHOOP pattern, O8/P2-2) and make it the hub the two orphan features plug into
  (docs 05/06). This is the retention spine.

### Cardio — **7/10 model, bolted chrome**
- **What:** cardio logging, plans, history, cardio engine.
- **Quality:** conceptually the *most* integrated new feature (est_kcal correctly
  excluded from targets, feeds check-in/CoachOutput — proof the team can weave a
  feature into the data model). Only the chrome is bolted (radius.md vs Card).
- **Top opportunity:** component pass (P1-4). The data model is the lesson to copy.

## The two priority features (full treatment in docs 05 & 06)

### Progress Photos — **5/10 integrated (premium surfaces, zero connective tissue)**
- **Crown jewel:** ghost-overlay capture (best-in-class, nobody-else-ships-it).
- **Gaps:** zero coaching integration, no return loop, one-column data model, no
  backup path, 5 modals with zero design-system components. → **Doc 05.**

### Partners — **7/10 integrated (elite shell, thin loop)**
- **Differentiators:** real deletion-on-unpair, trustworthy consent rail,
  three-layer ED freeze, best-in-class privacy copy.
- **Gaps:** one wordless cheer/day, no shared commitment object, silent
  accept-moment, low-voltage peak. → **Doc 06.**

## Growth & monetisation surfaces (full treatment in doc 08)

### Paywall & trial — **good bones, empty proof**
- **What:** PaywallScreen, CascadeGate, per-feature benefit copy, engagement-based
  trial banner, cascade/lapse/winback.
- **Quality:** honest, calm, no dark patterns (O3/O4); per-feature benefit copy is
  a strength.
- **Top opportunity:** the **proof slot ships empty** (`PAYWALL_EXCERPTS = []`) —
  the single biggest conversion lever (O4-PW1, P1-1).

### Share cards — **5/10, two builders one renderer**
- **What:** session/PR/milestone/weekly cards + before/after; free, watermarked.
- **Quality:** free-and-brand-forward is a real viral asset; but ShareCardScreen +
  BeforeAfterShareSheet duplicate ~90% of the UI with divergent chrome (O1-F4).
- **Top opportunity:** unify the builders (P1-7); add `share_completed` telemetry
  (P3-8) to size the loop.

### Notifications — **strong, well-governed**
- **What:** 24 categories, scheduler, quiet hours, push budget, ED-suppression.
- **Quality:** earned, budgeted, quiet-hours-aware, calm tone — exactly the
  best-practice O8 describes; ED-suppression is locked and correct.
- **Top opportunity:** the missing **solo-streak** and **partner-accepted** pushes
  (P1-9, P1-11) — the loops that exist but don't notify.

## Identity, settings, consent — **solid, well-structured**
- OAuth-only auth, the un-skippable Article 9 gate (fails closed), subscription
  management, coaching history (a real switching cost), read-only-on-lapse views.
- **Top opportunity:** the trial-starts-silently copy line (P2-1) and surfacing
  the switching-cost assets to lapsed users (O4-RT1).

## Cross-cutting: what every feature needs

The per-feature opportunities collapse into the same short list — which is why the
roadmap is organised around *roll-outs*, not per-feature rebuilds:
1. The component/haptic/state pass (makes every surface one material).
2. Weaving Photos + Partners into the weekly moment (makes two orphans organs).
3. Turning the telemetry lights on (makes every feature's health measurable).
