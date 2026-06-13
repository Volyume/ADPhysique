# Phase 3 master-comparison — Workout logging screen

Sources reconciled:
- VOLYUME CURRENT — `docs/ultimate-audit-2026-06-13/phase1/01-workout-session.md`
  (Active Workout / logging) and `…/phase1/02-workout-build-history.md`
  (build, routine-edit, history, summary, plan builders) — file:line-grounded.
- MARKET — `docs/ultimate-audit-2026-06-13/phase2/research-01-workout-screen.md`
  (50 apps; VERIFIED/PARTIAL/NOT-FOUND statuses + source URLs).

---

AREA: Workout logging screen (Active Workout, with adjacent build/edit/history/summary surfaces)

VOLYUME CURRENT: A live set-by-set logging screen (`ActiveWorkoutScreen.js`,
2625 lines). One exercise's set-entry card at a time: weight + reps steppers,
a single primary "Log set" button, an in-card rest timer, and a horizontal
exercise-navigator chip strip for multi-exercise sessions (phase1/01,
:27-68). Previous-session numbers render inline on the "beat line" directly
above the inputs — "Last: 40kg × 8 · Target 8–10 ↑" — and are tap-to-apply
(:1605-1672; :1633-1658). Best case the previous values are pre-filled and a
set logs in **1 tap**; accept-previous-then-log is **2 taps**; manual
stepper adjustment is **3+ taps** (phase1/01 §3, :306-313). Logged sets build
a "This workout" receipt above the action row (:1855-1867). The screen
supports straight/warm-up/drop/myo-reps/rest-pause/AMRAP set types,
supersets, per-side unilateral logging, cluster sets, e1RM display, and PR
detection (:128-135). It is a FREE feature, ungated (:79-85). Adjacent
surfaces: BuildWorkout (ad-hoc session), RoutineDetail (engine-ranked swaps +
reorder), WorkoutHistory (list/calendar + filters), WorkoutSummary
(animated stats, per-muscle volume, optional feedback), and the plan/meso
builders (phase1/02 throughout).

BEST IN CLASS: **Strong** — "the fastest way to log a workout", two taps per
set with the previous weight/reps pre-loaded and visible at the input on open;
the r/weightroom default, built on the assumption the user is mid-rest under
time pressure (VERIFIED). Source:
https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
; https://repreturn.com/strong-app-vs-hevy/. **Hevy** — best previous-data UX:
holds and shows last rep+weight inline, tap to fill; a verbatim App Store
review cites this as the reason users improve: *"I love how it holds the last
rep and weight from the previous time I did the exercise so I can work towards
improving."* (VERIFIED). Source:
https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350?see-all=reviews
. **Setgraph / FitNotes / StrengthLog** — minimalism benchmark: "very minimal,
easy layout", "functional and clean", reviews literally say "Perfect!"
(VERIFIED). Source:
https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters.

TOP 50 RANGE: 50 apps researched, 35 with usable UX data (MARKET §1). The
spectrum runs from clean-and-fast loggers (Strong, Hevy, Setgraph, FitNotes,
StrengthLog — VERIFIED) through programmed-depth-but-unpolished tools
(RP Hypertrophy "lacks modern polish", 2.8 Trustpilot; Alpha Progression
"underwhelming interface"; JuggernautAI auto-regulation; Liftosaur scriptable —
all PARTIAL) to the cluttered cautionary case (JEFIT: "crowded interface…
overwhelming… abundance of features and information", changing an exercise
went from "one quick tap" to extra screens — VERIFIED). A separate cluster
(Nike Training Club, Freeletics, Apple Fitness+, Peloton) does not track
weight/reps strength progression at all (NTC VERIFIED; others PARTIAL/NOT-FOUND).
Sources: https://etechshout.com/jefit-app-review/ ;
https://dr-muscle.com/rp-hypertrophy-app-review/ ;
https://fitnessdrum.com/alpha-progression-app-review/ ; https://www.liftosaur.com/.

NEWBIE VERDICT: The core loop serves a beginner well: "Weight (kg)", "Reps",
a big amber "Log set" button and a first-set hint "Choose a weight and reps,
then tap Log set when done" make the primary action discoverable
(phase1/01 NEWBIE, :120-126). Crucially, the no-history state shows a confident
default target rather than a blank field ("First time · Target …", :1661-1670)
— which is exactly what the market says beginners need: "they want to be told
exactly what to do" rather than face a blank field (PARTIAL, F7.1,
https://www.boostcamp.app/blogs/most-popular-free-workout-routines-from-reddit).
But the surrounding vocabulary is dense for a first-timer — "Superset",
"myo-reps", "rest-pause", "AMRAP", "cluster", "deload/Recovery week",
"Est. max ≈" (phase1/01 :122-126) — and clutter is "disproportionately costly"
for newbies who cannot yet filter signal (PARTIAL, F1.2,
https://setgraph.app/ai-blog/best-workout-tracker-app-reddit).

ATHLETE VERDICT: Strongly served on depth. Volyume supports the full set-type
range, supersets, per-side logging, cluster sets, session targets with
beat-chip progression, e1RM and PR detection (phase1/01 ATHLETE, :128-135),
plus periodisation tracking, per-muscle volume vs landmarks and 4-week trend
on the summary (phase1/02 :452-454). This is depth the polished market leaders
lack — "neither [Strong nor Hevy] provides… weekly sets per muscle group,
progressive overload tracking across mesocycles" (PARTIAL, F4.1,
https://repreturn.com/strong-app-vs-hevy/). Gaps a competitor may feel:
RPE is hard-disabled (`rpe:null`) and RIR is no longer asked per set, removing
autoregulation granularity; no plate-maths/bar-loading helper (the `plateBtn`
style exists but is unused) (phase1/01 :132-135). Note the market shows
autoregulation depth lives in JuggernautAI/Liftosaur, which trade UI polish for
it (PARTIAL, F7.2).

WHERE WE LEAD:
- **Previous data + one-tap apply at the input** — the beat line shows
  "Last: …" inline and applies on tap (phase1/01 :1633-1658). This matches the
  Strong/Hevy best-in-class pattern exactly (VERIFIED, F3.1,
  https://repreturn.com/strong-app-vs-hevy/ ; Hevy App Store).
- **Tap count meets/beats the benchmark** — 1 tap best case, 2 typical, vs
  Strong's two-tap benchmark; we stay within the "3 steps maximum" guidance
  (phase1/01 §3; VERIFIED, F6.1 + F8.1,
  https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph
  ; https://stormotion.io/blog/fitness-app-ux/).
- **Large, thumb-friendly primary controls** — 52×52 weight/reps steppers and
  a filled `paddingVertical:16` "Log set" button (phase1/01 :91-92, :149).
  This is the one-handed/sweaty-hand pattern the market demands: "large,
  easy-to-tap elements", no tiny swipes (PARTIAL/VERIFIED, F5.1 + F8.1,
  https://stormotion.io/blog/fitness-app-ux/ ;
  https://developer.apple.com/forums/thread/678265).
- **Programmed depth behind the log** — set types, supersets, clusters,
  per-muscle volume and mesocycle tracking exist without crowding the default
  single-exercise surface (phase1/01 :128-135, :167-171). Market says nobody
  pairs programmed overload depth with a clean logging screen (PARTIAL, F4.2,
  https://www.liftosaur.com/).
- **No social-feed / streak clutter on the logging screen** — none present in
  the inventory (phase1/01 §WHAT IS ON IT). Serious lifters call such features
  "bloat" (PARTIAL, F1.3,
  https://setgraph.app/ai-blog/best-workout-tracker-app-reddit).

WHERE WE LAG:
- **Banner stacking pushes inputs/previous-data below the fold** — starter,
  superset, next-time notes, deload, target line, rest timer and
  target-reached banners can all sit between header and set-entry card, so the
  beat line and inputs can require scrolling (phase1/01 :108-110, :315-327).
  Best-in-class keeps previous data always visible at the input, not behind
  scroll/tap (VERIFIED, F1.1 + F3.1,
  https://setgraph.app/ai-blog/best-app-to-log-workout-tested-by-lifters).
- **Dense, small-text card-header zone** — the three header lines (orientation,
  beat, coach) are `sm (13px)` label-grey, crowded directly above the inputs —
  the densest, smallest-text zone sits exactly where the eye must land
  (phase1/01 :112-114). The market's only citable type anchor is "body ≥16–17pt,
  never below 16px" (VERIFIED platform standard, F2.2,
  https://fontfyi.com/blog/mobile-typography-accessibility/). NB: no app
  discloses its own in-app font sizes (NOT FOUND, F2.1) — this lag is measured
  against the platform standard, not a competitor value.
- **Sub-44px edge/strip controls for fatigued hands** — header "X" (≈38px),
  "Finish" (≈37px), "Swap" (<44px), beat-line tap (≈27px) and short text inputs
  (≈36px tall) are all below the 44pt standard, several at the screen edges
  (phase1/01 §VISUAL touch-targets, §7). Market standard is WCAG 44×44 / iOS
  44pt (VERIFIED, F2.3, https://fontfyi.com/blog/mobile-typography-accessibility/)
  and explicitly warns against tiny targets for numb/sweaty hands (PARTIAL,
  F5.1, https://developer.apple.com/forums/thread/678265).
- **Source-level bloat** — the file is 2625 lines with eight in-file modals
  (phase1/01 :102-106). Not directly the visible surface, but the market's
  dividing line between loved and tolerated is clutter (VERIFIED, F1.2,
  https://etechshout.com/jefit-app-review/).

MISSING ENTIRELY:
- **Plate-maths / bar-loading helper** — present in market (Caliber, Gravitus
  cite plate calc; PARTIAL, MARKET §1 #10/#16); a `plateBtn` style exists in
  Volyume but is unused in render (phase1/01 :135).
- **Per-set RPE/RIR autoregulation input** — RPE hard-disabled, RIR no longer
  asked (phase1/01 :132-134); market positions auto-regulation as a core
  athlete draw (PARTIAL, F7.2, https://dr-muscle.com/juggernaut-workout-app-review/).
- **Explicit programmed on-screen overload prescription at point-of-log** —
  the market leaders also lack this (the overload mechanic is the visible
  previous number, not a prescription), so it is a gap nobody fills rather than
  a place we trail (PARTIAL, F4.1, https://repreturn.com/strong-app-vs-hevy/).

USER SENTIMENT: Users describe a "perfect" logging screen by what is ABSENT,
not present — "bare bones and serious", "simple", "intuitive", "no fluff",
"effortless", and the tell "can't even think of a suggestion to improve it";
praise centres on SPEED and the absence of friction, not richness (VERIFIED
App Store quotes + Reddit-via-aggregator, MARKET §3,
https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 ;
https://www.corahealth.app/blog/best-workout-tracker-reddit). The single most
frequent complaint across all trackers is "too many taps to log a set"
(PARTIAL, F6.1, https://www.corahealth.app/blog/best-workout-tracker-reddit).
The genuine unmet want across the market: nobody pairs explicit programmed
overload targets with a genuinely clean logging screen (PARTIAL, F4.2,
https://www.liftosaur.com/) — the gap Volyume's depth-behind-a-clean-log model
is positioned to close.

VERIFICATION STATUS: Not all-VERIFIED. VERIFIED items this block leans on:
Strong two-tap log + previous-data pattern (F6.1 Strong-side, F3.1), Hevy
previous-data App Store quote (F3.1), JEFIT clutter (F1.2), always-visible
previous data (F1.1), platform type/touch standards (F2.2, F2.3), retention/
3-step/60-second figures (F8.1), App Store sentiment quotes (§3).
PARTIAL-dependent claims: progressive-overload / mesocycle gap in Strong-Hevy
(F4.1); programmed-depth-vs-polish trade-off (F4.2); newbie "tell me what to do"
and athlete autoregulation-depth segmentation (F7.1, F7.2); one-handed /
sweaty-hand pain points (F5.1); social/streak "bloat" sentiment (F1.3); Reddit
"too many taps" complaint (F6.1 Reddit-side); plate-calc presence in
Caliber/Gravitus (§1). NOT-FOUND items honoured (not filled): no app discloses
its exact in-app font sizes (F2.1 — Volyume's type lag is stated against the
platform standard only); and no controlled study isolates clean-logging→
retention for a strength app (F8.1 caveat — treated as directional, labelled
INTERPRETATION at source).
