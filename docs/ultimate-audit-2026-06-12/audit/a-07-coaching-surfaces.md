# Ultimate Audit a-07 — Coaching surfaces (how the deterministic engine SPEAKS)

Code-verified internal audit, no internet. Area 07 of the ULTIMATE-APP mandate.
Branch `claude/admiring-bohr-2kb7pd`. Every claim carries file:line evidence.
Confirms or updates the prior-art headline (int-02: *intelligence top-tier,
COMMUNICATION the weakness, cold-start F1 critical*) against current code, after
the C1/C2 register layer, the five-part response and the free one-liner shipped.

Files read in full: `src/lib/coachResponse.js`, `src/lib/coachRegister.js`,
`src/lib/food/planExplain.js`, `src/screens/MethodologyScreen.js`,
`src/screens/SettingsCoachingScreen.js`, `src/components/food/HeldDecisionCard.js`;
audited via agent: `CoachOutputScreen.js` (2401 lines), `WeeklyCheckInScreen.js`
(1749), `CoachReviewScreen.js` (790). Spot-read: `weeklyCoach.js`,
`whyThisTemplates.js`, `insightsEngine.js`, `RootNavigator.js`, `HomeScreen.js`.

---

## 0. Headline verdict

The prior art is **confirmed and now partly out of date in the app's favour.** The
communication layer the int-02 audit asked for has been **built**: a real
five-part elite-coach response (`coachResponse.js`), a persona-aware register
(`coachRegister.js`, C1 Supportive/Precise/Automatic), an opt-in science layer
(C2 `withScience`), a free one-liner (`buildFreeCoachLine`), food-level
narration of calorie changes through the live meal plan (`planExplain.js`), and a
Fast Check-In that pre-derives most answers. The **engine now speaks well.**

The remaining weakness has moved from *"there is no good copy"* to *"the good
copy is not always reached, and the best of it is gated behind a route that does
not resolve."* Two findings dominate: (a) the highest-priority Home coach banner
deep-links to a route absent from its navigator (dead tap — confirms a-02 #1);
(b) the rich five-part **cold-start shrink** built into `coachResponse.js` is
**bypassed** on `CoachOutputScreen`, which hard-gates week-1 users to one static
paragraph. So F1 is **improved in the library, not yet delivered on the screen.**

---

## 1. WHAT — every surface where the coach speaks

### 1.1 The five-part weekly response (the spine)
`buildCoachResponse` (`coachResponse.js:327`) renders the elite-coach five-part
structure from the weekly engine output. Pure, deterministic, jargon-guarded
(`clean()` throws in dev on blocklist or em/en dash, `:40-51`):

1. **Acknowledgement** (`buildAcknowledgement`, `:75`) — names something REAL from
   the week: sessions trained, PRs, weigh-ins, or an answered check-in. Never
   generic praise; returns `null` when nothing is real (`:116`). Honesty test:
   "would this still be true if the user did nothing but kept logging?"
2. **Interpretation** (`buildInterpretation`, `:143`) — plain-language trend read,
   "Your 7-day average is up/down X kg on last week" + verdict, with an on-target
   **streak** sentence ("the third week running at the right rate", `:168`).
3. **Decision** (`buildDecision`, `:185`) — the call plus reason, reusing existing
   decision data: ED lockout reason verbatim first (`:191`), else the calorie
   change ("The call this week: calorie target up/down N kcal", `:197`), else a
   held-calorie reason, else `whyThisWeek`.
4. **Cue** (`buildCue`, `:227`) — exactly ONE tactical cue by a fixed priority
   ladder: thin weigh-in data → sleep <6.5h → missed sessions → joint pain →
   untracked calories → calorie adherence → default consistency line.
5. **Forward** (`buildForward`, `:280`) — anchors the next check-in ("See you
   Sunday. The next read checks the trend against the target again", `:281,294`).

**Suppression carve-out** (ED flag / calm mode, `suppress`, `:337`): rate language
dropped to direction-only (`:147-152`), weigh-in counts hidden (`:98,104`), no cue
asks for daily weighing or tighter food control (`:237,257,265`). Safety copy is
register-blind and identical in every tone.

### 1.2 C1 — persona register (`coachRegister.js`)
`buildRegisteredCoachResponse` (`:254`) wraps `buildCoachResponse` and re-renders
parts 1, 2, 4, 5 in a **Precise** register when resolved; part 3 (the decision) is
carried **byte-identical** (locked reason strings, `:283`). Precise is figure-led
and terse: "Sessions: 4 of 4." (`:110`), "7-day average: down 0.4 kg on last
week." (`:159`), "Log morning weight daily. Each log sharpens the read." (`:185`).
Supportive is the warmer `coachResponse.js` original, unchanged.

`resolveRegister` (`:80`): explicit preference wins (`supportive`/`precise`);
**Automatic** keys off `experienceLevel` (advanced/competitive → precise;
beginner/intermediate → supportive; missing → `trainingAgeYears >= 5` → precise).
**Beginner-safe by construction**: missing/ambiguous signals land supportive
(`:87`). Under suppression the supportive base is returned untouched whatever was
resolved, and the returned `register` is forced to `'supportive'` (`:264`).

### 1.3 C2 — opt-in science layer
`withScience(plain, technical, showScience)` (`coachRegister.js:308`) renders
"weekly target range (MEV to MRV)" only when explicitly opted in; the plain term
always leads, the technical term **never appears alone** (`:312`).
`checkJargonScienceOn` (`:327`) strips bracketed segments and re-runs the full
blocklist on what remains, so science-ON copy outside brackets still passes.
**Gap (verified):** `withScience` is wired only in the library — `CoachOutputScreen`
**does not pass `showScience` and never calls `withScience`** (agent-confirmed: no
`showScience` prop, no `withScience` call anywhere in the 2401-line screen). So the
C2 toggle in Settings (below) currently changes **nothing** on the main coach
output surface. The science layer is built but **unconsumed**.

### 1.4 The free one-liner
`buildFreeCoachLine` (`coachResponse.js:406`) — single sentence from ONLY
free-tier data: completed sessions + direction-only weight trend (no rate, no
figure, no units, `:418-430`). "Weight trend is down this week. 3 sessions
trained." Returns `null` when nothing real. Surfaced on Home for free users only
(`HomeScreen.js:37,398,1099-1105`, gated `tier==='free'` `:943`).

### 1.5 Food-level narration (the coach → meal-plan integration)
On applying a calorie change, `CoachOutputScreen` pulls the same delta THROUGH the
active generated plan and narrates it at the food level (`:808-823`).
`buildPlanEditNarration` (`planExplain.js:49`) is register-aware (`:75`, fed the
same `resolveRegister` result, `:816`): "Your target dropped 180 kcal this week. I
have taken 30 g of carbs off your plan. That is 40 g of rice and a slice of toast.
Your protein stays the same." (`:108-110`). Precise variant: "Target dropped 180
kcal. Plan updated." (`:106`). Carries a `floorNote` when the safe floor clamped
the edit (`:113`) and a **deep-link** `{ label: 'See your meal plan', target:
'MealPlan' }` (`:121`), rendered to `DiaryTab → MealPlan` (`CoachOutputScreen:1675`).
This is the "transparent coach at the gram of rice" moat, and it works.

### 1.6 The held-decisions card + whyThis receipts
The **live** held card is the inline `HeldDecisionsCard` (`CoachOutputScreen:526-610`,
rendered `:1758`): "What we held this week" + each `d.reason`, plus ED-pattern
lockout (Beat UK support CTA, external URL `:614,623`), ED-cleared, and
rapid-loss-corrected blocks (shows `+N kcal`, `:679`). It deep-links to
`Methodology {source:'held_decisions'}` (`:1763`) and to `CoachHeldHistory` ("See
all weeks", `:1762`).
`WhyBlock` (`:368-387`, rendered `:1722`) shows "Why this week:" + `whyThisWeek` +
"Understand how this decision was made" → `Methodology {source:'why_block'}`.
**Dead component flagged:** `src/components/food/HeldDecisionCard.js` (the older
amber-badge card with a Beat CTA) is referenced **only in a test**
(`foodComponents.test.js:26`); nothing in the live tree imports it. Orphaned UI.

### 1.7 Check-in flow + pre-derivation (`WeeklyCheckInScreen.js`)
Four-step wizard (`TOTAL_STEPS=4`, `:215`): Step 0 feeling (energy 1-5 **required**,
stress 1-5, sleep hours free-text); Step 1 data (weight trend read-only; cycle,
calorie adherence, steps, cardio — all **conditional** on feature gates); Step 2
recovery (soreness 1-5 **required**, sore-muscle multiselect if soreness≥2, joint
pain toggle, free-text); Step 3 training performance (2×2 grid **required**).
**Heavy pre-derivation** in `load()` (`:336-534`): training performance derived
from logged sessions/PRs/volume (`deriveTrainingPerformance:85`, pre-selected
`:494`); calorie adherence from food rollups (`deriveCalsAdherence:102`); steps from
`summariseWeekSteps` (`:833`); cardio from the log (`:268`). Pre-filled fields show
"Pre-filled from your logged sessions. Tap a different option if it feels wrong."
(`:1004`).
**Fast Check-In** (COMP-008, `fastEligible:550`): when training/cals/steps/cardio
are all confidently derived, `renderFastCheckIn` (`:1071`) replaces the wizard with
a read-only summary + only TWO inputs (energy + soreness, the two never derivable,
`:1126-1153`). Escape hatch "Add more detail" → full wizard (`:1427`). This is a
genuinely strong, best-in-class reduction of check-in friction.

### 1.8 Pre-workout readiness (not post-workout)
The readiness prompt is **pre-workout**, in `HomeScreen.js` (`showIntentPrompt`
modal, `:1664-1740`): intent (Sharp/Average/Below par) + three optional chip rows
(soreness 1-3, sleep, energy), skippable (`:1734`). `WorkoutSummaryScreen` reads
these back read-only and captures a distinct post-session "How did it feel?"
(difficulty/pump/fatigue/joint, `:1047,92-97`), writing only `sleepQuality` into the
weekly check-in to avoid clobbering (`:484-492`). There is **no** post-workout
survey that feeds the weekly check-in beyond sleep.

### 1.9 Coaching settings (`SettingsCoachingScreen.js`)
Calmer-experience toggle (`:113`, drops aggressive targets, quietens prompts);
Pro-only: step target (`:129`), cardio (`:161`), **C1 coaching tone** chips
Automatic/Supportive/Precise (`:183-213`), **C2 "Show the science"** toggle
(`:217-232`); cycle tracking shown only for female bio-sex (`:235`). C1/C2 persist
as **local-only** profile fields (`coachTone`, `showScience`, `:35-39`).

### 1.10 Methodology page (`MethodologyScreen.js`)
Static, offline, copy-only trust surface: intro always open + five collapsible
sections (cooldown, steps, holds, training signals, safety floors, limits,
`:30-99`). Founder copy-gated and kept truthful to engine maths (`:11-19`).
Reached from the You tab, the coach WhyBlock, and the held card (`source` param,
`:131`). **Note vs prior brief:** the brief expected a "free-only row state" on
this page; the current file has **no tier branch at all** — it renders identically
for every user and is registered ungated (`RootNavigator:389`). Either the
free-only row was never built or was removed; documented here as **absent**.

### 1.11 Coach nudges on Home
- **Coach-review banner** (`showCoachBanner`, `HomeScreen:929`): Pro, fresh output
  <7 days, highest banner priority. Body "Calories adjusted to N kcal. Tap to see
  why." (`:1019`). **Its tap target is broken — see §2.1.**
- **Coaching nudge** (`showCoachingNudge:935,1536`): one-time, check-in-day only,
  "Your weekly check-in is ready" → opens check-in via `getParent()→ProfileTab`
  (correct cross-tab pattern, `:1046`).
- **CoachBriefCard** (`buildCoachBrief:1751`, rendered `:1203`): rest-day/recovery
  micro-coaching headline+body, plan-aware, dismissable.
- **Free one-liner** (§1.4).

### 1.12 Week 1 (cold start) vs Week 6 — what a user actually sees
- **Engine library**: `weeklyCoach.runWeeklyCoach` holds below 3 weigh-ins
  (`assessDataConfidence:107`, dataNote "Need at least 3 morning weights…") and
  returns a **baseline** output below 2 weeks (`hasEnoughData=false`,
  `_buildBaselineOutput:1317`, dataNote "Keep logging. Adjustments start after your
  second week." `:614`). Crucially the baseline output STILL carries
  `sessionsCompleted/Planned`, `prsThisWeek`, `whatWorking` and a `building_baseline`
  whyLine. And `buildCoachResponse` is **built to shrink gracefully** for exactly
  this: when `hasEnoughData===false` it still renders acknowledgement + cue +
  forward (`coachResponse.js:364-373`). So the *library* delivers a real, warm
  week-1 read.
- **The screen throws that away.** `CoachOutputScreen:1457` hard-gates
  `if (!output || !output.hasEnoughData)` → renders only `InsufficientDataView`
  (`:698-716`): a single static paragraph "Building your baseline." + the dataNote
  + a "Got it" button. The five-part cold-start shrink is **never reached**. Week-1
  Besa gets one apologetic paragraph; the engine's available encouragement
  (sessions trained, PRs, "the data is building") is computed and discarded.
- **Week 6 (established)**: full five-part response, decision card, held card, why
  block, food-level narration on apply, share card. This is the strong state.

### 1.13 Free vs Pro coaching experience
| Surface | Free | Pro |
|---|---|---|
| Weekly check-in | gated (`GatedWeeklyCheckIn`, `RootNavigator:149`) | full |
| Coach output / five-part | gated (`GatedCoachOutput:152`) | full |
| Free one-liner on Home | **yes** (`HomeScreen:1099`, free-only) | no |
| CoachReview (training retro) | **ungated** (`RootNavigator:300,346`) | yes |
| Methodology page | ungated, identical | identical |
| C1/C2 tone + science | hidden (Pro-only block) | shown |
| Differential upsell badge | free-only (`CoachOutputScreen:1767`) | never |

So a free user's entire coaching voice is the **one-liner** plus the (free)
CoachReview retrospective and the static Methodology page — no five-part read, no
decision, no held-decision narrative.

---

## 2. WHERE — placement, findability, dead ends

### 2.1 Confirmed dead end — the top coach banner (a-02 finding #1, VERIFIED)
`CoachOutput` is registered **only in ProfileStack** (`RootNavigator:388`, as
`GatedCoachOutput`). It is **absent from HomeStack** (the stack ends at `:307`
with no `CoachOutput` route). `HomeScreen:1008` calls
`navigation.navigate('CoachOutput', { weekStart })` with a **bare name** from
inside the Home navigator. React Navigation resolves `navigate(name)` against the
current navigator and its ancestors — `CoachOutput` is in a **sibling** stack
(Profile), not an ancestor of Home, so it does not resolve: the tap is a **no-op /
dead end.** This is the **single highest-priority banner in the whole Home stack**
(`showCoachBanner` outranks trial, deload, phase). Contrast the deload banner
directly below it, which correctly uses
`getParent()?.navigate('ProfileTab',{screen:'WeeklyCheckIn'})` (`:1046`) and
targets `CoachReview`, which **is** in HomeStack (`:300`). Every other cross-tab
jump on Home uses the `getParent()` pattern (`:127,987,1046`); this one alone does
not. **This is the most damaging single defect in the area** — the primary way a
user is invited to read "what does my coach think" from Home silently fails.
Fix is a one-line `getParent()?.navigate('ProfileTab',{screen:'CoachOutput',…})`.

### 2.2 How a user finds "what does my coach think" at any moment
- **From Home**: the coach banner (broken, §2.1) or the check-in-day nudge.
- **From the check-in**: submitting the weekly check-in navigates to
  `CoachOutput` (`WeeklyCheckInScreen:640`) — this path **works** (in-Profile-stack).
- **From a notification deep-link**: into `CoachOutput` with `weekStart`
  (the `weekStart` default at `CoachOutputScreen:753` exists specifically so the
  deep-link doesn't false-fall to the baseline view).
- **Two parallel "weekly" screens** — `CoachReview` (training-volume retro,
  algorithms-driven, no engine) and `CoachOutput` (Precision Coaching weekly read).
  They are separate and reachable from different places; a user has **no single
  "my coach" home** and may not understand they are different things.

### 2.3 Other friction / dead-ends
- **C2 science toggle changes nothing** on the coach output (§1.3): a Pro user who
  enables "Show the science" sees no difference — a settings control with no effect.
- **Orphaned `food/HeldDecisionCard.js`** (§1.6): dead code, test-only.
- **Cold-start screen short-circuit** (§1.12): the engine's week-1 warmth is
  computed then discarded by the screen gate.

---

## 3. FEEL — tone in the actual strings

Voice is warm-but-economical, British English, no em dashes (banned in dev,
`coachResponse:46`, `coachRegister:53`). Question copy is human and reassuring:
"How are you feeling? How your body and mind are doing sets the context for
everything else." (`WeeklyCheckIn:681`); the Fast card "We've read your week from
your logs. Just confirm how you're recovering." (`:1110`). Methodology reframes
holds beautifully: "A held week is the system working, not the system asleep."
(`MethodologyScreen:68`).

**Jargon discipline is strong and enforced.** The blocklist (`whyThisTemplates:40-62`)
bans MEV/MAV/MRV/RIR/RPE/mesocycle/"junk volume", three science phrases, and seven
researcher surnames, with word-boundary regexes; `clean()`/`assertNoJargon` throw
in dev across `whyThisTemplates`, `coachResponse`, and `coachRegister`. Agent
confirmed **no jargon reaches visible strings** on `CoachOutputScreen` (MEV/mrv
appear only in apply payload identifiers and comments, never UI). The most clinical
user-facing terms that DO surface: "Prescribed cardio" (`WeeklyCheckIn:896`),
"Precision Coaching" as a named actor, and "PR/PRs". This is a genuine improvement
over the int-02 F3 jargon-leak finding **for the coaching surfaces** (the
periodisation/heatmap screens flagged in F3 are out of this area's scope and not
re-checked here).

**Besa with no data**: gets one paragraph ("Building your baseline.") — calm and
honest, but a thin reward for opening the screen, and the warmth the engine could
offer is withheld (§1.12). **Eddie reading a held decision**: gets the inline held
card with the exact reason, a "See how Precision Coaching decides" link, an ED/FFM
support path that never dead-ends (`HeldDecisionCard:18-24`), and — if he chose
Precise — figure-led copy throughout. This is a strong, credible experience.

---

## 4. GAPS / FRICTION (per code) — ranked

1. **Top coach banner dead-tap (§2.1).** Highest-priority Home banner →
   unresolvable route. The flagship "see why your coach changed your calories"
   invitation silently fails. **Critical, one-line fix.**
2. **Cold-start screen bypasses the engine's own week-1 warmth (§1.12).** F1 is
   *fixed in `coachResponse.js`* (graceful five-part shrink) but *not delivered*:
   `CoachOutputScreen:1457` hard-gates to one static paragraph. **F1 status:
   improved in library, NOT yet on screen.** The cheapest high-value fix in the
   area is to render the shrunk five-part response for `hasEnoughData===false`
   instead of `InsufficientDataView`.
3. **C2 "Show the science" is a no-op (§1.3, §2.3).** Built (`withScience`,
   `checkJargonScienceOn`) and surfaced in Settings, but never consumed by
   `CoachOutputScreen`. A Pro toggle that does nothing erodes trust.
4. **Two unlinked "weekly" surfaces + no single coach home (§2.2).** `CoachReview`
   (free, training retro) and `CoachOutput` (Pro, Precision Coaching) are parallel,
   separately reached, never cross-linked. A user has no canonical "what does my
   coach think right now" entry point that always resolves.
5. **Free coaching voice is thin (§1.13).** Free users get a direction-only
   one-liner and a static methodology page — no decision, no held-decision
   narrative, no interpretation. The differential upsell badge is the only
   coach-driven Pro pull on the output screen. Whether to widen the free read is a
   gating/product call, but as code stands the free coach barely speaks.

Lesser: telemetry gap (the paywall *pay* tap on `CoachOutputScreen:1782` fires no
event, only `shown`/`dismiss`); the orphaned `food/HeldDecisionCard.js`; Methodology
"free-only row" expected by the brief is absent.

### Cold-start verdict
**Partially resolved, not delivered.** int-02 rated F1 critical. The library now
handles cold-start gracefully (`buildCoachResponse` shrink at
`coachResponse.js:364`; baseline output still carries sessions/PRs/whatWorking at
`weeklyCoach.js:1317`). But the consuming screen throws that warmth away
(`CoachOutputScreen:1457`), so the **user-visible** week-1 experience is still a
single apologetic paragraph. The fix is now a presentation change, not an engine
change — exactly the int-02 prescription, one step from done.

---

## 5. Surface inventory

**Screens (8):** `CoachOutputScreen` (the five-part read + apply + held + why +
food narration + differential badge), `CoachReviewScreen` (training-volume retro,
free), `MethodologyScreen` (static trust page), `WeeklyCheckInScreen` (4-step +
Fast Check-In + gates), `CoachHeldHistoryScreen` (held-decision history),
`SettingsCoachingScreen` (calm/steps/cardio/C1/C2/cycle), `CoachingRemindersScreen`
(reminder config), plus the **pre-workout readiness modal** inside `HomeScreen`.

**Live components (4):** inline `HeldDecisionsCard`, `WhyBlock`,
`InsufficientDataView`, `EdPatternLockoutBlock` (all within `CoachOutputScreen`);
`CoachBriefCard` + coaching-nudge + free-one-liner banners (within `HomeScreen`).
**Dead component (1):** `src/components/food/HeldDecisionCard.js` (test-only).

**Engine / library modules (7):** `coachResponse.js` (five-part + free one-liner),
`coachRegister.js` (C1 register + C2 science), `weeklyCoach.js` (integrator, data
confidence, holds, baseline), `whyThisTemplates.js` (jargon blocklist + templates),
`insightsEngine.js` (3-week-base gated cards), `coachApply.js`/`coachingGoals.js`
(apply + training notes), `food/planExplain.js` (`buildPlanEditNarration`).

**Settings fields (5):** `coachTone` (C1), `showScience` (C2, unconsumed),
`calmMode`/wellbeing, `stepsEnabled`/`stepsTarget`, `cardioEnabled`, cycle tracking.

**Telemetry events (≈10):** `methodology_opened` (MethodologyScreen:131);
`weekly_coach_run`, `ed_pattern_flag_fired`, `ed_pattern_flag_cleared`,
`rapid_loss_compression_triggered`, `ffm_floor_hold_fired`,
`step_tdee_modifier_evaluated`, `paywall_shown`, `paywall_tapped_cta`
(CoachOutputScreen:1274-1789); `checkin.weekly.submit` (WeeklyCheckIn:571). Gaps:
the paywall *pay* tap and the readiness prompt fire nothing.

**Total surface count: 8 screens + 4 live components (1 dead) + 7 library modules
+ 5 settings fields + ~10 telemetry events.**
