# Web platform — Phase 3: gap and opportunity analysis

Status: COMPLETE | Date: 2026-06-05 | Depends on: Phases 0, 1, 2.

Synthesises the Phase 2 research against Volyume's existing depth (Phase 0) into
what to match, what to lead on, and the one thing to get right per interface.
No new claims, everything traces to Phase 0 (repo) or Phase 2 (cited).

---

## USER WEB APPLICATION

### What every competitor does that Volyume must match
- A genuine logged-in dashboard with today's state + recent activity (all have
  this on mobile; the web must too).
- Progress charts: lift history, PRs, body-weight trend (table stakes).
- A food diary view by day with macros vs targets (Cronometer/MFP standard).
- Account + subscription management on the web (manage/cancel/billing/export).
- Fast, polished, brand-consistent, the minimum to not feel like an afterthought.

### What no competitor does well, where Volyume leads
- **The web as the richer surface, not a mirror.** Whoop's and MyFitnessPal's
  web are explicitly weaker than their mobile (Phase 2 A). Volyume inverts this:
  the desktop becomes the **analysis cockpit** the phone can't be, multi-year
  lift curves, a full-size body volume heatmap, the morning-weight EWMA with the
  coach's target band overlaid across a long window, sortable PR tables,
  side-by-side muscle comparison.
- **Explainable coaching in full prose.** Hevy's coaching is an algorithm; MFP
  has none. Volyume's `coach_outputs` already store *why* each decision was made.
  On a big screen that history becomes a readable, scannable record, a thing no
  competitor has the data to show.
- **Calm density.** Cronometer is powerful but overwhelms (Phase 2 A). Volyume's
  locked "dense but not cluttered, hierarchy through contrast" discipline is the
  direct answer, more visible at a glance, less noise.

### Unique value given the mobile app's data depth
Volyume already computes and stores: per-muscle weekly volume vs MEV/MAV/MRV,
EWMA weight trend, autoregulation/recovery signals, RED-S/FFM safety context,
division-specific plan structure, structured weekly check-ins, food compliance.
**No competitor's web app has anything close to this depth to visualise.** The
web's job is to render that depth legibly at size.

### The single most important thing to get right on launch
**The progress/analysis experience.** It is the one place the web is genuinely
better than the phone and the one thing the category does badly. If the logged-in
dashboard + progress views feel like a precision cockpit (Whoop-grade language,
Volyume-grade restraint), the web app justifies itself. Everything else (diary,
account) is parity.

---

## ADMIN INTERFACE

### Essential from day one
- **User management** (search, open, view tier/activity/consent, suspend,
  delete via the Edge Function, change tier via the RPC).
- **A metrics dashboard** over the existing telemetry (signups, DAU/WAU/MAU,
  Free/Pro split, cascade states, churn proxy).
- **Push-notification composer** (compose, segment, schedule, send, measure),
  the highest operational leverage and the infra (`device_push_tokens` +
  `send-push` + notification telemetry) already exists.
- **Support lookup** (inspect one user's data + recent errors to diagnose).

### What the best admin tools do that most fitness-app admins do not
- Treat the admin as a **product**: Linear/Stripe-grade speed (sub-100ms),
  keyboard/command-palette navigation, progressive disclosure (5-9 elements,
  drill-down), high-contrast monochrome + one accent (Phase 2 B). Most fitness
  back-ends are afterthought CRUD tables; Volyume's should feel like Linear.

### Notification capability that matters most
**Segmented targeting + measured open/delivery rates.** Composing is easy; the
value is sending the *right* message to the *right* cohort (inactive users, trial
ending, new Pro) and seeing whether it landed, all expressible from the existing
telemetry allow-list (`notification_sent/tapped/failed`).

### What saves the most operational time
The **user support lookup + one-click safe actions** (resend deletion, fix tier,
inspect sync state). It turns "SSH into the DB to debug a tester" into a screen.

---

## B2B COACH PLATFORM

### What every competing platform is missing (Phase 2 C)
- **Intelligence in the platform.** Trainerize/TrueCoach/Everfit are delivery
  pipes, plan assignment + messaging + billing. The coaching IQ is entirely the
  human's. None has division-specific programming, an explainable autoregulation
  engine, RED-S safety, or structured check-in analytics.
- **Honest pricing.** All punish growth with steep per-client tier jumps and
  charge hidden add-ons (meals, automation, payment %) (Phase 2 C, cited).
- **Speed/polish.** Recurring complaints of sluggish client apps and buggy
  messaging.

### What Volyume's existing depth uniquely enables
- A coach assigns a **division-specific, autoregulated plan** the platform then
  **adjusts and explains** week to week, the coach supervises intelligence
  rather than hand-building every block. This is impossible on the generic tools.
- **Check-in + compliance analytics out of the box**: food/cardio/steps
  compliance, weight trend vs target, recovery flags, the coach's daily triage,
  already computed by the engine.
- A **client experience that is the full Volyume app** (premium, private), not a
  bolted-on white-label shell, the client side is already best-in-class.

### Pricing/access model the research suggests
Per-client pricing is universal but resented for its steep jumps and hidden fees.
The opportunity is a **transparent, growth-friendly model**: a flat coach
subscription with generous included seats and a clear, gentle per-seat overage,
no hidden meal/automation/payment add-ons. (Exact numbers are a Phase 4/business
decision; the research mandate is "transparent and does not punish scaling".)

### Is white-labelling worth building from launch?
**No, not at launch.** It is a later differentiator, not a day-one necessity, and
it conflicts with shipping the core fast. Launch with Volyume-branded client
experience (which is already premium); add coach branding once the relationship
model and core coach tools are proven. Recorded as a Phase-2-scope item, not
launch scope.

---

## THE THREE THINGS TO GET RIGHT (cross-interface)
1. **User web**: the analysis cockpit (richer than mobile).
2. **Admin**: a Linear-grade ops tool over existing infra (push composer first).
3. **B2B**: depth-as-product + honest pricing; client side = the real app.

Next: Phase 4 — technical architecture + hosting
(`web-platform-04-technical-architecture.md`).
