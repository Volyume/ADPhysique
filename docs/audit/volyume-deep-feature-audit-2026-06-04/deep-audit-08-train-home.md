# Deep Feature Audit — Item 7: Train tab (HomeScreen)

**Document:** deep-audit-08-train-home.md
**Item:** 7 of master inventory (Group 2 — tab landings; the default landing after onboarding, registered as `HomeTab` / title "Train")
**File:** `src/screens/HomeScreen.js` (2301 lines — the largest screen in the app), helpers `buildCoachBrief`, `getRelativeDay`, sub-components `PlanBuilderCard`, `CoachBriefCard`; child components `StepsCard`, `CardioCard`, `Sparkline`, `ScreenHeader`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approved" — all three changes, banner priority coach > deload > phase). Removed 26 verified-dead style keys (~150 lines); added roles/labels to the secondary controls; added a banner-priority governor so at most one of the coach-review / deload / phase banners shows at once (lower ones resurface on a later load once the top is dismissed). Load orchestration, start flows and sync left untouched.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The Train tab, the most-used surface and the default landing. It is a single
scroll built around one primary job: start today's session. Around that it
stacks contextual elements, most of them gated:
- `ScreenHeader` with a time-of-day greeting.
- A schedule-context line ("Today is a training day" / "Next session: …").
- Up to three dismissible banners: nutrition-phase mismatch, fresh weekly coach
  review, and a suggested recovery (deload) week.
- A compact morning-weight card (Pro) with an inline sparkline, then `StepsCard`
  and `CardioCard` (Pro, self-hiding).
- A free-tier Pro teaser (after 3+ sessions) and a one-line first-run cue
  (brand-new Pro, zero sessions).
- The primary area: an in-progress "Session in Progress" card, OR the hero plan
  card (plan progress, workout name, mesocycle chip, optional coach brief, Start
  / View / Change / Blank), OR a no-plan state (Pro rebuild button; free Library
  + manual cards; a glance card when there's history).
- A "Last session" card with a Repeat action.
- A one-time Pro coaching-discovery nudge.
- Two modals: a Change-Workout sheet and a pre-workout intent prompt ("How are
  you feeling today?").

Data is loaded by `loadData` (8-10 parallel loaders) on focus, on
`cloudSyncVersion` bumps, and via two safety-net timers (+3s, +10s) after
sign-in to catch large cloud pulls. Cold load shows skeletons. Weight logging is
optimistic with revert-on-failure. Crash recovery rehydrates an in-progress
workout. This is mature, defensive, well-commented code.

### Findings
1. **~26 orphaned style keys (~150 lines of dead CSS).** The founder removed
   several cards over time (the "This week" sessions/sets/volume card, today's
   intake, the training-trend graph, block progress, the History/Lifts/Volume
   quick links — all noted in comments at `:928-939`, `:1276`, `:1311`). Their
   styles were left behind. Verified unused (0 `styles.X` references each):
   `weekCard`, `weekCardHeader`, `streakChip`, `streakChipText`, `weekLabel`,
   `weekStats` (style; the `weekStats` *state* is still used), `weekBarCell`,
   `weekDivider`, `weekBarValue`, `weekBarLabel`, `weekBarTrack`, `weekBarFill`,
   `header`, `headerText`, `pageTitle`, `greeting`, `trainingBrainHeaderText`,
   `trainingBrainRow`, `trainingBrainText`, `quickRow`, `quickLink`,
   `quickLinkLabel`, `sectionLabel`, `weightInput` (the non-compact variant),
   `weightCardHint`, `proTeaserSub`. (The local `header`/`pageTitle`/`greeting`
   block is dead because the screen now uses the shared `ScreenHeader`.)
2. **Banner-stack density above the primary action.** On a Pro user's worst-case
   day the schedule line + phase banner + coach banner + deload banner + weight
   + steps + cardio + first-run cue can all sit above the hero "Start workout".
   Most are mutually gated, so the realistic worst case is ~2-3 banners, but
   there is no cap or priority: nothing stops phase + coach + deload showing
   together and pushing the Start button down the scroll. Research is firm that
   the home should spotlight the key action and not stack everything up top.
   [MadAppGang; Fireart]
3. **Accessibility: several interactive elements lack roles/labels.** The
   morning-weight "Edit" (`:842`) and "Log" (`:906`) buttons, the coach-update
   banner card (`:769`) and its dismiss (`:785`), the deload dismiss (`:813`),
   the Pro-teaser card (`:943`), the intent-prompt options (`:1389`), and the
   change-workout picker rows (`:1336`) are `TouchableOpacity`s with no
   `accessibilityRole`/`accessibilityLabel`. A screen reader still reads the
   inner text, but they are not announced as buttons. (The hero Start/View/
   Change/Blank buttons, the first-run cue, and the phase-banner controls DO
   have roles — the gap is in the secondary controls.)
4. **Copy is strong and on-voice.** Greetings are human ("Up early.",
   "Morning."), toasts are terse ("Couldn't save weight, try again"), banners are
   plain. No em dashes (middots and commas instead), no AI tells, no unearned
   praise. The one slightly long body is the Pro no-plan / cloud-restore message
   (`:1110`), but that state is genuinely subtle (a pull may be mid-flight) so
   the extra sentence is earned. Nothing to rewrite.
5. **Load orchestration is intentionally redundant, not a bug.** Multiple
   `loadData` triggers (focus, cloudSyncVersion, +3s/+10s timers) are a
   documented safety net for large cloud pulls; they each guard their own
   errors and `loadData` clears the spinner in a `finally`. Runtime-critical, so
   I would not refactor it as part of a cosmetic pass.

### Design assessment (values cited)
- On-system throughout: `background`/`surface`/`surface2`, single amber accent
  (`primary`/`primaryBg`), `success` for the in-progress card and `warning` for
  the deload signal (both semantic, not decorative), scale spacing/radii. No
  gradients, no orbs. The hero is restrained: one primary CTA, the stat in the
  eyebrow rather than a competing pill (commented `:1741`). This is a screen that
  reads as built by a lifter, not a template.
- The one place that drifts from the "strip back" rule is the banner stack
  (finding 2): each banner is individually justified, but there is no governor
  on how many appear at once.

### Flow / integration assessment
- Start flows (planned, repeat-last, blank) all converge on `pendingStartRef` +
  the intent prompt → `createWorkout` → `startWorkout` → `ActiveWorkout`, with
  toast-guarded failures and an `isStartingWorkout` flag that prevents the
  "Session in Progress" card flashing during the transition. Cross-tab navigation
  (`ProfileTab`/`PlansTab` nested navigate) is used for the View/phase/coach
  routes. Crash recovery (`restoreActiveWorkout`) and the food day-key migration
  run once per user on mount. Integration is solid.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Spotlight the primary action; don't stack everything up top.** "Your goal is
  not to shove all your app's features into one screen"; spotlight key actions
  with size/colour/contrast. Supports capping the banner stack so Start stays
  prominent. [MadAppGang; Fireart]
- **Notification/banner overload drives churn.** Too many prompts is a top reason
  users abandon; run a 5-second clarity test and remove unnecessary taps. The
  Train banners are in-app, not push, but the same attention economics apply
  above the primary CTA. [MadAppGang]
- **Workout-of-the-day / next session on the home is good practice** for
  workout-focused apps — which Volyume already does with the hero plan card.
  [MadAppGang; Stormotion]

---

## STEP C — COMPARISON

### Where Volyume leads
- A genuinely useful, data-driven home: next session ready to start, mesocycle
  context, an optional pre-workout brief, crash recovery, optimistic weight
  logging, and a coach-review surface, all on the locked dark/amber system. Most
  competitors show a static "start" button or a feature grid; Volyume's home
  reflects the user's actual training state. [Stormotion; MadAppGang]

### Where Volyume lags
- Carrying ~150 lines of dead CSS (finding 1).
- No governor on the banner stack, so the primary CTA can be pushed down
  (finding 2).
- Secondary controls missing a11y roles (finding 3).

### Critical gaps
- None functional. The screen works and is well-guarded. The items are tidiness,
  one design-judgement call, and a11y polish.

---

## STEP D — PROPOSAL

### Summary
A focused, low-risk pass on a runtime-sensitive screen: delete the verified dead
styles, close the a11y gaps on the secondary controls, and (design call for you)
add a light cap/priority to the banner stack so the Start action stays
prominent. No change to the load orchestration or any start/sync logic.

### Specific changes — one by one

**1. Remove the ~26 verified-unused style keys. [Cleanup — Low, zero behaviour
risk] — styles block `:1578-2300`**
- What: delete the orphaned keys listed in finding 1. Each has 0 `styles.X`
  references (grep-verified). No JSX or logic touched.

**2. Close the a11y gaps on secondary controls. [A11y — Low] — `:842`, `:906`,
`:769`, `:785`, `:813`, `:943`, `:1389`, `:1336`**
- What: add `accessibilityRole="button"` + a concise `accessibilityLabel` to the
  Edit/Log weight buttons, the coach-update banner and its dismiss, the deload
  dismiss, the Pro-teaser card, the intent-prompt options, and the change-
  workout rows. Dismiss controls get "Dismiss …" labels.

**3. (Design call — flagged) Cap / prioritise the banner stack. [UX — Medium]**
- What: introduce a small priority so at most one or two of {phase mismatch,
  fresh coach review, deload} render at once (e.g. coach review > deload > phase),
  keeping the rest available but not all stacked above Start. This changes what
  shows, so it is your call, not mine to make unilaterally. I can implement a
  specific priority on approval, or leave the stack as-is.
- Evidence: spotlight the key action; avoid up-top overload. [MadAppGang; Fireart]

### COPY CHANGES
None. The copy is on-voice and human.

### What to keep (with evidence)
- The hero "next session ready to start" pattern (workout-of-the-day best
  practice). [MadAppGang; Stormotion]
- The defensive load orchestration, crash recovery, optimistic weight logging,
  skeletons, and the intent prompt — all earned, well-guarded behaviour.
- The mesocycle chip and optional coach brief (Volyume's coaching identity at the
  start of a session).

### IMPACT / EFFORT
- **Impact:** Low (1, tidiness) / Low (2, a11y) / Medium (3, keeps the primary
  CTA prominent — if you want it).
- **Effort:** Low for 1-2; Medium for 3. None of 1-2 touches behaviour; 3 is a
  contained render-gating change.

### SOURCES
- MadAppGang — Fitness app design, mistakes & hierarchy:
  https://madappgang.com/blog/the-best-fitness-app-design-examples-and-typical-mistakes/
- Fireart — Fitness app UI/UX best practices:
  https://fireart.studio/blog/user-interface-design-for-a-fitness-app/
- Stormotion — Fitness app UX principles:
  https://stormotion.io/blog/fitness-app-ux/
