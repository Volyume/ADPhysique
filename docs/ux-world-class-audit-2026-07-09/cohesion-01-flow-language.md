# Cohesion lane 1: flow/connection + language (2026-07-09)

Read-only audit. No source edited. Mandate: the app should feel like ONE
amalgamated application — everything flows and connects, one voice, one
term per concept. Scope: how Home/Train/Eat/Progress/Coach/Partners/
Settings/onboarding connect as one product, plus app-wide terminology
consistency. Read first (not re-reported): `00-MASTER-INDEX.md` +
`coverage-00-SYNTHESIS.md` (design-usability-audit-2026-07-09),
`ASSESSMENT.md` + `facts2-navigation.md` + `facts2-copy-terminology.md`
(this folder), `COACHING_VOICE_SYNTHESIS_LOCKED.md`,
`docs/world-class-audit-2026-07-03/05-cohesion.md` (prior pass, re-verified
below — several of its findings are now fixed and are recorded as such
rather than re-flagged).

**Counts:** 7 findings (CO-1..CO-7). Severity: A = 1, B = 4, C = 2.
Class: SAFE-leaning = 0 pure, GATED = 1 (with a SAFE-once-scoped majority),
JUDGEMENT = 6.

## Summary

- **CO-1 (Sev A, GATED+JUDGEMENT)** is the headline finding: the founder's
  own D4 naming decision (`docs/design-usability-audit-2026-07-09/
  DECISIONS-2026-07-09.md`) — "your coach" for running prose, "Precision
  Coaching" for named/sold surfaces, **never** "The Coach"/"the Coach" as a
  proper noun — is not implemented. The banned form survives at 20
  non-test sites across 14 files, including one ED-safety FFM-floor output
  line and two regression tests that actively pin the banned copy as the
  expected string. This is the single biggest one-app-one-voice gap found.
- CO-2 and CO-3 are the two clearest missing pieces of cross-feature
  connective tissue: the Coach's own training-volume decisions never link
  to the plan they changed, and workout completion — the app's single
  highest-emotion daily moment — never links onward to Progress, Nutrition,
  or Coach.
- CO-4 through CO-7 are smaller seams: an intentionally-scoped Home surface
  worth a founder relook, an overloaded "goal" term, a verb-shaped tab label
  among four noun-shaped ones, and two parallel volume-adjustment
  mechanisms that never reference each other.
- **Already strong, do not re-touch:** `navigateCrossTab` helper now exists
  and is used consistently (`src/navigation/navigateCrossTab.js`, 8+ call
  sites) — the 2026-07-03 audit's "cross-tab nav copy-pasted 15x" finding is
  fixed. Widget discovery now has a Settings row (`SettingsScreen.js:161-167`)
  — that audit's "widgets orphaned" finding is fixed. All five tab stacks
  share one consistent NAV-5 re-tap-to-root convention
  (`RootNavigator.js:289-298` pattern repeated per stack). `DiaryScreen.js`
  reading `hasWorkoutOnDate`/`isTrainingDay` to drive training/rest-day
  nutrition targets (`DiaryScreen.js:151,196,201,263,414-422`) is genuinely
  excellent cross-domain wiring — food and training surfaces already
  acknowledge each other here. `CoachOutputScreen`'s nutrition-side deep
  links (to `NutritionTargets`, `DiaryTab→MealPlan`, `Methodology`,
  `CoachHeldHistory`) are a good model the training side should match (see
  CO-2).

## SAFE quick-wins
None of the seven findings below is a pure zero-judgement SAFE fix on its
own — CO-1's non-ED-safety sites are the closest (the naming rule is
already decided; only the per-site "which register" classification and the
mechanical swap remain), but a real sweep still needs a hands-on pass to
route each site correctly and to restore the one ED-safety line verbatim
per D4's own instruction. Treat CO-1 (non-ED-safety subset) as the fastest
finding to close.

## Needs-a-decision list
- CO-2: where the training-volume deep link should land (PlanDetail for
  the active plan? RoutineDetail for the specific routine touched?) and
  whether it should appear on every AdjustmentRow or only when a change was
  applied.
- CO-3: which one or two destinations WorkoutSummary should add (Progress
  trend vs Nutrition vs Coach) without over-loading an already-busy screen.
- CO-4: whether Home's food-blindness is worth revisiting given the
  cohesion mandate, given it was a deliberate COMP-027 scoping choice.
- CO-5: a terminology/IA decision on "goal" (three meanings) — mirrors the
  already-flagged L05-X1 "Meal" overload precedent in the design-usability
  audit.
- CO-6: whether to rename the "Train" tab label to a noun to match its four
  siblings, or leave it (a five-tab IA rename is user-visible on literally
  every screen).

---

## CO-1 — Sev A — Founder-decided coaching-actor naming rule (D4) is not implemented; the banned form is still the majority form

**Evidence.** `docs/design-usability-audit-2026-07-09/DECISIONS-2026-07-09.md`
D4 (dated 2026-07-09, this session) rules: "Precision Coaching" names the
branded feature (methodology, paywall/tier copy, consent explainers,
settings labels, glossary titles); **"your coach"** (lowercase, possessive)
is the informal actor in running prose (coach output cards, check-in copy,
home-screen briefs, notifications); "The Coach" / "the Coach" / "the coach"
as a proper noun is explicitly banned everywhere. This is also recorded as
an addendum in `COACHING_VOICE_SYNTHESIS_LOCKED.md` ("Addendum
2026-07-09: actor-naming rule").

`grep -rn "The Coach\b" src --include=*.js` (excluding tests) returns **20
hits across 14 files**, all genuine user-facing strings (not comments),
using "The Coach" as the subject of a sentence exactly the way D4 bans:
- `src/screens/YouScreen.js:121` "...**The Coach** will not change targets until enough data is in."
- `src/screens/YouScreen.js:337` "**The Coach** reads your logs, applies safety limits, and explains every decision." — this is the Coach-tab root's own status card, i.e. the single most-seen coaching-actor sentence in the app.
- `src/screens/MethodologyScreen.js:32` "**The Coach** follows clear rules. Each week it..." and `:86` — this is the NAMING surface itself; per D4 it should say "Precision Coaching" here, not "your coach" or "The Coach".
- `src/screens/ProUpgradeScreen.js:387` "**The Coach** follows clear training rules..." — a paywall/tier surface; per D4 should be "Precision Coaching".
- `src/screens/WelcomeScreen.js:29` "**The Coach** explains what changed, what stayed the same, and why."
- `src/screens/PlansScreen.js:74,81,722` (plan-library card descriptions + active-plan note): "**The Coach** keeps adjusting whichever plan you're on." / "**The Coach** adjusts this plan as you progress..."
- `src/screens/ProGoalSetupScreen.js:600-601` "**The Coach** adjusts at your next check-in..."
- `src/screens/ProSetupCompleteScreen.js:447-448` (onboarding hand-off): "**The Coach** then explains any calorie or training change before you apply it." (x2)
- `src/screens/WeeklyCheckInScreen.js:1386,1392` "**The Coach** needs at least {N} days of data..."
- `src/screens/BodyMetricsScreen.js:903` "**The Coach** estimates your daily burn..."
- `src/screens/CoachOutputScreen.js:798,2435` "**The Coach** reads your training and weight from day one..." / "**The Coach** is built on published training science..."
- `src/components/WeightTrendCard.js:105` "**The Coach** is building your estimate..."
- **`src/lib/nutritionEngine.js:402`** — ED-safety-adjacent: the FFM-floor hold insight line reads "**The Coach** has held your calorie target. Your seven-day average intake of {X} kcal is at or below your safety floor..." This is engine output feeding a safety-hold card. D4 explicitly says locked ED-safety surfaces are "restored hands-on (not by an agent), per the constitution" — this line needs the LEAD to restore it, not a delegated sweep.

Two regression tests currently **pin the banned copy as the expected,
correct string**, meaning any correct fix must also update the test:
- `src/__tests__/iaNavigation.guard.test.js:29` — `expect(COACH).toContain('The Coach reads your logs')`
- `src/lib/__tests__/ffmFloor.adaptive.test.js:115` — `expect(result.insight).toMatch(/The Coach/)`

Meanwhile "Precision Coaching" is used correctly at 32 sites (e.g.
`src/lib/differentialPaywall.js:50`, `src/lib/nutritionEngine.js:113,282,380,611`,
`src/lib/food/sanityChecks.js:2`), so the app currently runs **two
competing actor names side by side** — exactly the "toggled-together
features" feel the founder's mandate calls out, on the single most
frequent line of copy in the coaching product.

**Proposed change.** A full sweep per D4's own rule: MethodologyScreen,
ProUpgradeScreen (paywall/tier), and any settings-label/glossary-title site
→ "Precision Coaching". YouScreen, WeeklyCheckInScreen, ProGoalSetupScreen,
CoachOutputScreen running-prose lines, WelcomeScreen, ProSetupCompleteScreen,
BodyMetricsScreen, WeightTrendCard, PlansScreen → "your coach" (lowercase,
possessive, restructure the sentence subject where "The Coach" was the
grammatical subject, e.g. "The Coach reads your logs..." → "Your coach
reads your logs..."). `nutritionEngine.js:402` → restored to the exact
locked Surface-1-family wording, hands-on, matching the sibling floor line
already correct at `weeklyCoach.js` (per the design-usability audit's
L01-A15 note that a correct sibling already exists). Update the two guard
tests to assert the corrected copy.

**Effort:** M (20 production sites across 14 files + 2 tests + one
hands-on ED-safety line). **Class:** GATED for the `nutritionEngine.js:402`
line and the two safety-adjacent guard-test updates (ED-safety system,
CLAUDE.md §2 — LEAD reviews/restores by hand); the remaining 19 sites are
JUDGEMENT-per-site (classifying each into the "Precision Coaching" vs
"your coach" bucket per D4's rule) but the underlying decision itself is
already made, so no new founder ask is needed — this is an implementation
gap against a standing decision, not an open question.

---

## CO-2 — Sev B — Coach's own training-volume decisions never link to the plan they changed

**Evidence.** `src/screens/CoachOutputScreen.js` `TrainingNextWeekCard`
(lines 321-400ish) renders the weekly volume signal ("Add N sets to each
muscle group" / "Pull back N sets per muscle group" / "Take a recovery
week") with an Apply button that, once applied, shows `${label} ·
${musclesChanged} updated` (line 370-372) — i.e. this screen visibly
confirms it just wrote changes into the user's actual training plan. A
`grep` of every `navigate(` call in this 3,000+-line screen
(`CoachOutputScreen.js:1929,2048,2052,2285,2325,2365,2366,2414`) shows
targets of `ShareCard`, `NutritionTargets`, `DiaryTab→MealPlan`,
`Methodology`, and `CoachHeldHistory` — every one of them nutrition-side.
**Zero** target is `PlansTab`, `PlanDetail`, `RoutineDetail`, or
`BuildWorkout`. The nutrition half of this exact same screen deep-links to
where its change landed (`MealPlan`); the training half does not, despite
literally telling the user "N updated" a moment earlier.

**Proposed change.** Add a quiet "See your updated plan" link (matching the
existing `planEditNote?.deepLink` pattern already used for the nutrition
card at `CoachOutputScreen.js:2282-2286`) on the training card once
`applied` is true, routing via `navigateCrossTab(navigation, 'PlansTab',
'PlanDetail', { planId: ... })` (the helper already exists and is used
elsewhere in this file's cross-tab calls, e.g. Partner routing pattern
in `WorkoutSummaryScreen.js:723`).

**Effort:** S-M. **Class:** JUDGEMENT (exact destination screen + whether
it shows on every row or only post-apply is a design call; no locked
constraint touched).

---

## CO-3 — Sev B — Workout completion, the app's highest-emotion daily moment, never links onward to Progress, Nutrition, or Coach

**Evidence.** Every `navigate`/`navigateCrossTab` call in
`src/screens/WorkoutSummaryScreen.js` (grepped in full):
`ShareCard` (:716,775,791),
`navigateCrossTab(...'ProgressTab','Partner'...)` (:723,733),
`ProgressPhotos` (:1091), `RecapStory` (:1175,1214). That is the complete
set. There is no link to `Analytics`/`LiftProgress` (training-trend
Progress surfaces), no link to `Diary`/`MealPlan` (post-workout nutrition),
and no link to `CoachOutput`/`WeeklyCheckIn` (the coaching loop this
session's data feeds). `ASSESSMENT.md` itself names "the two daily loops
(logging a set, logging a meal)" as the app's core rhythm, yet the moment
that closes one loop never gestures at the other, nor at the progress
surface that is supposed to make the whole thing feel worthwhile.

**Proposed change.** Not a "wire everything" ask — one well-chosen addition
is enough to close the felt gap without cluttering an already-dense
celebration screen. Candidates: a quiet "See it on your training trend"
link into `LiftProgress`/`Analytics` when a PR or milestone fired (the
screen already has PR data in scope, per `detectedPRs`/`prList` at line
716), or (Pro only) a one-line nudge into Diary if no food has been logged
yet today.

**Effort:** S-M. **Class:** JUDGEMENT (which destination(s), and whether to
add at all given this screen's own design intent to stay a celebration
moment rather than a hub — a legitimate reason it may have been left
single-purpose).

---

## CO-4 — Sev C — Home ("Today") never acknowledges the food loop; noted for founder awareness, not proposed as a bug

**Evidence.** `src/components/TodayStrip.js:1-9` file header states this
explicitly: "The top Home strip is the morning-weight card. It does one
job well... Cardio and meal logging live in their own flows, not in this
premium slot." This is a **documented, deliberate** COMP-027 decision, not
an oversight. Confirmed by grep: `HomeScreen.js` has no `navigate` call
targeting `DiaryTab`/`Diary`/`MealPlan` anywhere; the only nutrition-related
navigation is the phase-sync banner routing to `NutritionTargets`
(`HomeScreen.js:1471`, a settings-style screen, not the diary itself). So a
Pro user's daily hub shows training state (start workout, last session,
weekly check-in nudge) and weight, but never today's food/macro progress —
the second of the app's "two daily loops" has zero presence on the tab
literally named "Today".

**Proposed change.** None proposed here — flagging for founder awareness
per the workflow rule (every fork is a founder call), since reversing an
explicit prior design decision (COMP-027) is exactly the kind of choice
CLAUDE.md §4 reserves for the founder, not this audit. If pursued: a
compact macro-progress row alongside TodayStrip, Pro-only, is the shape
implied by the existing pattern.

**Effort:** M if pursued. **Class:** JUDGEMENT — do not build without an
explicit founder decision; this reopens a named, deliberate prior scoping
call.

---

## CO-5 — Sev B — "Goal" names three unrelated concepts across domains

**Evidence.**
1. `userProfile.trainingGoal` — the physique/competition training goal,
   set in `ProGoalSetupScreen.js:88` (`selectedGoal`, saved as
   `trainingGoal: selectedGoal` at line 222).
2. `userProfile.goal` — a **separate** nutrition cut/maintain/bulk key,
   explicitly derived from the training goal's phase at the same screen,
   line 227: `goal: phaseToNutritionKey(selectedPhase), // nutrition goal
   key, kept in step with the phase so surfaces reading userProfile.goal
   (Nutrition Targets summary) match the saved calories.` The comment
   itself acknowledges these are two different fields that happen to share
   a name-root.
3. **"Goal lock"** — `GoalLockConsentScreen.js` — an ED-safety threshold
   consent (whether the app needs 2 or 3 stacked risk signals before
   holding calories), entirely unrelated to either "goal" above. Its
   on-screen title is "A note on aggressive cuts" (correct, cold-start
   register), but every other reference to it uses "Goal lock" as the
   feature name: the locked copy itself ("You can change this any time
   from You → Goal lock", `GoalLockConsentScreen.js:135`), the Settings
   entry point (`YouScreen.js:450`, `label="Goal lock"`), and
   `whyThisTemplates.js:538`. A user who taps "You → Goal lock" expecting
   to review or change their training/physique goal instead finds a
   one-off safety-signal-count toggle, unrelated to (1) or (2).

**Proposed change.** Not a copy-only fix — this is the same class of
finding as the design-usability audit's L05-X1 ("Meal" overloaded across 3
surfaces), a terminology/IA decision. Options: rename the safety toggle
away from "Goal" entirely (e.g. "Aggressive-cut safety setting" or "Cut
safety threshold"), or keep "Goal lock" but make its Settings row
sub-label state plainly what it does ("Safety-signal threshold for
aggressive cuts") so it doesn't read as a goal-editing entry point.

**Effort:** S (Settings sub-label only) to M (rename across locked copy,
would need the same D4-style recorded decision since it touches
`whyThisTemplates.js` and `GoalLockConsentScreen.js`'s locked Surface 4
text). **Class:** JUDGEMENT / partially GATED (Surface 4 text is locked;
a rename of the feature's colloquial name, not its locked body copy, is
lower-risk but still touches ED-safety-adjacent surfaces per CLAUDE.md §2
and should be founder-confirmed before changing anything beyond the
Settings row sub-label).

---

## CO-6 — Sev C — Tab label parity: four nouns, one verb

**Evidence.** `src/navigation/RootNavigator.js:565-569`:
```
<Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Today' }} />
<Tab.Screen name="PlansTab" component={PlansStack} options={{ title: 'Train' }} />
<Tab.Screen name="DiaryTab" component={DiaryStack} options={{ title: 'Nutrition' }} />
<Tab.Screen name="ProgressTab" component={ProgressStack} options={{ title: 'Progress' }} />
<Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Coach' }} />
```
"Today", "Nutrition", "Progress", "Coach" are all nouns naming a domain.
"Train" alone is an imperative verb. This is the single most-seen piece of
copy in the entire app (every screen, every session), so even a small
inconsistency here is disproportionately visible — more so than any
in-screen copy finding.

**Proposed change.** Rename the tab label to a noun to match its siblings
— "Plans" (matches the screen's own internal vocabulary: "Plan library",
"My plans", `PlansScreen.js`) or "Training". This is purely the tab label
(`options.title`); the underlying route name `PlansTab` and every screen
inside it are untouched.

**Effort:** S (one string). **Class:** JUDGEMENT (naming call on the most
visible surface in the app — worth a deliberate decision rather than a
silent swap, even though the change itself is one line).

---

## CO-7 — Sev C — Two parallel mechanisms adjust training volume, with no cross-reference between them

**Evidence.** `src/screens/CoachOutputScreen.js`'s `TrainingNextWeekCard`
(discussed in CO-2) makes small incremental weekly volume nudges,
spreading a signal "across every trained muscle in next week's planned
volume" per the file's own comment (`CoachOutputScreen.js:315-318`,
"Founder decision 2026-05-28: the coach owns weekly volume"). Separately,
`src/screens/PlansScreen.js:66-67` offers "Adjust training plan" — a full
rebuild wizard ("Change schedule, equipment, experience, division or weak
points... Volyume previews the rebuild before it replaces your active
plan", routed to `GatedPlanUpdate`). Both change the same underlying plan
data through two different mental models (small automatic nudge vs.
full manual rebuild), and neither screen mentions the other: opening
"Adjust training plan" doesn't say "the coach may also nudge your volume
weekly", and the coach's volume card doesn't mention "you can also
rebuild the whole plan from Train → Adjust training plan".

**Proposed change.** A one-line cross-reference on each surface, not a
merge of the two mechanisms (they serve genuinely different jobs — this is
a documentation/discoverability gap, not a duplicate-feature problem).

**Effort:** S. **Class:** JUDGEMENT (exact wording; low priority, this is
polish, not a broken flow — flagged so it isn't mistaken for a duplicate
feature that needs removing).

---

## What's already strong (do not re-touch)

- `navigateCrossTab` (`src/navigation/navigateCrossTab.js`) is a real,
  used-everywhere helper with its own guard test
  (`src/__tests__/navigateCrossTab.guard.test.js`) — the 2026-07-03 audit's
  finding #3 ("cross-tab nav workaround copy-pasted 15x") is fixed.
- Widget discovery has a Settings row with clear instructions
  (`SettingsScreen.js:161-167`) — that audit's finding #1 ("widgets
  ORPHANED") is fixed.
- All five tab stacks apply the identical NAV-5 re-tap-to-root listener
  (`HomeStack`/`PlansStack`/`DiaryStack`/`ProgressStack`/`ProfileStack`,
  each with the same `tabPress` + `isFocused()` + `popToTop()` block) — a
  textbook example of one consistent interaction pattern applied uniformly
  across every domain boundary.
- `DiaryScreen.js` reading `hasWorkoutOnDate`/`getFirstWorkoutDateOnOrAfter`
  to drive its training/rest-day target split (`DiaryScreen.js:34,151,196,
  201,263,414-422`) is exactly the kind of connective tissue the mandate
  asks for: the food surface genuinely knows about and reacts to the
  training surface's state, silently, every day.
- `CoachOutputScreen`'s nutrition-side deep links (`NutritionTargets`,
  `DiaryTab→MealPlan`, `Methodology`, `CoachHeldHistory`) are a good
  template — CO-2 asks only that the training side of the same screen
  match it.
- Deep-linking is layered cleanly into three non-overlapping mechanisms
  (React Navigation `linking` config, raw `Linking` auth/partner handler,
  notification-tap routing) per `facts2-navigation.md` — confirmed still
  true at `RootNavigator.js:663-742` and `:805-836`.

---

## Notes on scope discipline

Nothing above proposes weakening ED-safety copy, the consent gate, tier
gating, or billing. CO-1's one ED-safety line is flagged for hands-on
restoration to the exact locked wording, per the founder's own D4 decision
text, not for improvised rewording. CO-4 and CO-5 are surfaced as
questions, not proposals, because each would reopen or touch a previously
deliberate/ED-adjacent decision. British English used throughout.
