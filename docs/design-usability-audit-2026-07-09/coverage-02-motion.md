# Coverage lane — Motion / Animation Quality

Read-only. No source file was edited for this lane; this document is the
only file written. Findings use the same scale as
`00-MASTER-INDEX.md`: **A** = broken/unusable or a clear regression against
an established pattern; **B** = awkward/inconsistent/below-par but not
broken; **C** = polish. Classification: **SAFE** = mechanical fix matching
an existing codebase pattern; **JUDGEMENT** = a design call; **GATED** =
touches an INVIOLABLE CLAUDE.md §2 constraint (here: ED-safety-adjacent
surfaces) — flagged per the brief, not prescribed as "remove the safety
behaviour."

## Scope and method

Covered: nav/screen transitions, modal/sheet motion, micro-interactions
(press/toggle/tab), list/layout animation, skeletons/loaders, gesture motion
(pinch/pan/fling/swipe), and celebration/PR moments, across all of `src/`.

**Prior work read first, not duplicated:** `audit/03b-motion-materials.md`
(2026-07-02, ~800 lines — capability check, a 25-surface motion inventory,
token spec, fit rules 0–5, pattern proposals a–g) and the current
`src/styles/theme.js` motion tokens (`motion.{micro,state,enter,exit,hero,
sheet,pulse}`, `motion.springs.{press,release,settle,expressive}`,
`easeStandard/Decelerate/Accelerate`, lines 650-690). 03b is a proposal
document dated one week before this pass; a huge amount of the codebase has
since shipped (737 commits between 2026-07-02 and today), including most of
03b's own §3.3 proposals. This lane's method was therefore: (1) re-verify
which of 03b's proposals actually landed and how faithfully, using
`git log` and direct reads, not 03b's text; (2) audit everything 03b could
not have seen — every file created or materially changed since (tab bar,
mini-bar, rolling numbers, progress-photo compare/viewer, partners motion,
weekly story); (3) report only what is new: regressions, inconsistencies
introduced by the new work, and gaps 03b's own scope didn't reach. Findings
already open in 03b (e.g. `food/EntryRow.js`'s `Swipeable` still not
reduce-motion gated, `PRCelebration.js` still JS-thread/not yet Skia-migrated)
are **not** re-listed here — they are unchanged, already tracked, and
03b's adoption order (§4) already sequences them.

## Headline

The motion system got materially better since 03b, not just documented
better. `PressableCard`/`Button` migrated to Reanimated springs (03b's
highest-leverage proposal, now shipped with real `springs.press/release`
consumers); a new `VolyumeTabBar` + `ActiveSessionMiniBar` pair is a genuine
craft high point (spring-driven pill, self-subscribing rest-tick isolation,
correct reduce-motion/calm gating); `RollingNumber` shipped with its "body
weight never ticks" rule enforced by a dedicated guard test; and two fit-rule
guard suites (`src/lib/__tests__/motionFitRules.guard.test.js`,
`src/__tests__/rollingNumber.guard.test.js`) now mechanically pin rules that
03b could only propose. Every newly-authored Reanimated/gesture call site
found in this pass used `motion.*` tokens with zero raw numeric-literal
durations — genuine token discipline holding under real feature pressure, not
just in the tokens themselves.

Against that, this pass found **one real runtime bug** in an ED-safety-adjacent
surface (a gesture handler calling `setState` directly from the UI thread
without `runOnJS`, MO-1), **one systemic consistency regression** introduced
by the very code that fixed 03b's Modal-gating gap (the fix landed in new
files but was never back-ported, so the app now has two competing
conventions for the same primitive, and the single highest-frequency modal in
the app — `AppAlertHost` — is on the wrong side of it, MO-2/MO-3), and **one
ED-safety motion gap inside a file that already handles the same risk
correctly for copy** (MO-4).

**Counts (this lane only, new findings, not the master total):**

| Severity | Count |
|---|---|
| A | 3 |
| B | 2 |
| C | 2 |

| Class | Count |
|---|---|
| SAFE | 5 |
| JUDGEMENT | 1 |
| GATED | 1 |

## Findings

| ID | Sev | Title | File:line | Problem | Proposed change | Class |
|---|---|---|---|---|---|---|
| MO-1 | A | Overlay-compare drag gesture calls `setState` off the UI thread without `runOnJS` | `src/components/ProgressPhotoCompare.js:240-243` | `CompareOverlay`'s pan gesture (`Gesture.Pan().onUpdate((e) => { ...; setPct(v); })`) calls the React state setter directly inside an `onUpdate` worklet. Gesture-handler v2 auto-workletizes every `Gesture.*` callback in a file that imports Reanimated, so a non-worklet JS function (a state setter) called synchronously from the UI thread throws at runtime ("Tried to synchronously call a non-worklet function on the UI thread"). Three other call sites in the SAME file and its sibling components get this right: `CompareSlider`'s pan two functions above (`runOnJS(setPct)(...)`, line 144), `VolyumeChart.js:167-168`, and `ProgressPhotoViewer.js:197-198` all wrap the JS-side call in `runOnJS`. This is a one-off omission, not a pattern choice — dragging the Overlay opacity handle (the third of three comparison modes on a live progress-photos surface) is the affected path. | Wrap the call exactly like its sibling two lines above: `runOnJS(setPct)(v)`. One-line, mechanical, matches the file's own established idiom. | SAFE |
| MO-2 | A | `AppAlertHost` — the single highest-frequency dialog in the app — ignores Reduce Motion entirely | `src/components/AppAlert.js:82` | `appAlert()` is called from 45 files (confirms, destructive deletes, errors, and several ED-safety-adjacent flows e.g. the "Finish workout?" gate). `AppAlertHost` hardcodes `<Modal transparent animationType="fade" ...>` with no `reduceMotion` read at all — it doesn't even import the store. Every other recently-built modal in the app (see MO-3) reads `reduceMotion` and branches `animationType`; this is the one primitive that skipped it, and it is the one every user sees most often. | Add `const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);` inside `AppAlertHost` and change line 82 to `animationType={reduceMotion ? 'none' : 'fade'}` — the exact idiom already shipped at `PhotoDatePicker.js:40,72` and `food/DiaryDatePicker.js:43,68`. | SAFE |
| MO-3 | B | 16 more raw `Modal` sites hardcode `animationType`, now inconsistent with a newer, correctly-gated convention established elsewhere in the same codebase | `src/components/InfoTooltip.js:21`; `src/components/ExercisePickerModal.js:182`; `src/screens/WorkoutSummaryScreen.js:1372`; `src/screens/ExerciseDetailScreen.js:873`; `src/screens/HomeScreen.js:1976,2010,2118`; `src/screens/PlanLibraryScreen.js:612`; `src/screens/PlansScreen.js:1013`; `src/screens/BuildWorkoutScreen.js:415`; `src/screens/ActiveWorkoutScreen.js:2646,2746,3155,3223,3268`; `src/screens/RoutineDetailScreen.js:507,604` | 03b (2026-07-02) found this whole class ungated ("31 raw Modal sheets... zero conditional animationType sites exist"). Since then, 7 files built for the progress-photos and partners work adopted `animationType={reduceMotion ? 'none' : 'fade'}` (`PhotoDateRangeSheet.js`, `PhotoDatePicker.js`, `PhotoDetailsSheet.js`, `food/DiaryDatePicker.js`, `ProgressPhotoViewer.js`, `ProgressPhotosScreen.js`, `PartnerScreen.js`) — a real, good fix — but it was never applied to the pre-existing sites. The app now runs two conventions for the identical primitive at once: whether a `Modal` respects Reduce Motion depends on which sprint built it, not on any rule. `InfoTooltip.js` is worth calling out on its own: it is used in 26+ files per the copy-lane's jargon-tooltip finding (L04-11), so it is nearly as high-frequency as `AppAlert`. | Sweep: add the same one-line `reduceMotion` read + ternary `animationType` to all 16 sites, matching the pattern the 7 newer files already prove out. Mechanical, no visual diff for anyone without Reduce Motion on. | SAFE |
| MO-4 | A | `ProSetupCompleteScreen`'s staged plan-reveal choreography (incl. the `motion.hero` kcal-ring block) is gated on Reduce Motion only, never on calm mode or an open ED-pattern flag — inconsistent with the SAME file's own copy-side handling of the SAME risk | `src/screens/ProSetupCompleteScreen.js:38` (reduceMotion read only), `:63-71` (the file already reads `getOpenEdPatternFlag` and, when set, keeps this exact screen's dated-weight line on neutral copy — "the dated line carries a 'keep logging your morning weight' ask, so under an open ED-pattern flag this surface stays on the generic weight-free copy"), `:110-115` (`stage()` helper: `reduceMotion ? undefined : FadeInDown.duration(duration).delay(i * motion.micro)` — no calm/flag branch), `:186` (the kcal-ring block mounts with `stage(0, motion.hero)`, the app's single "important moment" duration, on this exact number) | This is the screen 03b's own celebration proposal (§3.3g #3) named explicitly and gave a specific instruction for: "under an open ED flag or calm mode the reveal renders instantly and quietly (numbers are information, never spectacle), and if a safety floor raised the target the reveal must not dramatise the number at all." The shipped screen already proves the team knows this screen carries that risk (it special-cases the weight-logging copy under the same flag two effects above), but the motion side of the same reveal was not extended to the same gate — so a user under an open ED flag or in calm mode still gets the full staged cascade, including the one `motion.hero`-duration beat in the app, playing over their calorie/macro targets. Flagging per the brief's instruction to flag ED-adjacent motion, not to prescribe removing it. | Founder decision: reuse the flag already computed at `:69` (and/or add the existing `isCalm(getWellbeingMode())` check used elsewhere, e.g. `WorkoutSummaryScreen.js:390-401`) to also collapse `stage()` to `undefined` (instant) when `flag \|\| calm`, mirroring the copy-side branch already in this file. No copy change, no removal of any safety text — purely making the reveal's motion follow the same calm rule its own neighbouring effect already follows. | GATED |
| MO-5 | C | A fifth hand-rolled press-feedback dialect appeared since 03b, duplicating `PressableCard` instead of composing it | `src/screens/PartnerScreen.js` `CheerPill` (~lines 152-170) | 03b counted four coexisting press-feedback dialects and flagged the drift. `CheerPill` adds a fifth: its own `useSharedValue`/`useAnimatedStyle` scale+opacity pair on `TouchableOpacity`, reimplementing exactly what `PressableCard` already does. To its credit it is fully token-correct (`motion.springs.press/release`, `motion.micro`, reduce-motion gated) — this is a maintainability/consistency note, not a broken-feel one. | Compose `PressableCard` (pass its `scale`/custom child) instead of a bespoke `Animated.View`, so there is one press-spring implementation in the codebase, not five. | JUDGEMENT |
| MO-6 | C | Diary's new day-swipe gesture has no directional transition, so a registered swipe and a no-op look identical until the data repaints | `src/screens/DiaryScreen.js:696-719` (`daySwipe`, a `Gesture.Race` of two `Gesture.Fling()`s calling `gotoTomorrow`/`gotoYesterday` via `runOnJS`) | This is a new gesture (not present at 03b's time — the comment at :704 explicitly models it on `VolyumeChart.js`'s scrub gesture). Unlike the chevron buttons it supplements, a successful fling produces an instant content swap with no slide/fade in either direction, so on a screen the user is actively swiping (a "did that register?" moment) there is no motion to confirm which way the day moved, or that it moved via the swipe at all rather than a coincidental re-render. This is exactly the "missing motion that would aid orientation" class the brief asks this lane to flag. | Founder/design call, not prescribed: a brief `motion.state`-duration directional slide-and-settle on the diary body content when the day changes via swipe (chevron taps can stay a cut, matching existing behaviour) would close the gap cheaply; needs a decision on whether a per-day content transition is worth the added motion on a screen this brief's own Rule 3 (from 03b) reserves for the fastest/quietest treatment. | JUDGEMENT |

## SAFE quick wins (implementable now, no founder decision)

Ordered severity desc, effort asc.

1. **MO-1** (S) — one-line `runOnJS` wrap, `ProgressPhotoCompare.js:242`.
2. **MO-2** (S) — one-line reduceMotion gate on `AppAlertHost`, the app's
   single most-invoked dialog.
3. **MO-3** (M, mechanical, 16 sites across 10 files) — same one-line gate,
   applied everywhere the newer 7-file convention hasn't reached yet, closing
   03b's Modal-gating gap for good instead of half-way.

## Needs a founder decision

- **MO-4 (GATED)** — extend `ProSetupCompleteScreen`'s existing ED-flag/calm
  read to also flatten the staged reveal's motion, matching what the same
  file already does for its copy. No safety text changes; purely a motion
  gate. Recommend confirming and doing this promptly since it is a real gap
  on a live paid-funnel screen that shows calorie/macro numbers.
- **MO-5 / MO-6 (JUDGEMENT)** — both are minor, both correctly flagged rather
  than fixed: MO-5 is a maintainability call (worth doing whenever
  `PartnerScreen` is next touched, not urgent), MO-6 is a genuine design
  question about whether the diary swipe deserves its own transition or
  should stay a cut like the chevrons.

## Where motion is strong (say so)

- **`src/components/VolyumeTabBar.js` + `ActiveSessionMiniBar.js`** — the E15
  tab-bar/mini-bar pair is the standout of this pass: a spring-driven pill
  keyed to `state.index`, an icon settle-scale on focus, a live session bar
  that isolates its own per-second rest-tick re-render into a single child
  component so the shell never re-renders on the clock, and both correctly
  collapse to instant/static under Reduce Motion while treating a live rest
  countdown as information (never suppressed) rather than decoration. This
  reads as deliberate, premium craft, not default RN chrome.
- **`src/components/ProgressPhotoViewer.js`** — pinch-zoom, pan-to-zoom, and
  swipe-to-page composed via `Gesture.Exclusive`/`Gesture.Simultaneous`, every
  JS-side call correctly wrapped in `runOnJS`, springs settle via
  `motion.springs.settle`, and the "latest-ref" idiom is applied correctly so
  the gesture always calls the current closure. This is the file that shows
  what MO-1's sibling should look like — everywhere else in this file, the
  pattern is right.
- **`RollingNumber.js`** — a genuinely disciplined primitive: UI-thread text
  interpolation (no per-frame JS render), an absolute "body weight never
  ticks" exclusion, and that exclusion is pinned by
  `src/__tests__/rollingNumber.guard.test.js`, not just a comment.
- **Enforcement, not just spec.** `src/lib/__tests__/motionFitRules.guard.test.js`
  mechanically pins fit rules 0 (raw `expo-haptics` bypass ban), 1/3
  (`springs.expressive` allowlist), 2 (linear easing allowlist) and 4 (frozen
  JS-`Animated` allowlist that can only shrink). This means 03b's proposal is
  no longer just a document — drift in those four dimensions will fail CI.
  Worth noting as a gap in the guard itself: none of the current guards would
  have caught MO-1 or MO-2/MO-3 (they check *what token/API* is used, not
  *whether Reduce Motion is referenced* at every Modal/gesture site) — a
  future guard walking every file matching `Gesture\.(Pan|Pinch)` or
  `<Modal` for a `reduceMotion` reference in the same file would close that
  hole mechanically, the same way the existing four do.
- **Token discipline under real feature pressure.** Every Reanimated/gesture
  file touched by work shipped since 03b (`VolyumeTabBar`, `ActiveSessionMiniBar`,
  `ProgressPhotoCompare`, `ProgressPhotoViewer`, `RollingNumber`,
  `PartnerPrivacyReceipt`, `PartnerScreen`, `CoachOutputScreen`) uses
  `motion.*`/`springs.*` tokens with no raw numeric-literal durations —
  confirmed by grep across the whole tree, not sampled.
