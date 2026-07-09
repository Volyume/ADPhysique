# Volyume user-facing assessment: very good to world class

**Date:** 2026-07-09
**Scope:** every main user-facing area (onboarding, home, workout logging,
plans and builder, nutrition, coaching and progress, paywall and settings,
cross-cutting polish).
**Method:** eight read-only fact extractions over the real source (saved
verbatim as `facts-*.md` in this folder, with recorded caveats where the
mechanical sweep conflicted with closer reads). All judgement in this file
was made hands-on in the main loop against the locked voice document
(`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`) and the constraints in
`CLAUDE.md`. Nothing here proposes weakening any locked system.

---

## 1. Executive verdict

Volyume's brains, ethics and resilience are already world class. Its
sensory layer is not yet. That is the whole story of the gap.

What the evidence shows, repeatedly and consistently: fail-closed ED-safety
threading through every celebratory and weight-adjacent surface; honest
progress animation tied to real build phases; a cancel flow that is easier
than the industry norm rather than harder; empty states that never lie about
errors; drafts that survive process death; a voice that passes its own
honesty test. No mainstream competitor matches this discipline. It must be
protected, not revisited.

The distance to world class is concentrated in what the user sees, feels
and touches during the two daily loops (logging a set, logging a meal) and
in a handful of built-but-dark capabilities that are silently underselling
the app: no exercise media anywhere, a plate calculator that exists but is
never shown, iOS Live Activities code that cannot run, a paywall social
proof block shipped empty, tactile feedback missing across the entire
builder surface, and reordering by chevron taps in an app that already
ships the gesture library that would make it fluid.

None of the top gaps require new architecture. Most require either a
founder decision (several are already formally decision-gated) or focused
build work on surfaces this audit maps precisely.

---

## 2. Already world class: protect, do not revisit

1. **Safety as a product feature** (all facts files). One audited
   fail-closed pattern (`edFlagOpen || wellbeing === 'read_failed' ||
   isCalm(...)`) reused identically across home banners, celebrations,
   recap stories, body metrics, share cards, even setup-complete motion.
   A read failure suppresses rather than exposes. This is beyond anything
   shipped by competitors.
2. **Honesty discipline** (facts-onboarding, facts-paywall-settings,
   facts-logging). Real-phase plan-build animation that aborts without a
   fake tick; social proof deliberately dark until verified excerpts exist;
   store cancel handoff never gated on the exit survey; first-ever lifts
   never badged as false PRs; purchase confirmation awaited, never
   fire-and-forget, while never revoking paid access.
3. **State coverage** (all). Empty versus failed-load distinguished on
   every major surface; content-shaped skeletons rather than spinners;
   race guards on rapid date navigation; typed-but-unlogged set drafts
   flushed to storage on backgrounding; six distinct check-in gate states.
4. **Voice** (all). Calm, plain, British, no shame, engine acronyms
   translated to plain sentences ("sweet spot", "beyond this, recovery
   suffers"), floors framed as protection ("Held at your safe minimum").
5. **Theme discipline** (facts-cross-cutting): zero hard-coded colours
   across 236 files.
6. **Design traceability**: founder-dated decisions cited inline in code,
   so rationale survives contributor turnover.

---

## 3. Per-area verdicts

**Onboarding and auth: near world class.** The consent gate with a
self-serve decline path, no-default sex gate, draft persistence, and
endowed-progress wizard are excellent. Gap: the quiz has no progress
indicator while every sibling flow does; the OAuth wait is a bare caption
with no spinner or timeout affordance; repeated final-step failure has no
support path. Small, finishable. (facts-onboarding.md)

**Home and daily hub: world class in structure, very good in delivery.**
Banner prioritisation, ledger reuse so counts never disagree, and the
isolated per-second mini-bar are strong. Gap: a 3,048-line screen with no
memoisation recomputing all derived state per render; two blind +3s/+10s
reload timers papering over a sync race; the deload signal running on
partially stubbed inputs (its suggestions are only as honest as its
inputs, and honesty is this app's brand). (facts-home.md)

**Workout logging: very good, one decision and two wires from world
class.** Crash-lossless drafts, superset-aware auto-jump, honest PR logic
and calm celebrations are top-tier. Gaps: `calculatePlates()` is fully
built and tested with zero UI call sites; iOS Live Activities are inert
(missing Xcode widget target) so iPhone users get none of the lock-screen
rest experience Android users already have; RPE/RIR capture was removed so
the engine autoregulates on a hardcoded `rir: 2` for every user forever.
(facts-logging.md)

**Plans and builder: very good, least tactile surface in the app.** The
live MEV/MAV/MRV Plan Balance card while authoring is a genuine
differentiator no mainstream builder has. Gaps: zero haptics anywhere on
this surface; reorder is chevron taps despite gesture-handler being
installed; supersets hard-capped at pairs; no exercise illustration, video
or muscle diagram anywhere, including ExerciseDetail, where "How to do it"
is text only. Media is the single most visible difference from Hevy,
Strong and Fitbod. (facts-plans.md)

**Nutrition: world class in safety and flow, very good in polish.**
Adherence-neutral colour discipline, slot-specific one-tap "usuals",
offline-versus-miss disambiguation, and the barcode-miss to label-scan to
custom-food recovery chain are all excellent. Gaps are hygiene-level:
two 2,100-line screen files, dead-but-wired callbacks, a sequential
30-ingredient import path, and a free-tier read-only dead end on empty
historic days. (facts-nutrition.md)

**Coaching and progress: world class in substance, one coherence gap.**
Held-with-reasons cards, fast check-in with an escape hatch, plain-English
translation of every landmark, and fail-closed recap stories are the best
version of this in the market. Gaps: `WeeklyStoryScreen` promises a story
and delivers a static scroll while the real story mechanic lives in
`YearOfLiftsScreen`/RecapStory (a naming and mental-model split); applying
a week's decisions takes N separate taps with no reviewed "apply all"
convenience. (facts-coaching.md)

**Paywall and settings: very good and unusually ethical.** Per-feature
benefit copy on every lock, honest cascade, granular quiet-hours. Gaps:
the social proof block ships empty; the two purchase surfaces default to
different billing periods (annual on PaywallScreen, monthly on
ProUpgradeScreen, both deliberate but unreconciled); a known dead code
block sits in NotificationSettings. (facts-paywall-settings.md)

**Cross-cutting: the reach gap.** Dynamic type control exists in only ~6
files; accessibilityHint coverage is 9%; 45 screen files carry no a11y
props (caveat: some delegate to labelled components, so this is a
verify-list, not a defect count). Reduce-motion is genuinely well covered
via the store flag. Portrait-only and no-tablet are deliberate and fine at
this stage. (facts-cross-cutting.md, including its header caveats)

---

## 4. The gap, prioritised

Ranked by perceived-quality impact per unit of effort, for a paying user in
the daily loops. Items marked **[FOUNDER]** require a decision before any
build (several are already formally gated; this audit does not start them,
it prices them). Items marked **[GATED]** appear in the CLAUDE.md
decision-gated list (items 11 to 16) and MUST NOT begin without a
structured founder decision.

### P1: closes most of the felt gap

1. **Exercise media programme** [FOUNDER]. Illustrations or short demo
   loops plus a muscle diagram in ExerciseDetail and the picker. The
   single most visible difference from every world-class competitor. The
   body-diagram heatmap proves the app can render anatomy already;
   the sourcing model (licensed pack, commissioned set, in-house SVG
   anatomy first) is a cost and brand decision only the founder can make.
2. **Wire the iOS Live Activities target.** The TypeScript module exists;
   the Xcode widget extension target does not, so `Activity.request()`
   throws and iPhone users silently get no lock-screen rest timer or
   Dynamic Island presence. Native module work plus EAS build; no design
   decisions needed. Android already sets the bar in-app.
3. **Surface the plate maths.** `calculatePlates()` is built, tested and
   unused. A per-side plate readout under the weight field (and on the
   warm-up ramp) is a gym-floor moment competitors charge for. Pure
   wiring plus one founder call on where it appears.
4. **Haptic vocabulary rollout** [GATED: Core-Haptics is decision item
   within 11 to 16]. Nuance the gate correctly: `src/lib/haptics.js`
   (expo-haptics, already a dependency) is live on food surfaces, tab bar,
   PRs and rest timer, but absent across the entire builder and most of
   settings. Extending the existing vocabulary adds no dependency and may
   not touch the gated Core-Haptics question at all; adopting CoreHaptics
   custom patterns does. Both halves need the founder to rule.
5. **Drag-to-reorder in ManualBuilder and RoutineDetail.**
   gesture-handler and Reanimated 4 are installed; superset-pair atomicity
   and reduce-motion behaviour are already specified by the current
   chevron implementation. The chevrons were a deliberate convention
   choice, so reversing it is a founder call, but it is the fluidity gap a
   reviewer notices in the first minute of building a plan.

### P2: reach, trust and coherence

6. **Dynamic type and a11y-hint pass.** Policy for
   `maxFontSizeMultiplier` on dense surfaces (set rows, rings, charts),
   then work the 45-screen verify-list from facts-cross-cutting.md.
   World class ships accessibility; the app is at 78% labels but 9% hints
   and ~2.5% explicit type control.
7. **RPE/RIR decision** [FOUNDER]. The picker was removed as rarely used,
   but the engine now receives `rir: 2` for every set from every user.
   Options: lightweight optional capture (for example a post-set chip on
   top sets only), a per-user setting, or an explicit decision to accept
   the fixed assumption. Engine input fidelity is a coaching-quality
   ceiling, so this should be decided, not left implicit.
8. **Light the paywall social proof** [FOUNDER action, not build]. The
   honesty bar is defined (three or more verified, ED-screened, recent
   excerpts); the UI is finished; the array is empty. Founder curates from
   Play Console and the block goes live.
9. **Reconcile the billing-period default** [FOUNDER, billing-adjacent:
   requires the written test plan per docs/rules/billing.md]. Annual-first
   on one surface, monthly-first on another is two conversion hypotheses
   running unmeasured against each other.
10. **Unify the story mechanic.** Route WeeklyStory's chapters through the
    existing RecapStory slide experience (or rename it) so "story" means
    one thing. Also decide whether CoachOutput gains a reviewed
    "Apply all (N)" convenience above the per-card Applies [FOUNDER:
    per-card was a deliberate design].

### P3: hygiene that keeps world class cheap to maintain

11. **Decompose and memoise the monoliths.** ActiveWorkout 3,838 lines,
    CoachOutput 3,113, Home 3,047 with zero memoisation and a documented
    fragile positional-destructuring dependency. Extract loaders and
    banner logic; add an event-driven sync-complete signal to replace the
    +3s/+10s timers; feed the deload signal real inputs or label it.
12. **Delete the known dead code.** EmailPasswordFields and tests,
    NotificationSettings' unreachable `scheduleApply`, MealSection's
    dead-but-wired callbacks; refresh or retire WhatsNewSheet (its version
    guess means it silently never fires).
13. **Onboarding finish.** Quiz progress indicator, 44px skip target,
    spinner plus timeout affordance on OAuth wait, a support affordance on
    repeated final-step failure.
14. **Small equity fixes.** Free-tier read-only empty-day affordance;
    superset selection disabling at the cap instead of a toast; giant-set
    (3+) support [FOUNDER].

---

## 5. Founder decisions required (no-parking rule: these are asks, not notes)

Presented without a pre-chosen lighter option; each blocks its item above.

1. **Exercise media (P1.1):** (a) license an established media library,
   (b) commission a bespoke Volyume set, (c) build in-house SVG anatomy
   diagrams first and defer motion media, (d) remain text-only.
2. **Haptics (P1.4, gated item):** (a) roll the existing expo-haptics
   vocabulary across builder/logging/settings now and keep the CoreHaptics
   dependency question gated, (b) open the full gated CoreHaptics decision
   now, (c) leave tactile coverage as it stands.
3. **Reorder (P1.5):** (a) adopt drag-to-reorder with the existing
   libraries, (b) keep chevrons as the app-wide convention.
4. **Plate maths placement (P1.3):** (a) inline under the weight field,
   (b) tap-to-reveal chip, (c) warm-up ramp only.
5. **RPE/RIR (P2.7):** (a) reinstate lightweight optional capture,
   (b) per-user setting, (c) formally accept fixed RIR 2.
6. **Billing default (P2.9):** (a) annual everywhere, (b) monthly
   everywhere, (c) keep the split deliberately and record why. No billing
   change proceeds without explicit approval and a written test plan.
7. **Review excerpts (P2.8):** founder-only curation to the defined bar.
8. **Apply-all on CoachOutput and giant sets (P2.10, P3.14):** yes/no each.

---

## 6. What NOT to do

- Do not add AI, randomness, or tone-softening to the engine or its copy.
  The deterministic, cited, honest voice is the moat.
- Do not "fix" the empty social proof with placeholder or paraphrased
  reviews; the dark launch is correct until the bar is met.
- Do not revisit tier binarity, the consent gate, calorie floors, or any
  suppression path while polishing surfaces around them; every P1 to P3
  item above can be built without touching them.
- Do not chase tablet/landscape now; portrait-lock is a coherent choice
  for this product stage.

---

## 7. Resume pointers

Evidence: the eight `facts-*.md` files beside this document (read the
caveats header in `facts-cross-cutting.md` before quoting its numbers).
Process and stage log: `_HANDOVER-AND-RESUME.md`. Constraints this
assessment was judged against: `CLAUDE.md` sections 2 to 4 and
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` section 1.
