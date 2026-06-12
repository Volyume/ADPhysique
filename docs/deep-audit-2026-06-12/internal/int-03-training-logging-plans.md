# int-03 — Core Training Loop: Logging, Active Workout, Plans, Library

> Deep-audit slice 03, 2026-06-12. Additive to the 2026-06-10 competitive
> audit. Scope: the FREE core that must hook beginners and satisfy elites —
> workout logging, the active-workout experience, plan creation/management,
> the exercise library, rest timer / set entry.
>
> Method: read the live code (`ActiveWorkoutScreen.js` 2,625 ln,
> `SetEntry.js`, `RestTimer.js`, `PlateCalculator.js`, `ExercisePickerModal.js`,
> the plan + library + builder + summary screens, `swapEngine.js`,
> `travelMode.js`, `formTips.js`, `seedExercises.js`) plus the prior
> blueprints. **Important correction to the prior audit:** the harsh
> 2026-06-10 `competitive-audit-00-workout-screen-deep-audit.md` describes the
> *pre-COMP-001* screen. COMP-001 has SHIPPED. The live screen is materially
> better than that doc implies (3-line card header, one previous-performance
> mechanism, 2-button action row + overflow sheet, 3-control rest timer,
> logged sets above the fold). This report audits the CURRENT state and pushes
> the dual-market / beginner / retention angles the prior work under-covered.

---

## 1. Current-state map of the training loop

### 1.1 The five entry points to "train" (and the beginner's confusion)
A new user can reach a logged set five different ways, with no clear primary:

1. **Home → "Start workout"** (hero) — starts the active plan's next session.
2. **Home → "Start your first session" / "Start a manual session"** — blank
   ad-hoc session, copy: *"Log sets as you go. No plan needed to start. Your
   profile builds as you train."* (`HomeScreen.js:1291–1309`).
3. **Home → "Build workout"** → `BuildWorkoutScreen` — ad-hoc builder.
4. **Plans tab → Plan Library** → quiz or browse → copy a ready-made plan.
5. **Plans tab → Manual Builder** → hand-craft a multi-day plan.
6. **(Pro/auth) `ProOnboardingScreen` / `PlanUpdateScreen`** → the deterministic
   coach engine generates a full periodised plan from experience + days +
   equipment + weak points (`generateAndSavePlan`).

These are presented as **peers**, not a funnel. There is no single "I'm new,
set me up" path. (Detail in §2.)

### 1.2 The active workout — what's on screen now (post-COMP-001)
Fixed chrome: close ✕ · elapsed timer (+ amber time-crunch glyph when active) ·
"Finish". Horizontal exercise-nav pills (when >1 exercise). Then the scroll:

- Exercise name (24pt/900) + **Swap** chip + **⋯ overflow**.
- Conditional banners: superset chip, next-time notes, deload "Recovery week",
  starter-session banner.
- Target line: *"Target: 3 sets · 8–12 reps"*.
- **RestTimer** (single 64pt row: numeral, REST label, −15/+15 w/ long-press
  repeat, Skip). Audio + haptic 3-2-1 escalation, wall-clock derived.
- **SetEntry card**, 3-line header:
  - L1 orientation/set-type: *"Set 2 of 3 · Working ›"* (opens set-type sheet).
  - L2 beat line: *"Last: 60kg × 8 · Target 8–12 ↑"* — tap applies last values.
  - L3 coaching line (first working set only; priority: session adjustment >
    stalled > targetReason).
  - Weight + Reps steppers (52pt, 2.5kg/1-rep steps, type-to-edit), live e1RM.
- **Log set** CTA (full-width amber, flash + haptic ack). On target-complete it
  swaps to "Next exercise"/"Finish workout" + "Log another set".
- **"This workout"** logged-set receipt (above the action row now).
- Action row: **Add exercise · Note** (everything else in ⋯).
- Sheets: set-type (6 options), exercise info ("How to do it", text only),
  swap (ranked + library escape hatch), overflow (swap/info/pair/time-crunch/
  remove), superset heads-up, stale-recovery, discard.

Set types supported natively: working, warm-up, drop set, **myo-reps**,
**rest-pause** (cluster engine — sums mini-sets into one row, genuinely rare in
the category), **AMRAP**. Unilateral/per-side logging is a device-local pref.
Travel mode generates a bodyweight/dumbbell/hotel-gym week.

**Taps to log:** 1 tap on the common prefilled case — class-leading and intact.

### 1.3 Plan creation
- **Plan Library**: 8 collection chips incl. **Beginner**, For women/men,
  Dumbbells only, Short sessions, Bodybuilding Divisions; a **2-question quiz**
  (goal + equipment — *not* experience, *not* days/week); copy → confirm →
  set-active (3 taps).
- **Manual Builder**: name → goal (5 options, unexplained) → 2-page wizard,
  **days/week hardcoded to 4**, add exercises per day, `PlanBalanceCard`
  warnings (non-blocking).
- **Coach engine** (`ProOnboarding`/`PlanUpdate`): asks experience
  (Beginner <18mo / Intermediate / Advanced / Competitive), days, session
  length, equipment, recovery, weak points → deterministic periodised plan
  with an honest "Building your plan" sequence and a `whyThis` rationale.
- **WorkoutSummary**: stats, 4-week comparison ("Strongest session in 4
  weeks"), per-muscle weekly volume status, optional difficulty/engagement/
  joint/fatigue feedback, "Notes for next time".

### 1.4 Exercise library
- **There is no standalone Exercise Library browse screen.** `ExerciseLibrary`
  does not exist as a route. Exercises are only reachable via the picker modal
  (search-only, name + primary muscle per row) or `ExerciseDetailScreen` (from
  a plan/PB). 449 seeded exercises, rich metadata (muscle, subregion,
  equipment, movement pattern, compound/iso, SFR, fatigue), deterministic IDs.
- **Zero visual demos.** No video, GIF, image or animation anywhere. Form
  guidance is text-only via `FORM_TIPS` (~169 of 449 ≈ 38% coverage; the rest
  fall back to a generic "start light" paragraph). `swapEngine` ranking is
  excellent and explainable; no media to compare swaps.
- **`PlateCalculator.js` exists but is imported nowhere — it is dead/orphaned.**
  A beginner with a barbell has no in-app help loading plates.

---

## 2. Findings, ranked

Tags: **[B]** Beginner, **[E]** Elite, **[Both]**. Impact: activation /
retention / conversion / virality / credibility.

### F1 — No visual exercise demos. The single biggest beginner blocker. [B, some Both] — Impact: activation + retention + virality
0% of 449 exercises have any demo; 62% have no written form tip either. A
beginner who meets "Romanian deadlift" in a plan gets, at best, 60 words of
expert prose ("hinge at the hips… feel a deep stretch in your hamstrings") that
assumes they already know what a hip hinge and neutral spine look like. Every
top competitor (Fitbod, Hevy, MuscleWiki, Jefit, Alpha Progression) ships
demos on ~100% of larger libraries; reviews repeatedly cite "short videos
showing exactly how to do the moves" as *the* beginner draw. This is the
category floor and Volyume is below it. Without it, a nervous beginner either
skips exercises they don't recognise or does them wrong — the exact churn loop.
It is also the most screenshot-able / word-of-mouth surface ("the app showed me
how"). **Placement:** muted auto-loop on the in-workout info sheet ("How to do
it") and on `ExerciseDetailScreen`; ignorable by elites, life-changing for
beginners. Staged: free-exercise-db images (£0) → ExerciseDB GIFs (£100–500,
offline-bundleable, fits offline-first) → in-house film of top ~100.

### F2 — No standalone Exercise Library to browse/learn. [B, Both] — Impact: activation + credibility
You cannot explore exercises without committing to add one to a plan/session.
There is no "tap a muscle, see what trains it, watch how" surface. Beginners
learn the gym by browsing; elites audit a library before trusting an app. The
picker is search-only — a beginner who doesn't know exercise *names* can't
search for them. **Opportunity:** a real Library tab/screen with muscle-map or
muscle-group browse, filters (equipment/difficulty/pattern — none exist today),
and the demo from F1. High activation + credibility, medium effort (data already
rich; needs a screen + media).

### F3 — Set-type sheet exposes all 6 expert techniques to everyone. [B] — Impact: activation (anxiety)
The set-type bottom sheet lists Working, Warm-up, **Drop set, Myo-reps,
Rest-pause, AMRAP** with descriptions to every user regardless of experience.
`isBeginner` is read in the screen but only used to filter assisted-machine
*swaps* (`ActiveWorkoutScreen.js:135,320`) — it does NOT gate set types. For
Besa, confronting "myo-reps" and "rest-pause" mid-session is intimidating
jargon that signals "this app is for people more advanced than me." For Eddie
these are essential and must stay one tap away. **Opportunity:** for
`experience === 'beginner'`, collapse to Working / Warm-up with a "More
techniques" disclosure; the cluster engine and AMRAP stay fully available on
expand. Pure progressive disclosure — no feature removed. Low effort, high
beginner-comfort payoff. (Note: the prior COMP-001 work explicitly de-cluttered
the card but left the *sheet contents* ungated — a gap to flag.)

### F4 — No guided "first plan" path; the quiz skips experience and days. [B] — Impact: activation (D0)
The five entry points (§1.1) are peers, and the softest one (Library quiz) is
behind a tap and not default for new users. The quiz asks only goal + equipment
— **not experience and not days/week** — so a beginner picking "Build muscle /
Full gym" can be scored straight onto a Featured/Advanced plan, while the
deterministic coach engine that *does* ask experience and tailors beginner
volume sits behind Pro onboarding/auth. Manual Builder hardcodes 4 days/week
(`ManualBuilderScreen` `daysPerWeek = 4`) — a beginner who can only train 3x is
stuck. Competitor lesson (plan-gen research): Fitbod "struggles to retain users
beyond the first seven workouts" precisely because beginners get unstructured
plans. **Opportunity:** a single "New here? Set me up" CTA on Home/empty-state
that runs the *free* coach generator (experience + days + equipment, 3 taps,
honest build sequence already exists) and lands them on a right-sized starter
plan. Add experience + days questions to the Library quiz as fallback. This is
the highest-leverage activation fix in the slice.

### F5 — PlateCalculator is built but wired to nothing. [B, some E] — Impact: activation + credibility (cheap win)
`PlateCalculator.js` is a complete, polished component (real plate colours,
kg/lb, per-side maths) imported by no screen. A beginner staring at a loaded
barbell not knowing what "60kg" looks like in plates is a real, common moment of
gym anxiety. **Opportunity:** surface it from the Weight field / SetEntry (a
small "plates" affordance) and from `ExerciseDetailScreen`. The build cost is
already paid; this is wiring + placement. Quick, high-goodwill.

### F6 — "How to do it" is the only in-workout learning, and it's buried + text-only. [B] — Impact: activation
Mid-set, exercise guidance lives only behind ⋯ → "Exercise info", and it's the
same text-only `FORM_TIPS`/fallback. The first-set hint does point at it ("Tap
⋯ above for how to do this exercise correctly") which is good, but the payoff is
a wall of prose. Pairs with F1 (put the demo here) and F3 (this is where a
beginner's confidence is won or lost). Low effort once F1 media exists.

### F7 — No session-level feedback → visible adjustment loop. [E, Both] — Impact: credibility + retention
`WorkoutSummary` collects difficulty/engagement/joint/fatigue, and the engine
adjusts, but the *next* session/Plans screen never says **"Based on your
feedback we dropped hamstring volume by a set"** in plain words. The in-session
adjustment line (COMP-015) exists but is subtle. The plan-gen research is
unambiguous: visible reaction to feedback is what earns the "elite programming"
label ("it thinks for me", "cheat code"). This is the biggest *elite-perception*
gap and it doubles as beginner reassurance ("the app is looking after me").
**Opportunity:** a plain-language "Adjusted for you" card on Plans/Home after a
session with feedback. Touches the coaching engine surface only at the
presentation layer (no AI; deterministic). Medium effort, high credibility.

### F8 — Jargon throughout with no progressive explanation. [B] — Impact: activation
"Split", "working set", "rep range / RIR", "MEV/MAV/MRV", "mesocycle / block",
"Est. sets/week", bare "Rest: 90" (unit ambiguous) appear across Plans, Builder,
RoutineDetail, Summary with no tooltips for a first-timer. The coaching copy
that *does* exist is excellent and on-voice — the gap is the structural labels.
**Opportunity:** info affordances on first encounter, dismissible. Low effort,
broad activation benefit. (Note: user-facing copy must stay British English and
jargon-light per house rules — these tooltips translate the jargon, they don't
add more.)

### F9 — Builders assume intermediate knowledge; no defaults, no time budget, non-blocking balance. [B, some E] — Impact: activation
Manual Builder / BuildWorkout drop the user onto blank days with sets/reps/rest
fields and no suggested defaults, no per-session time estimate, and balance
warnings that don't block "Save & Activate" (you can activate a 0-exercise or
legs-only plan). Travel Mode (a genuinely nice generator) is a hidden chip most
beginners never find. **Opportunity:** "Suggest exercises for this day", a live
"~45 min" estimate (the time-crunch estimator already exists and could be
reused), and a soft guard on empty/imbalanced activation. Elites benefit from
the time estimate too.

### F10 — Logging density & autoregulation depth: strong, with small elite gaps. [E] — Impact: credibility (mostly do-not-regress)
The 1-tap prefilled log, beat-line tap-to-apply, cluster (myo/rest-pause)
logging, e1RM, deload prescriptions in-session, wall-clock timers, and full
a11y are at or beyond Hevy/Strong. Gaps for Eddie: **per-set RIR/RPE capture
was removed** (defaulted internally — see `SetEntry` comment; the engine still
uses RIR but the user can't set it per set), so an advanced user can't log true
autoregulation effort; and there's **no in-workout swap-with-equipment-filter**
(swap is ranked but you can't say "dumbbells only, now"). **Opportunity:**
optional per-set RIR for advanced/competitive experience tiers (progressive
disclosure, mirrors F3 in reverse); equipment filter on the swap sheet.

### F11 — Multi-step plan-add and confirmation friction. [Both] — Impact: activation (minor)
Library: add → confirm copy → confirm set-active = 3 taps; easy drop-off right
after the recommendation. **Opportunity:** "Add and start" single action on the
quiz result. Low effort.

---

## 3. Concrete opportunities (placement / flow)

| # | Opportunity | Persona | Where it lives | Effort |
|---|---|---|---|---|
| O1 | Exercise demos (staged: images → GIFs → film) | B/Both | In-workout "How to do it" sheet + ExerciseDetail | Med→High |
| O2 | Real Exercise Library screen: muscle-map browse, filters, demos | B/Both | New tab/screen off Plans or Home | Med |
| O3 | Gate set-type sheet by experience (Working/Warm-up + "More techniques") | B | Set-type bottom sheet | Low |
| O4 | "New here? Set me up" → free coach generator (experience+days+equipment); add those 2 questions to the Library quiz | B | Home empty-state + Library quiz | Low–Med |
| O5 | Wire up PlateCalculator from the Weight field + ExerciseDetail | B | SetEntry / ExerciseDetail | Low |
| O6 | "Adjusted for you" plain-language card after feedback | E/Both | Plans / Home post-session | Med |
| O7 | Jargon tooltips on first encounter (split, working set, MEV, rest unit) | B | Plans/Builder/RoutineDetail/Summary | Low |
| O8 | Builder: suggested exercises per day, live time estimate, soft empty/imbalance guard, surface Travel Mode | B/E | Manual + BuildWorkout | Med |
| O9 | Optional per-set RIR/RPE for advanced+; equipment filter on swap sheet | E | SetEntry / swap sheet | Low–Med |
| O10 | Quiz result "Add and start" one-tap | Both | Library quiz result | Low |

**Top 3 by conviction:** O1 (demos) — the beginner deal-breaker and the
clearest path to mass-market activation + virality. O4 (guided first plan via
the free generator) — turns five confusing peers into one funnel; biggest D0
activation lever and it reuses an engine that already exists. O3 (gate set
types) — near-zero effort, directly lowers beginner gym-anxiety without costing
Eddie a single tap.

**Do-not-regress:** 1-tap prefilled log, beat-line tap-to-apply, cluster
logging, 52pt steppers, audio/haptic rest escalation, wall-clock timers, offline
sourcing, the honest deterministic coach voice, division specificity.

**Constraint notes:** All ideas comply with offline-first (GIFs bundle locally;
no PII), no-LLM (demos are static media; "Adjusted for you" is presentation of
existing deterministic output), and FREE/Pro gating (library, builder, logging,
exercise library, demos, plate calc, the base generated plan all stay FREE;
division plans and Precision Coaching adjustments stay Pro). F4/O4 must be
careful to route beginners to the *free* generated-plan path, not a paywall.

---

## 4. Disagreements with prior conclusions
- The 2026-06-10 workout-screen deep-audit's harshest verdicts (29 interactive
  elements, 11pt italic beat chip, 5-button action row, logged sets below the
  fold) are **stale** — COMP-001 fixed all of them. Future work should not
  re-litigate the card layout; the remaining wins are in *content* (demos,
  learning, gating) and *funnel* (first-plan path), not chrome.
- Prior exercise-library research framed the gap as "completion, not
  capability." Agreed, but it under-weighted that **there is no browse screen at
  all** and that **PlateCalculator is dead code** — both are structural, not
  just content, gaps.
