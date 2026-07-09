# 04 — Flow, ease of use and self-explanatory design

Audit date: 2026-07-09. Scope: VOLYUME (React Native/Expo, `/home/user/ADPhysique`),
read-only, no code changed. Lens: does the app flow easily, avoid information
overload, and explain itself without a manual — measured against the founder's
bar ("every user will enjoy using it... understandable without information
overload, self-explanatory most of the time") and the named competitors
(Hevy/Strong for logging, MacroFactor/MyFitnessPal for food, Whoop/RP for
coaching).

## Method

`src/navigation/RootNavigator.js` was read in full (1,588 lines) for gating and
IA. Six prior audits were read in full first so this report does not repeat
fixed findings: `docs/hevy-teardown-2026-06-29/{U1-workout-flow,U2-onboarding-flow,
U3-navigation-usability,U4-task-friction,_PARITY-SCORECARD-AND-BACKLOG}.md`,
`docs/world-class-audit-2026-07-03/_SYNTHESIS.md`,
`docs/volyume-launch-audit-2026-07-08/{00-full-audit,README}.md`. Every claim
inherited from those docs was **re-verified against current source** (five
parallel research passes, one per journey, each reading the live screens in
full/large part) rather than trusted at face value — several were found to have
shipped since 06-29/07-03/07-08 and are marked **FIXED** below rather than
re-reported as open. File:line citations throughout are current as of this
audit; line numbers will drift as the code moves.

## Honest verdict up front

This is a **materially stronger app than the 2026-06-29 teardown described**.
Since that audit, the team shipped: tap-to-edit/delete on logged sets
(`ActiveWorkoutScreen.js:124-166,3176-3230`), rest-timer lock-screen/notification
controls with Skip and ±15 actions (`src/lib/notifications/restTimerActions.js`,
`RestTimer.js:18-21,179-184`), a persistent "return to your workout" mini-bar so
leaving `ActiveWorkout` no longer loses the session
(`src/components/ActiveSessionMiniBar.js`), a first-run splash gated to
first-run only (`RootNavigator.js:753-763`), an "I'll choose myself" path
promoted to a real button (`FreeStarterScreen.js:250-259`), plan→diary
adherence ("mark eaten") at both day and per-meal granularity
(`DiaryScreen.js:271-297`), offline-vs-not-found search/scan/OCR copy
(`FoodSearchScreen.js:322-343,798-828`; `ScanLabelScreen.js:94-104,375-391`), a
Coach-tab root that now leads with the coach's own status instead of settings
(`YouScreen.js:311-339`), the GoalLockConsentScreen regression fix, and a "why"
hero line + confidence caption on CoachOutputScreen. None of these needed
re-flagging; they are called out below only where relevant context requires it.

Across the six journeys walked, **no severity-A dead end was found** — every
screen a new user can reach has a next step, and every destructive action is
guarded. The remaining friction is almost entirely severity B (needless taps,
undiscoverable affordances, self-inconsistency) and C (polish). That is itself
a finding worth stating plainly: the app is close to the bar, not far from it.

---

## Journey 1 — First run → auth → consent → onboarding → first home view

Files: `WelcomeScreen.js`, `LoginScreen.js`, `Article9ConsentScreen.js`,
`FirstRunScreen.js`, `FreeStarterScreen.js`, `ProOnboardingScreen.js`,
`ProSetupCompleteScreen.js`, `HomeScreen.js`, `RootNavigator.js`.

**The real path for nearly every user is the Pro path.** `Article9ConsentScreen.js:127-139`
calls `cascade.startCascade()` on every consent grant, which starts the 14-day
Pro trial for virtually all new users — the Free path (`FirstRunScreen` →
`FreeStarterScreen`) is reached mainly when that RPC fails, not as a normal
choice. `QuizScreen.js`/`PlanPreviewScreen.js` are dead code in production
(`ONBOARDING_QUIZ_FIRST = false`, `src/lib/onboarding/quizFlow.js:24`).

**Tap count, Pro path (the one nearly everyone takes):** Welcome CTA (1) →
OAuth (1, external) → consent checkbox + Continue (2) → Step 2 Continue (1,
~5 required fields) → Step 3 Continue (1, ~4 selections) → Step 4 Continue (1,
~2 selections) → Step 5 Continue (1, triggers a fixed ~3.2s "building your
plan" sequence) → "Start training" (1) = **9 taps + ~15 field interactions**
to a populated Home. This is deliberate, not accidental: sex/age/height/weight
feed the ED-safety calorie floor directly (`ProOnboardingScreen.js:591-630`)
and CLAUDE.md forbids defaults on required onboarding fields — correct as
built, not a candidate for loosening.

**B — Step 2 is denser than the wizard's own stated rule.** `ProOnboardingScreen.js:632-635`
comments that steps are split so "neither step carries more than a handful of
fields," and Step 3/4 honour that — but Step 2 (`:1063-1289`) still bundles two
`QuestionGroup`s (name/sex/age/height/units/weight, then body-fat%+source) —
up to 7 fields on one scroll. The rest of the wizard already proves the
per-question pattern works; Step 2 doesn't follow its own precedent. This is
the single highest-abandon-risk screen in onboarding.

**Article 9 consent gate — confirmed correctly LOCKED.** `Article9ConsentScreen.js:51-165`:
Continue is disabled until the checkbox is ticked; no back/skip route exists
in the render tree; a "What if I don't agree?" disclosure (`:247-291`) explains
consequences without weakening or reordering the gate. Working as designed —
observation only, no change suggested.

**C — a fixed ~3.2s "building your plan" beat** (`ProOnboardingScreen.js:85-93`)
runs even when generation finishes sooner. It is honestly staged (four real
phases, aborts cleanly on failure) rather than theatre, so this is a minor
note, not a defect.

**Home first view:** Pro users land on a populated session card, no empty
state (`advanceFrom5`, `:920-953`). The rare Free/cascade-failure path gets a
well-built empty state with two clear CTAs and explanatory copy
(`HomeScreen.js:1752-1779`) — no dead end.

---

## Journey 2 — Start and log a workout (cold start)

Files: `HomeScreen.js`, `ActiveWorkoutScreen.js` (3,668 lines, full),
`WorkoutSummaryScreen.js`, `BuildWorkoutScreen.js`, `RestTimer.js`.

**Tap counts, cold start:**
- Planned session: Start (hero CTA) → intent chip or Skip → Log set = **3
  taps** (`HomeScreen.js:1075-1145,2118-2214`; `ActiveWorkoutScreen.js:2532`);
  **2 taps** if the user has turned on "Don't ask before each session"
  (`:2198-2211`).
- Blank session (Pro or Free): quick-start card → lands on an empty-exercise
  view → Add exercise → pick → Log set = **4 taps**
  (`HomeScreen.js:1155-1165,1805-1833`; `ActiveWorkoutScreen.js:3242,3279`).

**F1-F8 from the 2026-06-29 audit, re-verified:**

| # | Finding | Status |
|---|---|---|
| F1 | Readiness modal on every planned start | **Improved, not fully open.** Now has an in-modal "Don't ask before each session" opt-out (`HomeScreen.js:2198-2211`, a founder decision already implemented) and blank-session starts skip it entirely. |
| F2 | "Finish Workout?" confirm alert on every finish | **Still open.** `ActiveWorkoutScreen.js:1656-1668`, `appAlert('Finish workout?', ...)` unchanged. |
| F3 | No lock-screen timer / no notification actions | **FIXED.** Persistent lock-screen notification + Skip/±15 actions, guarded against stale taps (`RestTimer.js:18-21,179-184`; `src/lib/notifications/restTimerActions.js`). |
| F4 | No minimise; full-screen takeover | **Structurally still a full screen** (`ActiveWorkoutScreen.js:1918` `SafeAreaView`), but `ActiveSessionMiniBar.js` now docks above the tab bar on every tab while a session is live and returns the user to `ActiveWorkout` in one tap — the practical effect Hevy's minimise gave is now present, but **B — nothing on the ActiveWorkout screen itself tells the user they can navigate away and come back**; the affordance exists only by discovering it after switching tabs once. |
| F5 | Logged sets read-only mid-session | **FIXED.** `LoggedSetRow` (`:124-166`) now opens a full edit/delete sheet with a delete-confirm dialog (`:1381,1412,3176-3230`). |
| F6 | No in-session reorder | **Still open** (no drag/reorder code found). |
| F7 | Remove exercise is overflow → confirm | **Still open**, and **B — the same header ellipsis icon (no visible text label) hides 8 actions** total: swap, add exercise, add note, exercise info, warm-up ramp, pair, shorten session, remove (`:2012-2031,2838-2974`). Swap and Add exercise are the two most-used of these and are not surfaced as their own visible buttons. |

**Mid-session tap counts:** add a set = 1 tap (prefilled from the last set);
swap exercise = 3 taps (overflow → Swap → pick); add exercise = 3 taps
(overflow → Add → pick); rest timer ±15/Skip are direct-labelled buttons, no
confusion.

**B — new finding: blank-session quick-start silently skips readiness
capture.** Both quick-start entry points hardcode `intent: null`
(`HomeScreen.js:1155-1165`), bypassing the intent modal entirely rather than
routing through its Skip. A Pro user who prefers the quick-start button gets
no readiness-informed coaching adjustment (`sessionAdjustments`/`readinessTweak`,
`ActiveWorkoutScreen.js:387-397`) and is never told this trade-off exists. This
is an undisclosed coaching-quality gap tied to which button the user happens
to tap.

**Finishing & summary:** the confirm dialog (F2) still gates every finish;
`WorkoutSummaryScreen.js` is unambiguous about what happened — "Workout
complete" header, hero tonnage counter, a 4-week comparison verdict, and a
stat row (Exercises/Working Sets/Duration), closed with a non-destructive
button (`:865,905-963,1339-1348`).

**B/C — information density above the input.** On a fresh exercise, up to
7-8 fixed-position elements can stack above the weight/reps input: header,
exercise-nav strip, title+overflow, a collapsible "N cues" rail, RestTimer,
warm-up banner, orientation/target/beat/coach lines
(`ActiveWorkoutScreen.js:1921-2331`). The "N cues" collapse is a real
mitigation; on a short device this is still the densest input screen in the
app.

**Positive, confirmed:** every destructive action (discard workout, remove
exercise, stale-session discard) has a Cancel-first, destructive-styled
confirm; Android hardware back is intercepted and routed through the same
cancel-confirm flow, so it cannot silently discard a session
(`ActiveWorkoutScreen.js:637-644`); "Shorten session" and auto-advance both
carry their own undo/cancel; empty states (`EmptyExerciseView`, the exercise
picker's no-results state) teach and offer a next action, no dead ends found.

---

## Journey 3 — Log a food (search, barcode, recent/favourites, custom, OCR)

Files: `DiaryScreen.js`, `FoodSearchScreen.js`, `ScanBarcodeScreen.js`,
`ScanLabelScreen.js`, `AddCustomFoodScreen.js`, `MealPlanScreen.js`.

**Tap counts:** recent/favourite/frequent → log = **1 tap** (one-tap re-log
at the remembered portion, `FoodSearchScreen.js:385-425,771-786` — the fastest
path in the app); search → log = **3 taps** + typing; barcode → log on a hit
= **2 taps**; custom food creation = **4 taps** + a full form; OCR label scan
→ log = **4 taps** (two photos + save), reachable only after a barcode miss,
not as a direct entry point (see below).

**FIXED, confirmed against Wave 1/2 commits:** search and barcode-scan
empty/error states now distinguish offline from genuine miss
(`FoodSearchScreen.js:322-343,798-828`; `ScanBarcodeScreen.js:133-158`;
`ScanLabelScreen.js:94-104,375-391` — the most thorough of the three); OCR
low-confidence fields carry a visible amber flag at save
(`AddCustomFoodScreen.js:59-63,292-305`); plan→diary "mark as eaten" is fully
wired at both day and per-meal granularity, including correctly withholding
the confirm on future days and filtering unconfirmed rows from the read-only
free-tier view (`DiaryScreen.js:271-297,1306-1334`).

**B — the plate/"+" quick-add is still secondary, unchanged since June.**
Every search row's primary tap still opens the single-item detail sheet
(`onPress`, `FoodSearchScreen.js:783`); the "+" that adds to the multi-item
plate is a small icon glyph on the row with no onboarding hint, unlike the
long-press-portion hint which does get one (`:1003-1008,786`). A user who
never notices the "+" never discovers multi-add, despite it being the
lower-friction path for logging more than one food.

**B — no direct OCR entry point.** Barcode scan is a floating circular FAB
with only an icon and an accessibility label, no visible text
(`DiaryScreen.js:1523-1536`). Label OCR has no button of its own anywhere
reachable from Diary or Search — it only appears after a barcode scan misses
(`ScanBarcodeScreen.js:127-132`). A user who knows their item has no barcode
(fresh produce, home-cooked food) has no obvious way to reach the OCR path
without first failing a barcode scan.

**Positive, confirmed:** destructive actions are severity-appropriately
guarded — per-item food delete is optimistic + Undo toast, no dialog
(`DiaryScreen.js:952-996`); saved-meal/recipe delete (irreversible) correctly
gets a hard confirm (`MyMealsScreen.js:124-139`, `MyRecipesScreen.js:117-131`).

**C — information density.** A single DiaryScreen render can stack up to
~10 sections before any food is logged: read-only banner, coach-receipt chip,
MacroRings, macro-cycle/refeed rows, micronutrient panel, an OFF-consent
card, planned-meal banner, hint caption, meal cards, water row
(`DiaryScreen.js:1089-1451`). No progressive disclosure beyond the
micronutrient panel's own internal collapse.

---

## Journey 4 — Weekly coaching loop (check-in → coach output → apply)

Files: `WeeklyCheckInScreen.js`, `CoachOutputScreen.js` (3,025 lines),
`GoalLockConsentScreen.js`, `ProSetupCompleteScreen.js`, `HomeScreen.js`,
`GoalChangeSummaryScreen.js`, `PlanUpdateScreen.js`.

**Tap counts:** Fast Check-In = **3 taps** (energy chip, soreness chip,
"See this week's coaching," `WeeklyCheckInScreen.js:620-628`); full 4-step
wizard = **6-9 taps** depending on how much is pre-derived vs. overridden.

**Gates, re-verified precisely (more nuanced than the June audit stated):**
`need_weights` and `day_late` both now have a "Check in anyway" escape
(`:1356-1358,1441-1443`); `wrong_day` and `too_soon` still have **no escape at
all** — only "Got it" / goBack (`:1289-1403`). `wrong_day` is a deliberate
weekly-rhythm constraint with a clear route out (change the check-in day), so
severity **B**, not a stuck dead end.

**FIXED, confirmed:** the GoalLockConsentScreen regression from the 2026-07-03
audit (two dropped locked-voice sentences) is fully restored and now pinned by
a source guard test (`src/screens/__tests__/goalLockConsent.lockedCopy.guard.test.js`);
CoachOutputScreen now has a "why" hero line and a confidence caption on every
decision (`CoachOutputScreen.js:2058-2083,2265-2267`); Methodology is linked
from ProSetupComplete, the trial banner, and the WhyBlock's "Learn more"
(three deep-link points, up from zero).

**B — still no in-place glossary on the screen carrying the most jargon.**
CoachOutputScreen uses zero `InfoTooltip`s (confirmed via a repo-wide grep:
26 other files use the component, this one doesn't) and imports no
`coachGlossary`. Terms like EWMA/trend, MEV/MRV and floor language are only
explained by following "Learn more" out to Methodology, not inline.

**B — "nothing applies until you tap Apply" is never stated outright.** Each
adjustment (Nutrition, Training, Diet break, Macro cycle, Refeed) is its own
card with its own Apply button and an "Applied" chip once tapped
(`AdjustmentRow`, `:175-221`) — the no-auto-apply behaviour is *implied* by
seeing several unapplied cards, but no copy on the screen says the rule in
words. A first-time user has to infer it.

**B — no undo after Apply.** Once a change is applied, the only recourse is
manually re-editing NutritionTargets or waiting for next week's coach run; the
2-week cooldown prevents stacking but doesn't help a mistaken tap.

**C — CoachOutputScreen can show 7+ distinct cards in one scroll**
(Nutrition, Training, Diet break, Macro cycle, Refeed, Held decisions, contest
countdown, progress-scan context), mitigated by an existing hero-zone
promotion + "More adjustments" collapse, so this reads as reasonably managed
rather than raw overload.

**LOCKED, observation only:** ED-pattern lockout/cleared/rapid-loss-corrected
blocks are cleanly separated from standard "held" rows and are never diluted
by the "See how the Coach decides" link — working as designed, not touched.

---

## Journey 5 — Progress (photos, measurements, PBs, analytics)

Files: `AnalyticsScreen.js` (Progress tab root, 1,183 lines, full),
`ProgressPhotosScreen.js`, `BodyMetricsScreen.js`, `LiftProgressScreen.js`,
`ConsistencyScreen.js`, `YearOfLiftsScreen.js`, `VolumeHeatmapScreen.js`.

**Tap counts from Progress root:** body metrics 1 tap, progress photos 1 tap,
consistency 1 tap, volume heatmap 1 tap, a single lift's chart 2 taps,
Year-of-Lifts recap 1 tap (but only reachable once the account is ≥365 days
old — by design).

**FIXED, confirmed:** Partner and Progress Photos were both promoted out of
the generic tile grid to full-width, explicitly labelled `NavTile`s
(`AnalyticsScreen.js:557-587`) — the prior audit's "Partner is an unlabelled
buried tile" finding no longer holds. Year of Lifts avoids the old dead-tap
pattern entirely by not rendering until unlocked.

**B — the "Explore" grid label is unchanged** (`:693`) despite the 2026-06-29
audit's R6 recommendation to rename it; it remains a generic label over
Consistency/Lifts/Body Metrics/Full History/Recaps.

**B — new finding: "Recent sessions" cards look tappable but are not.**
They render via the shared `Card` with no `onPress` (`:965-987,603-621`),
styled identically to every other card on the screen that *does* navigate
somewhere on tap. Only the separate "All sessions" header button works. This
is a genuine dead-tap on a primary tab, and the most natural gesture (tap the
thing that looks like a card) fails silently.

**B — new finding: `PhysiqueOptIn` teaching card is dead code.**
`BodyMetricsScreen.js:744` only renders when `!physiqueEnabled && !readOnly`,
but Pro users have `physiqueEnabled` force-set true before this check runs
(`:498-507`), and free/read-only users are excluded by the `readOnly` guard
itself. The result: this onboarding explainer for body-metric tracking can
never render for any real user today. Not user-facing harm (both paths
degrade to a working screen), but it is dead UI that no longer teaches
anything.

**B — screen density.** The Progress root stacks 13 sections and 20+
independently tappable elements before scrolling ends: dashboard hero +
sparklines, weekly streak strip, milestone rows, a monthly-recap nudge,
an insight stack, Partners/Photos tiles, weight trend, recent sessions,
volume strip, cardio card, lifetime totals, and the Explore grid
(`:351-755`). Every section is individually well-labelled, but as a landing
screen it reads as "everything in one place" rather than a hierarchy.

**Empty states — genuinely good.** A brand-new user sees a lean root
(`"No training trends yet"` with copy pointing at what's still usable below,
`:506-512`) plus well-taught empty states on LiftProgress, Consistency, and
especially ProgressPhotos (a persistent explainer hero card regardless of
data state, `ProgressPhotosScreen.js:1382-1401`). No dead ends found.

---

## Journey 6 — Settings sprawl (Coach/You tab)

Files: `YouScreen.js`, `SettingsScreen.js` and its 8 sub-screens,
`NotificationSettingsScreen.js`.

**FIXED, confirmed — the tab used to lead with settings, it now leads with
coaching.** `YouScreen.js:311-339` carries an explicit "Coach-tab root
reorder" comment: the coach's own status card (latest decision / pending
check-in) is the first content block; the profile/account card is pushed
down; Settings access is a small header gear icon, not a list item. The prior
audit's core Journey 6 finding is resolved.

**SettingsScreen root** (`:86-293`) has 12 well-categorised rows (Account,
Profile, Coaching, Nutrition targets*, Meal names*, Per-day targets*,
Notifications and reminders, Coaching reminders*, Display and accessibility,
Home screen widget [Android], Health*, Your data, Privacy and legal, Help and
about) plus an inline Workout & Units section. Sign-out/delete-account are
correctly isolated in their own "Account access" section on
`SettingsAccountScreen.js:61-79` — not buried, not duplicated.

**C — inconsistent row semantics.** "Home screen widget" (`:151-162`) shows
a chevron implying navigation but actually opens an `appAlert` info dialog —
every other row on the screen navigates to a real screen; this one row
doesn't match the established pattern.

**B — reminders have three entry points to one destination.**
`SettingsScreen.js` lists "Notifications and reminders" and (Pro) "Coaching
reminders" as two separate rows; `NotificationSettingsScreen.js:613-632`
cross-links to the second from inside the first; `YouScreen.js:419-430` adds
a third route to the same screen. Not duplicated data, but an unclear
taxonomy of "where do notification settings live."

**B — inconsistent destructive-action isolation.** `SettingsDataScreen.js:219-284`
mixes "Clear workout history" inline with ordinary sync/export/backup rows;
`SettingsPrivacyScreen.js`'s consent-withdrawal row is likewise inline —
neither follows the isolated "Account access" pattern `SettingsAccountScreen.js`
already establishes elsewhere in the same tab.

**Founder-awareness flag, not a recommendation (GDPR-shaped, don't touch
without asking).** `SettingsPrivacyScreen.js:43-54` computes the row label as
`healthConsent === true ? 'Delete account and withdraw consent' : 'Health-data
consent'`. Since nearly every active user has consented (consent is
mandatory to use the app), **the row's everyday, default-state label is a
permanently destructive-red "Delete account and withdraw consent"** — there
is no neutral "view your consent status" state for the common case. This is
very likely intentional (Article 7(3) requires withdrawal to be as easy as
giving consent, and a well-built double-confirm already guards the actual
action, `useAccountActions.js:382-421`), so this is surfaced as an
observation for founder awareness, not a proposed fix.

---

## Cross-cutting findings

**Empty states — a real strength, unevenly applied.** The shared
`EmptyState` component (`src/components/EmptyState.js`) is well-designed:
adherence-neutral copy, an icon, a title, one or two sentences, primary +
secondary CTA slots, and a "ghost" ready-for-your-data preview mode. It's used
in 25 of 82 screens (`grep` count). Every empty state actually encountered in
the six journeys above taught the user what to do next — no blank/dead
first-time screens were found. **C — sweep the remaining first-time-relevant
screens onto the shared primitive** rather than ad-hoc text, for consistency.

**Error states — calm and, on the surfaces checked, correct.** Offline vs.
not-found is now correctly distinguished on food search, barcode scan, and
label OCR (see Journey 3) — the single biggest trust gap the 2026-07-08 audit
flagged is closed on all three of those surfaces.

**Loading feedback — broadly present.** Skeleton/`ActivityIndicator` usage
appears in 50 of 82 screens (`grep` count); the Home root shows skeleton
placeholders during the initial cold-load window rather than a blank screen
(`HomeScreen.js:1558`).

**Confirmation friction.** An app-wide `appAlert` wrapper is used 104 times
across 35 screens; the heaviest users are `ActiveWorkoutScreen.js` (15),
`ProOnboardingScreen.js` (13), and `SettingsDataScreen.js` (9). Spot-checked
confirms (workout discard/remove, food/meal delete, macro-cycle stop) are all
severity-appropriate — reversible actions get optimistic-write + Undo, only
genuinely irreversible ones get a hard dialog. No over-confirmed low-stakes
action was found in the six journeys beyond the minor macro-cycle-stop note
in Journey 3.

**Destructive actions — consistently guarded.** Every destructive action
checked across all six journeys (workout discard, exercise remove, food
delete, saved-meal/recipe delete, consent withdrawal, account deletion) has
either a Cancel-first destructive-styled confirm or an optimistic Undo. No
unguarded destructive action was found.

**Back behaviour.** Android hardware back is explicitly intercepted on
`ActiveWorkoutScreen` and routed through the same cancel-confirm as the
on-screen button (`:637-644`) — it is the only screen in the app that
overrides hardware back, and it does so correctly (can't accidentally
discard). Every tab stack resets to its root on re-tapping an already-focused
tab (`NAV-5`, present in every `*Stack` function in `RootNavigator.js`), so
back-stack position after a tab round-trip is predictable everywhere.

**Undo availability.** No global "undo last action," but every individual
destructive/automatic action inspected carries its own local undo or cancel:
food-entry delete (Undo toast), "Shorten session" (explicit revert), the
1.8s exercise auto-advance (a visible "Stay here" cancel, replacing a silent
timeout per the 2026-07-03 audit's C3 recommendation — **confirmed shipped**,
`ActiveWorkoutScreen.js:1289,2435-2453`). The one exception found is
CoachOutputScreen's Apply action (Journey 4).

**Discoverability of key features.** Home-screen widgets are now
discoverable via a Settings row with clear instructions
(`SettingsScreen.js:151-162` — the 2026-07-03 audit's C10 item, **confirmed
shipped**). Two icon-only affordances stand out as under-labelled: the
ActiveWorkoutScreen header ellipsis (hides 8 actions including the two most-
used, swap and add exercise, Journey 2) and the Diary barcode-scan FAB
(icon-only, no visible text, Journey 3).

**What's New content map is stale.** `src/components/WhatsNewSheet.js`'s
`WHATS_NEW` map has exactly one populated version (`1.2.0`) despite
substantial features shipping since (editable sets, the mini-bar, rest-timer
notification actions, plan-diary adherence, micronutrients, the connected
weekly story surface). Users who update past 1.2.0 are told about none of
this — a discoverability gap the 2026-07-03 audit already named (D10:
"make it a release checklist item") and which remains open.

### Five most information-dense screens (ranked)

1. **AnalyticsScreen (Progress tab root)** — 13 stacked sections, 20+
   independently tappable elements before the scroll ends (`:351-755`). The
   single densest landing screen of any tab.
2. **DiaryScreen** — up to ~10 stacked sections before any food is logged
   (rings, cycle/refeed rows, micronutrient panel, consent card, planned-meal
   banner, meal cards, water row).
3. **ActiveWorkoutScreen mid-session view** — 7-8 fixed-position context
   elements above the weight/reps input on a fresh exercise, partially
   mitigated by the collapsible "N cues" rail.
4. **CoachOutputScreen** — up to 7+ distinct adjustment/context cards in one
   scroll, partially mitigated by an existing hero-zone promotion and a
   collapsed "More adjustments" section.
5. **ProOnboardingScreen Step 2** — not dense by section count, but 7 form
   fields on one screen at the exact moment (onboarding) where density does
   the most abandon damage, and inconsistent with the wizard's own stated
   per-step field limit.

---

## Top 10 prioritised usability improvements

Ordered by expected user impact per unit of effort. Sizes: S/M/L. None of
these touch ED-safety, consent, tier gating, or billing.

| # | Improvement | Journey | Why it matters | Size |
|---|---|---|---|---|
| 1 | Make "Recent sessions" cards on the Progress hub actually tappable (→ WorkoutSummary/ExerciseDetail), or drop the card styling that implies they are | 5 | Genuine dead-tap on a primary tab; the most natural gesture on the screen currently fails silently | S |
| 2 | Surface Swap exercise and Add exercise as their own visible buttons instead of hiding them (with 6 other actions) behind an unlabelled header ellipsis | 2 | The two most-used mid-session actions are currently undiscoverable without opening an icon-only overflow menu | S |
| 3 | Either route blank/quick-start sessions through the same readiness capture (with its existing Skip), or tell the user in-flow that quick-start skips it | 2 | Currently an undisclosed coaching-quality difference tied to which start button was tapped | S |
| 4 | State outright on CoachOutputScreen that nothing changes until Apply is tapped, and add an undo-last-apply affordance | 4 | Directly serves "self-explanatory" for the app's flagship weekly moment; currently only inferable | S–M |
| 5 | Make the food-search "+" (plate/multi-add) the visually primary row affordance instead of the secondary glyph it is today | 3 | Flagged in the 2026-06-29 audit, still open after two build waves touched this screen; it's the lower-friction path and stays undiscovered | S |
| 6 | Split ProOnboardingScreen Step 2 into the same per-question pattern Steps 3–4 already use | 1 | The wizard's own code comment states the "few fields per step" rule; Step 2 is the one screen that breaks it, at the highest-abandon-risk moment in the app | M |
| 7 | Resolve or remove the dead `PhysiqueOptIn` teaching card (currently unreachable under any tier combination) | 5 | Dead UI that no longer teaches; low user-facing harm today but a correctness/clarity gap worth closing | S |
| 8 | Add a visible hint that a live workout can be minimised (tab-switch + the mini-bar already work; nothing on-screen says so) | 2 | The Hevy-parity minimise feature already shipped but is undiscoverable without accidentally finding it | S |
| 9 | Normalise destructive-action isolation on SettingsData/SettingsPrivacy to the pattern SettingsAccount already uses (a dedicated, visually separated section) | 6 | Consistency reduces the chance of a mis-tap on a destructive row mixed into routine settings | S |
| 10 | Refresh the What's New content map to cover shipped releases since 1.2.0 | cross-cutting | Users who update have no idea the app now edits/deletes sets, has a live-session bar, rest-timer lock-screen controls, plan-diary adherence, etc. — real, already-built value is invisible | S |

### Not recommended for action here (surfaced only)

- **Article9 consent gate, free/pro gating, ED-safety copy and floors** —
  verified working correctly and LOCKED; no change proposed anywhere in this
  report.
- **`ActiveWorkoutScreen` finish confirm (F2) and the planned-session
  readiness modal (F1)** — both are pre-existing, already-surfaced founder
  decisions (the 2026-07-03 audit's D2), not new findings; this report does
  not re-decide them, only confirms their current, unchanged state.
- **SettingsPrivacy's default "Delete account and withdraw consent" label**
  — flagged for founder awareness only; very likely a deliberate GDPR
  Article 7(3) choice, not proposed as a bug to fix.
