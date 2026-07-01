# Volyume — Enhancement Portfolio (05)

Date: 2026-07-01 · Read-only session · Author role: head of product.
Grounded in `01-codebase-audit.md`, `02-ux-audit.md`, `03-design-audit.md`,
`04-competitive.md` and CLAUDE.md. Every proposal cites its audit evidence
and is checked against the constitution's invariants (deterministic engine,
GDPR Article 9, ED-safety floors, IAP/billing rules, additive-only schema,
binary Free/Pro, offline-first, no new dependencies without approval).

**Scope boundaries (so this portfolio stays honest):**
- The **defect backlog is not an enhancement**. 01's critical/high fixes
  (sync watermark leak, sign-out race, ED-floor seams EN-1/EN-2, Article 9
  sync gate) and 02's dead-control bugs (NAV-1/2/3, silent Applies) are a
  prerequisite hygiene track. They ship first; they are not scored here.
- The **03 design migration (phases 0–3)** runs as its own programme. Where
  a proposal below overlaps it (A1, A5), it references rather than
  duplicates it.
- Items marked **[FOUNDER-GATED]** touch the engine, billing, or a locked
  decision and need a structured founder decision before build.

## Ranked index (all tiers, impact descending)

| # | Proposal | Tier | Effort | Impact |
|---|----------|------|--------|--------|
| A1 | The Verdict Screen (CoachOutput rebuilt as a decision) | A | M–L | 9 |
| A2 | Rest that reaches through the lock screen | A | M | 9 |
| A3 | Week-one proof: the coach ledger | A | M | 9 |
| B1 | Adherence-neutral mechanics [FOUNDER-GATED] | B | M | 9 |
| A7 | Check-in integrity pack | A | S–M | 8 |
| C1 | Exercise media library [FOUNDER-GATED] | C | XL | 8 |
| A4 | Division fingerprint on daily surfaces | A | S–M | 7 |
| A5 | Progress tab becomes a dashboard | A | M | 7 |
| B2 | Readiness-informed session adjustments [FOUNDER-GATED] | B | M | 7 |
| B4 | Contest-prep countdown mode [FOUNDER-GATED: ED review] | B | M–L | 7 |
| B7 | Felt-life pack (motion + haptics adoption) | B | S–M | 7 |
| C2 | Micronutrients / UK NRV (MN-1) [ALREADY GATED] | C | XL | 7 |
| A8 | Gating & conversion integrity | A | S | 7 |
| A6 | UK provenance, made visible | A | S | 6 |
| B3 | Proactive plateau-break surfacing | B | S–M | 6 |
| B5 | Exportable coach handover report | B | M | 6 |
| B8 | Gym basics: keep-awake, warm-ups, plates [dep approval] | B | S–M | 6 |
| C3 | Widget family + Wear OS tile | C | L | 6 |
| C4 | Health Connect re-entry [FOUNDER REVERSAL] | C | L–XL | 6 |
| B6 | Progress photo comparison | B | M | 5 |
| B9 | Deterministic rest suggestions | B | S | 5 |
| C5 | Training Partner v2 | C | L | 5 |

---

# TIER A — Sharpen existing features

### A1. The Verdict Screen — CoachOutput rebuilt as a decision, not a memo
- **What it is:** Rebuild CoachOutputScreen around one verdict (week's delta +
  the single decision, display-size numerals), one amber object (the hero
  Apply), a two-column working/off ledger, and honest Apply rows (pre-tap
  absolute target, "held at your safe minimum" when floor-clamped, "stays
  until your next check-in" wording, trend labelled as trend, kJ honoured,
  confidence caption).
- **User value:** every Pro user at their highest-attention weekly moment;
  the flagship feature currently scores 6/10 (03) and carries the loop's
  three worst legibility leaks (02 NU-3/4/5/6/8).
- **Competitive effect:** beats — MacroFactor's trend surface is their crown;
  a verdict-grade coach screen with written whys is something none of the
  three can render.
- **Effort:** M–L. Main risk: regressing the confirm-then-apply flows —
  mitigated by the existing apply-path tests plus adversarial review.
- **Constraint check:** presentation only; no engine value changes, floors
  and held decisions keep colour/position, calm register preserved. ✓
- **Impact: 9/10** — the paid promise, made readable at the moment it's felt.

### A2. Rest that reaches through the lock screen
- **What it is:** Schedule a local notification at `restTimerEndsAt` (cancel
  on skip/adjust), fire the GO haptic on foreground catch-up, mirror the
  countdown in the sticky header, kill the 1.8s auto-advance yank, pin the
  primary CTA to the bottom edge, persist `restTimerEndsAt` in the snapshot.
- **User value:** every user, every session — 02's top-friction #2: the core
  loop's heartbeat is currently silent exactly when users look away.
- **Competitive effect:** matches Hevy's lock-screen timer on Android and
  beats their in-app flow (we keep 1-tap prefilled logging + auto-flow). iOS
  Live Activity remains the separately gated founder decision.
- **Effort:** M. Main risk: OEM Android notification-timing variance — accept
  ±seconds; the notification is a backstop, not the timer.
- **Constraint check:** uses existing notification budget/quiet-hour plumbing;
  no ED-adjacent content (rest copy only); no schema, no deps. ✓
- **Impact: 9/10** — the highest-frequency moment in the product, fixed.

### A3. Week-one proof: the coach ledger
- **What it is:** A day-1 "what your coach is reading" ledger (live counts vs
  the published 3-weigh-in/5-day/week-2 thresholds), the week-one hold
  rendered as a full held-decision receipt (rule, inputs read, named unlock
  date via existing `firstCheckinUnlockDate`), provisional targets shown at
  wizard step 4, and the first-review date printed on ProSetupComplete.
- **User value:** every trialist in days 1–11 — the churn window where the
  paid promise is currently invisible (02 OB-4; 04 legibility: deterministic
  engine PARTIALLY LEGIBLE, integrated loop INVISIBLE).
- **Competitive effect:** beats — turns "no black box" from a claim into a
  week-one experience no competitor can copy without our architecture.
- **Effort:** M. Main risk: none technical (pure re-presentation of computed
  engine data); the risk is copy discipline — voice rules apply.
- **Constraint check:** zero engine changes; counts and dates already exist;
  ED-flag users get the already-defined neutral variants. ✓
- **Impact: 9/10** — directly attacks trial conversion and the moat's
  legibility at once.

### A7. Check-in integrity pack
- **What it is:** Fix the narration/decision vocabulary mismatch (02 NU-1),
  label pre-filled answers with their provenance ("from your food diary"),
  render the computed weekly confidence line, allow a one-day-late check-in
  with the same "less accurate" framing the weights override uses, and
  persist reminder prefs even when the notification permission is denied.
- **User value:** every Pro user weekly; the current mismatch is the loop's
  single biggest trust leak — the coach visibly ignores what you just said.
- **Competitive effect:** closes half the gap to MacroFactor's cadence
  without touching the engine; provenance labels make the integrated loop
  legible at day 5–7 (04's cheapest win).
- **Effort:** S–M. Main risk: none — the fixes are wiring and copy.
- **Constraint check:** narration reads the already-mapped engine input; no
  decision changes; day-late check-in reads the same week window. ✓
- **Impact: 8/10** — trust repair on the feature users pay for.

### A4. Division fingerprint on daily surfaces
- **What it is:** Carry the division into daily training surfaces: elevated/
  capped muscle markers on the volume heatmap and routine detail ("Bikini
  plan: glutes prioritised, chest capped"), plus a deterministic diff receipt
  ("a general plan gives glutes N weekly sets; yours has M").
- **User value:** every division-goal user from day 1 — the advantage is
  currently legible for five minutes on day 0, then vanishes (04).
- **Competitive effect:** beats — no competitor has division programming at
  all; this makes ours visible where users train.
- **Effort:** S–M. Main risk: none; `GOAL_OVERLAYS` data is already applied —
  this re-presents it. Both diff numbers come from the same engine.
- **Constraint check:** no engine changes, no fake precision, no schema. ✓
- **Impact: 7/10** — moat legibility for the niche the app is named for.

### A5. Progress tab becomes a dashboard
- **What it is:** Replace the nav-tile hub with one owned visual — a weekly
  training-load chart with this week highlighted and a display-size numeral —
  plus half-width streak/weight-trend sparkline cards and an inline
  volume-by-muscle bar in the existing status colours; tiles collapse to one
  "More" row. (This is 03's elite description, executed.)
- **User value:** every returning user's "am I on track?" glance — currently
  requires a tap per answer; the tab scores 6/10 with "perceived quality 5.5".
- **Competitive effect:** matches Whoop/Oura-grade glanceability; extends the
  existing AHEAD verdict on progress analysis into presentation.
- **Effort:** M. Main risk: chart work on the JS thread — reuse the existing
  chart components and cap the window.
- **Constraint check:** display only; ED-flag users keep weight-stripped
  variants; skeletons close the tab's loading gap (03). ✓
- **Impact: 7/10** — the retention surface, made worth opening.

### A6. UK provenance, made visible
- **What it is:** One provenance sentence at first food search ("UK food
  database on your device — gov.uk CoFID generics plus UK branded products.
  Works offline."), a glossed CoFID chip via the existing tooltip pattern,
  and "verified UK" badges through the existing source-chip taxonomy.
- **User value:** every food logger, first session — the moat is currently
  felt but silently misattributed to luck (04: INVISIBLE as a claim).
- **Competitive effect:** counters MacroFactor's "all-verified" credibility
  pitch with the one thing they don't have: UK-native, offline, government
  data.
- **Effort:** S. Main risk: none.
- **Constraint check:** factual copy only; no data or schema changes. ✓
- **Impact: 6/10** — cheapest credibility win in the portfolio.

### A8. Gating & conversion integrity
- **What it is:** ProBadge on gated Progress tiles, the four missing
  per-feature benefit lines, an FAQ + deeper comparison on the upgrade screen
  (no billing change), and a founder decision on resurfacing the currently
  unreachable differential paywall (02 NAV-4).
- **User value:** free users at gate moments — the one place the otherwise
  well-judged show-then-sell gating reads punitive today (02 NAV-6).
- **Competitive effect:** matches Hevy's paywall furniture; price/lifetime/
  promo questions stay with the founder (04 §2.4) and are not built here.
- **Effort:** S. Main risk: none; copy + one badge component already exists.
- **Constraint check:** no SKU, price, or entitlement changes; binary gating
  untouched. ✓
- **Impact: 7/10** — conversion hygiene at near-zero cost.

---

# TIER B — New value within the current architecture

### B1. Adherence-neutral mechanics **[FOUNDER-GATED]**
- **What it is:** Feed actual logged intake (`recentIntakeAvgKcal`, already
  computed at the same call site) into the adaptive TDEE model instead of
  `prescribedKcal × {0.9, 1.0, 1.1}`, and let the expenditure estimate
  refresh weekly from weights + rollups even when the check-in wizard is
  skipped — the check-in stays the wellbeing/safety capture and the moment
  adjustments are presented.
- **User value:** every Pro user whose real eating diverges from the plan —
  today the engine waits for ceremony and buckets; the highest-risk users
  (untracked, SCOFF-positive) benefit most from a model that never scolds.
- **Competitive effect:** beats — closes the only mechanics gap to
  MacroFactor's signature while keeping the safety layer they lack, making
  us simultaneously more forgiving and safer.
- **Effort:** M (engine + full invariant re-baseline). Main risk: output
  shifts for identical histories — requires side-by-side deterministic
  replay before/after and founder sign-off on the delta.
- **Constraint check:** fully deterministic, no AI; floors/gates stay senior
  (they already read real intake); this is 01 EN-3-adjacent and CLAUDE.md
  requires the stop-and-ask — hence the gate. ✓ (with decision)
- **Impact: 9/10** — the single biggest coaching-quality lever available.

### B2. Readiness-informed session adjustments **[FOUNDER-GATED]**
- **What it is:** Expand the existing pre-session adjustments line (COMP-015)
  into visible, deterministic session tweaks from the intent-sheet readiness
  answer: poor readiness → reduce target sets/load with a written why; good
  readiness never pushes beyond plan. Rule table, no learning.
- **User value:** every session start on a bad day — the moment the coach can
  prove it listens daily, not weekly (UX1 found the current line
  "under-leveraged").
- **Competitive effect:** beats — Hevy Trainer has nothing session-reactive;
  it is also week-one-legible (supports A3).
- **Verdict on the brief's example: ACCEPT**, downward-only.
- **Effort:** M. Main risk: scope creep into safety — the rule table must be
  reduce-only so fatigue never gets programmed harder.
- **Constraint check:** deterministic rules; engine-adjacent → founder
  decision + invariant tests; no schema. ✓ (with decision)
- **Impact: 7/10** — daily proof of coaching, cheap in engine terms.

### B4. Contest-prep countdown mode **[FOUNDER-GATED: ED review]**
- **What it is:** A weeks-out timeline for division users: countdown header,
  division-aware checkpoints, peak-week integration (the `peak_week_plans`
  table already exists), and coach copy that references weeks-out. No new
  maths — existing phase/deficit machinery presented against a date.
- **User value:** the competitive-bodybuilding core audience in their most
  engaged 12–16 weeks; nobody serves this end-to-end.
- **Competitive effect:** beats/ignores — no mainstream competitor has a
  contest mode; deepens the division moat.
- **Verdict on the brief's example: ACCEPT**, with a mandatory ED-safety
  design review — prep is aggressive-cutting territory, so floors, rapid-loss
  gates and SCOFF holds stay senior to any countdown pressure, and countdown
  copy must never urgency-frame weight.
- **Effort:** M–L. Main risk: the safety review concluding parts can't ship —
  budget for that outcome.
- **Constraint check:** engine untouched except presentation; ED review
  required by constitution ("if a task touches this system: stop and ask"). ✓
- **Impact: 7/10** — high value to the niche that defines the brand.

### B7. Felt-life pack (motion + haptics adoption)
- **What it is:** Wire the five built-but-never-called haptic events
  (workoutComplete, restDone, prAchieved, check-in commit, delete), add
  Reanimated Layout/exiting to Diary and set rows, a draining fill on the
  rest timer, milestone celebrations scaled to the rung (PRCelebration
  particles at 50/100 sessions), and heroZoom on Plan/Routine/Exercise detail.
- **User value:** every interaction loop — 03's verdict: excellent primitives,
  patchy adoption; the app feels static exactly where it's used most.
- **Competitive effect:** matches the perceived-quality bar of elite apps;
  no feature change at all.
- **Effort:** S–M. Main risk: none — all primitives exist; every addition
  gates on reduce-motion/ED-calm identically to current code.
- **Constraint check:** no deps, no engine, ED-suppression gates untouched
  (the "crown jewels" list in 03). ✓
- **Impact: 7/10** — perceived quality is a retention feature.

### B3. Proactive plateau-break surfacing
- **What it is:** Surface the existing plateau detection proactively — a
  Home/summary card when a tracked lift stalls N weeks, with the
  deterministic protocol suggestion (swap variant, rep-range change, deload)
  drawn from the existing swap/deload machinery.
- **User value:** intermediate lifters at the moment motivation dips.
- **Competitive effect:** beats — Hevy shows you the plateau; nobody
  prescribes the break deterministically.
- **Verdict on the brief's example: ACCEPT.**
- **Effort:** S–M. Main risk: nagging — cap frequency through the existing
  banner-priority system.
- **Constraint check:** reads existing signals; suggestion vocabulary from
  existing engines; no schema. ✓
- **Impact: 6/10.**

### B5. Exportable coach handover report
- **What it is:** A PDF (expo-print, already installed) summarising training
  history, weight trend, targets and every coach decision + written why over
  a period — for a human coach, physio or GP.
- **User value:** serious users working with professionals; also a GDPR
  portability good-citizen artefact.
- **Competitive effect:** ignores the competition — none of them can export
  decisions-with-reasons because none of them have them.
- **Verdict on the brief's example: ACCEPT.**
- **Effort:** M. Main risk: layout drift in Print HTML — keep to the existing
  csvExport/share-card patterns.
- **Constraint check:** user-initiated export of the user's own data;
  ED-flagged users get the neutral variant (no rate/weight emphasis);
  nothing leaves the device except by the user's own share action. ✓
- **Impact: 6/10** — small audience, deep loyalty, zero competitor answer.

### B8. Gym basics: keep-awake, warm-up ramp, plate calculator
- **What it is:** Screen keep-awake during active sessions (expo-keep-awake —
  **one dependency, needs founder approval**), a deterministic warm-up ramp
  from the working weight, and a rebuilt plate calculator.
- **User value:** every gym session; these are the table-stakes items lifters
  notice in week one (04: Hevy ships all three).
- **Competitive effect:** matches Hevy — removes the last "their logger is
  better equipped" argument while we stay ahead on tap economy.
- **Effort:** S–M. Main risk: none technical; the plate calculator is a
  rebuild (old component deleted), not a rewire.
- **Constraint check:** dependency rule — ask first (name/purpose/licence);
  warm-up ramp is pure arithmetic, not a coaching decision. ✓ (with approval)
- **Impact: 6/10.**

### B6. Progress photo comparison
- **What it is:** Side-by-side/slider compare of two progress photos with
  date labels, local-only, inside the existing calm-mode/wellbeing-gated
  ProgressPhotos screen. No measurements, no overlays, no sharing default.
- **User value:** physique-focused users tracking visual change — the
  evidence base the scale can't give them.
- **Competitive effect:** matches Hevy's compare tooling.
- **Verdict on the brief's example: ACCEPT**, local-only.
- **Effort:** M. Main risk: memory handling on large images — downscale.
- **Constraint check:** photos remain device-local (no new Article 9 sync
  surface); calm-mode/ED gating of the whole screen already exists and stays
  senior. ✓
- **Impact: 5/10.**

### B9. Deterministic rest suggestions
- **What it is:** Suggested rest durations by set type and exercise
  compound-ness from a fixed table (e.g. top-set compound 3 min, isolation
  90s), user-overridable, shown as a quiet default — not "intelligence".
- **Verdict on the brief's example: ACCEPT-MODIFIED** — the deterministic
  table version; the learned/adaptive version is rejected below.
- **User value:** novices who don't know rest norms; removes one decision.
- **Competitive effect:** par — everyone has defaults; ours get a why.
- **Effort:** S. Main risk: none.
- **Constraint check:** fixed table, no learning, no engine change. ✓
- **Impact: 5/10.**

---

# TIER C — Strategic bets (sketches only)

### C1. Exercise media library **[FOUNDER-GATED: cost + assets]**
- **What it is:** Commissioned animated demonstrations + muscle diagrams for
  the 448-exercise library, served from an EU CDN with a bundled offline
  fallback for the core movements.
- **User value:** every user, first minute — library quality is judged
  visually; this is the most visible remaining gap to Hevy (04: BEHIND).
- **Competitive effect:** matches Hevy's single most persuasive surface.
- **Effort:** XL — the risk is not code but content production (450 assets,
  consistency, cost) and the CDN/licensing decision. Never Hevy's assets.
- **Constraint check:** no engine impact; offline-first demands the bundled
  fallback; EU residency for the CDN; founder decision on spend. ✓ (gated)
- **Impact: 8/10** — perceived-quality ceiling-raiser for the whole app.

### C2. Micronutrients / UK NRV (MN-1) **[ALREADY DECISION-GATED]**
- **What it is:** The blueprinted Ultimate-Audit item 16: micronutrient
  columns across SQLite + Supabase + sync + CoFID seed, UK NRV reference,
  opt-in diary panel; unlocks the full U6 female-athlete iron tracking.
- **User value:** competitors on long cuts; closes the Cronometer depth gap.
- **Competitive effect:** matches Cronometer's moat with UK-correct data.
- **Effort:** XL — the heaviest schema migration in the backlog; sequenced
  alone per its blueprint.
- **Constraint check:** additive migrations, founder-run; blueprint exists
  (`docs/ultimate-audit-2026-06-13/pass4-blueprints-micronutrients.md`);
  remains behind its existing founder gate. ✓ (gated)
- **Impact: 7/10.**

### C3. Widget family + Wear OS tile
- **What it is:** Grow the two Android widgets into a family (today's
  session, kcal remaining, streak, rest timer) and a Wear OS tile for
  rest/set logging. iOS Live Activity remains its own gated decision.
- **User value:** glanceability without opening the app; the rest timer on a
  watch is the gym's best surface.
- **Competitive effect:** matches Hevy's widget breadth; a watch rest-timer
  would beat it.
- **Effort:** L — native-adjacent work per surface; Wear OS is a new target
  with real maintenance cost.
- **Constraint check:** widgets already use the approved library; no Pro
  leakage on lock-screen surfaces (no weight/kcal on widgets without the
  existing privacy review); no engine impact. ✓
- **Impact: 6/10.**

### C4. Health Connect re-entry **[FOUNDER REVERSAL — flag honestly]**
- **What it is:** Reintroduce Health Connect (steps, and only steps at
  first) as an engine input. **This was deliberately ripped out this month**
  (founder decision; health.js neutralised) — proposing it back is a
  reversal, not an iteration, and is sketched only because the step-TDEE
  modifier already exists engine-side.
- **User value:** users who won't manually track steps get better calorie
  precision passively.
- **Competitive effect:** matches MacroFactor's passive-input depth.
- **Effort:** L–XL — permissions, Article 9 surface area, the exact
  maintenance burden that motivated removal.
- **Constraint check:** expands special-category data collection → full
  Article 9 review; consent gating; engine input change → founder decision
  twice over. Only revisit with a clear demand signal. ✓ (heavily gated)
- **Impact: 6/10 if wanted — but the recency of the removal decision argues
  for waiting.**

### C5. Training Partner v2
- **What it is:** Extend the private 1:1 partner from derived signals to
  shared programmes (train the same block, compare completion — never
  weight/food), and a "cheer window" around scheduled sessions.
- **User value:** accountability for pairs — the retention mechanic Hevy's
  feed provides, in the ED-safe lane we've chosen.
- **Competitive effect:** partially matches Hevy's community effect without
  a feed; unique privacy posture.
- **Effort:** L — sync/RLS surface for shared plan state; the partner purge
  path must extend to it.
- **Constraint check:** no weight/food/calorie sharing ever (existing §5
  rule); Pro-gated as today; unpair purge extended; no feed. ✓
- **Impact: 5/10** — worthwhile only after the core loops are elite.

---

# Considered and rejected (the darlings, killed)

1. **Social feed / leaderboards / public profiles** — Hevy's growth engine,
   and the single clearest ED-safety conflict (comparison pressure,
   default-public weight-adjacent data). Locked founder decision; the
   partner lane (C5) is the deliberate alternative. Not proposed.
2. **AI/photo/voice food logging** — violates the no-AI sacred rule
   outright; MacroFactor also lacks it, so competitive pressure is weak.
   The one-tap re-log stack is our speed answer. Not proposed.
3. **Learned/adaptive rest-timer "intelligence"** — any model that learns
   per-user is non-deterministic by definition or determinism-theatre in
   practice. The fixed-table version survives as B9.
4. **Auto-applying coach adjustments** ("just do it for me") — breaks the
   confirm-then-apply trust model 02 shows users already struggle to read,
   and puts an ED-adjacent write behind zero consent taps. The right fix is
   legible Applies (A1), not fewer.
5. **Streaks/loss-framed gamification** — conflicts with the calm,
   no-shame voice rules; the milestone ladder (identity-framed, already
   built) is the sanctioned pattern — B7 makes it felt instead.
6. **Quota-based free tier (Hevy's model)** — explicitly rejected in the
   repo's own paywall teardown and locked by the binary-gating rule;
   revenue levers that remain (lifetime SKU, promo pricing) are **founder
   pricing decisions, not builds**, and are flagged in 04 §2.4.
7. **Cycle-phase-driven programming changes** (beyond the shipped U4
   water-note) — evidence base too weak for deterministic prescription and
   uncomfortably close to the ED-safety system; annotation stays, maths
   doesn't. Revisit only with founder-sourced evidence review.
8. **Web dashboard / desktop companion** — violates nothing but the
   offline-first mobile focus and every effort estimate; zero competitor
   pressure from our segment. Not now.
9. **In-app chat coach (LLM)** — the most-requested pattern in the category
   and the most explicitly forbidden thing in the constitution. Never.

---

**Reading order for sequencing:** the defect track (01/02 fixes) first;
then A2 + A7 + A3 (the daily loop and the trial window), A1 + A5 with the
design programme's phase 3, B7 alongside as the felt layer; B1/B2 queued
behind their founder decisions; C-tier scoped only after the founder prices
C1 and rules on C4.
