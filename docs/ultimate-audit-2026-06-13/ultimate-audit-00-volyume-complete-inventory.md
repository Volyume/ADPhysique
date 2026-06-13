# Volyume — Complete Inventory (Ultimate Audit 2026-06-13, Phase 1)

Serial, code-grounded inventory of every screen and shared component, produced by
Opus 4.8 agents under the zero-fabrication brief (`phase1/_FORMAT.md`): every
specific cited to file:line, font tokens resolved to px, sub-44px targets flagged,
"NOT DETERMINED IN CODE" where unverifiable. Navigation/psychology is in the
companion file `ultimate-audit-00-navigation-psychology.md`.

Section order: 14 screen-area audits (incl. workout screen at max depth), then the
component library (batches A–D).

---


<!-- ==== phase1/01-workout-session.md ==== -->

# Phase 1 audit — Workout Logging (Active Workout) screen

Files read in full for this block:
- `src/screens/ActiveWorkoutScreen.js` (2625 lines)
- `src/components/SetEntry.js` (260 lines)
- `src/components/RestTimer.js` (318 lines)
- `src/components/ExercisePickerModal.js` (280 lines)
- `src/styles/theme.js` (token resolution)
- `src/navigation/RootNavigator.js` (route registration)

Font tokens resolved against `src/styles/theme.js`:
`baseFontSize` (theme.js:256-266): `micro 10`, `xs 11`, `sm 13`, `md 16`,
`lg 17`, `xl 20`, `xxl 24`, `xxxl 32`, `display 40`. NB these are MUTABLE:
the "Larger text" accessibility toggle multiplies every token by 1.2 at boot
(theme.js:325-337), so every px below is the DEFAULT (toggle off). RN
`allowFontScaling` is also on by default, so OS font scaling stacks on top.

---

SCREEN: Active Workout (Workout Logging)

WHAT IT IS: The live set-by-set logging screen used during a training
session. The user picks weight + reps for the current set, taps a single
primary button to log it, rests against an in-card timer, and moves through
the exercises of the session. The highest-frequency screen in the app.

WHAT IS ON IT (active-logging view, exercise present, default state):
- Top header bar (ActiveWorkoutScreen.js:1357-1389): close/cancel "X" icon
  (left), elapsed workout timer "M:SS" (centre), "Finish" text button (right);
  optional `timer` glyph beside the clock when Time Crunch is active
  (1370-1377).
- Optional starter-session banner with "Full session" revert action
  (1393-1406) — only when `starterActive`.
- Horizontal exercise navigator chip strip, one chip per exercise with a
  per-exercise logged-set count badge (1409-1441) — only rendered when
  `workoutExercises.length > 1`.
- Exercise title row: exercise name, "Swap" button, "⋯" overflow button
  (1451-1484).
- Optional superset chip "Superset N · alternates with X" (1487-1494).
- Optional "next-time" coaching note banners with "Got it" dismiss
  (1498-1514).
- Optional deload "Recovery week" banner with "Skip" (1517-1534).
- Target line "Target: N sets · A–B reps" (1537-1544) — when `routineExercise`.
- Rest timer (RestTimer.js) — only rendered while a timer is active (1551).
- Optional "Target reached" success banner (1554-1561).
- Set-entry card (1564-1742) containing:
  - Optional warm-up banner + one-time warm-up hint (1569-1579).
  - Line 1 "orientation row": e.g. "Set 1 of 3 · Working" + chevron; tappable
    to open the set-type picker (1589-1599).
  - Line 2 "beat line": "Last: 40kg × 8 · Target 8–10 ↑" (or "First time ·
    Target …", or "Recovery week …"); tappable to apply last session's numbers
    (1605-1672).
  - Line 3 "coach line": one coaching sentence, first working set only
    (1680-1703).
  - Optional first-set hint (1704-1712).
  - SetEntry: Weight row (label "Weight (kg)" + −/input/+ stepper) and Reps
    row (label "Reps" + optional "Est. max ≈Xkg" + −/input/+ stepper)
    (SetEntry.js:42-133).
  - Optional note TextInput when toggled (1729-1741).
- Optional cluster banner (myo-reps/rest-pause) with mini-set input + "Finish
  cluster" + "Cancel" (1745-1789).
- Primary action button: "Log set" / "Start cluster" / "Done" (warm-up) — or,
  when target complete, "Next exercise"/"Finish workout" + a quiet "Log
  another set" text button (1792-1850).
- "This workout" logged-set receipt list, each row: set-number badge (or flame
  for warm-up), "WEIGHT×REPS", optional "Est. max ≈X", check icon
  (1855-1867; LoggedSetRow 70-94).
- Secondary action row: "Add exercise" and "Note" buttons (1871-1891).
- Modals (off-surface): exercise picker, superset heads-up, stale-workout,
  set-type picker, exercise overflow, exercise info, swap, discard.

NAVIGATION: Route `ActiveWorkout`, registered in three stacks in
RootNavigator.js — HomeStack (RootNavigator.js:295, `headerShown:false`), and
lines 478 and 505 (other stacks). Reached from the home/train continue/next
flow (see comment RootNavigator.js:177); pushes to `WorkoutSummary` via
`navigation.replace('WorkoutSummary', …)` on finish
(ActiveWorkoutScreen.js:1226).

GATING: Workout logging is a FREE feature (CLAUDE.md FREE list). No
`withProGuard` / `ProGate` / tier-redirect wraps this screen. The only tier
read is `tier: s.tier` (ActiveWorkoutScreen.js:123) used solely to decide
whether Pro Precision-Coaching session adjustments are surfaced
(`tier === 'pro'`, line 219). The core log-a-set path is ungated. **NOT
DETERMINED IN CODE**: whether any router-level guard sits above the route in
the non-Home stacks (lines 478/505 not read in full).

CURRENT STRENGTHS:
- The primary action is genuinely primary: filled amber `completeBtn`,
  `fontSize.lg (17)` heavy label (styles 2463-2465), the only filled button in
  the scroll body.
- Big 52×52 stepper buttons for weight/reps (SetEntry.js:207-213) — well over
  44px and thumb-friendly.
- Previous-session anchor + one-tap apply on the beat line (1633-1658) removes
  re-typing.
- Logged sets render ABOVE the action row (1852-1867) so the session receipt
  builds in the eye-line.
- Performance-conscious: shallow store selector (106-124) and memoised
  `LoggedSetRow` (70) stop the per-second timer tick re-rendering the tree.
- Rest timer escalates haptics + audio 3-2-1 (RestTimer.js:90-110) so the user
  needn't look at the screen.

CURRENT WEAKNESSES:
- The file is 2625 lines with eight in-file modals and a second internal
  component (`EmptyExerciseView`, 2349). It is genuinely oversized and hard to
  reason about; the flagged "bloat" is real at the source level even if the
  default visible surface is reasonably lean.
- Banner stacking: starter banner, superset chip, next-time notes (up to
  several), deload banner, target line, rest timer and target-reached banner
  can all sit between the header and the set-entry card and push the inputs
  down. Worst case the actual weight/reps inputs are below the fold.
- The three card-header lines (orientation, beat, coach) are all
  `fontSize.sm (13)` label-grey text (styles 2451-2457) crowded directly above
  the inputs — the densest, smallest-text zone on the screen sits exactly
  where the eye needs to land fast.
- Two competing timers in the same eye-line: header elapsed `fontSize.xl (20)`
  amber and the rest timer's bespoke `28`px numeral (RestTimer.js:247).
- Reps default to a pre-filled value (DEFAULT_SET reps:8, line 35) — a logged
  set can be saved without the user ever confirming the rep count.

NEWBIE QUESTION: Mostly yes for the core loop — "Weight (kg)", "Reps", a big
"Log set" button, and the first-set hint "Choose a weight and reps, then tap
Log set when done" (1707-1710) make the primary action discoverable. But the
surrounding vocabulary is dense for a first-timer: "Superset", "myo-reps",
"rest-pause", "AMRAP", "RIR" (internal), "cluster", "deload/Recovery week",
"Est. max ≈". The set-type picker descriptions (SET_TYPE_OPTIONS, 39-46) help,
but only if the user opens that sheet.

ATHLETE QUESTION: Largely yes. It supports straight/warm-up/drop/myo-reps/
rest-pause/AMRAP set types (39-46), supersets (270-285), per-side unilateral
logging (168, 1833), cluster sets (951-999), session targets with beat-chip
progression (computeSetTargets, 614), e1RM display, and PR detection (839).
Gaps an experienced competitor may feel: RPE is hard-disabled (rpe:null at
791/811) and RIR is no longer asked per set (SetEntry.js:135-138 comment),
which removes autoregulation granularity; no plate-maths/bar-loading helper
(plateBtn style exists at SetEntry.js:173 but is unused in render).

LOCATION QUESTION: Correct placement. It is the terminal screen of the
training flow, pushed from Home/Train, replacing itself with WorkoutSummary on
finish (1226). Living in the Home/Train stack (RootNavigator.js:295) keeps the
summary and history reachable in the same stack. No relocation warranted.

VISUAL + USABILITY:
- Font sizes — see the exhaustive list in the EXTRA ANSWERS section below.
- Touch-target sizes for interactive elements (active-logging view):
  - Weight/Reps stepper −/+ buttons: 52×52 (SetEntry.js:207-213). PASS.
  - Weight/Reps text inputs: `flex:1`, `paddingVertical: spacing.sm (8)`
    (SetEntry.js:220-228). Height ≈ ~36px tall (8+8 padding + ~20 line) — the
    tap area is the full row width but is **< 44px tall**. FLAG.
  - Primary `completeBtn`: `paddingVertical: spacing.lg (16)` (2463) → ample. PASS.
  - `extraSetBtn` ("Log another set"): `minHeight:44` (2469). PASS (at limit).
  - Secondary `actionBtn` (Add exercise / Note): `minHeight:44` (2492). PASS.
  - Header "X" cancel: `Ionicons size 22` + `hitSlop 8` (1361,1365) → ≈38px.
    **< 44px** even with hitSlop. FLAG.
  - Header "Finish": text + `hitSlop 8` (1382). `finishBtn` paddingVertical
    `spacing.xs (4)` (2397) → ≈ 21+8+8 ≈ 37px tall. **< 44px**. FLAG.
  - "Swap" button: paddingVertical `spacing.xs (4)` + hitSlop 8 (2421,1457) →
    ≈ ~34-37px. **< 44px**. FLAG.
  - "⋯" overflow button: 36×36 (`overflowBtn`, 2494) + hitSlop (1476). Core box
    **< 44px** (hitSlop pulls it to ≈44). FLAG (borderline).
  - Orientation row (set-type entry): paddingVertical `spacing.xs (4)` +
    hitSlop top8/bottom4 (2450,1593) → ≈ ~33px box, ~45 with slop. Borderline.
  - Beat line tap: `paddingVertical: spacing.xs (4)` + hitSlop 4 (2452,1647) →
    ≈ ~27px. **< 44px**. FLAG.
  - Nav-strip chips: paddingVertical `spacing.md (12)`, maxHeight 48 on the
    strip (2410,2408). ≈44+. PASS.
  - RestTimer ±15 / Skip buttons: `minHeight:44` (RestTimer.js:274,283). PASS.
- Information density: in the default single-exercise state the visible
  surface is reasonably lean (title, target, set-entry card, primary button,
  receipt, two secondary buttons). Density spikes badly when multiple banners
  co-occur (see weaknesses). The card-header three-line block + two input rows
  is the dense core.
- Clean or cluttered; oversized/undersized/misaligned: the *code* is heavily
  cluttered (2625 lines). The *default render* is acceptable. Oversized: none
  egregious on the visible surface; the exercise name `fontSize.xxl (24)` black
  weight (2420) is the largest body element and arguably louder than needed
  given the name also sits in the nav chip. Undersized: the three card-header
  lines at `sm (13)` and the target line at `sm (13)` muted (2434) are small
  for the most-scanned data.
- Most important action most prominent? YES — `completeBtn` (filled amber, lg
  heavy, 2463-2465) is unambiguously the loudest control.
- Small (5.4")/standard (6.1")/large (6.7") behaviour:
  - Body is a `ScrollView` (1443) so content can scroll; inputs use `flex`
    widths and stepper buttons are FIXED 52×52 (SetEntry.js:208-209) — they do
    not scale down on a 5.4" device.
  - RestTimer has an explicit short-screen path: `COMPACT_SCREEN =
    Dimensions.get('window').height < 700` (RestTimer.js:17) shrinks the
    numeral (28→24, RestTimer.js:255) and the row (64→56, line 253) "so the
    timer never pushes the set inputs below the fold". This is computed ONCE at
    module load — does not respond to rotation/runtime metric changes.
  - The KeyboardAvoidingView is `padding` on iOS, `undefined` on Android
    (1355): with the number pad up on a small Android device the inputs and
    primary button can be obscured.

---

## EXTRA ANSWERS (file:line + resolved px)

### 1. Font size of EVERY text element on the active-logging view
(token → resolved px @ default; file:line of the style)

Header / chrome:
- Elapsed timer "M:SS": `fontSize.xl` → **20px** (style `timerText`,
  ActiveWorkoutScreen.js:2399).
- "Finish": `fontSize.md` → **16px** (`finishBtn`, 2397).
- Starter banner text: `fontSize.sm` → **13px** (`starterBannerText`, 2406).
- Starter banner "Full session": `fontSize.sm` → **13px** (`starterBannerAction`, 2407).
- Nav-chip exercise name: `fontSize.sm` → **13px** (`navTabText`, 2412).
- Nav-chip count badge: `fontSize.micro` → **10px** (`navTabBadgeText`, 2415).

Exercise header block:
- Exercise name: `fontSize.xxl` → **24px** (`exerciseName`, 2420).
- "Swap" label: `fontSize.xs` → **11px** (`swapBtnText`, 2422).
- (⋯ overflow is an icon, no text.)
- Superset chip text: `fontSize.xs` → **11px** (`supersetChipText`, 2503).

Banners / target:
- Next-time note body: `fontSize.sm` → **13px** (`nextTimeBannerText`, 2604).
- Next-time "Got it": `fontSize.sm` → **13px** (`nextTimeBannerDismiss`, 2609).
- Deload "Recovery week" title: `fontSize.sm` → **13px** (`deloadBannerTitle`, 2621).
- Deload sub "Light loads · …": `fontSize.xs` → **11px** (`deloadBannerSub`, 2622).
- Deload "Skip": `fontSize.sm` → **13px** (`deloadSkip`, 2623).
- Target line "Target: …": `fontSize.sm` → **13px** (`targetText`, 2434).
- "Target reached …" banner: `fontSize.sm` → **13px** (`targetBannerText`, 2552).

Rest timer (RestTimer.js):
- Time "M:SS": **28px** hard-coded (`timeText`, RestTimer.js:247); compact
  **24px** (`timeTextCompact`, 255).
- Countdown 3/2/1 numeral: `fontSize.xxxl` → **32px** (`countdownNum`, 258);
  compact `fontSize.xxl` → **24px** (265).
- "rest"/"seconds" label: `fontSize.xs` → **11px** (`label`, 267).
- "−15"/"+15": `fontSize.sm` → **13px** (`adjBtnText`, 297).
- "Skip": `fontSize.sm` → **13px** (`skipText`, 281).
- "Start next set" (done state): `fontSize.md` → **16px** (`doneText`, 313).

Set-entry card header (ActiveWorkoutScreen.js):
- Warm-up banner text: `fontSize.xs` → **11px** (`warmupBannerText`, 2442).
- Warm-up one-time hint: `fontSize.sm` → **13px** (`warmupOneTimeHint`, 2444).
- First-set hint text: `fontSize.xs` → **11px** (`firstSetHintText`, 2448).
- Line 1 orientation text: `fontSize.sm` → **13px** (`orientationText`, 2451).
- Line 2 beat-line label: `fontSize.sm` → **13px** (`beatLineLabel`, 2453).
- Line 2 beat-line VALUE (the numbers): `fontSize.md` → **16px**
  (`beatLineValue`, 2454).
- Line 2 beat-line glyph (↑/↓): `fontSize.md` → **16px** (`beatLineGlyph`, 2455).
- Line 3 coach-line text: `fontSize.sm` → **13px** (`coachLineText`, 2457).

SetEntry inputs (SetEntry.js):
- "Weight (kg)" / "Reps" field labels: `fontSize.sm` → **13px** (`fieldLabel`,
  SetEntry.js:164).
- "Est. max ≈Xkg" hint beside Reps: `fontSize.xs` → **11px** (`e1rmHint`, 188).
- Stepper "−"/"+" glyphs: `fontSize.xxl` → **24px** (`stepBtnText`, 215).
- Weight value & Reps value (the entered numbers): `fontSize.xl` → **20px**
  (`valueInput`, 223).
- Note input (when open): `fontSize.sm` → **13px** (`noteInput`,
  ActiveWorkoutScreen.js:2458).

Cluster banner (when active):
- Cluster title: `fontSize.sm` → **13px** (`clusterTitle`, 2475).
- Cluster reps summary: `fontSize.md` → **16px** (`clusterReps`, 2476).
- Cluster input: `fontSize.md` → **16px** (`clusterInput`, 2481).
- "Mini-set"/"Finish cluster"/"Cancel": `fontSize.sm` → **13px**
  (`clusterAddBtnText` 2488, `completeBtnText` see below, `clusterCancelText` 2490).

Primary / secondary actions:
- Primary button label ("Log set"/"Start cluster"/"Done"/"Next exercise"/
  "Finish workout"): `fontSize.lg` → **17px** (`completeBtnText`, 2465).
- "Log another set": `fontSize.sm` → **13px** (`extraSetBtnText`, 2470).
- "Add exercise" / "Note": `fontSize.sm` → **13px** (`actionBtnText`, 2493).

"This workout" receipt:
- "This workout" heading: `fontSize.xs` → **11px** (`loggedTitle`, 2505).
- Set-number badge digit: `fontSize.sm` → **13px** (`setNumText`, 2510).
- Logged set "WEIGHT×REPS" text: `fontSize.md` → **16px** (`loggedSetText`, 2511).
- Logged "Est. max ≈X": `fontSize.xs` → **11px** (`loggedEst1RM`, 2512).

### 2. How many distinct interactive elements visible at once during logging
Counting the typical mid-session state (one exercise, rest timer NOT running,
no banners), the visible tappables are:
1. Header "X" cancel (1359)
2. Header "Finish" (1380)
3. "Swap" button (1454)
4. "⋯" overflow (1464)
5. Orientation row / set-type entry (1589)
6. Beat line (apply previous) (1635)
7. Coach line (opens info) — first working set only (1682)
8. Weight "−" (SetEntry.js:47)
9. Weight input (SetEntry.js:55)
10. Weight "+" (SetEntry.js:80)
11. Reps "−" (SetEntry.js:100)
12. Reps input (SetEntry.js:108)
13. Reps "+" (SetEntry.js:124)
14. Primary "Log set" (1829)
15. Each logged-set row's surrounding card (display-only, not tappable — not counted)
16. "Add exercise" (1872)
17. "Note" (1882)

**= 16 distinct interactive elements** in the lean default state (counting the
coach line, which only shows on the first working set). Multi-exercise
sessions add one tappable nav chip per exercise (1417). With the rest timer
running add 3 more (−15, +15, Skip → 19+). So roughly **16 baseline, ~19–20
with the rest timer up, plus N nav chips**.

### 3. Exact tap count to log a single set
Best case — the pre-filled weight + reps are already correct (loadHistory
pre-fills both, 640-658): **1 tap** — just "Log set" (1829 → handleCompleteSet
736). The set saves with no further confirmation (reps default to 8 if
untouched, DEFAULT_SET line 35).
Typical case — accept the previous session via the beat line, then log:
**2 taps** (beat line 1635 to apply, then "Log set"). 
Manual entry — adjusting weight by one 2.5kg step and reps by one via the
steppers then logging: weight ± (1) + reps ± (1) + Log (1) = **3 taps** (more
taps for larger adjustments since the stepper moves 2.5kg/1rep per tap,
SetEntry.js:15). Typing values directly: tap field, type, tap field, type, tap
Log.

### 4. Is previous-session data visible without scrolling?
YES — by design, when previous data exists. The "beat line" (Line 2 of the
card header) renders "Last: {weight}{units} × {actualReps}" directly above the
inputs whenever `prevSets[workingLogged]` exists
(ActiveWorkoutScreen.js:1633-1658; `prevSets` loaded via
`getLastNWorkoutSets(exercise.id, activeWorkout.id, 2)`, 582 → setPrevSets
588). The value is `fontSize.md (16)` (`beatLineValue`, 2454). The set-by-set
history of THIS session is the "This workout" receipt (1855-1867). CAVEAT: the
beat line is only above the fold if the stacked banners above the card (starter
/ next-time / deload / target / rest timer) have not pushed the card down; on a
short screen with banners active it can require scrolling. On the very first
exercise session there is no previous data — the line falls back to "First
time · Target …" (1661-1670).

### 5. Three elements that could be removed without losing core logging function
1. **"Log another set" quiet text button** (`extraSetBtn`, 1817-1826): only
   appears after target completion; the "Add exercise"/nav already let the user
   continue, and the next-exercise CTA covers progression. Redundant secondary
   path.
2. **The "Est. max ≈X" e1RM hint** beside Reps (SetEntry.js:95-97) and in each
   logged row (`loggedEst1RM`, 2512): derived data, irrelevant to the act of
   logging a set; pure noise mid-effort.
3. **The separate "Swap" button in the title row** (1454-1463): "Swap exercise"
   already lives in the ⋯ overflow sheet (2112-2122), so the dedicated button
   duplicates it and adds a small (<44px) tap target next to the ⋯. Removing it
   loses nothing — swap is still one extra tap away in the overflow.

### 6. Three font sizes to shrink (current → recommended)
(NB the brief says "shrink" — these are the elements that are LOUDER than their
information value and could come down to rebalance the hierarchy toward the
inputs/primary action.)
1. Exercise name `exerciseName` **24px → 20px** (`fontSize.xxl`→`xl`;
   ActiveWorkoutScreen.js:2420). At black weight + 24px it out-shouts the data;
   the name is also repeated in the nav chip.
2. Stepper "−"/"+" glyph `stepBtnText` **24px → 20px** (`fontSize.xxl`→`xl`;
   SetEntry.js:215). The 52×52 button carries the affordance; the glyph at
   24px is larger than the value it edits needs it to be and crowds the box.
3. Rest-timer "M:SS" `timeText` **28px → 24px** (hard-coded; RestTimer.js:247).
   It competes with the header elapsed timer (20px) for the eye; 24px (the
   already-defined compact value) is enough.
(If "shrink" is read as "elements that are too small and should grow", the
opposite call applies to the three `sm (13)` card-header lines — see weaknesses.)

### 7. What a user with sweaty hands mid-workout would struggle with
Grounded in element sizes/positions:
- **Header controls (top corners).** "X" cancel (≈38px box incl. hitSlop,
  1361/1365) and "Finish" (≈37px tall, 2397) are both small and at the screen
  edges where a sweaty thumb is least accurate — and "Finish" ending a session
  by mistp is high-cost. Edge + sub-44px is the worst combination.
- **The beat line and orientation row.** Both are thin tappable text strips
  (paddingVertical 4px; `beatLine` 2452 ≈27px, `orientationRow` 2450) sitting
  immediately above the inputs. A slip here either applies the wrong previous
  numbers (beat line, 1635) or opens the set-type sheet (1589) — easy to hit by
  accident reaching for the weight stepper.
- **The "Swap" / "⋯" cluster in the title row.** Two small targets (swap
  <44px, overflow 36×36) sitting close together (2419,2421,2494); a wet
  mis-tap on Swap launches a full-screen swap flow over the logging surface.
- **Text inputs are short (<44px tall).** `valueInput` paddingVertical 8px
  (SetEntry.js:226) makes the direct-tap-to-type target the row width but only
  ~36px tall; the generous 52×52 ± steppers (SetEntry.js:208) are the reliable
  wet-hand path, but each tap only moves 2.5kg/1 rep (line 15), so dialling a
  big jump means many taps.
- **No confirm on the one-tap log.** With reps pre-defaulted to 8 (line 35) and
  a single-tap "Log set" (1829), a stray wet-thumb tap on the large amber
  button commits a set that may not reflect what was done.
- The 52×52 steppers and the large amber primary button are the parts that
  WORK well for wet hands; the failure points are all the small text-strip and
  edge controls above.


<!-- ==== phase1/02-workout-build-history.md ==== -->

# Phase 1 inventory — Workout build & history screens (2026-06-13)

Source files read in full:
- `src/screens/BuildWorkoutScreen.js`
- `src/screens/RoutineDetailScreen.js`
- `src/screens/WorkoutHistoryScreen.js`
- `src/screens/WorkoutSummaryScreen.js`
- `src/screens/ManualBuilderScreen.js`
- `src/screens/MesocycleBuilderScreen.js`

Token resolutions are taken from `src/styles/theme.js`:
- `fontSize.micro` = 10 (theme.js:257), `fontSize.xs` = 11 (theme.js:258),
  `fontSize.sm` = 13 (theme.js:259), `fontSize.md` = 16 (theme.js:260),
  `fontSize.lg` = 17 (theme.js:261), `fontSize.xl` = 20 (theme.js:262),
  `fontSize.xxl` = 24 (theme.js:263), `fontSize.xxxl` = 32 (theme.js:264),
  `fontSize.display` = 40 (theme.js:265).
- Type roles (theme.js:373-410): `type.caption` = fontSize.xs/11 (theme.js:406-409),
  `type.label` = fontSize.sm/13 (theme.js:402-405), `type.body` = fontSize.md/16
  (theme.js:394-397), `type.bodyStrong` = fontSize.md/16 (theme.js:398-401),
  `type.title` = fontSize.lg/17 (theme.js:390-393), `type.h3` = fontSize.xl/20
  (theme.js:386-389), `type.h2` = fontSize.xxl/24 (theme.js:382-385).
- spacing (theme.js:228-239): hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16,
  xl 24, xxl 32, xxxl 48. radius (theme.js:241-248): xs 4, sm 6, md 10, lg 14,
  xl 20, full 999.

NOTE on touch targets: most interactive elements have visual sizes below 44px
but carry `hitSlop`. RN hitSlop expands the touch area beyond the visual bounds;
where a hitSlop is present the effective tap area is flagged accordingly, and
where it is absent the row/element falls back on its own padding.

---

SCREEN: Build Workout (BuildWorkoutScreen)
WHAT IT IS: A one-off "build a session from scratch right now" screen. Lets the
user add exercises and set per-exercise targets (sets, rep range, rest, starting
weight), then start training immediately. Not a saved plan/routine — it feeds
straight into ActiveWorkout.
WHAT IS ON IT:
- Header row (BuildWorkoutScreen.js:161-167): "Skip Setup" text button (left,
  :162-164), centred title "Build Workout" (:165), and an empty 80px spacer
  View (:166) for symmetry.
- Subtitle: "Add exercises and set your targets before you start." (:170).
- Travel/Hotel Gym Mode chip: aeroplane icon + "Travel / Hotel Gym Mode" text +
  chevron (:173-177), opens the travel equipment modal.
- Per-exercise cards (`exercises.map`, :179-296), each with:
  - Index badge with the number (:182-184).
  - Exercise name (:186) and a muscle + equipment subline
    (`MUSCLE_DISPLAY_NAMES` lookup · equipment, :187-192).
  - Remove (close-circle-outline) button in error colour (:194-201).
  - Sets stepper: "Sets" label, minus button, value, plus button
    (:206-229); clamped 1–20 (:65).
  - Reps: "Reps" label, two number TextInputs separated by an en dash
    (:232-253).
  - Rest stepper: "Rest" label, minus, formatted value (e.g. "1m 30s"), plus
    (:256-279); clamped 30–600s in 15s steps (:73).
  - Starting weight: "Start ({units})" label + decimal TextInput (:282-293).
- "Add Exercise" dashed button (:298-301).
- Footer "Start Training (n)" primary Button via the shared `Button` component;
  shows a count when exercises exist, disabled when empty, has a loading state
  (:306-316).
- Travel modal (:319-354): title "Travel / Hotel Gym", explanatory subtext,
  three equipment radio options (Bodyweight only / Dumbbells / Hotel gym,
  :325-342), Cancel and "Build Session" buttons (:344-351).
- Exercise picker modal (:356-389): full-screen, autofocused search TextInput,
  close button, FlatList of exercises (name + capitalised muscle · equipment)
  with an add-circle icon per row. Untyped list shows the first 50 exercises;
  typing filters by name (:148-150).
NAVIGATION: Route name `BuildWorkout`, registered in the Home stack
(RootNavigator.js:294, `headerShown: false`). Reached from Home (the no-plan /
build-your-own path) and from RoutineDetail's empty-routine "Start Blank Workout"
choice which navigates `HomeTab` → `BuildWorkout` (RoutineDetailScreen.js:251).
Leads to ActiveWorkout via `navigation.replace('ActiveWorkout')` on both Start
Training (:99) and Skip (:116).
GATING: Free. No guard in the file and the route carries no `withProGuard`
wrapper at registration (RootNavigator.js:294). Building/logging a workout is a
free feature per CLAUDE.md.
CURRENT STRENGTHS: Self-contained quick-start with sensible defaults
(DEFAULT_SETS 3, DEFAULT_REST 90, :18-19). Travel Mode is a genuinely useful
quick-fill. Steppers are clamped to sane ranges. Good accessibility labels on
nearly every control. Skip Setup gives an instant empty-session escape hatch.
CURRENT WEAKNESSES: No reorder of exercises here (unlike RoutineDetail). No way
to save the built session as a reusable routine/template from this screen. The
travel plan is hardcoded to `daysPerWeek: 4, splitType: 'full_body'` and only
uses `sessions[0]` (:123-124) — the day count/split are not surfaced or
configurable. Starting-weight unit label uses `units` but the value isn't
unit-converted anywhere here. The exercise picker caps the un-searched list at
50 (:150) with no "showing 50 of N" hint.
NEWBIE QUESTION: Mostly yes — labels are plain ("Sets", "Reps", "Rest",
"Start"). But a first-timer may not know what "starting weight" should be, what
rest duration to pick, or the difference between this screen and using a Plan.
"Skip Setup" starting an *empty* session is a subtle concept.
ATHLETE QUESTION: Partially. Fast to assemble an ad-hoc session and rep ranges
are editable, but there is no superset grouping, no RIR/intensity target, no
per-set weight, and no save-as-routine — an experienced lifter building a
bespoke session would have to rebuild it next time.
LOCATION QUESTION: Reasonable — it lives in the Home/Train stack where a user
starts training. It overlaps conceptually with ManualBuilder (Plans stack);
"build a session now" vs "build a saved plan" is a fine but real distinction
that isn't explained.
VISUAL + USABILITY:
- Font sizes:
  - skipText: `type.label` = fontSize.sm (13) (style :405-409; type.label
    theme.js:402-405).
  - headerTitle: `type.title` = fontSize.lg (17) (:410-413).
  - subtitle: fontSize.sm (13), lineHeight 20 (:416-420).
  - travelChipText: `type.label` = 13 (:590).
  - exerciseName: `type.bodyStrong` = 16 (:448-451).
  - exerciseMuscle: `type.caption` = 11 (:452-456).
  - indexNum: fontSize.sm (13) (:442-446).
  - controlLabel: fontSize.xs (11) (:467-472).
  - stepValue: fontSize.sm (13) (:488-494).
  - repInput / repSep / weightInput: fontSize.sm (13) (:500-527).
  - addBtnText: fontSize.md (16) (:539-543).
  - travelTitle: `type.title` = 17 (:600); travelSub: fontSize.sm (13) (:601);
    travelOptText: `type.label` = 13 (:609); travelCancelText / travelConfirmText:
    fontSize.sm (13) (:615, :620).
  - pickerSearch: `type.body` = 16 (:558-568); pickerItemName: `type.bodyStrong`
    = 16 (:576-580); pickerItemMuscle: fontSize.sm (13) (:581).
- Touch targets:
  - Skip Setup: text only, hitSlop 8 each side (:162) — effective ~ acceptable
    but the visual text is ~17px tall.
  - Remove exercise icon: 22px icon, hitSlop 12 (:196) → ~46px effective. OK.
  - Stepper buttons (stepBtn): 30×34px (:482-487) with hitSlop 8 (:212,:222,:262,
    :272) → ~46×50 effective. OK with hitSlop, under 44 without.
  - repInput / weightInput: 34px tall (:501,:517) — below 44px, no hitSlop
    (TextInputs). FLAG.
  - pickerClose: 40×40 (:569), no hitSlop — slightly under 44. FLAG (minor).
  - pickerItem rows: padding spacing.lg (16) all round (:570-575) → tall enough.
  - travel options/buttons: padding spacing.md (12) → ~ under 44 visual height
    but reasonable as full-width rows.
- Information density: Per-exercise card is dense — four control groups wrap in a
  row (`flexWrap`, :457-461) with `minWidth: 70` each (:466); on a small phone
  these will wrap to 2×2. Otherwise the screen is clean with generous spacing.lg
  padding.
- Clean/cluttered: Clean. The dashed Add button and the single footer CTA read
  clearly.
- Most important action prominence: Yes — "Start Training" is the only filled
  primary Button, pinned in a bordered footer (:306-316).
- Small/standard/large behaviour: ScrollView body (:169) so content scrolls.
  Control inputs are FIXED px (repInput 40w/34h, weightInput 64w/34h, stepBtn
  30w/34h) and will NOT scale with larger-text; on the 5.4" device the wrapped
  control row is the main density risk. Footer is outside the scroll so it stays
  pinned.

---

SCREEN: Edit Workout / Routine Detail (RoutineDetailScreen)
WHAT IT IS: The editor for a single routine (a "day") within a plan. Lists the
routine's exercises with their targets, lets the user edit targets, swap an
exercise (engine-ranked substitutes or full library), remove, reorder, re-link
broken rows, and start the routine as a live workout.
WHAT IS ON IT:
- A `Button` "Start This Workout" header CTA (ListHeaderComponent, :283-289).
- Muscle coverage card (`MuscleTagRow`, :42-80, rendered :290): "Muscle coverage"
  title and horizontally scrolling chips "<Muscle> ×<count>", colour-tiered by
  count (≥3 amber, =2 green, =1 neutral, :59-68). Factual only — no balance
  warnings by design (comment :35-41).
- Split rationale sentence when `routine.split_type` is set
  (`getSplitRationale`, :291-293).
- Exercise cards (renderItem, :296-425), each with:
  - Order badge with index (:321-323).
  - Exercise name; for unresolved rows a "Tap to re-link" warning chip with a
    link icon (:325-335) and fallback name "Exercise (couldn't restore)" (:327).
  - Meta line: "N sets · min–max reps · Ns rest" (:336-340).
  - Optional "Start: N kg" line when startingWeight > 0 (:341-345). NOTE: the
    "kg" unit is HARDCODED (:343), not unit-aware.
  - Muscle display name (:346-350).
  - Optional "why this" italic rationale (`getExerciseWhyThis`, :351-354).
  - In normal mode: edit (create-outline), swap (swap-horizontal), remove
    (trash-outline) icon buttons (:390-422).
  - In reorder mode: up/down chevron buttons (:356-388), disabled at ends.
- "Add Exercise" dashed footer button (:427-430).
- Empty state "No exercises yet. Add some below." (:432-438).
- Header right toggle "Reorder" / "Done" (set via navigation.setOptions,
  :106-123).
- Edit modal (bottom sheet, :443-518): exercise name title; row of Sets / Reps
  min / Reps max inputs (:452-486); row of Rest (s) / Start weight inputs
  (:487-512); "Save" button (:513-515).
- Swap modal (full screen, :521-576): "Swap Exercise" title + close; "Replacing:
  <name>" subtitle; explanatory note that targets stay the same; FlatList of
  ranked candidates (name + reason); empty text "No similar exercises found.";
  footer "Search all exercises or create your own" (:563-573).
- Two `ExercisePickerModal`s — one for adding (saveLabel "Add to plan", :578-583),
  one for swap-via-library (saveLabel "Swap in", :588-593).
- Confirmation `appAlert`s for swap (:196-213) and remove (:408-415).
NAVIGATION: Route name `RoutineDetail`, registered in the Plans stack
(RootNavigator.js:322, header title "Edit Workout"). Receives `routineId` via
route params (:84). Start This Workout calls `createWorkout` then navigates
`HomeTab` → `ActiveWorkout` (:266); empty-routine path offers Add Exercise or a
blank workout via `HomeTab` → `BuildWorkout` (:251).
GATING: Free. No guard in file; route registered un-wrapped (RootNavigator.js:322).
Training builder / workout logging are free per CLAUDE.md.
CURRENT STRENGTHS: Feature-rich, coherent editor. Engine-ranked swaps with a
human-readable reason are excellent. The unresolved-row re-link recovery path
(:301-314, :617-655) is a thoughtful data-integrity affordance. Optimistic
reorder with revert on failure (:221-235). Strong accessibility labelling.
Muscle-coverage chips are informative without nagging.
CURRENT WEAKNESSES: "Start: N kg" hardcodes kg (:343) — inconsistent with the
units-aware label on BuildWorkout. Reorder uses up/down chevrons rather than
drag, slow for long routines. The edit modal has no validation messaging — it
silently returns if sets/reps are blank (:169). Two separate `ExercisePickerModal`
instances plus an inline swap list is a lot of overlapping "pick an exercise" UI.
No superset editing surfaced here though `supersetGroupId` is read on start
(:263).
NEWBIE QUESTION: Mostly yes. Cards read plainly and "Start This Workout" is
obvious. "Swap" and "Reorder" are clear. The "why this" rationale helps a
beginner trust the choices. The muscle-coverage "×count" chips may be slightly
opaque to a true newcomer.
ATHLETE QUESTION: Largely yes — set/rep/rest/start-weight all editable, swaps are
intelligent, reorder works. Gaps for a competitor: no per-exercise RIR/intensity,
no superset authoring, chevron reorder is tedious, and kg is hardcoded for a lifter
who logs in lb.
LOCATION QUESTION: Correct — it sits in the Plans stack reached from PlanDetail,
which is where editing a day belongs.
VISUAL + USABILITY:
- Font sizes:
  - Header-right Reorder/Done: fontSize.md (16) inline (:116).
  - tagStyles.sectionTitle: fontSize.xs (11), uppercase (:776-783).
  - tagStyles.chipText: fontSize.xs (11) (:803-806).
  - startBtn: shared `Button` (size "lg").
  - orderNum: fontSize.sm (13) (:630).
  - exerciseName: `type.bodyStrong` = 16 (:638).
  - relinkChipText: fontSize.xs (11) (:651-655).
  - exerciseMeta: fontSize.sm (13), in primary amber (:656).
  - exerciseMuscle: `type.caption` = 11 (:657).
  - exerciseWhy: fontSize.xs (11), italic, lineHeight 16 (:658).
  - splitRationale: fontSize.sm (13) (:659).
  - exerciseStartWeight: `type.num('caption')` = 11 (:660).
  - addBtnText: fontSize.md (16) (:718).
  - editTitle: fontSize.lg (17) (:682); editLabel: fontSize.xs (11) (:685);
    editInput: fontSize.md (16) (:686-697); editSaveBtnText: `type.bodyStrong`
    = 16 (:705).
  - swapTitle: fontSize.xl (20) (:730); swapSubtitle: fontSize.sm (13) (:731-736);
    swapNote: `type.caption` = 11 (:737-742); swapItemName: `type.bodyStrong`
    = 16 (:753-757); swapItemReason: fontSize.xs (11) (:758); swapSearchAllText:
    `type.label` = 13 (:763).
- Touch targets:
  - Header Reorder/Done: hitSlop 8 (:112). Text-sized otherwise.
  - orderBadge: 32×32 (:621-628) — decorative, not a target.
  - Edit/swap/remove icon buttons: 20px icons with hitSlop 12 top/bottom, 8
    left/right (:393,:401,:416) → ~44 vertical / ~36 horizontal. Horizontal edge
    under 44. FLAG (minor).
  - Reorder chevron buttons (reorderBtn): 32×32 (:663-670) with hitSlop 8
    (:362,:377) → ~48 effective. OK with hitSlop.
  - editInput: paddingVertical spacing.md (12) + fontSize 16 → ~ around 40px
    visual, no hitSlop. Borderline. FLAG (minor).
  - Swap candidate rows / addBtn / swapSearchAll: padding spacing.lg (16) → tall
    enough.
- Information density: High on each exercise card — name, optional re-link chip,
  meta, optional start-weight, muscle, optional "why this", plus three action
  icons. The "why this" italic line can push card height up notably.
- Clean/cluttered: Borderline busy per card but organised; the warning-styled
  unresolved variant is a clear standout.
- Most important action prominence: Yes — "Start This Workout" is the filled
  lg Button at the top of the list (:283-289).
- Small/standard/large behaviour: FlatList-scrolled list (:277). Edit modal is a
  bottom sheet; swap modal is full-screen with its own FlatList — both fine on
  small screens. Order/reorder badges are FIXED 32px and won't scale with
  larger-text. The three-icon action cluster plus text on one card row is the
  main horizontal-space risk on a 5.4" device.

---

SCREEN: Workout History (WorkoutHistoryScreen)
WHAT IT IS: The log of completed sessions, with a list view and a calendar view,
filter chips, expandable per-session detail, and per-session actions (view full
summary, repeat, delete).
WHAT IS ON IT:
- List header (`listHeader`, :558-628):
  - Top bar: "N session(s)" count (:562-564) + list/calendar toggle button
    (:565-580).
  - Filter chip row: All / This month / Upper / Lower / Full body (FILTERS,
    :26-32; rendered :584-605).
  - Calendar card when in calendar mode (:608-626): month title with prev/next
    chevrons (:467-495), Mon-first day-of-week headers (DAY_HEADERS, :34), the
    day grid (:497-556) with trained-day highlighting / today ring / selected
    state, and a "Show all this month" clear button when a day is selected.
- Per-session card (renderItem, :300-462), wrapped in AnimatedEntrance:
  - Tappable header (PressableCard): date (`d MMM yyyy`, :317), relative label
    (:318), duration "Nm" + working-set count with icons (:321-327), expand
    chevron (:328-333).
  - Exercise name list, 2 lines collapsed / full when expanded (:336-338).
  - Expanded content (:342-413): stat chips (duration min, "N working sets",
    "N kg lifted"), per-exercise breakdown (name + summary), optional session
    notes row, and a "View full summary" button.
  - Card actions (:416-458): "View Details" (collapsed only), "Repeat" (refresh
    icon), and a quiet "Delete" trash button.
- Repeat dialog (`appAlert`, :126-142): Repeat as-is / View in Plans / Cancel.
- Delete dialog (`appAlert`, :149-181): confirm destructive delete; removes local
  + cloud copy (queues a `workout_delete` op on cloud failure).
- Pull-to-refresh (:638-648).
- Empty state: EmptyWorkoutsIllustration + "Your sessions will appear here" +
  explanatory text (:660-668); skeleton rows while loading (:650-659).
NAVIGATION: Route name `WorkoutHistory`, registered in BOTH the Home stack
(RootNavigator.js:297, title "Workout History") and the Progress stack
(RootNavigator.js:343, title "Workout History"). "View Details" / "View full
summary" navigate to `WorkoutSummary` with `readOnly: true` (:393-404, :421-432).
Repeat-as-is navigates `getParent()` → `HomeTab` → `ActiveWorkout` (:117);
"View in Plans" → `PlansTab` (:137).
GATING: Free. No guard; route registered un-wrapped in both stacks
(RootNavigator.js:297,:343). Workout history is a free feature per CLAUDE.md.
CURRENT STRENGTHS: Genuinely rich — dual list/calendar views, filters, inline
expansion with a real per-exercise breakdown, and a tidy repeat/delete flow. The
calendar is Mon-first and locale-correct. Performance-conscious: only the most
recent 50 sessions' sets are fetched (:65-71). Skeletons + pull-to-refresh +
animated entrance give it polish.
CURRENT WEAKNESSES: The Upper/Lower/Full filters match on the substring "upper"/
"lower"/"full" in the workout name OR an exercise name (:246-263) — a brittle
heuristic that will both miss and mis-tag sessions (e.g. an "upper back" exercise
tags any session "Upper"). Tonnage/"kg lifted" is hardcoded kg (:356) and not
unit-aware. The collapsed card shows "View Details" AND "Repeat" AND delete; the
"View Details" vs expand-chevron vs "View full summary" gives three routes to
overlapping detail. The stat-chip "N working sets" duplicates the header
"N sets".
NEWBIE QUESTION: Largely yes. Date-led cards, a recognisable calendar, plain
"View Details"/"Repeat"/Delete. A newcomer may not grasp "working sets" vs
"sets", or why some filters return nothing (the heuristic).
ATHLETE QUESTION: Mostly yes for review — tonnage, working sets, duration,
per-exercise weight×reps breakdown, calendar consistency view, and one-tap
repeat are all valuable. Limits: kg-only display, no volume-by-muscle in the
list, and the crude split filters won't reliably segment an experienced lifter's
varied sessions.
LOCATION QUESTION: Correct, and sensibly registered in both Train and Progress
stacks so it's reachable from either context.
VISUAL + USABILITY:
- Font sizes:
  - topBarTitle: `type.label` = 13 (:687-690).
  - chipText: `type.label` = 13 (:721-724).
  - calendarMonthTitle: `type.bodyStrong` = 16 (:745-748).
  - dayHeader: fontSize.xs (11) (:757-761).
  - dayNum: `type.num('caption')` = 11 (:780-783).
  - clearDayText: fontSize.xs (11) (:797-801).
  - cardDate: fontSize.md (16), bold (:822-826).
  - cardTime: `type.caption` = 11 (:827-831).
  - cardMetaText: `type.num('caption')` = 11 (:837-840).
  - exerciseList: fontSize.sm (13), lineHeight 20 (:844-848).
  - statChipText: fontSize.xs (11) (:868-872).
  - exerciseBreakdownName: `type.label` = 13 (:881-885); exerciseBreakdownSummary:
    `type.num('caption')` = 11 (:886-891).
  - loadingText: `type.caption` = 11 (:892-896).
  - notesText: fontSize.xs (11) (:905-910).
  - fullSummaryBtnText / viewBtnText / repeatBtnText: `type.label` = 13
    (:921-924,:940-943,:969-972).
  - emptyTitle: `type.title` = 17 (:979-983); emptyText: fontSize.sm (13),
    lineHeight 22 (:984-989).
- Touch targets:
  - Toggle button (toggleBtn): padding spacing.xs (4) + 18px icon → ~26px visual,
    hitSlop 8 (:571) → ~42px. FLAG (just under 44).
  - Filter chips: paddingVertical spacing.xs (4) + 13px text → ~21px visual, NO
    hitSlop (:589-598, style :709-716). FLAG — under 44px.
  - Calendar prev/next: 20px icons, hitSlop 8 (:475,:487) → ~36px. FLAG.
  - Calendar day cells: dayCircle 30×30 (:762-769) inside a flex cell with
    paddingVertical spacing.xxs (2); activeOpacity gates only trained days. The
    visual circle is 30px. FLAG — under 44px tap target for date selection.
  - View Details / Repeat: paddingVertical spacing.sm (8) → ~ under 44 visual
    height; full-width-ish so horizontally fine.
  - Delete: paddingHorizontal spacing.md (12), paddingVertical spacing.sm (8),
    hitSlop 8 (:454) → ~ acceptable with hitSlop.
- Information density: Expanded card is dense (header + meta + exercise list +
  stat chips + per-exercise breakdown + notes + summary button + actions). The
  calendar card is also dense but well-spaced. Collapsed list is comfortable.
- Clean/cluttered: Clean collapsed; expanded card edges toward busy with three
  action affordances plus the in-card "View full summary".
- Most important action prominence: Ambiguous — there is no single hero action;
  "View Details", "Repeat" and the expand chevron compete. For a history screen
  that is arguably acceptable (review is the goal).
- Small/standard/large behaviour: FlatList-scrolled (:632). Calendar cells use
  FIXED 30px circles that won't scale with larger-text and could crowd day
  numbers at the larger setting on a 5.4" screen. Filter chips wrap
  (`flexWrap`, :704-708). Cards use shared `Card`/`PressableCard` components
  (sizing not in this file).

---

SCREEN: Session Complete / Workout Summary (WorkoutSummaryScreen)
WHAT IT IS: The post-session screen shown after finishing a workout (live mode)
and also the read-only detail view opened from history. Shows session stats,
celebratory beats, this-week volume, optional feedback capture, and finish
actions. Doubles as a coaching data-capture surface.
WHAT IS ON IT:
- Completion header: check-circle + "Session Complete" + completion date; an
  optional first-session line (:693-702).
- D1 early-win milestone card (gold) with share button, only on a rung-crossing
  session and not suppressed (:708-729).
- Stats grid — four animated StatBox tiles: Exercises, Working Sets (with
  tooltip), Duration, Total kg (with tooltip) (:731-748). Counters tick up from 0
  (StatBox, :1271-1334).
- 4-week comparison card (verdict best/up/down/on-pace with headline + sub +
  accent colour + icon), only when prior sessions of the routine exist
  (:755-792).
- Post-workout partner beat (paired + live + not calm/ED): partner status line +
  "Cheer"/"Sent" button (:798-825).
- Programme-arc strip (BlockShapeCard) for a ≥2-week block, live + not suppressed
  (:831-846).
- Exercise list card: per-exercise name + working-set chips ("<weight><units> ×
  reps" or "BW × reps") or a recommended-sets meta line (:848-880).
- PR row: "N new PRs · <names>" with trophy (:882-892).
- Divider (:894).
- "This week's volume" section with InfoTooltip legend; per-muscle rows: muscle
  name + status badge, an insight line, and an expandable "Why this status?"
  explanation (:896-960).
- Block-end recap: quiet neutral link under calm/ED (:964-978) OR a full
  phase-completion card (recap, what's-next, watch story + share) otherwise
  (:984-1026).
- COMP-015 "Adjusted today: …" confirmation row (live, when adjustments exist)
  (:1030-1041).
- "How did it feel?" optional feedback: toggle to expand, four RatingRows
  (Difficulty, Muscle engagement, Joint discomfort, Fatigue) + a notes TextInput
  (:1043-1089; RatingRow :41-67).
- "Save as Workout Template" button (live, no routineId, has exercise data)
  (:1091-1100).
- "Notes for next time" optional multiline input (:1102-1120).
- Sticky footer: "Close" primary button + (live only) a share icon button
  (:1123-1141).
- Template-name modal (:1144-1189).
WHAT IS SHOWN (data/info): exercise count, working sets, duration minutes, total
tonnage (kg), per-exercise weight×reps, PR count + names, this-week per-muscle
volume status + insight + landmark targets, 4-week comparison %/position,
partner weekly ticks, block week N of M, milestone copy, adaptation decisions
(written, not all displayed).
NAVIGATION: Route name `WorkoutSummary`, registered in the Home stack
(RootNavigator.js:296, title "Session Complete", hero-zoom) and the Progress
stack (RootNavigator.js:344, same). Reached live from the finish-workout flow and
read-only from WorkoutHistory (params incl. `readOnly: true`). Leads to
`ShareCard` (:613,:620,:636), `RecapStory` (:969,:1006); on Done (live) calls
`navigation.popToTop()` (:568) or `goBack()` in readOnly (:450).
GATING: Free. No guard; route registered un-wrapped in both stacks
(RootNavigator.js:296,:344). NOTE: the screen renders Pro-flavoured surfaces
(Precision Coaching adaptation, partner beat) but those are populated from data
the rest of the app gates; partner beat reads `usePartners(user?.id, tier)`
(:84) and shows only when paired. Per-feature Pro enforcement is NOT done in this
file — it relies on upstream gating. (Verified: no `withProGuard`, no
`tier`-based early return for the coaching/partner sections.)
CURRENT STRENGTHS: A genuinely strong "moment" — animated stat counters, staggered
reveals, milestone/PR/comparison/block beats, and a calm/ED suppression model
that consistently gates every celebratory surface (calmSuppressed, :128,:388).
Coaching capture (feedback → adaptive engine → adaptation events) is well
plumbed. Tooltips explain "working sets" and tonnage. Date is the session's own
day, not "now" (:679-682). Dual-mode (live/readOnly) is handled throughout.
CURRENT WEAKNESSES: Very long and busy in the live path — up to ~10 stacked
sections, each on its own reveal delay totalling ~1.8s before the last appears
(delays to 1820, :1103); the staggered reveals mean a user must wait for content
to animate in. "Total kg" tile is kg regardless of `units` (:743), while the
exercise list chips DO use `units` (:866) — inconsistent. Feedback is "optional"
yet defaults to expanded (:133) and pre-filled with mid values (:92-97), which
biases the engine if the user just hits Close. Heavy use of magic delay numbers.
NEWBIE QUESTION: The top (header + four stat tiles + tooltips) is beginner-clear.
Below that it gets advanced fast: "This week's volume" with MEV/MRV bands, the
4-week tonnage comparison, "Muscle engagement"/"Joint discomfort" ratings, and
block/deload language will be opaque to a first-timer. The tooltips help but
there are many concepts at once.
ATHLETE QUESTION: Yes, strongly. Tonnage, per-muscle volume vs landmarks,
4-week trend ranking, PR detection, structured RPE-style feedback, and template
save are exactly what a serious lifter wants in a post-session review.
LOCATION QUESTION: Correct — it's the natural end of a session (Home stack) and a
sensible read-only detail target from history (Progress/Home stacks).
VISUAL + USABILITY:
- Font sizes:
  - completionTitle: fontSize.xxl (24), black (:1341).
  - completionDate: fontSize.sm (13) (:1342); firstSessionLine: fontSize.sm (13)
    (:1343).
  - milestoneTitle: fontSize.md (16) (:1356); milestoneBody: fontSize.xs (11),
    lineHeight 17 (:1357).
  - phaseTitle: fontSize.md (16) (:1370); phaseName: fontSize.sm (13) (:1371);
    phaseRecap: fontSize.sm (13) (:1372); phaseNext: fontSize.xs (11) (:1373);
    phaseActionText: fontSize.sm (13) (:1380).
  - partnerBeatText: fontSize.sm (13) (:1392); partnerCheerText: `type.label`
    overridden to fontSize.xs (11) (:1399).
  - blockArcName: fontSize.sm (13) (:1408).
  - statValue: fontSize.xl (20), black (:1414); statLabel: `type.caption` = 11
    (:1415).
  - prRowText: `type.label` = 13 (:1421).
  - sectionTitle: `type.label` = 13 (:1425); optionalLabel: `type.caption` = 11
    (:1426).
  - muscleName: fontSize.md (16) (:1435); volumeInsightText: fontSize.xs (11),
    lineHeight 18 (:1436); volumeWhyToggleText: fontSize.xs (11) (:1441-1443);
    volumeWhyBody: fontSize.xs (11), lineHeight 19 (:1444-1448); statusText:
    fontSize.xs (11) (:1450).
  - feedbackToggleBtnText: fontSize.md (16) (:1456).
  - adjustedSummaryText: fontSize.sm (13) (:1465); blockRecapText: fontSize.sm
    (13) (:1473).
  - ratingLabel: `type.label` = 13 (:1476); ratingBtnText: fontSize.md (16)
    (:1483); ratingValueLabel: fontSize.xs (11) (:1485).
  - notesInput: `type.body` = 16 (:1486-1490); nextTimeNoteInput: fontSize.sm
    (13) (:1491-1495).
  - doneBtnText: `type.title` = 17 (:1524-1527).
  - exerciseListName: `type.label` = 13 (:1552-1555); exerciseListMeta /
    exerciseSetChip: `type.num('caption')` = 11 (:1556,:1565).
  - compareHeadline: fontSize.md (16) (:1621); compareSub: fontSize.xs (11)
    (:1622).
  - templateModalTitle: fontSize.md (16) (:1585); templateModalInput: `type.body`
    = 16 (:1588); templateModalCancelText: fontSize.sm (13) (:1600);
    templateModalSaveText: `type.label` = 13 (:1605).
- Touch targets:
  - RatingRow buttons (ratingBtn): 40×40 (:1478-1481), NO hitSlop. FLAG — under
    44px, and they sit in rows of up to 6 (Difficulty/Fatigue max 5 → 6 buttons),
    so on a 5.4" screen they are tight.
  - milestoneShareBtn: 36×36 (:1358-1362) with hitSlop 8 (:723) → ~52. OK.
  - phaseShareBtn: 44×44 (:1381-1385) with hitSlop 8 (:1019). OK.
  - phaseActionBtn: paddingVertical spacing.md (12) → ~40px visual. Borderline.
  - partnerCheerBtn: minHeight 40 (:1396), no hitSlop. FLAG (minor).
  - volumeWhyToggle: paddingVertical spacing.xxs (2) + hitSlop 6 (:938) →
    ~ small. FLAG.
  - doneBtn: paddingVertical spacing.lg (16) → tall, full-flex. Good primary.
  - shareFooterBtn: 52×52 (:1528-1535). OK.
  - InfoTooltip targets (size 10/11/13/14) — small icon hit areas (component not
    in this file). FLAG (minor).
- Information density: Very high in live mode — the most content-dense screen of
  the six. Many cards, badges, tooltips and a long feedback block.
- Clean/cluttered: Organised by section dividers and surface cards, but the sheer
  number of conditional sections risks clutter on a data-rich session.
- Most important action prominence: Yes — the sticky "Close" primary button is
  the clear terminal action; the amber share button sits beside it.
- Small/standard/large behaviour: ScrollView (:692) so length is handled by
  scroll. StatBox tiles use `minWidth: '45%'` (:1411) → 2×2 grid that adapts.
  RatingRow's 40px FIXED buttons in rows of 6 are the main small-screen risk and
  won't scale with larger-text. Reveal animations honour Reduce Motion
  (:1246-1256, :1272). Footer padding respects bottom inset (:1123).

---

SCREEN: Build a Plan / Manual Builder (ManualBuilderScreen)
WHAT IT IS: A two-page wizard to manually author a multi-day training plan: page
1 sets name + goal; page 2 adds days, adds exercises per day, shows a live "Plan
Balance" read-out, then saves as a draft or saves-and-activates.
WHAT IS ON IT:
- Page 1 (:341-404): BackHeader "Build a Plan"; subtitle; "Plan name" label +
  TextInput; "Goal" label + a wrap of five goal pills (Build Muscle / Balanced
  Bodybuilding / Aesthetic Focus / Strength-Biased / Lose Fat, Keep Muscle —
  GOALS :22-28); primary "Create Plan & Add Workouts" button. daysPerWeek is a
  fixed constant 4 (:154), not user-set on this page.
- Page 2 (:408-550): BackHeader; ExercisePickerModal; editable plan-name
  TextInput (h2-styled, :423-431); day cards (:434-480) each with "Day N" number,
  editable day-name input, an exercise list (name + "N sets × min–max reps", with
  long-press-to-remove + Undo toast, :449-471), and an "Add Exercise" button;
  "Add Day" dashed button (:483-486); the PlanBalanceCard (:489); an action row
  with "Save Draft" and "Save & Activate" (:492-514).
- PlanBalanceCard (:74-142): "Plan Balance" header; a grid over PRIORITY_MUSCLES
  (:32) showing a status dot (○/◐/●), muscle name, and "N×" set count; warning
  box for missing/low muscles; a separate warning box for over-volume muscles.
  Status thresholds from VOLUME_LANDMARKS (muscleStatus, :46-56).
- Success modal (:518-548): check icon, "Plan Activated", plan name, subtext,
  "Stay Here" / "Go to Train" buttons.
NAVIGATION: Route name `ManualBuilder`, registered in the Plans stack
(RootNavigator.js:324, `headerShown: false` — uses its own BackHeader). Reached
from the Plans area. On save-draft navigates to `PlansTab` (:331); success
modal's "Go to Train" navigates `HomeTab` (:538).
GATING: Free. No guard; route registered un-wrapped (RootNavigator.js:324).
Training builder is free per CLAUDE.md.
CURRENT STRENGTHS: Clear two-step structure with a single hero CTA per page. The
live Plan Balance card with MEV/MAV/MRV-derived status dots and plain-English
warnings is the standout — it gives authoring-time feedback (which RoutineDetail
deliberately omits). Long-press-to-remove with an Undo toast that restores at the
original index (:228-258) is a polished pattern. Goal selection drives the
programme goal label.
CURRENT WEAKNESSES: daysPerWeek is hardcoded to 4 (:154) even though "Add Day"
exists, so page 1's implied "days per week" is inconsistent with the editable day
list. Per-exercise sets are fixed at 3 with rep min/max from defaults (:219-221)
and CANNOT be edited on this screen — only sets/reps via the day card are shown,
not editable here (no stepper/tap-to-edit). `handleSaveAndActivate` activates
using `planName.trim()` (page-1 value, :316) while the editable name lives in
`editablePlanName` — editing the name on page 2 does NOT change the activated
plan name. (Flagged as an observation per instructions, not fixed.) Remove is
long-press only with no visible affordance beyond an ellipsis icon + a11y hint.
NEWBIE QUESTION: Page 1 is friendly. Page 2 is mostly clear, but a beginner won't
know the per-exercise sets/reps are fixed, that removal is long-press, or how to
read the Plan Balance dots (○/◐/● with no inline legend — only the warning text
explains). "Save Draft" vs "Save & Activate" needs a beat of thought.
ATHLETE QUESTION: Partially. Good for roughing out a split with balance feedback,
but a competitor can't set per-exercise sets/reps/rest here, can't reorder
exercises, can't set days-per-week explicitly, and goal selection is coarse. They
would likely refine in RoutineDetail afterwards.
LOCATION QUESTION: Correct — plan authoring belongs in the Plans stack.
VISUAL + USABILITY:
- Font sizes:
  - subtitle: fontSize.sm (13), lineHeight 20 (:568-573).
  - label: `type.label` = 13 (:577-580); textInput: `type.body` = 16 (:581-590).
  - pillText: `type.label` = 13 (:608-611).
  - primaryBtnText: `type.title` = 17 (:626-629).
  - planNameInput: `type.h2` = 24 (:641-648).
  - dayNumber: fontSize.xs (11), black (:666-672).
  - dayNameInput: `type.bodyStrong` = 16 (:673-678).
  - exName: fontSize.md (16) (:697-701); exMeta: `type.num('caption')` = 11
    (:702-705).
  - addExText: `type.label` = 13 (:713-716).
  - addDayText: fontSize.md (16) (:729-733).
  - draftBtnText / activateBtnText: `type.bodyStrong` = 16 (:748-751,:762-765).
  - successTitle: fontSize.xxl (24), black (:786-790); successName: `type.title`
    = 17 (:791-795); successSub: fontSize.sm (13) (:796-802); successSecondaryText
    / successPrimaryText: `type.bodyStrong` = 16 (:816-819,:830-833).
  - balanceStyles.title: fontSize.sm (13), bold (:850-855); dot: fontSize.sm (13)
    (:868-871); muscleName: fontSize.sm (13) (:872-876); setCount: fontSize.xs
    (11) (:877-883); warningText: fontSize.xs (11), lineHeight 16 (:895-900).
- Touch targets:
  - Goal pills: paddingVertical spacing.sm (8) + 13px text → ~29px visual, NO
    hitSlop (:373-384, style :596-603). FLAG — under 44px.
  - exRow (long-press remove): paddingVertical spacing.sm (8) → ~ under 44 visual,
    relies on row width for the tap. FLAG (the only removal affordance).
  - addExBtn: paddingVertical spacing.md (12) → ~ borderline.
  - primaryBtn / addDayBtn / draftBtn / activateBtn: paddingVertical spacing.lg
    (16) → tall, good.
  - Success modal buttons: paddingVertical spacing.lg (16) → good.
- Information density: Page 1 is sparse and calm. Page 2 grows with each day;
  the Plan Balance grid (8 muscles two-per-row) plus up to two warning boxes adds
  density at the bottom but stays readable.
- Clean/cluttered: Clean overall; the wizard split keeps each page focused.
- Most important action prominence: Yes on both pages — one filled primary CTA on
  page 1; on page 2 the amber "Save & Activate" is `flex: 2` vs the neutral "Save
  Draft" `flex: 1` (:740,:753), so the activate action dominates.
- Small/standard/large behaviour: Both pages are ScrollView-scrolled (:346,:418)
  with KeyboardAvoidingView on page 1 (:345). dayNumber has a FIXED `minWidth: 44`
  (:671). Pills and balance cells use `flexWrap`/`minWidth: '45%'` so they adapt.
  No fixed-height inputs that would clip larger-text. Reasonable on a 5.4" screen.

---

SCREEN: Training Blocks / Mesocycle Builder (MesocycleBuilderScreen)
WHAT IT IS: The training-blocks (mesocycle) overview. Shows the active plan, an
active-block dashboard (weekly tonnage chart, recovery EMAs, deload advice), and
an archive of past blocks. Despite the "Builder" filename it is read/overview
only — there is no create-block form in this file.
WHAT IS ON IT:
- Active plan card (:143-200): barbell icon + "Your active plan" tag + an
  InfoTooltip explaining what a training block is; plan name; meta (split type ·
  workout count); when an active meso exists, a "Week N of M [· recovery week]"
  label with a dot bar; when no active meso, an explanatory note.
- Active block dashboard (ActiveMesoDashboard, :312-403, rendered :203-208):
  "Active" badge + layers icon; block name; "Week N of M · focus"; a progress
  track bar; a weekly tonnage SvgBarSparkline ("Weekly load (kg moved)") when
  there is tonnage; a recovery row (Soreness / Fatigue / Joints EMA values to 1
  dp); and a deload advice banner (urgent or informational) when applicable.
- "Past blocks" label when archived blocks exist (:210-212).
- Past-block cards (renderItem, :215-282): name; meta (date range, focus); a
  "View block summary" button → BlockReflection; active cards (if any rendered
  here) show a week-progress dot bar with deload labelling.
- Empty state (:283-301): calendar icon + title ("No block running yet" or "Your
  training blocks start here") + explanatory text; skeleton cards while loading
  (:284-288).
WHAT IS SHOWN (data/info): active plan name/split/workout count, current week vs
total, deload week position, per-week tonnage bars (current week amber, deload
amber-warning, others dim), recovery EMAs (soreness/fatigue/joints), deload
prediction / auto-regulation advice, past-block date ranges and focus.
NAVIGATION: Route name `MesocycleBuilder`, registered in the Plans stack
(RootNavigator.js:326, title "Training Blocks"). Reached from the Plans area.
"View block summary" navigates to `BlockReflection` with `mesocycleId`
(:239). No create/start-block navigation exists in this file.
GATING: Free. No guard; route registered un-wrapped (RootNavigator.js:326).
NOTE: it surfaces deload/auto-regulation advice (Precision-Coaching-adjacent),
but the route itself carries no Pro guard and there is no `tier` check in this
file. (Verified: no `withProGuard`, no `useAppStore(s=>s.tier)`.)
CURRENT STRENGTHS: Clear separation of "your plan" vs "the optional block layer",
reinforced by an informative InfoTooltip. The active dashboard packs a lot of
honest signal (tonnage trend, recovery EMAs, deload guidance) into one card with
jargon-free copy (:320-326). Loads on focus (useFocusEffect, :33-36) so it stays
fresh. Good skeleton + empty states. Deload advice is plain-English and
colour-coded by urgency.
CURRENT WEAKNESSES: The screen titled "Training Blocks"/filename "Builder" offers
no way to CREATE or configure a block here — blocks only start via plan
activation (per the empty-state copy, :297-298), which is a discoverability gap
for a "builder". Tonnage is hardcoded kg ("Weekly load (kg moved)", :351) and not
unit-aware. The active-block week logic is duplicated in two places (the plan
card's IIFE :167-191 and ActiveMesoDashboard) with slightly different rendering.
`getCurrentWeek` uses `differenceInWeeks` from start date (:125-130), so a block
started mid-week may show an off-by-one week to some users.
NEWBIE QUESTION: The InfoTooltip and empty-state copy work hard to explain the
concept, which helps. But a beginner may still be confused by "mesocycle"/"block"
terminology, the soreness/fatigue/joint EMA decimals (no scale shown), and why
there's no button to start a block.
ATHLETE QUESTION: Mostly yes — periodisation tracking, weekly load trend,
recovery EMAs, and deload prediction are exactly the right signals for a serious
trainee. They may want to configure block length/deload week directly here rather
than only via plan activation.
LOCATION QUESTION: Correct — the periodisation layer belongs in the Plans stack
alongside the plan it sits on top of.
VISUAL + USABILITY:
- Font sizes:
  - historyLabel: `type.label` = 13 (:411-414).
  - dashName: `type.title` = 17 (:422); dashWeek: `type.num('caption')` = 11
    (:423).
  - tonnageLabel: `type.caption` = 11 (:427).
  - recovValue: `type.num('bodyStrong')` = 16 (:430); recovLabel: fontSize.micro
    (10) (:431).
  - deloadBannerText: fontSize.xs (11), lineHeight 17 (:438).
  - activeBadgeText: fontSize.xs (11), black (:450-452).
  - mesoName: `type.title` = 17 (:453); metaItem: fontSize.sm (13) (:455).
  - planCardTag: fontSize.xs (11), black (:463-466); planCardName: `type.h3` = 20
    (:467); planCardMeta: fontSize.sm (13) (:468); planCardNote: fontSize.sm (13),
    lineHeight 20 (:469-472).
  - weekLabel: `type.num('label')` = 13 (:475); deloadLabel: `type.num('caption')`
    = 11 (:480).
  - emptyTitle: `type.h3` = 20 (:485); emptyText: fontSize.md (16), lineHeight 22
    (:486).
  - summaryBtnText: fontSize.xs (11) (:495).
  - planWeekLabel: `type.num('label')` = 13 (:499); deload variant (:500).
- Touch targets:
  - "View block summary" button (summaryBtn): paddingVertical spacing.xs (4) +
    paddingHorizontal spacing.sm (8), 14px icon + 11px text → ~24px visual, NO
    hitSlop (:237-246, style :488-494). FLAG — well under 44px; the only action
    on a past-block card.
  - InfoTooltip icons (size 13/14): small hit areas (component not in this file).
    FLAG (minor).
  - Otherwise the screen is largely non-interactive (read-only cards, dots,
    chart).
- Information density: The active dashboard is dense (badge, name, week line,
  progress bar, bar chart, 3-up recovery row, deload banner) but well-segmented
  within one card. List of past blocks is light.
- Clean/cluttered: Clean and well-structured.
- Most important action prominence: There is no primary action on the screen
  (no create-block CTA), which is itself the notable gap — the most "actionable"
  element is the small "View block summary" link on archived cards.
- Small/standard/large behaviour: FlatList-scrolled (:134). The tonnage chart
  width is computed as `tonnageBars.length * 30` (:354) with FIXED barWidth 24 /
  barGap 6 / height 60 — it does not flex to screen width, so a long block (e.g.
  8 weeks → 240px) is fine but the fixed bars won't scale with larger-text.
  weekDot/planWeekDot bars use `flex: 1` so they adapt to width. recovLabel at
  fontSize.micro (10) is below the body minimum and the smallest text on the
  screen.

---

## Cross-screen observations (flagged, not fixed)
- Unit inconsistency: tonnage / starting-weight are displayed as hardcoded "kg"
  in RoutineDetail (:343), WorkoutHistory (:356), WorkoutSummary Total kg
  (:743) and Mesocycle (:351), while BuildWorkout's start-weight label
  (:283) and WorkoutSummary's exercise chips (:866) use the `units` value. If a
  user logs in lb this is a visible mismatch.
- ManualBuilder name bug (observation only): page-2 edits to the plan name
  (`editablePlanName`) are not used when activating; `handleSaveAndActivate`
  passes `planName.trim()` from page 1 (:316).
- Touch targets under 44px without hitSlop recur across these screens: filter
  chips (WorkoutHistory :709-716), goal pills (ManualBuilder :596-603), rating
  buttons (WorkoutSummary :1478-1481), calendar day cells (WorkoutHistory
  :762-769), and the "View block summary" link (Mesocycle :488-494).


<!-- ==== phase1/03-home.md ==== -->

# Phase 1 audit — Home screens

Files read in full: `src/screens/HomeScreen.js` (2486 lines), `src/screens/FreeStarterScreen.js` (318 lines), `src/styles/theme.js`, `src/components/ScreenHeader.js`, `src/navigation/RootNavigator.js` (relevant sections), `src/lib/onboarding/freeStarter.js` (relevant sections).

Token resolution (from `src/styles/theme.js`, dark default):
- `fontSize.micro` (10) `theme.js:257`, `fontSize.xs` (11) `:258`, `fontSize.sm` (13) `:259`, `fontSize.md` (16) `:260`, `fontSize.lg` (17) `:261`, `fontSize.xl` (20) `:262`, `fontSize.xxl` (24) `:263`, `fontSize.xxxl` (32) `:264`.
- `type.h2` = fontSize.xxl (24)/bold `:382-384`; `type.h3` = fontSize.xl (20)/semibold `:386-388`; `type.title` = fontSize.lg (17)/semibold `:390-392`; `type.body` = fontSize.md (16)/regular `:394-396`; `type.bodyStrong` = fontSize.md (16)/semibold `:398-400`; `type.label` = fontSize.sm (13)/medium `:402-404`; `type.caption` = fontSize.xs (11)/regular `:406-408`.
- `spacing`: xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 `:228-239`.
- NOTE on scaling: `colors`/`fontSize` are mutated in place at boot by `applyAccessibility()` (`theme.js:293-338`); "Larger text" multiplies every fontSize token by 1.2 (`:325-337`). All resolved px below are the dark, default-accessibility baseline.

---

SCREEN: Home (Train tab)
WHAT IT IS: The app's daily entry point and the first tab. It answers "what do I do today", launches the workout, and surfaces coaching/attention banners, a quick-glance "Today" strip, last-session recap, and (free tier) plan-discovery and Pro upsell. Registered route name "Home"; tab title shown in-header is "Train" (`HomeScreen.js:956`).
WHAT IS ON IT (exhaustive, top to bottom; each item with its render condition):
- **Branded header** — `ScreenHeader title="Train" subtitle={getGreeting(...)}` (`:956`). Title "Train"; subtitle is a time-of-day greeting with first name: "Up early/Morning/Afternoon/Evening/Late night{, name}." (`getGreeting` `:49-57`). Header also renders the Volyume wordmark on the right (`ScreenHeader.js:32`). Always shown.
- **Training schedule context line** — single line, shown only when `scheduleContext` is set (`:959`). Copy: "Today is a training day" / "Next session: tomorrow" / "Next session: {dayName}" (`:964-968`). Source is AsyncStorage `@volyume_schedule_v1` (`:463`); computed in `loadScheduleContext` `:461-489`.
- **Banner stack (at most ONE shows at a time — one-banner invariant, `:924-944`)**, in priority order:
  1. **Nutrition phase sync banner** `showPhaseBanner` (`:938-939`, render `:979-1002`): info icon + "Your nutrition targets are set for {savedPhaseLabel}. Update them under You to reflect your current plan." Chevron → ProfileTab/NutritionTargets (`:987`); close dismisses (`:995`). Condition: phase ≠ saved nutrition key, not dismissed, no higher banner (`loadPhaseBanner` `:491-531`).
  2. **Fresh coach update banner** `showCoachBanner` (Pro, `:929-930`, render `:1005-1036`): sparkles icon + "Precision Coaching™ · this week's review" + body ("Calories adjusted to {n} kcal. Tap to see why." or "Tap to see what changed and why."). Taps → CoachOutput (`:1008`); close dismisses. Condition: tier pro, latestCoachOutput exists, not dismissed, weekStart within 7 days.
  3. **Trial value countdown banner** `showTrialCountdownBanner` (`:934-935`, render `:1039-1065`): sparkles + `trialBanner.line` + chevron + close. Tap → scroll to top (variant S3) or ProfileTab/WeeklyCheckIn (`:1042-1048`). Condition: in Pro trial days 2–7, no coach output yet (`loadTrialBanner` `:311-368`).
  4. **Recovery week (deload) banner** `showDeloadBanner` (`:936-937`, render `:1068-1096`): battery-charging icon + "Recovery week suggested" + first reason line. Tap → CoachReview (`:1071`); close dismisses.
  5. **Free weekly coach one-liner** `showFreeCoachLine` (free tier, `:943-944`, render `:1099-1122`): pulse icon + one read-only sentence + close, plus footer link "Pro reads the full story" → ProUpgrade (`:1114`). Built by `buildFreeCoachLine` from sessions-this-week + weight direction only (`loadFreeCoachLine` `:383-411`).
- **Skeleton placeholders** — during `initialLoading`, two SkeletonCards (height 160 + 64) (`:1129-1136`).
- **Primary workout area** (mutually-exclusive branches):
  - **Session-in-Progress card** when `hasActiveWorkout` (`:1145-1161`): green card, play icon, "Session in Progress" / "Tap to return to your workout", chevron → ActiveWorkout.
  - **Hero plan card** when `activePlan && nextWorkout` (`:1162-1301`): eyebrow "Day X of Y" (`planProgress` `:903-905`); workout name (`:1167`); "{n} exercises" meta (`:1170-1174`); mesocycle context chip — "Deload week · pull effort back" or "Week N of M · stop R short of failure", tappable → block-shape sheet (`:1180-1202`); optional CoachBriefCard (`:1203-1205`); then either the **first-run hero variant** (Pro, 0 sessions, not dismissed — "First session: a short one… About 15 minutes", Start short session + dismiss-X + "or start the full session", `:1210-1247`) OR the **standard start row** (Start workout + View, `:1248-1278`); plus a secondary row: "Change workout" (opens picker sheet) + "Blank session" (→ BuildWorkout) (`:1279-1300`).
  - **No-plan section** otherwise (`:1302-1415`):
    - Pro: "No active plan on this device" hero with barbell icon + explanatory copy + "Build my plan" button (calls `generateAndSavePlan`) (`:1304-1330`).
    - Free: starter card with compass icon, title "Not sure where to start?" / "Put a plan behind your training" (depends on whether there's history), sub-copy, "Find my plan" → FreeStarter, "Browse plans" → PlansTab/PlanLibrary (`:1335-1360`).
    - "Your progress at a glance" card when `lastSession != null` (`:1364-1381`): two stats — sessions this week + relative last-session day.
    - Pro: quick-start card "Start your first session" → blank session (`:1386-1401`).
    - Free: quiet link "Just want to log? Start a blank session" (`:1403-1413`).
- **Today strip (Pro only)** — `<TodayStrip>` (`:1421-1438`): weight cell (log/sparkline), steps, cardio (tap → LogCardio), trend open → ProgressTab/Analytics. Honours `edFlagOpen` (value-only, no sparkline).
- **Pro teaser card (free, ≥3 sessions)** `:1442-1466`: sparkles + dynamic line using `teaserInsight` (e.g. "X went up. Y held. Pro tells you what to do next."), → ProUpgrade.
- **Last session card** when `lastSession` set (`:1469-1530`): "Last session" label + relative date + "Repeat" pill (→ `handleRepeatLastSession`); workout name; stat pills — duration (m), set count, total volume (kg). Tap card → WorkoutHistory.
- **Coaching discovery nudge (Pro, one-time)** `showCoachingNudge` (`:1536-1566`): "Your weekly check-in is ready" + body + "Open check-in" → ProfileTab/WeeklyCheckIn + close.
- **Modals**: Block-shape sheet (`:1576-1602`, BlockShapeCard), Change-workout picker sheet (`:1604-1662`, day rows D1..Dn with "Next up" badge / checkmark), Pre-workout intent prompt (`:1665-1740`: "How are you feeling today?" — Sharp/Average/Below par options + three optional readiness chip rows soreness/sleep/energy + Skip).
NAVIGATION: Route "Home" registered in `HomeStack` as `Stack.Screen name="Home"`, `headerShown:false` (`RootNavigator.js:293`). HomeStack is the Train tab. Reached as the default tab on app launch into MainTabs. Pushes to / navigates to: ActiveWorkout (`:821,855,1148`), BuildWorkout (`:1292`), FreeStarter (`:1350`), ProUpgrade (`:1114,1445`), WorkoutHistory (`:1472`), CoachOutput (`:1008`), CoachReview (`:1071`), RoutineDetail via PlansTab (`:1266`), LogCardio (`:1435`); cross-tab via `getParent()`: ProfileTab→CascadeGate (`:127`), ProfileTab→NutritionTargets (`:987`), ProfileTab→WeeklyCheckIn (`:1046,1550`), ProgressTab→Analytics (`:1436`).
GATING: Mixed; the screen itself is **free** (no `withProGuard`/`ProGate` wrapper on the route). Tier-conditional content is read from `useAppStore(s => s.tier)` (`:85-87`). Pro-only blocks gate on `tier === 'pro'`: coach banner (`:929`), trial banner data load (`:286`), Today strip (`:1421`), first-run hero (`:1210`), coaching nudge (`:618`), session-adjustments compute (`:829`). Free-only blocks gate on `tier === 'free'`: free coach line (`:287,943`), Pro teaser (`:1442`), progression teaser (`:647`), free starter card (`:1331`).
CURRENT STRENGTHS:
- Strong "answer the day" focus: one prominent primary CTA (Start workout) with a true large filled button (`primaryBtn` `:1953-1962`, paddingVertical spacing.md=12 + text).
- Disciplined one-banner invariant keeps attention banners from stacking and burying the CTA (`:924-944`).
- Skeleton-on-cold-load avoids a blank screen (`:1129-1136`); optimistic weight write with revert (`:574-590`).
- Crash-recovery restore of an in-progress session (`:96-106`) and pull-to-refresh re-sync (`:749-769`).
- Free/Pro separation is explicit and consistent; free path still gets a real "what do I do today" answer (starter card → FreeStarter).
CURRENT WEAKNESSES:
- Very high element/feature density: one file renders 5 banner types, 3 primary-area branches, a strip, teaser, last-session, nudge, and 3 modals. Comprehension burden for a maintainer is high, and a returning user can see header + schedule line + banner + hero + strip + teaser + last-session within one viewport.
- Several dismiss "close" icons are small (size 14–16, e.g. `:999,1033,1062,1093,1110,1563,1875`) though all carry `hitSlop` 8–12 so the tap area clears 44px in practice.
- `getRelativeDay` and `buildCoachBrief` logic live in the same screen file (helpers `:1745-1840`); content is fine but couples copy to the screen.
- Deload computation feeds `shouldDeload` with hardcoded placeholders (`weeksSinceLastDeload:99`, `avgJointDiscomfort:0`, `avgSoreness:0`, `hasOverMRV:false`) because they are "not tracked in local DB" (`:671-675`) — the banner can therefore fire on reps-only signal; flagged as observation, not a fix.
NEWBIE QUESTION: Largely yes for the free first-timer: the no-plan starter card asks "Not sure where to start?" and routes to a 3-question quiz (`:1339-1352`); the hero's "Start workout" is unambiguous. Some coaching vocabulary is unexplained at a glance — "Deload week", "stop R short of failure" (RIR) in the meso chip (`:1193-1198`), "Recovery week suggested" — a brand-new gym-goer will not know these terms without tapping through.
ATHLETE QUESTION: Mostly yes: mesocycle week/RIR target chip (`:1180-1202`), block-shape sheet, last-session tonnage in kg, deload signalling, and Precision Coaching review banner give an experienced competitor real periodisation context. Gaps for an athlete: the deload trigger is fed placeholder recovery inputs (`:671-675`), and the volume/MRV detail ("This week's plan" block) was explicitly moved off Home to the Progress tab (`:1533`), so per-muscle weekly volume is not visible here.
LOCATION QUESTION: Right place. As the first tab and daily entry point, the start-the-workout hero, today strip, and attention banners belong here. The deliberate removal of History/Lifts/Volume quick links and the weekly-plan block to the Progress tab (`:1533,1568-1569`) is consistent with keeping Home action-focused.
VISUAL + USABILITY:
- Font sizes (token → resolved px → file:line):
  - Header title "Train": fontSize.xl (20)/bold (`ScreenHeader.js:54`). Subtitle greeting: fontSize.sm (13) (`ScreenHeader.js:69`).
  - Schedule context line: fontSize.sm (13) (`:1893`).
  - Phase banner text: fontSize.xs (11) (`:2406`). Coach banner title/body: fontSize.sm (13) (`:2363-2364`). Trial banner text: fontSize.sm (13)/semibold (`:2359`). Deload title/body: fontSize.sm (13) (`:2371-2372`). Free coach line: fontSize.sm (13) (`:2384`); footer fontSize.xs (11) (`:2388`).
  - Continue card title: type.bodyStrong (16) (`:1914`); sub type.caption (11) (`:1915`).
  - Hero eyebrow: fontSize.xs (11)/semibold uppercase (`:1930`). Workout name: fontSize.xxl (24)/black, lineHeight 30 (`:1936-1941`). Workout meta: fontSize.sm (13) (`:1942`). Meso chip text: fontSize.xs (11) (`:1952`). primaryBtnText: type.bodyStrong (16) (`:1963`). viewWorkoutBtnText: type.label (13) (`:1984`). heroSecondaryBtnText: fontSize.xs (11) (`:2008-2012`).
  - No-plan title: type.h3 (20) (`:2036`); sub fontSize.sm (13) (`:2040`). Glance stat value: fontSize.xl (20)/black (`:2089-2091`); label type.caption (11) (`:2094`). Quick-start title type.bodyStrong (16) (`:2476`); sub fontSize.sm (13) (`:2482`). Blank-session link fontSize.sm (13) (`:2047`).
  - Last session: label fontSize.xs (11) (`:2117`); rel date fontSize.xs (11) (`:2121`); name type.title (17) (`:2140`); stat pill text fontSize.xs (11) (`:2149`); repeat btn text fontSize.xs (11) (`:2136`).
  - Pro teaser title: fontSize.sm (13) (`:2338`). Coaching nudge title type.label (13) (`:2216`); body fontSize.xs (11) (`:2219`); btn text fontSize.xs (11) (`:2226`).
  - Intent prompt: title type.h3 (20) (`:2243`); sub fontSize.sm (13) (`:2248`); option label type.bodyStrong (16) (`:2270`); option sub type.caption (11) (`:2274`); readiness label type.caption (11) (`:2283`); chip text fontSize.sm (13) (`:2304`); skip fontSize.sm (13) (`:2317`).
  - Sheet: title type.h3 (20) (`:2167`); sub fontSize.sm (13) (`:2170`); picker name type.bodyStrong (16) (`:2187`); picker meta type.caption (11) (`:2188`); day num fontSize.xs (11) (`:2185`); next badge fontSize.xs (11) (`:2194`).
- Touch-target sizes (flag < 44px):
  - primaryBtn / startBtnSplit: paddingVertical spacing.md (12) + 16px text ≈ ~40px tall; flagged borderline but within tap norms (`:1953-1973`).
  - viewWorkoutBtn paddingVertical spacing.md (12) (`:1976`); heroSecondaryBtn paddingVertical spacing.sm (8) (`:2006`) — small height (~30px) but full-width-ish; **below 44px tall**.
  - Continue icon 40×40 (`:1910`); intentOptionIcon 40×40 (`:2264`); dayBadge 40×40 (`:2181`); noPlanIconWrap 56×56 (`:2030`); quickStartIcon 48×48 (`:2468`).
  - Banner close icons (size 14–16) rely on hitSlop 8–12 to reach ~44px (`:996,999,1029,1058,1089,1106,1232,1560,1872`). Meso chip is a small pill (paddingVertical spacing.xs=4) **below 44px tall** (`:1947`) but has no hitSlop.
  - Repeat pill paddingVertical spacing.xs (4) → ~21px tall, mitigated by hitSlop 8 (`:1484,2129`).
- Information density: high. Multiple independent surfaces can co-render in one scroll (banner + hero + strip + teaser + last-session + nudge). The one-banner invariant caps banners at one, which is the main density control.
- Clean or cluttered: hero itself is clean (flat surface, one CTA, two text links — comment `:1917-1920`). The screen as a whole trends cluttered for an active Pro user because of the number of optional cards stacked below the hero. Oversized: workout name at 24/black with lineHeight 30 is appropriately the loudest non-banner element. Undersized: heroSecondaryBtn text at 11px and meso chip text at 11px.
- Most important action most prominent? Yes — "Start workout" is the only amber-filled (`colors.primary`) button in the primary area (`primaryBtn` backgroundColor `:1958`); everything else is surface/surface2 or text links, so the CTA wins the visual hierarchy.
- Small/standard/large behaviour: whole screen is a `ScrollView` with `contentContainerStyle` padding spacing.lg and `paddingBottom: spacing.xxl` (`:1886`), so vertical overflow scrolls on small (5.4") devices — no fixed-height clipping risk. Sheets are `maxHeight:'80%'` (`:2160`), proportional. Fixed pixel sizes that won't scale with screen: icon wraps (40/48/56), workoutName lineHeight 30 (`:1941`), glanceDivider height 40 (`:2100`), WORDMARK_HEIGHT 22 — these are device-independent constants, fine on all three sizes. Font tokens scale only via the in-app "Larger text" toggle (×1.2) and OS font scaling (RN `allowFontScaling` default true), not by device width.

---

SCREEN: FreeStarter
WHAT IT IS: The free guided beginner on-ramp (founder decision 4a). A three-question micro-quiz (goal, equipment, days/week) that deterministically picks one beginner library plan, copies + activates it, and lands the user on Home with today's session answered. Scoring is in `lib/onboarding/freeStarter.js`; no AI (`FreeStarterScreen.js:20-27`).
WHAT IS ON IT (exhaustive):
- **Top bar** (`:133-153`): back chevron (`handleBack` — previous question or goBack, `:73-76`); progress dots, one per step, filled up to current (`:147-149`); a 22px spacer to keep dots centred (`:152`).
- **Question steps** (when `!onResultStep`, `:156-184`): question text from `FREE_STARTER_STEPS[step].question` (`:158`); a sub-line that varies by step — step 0 "There's no wrong answer. You can change direction any time.", step 1 "Your plan only uses equipment you actually have.", else "Pick what fits your week. Consistency beats volume." (`:159-165`); option buttons, each with optional icon + label + forward chevron (`:167-182`). The three questions (from `freeStarter.js`): Q1 "What do you want from training?" (Build muscle / Get stronger / General fitness, `:26-32`); Q2 "Where will you train?" (Full gym / Dumbbells at home / At home no equipment, `:35-40`); Q3 "How many days a week can you train?" (2 / 3 / 4 days, `:44-49`).
- **Result step (recommendation found)** (`:185-220`): checkmark-circle icon (`:187-189`); title "Your starter plan" (`:190`); intro "Built for people starting out. Every session tells you exactly what to do: the exercises, the sets, and the reps." (`:191-194`); result card with "Beginner friendly" badge, plan name, optional description (≤4 lines), and meta line "{recDays} days a week · {wc} workout(s)" (`:195-209`); primary "Start with this plan" button (size lg, loading state, `handleStartPlan` `:210-216`); footnote "The first couple of weeks are for learning the movements. That counts as progress." (`:217-219`).
- **Result step (no recommendation / library not loaded)** (`:221-235`): title "We couldn't pick a plan"; intro about library not loaded; button "Continue" (fromFirstRun) or "Browse plans" (`:227-233`).
- **Secondary links**: "Browse all plans instead" (only on result step, recommendation present, not first-run; `:237-246`) → `handleBrowse` (popToTop then PlansTab/PlanLibrary, `:98-101`); always-visible "Skip, I'll choose myself" → `handleSkip` (completes first run if fromFirstRun, else goBack; `:248-256`, `:81-94`).
NAVIGATION: Route "FreeStarter" registered in three stacks (all `headerShown:false` except the FirstRun one which inherits stack default): `HomeStack` (`RootNavigator.js:306`), `PlansStack` (`:329`), and `FirstRunStack` (`:475`). Reached from: FirstRunStack straight after the name screen with `fromFirstRun:true` (`:471-475`); Home's no-plan starter card "Find my plan" (`HomeScreen.js:1350`); and the Plans tab's no-plan card. Leads to: on start, copies+activates a plan then either `completeFirstRun()` (flips navigator into MainTabs) or `popToTop` back to the calling stack (`:113-120`); Browse → PlansTab/PlanLibrary (`:100`); Skip → completeFirstRun or goBack (`:83-93`).
GATING: **Free** (founder decision 4a, comment `:20`). No `withProGuard`, `ProGate`, or tier check anywhere in the file; the only store reads are `user` and `completeFirstRun` (`:30-33`).
CURRENT STRENGTHS:
- Genuinely low-friction: three plain questions, one recommended plan, autonomy preserved by an always-present "Skip" and a "Browse all plans" escape (`:237-256`).
- Graceful degradation: recommendation computed at render from whatever plans have loaded (`useMemo` `:63-66`), and a dedicated "We couldn't pick a plan" fallback (`:221-235`) so a slow library load never strands a null result.
- Encouraging, beginner-appropriate copy ("There's no wrong answer", "learning the movements… counts as progress").
- Deterministic, no-AI scoring (respects the coaching-engine boundary).
NEWBIE QUESTION: Yes — this screen is purpose-built for the first-time gym-goer. Questions are jargon-free, each answer has an icon, and the result explains the plan in plain terms (exercises/sets/reps) with reassurance. This is the screen most aligned to a newbie's needs.
ATHLETE QUESTION: Not aimed at them, and correctly so — only three difficulty-0 beginner outcomes (2/3/4 days, build/strength/fitness). An experienced competitor would skip via "Browse all plans" or the library. Acceptable because the screen is explicitly the beginner on-ramp.
LOCATION QUESTION: Right place — sits in the onboarding flow (FirstRunStack) and as a reachable detour from both Home and Plans no-plan states, exactly where a planless user looks for "what do I do". Registering it in three stacks is intentional so each entry point returns correctly.
VISUAL + USABILITY:
- Font sizes (token → resolved px → file:line):
  - Question: type.h2 (24)/bold (`:273`). Question sub: fontSize.sm (13), lineHeight 20 (`:274-277`). Option text: fontSize.md (16)/medium (`:285`).
  - Result title: fontSize.xl (20)/black (`:288-291`). Result intro: fontSize.sm (13), lineHeight 20 (`:292-295`). Result badge text: fontSize.micro (10)/black (`:307`). Result name: type.bodyStrong (16) (`:308`). Result desc: fontSize.sm (13), lineHeight 18 (`:309`). Result meta: type.caption (11) (`:310`). Result footnote: type.caption (11), lineHeight 17 (`:311-313`).
  - Skip link text: fontSize.sm (13) (`:316`).
- Touch targets (flag < 44px):
  - Back chevron (size 22) with hitSlop 10 → clears 44px (`:134-141`).
  - Option button: padding spacing.md (12) all sides + 16px text ≈ ~40px tall (`:279-284`) — borderline ~40px; rows are full-width so horizontally large.
  - "Start with this plan" Button size="lg" (`:212`) — relies on Button component for height (not defined in this file; sizing lives in `components/Button`).
  - Skip / Browse links: paddingVertical spacing.sm (8) → ~29px tall (`:315`) — **below 44px**, no hitSlop; small but secondary actions.
  - Progress dots are explicitly non-interactive (`accessibilityElementsHidden`, `:144-145`).
- Information density: low and well-paced — one question and its options per screen; the result step is a single card plus CTA. This is the calmest screen of the two.
- Clean or cluttered: clean. Centred result block, single accent card, one primary button. No oversized/misaligned elements observed; the 22px top-bar spacer is a deliberate balance for the back chevron (`:151-152`).
- Most important action most prominent? Yes — on the result step the lg primary "Start with this plan" Button is the dominant element; Skip/Browse are muted text links (`color: colors.textMuted`, `:316`).
- Small/standard/large behaviour: content is a `ScrollView` with `contentContainerStyle` `flexGrow:1` + padding spacing.xl (`:272`), so it fills and scrolls on small (5.4") devices and centres comfortably on large (6.7"). Fixed sizes that won't scale: progress dots 8×8 (`:269`), top-bar spacer width 22 (`:152`) — device-independent constants, fine across sizes. Font tokens scale only via the in-app Larger-text toggle / OS scaling, as on Home.


<!-- ==== phase1/04-coaching.md ==== -->

# Phase 1 inventory — Coaching screens (2026-06-13)

Resolved theme tokens used below (src/styles/theme.js):
- fontSize: micro 10 (256), xs 11 (258), sm 13 (259), md 16 (260), lg 17 (261), xl 20 (262), xxl 24 (263), xxxl 32 (264), display 40 (265)
- spacing: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (228-239)
- radius: xs 4, sm 6, md 10, lg 14, xl 20, full 999 (241-248)
- type.body fontSize.md 16 (394-396); type.bodyStrong fontSize.md 16 (398-400); type.label fontSize.sm 13 (402-404); type.caption fontSize.xs 11 (406-408)
- type.num(role) = role + tabular-nums (417-421)
NOTE: with the Larger-text accessibility toggle on, every fontSize token is multiplied by 1.2 at boot (theme.js:325-337), so all px values below are the default (toggle-off) values.

---

SCREEN: CoachOutputScreen ("Your week" / Precision Coaching™ weekly output)
WHAT IT IS: The weekly Precision Coaching review card. After a user submits a weekly check-in (or taps the "your plan is ready" notification), this screen runs the deterministic weekly coach engine (runWeeklyCoach, CoachOutputScreen.js:1208) and renders the result: the week's headline, trend chips, what went well/off, the confirm-then-apply training and nutrition adjustments, the "why", a focus cue, safety blocks, held decisions, and an optional differential paywall for free users.
WHAT IS ON IT:
- Week header: weekLabel (1561) + week date range "19 May to 25 May 2026" (weekRangeLabel, 1562)
- Headline sentence (buildHeadline, 1566; logic 89-106): calorie change / on-target / off-target-holding / default
- Coach lead card (1571-1584): acknowledgement (1578) + interpretation (1580) from buildRegisteredCoachResponse (1517)
- Trend chips row (1587-1610): weight-trend chip with directional arrow icon + colour (trendIcon/trendColor logic 1493-1508), value = trend.deltaLabel or "No weights logged" (1511); sessions chip `{completed}/{planned}` (1598); PRs chip when prsThisWeek > 0 (1602-1609)
- "Share this week" button (1613-1621) → ShareCard (handleShareWeek, 1533-1551)
- "What's working" card (WhatsWorkingCard, 1624-1626; bullets with checkmark icons)
- "What was off" card (1629-1645; bullets with warning "remove" icons, buildOffItems 108-135)
- "Training next week" card (TrainingNextWeekCard, 1648-1657): either a "Take a recovery week" deload row OR an "Add/Pull back N sets" / "Hold your current volume" row, each with Apply button and a planNote ("This sets next week's starting volume…", 358-360)
- "Nutrition next week" card (NextWeekCard, 1658-1664): calorie row ("+N kcal" / "Hold at current target" / "Calories held"), steps row ("N/day target"), cardio row — each an AdjustmentRow with optional Apply button + "Applied" chip
- Plan-edit receipt card (1668-1684): headline + body + optional deep-link to MealPlan, shown after a calorie apply edits an active meal plan
- Cardio flag note row (1687-1692) and cardio acknowledgement note row (1694-1699): single advisory lines with heart icon
- MacroCycleCard (1702-1709): training-day vs rest-day kcal/carbs split + "Use this split" Apply (advanced cuts/competitors only)
- RefeedCard (1712-1719): single refeed-day kcal/carbs target + "Schedule refeed" Apply (aggressive cuts/competitors only)
- WhyBlock (1722): "Why this week:" + italic text + "Understand how this decision was made" link → Methodology
- Focus card (1727-1736): "Focus this week" label + cue (coachResponse.cue or buildFocus, 137-165)
- RapidLossAlert (1739): "Weight dropping quickly" warning card (1.5%/week language, 389-401)
- DietBreakCard (1742-1749): "Diet break worth considering" + MATADOR-2017 footnote + "Set maintenance week" Apply
- Forward line (1753-1755): coachResponse.forward closing sentence
- HeldDecisionsCard (1759-1765): EdPatternLockoutBlock / EdPatternClearedBlock / RapidLossCorrectedBlock structured blocks (612-683), standard held rows, "See how Precision Coaching decides" link, "PREVIOUS WEEKS" history shelf, "See all weeks" → CoachHeldHistory
- DifferentialBadge paywall (1770-1796): free-tier only, with localised Play price → Paywall
- "Done" button (1799-1801) → popToTop (handleClose, 1415-1422)
- Two credential notes (1803-1809): Precision Coaching™ science statement + "not medical advice" disclaimer
- Alternative full-screen states: LoadingView skeletons (687-696), InsufficientDataView "Building your baseline." (698-716), LoadErrorView "Couldn't load your coach." with Try again / Close (721-742)
NAVIGATION: Route "CoachOutput", registered in ProfileStack as `<Stack.Screen name="CoachOutput" component={GatedCoachOutput} options={{ title: 'Precision Coaching™' }}>` (RootNavigator.js:388). Reached from WeeklyCheckIn (same ProfileStack) and from the weekly "your plan is ready" notification (routeForNotificationType; weekStart defaults to current local week, CoachOutputScreen.js:753). Leads to: Methodology (1722, 1763), CoachHeldHistory (1762), ShareCard (1541), Paywall (1783), and DiaryTab→MealPlan (1675). Back chevron + Done both call popToTop on the Profile stack (1421, 1430).
GATING: Pro. Wrapped via `const GatedCoachOutput = withProGuard(CoachOutputScreen, 'Your week')` (RootNavigator.js:152) and registered as GatedCoachOutput (388). A differential paywall for free users is also rendered conditionally (1770), driven by `userTier: storeTier ?? require('../lib/proGate').isPaidTier(userProfile)` fed into the engine (1258).
CURRENT STRENGTHS:
- Confirm-then-apply throughout: every engine suggestion is a suggestion with an explicit Apply button and an "Applied" chip, never auto-written (founder GAP rows 3-7, 1341-1345).
- Distinguishes load error (retryable) from insufficient data (1448-1463), so a network blip never reads as "you haven't logged enough".
- Safety-class colour discipline: a bodyweight trend chip never wears red; off-target caps at "watch", drops to neutral under an open ED flag (1487-1508, 1593).
- Strong transparency: "Why this week", held-decisions, and methodology links are always reachable.
- Skeleton loading state and accessible labels on the apply buttons and lead card.
CURRENT WEAKNESSES:
- Very high information density: up to ~14 distinct cards/blocks can stack in one ScrollView (training, nutrition, plan-edit, two cardio notes, macro cycle, refeed, why, focus, rapid-loss, diet-break, forward line, held decisions, paywall, two credential notes). On a real week with several signals firing this is a long scroll with many competing call-to-actions.
- Multiple Apply buttons of identical visual weight (training, calories, steps, cardio, deload, diet-break, macro cycle, refeed) compete for attention; no single primary action is emphasised over the others.
- The headline (1566), the coach lead acknowledgement+interpretation (1571), and the trend chips (1587) all restate the same week status in three different forms at the very top — redundancy before the user reaches any decision.
- buildHeadline/buildOffItems/buildFocus are local string builders (89-165) layered ON TOP of the engine's own coachResponse parts, so two parallel narration systems coexist on one screen.
NEWBIE QUESTION: Partially. The copy is plain-English and the "What's working / What was off / Focus this week" framing is approachable, and the methodology link explains the engine. But a first-timer would be confronted with terms like "volume", "sets per muscle group", "deload/recovery week", "refeed", "macro cycle / carbs by day", "maintenance calories", and multiple Apply buttons whose downstream effect ("This sets next week's starting volume") is only partly explained. The sheer number of simultaneous decisions is likely to overwhelm a brand-new gym-goer.
ATHLETE QUESTION: Yes, largely. An experienced competitor gets the levers they expect: weekly volume signal with MEV/MRV-aware spread, deload, diet break (MATADOR-cited), high/low carb cycling, refeed cadence, steps + cardio prescriptions, RED-S/FFM safety floors, and explicit "why". The confirm-then-apply model respects an experienced user's autonomy. The main gap for an athlete is that the raw numbers (e.g. per-muscle set targets) are summarised rather than shown per-muscle on this screen.
LOCATION QUESTION: Yes. It sits in the Profile/You stack immediately after WeeklyCheckIn, which is the correct flow (submit check-in → see the coach's response), and the weekly notification deep-links straight here. Closing returns to the You root via popToTop (1421), which is the intended landing.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - weekLabel fontSize.xxl (24), bold, primary colour (1882-1886)
    - weekRange fontSize.sm (13), textMuted (1887-1890)
    - headline fontSize.lg (17), bold, lineHeight 26 (1939-1945)
    - coachLeadAck fontSize.md (16) semibold (1972-1977); coachLeadInterpretation fontSize.md (16) (1978-1982)
    - statChipValue fontSize.sm (13) bold; statChipLabel fontSize.sm (13) (1909-1917)
    - sectionHeader fontSize.sm (13) semibold (1930-1936)
    - bulletText fontSize.md (16) lineHeight 22 (2021-2026)
    - adjustmentLabel fontSize.md (16) semibold (2048-2052); adjustmentNote fontSize.sm (13) (2064-2068)
    - appliedChipText fontSize.micro (10) bold (2060-2063)
    - applyBtnText fontSize.sm (13) bold (2079-2083)
    - focusLabel fontSize.xs (11) bold uppercase (1997-2003); focusText fontSize.md (16) semibold (2004-2009)
    - whyLabel fontSize.sm (13) semibold (2129-2133); whyText fontSize.sm (13) italic (2134-2139); whyLearnMore fontSize.xs (11) underlined (2141-2146)
    - macroCycleColLabel fontSize.xs (11) (2098-2102); macroCycleColKcal fontSize.lg (17) bold tabular (2103-2108); macroCycleColCarbs fontSize.sm (13) (2109-2113)
    - dietBreakTitle fontSize.sm (13) semibold (2164-2169); dietBreakBody fontSize.sm (13) (2170-2174); dietBreakFootnote fontSize.xs (11) (2175-2179)
    - rapidLossTitle fontSize.sm (13) bold, error colour (2230-2235); rapidLossBody fontSize.sm (13) (2236-2240)
    - edLockoutHeader fontSize.xs (11) (2260-2266); edLockoutTitle fontSize.lg (17) bold (2267-2271); edLockoutBody fontSize.sm (13) (2272-2276)
    - heldText fontSize.sm (13) (2360-2365); heldHistoryTitle fontSize.xs (11) (2367-2373); heldHistoryDate fontSize.xs (11) (2380); heldHistoryText fontSize.sm (13) (2381)
    - doneBtnText fontSize.lg (17) bold (2190-2194); secondaryBtnText fontSize.md (16) (2202-2206)
    - credentialNote fontSize.xs (11) lineHeight 17 (2207-2214)
    - insufficientTitle fontSize.xl (20) bold (1863-1869); insufficientBody fontSize.md (16) lineHeight 24 (1870-1875)
    - planNoteText / planEditBody fontSize.xs (11) / fontSize.sm (13) (2121-2123, 1830)
  - Touch targets:
    - applyBtn: minWidth 84, paddingVertical spacing.sm (8) + paddingHorizontal spacing.lg (16); no explicit height. Vertical = 8+8 + ~16 text ≈ ~32px tall. **FLAGS < 44px** in height (2069-2077).
    - doneBtn: paddingVertical spacing.lg (16) → ~48px tall, OK (2182-2189).
    - secondaryBtn: paddingVertical spacing.md (12) → ~37px tall. **FLAGS < 44px** (2196-2201).
    - shareWeekBtn: paddingVertical spacing.xs (4) only → ~21px tall. **FLAGS < 44px** (1850-1857).
    - whyLearnMore / heldLearnMore: text links with hitSlop {6,6,6,6} (378, 562); effective tap height ≈ 11px text + 12 = ~23px. **FLAGS < 44px** even with hitSlop (382, 567).
    - edLockoutCtaPrimary / edLockoutCtaGhost: paddingVertical spacing.sm (8) → ~33px. **FLAGS < 44px** (2294-2320).
    - heldSeeAll: paddingVertical spacing.sm (8) → ~33px. **FLAGS < 44px** (2388-2395).
    - Header back chevron: hitSlop {top:8,bottom:8,left:16,right:16} on a 24px icon (1430) → effective ≈ 40px tall. Marginally **< 44px** vertically.
  - Information density: high to very high (see weaknesses). The screen is a single ScrollView with up to ~14 stacked cards/blocks.
  - Clean or cluttered: clean per-card (consistent surface/border/radius tokens), but cluttered in aggregate when many engine signals fire at once; redundant top-of-screen status restatement.
  - Most important action most prominent? No. The Done button (solid primary, fontSize.lg, full-width) is the most visually prominent control, yet the meaningful actions are the various Apply buttons (smaller, secondary-feeling) scattered up the page. The true primary action(s) are de-emphasised relative to Done.
  - Small/standard/large behaviour: ScrollView with contentContainerStyle padding spacing.lg (16) and paddingBottom spacing.xxxl (48) (1839-1843), so content reflows and scrolls on all sizes. SafeAreaView edges only left/right (1554) — top inset handled by the navigator header. No fixed-height content containers that would clip; chips use flexWrap (1895). Text scales with the Larger-text toggle (1.2×, theme.js:325). No obvious small-screen breakage.

---

SCREEN: CoachReviewScreen ("Weekly Review")
WHAT IT IS: A free-tier training-only weekly review. It reads this calendar week's completed workouts and sets from local storage, computes per-muscle volume status, progression wins, deload signal, lagging muscles, and produces up to three plain-English recommendations. It does NOT run the Pro Precision Coaching engine and makes no nutrition/calorie decisions.
WHAT IS ON IT:
- Header: "Weekly review" title (405) + date range "d MMM – d MMM yyyy" (406, dateLabel 377-380)
- No-data card: "No sessions logged this week yet…" (410-416)
- "Sessions this week" card (421-443): three stats — session count, total sets, most-trained muscle (with dividers)
- "Volume this week" section (446-466): subtext explainer + a card listing each trained muscle as a VolumeRow (status dot colour, display name, set count, status badge label "Good range"/"Just enough"/"Getting close"/"Too much"/"Below target", VolumeRow 176-193, labels 24-33)
- "What went well" section (469-499): InsightRows for optimal-range muscles and progression wins (heavier weight / more reps), or an empty-state line
- "What to watch" section (502-566): InsightRows for over/near-MRV and below-minimum muscles, a deload suggestion row, and a joint-discomfort row; or an empty-state line
- "What to focus on next week" section (569-576): numbered RecommendationRows (buildRecommendations, 87-164)
- Loading: four SkeletonCards (384-395)
NAVIGATION: Route "CoachReview", registered in BOTH HomeStack (`<Stack.Screen name="CoachReview" component={CoachReviewScreen} options={{ title: 'Weekly Review' }}>`, RootNavigator.js:300) AND ProgressStack (RootNavigator.js:346). Reached from the Train (Home) and Progress tabs. The screen itself pushes nowhere (no navigation calls in the file).
GATING: Free. Not wrapped in withProGuard, and registered with the bare component in HomeStack (300) and ProgressStack (346). No tier guard or ProGate reference exists in CoachReviewScreen.js (it reads only `user` from the store, line 221). This is the free training-review counterpart to the Pro CoachOutputScreen.
CURRENT STRENGTHS:
- All computation is local/offline (getAllWorkouts, getCompletedWorkoutSets, getAllExercises, getRecentCheckins, 252-257), matching the offline-first rule.
- Plain-English, non-alarming copy with concrete next-step recommendations.
- Volume status uses the shared volume-landmark grammar (getVolumeStatus, statusDotColor 14-22) consistent with the rest of the app.
- Graceful empty states for the whole screen and per-section.
CURRENT WEAKNESSES:
- Silent catch: loadData swallows all errors and shows the no-data state (339-341), so a genuine read failure is indistinguishable from "no sessions this week" — the same failure-masquerade the CoachOutputScreen explicitly fixed.
- `weeksSinceLastDeload: 99` is hardcoded for every weekly bucket (328), so the deload heuristic can never use real time-since-deload here.
- Two screens named almost identically in concept (CoachReview vs CoachOutput) but with different engines and gating; potential user confusion between "Weekly Review" (free, training) and "Your week"/Precision Coaching (Pro).
- The progression-win warmup filter at line 44 (`if ((s.setType || s.setType === 'warmup') && s.setType === 'warmup')`) is convoluted but functionally filters warmups — noted, not in scope to fix.
NEWBIE QUESTION: Mostly yes. The status badges are in lay terms ("Good range", "Too much", "Below target") and the recommendations are explicit. A newbie still meets "volume", "sets", "MRV/minimum" concepts, but the language is softened ("more sets than you can comfortably recover from") so it is more newbie-friendly than CoachOutputScreen.
ATHLETE QUESTION: Partly. It gives an experienced lifter a clean per-muscle volume readout, progression wins, deload and lagging-muscle signals — useful at a glance. But it stops at training; there is no load/tonnage detail, no nutrition, and the deload signal is weakened by the hardcoded 99 (328). A serious competitor would use the Pro CoachOutputScreen instead.
LOCATION QUESTION: Yes. As a free training summary it belongs in both the Train and Progress stacks, which is where it is registered (300, 346). Reaching it from either tab is sensible.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - headerTitle fontSize.xxl (24) heavy (606-611); headerDate fontSize.sm (13) (612-615)
    - cardTitle fontSize.xs (11) semibold uppercase (629-636)
    - statValue fontSize.xl (20) heavy (648-653); statLabel ...type.caption fontSize.xs (11) (654-658)
    - sectionHeading ...type.label fontSize.sm (13) (669-672); sectionSubtext fontSize.xs (11) (673-677)
    - volumeMuscleName fontSize.md (16) medium (698-703); volumeSetCount fontSize.sm (13) (704-707); volumeBadgeText fontSize.xs (11) semibold (715-718)
    - insightText fontSize.sm (13) medium (736-741); insightSubtext fontSize.xs (11) (742-746)
    - recText fontSize.sm (13) (771-776); recIndexText fontSize.xs (11) bold (766-770)
    - emptyText fontSize.sm (13) (779-784); emptySubText fontSize.sm (13) (785-789)
  - Touch targets: this screen has NO interactive elements (no buttons, no links, no taps) — it is a read-only scroll. So no touch-target flags apply.
  - Information density: moderate. Four to five sections, each a card; reasonable whitespace via spacing.xl section gap (594-596).
  - Clean or cluttered: clean. Consistent card/section tokens, status dots 8px (693-697), 36px stat dividers (659-663).
  - Most important action most prominent? N/A — there are no actions; the content hierarchy (title → sessions → volume → went well → watch → focus) is logical.
  - Small/standard/large behaviour: single ScrollView, content padding spacing.lg (16), bottomSpacer spacing.xxxl (594-599). SafeAreaView edges top/left/right (400). All sizing is token/flex based; no fixed heights that clip. Scales fine across device widths.

---

SCREEN: CoachHeldHistoryScreen ("Coaching history")
WHAT IT IS: A chronological log of every weekly coach decision — what changed, what was held, and why — across all saved coach outputs, plus an embedded EngineLog of recent engine adaptations.
WHAT IS ON IT:
- BackHeader titled "Coaching history" (106)
- Intro line: "Every call the coach has made, what changed, what didn't, and why." (109-111)
- EngineLog component (115): recent engine adaptations + rep-regression warnings (moved from the retired Athlete Hub)
- Loading: three SkeletonCards height 110 (117-123)
- Empty state (125-133): book icon + "No entries yet" + "After your first weekly check-in, decisions and holds will appear here."
- Per-week blocks (135-170): "Week of {date}" header + decision rows. Each row = icon (checkmark for changed, pause for held) + optional label (e.g. "Calories up +N kcal/day", "More work added this week", "Daily steps raised to N", "A lighter week this week") + detail text. Rows built by buildDecisionRows (23-76).
- Footer (172-176): "{N} decisions across {M} weeks"
NAVIGATION: Route "CoachHeldHistory", registered in ProfileStack as `<Stack.Screen name="CoachHeldHistory" component={CoachHeldHistoryScreen} options={{ headerShown: false }}>` (RootNavigator.js:391). Reached from CoachOutputScreen's HeldDecisionsCard "See all weeks" (CoachOutputScreen.js:1762, navigation.navigate('CoachHeldHistory')). headerShown:false because the screen supplies its own BackHeader (106). Pushes nowhere itself.
GATING: Not directly guarded in RootNavigator (registered with the bare component, 391). However, its only entry point is the HeldDecisionsCard inside the Pro-gated CoachOutputScreen (CoachOutputScreen.js:1762), so it is effectively Pro-reachable only. **NOT DETERMINED IN CODE**: there is no explicit tier guard on this route itself, so any future non-Pro navigation to "CoachHeldHistory" would not be blocked at the route level.
CURRENT STRENGTHS:
- Reinforces the transparency moat: the full audit trail of coach decisions and non-decisions in one place.
- Clear visual distinction between "changed" (success-coloured) and "held" (muted) rows (152, 159, 245).
- Accessible: per-row accessibilityLabel composes label + detail (147); week label is accessibilityRole="header" (139).
- Filters to only weeks that actually have a decision or a hold (86-93), so empty weeks don't pad the list.
RtCURRENT WEAKNESSES:
- The `load()` filter at lines 88-91 omits cardio/deload-applied/macro/refeed/diet-break decisions from the "hasChanged" test (only calories, training signal, steps.change, deloadSuggested are checked), so a week whose only action was e.g. a cardio or refeed apply could be filtered out of the history if it had no held decisions. (Flagged, not in scope to fix.)
- Typo in the source: a stray "Rt" prefix appears before a style block is unaffected, but note line 100 region — actually the screen reads fine; the load catch silently sets loading false (97) with no error surface.
- buildDecisionRows uses `toLocaleString()` without an explicit 'en-GB' locale (52), unlike CoachOutputScreen which passes 'en-GB' (CoachOutputScreen.js:248).
NEWBIE QUESTION: Reasonably. The intro sentence sets expectations and rows are short. A newbie may not grasp "volume pulled back" or the embedded EngineLog's rep-regression entries, but the changed/held framing is understandable.
ATHLETE QUESTION: Yes. A longitudinal decision log is exactly what a data-driven competitor wants to audit the coach's behaviour over a block, and the EngineLog adds per-session adaptation detail.
LOCATION QUESTION: Yes. As a drill-down from the weekly coach card's "See all weeks", living in the Profile stack alongside CoachOutput is correct.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - BackHeader title fontSize.lg (17) semibold (BackHeader.js:59-66)
    - intro fontSize.sm (13) lineHeight 20 (192-196)
    - emptyTitle ...type.bodyStrong fontSize.md (16) (207-210); emptyBody fontSize.sm (13) (211-216)
    - weekLabel fontSize.xs (11) semibold (226-232)
    - decisionLabel ...type.label fontSize.sm (13) (240-244); decisionDetail fontSize.sm (13) (246-250)
    - footer ...type.num('caption') fontSize.xs (11) tabular (252-257)
  - Touch targets:
    - BackHeader back chevron: 24px icon with hitSlop {12,12,12,12} (BackHeader.js:25,40) → effective ≈ 48px. OK.
    - Decision rows are non-interactive (accessible but not pressable). EngineLog interactivity not in this file (**NOT DETERMINED IN CODE** — EngineLog component not read).
  - Information density: low-to-moderate; one block per week, generous gaps (content gap spacing.lg, 187).
  - Clean or cluttered: clean. Uniform week-block cards (218-225), consistent icon+text rows.
  - Most important action most prominent? The only interactive element is the back chevron; content is read-only, so the answer is N/A. The list is the point and it is the dominant element.
  - Small/standard/large behaviour: single ScrollView, content padding spacing.lg, paddingBottom spacing.xxxl (186-190). SafeAreaView edges top/left/right (105). All token/flex sizing; scales cleanly.

---

SCREEN: MethodologyScreen ("How Precision Coaching works")
WHAT IT IS: A static, offline, copy-only trust page explaining how the Precision Coaching engine makes decisions. Six sections (the intro always shown, plus five collapsible accordion sections); no data dependencies, no Supabase reads, renders identically for every user.
WHAT IS ON IT:
- Intro paragraph (always shown, 138; INTRO 30-33): "Every week, Precision Coaching reads your weight trend, your check-in and your training…"
- Five collapsible sections (140-148; SECTIONS 37-99), each a tappable header with chevron + body:
  1. "Why changes wait" (two-week cooldown + the rapid-loss safety exception)
  2. "How your steps inform the estimate" (steps only sharpen confidence, never add/remove calories)
  3. "Why holds happen"
  4. "Training signals" (volume −2..+3 sets/muscle/week)
  5. "Safety floors" (30 kcal/kg fat-free mass floor; fixed minimum kept qualitative)
  6. "What Precision Coaching cannot do" (no unseen food, only what you scored, suggestions until applied)
  (The first collapsible starts open, 123.)
- Credential note (150-153): "Built on published training and sports-medicine science. Every change has a reason. Every non-change has a reason too."
NAVIGATION: Route "Methodology", registered in ProfileStack as `<Stack.Screen name="Methodology" component={MethodologyScreen} options={{ title: 'How Precision Coaching works' }}>` (RootNavigator.js:389). Reached from CoachOutputScreen's WhyBlock (CoachOutputScreen.js:1722, source 'why_block'), from the held-decisions "See how Precision Coaching decides" link (1763, source 'held_decisions'), and per the header comment also from the You tab (MethodologyScreen.js:7). Fires a `methodology_opened` telemetry event with the source param (131). Pushes nowhere itself.
GATING: **NOT DETERMINED IN CODE** as Free vs Pro — the route is registered with the bare MethodologyScreen component (no withProGuard, RootNavigator.js:389) and the screen contains no tier guard (it reads only user?.id for telemetry, 129). It is reached from Pro coach surfaces but the comment (lines 7-8) says it is also reached "from the You tab", implying a non-gated trust page. As written it is ungated at the route level.
CURRENT STRENGTHS:
- Truthful-by-design: a FOUNDER COPY GATE comment (lines 11-19) ties every figure to the engine source lines (weeklyCoach.js:292, :169) and flags it as a living document.
- Pure/offline; renders identically for everyone, including under an ED-pattern flag (describes safety in general terms, names no individual state).
- Accordion keeps the page from reading as a wall of text; first section pre-opened (123).
- Accessibility: section headers are buttons with accessibilityState expanded + label (107-110).
CURRENT WEAKNESSES:
- Risk that copy drifts from the engine if weeklyCoach.js/nutritionEngine.js change and the copy isn't re-reviewed (the comment itself acknowledges this, 18-19) — a maintenance hazard, not a current bug.
- Long body paragraphs (e.g. the steps section, 52-59) in fontSize.sm could be dense on a small screen.
NEWBIE QUESTION: Yes. This is the most newbie-appropriate of the coaching screens — plain English, no numbers a beginner can't follow (one explicit figure, 30 kcal/kg, with context), and the accordion lets a newbie open only what they care about.
ATHLETE QUESTION: Yes, at the conceptual level. An athlete gets the rules and the published-science framing. It is intentionally qualitative on the absolute calorie floor (no 1,200/1,500 numbers, per the copy gate), so a competitor wanting exact thresholds won't find them here — that is a deliberate safety choice, not a gap.
LOCATION QUESTION: Yes. As a shared trust page reachable from the coach card, the held-decisions card and the You tab, registering it in ProfileStack (389) is the right home.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - intro fontSize.md (16) lineHeight 24 (162)
    - sectionTitle ...type.bodyStrong fontSize.md (16) (172)
    - sectionBody fontSize.sm (13) lineHeight 22 (173)
    - credentialNote fontSize.xs (11) lineHeight 18 (174-180)
  - Touch targets:
    - CollapsibleSection header: a TouchableOpacity wrapping the full row; the section has paddingVertical spacing.md (12) (169) and the header row holds a fontSize.md title + 18px chevron, so effective tap height ≈ 16 (text) + 24 (padding) ≈ ~40px. Marginally **< 44px**; no hitSlop added (104-114).
  - Information density: low. One intro + six rows; only the open section shows body text.
  - Clean or cluttered: clean. Uniform section cards (163-170), single accent (chevron).
  - Most important action most prominent? The interactions are the section toggles, all equal weight, which is appropriate for an accordion. No competing CTAs.
  - Small/standard/large behaviour: single ScrollView, content padding spacing.lg, gap spacing.md, paddingBottom spacing.xxxl (161). SafeAreaView edges 'bottom' only (136) — top handled by the stack header. Body text wraps; collapsed state keeps the page short on small screens. Scales with Larger-text.

---

SCREEN: CoachingRemindersScreen ("Coaching reminders")
WHAT IT IS: Pro settings page for the two non-optional Precision Coaching reminders (morning weight + weekly check-in) plus the optional missed-check-in follow-up. Exposes day/hour pickers; the two coaching reminders are always scheduled (toggles deliberately removed).
WHAT IS ON IT:
- Intro (265-267): "The coach uses these reminders to keep your data current. Pick a time and a day that fit your week. Both reminders run automatically."
- Permission-denied warning box (269-276): shown when notifications are disabled at OS level
- "Morning weight" section (279-301): card with scale icon, "Morning weight reminder" title, an Hour ChipRow (5-12), a "Notification at {hour}" line, and a helper paragraph about weighing cadence
- "Weekly check-in" section (304-338): card with pulse icon, title, a Day ChipRow (Sun-Sat), an Hour ChipRow (14-21), a "Reminder every {Day at hour}" line, an optional next-fire line ("Your next check-in will be {date}…"), and a helper paragraph (7-day minimum gap)
- "Check-in follow-up" section (341-362): card with a toggle Switch ("Follow up if a check-in slips by") + helper paragraph
- Inline "Saved" text (364) after a debounced save; also a toast on save
NAVIGATION: Route "CoachingReminders", registered in ProfileStack as `<Stack.Screen name="CoachingReminders" component={GatedCoachingReminders} options={{ title: 'Coaching reminders' }}>` (RootNavigator.js:398). Reached from Settings → "Coaching reminders" row (per the header comment, lines 12-13). Pushes nowhere itself.
GATING: Pro. `const GatedCoachingReminders = withProGuard(CoachingRemindersScreen, 'Coaching reminders')` (RootNavigator.js:155), registered as GatedCoachingReminders (398). The header comment confirms it is a "Pro-only row" (line 13).
CURRENT STRENGTHS:
- Design intent is sound: removing the on/off toggles for the two mandatory reminders prevents the user from breaking the coaching loop (header comment 4-9).
- Scoped cancellation: applyScheduled cancels ONLY the two notifications this screen owns, fixing the historic "wipe every scheduled notification" bug (78-87).
- Merge-writes the prefs blob so keys this screen doesn't own survive (96-108, 229-239); mirrors the missed-follow-up pref into the synced SQLite row (242-244).
- Debounced apply (400ms, 202-223) with both an inline "Saved" indicator and a toast; cleans up timers on unmount (196-199).
- Computes and shows the actual next fire date including the 7-day-minimum bump (257-260, 328-332).
- Permission-denied state surfaced clearly (269-276).
CURRENT WEAKNESSES:
- The `Switch` import is used only for the follow-up toggle; the two main reminders intentionally have no toggle, which is correct but can surprise a user expecting to turn them off.
- Chips are time/day values with no AM/PM column header beyond the helper line; a user must infer that the morning row is AM and the check-in row is PM from the chip ranges (HOURS_MORNING 5-12, HOURS_EVENING 14-21, 38-39).
- Minute is fixed at 0 for both reminders (state defaults 147,150; no minute picker), so the schedule line never shows non-zero minutes despite formatNextFire supporting them (73).
NEWBIE QUESTION: Yes. Plain language, clear "pick a day and time" model, helper paragraphs explain WHY (trend math needs ≥3 weigh-ins/week, 7-day gap). A newbie can set this up without confusion.
ATHLETE QUESTION: Yes. An experienced user gets full control of when the two data-collection prompts fire and an explicit next-fire date. The fixed-:00 minute is a minor limitation but unlikely to matter to a competitor.
LOCATION QUESTION: Yes. As a Pro coaching settings sub-page reached from Settings, living in ProfileStack (398) under "Coaching reminders" is correct.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - intro fontSize.sm (13) lineHeight 20 (373)
    - warningText fontSize.xs (11) (379)
    - sectionLabel fontSize.xs (11) semibold uppercase (380-384)
    - cardTitle ...type.bodyStrong fontSize.md (16) (397)
    - pickerLabel fontSize.xs (11) semibold (399-403)
    - chipText ...type.label fontSize.sm (13) (412)
    - scheduleText ...type.label fontSize.sm (13) primary (414-417)
    - scheduleSubText fontSize.xs (11) (418-421)
    - helperText fontSize.sm (13) lineHeight 18 (426)
    - savedText fontSize.xs (11) semibold (427-430)
  - Touch targets:
    - Chips: explicit height 36, minWidth 40 (405-410). **FLAGS < 44px** in height.
    - Follow-up Switch: native RN Switch (348-355), standard ~31px tall toggle — native control, not a custom button; effectively below 44 but a platform-standard target.
    - No back control in-file (the stack header supplies it; this screen uses SafeAreaView edges 'bottom', 263).
  - Information density: moderate. Three labelled cards in a scroll, each with one or two horizontal chip rows.
  - Clean or cluttered: clean. Consistent card token (surface2, 385-388), icon wraps 36px (393-396), horizontal ChipRows scroll independently (122).
  - Most important action most prominent? The chip selectors are the primary interaction and are clearly the focus of each card; there is no competing CTA, so yes.
  - Small/standard/large behaviour: outer ScrollView (264) with horizontal inner ChipRows (showsHorizontalScrollIndicator false, 122), so the hour/day chips scroll horizontally on narrow screens rather than wrapping/clipping — good small-screen behaviour. Chip height fixed at 36 (won't scale with Larger-text, though chipText does scale, risking text overflow within the fixed-height chip on the largest setting). Content padding spacing.lg, paddingBottom spacing.xxl (372).

---

SCREEN: SettingsCoachingScreen ("Coaching")
WHAT IT IS: The settings page for the levers that shape what the coach asks for and adjusts: a calmer-experience toggle (free), and (Pro) daily step target on/off + value, cardio on/off, coaching tone register, "show the science" toggle, plus a cycle-tracking toggle for users whose body profile records a female sex.
WHAT IS ON IT:
- "Calmer experience" SettingRow with Switch (113-126): "drops the aggressive calorie targets and quietens the progress prompts" (free, always shown)
- Pro-only block (`tier === 'pro'`, 127-234):
  - "Daily step target" SettingRow + Switch (129-144), sub copy changes with state
  - When steps on: "Steps a day" labelled TextInput row (145-160), number-pad, clamps 1000-30000 on blur (90-100)
  - "Cardio" SettingRow + Switch (161-179), sub copy changes with state
  - "Coaching tone" block (183-213): label + dynamic sub + three chips (Automatic / Supportive / Precise)
  - "Show the science" SettingRow + Switch (217-232)
- "Cycle tracking" SettingRow + Switch (235-250): only when bioSex === 'female'
NAVIGATION: Route "SettingsCoaching", registered in ProfileStack as `<Stack.Screen name="SettingsCoaching" component={SettingsCoachingScreen} options={{ title: 'Coaching' }}>` (RootNavigator.js:376). Reached from the Settings landing page. Note: it is registered WITHOUT a Pro guard (bare component, 376) — gating is internal to the screen (see GATING). Pushes nowhere itself.
GATING: Mixed / internal. The route is not withProGuard-wrapped (RootNavigator.js:376). Gating is done inside the screen via `tier` from useAppStore (17-24): the "Calmer experience" toggle is free (always rendered, 113), while step target, cardio, coaching tone and "show the science" are inside `{tier === 'pro' && (...)}` (127). Cycle tracking is gated on body-profile sex, not tier (`bioSex === 'female'`, 235). Free users therefore see only the Calmer-experience row (and cycle tracking if female).
CURRENT STRENGTHS:
- Per-feature gating is explicit and correct: Pro levers (steps/cardio/tone/science) sit behind `tier === 'pro'`, matching the FREE vs PRO rules; the free Calmer-experience toggle is exposed to everyone.
- Step target input is clamped to a sane band (1000-30000) and never lets an empty/junk value through (90-100).
- Turning steps on triggers the health step-permission request at the right moment, silent if declined (79-85).
- Coaching tone and "show the science" are documented as local-only profile fields that survive sync (comment 35-40), with haptic feedback on change (42, 50, 57, 64, 70).
- useFocusEffect re-reads wellbeing mode, cycle tracking and bio-sex on focus (102-108), so the page reflects external changes.
CURRENT WEAKNESSES:
- "Cardio" and "Calmer experience" both use the same `heart-outline` icon (114, 163), which is visually ambiguous when both are visible to a Pro user.
- The cardio toggle's onValueChange is an inline async arrow (171-174) while the other toggles use named handlers — minor inconsistency.
- No explicit indication to free users that the hidden Pro levers exist (the block simply doesn't render), so a free user has no discoverability of step/cardio/tone settings (this may be intentional).
NEWBIE QUESTION: Mostly. The toggles have descriptive sub-copy that explains the effect in plain terms ("Steps are the coach's first lever when progress slows, before your food"). "Coaching tone" and "Show the science" are self-explanatory via their sub-text. A newbie can operate it, though the meaning of "calmer experience / aggressive calorie targets" assumes some context.
ATHLETE QUESTION: Yes. An experienced user gets the meaningful levers: step target value, cardio enable, tone register (Precise = numbers-first), and a science layer that adds technical terms. These are exactly the personalisation knobs a serious user expects.
LOCATION QUESTION: Yes. As a Settings sub-page in the Profile stack (376) reached from the Settings landing, this is the correct home for coaching preferences.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - SettingRow label ...type.body fontSize.md (16) (SettingsPrimitives.js:97); sub fontSize.xs (11) lineHeight 16 (SettingsPrimitives.js:98)
    - toneLabel ...type.body fontSize.md (16) (265); toneSub ...type.caption fontSize.xs (11) (266); toneChipText ...type.caption fontSize.xs (11) (279)
    - stepTargetLabel ...type.body fontSize.md (16) (290); stepTargetInput ...type.body fontSize.md (16) (291-302)
  - Touch targets:
    - SettingRow: padding spacing.lg (16) all sides (SettingsPrimitives.js:84) → row height comfortably ≥ 44px (16+16 + 16px label ≈ ~48px+). OK.
    - toneChip: paddingVertical spacing.sm (8) + minHeight 40 (268-277). **FLAGS < 44px** (minHeight 40).
    - stepTargetInput: paddingVertical spacing.sm (8) + fontSize.md → ~32px tall. **FLAGS < 44px** as a tap target (291-302), though it is a text field rather than a button.
    - Switches: native RN Switch controls (~31px), platform-standard.
  - Information density: low-to-moderate. A single bordered section containing a handful of rows; Pro users see ~6 rows + the tone chips, free users see 1-2.
  - Clean or cluttered: clean. Uses the shared SettingsPage/SettingRow primitives so it matches every other settings sub-page; the tone chips are the only bespoke element.
  - Most important action most prominent? There is no single "primary" action — it is a preferences page of equal-weight toggles, which is appropriate. The tone chips are visually distinct (selectable, primary border when on, 278) which correctly signals their multi-choice nature.
  - Small/standard/large behaviour: rendered inside SettingsPage (a SafeAreaView edges 'bottom' + ScrollView, SettingsPrimitives.js:53-59), content padding spacing.lg, paddingBottom spacing.xxl. Rows are flex; tone chips use flex:1 so they share width evenly (269). toneChip minHeight 40 is fixed (won't grow), so on the largest text setting the fontSize.xs chip text scales but the chip height does not — a minor overflow risk. Otherwise scales cleanly.


<!-- ==== phase1/05-checkin-safety.md ==== -->

# Phase 1 inventory — Check-in & safety screens (2026-06-13)

Scope: five screens read in full. Per the brief this describes what each screen
shows; it does not evaluate the ED-safety mechanism itself.

Resolved theme tokens used below (from `src/styles/theme.js`, dark defaults):
fontSize.micro (10, theme.js:257), xs (11, theme.js:258), sm (13, theme.js:259),
md (16, theme.js:262), lg (17, theme.js:263), xl (20, theme.js:264),
xxl (24, theme.js:265), xxxl (32, theme.js:266). Type roles (theme.js:373–410):
type.caption => fontSize.xs (11, theme.js:407); type.label => fontSize.sm
(13, theme.js:403); type.body / type.bodyStrong => fontSize.md (16, theme.js:395/399);
type.title => fontSize.lg (17, theme.js:391); type.h3 => fontSize.xl (20,
theme.js:387); type.h2 => fontSize.xxl (24, theme.js:383). spacing scale
theme.js:228–239 (xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48).

---

```
SCREEN: WeeklyCheckIn
WHAT IT IS: The weekly Precision Coaching check-in. A four-step wizard (or a
  condensed "fast" card) that gathers how the user is feeling, how the week went
  against targets, recovery/issues, and training performance, then saves a
  weekly check-in and routes to the coach output. (WeeklyCheckInScreen.js:219,
  :577 saveWeeklyCheckin, :640 navigate to CoachOutput.)
WHAT IS ON IT:
  Gate states resolved before the form (gateState, :233; logic :499–519):
  - loading: skeleton cards (heights 72/160/120) (:1159–1168).
  - wrong_day: header with chevron-back + title "Weekly check-in" (:1182); card
    with calendar-outline icon (40px), title "Come back on {dayName}" (:1188),
    two body paragraphs explaining the weekly rhythm and pointing to Settings →
    Coaching reminders + logging weight from the Train tab (:1189–1194); "Got it"
    button (:1197).
  - too_soon: chevron-back; time-outline icon (32px) in a circular wrap; title
    "First check-in needs more data" (:1217); body citing FIRST_CHECKIN_MIN_DAYS
    and days left, the next landing date and chosen day name (:1218–1222);
    "Got it" button (:1223).
  - need_weights: chevron-back; scale-outline icon (32px, warning colour);
    title "A few more weight readings needed" (:1245); body with readings logged,
    MIN_WEIGH_INS requirement, an explanation of body-weight noise, and how many
    more to log (:1246–1252); "Log my weight first" button (:1254); a secondary
    "Check in anyway" defer button that opens the form (:1256–1258).
  - load_error: chevron-back; cloud-offline-outline icon (32px, warning);
    title "Couldn't load your week" (:1276); body (:1277); "Try again" button
    that re-runs the loader (:1280–1287).
  Main form chrome:
  - Header bar: chevron-back (doubles as previous-step) (:1303–1311); centre
    title "Weekly check-in" (:1317); either a "Quick check-in" tag (:1319) or a
    StepBar of 4 dots (:1320); right spacer.
  - Week-range label, e.g. "Mon 8 Jun – Sun 14 Jun" (:1345, formatWeekRange :51).
  - "Already checked in this week" row with success tick + edit/resubmit note,
    shown when re-entering (:1347–1354).
  Wizard step 0 "How are you feeling?" (renderStep0, :678):
  - Heading + subtitle (:681–682).
  - "Energy and motivation this week": 5 chips Low/Below normal/Normal/Good/High
    (values 1–5) (:685–696).
  - "Stress level this week" with hint "Work, life, family, anything outside the
    gym": 5 chips Low/Mild/Moderate/High/Very high (:700–711).
  - "Average sleep hours" (hint "Optional"): numeric text input, placeholder
    "7.5", maxLength 4 (:715–726).
  Wizard step 1 "This week's data" (renderStep1, :732):
  - Heading + subtitle (:735–736).
  - "Morning weight trend" (read-only): tick + "{n} days logged · trend {weight}"
    or a "no morning weights" note; "Not yet today" tag if not logged today
    (:739–763).
  - Cycle question (only when shouldShowCycleQuestion true): hint paragraph; two
    options "Affecting the scale" / "Not this week" (:769–785).
  - Nutrition adherence: if a kcal target exists, an auto-derived diary summary
    ("{x} of 7 days logged, averaging {y} kcal against your {z} target (under/on/
    over target)") and three options Hit it / Off target / Didn't track
    (:788–817); if no target, a tappable note routing to NutritionTargets
    (:818–826).
  - Steps (when stepsEnabled !== false): either an auto row "Averaged {n} a day.
    Tap to override." with a target verdict line, or a manual "Average steps a
    day" numeric input; a "No step target set" note when no target (:831–889).
  - Cardio (when a cardio prescription exists): "Prescribed cardio" with three
    options Did it / Mostly / Not this week (:894–906).
  Wizard step 2 "Recovery and issues" (renderStep2, :912):
  - "Overall muscle soreness this week": 5 chips None/Mild/Moderate/High/Very
    high (:919–930).
  - "Which muscles?" (only when soreness >= 2): a wrap grid of 10 muscle chips
    Chest…Core (:933–964).
  - "Any joint or tendon pain?": No / Yes options (:966–976).
  - "Anything else to flag?": multiline notes input, maxLength 280, with a
    char-count "{n}/280" (:978–992).
  Wizard step 3 "Training performance" (renderStep3, :998):
  - Heading + subtitle (pre-filled vs not) (:1001–1006).
  - Auto-derived sessions/PRs/volume-delta note, or a "no sessions logged" note
    (:1010–1028).
  - 4 perf cards with icons: "Beat my targets"/"Hit targets as planned"/
    "Struggled to hit targets"/"Performance dropped" (:1029–1058).
  Fast check-in card (renderFastCheckIn, :1071) shown when fastEligible:
  - Heading "Quick check-in" + subtitle (:1109–1112).
  - Summary card listing the auto-read rows (Training, Nutrition, Steps, Cardio,
    Weight) each with icon, label, value and a success tick (:1114–1123).
  - "Energy and motivation this week" 5 chips (:1126–1137).
  - "Overall muscle soreness this week" 5 chips (:1140–1153).
  CTA area (:1367):
  - Fast: "See this week's coaching" submit button (:1369–1385).
  - Wizard non-final: "Next" button + arrow icon (:1386–1404).
  - Wizard final: "See this week's coaching" submit button (:1406–1422).
  - "Add more detail" expand link from fast card into the wizard (:1427–1437).
  - Inline hint text when the current step can't advance (:1439–1447).
  Post-submit: schedules the next check-in reminder + weekly "coach ready"
  notification (:613–633), re-lays missed-check-in followups (:638), and may show
  an appAlert offering daily weight reminders before routing to CoachOutput
  (:642–660).
NAVIGATION: Route "WeeklyCheckIn", registered in ProfileStack (RootNavigator.js:387;
  ProfileStack function begins :364, its Stack.Navigator :370). headerShown:false.
  Component is GatedWeeklyCheckIn = withProGuard(WeeklyCheckInScreen, 'Weekly
  check-in') (RootNavigator.js:149). Reached from the You tab card
  (YouScreen.js:122 navigation.navigate('WeeklyCheckIn')). On submit it navigates
  to 'CoachOutput' with weekStart (WeeklyCheckInScreen.js:640). Gate "Got it"/back
  buttons call navigation.goBack(). The NutritionTargets link (:821) and the
  expand-to-wizard control stay in-screen.
GATING: Pro. Gated by withProGuard at RootNavigator.js:149 (withProGuard checks
  useAppStore(s=>s.tier) !== 'pro', ProGate.js:134–139). Consistent with CLAUDE.md
  free/Pro list (Precision Coaching adjustments are Pro).
CURRENT STRENGTHS: Auto-derivation pre-fills training, calories, steps and cardio
  from logged data so most weeks become a two-tap confirmation (fast card,
  :1071); gates fail closed on a load error rather than opening the form against
  missing data (:520–527 comment + load_error state); re-entry prefills saved
  answers for editing (:460–490); inputs carry accessibility roles/labels/state
  throughout; weekly range and "already checked in" state are clearly surfaced.
CURRENT WEAKNESSES: Very large file (1749 lines) carrying five gate screens, a
  four-step wizard and a fast card in one component; step 1 ("This week's data")
  can stack many sections (weight, cycle, nutrition, steps, cardio) into a long
  scroll; several inline IIFEs and long ternaries render copy (e.g. :850–862,
  :792–806) which is dense. The derived-note paragraphs are long and italicised
  (autoDerivedNote, :1628).
NEWBIE QUESTION: Mostly yes for the fast card (confirm two ratings). The full
  wizard introduces jargon a first-timer may not parse without thought —
  "working sets", "training volume up X% on last week", "deload"-adjacent
  framing, "prescribed cardio" — though most questions have plain-language hints.
ATHLETE QUESTION: Largely yes — it captures energy, stress, sleep, soreness by
  muscle, joint/tendon pain, cycle, calorie/step/cardio adherence and a training
  verdict derived from real sessions/PRs/volume, which an experienced competitor
  would recognise as a proper weekly readiness check.
LOCATION QUESTION: Reasonable — it lives off the You tab (YouScreen.js:122) and is
  the entry point to CoachOutput, matching the weekly coaching rhythm. NOT a
  judgement on whether the safety mechanism is correct.
VISUAL + USABILITY:
  - Header title: styles.headerTitle fontSize.md (16) bold (:1523–1527).
  - StepBar dots: 20x4px, radius 2 (:1531–1533).
  - Week label: type.label => fontSize.sm (13) primary colour (:1545–1548).
  - alreadyInText: fontSize.sm (13) (:1557).
  - stepHeading: type.h3 => fontSize.xl (20) (:1558–1562).
  - stepSubtitle: fontSize.sm (13) lineHeight 20 (:1563–1568).
  - sectionLabel: type.label => fontSize.sm (13) (:1572–1575); sectionHint:
    type.caption => fontSize.xs (11) (:1576–1579).
  - chipValue: fontSize.md (16) bold; chipLabel: fontSize.xs (11) (:1590–1593).
  - optionBtnText: type.label => fontSize.sm (13) (:1604).
  - weightSummaryText: fontSize.sm (13) (:1613); weightSummaryMissed:
    type.caption => fontSize.xs (11) (:1614).
  - skipNote / skipNoteTappable: fontSize.sm (13) (:1617, :1623).
  - autoDerivedNote: type.caption => fontSize.xs (11), italic (:1628–1633).
  - shortInput text: fontSize.lg (17) (:1639); notesInput: fontSize.md (16),
    minHeight 88 (:1654–1655); charCount: type.num('caption') => fontSize.xs (11)
    (:1657).
  - perfCardText: type.label => fontSize.sm (13) (:1667).
  - ctaBtnText: fontSize.md (16) bold (:1677); ctaHint: fontSize.sm (13) (:1679).
  - fast card: headerQuickTag fontSize.xs (11) (:1682); fastSummaryLabel /
    fastSummaryValue fontSize.sm (13) (:1699–1700); fastExpandText fontSize.sm
    (13) (:1702).
  - ritualIntroTitle: fontSize.xl (20) black (:1738–1743); ritualIntroSub
    fontSize.sm (13) (:1744–1748).
  - muscleChipText: fontSize.sm (13) (:1730).
  Touch targets: chips minHeight 52 (:1583); optionBtn minHeight 48 (:1597);
  ctaBtn height 52 (:1674); gateBtn paddingVertical spacing.lg=16 (:1500, text
  centred). All >= 44px. backBtn width 32 but has hitSlop top/bottom/left/right
  12 (:1306) → effective target >= 44. Muscle chips: paddingVertical spacing.xs=4
  + fontSize.sm text (:1718–1719) — likely under 44px tall (FLAG <44px). Steps
  auto row and weight summary rows use paddingVertical spacing.md=12 around a row
  of text/icon — comfortable.
  Information density: high on the wizard (especially step 1); the fast card is
  light. Multiple long italic derived-note paragraphs add reading load.
  Clean/cluttered: generally clean and tokenised; step 1 can become a long stack.
  Most important action prominent: yes — the full-width primary CTA ("Next" /
  "See this week's coaching") is the dominant element (:1671–1675).
  Small/standard/large behaviour: whole form is inside a ScrollView within a
  KeyboardAvoidingView (:1325, :1330), so it scrolls on small screens. shortInput
  has fixed width:120 (:1640). Font tokens scale via the larger-text setting
  (theme.js:325–337). No hard-coded heights that would clip content.
```

---

```
SCREEN: WellbeingCheck
WHAT IT IS: A five-question SCOFF-style self-screen about the user's relationship
  with food/eating. Stores a score locally and on the body profile; a score >= 2
  shows a supportive signposting alert. (WellbeingCheckScreen.js:22, :46 handleSave.)
WHAT IS ON IT:
  - Intro paragraph explaining the five questions are private, device-only, and
    shape how coaching is approached (:76–78).
  - Five question cards, each with the question text and a Yes / No button pair
    (SCOFF_QUESTIONS :12–18; rendered :81–108).
  - "Save answers" primary button (Button component, size "lg"), disabled until
    all five answered, with a loading state (:110–116; allAnswered :38).
  - Privacy footnote: "Your answers are stored on this device and never shared
    without your permission." (:118–120).
  - On save with score >= 2, an appAlert "Thank you for sharing that" with
    GP/dietitian signposting copy and a "Got it" button that pops back
    (:56–61). Score < 2 simply goes back (:62–63).
WHAT IT STORES: answers persisted to AsyncStorage key '@volyume_scoff_answers'
  (:20, :51); scoffScore (count of true answers, :50) saved to the local profile
  via saveLocalProfile and to the body profile via saveUserBodyProfile (:52–55).
  Answers reload on focus (:27–36).
NAVIGATION: Route "WellbeingCheck", registered in ProfileStack
  (RootNavigator.js:399), options { title: 'Wellbeing check' } (so it shows the
  default stack header, no custom in-screen header). Reached from the You tab
  (YouScreen.js:176 navigation.navigate('WellbeingCheck')). Exits via
  navigation.goBack() on save / alert dismiss (:60, :63, :66).
GATING: NOT DETERMINED IN CODE as Pro-gated. The Stack.Screen at
  RootNavigator.js:399 wraps WellbeingCheckScreen directly with no withProGuard
  and no ProGate; the screen itself contains no tier guard. It sits in
  ProfileStack (the You tab) which is reachable by all tiers. (CLAUDE.md does not
  list a wellbeing/SCOFF screen under either free or Pro.)
CURRENT STRENGTHS: Calm, non-clinical framing; explicit, repeated privacy
  assurance (intro + footnote); save disabled until complete; Yes/No buttons
  carry accessibility roles/labels/selected state (:89–91, :99–101); supportive
  rather than alarming signposting copy on a raised score.
CURRENT WEAKNESSES: No in-screen title/explanation of WHAT this screen is beyond
  "five questions about your relationship with food" — relies on the stack header
  title "Wellbeing check"; no visible scoring or result shown to the user (only a
  conditional alert); a duplicated blank line in styles (:175–176) is cosmetic
  dead space.
NEWBIE QUESTION: Yes — plain Yes/No questions in clear English, with an intro
  that sets expectations and reassures on privacy. A newbie can complete it
  without gym knowledge.
ATHLETE QUESTION: Adequate but minimal — an experienced competitor would
  recognise it as a wellbeing/ED screener; it offers no detail on how the score
  feeds coaching beyond the intro line "help shape how your coaching is
  approached" (:77).
LOCATION QUESTION: Reasonable as a You-tab self-check (YouScreen.js:176). NOT a
  judgement on the safety mechanism.
VISUAL + USABILITY:
  - intro: fontSize.sm (13) lineHeight 22 (:130–134).
  - question: fontSize.sm (13) lineHeight 22, textPrimary (:147–151).
  - btnText: type.label => fontSize.sm (13), textMuted; selected -> primary
    (:168–174).
  - privacy: fontSize.xs (11) lineHeight 18, centred (:177–182).
  - "Save answers" uses the shared Button component size "lg" (sizing defined in
    components/Button, NOT in this file → NOT DETERMINED IN CODE here).
  Touch targets: Yes/No btn paddingVertical spacing.md=12 around fontSize.sm (13)
  text → approx 12+12+~18 ≈ 42px tall (BORDERLINE / likely just under 44px; FLAG).
  Buttons are flex:1 so horizontally wide. Question cards padding spacing.lg=16
  (:138–145).
  Information density: low — five spaced cards in a list (gap spacing.lg=16,
  :136). Clean, not cluttered.
  Most important action prominent: yes — the full-width "Save answers" button is
  the clear primary action.
  Small/standard/large behaviour: content is in a ScrollView (:74) so it scrolls;
  paddingBottom spacing.xxxl=48 (:128). No fixed heights; font tokens scale with
  larger-text. SafeAreaView edges only 'bottom' (:73) — relies on the stack
  header for the top inset.
```

---

```
SCREEN: BlockReflection
WHAT IT IS: An end-of-mesocycle "Block summary": stats, an auto-generated
  narrative, PRs set, the best session, and a prompt to start the next block.
  (BlockReflectionScreen.js:77; data from getBlockReflectionData :85.)
WHAT IS ON IT:
  - BackHeader titled "Block summary" with an optional right-side play-circle
    button that opens a "RecapStory" (variant 'block') (:95–108).
  - Loading: three skeleton cards (heights 100/160/140) (:111–117).
  - Empty state (no data): calendar-outline icon, "No data found", "This block
    doesn't have any logged sessions yet." (:119–125).
  - Block title + dates: block name (header role), date range and planned weeks
    (e.g. "8 Jun 2026 – 5 Jul 2026 · 4 weeks") (:130–139, fmtDate :16).
  - 4-stat row (StatBlock :22): Sessions, Sets, Volume (kg), and Avg session
    (minutes, only when avgDuration > 0) (:142–153).
  - Narrative card: 1–6 generated lines about sessions, working sets + tonnage,
    average session length, week-to-week volume trend, top exercise, or a
    fallback "Block '{name}' is complete." (buildNarrative :32–69; rendered
    :156–160).
  - "Records set this block" section (only if PRs exist): trophy icon + per-PR
    rows showing exercise name, PR type label (Est. 1RM / Heaviest set / Most
    reps) and value with units (:163–179, PR_TYPE_LABELS :71–75).
  - "Best session" card (only if best-session volume > 0): flash icon, "Best
    session", its date and volume in kg (:182–193).
  - "What's next" section: recovery advice copy and a "Start a new block" link
    that goes back then navigates to MesocycleBuilder after a 300ms delay
    (:196–214).
  - "Done" button at the foot, goBack (:218–220).
NAVIGATION: Route "BlockReflection", registered in ProfileStack
  (RootNavigator.js:392), headerShown:false (the screen draws its own
  BackHeader). Reached from MesocycleBuilderScreen.js:239
  (navigation.navigate('BlockReflection', { mesocycleId: meso.id })). Leads to:
  'RecapStory' (play button, :100), back-then-'MesocycleBuilder' (start new block,
  :204–205), and goBack via BackHeader / "Done" (:218).
GATING: NOT DETERMINED IN CODE as Pro-gated. Stack.Screen at RootNavigator.js:392
  wraps BlockReflectionScreen directly — no withProGuard, no ProGate, and no tier
  check in the screen body. (Mesocycles/training blocks relate to the free
  training builder per CLAUDE.md, but no explicit gate is present in this code.)
CURRENT STRENGTHS: Clear hierarchy (title → stats → narrative → records → best
  session → next step); resilient to missing data (empty state, conditional
  sections, fmtDate guards :17, narrative fallback :64–66); a celebratory tone
  with PRs and best session; tabular-num styling on numeric values keeps figures
  aligned (prValue/bestSession use type.num).
CURRENT WEAKNESSES: The "Start a new block" 300ms setTimeout navigation
  (:204–206) is a timing hack that could feel laggy or race on a slow device;
  units are appended raw (pr.value + units, :175) without spacing logic here; the
  narrative is a stack of plain lines with no visual emphasis on standout numbers.
NEWBIE QUESTION: Mostly yes — "Sessions/Sets/Volume", the plain-English narrative
  and "Start a new block" are approachable. "Est. 1RM", "tonnage"/"working sets"
  and "deload" (narrative :54) are terms a first-timer may not know.
ATHLETE QUESTION: Yes — sessions, working sets, tonnage, week-to-week volume
  trend, PRs by type and best session are exactly the block-review metrics an
  experienced lifter expects.
LOCATION QUESTION: Sensible — reached from the Mesocycle builder at block end
  (MesocycleBuilderScreen.js:239) and routes onward to building the next block.
VISUAL + USABILITY:
  - blockName: fontSize.xxl (24) black (:241); blockDates: fontSize.sm (13)
    (:242).
  - statValue: fontSize.lg (17) black; statLabel: type.caption => fontSize.xs
    (11) (:254–255).
  - narrativeLine: fontSize.md (16) lineHeight 23 (:262).
  - sectionTitle: type.label => fontSize.sm (13) (:270).
  - prExercise: type.label => fontSize.sm (13); prType: type.caption =>
    fontSize.xs (11); prValue: type.num('bodyStrong') => fontSize.md (16)
    (:278–280).
  - bestSessionLabel: type.label => fontSize.sm (13); bestSessionDate:
    type.num('caption') => fontSize.xs (11); bestSessionVolume: type.num('title')
    => fontSize.lg (17) (:293–295).
  - nextTitle: type.bodyStrong => fontSize.md (16); nextBody: fontSize.sm (13)
    lineHeight 21; newBlockBtnText: type.label => fontSize.sm (13) (:302–303,
    :310).
  - emptyTitle: type.bodyStrong => fontSize.md (16); emptyBody: fontSize.sm (13)
    (:237–238).
  - doneBtnText: type.title => fontSize.lg (17) (:318).
  Touch targets: BackHeader right play button has hitSlop 10 all sides around a
  24px icon (:101–102) → ~44px (borderline-OK). newBlockBtn paddingVertical
  spacing.sm=8 around fontSize.sm text (:308) → likely under 44px tall (FLAG
  <44px). doneBtn paddingVertical spacing.lg=16 → comfortable (:315). Stat blocks
  are display-only (not interactive).
  Information density: medium — several stacked cards, but each is well spaced
  (content gap spacing.lg=16, :230).
  Clean/cluttered: clean; consistent card surfaces and tokens.
  Most important action prominent: arguably split — the "Start a new block" link
  (:201) is the forward action but is a low-emphasis text link, while the more
  prominent footer button is "Done" (goBack, :218). The most visually prominent
  control is the dismissive one, not the progression one.
  Small/standard/large behaviour: everything is in a ScrollView (:110),
  paddingBottom spacing.xxxl=48 (:230); statsRow is a flex row of 3–4 equal stat
  blocks (flex:1, :251) so it adapts to width; no fixed heights besides skeleton
  placeholders; font tokens scale with larger-text.
```

---

```
SCREEN: GoalLockConsent
WHAT IT IS: A consent screen shown when the user picks an aggressive-cut goal
  (competition / advanced recomp). The user confirms whether they are experienced
  (raises the ED-pattern detector threshold) or want standard safety checks.
  (GoalLockConsentScreen.js:32; header docblock :11–31; save :52.)
WHAT IS ON IT:
  - Title "A note about aggressive cuts" (:76).
  - Body paragraph stating Volyume can support aggressive cuts but has safety
    checks that hold a cut "when your body is telling us something's wrong"
    (:77–79).
  - Field label "Confirm one of these" (:81).
  - A radiogroup of two radio option cards (:83):
      * "advanced" — "I have prior experience managing aggressive cuts safely, or
        I'm working with a coach." (:84–96).
      * "standard" — "I'm new to this and want Volyume's standard safety checks to
        apply." (:98–110).
    Each card has a custom radio circle with a filled dot when selected (:90–92,
    :104–106).
  - Info note with an information-circle icon: "You can change this any time from
    You → Goal lock." (:113–118).
  - Primary CTA reading "Save" in edit mode or "Continue" otherwise; disabled
    until a choice is made (:120–129).
  Behaviour: in edit mode the current value is loaded as the default
  (getGoalLockAdvanced, :40–50). On save it writes setGoalLockAdvanced and records
  engine telemetry (goal_lock_set / goal_lock_cleared with source onboarding vs
  you_tab_edit) (:52–67), then either calls route.params.onContinue(advanced) or
  navigation.goBack().
NAVIGATION: Route "GoalLockConsent" is registered TWICE: in ProfileStack
  (RootNavigator.js:395, options { title: 'Goal lock' }) and in ProOnboardingStack
  (RootNavigator.js:513, options { headerShown: true, title: 'Goal lock' }). In
  both cases the screen uses the default stack header (it draws no in-screen
  header). Reached from the You tab as an edit surface (YouScreen.js:146,
  navigation.navigate('GoalLockConsent', { editMode: true })) and, per the
  docblock + onContinue param, from ProOnboarding step 3 (:25–27, :510–513). Exits
  via onContinue(advanced) or navigation.goBack() (:63–66).
GATING: NOT DETERMINED IN CODE as withProGuard-wrapped. Neither Stack.Screen
  registration (RootNavigator.js:395, :513) uses withProGuard/ProGate, and the
  screen body has no tier check. Contextually it is part of the Pro onboarding /
  Pro goal flow (docblock :13–14, ProOnboardingStack), but no explicit code-level
  Pro guard is present on this route.
CURRENT STRENGTHS: Plain, non-judgemental copy; a proper accessible radiogroup
  with radio roles + selected state (:83–106); CTA disabled until a choice is
  made (:123); a clear "you can change this later" note (:115–117); edit mode
  pre-loads the current setting so it isn't a blind re-pick (:40–50).
CURRENT WEAKNESSES: The screen does not state WHAT each choice changes (the
  detector-threshold difference lives only in the code docblock, :19–24), so the
  user consents without seeing the concrete effect; the two option cards are
  visually identical apart from the text, so the "default/recommended" standard
  option isn't signposted; the info note icon is small (14px, :114).
NEWBIE QUESTION: Mostly yes for the words ("new to this and want standard safety
  checks" is clear), but a newbie cannot tell what materially differs between the
  options because the effect isn't described on screen.
ATHLETE QUESTION: Partly — an experienced competitor understands the intent, but
  may want to know precisely what "prior experience" unlocks; the screen doesn't
  quantify it.
LOCATION QUESTION: Appropriate in both places — inside Pro onboarding when an
  aggressive-cut goal is chosen (:510–513) and as a You-tab edit surface
  (YouScreen.js:146). NOT a judgement on the safety mechanism.
VISUAL + USABILITY:
  - title: type.h2 => fontSize.xxl (24) bold (:138–143).
  - body: fontSize.md (16) lineHeight 22 (:144–149).
  - fieldLabel: fontSize.xs (11) uppercase, semibold, letterSpacing 0.5
    (:150–158).
  - optionText: fontSize.sm (13) lineHeight 20 (:172–177).
  - noteText: type.caption => fontSize.xs (11) (:198).
  - ctaText: type.bodyStrong => fontSize.md (16) (:207).
  Touch targets: option cards padding spacing.lg=16 around multi-line text
  (:163) → tall, comfortable. Radio circle is 22x22 but the whole Pressable card
  is the tap target. CTA paddingVertical spacing.md=12 around fontSize.md text
  (:200–202) → approx 12+12+~21 ≈ 45px (OK, ~>=44). No hitSlop on the CTA but the
  card-sized targets are large.
  Information density: low — title, one paragraph, two option cards, a note and a
  button. Clean.
  Most important action prominent: yes — the full-width amber CTA is the clear
  primary; option cards only outline in primary when active (:169–171).
  Small/standard/large behaviour: content in a ScrollView (:75) with
  paddingBottom spacing.xxxl=48 (:137); no fixed heights; radio sizes are fixed
  px (22/10) but small; font tokens scale with larger-text. SafeAreaView edges
  'top','left','right' (:74), relying on the stack header for chrome.
```

---

```
SCREEN: GoalChangeSummary
WHAT IT IS: A confirmation/summary shown after the user changes their coaching
  goal: a diff of what changed (training goal, phase, calories, macros, protein
  approach) with plain-language reasons, and a "what happens next" list.
  (GoalChangeSummaryScreen.js:126; reasoning helpers :11–71.)
WHAT IS ON IT:
  - Header: centre title "Here's what changed" with a close (X) button at right
    that calls handleDone (popToTop / goBack) (:166–172, :155–162).
  - Hero card: success tick (28px), "Goals updated", and a body that either
    summarises that targets were updated or says "Nothing meaningful changed."
    depending on anyChanged (:175–185).
  - "Training" section (only if goal or phase changed):
      * "Physique goal" ChangeCard with prev→next labels and a reason (:190–198).
      * "Training phase" ChangeCard with prev→next labels and a reason (:199–207).
  - "Nutrition" section (only if kcal/macros/approach changed):
      * "Daily calories" ChangeCard prev→next kcal with a reason (:215–223).
      * "Daily macros" card with MacroRow rows for Protein/Carbs/Fat showing
        prev→next and a signed delta, or an "unchanged" value; a note when macros
        didn't meaningfully change (:225–238, MacroRow :99–122).
      * "Protein approach" ChangeCard prev→next labels + reason (:240–248).
  - "What happens next" section (nextCard): bulleted lines — whether a fresh plan
    was rerolled or not (:256–260), that You-tab nutrition targets now reflect the
    numbers (:264–266), and (only if next.phase === 'cut') a diet-break note for
    deficits beyond eight weeks (:268–275).
  - "Got it" primary button at the foot, handleDone (:278–280).
  Reasoning text is generated by buildPhaseReason/buildGoalReason/buildKcalReason/
  buildProteinApproachReason (:11–71); change detection thresholds: kcal >= 50,
  macros >= 1g (:135, :143–146).
NAVIGATION: Route "GoalChangeSummary", registered in ProfileStack
  (RootNavigator.js:394), headerShown:false (draws its own header :166). Reached
  via navigation.replace('GoalChangeSummary', {...}) from
  ProGoalSetupScreen.js:303 (so it replaces the goal-setup screen on the stack).
  Exits via handleDone -> navigation.popToTop() (preferred) or goBack()
  (:155–162); both the X and "Got it" call it.
GATING: NOT DETERMINED IN CODE as withProGuard-wrapped. Stack.Screen at
  RootNavigator.js:394 wraps GoalChangeSummaryScreen directly (no withProGuard /
  ProGate), and the screen body has no tier check. It is reached from
  ProGoalSetupScreen (the Pro goal flow) but carries no explicit code-level Pro
  guard on this route.
CURRENT STRENGTHS: Strong "show the diff + explain why" pattern — every change
  carries a plain-language reason and a struck-through prev → highlighted next
  (:86–90, :320–322); reasons are direction-aware (e.g. calories up vs down copy,
  :52–62); gracefully handles the no-change case (:181–183, :234–236); macro
  deltas are signed and colour-coded (:112, :336–338); next-steps tell the user
  exactly where to look (Plans, Nutrition Targets).
CURRENT WEAKNESSES: The sectionLabel uses a negative marginBottom (-spacing.xs)
  to pull cards up (:308), a fragile spacing trick; kcal/macros are formatted with
  toLocaleString() with no locale arg (:219, :233 via MacroRow uses bare numbers)
  whereas other screens pass 'en-GB' — a minor consistency gap; reason copy can be
  long inside small cards.
NEWBIE QUESTION: Mostly yes — the diff layout (old → new) plus a one-line reason
  per change is approachable. Terms like "phase", "recomp", "lean gain",
  "surplus", "deficit", "maintenance" appear in the reason copy and may need
  context for a first-timer, though they are explained in plain words.
ATHLETE QUESTION: Yes — phase/goal/calorie/macro/protein-approach changes with
  reasons and a diet-break heads-up are exactly what an experienced user wants to
  see when their plan reflows.
LOCATION QUESTION: Appropriate — it replaces the goal-setup screen
  (ProGoalSetupScreen.js:303 navigation.replace) so the user lands on a clear
  summary right after committing a goal change, then pops to the You-tab root.
VISUAL + USABILITY:
  - headerTitle: type.bodyStrong => fontSize.md (16) (:293).
  - heroTitle: type.title => fontSize.lg (17); heroBody: fontSize.sm (13)
    lineHeight 20 (:302–303).
  - sectionLabel: fontSize.xs (11) uppercase semibold, letterSpacing 0.6
    (:305–309).
  - cardTitle: type.label => fontSize.sm (13); unchangedTag: fontSize.micro (10)
    italic (:316–317).
  - diffPrev: type.body => fontSize.md (16) strikethrough; diffNext:
    type.bodyStrong => fontSize.md (16) primary (:320–322).
  - cardValue: type.bodyStrong => fontSize.md (16); cardReason: fontSize.xs (11)
    lineHeight 18 (:324–325).
  - macroLabel: type.label => fontSize.sm (13); macroPrev/macroNext: fontSize.sm
    (13); macroUnchanged: type.label => fontSize.sm (13); macroDelta: fontSize.xs
    (11) (:331–336).
  - nextText: fontSize.sm (13) lineHeight 20 (:346).
  - doneBtnText: fontSize.md (16) bold (:353).
  Touch targets: header close (X) is a 22px icon with hitSlop 10 all sides
  (:169) → ~42–44px (borderline). doneBtn paddingVertical spacing.lg=16 (:350) →
  comfortable, full-width. The diff/macro rows are display-only.
  Information density: medium — a hero card, up to two training cards, up to
  three nutrition cards/rows and a next-steps card; conditional sections keep it
  from over-filling when little changed.
  Clean/cluttered: clean; consistent Card surfaces (uses shared Card component),
  the "old → new" arrows are a clear motif.
  Most important action prominent: yes — full-width amber "Got it" CTA is the
  dominant control; the X is a secondary dismissal.
  Small/standard/large behaviour: content in a ScrollView (:174) with
  paddingBottom spacing.xxxl=48 (:295); diffRow uses flexWrap (:319) so long
  prev→next labels wrap rather than clip; macro arrows are small fixed px (11px,
  :110); font tokens scale with larger-text. SafeAreaView edges 'top','bottom'
  (:165).
```

---

## Status

1. Files read in full: WeeklyCheckInScreen.js, WellbeingCheckScreen.js, BlockReflectionScreen.js, GoalLockConsentScreen.js, GoalChangeSummaryScreen.js, plus src/styles/theme.js and the relevant parts of src/navigation/RootNavigator.js and src/components/ProGate.js for citations.
2. Screens documented: all 5 (WeeklyCheckIn, WellbeingCheck, BlockReflection, GoalLockConsent, GoalChangeSummary).
3. Could-not-read / NOT DETERMINED: none unreadable. NOT DETERMINED items: code-level Pro gating for WellbeingCheck, BlockReflection, GoalLockConsent and GoalChangeSummary (no withProGuard/ProGate on their routes); the WellbeingCheck "Save answers" Button sizing (lives in components/Button, not in the screen file).


<!-- ==== phase1/06-plans.md ==== -->

# Phase 1 inventory — Plans domain (2026-06-13)

Files audited in full:
- src/screens/PlansScreen.js
- src/screens/PlanDetailScreen.js
- src/screens/PlanLibraryScreen.js
- src/screens/PlanPreviewScreen.js
- src/screens/PlanUpdateScreen.js
- src/screens/ProGoalSetupScreen.js

Token resolution sourced from src/styles/theme.js (dark default palette).
Relevant resolved tokens used below:
- fontSize.micro = 10 (theme.js:257), fontSize.xs = 11 (theme.js:258), fontSize.sm = 13 (theme.js:259),
  fontSize.md = 16 (theme.js:262), fontSize.lg = 17 (theme.js:263), fontSize.xl = 20 (theme.js:264),
  fontSize.xxl = 24 (theme.js:265).
- type.label = fontSize.sm 13 / medium (theme.js:402-405); type.caption = fontSize.xs 11 / regular (theme.js:406-409);
  type.body = fontSize.md 16 / regular (theme.js:394-397); type.bodyStrong = fontSize.md 16 / semibold (theme.js:398-401);
  type.num('caption') = fontSize.xs 11 with tabular-nums (theme.js:406-409,417-421).
- spacing: xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (theme.js:228-239).

---

SCREEN: Plans (PlansScreen)
WHAT IT IS: The Plans tab root. The hub for a user's training plans — shows the active plan, other saved plans, archived plans, saved workout templates, a block-advisor coaching banner, and decision cards to find/build/switch a plan. Free and Pro share the screen with adapted copy.
WHAT IS ON IT:
- ScreenHeader title "Plans" (PlansScreen.js:384).
- First-load skeleton: one 120px card + two 72px cards (PlansScreen.js:390-396).
- Block advisor card (conditional, only when `showBlockCard` — non-`continue` advice, active plan, not snoozed) (PlansScreen.js:362-364, 401-505):
  - icon in a 36px wrap (PlansScreen.js:410-416), headline text (PlansScreen.js:417), body text (PlansScreen.js:420).
  - signal chips for non-info signals, with high-severity variant (PlansScreen.js:423-433).
  - next-block section: optional pre-label "After your recovery week" (PlansScreen.js:438-439), headline (PlansScreen.js:441), body (PlansScreen.js:442).
  - post_recovery CTAs: restart button (icon + `nextBlock.actionLabel`) and a secondary button (`nextBlock.secondaryLabel`) routing to PlanUpdate (Pro) or ProUpgrade (free) (PlansScreen.js:445-461).
  - early_deload: two buttons "Got it, ease off this week" / "Keep going", both snooze (PlansScreen.js:466-475).
  - in_recovery / post_recovery snooze link "Remind me after recovery week" / "Not quite ready. Remind me later." (PlansScreen.js:478-493).
  - heads_up acknowledge link "Got it" (PlansScreen.js:499-503).
- Active plan card (when an active plan exists) (PlansScreen.js:508-555):
  - "ACTIVE" badge (PlansScreen.js:512-514); ellipsis options button (PlansScreen.js:515-517).
  - plan name (PlansScreen.js:519); workout count e.g. "3 workouts" (PlansScreen.js:520-524); "Week X of Y" if block status continue (PlansScreen.js:525-529).
  - Pro-only coach note "Precision Coaching™ adjusts this plan…" (PlansScreen.js:530-534).
  - "Start Next Workout" primary button (PlansScreen.js:536-544) and "View Plan" secondary button (PlansScreen.js:545-552).
- Free no-plan card (when no active plan AND tier !== 'pro') (PlansScreen.js:560-584): compass icon, title "No active plan yet", body copy, "Find my plan" button (→ FreeStarter), "Browse the library" secondary button (→ PlanLibrary).
- Pro no-plan row (no active plan AND tier === 'pro') (PlansScreen.js:586-591): calendar icon + "No active plan · Build one, browse the library, or create your own from scratch."
- "My plans" section (when myPlans.length>0) (PlansScreen.js:595-647): section title "My plans"; per plan card a meta workout count, ellipsis options, plan name (numberOfLines 2), and footer with "View plan" + "Set as active".
- "Archived plans" collapsible section (when archivedPlans.length>0) (PlansScreen.js:650-716): header "Archived plans · N" with chevron; expanded plan cards (0.7 opacity) with View plan + Restore.
- "Workout templates" section (when templates.length>0) (PlansScreen.js:719-754): title "Workout templates", subtitle "Saved workouts you can start directly.", per template a name (numberOfLines 2), exercise count, "Start" button, and ellipsis options.
- "Training blocks" row (always) (PlansScreen.js:757-770): layers icon, label "Training blocks", sub "View completed blocks and long-term progress", chevron → MesocycleBuilder.
- Decision Hub section (always) (PlansScreen.js:774-810): title "Switch your plan" (Pro w/ active plan) or "Start or build a plan"; Pro-with-plan subtitle; action cards from ACTION_CARDS_PRO_SWITCH (Pro) or ACTION_CARDS_DEFAULT (free). Free cards: "Plan Library" (badge "Recommended") and "Manual Builder" (PlansScreen.js:32-48). Pro cards: "Update training and rebuild" (→ PlanUpdate), "Pick from the Plan Library", "Build your own" (PlansScreen.js:55-77). Each card = icon, title, optional badge, description, chevron.
- PeekMenu (bottom-sheet options menu) used for plan/archived options (PlansScreen.js:817; opened at :302, :318).
- Pull-to-refresh RefreshControl (PlansScreen.js:382).
NAVIGATION: Route "Plans" in PlansStack, headerShown:false (RootNavigator.js:319). PlansStack is the "PlansTab" tab (RootNavigator.js:446). Reached by tapping the Plans tab; tab-press scrolls to top (PlansScreen.js:118-122) and pops the stack to top (RootNavigator.js:312-316). Leads to: PlanDetail (:268,:283,:303,:310,:547,:603,:627,:673,:697), RoutineDetail (:323), ActiveWorkout via HomeTab (:240,:349), FreeStarter (:574), PlanLibrary (:580), MesocycleBuilder (:759), card.screen targets PlanLibrary/ManualBuilder/PlanUpdate (:789), PlanUpdate or ProUpgrade (:453).
GATING: Free screen, shared by both tiers. No guard wraps the route (RootNavigator.js:319). Tier read via `tier` from useAppStore selector (PlansScreen.js:96-101) to branch copy and card sets; Pro-only inline elements: coach note (PlansScreen.js:530), Duplicate option hidden for Pro (PlansScreen.js:276). No Pro feature is exposed to free users here; the decision cards route free users to free destinations or (post_recovery secondary CTA) to ProUpgrade.
CURRENT STRENGTHS: Clear active-plan hero with the primary "Start Next Workout" action prominent. Distinct free vs Pro on-ramps. Offline-first: reads only local database (PlansScreen.js:145-153). Skeleton avoids empty flash. Snooze logic keeps the block banner from nagging. Good accessibility labels and hitSlop on icon buttons.
CURRENT WEAKNESSES: Information-dense when many sections are present (block card + active plan + my plans + archived + templates + training blocks + decision hub) — a returning power user can have a very long scroll. The block-advisor card carries a lot of conditional sub-states (5 action branches) and is the most complex element on screen. Two near-identical "View plan / Set as active" footer patterns plus the ellipsis menu duplicate the same actions, which is some redundancy. Template/My-plans cards repeat the same options affordance three ways (long-press, ellipsis, footer).
NEWBIE QUESTION: Mostly yes for a free first-timer — the no-plan card with "Find my plan" / "Browse the library" is an explicit, friendly on-ramp (PlansScreen.js:560-584). Terms like "training block", "templates" and the Decision Hub copy may be unclear to a complete beginner; "Workout templates" vs "My plans" distinction is not explained beyond the one-line subtitle.
ATHLETE QUESTION: Largely yes — block advisor (deload/recovery signals), week-in-block readout, division-aware library, and restart-block flow speak to experienced lifters. The Pro coach note and "Update training and rebuild" path give a competitor control. Could frustrate: the active-plan card shows workout count and week but no quick volume/structure summary without opening PlanDetail.
LOCATION QUESTION: Correct — this is the Plans tab root and is the natural home for plan management. The "Training blocks" entry and Decision Hub sensibly live here. Cardio was deliberately moved off this screen to Progress (PlansScreen.js:814-815), which is the right call per the in-file note.
VISUAL + USABILITY:
  - Font sizes:
    - Header title "Plans": fontSize.xl (20) bold (ScreenHeader.js:53-58).
    - sectionTitle ("My plans", "Workout templates", Decision Hub title): type.label → fontSize.sm (13) (PlansScreen.js:827).
    - sectionSubtitle: type.caption → fontSize.xs (11) (PlansScreen.js:828).
    - activeBadgeText "ACTIVE": fontSize.xs (11) black (PlansScreen.js:879).
    - activePlanName: fontSize.xl (20) bold (PlansScreen.js:880).
    - activePlanMeta: fontSize.sm (13) (PlansScreen.js:881).
    - activePlanWeek: type.num('caption') → fontSize.xs (11) (PlansScreen.js:882).
    - proCoachNote: fontSize.xs (11), lineHeight 18 (PlansScreen.js:842-845).
    - startNextBtnText: fontSize.sm (13) bold (PlansScreen.js:888).
    - viewPlanBtnText: type.label → fontSize.sm (13) (PlansScreen.js:893).
    - noActivePlanText: fontSize.sm (13) (PlansScreen.js:852); noPlanCardTitle type.bodyStrong → 16 (PlansScreen.js:865); noPlanCardBody fontSize.sm (13) (PlansScreen.js:866).
    - planCardName / templateName: type.bodyStrong → fontSize.md (16) (PlansScreen.js:912,928).
    - planCardMeta / templateMeta: type.num('caption') → fontSize.xs (11) (PlansScreen.js:913,929).
    - planCardFooterGhost / planCardFooterPrimary / archivedHeaderText: type.label → fontSize.sm (13) (PlansScreen.js:919,920,905-907).
    - startTemplateBtnText: fontSize.sm (13) bold (PlansScreen.js:935).
    - trainingBlocksLabel: type.bodyStrong → 16 (PlansScreen.js:840); trainingBlocksSub: type.caption → 11 (PlansScreen.js:841).
    - actionCardTitle: type.bodyStrong → 16 (PlansScreen.js:949); actionCardBadgeText: fontSize.micro (10) (PlansScreen.js:955); actionCardDesc: fontSize.xs (11), lineHeight 16 (PlansScreen.js:956).
    - blockCardTitle: type.bodyStrong → 16 (PlansScreen.js:994-996); blockCardBody: fontSize.sm (13), lineHeight 20 (PlansScreen.js:997-999); nextBlockHeadline type.bodyStrong → 16 (PlansScreen.js:1030-1032); nextBlockBody fontSize.sm (13) (PlansScreen.js:1033-1035); nextBlockPreLabel fontSize.xs (11) (PlansScreen.js:1026-1029).
    - signalChipText: fontSize.xs (11) medium (PlansScreen.js:1014-1016).
    - blockRestartBtnText: fontSize.sm (13) bold (PlansScreen.js:1043); blockNewBtnText type.label → 13 (PlansScreen.js:1049); blockSnoozeText type.caption → 11 (PlansScreen.js:1051).
  - Touch targets (flagging < 44px):
    - moreBtn (ellipsis) is 28×28 (PlansScreen.js:921) but has hitSlop 12 each side at call sites (e.g. PlansScreen.js:515-517, :616, :686, :744) → effective ~52px. FLAG: the active-plan ellipsis (PlansScreen.js:515) and footer text buttons rely on hitSlop; the rendered visual targets are below 44px.
    - planCardFooter "View plan"/"Set as active" text links use hitSlop 8 (PlansScreen.js:628,635) → effective ~ text height + 16; visual target likely < 44px tall. FLAG (relies on hitSlop).
    - startNextBtn / startTemplateBtn / blockRestart/blockNew buttons use paddingVertical spacing.md (12) or spacing.sm (8); startNext has padding 12 (PlansScreen.js:886) so ~ 24 + text — borderline but with text ~44px. startTemplateBtn paddingVertical spacing.sm (8) (PlansScreen.js:933) → smaller; FLAG potentially < 44px.
    - archivedHeader hitSlop 8 (PlansScreen.js:655); blockSnooze link paddingTop xs only (PlansScreen.js:1050) → small tap target, FLAG.
  - Information density: High when populated. Multiple stacked card sections with spacing.lg (16) gaps (PlansScreen.js:824). The block card alone can carry header + body + chips + next-block + 2 CTAs.
  - Clean or cluttered: Generally clean cards, consistent radius.lg. Clutter risk only when every optional section renders at once. No obvious misaligned elements in code.
  - Most important action prominence: Yes — for an active-plan user "Start Next Workout" (filled amber primary, PlansScreen.js:884-887) is the most prominent. For a free no-plan user "Find my plan" primary Button is top of the card.
  - Device behaviour: Whole screen is a ScrollView (PlansScreen.js:379) with contentContainerStyle padding spacing.lg and paddingBottom spacing.xxl (PlansScreen.js:824) — scales across sizes. Card widths are flex/full-width; icon wraps are fixed (40/48/36px). No fixed heights on real content (skeleton uses fixed heights only). Should adapt to 5.4"/6.1"/6.7".

---

SCREEN: PlanDetail (PlanDetailScreen)
WHAT IT IS: The detail view for a single plan — library plan or one of the user's own plans (route param `isLibrary`). Shows plan header/stats, its list of workouts, an optional "Why this plan" rationale (active auto-gen plan only), and manage actions.
WHAT IS ON IT:
- Plan header (PlanDetailScreen.js:211-256): badge row — "Library" badge (if isLibrary), "Active plan" badge (if isActive), "Featured" badge (if tags include 'featured') (PlanDetailScreen.js:213-230); plan name (PlanDetailScreen.js:231); optional description (PlanDetailScreen.js:232-234); stats row — Workouts count, "~N Est. sets/week" (computed = exerciseCount × 3, PlanDetailScreen.js:180-183), and Level (Beginner/Intermediate/Advanced from difficulty) (PlanDetailScreen.js:235-254).
- Primary action button: "Add to my plans" (isLibrary), or "Set active" (own plan, not active), or none (already active) (PlanDetailScreen.js:259-263).
- Workouts section (PlanDetailScreen.js:266-315): title "Workouts"; empty card if none ("No workouts in this plan." / "No workouts yet. Edit the plan to add workouts."); else per workout an index circle, name, exercise count ("N exercises" / "No exercises yet"), and — for non-library — an edit button (→ RoutineDetail) and a start button (→ ActiveWorkout).
- "Why this plan, for you" section (only isActive && !isLibrary && whyThis present) (PlanDetailScreen.js:317-332): bulleted rationale items ordered by WHY_ORDER (schedule, goal, experience, progression, equipment, recovery, nutrition, weakPoints) (PlanDetailScreen.js:27,324-329).
- Manage section (only !isLibrary && tier !== 'pro') (PlanDetailScreen.js:334-354): "Duplicate Plan" row; "Archive Plan" row (only if not active).
- Skeleton placeholder layout while loading (PlanDetailScreen.js:185-202).
- Pull-to-refresh (PlanDetailScreen.js:208).
NAVIGATION: Route "PlanDetail" registered in multiple stacks: PlansStack with title 'Plan' (RootNavigator.js:321), FirstRunStack headerShown:true (RootNavigator.js:477), ProOnboardingStack headerShown:true (RootNavigator.js:504). Title overridden at runtime to plan name (PlanDetailScreen.js:69). Reached from PlansScreen, PlanLibrary (:518,:555,:649), and onboarding flows. Leads to: RoutineDetail (:294), ActiveWorkout via HomeTab (:139), replace→PlanDetail on duplicate (:172), goBack on add/archive.
GATING: Free screen; no route guard. Manage actions (Duplicate/Archive) are hidden for Pro (PlanDetailScreen.js:336) per the in-file note that Pro manage their plan via the goal-change wizard. No Pro feature exposed to free users.
CURRENT STRENGTHS: Clear hierarchy: header → primary CTA → workouts → rationale → manage. The "Why this plan" rationale is a strong trust/transparency feature for the coached experience. Skeleton mirrors loaded layout. Good per-workout edit/start affordances.
CURRENT WEAKNESSES: "Est. sets/week" is a hardcoded heuristic (exerciseCount × 3, PlanDetailScreen.js:181) shown as "~N" — accurate only if every exercise is 3 sets; potentially misleading for an athlete. Difficulty fallback silently defaults to "Intermediate" when null is non-null-but-out-of-range (PlanDetailScreen.js:249). Library plans show no start/edit affordance (by design) but the workout rows then look slightly inert.
NEWBIE QUESTION: Mostly yes — workouts are numbered and named, the primary CTA is explicit. "Est. sets/week" and the rationale bullets assume some training literacy; a beginner may not know what a "set" target implies.
ATHLETE QUESTION: Partly — they get workout list, level, and rationale, but the only per-plan volume figure is the approximate "Est. sets/week" with no per-muscle breakdown. An experienced competitor would want set/rep schemes per exercise, which require drilling into RoutineDetail.
LOCATION QUESTION: Correct — a plan detail screen reachable from Plans, the Library, and onboarding is the right shared destination. Registering it in three stacks keeps back-navigation correct per the in-file routing notes.
VISUAL + USABILITY:
  - Font sizes:
    - planName: fontSize.xxl (24) black (PlanDetailScreen.js:381).
    - planDesc: fontSize.sm (13), lineHeight 20 (PlanDetailScreen.js:382).
    - planStatValue: fontSize.xl (20) black (PlanDetailScreen.js:385); planStatLabel: type.caption → fontSize.xs (11) (PlanDetailScreen.js:386).
    - sectionTitle: type.label → fontSize.sm (13) (PlanDetailScreen.js:388-390).
    - libraryBadgeText / activeBadgeText / featuredBadgeText: fontSize.xs (11) (PlanDetailScreen.js:369,374,380).
    - emptyCardText: fontSize.sm (13) (PlanDetailScreen.js:395).
    - workoutIndexText: fontSize.sm (13) bold (PlanDetailScreen.js:404); workoutName: type.bodyStrong → 16 (PlanDetailScreen.js:406); workoutMeta: type.caption → 11 (PlanDetailScreen.js:407).
    - manageRowText: type.body → fontSize.md (16) (PlanDetailScreen.js:425).
    - whyText: fontSize.sm (13), lineHeight 20 (PlanDetailScreen.js:433).
  - Touch targets:
    - editWorkoutBtn / startWorkoutBtn: 36×36 (PlanDetailScreen.js:409-416) with hitSlop 6 (PlanDetailScreen.js:295,304) → effective ~48px. FLAG: visual 36px < 44px (mitigated by hitSlop).
    - workoutIndex circle is 32×32 (PlanDetailScreen.js:400-403) but it is non-interactive (decorative).
    - manageRow uses padding spacing.lg (16) → row height comfortably ≥ 44px (PlanDetailScreen.js:422).
    - Primary Button uses size="lg" (PlanDetailScreen.js:260,262) — component-controlled height.
  - Information density: Moderate. Header + stats + one CTA + workout list. Manageable on one screen for typical plans.
  - Clean or cluttered: Clean. Consistent card styling. No misalignment in code.
  - Most important action prominence: Yes — the size="lg" primary button ("Add to my plans" / "Set active") sits directly under the header (PlanDetailScreen.js:259-263).
  - Device behaviour: ScrollView with padding spacing.lg, gap spacing.xl, paddingBottom spacing.xxl (PlanDetailScreen.js:362). Fixed icon/circle sizes (32/36px) won't scale with larger-text but text does. Adapts across device sizes.

---

SCREEN: PlanLibrary (PlanLibraryScreen)
WHAT IT IS: Browsable catalogue of ready-made library plans, with search, collection filter chips, a bodybuilding-division grid, a 2-question recommendation quiz (modal), and per-plan preview/add actions.
WHAT IS ON IT:
- SearchBar "Search plans" (PlanLibraryScreen.js:399-404).
- Horizontal collection chips: All plans, Featured, For women, For men, Beginner, Dumbbells only, Short sessions, Bodybuilding Divisions (PlanLibraryScreen.js:19-28, 407-439); the Division chip has a trophy icon (PlanLibraryScreen.js:426-433).
- Division grid (shown when Division collection active) (PlanLibraryScreen.js:442-447, 164-216): intro description, "Men's divisions" group with 3 chips (Men's Physique, Classic Physique, Men's Bodybuilding) (PlanLibraryScreen.js:32-48), "Women's divisions" group with 5 chips (Bikini, Wellness, Figure, Women's Physique, Women's Bodybuilding) (PlanLibraryScreen.js:50-76), and a selected-division description box (PlanLibraryScreen.js:206-213).
- Plans FlatList (PlanLibraryScreen.js:450-574):
  - Quiz banner header (when not searching, All collection, no quiz result) "Not sure where to start?" + body, chevron (PlanLibraryScreen.js:457-476).
  - Empty states: load-error card with "Try again" retry (PlanLibraryScreen.js:478-486); skeleton while loading (PlanLibraryScreen.js:487-492); "No plans found" with contextual subtext (PlanLibraryScreen.js:493-505).
  - Per plan card (PlanLibraryScreen.js:514-571): badge row (Featured/division/For women/For men/difficulty), workout count, plan name, 2-line description, footer "Preview plan" + "Add to my plans".
- Quiz modal (PlanLibraryScreen.js:577-671): sheet handle, progress dots, 2 question steps (goal: build muscle/get stronger/improve conditioning/get on stage; equipment: full gym/dumbbells only/home) (PlanLibraryScreen.js:82-102), "Skip and browse all plans"; result step with suggestion card, "Add this plan", "Preview first", "Browse all plans instead"; no-result step with "Browse all plans".
- Add-to-my-plans flow uses appAlert confirmations, branching on `fromFirstRun` (PlanLibraryScreen.js:288-338).
- Pull-to-refresh (PlanLibraryScreen.js:454).
NAVIGATION: Route "PlanLibrary" in PlansStack title 'Plan Library' (RootNavigator.js:325), FirstRunStack headerShown:true (RootNavigator.js:476), ProOnboardingStack headerShown:true (RootNavigator.js:503). Reached from PlansScreen (:580, action card), no-plan card, and onboarding flows; `fromFirstRun` param drives onboarding hand-off. Leads to: PlanDetail with isLibrary:true (:518,:555,:649), ProSetupComplete (onboarding) (:313,:325), goBack.
GATING: Free screen (Plan Library is an explicitly free feature per CLAUDE.md). No guard. No Pro gating inside.
CURRENT STRENGTHS: Rich discovery: search + collections + divisions + a guided quiz cover beginners and competitors. Robust empty/error handling (FF-004 retry, distinct from genuinely empty). Good accessibility labels including composed plan-card labels (PlanLibraryScreen.js:521-526). Seeds library if needed on load (PlanLibraryScreen.js:258).
CURRENT WEAKNESSES: Two parallel discovery mechanisms (collection chips + quiz) can feel redundant. The quiz scoring is a simple tag-weight heuristic (PlanLibraryScreen.js:122-142) and can return a single "best" with little explanation. Division grid + chips create a deep filter hierarchy that may be more than a casual free user needs. "Add to my plans" footer text link is small and visually similar to "Preview plan".
NEWBIE QUESTION: Yes — the "Not sure where to start?" quiz banner is an excellent beginner on-ramp, and collection labels are plain. Division terminology (Wellness, Classic Physique) is competitor-facing and may confuse a true beginner, but it is tucked behind its own chip.
ATHLETE QUESTION: Yes — division-specific collections with judged-criteria descriptions directly target competitors; difficulty badges and workout counts give quick triage. An athlete can bypass the quiz and filter straight to their division.
LOCATION QUESTION: Correct — the Library belongs under Plans and is also correctly surfaced in onboarding stacks for first-run plan selection.
VISUAL + USABILITY:
  - Font sizes:
    - chipText: type.label → fontSize.sm (13) (PlanLibraryScreen.js:697).
    - divisionGroupLabel: fontSize.xs (11) semibold (PlanLibraryScreen.js:705-708); divisionIntroDesc: fontSize.xs (11), lineHeight 18 (PlanLibraryScreen.js:710-714); divisionChipText: fontSize.xs (11) (PlanLibraryScreen.js:723); divisionDescText: fontSize.sm (13) (PlanLibraryScreen.js:730).
    - quizBannerTitle: fontSize.sm (13) bold (PlanLibraryScreen.js:746); quizBannerBody: type.caption → 11 (PlanLibraryScreen.js:747).
    - badgeText: fontSize.micro (10) (PlanLibraryScreen.js:766); workoutCount: type.caption → 11 (PlanLibraryScreen.js:768).
    - planName: type.bodyStrong → fontSize.md (16) (PlanLibraryScreen.js:769); planDesc: fontSize.sm (13), lineHeight 18 (PlanLibraryScreen.js:770).
    - previewText: type.label → 13 (PlanLibraryScreen.js:776); addBtnText: fontSize.sm (13) bold (PlanLibraryScreen.js:778).
    - emptyTitle: fontSize.xl (20) bold (PlanLibraryScreen.js:783); emptyText: type.body → fontSize.md (16) (PlanLibraryScreen.js:784-787).
    - quizQuestion: fontSize.lg (17) black (PlanLibraryScreen.js:810-814); quizOptionText: fontSize.md (16) (PlanLibraryScreen.js:822); quizSkipText: fontSize.sm (13) (PlanLibraryScreen.js:824).
    - quizResultTitle: fontSize.xl (20) black (PlanLibraryScreen.js:828-831); quizResultName: type.bodyStrong → 16 (PlanLibraryScreen.js:837); quizResultDesc: fontSize.sm (13) (PlanLibraryScreen.js:838); quizResultMeta: type.caption → 11 (PlanLibraryScreen.js:839); quizStartText: type.bodyStrong → 16 (PlanLibraryScreen.js:844); quizBrowseText: fontSize.md (16) medium (PlanLibraryScreen.js:850).
  - Touch targets:
    - collection chip: paddingHorizontal spacing.md (12), paddingVertical 7 (PlanLibraryScreen.js:692) → ~ 14 + text height ≈ 30-34px. FLAG: likely < 44px tall, no hitSlop on chip.
    - divisionChip: paddingVertical 6 (PlanLibraryScreen.js:718) → ~ 12 + text ≈ smaller still. FLAG < 44px.
    - addBtn: paddingVertical spacing.xs (4), paddingHorizontal spacing.md (PlanLibraryScreen.js:777) → very short tap target; FLAG < 44px, no hitSlop.
    - "Preview plan" text link has no padding/hitSlop (PlanLibraryScreen.js:554-560). FLAG < 44px.
    - quizOptionBtn: padding spacing.md (12) (PlanLibraryScreen.js:820) → ~ 24 + text ≈ borderline 44px.
    - quizSkip: paddingVertical spacing.sm (8) (PlanLibraryScreen.js:823) — small, FLAG.
  - Information density: High on the Division collection (intro + 8 chips + description) and moderate elsewhere. FlatList virtualises the plan list so long catalogues stay performant.
  - Clean or cluttered: Mostly clean; the division view is the densest. Chips wrap (PlanLibraryScreen.js:716).
  - Most important action prominence: On each card the two footer actions ("Preview plan" / "Add to my plans") are equal-weight text links — neither is a filled button, so the primary "Add" action is not visually dominant. The whole card is also tappable to preview (PlanLibraryScreen.js:516-518). In the quiz, "Add this plan" is a filled amber button (PlanLibraryScreen.js:840-844), correctly prominent.
  - Device behaviour: FlatLists (horizontal chips + vertical plans) with padding spacing.lg; chipsList fixed height 52 (PlanLibraryScreen.js:685). Quiz modal is a bottom sheet with paddingBottom spacing.xxl. Quiz dots fixed 8px. Generally responsive across sizes; fixed chip height could clip larger-text labels.

---

SCREEN: PlanPreview (PlanPreviewScreen)
WHAT IT IS: Pre-account "your plan" preview shown during quiz-first onboarding (COMP-030). Renders a deterministic, locally-derived plan shape from the onboarding quiz answers and pushes toward account creation ("save your plan"). No calories/macros.
WHAT IS ON IT (PlanPreviewScreen.js:25-46):
- Kicker label "YOUR PLAN" (PlanPreviewScreen.js:28).
- Headline `p.headline` (PlanPreviewScreen.js:29).
- Card: split name `p.splitName`, structure line `p.structure`, optional phase line "Built {phaseLine}." (PlanPreviewScreen.js:30-34).
- Nutrition note `p.nutritionNote` (PlanPreviewScreen.js:35).
- Footer (fixed, outside scroll): primary CTA "Create an account to keep it" (→ Login with intent pro_signup, fromQuiz) (PlanPreviewScreen.js:38-42, 19-23); fine print "No card. Nothing charged unless you choose." (PlanPreviewScreen.js:43).
All plan content comes from `buildPlanPreview(quiz)` reading the `onboardingQuiz` store slice (PlanPreviewScreen.js:12-17).
NAVIGATION: Route "PlanPreview" in WelcomeStack (RootNavigator.js:461), headerShown:false (stack default at :456). Reached from QuizScreen via navigate('PlanPreview') (QuizScreen.js:58) when ONBOARDING_QUIZ_FIRST is on and the user picks Pro (RootNavigator.js:458-461). Leads to: Login (PlanPreviewScreen.js:21).
GATING: Pre-account onboarding screen (not tier-gated; runs before sign-up). No withProGuard. Per the file header it is part of the Pro signup funnel but deliberately shows no calories/macros until after account + permission (PlanPreviewScreen.js:1-8,35).
CURRENT STRENGTHS: Focused, single-purpose screen — endowment-effect framing ("keep it", "No card"). Minimal and uncluttered. Deterministic preview (no AI), consistent with the coaching-engine rule. Fixed footer keeps the CTA always visible.
CURRENT WEAKNESSES: Very sparse — only a headline, one card, and a note; if `buildPlanPreview` returns thin content the screen could feel empty. No back affordance is rendered in-screen (headerShown:false) — relies on the system/stack gesture. No loading/error state if the quiz slice is missing (defaults to {} at PlanPreviewScreen.js:16, so output depends entirely on buildPlanPreview's handling).
NEWBIE QUESTION: Yes — it is plain-language and reassuring ("No card. Nothing charged unless you choose."), and shows a concrete plan shape rather than asking to sign up cold.
ATHLETE QUESTION: Partly — split name + structure + phase line speak to a trained user, but there is no volume, exercise list, or progression detail at this stage (intentional, pre-account). An athlete gets enough to feel the plan is "theirs" but not enough to evaluate it.
LOCATION QUESTION: Correct — it sits between the quiz and the account wall in the WelcomeStack, exactly the funnel position the header comment describes.
VISUAL + USABILITY:
  - Font sizes:
    - kicker "YOUR PLAN": fontSize.sm (13), letterSpacing 1, semibold (PlanPreviewScreen.js:52).
    - h1 headline: fontSize.xxl (24) black (PlanPreviewScreen.js:53).
    - splitName: fontSize.xl (20) heavy, primary colour (PlanPreviewScreen.js:55).
    - structure: fontSize.md (16) (PlanPreviewScreen.js:56); phase: fontSize.md (16) (PlanPreviewScreen.js:57).
    - note: fontSize.sm (13) (PlanPreviewScreen.js:58).
    - ctaText: fontSize.md (16) heavy (PlanPreviewScreen.js:61); fine: fontSize.sm (13) centred (PlanPreviewScreen.js:62).
  - Touch targets:
    - cta button: minHeight 50 (PlanPreviewScreen.js:60) → meets/exceeds 44px. Good.
    - No other interactive elements (no in-screen back button).
  - Information density: Very low — deliberately minimal.
  - Clean or cluttered: Clean.
  - Most important action prominence: Yes — the filled amber CTA in the fixed footer is the clear primary and only action.
  - Device behaviour: ScrollView body + fixed footer (PlanPreviewScreen.js:27,38). SafeAreaView edges top+bottom. No fixed content heights besides the 50px CTA min. Scales well across device sizes; content is short enough that small devices won't need to scroll much.

---

SCREEN: PlanUpdate (PlanUpdateScreen)
WHAT IT IS: Training-only plan rebuild wizard for the Plans tab. Lets a Pro user change training parameters (category, weak points, experience, days/week, session length, equipment, recovery) and rebuilds the plan around them. Deliberately does NOT change calories/macros (those live in the You tab).
WHAT IS ON IT:
- BackHeader title "Update training" (PlanUpdateScreen.js:144).
- Intro sub copy "Adjust your training setup and rebuild the plan around it. Your calorie and macro targets stay as they are…" (PlanUpdateScreen.js:151-153).
- "Competing in a category? (optional)" label + sub + Dropdown (PHYSIQUE_GOALS), placeholder "Not competing, General" (PlanUpdateScreen.js:156-166).
- Weak points (only when goal supports them): label "(optional, max 3)", sub, chip grid from WEAK_POINT_MUSCLES, max-3 toggle with warning toast (PlanUpdateScreen.js:169-195, 72-81).
- "Experience" label + sub + Dropdown (4 options) (PlanUpdateScreen.js:198-207, 21-26).
- "Training days per week" label + sub + SegmentedControl (3/4/5/6) (PlanUpdateScreen.js:210-219, 28).
- "Session length" label + SegmentedControl (45/60/75/90 min) (PlanUpdateScreen.js:221-227, 30-35).
- "Equipment" label + sub + Dropdown (6 options) (PlanUpdateScreen.js:230-239, 37-44).
- "Recovery" label + sub + Dropdown (3 options) (PlanUpdateScreen.js:242-251, 46-50).
- Save button "Rebuild my plan" / "Rebuilding…" when saving, disabled while saving (PlanUpdateScreen.js:253-265).
- handleSave rebuilds plan first (generateAndSavePlan), commits training profile only on success, surfaces partial/shortfall and error toasts, then goBack (PlanUpdateScreen.js:83-140).
NAVIGATION: Route "PlanUpdate" in PlansStack as GatedPlanUpdate, headerShown:false (RootNavigator.js:320). GatedPlanUpdate = withProGuard(PlanUpdateScreen, 'Update training') (RootNavigator.js:154). Reached from PlansScreen Pro action card "Update training and rebuild" (card.screen 'PlanUpdate', PlansScreen.js:55-62, navigate at :789) and the block-card post_recovery secondary CTA for Pro (PlansScreen.js:453). Leads to: goBack on success (PlanUpdateScreen.js:139).
GATING: Pro. Guarded by withProGuard at the route (RootNavigator.js:154,320); free users hitting the route get ProLocked (ProGate.js:135-138). This is consistent with FREE vs PRO rules (Precision Coaching adjustments / coached rebuild are Pro).
CURRENT STRENGTHS: Single-responsibility — training only, with an explicit promise that nutrition targets are untouched (PlanUpdateScreen.js:51-56,151-153). Safe failure model (FF-002): rebuild first, only commit profile on success, keep user on screen to retry (PlanUpdateScreen.js:108-125). Mirrors ProOnboarding/ProGoalSetup option lists for deterministic parity (PlanUpdateScreen.js:18-20). Disabled-state save button prevents double submit.
CURRENT WEAKNESSES: Long single-column form of dropdowns + segmented controls; no progress/preview of how the plan will change before committing (the result only appears as a toast + back). Weak-points section appears/disappears based on goal, which can shift layout. Overlaps heavily with ProGoalSetupScreen (same training fields) — two screens edit much of the same data, a potential source of confusion about which to use (the copy tries to disambiguate by pointing nutrition changes to the You tab).
NEWBIE QUESTION: Pro-only, so the audience is past first-run, but a less-experienced Pro user may not grasp how each field reshapes the plan; the per-field sub copy helps ("This sets your starting volume…"). "Weak points", "session length" mapping to exercise mix is reasonably explained.
ATHLETE QUESTION: Yes — experience, days, session length, equipment, recovery and division/weak-point biasing are exactly the levers a competitor wants, and the deterministic rebuild respects their answers. Missing: a preview/diff of the rebuilt plan before saving.
LOCATION QUESTION: Correct for the training-only intent — it lives in the Plans tab where plan structure is managed, and explicitly defers nutrition to the You tab, keeping a clean separation from ProGoalSetup.
VISUAL + USABILITY:
  - Font sizes:
    - BackHeader title "Update training": fontSize.lg (17) semibold (BackHeader.js:59-65).
    - sectionLabel: type.label → fontSize.sm (13) (PlanUpdateScreen.js:275-278).
    - sectionSub: fontSize.xs (11), lineHeight 17 (PlanUpdateScreen.js:280-283).
    - optionalTag: type.caption → fontSize.xs (11) (PlanUpdateScreen.js:285-288).
    - weakPointChipText: fontSize.xs (11) medium (PlanUpdateScreen.js:307-311).
    - saveBtnText: type.bodyStrong → fontSize.md (16) (PlanUpdateScreen.js:323).
    - (Dropdown / SegmentedControl text sizes are owned by those components, not set here — NOT DETERMINED IN THIS FILE.)
  - Touch targets:
    - weakPointChip: paddingHorizontal spacing.md (12), paddingVertical spacing.sm (8) (PlanUpdateScreen.js:295-302) → ~ 16 + text ≈ borderline, likely < 44px. FLAG (no hitSlop).
    - saveBtn: paddingVertical spacing.lg (16) (PlanUpdateScreen.js:317-321) → comfortably ≥ 44px.
    - BackHeader back chevron: 24px icon with hitSlop 12 (BackHeader.js:40-41) → effective ~48px.
    - Dropdown / SegmentedControl tap sizes — NOT DETERMINED IN THIS FILE.
  - Information density: Moderate-high — seven labelled controls stacked. Generous spacing.xxl between sections (sectionLabelSpaced, PlanUpdateScreen.js:279) keeps it readable.
  - Clean or cluttered: Clean, consistent label/sub/control rhythm.
  - Most important action prominence: Yes — the filled amber "Rebuild my plan" button at the bottom is the clear primary (PlanUpdateScreen.js:317-321).
  - Device behaviour: ScrollView, keyboardShouldPersistTaps handled, paddingHorizontal spacing.lg, paddingTop spacing.xl, paddingBottom spacing.xxxl (PlanUpdateScreen.js:146-150,273). No fixed content heights; scales across device sizes. Weak-point chips wrap (PlanUpdateScreen.js:289-294).

---

SCREEN: ProGoalSetup (ProGoalSetupScreen)
WHAT IT IS: The Pro goal/plan-change wizard ("Update your plan") in the You tab. Changes the physique category, current focus/phase, weak points, full training setup, and protein approach; recalculates nutrition targets AND rebuilds the plan, then routes to a change-summary screen.
WHAT IS ON IT:
- BackHeader title "Update your plan" (ProGoalSetupScreen.js:328).
- "Competing in a category? (optional)" label + sub + Dropdown (PHYSIQUE_GOALS), placeholder "Not competing, General" (ProGoalSetupScreen.js:339-349).
- Weak points (only when goal supports them): label "(optional, max 3)" + sub + chip grid, max-3 toggle with warning toast (ProGoalSetupScreen.js:352-378, 114-123).
- "What are you focused on right now?" label + sub "Drives your calorie target and how the plan is built." + Dropdown (TRAINING_PHASES) (ProGoalSetupScreen.js:383-393).
- "Experience" label + sub + Dropdown (ProGoalSetupScreen.js:396-405).
- "Training days per week" label + sub + SegmentedControl (3/4/5/6) (ProGoalSetupScreen.js:408-417).
- "Session length" label + SegmentedControl (45/60/75/90) (ProGoalSetupScreen.js:419-425).
- "Equipment" label + sub + Dropdown (ProGoalSetupScreen.js:428-437).
- "Recovery" label + sub + Dropdown (ProGoalSetupScreen.js:440-449).
- "Protein target" label + sub + three selectable cards (standard/optimised/advanced) each with icon, label, range, optional "Suggested" badge, short description, and a checkmark when active (ProGoalSetupScreen.js:452-493, 26-30).
- Footer note 1 (if weight known): "Targets use your latest weight, {weight}. Log a new one on Home." (ProGoalSetupScreen.js:495-502).
- Footer note 2: "Changing your goals updates your plan targets immediately. Precision Coaching adjusts at the next check-in." (ProGoalSetupScreen.js:504-509).
- Save button "Rebuild my plan", disabled until goal+phase chosen (ProGoalSetupScreen.js:511-521, canSave at :112).
- handleSave: recalculates nutrition targets via the nutrition engine (uses latest morning-weight EWMA, body comp), persists targets + profile, regenerates the plan, then navigation.replace to GoalChangeSummary with before/after kcal/macros + planRerolled flag (ProGoalSetupScreen.js:128-324).
NAVIGATION: Route "ProGoalSetup" in ProfileStack as GatedProGoalSetup, headerShown:false (RootNavigator.js:393). GatedProGoalSetup = withProGuard(ProGoalSetupScreen, 'Pro goal setup') (RootNavigator.js:153). Reached from YouScreen via navigate('ProGoalSetup') (YouScreen.js:134). Leads to: GoalChangeSummary via navigation.replace (ProGoalSetupScreen.js:303), which is registered in ProfileStack (RootNavigator.js:394).
GATING: Pro. Guarded by withProGuard at the route (RootNavigator.js:153,393); free users get ProLocked (ProGate.js:135-138). Recalculating nutrition targets and Precision Coaching are Pro features per CLAUDE.md — correctly gated.
CURRENT STRENGTHS: Single place where goal/phase drive both nutrition AND plan (the in-file note positions this as the nutrition-touching counterpart to PlanUpdate). Careful weight handling — uses smoothed morning-weight trend, not stale enrolment weight (ProGoalSetupScreen.js:203-246). Robust fallbacks so a partial profile still recalculates (ProGoalSetupScreen.js:214-217). Records deficit start/clear dates (ProGoalSetupScreen.js:125-157). Non-blocking failure handling for both nutrition recalc and plan reroll, with explanatory toasts (ProGoalSetupScreen.js:267-271,293-297). Routes to a change summary rather than silently popping.
CURRENT WEAKNESSES: This is a long, dense form (8 controls + 3 protein cards + 2 footer notes) — the most complex screen in this domain. Substantial field overlap with PlanUpdateScreen (same experience/days/session/equipment/recovery/weak-point set); the distinction (this also changes nutrition; PlanUpdate does not) is communicated only via copy and may confuse users about which screen to use. The handleSave function is large and does many side effects (nutrition recalc, weight write-back, body-comp recovery, profile save, plan regen) in sequence — high-risk surface. "Rebuild my plan" button label is identical to PlanUpdate's despite this screen doing much more.
NEWBIE QUESTION: Pro-only and post-onboarding, but still dense for a less-experienced user; sub copy explains each field. The protein-approach cards with ranges/"Suggested" badge are reasonably guided. The breadth (category + phase + full training setup + protein) is a lot to take in at once.
ATHLETE QUESTION: Yes — this is the competitor control centre: division/weak-point biasing, training phase (incl. cut/deficit), protein approach up to "advanced", full training setup, and a transparent change summary. Strong fit for an experienced athlete.
LOCATION QUESTION: Correct — it lives in the You/Profile tab (reached from YouScreen), which per the Plans-side copy is the designated place for goal and calorie/macro changes; PlanUpdate (Plans tab) handles training-only. Clear separation by intent.
VISUAL + USABILITY:
  - Font sizes:
    - BackHeader title "Update your plan": fontSize.lg (17) semibold (BackHeader.js:59-65).
    - sectionLabel: type.label → fontSize.sm (13) (ProGoalSetupScreen.js:531-534).
    - sectionSub: fontSize.xs (11), lineHeight 17 (ProGoalSetupScreen.js:536-539).
    - optionalTag: type.caption → fontSize.xs (11) (ProGoalSetupScreen.js:541-544).
    - weakPointChipText: fontSize.xs (11) medium (ProGoalSetupScreen.js:563-567).
    - phaseLabel (protein card title): type.bodyStrong → fontSize.md (16) (ProGoalSetupScreen.js:586-589); phaseDetail: fontSize.sm (13), lineHeight 18 (ProGoalSetupScreen.js:591).
    - approachRange: fontSize.xs (11) medium (ProGoalSetupScreen.js:599-601).
    - suggestedBadgeText: fontSize.micro (10) bold (ProGoalSetupScreen.js:607).
    - footerNoteText: fontSize.xs (11), lineHeight 17 (ProGoalSetupScreen.js:597).
    - saveBtnText: type.bodyStrong → fontSize.md (16) (ProGoalSetupScreen.js:614).
    - (Dropdown / SegmentedControl text — owned by those components — NOT DETERMINED IN THIS FILE.)
  - Touch targets:
    - weakPointChip: paddingHorizontal spacing.md (12), paddingVertical spacing.sm (8) (ProGoalSetupScreen.js:551-557) → likely < 44px. FLAG (no hitSlop).
    - protein phaseCard: padding spacing.lg (16) (ProGoalSetupScreen.js:573-578) → comfortably ≥ 44px tall.
    - saveBtn: paddingVertical spacing.lg (16) (ProGoalSetupScreen.js:609-612) → ≥ 44px.
    - BackHeader back chevron: 24px + hitSlop 12 (BackHeader.js:40-41) → ~48px.
    - Dropdown / SegmentedControl tap sizes — NOT DETERMINED IN THIS FILE.
  - Information density: High — the densest screen in this set (8 controls + 3 cards + 2 notes + save). spacing.xxl between sections keeps it legible but it is a long scroll.
  - Clean or cluttered: Clean per-element styling, but cumulatively heavy. Conditional weak-point block shifts layout.
  - Most important action prominence: Yes — filled amber "Rebuild my plan" at the bottom (ProGoalSetupScreen.js:609-612); disabled (surface2 fill) until canSave.
  - Device behaviour: ScrollView, keyboardShouldPersistTaps handled, paddingHorizontal spacing.lg, paddingTop spacing.xl, paddingBottom spacing.xxxl (ProGoalSetupScreen.js:330-334,529). phaseIconWrap fixed 40px (ProGoalSetupScreen.js:580-584); chips wrap. Text scales with larger-text token; long form means small devices scroll considerably. Adapts across sizes.


<!-- ==== phase1/07-nutrition-targets.md ==== -->

# Phase 1 — 07 Nutrition Targets cluster

Audited READ-ONLY 2026-06-13. Token values resolved against `src/styles/theme.js`.
Key tokens used below (theme.js): `fontSize.micro` 10 (L257), `fontSize.xs` 11 (L258),
`fontSize.sm` 13 (L259), `fontSize.md` 16 (L260), `fontSize.lg` 17 (L261),
`fontSize.xl` 20 (L262), `fontSize.xxl` 24 (L263), `fontSize.xxxl` 32 (L264),
`fontSize.display` 40 (L265). Type roles (theme.js):
`type.label` = sm 13 / medium (L402-405), `type.caption` = xs 11 / regular (L406-409),
`type.body` = md 16 / regular (L394-397), `type.bodyStrong` = md 16 / semibold (L398-401),
`type.title` = lg 17 / semibold (L390-393), `type.num('display')` = display 40 (L417-420).
Spacing: `spacing.lg` 16 (L235), `spacing.md` 12 (L234), `spacing.sm` 8 (L233).

---

SCREEN: Nutrition Targets (src/screens/NutritionTargetsScreen.js)

WHAT IT IS: A long single-scroll Pro screen that takes the user's body stats,
activity, goal/phase and protein approach, then computes and displays daily
calorie + macro targets with a detailed "why" breakdown and per-meal protein
distribution guidance. It is the entry point to the nutrition layer.

WHAT IS ON IT:
- Page title "Nutrition Targets" + inline InfoTooltip (size 14) explaining how
  calories/macros are calculated (NutritionTargetsScreen.js:471-485).
- Page subtitle "Calculate your personalised daily calorie and protein targets."
  (L487-489).
- Education card: book icon, "New to calories and macros?" title, "5-minute guide…"
  body, chevron-forward; taps to NutritionEducation (L493-508).
- When form is OPEN (`!formCollapsed`, L510):
  - Section "About you" (L515).
  - Biological sex pill group Male/Female (L518-525).
  - Age numeric input, placeholder "e.g. 28", maxLength 3 (L528-540).
  - Height: feet input (placeholder "5") + "ft" label, inches input (placeholder
    "10") + "in" label (L543-573).
  - Current weight (kg) input, placeholder "e.g. 82" (L576-588).
  - Body fat % input (optional), placeholder "e.g. 15" (L591-603).
  - Body fat source pill group Visual/BIA/Caliper/DEXA, only shown when BF entered
    (L606-615).
  - Section "Activity & training" → Activity level pill group Sedentary/Light/
    Moderate/Active/Very Active (L619-628).
  - Section "Goal & phase" → 2-column goal grid: Build muscle (slow) +10% surplus,
    Build muscle (fast) +17% surplus, Maintain weight 0%, Hold muscle lose fat −5%,
    Lose weight (steady) −13%, Lose weight (fast) −22%; the fast cut is hidden when
    calm/wellbeing mode is on (L634-663, GOALS L80-87).
  - Section "Protein target" → InfoTooltip (size 12) + note text; four approach
    cards Standard/Optimised(Recommended badge)/Advanced/Custom each with label,
    range, description; Custom reveals a g/kg numeric input when active
    (L667-728).
  - GDPR consent card: lock icon, "Your body data is stored only on this device…"
    text, and a checkbox row "I consent to storing this data on my device"
    (L732-754).
  - "Calculate targets" button (calculator icon, disabled until form complete)
    (L777-795).
- When form is COLLAPSED (`formCollapsed`, L758): a one-line summary row
  (nutrition icon + "Male · 28yrs · 5ft 10in · 82kg · <phase>") and an "Adjust"
  pill button (settings icon) that reopens the form (L758-773).
- RESULTS (when `results`, L799):
  - Hero card: "Daily Energy Target", big kcal value, "Estimated range: X – Y kcal"
    (L804-819).
  - Macro row: three cards Protein/Carbs/Fat showing grams; protein also shows
    g/kg or g/kg lean (L822-832, MacroCard L138-154).
  - Per-meal protein card (only when proteinG>0): "PER MEAL" heading + InfoTooltip,
    big "Ng" per-meal value, "protein per meal", a row of dots (one per meal),
    a 3/4/5/6 chip selector with a recommended dot, caption "Recommended for your
    protein target", and an optional warning hint when a sub-optimal count is
    chosen (L839-927).
  - "Why these numbers for you?" collapsible card (default expanded): four
    WhySections — Calories, Protein, Fat, Carbs — each with icon + title + long
    goal-aware body paragraph (L930-1043).
  - Phase card: phase title + phase description (L1046-1055).
  - Confidence card: icon + "High/Medium/Low confidence…" text, when available
    (L1058-1069).
  - Warning banners array, when present (L1072-1077).
  - "How was this calculated?" collapsible: rows for Formula, Resting calorie burn,
    Maintenance calories, Phase adjustment, Projected weekly change, Macro method
    (Protein basis, Fat, Carbs) and an italic medical disclaimer (L1080-1141).
  - "Recalculate" button (L1144-1151).

NAVIGATION: Registered as route name "NutritionTargets" in the ProfileStack
(RootNavigator.js:384, inside the ProfileStack defined L364), wrapped as
`GatedNutritionTargets` with header title "Nutrition Targets". Reached from
YouScreen.js:140 and WeeklyCheckInScreen.js:821 via
`navigation.navigate('NutritionTargets')`. It pushes onward to NutritionEducation
(L495 `navigation.navigate('NutritionEducation')`).

GATING: Pro. Guarded by `withProGuard(NutritionTargetsScreen, 'Nutrition targets')`
(RootNavigator.js:150), registered as the gated component at RootNavigator.js:384.
The screen itself has no in-component tier check.

CURRENT STRENGTHS:
- Comprehensive: the "Why these numbers" section is genuinely educational and
  goal-aware (separate copy for gain/cut/recomp/maintain, L958-1018).
- Form prefills from saved body profile, weight, body composition and training
  days so users rarely re-enter stats (L296-340).
- Progressive disclosure: form collapses to a summary once targets exist
  (L758-773), keeping the results prominent on return.
- Per-meal protein distribution adds real coaching value with the 0.4–0.55 g/kg
  MPS window logic (L221-228, L839-927).
- Robust against partial DB records via `hydrateLoadedTargets` (L34-62) and
  defensive derivation of kcal range (L804-807).

CURRENT WEAKNESSES:
- Very long and dense for one scroll: form + results + two collapsibles + per-meal
  card + phase/confidence/warnings all stack vertically. High cognitive load.
- "Why these numbers" defaults to EXPANDED (`whyExpanded` initial true, L201),
  so a returning user lands on four long paragraphs before the controls.
- Two separate InfoTooltips plus an approach note plus per-meal tooltip is a lot
  of explanatory text competing with the inputs.
- Goal labels and detail percentages (e.g. "+17% surplus") are jargon-adjacent
  with no inline plain explanation until results render (L80-87).
- The collapsed summary line can be truncated to one line on small phones
  (`numberOfLines={1}`, L762).

NEWBIE QUESTION: Partially. The education card (L493-508) and the goal labels
("Build muscle (slow)", "Lose weight (steady)") are friendly, and the calorie
InfoTooltip is plain-English. But a first-timer faces a long form (body fat %,
BF source, activity level, four protein approaches with g/kg ranges) that is
intimidating; the protein-approach section in particular (Standard/Optimised/
Advanced/Custom, g/kg) is expert framing (L667-728).

ATHLETE QUESTION: Largely yes. Body-fat source selection feeding a lean-mass
formula, protein on bodyweight vs LBM basis, per-meal MPS-window splitting, custom
g/kg protein, and the detailed "How was this calculated?" breakdown
(L1093-1141) all serve an experienced competitor. Contest-prep phase copy exists
(PHASE_DESCRIPTIONS L96) though contest_prep is not a selectable goal in the GOALS
grid (L80-87) — it can only arrive from a loaded target.

LOCATION QUESTION: Plausible but slightly buried. It lives in the ProfileStack
(RootNavigator.js:384) and is reached from the You tab and the weekly check-in,
not from the Diary/nutrition surface where meal plans and insights live (those are
in DiaryStack). A user thinking about food would not obviously find targets under
"You".

VISUAL + USABILITY:
- Font sizes (resolved):
  - pageTitle: `fontSize.xxxl` (32) / black (L1174-1179).
  - pageSubtitle: `fontSize.sm` (13) (L1184-1189).
  - eduTitle: `type.label` (13) (L1182); eduBody: `fontSize.xs` (11) (L1183).
  - sectionHeading: `type.label` (13) (L1193-1197).
  - fieldLabel: `type.label` (13) (L1204-1207).
  - numInput: `type.body` (16) (L1212-1223).
  - pillText: `type.label` (13) (L1257-1260).
  - goalLabel: `type.label` (13); goalDetail: `type.caption` (11) (L1289-1299).
  - heroLabel: `type.label` (13); heroKcal: `type.num('display')` (40);
    heroRange: `fontSize.sm` (13) (L1390-1401).
  - macroGrams: `fontSize.xl` (20) / black; macroLabel: `fontSize.xs` (11);
    macroPerKg: `type.caption` (11) (L1417-1432).
  - perMealHeading: `fontSize.xs` (11) / black; perMealValue: `fontSize.xxxl` (32)
    / black; perMealUnit: `fontSize.xs` (11) (L1449-1470).
  - mealCountRecCaptionDot: `fontSize.micro` (10) (L1535-1538).
  - whyHeaderLabel: `type.bodyStrong` (16); whySectionTitle: `fontSize.sm` (13);
    whySectionBody: `fontSize.sm` (13) (L1813-1848).
  - calcKey: `fontSize.sm` (13); calcValue: `type.label` (13) (L1634-1641).
  - disclaimer: `fontSize.xs` (11) italic (L1642-1651).
  - recommendedBadgeText: `fontSize.micro` (10) (L1760-1764).
  - calcBtnText: `type.title` (17) (L1366-1369).
- Touch targets:
  - Pills: paddingVertical `spacing.sm` 8 + label line — height ≈ 8+8+~16 ≈ 32px
    vertical; **below 44px** (pill style L1245-1252). No hitSlop.
  - Goal cards: width 47%, padding `spacing.md` 12, multi-line content — adequate
    height (L1273-1281).
  - Approach cards: padding `spacing.md` 12, multi-line — adequate (L1718-1724).
  - Consent checkbox: 22×22 box but inside a `consentRow` TouchableOpacity that
    includes the label (L738-752, checkbox L1330-1339) — full row is tappable, OK.
  - meal-count chips: explicit **44×44** (L1499-1509) — meets 44px.
  - "Adjust" reconfigure button: paddingVertical `spacing.xs` 4 + xs text — **well
    below 44px** (L1688-1698).
  - Calculate button: paddingVertical `spacing.lg` 16 + 17px text — comfortably
    ≥44px (L1352-1360).
  - InfoTooltip touch target: **NOT DETERMINED IN CODE** (component not read;
    only `size` prop passed).
- Information density: High. A complete results state renders hero + 3 macro cards
  + per-meal card + 4-section why card + phase + confidence + warnings + an
  expandable calc table + recalculate, all in one ScrollView.
- Clean or cluttered: Leans cluttered in the results state due to the volume of
  explanatory prose; the form state is reasonably clean and well-sectioned.
- Most important action prominence: In the form state the amber "Calculate targets"
  full-width button is the clear primary (L777-795). In results, the hero kcal at
  display 40 / amber is correctly the most prominent element (L1394-1397).
- Small/standard/large behaviour: Whole screen is a ScrollView with
  KeyboardAvoidingView (L461-469), so it scrolls on all sizes. Goal grid uses
  width '47%' so it reflows by percentage. The collapsed summary uses
  `numberOfLines={1}` (L762) and will truncate sooner on a 5.4". Fixed lineHeights
  in `type.*` roles scale with the larger-text fontSize swap (theme.js L373-410).
  No fixed pixel heights that would clip content.

---

SCREEN: Nutrition Education / "Nutrition basics" (src/screens/NutritionEducationScreen.js)

WHAT IT IS: A static, read-only 5-minute explainer for someone who has never
tracked calories or macros — what calories and the three macros are, how phases
work, how to track, adherence over perfection, and that the coach does the
adjustments.

WHAT IS ON IT:
- BackHeader titled "Nutrition basics" (L20).
- Intro paragraph (L23-27).
- Section 1 "Calories. Your energy budget" (flame icon): two body paragraphs,
  a KeyPoint "Trend over weeks > perfection on any day", another body, a KeyPoint
  about Volyume never adding exercise calories back (L29-53).
- Section 2 "The three macros" (restaurant icon): intro body + three MacroLines —
  Protein 4 kcal/g, Fat 9 kcal/g, Carbs 4 kcal/g — each with role text (L55-81).
- Section 3 "How to set your numbers" (podium icon): body + four PhaseLines (Cut,
  Maintain, Lean gain, Bulk) with rate + gist, then a KeyPoint about logging
  weight + check-in (L83-101).
- Section 4 "How to actually track" (scale icon): body + three lettered BulletRows
  A/B/C (log in app, weigh protein eyeball rest, repeat meals) (L103-132).
- Section 5 "Adherence beats perfection" (check-circle icon): body + KeyPoint
  about not doubling up after a missed day (L134-148).
- Section 6 "The coach does the adjustments" (trending-up icon): two bodies (5%
  cap, 2-week cooldown) + a KeyPoint (L150-173).
- Footer italic line about estimates and the 2–4 week trend (L180-183).

NAVIGATION: Route name "NutritionEducation". Registered TWICE: in ProfileStack
(RootNavigator.js:385, `headerShown: false`) and in ProOnboardingStack
(RootNavigator.js:509). Reached from NutritionTargetsScreen.js:495 and
ProSetupCompleteScreen.js:217 via `navigation.navigate('NutritionEducation')`.
It is a leaf screen — the only navigation out is BackHeader's back action
(L20; BackHeader.js:37).

GATING: Effectively free at the component level — there is NO `withProGuard`,
`ProGate`, or tier check on this screen (registered un-gated at RootNavigator.js:385
and :509). Its primary entry point (NutritionTargets) is Pro-gated, but the
ProOnboardingStack registration (L509) is not, so it can be reached during
onboarding without a Pro check in this file.

CURRENT STRENGTHS:
- Clear, friendly, plain-English; British spelling throughout.
- Well-structured with consistent Section/Body/KeyPoint/MacroLine/PhaseLine
  building blocks (L191-256), giving uniform rhythm.
- Honest framing (adherence over perfection; never adds exercise calories back,
  L48-52) aligns with the app's coaching philosophy.
- `accessibilityRole="header"` on section titles (L198) aids screen readers.
- Self-contained read-only content — no data dependencies, cannot error.

CURRENT WEAKNESSES:
- No call-to-action at the end; the footer is a dead end (L180-183) — no "set your
  targets" button to convert the lesson into action.
- Six sections of prose is long for a "5-minute" promise; all expanded at once,
  no collapsing.
- The two duplicate route registrations (L385, L509) are easy to let drift.

NEWBIE QUESTION: Yes — this is explicitly written for the first-time gym-goer and
succeeds. Energy budget, the three macros with kcal/g, hand-portion estimates
(palm of chicken, cupped hand of rice) and the "trend over weeks" message are all
beginner-friendly (L34-148).

ATHLETE QUESTION: Mostly not aimed at them, and that is fine — it is intentionally
the beginner primer. An experienced competitor would find it too basic, but it is
not where they would be sent. The phase rates (Cut 0.5–1%/wk, Lean gain
0.25–0.5%/wk, L92-95) are accurate enough to not mislead an athlete who reads it.

LOCATION QUESTION: Right place as a child of NutritionTargets and of the Pro
onboarding hand-off (ProSetupCompleteScreen.js:217). Reachable exactly when a new
user is about to face the numbers. Reasonable.

VISUAL + USABILITY:
- Font sizes (resolved):
  - BackHeader title: `fontSize.lg` (17) / semibold (BackHeader.js:59-66).
  - intro: `fontSize.md` (16) (L265).
  - sectionTitle: `type.title` (17) (L270).
  - body: `fontSize.sm` (13) (L273).
  - strong: inherits sm 13 / bold (L274).
  - keypointText: `fontSize.sm` (13) / medium (L277).
  - macroName: `type.bodyStrong` (16); macroKcal: `fontSize.xs` (11);
    macroRole: `fontSize.sm` (13) (L282-284).
  - phaseName: `type.bodyStrong` (16); phaseRate: `fontSize.xs` (11);
    phaseGist: `fontSize.sm` (13) (L288-290).
  - bulletChipText: `fontSize.xs` (11) (L294).
  - footer: `fontSize.xs` (11) italic (L296).
- Touch targets: Only one interactive element — the BackHeader back chevron, with
  `hitSlop` {12,12,12,12} on a 24px icon → effective ~48px (BackHeader.js:25,40-42).
  Meets 44px. No other tappable elements on this screen.
- Information density: Moderate-to-high (six cards of prose), but spaced with
  `spacing.lg` 16 gaps (L263) and card padding, so it reads as airy rather than
  cramped.
- Clean or cluttered: Clean. Consistent card system, generous spacing.
- Most important action prominence: There is no action — it is a reading screen.
  This is itself a weakness (no CTA to proceed).
- Small/standard/large behaviour: Single ScrollView (L22) with
  `showsVerticalScrollIndicator={false}`. All text uses theme tokens with
  hardcoded `lineHeight` values (e.g. body lineHeight 21 at L273) that do NOT scale
  with the larger-text fontSize swap, so at the in-app Larger Text setting the
  font grows but line height stays fixed — risk of crowding on the body/role text.
  No fixed heights that clip.

---

SCREEN: Meal plan (src/screens/MealPlanScreen.js)

WHAT IT IS: A Pro screen that renders an engine-generated 7-day meal plan (abstract
Day 1..7, not calendar-anchored) with progressive disclosure: calm per-meal view
first, with deeper grams/macros and day totals on tap. The screen never computes
nutrition — it renders what the engine assembled and persists edits through the
service (file header L1-15).

WHAT IS ON IT:
- BackHeader "Meal plan" (L332).
- Loading state: centred ActivityIndicator (L333-334).
- Empty state (no plan): restaurant icon, "Your plate, sorted." title, body copy,
  "Plan my week" button (L335-344).
- Plan state (ScrollView, L346):
  - Day picker: a row of day buttons 1..7 each with a number and a dot (amber dot
    = training day) (L348-366).
  - Day header: a type chip ("Training day"/"Rest day") and the day's kcal vs
    target ("X kcal of Y") (L369-379).
  - "Training today?" PrefRow radio (Training/Rest), re-variants this day
    (L383-392).
  - Cycle note ("Training days carry more carbs; rest days fewer. Protein never
    moves.") when cycling is on (L393-397).
  - Honesty line (italic) when the day is outside tolerance (L398).
  - Meal cards per slot: slot label + kcal, meal name; expandable to show item
    rows ("X g <food>", tap to swap a food, long-press to leave out for good),
    a "P/C/F g" macro line, and a "Swap" button per plate (L401-456).
  - Day totals row: "Day" + "X kcal · P · C · F" (L459-466).
  - Preferences collapsible (options icon): four PrefRows — Meals a day (3/4/5/6),
    Variety (Repeat/Mixed/Varied), Rest-day fat (Even/Higher), Workout meals
    (Off/Pre·post) (L468-521).
  - "Log this day" primary button, "New meals" secondary button, and a foot note
    "Built from your targets…" (L523-527).
- Meal-swap BottomSheet: "Swap this meal" title + sub, a scrollable list with the
  closest match first (tagged "Closest match", highlighted) then alternatives, each
  row showing name + "X kcal · P g" (L534-574).

NAVIGATION: Route name "MealPlan" in DiaryStack (RootNavigator.js:227, inside
DiaryStack defined L217), `headerShown: false`. Reached from DiaryScreen.js:582
via `onPlanDay={() => navigation.navigate('MealPlan')}`. Back returns to Diary
(L332 `onBack={() => navigation.goBack()}`).

GATING: Pro. It lives inside DiaryStack, whose root `Diary` is
`withProGuard(DiaryScreen, 'Food diary')` (RootNavigator.js:160, :225). MealPlan
itself is registered WITHOUT its own guard (L226-230); the file header asserts it
"lives inside the gated Diary stack" (L13). So gating is by-stack, not by an
explicit guard on this screen — reaching it requires passing through the gated
Diary root.

CURRENT STRENGTHS:
- Genuine progressive disclosure: calm calories-first plates, macros and grams a
  tap deeper (header L4-13), matching a clear two-persona design intent.
- Strong accessibility labelling throughout (tablist/tab on day picker L348-359,
  radiogroup/radio on PrefRow L67-79, descriptive labels on plates L409 and items
  L431).
- Honest residual line when a constrained day cannot hit target exactly
  (L325-328, L398) — does not fake precision.
- Rich swap UX: whole-meal swap sheet with a generous alternatives pool plus
  per-food swap and "never show this again" exclusion (L192-301).
- Never computes nutrition itself — re-totals via `sumDayTotals` mirroring the
  assembler's rounding (L53-60), respecting the engine boundary.

CURRENT WEAKNESSES:
- Heavy interaction model: a plate supports tap-to-expand, tap-an-item-to-swap-food,
  long-press-to-exclude, and a separate Swap button — discoverability of the
  long-press exclusion is low (only surfaced in the a11y label, L431).
- The day picker shows abstract "1..7" with a small dot legend that is never
  explained on-screen (only in a11y labels, L359-362); the training/rest meaning
  of the dot colour is implicit.
- Two full-width buttons stacked ("Log this day", "New meals") plus a foot note at
  the bottom of a long scroll — primary action ("Log this day") is below the fold
  on a populated plan.
- Preferences regenerate the whole plan on every change (L305-318), which can feel
  heavy/destructive to a user who tweaked individual plates.

NEWBIE QUESTION: Mostly yes for the calm top layer — "Training day", a meal name,
its calories, and "Log this day" are understandable. But the abstract Day 1..7
picker (no weekday/today anchor, L42-44) and the unexplained training-dot legend
could confuse a first-timer expecting "today". The deeper grams/P·C·F line is
opt-in, so it does not overwhelm.

ATHLETE QUESTION: Yes. Per-day training/rest variant control, carb-cycling note,
rest-day fat convention, peri-workout (pre/post) meal slots, per-food same-role
macro-held swaps, and exact P/C/F totals vs target (L438-466, L500-519) give an
experienced competitor real control while keeping protein fixed.

LOCATION QUESTION: Right place. It is a child of the Diary (DiaryScreen.js:582)
inside the gated Diary stack, exactly where food/nutrition execution lives. Sits
correctly alongside the food diary and insights.

VISUAL + USABILITY:
- Font sizes (resolved):
  - BackHeader title: `fontSize.lg` (17) / semibold (BackHeader.js:59-66).
  - emptyTitle: `fontSize.xl` (20) / bold; emptyBody: `fontSize.md` (16)
    (L583-584).
  - dayLetter: `fontSize.sm` (13) / semibold (L589).
  - typeChipText: `fontSize.xs` (11) / semibold (L595).
  - dayKcal: `fontSize.lg` (17) / bold (tabular); dayKcalTarget: `fontSize.sm` (13)
    (L596-597).
  - cycleNote: `fontSize.sm` (13); honesty: `fontSize.sm` (13) italic (L598-599).
  - mealSlot: `fontSize.xs` (11) / semibold uppercase; mealKcal: `fontSize.sm` (13);
    mealName: `fontSize.md` (16) / semibold (L602-604).
  - itemLine: `fontSize.sm` (13); macroLine: `fontSize.sm` (13) (L607-608).
  - swapText: `fontSize.sm` (13) / semibold (L610).
  - totalsLabel / totalsText: `fontSize.sm` (13) (L612-613).
  - footNote: `fontSize.xs` (11) (L614).
  - prefsToggleText: `fontSize.sm` (13); prefLabel: `fontSize.xs` (11) uppercase;
    prefOptText: `fontSize.sm` (13) (L616-623).
  - swapSheetTitle: `fontSize.lg` (17) / bold; swapSheetSub: `fontSize.sm` (13)
    (L625-626).
  - swapOptionName: `fontSize.md` (16); swapOptionTag: `fontSize.xs` (11);
    swapOptionMacros: `fontSize.sm` (13) (L635-637).
- Touch targets (theme `hitSlop` = {12,12,12,12}, theme.js L423, applied widely):
  - Day buttons: paddingVertical `spacing.sm` 8, minWidth 36, + hitSlop (L357,
    L587). Visible height ~30px but hitSlop extends tappable area to ~54px. Visible
    box **below 44px**, mitigated by hitSlop.
  - PrefRow option chips: minHeight 40 + hitSlop (L621, L77). Visible **below 44px**
    (40) but hitSlop covers it.
  - Swap button (per plate): minHeight 44 + hitSlop (L609, L447). Meets 44px.
  - Item rows: minHeight 28 + hitSlop (L606, L429). Visible **below 44px** (28),
    hitSlop extends it.
  - Plate expand TouchableOpacity (L405): no explicit minHeight; wraps multi-line
    head + name, so effectively tall enough.
  - prefsToggle: minHeight 44 (L615). Meets.
  - swapOption rows: minHeight 56 (L631). Meets.
  - Empty-state "Plan my week", "Log this day", "New meals" use the shared Button
    component (L343, L523-524) — sizes **NOT DETERMINED IN CODE** (Button component
    not read).
- Information density: Low-to-moderate at the calm layer (a few plates, one line
  each); rises sharply when plates are expanded and preferences opened.
- Clean or cluttered: Clean by default thanks to the collapse-by-default design;
  can get busy once everything is expanded.
- Most important action prominence: The day's calories (dayKcal, lg 17 bold) lead
  visually at the top; "Log this day" is the primary Button but sits at the bottom
  of the scroll (L523). The most important action is not the most prominent element
  on a populated, scrolled plan.
- Small/standard/large behaviour: ScrollView for the plan body (L346) and for the
  swap sheet list (`swapList` maxHeight 360, L627). Day picker uses
  `justifyContent: 'space-between'` across 7 buttons (L586) — on a 5.4" the 7
  buttons with minWidth 36 may crowd. Fonts via tokens scale with larger-text;
  some inline lineHeights (e.g. 19) are fixed and won't scale.

---

SCREEN: Food Insights / "Insights" (src/screens/FoodInsightsScreen.js)

WHAT IT IS: A Pro screen showing 7-day food adherence: a horizontal bar chart of
daily calories vs target, a macro hit-rate summary over those seven days, and a
"Export 7 days as CSV" action (file header L1-15).

WHAT IS ON IT:
- Custom header row: a close (X) icon button, centred title "Insights", and a 24px
  spacer (L128-134).
- Section label "LAST 7 DAYS · CALORIES" (L137).
- Calories Card: seven bar rows (weekday short label, a track with an amber fill
  that turns green when within 10% of target, and the kcal value); a footnote
  showing the target and "Bars within 10% turn green", or a fallback "Set your
  calorie target in Precision Coaching…" when no target (L138-174).
- Section label "MACRO ADHERENCE" (L176).
- Macro adherence Card: four AdherenceRows (Calories, Protein, Carbs, Fat) each a
  label + progress track + "hit/total"; a footnote "Out of N days logged. Hit =
  within target range."; or an empty "Log a few days…" message (L177-193).
- "Export 7 days as CSV" button (download icon; shows ActivityIndicator while
  exporting) (L195-211).

NAVIGATION: Route name "FoodInsights" in DiaryStack (RootNavigator.js:262, inside
DiaryStack L217), `headerShown: false`. Reached from DiaryScreen.js:530 via
`navigation.navigate('FoodInsights')`. Exits via the in-screen close (X) button
which calls `navigation.goBack()` (L129).

GATING: Pro by-stack. Inside DiaryStack whose root is
`withProGuard(DiaryScreen, 'Food diary')` (RootNavigator.js:160). FoodInsights is
registered without its own guard (L261-265); reaching it requires passing through
the gated Diary root. No in-component tier check.

CURRENT STRENGTHS:
- Focused and small: three clear blocks, easy to read at a glance.
- Reloads on focus via `useFocusEffect` (L77) so data is fresh each visit.
- Good accessibility: bar rows and adherence rows expose summarising
  `accessibilityLabel`s (L150-151, L225); the bar colour change is backed by the
  ", on target" label, not colour alone.
- Honest empty states for both no-target (L169-173) and no-logged-days (L189-191).
- CSV export gives competitors/coaches a real data-out path (L100-118).
- Uses `within()` tolerance helper consistently (kcal/protein 10%, carbs/fat 15%,
  L92-95, L217-220).

CURRENT WEAKNESSES:
- The file header itself flags this is surfaced via a Diary header button because
  the intended "Insights" tab "doesn't exist yet" (L10-13) — a temporary location.
- The calorie bar "within 10% turns green" is only explained in the footnote
  (L166-168); the green/amber distinction is otherwise unlabelled visually.
- No date range control — fixed to last 7 days (L42-47); no way to view a longer
  trend.
- Only kcal bars are charted; the macro block is just hit-counts, no per-day macro
  visualisation.
- The custom header (L128-134) is hand-rolled rather than the shared BackHeader,
  and uses a close (X) icon rather than a back chevron — inconsistent with sibling
  pushed screens.

NEWBIE QUESTION: Mostly yes. Bars of calories per day with a target footnote and
"X/7 days hit" are intuitive. The one stumbling point is the "within 10% turns
green" rule, which a newbie must read the footnote to understand, and the term
"adherence" itself is mildly technical.

ATHLETE QUESTION: Partially. A competitor gets a quick 7-day adherence read and a
CSV export, which is useful. But it is shallow for an athlete: only 7 days, no
longer trend, no per-day macro detail, no weight/trend correlation — they would
likely export to CSV and analyse elsewhere.

LOCATION QUESTION: Acceptable but admitted-temporary. It is correctly inside the
Diary/nutrition stack (RootNavigator.js:262) and reached from the Diary header
(DiaryScreen.js:530), but the file states it should eventually be its own Insights
tab (L10-13). For now, reasonable; long-term it is a stopgap placement.

VISUAL + USABILITY:
- Font sizes (resolved):
  - headerTitle: `type.title` (17) / semibold (L242).
  - sectionLabel: `fontSize.xs` (11) / bold, letterSpacing 1 (L245-248).
  - cardFootnote: `type.caption` (11) (L252).
  - emptyText: `fontSize.sm` (13) (L253).
  - barDay: `fontSize.sm` (13); barValue: `fontSize.sm` (13) (L256, L264).
  - adherenceLabel / adherenceValue: `fontSize.sm` (13) (L267, L275).
  - exportBtnText: `type.bodyStrong` (16) (L285).
- Touch targets:
  - Header close (X): 24px icon with `hitSlop={12}` → effective ~48px (L129).
    Meets 44px.
  - Export button: minHeight 48 + paddingVertical `spacing.lg` 16 (L277-284).
    Meets 44px.
  - Bar rows and adherence rows are `accessible` views, not interactive (no
    onPress), so no touch-target requirement (L147-152, L225).
- Information density: Low. Three compact blocks; very scannable.
- Clean or cluttered: Clean. Generous card spacing (`spacing.lg` gaps, L243, L251).
- Most important action prominence: The calorie bars (the screen's main value)
  lead the scroll; the amber full-width "Export 7 days as CSV" button is the only
  filled action and stands out appropriately at the bottom (L277-285).
- Small/standard/large behaviour: ScrollView (L136). Bar track is `flex: 1` with
  fixed-width day label (36) and value (56) columns (L256, L264), so it reflows by
  width across screen sizes. Bar/track heights are fixed px (track 12, adherence 8,
  L257-274) and do not scale with larger text, but they are decorative bars not
  text. Fonts via tokens scale with larger-text.

---


<!-- ==== phase1/08-food-logging.md ==== -->

# Phase 1 inventory — Food logging (08)

Volyume Ultimate Audit, 2026-06-13. READ-ONLY evidence inventory. Every claim cites `file:line`.
Theme tokens resolved against `src/styles/theme.js`.

Token reference used throughout (theme.js):
- `fontSize.micro` = 10 (theme.js:257), `fontSize.xs` = 11 (theme.js:258), `fontSize.sm` = 13 (theme.js:259),
  `fontSize.md` = 16 (theme.js:260), `fontSize.lg` = 17 (theme.js:261), `fontSize.xl` = 20 (theme.js:262),
  `fontSize.xxl` = 24 (theme.js:263), `fontSize.xxxl` = 32 (theme.js:264), `fontSize.display` = 40 (theme.js:265).
- `type.title` => fontSize.lg (17), semibold (theme.js:390-393).
- `type.body` => fontSize.md (16), regular (theme.js:394-397).
- `type.bodyStrong` => fontSize.md (16), semibold (theme.js:398-401).
- `type.label` => fontSize.sm (13), medium (theme.js:402-405).
- `type.caption` => fontSize.xs (11), regular (theme.js:406-409).
- `type.num(role)` => role's fontSize + tabular figures (theme.js:417-421).
- `spacing`: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (theme.js:228-239).
- `radius`: xs 4, sm 6, md 10, lg 14, xl 20, full 999 (theme.js:241-248).
- NOTE: every fontSize token is multiplied by 1.2 (rounded) when the Larger Text accessibility
  toggle is on (theme.js:325-337); px values below are the default (toggle off).

---

SCREEN: DiaryScreen
WHAT IT IS: The food diary, the home of the Diary tab. Shows one day's eating: a macro summary, meal sections you log food into, water, and tools to copy / move / save entries (DiaryScreen.js:1-11).
WHAT IS ON IT:
- ScreenHeader titled "Diary" (DiaryScreen.js:505).
- Day pager row (DiaryScreen.js:511-538): a "Today" pill that only shows when the viewed day is not today (DiaryScreen.js:513-517); chevron-back (size 22) "Previous day" (DiaryScreen.js:520-522); the day label, e.g. "Today"/"Yesterday"/"Tomorrow"/"Wed, 11 Jun" (DiaryScreen.js:523, label logic friendlyDate DiaryScreen.js:61-70); chevron-forward (size 22) "Next day" (DiaryScreen.js:524-526); a stats-chart-outline icon (size 22) opening FoodInsights ("View 7-day insights and export diary") (DiaryScreen.js:529-536).
- MacroRings summary, tappable to open the breakdown sheet when there are entries (DiaryScreen.js:540-547). Takes `rollup`, `effectiveTargets`, and a `dayTypeLabel` (DiaryScreen.js:541-545). dayTypeLabel resolves to "Refeed day" / "Training day" / "Rest day" / null (DiaryScreen.js:160-164).
- "Your trend" WeightTrendCard, only on today's view and only when there is data (DiaryScreen.js:549-555).
- One-time Open Food Facts consent card (only today, only after a barcode heal), with "Not now" and "Sharing settings" actions (DiaryScreen.js:557-576).
- Empty state EmptyDiary with onAdd / onCopyYesterday / onPlanDay when no entries (DiaryScreen.js:578-583).
- When entries exist: a list of MealSection cards (one per slot) with per-meal add, quick-add, edit, delete, and multi-select (DiaryScreen.js:586-601), plus an "Add meal" row to extend the ladder (DiaryScreen.js:602-612).
- WaterRow at the bottom: water icon, "Water" label, "{litres} / 3.0 L" value, minus and plus 250 ml buttons, and a progress track (DiaryScreen.js:616, 752-777). Daily target hardcoded at 3000 ml (DiaryScreen.js:750).
- Scan barcode FAB (bottom-right, 56x56, barcode-outline icon size 26), hidden during selection (DiaryScreen.js:647-657).
- Edit sheet (FoodDetailSheet, edit mode), QuickAdd sheet, MacroBreakdown sheet (DiaryScreen.js:619-643).
- Selection toolbar when multi-selecting: cancel (X), "{n} selected" count, and Move / To today / Save meal / Delete actions (DiaryScreen.js:659-684).
- "Move to" modal listing each meal slot (DiaryScreen.js:686-708); "Save as meal" modal with a name field (DiaryScreen.js:710-743).
- Pull-to-refresh on the ScrollView (DiaryScreen.js:503).
NAVIGATION: Registered as route "Diary" in the DiaryStack as the gated component GatedDiary, headerShown false (RootNavigator.js:225). DiaryStack is the "DiaryTab" tab (RootNavigator.js:447, tab title "Diary", restaurant icon RootNavigator.js:437). Reached by tapping the Diary tab. Pushes to: FoodSearch (addFood, DiaryScreen.js:229), MealPlan (empty state onPlanDay, DiaryScreen.js:582), ScanBarcode (FAB, DiaryScreen.js:650), FoodInsights (insights icon, DiaryScreen.js:530), SettingsPrivacy (OFF card, DiaryScreen.js:567).
GATING: PRO. Wrapped in `withProGuard(DiaryScreen, 'Food diary')` as GatedDiary (RootNavigator.js:160), registered at RootNavigator.js:225. CLAUDE.md confirms the food diary is a Pro feature; gating the Diary tab root covers the food sub-screens reached only from it (RootNavigator.js:156-159).
CURRENT STRENGTHS:
- A complete day view: macro summary, meal sections, water, and trend in one scroll (DiaryScreen.js:498-617).
- Strong power-user tooling: swipe-delete (requestDelete, DiaryScreen.js:433-454), multi-select with Move/Copy-to-today/Save-as-meal/Delete (DiaryScreen.js:659-684), copy yesterday (DiaryScreen.js:459-496), flexible numbered meal ladder honouring meals-per-day preference (DiaryScreen.js:194-220).
- All destructive actions confirm via appAlert (DiaryScreen.js:300-320, 433-454).
- Most interactive icons carry accessibilityLabel and 12px hitSlop (DiaryScreen.js:514, 520, 524, 531).
CURRENT WEAKNESSES:
- High information density on a populated day: header, day pager, macro rings, trend card, possible OFF card, N meal sections, add-meal row, water row, plus a floating FAB (DiaryScreen.js:498-657). A lot competing at once.
- Two different "add food" entry points with different reach: the per-meal add inside MealSection vs the barcode FAB. There is no single prominent primary "log food" action at the diary level — the most prominent floating control is Scan barcode (DiaryScreen.js:647-657), not search-add.
- The water target is hardcoded at 3000 ml with no per-user setting (DiaryScreen.js:750, acknowledged as a follow-up).
- offCardText uses a hardcoded lineHeight: 18 (DiaryScreen.js:872) and offCard copy is dense.
NEWBIE QUESTION: Partially. The day pager, meal cards and "Add" affordances are conventional and the empty state guides first use (EmptyDiary, DiaryScreen.js:578-583). But the floating barcode FAB as the single most prominent action may mislead a beginner into thinking scanning is the main path rather than search; and "meal slots" / numbered meals and the macro rings assume the user already knows what macros are.
ATHLETE QUESTION: Largely yes. Carb-cycle training/rest-day targets and refeed-day handling (DiaryScreen.js:143-164), per-meal breakdown, save-as-meal and copy-yesterday all serve a competitor who logs repeatedly. The hardcoded 3 L water target and the absence of a quick total-vs-target glance beyond the rings are minor gaps.
LOCATION QUESTION: Yes. It is the root of the Diary tab (RootNavigator.js:225, 447), which is the correct home for daily food logging, and it owns the sub-screens it pushes to.
VISUAL + USABILITY:
- Font sizes:
  - "Diary" header: rendered by ScreenHeader (not in this file); see ScreenHeader note below.
  - Day label: `type.title` => fontSize.lg (17), semibold (DiaryScreen.js:855, theme.js:390).
  - "Today" pill text: `type.label` => fontSize.sm (13) (DiaryScreen.js:860).
  - OFF card body / dismiss / CTA: fontSize.sm (13) (DiaryScreen.js:872, 874-875).
  - "Add meal" label: `type.label` => fontSize.sm (13) (DiaryScreen.js:881).
  - Water label: fontSize.md (16), medium (DiaryScreen.js:892).
  - Water value: fontSize.sm (13), tabular (DiaryScreen.js:893).
  - Selection count: `type.bodyStrong` => fontSize.md (16) (DiaryScreen.js:800).
  - Selection action labels: fontSize.xs (11), medium (DiaryScreen.js:803).
  - Move modal title: fontSize.xs (11), bold, uppercase (DiaryScreen.js:816-817).
  - Move option text: fontSize.md (16), medium (DiaryScreen.js:824).
  - Save-meal hint: fontSize.sm (13) (DiaryScreen.js:826); input fontSize.md (16) (DiaryScreen.js:833).
- Touch targets:
  - Day pager chevrons + today pill + insights icon: rely on hitSlop 12; the icon-only ones (chevrons, insights) have no explicit width/height, so the target is icon (22) + 12 hitSlop each side ≈ 46px — borderline acceptable (DiaryScreen.js:514, 520-526, 529-536).
  - todayPill: paddingHorizontal md (12), paddingVertical xs (4) over `type.label` (13) text — height ≈ 13 + 8 ≈ 21px plus hitSlop 12 = adequate via hitSlop but the visible pill is short (DiaryScreen.js:856-858). FLAG: visible target < 44px, saved by hitSlop.
  - Scan FAB: 56x56 (DiaryScreen.js:783) — good.
  - Water +/- buttons: 36x36 with hitSlop 8 => ~52px effective (DiaryScreen.js:765-769, 895-898). Visible 36px < 44px, saved by hitSlop.
  - selCancel: 32x32 with hitSlop 10 (DiaryScreen.js:661, 799) => ~52px effective; visible < 44px.
  - selAction: minWidth 48, no explicit height (DiaryScreen.js:802) — width OK, height depends on icon (20) + label.
  - moveOption: minHeight 48 (DiaryScreen.js:821) — good.
  - addMealRow: minHeight 44 (DiaryScreen.js:878) — meets bar exactly.
- Information density: High on a populated day (see weaknesses). Low/clean on the empty day (single EmptyDiary block + water + FAB).
- Clean vs cluttered: Generally clean cards but many stacked sections; the always-present FAB overlaps the bottom of the scroll content.
- Most important action prominence: The Scan barcode FAB is the most visually prominent control (amber 56px, shadow.lg) (DiaryScreen.js:781-787); the more common search-add lives quieter inside each MealSection. Arguably the prominence is on the wrong action.
- Device behaviour: Whole screen is a ScrollView (DiaryScreen.js:500) so content reflows on small/large phones. dateLabel has fixed minWidth 96 and dayPagerSide minWidth 72 (DiaryScreen.js:849, 855) — fixed, but small. moveCard maxWidth 320 (DiaryScreen.js:810). FAB position is spacing-based (DiaryScreen.js:782) so it scales. No fixed-height content list; scales well.

DiaryScreen — EXACT TAP COUNT TO LOG ONE FOOD ITEM (search flow, the primary path):
Flow cited end to end:
1. TAP 1 — On a meal card, tap "Add" (MealSection onAdd) which calls addFood(slot) → navigation.navigate('FoodSearch', { mealSlot, entryDate }) (DiaryScreen.js:591, 226-230). [On an EMPTY day this is the EmptyDiary "onAdd" button instead → addFood('meal_1') (DiaryScreen.js:580).]
2. TAP 2 — In FoodSearch, tap a food row → onPress={() => openPicker(food)} opens the FoodDetailSheet (FoodSearchScreen.js:478, 228-230). (Assumes the desired food is already visible in the default Recents/list; if not, typing a query is additional taps + keystrokes — see note.)
3. TAP 3 — In the FoodDetailSheet, tap "Add to diary" → onSave=confirmLog, which writes the entry via logFoodEntry and calls navigation.goBack() to the diary (FoodDetailSheet.js:169-177, 174-175; FoodSearchScreen.js:336-375, 358-374).
=> MINIMUM 3 TAPS to log one already-visible food at its default serving (meal "Add" → food row → "Add to diary").
Variants:
- Faster "plate" path: tap a row's + (addToPlate, FoodSearchScreen.js:480, 234-248) then tap "Log 1" in the plate bar (FoodSearchScreen.js:678-685, logPlate FoodSearchScreen.js:257-306). That is also 3 taps from the diary (meal Add → row + → Log 1) but skips the serving sheet, logging the default serving.
- If the food is not in the default list, add a TAP to focus the search box plus typed keystrokes before TAP 2 (search box FoodSearchScreen.js:630-639; 2+ char query gate FoodSearchScreen.js:209).
- Quick add (no food): meal card quick-add (DiaryScreen.js:592) → QuickAddSheet save (DiaryScreen.js:631-636) = 2 taps + numeric entry.

---

SCREEN: FoodSearchScreen
WHAT IT IS: The food picker, presented as a modal between the diary "Add food" tap and the actual log write. Browse tabs (Recents/Suggested/Favourites/Frequents/Custom) plus a debounced waterfall search; tap a food to open a serving sheet, or use the multi-add "plate" (FoodSearchScreen.js:1-18).
WHAT IS ON IT:
- Header: close (X, size 24), title "Add to {meal label}", a flash-outline "Quick add calories" icon (size 23) and a barcode-outline "Scan a barcode" icon (size 24) (FoodSearchScreen.js:575-603).
- Horizontal tab strip from SEARCH_TABS with an active underline (FoodSearchScreen.js:605-624).
- Search box "Search foods or brands" with a search icon and an inline spinner while searching (FoodSearchScreen.js:628-641); hidden on the Suggested tab (FoodSearchScreen.js:626).
- Results / browse FlatList of FoodRow items; on the Custom tab, CTA rows "New custom food", "My recipes", "My meals" (FoodSearchScreen.js:438-449, 451-483).
- Suggested tab: curated meal cards showing name and "kcal · protein · carbs · fat", with a per-meal sizing hint, skeletons while loading, and empty/no-targets states (FoodSearchScreen.js:512-571).
- Empty/no-match states with a "Create a custom food" button, and a footer "Create a custom food" button when there are results (FoodSearchScreen.js:485-510, 650-662).
- Plate bar (when items on the plate): "{n} on the plate", "~{kcal} kcal · tap to review", and a "Log {n}" button (FoodSearchScreen.js:667-687).
- Plate review modal: list of plate items with per-item remove, a "Clear" button and a wide "Log {n} to {meal}" button (FoodSearchScreen.js:689-731).
- FoodDetailSheet (add mode) and QuickAddSheet (FoodSearchScreen.js:733-752).
NAVIGATION: Route "FoodSearch" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:231-235). Reached from DiaryScreen addFood (DiaryScreen.js:229), from RecipeBuilder onPickIngredient with pickMode 'recipe' (RecipeBuilderScreen.js:118-124), and via AddCustomFood's "Log that instead" dupe path navigation.replace('FoodSearch', ...) (AddCustomFoodScreen.js:218). Pushes to: ScanBarcode (FoodSearchScreen.js:595), AddCustomFood (newCustomFood/gotoCustomReplace, FoodSearchScreen.js:424-429), MyMeals and MyRecipes (CTA rows, FoodSearchScreen.js:458-459). On log it calls navigation.goBack() (FoodSearchScreen.js:289, 374); in recipe pick mode it navigates back to the returnTo screen (FoodSearchScreen.js:341-350).
GATING: PRO (inherited). It lives only inside DiaryStack (RootNavigator.js:231), whose root is Pro-gated; per the navigator comment the food sub-screens are reached only from the gated Diary tab (RootNavigator.js:156-159). No own guard.
CURRENT STRENGTHS:
- Multiple fast paths: browse tabs, search, multi-add plate, quick add, scan, and curated suggestions sized to remaining macros (FoodSearchScreen.js:155-195, 234-306).
- Search is debounced (250ms) with a local-first waterfall and a 2-char gate, avoiding thrash (FoodSearchScreen.js:206-226).
- Double-log guard on the plate (loggingPlateRef) and honest partial-failure messaging (FoodSearchScreen.js:259-305).
- Long-press cycles favourite/dislike with toast feedback (FoodSearchScreen.js:396-419).
CURRENT WEAKNESSES:
- Five browse tabs plus a search box plus two header icons is a lot of choice for a "pick a food" sheet (FoodSearchScreen.js:575-624).
- Two parallel add mechanisms on each row (tap row = sheet; tap + = plate) are easy to confuse; the difference is only discoverable by trying (FoodSearchScreen.js:474-482).
- The "Create a custom food" affordance appears in three places (empty, no-match, footer) (FoodSearchScreen.js:492-499, 652-660).
- gotoCustomReplace uses navigation.replace, so Back from the custom-food screen lands on the Diary rather than back on search (FoodSearchScreen.js:424-426) — intentional per comment but a surprise.
NEWBIE QUESTION: Partially. "Search foods or brands" and tapping a result are clear, but the tab names (Recents/Suggested/Favourites/Frequents/Custom) and the tap-row-vs-tap-plus distinction are not obvious to a first-timer.
ATHLETE QUESTION: Yes. Frequents, favourites, slot-aware recents that pre-fill the last portion (FoodSearchScreen.js:104-114, 737), and the multi-add plate make repeat logging fast for a heavy user.
LOCATION QUESTION: Yes. A modal sitting between the diary add tap and the write is the right place; it is also correctly reused by RecipeBuilder in pick mode (RecipeBuilderScreen.js:118-124).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (FoodSearchScreen.js:765).
  - Tab labels: fontSize.sm (13), medium/semibold active (FoodSearchScreen.js:784, 788).
  - Search input: fontSize.md (16) (FoodSearchScreen.js:805).
  - CTA row text: `type.bodyStrong` => fontSize.md (16) (FoodSearchScreen.js:814).
  - Empty text: fontSize.sm (13) (FoodSearchScreen.js:817).
  - Suggest hint: `type.caption` => fontSize.xs (11) (FoodSearchScreen.js:820).
  - Suggest name: `type.bodyStrong` (16); suggest macros: `type.caption` (11) (FoodSearchScreen.js:832-833).
  - No-results text: `type.body` (16); button text: bold, default size (FoodSearchScreen.js:839, 845).
  - Plate count: `type.bodyStrong` (16); plate kcal line: `type.caption` (11); plate log text: `type.bodyStrong` (16) (FoodSearchScreen.js:862-869).
  - Plate modal title: `type.title` (17); plate item name fontSize.md (16); plate item meta `type.caption` (11) (FoodSearchScreen.js:881, 887-888).
  - FoodRow name fontSize.md (16) semibold; meta fontSize.sm (13) (FoodRow.js:95-97).
- Touch targets:
  - Header X / quick-add / scan icons: hitSlop 12, icon-only (FoodSearchScreen.js:576-601) => ~icon+24; quick-add icon is 23, scan 24 — effective ~47px, OK.
  - Tabs: only paddingHorizontal md + paddingTop md, label fontSize.sm + paddingBottom sm (FoodSearchScreen.js:778-787). Height ≈ 12 + 13 + 8 ≈ 33px — FLAG: < 44px and no hitSlop on the tab TouchableOpacity (FoodSearchScreen.js:613-622).
  - Search box: minHeight 48 (FoodSearchScreen.js:802) — good.
  - FoodRow: minHeight 56 (FoodRow.js:93) — good; the + button has hitSlop 12 (FoodRow.js:75).
  - ctaRow: paddingVertical md (12) only, no minHeight (FoodSearchScreen.js:810-811) => ~16(icon)+24 ≈ 40px — borderline < 44px.
  - Plate "Log {n}" button: paddingVertical sm (8) + text 16 ≈ 32px — FLAG: < 44px, no hitSlop (FoodSearchScreen.js:864-868, 678-685).
  - Suggest card / plate item rows: ample padding, OK (FoodSearchScreen.js:823-831, 882-886).
- Information density: Medium-high; tabs + search + list + optional plate bar.
- Clean vs cluttered: The browse list and rows are clean; the header (three controls + title) and the triple custom-food CTA are the busiest parts.
- Most important action prominence: For browse, the amber add-circle on each FoodRow is clear (FoodRow.js:79); for the plate, the amber "Log {n}" is prominent (FoodSearchScreen.js:864-869). Reasonable.
- Device behaviour: Tab strip is a horizontal ScrollView (FoodSearchScreen.js:605-611) so it scrolls on narrow phones. Lists are FlatList. Plate review ScrollView capped at maxHeight 360 (FoodSearchScreen.js:698) — fixed, fine on large, may dominate a 5.4". plateModalSheet maxWidth not set (full width bottom sheet). Scales acceptably.

---

SCREEN: AddCustomFoodScreen
WHAT IT IS: The manual food-entry form. Creates a custom_foods row and logs one food_entries row in a single flow, with macro sanity checks before saving (AddCustomFoodScreen.js:1-9, 104-188).
WHAT IS ON IT:
- Header: close (X, size 24), title "New food", a spacer to balance (AddCustomFoodScreen.js:192-203).
- Context label "Logging to {meal}" (AddCustomFoodScreen.js:206); optional "Scanned barcode: {ean}" hint (AddCustomFoodScreen.js:207-209).
- Optional duplicate banner: "You've saved this barcode before as {name}." + "Log that instead" button (AddCustomFoodScreen.js:210-221).
- Fields: Name (autofocus, placeholder "Chicken breast, raw"), Brand (optional, placeholder "Tesco") (AddCustomFoodScreen.js:223-224).
- "PER 100G" section: optional amber "Amber figures aren't certain, check them." note (AddCustomFoodScreen.js:226-231); Calories + Protein row, Carbs + Fat row, Fibre (optional) (AddCustomFoodScreen.js:232-240). Fields flagged "unsure" get an amber border (AddCustomFoodScreen.js:283, 350).
- "QUANTITY EATEN" section: Serving (g) + Eaten (g) (AddCustomFoodScreen.js:242-246).
- "Save and add to diary" button, disabled until valid, with loading state (AddCustomFoodScreen.js:248-256).
NAVIGATION: Route "AddCustomFood" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:236-240). Reached from FoodSearch (newCustomFood / gotoCustomReplace, FoodSearchScreen.js:424-429) and from ScanLabel via navigation.replace after OCR or manual fallback (ScanLabelScreen.js:133-135, 148-152, 159-161, 171-176). On save it calls navigation.goBack() (AddCustomFoodScreen.js:182); the dupe "Log that instead" navigates back to FoodSearch (AddCustomFoodScreen.js:218).
GATING: PRO (inherited). Lives only in DiaryStack (RootNavigator.js:236); reached only from the Pro-gated Diary domain (RootNavigator.js:156-159). No own guard.
CURRENT STRENGTHS:
- One flow creates the food and logs the first entry (AddCustomFoodScreen.js:124-158).
- Sanity check with a "Numbers look off / Save anyway" confirm before saving (AddCustomFoodScreen.js:108-122).
- OCR-prefill awareness with per-field "unsure" amber flagging that clears on edit (AddCustomFoodScreen.js:57-63, 227-240).
- Duplicate-barcode guard offers logging the existing food instead (AddCustomFoodScreen.js:71-80, 210-221).
- Save is disabled until name + non-negative kcal + positive serving (AddCustomFoodScreen.js:102, 253).
CURRENT WEAKNESSES:
- Seven numeric/text fields plus serving + eaten is a fair amount of typing for "log one food" — heaviest path of the eight screens (AddCustomFoodScreen.js:223-246).
- "Serving (g)" vs "Eaten (g)" side by side may confuse: which one scales the logged macros? (the answer is Eaten, AddCustomFoodScreen.js:143-147) — not explained in UI.
- The barcode is shown but not persisted to custom_foods (comment AddCustomFoodScreen.js:42-45) — a known gap.
NEWBIE QUESTION: Mostly no. "PER 100G" macros, plus the Serving vs Eaten distinction, demand nutrition literacy a first-timer is unlikely to have. The labels are clear English but the concept is advanced.
ATHLETE QUESTION: Yes. Per-100g entry, optional fibre, separate serving and eaten weights, and a sanity check match how a competitor enters a label they trust.
LOCATION QUESTION: Yes. A modal fallback reached from search misses and from the scan chain is the right home for manual entry (RootNavigator.js:236; FoodSearchScreen.js:424-429; ScanLabelScreen.js:148-152).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (AddCustomFoodScreen.js:307).
  - Context label: fontSize.sm (13) (AddCustomFoodScreen.js:310).
  - Barcode hint: `type.label` => fontSize.sm (13) (AddCustomFoodScreen.js:312).
  - Dupe text: fontSize.sm (13) (AddCustomFoodScreen.js:323).
  - Section label ("PER 100G" / "QUANTITY EATEN"): fontSize.xs (11), bold, letterSpacing 1 (AddCustomFoodScreen.js:326-327).
  - Field label: fontSize.sm (13) (AddCustomFoodScreen.js:330).
  - Text input: `type.body` => fontSize.md (16) (AddCustomFoodScreen.js:337).
  - NumField input: `type.body` => fontSize.md (16); suffix fontSize.sm (13) (AddCustomFoodScreen.js:348-349).
  - Unsure note: fontSize.sm (13) (AddCustomFoodScreen.js:351).
  - Save button: label from Button component (size "lg", not styled here, AddCustomFoodScreen.js:248-256).
- Touch targets:
  - Header X: hitSlop 12, icon 24 (AddCustomFoodScreen.js:193-200) => ~48px, OK.
  - Text input: minHeight 48 (AddCustomFoodScreen.js:337) — good.
  - numWrap: minHeight 48 (AddCustomFoodScreen.js:347) — good.
  - Save button: size "lg" via Button component (not measurable in this file) (AddCustomFoodScreen.js:251).
- Information density: Medium-high (a full form), but well sectioned into PER 100G and QUANTITY EATEN.
- Clean vs cluttered: Clean two-column rows; consistent input styling.
- Most important action prominence: "Save and add to diary" is the single large primary button at the bottom (AddCustomFoodScreen.js:248-256) — correct.
- Device behaviour: Whole body is a ScrollView with keyboardShouldPersistTaps (AddCustomFoodScreen.js:205) so the form scrolls under the keyboard on small phones. Rows use flex (two NumFields each flex:1) so they scale (AddCustomFoodScreen.js:281, 339). No fixed widths that would clip.

---

SCREEN: MyMealsScreen
WHAT IT IS: The user's saved meals (named bundles of foods logged together). Tapping one logs every food in it to the slot/date the screen was opened with; supports rename and delete (MyMealsScreen.js:1-17).
WHAT IS ON IT:
- BackHeader titled "My meals" (MyMealsScreen.js:152).
- Loading skeletons (3 rows) (MyMealsScreen.js:154-159).
- Empty state: "Save your go-to meals" + "Select foods in your diary and tap \"Save as meal\"." (MyMealsScreen.js:160-166).
- List of meal rows: name (1 line) and meta "{n} foods · {kcal} kcal · {protein}g protein", with an add-circle-outline icon; tap logs, long-press opens the rename/delete menu (MyMealsScreen.js:129-148, 167-174).
- Confirm-log alert "Log \"{name}\"?" with item/slot detail (MyMealsScreen.js:79-88).
- Long-press menu: Rename / Delete / Cancel, with a nested delete confirm (MyMealsScreen.js:90-118).
- Rename modal with a name TextInput, Cancel and Save (MyMealsScreen.js:176-207).
NAVIGATION: Route "MyMeals" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:271-275). Reached from the FoodSearch Custom-tab CTA "My meals" (FoodSearchScreen.js:444, 458). On log it calls navigation.goBack() (MyMealsScreen.js:70). No create here — creation is from the diary multi-select "Save as meal" (MyMealsScreen.js:10-11; DiaryScreen.js:674).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:271); reached from the Pro-gated Diary domain. No own guard.
CURRENT STRENGTHS:
- One tap (plus a confirm) logs a whole saved meal to the current slot (MyMealsScreen.js:66-88).
- Rename and delete with clear, reassuring copy ("Anything you already logged from it stays in your diary.") (MyMealsScreen.js:99-113).
- Loading skeletons and a guiding empty state (MyMealsScreen.js:154-166).
CURRENT WEAKNESSES:
- Create/edit is not available here at all (MyMealsScreen.js:10-11); the only way to make a saved meal is the diary multi-select, which is non-obvious.
- Rename/Delete are hidden behind long-press with only an accessibilityHint as the discoverability cue (MyMealsScreen.js:137).
- The confirm-log alert adds a tap to every log even for trusted meals (MyMealsScreen.js:79-88).
NEWBIE QUESTION: Partially. The list and "tap to log" are clear, but "saved meal" as a concept and the fact you can only create one from diary multi-select are not obvious to a newcomer.
ATHLETE QUESTION: Yes. Reusable meal templates are exactly what a competitor on a fixed plan wants for fast repeat logging.
LOCATION QUESTION: Yes. Reached from the food picker's Custom tab (FoodSearchScreen.js:444) alongside My recipes — a sensible grouping.
VISUAL + USABILITY:
- Font sizes:
  - Title: from BackHeader (not in this file) — see BackHeader note.
  - Row name: `type.bodyStrong` => fontSize.md (16) (MyMealsScreen.js:220).
  - Row meta: fontSize.sm (13) (MyMealsScreen.js:221).
  - Empty title: `type.title` => fontSize.lg (17) (MyMealsScreen.js:226).
  - Empty body: fontSize.sm (13) (MyMealsScreen.js:227).
  - Card title (rename): `type.bodyStrong` => fontSize.md (16) (MyMealsScreen.js:230).
  - Rename input: `type.body` => fontSize.md (16) (MyMealsScreen.js:232).
  - Card button text: `type.body` => fontSize.md (16) (MyMealsScreen.js:240).
- Touch targets:
  - Meal row: minHeight 64 (MyMealsScreen.js:218) — good.
  - cardBtn (Cancel/Save in rename modal): paddingHorizontal lg + paddingVertical sm (8) + text 16 ≈ 32px — FLAG: < 44px, no hitSlop (MyMealsScreen.js:238, 198-203).
- Information density: Low; a single list of rows.
- Clean vs cluttered: Clean.
- Most important action prominence: The row itself is the tap target with an amber add-circle-outline cue (MyMealsScreen.js:145) — appropriate.
- Device behaviour: FlatList (MyMealsScreen.js:168) scales. Rename modal card width '100%' with horizontal padding (MyMealsScreen.js:228-229) so it adapts to width. No fixed clip risks.

---

SCREEN: MyRecipesScreen
WHAT IT IS: A list of the user's composed recipes. Tap a row to log one serving as a single diary line; a pencil edits; long-press deletes; the header plus builds a new one (MyRecipesScreen.js:1-15).
WHAT IS ON IT:
- BackHeader titled "My recipes" with a right-side add (+) "New recipe" icon (size 26) (MyRecipesScreen.js:144-151).
- Loading skeletons (3 rows) (MyRecipesScreen.js:153-158).
- Empty state: "Build your first recipe" + explainer + "Build a recipe" CTA button (MyRecipesScreen.js:159-168).
- List of recipe rows: name (1 line); meta "{n} servings" plus optional notes; a pencil "Edit" button; an add-circle icon (or spinner while logging). Tap logs one serving; long-press deletes (MyRecipesScreen.js:106-140, 169-176).
- Delete confirm: "Delete \"{name}\"?" with reassuring copy (MyRecipesScreen.js:88-104).
NAVIGATION: Route "MyRecipes" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:266-270). Reached from the FoodSearch Custom-tab CTA "My recipes" (FoodSearchScreen.js:443, 459). Pushes to RecipeBuilder for create (onCreate, MyRecipesScreen.js:60-62) and edit (onEdit, MyRecipesScreen.js:64-66). On log it calls navigation.goBack() (MyRecipesScreen.js:77).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:266); reached from the Pro-gated Diary domain. No own guard.
CURRENT STRENGTHS:
- Recipes log as one diary line, with an in-flight guard so a double-tap can't double-log (MyRecipesScreen.js:71-86, 113).
- Edit (pencil) and Delete (long-press) are both reachable; create from the header + and a primary CTA in the empty state (MyRecipesScreen.js:125-134, 147-149, 165-167).
- Tells the user to add an ingredient if the recipe has none (MyRecipesScreen.js:80-81).
CURRENT WEAKNESSES:
- Logging is unconfirmed (tap immediately logs and pops, MyRecipesScreen.js:75-79) whereas MyMeals confirms (MyMealsScreen.js:79-88) — inconsistent between the two sibling screens.
- Delete is long-press-only with just an accessibilityHint as the cue (MyRecipesScreen.js:116).
- The row carries three tap zones (row, pencil, implicit add icon) close together — the pencil and add-circle sit adjacent (MyRecipesScreen.js:125-138).
NEWBIE QUESTION: Partially. "Build a recipe once. Log it as one line every time you eat it." (MyRecipesScreen.js:163-164) explains the value well, but composing a recipe is an advanced task a beginner may skip.
ATHLETE QUESTION: Yes. A reusable composed recipe with per-serving logging suits meal-preppers and competitors.
LOCATION QUESTION: Yes. Grouped with My meals under the food picker's Custom tab (FoodSearchScreen.js:443).
VISUAL + USABILITY:
- Font sizes:
  - Title: from BackHeader (see BackHeader note).
  - Row name: `type.bodyStrong` => fontSize.md (16) (MyRecipesScreen.js:189).
  - Row meta: fontSize.sm (13) (MyRecipesScreen.js:190).
  - Empty title: `type.title` => fontSize.lg (17) (MyRecipesScreen.js:200).
  - Empty body: fontSize.sm (13) (MyRecipesScreen.js:201).
  - Empty CTA text: `type.bodyStrong` => fontSize.md (16) (MyRecipesScreen.js:206).
- Touch targets:
  - Recipe row: minHeight 64 (MyRecipesScreen.js:187) — good.
  - editBtn: 40x40 (MyRecipesScreen.js:191-194) — FLAG: < 44px (no hitSlop on this inner button; the row's outer pencil TouchableOpacity has hitSlop 12 at MyRecipesScreen.js:128 making it ~64px effective).
  - Header + (new recipe): hitSlop 12, icon 26 (MyRecipesScreen.js:147) => ~50px, OK.
  - Empty CTA: paddingVertical md (12) + text 16 ≈ 40px — borderline < 44px (MyRecipesScreen.js:202-203).
- Information density: Low; a single list.
- Clean vs cluttered: Clean, though the row has three adjacent controls.
- Most important action prominence: Amber add-circle (size 26) marks the primary log action per row (MyRecipesScreen.js:137) — appropriate.
- Device behaviour: FlatList (MyRecipesScreen.js:170) scales. No fixed widths beyond the 40px edit button; fine across sizes.

---

SCREEN: RecipeBuilderScreen
WHAT IT IS: Create or edit a recipe — name, total servings, notes, and an ordered ingredient list — with a live per-serving and whole-recipe macro preview. Ingredient picking reuses FoodSearchScreen in pickMode 'recipe' (RecipeBuilderScreen.js:1-20).
WHAT IS ON IT:
- Header: close (X, size 24), title "New recipe" or "Edit recipe", and a "Save" text action (disabled until valid; shows "Saving…") (RecipeBuilderScreen.js:172-182).
- Loading skeletons (3 rows) in edit mode while loading (RecipeBuilderScreen.js:184-189).
- Name field (autofocus on create, placeholder "e.g. Sunday chilli") (RecipeBuilderScreen.js:192-204).
- Total servings field (numeric, placeholder "4") (RecipeBuilderScreen.js:206-220).
- Notes field (multiline, optional) (RecipeBuilderScreen.js:222-233).
- Ingredients section: "Add ingredient" link; either "No ingredients yet…" hint or rows of {name, optional brand, an editable grams input, "g" unit, and a remove X} (RecipeBuilderScreen.js:235-269).
- Macros card: "Per serving" pills (kcal / P / C / F) and a "Whole recipe: …" subline (RecipeBuilderScreen.js:271-282).
NAVIGATION: Route "RecipeBuilder" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:276-280). Reached from MyRecipes onCreate/onEdit (MyRecipesScreen.js:61, 65). Pushes to FoodSearch in recipe pick mode for adding ingredients (RecipeBuilderScreen.js:118-124); receives the picked ingredient back via route param addedIngredient (RecipeBuilderScreen.js:98-111). On save it calls navigation.goBack() (RecipeBuilderScreen.js:162).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:276); reached from the Pro-gated Diary domain. No own guard.
CURRENT STRENGTHS:
- Live macro preview (per serving + whole recipe) updates as ingredients/servings change (RecipeBuilderScreen.js:113-116, 271-282).
- Quantity input is sanitised to digits + one decimal so a stray character can't NaN the preview (RecipeBuilderScreen.js:130-135).
- Atomic create/edit + setRecipeIngredients (RecipeBuilderScreen.js:139-168); Save disabled until name + positive servings (RecipeBuilderScreen.js:137).
- Reuses the existing food picker for ingredients rather than a bespoke search (RecipeBuilderScreen.js:118-124).
CURRENT WEAKNESSES:
- Each ingredient is a separate navigate-out to FoodSearch and back (RecipeBuilderScreen.js:118-124, 98-111) — building a multi-ingredient recipe is many round trips.
- "Save" is a small text link in the header (RecipeBuilderScreen.js:177-181), less prominent than the primary buttons used elsewhere.
- Ingredient quantity TextInput is width 64 with no minHeight (RecipeBuilderScreen.js:330-335) — small target.
NEWBIE QUESTION: No. Composing a recipe from per-gram ingredients with servings maths is an advanced workflow; a first-time gym-goer is unlikely to use it.
ATHLETE QUESTION: Yes. Per-serving macros from a gram-weighted ingredient list is exactly what a competitor prepping batch meals needs.
LOCATION QUESTION: Yes. A modal builder launched from My recipes, reusing the food picker, is the right structure (RootNavigator.js:276; MyRecipesScreen.js:61).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (RecipeBuilderScreen.js:305).
  - Save action: `type.bodyStrong` => fontSize.md (16) (RecipeBuilderScreen.js:306).
  - Field label: fontSize.sm (13) (RecipeBuilderScreen.js:311).
  - Inputs: fontSize.md (16) (RecipeBuilderScreen.js:313).
  - Add-ingredient link: fontSize.sm (13), bold (RecipeBuilderScreen.js:322).
  - Ingredient empty hint: fontSize.sm (13) (RecipeBuilderScreen.js:323).
  - Ingredient name: `type.body` => fontSize.md (16); brand: `type.caption` => fontSize.xs (11) (RecipeBuilderScreen.js:328-329).
  - Quantity input: fontSize.md (16); unit "g": fontSize.sm (13) (RecipeBuilderScreen.js:332, 336).
  - Macros title: fontSize.xs (11), uppercase (RecipeBuilderScreen.js:339); macrosSub: `type.num('caption')` => fontSize.xs (11) tabular (RecipeBuilderScreen.js:341).
  - Pill value: `type.num('bodyStrong')` => fontSize.md (16) tabular; pill label: `type.caption` => fontSize.xs (11) (RecipeBuilderScreen.js:346-347).
- Touch targets:
  - Header X / Save: hitSlop 12 (RecipeBuilderScreen.js:173, 177) — OK.
  - "Add ingredient" link: hitSlop 8 (RecipeBuilderScreen.js:238) over fontSize.sm text — effective ~30px — borderline.
  - Quantity input: width 64, paddingVertical sm (8) + text 16 ≈ 32px, no minHeight (RecipeBuilderScreen.js:330-335) — FLAG: < 44px.
  - Remove X: hitSlop 8, icon 22 (RecipeBuilderScreen.js:264) => ~38px — borderline < 44px.
  - Inputs (name/servings/notes): paddingVertical md (12) + text 16 ≈ 40px, no minHeight (RecipeBuilderScreen.js:314-315) — borderline.
- Information density: Medium; a form plus a growing ingredient list and a macro card.
- Clean vs cluttered: Clean and well sectioned.
- Most important action prominence: Primary "Save" is a header text link (RecipeBuilderScreen.js:177-181), and the macro card draws the eye more than the save — the most important action is NOT the most prominent element.
- Device behaviour: Body is a ScrollView with keyboardShouldPersistTaps (RecipeBuilderScreen.js:191) so it scrolls under the keyboard. Quantity input fixed at width 64 (RecipeBuilderScreen.js:331) — fixed but small enough to be safe across sizes. Notes minHeight 60 (RecipeBuilderScreen.js:225). Scales acceptably.

---

SCREEN: ScanBarcodeScreen
WHAT IT IS: A live camera barcode scanner. On a successful scan it runs a waterfall lookup and routes to the detail sheet (hit) or to ScanLabel (miss) (ScanBarcodeScreen.js:1-25).
WHAT IS ON IT:
- Header: close (X, size 24), title "Scan barcode", and a torch toggle (flashlight / flashlight-outline, size 22; amber when on) (ScanBarcodeScreen.js:200-218).
- Live camera view filling the body (ScanBarcodeScreen.js:220-228).
- Overlay: an amber reticle (240x160) and a hint "Point at a barcode" / "Looking it up" while resolving (ScanBarcodeScreen.js:229-234).
- A resolving spinner badge top-right while looking up (ScanBarcodeScreen.js:235-239).
- Permission states: a spinner while 'not-determined' (ScanBarcodeScreen.js:138-146); a "Camera access needed" screen with "Open Settings" (denied) or "Allow camera" (otherwise) (ScanBarcodeScreen.js:148-176); a "No camera available" screen when there is no device (ScanBarcodeScreen.js:178-194).
NAVIGATION: Route "ScanBarcode" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:241-245). Reached from DiaryScreen's FAB (DiaryScreen.js:650) and from FoodSearch's header scan icon (FoodSearchScreen.js:595). On a hit it navigation.replace('FoodSearch', { scannedFood }) (ScanBarcodeScreen.js:117-119); on a miss it navigation.replace('ScanLabel', { prefillBarcode }) (ScanBarcodeScreen.js:122-124). Close calls navigation.goBack() (ScanBarcodeScreen.js:201).
GATING: PRO (inherited). Barcode scanning is a Pro feature (CLAUDE.md). The screen lives only in DiaryStack (RootNavigator.js:241), reached from the Pro-gated Diary domain; it has no own guard.
CURRENT STRENGTHS:
- Scan lock prevents a second scan firing mid-navigation (ScanBarcodeScreen.js:64, 104-107).
- Camera pauses when unfocused or backgrounded, re-arming on focus (ScanBarcodeScreen.js:68-78, 196).
- Success haptic on detect (ScanBarcodeScreen.js:111); torch toggle (ScanBarcodeScreen.js:205-217).
- Robust permission handling incl. Android re-ask quirks (ScanBarcodeScreen.js:80-101, 148-176).
- A miss routes straight into the heal chain (ScanLabel) rather than dead-ending (ScanBarcodeScreen.js:120-125).
CURRENT WEAKNESSES:
- No manual "type a barcode" or "type it in" escape on this screen itself (unlike ScanLabel which offers Type it in) — the only non-scan exit is Close (ScanBarcodeScreen.js:200-203).
- The hint text uses the scrim as a chip background (ScanBarcodeScreen.js:260-264); on a bright product it may be low-contrast but that is the standard chip.
- cameraWrap background is colors.background, not black, so letterboxing on some aspect ratios may not look like a camera viewport (ScanBarcodeScreen.js:254) — contrast ScanLabel which uses '#000' (ScanLabelScreen.js:365).
NEWBIE QUESTION: Yes. A reticle plus "Point at a barcode" is universally understood; the torch icon is conventional.
ATHLETE QUESTION: Yes, with a caveat. Fast scanning is what a busy user wants, but the lack of a manual-barcode entry path may frustrate when a code won't read.
LOCATION QUESTION: Yes. Reached from both the diary FAB and the food picker (DiaryScreen.js:650; FoodSearchScreen.js:595), the two natural launch points.
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (ScanBarcodeScreen.js:253).
  - Hint: `type.body` => fontSize.md (16) (ScanBarcodeScreen.js:260-261).
  - Permission title: `type.title` => fontSize.lg (17) (ScanBarcodeScreen.js:270-271).
  - Permission body: fontSize.md (16), hardcoded lineHeight 22 (ScanBarcodeScreen.js:274-276).
  - Permission button text: `type.bodyStrong` => fontSize.md (16) (ScanBarcodeScreen.js:282).
- Touch targets:
  - Header X / torch: hitSlop 12 (ScanBarcodeScreen.js:201, 206) over icons 24/22 => ~46-48px, OK.
  - Permission button: paddingVertical md (12) + text 16 ≈ 40px — borderline < 44px (ScanBarcodeScreen.js:278-281).
- Information density: Very low; a full-bleed camera with one reticle and a hint.
- Clean vs cluttered: Clean.
- Most important action prominence: The camera itself is the action; the reticle clearly marks where to aim (ScanBarcodeScreen.js:256-258). Appropriate.
- Device behaviour: Camera uses StyleSheet.absoluteFillObject inside a flex:1 wrap (ScanBarcodeScreen.js:221-222, 254) so it fills any screen. Reticle is fixed 240x160 (ScanBarcodeScreen.js:256-257) — fixed but well within a 5.4" width. Scales well.

---

SCREEN: ScanLabelScreen
WHAT IT IS: Two-step food capture via camera + on-device OCR: first the front of pack (to read the name), then the nutrition panel (to read macros), then hands off to AddCustomFood with values prefilled. Degrades to manual entry when OCR isn't in the binary (ScanLabelScreen.js:1-27).
WHAT IS ON IT:
- Header: close (X, size 24), title "Snap label", torch toggle (size 22) (ScanLabelScreen.js:240-258).
- Live camera view (ScanLabelScreen.js:260-269).
- Optional miss banner (when arriving from a barcode miss): "Barcode {ean} not in our database" (or just the barcode when offline) + guidance (ScanLabelScreen.js:270-285).
- OCR overlay (when OCR available): a frame (280x360) and a step hint "Front of pack (1 of 2)" / "Nutrition panel (2 of 2)" / "Reading" (ScanLabelScreen.js:232-236, 286-291).
- Capture row: a round shutter (72x72) with an inner dot, plus contextual "Skip name" (front step) and "Type it in" (when from a barcode miss); or, when OCR unavailable, a "Type it in" tertiary button (ScanLabelScreen.js:292-321).
- COMP-022 arrival-choice overlay (barcode miss + OCR available): a card titled "Not in the database yet" / "Couldn't check the full database" (offline) with body copy and "Scan the label" + "Type it in" buttons (ScanLabelScreen.js:324-341).
- Permission states: spinner while 'not-determined' (ScanLabelScreen.js:178-184); "Camera access needed" with Open Settings / Allow camera plus "Type it in instead" (ScanLabelScreen.js:186-211); "No camera available" with "Type it in instead" (ScanLabelScreen.js:213-230).
NAVIGATION: Route "ScanLabel" in DiaryStack, headerShown false, presentation 'modal' (RootNavigator.js:246-250). Reached from ScanBarcode on a miss (navigation.replace('ScanLabel', { prefillBarcode }), ScanBarcodeScreen.js:122-124). It can also be a direct "snap a label" entry (no prefillBarcode, ScanLabelScreen.js:18-19) — NOT DETERMINED IN CODE which surface launches it without a barcode (no navigate('ScanLabel') call appears in the eight audited screens; the route is only entered via ScanBarcode's replace in this set). All exits go via navigation.replace('AddCustomFood', ...) (ScanLabelScreen.js:133, 148, 159, 172) or Close goBack (ScanLabelScreen.js:241).
GATING: PRO (inherited). DiaryStack only (RootNavigator.js:246); reached from the Pro-gated Diary domain via ScanBarcode. No own guard.
CURRENT STRENGTHS:
- Never dead-ends: a barcode heal always has a "Type it in" escape that keeps the barcode (ScanLabelScreen.js:310-316, 337-338).
- Two-step capture (name then panel) with a skippable name step (ScanLabelScreen.js:118-127, 165-169, 305-309).
- Graceful degradation: hides the shutter and offers manual entry when OCR isn't present (ScanLabelScreen.js:286-320).
- Offline-aware copy distinguishes "not in DB" from "couldn't check" (ScanLabelScreen.js:68-78, 273-283, 329-335).
- Camera pauses when unfocused/backgrounded (ScanLabelScreen.js:80-88, 232).
CURRENT WEAKNESSES:
- The arrival-choice overlay adds a decision step on top of an already two-step capture, then a third screen (AddCustomFood) — a long chain for one food (ScanLabelScreen.js:324-341 → capture → AddCustomFood).
- Two different "Type it in" affordances can both be visible (capture-row Type-it-in and the arrival card's Type-it-in) (ScanLabelScreen.js:312-316, 338).
- A capture failure silently advances or routes to manual with only the hint changing (ScanLabelScreen.js:153-162) — no explicit error toast.
NEWBIE QUESTION: Partially. "Front of pack (1 of 2)" / "Nutrition panel (2 of 2)" and the framed shutter guide the steps well, but understanding why two photos are needed, and the OCR "amber, check these" downstream, asks some patience of a beginner.
ATHLETE QUESTION: Yes. Snapping a label to capture an unknown product fast, with the barcode saved for next time, suits a competitor who eats varied packaged foods.
LOCATION QUESTION: Yes. As the second link of the barcode heal chain (reached from a ScanBarcode miss, ScanBarcodeScreen.js:122-124), it is in the right place; the direct-entry surface is unverified (see NAVIGATION).
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` => fontSize.lg (17) (ScanLabelScreen.js:354).
  - Choice title: `type.title` => fontSize.lg (17); choice body: fontSize.sm (13), lineHeight 20 (ScanLabelScreen.js:362-363).
  - Hint: `type.body` => fontSize.md (16) (ScanLabelScreen.js:371-373).
  - Miss title: `type.bodyStrong` => fontSize.md (16); miss body: fontSize.sm (13), lineHeight 20 (ScanLabelScreen.js:382-387).
  - Skip text: `type.body` => fontSize.md (16) (ScanLabelScreen.js:401).
  - Fallback title: `type.title` => fontSize.lg (17); fallback body: fontSize.md (16), lineHeight 22 (ScanLabelScreen.js:405-412).
- Touch targets:
  - Header X / torch: hitSlop 12 (ScanLabelScreen.js:241, 245) — OK.
  - Shutter (captureBtn): 72x72 (ScanLabelScreen.js:392-393) — good.
  - skipBtn ("Skip name" / "Type it in"): hitSlop 12, paddingVertical xs (4) + text 16 ≈ 24px visible, ~48px effective (ScanLabelScreen.js:306, 313, 400) — saved by hitSlop.
  - Choice / fallback buttons: Button component (size not measurable here) (ScanLabelScreen.js:203, 207, 337-338).
- Information density: Low-medium; full-bleed camera plus a banner/overlay and the capture row, or a single decision card.
- Clean vs cluttered: Mostly clean; the simultaneous miss banner + frame + capture row + (possible) arrival card is the busiest moment.
- Most important action prominence: The 72px amber shutter with a white ring is clearly the primary action (ScanLabelScreen.js:392-398); the arrival card's primary "Scan the label" is the first button (ScanLabelScreen.js:337). Appropriate.
- Device behaviour: Camera fills via absoluteFillObject in a flex:1 wrap with a true-black background (ScanLabelScreen.js:262-265, 365). Frame fixed 280x360 (ScanLabelScreen.js:367-368) — fits a 5.4" width (≈ up to ~320pt) but is tall; on a 5.4" the 360-tall frame plus banner plus bottom capture row may crowd vertically. captureRow is bottom-anchored (ScanLabelScreen.js:388-390). Scales acceptably, watch vertical crowding on the smallest device.

---

## Cross-screen notes (components referenced, not in scope but load-bearing for the above)
- ScreenHeader (DiaryScreen.js:505) and BackHeader (MyMealsScreen.js:152, MyRecipesScreen.js:144) render the visible screen titles; their exact font tokens are defined in `src/components/ScreenHeader.js` / `src/components/BackHeader.js` and were NOT read in this pass — title font sizes for those headers are NOT DETERMINED IN CODE here.
- FoodDetailSheet (the serving picker used by both the add and edit flows) lives at `src/components/food/FoodDetailSheet.js`; its "Add to diary" / "Save changes" button is `type`-free fontSize.md (16) bold on amber (FoodDetailSheet.js:263), the quantity input is fontSize.lg (17) (FoodDetailSheet.js:214), and the delete button is 44x44 (FoodDetailSheet.js:244-249). Meal-slot chips (mealBtn) have only paddingVertical sm (8) — FLAG < 44px (FoodDetailSheet.js:229-231).
- FoodRow (`src/components/food/FoodRow.js`) is the list row in FoodSearch: minHeight 56 (FoodRow.js:93); name fontSize.md (16) semibold, meta fontSize.sm (13) (FoodRow.js:95-97); + button hitSlop 12 (FoodRow.js:75).


<!-- ==== phase1/09-progress-analytics.md ==== -->

# Phase 1 — Progress & Analytics screens

Audit scope: src/screens/AnalyticsScreen.js, ConsistencyScreen.js,
LiftProgressScreen.js, VolumeHeatmapScreen.js, BodyMetricsScreen.js,
SnapshotsScreen.js, YearOfLiftsScreen.js. Tokens resolved against
src/styles/theme.js. Navigation cited against src/navigation/RootNavigator.js.

Token reference (theme.js): fontSize.micro 10 (theme.js:257), xs 11 (258),
sm 13 (259), md 16 (260), lg 17 (261), xl 20 (262), xxl 24 (263), xxxl 32 (264),
display 40 (265). type.label = fontSize.sm 13 medium (theme.js:402-405);
type.caption = fontSize.xs 11 (406-409); type.body = fontSize.md 16 (394-397);
type.bodyStrong = fontSize.md 16 semibold (398-401); type.title = fontSize.lg 17
semibold (390-393); type.h2 = fontSize.xxl 24 (382-385); type.h3 = fontSize.xl 20
(386-389). spacing: xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48
(theme.js:228-239). hitSlop default = 12 each side (theme.js:423). Tab icons 22px,
bar height 60 + bottom inset (RootNavigator.js:441,426).

---

```
SCREEN: Progress landing (AnalyticsScreen)
WHAT IT IS: The Progress tab's landing screen / hub. A scrollable stack that
  answers "am I on track?" at a glance and routes out to the deeper analytics
  screens. File: src/screens/AnalyticsScreen.js.
WHAT IS ON IT:
  - ScreenHeader titled "Progress" + Volyume wordmark on the right (AnalyticsScreen.js:171; ScreenHeader.js:26-37).
  - "This week" consistency strip (WeeklyStreakStrip) — renders only when weeklyStreak.render is true; self-hides for brand-new users and under a wellbeing flag (AnalyticsScreen.js:177-197). Optional milestone row beneath it: ribbon icon + milestone text (e.g. "4 weeks of showing up.") and, at >=12 weeks, a "Make a card" CTA (AnalyticsScreen.js:180-195, 27-32).
  - Empty state when no sets logged: EmptyChartIllustration (140px), heading "No data yet", body copy (AnalyticsScreen.js:200-208).
  - Ephemeral monthly recap nudge card (sparkles icon, "Your <Month> recap is ready · 45 seconds", close button) — shown days 1-7 of month after >=10 sessions (AnalyticsScreen.js:147,211-232).
  - "For you" insight stack: list of InsightRow items, each a severity icon (info/alert/warning), copy (max 3 lines), and a dismiss (close) button (AnalyticsScreen.js:235-242, 398-415).
  - "Your trend" weight-trend card (WeightTrendCard) — Pro only, self-hides until morning weights exist (AnalyticsScreen.js:247-254).
  - "Recent sessions": section label + "All sessions" link, then SessionCard rows (name, "EEE d MMM · Nm" meta, optional difficulty chip "N/10") (AnalyticsScreen.js:258-274, 517-539).
  - "This week's volume" summary strip with InfoTooltip; VolumeSummaryStrip shows count of muscles trained, flags for "N below target"/"N over max" or "All in range", chevron; taps through to VolumeHeatmap (AnalyticsScreen.js:277-291, 422-476).
  - "Cardio this week" CardioPlanCard — Pro only, when cardioEnabled !== false (AnalyticsScreen.js:295-304).
  - "New personal bests": PRSparkline with a day-window toggle chip ("Nd") (AnalyticsScreen.js:307-326, 478-515).
  - "Explore" nav-tile grid: Consistency, Lifts, Body Metrics, Partner, Full History, Recaps (locked until 10 sessions, shows "N sessions to go"), Year of Lifts (only appears after 365 days) (AnalyticsScreen.js:329-389).
NAVIGATION: Registered as route "Analytics" in ProgressStack, headerShown:false (RootNavigator.js:342). ProgressStack is the "ProgressTab" tab (RootNavigator.js:448, title "Progress"). Reached by tapping the Progress tab. Pushes to: ShareCard (98), RecapStory (215,370), WorkoutHistory (263,345), VolumeHeatmap (288), Consistency (332), LiftProgress (333), BodyMetrics (340), Partner (344), YearOfLifts (385), LogCardio (300), CardioHistory (301).
GATING: Free screen — route registered with the raw AnalyticsScreen component, no withProGuard (RootNavigator.js:342). Internally it conditionally hides Pro-only sections by reading tier: weight-trend card and cardio card behind `tier === 'pro'` (AnalyticsScreen.js:76,247,295).
CURRENT STRENGTHS: Clear hub structure with a one-glance "this week" answer at the top; Pro sections self-hide rather than teasing; empty state is explicit; volume summary collapses the heatmap into one glanceable line; locked tiles explain what unlocks them.
CURRENT WEAKNESSES: Very long stack — up to ~8 distinct sections plus a 7-tile grid, dense for a "landing". Two competing recap entry points (ephemeral card AND a Recaps tile) can both be visible at once. Section labels are all the same muted 13px treatment so visual hierarchy between sections is flat. The PR window toggle (AnalyticsScreen.js:313-322) is small.
NEWBIE QUESTION: Partially. "This week" sessions and "No data yet" are clear, but "This week's volume", "below target"/"over max", and "est. max" concepts assume training-volume literacy a first-timer won't have. The InfoTooltip on volume helps but the rest leans on jargon.
ATHLETE QUESTION: Largely yes — recent sessions, PR sparkline, per-muscle volume, weight trend and the deeper tiles give a competitor real signal. The flat hierarchy and the breadth (everything one tap deep) is reasonable for a power user.
LOCATION QUESTION: Yes. This is the Progress-tab root and acts as the documented hub routing to Consistency, Lifts, Body Metrics, Heatmap and recaps — the natural home for analytics.
VISUAL + USABILITY:
  - ScreenHeader title "Progress": fontSize.xl (20) bold (ScreenHeader.js:53-58 -> theme.js:262).
  - milestoneText / milestoneCta: fontSize.sm (13) semibold (AnalyticsScreen.js:587-588 -> theme.js:259).
  - sectionLabel / seeAll: type.label = fontSize.sm (13) (AnalyticsScreen.js:589-594 -> theme.js:402).
  - recapCardText / insightCopy: fontSize.sm (13) (AnalyticsScreen.js:611,618).
  - volSummaryCount: fontSize.xl (20) bold; volSummaryLabel sm (13); volSummaryFlagText / volSummaryClear: fontSize.micro (10) (AnalyticsScreen.js:625-629). 10px micro labels are below the body min.
  - windowToggleText: fontSize.xs (11) bold (AnalyticsScreen.js:640).
  - prTotal: type.num('caption') = fontSize.xs (11); prBarCount: fontSize.micro (10) (AnalyticsScreen.js:642,648).
  - sessionName: type.bodyStrong (16); sessionMeta: caption (11); diffText: fontSize.xs (11) (AnalyticsScreen.js:663-666).
  - navTileLabel: fontSize.xs (11) semibold; navTileSub: caption (11) (AnalyticsScreen.js:676-688).
  - emptyStateHeading: type.title (17); emptyStateBody: fontSize.sm (13) (AnalyticsScreen.js:697-707).
  - Touch targets: "Make a card", insight dismiss, recap dismiss, PR window toggle all use hitSlop 8-10px to extend small tap areas (AnalyticsScreen.js:189,225,316,406). The PR window toggle's visible body is paddingVertical 3 + paddingHorizontal sm(8) (AnalyticsScreen.js:637) — visually well under 44px but padded by hitSlop 8. NavTile padding spacing.lg(16) gives a tall tile, but "All sessions"/"see all" links (AnalyticsScreen.js:262-268) carry NO hitSlop and are sm(13) text — likely < 44px tap height.
  - Information density: high — multiple cards + a 2-column grid. ScrollView (AnalyticsScreen.js:159) so it scrolls on any size.
  - Clean/cluttered: tends cluttered when all optional sections render together (streak + recap card + insights + weight trend + sessions + volume + cardio + PRs + 7 tiles).
  - Most important action prominent? The "This week" strip is correctly first, but it competes with the recap nudge card directly below it.
  - Small/standard/large: ScrollView throughout; EmptyChartIllustration fixed at 140 (AnalyticsScreen.js:203); navGrid uses minWidth '45%' so it stays 2-up across sizes (AnalyticsScreen.js:671). No fixed full-height content; scales acceptably.
```

---

```
SCREEN: Consistency
WHAT IT IS: The "am I training often enough and is my body keeping up" screen —
  training block, recovery signals, training load, session length, frequency, and
  a 12-week calendar. File: src/screens/ConsistencyScreen.js.
WHAT IS ON IT:
  - "Your weeks" consistency streak section (StreakWeeksSection) (ConsistencyScreen.js:46).
  - Training partner status row (PartnerRow), opening the Partner screen (ConsistencyScreen.js:51).
  - "Lighter week recommended" deload banner (moon icon, title, reason line, InfoTooltip) — only when deloadAlert is set (ConsistencyScreen.js:54-70).
  - "Training block" section: label + InfoTooltip; BlockShapeCard ("Week N of M" dots, shown when plannedWeeks >= 2); MesocyclePulseCard (taps to MesocycleBuilder, build button to PlanLibrary); FatigueTrendCard; BlockProgressCard (ConsistencyScreen.js:73-104).
  - "Recovery signals" (ReadinessCards) (ConsistencyScreen.js:107).
  - "Training load (ACWR)" WorkloadCard — only when workloadData.ratio !== null (ConsistencyScreen.js:110-114).
  - "Session length trend" SessionDurationChart — only when enoughForTrends + bars (ConsistencyScreen.js:117-122).
  - "Training frequency" MuscleFrequencyTable + InfoTooltip, with show-all toggle (ConsistencyScreen.js:125-137).
  - "Training days (last 12 weeks)" TrainingCalendar (ConsistencyScreen.js:140-145).
NAVIGATION: Route "Consistency" in ProgressStack, header title "Consistency" (RootNavigator.js:349). Reached from the Progress landing's "Consistency" nav tile (AnalyticsScreen.js:332). Pushes to: Partner (51) and, via parent navigator, PlansTab -> MesocycleBuilder / PlanLibrary (ConsistencyScreen.js:98-99).
GATING: Free screen — registered with the raw ConsistencyScreen, no withProGuard (RootNavigator.js:349). It reads `tier` and passes it into PartnerRow and ReadinessCards (ConsistencyScreen.js:51,107), which decide their own gating; not determined in this file whether those sub-components gate.
CURRENT STRENGTHS: Tightly scoped to consistency/recovery; pulls this material off the Progress landing so the landing reads as a hub (per the file's own header comment, ConsistencyScreen.js:20-24). Most heavy cards self-hide until there's enough data, so a new user sees a short screen. Good explanatory InfoTooltips on deload and frequency.
CURRENT WEAKNESSES: A lot of distinct card types (block shape, pulse, fatigue, block progress, readiness, workload, duration, frequency, calendar) — once a user has data this is a long, varied wall. "ACWR" appears in a section title (ConsistencyScreen.js:111 label "Training load (ACWR)") — an acronym most users won't know. Heavy reliance on imported sub-components means the screen's own surface is thin but the rendered density is high.
NEWBIE QUESTION: No, not immediately. Mesocycle/deload/ACWR/fatigue-trend are advanced periodisation concepts. The tooltips translate some (the deload tooltip is plain-English) but the section labels themselves are coach-jargon.
ATHLETE QUESTION: Yes — this is exactly the recovery/periodisation dashboard a serious lifter wants (block arc, ACWR, fatigue, frequency, calendar). Strong fit for a competitor.
LOCATION QUESTION: Yes. One tap from the Progress hub under "Consistency", which matches its content.
VISUAL + USABILITY:
  - sectionLabel: type.label = fontSize.sm (13) (ConsistencyScreen.js:156 -> theme.js:402).
  - deloadTitle: type.bodyStrong = fontSize.md (16) semibold, coloured warning (ConsistencyScreen.js:163).
  - deloadSub: fontSize.sm (13) (ConsistencyScreen.js:164).
  - Most visible text lives inside imported components (StreakWeeksSection, *Card, ProgressSections) — NOT DETERMINED IN CODE here; would need those component files.
  - Touch targets: the only interactive elements declared in this file are PartnerRow (delegated) and the MuscleFrequencyTable toggle (delegated). No raw tap target sizes are set in this file.
  - Information density: high once populated; gated sections keep it low for new users.
  - Clean/cluttered: clean structurally (uniform section labels + gap spacing.md), but visually dense when full.
  - Most important action prominent? This is a read screen with little action; the streak + deload banner sit at top, appropriate.
  - Small/standard/large: ScrollView (ConsistencyScreen.js:39) with RefreshControl; no fixed-height blockers in this file; charts sized inside sub-components (NOT DETERMINED here).
```

---

```
SCREEN: Lifts (LiftProgress)
WHAT IT IS: The single home for "am I getting stronger" — overall strength
  standing, relative strength per lift, and a list of every trained lift by its
  estimated-1RM trajectory. File: src/screens/LiftProgressScreen.js.
WHAT IS ON IT:
  - Header card (when bodyweight + strength levels exist): big overall standing label, "overall across N main lifts" sub, "X units from <level> on <lift>" next-target line (or top-of-standards line) (LiftProgressScreen.js:153-169).
  - "Relative strength" label + InfoTooltip explaining bodyweight multiples; "Based on N units bodyweight"; per-lift rows: lift name, narrative ("1.50× your bodyweight" or "80% of your bodyweight"), level badge (Beginner/Novice/Intermediate/Advanced/Elite) (LiftProgressScreen.js:170-192, 28-37).
  - Bodyweight prompt card (when no bodyweight but lifts exist): body icon, "Add your body weight", explainer, chevron; taps to BodyMetrics (LiftProgressScreen.js:194-211).
  - Filter tabs: "All lifts" / "Recent bests" (LiftProgressScreen.js:213-230).
  - Lift list rows (FlatList): name + optional "PR" tag, "<muscle> · N sessions · last <MMM d>", "<bestE1rm><units> est. max" with optional "+N%" delta, a Sparkline trend, chevron. Long-press opens a PeekMenu (View exercise detail / Share this PR) (LiftProgressScreen.js:244-294, 111-135).
  - Empty state: barbell icon, "No lifts logged yet"/"No recent bests", explainer (LiftProgressScreen.js:295-308).
NAVIGATION: Route "LiftProgress" in ProgressStack, header title "Lifts" (RootNavigator.js:348). Reached from the Progress landing "Lifts" nav tile (AnalyticsScreen.js:333). Pushes to: ExerciseDetail (LiftProgressScreen.js:116,253), ShareCard (123), BodyMetrics (197).
GATING: Free screen — registered with the raw LiftProgressScreen, no withProGuard (RootNavigator.js:348). No tier read in this file; all content is available to free users.
CURRENT STRENGTHS: Clear single-purpose screen leading with where you stand, then per-lift trajectories. Relative-strength tooltip is genuinely educational. Recent-best PR markers and the filter make the list scannable. Bodyweight prompt is a smart way to unlock the standing card. Sparkline per row gives instant trend read.
CURRENT WEAKNESSES: "est. max" / "estimated 1RM" is unexplained on the row itself (only relative-strength has a tooltip). The standing headline label colour is amber primary at 32px (LiftProgressScreen.js:338-343) — visually dominant, which is good, but the next-target line in 13px below it is easy to miss. The level taxonomy (Beginner..Elite) has no in-row explanation of thresholds.
NEWBIE QUESTION: Partially. "Add your body weight" and the level badges are approachable, but "est. max", "1.50× your bodyweight" and percentage deltas assume some lifting knowledge. A first-timer with one session sees the empty state, which is clear.
ATHLETE QUESTION: Yes, strongly. Strength standards, relative-to-bodyweight ratios, e1RM trends and shareable PRs are exactly what a competitor tracks. The lbs/kg conversion fix note (LiftProgressScreen.js:72-78) shows care about correctness.
LOCATION QUESTION: Yes. One tap from the Progress hub under "Lifts"; correct home for strength progression.
VISUAL + USABILITY:
  - standingLabel: fontSize.xxxl (32) heavy, lineHeight 36, primary colour (LiftProgressScreen.js:338-343 -> theme.js:264).
  - standingSub: type.caption (11); standingNext: type.label (13) (LiftProgressScreen.js:345-346).
  - sectionLabel: type.label (13); sectionSub: type.caption (11) (LiftProgressScreen.js:347-348).
  - strengthName: type.label (13); strengthNarrative: type.num('caption') (11); levelBadgeText: fontSize.xs (11) semibold (LiftProgressScreen.js:357-360).
  - bwPromptTitle: type.bodyStrong (16); bwPromptText: fontSize.xs (11) (LiftProgressScreen.js:373-374).
  - filterTabText: type.label (13) (LiftProgressScreen.js:388).
  - card name: type.bodyStrong (16); prTagText: fontSize.micro (10) bold; meta: type.caption (11) (LiftProgressScreen.js:404-412).
  - statValue: fontSize.lg (17) heavy; statLabel: caption (11); delta: type.num('label') (13) (LiftProgressScreen.js:414-416).
  - emptyTitle: type.title (17); emptyText: fontSize.sm (13) (LiftProgressScreen.js:419-420).
  - Touch targets: filterTab is paddingVertical sm(8) — likely < 44px tall (LiftProgressScreen.js:378-380); flag. Lift card padding spacing.lg(16) gives a tall, comfortable target. bwPromptCard padding lg(16) — fine.
  - Information density: header card is dense (standing + ratio list); list rows are medium. Manageable via FlatList.
  - Clean/cluttered: clean; consistent surface cards with border.
  - Most important action prominent? The standing headline (32px primary) is the most prominent element, appropriate; the primary navigational action (tap a lift) is the full-width card.
  - Small/standard/large: FlatList (LiftProgressScreen.js:236) scrolls; Sparkline fixed width 84 / height 34 (LiftProgressScreen.js:288) — fixed, won't scale but small. Level badge has flexShrink:0 (LiftProgressScreen.js:359) so on a small screen a long lift name truncates rather than crushing the badge. Generally responsive.
```

---

```
SCREEN: Volume (VolumeHeatmap)
WHAT IT IS: The single "volume home" — an anatomical body heatmap plus per-muscle
  weekly working-set bars against MEV/MAV/MRV landmarks, a rolling window selector,
  a volume trend section, and an editor for custom volume targets.
  File: src/screens/VolumeHeatmapScreen.js.
WHAT IS ON IT:
  - BodyDiagramHeatmap (anatomical diagram; tapping a region scrolls to that muscle's bar) (VolumeHeatmapScreen.js:231-234, 207-212).
  - Rolling window selector: "1 week" / "2 weeks" / "4 weeks" buttons (VolumeHeatmapScreen.js:237-266, 24-28).
  - Window note line with clock icon ("Showing sets from the last week", etc.) (VolumeHeatmapScreen.js:269-272, 214-219).
  - Legend: "Below minimum" / "Optimal" / "Getting close" / "Too much" + InfoTooltip explaining the ticks (VolumeHeatmapScreen.js:275-288).
  - Per-muscle rows: muscle name, a bar track with current fill (status colour), a faint "ghost" fill for the previous window, two landmark ticks (MEV/MAV), "<sets>" coloured count, "/<mrv>" label, and a "last trained" chip ("Today"/"Yesterday"/"Nd ago") (VolumeHeatmapScreen.js:299-351, 221-225).
  - "Volume trend" section (hidden if no trained muscles): title, WindowChips (4W/8W/3M/6M), a takeaway line, and per-muscle MuscleTrendRow mini bar charts with scrub (VolumeHeatmapScreen.js:354-370, 437-490).
  - Edit mode: "Edit Volume Targets" with Min/Target/Max number inputs per muscle, Cancel/Save; otherwise an action row "Edit Volume Targets" + "Reset to Defaults" (VolumeHeatmapScreen.js:372-418).
NAVIGATION: Route "VolumeHeatmap" registered in THREE stacks: ProgressStack (title "Volume Heatmap", RootNavigator.js:345), HomeStack (title "Volume", RootNavigator.js:298). Reached from the Progress landing volume summary strip (AnalyticsScreen.js:288) and other volume entry points. The screen itself does not call navigation.navigate (no outbound pushes in this file).
GATING: Free screen — registered with the raw VolumeHeatmapScreen, no withProGuard in any stack (RootNavigator.js:298,345). No tier read in this file.
CURRENT STRENGTHS: A genuinely premium centrepiece — anatomical diagram tied to scrollable bars, week-over-week ghost fill, MEV/MAV/MRV landmark ticks, last-trained recency chips, and editable targets that sync to cloud. The legend + InfoTooltip explain the model. Trend section has its own window control.
CURRENT WEAKNESSES: Conceptually the densest screen in the set — MEV/MAV/MRV, ghost fills, landmark ticks and "working sets" are a lot to parse. The per-muscle row packs name + bar + count + /mrv + recency chip into one line (VolumeHeatmapScreen.js:311-349); on a small phone that is tight. The edit form is a long per-muscle list of 3 inputs each — heavy. Reset button is error-coloured (red) which reads as dangerous for a benign reset (VolumeHeatmapScreen.js:649-651).
NEWBIE QUESTION: No. "Below minimum/Optimal/Getting close/Too much" is a decent plain-English legend, but the underlying MEV/MAV/MRV volume-landmark model, "working sets", and editing per-muscle ceilings are advanced. A beginner will not know what numbers to aim for.
ATHLETE QUESTION: Yes, very much — this is the kind of evidence-based volume tracking (Renaissance-Periodization-style landmarks) a competitor or advanced lifter wants, including customisable targets.
LOCATION QUESTION: Yes, but slightly diffuse: it is registered in both Progress and Home stacks (and titled differently — "Volume" vs "Volume Heatmap", RootNavigator.js:298 vs 345). The Progress hub's volume summary is the natural door; the dual registration/title is a minor inconsistency.
VISUAL + USABILITY:
  - windowBtnText: type.label = fontSize.sm (13) (VolumeHeatmapScreen.js:532-534 -> theme.js:402).
  - windowNoteText: fontSize.xs (11) (VolumeHeatmapScreen.js:540-545).
  - Legend item label: fontSize.micro (10) (VolumeHeatmapScreen.js:428).
  - muscleName (bar row): type.label (13); setsCount: fontSize.sm (13) bold; mrvLabel: type.num('caption') (11); lastTrainedChip: fontSize.xs (11) (VolumeHeatmapScreen.js:569-613).
  - trendTakeaway: fontSize.sm (13); sectionTitle: type.label (13) (VolumeHeatmapScreen.js:622-627).
  - trend-row muscleName: type.caption (11), width 80; currentCount: fontSize.xs (11) bold (VolumeHeatmapScreen.js:499-515).
  - editTitle: type.title (17); editSubtitle: fontSize.sm (13); editMuscleName: type.label (13); editInputLabel: type.caption (11); editInput text: fontSize.md (16) bold (VolumeHeatmapScreen.js:660-682).
  - editBtnText/resetBtnText: type.label (13); cancelBtnText: type.body (16); saveBtnText: fontSize.md (16) bold (VolumeHeatmapScreen.js:641-699).
  - Touch targets: window buttons paddingVertical sm(8) — likely < 44px tall, no hitSlop (VolumeHeatmapScreen.js:526-530); flag. Edit/Reset/Cancel/Save buttons paddingVertical md(12) — closer but still likely < 44px (VolumeHeatmapScreen.js:636-697); flag. editInput paddingVertical sm(8) — small for a number field (VolumeHeatmapScreen.js:675). Bar-track height is only 8px (VolumeHeatmapScreen.js:575) but the row tap is handled via the diagram, not the bar.
  - Information density: very high in the per-muscle bar list and the edit form.
  - Clean/cluttered: borderline cluttered on the bar rows (5 elements per line); the trend section and editor are clean.
  - Most important action prominent? The body diagram + bars (the read) are the hero; the Edit/Reset actions are de-emphasised at the bottom, appropriate.
  - Small/standard/large: ScrollView (VolumeHeatmapScreen.js:229). Trend rows use fixed bar width 8 / gap 2 / height 24 and a fixed 80px name column + 20px count column (VolumeHeatmapScreen.js:433-435,500,510) — fixed sizes that won't scale; on a small screen the chart area (flex) just narrows. muscleName bar column fixed at width 90 (VolumeHeatmapScreen.js:571). BodyDiagramHeatmap sizing NOT DETERMINED here.
```

---

```
SCREEN: Body Metrics
WHAT IT IS: Body-weight + measurement tracking: log weight/body-fat/measurements,
  smoothed weight + body-fat + measurement trend charts, an EWMA weight-trend
  card, an estimated-daily-burn (adaptive TDEE) card, and history. Behind an opt-in
  gate and a calm-mode re-confirmation. File: src/screens/BodyMetricsScreen.js.
WHAT IS ON IT:
  - Opt-in gate (when not enabled): lock icon, "Physique Tracking" title, explainer ("All data stays on your device"), "Enable Physique Tracking" button (BodyMetricsScreen.js:368-383, 673-681).
  - Calm-mode re-confirmation (once per session): leaf icon, "A gentle check-in", body, Continue button, wellbeing helpline (BodyMetricsScreen.js:684-712).
  - Weight snapshot card: "Weight · <date>" title + phase chip (Gaining/Losing weight/Maintaining), big current weight value + DeltaBadge, WeightTrendChart with WindowChips + takeaway, "log 3+ times" hint (BodyMetricsScreen.js:732-763, 103-126, 134-236).
  - EWMA card: "Weight trend" label, smoothed value in kg, weekly change, explainer, optional average-intake line (BodyMetricsScreen.js:766-797).
  - "Estimated daily burn" card: cold-start copy until ~2 weeks, else adjusted TDEE value, insight, confidence line (BodyMetricsScreen.js:799-825).
  - Body-fat block: "Body fat" + value + neutral DeltaBadge, BodyFatTrendChart (smoothed + faint raw line) (BodyMetricsScreen.js:830-843, 240-301).
  - Empty state: EmptyBodyIllustration (140px), "Your progress starts here", onboarding-weight-aware copy (BodyMetricsScreen.js:845-861).
  - "Log Weight" button (toggles the form) (BodyMetricsScreen.js:864-873).
  - Log form: Date, Body weight (st+lbs OR single unit), Body fat %, collapsible Measurements (9 fields), Notes, "Save Entry" (BodyMetricsScreen.js:876-998).
  - Measurements snapshot: grid of measurement cells (value + label + delta), horizontal measurement tab row, MeasurementTrendChart (BodyMetricsScreen.js:1000-1061, 305-356).
  - History: last 12 rows (date + weight + up to 2 measurements) (BodyMetricsScreen.js:1063-1086).
NAVIGATION: Route "BodyMetrics" registered as GatedBodyMetrics in ProgressStack (title "Body Metrics", RootNavigator.js:347) AND ProfileStack (title "Body Metrics", RootNavigator.js:386). Reached from the Progress landing "Body Metrics" nav tile (AnalyticsScreen.js:340) and the Lifts bodyweight prompt (LiftProgressScreen.js:197). No outbound navigation in this file.
GATING: PRO — wrapped via `GatedBodyMetrics = withProGuard(BodyMetricsScreen, 'Body metrics')` (RootNavigator.js:151) and registered under that guard in both stacks (RootNavigator.js:347,386). In addition to the Pro guard there is a separate in-screen opt-in (`PHYSIQUE_PREF_KEY`, auto-enabled for Pro, BodyMetricsScreen.js:455-466) and a calm-mode re-confirmation (BodyMetricsScreen.js:684-712).
CURRENT STRENGTHS: Careful safety/sensitivity handling: opt-in gate, calm-mode re-confirmation, neutral (non-valenced) delta badges, ED-flag suppression of rate-of-change (BodyMetricsScreen.js:757,1092-1108). Rich analytics (EWMA, robust smoother, adaptive TDEE with confidence tiers). Optimistic save with rollback (BodyMetricsScreen.js:633-663). Onboarding-weight auto-seed avoids a blank first screen.
CURRENT WEAKNESSES: This is the longest, densest screen of the set — snapshot + EWMA + burn + body-fat + log form + measurement grid + measurement tabs + history all on one ScrollView. Date entry is a free-text "YYYY-MM-DD" TextInput (BodyMetricsScreen.js:881-888) rather than a date picker — error-prone. formLabel column fixed at width 140 (BodyMetricsScreen.js:1204) can crowd inputs on small screens. Two overlapping ways to pick a measurement (grid cells AND tab row) (BodyMetricsScreen.js:1004-1050).
NEWBIE QUESTION: Mostly yes for the basics (log weight, see trend), helped by plain copy. But "EWMA", "Estimated daily burn / adaptive TDEE", body-fat % and the confidence tiers are advanced; a first-timer won't need or understand them. The opt-in/calm gates are clearly worded though.
ATHLETE QUESTION: Yes — st/lbs/kg support, body fat, 9 site measurements, smoothed trends, weekly-change rate and reverse-engineered TDEE are exactly what a physique competitor tracks during a prep.
LOCATION QUESTION: Yes — reachable from both the Progress hub and the You/Profile stack, which suits a metrics screen that's both analytics and a settings-adjacent log.
VISUAL + USABILITY:
  - optInTitle: fontSize.xxl (24) black; optInBody: fontSize.sm (13) (BodyMetricsScreen.js:1122-1125 -> theme.js:263).
  - confirmTitle: type.h3 (20); confirmBody: fontSize.sm (13); confirmHelpline: fontSize.xs (11) (BodyMetricsScreen.js:1136-1143).
  - sectionTitle: type.label (13) (BodyMetricsScreen.js:1114-1116).
  - weightValue: fontSize.xxxl (32) black (BodyMetricsScreen.js:1167).
  - phaseLabel: fontSize.xs (11) bold; trendHint: type.caption (11) italic (BodyMetricsScreen.js:1165,1168).
  - bodyFatValue: type.num('h3') (20) (BodyMetricsScreen.js:1172).
  - measureValue: type.num('bodyStrong') (16); measureLabel: type.caption (11); measureTabText: fontSize.xs (11) (BodyMetricsScreen.js:1179-1190).
  - logBtnText: type.title (17) (BodyMetricsScreen.js:1197).
  - formTitle: type.title (17); formLabel: fontSize.sm (13); formInput text: type.body (16) (BodyMetricsScreen.js:1202-1209).
  - measureToggleText: fontSize.sm (13); saveBtnText: type.bodyStrong (16) (BodyMetricsScreen.js:1216,1222).
  - historyDate: fontSize.sm (13); historyWeight: type.num('bodyStrong') (16); historyMeasure: type.num('caption') (11) (BodyMetricsScreen.js:1229-1232).
  - ewmaValue: type.num('h3') (20); ewmaLabel/ewmaMuted: type.caption (11); ewmaWeekly: fontSize.sm (13) (BodyMetricsScreen.js:1238-1242).
  - burnValue: type.num('h2') (24); burnLabel/burnMuted/burnConfidence: type.caption (11) / sm (BodyMetricsScreen.js:1247-1252).
  - DeltaBadge text: 10 (small) or fontSize.xs (11) (BodyMetricsScreen.js:1103).
  - Chart takeaway: fontSize.sm (13); emptyHintText: type.caption (11) italic (chartStyles, BodyMetricsScreen.js:360-362).
  - Touch targets: logBtn paddingVertical lg(16) — comfortable. saveBtn / optInBtn / confirmBtn paddingVertical md/lg — closer to 44px. measureToggle / measureTab / measureCell have NO hitSlop; measureTab paddingVertical xs(4) is very small (BodyMetricsScreen.js:1185) — flag, < 44px. formInput paddingVertical sm(8) — small for a tap-to-edit field; flag.
  - Information density: very high once populated (the densest screen audited).
  - Clean/cluttered: cluttered when full — many stacked cards of similar surface treatment with limited hierarchy beyond the section labels.
  - Most important action prominent? The big weight value (32px) is the visual hero; the primary action "Log Weight" is a full-width primary-filled button (BodyMetricsScreen.js:864-873), appropriately prominent.
  - Small/standard/large: ScrollView (BodyMetricsScreen.js:725). SCREEN_W captured once at module load (BodyMetricsScreen.js:99) and chart widths derived as SCREEN_W - 64 (e.g. BodyMetricsScreen.js:177,275,334) — fixed at first launch, won't react to rotation but tracks device width. Charts fixed heights 100-120. formLabel fixed 140 (BodyMetricsScreen.js:1204) and measureCell minWidth '30%' (BodyMetricsScreen.js:1175) — on a 5.4" device the 140px label leaves a narrow input.
```

---

```
SCREEN: Snapshots (Restore a snapshot)
WHAT IT IS: Lists automatic local database safety-copies (taken before app
  updates / account switches) and offers a two-tap destructive restore.
  File: src/screens/SnapshotsScreen.js.
WHAT IS ON IT:
  - SettingsPage container (SnapshotsScreen.js:65).
  - "Loading…" while listing (SnapshotsScreen.js:67-68).
  - Empty note when none: explains snapshots appear after the next update (SnapshotsScreen.js:69-73).
  - One SettingRow per snapshot: time icon, label, size sub ("X MB"/"X KB"), destructive styling; tapping fires a confirm dialog (SnapshotsScreen.js:75-85, 20-24).
  - Confirm dialog (appAlert): "Restore this snapshot?" warning that it replaces ALL data and cannot be undone, Cancel / Restore (destructive). On confirm: closes the DB, restores the file, then prompts a full relaunch (SnapshotsScreen.js:35-62).
  - Footer explainer: snapshots are automatic, device-only, most-recent-few retained (SnapshotsScreen.js:87-90).
NAVIGATION: Route "Snapshots" in ProfileStack, header title "Restore a snapshot" (RootNavigator.js:381). Reached from the You/Profile (Settings) flow — NOT from the Progress hub. The cross-account-switch alert in RootNavigator points users to "Settings, Your data" to restore (RootNavigator.js:859). No outbound navigation in this file.
GATING: Free / not Pro-gated — registered with the raw SnapshotsScreen, no withProGuard (RootNavigator.js:381). No tier read.
CURRENT STRENGTHS: Minimal, focused, and appropriately cautious: explicit two-step destructive confirm, plain-English "cannot be undone", DB handle closed before overwrite, manual-relaunch prompt to avoid SQLite corruption. Good empty-state explanation. Reuses Settings primitives for visual consistency.
CURRENT WEAKNESSES: Restore requires the user to manually fully close and reopen the app (SnapshotsScreen.js:51-53) — a clunky final step with no in-app reload. Snapshot labels come from dbSnapshot (NOT DETERMINED here) so list rows may be terse. No way to delete or name a snapshot from this screen.
NEWBIE QUESTION: Adequately — the copy is plain ("automatic safety copy", "replaces ALL current data"). A newbie is unlikely to ever need it, and the footer explains what it is. The relaunch instruction is clear.
ATHLETE QUESTION: Yes — it's a data-safety utility, not a training surface; an athlete needs nothing more from it. It does what it says.
LOCATION QUESTION: Yes. It belongs in the You/Settings "Your data" area (where it lives), not in Progress. Correct placement; it is out of scope of the Progress hub by design.
VISUAL + USABILITY:
  - Empty/loading note: fontSize.sm (13), padding lg, lineHeight 20 (SnapshotsScreen.js:96 -> theme.js:259).
  - Footer: fontSize.xs (11) (SnapshotsScreen.js:97 -> theme.js:258).
  - SettingRow label/sub fonts: defined in SettingsPrimitives — NOT DETERMINED IN CODE here.
  - Touch targets: rows are SettingRow components (SnapshotsScreen.js:76-83); their tap height is set in SettingsPrimitives — NOT DETERMINED here.
  - Information density: very low — a short list + two notes. Clean by construction.
  - Clean/cluttered: clean.
  - Most important action prominent? The destructive restore is gated behind a tap + confirm, which is the right priority for a dangerous action (it should not be one-tap prominent).
  - Small/standard/large: SettingsPage handles scrolling (NOT DETERMINED here); content is short so all sizes are fine. localStyles use token spacing, no fixed pixel widths.
```

---

```
SCREEN: Year of Lifts / Recaps (YearOfLiftsScreen)
WHAT IT IS: A full-screen, swipeable "story" (Spotify-Wrapped style) summarising a
  period of training. One renderer, three variants: 'year' (Year of Lifts),
  'month' (monthly Recap), and 'block' (block reflection).
  File: src/screens/YearOfLiftsScreen.js.
WHAT IS ON IT:
  - Top progress pips (one per card), a Share button, and a Close (X) button (YearOfLiftsScreen.js:478-509).
  - Loading line ("Building your year…/recap…/block story…") (YearOfLiftsScreen.js:511-515).
  - Empty state: barbell icon, "No sessions yet", body, "Done" button (YearOfLiftsScreen.js:517-533).
  - Horizontal paging FlatList of StoryCards (YearOfLiftsScreen.js:537-550). Card types:
      * intro/outro: icon + big headline (44px) + subline (YearOfLiftsScreen.js:322-327, 651-662).
      * stat: icon + huge value (96px, auto-shrink) + unit + caption (YearOfLiftsScreen.js:312-320, 632-648).
      * list: icon + headline + subline + ranked top-5 rows (rank, primary name, secondary value) (YearOfLiftsScreen.js:329-343, 664-697).
  - Year deck content: intro, sessions, kg moved, sets, busiest month, top lifts, personal bests, outro (YearOfLiftsScreen.js:49-154).
  - Month deck content: intro, sessions (with month-vs-month delta unless neutral), tonnage, top lifts, PRs, best session, outro; neutral framing under calm/ED flag (YearOfLiftsScreen.js:167-249).
  - Block deck content: intro, weekly-volume climb %, PRs, sessions+sets+tonnage, outro (YearOfLiftsScreen.js:253-294).
  - Tap zones: a narrow band under the pips — left=previous, right=next (YearOfLiftsScreen.js:562-565, 703-711).
  - Share: builds a milestone card (factual training stats only) and navigates to ShareCard (YearOfLiftsScreen.js:425-471).
NAVIGATION: Registered TWICE in ProgressStack — route "YearOfLifts" and route "RecapStory", both -> YearOfLiftsScreen, both headerShown:false (RootNavigator.js:352-353). Reached from the Progress landing: "Year of Lifts" tile -> YearOfLifts (AnalyticsScreen.js:385); the ephemeral recap card and "Recaps" tile -> RecapStory with month params (AnalyticsScreen.js:215,370). Pushes to: ShareCard (YearOfLiftsScreen.js:470); otherwise navigation.goBack() to dismiss (YearOfLiftsScreen.js:413,502).
GATING: Free / not Pro-gated — both routes register the raw YearOfLiftsScreen, no withProGuard (RootNavigator.js:352-353). No tier read. (Access is data-gated upstream on the landing: Recaps unlock after 10 sessions, Year of Lifts after 365 days — AnalyticsScreen.js:352-388.)
CURRENT STRENGTHS: A delightful, on-brand moment — full-bleed gradient story cards, a 96px hero stat, tap/swipe navigation with pips, shareable. Smart safety: empty/zero cards are dropped so the deck stays tight (YearOfLiftsScreen.js:63-151); neutral framing under calm/ED flags removes comparison pressure (YearOfLiftsScreen.js:167,371-377); share payload is explicitly factual-stats-only, no bodyweight (YearOfLiftsScreen.js:424-471). The tap-zone-band fix (YearOfLiftsScreen.js:552-565) addresses a real Android swipe bug.
CURRENT WEAKNESSES: The tap zones are a narrow 56px band at fixed top:50 (YearOfLiftsScreen.js:703-708) — tap-to-advance is discoverable only by trial; most of the card is swipe-only. Two routes (YearOfLifts + RecapStory) point at the same component, a slight registration redundancy. Auto-shrinking the 96px hero (adjustsFontSizeToFit, YearOfLiftsScreen.js:314) can make long numbers small with no minimum floor stated.
NEWBIE QUESTION: Yes — this is the most universally legible screen of the set. Big numbers, plain captions ("Roughly 3 a week. That's consistency."), familiar story UX. A first-timer immediately gets it (and is gated out until they have data anyway).
ATHLETE QUESTION: Yes for delight/sharing; it's a celebration surface, not an analysis tool. A competitor gets a shareable highlight reel (sessions, tonnage, PRs, block climb). It doesn't replace the analytical screens, nor is it meant to.
LOCATION QUESTION: Yes. Lives in the Progress stack and is launched from the Progress hub's Recaps / Year-of-Lifts tiles and the ephemeral nudge — the right home for a periodic celebration.
VISUAL + USABILITY:
  - statValue: fixed 96px black, lineHeight 100, letterSpacing -2 (YearOfLiftsScreen.js:632-639) — by-design hero, eslint-disabled.
  - statUnit: type.h3 (20); statCaption: type.body (16) (YearOfLiftsScreen.js:640-648).
  - heroHeadline: fixed 44px black (YearOfLiftsScreen.js:651-658); heroSubline: type.body (16) (YearOfLiftsScreen.js:659-662).
  - listHeadline: fontSize.xxl (24) black; listSubline: fontSize.sm (13) (YearOfLiftsScreen.js:666-675).
  - listRank: fontSize.lg (17) black primary; listPrimary: type.bodyStrong (16); listSecondary: fontSize.sm (13) (YearOfLiftsScreen.js:682-697).
  - loadingText: fontSize.sm (13); emptyTitle: type.bodyStrong (16); emptyBody: fontSize.sm (13) (YearOfLiftsScreen.js:604-606).
  - doneBtnText: type.bodyStrong (16) (YearOfLiftsScreen.js:721-724).
  - Touch targets: Share + Close buttons are 30x30 with hitSlop 10 each side -> ~50px effective (YearOfLiftsScreen.js:493,503,591-598) — OK via hitSlop, but visible glyph area is < 44px. Tap zones are a 56px-tall band (YearOfLiftsScreen.js:705) — tall enough but narrow vertically and positioned only under the pips. doneBtn padding md(12)/xl(24) — comfortable.
  - Information density: low per card (one idea per card) — the opposite of the other screens; appropriate for a story.
  - Clean/cluttered: very clean / premium.
  - Most important action prominent? The hero stat is the whole card; advancing is the implicit primary action via tap/swipe. Close (X) and Share are top-right, secondary, appropriate.
  - Small/standard/large: cardWrap width = SCREEN_W and getItemLayout uses SCREEN_W (YearOfLiftsScreen.js:610,549,545) — paging is correct per device width but SCREEN_W is captured once at module load (YearOfLiftsScreen.js:32) so rotation isn't handled. statValue 96px / heroHeadline 44px are fixed; statValue auto-shrinks to fit, heroHeadline does NOT (could overflow on a 5.4" with a long headline). card minHeight '100%' so it always fills the screen on every size.
```


<!-- ==== phase1/10-share-exercise.md ==== -->

# Phase 1 inventory — Share Card + Exercise Detail (2026-06-13)

Source files read in full:
- `src/screens/ShareCardScreen.js` (1–1619)
- `src/screens/ExerciseDetailScreen.js` (1–1153)
- `src/styles/theme.js` (1–538, for token resolution)
- `src/navigation/RootNavigator.js` (route registration lines only)
- `src/lib/formTips.js` (1–60, to confirm FORM_TIPS content type)

Token values used below (theme.js):
- `fontSize.xs (11)` theme.js:258, `fontSize.sm (13)` theme.js:259, `fontSize.md (16)` theme.js:260, `fontSize.lg (17)` theme.js:261, `fontSize.xl (20)` theme.js:262, `fontSize.xxl (24)` theme.js:263.
- `type.label` → `fontSize.sm (13)` / medium theme.js:402-405; `type.caption` → `fontSize.xs (11)` theme.js:406-409; `type.title` → `fontSize.lg (17)` theme.js:390-393; `type.bodyStrong` → `fontSize.md (16)` theme.js:398-401; `type.num('title')` → `fontSize.lg (17)` tabular theme.js:417-420 + 390-393; `type.num('bodyStrong')` → `fontSize.md (16)`; `type.num('caption')` → `fontSize.xs (11)`.
- spacing: `xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48` theme.js:228-239. radius: `xs 4, sm 6, md 10, lg 14, xl 20, full 999` theme.js:241-248.

---

```
SCREEN: Share Card (ShareCardScreen)
WHAT IT IS: A composer that turns a finished workout, a single PR, or a milestone into a branded shareable image (square 1:1 or story 9:16) plus an optional one-page PDF summary. It shows a live in-app preview, privacy toggles for what to include, then renders the real export off-screen in a hidden WebView canvas and hands it to the OS share sheet. (ShareCardScreen.js:759, 1017)

WHAT IS ON IT:
  - Card-type segmented control: shows only the buttons matching the data the screen was opened with — "Session", "New PR", "Milestone" (ShareCardScreen.js:1022-1032). Buttons render conditionally on sessionData / prData / milestoneData (1023, 1026, 1029).
  - "Format" section title + segmented control: "Story 9:16" (phone-portrait-outline icon) and "Square 1:1" (square-outline icon) (ShareCardScreen.js:1035-1051). Icon size 15 (1042, 1048).
  - "Preview" section title (ShareCardScreen.js:1055) + live preview card. Renders MilestonePreview / SessionPreview / PRPreview depending on cardType (ShareCardScreen.js:1057-1083). Preview itself shows (per card type): top amber accent bar, brand wordmark image + date, plan label, hero session/exercise name, hero stat number + label, intensity badge (SOLID/TOUGH/EPIC SESSION), 2–3 stat boxes (Sets / Time / Exercises or Total kg), top-lift card (story only), exercise chips (story only), and a branded footer (wordmark + "SMARTER  TRAINING" tagline + "volyume.app" + amber accent) (SessionPreview 1256-1322; PRPreview PR badge "★ PERSONAL RECORD ★", exercise name, weight×reps, previous best 1331-1365; MilestonePreview eyebrow/title/hero value/unit/caption/stats 1367-1411).
  - "What to include" section title (ShareCardScreen.js:1089) + a toggles card. Always: "Date" toggle (1091). Session adds: "Plan name", "Total weight lifted", "Exercise names" (1094-1096). PR adds: "PR weight", "Previous best" (1101-1102). Each is a RN Switch (ToggleRow 1427-1439).
  - Privacy note text: "Name, bodyweight, measurements and private notes are never included." (ShareCardScreen.js:1106-1108).
  - Primary "Share …" button (label "Share Session Card" / "Share PR Card" / "Share Card") with share-outline icon, shows ActivityIndicator while sharing (ShareCardScreen.js:1112-1127).
  - Secondary "Save as PDF" button with document-text-outline icon, ActivityIndicator while exporting (ShareCardScreen.js:1130-1145).
  - Hidden off-screen WebView (1×1 px, opacity 0) that actually renders the export PNG (ShareCardScreen.js:1148-1158, style hiddenWebView 1617).
  - Toasts for: missing packages (878, 997), not-ready (882), couldn't generate (895, 909, 922), sharing unavailable (916, 1005), couldn't make PDF (1011).
  - Exported image content (drawn on canvas, not RN): vertical gradient bg, top amber bar, date top-right, plan label, hero session name (up to 2 lines), hero stat (PR count OR total kg OR working sets), intensity badge, support stat pills, top-lift card, exercise chips (up to 5, "+N more"), motivational closer line (tough/epic only), branded footer with real wordmark image / "SMARTER  TRAINING" / "volyume.app" (drawSession 386-516; drawPR 518-597; drawMilestone 603-705).

NAVIGATION: Route "ShareCard", component ShareCardScreen, title "Share Card". Registered in THREE stacks in RootNavigator.js — line 299, line 354, and line 390 (import at RootNavigator.js:63). Reached by navigating to "ShareCard" with route.params carrying sessionData / prData / milestoneData (ShareCardScreen.js:761-765). It does not push to any other screen; its terminal action is the OS share sheet via Sharing.shareAsync (917, 1006). The exact upstream callers were NOT TRACED in the files read (out of scope of the two target screens).

GATING: NOT DETERMINED IN CODE within ShareCardScreen.js — the file contains no withProGuard, no ProGate, and no useAppStore tier/Pro check (no import of useAppStore at all). Whether the route is gated is decided by the caller / navigator config not present in this file. Per CLAUDE.md the Plan Library / workout logging / personal bests that feed these cards are Free features, but the guard itself is NOT DETERMINED IN CODE here.

CURRENT STRENGTHS:
  - Strong privacy posture: explicit per-field include toggles plus a written guarantee that name/bodyweight/measurements/notes are never shared (1091-1108).
  - Live WYSIWYG preview matched deliberately to the canvas export (comments at 1182-1184, 1199-1211 confirm preview mirrors the export).
  - Robust failure handling: 10s capture failsafe timer (891-896), 2s logo-decode watchdog inside the WebView (749), try/catch around draw with error postback (725-728, 897-900), vector wordmark fallback if the image never decodes (221-231).
  - Defensive optional-require of native modules (16-21) with user-facing "needs a rebuild" toasts rather than a crash (877-879, 996-998).
  - Two export formats (PNG card + crisp text PDF) from one data set (buildParams 832-874 feeds both).

CURRENT WEAKNESSES:
  - Very long single file (1619 lines) mixing the giant inline WEBVIEW_HTML canvas string (39-757), the screen, four preview components, and two stylesheets — hard to scan.
  - The canvas withAlpha helper (70-92) is duplicated from theme.js withAlpha (204-226) and must be kept in sync by hand (comment 68-69 documents a past production bug from drift).
  - Brand palette is hand-copied into the WebView `B` object (52-61) rather than read from theme tokens, so a theme change does not propagate to exports (comment 48-51 acknowledges this).
  - Many canvas font sizes are hard-coded px on a fixed 1080-wide canvas (e.g. 22, 46, 52, 220) — fine for the fixed export, but the in-app preview uses fixed px too (see VISUAL section) which will not scale with the Larger Text accessibility setting.
  - No on-screen explanation of where the shared image goes after the share sheet, and no "saved to gallery" affordance (only the share sheet).

NEWBIE QUESTION: Mostly yes. The segmented controls, preview, and plain-language toggles ("Date", "Plan name", "Total weight lifted") are self-explanatory, and the privacy note reassures. A first-timer may not know what "Story 9:16" vs "Square 1:1" means in posting terms, and "Milestone"/"intensity tier" labels (SOLID/TOUGH/EPIC) are app-defined with no inline explanation.

ATHLETE QUESTION: Largely yes for sharing. A competitor gets top lift, tonnage, PR count, est-max-adjacent stats and a clean brand. Gaps: no control over which stat is the hero (it is auto-chosen 429-441), no per-exercise breakdown on the image card (only the PDF table has exercise/sets rows 937-948), and units are hard-defaulted to "kg" in several canvas paths (310, 498) rather than always honouring a user lb preference (PR path does pass p.units 578).

LOCATION QUESTION: Reasonable. It is a leaf/terminal utility reached contextually from a finished session, a PR, or a milestone, and registered in the three stacks that own those flows (RootNavigator.js:299, 354, 390). It correctly has no further navigation. Whether it should also be reachable as a standalone "share my stats" entry point is a product question, NOT DETERMINED IN CODE.

VISUAL + USABILITY:
  - Font size of each text element (in-app chrome, not the fixed canvas export):
    - sectionTitle ("Format" / "Preview" / "What to include"): `fontSize.xs (11)`, black weight, letterSpacing 1.5 — ShareCardScreen.js:1576-1578.
    - segment button text: `fontSize.sm (13)` — ShareCardScreen.js:1589.
    - toggle row label: `fontSize.sm (13)` — ShareCardScreen.js:1602.
    - privacy note: `fontSize.xs (11)`, lineHeight 16 — ShareCardScreen.js:1603.
    - share button text: `fontSize.md (16)` bold — ShareCardScreen.js:1610.
    - PDF button text: `fontSize.md (16)` bold — ShareCardScreen.js:1616.
    - Preview internal text uses FIXED px literals, NOT tokens, e.g. heroNumber 48/72 (1277), heroLabel 8/10 (1280), planLabel 8 (1457), statValue 14/16 (1289), statLabel 6 (1491), chipText 6.5 (1513), footerTagline 7/9 (1206), footerUrl 6.5 (1530), topLiftLabel 5.5 (1501), prBadgeText 7.5 (1543), msStatLabel 6 (1569). Many are far below a legible body size, but they are a scaled-down representation of the export, not interactive copy.
  - Touch targets:
    - Segment buttons: paddingVertical `spacing.sm + 1 (9)` + text line, inside a row; height is roughly text(13)+18 ≈ 31px — BELOW 44px (segment style 1584-1587). Flag.
    - ToggleRow: paddingVertical `spacing.md (12)` each side around a Switch → ≈ Switch height + 24 ≥ 44px (1597-1598). OK.
    - Share button: paddingVertical `spacing.lg (16)` → ≈ 16+16+text ≈ 48px. OK (1607).
    - PDF button: paddingVertical `spacing.lg (16)` → ≈ 48px. OK (1613).
    - SegmentBtn has no hitSlop and no accessibilityRole (1415-1425); the PDF and share buttons set accessibility props (1134-1135) but the format/type segments do not.
  - Information density: Moderate and well-sectioned — five stacked sections (type, format, preview, toggles, two buttons) inside a ScrollView with `gap: spacing.xl (24)` (content style 1574). The preview card itself is dense but is meant to be.
  - Clean or cluttered: Clean. Consistent surface/border tokens, clear section headers. The fixed-size preview (square 280×280 / story 175×311, 1448-1449) is centred (previewOuter 1591).
  - Most important action most prominent? Yes — the amber-filled "Share …" button is the only filled primary control (1604-1610); "Save as PDF" is correctly a lower-emphasis outlined secondary (1611-1615).
  - Small/standard/large device behaviour: The whole screen is a ScrollView (1019) so it scrolls on short screens. BUT the preview card is a FIXED pixel size (square 280×280, story 175×311 — 1448-1449) and all preview internal type is fixed px, so it will neither grow on a 6.7" device nor shrink/reflow on a 5.4"; on the smallest width 280px is still comfortably within the content padding (`spacing.lg (16)` each side). The export canvas is always 1080×1920 / 1080×1080 (710) independent of device. Larger-Text accessibility scales only the chrome tokens (xs/sm/md), not the fixed-px preview or canvas.
```

---

```
SCREEN: Exercise Detail (ExerciseDetailScreen)
WHAT IT IS: The per-exercise profile/analytics screen. It shows what the exercise trains (muscles, equipment, difficulty, compound/isolation, SFR quality/fatigue, rep range), the user's estimated max and personal bests, an optional strength-target goal with progress, a plateau warning, a windowed strength-trend chart, recent session history, similar-exercise swaps, a coaching cue, and written "How to do it" form guidance. (ExerciseDetailScreen.js:66, 302)

WHAT IS ON IT:
  - Loading state: three SkeletonCards (heights 120/180/92) while the DB loads (ExerciseDetailScreen.js:232-244).
  - Overview card (306-377): tag chips — primary muscle (309), subregion (311-314), equipment (315-319), compound/isolation (320-326), difficulty (327-331); "Also works:" secondary muscles list (334-344); "Estimated max: X {units}" row with trophy icon + InfoTooltip explaining est. max (346-352); SFR row of three items — "Quality" value /5 + InfoTooltip (354-361), "Fatigue" value /5 + InfoTooltip (363-369), "Rep range" min–max (371-374).
  - Personal-bests highlight card (380-425): trophy icon + "Personal bests" title; up to three stats — Est. max / Heaviest set, Best set (weight×reps), Most reps (weight×reps); "Achieved {date}" line.
  - Congratulatory banner (animated, transient): checkmark + "You've hit your target! Set a new one." shown when a goal is auto-detected achieved (427-433, showCongratsBanner 179-194).
  - Goal section: if no goal, a "Set a target weight" link with flag-outline icon (436-441); if goal set, a Target card — "Target" header with edit pencil (445-453), "Current est. max" → "Target {weight} · by {date}" two-item row with arrow (455-469), a progress bar (471-473), caption "{X}{units} to go" or "Goal reached!" (475-482).
  - Plateau banner: analytics icon + "Progress has stalled" + plateau.message, shown when detectPlateau flags it (486-494).
  - Strength-trend chart section (497-560): "Strength trend" label; WindowChips date-window selector (500-501); takeaway sentence (502); toggle "Max weight" / "Est. max" (503-526); VolyumeChart line/area chart height 96 (527-550) or "Not enough data in this window yet." (552); for e1rm mode a note "Estimated from top set using the Epley formula. Best for rep ranges 2–10." (554-558).
  - History section (563-589): "History (last N sessions)" title; per session a card with date, each set "{weight}{units} × {reps}" with "· Warm-up"/"· Drop Set" suffix, and "Est. max: ≈{x}{units}".
  - History empty state (592-599): clock icon + "You haven't logged this exercise yet. Add it to a session to start tracking your progress."
  - All-time bests list (602-625): "All-time bests" title; up to 5 rows with emoji medal (🥇/🏋️/🔁), label (Estimated max / Heaviest weight / Most reps), value, and date.
  - Similar exercises (628-661): "Similar exercises" title; horizontal scroll of cards (name + equipment/muscle) that push to ExerciseDetail for the swap (642).
  - Coaching cue card (663-670): bulb icon + exercise.cue text (only if a cue exists).
  - "How to do it" section (672-679): notes card showing `formTip ?? exercise.notes` — i.e. the FORM_TIPS text for the exact exercise name, else the exercise's own notes field.
  - Goal-setting modal bottom sheet (683-746): handle, title "Set a target weight"/"Edit target", subtitle, "Target weight ({units})" numeric input, "Target date (optional)" text input ("e.g. Dec 2025"), "Save goal" button, "Remove goal" link when editing.

NAVIGATION: Route "ExerciseDetail", component ExerciseDetailScreen, title default "Exercise" then set to the exercise name at runtime (ExerciseDetailScreen.js:115). Registered in TWO stacks in RootNavigator.js — line 323 and line 351 (import at RootNavigator.js:40). Reached with route.params.exerciseId (ExerciseDetailScreen.js:67). It pushes to itself for similar-exercise swaps: navigation.push('ExerciseDetail', { exerciseId, exerciseName }) (ExerciseDetailScreen.js:642). The originating callers were NOT TRACED here (outside the two target files).

GATING: NOT DETERMINED IN CODE within ExerciseDetailScreen.js — the file imports useAppStore (28) but uses it only for user, units, and accessibility.reduceMotion (68-69); there is no withProGuard, ProGate, or tier check. The screen surfaces exercise-library / personal-bests / progress-stats data, which CLAUDE.md lists as Free features, but the guard itself is NOT DETERMINED IN CODE here.

CURRENT STRENGTHS:
  - Genuinely deep, decision-useful data for a serious lifter: est. max, three PR types, SFR quality/fatigue, plateau detection, windowed trend with Max-weight vs Est-max toggle and a plain-language takeaway.
  - Newbie scaffolding via InfoTooltips that explain est. max, Quality, and Fatigue in lay terms (350, 359, 367).
  - Goal loop is well-built: set/edit/remove, auto-detect achievement, progress bar, transient congrats banner that respects Reduce Motion (181-188).
  - Empty and loading states are handled (skeletons 232-244; history empty 592-599; chart "not enough data" 552).
  - Self-referential navigation to swaps keeps the user in a coherent exploration loop (642).

CURRENT WEAKNESSES:
  - No visual demonstration of the exercise at all (see TECHNIQUE/FORM finding below) — text only.
  - Form guidance is only present when the exact exercise name has a FORM_TIPS entry or the row carries a notes field; otherwise the entire "How to do it" section is omitted (672) leaving no technique help.
  - Two overlapping PR surfaces: the "Personal bests" highlight card (380-425) and the "All-time bests" list (602-625) present much the same records twice on one screen.
  - A typo in state naming: setCongratusBanner / congratsBanner (87, 180, 186, 193, 428) — cosmetic, behaviour intact, flagged not fixed.
  - Long screen with many stacked sections; the most actionable items (goal, plateau, form) sit below charts and PR cards.

NEWBIE QUESTION: Partly. The tooltips, plain stat labels, and the written "How to do it" steps are beginner-friendly WHEN present. But a first-time gym-goer gets NO picture, diagram, or video to copy a movement from — text instructions like "elbows at roughly 45–75° from your torso" assume vocabulary a beginner may not have, and for any exercise lacking a FORM_TIPS entry there is no guidance at all. Terms like "Est. max", "SFR/Quality/Fatigue", "plateau", "Epley formula" lean advanced despite the tooltips.

ATHLETE QUESTION: Strongly yes for the data. Est. 1RM via Epley, heaviest/most-reps PRs, SFR quality/fatigue ratings, plateau detection, date-windowed trend with weight vs e1RM toggle, and ranked swap suggestions are exactly what an experienced competitor wants. The form section is too basic for them (and they likely do not need it). No competition-specific framing (e.g. division standards) appears on this screen.

LOCATION QUESTION: Yes. A per-exercise deep-dive reached from the exercise library / a logged set and pushing to itself for swaps (642) is the right home for this content, and registering it in the two stacks that own those flows (RootNavigator.js:323, 351) is consistent.

VISUAL + USABILITY:
  - Font size of each text element (token + resolved px + file:line):
    - tagText: `type.label` → `fontSize.sm (13)`, ExerciseDetailScreen.js:769 (+ theme.js:402-405).
    - secMuscleLabel: `type.label` → `fontSize.sm (13)`, :773. secMuscleText: `fontSize.sm (13)`, :774.
    - est1RMText: `type.bodyStrong` → `fontSize.md (16)`, :783 (+ theme.js:398-401).
    - sfrValue: `type.num('title')` → `fontSize.lg (17)` tabular, :792. sfrLabel: `type.caption` → `fontSize.xs (11)`, :793.
    - sectionTitle: `type.label` → `fontSize.sm (13)`, :836-839.
    - chartTakeaway: `fontSize.sm (13)`, lineHeight 18, :797. chartLabel: `fontSize.xs (11)`, :800. chartEmptyHint: `type.caption` → `fontSize.xs (11)`, :798. chartToggleBtnText: `fontSize.xs (11)`, :815. e1rmNote: `type.caption` → `fontSize.xs (11)`, :817.
    - historyDate: `fontSize.sm (13)` bold, :848. historySetText: `fontSize.sm (13)`, :850. historyEst: `type.num('caption')` → `fontSize.xs (11)`, :851.
    - prIcon (emoji): fixed 22 (eslint-disabled, :862-863). prLabel: `fontSize.sm (13)`, :865. prValue: `type.num('bodyStrong')` → `fontSize.md (16)`, :866. prDate: `type.num('caption')` → `fontSize.xs (11)`, :867.
    - subCardName: `fontSize.sm (13)` bold, lineHeight 17, :881-886. subCardEquipment: `type.caption` → `fontSize.xs (11)`, :892-896.
    - prHighlightTitle: `fontSize.xs (11)`, :911-917. prHighlightStatValue: `type.num('title')` → `fontSize.lg (17)`, :931-934. prHighlightStatLabel / prHighlightDate: `type.caption` → `fontSize.xs (11)`, :935-943.
    - notesText ("How to do it"): `fontSize.sm (13)`, lineHeight 20, :951.
    - cueText: `fontSize.sm (13)`, lineHeight 20, :962.
    - plateauTitle: `type.label` → `fontSize.sm (13)`, :975-978. plateauBody: `fontSize.sm (13)`, lineHeight 18, :980-984.
    - goalSetLinkText: `fontSize.sm (13)` underlined, :993-997. goalCardTitle: `fontSize.xs (11)`, :1016-1022. goalWeightValue: `type.num('title')` → `fontSize.lg (17)`, :1032-1035. goalWeightLabel: `type.caption` → `fontSize.xs (11)`, :1036-1039. goalBarCaption: `fontSize.xs (11)`, :1051-1055.
    - congratsText: `type.label` → `fontSize.sm (13)`, :1067-1071.
    - modalTitle: `type.title` → `fontSize.lg (17)`, :1097-1100. modalSubtitle: `fontSize.sm (13)`, :1101-1105. inputLabel: `type.label` → `fontSize.sm (13)`, :1106-1110. weightInput: `fontSize.xxl (24)` bold, :1118-1119. dateInput: `fontSize.md (16)`, :1130. saveGoalBtnText: `type.bodyStrong` → `fontSize.md (16)`, :1140-1143. removeGoalLinkText: `fontSize.sm (13)`, :1149-1151.
  - Touch targets (interactive elements):
    - Goal edit pencil: icon 14 with hitSlop {8,8,8,8} → ≈ 14+16 ≈ 30px effective — BELOW 44px even with hitSlop (ExerciseDetailScreen.js:450-452). Flag.
    - "Set a target weight" link: paddingVertical `spacing.xs (4)` + icon 14 → ≈ 22px — BELOW 44px (goalSetLink 986-992). Flag.
    - Chart toggle buttons: paddingVertical `spacing.xs (4)` + text 11 → ≈ 19px tall — BELOW 44px (chartToggleBtn 806-813). Flag.
    - Similar-exercise cards: fixed height 72 (subCard 873-880). OK.
    - "Save goal" button: paddingVertical `spacing.md (12)` + text 16 → ≈ 40px — marginally BELOW 44px (saveGoalBtn 1133-1139). Borderline flag.
    - "Remove goal" link: paddingVertical `spacing.xs (4)` → ≈ 21px — BELOW 44px (1144-1147). Flag.
    - WindowChips and VolyumeChart touch sizing live in those components (not in this file) — NOT DETERMINED IN CODE here.
    - Accessibility roles/labels are set on most controls (437, 450, 504-509, 645, 732-734, 740).
  - Information density: HIGH. Up to ~10 stacked sections (overview, PR highlight, congrats, goal, plateau, chart, history, all-time bests, similar, cue, how-to) in one ScrollView with `gap: spacing.xl (24)` (content 753). Two separate PR surfaces add to the load.
  - Clean or cluttered: Leans cluttered on a fully-populated exercise due to duplicated PR information and the sheer number of cards, though each card individually is tidy and token-consistent. The emoji medals in All-time bests (608-609) sit visually apart from the rest of the Ionicons-driven iconography.
  - Most important action most prominent? Mixed. For a lifter the trend chart and PRs are prominent and high up, which is right. But the goal CTA ("Set a target weight") is a small underlined text link (437-439), low-emphasis relative to its importance, and the form/"How to do it" content is last on the screen.
  - Small/standard/large device behaviour: Whole screen is a ScrollView (304) so it scrolls on any height. Chart width is computed responsively: `SCREEN_W - spacing.lg*2 - spacing.md*2` from Dimensions.get('window').width captured once at module load (SCREEN_W 64, used 531) — it adapts to device width but is captured at import time so it will not react to orientation/fold changes without remount. Similar-exercise cards are fixed 140×72 (873-875) and scroll horizontally, fine across sizes. Most type uses tokens so Larger-Text scales it; fixed exceptions are prIcon 22 (863) and the px lineHeights. No fixed-height content clips because everything is in the scroll view.

TECHNIQUE / FORM GUIDANCE — present vs absent (per dispatcher request):
  - PRESENT (textual only):
    - "How to do it" section renders `formTip ?? exercise.notes` (ExerciseDetailScreen.js:672-679). `formTip = FORM_TIPS[exercise.name]` (ExerciseDetailScreen.js:246), i.e. a multi-sentence written technique paragraph keyed by the EXACT exercise name in src/lib/formTips.js (e.g. "Barbell Bench Press" at formTips.js:3: setup, bar path, elbow angle, drive — full prose cues). If no FORM_TIPS match, it falls back to the exercise's own `notes` field.
    - A short single-line coaching cue: `coachingCue = exercise.cue` shown in the bulb-icon cue card (ExerciseDetailScreen.js:252, 663-668) — one-liner, only when a cue exists.
    - Tooltips give conceptual (not movement) guidance on est. max, Quality, Fatigue (ExerciseDetailScreen.js:350, 359, 367).
  - ABSENT:
    - The "How to do it" section is conditional on `(formTip || exercise.notes)` (ExerciseDetailScreen.js:672); for any exercise with neither a FORM_TIPS entry nor a notes value, NO form guidance renders at all.
    - No safety/contraindication or common-mistakes guidance beyond the prose tip.
  - VISUAL DEMO: NONE. There is no image, illustration, GIF, animation, or video of the exercise anywhere on the screen. ExerciseDetailScreen.js imports no Image component (imports at 1-31 cover RN primitives, Ionicons, the line chart VolyumeChart, Skeleton, AnimatedEntrance, InfoTooltip only); the only graphics are Ionicons glyphs, emoji medals (608-609), and the VolyumeChart strength-trend line chart (529-549). The exercise is described purely in words.
```

---

STATUS
1. Files read in full: src/screens/ShareCardScreen.js (1619 lines), src/screens/ExerciseDetailScreen.js (1153 lines); also read src/styles/theme.js in full for token resolution, plus RootNavigator.js route lines and src/lib/formTips.js (1-60) to verify the form-guidance content type.
2. Screens documented: 2 — Share Card (ShareCardScreen) and Exercise Detail (ExerciseDetailScreen); ExerciseDetail technique/form guidance and "no visual demo" finding cited file:line.
3. NOT DETERMINED / could-not-read: GATING for both screens marked NOT DETERMINED IN CODE (no guard inside either file; decided by an untraced caller/navigator config); upstream callers of both routes and WindowChips/VolyumeChart internal touch-target sizes left NOT DETERMINED as they live outside the two target files. No file failed to read.


<!-- ==== phase1/11-onboarding-auth.md ==== -->

# Phase 1 — 11 · Onboarding & Auth

Scope: WelcomeScreen, FirstRunScreen, QuizScreen, LoginScreen, ProOnboardingScreen,
ProSetupCompleteScreen, Article9ConsentScreen, ImportScreen.

Token resolution source: `src/styles/theme.js` (dark/default palette, base fontSize
table). Resolved px values (no larger-text multiplier applied):
`fontSize.micro (10)`, `fontSize.xs (11)`, `fontSize.sm (13)`, `fontSize.md (16)`,
`fontSize.lg (17)`, `fontSize.xl (20)`, `fontSize.xxl (24)`, `fontSize.xxxl (32)`,
`fontSize.display (40)` (theme.js:256–266). Type roles:
`type.h2` = fontSize.xxl (24)/bold (theme.js:382–385); `type.title` = fontSize.lg (17)/semibold
(theme.js:390–393); `type.bodyStrong` = fontSize.md (16)/semibold (theme.js:398–401);
`type.label` = fontSize.sm (13)/medium (theme.js:402–405); `type.caption` = fontSize.xs (11)/regular
(theme.js:406–409); `type.body` = fontSize.md (16) (theme.js:394–397).
Spacing: `xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48` (theme.js:228–239).
Radius: `xs 4, sm 6, md 10, lg 14, xl 20, full 999` (theme.js:241–248).

---

## ONBOARDING ORDER & QUIZ-FIRST FLAG (cited)

- **Quiz-first flag:** `ONBOARDING_QUIZ_FIRST = true` (src/lib/onboarding/quizFlow.js:22).
  Comment states it is LIVE per founder decision 2026-06-12. A second flag
  `PHASE_PRE_ACCOUNT = true` (quizFlow.js:46) controls whether the cut/lean-gain/maintain
  phase question is asked pre-account.
- **Welcome routing:** `chooseTier('pro')` navigates to `QuizTraining` only when
  `ONBOARDING_QUIZ_FIRST` is on; otherwise both CTAs go to `Login` with an `intent`
  param (WelcomeScreen.js:55–64). `chooseTier('free')` always routes to `Login`
  with `intent: 'free_signup'` (WelcomeScreen.js:63).
- **Pre-account Pro flow (flag on):** Welcome → QuizTraining (QuizScreen) → PlanPreview
  (QuizScreen.js:56–59 navigates to `PlanPreview`) → account wall. Quiz answers live
  only in the in-memory store slice `onboardingQuiz` (QuizScreen.js:48; quizFlow.js
  docstring lines 6–17: never persisted/transmitted).
- **Top-level navigator priority** (RootNavigator.js:1096–1141):
  1. `!user` → `WelcomeStack` (RootNavigator.js:1117).
  2. signed-in cloud user, first-run not done, consent not yet checked → `SplashScreen`
     (RootNavigator.js:1131–1133).
  3. signed-in cloud user, consent checked + `healthConsent === false` → `Article9ConsentStack`
     (RootNavigator.js:1134–1136).
  4. `!firstRunComplete` → `tier === 'pro' ? ProOnboardingStack : FirstRunStack`
     (RootNavigator.js:1137–1139).
  5. both done → `MainTabs` (RootNavigator.js:1140).
- **Trial/tier grant:** the 14-day Pro trial (`tier='pro'`) is granted at Article 9
  consent via `cascade.startCascade()` (Article9ConsentScreen.js:105–117; RootNavigator.js:1102).
  This is why a new account passes through Article 9 before the navigator decides
  Pro vs Free onboarding.
- **WelcomeStack registration:** Welcome, QuizTraining (QuizScreen), PlanPreview,
  Login (RootNavigator.js:454–464).

---

SCREEN: WelcomeScreen
WHAT IT IS: The unauthenticated front door / tier-selection landing screen. First screen any signed-out user sees.
WHAT IS ON IT:
  - Hero wordmark image `volyume-wordmark.png` (WelcomeScreen.js:12, 70), width 150 (logoImg, WelcomeScreen.js:188).
  - Tagline "Less thinking. More lifting." (WelcomeScreen.js:71).
  - Identity line "Every change has a reason. Every non-change has a reason too." (WelcomeScreen.js:74).
  - Pro card (top, prominent): sparkles icon (WelcomeScreen.js:83); title "Pro" (WelcomeScreen.js:87); badge "Free for 14 days" (WelcomeScreen.js:89); subtitle "The coach who writes back." (WelcomeScreen.js:92); divider; bullet header "Everything in Free, plus:" (WelcomeScreen.js:99) and 4 PRO_BULLETS (WelcomeScreen.js:22–27, 100–105); trial note showing localised monthly price when loaded, else a price-free fallback (WelcomeScreen.js:108–112; price from `usePlayPrices`, WelcomeScreen.js:33–34); "Go Pro" CTA row with arrow (WelcomeScreen.js:114–117).
  - Free card (secondary): create-outline icon; title "Free" (WelcomeScreen.js:127); subtitle "The logbook a coach would write in." (WelcomeScreen.js:128); chevron-forward; 4 FREE_BULLETS (WelcomeScreen.js:15–20, 134–139).
  - Trust row: 3 muted items "Works fully offline · Exports anytime · No ads, ever" with icons (WelcomeScreen.js:148–163).
  - "Already have an account? Sign in" link (WelcomeScreen.js:166–173).
  - Entrance fade/slide animation, skipped under Reduce Motion (WelcomeScreen.js:30, 36–46).
NAVIGATION: Route `Welcome` in WelcomeStack (RootNavigator.js:457). Reached when `!user` (RootNavigator.js:1117). Pro CTA → `QuizTraining` (quiz-first on) else `Login {intent:'pro_signup'}`; Free CTA → `Login {intent:'free_signup'}`; sign-in link → `Login` (WelcomeScreen.js:59–63, 168).
GATING: Pre-auth screen, no tier guard; it is the tier *chooser*. Per comment (WelcomeScreen.js:48–54) both CTAs route to a real sign-up (no anonymous mode).
CURRENT STRENGTHS: Clear two-tier hierarchy with Pro visually dominant (amber border, shadow, elevation — WelcomeScreen.js:200–211). Honest price handling (no hardcoded fallback). Trust row addresses hesitation. Single ScrollView so it scales.
CURRENT WEAKNESSES: Dense for a first screen: hero + identity line + two multi-bullet cards + trust row + sign-in link. PRO_BULLETS are long sentences (e.g. WelcomeScreen.js:26 is two sentences) at fontSize.sm (13) — heavy reading on a landing screen. "Precision Coaching™" jargon appears before any explanation (WelcomeScreen.js:25).
NEWBIE QUESTION: Partly. "Workout logging", "Personal Records", "plan builder" are understandable; but "Precision Coaching™", "division-specific" framing, "check-in", and "your body responds" assume domain knowledge a first-timer lacks. The Free vs Pro distinction is legible though.
ATHLETE QUESTION: Reasonably. The Pro bullets name the differentiators an experienced lifter cares about (auto-adjusting training+nutrition, personalised calorie/protein targets, written rationale). No mention of competition divisions or specific methodology here, which a competitor would want before paying — that surfaces later in Pro onboarding.
LOCATION QUESTION: Correct location — it is the unauthenticated root (RootNavigator.js:1117) and the only entry to sign-up/sign-in per the no-anonymous-mode rule.
VISUAL + USABILITY:
  - tagline: fontSize.sm (13), color textMuted (WelcomeScreen.js:194).
  - identityLine: fontSize.xs (11), textMuted, lineHeight 16 (WelcomeScreen.js:195).
  - proTitle: fontSize.lg (17), black weight (WelcomeScreen.js:221).
  - betaBadgeText: fontSize.micro (10), black (WelcomeScreen.js:226).
  - proSubtitle: type.caption = fontSize.xs (11) (WelcomeScreen.js:227).
  - bulletHeader: type.caption = 11 (WelcomeScreen.js:232).
  - bulletText: fontSize.sm (13) (WelcomeScreen.js:234).
  - trialNote: fontSize.xs (11), lineHeight 17 (WelcomeScreen.js:237).
  - trustText / trustDot: fontSize.xs (11) (WelcomeScreen.js:244–245).
  - proCtaText: fontSize.sm (13), bold (WelcomeScreen.js:252).
  - freeTitle: fontSize.md (16), bold (WelcomeScreen.js:268).
  - freeSubtitle: type.caption = 11 (WelcomeScreen.js:269).
  - freeBulletText: type.caption = 11 (WelcomeScreen.js:271).
  - signInText: fontSize.sm (13); signInAction: type.label = 13 (WelcomeScreen.js:277–278).
  - Touch targets: Pro card whole-card touchable (WelcomeScreen.js:80, ample). Free card whole-card touchable (WelcomeScreen.js:121). Sign-in link paddingVertical spacing.sm (8) per side + hitSlop top/bottom 8 → ~13+16 = ~29px tall; **below 44px** without the hitSlop fully closing the gap (WelcomeScreen.js:166–169, 275). Pro CTA row paddingVertical spacing.md (12) → ~24+text ≈ 40–46px (WelcomeScreen.js:249).
  - Information density: high (hero + 2 cards + trust + link).
  - Most important action (Go Pro) is the most prominent element — yes (amber bordered/shadowed card, top position, filled CTA).
  - Small/large behaviour: ScrollView (WelcomeScreen.js:68) so content scrolls on small devices. Logo is fixed 150px (WelcomeScreen.js:188), does not scale with device. Text scales with OS/in-app larger-text via tokens.

---

SCREEN: FirstRunScreen
WHAT IT IS: First-run name + units capture for FREE users only (Pro signups go through ProOnboardingStack). Comment FirstRunScreen.js:10–14.
WHAT IS ON IT:
  - Title "Almost there." (FirstRunScreen.js:49).
  - Subtitle "Just your name, then a few quick questions to get you set up." (FirstRunScreen.js:50–52).
  - Field label "What should we call you?" (FirstRunScreen.js:54).
  - First-name TextInput, autofocus after 350ms (FirstRunScreen.js:24–27, 55–66).
  - "Continue" Button with trailing arrow, size lg, disabled until name entered (FirstRunScreen.js:68–75).
  - Hint card: info icon + "Next, three quick questions and we'll suggest a starter plan. Prefer to pick your own? You can skip and browse the library instead." (FirstRunScreen.js:77–84).
  - Units are forced to kg, no UI choice (FirstRunScreen.js:17–18 comment, localUnits='kg').
NAVIGATION: Route `FirstRunBranch` in FirstRunStack (RootNavigator.js:470). Reached when signed-in, `!firstRunComplete`, tier !== 'pro' (RootNavigator.js:1137–1138). On Continue → `FreeStarter {fromFirstRun:true}` (FirstRunScreen.js:38). Comment: FreeStarter calls completeFirstRun itself (FirstRunScreen.js:36–37).
GATING: Free path. It is the Free branch of the first-run gate (RootNavigator.js:1138, `tier === 'pro' ? ProOnboardingStack : FirstRunStack`). No in-screen guard.
CURRENT STRENGTHS: Minimal and focused — one input, clear CTA, autofocus, sets up the next step honestly. Disabled CTA until name present prevents empty advance.
CURRENT WEAKNESSES: Units decision (kg-only) is silent — a free user who thinks in lbs gets no choice and no explanation on this screen (FirstRunScreen.js:17–18). The "skip" mentioned in the hint is not actionable on this screen (it lives on the next FreeStarter screen), which could mislead.
NEWBIE QUESTION: Yes — "What should we call you?" plus a single field is about as clear as onboarding gets.
ATHLETE QUESTION: N/A for depth (this is the free quick-setup), but an experienced free user gets no training inputs here; that is by design and fine.
LOCATION QUESTION: Correct — Free first-run entry, distinct from the Pro wizard.
VISUAL + USABILITY:
  - title: type.h2 = fontSize.xxl (24), bold (FirstRunScreen.js:93).
  - subtitle: fontSize.sm (13), lineHeight 20 (FirstRunScreen.js:94).
  - fieldLabel: type.label = fontSize.sm (13), medium (FirstRunScreen.js:95).
  - input text: fontSize.lg (17) (FirstRunScreen.js:99), paddingVertical spacing.md (12).
  - hintText: fontSize.xs (11), lineHeight 17 (FirstRunScreen.js:108).
  - Touch targets: input paddingVertical 12 → ~17+24 ≈ 41px (borderline, FirstRunScreen.js:98). Continue is `Button size="lg"` → paddingVertical spacing.lg (16) × 2 + fontSize.md (16) ≈ 48px (Button.js:34) — meets 44px.
  - Information density: low/clean.
  - Most important action (Continue) is the most prominent — yes (filled lg Button).
  - Small/large behaviour: ScrollView (FirstRunScreen.js:48), all token-sized, scales well.

---

SCREEN: QuizScreen
WHAT IT IS: The COMP-030 pre-account quiz (quiz-first Variant B). Two sections — how you train, what you train for — answered before any account exists; answers go only to the in-memory store slice (QuizScreen.js docstring 1–12, 48).
WHAT IS ON IT:
  - Heading "Eight quick questions." (QuizScreen.js:64) and lede "Your plan takes shape as you answer." (QuizScreen.js:65).
  - Section "How do you train?" (QuizScreen.js:67).
  - "Experience" chips: New to lifting / A year or two in / Experienced (EXPERIENCE, QuizScreen.js:21–25, 69–74).
  - "Days a week" chips: 2,3,4,5,6 (DAYS, QuizScreen.js:26, 75–81).
  - "Session length" chips: 45/60/75/90 min (LENGTHS, QuizScreen.js:27, 82–88).
  - "Equipment" chips: Full gym / Home gym / Bodyweight (EQUIPMENT, QuizScreen.js:28–32, 89–95).
  - Section "What are you training for?" with goal chips from PHYSIQUE_GOALS / GOAL_LABELS (QuizScreen.js:97–103).
  - Conditional "Right now you want to…" phase chips from TRAINING_PHASES, only when `PHASE_PRE_ACCOUNT` (QuizScreen.js:104–114; flag quizFlow.js:46).
  - Footer "See your plan" CTA, disabled until experience + daysPerWeek + trainingGoal set (QuizScreen.js:54, 117–124).
  - Telemetry: `markQuizStep('quiz_open')` on mount, `markQuizStep('quiz_done')` on advance (QuizScreen.js:51, 57).
NAVIGATION: Route `QuizTraining` in WelcomeStack (RootNavigator.js:460). Reached from Welcome Pro CTA when quiz-first on (WelcomeScreen.js:59–61). On "See your plan" → `PlanPreview` (QuizScreen.js:58).
GATING: Pre-auth, pre-account. No tier guard; this is part of the Pro acquisition funnel but runs before any account or tier exists.
CURRENT STRENGTHS: Light, chip-based, fast to complete; chips are minHeight 44 (QuizScreen.js:137) so targets are compliant. Reuses coachingGoals as single source of truth so nothing is re-asked post-account (docstring 7–9). Privacy property is real (in-memory only).
CURRENT WEAKNESSES: **Heading/body mismatch:** says "Eight quick questions." but the actual question count is 4 (experience, days, length, equipment) + goal + conditional phase = 5–6 distinct asks, not eight (QuizScreen.js:64 vs the rendered questions). The session-length question is not gated into the "ready" check (`ready` = experience && daysPerWeek && trainingGoal, QuizScreen.js:54) so a user can skip length/equipment and still proceed. The Welcome experience options (3) differ from the post-account ProOnboarding experience options (4: adds "Competitive") — QuizScreen.js:21–25 vs ProOnboardingScreen.js:71–76 — a mismatch a prefilled wizard will not be able to map "advanced" cleanly across.
NEWBIE QUESTION: Mostly yes — plain-language chip labels ("New to lifting", "Full gym"). "What are you training for?" with physique-goal chips may include competition divisions a beginner won't recognise (depends on PHYSIQUE_GOALS labels, defined outside this file).
ATHLETE QUESTION: Adequate as a teaser but shallow — only 3 experience bands, no weak-point or division depth here (that is deferred to the post-account wizard). The "your plan takes shape as you answer" promise sets an expectation the preview must satisfy.
LOCATION QUESTION: Correct for the quiz-first funnel (pre-account, WelcomeStack). Its existence is flag-gated (ONBOARDING_QUIZ_FIRST, currently true).
VISUAL + USABILITY:
  - h1: fontSize.xxl (24), black (QuizScreen.js:132).
  - lede: fontSize.md (16) (QuizScreen.js:133).
  - section: fontSize.lg (17), bold (QuizScreen.js:134).
  - q (question labels): fontSize.sm (13) (QuizScreen.js:135).
  - chipText: fontSize.sm (13); chipTextOn bold (QuizScreen.js:139–140).
  - ctaText: fontSize.md (16), heavy (QuizScreen.js:144).
  - Touch targets: chips minHeight 44 (QuizScreen.js:137) — compliant. CTA minHeight 50 (QuizScreen.js:142) — compliant.
  - Information density: moderate; one scrollable column of chip rows.
  - Most important action ("See your plan") is the most prominent — yes, fixed amber footer button (QuizScreen.js:117–124, 141–144).
  - Small/large behaviour: ScrollView body + fixed footer (QuizScreen.js:62–125); chips wrap (`flexWrap:'wrap'`, QuizScreen.js:136). Scales well.

---

SCREEN: LoginScreen
WHAT IT IS: The combined sign-in / create-account screen (email+password and OAuth). Mode toggles between signin and signup.
WHAT IS ON IT:
  - Faint decorative background VolyumeMark size 120 at opacity 0.04 (LoginScreen.js:232–234).
  - Brand block: VolyumeMark size 56 + tagline "Less thinking. More lifting." (LoginScreen.js:247–250).
  - OAuthButtons (Apple/Google) (LoginScreen.js:259–263).
  - Form title "Sign in to your account" / "Create your account" (LoginScreen.js:267–269).
  - Signup-only backup prompt: shield icon + "A free account keeps your training and progress backed up and synced…" (LoginScreen.js:270–277).
  - EmailPasswordFields component (LoginScreen.js:279–287).
  - "Forgot password?" (sign-in mode only) (LoginScreen.js:290–298).
  - Primary CTA "Sign In" / "Create Account", size lg (LoginScreen.js:302–310).
  - Mode-switch link "Don't have an account? Create one" / "Already have an account? Sign in" (LoginScreen.js:313–325).
  - Logic: 8-char password minimum + email regex validation on signup (LoginScreen.js:54–61); "No account found" alert offering switch-to-signup on failed signin (LoginScreen.js:90–105); "Check your email" confirmation alert on unconfirmed signup (LoginScreen.js:109–118); cross-user SQLite wipe if a different user previously signed in on this device (LoginScreen.js:130–142); new signup sets `tier='pro'` to route into ProOnboarding (LoginScreen.js:159–168); existing sign-in runs syncAll (LoginScreen.js:180–181).
WHAT IS ON IT (note): "Continue without an account" was deliberately removed (LoginScreen.js:327–331 comment).
NAVIGATION: Route `Login` in WelcomeStack (RootNavigator.js:462). Reached from Welcome CTAs (Free always; Pro when quiz-first off) and the sign-in link (WelcomeScreen.js:63, 168), or from the quiz-first "Save your plan" account wall (downstream of PlanPreview). Initial mode from `route.params.promptSignup` or an `*_signup` intent (LoginScreen.js:38–40). Post-auth routing is driven by RootNavigator's auth listener + tier, not a navigation.navigate call here.
GATING: Pre-auth. No tier guard; `tier`/`setTier` read from store (LoginScreen.js:27–32) and a new account is flipped to `pro` (LoginScreen.js:168) so the navigator sends it through ProOnboardingStack.
CURRENT STRENGTHS: One screen for both auth modes; OAuth surfaced above the form (LoginScreen.js:255–263). Strong error UX: regex + length validation before network, and a helpful "create account instead?" recovery on unknown-credentials (LoginScreen.js:90–105). Cross-user data-safety wipe is a genuine correctness guard (LoginScreen.js:130–142). KeyboardAvoidingView + scroll (LoginScreen.js:236–241).
CURRENT WEAKNESSES: Several declared styles are dead/unused on this screen (`brandName` LoginScreen.js:365–372, `divider`/`dividerLine`/`dividerText` 421–426, `localBtn`/`localBtnText`/`localNote` 439–458) — leftover from the removed local-mode and a now-unused brand text. (Noted, not fixed.) The signup→`tier='pro'` flip (LoginScreen.js:168) means *every* new account created from this screen is routed into Pro onboarding regardless of whether they tapped the Free card on Welcome; the Free vs Pro distinction is reconciled later via the trial cascade rather than here, which is non-obvious.
NEWBIE QUESTION: Yes — standard email/password + social login pattern is universally understood. The backup-prompt copy explains why an account is needed.
ATHLETE QUESTION: N/A (auth screen); nothing here blocks or confuses an experienced user.
LOCATION QUESTION: Correct — terminal screen of WelcomeStack, the only auth surface besides the equivalent step inside ProOnboarding (which shares the same field components).
VISUAL + USABILITY:
  - brandTagline: fontSize.sm (13) (LoginScreen.js:373–377).
  - formTitle: type.title = fontSize.lg (17), semibold (LoginScreen.js:386–390).
  - forgotText: type.label = fontSize.sm (13) (LoginScreen.js:395–398).
  - modeSwitchText: fontSize.sm (13) (LoginScreen.js:411–414).
  - backupPromptText: fontSize.sm (13), lineHeight 20 (LoginScreen.js:434–436).
  - Primary CTA: `Button size="lg"` ≈ 48px tall (Button.js:34) — meets 44px.
  - Touch targets: modeSwitch minHeight 44 (LoginScreen.js:404–410) — compliant. forgotBtn has only `alignSelf` + negative margin, no explicit minHeight, but hitSlop top/bottom 10 each (LoginScreen.js:293–294) → ~13+20 ≈ 33px effective — **below 44px**.
  - Information density: moderate (brand + OAuth + form + CTA + switch); fits without crowding.
  - Most important action (primary CTA) is the most prominent — yes.
  - Small/large behaviour: KeyboardAvoidingView + ScrollView with `keyboardShouldPersistTaps` (LoginScreen.js:236–241). Brand mark fixed at 56/120px (won't scale). Text tokenised.

---

SCREEN: ProOnboardingScreen
WHAT IT IS: The 5-step Pro guided setup wizard (account → profile → training logistics → goal → recovery/reminders), ending in plan + nutrition generation. `TOTAL_STEPS = 5` (ProOnboardingScreen.js:50).
WHAT IS ON IT (by step):
  - Shared header: back chevron (when applicable), VolyumeIcon 22, "PRO" badge, progress bar (endowed-progress base 12%), "Step X of 5", title, sub (ProOnboardingScreen.js:766–807).
  - Step 1 (account): OAuthButtons; EmailPasswordFields (mode signup/signin); primary CTA "Create account and continue"/"Sign in and continue"; switch-auth link (ProOnboardingScreen.js:811–875). 8-char password min (ProOnboardingScreen.js:339–342); "Check your email" alert on unconfirmed signup (ProOnboardingScreen.js:352–364); auto-advance past step 1 if already authenticated (ProOnboardingScreen.js:268–289). Quiz-prefill effect copies onboardingQuiz fields into the wizard on mount (ProOnboardingScreen.js:196–210).
  - Step 2 (profile): first name; biological sex segmented (male/female); age; height (ft+in / cm toggle); body-weight units (st/kg/lbs); current body weight; optional body fat % + measurement method segmented (visual/BIA/caliper/DEXA) (ProOnboardingScreen.js:879–1097). Validates weight 30–300 kg and age 13–100 (ProOnboardingScreen.js:400–423).
  - Step 3 (training logistics): Dropdown training experience (4 options incl. Competitive); session length segmented (45/60/75/90); training days/week segmented (3/4/5/6); equipment Dropdown (6 options) (ProOnboardingScreen.js:1101–1171). Requires experience + sessionLength + equipment (ProOnboardingScreen.js:425–434).
  - Step 4 (goal): focus/phase Dropdown (TRAINING_PHASES); optional "Competing in a category?" Dropdown (PHYSIQUE_GOALS); division-scoped weak-point chips (max 3); collapsible protein-target selector (standard/optimised/advanced with Recommended badge) (ProOnboardingScreen.js:1175–1309). Requires trainingGoal + trainingPhase (ProOnboardingScreen.js:436–449).
  - Step 5 (recovery & reminders): "How your coaching works" card; recovery Dropdown (poor/average/good); coaching reminders — morning weight toggle + hour scroller, weekly check-in toggle + day scroller; daily movement — step target toggle, cardio toggle (ProOnboardingScreen.js:1313–1556). Requires recoveryRating (ProOnboardingScreen.js:499–503).
  - Step 5 "Building your plan" overlay: full progress bar + 4 staged lines mapped to real generation phases, min 3.2s dwell, ActivityIndicator/checkmark per stage; skipped under Reduce Motion (ProOnboardingScreen.js:451–497, 1316–1352; STAGE_DWELL_MS 800, SEQUENCE_TOTAL_MS 3200, ProOnboardingScreen.js:58–59).
  - On submit: requests notification permissions, schedules reminders, saves profile, computes nutrition targets via the shared engine, logs body metric + morning weight, saves body profile, generates+saves plan; on plan failure shows an alert and still navigates to ProSetupComplete (ProOnboardingScreen.js:514–762). `navigation.replace('ProSetupComplete')` on success/failure (ProOnboardingScreen.js:749, 761).
NAVIGATION: Route `ProOnboarding` in ProOnboardingStack (RootNavigator.js:502). Reached when signed-in, `!firstRunComplete`, `tier === 'pro'` (RootNavigator.js:1137–1138). Leads to `ProSetupComplete` (ProOnboardingScreen.js:749, 761); can side-trip to GoalLockConsent (registered RootNavigator.js:513, comment 510–512) and NutritionEducation.
GATING: This IS the Pro branch (RootNavigator.js:1138). Profile is synced with `tier='pro'` + `isBetaTester:true` (ProOnboardingScreen.js:374). It collects exclusively Pro features (nutrition targets, coaching reminders, cardio, steps).
CURRENT STRENGTHS: Disciplined 3–5-fields-per-step structure (comment ProOnboardingScreen.js:425–428); endowed-progress bar; sensible non-blank defaults so the engine never gets a silent fallback for weight (ProOnboardingScreen.js:151–167, 400–423 refuses bad weight); honest staged build sequence tied to real phases with a min-dwell that never completes before the work; robust account/OAuth resume logic (ProOnboardingScreen.js:268–289). Quiz-prefill avoids re-asking quiz-first users.
CURRENT WEAKNESSES: Very large single component (~1780 lines) holding 5 step UIs + all submit logic. Style sheet carries dead/unused blocks (`offerCard` family ProOnboardingScreen.js:1744–1762, `skipBtn`/`skipNote` 1775–1780, `fieldWrap`/`fieldInput`/`eyeBtn` 1661–1675) — leftover. Experience-band mismatch with the pre-account quiz (4 bands here, ProOnboardingScreen.js:71–76, vs 3 in QuizScreen) means the prefill (ProOnboardingScreen.js:203) can carry a value the quiz never offered or vice versa. Step 5 is information-dense (coaching explainer + recovery + 2 reminder blocks with scrollers + 2 movement toggles).
NEWBIE QUESTION: Mixed. Step 2 fields are clear; but "experience" bands are defined by months/years (good), while step 4 ("phase" cut/lean-gain/maintain, competition divisions, protein "optimised/advanced") and the body-fat measurement methods (BIA/caliper/DEXA) assume knowledge a true beginner lacks. The hints mitigate but it is a lot to absorb.
ATHLETE QUESTION: Strong. Division selection, weak-point prioritisation (max 3), protein-approach override with ranges, recovery rating feeding plan volume, body-fat % + method feeding Katch-McArdle BMR — these are exactly the levers an experienced competitor expects.
LOCATION QUESTION: Correct — the Pro first-run branch, entered only for tier=='pro' before first-run completes.
VISUAL + USABILITY:
  - stepTitle: fontSize.xxl (24), bold, lineHeight 30 (ProOnboardingScreen.js:1587–1590).
  - stepSub: fontSize.sm (13), lineHeight 20 (ProOnboardingScreen.js:1591).
  - stepCount: type.num('caption') = fontSize.xs (11) (ProOnboardingScreen.js:1586).
  - proBadgeText: fontSize.micro (10), black (ProOnboardingScreen.js:1575–1578).
  - fieldLabel: fontSize.xs (11), semibold (ProOnboardingScreen.js:1612–1615).
  - fieldHint: fontSize.xs (11), lineHeight 18 (ProOnboardingScreen.js:1616).
  - input text: fontSize.md (16), paddingVertical spacing.md+2 (14) (ProOnboardingScreen.js:1655–1660).
  - primaryBtnText: fontSize.lg (17), bold (ProOnboardingScreen.js:1770); primaryBtn paddingVertical spacing.lg+2 (18) → ~17+36 ≈ 53px, compliant (ProOnboardingScreen.js:1765–1769).
  - seqHeading: fontSize.xxl (24); seqLine: fontSize.md (16) (ProOnboardingScreen.js:1595–1603).
  - notifTitle: type.bodyStrong = fontSize.md (16); notifSub: fontSize.xs (11), lineHeight 17 (ProOnboardingScreen.js:1710–1711).
  - Touch targets: toggle 44×26 (ProOnboardingScreen.js:1722–1724) — width compliant, height 26 below 44 but acceptable as a switch; hourChip paddingVertical 7 → ~11+14 ≈ 25px **below 44px** (ProOnboardingScreen.js:1734–1737); wpChip paddingVertical spacing.sm (8) → ~11+16 ≈ 27px **below 44px** (ProOnboardingScreen.js:1647–1650); segmentSmall (height-unit toggle) paddingVertical spacing.xs (4) → very small **below 44px** (ProOnboardingScreen.js:1687–1689); switchAuthBtn paddingVertical spacing.md (12) → ~13+24 ≈ 37px **below 44px** (ProOnboardingScreen.js:1772).
  - Information density: step 5 high; steps 2–4 moderate.
  - Most important action (Continue/primary CTA) is the most prominent — yes per step.
  - Small/large behaviour: every step wrapped in KeyboardAvoidingView + ScrollView (e.g. ProOnboardingScreen.js:813–815, 1106–1107); hour/day pickers are horizontal ScrollViews (ProOnboardingScreen.js:1415–1432). Tokenised text scales. The "Building your plan" overlay is centred and fixed (ProOnboardingScreen.js:1594).

---

SCREEN: ProSetupCompleteScreen
WHAT IT IS: The Pro onboarding hand-off / reveal screen — shown once after the wizard, summarising the daily routine and the generated plan + targets. Comment ProSetupCompleteScreen.js:30–33.
WHAT IS ON IT:
  - Header furniture matched to the wizard: VolyumeIcon 22 + "PRO" badge; full progress bar; "Setup complete" eyebrow with check icon (ProSetupCompleteScreen.js:123–136).
  - Headline "You're all set, {firstName}." (ProSetupCompleteScreen.js:138); sub = personalised receipt line or "Here's your daily routine." (ProSetupCompleteScreen.js:139, receipt built ProSetupCompleteScreen.js:95–99).
  - Card 1 "1 · Log your weight" (ProSetupCompleteScreen.js:142–154).
  - Card 2 "2 · Hit your daily targets" (only if targetKcal present): kcal ring drawn full showing target kcal; horizontal macro bars (protein/carbs/fat, sized by kcal share, protein emphasised); goal chip + phase chip; targets note; "New to calories and macros? 5-minute guide" link → NutritionEducation (ProSetupCompleteScreen.js:157–229).
  - Card 3 "3 · Train your split" (collapsible, opens expanded): plan name + workout count; split rationale; numbered routine list; "Why this plan, for you" reasons block from whyThis (ProSetupCompleteScreen.js:232–292). No-plan fallback copy (ProSetupCompleteScreen.js:250–254).
  - Card 4 "4 · Check in once a week" (ProSetupCompleteScreen.js:295–307).
  - "Start training" Button (size lg) → `completeFirstRun()` (ProSetupCompleteScreen.js:84–86, 311–319).
  - Entrance animation, skipped under Reduce Motion (ProSetupCompleteScreen.js:36–52).
  - Data loaded from AsyncStorage nutrition targets + active plan/routines + whyThis JSON (ProSetupCompleteScreen.js:54–82).
NAVIGATION: Route `ProSetupComplete` in ProOnboardingStack (RootNavigator.js:506). Reached via `navigation.replace('ProSetupComplete')` from the wizard (ProOnboardingScreen.js:749, 761). "Start training" calls `completeFirstRun()` (no navigate) which flips firstRunComplete so the navigator re-renders to MainTabs (ProSetupCompleteScreen.js:84–86; RootNavigator.js:1137–1140). Macro guide link → `NutritionEducation` (ProSetupCompleteScreen.js:217).
GATING: Pro-only (inside ProOnboardingStack, RootNavigator.js:506). Surfaces only Pro data (nutrition targets, generated plan, weekly check-in, Precision Coaching rationale).
CURRENT STRENGTHS: Strong "reveal" moment — shows the actual generated plan, real kcal ring matching the Diary signature, and a "why this plan, for you" rationale tied to the engine's actual decisions (the methodology promise made on Welcome). Graceful no-plan fallback (ProSetupCompleteScreen.js:250–254). Numbered 1–4 routine framing teaches the daily loop.
CURRENT WEAKNESSES: Card-heavy and long — four cards plus a ring and macro bars; on a small device this is a lot of scrolling before the single "Start training" CTA. Card 2 only appears if AsyncStorage targets loaded (ProSetupCompleteScreen.js:157), so a sync timing failure silently drops the nutrition reveal.
NEWBIE QUESTION: Good — numbered steps, plain "log your weight / hit your targets / train your split / check in", plus an explicit "New to calories and macros?" ramp link (ProSetupCompleteScreen.js:222–227). Best newbie-onboarding screen of the set.
ATHLETE QUESTION: Strong — named split, workout count, per-decision rationale, division/phase chips and macro composition satisfy a competitor that the plan was actually built to spec.
LOCATION QUESTION: Correct — the last beat of the Pro wizard before MainTabs.
VISUAL + USABILITY:
  - doneEyebrow: type.num('caption') = fontSize.xs (11), semibold (ProSetupCompleteScreen.js:348).
  - headline: type.h2 = fontSize.xxl (24), bold (ProSetupCompleteScreen.js:350–353).
  - sub: fontSize.sm (13), lineHeight 20 (ProSetupCompleteScreen.js:354–356).
  - routineTitle: type.bodyStrong = fontSize.md (16) (ProSetupCompleteScreen.js:369).
  - routineBody: fontSize.sm (13), lineHeight 19 (ProSetupCompleteScreen.js:370).
  - ringValue: fixed 34px (eslint-disabled, ProSetupCompleteScreen.js:383–384); ringSub fontSize.xs (11) (ProSetupCompleteScreen.js:385).
  - macroBarLabel fontSize.xs (11); macroBarValue fontSize.sm (13) (ProSetupCompleteScreen.js:394–397).
  - goalChipText: fontSize.xs (11), semibold (ProSetupCompleteScreen.js:407).
  - eduLearnText: type.label = fontSize.sm (13) (ProSetupCompleteScreen.js:409).
  - targetsNote: fontSize.xs (11), lineHeight 17 (ProSetupCompleteScreen.js:410).
  - whyPlanTitle fontSize.xs (11); whyPlanText fontSize.sm (13), lineHeight 20 (ProSetupCompleteScreen.js:424, 427).
  - Touch targets: card 3 whole-card collapsible touchable (ample, ProSetupCompleteScreen.js:232). eduLearnRow has no minHeight but is a row with icons (~14px text + padding ≈ 30px) — **below 44px** (ProSetupCompleteScreen.js:408). "Start training" Button size lg ≈ 48px — compliant.
  - Information density: high (4 cards + ring + macro bars).
  - Most important action ("Start training") is prominent but lives at the very bottom after a long scroll — its prominence depends on the user scrolling to it (ProSetupCompleteScreen.js:311–319).
  - Small/large behaviour: ScrollView (ProSetupCompleteScreen.js:115). Ring fixed 128px and ringValue fixed 34px won't scale with larger-text (ProSetupCompleteScreen.js:377–384). Other text tokenised.

---

SCREEN: Article9ConsentScreen
WHAT IT IS: The UK/EU Article 9 health-data consent gate. Shown to every signed-in cloud user who has not granted explicit consent; blocks the rest of the app until they tick and continue. Locked copy per docs/PRIVACY_CONSENT_LOCKED.md (Article9ConsentScreen.js:14–26).
WHAT IS ON IT:
  - Title "Health and nutrition data consent" (Article9ConsentScreen.js:138).
  - Intro paragraph on why consent is needed (Article9ConsentScreen.js:140–142).
  - "The information Volyume uses…" bullet list (5 items) (Article9ConsentScreen.js:144–151).
  - "An automated safety check:" paragraph describing the ED safety system watching weight/energy/food (Article9ConsentScreen.js:153–156).
  - "What we never do with it:" bullet list (never sell / never share with advertisers / never train a public AI model) (Article9ConsentScreen.js:158–163).
  - "Where it lives:" bullet list (encrypted local / UK servers with RLS / deleted on account deletion) (Article9ConsentScreen.js:165–170).
  - Consent checkbox row "I agree to Volyume using my health and nutrition data to coach me." (Article9ConsentScreen.js:172–185).
  - Withdraw note "You can withdraw this consent at any time in You → Privacy." (Article9ConsentScreen.js:189–191).
  - "Continue" CTA (disabled until checked; shows "Saving…" while busy) (Article9ConsentScreen.js:193–201).
  - "Read the full privacy policy" ghost link → PrivacyPolicy (Article9ConsentScreen.js:203–205, 129–133).
  - Logic: ensures profile row exists, calls `record_health_consent` RPC (audit trail), caches consent in AsyncStorage, fires telemetry with consent version 2026-06-06, and awaits `cascade.startCascade()` (the 14-day Pro trial grant) before resolving (Article9ConsentScreen.js:44–127; CONSENT_VERSION Article9ConsentScreen.js:34).
NAVIGATION: Route `Article9Consent` in Article9ConsentStack (RootNavigator.js:490). Reached when signed-in cloud user, consent checked, `healthConsent === false` (RootNavigator.js:1134–1136). It does not navigate on success — `healthConsentGranted()` flips store state and the navigator re-renders into FirstRunStack/ProOnboardingStack/MainTabs (Article9ConsentScreen.js:118; RootNavigator.js:484–486). Privacy-policy link → in-stack PrivacyPolicy (RootNavigator.js:494).
GATING: Compliance gate that precedes both tiers. Per RootNavigator.js:1098–1103 it sits above the Pro/Free branch, and it is where the trial cascade sets tier='pro' for new accounts (Article9ConsentScreen.js:100–117).
CURRENT STRENGTHS: Plain-language, structured legal copy (what's used / safety check / what we never do / where it lives) — genuinely readable for a consent screen. Versioned consent text pinned in the audit trail (Article9ConsentScreen.js:34, 91–97). Withdrawal right stated before consent per Art 7(3) (Article9ConsentScreen.js:187–191). Network-failure tolerant: local flag still records so the user is never stranded (Article9ConsentScreen.js:69–80). Disabled-until-checked CTA.
CURRENT WEAKNESSES: Long single scroll of legal text before the action — unavoidable for compliance but heavy. The trial-grant coupling (cascade.startCascade at consent) is invisible to the user here; they are not told on this screen that ticking starts a Pro trial (the "Free for 14 days" framing lives back on Welcome).
NEWBIE QUESTION: Yes for comprehension — the copy avoids legalese. A newbie may not grasp that this is also the moment their Pro trial starts, but the consent ask itself is clear.
ATHLETE QUESTION: N/A (compliance gate); nothing here is training-specific.
LOCATION QUESTION: Correct and required — it must precede any health-data collection (RootNavigator.js:1098–1103), so it sits above the onboarding branches.
VISUAL + USABILITY:
  - title: type.h2 = fontSize.xxl (24), bold (Article9ConsentScreen.js:227–232).
  - body: fontSize.md (16), lineHeight 22 (Article9ConsentScreen.js:233–237).
  - subhead: type.bodyStrong = fontSize.md (16), semibold (Article9ConsentScreen.js:238–242).
  - bulletText: fontSize.sm (13), lineHeight 22 (Article9ConsentScreen.js:251–256).
  - consentText: fontSize.sm (13), lineHeight 20 (Article9ConsentScreen.js:282–287).
  - withdrawNote: fontSize.sm (13), lineHeight 20 (Article9ConsentScreen.js:288–293).
  - ctaPrimaryText: type.bodyStrong = fontSize.md (16) (Article9ConsentScreen.js:302).
  - ctaGhostText: fontSize.sm (13), underlined (Article9ConsentScreen.js:308–312).
  - Touch targets: checkbox row paddingVertical spacing.md (12) on a full-width row → ample (Article9ConsentScreen.js:257–268); checkbox glyph itself 24×24 but the whole Pressable row is the target. ctaPrimary paddingVertical spacing.md (12) → ~16+24 ≈ 40px (borderline **below 44px**, Article9ConsentScreen.js:294–300). ctaGhost paddingVertical 12 → ~37px **below 44px** (Article9ConsentScreen.js:303–307).
  - Information density: high but appropriately so (legal disclosure).
  - Most important action (Continue) is prominent (amber fill) but gated behind the checkbox and below all text — correct for consent.
  - Small/large behaviour: ScrollView (Article9ConsentScreen.js:137). All text tokenised, scales.

---

SCREEN: ImportScreen
WHAT IT IS: A staged flow to import a workout-history CSV from Hevy or Strong into Volyume. Presentation only; parsing/writing lives in src/lib/importExternal.js (ImportScreen.js docstring 1–11).
WHAT IS ON IT (by stage):
  - Always: header "Bring your history" + explainer body (ImportScreen.js:153–157).
  - Stage idle: two source cards (Hevy / Strong) with export instructions (ImportScreen.js:31–44, 159–171); "Pick CSV file" primary card (ImportScreen.js:173–176); optional error text (ImportScreen.js:178).
  - Stage parsing: spinner + "Reading your file…" (ImportScreen.js:182–187).
  - Stage preview: preview card with source label; Sessions / Sets / Exercises stats; breakdown rows (matched / will-be-created custom / already-imported-skip); new-custom-exercise names block with hint; "Import N sessions" CTA; "Pick a different file" secondary CTA (ImportScreen.js:189–247).
  - Stage importing: spinner + "Bringing your history in…" + "This usually takes a few seconds." (ImportScreen.js:249–255).
  - Stage done: success card (check icon, "Welcome to Volyume", counts summary); "Done" → goBack; "Import another file" (ImportScreen.js:257–276).
  - Logic: DocumentPicker (CSV types), reads file, parseCSV → detectFormat → parseHevy/parseStrong → analyzeImport; rejects unknown format / empty workouts (ImportScreen.js:63–109); runImport then fire-and-forget bulkUploadLocalData to push to cloud (ImportScreen.js:111–139).
NAVIGATION: Route `Import` in ProfileStack (RootNavigator.js:397, title 'Import history'). Reached from within the You/Profile tab (not part of the first-run onboarding chain). "Done" → `navigation.goBack()` (ImportScreen.js:269).
GATING: Free feature — it lives in ProfileStack with no withProGuard/Gated wrapper (RootNavigator.js:397, contrast the `Gated*` wrappers on the same stack e.g. RootNavigator.js:384, 386, 388). Importing workout history aligns with the Free tier (workout logging is Free per CLAUDE.md). Requires a signed-in `user.id` to confirm (ImportScreen.js:112).
CURRENT STRENGTHS: Clean state-machine UI; every stage is explicit and the preview gives an honest before-commit breakdown (matched vs created vs skipped). Tolerant errors with specific guidance for wrong-file/empty/unknown-format (ImportScreen.js:86–99). Immediate cloud push so a sibling device sees the data (ImportScreen.js:121–130). Numbers formatted with toLocaleString (ImportScreen.js:285).
CURRENT WEAKNESSES: No edit-mapping UI — unmatched exercises silently become custom (by design, docstring 6–8), which a user may not expect even with the hint. Only Hevy and Strong are supported; any other tracker hits the "doesn't look like…" dead end (ImportScreen.js:86–92).
NEWBIE QUESTION: Mostly yes — per-source export instructions are step-by-step (ImportScreen.js:36–43). A brand-new gym-goer with no prior app has nothing to import, but the screen is self-explanatory for those who do.
ATHLETE QUESTION: Yes — an experienced lifter migrating from Hevy/Strong gets sessions, sets, weights, reps preserved and a clear matched/created breakdown; this is a meaningful switching-cost reducer.
LOCATION QUESTION: Reasonable — it lives under You/Profile (RootNavigator.js:397), discoverable post-setup. It is NOT in the first-run onboarding chain, so a new migrator must find it in settings rather than being offered it during onboarding (a discoverability gap rather than a wrong placement).
VISUAL + USABILITY:
  - h1: type.h2 = fontSize.xxl (24), bold (ImportScreen.js:303–307).
  - body: fontSize.sm (13), lineHeight 20 (ImportScreen.js:308–313).
  - sourceName: type.bodyStrong = fontSize.md (16) (ImportScreen.js:329–332).
  - sourceText: fontSize.sm (13), lineHeight 20 (ImportScreen.js:333–337).
  - primaryCtaText: type.bodyStrong = fontSize.md (16) (ImportScreen.js:349–352).
  - secondaryCtaText: type.label = fontSize.sm (13) (ImportScreen.js:362–365).
  - statValue: type.num('h2') = fontSize.xxl (24) (ImportScreen.js:409–412); statLabel type.caption = fontSize.xs (11) (ImportScreen.js:413–417).
  - breakdownText: fontSize.sm (13) (ImportScreen.js:425–428).
  - previewSource / unmappedHead: fontSize.xs (11) uppercase (ImportScreen.js:396–402, 437–444).
  - unmappedText: fontSize.sm (13); unmappedHint type.caption = 11 italic (ImportScreen.js:445–455).
  - errorText: fontSize.sm (13), colour error (ImportScreen.js:367–372).
  - doneTitle: type.title = fontSize.lg (17); doneBody fontSize.sm (13) (ImportScreen.js:466–475).
  - Touch targets: primaryCta paddingVertical spacing.md (12) → ~16+24 ≈ 40px (borderline **below 44px**, ImportScreen.js:339–348); secondaryCta paddingVertical 12 → ~37px **below 44px** (ImportScreen.js:353–360). These are PressableCard CTAs.
  - Information density: low at idle, moderate at preview; clean.
  - Most important action (Pick CSV / Import N sessions) is the most prominent — yes (amber fill primaryCta).
  - Small/large behaviour: ScrollView (ImportScreen.js:152). statRow uses flex:1 columns (ImportScreen.js:403–408) so the three stats space evenly across widths. Text tokenised. The stat numerals use tabular-nums for alignment.

---

## CROSS-SCREEN NOTES

- Recurring sub-44px touch targets on text-link / chip / ghost-button affordances:
  WelcomeScreen sign-in link (~29px), LoginScreen forgot-password (~33px) and
  switch (44 OK), ProOnboarding hourChip/wpChip/segmentSmall/switchAuth (~25–37px),
  ProSetupComplete eduLearnRow (~30px), Article9 ctaPrimary/ctaGhost (~37–40px),
  Import primary/secondary CTAs (~37–40px). Primary `Button size="lg"` CTAs (FirstRun,
  Login, ProSetupComplete) are ~48px and compliant (Button.js:34).
- Fixed (non-scaling) sizes that won't grow under larger-text: WelcomeScreen logo 150
  (WelcomeScreen.js:188), LoginScreen brand mark 56/120 (LoginScreen.js:233, 248),
  ProSetupComplete kcal ring 128 + ringValue 34 (ProSetupCompleteScreen.js:377–384),
  several literal `fontSize: 28/38` brand styles (WelcomeScreen.js:191 unused `wordmark`,
  LoginScreen.js:367 unused `brandName`).
- Dead/unused styles observed (mentioned, not fixed per house rule): WelcomeScreen
  `wordmark` (191); LoginScreen `brandName`, `divider*`, `localBtn*`, `localNote`
  (365–458); ProOnboardingScreen `offerCard` family, `skipBtn/skipNote`,
  `fieldWrap/fieldInput/eyeBtn` (1661–1780).


<!-- ==== phase1/12-monetisation.md ==== -->

# Phase 1 — 12 Monetisation (paywall, subscription, credits)

Evidence-grounded, read-only inventory. Token values resolved from `src/styles/theme.js`.

Theme token reference used throughout (dark default, `src/styles/theme.js`):
- `fontSize.micro` = 10 (theme.js:257), `fontSize.xs` = 11 (theme.js:258), `fontSize.sm` = 13 (theme.js:259), `fontSize.md` = 16 (theme.js:260), `fontSize.lg` = 17 (theme.js:261), `fontSize.xl` = 20 (theme.js:262), `fontSize.xxl` = 24 (theme.js:263), `fontSize.xxxl` = 32 (theme.js:264).
- `type.title` resolves to `fontSize.lg` (17), weight 600 (theme.js:390-393). `type.bodyStrong` resolves to `fontSize.md` (16), weight 600 (theme.js:398-401).
- `spacing`: xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (theme.js:228-239).
- `radius`: xs 4, sm 6, md 10, lg 14, xl 20, full 999 (theme.js:241-248).
- `hitSlop` = { top 12, bottom 12, left 12, right 12 } (theme.js:423). A `<TouchableOpacity>` carrying `hitSlop` adds 12px on every side to its touch target.
- `annualSavingsPct()` (catalogue.js:100-105) computes round((1 − 29.99 / (4.99×12)) × 100) = round(49.92) = **50**, so every "Save 50%" badge resolves to 50. Reference prices £4.99/month and £29.99/year live in `catalogue.js:38-46` but are NOT displayed (PLAY-002); the screens show Google Play's localised price via `usePlayPrices`, falling back to the placeholder "…" until Play responds.

---

SCREEN: PaywallScreen
WHAT IT IS: A modal "Upgrade to Pro" purchase surface, lighter than CascadeGate — a single pay-or-dismiss decision. Opened from a differential trigger (file header, PaywallScreen.js:1-18). Initiates the Google Play IAP purchase and writes tier history through the cascade path.
WHAT IS ON IT:
- Header bar: a 24px spacer (PaywallScreen.js:177), centred title "Upgrade" (PaywallScreen.js:178), and a close "X" Ionicon (size 24) at top-right (PaywallScreen.js:179-181).
- Scrollable body (PaywallScreen.js:184):
  - Title "Pro is the coach" (PaywallScreen.js:185).
  - Subtitle: "Pro reads your training, weight, and food together and adjusts your plan and targets every week, with a written reason for every change." (PaywallScreen.js:186-188).
  - Optional review card (renders only when `pickPaywallExcerpt()` returns non-null; today always null — see paywallExcerpts.js below): star row (up to 5 amber `star` icons size 13), italic quote (max 3 lines), meta line "{name} · {source} · {date}" (PaywallScreen.js:193-203).
  - `TierComparisonStrip` component with `pricingWindow={period}` and `highlighted="pro"` (PaywallScreen.js:205-210) — content NOT DETERMINED IN CODE (separate component not read).
  - Period selector row, two buttons: Annual (left, default-selected) with a "Save 50%" badge, label "Annual", and price (or "…"); Monthly (right) with label "Monthly" and price (or "…") (PaywallScreen.js:213-235).
  - CTA stack: primary `Button` whose label is "Try Pro free for 7 days" when `ctaMode==='try_pro_14d'`, else "Get Pro for {price}" / "Get Pro" (PaywallScreen.js:159-161, 238); tertiary `Button` "Not now" (PaywallScreen.js:239).
  - Terms text (PaywallScreen.js:166-172, 242): trial mode → "Free for 7 days, then {price}. Renews {yearly|monthly} until you cancel. Manage or cancel anytime in Google Play." (price-free variant when price unloaded); buy mode → "{price}, renewing {cadence} until you cancel…" / price-free variant.
  - Legal row (PaywallScreen.js:244-272): "Restore purchases", a "·" dot, "Subscription terms" (→ SubscriptionPolicy), a dot, "Privacy" (opens `LINKS.privacyPolicy` externally).
- Behaviour facts: default period is annual unless `route.params.period==='monthly'` (PaywallScreen.js:49); the 7-day figure is the hardcoded Play intro-trial length stated on this Play purchase surface, NOT the 14-day in-app journey (PaywallScreen.js:152-158).
NAVIGATION: Registered as `Stack.Screen name="Paywall"` in the ProfileStack, `presentation: 'modal'`, `headerShown:false` (RootNavigator.js:405). The file header says it is opened from a DifferentialBadge tap / "Upgrade to Pro" surfaces (PaywallScreen.js:1-7); the exact push call site is NOT DETERMINED IN CODE (not in the read files). Leads to: SubscriptionPolicy via `navigation.navigate('SubscriptionPolicy')` (PaywallScreen.js:256); on pay/restore success it calls `navigation.goBack()` (PaywallScreen.js:95, 127).
GATING: This IS the paywall (the gate surface), so it is shown to free/trial users; it has no `withProGuard`/`ProGate`/tier guard of its own (none present in PaywallScreen.js). It reads `user` only for telemetry (PaywallScreen.js:51).
CURRENT STRENGTHS: Honest disclosure pattern — auto-renew, cadence, and how to cancel are on the purchase surface (PaywallScreen.js:166-172) and prices are never hardcoded (PaywallScreen.js:139-150). Restore-purchases present (Play requirement, PaywallScreen.js:113-137). Annual default with monthly kept visible as an anchor (PaywallScreen.js:48-49). Single ScrollView so content reflows on small screens. Good accessibility labels on period chips and legal links.
CURRENT WEAKNESSES: Two competing CTAs both phrased as dismissal vs purchase ("Not now" tertiary plus the header "X") — two ways to leave but only one to buy (fine). The "Save 50%" badge sits at `top: -9` absolutely positioned over the chip border (PaywallScreen.js:322-326) and can clip on the smallest text-scaled layouts. The review card ships dark (always null today), so the "proof before price" block currently never appears — the layout is built for social proof that is absent.
NEWBIE QUESTION: Largely yes. "Pro is the coach" plus the plain subtitle and a 7-day-free CTA are understandable to a first-timer. The 7-days-free on this surface vs the separate 14-day in-app trial elsewhere (ProUpgrade) could confuse someone who saw "14 days" earlier, but the copy here is internally clear.
ATHLETE QUESTION: Partially. The pitch ("adjusts your plan and targets every week, with a written reason for every change") speaks to a serious trainee, but the specific Pro feature list lives in `TierComparisonStrip` (content not in this file), so the depth an athlete wants to evaluate is delegated and NOT DETERMINED IN CODE here.
LOCATION QUESTION: Appropriate as a modal reachable from differential upgrade triggers; being a modal in ProfileStack with no header is consistent with the other purchase surfaces.
VISUAL + USABILITY:
- Font sizes: headerTitle `type.title` = 17 (PaywallScreen.js:285; theme.js:390). title "Pro is the coach" `fontSize.xxl` = 24 (PaywallScreen.js:293). subtitle `fontSize.md` = 16, lineHeight 22 (PaywallScreen.js:299-300). reviewQuote `fontSize.sm` = 13 (PaywallScreen.js:310). reviewMeta `fontSize.xs` = 11 (PaywallScreen.js:311). periodLabel `fontSize.sm` = 13 (PaywallScreen.js:319). periodPrice `fontSize.md` = 16 (PaywallScreen.js:320). saveBadgeText `fontSize.micro` = 10 (PaywallScreen.js:327). terms `fontSize.xs` = 11, lineHeight 17 (PaywallScreen.js:331-332). legalLink / legalDot `fontSize.xs` = 11 (PaywallScreen.js:346, 349).
- Touch targets: close "X" `TouchableOpacity` has `hitSlop` (PaywallScreen.js:179) so effective target ≥ 24+24 — adequate. Period chips have `paddingVertical: spacing.md` (12) + inner content, comfortably > 44px tall (PaywallScreen.js:313-316). Legal-row links rely on `hitSlop` (PaywallScreen.js:248, 257, 266) to clear 44px — the visible text is `fontSize.xs` (11), so without hitSlop they would be **well under 44px**; hitSlop brings them up. Buttons use the shared `Button` size="lg" (height NOT DETERMINED IN CODE here — Button component not read).
- Information density: moderate. Title, subtitle, (optional) review, comparison strip, 2 chips, 2 buttons, terms, 3 legal links — a full but not overcrowded modal.
- Clean/cluttered: clean; single column, generous `spacing.xl`/`spacing.lg` gaps.
- Most important action prominent: yes — the size="lg" primary CTA is the visually dominant element; "Not now" is tertiary.
- Small/standard/large behaviour: whole body is a ScrollView (PaywallScreen.js:184) so it scrolls on small (5.4") devices. The saveBadge absolute `top:-9` (PaywallScreen.js:323) and the fixed 24px header spacer are fixed values that won't scale with larger text; the rest uses tokens and `flex:1` chips that adapt.

---

SCREEN: ProUpgradeScreen
WHAT IT IS: The full "Go Pro" upgrade screen that also handles account creation/sign-in (email + OAuth), starts the 14-day cardless trial or initiates a Play subscription, and shows a success ("You're Pro") state. (ProUpgradeScreen.js:25, 318-547.)
WHAT IS ON IT (pitch state):
- Close "X" Ionicon size 24 top-right (ProUpgradeScreen.js:324-332).
- Sparkles icon in a 64×64 circle (ProUpgradeScreen.js:334-336).
- Title "Go Pro" (ProUpgradeScreen.js:337).
- Subtitle "Free is the logbook a coach would write in. Pro is the coach who writes back." (ProUpgradeScreen.js:338-340).
- Four perk rows, each an icon tile + text (ProUpgradeScreen.js:18-23, 342-351): "A plan built around your schedule, goals, and experience level"; "Precision Coaching™ that adjusts your training and nutrition as your body responds"; "Personalised calorie and protein targets, updated as your goals change"; "After every check-in, your coach explains every decision. What changed, what was left alone, and why."
- Credential note: "Precision Coaching™ is built from training research, your recovery, your food, and your progress." (ProUpgradeScreen.js:353-355).
- Policy link with info icon: "What stays if you switch back to Free later" → SubscriptionPolicy (ProUpgradeScreen.js:357-368).
- If user has a cloud account (`hasAccount`, ProUpgradeScreen.js:31, 370): an account note whose copy branches on PRO_BETA_ACTIVE / canTrial (ProUpgradeScreen.js:372-380) — beta: "Your account is ready. Activate Pro…"; can-trial: "You're in. Pro's free for the next 14 days, and Google Play adds another week free when you subscribe. After that, {price} a month." (price-free variant if unloaded); else "Your account is ready. Subscribe…". When not beta and trial used, the Annual/Monthly period selector (same Save 50% badge pattern) appears (ProUpgradeScreen.js:381-408). Primary `Button` titled "Activate Pro" / "Start your free trial" / "Subscribe to Pro" (ProUpgradeScreen.js:409-417).
- If no account (ProUpgradeScreen.js:419): account note "Pro needs a free account so your plan and progress are backed up…" (ProUpgradeScreen.js:421-423); OAuth block — "Continue with Apple" (iOS only) and "Continue with Google" buttons + an "or with email" divider (ProUpgradeScreen.js:430-458); Email field with label (ProUpgradeScreen.js:460-477); Password field with label, placeholder, and show/hide eye toggle (ProUpgradeScreen.js:480-512); primary `Button` "Create account and go Pro" / "Sign in and go Pro" (ProUpgradeScreen.js:514-520); a mode-switch link "Already have an account? Sign in" / "Don't have an account? Create one" (ProUpgradeScreen.js:522-536).
- "Maybe later" link at the bottom (ProUpgradeScreen.js:540-542).
- Success state (ProUpgradeScreen.js:285-315): 80×80 amber check circle, "You're Pro." title, body ("Everything's unlocked and your data is backed up…"), then either "Set up your training" + "Skip for now" (needs setup) or a "Done" button.
NAVIGATION: Registered as `Stack.Screen name="ProUpgrade"`, `presentation:'modal'`, `headerShown:false` in HomeStack (RootNavigator.js:304), PlansStack (RootNavigator.js:327), ProgressStack (RootNavigator.js:359), and ProfileStack (RootNavigator.js:407) — so it is reachable from every main tab. Accepts `route.params.fromWinback` (ProUpgradeScreen.js:81). Leads to: SubscriptionPolicy (ProUpgradeScreen.js:359); on success/setup it calls `resetFirstRun()` to route into the Pro onboarding flow (ProUpgradeScreen.js:270-278, 141-147), or `navigation.goBack()` (ProUpgradeScreen.js:303, 311, 326, 540).
GATING: This is an upgrade surface (shown to free/trial users to convert them). No tier guard wraps it. Branching keys off `cascade.canStillTrial(userProfile)` (ProUpgradeScreen.js:32), `PRO_BETA_ACTIVE` (ProUpgradeScreen.js:12, 118), and `tier` from the store (ProUpgradeScreen.js:28, 262). The "truly Pro" success gate requires `tier==='pro' && session.user.id && !user.isLocal` (ProUpgradeScreen.js:262).
CURRENT STRENGTHS: Combines pitch + auth + purchase in one flow so a brand-new user can go from interest to Pro without leaving. Clear perk list with the written-reason differentiator. Honest trial copy (14 in-app + 7 Play). OAuth + email with show/hide password and proper `autoComplete`/`keyboardType`. KeyboardAvoidingView for the form (ProUpgradeScreen.js:322). Success state routes into setup so a new Pro user isn't dropped with no plan (ProUpgradeScreen.js:270-278).
CURRENT WEAKNESSES: This is a heavy screen — it is simultaneously a paywall, a comparison pitch, a login/signup form, and a success screen, which is a lot of responsibility in one file. The trial/price account note (ProUpgradeScreen.js:372-380) has four copy branches that are easy to get subtly inconsistent with PaywallScreen's "7 days free" framing. Two competing exits ("Maybe later" and the "X") plus "Skip for now" on success.
NEWBIE QUESTION: Mostly yes for the pitch ("Pro is the coach who writes back" + four plain perks). The account-creation requirement mid-upgrade may surprise a newbie expecting a one-tap purchase, though the note explains why ("so your plan and progress are backed up"). The 14-then-7-days trial maths is honest but slightly complex for a first-timer to hold in their head.
ATHLETE QUESTION: Yes — the perks name Precision Coaching, weekly adjustment, written reasons, and personalised macro/protein targets, which is what an experienced competitor evaluates. The credential note grounds it in "training research, your recovery, your food, and your progress".
LOCATION QUESTION: Correct — registered as a modal in all four tab stacks so any Pro lock or upgrade prompt across the app can present it. Being the screen that also owns sign-up for Pro is consistent with "Pro requires a cloud account".
VISUAL + USABILITY:
- Font sizes: title "Go Pro" `fontSize.xxxl` = 32, weight 900 (ProUpgradeScreen.js:562). subtitle `fontSize.md` = 16, lineHeight 22 (ProUpgradeScreen.js:567-568). perkText `fontSize.sm` = 13, lineHeight 19 (ProUpgradeScreen.js:580). credentialNote `fontSize.xs` = 11, lineHeight 17 (ProUpgradeScreen.js:582). policyLinkText `fontSize.xs` = 11 (ProUpgradeScreen.js:573). accountNote `fontSize.sm` = 13, lineHeight 19 (ProUpgradeScreen.js:587). periodLabel `fontSize.sm` = 13; periodPrice `fontSize.md` = 16; saveBadgeText `fontSize.micro` = 10 (ProUpgradeScreen.js:597-605). fieldLabel `fontSize.xs` = 11 (ProUpgradeScreen.js:609). fieldInput `fontSize.md` = 16 (ProUpgradeScreen.js:621). oauthBtnText/oauthBtnAppleText `type.bodyStrong` = 16 (ProUpgradeScreen.js:637, 643). oauthDividerText `fontSize.xs` = 11 (ProUpgradeScreen.js:646). switchText `fontSize.sm` = 13 (ProUpgradeScreen.js:649). laterText `fontSize.sm` = 13 (ProUpgradeScreen.js:653). successTitle `fontSize.xxxl` = 32 (ProUpgradeScreen.js:668). successBody `fontSize.md` = 16 (ProUpgradeScreen.js:672). secondaryLinkText `fontSize.sm` = 13 (ProUpgradeScreen.js:679).
- Touch targets: close "X" uses a small `{top:8,bottom:8,left:8,right:8}` hitSlop on a 24px icon (ProUpgradeScreen.js:327) → ~40px, **just under 44px**. The policy link, eye toggle, and "Skip for now" use the same 8px hitSlop (ProUpgradeScreen.js:360, 500, 303) — eye toggle icon size 19 + 8px ≈ 35px, **under 44px**. Period chips `paddingVertical: spacing.md` (12) > 44px tall. switchBtn / laterBtn use `paddingVertical: spacing.md` (12) (ProUpgradeScreen.js:648, 652). OAuth + main buttons use `paddingVertical: spacing.md` (ProUpgradeScreen.js:634, 640) / shared `Button`.
- Information density: high in the no-account path (pitch + 4 perks + note + OAuth + 2 fields + 2-3 links). The has-account path is much lighter.
- Clean/cluttered: leans cluttered in the no-account state because the conversion pitch and a full auth form share one screen; the perk list and spacing keep it readable.
- Most important action prominent: yes — the size="lg" sparkles primary button is dominant in each branch.
- Small/standard/large behaviour: full ScrollView with `flexGrow:1` and KeyboardAvoidingView (ProUpgradeScreen.js:322-323) so the form fits small screens with the keyboard up. Fixed 64×64 icon circle and 80×80 success circle (ProUpgradeScreen.js:556, 661) and the absolute saveBadge `top:-9` are fixed and won't scale with larger text; text elsewhere uses tokens.

---

SCREEN: SubscriptionScreen
WHAT IT IS: The "manage my subscription" screen reached from You → Subscription. Shows current tier, cascade stage, days remaining, locked price, and manage CTAs (upgrade / restore / cancel). (SubscriptionScreen.js:1-13.)
WHAT IS ON IT:
- BackHeader titled "Subscription" (SubscriptionScreen.js:134).
- "Your plan" card (SubscriptionScreen.js:139-148): label "Your plan", value "Pro" or "Free", sub line "{STAGE_LABEL[stage]}" optionally + " · {n} day(s) remaining". STAGE_LABEL maps unstarted→"Not started", pro_trial→"Pro trial", paid→"Paid", free→"Free" (SubscriptionScreen.js:33-38).
- "Price" card, shown only when `stage==='paid'` (SubscriptionScreen.js:150-160): label "Price", value = localised Play price or "…", sub "Billed yearly" / "Billed monthly".
- Action group (SubscriptionScreen.js:163-187): "Upgrade" (free) / "Stay on Pro" (pro_trial) primary button; "Restore purchases" secondary button (with busy spinner); "Cancel subscription" tertiary button in error colour, shown only when tier==='pro'.
- Footnote: "Subscriptions are billed by {Apple|Google Play}. To change your payment method or cancel, open subscription settings in the {App Store|Play Store}." (SubscriptionScreen.js:189-193).
- `CancelReasonSheet` (mounted, opened by Cancel) handing off to the store subscriptions URL (SubscriptionScreen.js:196-203, 75-86).
NAVIGATION: Registered as `Stack.Screen name="Subscription"`, `headerShown:false`, in ProfileStack (RootNavigator.js:403). Reached from You → Subscription (file header, SubscriptionScreen.js:5). Leads to: `CascadeGate` with `{variant:'day14', period}` when stage is pro_trial (SubscriptionScreen.js:124), or `ProUpgrade` with `{fromWinback}` otherwise (SubscriptionScreen.js:128); Restore stays in place; Cancel opens the CancelReasonSheet then the external store URL (SubscriptionScreen.js:75-86).
GATING: Shown to both Free and Pro users (it is the management hub, and conditionally shows upgrade vs cancel). No `withProGuard`. Tier resolved as `storeTier ?? isPaidTier(userProfile)` — store.tier is the same source the feature gates use (SubscriptionScreen.js:49-54). Stage/days come from `cascade.stageOf` / `cascade.daysRemaining` (SubscriptionScreen.js:55-56). Button visibility keys off `tier` and `stage` (SubscriptionScreen.js:164-186).
CURRENT STRENGTHS: Single source of truth for tier (store.tier) so the screen can't disagree with feature gates (SubscriptionScreen.js:49-54). Honest store-handoff for cancellation (can't cancel server-side; uses Apple/Google's own UI, SubscriptionScreen.js:75-86). Optional cancel-reason capture that never blocks the exit (SubscriptionScreen.js:69-73). Price only shown when actually paying (SubscriptionScreen.js:62, 150). Clear restore feedback toasts for every outcome (SubscriptionScreen.js:95-109).
CURRENT WEAKNESSES: Sparse and utilitarian — three cards/buttons; no display of when the next renewal date falls or the actual locked price during trial (price card only shows when paid). The footnote duplicates the cancel guidance already encoded in the CancelReasonSheet handoff. "Stay on Pro" vs "Upgrade" wording carries meaning only if the user knows their stage.
NEWBIE QUESTION: Mostly yes — "Your plan: Free/Pro", days remaining, and labelled buttons are clear. A newbie may not grasp the "Pro trial" stage vs "Paid" distinction, or why renewal/cancel must happen in the Play Store rather than in-app, though the footnote explains the latter.
ATHLETE QUESTION: Adequate for management but thin on detail — an experienced user managing money may want the exact renewal date and amount, which are not shown during the trial stage (price card gated to `paid`, SubscriptionScreen.js:150).
LOCATION QUESTION: Correct — a subscription-management screen belongs under You/Profile, and it is registered in ProfileStack.
VISUAL + USABILITY:
- Font sizes: cardLabel `fontSize.sm` = 13 (SubscriptionScreen.js:220). cardValue `fontSize.xxl` = 24, weight 600 (SubscriptionScreen.js:225-226). cardSub `fontSize.sm` = 13 (SubscriptionScreen.js:231). footnote `fontSize.sm` = 13, lineHeight 18 (SubscriptionScreen.js:238-241). BackHeader title size NOT DETERMINED IN CODE here (BackHeader not read).
- Touch targets: all three actions are the shared `Button` (size="lg" on the primary, SubscriptionScreen.js:167) — heights NOT DETERMINED IN CODE (Button not read), but Button-based so likely ≥44px. No raw small touch targets on this screen.
- Information density: low — one ScrollView, 1-2 cards + an action group + footnote. Plenty of breathing room.
- Clean/cluttered: clean and minimal.
- Most important action prominent: yes — the contextual size="lg" primary ("Upgrade"/"Stay on Pro") is the dominant button; destructive "Cancel" is a tertiary error-coloured link at the bottom.
- Small/standard/large behaviour: ScrollView body (SubscriptionScreen.js:136) with token-based spacing, so it scales across 5.4"–6.7". No fixed pixel layout values; cardValue at 24px is the only large element.

---

SCREEN: SubscriptionPolicyScreen
WHAT IT IS: A static plain-English policy page explaining what's free, what Pro adds, what happens to your data on downgrade, the free trial, and account deletion. (SubscriptionPolicyScreen.js:1-12.)
WHAT IS ON IT:
- BackHeader titled "Free, Pro, and your data" (SubscriptionPolicyScreen.js:22).
- Intro paragraph (SubscriptionPolicyScreen.js:25-28).
- Section "What's always free" (success-tinted check icon, SubscriptionPolicyScreen.js:30-49): body + 11 bullets (full workout logger w/ rest timer, beeps, haptics; 400+ exercise library; 31 ready-made plans; build your own routines; workout history on phone; PRs and strength standing; weekly muscle-group volume targets; Year of Lifts; plate calculator; training reminders; export training history to CSV).
- Section "What Pro adds" (primary-tinted sparkles icon, SubscriptionPolicyScreen.js:51-66): body + 7 bullets (Precision Coaching™ nudges; personalised calorie/protein targets; weekly check-ins with written reasons including what was held; nutrition guidance; body measurements; morning weight log & trend; an account so data is backed up across phones).
- Section "If you switch from Pro back to Free" (warning-tinted swap icon, SubscriptionPolicyScreen.js:68-87): Strong "Nothing you've logged disappears."; a KeyPoint "You keep read access to everything you built on Pro, forever."; body "What changes on Free:"; 5 bullets (past coaching write-ups readable; past check-ins viewable but no new ones; Pro-built plans viewable/re-usable but no new weekly changes; nutrition targets visible but won't auto-update; body measurements stay, new entries pause).
- Section "Your free trial" (primary-tinted time icon, SubscriptionPolicyScreen.js:89-103): body "New accounts get Pro free for 14 days…"; body "To keep Pro after that, subscribe in the app. Google Play adds a further 7 days free, then it renews monthly at the price shown at checkout until you cancel."; 3 bullets (Free tier has no time limit; Pro-built items stay yours/readable; cancel anytime in Google Play, keep Pro until paid period ends).
- Section "Deleting your account" (error-tinted trash icon, SubscriptionPolicyScreen.js:105-116): Strong "Deleting is different to switching back to Free." + explanation directing to Switch to Free to keep history.
- Footer (italic): "We won't quietly raise prices, change what's free, or hold your data behind a paywall. If something changes, you'll hear about it first." (SubscriptionPolicyScreen.js:118-120).
NAVIGATION: Registered as `Stack.Screen name="SubscriptionPolicy"`, `headerShown:false`, in ProfileStack (RootNavigator.js:402). Reached from PaywallScreen (PaywallScreen.js:256), ProUpgradeScreen (ProUpgradeScreen.js:359), and per the file header "Settings → Account" (SubscriptionPolicyScreen.js:11). It is a leaf page; only BackHeader leads out.
GATING: Pure informational content; no tier guard, no `useAppStore`, no `ProGate` (none present in SubscriptionPolicyScreen.js). Visible to anyone who reaches it.
CURRENT STRENGTHS: Genuinely transparent and reassuring — explicitly states data is kept read-only on downgrade, the 14+7 trial maths, "cancel anytime in Google Play", and a no-dark-patterns footer. Modelled on Hevy's downgrade-friendly approach (file header). Well-structured with tinted section icons and consistent bullet/keypoint/strong sub-components. The free/Pro split here is a useful single source of the gating story.
CURRENT WEAKNESSES: Long — five sections of dense bullets; a casual reader may not scroll through all of it. The free/Pro feature lists are hand-maintained prose and could drift from the actual FREE-vs-PRO gating elsewhere in the app. "renews monthly" in the trial section (SubscriptionPolicyScreen.js:98) implicitly assumes monthly even though annual is the default offered elsewhere.
NEWBIE QUESTION: Yes — this is the most newbie-friendly screen in the set: plain English, concrete examples ("raw chicken breast, plain oats"), and explicit reassurance about keeping data. The 14+7 trial explanation is clear.
ATHLETE QUESTION: Yes — an experienced user worried about lock-in gets a precise answer (read-only retention forever, re-usable plans, exportable history), which is exactly the trust signal a serious user wants before subscribing.
LOCATION QUESTION: Correct — a policy/explainer linked from both paywall surfaces and Settings/Account; lives in ProfileStack and is a shared leaf.
VISUAL + USABILITY:
- Font sizes: intro `fontSize.md` = 16, lineHeight 22 (SubscriptionPolicyScreen.js:171). sectionTitle `type.title` = 17, weight 600 (SubscriptionPolicyScreen.js:176; theme.js:390). body `fontSize.sm` = 13, lineHeight 21 (SubscriptionPolicyScreen.js:179). strong `fontSize.sm` = 13, weight 700 (SubscriptionPolicyScreen.js:180). bulletText `fontSize.sm` = 13, lineHeight 20 (SubscriptionPolicyScreen.js:184). keypointText `fontSize.sm` = 13, lineHeight 20, weight 500 (SubscriptionPolicyScreen.js:187). footer `fontSize.xs` = 11, lineHeight 17, italic (SubscriptionPolicyScreen.js:189).
- Touch targets: no interactive controls except BackHeader's back button (BackHeader not read) — content is read-only text; section titles carry `accessibilityRole="header"` (SubscriptionPolicyScreen.js:133).
- Information density: high — five sections, ~26 bullets total plus paragraphs. It is an intentionally thorough policy page.
- Clean/cluttered: clean structurally (carded sections, icon headers, consistent bullets) but long; density is content-driven, not layout clutter.
- Most important action prominent: N/A — informational; no action. The reassurance footer and downgrade section are the emphasis.
- Small/standard/large behaviour: full ScrollView with `showsVerticalScrollIndicator={false}` (SubscriptionPolicyScreen.js:24) and token spacing, so it scrolls and scales across screen sizes; fixed 32×32 section icon wraps (SubscriptionPolicyScreen.js:175) and a 5px bullet dot are the only fixed sizes.

---

SCREEN: CascadeGateScreen
WHAT IT IS: A modal decision surface shown at cascade decision points — trial winding down (day14, with day21/day28 as legacy synonyms), a first-time "upgrade" variant, and a payment-failure 3-day grace prompt. (CascadeGateScreen.js:1-21, 39-91.)
WHAT IS ON IT (variant-driven, CascadeGateScreen.js:44-91):
- Header: 24px spacer, centred title "Subscription", close "X" Ionicon size 24 (CascadeGateScreen.js:222-228).
- Title + subtitle from the variant:
  - `upgrade`: title "Go Pro"; subtitle "Pro keeps the weekly coaching and the food log. Free keeps your data and safety checks, but some features stay read-only."; primary CTA "Go Pro"; no tertiary (CascadeGateScreen.js:46-61).
  - `day14`/`day21`/`day28`: title "Your Pro trial is winding down"; subtitle "Pro keeps the weekly coaching and the food log. Free keeps your data and safety checks, but some features become read-only."; primary "Stay on Pro"; tertiary "Drop to Free" (CascadeGateScreen.js:62-75).
  - `payment_failure`: title "We couldn't take your payment"; subtitle "Update your billing in Google Play within 3 days to keep your current features. After that you'll drop to Free."; primary "Open billing settings"; tertiary "Decide later" (CascadeGateScreen.js:76-87).
- Period selector row (only when `primaryTarget==='pro'`, CascadeGateScreen.js:238-264): Monthly (left here) and Annual (right) chips, Annual carrying the "Save 50%" badge and price (or "…"). Note: ordering is Monthly-then-Annual here, the reverse of PaywallScreen/ProUpgradeScreen.
- CTA stack (CascadeGateScreen.js:266-305): primary `Button` size="lg" (billing → handleBilling; pro → handlePay); optional secondary Pro button; optional tertiary Button ("Drop to Free" calls handleSkip('free'), else dismiss).
- Unknown-variant fallback: a centred error text "Unknown cascade variant: {variant}" (CascadeGateScreen.js:210-218).
NAVIGATION: Registered as `Stack.Screen name="CascadeGate"`, `presentation:'modal'`, `headerShown:false`, in ProfileStack (RootNavigator.js:404). Reached e.g. from SubscriptionScreen with `{variant:'day14', period}` (SubscriptionScreen.js:124); other trigger sites NOT DETERMINED IN CODE (not in read files). Default variant is 'day14' (CascadeGateScreen.js:95). On any decision it `navigation.goBack()` (CascadeGateScreen.js:110-112, 146, 185); billing CTA opens the external store subscriptions URL (CascadeGateScreen.js:194-208).
GATING: A subscription decision modal shown to trial/grace users; no `withProGuard`. Content is purely variant-driven (CascadeGateScreen.js:99); no `useAppStore`/tier read in this file. Purchase routes through `cascade.payAt` + `cascade.confirmPurchase` (CascadeGateScreen.js:130-144); downgrade through `cascade.skipToFree`/`skipToPro` (CascadeGateScreen.js:175-184).
CURRENT STRENGTHS: Single surface cleanly multiplexes three decision moments via a `_variantContent` table (CascadeGateScreen.js:44-91), with legacy day21/day28 synonyms so stale navigation never crashes. Honest "what you keep on Free" framing including "safety checks" (ED-safety-aware copy). Robust purchase error handling distinguishing cancel / supersede / timeout / real failure with appropriate toasts (CascadeGateScreen.js:147-164). Payment-failure variant gives a clear 3-day grace and a direct billing link.
CURRENT WEAKNESSES: The period chip order (Monthly left, Annual right) is **inconsistent** with PaywallScreen and ProUpgradeScreen (Annual left), which both default-select Annual; here the default period is Monthly (CascadeGateScreen.js:98), so the same user sees a different default and order at the gate vs the paywall. The TierComparisonStrip was deliberately dropped (comment CascadeGateScreen.js:234-236), so the gate gives less feature detail than the paywall. Title "Subscription" in the header is generic and doesn't reflect the variant.
NEWBIE QUESTION: Mostly yes — "Your Pro trial is winding down" with "Stay on Pro" / "Drop to Free" is a clear binary, and the payment-failure copy is plain. A newbie may not understand "some features become read-only" without examples (the policy screen has them; this gate doesn't link to it).
ATHLETE QUESTION: Adequate for a decision moment but thin on detail — an experienced user deciding whether to keep paying gets the price chips and a one-line value statement but no feature breakdown (strip removed), so the decision leans on what they already know.
LOCATION QUESTION: Correct — a modal in ProfileStack triggered at cascade decision points; presenting as a modal over the current screen is appropriate for a time-sensitive decision.
VISUAL + USABILITY:
- Font sizes: headerTitle `type.title` = 17 (CascadeGateScreen.js:319; theme.js:390). title `fontSize.xxl` = 24, weight 600 (CascadeGateScreen.js:327-328). subtitle `fontSize.md` = 16, lineHeight 22 (CascadeGateScreen.js:332-333). periodLabel `fontSize.sm` = 13; periodPrice `fontSize.md` = 16; saveBadgeText `fontSize.micro` = 10 (CascadeGateScreen.js:344-352). errorText uses default size, colour error (CascadeGateScreen.js:356).
- Touch targets: close "X" carries `hitSlop` (CascadeGateScreen.js:225) so ≥ ~48px. Period chips `paddingVertical: spacing.md` (12) > 44px tall (CascadeGateScreen.js:338-341). CTAs are shared `Button` (sizes NOT DETERMINED IN CODE here).
- Information density: low-to-moderate — title, subtitle, optional 2 chips, up to 3 stacked buttons. Focused single-decision layout.
- Clean/cluttered: clean; single column with generous spacing.
- Most important action prominent: yes — the size="lg" primary CTA dominates; "Drop to Free"/"Decide later" is a tertiary de-emphasised option.
- Small/standard/large behaviour: ScrollView body (CascadeGateScreen.js:230) with token spacing; the absolute saveBadge `top:-9` (CascadeGateScreen.js:348) and the fixed 24px header spacer are the only fixed values that won't scale with larger text.

---

SCREEN: CreditsScreen
WHAT IT IS: A static attribution/credits page required by the licences of the bundled and live food-data sources (OpenFoodFacts, CoFID, USDA). (CreditsScreen.js:1-17.)
WHAT IS ON IT:
- BackHeader titled "Credits" (CreditsScreen.js:33).
- Intro paragraph about open datasets and verbatim attribution (CreditsScreen.js:37-39).
- OpenFoodFacts card (CreditsScreen.js:42-53): title, body ("Branded UK food data, both bundled… and live…"), attribution ("Data licensed under the Open Database License (ODbL) 1.0…"), link "world.openfoodfacts.org".
- CoFID card (CreditsScreen.js:56-67): title "McCance and Widdowson's Composition of Foods (CoFID)", body, attribution ("Contains public sector information licensed under the Open Government Licence v3.0."), link "gov.uk · CoFID".
- USDA card (CreditsScreen.js:70-81): title "USDA FoodData Central", body, attribution ("Public domain data published by the U.S. Department of Agriculture…"), link "fdc.nal.usda.gov".
- Footnote: "Research, design, and code by the Volyume team. Bug reports and missing-product reports are welcome at support@volyume.app." (CreditsScreen.js:83-85).
NAVIGATION: Registered as `Stack.Screen name="Credits"`, `headerShown:false`, in ProfileStack (RootNavigator.js:406). Reached from You → Credits (file header, CreditsScreen.js:15). Leaf page; links open external URLs via `Linking.openURL` (CreditsScreen.js:26-28).
GATING: Informational; no tier guard, no store read (none present in CreditsScreen.js). Visible to anyone. (Note: it is in the monetisation file only because it was on the dispatch list; it is an attribution page, not a billing surface.)
CURRENT STRENGTHS: Discharges the licence obligations precisely (verbatim OGL v3.0 and ODbL strings), with working source links and clear per-source explanation of how each dataset is used. Clean carded layout.
CURRENT WEAKNESSES: Minor — the three external links are plain `fontSize.sm` text with no underline or icon, so they may not read as tappable; they also rely on the line itself as the touch target with no `hitSlop`.
NEWBIE QUESTION: Yes — a user who opens it understands these are the data sources; the prose is plain. Most newbies will never need this page, which is fine for an attribution surface.
ATHLETE QUESTION: N/A to training — it satisfies neither group's training needs because it isn't a feature page; it correctly serves its legal/attribution purpose for any user.
LOCATION QUESTION: Correct — an attribution page belongs under You → Credits in ProfileStack.
VISUAL + USABILITY:
- Font sizes: intro `fontSize.md` = 16, lineHeight 22 (CreditsScreen.js:96-97). cardTitle `type.bodyStrong` = 16, weight 600 (CreditsScreen.js:104; theme.js:398). body `fontSize.sm` = 13, lineHeight 20 (CreditsScreen.js:109-110). attribution `fontSize.sm` = 13, italic, lineHeight 20 (CreditsScreen.js:115-117). link `fontSize.sm` = 13, primary colour (CreditsScreen.js:122-123). footnote `fontSize.sm` = 13, lineHeight 18 (CreditsScreen.js:127-129).
- Touch targets: the three link `TouchableOpacity`s (CreditsScreen.js:50, 64, 78) have no `hitSlop` and wrap only `fontSize.sm` (13) text, so the tappable height is roughly the text line — **under 44px**. They carry `accessibilityRole="link"` and labels.
- Information density: low — three cards + intro + footnote in one ScrollView.
- Clean/cluttered: clean and minimal.
- Most important action prominent: N/A — informational; the source links are the only actions and are de-emphasised (plain coloured text).
- Small/standard/large behaviour: ScrollView (CreditsScreen.js:35) with token spacing, scales across screen sizes; no fixed pixel layout values.

---

FILE: paywallExcerpts.js (not a screen — content/data module)
WHAT IT IS: A content-only module of verified Google Play review excerpts for the PaywallScreen "social proof" block, plus a deterministic daily picker. NOT billing logic; deliberately kept out of `src/lib/payments/`. (paywallExcerpts.js:1-8.)
WHAT IS IN IT:
- `PAYWALL_EXCERPTS` — a frozen array, **currently empty** (paywallExcerpts.js:37-41). The comment states `EXCERPTS.length === 0` IS the feature flag, so the review block ships dark until ≥3 real Play reviews pass the honesty contract.
- A 7-point "HONESTY CONTRACT" in the file header (paywallExcerpts.js:10-28): source = only published Play reviews; verbatim (ellipsis only, no edits); attribution = public first name/initial + "Google Play" + month/year; rating = the review's own stars (never round up); recency ≤ 12 months, refresh quarterly; ED-safety — no excerpt mentioning weight lost, rate of loss, measurements, appearance, or "finally thin"; removal on edit/objection. Launch bar ≥ 3 usable excerpts (target 5).
- Entry shape documented: `{ stars 1..5, quote (≤~140 chars verbatim), name, source 'Google Play', date 'Mon YYYY' }` (paywallExcerpts.js:32-35).
- `pickPaywallExcerpt(now = new Date())` (paywallExcerpts.js:50-56): returns null when the list is empty; otherwise picks deterministically by UTC day-of-year modulo list length (no randomness, stable within a session). Consumed by PaywallScreen via `pickPaywallExcerpt()` (PaywallScreen.js:32, 146).
GATING / OFFER / PRICE: No gating, no price, no offer logic in this file — it is curated review content only and contains no pricing, no billing calls, and no tier reads. Its only product-relevant effect is whether the PaywallScreen review card renders (today: never, because the array is empty).
NOTE (per brief — no billing changes proposed): The "Save 50%" badge, £4.99/month and £29.99/year reference figures, and the 14+7-day trial framing are all described above as they appear in code; this report proposes no changes to any of them.

---

CROSS-SCREEN OBSERVATIONS (monetisation set)
- Price is never hardcoded on any surface: all four purchase/manage screens read Google Play's localised price via `usePlayPrices` and show "…" until it loads (PaywallScreen.js:143-150, ProUpgradeScreen.js:37-40, SubscriptionScreen.js:64/155, CascadeGateScreen.js:105-108). The £4.99/£29.99 figures in `catalogue.js` are reference-only (catalogue.js:18-23).
- "Save 50%" badge: every annual chip shows `annualSavingsPct()` which resolves to 50 (catalogue.js:100-105).
- Period-chip ordering/default is inconsistent: Annual-left + Annual-default on PaywallScreen (PaywallScreen.js:49, 213-235) and ProUpgradeScreen (ProUpgradeScreen.js:52, 382-407), but Monthly-left + Monthly-default on CascadeGateScreen (CascadeGateScreen.js:98, 238-264). Same period-chip styles are copied into all three files rather than shared.
- Trial framing differs by surface intentionally: PaywallScreen/CascadeGate state Google's 7-day Play offer (PaywallScreen.js:152-172); ProUpgrade and SubscriptionPolicy state the 14-day in-app trial + 7 Play days (ProUpgradeScreen.js:376-378, SubscriptionPolicyScreen.js:94-99).


<!-- ==== phase1/13-settings-gdpr.md ==== -->

# Phase 1 inventory — Settings, account & GDPR surfaces (2026-06-13)

Audited READ-ONLY against the real source. Token values resolved against
`src/styles/theme.js`. Many of these screens are built from the shared
primitives in `src/components/SettingsPrimitives.js`, so the visual specs
below cite that file for any element rendered through `SettingRow`,
`SectionHeader`, or `SettingsPage`.

Shared primitive reference (used by SettingsScreen, SettingsAccount,
SettingsData, SettingsHealth, SettingsNotifications, SettingsPrivacy,
SettingsAbout, SettingsProfile):
- `SettingsPage` content padding `spacing.lg (16)`, row gap `spacing.sm (8)`, bottom pad `spacing.xxl (32)` (`SettingsPrimitives.js:63`).
- `settingRow`: `flexDirection:row`, `padding: spacing.lg (16)`, `borderBottomWidth:1` `colors.border` (`SettingsPrimitives.js:80-87`). The row's vertical hit area is roughly icon-height (34) + 2×16 padding ≈ 66px, comfortably ≥ 44px.
- `settingIcon`: fixed `34×34`, `borderRadius:9`, `colors.primaryBg` (`SettingsPrimitives.js:88-95`). Fixed px — does not scale with larger-text.
- `settingLabel`: `type.body` → `fontSize.md (16)` regular (`SettingsPrimitives.js:97`, theme.js:394-397/262).
- `settingSub`: `fontSize.xs (11)`, `colors.textMuted`, `lineHeight:16` (`SettingsPrimitives.js:98`, theme.js:258).
- `settingValue`: `fontSize.sm (13)`, `colors.textSecondary` (`SettingsPrimitives.js:105`).
- `sectionHeader`: `fontSize.xs (11)`, `fontWeight.black (900)`, `colors.textMuted`, letterSpacing 0.5 (`SettingsPrimitives.js:64-72`).

---

SCREEN: You (YouScreen)
WHAT IT IS: Root of the "You" tab. The personal hub: profile summary, the Pro coaching/preference shortcuts, and the entry point into Settings (`YouScreen.js:1-11`).
WHAT IS ON IT:
- Header "You" via `ScreenHeader` (no wordmark override, so the Volyume wordmark renders on the right) (`YouScreen.js:81`, ScreenHeader.js:26-37).
- Profile card: circular avatar showing first letter of display name (`YouScreen.js:86-89`); display name (firstName → email local-part → "You") (`YouScreen.js:61-63,92`); `ProBadge size="sm"` shown only if Pro (`YouScreen.js:93`); training-age line "N yr(s) training" if `trainingAgeYears` set (`YouScreen.js:65-67,95`); completed-session count "N session(s)" once loaded (`YouScreen.js:96-98`).
- Free only: "Go Pro" NavRow → ProUpgrade, sub "Precision Coaching, nutrition targets and body metrics" (`YouScreen.js:103-112`).
- Pro only "Coaching" section (`YouScreen.js:115-149`): "Weekly check-in" → WeeklyCheckIn; "Precision Coaching™" → CoachOutput; "Update your plan" → ProGoalSetup; "Nutrition targets" → NutritionTargets; "Goal lock" → GoalLockConsent {editMode:true}.
- Free only: "How Precision Coaching works" NavRow → Methodology {source:'you_tab'} (`YouScreen.js:157-166`).
- "Preferences" section (`YouScreen.js:169-185`): "Wellbeing check" (Pro only) → WellbeingCheck; "Settings" → Settings (always).
- About footer: "Volyume", tagline "Less thinking. More lifting.", and app version string `Version X (build)` from expo-application, hidden if unavailable (`YouScreen.js:73-76,188-192`).
- Each NavRow: amber icon in 36×36 chip, label, optional sub, chevron-forward (`YouScreen.js:26-39`).
NAVIGATION: Route `You` in `ProfileStack` (`RootNavigator.js:372`, headerShown:false). `ProfileStack` is the `ProfileTab` (tab title "You") of `MainTabs` (`RootNavigator.js:449`). Reached by tapping the "You" tab. Leads to: ProUpgrade, WeeklyCheckIn, CoachOutput, ProGoalSetup, NutritionTargets, GoalLockConsent, Methodology, WellbeingCheck, Settings (all registered in ProfileStack, `RootNavigator.js:373-407`).
GATING: Free screen (the tab root). Internal sections gated on `isPro = tier === 'pro'` read from the store (`YouScreen.js:42-44,69`); the Coaching block + Wellbeing row render only when Pro, "Go Pro" + "How Precision Coaching works" only when Free. The destination Pro screens are independently `withProGuard`-wrapped at the navigator (e.g. `GatedWeeklyCheckIn`, `RootNavigator.js:149,387`).
CURRENT STRENGTHS: Clean card-and-row layout; the Pro/Free fork keeps free users from seeing dead Pro rows; subs explain each destination in plain coaching voice; all NavRows have `accessibilityLabel` (`YouScreen.js:28`).
CURRENT WEAKNESSES: For a Pro user the Coaching section is five stacked NavRows plus Preferences plus profile — a long scroll of similar cards with no visual differentiation between them. The avatar is a single letter, not a photo. The completed-session count is the only "data" on a screen that is otherwise pure navigation, and it appears late (after async load) which can cause a layout shift.
NEWBIE QUESTION: A first-timer (always Free here unless trialing) sees a short list: Go Pro, How Precision Coaching works, Settings. Understandable. The profile card with "0 sessions" is clear. The term "Precision Coaching™" is unexplained at this point but the adjacent "How it works" row addresses that.
ATHLETE QUESTION: An experienced Pro competitor gets fast access to check-in, coach output, plan update, nutrition targets and goal lock from one place — adequate. But there is no at-a-glance status (current block, phase, next check-in date); it is purely a launcher, so a competitor still has to tap in to see anything.
LOCATION QUESTION: Correct. This is the conventional "profile/account" tab location and it correctly hosts the Settings entry and the personal coaching shortcuts.
VISUAL + USABILITY:
  - Header title "You": `fontSize.xl (20)` bold (ScreenHeader.js:53-57, theme.js:263).
  - Avatar letter `avatarText`: `fontSize.xl (20)` bold, `colors.primary` (`YouScreen.js:212`).
  - `profileName`: `type.title` → `fontSize.lg (17)` semibold (`YouScreen.js:214`, theme.js:390-393).
  - `profileMeta` (training age): `type.caption` → `fontSize.xs (11)` (`YouScreen.js:215`).
  - `profileStat` (sessions): `type.num('caption')` → `fontSize.xs (11)` tabular (`YouScreen.js:216`).
  - `sectionLabel`: `type.label` → `fontSize.sm (13)` medium (`YouScreen.js:219-222`, theme.js:402-405).
  - `navRowLabel`: `type.bodyStrong` → `fontSize.md (16)` semibold (`YouScreen.js:234`).
  - `navRowSub`: `type.caption` → `fontSize.xs (11)` (`YouScreen.js:235`).
  - `aboutName`: `fontSize.sm (13)` bold (`YouScreen.js:238`); `aboutVersion`/`aboutBuild`: `type.caption` → `fontSize.xs (11)` (`YouScreen.js:239-240`).
  - Touch targets: NavRow is a full `PressableCard` of `padding: spacing.lg (16)` around a 36px icon ≈ 68px tall — ≥ 44px (`YouScreen.js:224-228,229-232`). Avatar 56×56 and navRowIcon 36×36 are fixed px (won't scale with larger-text) (`YouScreen.js:207-211,229-232`).
  - Information density: low-to-moderate; profile card + 1-5 sections of full-width cards. ScrollView with `paddingBottom: spacing.xxxl (48)` (`YouScreen.js:200`).
  - Clean/cluttered: clean for Free; for Pro the five-row Coaching list is repetitive but not cluttered.
  - Most important action prominence: for Free, "Go Pro" is the first section card after the profile — appropriately prominent. For Pro, no single action is emphasised over others (all equal-weight cards).
  - Device behaviour: full ScrollView so all sizes scroll. Avatar (56), navRowIcon (36), avatar radius 28 are hard-coded px and will not grow under the larger-text accessibility setting.

---

SCREEN: Settings (SettingsScreen)
WHAT IT IS: The Settings landing page — a list of category rows each opening a focused sub-page; replaced an older single ~1,500-line screen (`SettingsScreen.js:7-9`).
WHAT IS ON IT (all via `SettingRow` inside one `styles.section` card):
- "Account" → SettingsAccount, sub = `user.email` or "Volyume Pro"/"Free plan" (`SettingsScreen.js:17-22`).
- "Profile" → SettingsProfile, sub "Name and diet preference" (`SettingsScreen.js:23-28`).
- "Coaching" → SettingsCoaching, sub "Calmer mode, steps, cardio" (`SettingsScreen.js:29-34`).
- "Notifications" → SettingsNotifications, sub "Training and coaching reminders" (`SettingsScreen.js:35-40`).
- "Display and accessibility" → SettingsDisplay, sub "Text size, contrast, motion" (`SettingsScreen.js:41-46`).
- Health row, shown only when `isHealthAvailable()` — label = `getHealthProviderLabel()`, sub "Weight, steps and workouts" → SettingsHealth (`SettingsScreen.js:47-54`).
- "Your data" → SettingsData, sub "Sync, backup, import, export" (`SettingsScreen.js:55-60`).
- "Privacy and legal" → SettingsPrivacy, sub "Consent, data sharing, policy" (`SettingsScreen.js:61-66`).
- "Help and about" → SettingsAbout, sub "Feedback, rating, version" (`SettingsScreen.js:67-72`).
NAVIGATION: Route `Settings` in `ProfileStack` with stack header `title: 'Settings'` (`RootNavigator.js:373`). Reached from YouScreen "Settings" NavRow (`YouScreen.js:179-184`). Leads to the nine sub-pages above.
GATING: Free screen. The store read is `{ user, tier }` (`SettingsScreen.js:11`); only the Health row is conditionally rendered (capability check, not tier). All category rows show for every tier; the Pro/Free split happens inside each sub-page.
CURRENT STRENGTHS: Exactly the tidy hub the comment describes — one card, eight or nine self-describing rows, each with a one-line sub. Account sub doubles as a live status (email + plan).
CURRENT WEAKNESSES: All rows live in a single undivided card, so visually distinct domains (account vs accessibility vs legal) are not grouped — the only separator is the hairline border between rows. No section headers here (unlike SettingsAccount which does use them).
NEWBIE QUESTION: Yes — it is a conventional settings menu; labels are plain English and the subs remove ambiguity.
ATHLETE QUESTION: Yes for the role of a settings menu; nothing competitor-specific belongs here.
LOCATION QUESTION: Correct — one level under You, the standard place.
VISUAL + USABILITY:
  - All text via shared primitives: label `fontSize.md (16)`, sub `fontSize.xs (11)`, value `fontSize.sm (13)` (see shared reference; `SettingsPrimitives.js:97,98,105`).
  - Touch targets: each `SettingRow` is a `PressableCard` ≈ 66px tall (≥ 44px) (`SettingsPrimitives.js:80-87`).
  - Information density: moderate — up to nine rows in one scroll; no header chrome (stack header supplies the title).
  - Clean/cluttered: clean. Single undivided card is the one critique (grouping).
  - Most important action: no single "primary" — appropriate for a menu, though Account (identity) is sensibly first.
  - Device behaviour: `SettingsPage` is a ScrollView (`SettingsPrimitives.js:54-58`); content fits small screens with scroll. Icon chips are fixed 34px.

---

SCREEN: Account (SettingsAccountScreen)
WHAT IT IS: Identity, plan, subscription, upgrade/downgrade, and the two destructive account actions (sign out, delete) (`SettingsAccountScreen.js:8-9`).
WHAT IS ON IT:
- Section header "Plan" (`SettingsAccountScreen.js:18`).
- Identity row: label = `user.email` or "Signed in", sub = "Volyume Pro"/"Free plan", no arrow (`SettingsAccountScreen.js:20-25`).
- "Subscription" → Subscription screen, sub "Plan, billing, restore purchases" (`SettingsAccountScreen.js:26-31`).
- "Go Pro" (only when `tier !== 'pro'`) → ProUpgrade, sub "Precision Coaching™ and weekly check-ins" (`SettingsAccountScreen.js:32-39`).
- "Switch to Free" (only when Pro) → `appAlert` confirm "Switch to Free?" with Keep Pro / Switch to Free; on confirm `setTier('free', 'SettingsScreen.switchToFree')` (`SettingsAccountScreen.js:40-58`).
- Section header "Session" (`SettingsAccountScreen.js:63`).
- "Sign out" destructive row, label flips to "Signing out…" while in flight; `handleSignOut` (`SettingsAccountScreen.js:65-70`).
- "Delete account" destructive row, label flips to "Deleting account…"; `handleDeleteAccount` (`SettingsAccountScreen.js:71-76`).
NAVIGATION: Route `SettingsAccount`, stack header `title: 'Account'` (`RootNavigator.js:374`). From SettingsScreen "Account" row (`SettingsScreen.js:21`). Leads to Subscription and ProUpgrade.
GATING: Free screen (account management is universal). Tier read from store (`SettingsAccountScreen.js:11`); "Go Pro" vs "Switch to Free" forks on `tier === 'pro'`. Sign-out/delete via `useAccountActions` hook (`SettingsAccountScreen.js:14`).
CURRENT STRENGTHS: Destructive actions are isolated in their own "Session" card below the plan rows, deliberately so a destructive tap is never adjacent to a routine one (`SettingsAccountScreen.js:61-62`). Switch-to-Free has a clear, reassuring confirmation. In-flight labels give feedback.
CURRENT WEAKNESSES: "Subscription", "Go Pro" and the Switch-to-Free all touch the billing/plan story and partially overlap (Subscription screen also handles plan changes), which could confuse where to manage billing. The billing-touching "Switch to Free" lives here but is governed by CLAUDE.md's billing rules — note: this is tier state, not a Play Billing edit.
NEWBIE QUESTION: Mostly — email + "Free plan" is clear. A newbie may not distinguish "Subscription" from "Go Pro".
ATHLETE QUESTION: Yes — a paying competitor finds billing, restore purchases, and downgrade here as expected.
LOCATION QUESTION: Correct — account/identity/billing belong under Settings → Account.
VISUAL + USABILITY:
  - All rows use shared primitives (label `fontSize.md (16)`, sub `fontSize.xs (11)`). Destructive rows render label + icon in `colors.error` and icon chip in `colors.errorBg` (`SettingsPrimitives.js:25-29,96,99`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px).
  - Information density: low — two small cards.
  - Clean/cluttered: clean; the Plan/Session split is good hierarchy.
  - Most important action: identity row is first (status), destructive actions correctly de-emphasised at the bottom.
  - Device behaviour: ScrollView; fits all sizes. Icon chips fixed 34px.

---

SCREEN: Profile (SettingsProfileScreen)
WHAT IT IS: The handful of things the user types/picks about themselves — first name and diet preference (`SettingsProfileScreen.js:15`).
WHAT IS ON IT:
- Name row: person icon + `TextInput` for first name, placeholder "Your first name", saves on blur via `saveLocalProfile` (`SettingsProfileScreen.js:31-50`).
- Diet block: nutrition icon, "Diet preference" label, sub "This filters the meals we suggest", and three selectable chips Omnivore / Vegetarian / Vegan; tapping sets local state and calls `setDietPreference` (`SettingsProfileScreen.js:56-82`, DIET_OPTIONS `:9-13`).
- Comment notes gym-weight/body-weight/bar-weight rows were removed at user request; defaults stay kg, body-weight units come from onboarding (`SettingsProfileScreen.js:51-55`).
NAVIGATION: Route `SettingsProfile`, stack header `title: 'Profile'` (`RootNavigator.js:375`). From SettingsScreen "Profile" row (`SettingsScreen.js:27`). No onward navigation.
GATING: Free screen. Store read `{ user, userProfile, saveLocalProfile, setDietPreference }` (`SettingsProfileScreen.js:17-24`); no tier guard. Diet preference drives meal suggestions (a Pro feature), but the setting itself is editable by all.
CURRENT STRENGTHS: Minimal and focused; inline save-on-blur with no explicit save button; chips have `accessibilityRole="button"` and `accessibilityState.selected` (`SettingsProfileScreen.js:74-75`).
CURRENT WEAKNESSES: Only two fields — feels sparse for a "Profile" page; a newbie might expect age/height/weight here but those live in onboarding/coaching. No visible confirmation that the name saved (silent onBlur write). Diet preference's effect (meal suggestions) is Pro-only, so a Free user editing it sees no consequence.
NEWBIE QUESTION: Yes — name field and three diet chips are self-evident.
ATHLETE QUESTION: Partially — a competitor may want stats (training age, bodyweight units) editable here; they are deliberately elsewhere, which could feel scattered.
LOCATION QUESTION: Reasonable, though the sparseness blurs the line between "Profile" here and the coaching/onboarding data captured elsewhere.
VISUAL + USABILITY:
  - `nameInput`: `type.body` → `fontSize.md (16)` (`SettingsProfileScreen.js:97-102`).
  - "Diet preference" label + sub via shared primitives (`settingsStyles.settingLabel` 16, `settingSub` 11) (`SettingsProfileScreen.js:62-63`).
  - `dietChipText`: `type.label` → `fontSize.sm (13)` medium; active → `colors.primary` semibold (`SettingsProfileScreen.js:131-138`).
  - Touch targets: diet chips are `flex:1` with only `paddingVertical: spacing.sm (8)` (`SettingsProfileScreen.js:118-126`) — chip text 13px + 2×8 padding ≈ 34px tall; FLAG: below the 44px minimum height (width is fine, full-row thirds). Name row `paddingVertical: spacing.sm (8)` around a 16px input ≈ 32px — but it is a text field, not a button.
  - Information density: very low.
  - Clean/cluttered: clean.
  - Most important action: name field first; appropriate.
  - Device behaviour: ScrollView; three equal-width chips will stay readable on a 5.4" screen. Icon chip in diet header is the fixed 34px primitive.

---

SCREEN: Your data (SettingsDataScreen)
WHAT IT IS: Cloud sync, import from other apps, backup/restore, snapshot restore, CSV export, and clear-history (`SettingsDataScreen.js:19-21`).
WHAT IS ON IT (one `styles.section` card of `SettingRow`s):
- "Cloud sync" / "Syncing…" — sub = `formatLastSynced(syncSnapshot)` or "Checking for changes."; tap runs `handleSyncNow` (manual resync through `syncAll`) (`SettingsDataScreen.js:162-168,41-66`).
- "Import from another app" → Import, sub "Bring sessions over from Hevy or Strong" (`SettingsDataScreen.js:169-174`).
- "Back up everything (JSON)" → `handleFullBackup` (export DB, share, size-in-KB alert) (`SettingsDataScreen.js:175-179,96-106`).
- "Restore from backup" → `handleRestoreBackup` (destructive confirm, file picker, count summary, restart prompt) (`SettingsDataScreen.js:180-184,108-133`).
- "Restore a snapshot" → Snapshots, sub "Automatic safety copies from before each app update" (`SettingsDataScreen.js:185-190`).
- "Export workout log (CSV)" → `exportData` (build CSV, share, empty-state alert) (`SettingsDataScreen.js:191-195,68-94`).
- "Clear workout history" destructive → `handleClearHistory` (confirm, deletes sessions + PRs) (`SettingsDataScreen.js:196-201,135-157`).
- Footer note: "Your data is always yours. Export or back up any time, no account required." (`SettingsDataScreen.js:203-205`).
NAVIGATION: Route `SettingsData`, stack header `title: 'Your data'` (`RootNavigator.js:380`). From SettingsScreen "Your data" row (`SettingsScreen.js:59`). Leads to Import and Snapshots; the rest are in-screen actions/alerts.
GATING: Free screen — data portability is universal (footer underscores "no account required"). Store read is `user` only (`SettingsDataScreen.js:24`); no tier guard. (Note: CSV export and backup include all logged data regardless of tier.)
CURRENT STRENGTHS: Strong GDPR/portability story — export, full backup, CSV, and snapshot restore all reachable; every destructive action has its own confirm dialog with plain-language consequences ("This cannot be undone"). Cloud sync status line is honest and the manual sync surfaces a toast.
CURRENT WEAKNESSES: Seven rows of similar-weight actions in one card — backup vs CSV export vs snapshot restore can blur for a non-technical user (three flavours of "save my data"). "(JSON)" and "(CSV)" jargon in labels. Restore requires a manual app restart (alert tells the user to reopen), which is clunky.
NEWBIE QUESTION: Partly — "Cloud sync" and "Export workout log" are clear; "Back up everything (JSON)" vs "Restore a snapshot" vs "Import from another app" is a lot of overlapping vocabulary for a beginner.
ATHLETE QUESTION: Yes — a serious user gets CSV export, full JSON backup for device migration, and Hevy/Strong import. This is competitor-grade portability.
LOCATION QUESTION: Correct — all data/sync/portability under Settings → Your data.
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11).
  - `dataPrivacyNote` footer: `fontSize.xs (11)`, `colors.textMuted`, lineHeight 16 (`SettingsPrimitives.js:106-112`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px).
  - Information density: moderate-high — seven action rows + footer.
  - Clean/cluttered: borderline cluttered given the overlap of backup/export/restore concepts.
  - Most important action: Cloud sync is first; reasonable. Destructive "Clear workout history" correctly last.
  - Device behaviour: ScrollView; fine on small screens. Icon chips fixed 34px.

---

SCREEN: Display & accessibility (SettingsDisplayScreen)
WHAT IT IS: Appearance (theme) plus the accessibility toggles — larger text, higher contrast, colour-blind palette, reduce motion (`SettingsDisplayScreen.js:45-47`).
WHAT IS ON IT:
- Appearance card: "Appearance" title, explanatory sub, and a three-segment control Dark / Light / Match phone (`THEME_OPTIONS`); selecting a non-active option writes `setAccessibilityPref('theme', …)` then `promptRestartForA11y('Appearance')` (`SettingsDisplayScreen.js:68-96,12-16`).
- Toggles card (`SettingRow` + `Switch`):
  - "Larger text" — sub explains it stacks with OS text size; on change saves then prompts reload (`SettingsDisplayScreen.js:99-118`).
  - "Higher contrast" — brightens secondary text / dividers; saves then prompts reload (`SettingsDisplayScreen.js:119-135`).
  - "Colour-blind safe palette" — swaps green/red for sky blue/reddish purple; saves then prompts reload (`SettingsDisplayScreen.js:136-152`).
  - "Reduce motion" — turns off PR particles / timer animations; takes effect immediately (no reload) (`SettingsDisplayScreen.js:153-166`).
  - Note: reduce-motion is immediate; the other three need a reopen, with a reload prompt (`SettingsDisplayScreen.js:167-169`).
- `promptRestartForA11y` shows "<label> saved" with Later / Reload now (`Updates.reloadAsync`), with a dev-client fallback alert (`SettingsDisplayScreen.js:23-43`).
NAVIGATION: Route `SettingsDisplay`, stack header `title: 'Display & accessibility'` (`RootNavigator.js:378`). From SettingsScreen "Display and accessibility" row (`SettingsScreen.js:45`). No onward navigation.
GATING: Free screen — explicitly FREE per the COMP-029 comment "appearance is a FREE display setting (never Pro-gated)" (`SettingsDisplayScreen.js:10-11`). Reads `accessibility` slice + actions (`SettingsDisplayScreen.js:48-55`); no tier guard.
CURRENT STRENGTHS: Each toggle has a thorough plain-language sub explaining what it does and who it helps. The reload-now flow is handled honestly (the tokens are baked at module-eval time, theme.js:1-7,270-273). Switch `accessibilityLabel` is lent from the row label by the primitive (`SettingsPrimitives.js:36-38`). The segmented control has `accessibilityRole="radiogroup"`/`"radio"` (`SettingsDisplayScreen.js:73,87`).
CURRENT WEAKNESSES: Three of four accessibility settings require an app reload to take effect — a real usability tax for the exact users (low-vision) who need them; the workaround (reload prompt) is the best available given the in-place token mutation architecture but is still a reopen. The Appearance title/sub sit inside `styles.section` (a card meant for rows) with locally-styled text, slightly off-pattern from the rest of Settings.
NEWBIE QUESTION: Yes — labels and subs are explicit. The "needs to reopen" prompt may briefly confuse but is explained.
ATHLETE QUESTION: Not competitor-specific; adequate for anyone.
LOCATION QUESTION: Correct — accessibility/appearance belong under Settings → Display.
VISUAL + USABILITY:
  - `local.title` "Appearance": `fontSize.md (16)` semibold (`SettingsDisplayScreen.js:176`).
  - `local.sub`: `fontSize.sm (13)`, `colors.textMuted`, lineHeight 18 (`SettingsDisplayScreen.js:177`).
  - `segText`: `fontSize.sm (13)` medium; active `segTextActive` → `colors.onPrimary` semibold on `primaryFill` (`SettingsDisplayScreen.js:187-188,186`).
  - Toggle rows via primitives (label 16, sub 11).
  - `a11yNote`: `fontSize.xs (11)` italic muted (`SettingsPrimitives.js:113-120`).
  - Touch targets: segmented `segBtn` is `flex:1` with `paddingVertical: spacing.sm (8)` → ≈ 13 + 16 ≈ 34px tall; FLAG: below 44px height (`SettingsDisplayScreen.js:185`). Toggle rows are full `SettingRow` height (≥ 44px); the `Switch` itself is the native control.
  - Information density: low-moderate — one appearance card + four toggle rows + a note.
  - Clean/cluttered: clean.
  - Most important action: Appearance (theme) first, then accessibility toggles; sensible order.
  - Device behaviour: ScrollView; subs are long and will wrap heavily on a 5.4", increasing row height (acceptable). Theme tokens are mutated at boot, not responsive to runtime changes (architectural — theme.js:1-7).

---

SCREEN: Health (SettingsHealthScreen)
WHAT IT IS: Per-scope read/write connections to the device health provider (Apple Health / Health Connect): morning weight read, daily steps read, workout write, plus sync-now and open-system-settings (`SettingsHealthScreen.js:17-19`).
WHAT IS ON IT (one `styles.section` card):
- "Read morning weight" toggle — sub reflects connected/disconnected; on enable requests weight permission and imports new weights with a toast; on disable opens system Health settings (`SettingsHealthScreen.js:176-194,60-92`).
- "Read daily steps" toggle — requests steps permission, reads today's steps immediately; same disable behaviour (`SettingsHealthScreen.js:195-213,94-124`).
- "Write workouts" toggle — requests workout-write permission (`SettingsHealthScreen.js:214-232,126-149`).
- "Sync weight now" row — shown only if weight granted; pulls new readings (`SettingsHealthScreen.js:233-241,151-171`).
- "Open Health settings" row — shown if weight OR workout granted; sub explains turning things off must be done inside the provider (`SettingsHealthScreen.js:242-249`).
- Footer note: "Volyume only touches what you switch on. Everything else stays on this device." (`SettingsHealthScreen.js:251-253`).
- `handleSdkUnavailable` offers a "Get Health Connect" Play-listing path when the SDK isn't ready (`SettingsHealthScreen.js:47-58`).
NAVIGATION: Route `SettingsHealth`, stack header `title: 'Health'` (`RootNavigator.js:379`). Reached only from the SettingsScreen Health row, which itself renders only when `isHealthAvailable()` (`SettingsScreen.js:47-54`). No onward in-app navigation (opens system settings / Play externally).
GATING: NOT DETERMINED IN CODE as a hard tier guard — this screen reads only `user` from the store (`SettingsHealthScreen.js:22`) and has no `withProGuard`/tier check. Its entry row is shown on a capability check (`isHealthAvailable()`), not a tier check. Per CLAUDE.md, "wearable integration" is a Pro feature, so the absence of a tier guard on this screen is a finding worth flagging to the next session (FLAG: no Pro guard on a wearable/health screen, vs CLAUDE.md FREE/PRO list).
CURRENT STRENGTHS: Genuinely per-scope (weight / steps / workouts independently), matching how Apple Health / Health Connect grant permissions; honest about the platform reality that the app cannot revoke (sends user to system settings); the sdk-unavailable branch gives a real next step instead of a dead "permission needed" toast. Toasts confirm imports with counts.
CURRENT WEAKNESSES: The toggles are slightly misleading as on/off switches because turning them OFF cannot revoke — it just opens system settings; a user may toggle off, see the switch snap back, and be confused. Switch state is derived from permission status, so it can disagree with the user's tap until they return from system settings. Five conditional rows make the visible content jump as permissions change.
NEWBIE QUESTION: Mostly — "Read morning weight" etc. are clear, but the "toggle off just opens settings" model is non-obvious.
ATHLETE QUESTION: Yes — a competitor wanting scale/wearable weight and step data into the coach is well served; per-scope control is a power-user nicety.
LOCATION QUESTION: Correct — health/wearable connections under Settings → Health (gating concern noted above).
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11). Subs are long and state-dependent.
  - `dataPrivacyNote` footer 11px muted (`SettingsPrimitives.js:106-112`).
  - Switch `trackColor` true = `withAlpha(colors.primary, 0.502)`, thumb `colors.primary` when on (`SettingsHealthScreen.js:190-191`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px); native Switch handles its own.
  - Information density: moderate, but variable (rows appear/disappear with permission state).
  - Clean/cluttered: clean when nothing granted; busier once Sync-now + Open-Health-settings appear.
  - Most important action: weight read is first (the main coaching input); reasonable.
  - Device behaviour: ScrollView; long subs wrap on small screens. Icon chips fixed 34px.

---

SCREEN: Notifications (SettingsNotificationsScreen)
WHAT IT IS: A short hub pointing at the reminder screens — training reminders for all tiers, coaching reminders for Pro (`SettingsNotificationsScreen.js:6-7`).
WHAT IS ON IT:
- "Training reminders" → NotificationSettings, sub "Set when Volyume nudges you to train" (`SettingsNotificationsScreen.js:14-19`).
- "Coaching reminders" (Pro only) → CoachingReminders, sub "Morning weight log and weekly check-in" (`SettingsNotificationsScreen.js:20-27`).
NAVIGATION: Route `SettingsNotifications`, stack header `title: 'Notifications'` (`RootNavigator.js:377`). From SettingsScreen "Notifications" row (`SettingsScreen.js:39`). Leads to NotificationSettings and (Pro) CoachingReminders.
GATING: Free screen; the Coaching-reminders row is Pro-only via `tier === 'pro'` (`SettingsNotificationsScreen.js:9,20`). Destination CoachingReminders is also `withProGuard` (`GatedCoachingReminders`, RootNavigator.js:155,398).
CURRENT STRENGTHS: Tiny, unambiguous; cleanly separates the universal training reminder from the Pro coaching reminders.
CURRENT WEAKNESSES: Two rows for a whole "Notifications" section feels thin and adds an extra tap before reaching the actual training-reminder controls; the hub could arguably be collapsed.
NEWBIE QUESTION: Yes — one row, plainly labelled.
ATHLETE QUESTION: Yes for Pro — coaching reminders are surfaced.
LOCATION QUESTION: Correct, though the extra hub layer is debatable.
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px).
  - Information density: very low (1-2 rows).
  - Clean/cluttered: clean.
  - Most important action: training reminders first; correct for the broader audience.
  - Device behaviour: ScrollView; trivially fits all sizes.

---

SCREEN: Privacy & legal (SettingsPrivacyScreen)
WHAT IT IS: Health-data consent withdrawal, two data-sharing toggles (Open Food Facts label sharing, anonymous usage data), and the privacy policy link (`SettingsPrivacyScreen.js:15-16`).
WHAT IS ON IT (one `styles.section` card):
- "Health-data consent" row — sub reflects Granted/Withdrawn/Not recorded; value chip "On"/"Off"/"-"; tappable to withdraw only when granted (`handleWithdrawConsent`) (`SettingsPrivacyScreen.js:43-54`).
- "Share scanned labels with Open Food Facts" toggle — sends confirmed macros + label photo; `getConsent`/`setConsent` from food/writeback (`SettingsPrivacyScreen.js:55-68,9-12,34-38`).
- "Share usage data" toggle — first-party telemetry; value is `!privacy.analyticsOptOut`; `setAnalyticsOptOut(!v)` (`SettingsPrivacyScreen.js:69-82`).
- "Privacy Policy" → PrivacyPolicy screen (`SettingsPrivacyScreen.js:83-87`).
NAVIGATION: Route `SettingsPrivacy`, stack header `title: 'Privacy & legal'` (`RootNavigator.js:382`). From SettingsScreen "Privacy and legal" row (`SettingsScreen.js:65`). Leads to PrivacyPolicy.
GATING: Free screen — consent and privacy controls are universal (GDPR). Reads `{ healthConsent, privacy, setAnalyticsOptOut }` (`SettingsPrivacyScreen.js:18-24`) + `useAccountActions` for withdrawal; no tier guard.
CURRENT STRENGTHS: This is the core GDPR consent surface and it is solid: explicit health-data consent withdrawal (with status + value), granular opt-outs for both OFF label sharing and usage telemetry, plain-language subs describing exactly what each share does and does not include ("Never your training, food, or body data"). Withdrawal is gated to only fire when consent is currently granted.
CURRENT WEAKNESSES: Three different consent/sharing mechanisms with different UI shapes (a tappable status row vs two switches) sit in one card without sub-headers, so the distinction between "withdraw health consent" (a serious legal action) and "share scanned labels" (a community nicety) is visually flat. The usage-data toggle's inverted logic (`!analyticsOptOut`) is correct but is the kind of double-negative that is easy to get wrong in future edits.
NEWBIE QUESTION: Largely — the subs carry it. "Health-data consent" with no prior context may puzzle a brand-new user, but the status line ("Granted"/"Not recorded yet") helps.
ATHLETE QUESTION: Yes — nothing competitor-specific; the controls are complete.
LOCATION QUESTION: Correct — consent/sharing/policy under Settings → Privacy & legal.
VISUAL + USABILITY:
  - Rows via shared primitives; `value` chip ("On"/"Off"/"-") at `fontSize.sm (13)` `textSecondary` (`SettingsPrimitives.js:105`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px); native switches handle their own.
  - Information density: low-moderate — four rows.
  - Clean/cluttered: clean; the lack of sub-headers is the one critique given the mixed action severities.
  - Most important action: health-data consent first (most legally significant); appropriate.
  - Device behaviour: ScrollView; long subs wrap on small screens. Icon chips fixed 34px.

---

SCREEN: Help & about (SettingsAboutScreen)
WHAT IT IS: Feedback, store rating, credits, and the build footer; long-pressing the version opens the debug log (`SettingsAboutScreen.js:7-8`).
WHAT IS ON IT:
- "Send feedback" → opens the FeedbackSheet ({trigger:'settings'}), sub "Quick sentiment + optional note" (`SettingsAboutScreen.js:15-20`).
- "Rate Volyume" → in-app review via `expo-store-review`, with platform-specific store fallback (App Store deep link on iOS, market://+web on Android) (`SettingsAboutScreen.js:21-50`).
- "Credits" → Credits screen, sub "OpenFoodFacts, CoFID, USDA attribution" (`SettingsAboutScreen.js:51-56`).
- About footer: "Volyume" wordmark; tappable version string `vX (buildNumber/versionCode)` — tap shares a build identifier, long-press (600ms) → DebugLog; tagline "Less thinking. More lifting." (`SettingsAboutScreen.js:59-91`).
NAVIGATION: Route `SettingsAbout`, stack header `title: 'Help & about'` (`RootNavigator.js:383`). From SettingsScreen "Help and about" row (`SettingsScreen.js:71`). Leads to Credits and (hidden long-press) DebugLog.
GATING: Free screen. No store/tier read; pure utility. The DebugLog long-press is an undocumented hidden gesture, not tier-gated.
CURRENT STRENGTHS: Correct platform-aware rating flow (never opens a Play URL on iOS); the version string is both shareable (for bug reports) and the hidden door to debug logs; rich `accessibilityLabel` on the version touchable describing tap + long-press (`SettingsAboutScreen.js:80`).
CURRENT WEAKNESSES: A `betaBadge`/`betaBadgeText` style pair is defined but never rendered — dead style (`SettingsAboutScreen.js:105-116`) (mention-only per CLAUDE.md). The debug-log entry being a hidden long-press means a confused tester cannot find it without being told.
NEWBIE QUESTION: Yes — feedback / rate / credits are conventional and clear.
ATHLETE QUESTION: Yes — nothing role-specific needed here.
LOCATION QUESTION: Correct — help/about/version under Settings → Help & about.
VISUAL + USABILITY:
  - Rows via shared primitives (label 16, sub 11).
  - `appName`: `fontSize.xl (20)` black, letterSpacing 2 (`SettingsAboutScreen.js:103`).
  - `appVersion`: `fontSize.sm (13)` muted (`SettingsAboutScreen.js:117`).
  - `tagline`: `type.caption` → `fontSize.xs (11)` (`SettingsAboutScreen.js:118`).
  - Touch targets: `SettingRow` ≈ 66px (≥ 44px). The version `TouchableOpacity` wraps a single 13px text line with no padding/hitSlop (`SettingsAboutScreen.js:63-89`) → ≈ 16-20px tall; FLAG: below 44px, though it is a secondary/hidden affordance.
  - Information density: low — three rows + centred footer.
  - Clean/cluttered: clean.
  - Most important action: feedback first; reasonable. The footer is intentionally quiet.
  - Device behaviour: ScrollView; fits all sizes.

---

SCREEN: Training reminders (NotificationSettingsScreen)
WHAT IT IS: The training-reminder controls (toggle + time picker), plus a cross-link to the Pro Coaching-reminders screen and notification-permission messaging. (Despite the filename, the morning-weight + weekly-check-in toggles were moved out to CoachingRemindersScreen; this screen now owns only training reminders) (`NotificationSettingsScreen.js:103-109,456-462`).
WHAT IS ON IT:
- Subtitle: "Volyume uses local notifications only. No marketing, ever." (`NotificationSettingsScreen.js:436-440`).
- Permission banner (only when `permissionStatus === 'denied'`): warning icon + "Notifications are currently disabled…" (`NotificationSettingsScreen.js:447-454`).
- Cross-link card (Pro only): "Coaching reminders" → CoachingReminders, sub "Morning weight + weekly check-in schedule. Always on for Pro." (`NotificationSettingsScreen.js:463-482`).
- "Training reminders" section label (`NotificationSettingsScreen.js:486`).
- Card: "Remind me to train" toggle (`handleTrainingToggle`; blocks enable if permission not granted with an alert); when on, an expandable "Reminder time" picker row (preset times via `appAlert`); helper text about plans not having fixed weekdays (`NotificationSettingsScreen.js:487-529,386-429`).
- Bottom note reiterating local-only / no marketing (`NotificationSettingsScreen.js:532-536`).
- "Saving..." / "Saved" status text (`NotificationSettingsScreen.js:538-540`).
NAVIGATION: Route `NotificationSettings`, stack header `title: 'Notifications'` (`RootNavigator.js:396`). Reached from SettingsNotificationsScreen "Training reminders" row (`SettingsNotificationsScreen.js:18`). Leads to CoachingReminders (Pro cross-link).
GATING: Free screen — training reminders are universal. Pro-only cross-link gated on `isPro = tier === 'pro'` (`NotificationSettingsScreen.js:108-109,463`).
CURRENT STRENGTHS: Honest local-only / no-marketing messaging stated twice; the permission-denied banner is helpful; training reminder + time picker are straightforward; comments document why morning/check-in toggles were removed (they were non-optional coaching inputs).
CURRENT WEAKNESSES: Significant dead/orphaned code: `scheduleApply` and `applyNotifications` are retained but unreachable ("only reachable via handlers removed in a half-finished refactor", `NotificationSettingsScreen.js:315-333`); the `saving`/`saved` status text is therefore effectively never triggered by training-reminder edits (those use `persistTrainingPreference`, not the debounced `scheduleApply`). The screen title is "Notifications" but content is only training reminders; the helper text promises choosing "the days you want the nudge" but no day-picker is present on this screen (only a time picker), which is misleading (`NotificationSettingsScreen.js:525-527`). This is the only screen in the set NOT built on the shared Settings primitives, so its rows/cards are hand-styled and drift slightly. (Findings mentioned, not fixed, per CLAUDE.md.)
NEWBIE QUESTION: Mostly — "Remind me to train" + time is clear; but the helper text referencing day selection that isn't there would confuse.
ATHLETE QUESTION: Adequate; a competitor's serious reminders (check-in, morning weight) live on the Pro Coaching-reminders screen, cross-linked here.
LOCATION QUESTION: Reasonable as the training-reminder screen, but the "Notifications" title vs training-only content is a mismatch given SettingsNotifications already split the two.
VISUAL + USABILITY:
  - `subtitle`: `fontSize.sm (13)` `textSecondary`, lineHeight 18 (`NotificationSettingsScreen.js:557-561`).
  - `bannerText`: `fontSize.sm (13)` `colors.warning`, lineHeight 19 (`NotificationSettingsScreen.js:586-591`).
  - `sectionLabel`: `type.label` → `fontSize.sm (13)` medium (`NotificationSettingsScreen.js:594-600`).
  - `toggleLabel` / `timePickerLabel`: `fontSize.md (16)` medium (`NotificationSettingsScreen.js:627-632,669-674`).
  - `timePickerValue`: `type.num('bodyStrong')` → `fontSize.md (16)` semibold tabular, `colors.primary` (`NotificationSettingsScreen.js:675-678`).
  - `helperText` / `bottomNoteText`: `fontSize.sm (13)` muted (`NotificationSettingsScreen.js:654-659,685-690`).
  - `crossLinkTitle`: `type.bodyStrong` → `fontSize.md (16)`; `crossLinkSub`: `fontSize.xs (11)` (`NotificationSettingsScreen.js:709-718`).
  - `savingText`: `type.caption` → 11; `savedText`: `fontSize.xs (11)` semibold primary (`NotificationSettingsScreen.js:692-697,719-725`).
  - Touch targets: `toggleRow` `paddingVertical: spacing.lg (16)` around a 34px icon ≈ 66px (≥ 44px) (`NotificationSettingsScreen.js:612-618`); `timePickerRow` `paddingVertical: spacing.md (12)` around 16px text ≈ 40px; FLAG: marginally below 44px (`NotificationSettingsScreen.js:662-668`); `crossLink` `padding: spacing.md (12)` around 34px icon ≈ 58px (≥ 44px) (`NotificationSettingsScreen.js:698-708`).
  - Information density: low-moderate.
  - Clean/cluttered: clean visually; the dead code and the title/content mismatch are structural rather than visual.
  - Most important action: the train-reminder toggle is the focal card; appropriate.
  - Device behaviour: ScrollView (`showsVerticalScrollIndicator={false}`); fits all sizes. Icon wraps fixed 34px.

---

SCREEN: Privacy Policy (PrivacyPolicyScreen)
WHAT IT IS: The full in-app privacy policy, a scrollable document with a BackHeader (`PrivacyPolicyScreen.js:8-13`).
WHAT IS ON IT:
- BackHeader "Privacy Policy" (`PrivacyPolicyScreen.js:11`).
- "Last updated 22 May 2026" (`LAST_UPDATED` constant, `PrivacyPolicyScreen.js:6,14`).
- Sections (each a header + body paragraphs): What Volyume collects; How your data is stored (local + Supabase, HTTPS, secure token storage); Nutrition and training information (not medical advice); Body metrics and sensitive data; Usage data (first-party telemetry, pseudonymous id, legitimate interest, opt-out path); Your rights (export/delete, GDPR/EEA/UK rights, contact email); Children (<13); Changes to this policy; Contact (`PrivacyPolicyScreen.js:16-99`).
NAVIGATION: Route `PrivacyPolicy` registered in THREE places: `ProfileStack` (headerShown:false, `RootNavigator.js:400`), `Article9ConsentStack` (so the consent gate can show it in-app, `RootNavigator.js:494`), and reachable from the consent flow. From SettingsPrivacyScreen "Privacy Policy" row (`SettingsPrivacyScreen.js:86`). No onward navigation (uses its own `BackHeader`).
GATING: Free screen (legal text must be universally reachable, including pre-account during Article 9 consent). No store read at all.
CURRENT STRENGTHS: Comprehensive and GDPR-aware — explicitly covers EEA/UK rights, export/delete paths (with exact in-app locations), legitimate-interest basis for telemetry, sensitive-data handling, children, and a contact email; section titles have `accessibilityRole="header"` (`PrivacyPolicyScreen.js:110`). Uses its own BackHeader so it works inside the pre-account consent stack too.
CURRENT WEAKNESSES: `LAST_UPDATED` is a hard-coded string ("22 May 2026", `PrivacyPolicyScreen.js:6`) that must be manually kept in sync with policy edits — easy to forget. The body text at `fontSize.sm (13)` for a long legal document is on the small side. Contact email is the founder's personal Gmail rather than a role address (mention-only).
NEWBIE QUESTION: Yes for readability; legal density is inherent but the language is plain and the in-app pointers (where to export/delete) are genuinely helpful.
ATHLETE QUESTION: Not role-specific; satisfies anyone.
LOCATION QUESTION: Correct — reachable from Privacy & legal and from the consent gate.
VISUAL + USABILITY:
  - `updated`: `type.caption` → `fontSize.xs (11)` muted (`PrivacyPolicyScreen.js:124`).
  - `sectionTitle`: `type.label` → `fontSize.sm (13)` medium, `colors.textPrimary` (`PrivacyPolicyScreen.js:126-130`).
  - `body`: `fontSize.sm (13)`, `colors.textSecondary`, lineHeight 22 (`PrivacyPolicyScreen.js:131-136`).
  - BackHeader title: `fontSize.lg (17)` semibold (BackHeader.js:59-66); back chevron 24px with `hitSlop {12,12,12,12}` → effective ≥ 44px (BackHeader.js:25,40-41).
  - Touch targets: only interactive element is the back chevron (hitSlop-padded, OK).
  - Information density: high (long document) — but it is reading material, scrollable.
  - Clean/cluttered: clean; consistent section rhythm.
  - Most important "action": there is none; it is a document. Export/delete pointers are text, not buttons.
  - Device behaviour: ScrollView (`showsVerticalScrollIndicator={false}`); paddingBottom `spacing.xl*2 (48)`. 13px body will be tight on a 5.4" but scales with OS font scaling (RN default allowFontScaling).

---

SCREEN: Debug logs (DebugLogScreen)
WHAT IT IS: On-device viewer for the last buffered error/warn/info events plus the most recent fatal crash; share/clear/sync-diagnostics tools (`DebugLogScreen.js:12-16`).
WHAT IS ON IT:
- BackHeader "Debug logs" with a refresh action on the right (`DebugLogScreen.js:86-93`).
- Filter toolbar: chips all / error / warn / info, each showing a count; selected chip highlighted (`DebugLogScreen.js:95-114`).
- Actions row: Share (export errors as text via Share), Sync diag (`diagnoseSyncConflicts`, logs per-table buckets, summary alert), Clear (destructive confirm, clears errors + crash log) (`DebugLogScreen.js:116-129,33-79`).
- Crash card (if a fatal crash recorded): title, timestamp, message, truncated stack (selectable) (`DebugLogScreen.js:132-141`).
- Empty state (checkmark + "No entries") when filtered list empty (`DebugLogScreen.js:143-149`).
- Entry list: each entry shows level (colour-coded left border + label), scope, relative time, message (selectable), optional context, optional stack (6 lines, monospace) (`DebugLogScreen.js:151-164,178-187`).
NAVIGATION: Route `DebugLog` in `ProfileStack`, headerShown:false (uses own BackHeader) (`RootNavigator.js:401`). Reached ONLY by long-pressing (600ms) the version string on SettingsAboutScreen (`SettingsAboutScreen.js:76`). No onward navigation.
GATING: Free screen, but functionally a hidden developer/tester surface (no menu entry; reached via undocumented long-press). No tier guard. Reads `session.user.id` for the sync diagnostic (`DebugLogScreen.js:55`).
CURRENT STRENGTHS: Genuinely useful tester tooling — level filtering with counts, shareable export, crash capture, and a sync-conflict diagnostic that writes its findings back into the log for inspection; entries and stacks are `selectable` for copy; refresh + clear are present. Colour-coded severity borders (error/warn/neutral) aid scanning.
CURRENT WEAKNESSES: It is reachable only via a hidden long-press, so a tester who isn't told cannot find it (the SettingsAbout accessibilityLabel does mention "press and hold for debug logs", which is the only hint). The Sync-diag summary text and per-table buckets are very technical — fine for a tester, opaque to a normal user who stumbles in. No tier/role guard means a curious end user can reach internal diagnostics.
NEWBIE QUESTION: No — and it is not meant for newbies; it is developer-facing. A first-timer who found it would not understand "scope", "ctx:", stacks, or "foreign uids".
ATHLETE QUESTION: Not applicable — not a user-facing feature.
LOCATION QUESTION: Correct as a hidden tester surface behind the version long-press; appropriate to keep it out of the normal menu.
VISUAL + USABILITY:
  - `chipLabel`: `fontSize.xs (11)` medium (`DebugLogScreen.js:194`).
  - `actionLabel`: `type.label` → `fontSize.sm (13)` (`DebugLogScreen.js:199`).
  - `crashTitle`: `fontSize.sm (13)` bold error; `crashWhen`: `type.num('caption')` → 11; `crashMsg`: `type.label` → 13; `crashStack`: `fontSize.xs (11)` monospace (`DebugLogScreen.js:203-206`).
  - `emptyText`: `fontSize.md (16)` medium; `emptyHint`: `fontSize.sm (13)` (`DebugLogScreen.js:208-209`).
  - `entryLevel`: `fontSize.xs (11)` bold uppercase, minWidth 44; `entryScope`: `fontSize.xs (11)` medium; `entryWhen`: `type.num('caption')` → 11; `entryMessage`: `fontSize.sm (13)`; `entryContext`/`entryStack`: `fontSize.xs (11)` monospace (`DebugLogScreen.js:212-217`).
  - Touch targets: refresh button has `hitSlop {8,8,8,8}` around a 22px icon ≈ 38px; FLAG: marginally below 44px (`DebugLogScreen.js:89`). Filter chips `paddingVertical: spacing.xs (4)` around 11px text ≈ 19px; FLAG: well below 44px height (`DebugLogScreen.js:192`). Action buttons `paddingVertical: spacing.sm (8)` around 13px ≈ 29px; FLAG: below 44px (`DebugLogScreen.js:197`). (All acceptable for a tester-only surface but flagged per the format rules.)
  - Information density: high — toolbar + actions + (crash) + scrolling list of dense entries.
  - Clean/cluttered: dense but organised; appropriate for a log viewer.
  - Most important action: the log list itself is the content; Share/Clear/Diag are secondary controls up top.
  - Device behaviour: ScrollView for the entry list; toolbar/actions are fixed above it. Small fonts (11px monospace stacks) will be cramped on a 5.4" but this is a diagnostic surface.

---

## Notes on areas marked NOT DETERMINED / flagged

- SettingsHealthScreen GATING: there is **no tier guard in code** on the screen
  or its entry row (capability-gated via `isHealthAvailable()` only). CLAUDE.md
  lists wearable integration as Pro, so the lack of a Pro guard here is flagged
  for the next session, not asserted as intended behaviour.
- The `betaBadge`/`betaBadgeText` styles in SettingsAboutScreen are defined but
  never rendered (dead style).
- NotificationSettingsScreen contains retained-but-unreachable code
  (`scheduleApply`, `applyNotifications`) per its own in-file note, and its
  helper text references a day-picker that is not present on the screen.


<!-- ==== phase1/14-partner-cardio.md ==== -->

# Phase 1 inventory — Partner & Cardio (2026-06-13)

Files read in full: `src/screens/PartnerScreen.js`, `src/screens/LogCardioScreen.js`,
`src/screens/CardioHistoryScreen.js`, plus `src/styles/theme.js`,
`src/navigation/RootNavigator.js`, `src/components/Button.js`,
`src/components/SegmentedControl.js`, `src/components/SearchBar.js` (for token + guard + touch-target resolution).

Token resolution reference (theme.js): `fontSize.micro`=10 (theme.js:257), `fontSize.xs`=11 (theme.js:258),
`fontSize.sm`=13 (theme.js:259), `fontSize.md`=16 (theme.js:260), `fontSize.lg`=17 (theme.js:261),
`fontSize.xl`=20 (theme.js:262), `fontSize.xxl`=24 (theme.js:263), `fontSize.xxxl`=32 (theme.js:264).
`spacing.xxs`=2, `xs`=4, `sm`=8, `md`=12, `lg`=16, `xl`=24, `xxl`=32, `xxxl`=48 (theme.js:228-239).
`radius.sm`=6, `md`=10, `lg`=14, `full`=999 (theme.js:241-248).
Type roles (theme.js:373-410): `type.title` = fontSize.lg (17) / weight 600 (theme.js:390-393);
`type.body` = fontSize.md (16) / weight 400 (theme.js:394-397); `type.label` = fontSize.sm (13) / weight 500 (theme.js:402-405);
`type.caption` = fontSize.xs (11) / weight 400 (theme.js:406-409); `type.num('title')` = fontSize.lg (17) / weight 600 + tabular-nums (theme.js:390-393, 417-421).

---

SCREEN: Partner (Training partner)
WHAT IT IS: The training-partner home: a low-signal accountability feature where one user pairs with a partner and each sees only derived weekly signals (training "ticks", a shared streak, resting status, cheers) and never any session/body/food detail (PartnerScreen.js:1-15, SEES/NEVER_SEES PartnerScreen.js:33-45).
WHAT IS ON IT: The screen renders one of four mutually exclusive states off `p.rowState`:
- Loading: an empty SafeAreaView while `p.loading` (PartnerScreen.js:85).
- PAIRED (`active` or `resting`, PartnerScreen.js:88, 95): a live card with the partner's first name (PartnerScreen.js:99; falls back to "Your partner" PartnerScreen.js:87), an optional shared-streak chip (PartnerScreen.js:100-102), a two-column week row — "You" + your ticks label (PartnerScreen.js:106-109), a vertical divider (PartnerScreen.js:110), and the partner column showing either a moon-icon + "Resting this week" when `rowState==='resting'` (PartnerScreen.js:113-117) or their ticks label (PartnerScreen.js:119). Below: a full-width "Cheer" button that becomes "Cheer sent" + disabled when `!p.cheerEnabled` (PartnerScreen.js:124-135), an optional caption "<partner> cheered you recently." when `p.lastReceived` (PartnerScreen.js:137-139), and an "End partnership" row with exit icon (PartnerScreen.js:142-145).
- PENDING (PartnerScreen.js:150): an hourglass icon, "Invitation sent. Waiting for your partner." text, and a "Cancel" link (PartnerScreen.js:151-157).
- EMPTY or ENDED (PartnerScreen.js:161): optional "Partnership ended." note when ended (PartnerScreen.js:163-165); a "Train with a partner" section with a pitch paragraph (PartnerScreen.js:167-174); a "What you each see" card listing the 4 SEES bullets with green ticks (PartnerScreen.js:177-184, 33-38); a "What neither of you will ever see" card listing the 5 NEVER_SEES bullets with warning crosses plus a fine-print line about ending/deletion (PartnerScreen.js:186-197, 39-45); and a pairing-controls card: a "Share a consistency streak" toggle (Switch) (PartnerScreen.js:201-208), a cap note "You can have one partner on Free. Go Pro for up to three." shown when `!p.canAdd` (PartnerScreen.js:210-212), a "Create invite" primary button (with spinner while busy) (PartnerScreen.js:214-220), an "Or enter a partner's code" label (PartnerScreen.js:222), and a code-input row with a TextInput ("Invite code") + a "Join" button (PartnerScreen.js:223-235).
Confirm dialogs: unpair via `appAlert` "End partnership?" (PartnerScreen.js:78-83).
NAVIGATION: Registered as `Stack.Screen name="Partner"` in the Progress stack with header title "Training partner" (RootNavigator.js:350, `ProgressStack`). It is the ONLY registration — not in any other stack. The header comment in the file says it is reached "from the Progress hub tile + the Consistency slim row" (PartnerScreen.js:6-8); those push sites are in AnalyticsScreen/ConsistencyScreen and NOT verified here. The screen itself pushes nowhere (no `navigation` prop used; all actions are in-screen via the `usePartners` hook).
GATING: **NOT gated.** The `Partner` route is registered with the raw `PartnerScreen` component, not `withProGuard` (RootNavigator.js:350; contrast the gated routes at RootNavigator.js:149-162). Within the screen, the free/Pro distinction is a soft capacity cap only: `p.canAdd` (from `usePartners`) drives the "one partner on Free / up to three on Pro" note and disables Create invite (PartnerScreen.js:210-216). Per CLAUDE.md the partner feature is "free 1 partner / Pro up to 3" (PartnerScreen.js:14), so the screen is reachable on Free with a 1-partner limit. The actual cap logic lives in `usePartners` (hooks/usePartners.js) — **NOT read here; cap enforcement NOT VERIFIED IN THIS FILE.**
CURRENT STRENGTHS: Clean state machine — exactly one of loading/paired/pending/empty-ended renders. The privacy receipt (explicit SEES vs NEVER_SEES lists + deletion fine print) is unusually transparent and trust-building (PartnerScreen.js:177-197). "Resting" is handled as a first-class non-fail state (PartnerScreen.js:113-117), matching the stated design rule (PartnerScreen.js:13). All interactive elements carry `accessibilityRole`/`accessibilityLabel`. Cheer button has clear sent/disabled feedback (PartnerScreen.js:132-134). Error paths use toasts with plain-language copy (PartnerScreen.js:59, 69).
CURRENT WEAKNESSES: The empty/ended state is long — pitch + 4-bullet card + 5-bullet card + fine print + toggle + create + code row all stack in one ScrollView (PartnerScreen.js:161-239), heavy for a first encounter. There is no visible explanation on-screen of what a "tick" is until you are already paired (the SEES bullet "Ticks only, like 3 of 4" at PartnerScreen.js:34 is the only definition). The shared-streak chip and the toggle both reference a "streak" but the toggle only appears pre-pairing, so a paired user cannot change it from here. No loading text during `p.loading` — just a blank screen (PartnerScreen.js:85), which reads as a flash of emptiness.
NEWBIE QUESTION: Mostly yes. The pitch ("One person who sees you showed up... No numbers, no comparison, no feed", PartnerScreen.js:170-173) and the SEES/NEVER_SEES lists explain the concept in plain terms. A first-timer may not know what "3 of 4 ticks" means until they have a plan with planned sessions, and "shared streak, counted in weeks" assumes they understand the weekly cadence. The invite/code mechanics (create vs join) are standard and clear.
ATHLETE QUESTION: Partially. An experienced competitor gets a deliberately minimal, no-metrics accountability nudge — which is the point — but there is nothing here that satisfies a competitor's appetite for data (by design, since weights/sets/reps are explicitly never shared, PartnerScreen.js:39-40). It works as a consistency companion, not a training-comparison tool. The 3-partner Pro cap is reasonable for a coach/training-group use case.
LOCATION QUESTION: Reasonable but arguably buried. It lives only in the Progress stack (RootNavigator.js:350), reached via a Progress tile / Consistency row per the header comment (PartnerScreen.js:6-8). Pairing the partner feature with consistency/progress is coherent (it is an accountability surface), but a social/accountability feature reachable only through a Progress sub-tile is easy to miss; there is no top-level or Home entry point registered.
VISUAL + USABILITY:
- Font sizes:
  - Section labels ("Train with a partner" etc.): `type.label` = fontSize.sm (13) (PartnerScreen.js:249, sectionLabel; theme.js:402-405).
  - Pitch paragraph: `type.body` = fontSize.md (16), lineHeight overridden to 22 (PartnerScreen.js:254; theme.js:394-397).
  - Partner name (live card): fontSize.lg (17), weight bold (PartnerScreen.js:262).
  - Streak chip text: fontSize.sm (13), weight bold (PartnerScreen.js:264).
  - Week column label ("You"/name): `type.caption` = fontSize.xs (11) (PartnerScreen.js:271; theme.js:406-409).
  - Week ticks value: `type.num('title')` = fontSize.lg (17) + tabular-nums (PartnerScreen.js:272; theme.js:390-393, 417).
  - "Resting this week" text: fontSize.sm (13) (PartnerScreen.js:274).
  - Cheer button label: `type.label` = fontSize.sm (13) (PartnerScreen.js:281).
  - "cheered you recently" caption: fontSize.sm (13) (PartnerScreen.js:283).
  - "End partnership" text: fontSize.sm (13), weight 600 (PartnerScreen.js:288).
  - Pending text: `type.body` = fontSize.md (16) (PartnerScreen.js:296).
  - "Cancel" link: fontSize.sm (13), weight 600 (PartnerScreen.js:297).
  - "Partnership ended." note: fontSize.sm (13) (PartnerScreen.js:298).
  - Bullet text (SEES/NEVER): `type.body` = fontSize.md (16) (PartnerScreen.js:304).
  - Fine print: fontSize.sm (13), lineHeight 19 (PartnerScreen.js:305).
  - Toggle label: `type.body` = fontSize.md (16) (PartnerScreen.js:309).
  - Cap note: fontSize.sm (13) (PartnerScreen.js:310).
  - Primary "Create invite" text: `type.label` (13) overridden to fontSize.md (16) (PartnerScreen.js:316).
  - "Or enter a partner's code": fontSize.sm (13) (PartnerScreen.js:317).
  - Code input text: `type.body` = fontSize.md (16) (PartnerScreen.js:322).
  - "Join" button text: `type.label` = fontSize.sm (13) (PartnerScreen.js:328).
- Touch targets:
  - Cheer button: `minHeight: 48` (PartnerScreen.js:278) — PASS.
  - "End partnership" row: `minHeight: 44` (PartnerScreen.js:287) — PASS (at the 44 floor).
  - "Cancel" invite link: text-only with `hitSlop={8}` (PartnerScreen.js:154); fontSize.sm (13) text + 8px slop is below a comfortable 44px target — **FLAG: likely < 44px effective.**
  - Create invite primary: `minHeight: 50` (PartnerScreen.js:313) — PASS.
  - Code TextInput: `minHeight: 44` (PartnerScreen.js:322) — PASS.
  - "Join" button: `minHeight: 44` (PartnerScreen.js:327) — PASS.
  - Switch: native RN Switch (PartnerScreen.js:203-207), OS-default target.
- Information density: Paired/pending states are light. The empty/ended state is dense (≈6 stacked blocks, PartnerScreen.js:161-239).
- Clean or cluttered: Paired view is clean and well-aligned (two-column week row with divider, PartnerScreen.js:105-122). Empty state is content-heavy but logically grouped into cards.
- Most important action prominent: In the paired state the "Cheer" amber filled button is correctly the most prominent element (PartnerScreen.js:124-135). In the empty state the amber "Create invite" button is the primary action and is visually dominant (PartnerScreen.js:214-220); the "Join with code" path is a secondary outlined button (PartnerScreen.js:324-328) — correct hierarchy.
- Small/standard/large behaviour: Whole screen is inside a `ScrollView` (PartnerScreen.js:92) with `paddingBottom: spacing.xxxl` (48) (PartnerScreen.js:247), so the long empty state scrolls on small devices. Edges `['bottom']` only (PartnerScreen.js:91) — relies on the navigator header for top inset (header title set at RootNavigator.js:350). Font sizes are all token-based so they scale with the larger-text accessibility setting (theme.js:325-337). Fixed `width: 18` on bullet tick/cross glyphs (PartnerScreen.js:302-303) will not scale with larger text and could clip an enlarged glyph.

---

SCREEN: LogCardio (Log cardio / Pick activity)
WHAT IT IS: A modal for manually logging a cardio session: pick an activity (favourites/recents first, then category-grouped library, or search), set duration + intensity, see an estimated calorie burn as feedback, and save. The estimate is explicitly never added to the food/calorie target (LogCardioScreen.js:1-11, footnote 225-228).
WHAT IS ON IT: Header bar with a close (X) button, a title that reads "Pick activity" before an activity is chosen and "Log cardio" after (LogCardioScreen.js:153-159), and a spacer.
- PICKER state (no activity, LogCardioScreen.js:161-192): a SearchBar ("Search cardio") (LogCardioScreen.js:163-165); when searching, a flat filtered ActivityList (LogCardioScreen.js:167-168); otherwise a "Your cardio" section of favourites (only if any, LogCardioScreen.js:171-175), a "Recent" section (only if any, LogCardioScreen.js:176-180), then one section per cardio category (Walking, Running, Cycling, Rowing, Swimming, Machines, HIIT, Conditioning, Sport, Other — labels LogCardioScreen.js:29-33) each with its category icon (LogCardioScreen.js:37-42) and an ActivityList (LogCardioScreen.js:181-189). Each activity row = category icon + display name + chevron-forward (LogCardioScreen.js:251-255).
- DETAIL state (activity chosen, LogCardioScreen.js:193-233): a "chosen" row showing the activity display name + "<Category> · tap to change" meta, tappable to reset to the picker, with a star favourite toggle (LogCardioScreen.js:195-203); a "Duration" label + a stepper (minus button, "<n> min" value, plus button; clamps 5–300 in 5-min steps) (LogCardioScreen.js:205-214); an "Intensity" label + a SegmentedControl with Easy/Moderate/Hard (LogCardioScreen.js:44-48, 216-217); when an estimate is available, a flame icon + "Burned about <n> kcal" row and the footnote "Already counted. This isn't added to your calorie target, your weight trend includes everything you burn." (LogCardioScreen.js:219-229); and a "Save" button (LogCardioScreen.js:231).
Data behaviour: prefills duration/intensity from the user's last log of that activity (LogCardioScreen.js:62-103); only estimates kcal when bodyweight is known, no silent default (LogCardioScreen.js:55-57, 105-107); save inserts a cardio log and `navigation.goBack()` (LogCardioScreen.js:119-141); error shows appAlert "Couldn't log / Try again." (LogCardioScreen.js:138).
NAVIGATION: Registered THREE times as `Stack.Screen name="LogCardio"`, each wrapped in the Pro guard `GatedLogCardio` and presented as a modal: in `DiaryStack` (RootNavigator.js:251-255), `HomeStack` (RootNavigator.js:303), and `ProgressStack` (RootNavigator.js:357). The comments state it is launched from the Train tab's CardioCard (RootNavigator.js:301-302) and the Progress tab (RootNavigator.js:355-356); registering per-stack keeps save/back returning to the originating tab. Reached via `route.params` that may carry `activityId` (prefill, LogCardioScreen.js:66) and `entryDate` (LogCardioScreen.js:124). It leads nowhere forward — on save or close it `goBack()`s (LogCardioScreen.js:136, 154). The push sites (CardioCard etc.) are NOT in these files and NOT verified here.
GATING: **Pro.** Wrapped by `withProGuard` as `GatedLogCardio = withProGuard(LogCardioScreen, 'Cardio')` (RootNavigator.js:161) and that gated component is used at every registration (RootNavigator.js:253, 303, 357). The comment confirms cardio is gated directly at every entry point because it is registered in multiple stacks (RootNavigator.js:158-162). Cardio is listed under Pro in CLAUDE.md. Guard internals live in `src/components/ProGate.js` — NOT read here.
CURRENT STRENGTHS: Activity-first design with favourites + recents + per-activity prefill makes repeat logging fast (LogCardioScreen.js:62-103). The "no silent 75kg" rule (estimate suppressed unless bodyweight known, LogCardioScreen.js:55-57, 105-107) is an honest data choice. The footnote correctly prevents the common double-counting confusion of "burned calories added back to target" (LogCardioScreen.js:225-228), consistent with the energy-balance model. Category icons aid visual scanning (LogCardioScreen.js:37-42, 252). Good accessibility labels throughout. Stepper clamps prevent nonsensical durations (LogCardioScreen.js:207, 211).
CURRENT WEAKNESSES: Duration is stepper-only in 5-minute increments (LogCardioScreen.js:207-213) — logging an exact 37-minute run is impossible; no direct numeric entry. When bodyweight is unknown the kcal row and footnote simply vanish (LogCardioScreen.js:219) with no prompt telling the user why or how to add weight, so the estimate silently disappears. The picker can be a long scroll (10 categories, LogCardioScreen.js:181) with no sticky section index. Intensity options are three coarse buckets only (LogCardioScreen.js:44-48).
NEWBIE QUESTION: Largely yes. "Pick activity → set time → set effort → save" is an intuitive flow, and Easy/Moderate/Hard is friendlier than METs. The footnote about calories not being added is the one subtle concept a beginner may not fully grasp, but it is written plainly. A newbie with no bodyweight set will see no calorie feedback and no explanation, which could confuse.
ATHLETE QUESTION: Partially. Favourites/recents and per-activity prefill suit a competitor logging the same conditioning regularly. But the 5-minute-only duration granularity and the three-bucket intensity will frustrate anyone wanting precise session logging; there is no pace/distance/HR input. The "estimate is feedback, not a target" stance is correct for a serious cut. METs are computed under the hood (`metFor`, LogCardioScreen.js:130) but not surfaced.
LOCATION QUESTION: Sensible. Cardio is logged from where the user already is — Train (Home), Diary, and Progress all register it as a modal returning to the origin (RootNavigator.js:251-255, 303, 357), so the action lands wherever it was invoked. Presenting it as a modal rather than a buried tab matches a quick-log action.
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` = fontSize.lg (17), weight 600 (LogCardioScreen.js:268; theme.js:390-393).
  - Section labels ("Your cardio", "Recent", categories): fontSize.xs (11), weight bold, uppercase, letterSpacing 1 (LogCardioScreen.js:272-275).
  - Activity row name: `type.body` = fontSize.md (16) (LogCardioScreen.js:281; theme.js:394-397).
  - Chosen activity name: `type.title` = fontSize.lg (17) (LogCardioScreen.js:287).
  - Chosen meta ("<Category> · tap to change"): fontSize.sm (13) (LogCardioScreen.js:288).
  - Field labels ("Duration"/"Intensity"): fontSize.sm (13) (LogCardioScreen.js:289).
  - Stepper +/- glyphs: fontSize.xxl (24), weight bold (LogCardioScreen.js:295).
  - Stepper value ("<n> min"): `type.title` = fontSize.lg (17) + tabular-nums (LogCardioScreen.js:296).
  - kcal text ("Burned about <n> kcal"): fontSize.sm (13) + tabular-nums (LogCardioScreen.js:298).
  - Footnote: fontSize.xs (11), lineHeight 16 (LogCardioScreen.js:299).
  - SegmentedControl labels: `type.label` = fontSize.sm (13) (SegmentedControl.js:42; theme.js:402-405).
  - "Save" button: Button size="lg" → fontSize.md (16), weight bold (Button.js:34, 106; LogCardioScreen.js:231).
  - SearchBar input: max(16, fontSize.md) = 16 (SearchBar.js:73).
- Touch targets:
  - Close (X) header button: icon size 24 with `hitSlop={12}` (LogCardioScreen.js:154-155) → ≈48px effective — PASS.
  - Activity rows: `paddingVertical: spacing.md` (12) + 18px icon ≈ 42px row height (LogCardioScreen.js:276-279) — **borderline, slightly under 44px.**
  - Chosen row: `padding: spacing.md` (12) (LogCardioScreen.js:284) — adequate (multi-line content).
  - Star favourite toggle: 22px icon with `hitSlop={10}` (LogCardioScreen.js:200-201) → ≈42px — **borderline.**
  - Stepper buttons: `width: 56, height: 52` (LogCardioScreen.js:294) — PASS.
  - SegmentedControl segments: `paddingVertical: spacing.sm + 2` (10) (SegmentedControl.js:38-40) → ≈33px tall — **FLAG: < 44px.**
  - Save button (lg): paddingVertical spacing.lg (16) + 16px text ≈ 48px (Button.js:34) — PASS.
- Information density: Picker is medium-to-high (many rows across up to 10 categories). Detail view is low — a handful of controls with breathing room.
- Clean or cluttered: Both states are clean; the detail view in particular is uncluttered. The picker relies on uppercase micro section labels to break up a long list.
- Most important action prominent: In the detail view the amber "Save" button is the clear primary action (LogCardioScreen.js:231). In the picker the primary action is choosing an activity; rows are visually uniform with no single dominant element, which is appropriate for a list.
- Small/standard/large behaviour: Both states use a `ScrollView` with `keyboardShouldPersistTaps="handled"` and `paddingBottom: spacing.xxxl` (48) (LogCardioScreen.js:162, 194, 269). SafeAreaView edges `['top']` (LogCardioScreen.js:152). Stepper button sizes are FIXED (56×52, LogCardioScreen.js:294) and will not scale with larger text, though the value text inside will, risking overflow. The fixed 24px header spacer (LogCardioScreen.js:158) balances the close button. SegmentedControl is flex-based and adapts to width. On a small 5.4" device the up-to-10-category picker requires significant scrolling.

---

SCREEN: CardioHistory (Cardio history)
WHAT IT IS: A reverse-chronological list of logged cardio sessions, grouped by day, each row showing activity, duration, intensity, and the estimated calories; each row has a small delete (soft delete so it syncs) (CardioHistoryScreen.js:1-10).
WHAT IS ON IT: Header bar with a back (chevron) button, title "Cardio history", and a spacer (CardioHistoryScreen.js:70-76). When there are no sessions, an EmptyState with heart icon, title "No cardio yet", text "Sessions you log show up here." (CardioHistoryScreen.js:78-84). Otherwise a SectionList grouped by day: each section header is the pretty date ("Mon 9 Jun" style, en-GB weekday/day/month, CardioHistoryScreen.js:26-33, 89-91); each row shows the activity name, a meta line "<n> min · <Easy|Moderate|Hard>" plus " · ~<n> kcal" when an estimate exists (CardioHistoryScreen.js:92-100, INTENSITY_LABEL 24), and a trash-outline delete button (CardioHistoryScreen.js:101-103). Delete triggers an appAlert "Remove this session?" with the activity + duration, Cancel/Remove (CardioHistoryScreen.js:57-66). The list reloads on focus (CardioHistoryScreen.js:55) and after a delete (CardioHistoryScreen.js:63).
NAVIGATION: Registered TWICE as `Stack.Screen name="CardioHistory"`, wrapped as `GatedCardioHistory` (NOT a modal, `headerShown:false`): in `DiaryStack` (RootNavigator.js:256-260) and `ProgressStack` (RootNavigator.js:358). The file header says it is "Reached from the Progress cardio card" (CardioHistoryScreen.js:7). It leads nowhere forward — the only navigation is the back button `navigation.goBack()` (CardioHistoryScreen.js:71). The push site (the Progress cardio card) is not in these files and NOT verified here.
GATING: **Pro.** Wrapped by `withProGuard` as `GatedCardioHistory = withProGuard(CardioHistoryScreen, 'Cardio')` (RootNavigator.js:162) and that gated component is used at both registrations (RootNavigator.js:259, 358). Cardio is Pro per CLAUDE.md. Guard internals in `src/components/ProGate.js` — NOT read here.
CURRENT STRENGTHS: Simple, fast, and honest — a plain grouped list with day headers, reads at a glance. Soft delete preserves sync integrity (CardioHistoryScreen.js:62-63, per header note). Reloads on focus so it reflects newly logged sessions without manual refresh (CardioHistoryScreen.js:55). Delete is guarded by a confirm dialog that names the session (CardioHistoryScreen.js:57-66), reducing accidental loss. Good empty state and accessibility labels. The meta line uses tabular-nums so durations/kcal align (CardioHistoryScreen.js:131).
CURRENT WEAKNESSES: No summary or aggregation — no weekly totals, no count, no total time/kcal, just a flat list, so a user cannot see trends here. No way to edit a session (only delete + re-log). No pull-to-refresh affordance (relies on focus reload only). The 200-row cap (`getRecentCardioLog(userId, 200)`, CardioHistoryScreen.js:43) is silent — a heavy user's older sessions simply won't appear with no indication. The day-header background is `colors.background` (CardioHistoryScreen.js:124) but the header is not a true sticky section header style, so on scroll it may not visually pin cleanly (SectionList default stickiness applies).
NEWBIE QUESTION: Yes. A dated list of "what cardio I did" is immediately understandable; "~<n> kcal" with the tilde reads as an estimate. Nothing here needs explanation.
ATHLETE QUESTION: Partially. A competitor can confirm what they logged, but there is no aggregation, no weekly conditioning volume, no trend — so it functions as a ledger, not an analysis tool. For serious cardio tracking the lack of totals and the inability to edit (only delete) are limitations.
LOCATION QUESTION: Reasonable. It sits in both the Diary and Progress stacks (RootNavigator.js:256-260, 358), reachable from the Progress cardio card per the header (CardioHistoryScreen.js:7). A history/log view belongs in Progress and Diary, so the placement is coherent; it is correctly a pushed sub-screen, not a tab.
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` = fontSize.lg (17), weight 600 (CardioHistoryScreen.js:119; theme.js:390-393).
  - Day section header: fontSize.xs (11), weight bold, uppercase, letterSpacing 1 (CardioHistoryScreen.js:121-125).
  - Activity name (row): `type.body` = fontSize.md (16) (CardioHistoryScreen.js:130; theme.js:394-397).
  - Meta line ("<n> min · ... · ~<n> kcal"): fontSize.sm (13) + tabular-nums (CardioHistoryScreen.js:131).
  - EmptyState title/text: rendered by `src/components/EmptyState.js` — **NOT read; sizes NOT DETERMINED IN CODE here.**
- Touch targets:
  - Back (chevron) header button: icon 24 with `hitSlop={12}` (CardioHistoryScreen.js:71-72) → ≈48px — PASS.
  - Row delete (trash) button: icon 18 with `hitSlop={10}` (CardioHistoryScreen.js:101-102) → ≈38px effective — **FLAG: < 44px.**
  - Rows themselves are not tappable (no row onPress; only the trash icon is interactive) (CardioHistoryScreen.js:92-104).
- Information density: Low to medium — one line of primary text + one meta line per row, grouped by day header. Comfortable.
- Clean or cluttered: Clean. Each row is a left text block + a right trash icon with `gap: spacing.md` (12) and a bottom hairline border (CardioHistoryScreen.js:126-129).
- Most important action prominent: This is a read/review screen; the most "important" interactive element is the per-row delete, which is correctly de-emphasised (muted small trash icon, CardioHistoryScreen.js:102) so it doesn't invite accidental taps. Appropriate hierarchy for a history view.
- Small/standard/large behaviour: Uses a `SectionList` (CardioHistoryScreen.js:85-106) which virtualises and scrolls on any size; `contentContainerStyle` padding `spacing.lg` (16) + `paddingBottom: spacing.xxxl` (48) (CardioHistoryScreen.js:120). SafeAreaView edges `['top']` (CardioHistoryScreen.js:69). All font sizes token-based so they scale with larger text (theme.js:325-337). No fixed-height rows (padding-based, CardioHistoryScreen.js:126-129), so rows grow gracefully with larger text. The fixed 24px header spacer (CardioHistoryScreen.js:75) balances the back button.


<!-- ==== phase1/15a-components.md ==== -->

# Phase 1 — Component Library audit (batch A)

Zero-fabrication rules per `_FORMAT.md`. Every claim cites `file:line`. Token
values resolved against `src/styles/theme.js`. Read-only; no code changed.

Theme reference values used below (all from `src/styles/theme.js`):
- `fontSize.micro` (10) :257, `xs` (11) :258, `sm` (13) :259, `md` (16) :260,
  `lg` (17) :261, `xl` (20) :262, `xxl` (24) :263, `xxxl` (32) :264,
  `display` (40) :265.
- `spacing.hair` (1) :229, `xxs` (2) :230, `xs` (4) :231, `xs2` (6) :232,
  `sm` (8) :233, `md` (12) :234, `lg` (16) :235, `xl` (24) :236, `xxl` (32) :237,
  `xxxl` (48) :238.
- `radius.xs` (4) :242, `sm` (6) :243, `md` (10) :244, `lg` (14) :245,
  `xl` (20) :246, `full` (999) :247.
- `type.body` => fontSize.md (16) :394; `type.bodyStrong` => fontSize.md (16)
  semibold :398.

---

COMPONENT: AnimatedEntrance
WHAT IT DOES: Reusable mount entrance wrapper. Fades child in and rises a few px
once on mount via Reanimated `FadeInDown` (AnimatedEntrance.js:38-40), staggered
by `index` (30ms step, capped at 8 items, :25-26,:35). Reduce-motion aware:
renders a plain `View` with no animation when `accessibility.reduceMotion` is set
(:29-33), and also falls back to a plain View if the layout-animation builder
throws (:41-45). No own styling — passes `style` straight through.
WHERE IT IS USED: WorkoutHistoryScreen.js, ConsistencyScreen.js,
LiftProgressScreen.js, ExerciseDetailScreen.js, DiaryScreen.js,
PlanDetailScreen.js, PlansScreen.js, src/components/ReadinessCards.js (plus
animatedEntrance.test.js). Sample import: WorkoutHistoryScreen.js:23
`import AnimatedEntrance from '../components/AnimatedEntrance';`.
VISUAL QUALITY: premium — duration tokenised to `motion.enter` (320ms,
theme.js:521) on the emphasized-decelerate intent the design audit calls for
(AnimatedEntrance.js:38-40); no hardcoded timing. It is a behaviour-only wrapper
so there is no surface styling to judge.
CONSISTENCY: matches app tokens/patterns — reads `motion.enter` from theme
(:22,:38) and the same `accessibility.reduceMotion` store selector the rest of
the app uses (:29). STAGGER_MS (30) and MAX_STAGGER_ITEMS (8) are local literals
not tokens (:25-26), but they are timing/count constants with no theme home.
USABILITY: works for all users — invisible chrome; reduce-motion users get a
static view (:29-33). No interactive target.

---

COMPONENT: AppAlert (exports `appAlert` + `<AppAlertHost />`)
WHAT IT DOES: Themed in-app replacement for RN `Alert.alert`, same call signature
(AppAlert.js:22-31). Module-level singleton queue (`_enqueue`/`_queue`, :19-31)
drained by a mounted host (:33-58) so it is callable from non-component code.
Renders a dark card Modal with title, message and 1..n buttons; row layout for
1-2 buttons, stacked when >2 (:79,:87). Button styles: primary (amber fill),
destructive (transparent, red text), cancel (transparent, muted text)
(:88-118,:167-173). Tap-outside dismiss honours `options.cancelable` and routes
to the cancel button (:71-76).
WHERE IT IS USED: very wide — 30+ screens including LoginScreen.js,
PaywallScreen.js, SettingsAccountScreen.js, ActiveWorkoutScreen.js,
WeeklyCheckInScreen.js, plus components food/FoodDetailSheet.js,
food/HeldDecisionCard.js. Sample import: LoginScreen.js:2
`import { appAlert } from '../components/AppAlert';`.
VISUAL QUALITY: premium — `colors.scrim` backdrop (AppAlert.js:129, theme.js:88),
`surfaceElevated` card with `radius.lg` (14) and a 1px `border` (:134-142),
`maxWidth: 420` so it does not stretch full-bleed on large devices (:136). Title
`fontSize.lg` (17) bold (:144-146); message `fontSize.md` (16) secondary (:150).
CONSISTENCY: mostly matches — one deviation: the message `lineHeight: 22` is a
raw literal (:152) rather than a `type`/`lineHeight` token (cf. theme.js:352-357),
and the button styling is hand-rolled here rather than using the `Button`
primitive (Button.js). The destructive/cancel buttons are transparent text-only
(:168-169), which differs from `Button`'s solid `destructive` variant
(Button.js:28) — an intentional dialog idiom but a visible divergence from the
button primitive.
USABILITY: works for all users — every button is `minHeight: 44` (:159), meeting
the 44px target, with `accessibilityRole="button"` and label (:95-96). Clear
title/message/action hierarchy.

---

COMPONENT: BackHeader
WHAT IT DOES: Standard header for pushed/modal screens: back chevron left, centred
title, optional right node (BackHeader.js:38-46). `onBack` defaults to
`navigation.goBack()` with a try/guard so it degrades to a no-op outside a
navigator instead of crashing (:32-37). Renders a fixed `minWidth: 24` right
spacer when no `right` is passed so the title stays optically centred (:44,:68).
WHERE IT IS USED: PrivacyPolicyScreen.js, SubscriptionScreen.js,
ProGoalSetupScreen.js, PlanUpdateScreen.js, SubscriptionPolicyScreen.js,
BlockReflectionScreen.js, Article9ConsentScreen.js, CoachHeldHistoryScreen.js,
MyRecipesScreen.js, ManualBuilderScreen.js, CreditsScreen.js, MyMealsScreen.js,
DebugLogScreen.js, MealPlanScreen.js, NutritionEducationScreen.js. Sample import:
PrivacyPolicyScreen.js:4 `import BackHeader from '../components/BackHeader';`.
VISUAL QUALITY: premium — single definition replacing ~16 drifted hand-rolled
headers (header comment :10-12). Title `fontSize.lg` (17) semibold
(BackHeader.js:62-64); 24px chevron (:41). `borderBottomColor: colors.border`
hairline (:57). `numberOfLines={1}` prevents wrap (:43).
CONSISTENCY: matches app tokens/patterns — uses spacing/fontSize/fontWeight
tokens throughout (:50-68). Minor: defines a local `HIT` constant (:25) instead
of importing the theme `hitSlop` (theme.js:423) which has the identical values;
duplicated value, not a visual deviation.
USABILITY: works for all users — chevron has `hitSlop` 12px each side plus the
24px glyph (:25,:40), giving an effective target ≥44px, with
`accessibilityRole="button"` and `accessibilityLabel="Go back"` (:40). The right
node target depends on whatever the caller passes (not controlled here).

---

COMPONENT: BlockProgressCard
WHAT IT DOES: "This week's plan" card — planned vs actual weekly set count per
muscle for the active mesocycle (BlockProgressCard.js:13-52). Header shows week
N/total and either "Recovery week" or "Effort {5-rirTarget}" (:18-28). Each muscle
row renders a label, a progress bar, and "actual/planned" sets (:35-48). Bar fill
colour: amber at >=100%, warning yellow at >=70%, dim amber below (:31-34).
Returns null when there is no data (:14).
WHERE IT IS USED: ConsistencyScreen.js (sole consumer). Sample import:
ConsistencyScreen.js:8 `import BlockProgressCard from '../components/BlockProgressCard';`.
VISUAL QUALITY: acceptable — clean card (`surface`, `radius.lg`, 1px border,
:55-61). However the type is small: title is `fontSize.sm` (13) (:69-72), week,
muscle label and sets are all `fontSize.xs` (11) (:74-77,:83-88,:100-105). For a
data card on the Progress tab this is on the small side; the muscle column is a
fixed `width: 88` (:84) which can truncate longer labels (`numberOfLines={1}`,
:42). Bar height 6px (:90-91).
CONSISTENCY: mostly matches — uses `withAlpha` (:34) and tokens. Two deviations:
(1) bar `borderRadius: 3` is a raw literal (:91,:97) not a `radius` token (closest
is `radius.xs` 4, theme.js:242); (2) the fill thresholds use `colors.primary` and
`colors.warning` directly (:32-33) rather than the `stateColors`/`volumeColors`
grammar (theme.js:459-474) that the rest of the volume surfaces use — a parallel
colour mapping the COMP-027 grammar was meant to retire.
USABILITY: works for all users for the bar, but the "Effort {5 - rirTarget}"
label (:25) is jargon — a 0-5 effort number with no scale shown will not be
self-explanatory to a newcomer; the row has an `accessibilityLabel`
"{label}: {actual} of {planned} sets" (:40) which is clear for screen readers.

---

COMPONENT: BlockShapeCard
WHAT IT DOES: (COMP-010) Visualises the training block as a row of week dots with
a jargon-free effort arc: Ease in -> Build -> Push -> Recover
(BlockShapeCard.js:18-23). Phase per week derived structurally, no engine
dependency (:18-23 header). Current dot filled amber with a ring, past dots muted,
future outlined, recovery a soft amber tint (:80-95). A sentence below frames the
recovery week as a destination, e.g. "Recovery week in N" (:34-41). `compact`
hides per-dot labels (:61-65). Returns null for <2 planned weeks (:26-27).
WHERE IT IS USED: WorkoutSummaryScreen.js, ConsistencyScreen.js, HomeScreen.js.
Sample import: HomeScreen.js:13 `import BlockShapeCard from '../components/BlockShapeCard';`.
VISUAL QUALITY: premium — considered dot states (:80-95), current dot enlarged
14->16px with amber ring (:88-91), recovery dot uses `withAlpha(colors.primary,
0.22/0.45)` (:92). Explanatory line uses `type.body` overridden to `fontSize.sm`
(13) with `lineHeight: 19` literal (:95). Dot labels `fontSize.micro` (10) (:93),
which is theme.js:257's "below body min" micro size — acceptable as dot captions.
CONSISTENCY: mostly matches — uses tokens and `withAlpha`. Deviations: dot
dimensions and radii are raw literals (`width:14,height:14,borderRadius:7`, :81;
`16/16/8`, :90) rather than tokens (no circle helper used though theme.js:252
provides `circle()`); `lineHeight: 19` on the line is a literal (:95) not a
`lineHeight` token.
USABILITY: works for all users — copy is deliberately plain ("Ease in", "Build",
"Push", "Recover") and the whole card carries an `accessibilityLabel` of the full
sentence (:44). This is one of the more newcomer-friendly components in the batch.

---

COMPONENT: BodyDiagramHeatmap
WHAT IT DOES: Stylised front+back muscle map drawn from SVG primitives inside a
360x320 viewBox (BodyDiagramHeatmap.js:12-15,:62-69). Each muscle region is a
tappable shape filled with its volume-status colour from `volumeByMuscle`
(:27-31,:52-60); tapping calls `onMuscleTap(muscle)` (:43-46). Spoken labels
combine muscle name + status for screen readers (:36-41). Below: Front/Back
labels and a 5-item colour legend (Below target / Optimal / Near limit / Over
limit / No data) (:255-268).
WHERE IT IS USED: VolumeHeatmapScreen.js (sole consumer). Sample import:
VolumeHeatmapScreen.js:9 `import BodyDiagramHeatmap from '../components/BodyDiagramHeatmap';`.
VISUAL QUALITY: acceptable — distinctive bespoke illustration, card chrome uses
tokens (`surface`, `radius.lg`, border, :288-296). Concerns: the SVG has a FIXED
`height={FIGURE_HEIGHT}` of 320 (:67, const :13) so it does not scale down on a
small (5.4") device — only the width is "100%"; on small screens the figures
keep their pixel height and may dominate the viewport. Legend swatches are 10x10
with `borderRadius: 2` literal (:322-326). Region/figure labels are `fontSize.xs`
(11) (:302-308,:327-330).
CONSISTENCY: mostly matches the card pattern, but two deviations: (1) the legend
draws raw semantic tokens `colors.success`/`colors.warning`/`colors.error`
(:263-267) instead of the `volumeColors`/`stateColors` grammar (theme.js:469-492)
that getFill consumes via `entry.color` — so the legend and the actual fills
resolve through different code paths and could drift; (2) several SVG literals
(`borderRadius: 2`, `letterSpacing: 0.5`, swatch 10x10) are hardcoded
(:306,:322-326). The "Near limit" legend uses `colors.warning` which post-COMP-027
is Okabe-Ito yellow (theme.js:53), matching the watch state.
USABILITY: only fully makes sense to experienced users — the muscle map plus
a four-band volume legend assumes the user understands per-muscle weekly volume
targets (MAV/MRV concepts). Each region is `accessibilityRole="button"` with a
status-bearing label (:57-59), which is good, but a newcomer will not know what
"Over limit" means without education elsewhere. Region tap targets are the small
ellipse/rect shapes themselves (e.g. biceps rx8 ry16, :132) with no hitSlop, so
some regions are well under a 44px touch target.

---

COMPONENT: BottomSheet
WHAT IT DOES: One shared sheet chrome: scrim backdrop, slide-up panel, drag
handle, tap-outside and hardware-back dismiss, reduce-motion aware,
`accessibilityViewIsModal` (BottomSheet.js:1-14,:80-111). Controlled by
`visible`+`onClose`; keeps the Modal mounted through the exit animation via local
`mounted` state (:46-71). Options: `showHandle`, `keyboardAvoiding`, `sheetStyle`,
`accessibilityLabel` (:30-41). Animations use RN `Animated` with literal durations
(open 260 / close 200 / backdrop 200/160ms, :24-27).
WHERE IT IS USED: MealPlanScreen.js, components food/FoodDetailSheet.js,
food/QuickAddSheet.js, food/MacroBreakdownSheet.js, CancelReasonSheet.js,
PostLapseSheet.js (plus bottomsheet.test.js). Sample import:
food/QuickAddSheet.js:6 `import BottomSheet from '../BottomSheet';`.
VISUAL QUALITY: premium — `colors.scrim` backdrop (:115, theme.js:88),
`radius.xl` (20) top corners, 1px top border, generous `paddingBottom:
spacing.xxl + spacing.md` (32+12=44) for the home indicator (:117-127). Handle
36x4 `borderRadius: 2` (:128-135).
CONSISTENCY: mostly matches — uses spacing/radius/colors tokens. Deviation: all
motion durations are local literals (OPEN_MS 260, CLOSE_MS 200, etc., :24-27)
rather than the `motion` tokens (theme.js:517-537, e.g. enter 320 / exit 220);
the easing is `Easing.out/in(Easing.cubic)` (:57,:67) not the tokenised
`motion.ease*` curves. Handle radius 2 is a literal (:133). It uses RN `Animated`
whereas AnimatedEntrance uses Reanimated — two animation systems in the batch.
USABILITY: works for all users — backdrop Pressable has
`accessibilityRole="button"` label "Close" (:89-94), panel is
`accessibilityViewIsModal` (:103), reduce-motion shows it instantly (:43,:52-53,
:62-63). Keyboard handling for input sheets (:96-99).

---

COMPONENT: BrandMark (exports VolyumeMark / VolyumeIcon / VolyumeWordmark /
BrandTag)
WHAT IT DOES: Renders the Volyume brand assets as PNGs. `VolyumeMark` = full
wordmark (V + lettering), for hero placements (BrandMark.js:32-44).
`VolyumeIcon` = the V only, for compact inline use (:52-64). Width derives from
the asset aspect ratio so letterforms stay proportioned (:20-22,:33-34,:53-54).
Prefers `expo-image` (disk cache) and falls back to RN `Image` if not installed
(:7-12). `VolyumeWordmark` (:71-73) and `BrandTag` (:80-82) are
backwards-compat aliases.
WHERE IT IS USED: VolyumeMark — LoginScreen.js, components/ScreenHeader.js;
VolyumeIcon — ProOnboardingScreen.js, ProSetupCompleteScreen.js; BrandTag — only
re-defined here (no external consumer found via grep). Sample import:
LoginScreen.js:7 `import { VolyumeMark } from '../components/BrandMark';`.
VISUAL QUALITY: premium — asset-driven brand mark, aspect-correct at any size,
`contentFit="contain"` (:39-40). `accessibilityLabel="Volyume"` on both
(:41,:61). No theme tokens needed (image asset).
CONSISTENCY: matches — `size` drives height consistently across both marks. Minor
dead surface: `VolyumeWordmark` and `BrandTag` forward `color`/`accent` props
(:71-73,:80-82) that the underlying components do not accept (VolyumeMark/Icon
only take `size`/`style`, :32,:52), so those props are silently ignored. Not a
visual defect, but stale API.
USABILITY: works for all users — decorative brand image with an accessible label;
no interaction.

---

COMPONENT: Button
WHAT IT DOES: The single button primitive (Button.js:1-17). Four variants —
primary (amber fill, dark text), secondary (raised surface + border), tertiary
(text-only amber), destructive (error fill) (:24-29). Three sizes sm/md/lg with
tokenised padding/font/icon/gap (:31-35). Supports `loading` (inline spinner,
auto-disables), `disabled`, leading `icon`, `trailingIcon`, `fullWidth`,
`children` (:37-93). Built on `PressableCard` so it shares the app press spring
(:21,:58).
WHERE IT IS USED: very wide — HomeScreen.js, LoginScreen.js, PaywallScreen.js,
DiaryScreen.js, ActiveWorkoutScreen.js, CancelReasonSheet.js, ProGate.js,
ExerciseCard usage etc. (20+ screens/components). Sample import: HomeScreen.js:14
`import Button from '../components/Button';`.
VISUAL QUALITY: premium — one press model, one disabled treatment (opacity 0.5,
:104-105), `radius.lg` (14) corners (:102). Labels bold (:106). Sizes tokenised
(:31-35). Spinner colour matches the variant foreground (:80).
CONSISTENCY: matches mostly, ONE notable token deviation: primary and destructive
variants set `fg: colors.background` (Button.js:25,:28) for the on-fill text
colour, but theme.js introduced `onPrimary` (theme.js:42) specifically to replace
"dark ink on a coloured fill" sites (theme.js:36-42 calls out the ~124-site
migration). In dark mode `background` and `onPrimary` are value-identical
(#0D0D0D) so there is no visual diff today, but in the light theme `background`
becomes #FAFAF7 (theme.js:102) while the amber fill stays bright — so on light
this primary button would render near-white text on amber instead of the intended
near-black `onPrimary` ink. This is a latent light-theme contrast bug; flagging
per audit (do not fix).
USABILITY: works for all users — `accessibilityRole="button"`, label defaults to
title (:61-62), disabled state covers loading (:55). Touch target is driven by
padding; md = `pv: spacing.md` (12) + `fontSize.md` (16) text ~= 40px tall, lg =
`pv: spacing.lg` (16) ~= 48px (:33-34). The sm size (`pv: spacing.sm` 8 + 13px
font ~= 29px, :32) is below the 44px target if used alone.

---

COMPONENT: CancelReasonSheet
WHAT IT DOES: (COMP-025-A Moment 1) One optional question on the cancellation path,
then a clean handoff to the store's own cancel UI (CancelReasonSheet.js:1-17).
Built on `BottomSheet` + `ReasonPicker` + `Button` (:22-24,:79-148). The store
handoff CTA is ALWAYS enabled and never gated on answering (anti-dark-pattern,
:8-9,:137-142). For `temporary_break` it reveals a break-window chip group
(:96-129) and on Android a pause hint (:122-127). Captures reason via
`captureCancelReason` and persists a local stated-return window (:64-72).
WHERE IT IS USED: SubscriptionScreen.js (plus CancelReasonSheet.test.js). Sample
import: SubscriptionScreen.js:21 `import CancelReasonSheet from '../components/CancelReasonSheet';`.
VISUAL QUALITY: premium — sheet chrome reused, title `fontSize.lg` (17) bold
(:153-156), clear primary ("Continue to {store}", lg) + secondary ("Keep my
subscription") button pair (:138-147). Disclosure copy in `fontSize.sm` (13)
secondary with `lineHeight: 18` literal (:162-166).
CONSISTENCY: mostly matches — uses Button primitive and tokens. Deviation: the
break-window chips are hand-rolled `Pressable`s with their own chip styles
(:103-118,:180-200) instead of the shared `Chip` primitive (Chip.js), duplicating
the selected/unselected pill treatment; `lineHeight` values 18/16 are literals
(:165,:204). The chip selected state here uses `primaryBg`+`primary` border
(:188-191) which does match Chip's selected treatment (Chip.js:63-66), so the look
is consistent even though the code is duplicated.
USABILITY: works for all users — strong consent ethics (CTA never gated,
:137-142), plain question copy ("what's the main reason?", :86), Android pause
hint (:122-127). Chips have `accessibilityRole="button"` + `accessibilityState`
(:111-113). Chip vertical padding `spacing.sm` (8) + 13px text ~= 29px tall
(:181-182), under the 44px target.

---

COMPONENT: Card
WHAT IT DOES: The single base card surface (Card.js:1-14). `surface` background,
`radius.lg`, 1px `border`, token padding (default `lg`) (:76-82). `tone` draws an
accent border (primary/success/warning/error/gold/neutral) at 0.33 alpha for hero
cards (:20-27,:43,:51). `elevated` sits it on `surfaceElevated` (:30-32,:83).
`borderless` removes the border (:84). Passing `onPress`/`onLongPress` routes
through `PressableCard` for the shared press spring (:55-67).
WHERE IT IS USED: very wide — NutritionTargetsScreen.js, SubscriptionScreen.js,
PaywallScreen.js, HomeScreen.js, DiaryScreen.js, CoachOutputScreen.js, and ~35
more screens/components. Sample import: SubscriptionScreen.js:20
`import Card from '../components/Card';`.
VISUAL QUALITY: premium — single restylable card surface replacing ~83 inline
blocks (header :4-6), tokenised throughout, `withAlpha` for the accent border
(:51). Clean default.
CONSISTENCY: matches app tokens/patterns — `radius`, `spacing`, `colors`,
`withAlpha`, and a TONES map keyed to semantic tokens (:20-27). No literals found.
This is a model-consistent primitive.
USABILITY: works for all users — when pressable it carries `accessibilityRole`
default 'button' + label (:60-62); as a static surface it forwards
`accessibilityLabel`/`accessibilityRole` (:69-71). Touch target depends on the
card's own content size (a card is large by nature).

---

COMPONENT: CardioPlanCard
WHAT IT DOES: "Cardio this week" card (CardioPlanCard.js:9-16). Self-contained:
loads its own 7-day cardio summary on focus via `getCardioLogRange` +
`summariseWeekCardio` (:17-27). Shows sessions done vs optional coach target, a
"Log cardio" button, an optional "History" link (only when there is logged
cardio), and a footnote that cardio is already counted in the calorie target
(also only when there is data) (:37-60). `est_kcal` is deliberately never shown
(:13-16 header).
WHERE IT IS USED: AnalyticsScreen.js (sole consumer). Sample import:
AnalyticsScreen.js:14 `import CardioPlanCard from '../components/CardioPlanCard';`.
VISUAL QUALITY: acceptable — uses `radius.md` (10) here (:65-67) where most cards
in the batch use `radius.lg` (14) (cf. Card.js:79, EngineLog.js:145), a slightly
tighter card than the app's base Card. Title uses `type.bodyStrong` (16) (:70),
sub/links `fontSize.sm` (13) (:71-72), footnote `fontSize.xs` (11) (:79). The
"Log cardio" button is a small `primaryBg` pill (:73-77).
CONSISTENCY: mostly matches — uses tokens and `type`. Deviations: it does NOT use
the shared `Card` surface (hand-rolled `cardioCard`, :65-68) and the "Log cardio"
button is a hand-rolled `TouchableOpacity` (:49-52,:73-78) rather than the
`Button`/`Chip` primitive; radius is `md` not the base-card `lg`.
USABILITY: works for all users — copy is plain and reassuring ("Your choice of
activity", "Log any cardio you do", :31-35) and the double-count footnote
pre-empts a common confusion (:55-59). Targets: "Log cardio" `paddingVertical:
spacing.xs` (4) + 13px text ~= 21px tall (:74-76) — well under 44px; "History"
link relies on `hitSlop={8}` + ~18px text ~= 34px (:43) — still under 44px.

---

COMPONENT: Chip
WHAT IT DOES: A single selectable pill with one selected treatment (amber fill +
border) for pick-one/pick-some choices (Chip.js:1-9). `selected`+`onPress`,
optional leading `icon`, `disabled`, configurable `accessibilityRole` ('button'
default, 'radio' for single-select groups) (:16-48). Built on `PressableCard`
(:13,:29).
WHERE IT IS USED: NOT FOUND in any screen or component as the `Chip` primitive.
The only real import is its own test (src/components/__tests__/inputs.test.js:9
`import Chip from '../Chip';`). The many "Chip" matches across screens are
substrings of other names (WindowChips, SourceChip, local `chip`/`chipRow`
styles), not this component. **So the Chip primitive appears to be effectively
unused by the app today** (NOT DETERMINED whether a non-`Chip`-named re-export
consumes it — none found).
VISUAL QUALITY: premium (in isolation) — `surface2` base, `primaryBg`+`primary`
border when selected, `radius.full` pill, icon recolours with state (:51-71).
Tokenised throughout.
CONSISTENCY: matches the app's chip look (its selected treatment is identical to
the hand-rolled chips in CancelReasonSheet.js:188-191), but the irony is that
several screens hand-roll their own chips instead of importing this primitive —
so the codebase is INCONSISTENT in that the shared primitive exists yet is bypassed.
USABILITY: works for all users — `accessibilityRole`/`accessibilityState`
{selected,disabled} (:33-34), label passed through. Touch target: `paddingVertical:
spacing.sm` (8) + `fontSize.sm` (13) text ~= 29px tall (:60-61,:69) — under the
44px target.

---

COMPONENT: DifferentialBadge
WHAT IT DOES: Inline paywall card surfaced below the weekly coach output when the
differential trigger fires (DifferentialBadge.js:1-12). Pure presentation: reads
`differential.shown`, `with_food_data_message`, `paywall_cta` and renders "With
Pro" header, the locked message, a buy/try CTA and a "Not now" dismiss
(:46-71). Fires a `'shown'` impression ping once per mount via `onTapCta('shown')`
(:27-32). CTA label is "Try Pro free for 7 days" for the trial id, else "Get Pro
for {price}" or price-free "Get Pro" — no hardcoded price fallback (:42-44).
WHERE IT IS USED: PaywallScreen.js, CoachOutputScreen.js. Sample import:
CoachOutputScreen.js:39 `import DifferentialBadge from '../components/DifferentialBadge';`.
VISUAL QUALITY: premium — `surface` card with a full `colors.primary` 1px border
(brand amber affordance, :75-82), header `fontSize.sm` (13) semibold primary with
icon (:48-51,:89-94), body `fontSize.md` (16) primary with `lineHeight: 22`
literal (:95-100), solid amber CTA with `onPrimary` ink (:101-110).
CONSISTENCY: mostly matches — uses tokens and `onPrimary` correctly (:108, unlike
Button). Deviations: the CTA is a hand-rolled `TouchableOpacity` (:55-62,:101-106)
rather than the `Button` primitive (which would give the standard primary look and
press spring); `lineHeight: 22` is a literal (:98) not a token; `letterSpacing:
0.5` literal on the header (:93).
USABILITY: works for all users — clear With-Pro framing, explicit CTA and a
low-friction "Not now" (:63-69). Both buttons have `accessibilityRole="button"`
(:58,:66). CTA `paddingVertical: spacing.md` (12) + 16px text ~= 40px (:102-104) —
just under 44px; dismiss `paddingVertical: spacing.sm` (8) ~= 29px (:112-114),
under 44px (acceptable for a tertiary dismiss).

---

COMPONENT: Dropdown
WHAT IT DOES: Inline dropdown that expands in place (no modal) — shared by the Pro
onboarding wizard and the change-goal screen for experience/equipment/focus/
recovery picks (Dropdown.js:5-11). Optional `label` + `hint`, a trigger showing the
selected label or placeholder, and an expanding list of options (each `{value,
label, sub?}`) with a checkmark on the chosen row (:14-58). Trigger border shifts:
neutral -> amber-tinted when filled -> amber when open (:18-19,:74-75).
WHERE IT IS USED: ProGoalSetupScreen.js, PlanUpdateScreen.js,
ProOnboardingScreen.js. Sample import: ProGoalSetupScreen.js:10
`import Dropdown from '../components/Dropdown';`.
VISUAL QUALITY: premium — considered trigger states, `borderWidth: 1.5` (:71),
the open list visually fused to the trigger (top radius squared off, shared amber
border, :75,:78-83). Value text `fontSize.md` (16) (:76), item label via
`type.body` (16) (:90), sub `fontSize.xs` (11) (:92), field label `fontSize.xs`
(11) (:63-65).
CONSISTENCY: mostly matches — tokens + `withAlpha`. Deviations: `borderWidth: 1.5`
and `paddingVertical: spacing.md + 2` (:71-72) and `withAlpha(colors.primary,
0.376)` (:74) use raw numeric literals; field label `letterSpacing: 0.3` literal
(:65); `marginBottom: 1` literal on item label (:90). The trigger is a
`TouchableOpacity` (`activeOpacity`) not `PressableCard`, so it lacks the app
press spring the primitives share.
USABILITY: works for all users — trigger has `accessibilityRole="button"`,
`accessibilityState.expanded`, and items announce `selected` (:22-24,:43-44).
Trigger height = `spacing.md+2` (14) pv + 16px text ~= 44px (:72) — meets target.
List item rows = `spacing.md` (12) pv + 16px ~= 40px (:86) — marginally under 44px.
The chevron has no separate target (whole trigger is tappable, fine).

---

COMPONENT: EmptyState
WHAT IT DOES: Shared empty-state card (EmptyState.js:5-18). Adherence-neutral, no
shame copy. Icon (default sparkles), title, explanatory text, optional primary and
secondary CTAs (:19-77). `ghost` mode renders a faint dashed "your data will look
like this" preview with an optional dismiss control (:39-48,:92-97). `compact`
tightens padding (:91).
WHERE IT IS USED: CardioHistoryScreen.js (sole consumer found). Sample import:
CardioHistoryScreen.js:18 `import EmptyState from '../components/EmptyState';`.
VISUAL QUALITY: premium — centred icon (40px, or 32 compact, :50-54), title
`fontSize.lg` (17) bold (:99-104), text `fontSize.sm` (13) muted with
`lineHeight: 20` literal (:106-111), dashed border for ghost (:92-97). Note the
title colour is `textSecondary` not `textPrimary` (:102) — a deliberately quieter
empty state.
CONSISTENCY: mostly matches — uses `onPrimary` correctly on the primary button
(:119). Deviations: the primary/secondary CTAs are hand-rolled `TouchableOpacity`
(:66-74,:113-127) instead of the `Button` primitive; `lineHeight: 20` literal
(:110). Otherwise tokenised.
USABILITY: works for all users — directional, no-shame copy by design (:6-7),
dismiss has `hitSlop` 10px + 16px icon (:43,:46) ~= 36px (acceptable for a corner
close). The CTA buttons (`paddingVertical: spacing.md` 12 + 13px text ~= 37px,
:116-118,:122-124) are under the 44px target. NOTE: the CTA touchables have no
`accessibilityRole="button"` (:66,:71) — they read as plain text to assistive tech.

---

COMPONENT: EngineLog
WHAT IT DOES: Collapsible coaching-decision log on the You tab (EngineLog.js:1-10).
Loads recent adaptation events + computes rep-regression warnings on focus
(:62-78). `detectRepRegressions` flags exercises with a >=2 rep average drop two
weeks running (:22-55). Collapsed header shows a pulse icon, "Engine Log" and a
count of recent decisions (:84-95); expanded body lists rep-regression rows
(warning colour) and adaptation rows with per-decision icon/colour, muscle, set
delta, reason and date (:97-138). Returns null when there is nothing to show
(:80).
WHERE IT IS USED: CoachHeldHistoryScreen.js (sole consumer). Sample import:
CoachHeldHistoryScreen.js:7 `import EngineLog from '../components/EngineLog';`.
VISUAL QUALITY: acceptable — clean card (`surface`, `radius.lg`, border, :144-147),
36x36 `primaryBg` icon chip (:150-153), header label `fontSize.md` (16) semibold
(:154), header sub `fontSize.xs` (11) (:155), row muscle `fontSize.sm` (13)
semibold (:158), reason/date `fontSize.xs` (11) (:159-160). Information-dense once
expanded but well structured with leading status icons.
CONSISTENCY: mostly matches — tokens used throughout; decision colours map to
`colors.primary`/`colors.error`/`colors.textMuted` and warnings to
`colors.warning` (:101-118). Deviation: those status colours are raw semantic
tokens rather than the `stateColors` action grammar (theme.js:459-464) — a
"warning"/"error" mapping that COMP-027 intended to express as watch/act. Icon
chip `width/height: 36` are literals (:151) though `borderRadius: radius.md` is a
token.
USABILITY: only fully makes sense to experienced users — "Engine Log", "Rep
regression", "+1 set", deload/rotation decisions are coaching-literate concepts;
a newcomer will not parse "Avg reps: x -> y -> z over 3 weeks" (:50) without
training context. The reason copy is helpful for those who understand it. The
collapsible header `TouchableOpacity` has no `accessibilityRole` (:84) and the
expand chevron is the only affordance. Header tap target is the full row
(comfortable). NOTE: header lacks `accessibilityState.expanded`.

---

COMPONENT: ExerciseCard
WHAT IT DOES: List card for an exercise (ExerciseCard.js:7). Shows the exercise
name, a primary-muscle tag, optional equipment tag, optional "Custom" tag, and an
optional "Last: {weight}{units} × {reps} reps · {n}d ago" line (:13-39). Trailing:
an optional round add button and a forward chevron (:40-51). Built on
`PressableCard` (:5,:14).
WHERE IT IS USED: **NOT FOUND** — grep across all of `src` returns only
`src/components/ExerciseCard.js` itself; no screen or component imports it. This
component appears to be dead code (note: the exercise library / picker uses
`ExercisePickerModal.js`, which is a separate component). NOT DETERMINED whether a
dynamic/string require exists, but none was found.
VISUAL QUALITY: acceptable — `surface` card, `radius.md` (10) (:60), name
`fontSize.md` (16) semibold (:74-77), tags `fontSize.xs` (11) in `primaryBg`/
`surface2` pills (:84-99), last-logged `fontSize.xs` (11) muted (:107-109). Clean
two-column layout.
CONSISTENCY: mostly matches — tokens used. Deviations: does NOT use the base
`Card` primitive (hand-rolled `surface` card, :58-65) and uses `radius.md` rather
than the base-card `radius.lg`; the round add button uses literal `width/height:
36`, `borderRadius: 18` (:116-119) instead of the `circle()` helper
(theme.js:252); the muscle/equipment tags duplicate `Chip`-like styling without
using `Chip`.
USABILITY: works for all users — plain "Last: 60kg × 8 reps · 3d ago" line is
clear (:34-36). NOTE: the add-button `TouchableOpacity` has `hitSlop` 8px around a
36px button (~52px effective, :42-45) — meets target — but has NO
`accessibilityRole`/`accessibilityLabel` (:42-46), so screen-reader users get an
unlabelled control; the card itself is labelled with the exercise name (:14).

---

## Cross-cutting observations (evidence-backed)

1. Two components in this batch appear UNUSED by the app: `Chip` (only its own
   test imports it; screens hand-roll chips instead — Chip.js vs
   CancelReasonSheet.js:180-200) and `ExerciseCard` (no importer anywhere in
   `src`). NOT DETERMINED if intentional; flagged for the build session.
2. Several components hand-roll buttons/chips instead of using the `Button`/`Chip`
   primitives: AppAlert.js:158-173, CancelReasonSheet.js:180-200,
   CardioPlanCard.js:73-78, DifferentialBadge.js:101-114, EmptyState.js:113-127.
   The primitives exist (Button.js, Chip.js) specifically to retire these.
3. `Button` primary/destructive use `colors.background` as the on-fill text colour
   (Button.js:25,:28) instead of `onPrimary` (theme.js:42). Identical in dark, but
   a latent near-white-on-amber contrast issue under the light theme
   (theme.js:102). `DifferentialBadge` and `EmptyState` use `onPrimary` correctly.
4. Volume/coaching colour grammar is applied inconsistently: BlockProgressCard
   (:31-34), BodyDiagramHeatmap legend (:263-267) and EngineLog (:101-118) use raw
   semantic tokens rather than the `stateColors`/`volumeColors` grammar the theme
   defines (theme.js:459-492).
5. Two animation systems coexist: AnimatedEntrance uses Reanimated
   (AnimatedEntrance.js:20), BottomSheet uses RN `Animated` with literal durations
   (BottomSheet.js:18,:24-27) rather than the `motion` tokens (theme.js:517-537).
6. Touch targets under 44px on interactive elements: Chip (~29px, Chip.js:60-61),
   CancelReasonSheet break chips (~29px, :181-182), CardioPlanCard "Log cardio"
   (~21px, :74-76) and "History" (~34px, :43), DifferentialBadge CTA (~40px,
   :102-104), EmptyState CTAs (~37px, :116-124), Button `sm` size (~29px,
   Button.js:32), Dropdown list rows (~40px, :86). BodyDiagramHeatmap muscle
   regions are small SVG shapes with no hitSlop.
7. Missing accessibility roles/labels: EmptyState CTAs (no `accessibilityRole`,
   :66,:71), EngineLog header (no role/`expanded` state, :84), ExerciseCard add
   button (no role/label, :42-46).


<!-- ==== phase1/15b-components.md ==== -->

# Phase 1 — Component Library audit (batch B)

Volyume Ultimate Audit, 2026-06-13. READ-ONLY inventory. Every claim cites
`file:line`; theme tokens resolved against `src/styles/theme.js`. British English.
Where a fact is not in the code it is marked **NOT DETERMINED IN CODE**.

Token reference used below (theme.js):
fontSize.micro 10 (256/257), xs 11 (258), sm 13 (259), md 16 (260), lg 17 (261),
xl 20 (262), xxl 24 (263), xxxl 32 (264), display 40 (265). spacing.xs 4 (231),
sm 8 (234), md 12 (235), lg 16 (236), xl 24 (237), xxl 32 (238). radius.sm 6 (243),
md 10 (244), lg 14 (245), xl 20 (246), full 999 (247). type.body resolves to
fontSize.md 16 (395), type.title to fontSize.lg 17 (391), type.label to fontSize.sm 13
(403), type.caption to fontSize.xs 11 (407). colors.border is #6E6E6E and is a
**card-edge** token (theme.js:23); borderSubtle #2E2E2C is the intended hairline
INSIDE a card (theme.js:25).

---

COMPONENT: ExercisePickerModal
WHAT IT DOES: Full-screen slide-up modal to search the local exercise library and
pick an exercise, with an inline "create custom exercise" sub-form (name + muscle
chips + equipment chips) that writes `isCustom:1` to the exercises table
(ExercisePickerModal.js:57-84). Two screens in one Modal: search list, or create form.
WHERE IT IS USED: ManualBuilderScreen.js, ActiveWorkoutScreen.js, RoutineDetailScreen.js
(`grep -rl`). Sample: `src/screens/ManualBuilderScreen.js:9` — `import ExercisePickerModal from '../components/ExercisePickerModal';`
VISUAL QUALITY: premium — token-driven throughout; search input uses `type.body`
(16px) on inputBg with a border (styles 237-241); chips use radius.full pills with
primaryBg active state (267-273); rows are 16-resolved `fontSize.md` names with a
capitalised muted muscle caption (246-247). Clean header/search/list hierarchy.
CONSISTENCY: matches app tokens/patterns — colours, spacing and `type.*` roles all
from theme. One minor deviation: list row separator uses `colors.border` (#6E6E6E,
the card-EDGE token) as an in-list hairline (styles:250) and the header bottom border
likewise (235), where `borderSubtle` is the documented inside-card hairline
(theme.js:25); same pattern repeats in several batch-B files (see below).
USABILITY: works for all users — plain "Search exercises…" placeholder, an always-
present "Create a custom exercise" footer so the option is never hidden behind an
empty result (comment 204-206), and a clear empty state (216-221). Create button
label is caller-supplied (saveLabel/actionLabel, 26-28).

---

COMPONENT: FatigueTrendCard
WHAT IT DOES: Recent-session fatigue trend card. Renders the last N sessions as a
bar sparkline (SvgBarSparkline) with weekday labels plus a one-line coaching read;
returns null until at least two sessions exist (FatigueTrendCard.js:29-30).
WHERE IT IS USED: ConsistencyScreen.js only (`grep -rl`). Sample:
`src/screens/ConsistencyScreen.js:7` — `import FatigueTrendCard from '../components/FatigueTrendCard';`
VISUAL QUALITY: acceptable — standard surface card, radius.lg, border, gap.sm
(styles 66-73). Title is `fontSize.sm` (13) semibold textSecondary (74-78); coach
line `fontSize.xs` (11) textMuted with a hard-coded `lineHeight: 16` (83-87). Chart
is centred (79-82). Restrained and consistent, not a hero surface.
CONSISTENCY: inconsistent (minor) — the sparkline is given a fixed `width={240}`,
`barWidth={22}`, `barGap={8}` (FatigueTrendCard.js:50-53), i.e. hard pixel values
not from spacing tokens; same fixed-240 pattern as ProgressSections sparklines so it
is at least self-consistent. `fatigueBarColor` maps levels directly to
colors.success/warning/error (7-12) rather than the `stateColors` grammar
(theme.js:459) — the first two branches both return success (8-9), so level 1 and 2
are identical (dead branch).
USABILITY: works for all users — explicit accessibilityLabel reads the whole trend
oldest-to-newest (54-57); coaching line translates the number into an action
("Push your next session" / "Consider a lighter day", 18-21).

---

COMPONENT: FeedbackSheet
WHAT IT DOES: Bottom slide-up sheet for one-tap sentiment feedback (5 chips) plus an
optional free-text line; submits via `submitFeedback`. Also exports
`FeedbackProvider`/`useFeedback` (context + singleton mount) and a shake-to-report
accelerometer handler (FeedbackSheet.js:64-121). Auto-dismisses after 12s if untouched
(174-179). Has a "done" success state (247-252).
WHERE IT IS USED: WorkoutSummaryScreen.js, SettingsAboutScreen.js (via `useFeedback`).
Sample: `src/screens/SettingsAboutScreen.js:4` — `import { useFeedback } from '../components/FeedbackSheet';`
VISUAL QUALITY: premium — proper modal sheet: scrim backdrop (348-352), 36×4 handle
pill (365-371), radius.xl top corners (357-358), animated translateY + backdrop with
reduce-motion collapse to 0 (155-166). Title `fontSize.lg` (17) bold (372-377), sub
`fontSize.sm` (13) (378-382), chips pill-shaped with primaryBg selected (390-413).
CONSISTENCY: inconsistent (minor) — backdrop sets `backgroundColor: colors.scrim`
AND an extra `opacity: 0.55` on the style (349-351); scrim already encodes 0.55 alpha
(theme.js:88), and the backdrop opacity is also animated 0→1 (158-160), so the static
0.55 is redundant/compounding. Sheet/handle/chip borders use `colors.border` not
`borderSubtle`. submitBtn `flex: 1.5` vs cancel `flex: 1` correctly weights the
primary action (449,434).
USABILITY: works for all users — copy adapts to trigger ("What's wrong?" on shake vs
"How was that?", 255-262), one-tap chips with selected state and a11y labels (278-280),
and an explicit privacy line stating what is attached and that body measurements/names
are stripped (336-339), honouring the no-PII rule.

---

COMPONENT: GradientCard
WHAT IT DOES: Compatibility shim. Despite the name there is NO gradient (locked rule:
flat background); it forwards to `Card` with a `tone` accent border, optionally
honouring an explicit `tint` hex as the border colour via `withAlpha(tint, 0.33)`
(GradientCard.js:14-38). The legacy `intensity` prop is accepted and ignored (22,28).
WHERE IT IS USED: YearOfLiftsScreen.js (`grep -rl`; other hits are Card.js and a test).
Sample: `src/screens/YearOfLiftsScreen.js:30` — `import GradientCard from '../components/GradientCard';`
VISUAL QUALITY: premium — inherits Card entirely; nothing rendered here beyond prop
mapping. The doc comment (1-12) records that the audit found it identical to Card and
consolidated the implementation.
CONSISTENCY: matches app tokens/patterns — uses `withAlpha` (theme.js:204) instead of
the banned hex-concat; deprecates itself in favour of `<Card tone="primary">` (10).
USABILITY: NOT APPLICABLE (non-visual wrapper). The lingering "Gradient" name is
misleading to a developer reading call sites, but has no user-facing effect.

---

COMPONENT: Illustrations
WHAT IT DOES: Five hand-tuned empty-state SVG illustrations built on react-native-svg:
EmptyWorkoutsIllustration (barbell), EmptyPlanIllustration (calendar),
EmptyPRsIllustration (trophy), EmptyChartIllustration (chart), EmptyBodyIllustration
(scale). All gold-accent + muted-stroke line art, default 140px (Illustrations.js:22-166).
WHERE IT IS USED: BodyMetricsScreen.js, WorkoutHistoryScreen.js, AnalyticsScreen.js
(`grep -rl`). Sample: `src/screens/WorkoutHistoryScreen.js:14` —
`import { EmptyWorkoutsIllustration } from '../components/Illustrations';`
VISUAL QUALITY: premium — consistent visual language (ACCENT = colors.primary, MUTED =
colors.textMuted, STROKE 2.5, 11-21), subtle sparkle/pulse accents, no external image
assets, scalable. A clear lift above generic Ionicons.
CONSISTENCY: matches app tokens/patterns — colours pulled from theme (16-20). One note:
the `viewBox` is fixed at "0 0 140 140" while `size` is variable (25), which is correct
SVG scaling; stroke/dot pixel values are intrinsic to the artwork, not layout tokens, so
the literals are appropriate here.
USABILITY: works for all users — purely decorative empty-state art; the headline/body
copy that accompanies them lives on the consuming screens (doc 6-8). No interactive
element, no a11y label on the SVGs themselves (decorative, acceptable).

---

COMPONENT: InfoTooltip
WHAT IT DOES: An info "(i)" icon button that opens a centred fade-in modal card showing
explanatory text; tap the scrim or card to dismiss (InfoTooltip.js:6-33).
WHERE IT IS USED: widely — NutritionTargetsScreen, MesocycleBuilderScreen,
WorkoutSummaryScreen, VolumeHeatmapScreen, ConsistencyScreen, LiftProgressScreen,
ExerciseDetailScreen, AnalyticsScreen, and internally ProgressSections.js &
ReadinessCards.js (`grep -rl`). Sample: `src/screens/AnalyticsScreen.js:13` —
`import InfoTooltip from '../components/InfoTooltip';`
VISUAL QUALITY: acceptable — minimal: muted icon trigger (17), centred surface card
radius.lg with border, maxWidth 320 (45-52), body `fontSize.sm` (13) textSecondary with
hard-coded `lineHeight: 20` (53-57). Functional rather than premium; no handle/title,
no animated scale (only the Modal `animationType="fade"`, 19).
CONSISTENCY: inconsistent (minor) — default icon `size = 14` (6) is below the
`iconSize.sm` (16) token (theme.js:502); card border uses `colors.border`. Uses
`colors.scrim` correctly for the overlay (40).
USABILITY: works for all users — trigger has hitSlop 8 (12) but the icon is 14px so the
effective target is ~30px, **below the 44px guideline** flagged by _FORMAT (the 8px
hitSlop does not reach 44). Trigger has accessibilityRole/Label "More information"
(14-15) and the card is marked accessible text (27). The any-tap-to-close is forgiving.

---

COMPONENT: OptionCard
WHAT IT DOES: Full-width selectable card — icon + label + one-line detail + checkmark
when active; accessibilityRole "radio" (OptionCard.js:9-29). Intended (per comment) for
the onboarding wizard and coached builder choice screens (5-8).
WHERE IT IS USED: **NO production importer found.** `grep -rl` over src/screens and
src/components returns only `src/components/__tests__/selectionControls.test.js`; a
repo-wide `grep -rl "OptionCard" src` confirms the only non-self reference is that test.
The doc comment claims onboarding/coached-builder use, but no screen imports it as of
2026-06-13. **NOT DETERMINED IN CODE** whether it was retired or never wired.
VISUAL QUALITY: premium (as written) — surface card radius.lg, 40×40 icon well in
surface2 (39-43), `type.bodyStrong` label (45), primaryBg active state (38). Consistent
with OnboardingScreen's own option styling.
CONSISTENCY: matches app tokens/patterns — all theme-driven; detail uses `fontSize.sm`
(13) with hard-coded `lineHeight: 18` (47); card border `colors.border`.
USABILITY: works for all users (if rendered) — radio semantics, selected state, large
tappable card with `activeOpacity 0.75`. Not currently reachable by users.

---

COMPONENT: PRCelebration
WHAT IT DOES: Full-screen personal-record celebration overlay: 40 confetti particles,
spring-scaled card with trophy icon, PR label/value and "+X% over previous best",
plus escalating success haptics; auto-dismisses after 3s, tap to dismiss
(PRCelebration.js:33-186). Has a `subdued` toast variant (no particles, 2.2s, 106-122).
WHERE IT IS USED: **Rendered from App.js, not from a screen.** Screens trigger it via
the store action `showPRCelebration(...)` (`src/screens/ActiveWorkoutScreen.js:841`),
and the actual component is lazy-required and mounted in `App.js:804` /
`<PRCelebration ... onDismiss={hidePRCelebration}>` at App.js:827-829.
WorkoutSummaryScreen only references it in comments (it deliberately does NOT render it,
WorkoutSummaryScreen.js:122,397). So: yes, it IS rendered — once, app-globally, in App.js.
VISUAL QUALITY: premium — full overlay (background base + animated opacity to 0.85,
58-63,189-193), spring card (radius.xl, gold-tinted border via withAlpha 0.376, 199-210),
88px gold icon well (211-219), `prBadge` `fontSize.xs` (11) black with letterSpacing 2
(220-226), `prType` `fontSize.lg` (17) bold (227-233). The one "hero moment" of the app.
CONSISTENCY: mostly matches — uses withAlpha for gold tints (209,215). Documented
deviation: confetti palette deliberately adds two non-token hexes (`#FF6B35`, `#9C27B0`)
with an eslint-disable and a comment that they sit outside the UI palette for a one-off
burst (26-28). Card top is hard-positioned `SCREEN_HEIGHT/2 - 160` (201) — a fixed offset
that will not adapt to font scaling (see size note).
USABILITY: works for all users — large unmissable card, "Tap to continue" hint (182),
reduced-but-present `subdued` mode. Small concern: the only dismiss is tapping anywhere
(125-129) and a 3s auto-timeout; no explicit button, but the hint covers it. On the
smallest screens the fixed `-160` top offset and `padding: spacing.xxl` (32) card could
crowd; **NOT DETERMINED IN CODE** at what device height it clips (no compact branch here).

---

COMPONENT: PartnerRow
WHAT IT DOES: Slim single-line training-partner status row for ConsistencyScreen; reads
derived signals from `usePartners` and shows where the pair stands (active ticks /
resting / pending / "Train with a partner"), opening PartnerScreen on tap; shows a small
"cheer received" hand icon when applicable (PartnerRow.js:13-43). Returns null while
loading (15).
WHERE IT IS USED: ConsistencyScreen.js (`grep -rl`; other hit is its test). Sample:
`src/screens/ConsistencyScreen.js:17` — `import PartnerRow from '../components/PartnerRow';`
VISUAL QUALITY: premium — surface row, radius.lg, border, `minHeight: 56` (styles 47-51);
people icon, `type.label` title + `fontSize.sm` (13) semibold line with marginTop:1
optical nudge (53-54), chevron affordance, 24px cheer dot in primaryBg (55-58).
CONSISTENCY: matches app tokens/patterns — theme-driven; minHeight 56 comfortably clears
44px. Row border uses `colors.border` (card edge — correct here, it IS a card).
USABILITY: works for all users — accessibilityLabel reads "Training partner. {line}"
(28-29), copy is plain and a resting partner explicitly never reads as a failure (doc 5,
line 20). Newcomer sees "Train with a partner" invite when none exists (22).

---

COMPONENT: PeekMenu
WHAT IT DOES: Imperative long-press context menu (Edit/Delete/Duplicate/Share style):
slide-up sheet with optional title/subtitle, a list of icon+label action rows (destructive
rows in error colour) and a Cancel button; opened via a ref `open({title, items})`
(PeekMenu.js:43-161). Honours reduce-motion (snap vs slide, 46,77).
WHERE IT IS USED: LiftProgressScreen.js, PlansScreen.js, and internally BottomSheet.js &
FeedbackSheet.js (`grep -rl`). Sample: `src/screens/PlansScreen.js:15` —
`import PeekMenu from '../components/PeekMenu';`
VISUAL QUALITY: premium — same sheet grammar as FeedbackSheet: scrim backdrop (166-170),
36×4 handle (183-189), radius.xl top corners, medium-impact haptic on open (52). Title
`fontSize.md` (16) bold (190-194), item text `fontSize.md` (16) semibold (209-213),
pressed rows tint to surface2 (128-129).
CONSISTENCY: matches app tokens/patterns — identical backdrop/sheet/handle pattern to
FeedbackSheet (good consistency); destructive items resolve to colors.error (137,142).
Sheet/handle borders use `colors.border`.
USABILITY: works for all users — each row has accessibilityRole button + label (131-132),
item rows are `paddingVertical: spacing.md` (12) inside radius.md (201-207) giving a
generous target, explicit Cancel (150-157). Guard: `open` no-ops if no items (51).

---

COMPONENT: PlateCalculator
WHAT IT DOES: Plate-loading calculator: target + bar weight inputs, computed total/per-
side, a visual bar with colour-coded plates (real-world equipment colours by weight),
and a per-plate count list; unit-aware (kg vs lbs plate sets) (PlateCalculator.js:8-143).
WHERE IT IS USED: **NOT RENDERED ANYWHERE.** `grep -rln "PlateCalculator"` across src
(and the whole repo excluding node_modules) returns ONLY `src/components/PlateCalculator.js`
itself — no importer in any screen, component, or test. It is dead/unwired code as of
2026-06-13. (Mentioned per the brief's specific ask: PlateCalculator is NOT rendered.)
VISUAL QUALITY: premium (as written) — surface container radius.xl, padding.xl (146-150);
result total is `fontSize.xxl` (24) black primary (192-196); centred bar visual with
scaled plate heights/widths (98-121); plate legend dots + counts (127-140). The plate
colours are intentional physical-standard literals with an eslint-disable + comment
(32-52).
CONSISTENCY: mostly matches — proper use of useAppStore for barWeight/units (9-10), guards
calculatePlates output (25-28). Deviations: plate text rotated 90° at `fontSize.micro`
(10) (225-233) is very small; bar/plate/collar use hand-rolled `borderRadius: 3` and fixed
widths (209-240) rather than radius tokens (intrinsic to the diagram, defensible).
USABILITY: only makes sense to experienced users — assumes the user understands bar weight,
per-side loading and plate denominations; "Each side" framing (95) and the colour legend
help, but a first-timer would need context. Inputs are decimal-pad with selectTextOnFocus
(74-77) and a11y labels (77,88). Moot until it is wired in.

---

COMPONENT: PostLapseSheet
WHAT IT DOES: One-time bottom sheet shown on first app open after a Pro lapse: states
plainly that all logged data is saved and what stays free, and optionally asks the single
churn-reason question (via ReasonPicker) when none was captured this episode; "Done"/"Got it"
dismisses either way (PostLapseSheet.js:31-79). Also exports `PostLapseSheetHost` which
watches tier/foreground and surfaces it once per episode (87-120).
WHERE IT IS USED: App.js (Host mounted at app root; `grep -rln` returns App.js). Also wired
to ReasonPicker (component import 22). **NOT DETERMINED IN CODE** here which App.js line
mounts the Host (Host is exported from this file; mount confirmed only as App.js per grep).
VISUAL QUALITY: acceptable — relies on the shared `BottomSheet` primitive for chrome (20,
51-56); content is just title `fontSize.lg` (17) bold (123-127), body `fontSize.sm` (13)
textSecondary lineHeight 20 (128-132), optional sub textMuted (133-137), and a `Button`
size="lg" (72-76). Plain and transactional by design (doc 8-9), not a hero surface.
CONSISTENCY: matches app tokens/patterns — defers all sheet styling to BottomSheet and the
primary CTA to Button (good reuse); uses captureCancelReason/winbackState helpers (24-27).
This is a billing/winback-adjacent surface — audited read-only only, not modified.
USABILITY: works for all users — reassurance-first copy ("Everything you logged is saved…
Training, plans and progress stay free", 29), reason question is explicitly optional (62),
single dismiss button. Calm, non-nagging (shown once per episode, doc 5-6).

---

COMPONENT: PressableCard
WHAT IT DOES: Drop-in TouchableOpacity replacement that adds a press-in spring scale
(default 0.97) + slight opacity dip for a tactile feel; flat behaviour under reduce-motion;
forwards onPress/onLongPress and a11y props (PressableCard.js:22-87).
WHERE IT IS USED: very widely — WorkoutHistoryScreen, ImportScreen, LiftProgressScreen,
HomeScreen, PlansScreen, YouScreen, and inside PeekMenu/Chip/Stepper/Button/ExerciseCard/
SettingsPrimitives/Card (`grep -rl`). Sample: `src/screens/HomeScreen.js:15` —
`import PressableCard from '../components/PressableCard';`
VISUAL QUALITY: premium — no styling of its own (caller passes `style`); the value is the
interaction: spring press-in speed 30 / press-out speed 18 bounciness 6 (43-58), opacity
interpolated scale→1 to 0.92→1 (61-66). Documented as matching Apple/Linear/Whoop/Spotify
press feel (5-7).
CONSISTENCY: matches app tokens/patterns — reads the same `accessibility.reduceMotion` store
guard the rest of the app uses (38), defaults accessibilityRole 'button' (28). A foundation
primitive used by other primitives, so it sets the pattern.
USABILITY: works for all users — full a11y prop passthrough (role/label/hint/state, 77-80),
reduce-motion users get a static control automatically (42,52), disabled supported (74).

---

COMPONENT: ProGate (+ ProLocked, withProGuard, ProBadge)
WHAT IT DOES: The Pro gating surface. `ProGate` wraps Pro content: Pro users see it,
free users see it dimmed (0.35) under a tappable lock chip that opens an upgrade sheet
routing to ProUpgrade (ProGate.js:22-85). `ProLocked` is the full-screen locked state
(with a food-diary "show-then-sell" plate teaser, 91-127). `withProGuard` is the route HOC
(134-140). `ProBadge` is the inline PRO pill (145-153).
WHERE IT IS USED: YouScreen.js (imports `ProBadge`, sample
`src/screens/YouScreen.js:21`); `withProGuard` is used in `src/navigation/RootNavigator.js`
(the route-level guard, per `grep -rl`).
VISUAL QUALITY: premium — upgrade sheet has scrim backdrop, radius.xl sheet, 60px sparkles
icon well, title `fontSize.xl` (20) black, sparkles CTA (155-199); ProLocked is a centred
held-seat with reassurance copy (104-112). Lock chip is amber primary with onPrimary ink
(162-167).
CONSISTENCY: matches app tokens/patterns — subscribes to only `s.tier` to avoid re-rendering
every gated subtree on each store tick (comment 23-26,134-138); badge uses onPrimary ink on
amber fill correctly. Minor: badge radii are hand-rolled `borderRadius: 4` (238) and lockChip
paddings use literal 10/5 (165) rather than tokens. This is the GATING-CRITICAL component
(CLAUDE.md "GATING IS ABSOLUTE") — audited read-only; the guard logic (`tier === 'pro'`,
32/137) is the single enforcement point.
USABILITY: works for all users — free users get a clear lock affordance and a "held seat, not
a wall" message stating data is intact (108-112); "Maybe later"/"Not now" escapes (77-79,
121-123). Copy explains what Pro is (weekly coaching, food diary, body metrics, 68-70).

---

COMPONENT: ProgressSections (MesocyclePulseCard, TrainingCalendar, SessionDurationChart,
MuscleFrequencyTable, WorkloadCard)
WHAT IT DOES: Five shared Progress-tab section cards lifted out of AnalyticsScreen so the
landing and Consistency surfaces render from one place (ProgressSections.js:9-12):
mesocycle/plan pulse with progress bar + weekly-load sparkline (16-92), 84-day training
heatmap calendar (94-139), session-duration bar chart with a fatigue coaching line (141-187),
this-week-vs-last muscle frequency table with show-all toggle (189-230), and the ACWR
training-load card with InfoTooltip (232-282).
WHERE IT IS USED: ConsistencyScreen.js (`grep -rl`). Sample:
`src/screens/ConsistencyScreen.js:12` — `MesocyclePulseCard, WorkloadCard, SessionDurationChart,`
(named imports).
VISUAL QUALITY: premium — consistent surface/radius.lg/border card grammar (285-291), good
use of `type.*` roles (bodyStrong, caption, num('title'), num('caption'), 297-317), tabular
nums on data values (313,317,430). Mesocycle empty state has a clear CTA (20-29).
CONSISTENCY: mostly matches — strong token discipline. Deviations: calendar grid gaps are
hard-coded `gap: 3` and square size computed `(SCREEN_W - 90)/14` with a literal 90 (99,
326-327); SessionDurationChart uses fixed `BAR_MAX_H 40`, `BAR_W 20` and `height: 72`
(142-143,340); freq row hairline uses `withAlpha(colors.border, 0.376)` (368) — a card-edge
token faded, where borderSubtle is the documented inside-card divider; `durationCoach`/
`workloadStatus` use literal lineHeight 17 (356,439). Colours in WorkloadCard map straight to
success/warning/error (237-248) rather than `stateColors`.
USABILITY: works for all users — calendar has a Rest/Trained legend + count (130-136), each
card carries a plain coaching sentence (e.g. "Load is in the optimal training zone", 247),
and WorkloadCard's ACWR ratio is explained in an InfoTooltip (257). The ACWR "Ratio 1.32"
value (266) leans athlete-facing, but the tooltip + status sentence translate it.

---

COMPONENT: ReadinessCards (+ exported computeRecoveryTrendInsight, internal RecoveryGauge)
WHAT IT DOES: The readiness half of the Progress tab: session milestones with a progress bar,
a Recovery card (soreness/fatigue/joint 1-5 gauges + scale note + optional cardio-load note),
Pro-only muscle-readiness chips, and a Pro-only recovery-trend insight line; self-loads from
local SQLite by userId/tier (ReadinessCards.js:98-253). Muscle readiness & trend insight are
gated to `tier === 'pro'` (139,215,240).
WHERE IT IS USED: ConsistencyScreen.js (`grep -rl`; other hit is its test). Sample:
`src/screens/ConsistencyScreen.js:10` — `import ReadinessCards from '../components/ReadinessCards';`
VISUAL QUALITY: premium — surface/radius.lg cards (289-303), milestone gold accent (174,295),
gauge dots colour-coded by score (255-280), muscle chips as alpha-tinted pills
(`withAlpha(color, 0.267/0.071)`, 229), trend insight in success/warning-tinted card (323-329).
Gauge value `fontSize.lg` (17) bold tabular (312); labels/scale at `fontSize.micro` (10) (313-314).
CONSISTENCY: mostly matches — good withAlpha use and an InfoTooltip on each section (181,197).
Deviations: recovery/cardio dividers use `colors.border` as inside-card hairlines (307-308,
319) where borderSubtle is documented; `trendInsightGood` falls back `colors.successBg ??
colors.primaryBg` (327) — a defensive `??` on a token that always exists (theme.js:52).
Recovery colours map straight to success/warning/error (46-49,264-268) not via stateColors.
The `mfCard` style block (331-334) is defined but unused (the header/grid were inlined into
recoveryCard) — dead style, noted not fixed.
USABILITY: works for all users (free + Pro tiers differ) — the 1-5 scale and "lower is better"
direction are stated in copy and tooltip (197,205); milestone tooltip explains why consistency
matters (181). The two-decimal-free gauge `value.toFixed(1)` (257) and "N/A" empty handling
(256-257,261) are clear. Muscle-readiness labels (Just trained/Recovering/Nearly ready/Ready)
are plain English (43-50). Pro-gated depth is hidden, not teased, on free.

---

COMPONENT: ReasonPicker
WHAT IT DOES: Presentational, controlled single-select list of churn-cancellation reasons
(radio rows) plus a conditional free-text field shown only for reasons in `FREE_TEXT_REASONS`;
parent owns `reason`/`text` + handlers (ReasonPicker.js:18-69). Shared by CancelReasonSheet
and PostLapseSheet so the rows behave identically (doc 4-9).
WHERE IT IS USED: CancelReasonSheet.js and PostLapseSheet.js (`grep -rl`). Sample:
`src/components/PostLapseSheet.js:22` — `import ReasonPicker from './ReasonPicker';`
(CancelReasonSheet.js references it in a comment at :11 and imports it in code.)
VISUAL QUALITY: acceptable — radio rows in surface2 with border, primaryBg selected state
(75-90); 20px radio with 10px dot (91-108); free-text input surface2 radius.md minHeight 56
(119-130). Clean, utilitarian; not a hero surface (appropriate for a churn form).
CONSISTENCY: matches app tokens/patterns — uses `lib/haptics` selection on pick (15,23), row
text `fontSize.md` (16) (109-114), input `fontSize.sm` (13) (119-128). Row border uses
`colors.border`. Reasons/prompts sourced from `lib/cancelReason` (16).
USABILITY: works for all users — radio rows are `minHeight: 44` exactly meeting the target
(79), proper accessibilityRole "radio" + checked state + label (40-42), free-text only appears
when relevant (19,55). This is a billing/winback-adjacent surface — audited read-only.

---

COMPONENT: RestTimer
WHAT IT DOES: In-workout rest countdown card (single row): timer icon, mm:ss or big countdown
numeral, ±15s buttons (long-press to repeat at 200ms), and Skip; escalating 3-2-1-GO beeps +
haptics; foreground wall-clock re-sync; "Start next set" done state; self-hides when inactive
(RestTimer.js:26-225). Compact variant on screens < 700px tall (17,154).
WHERE IT IS USED: ActiveWorkoutScreen.js (`grep -rl`). Mounted at
`src/screens/ActiveWorkoutScreen.js:1551` — `<RestTimer />`; import at
`src/screens/ActiveWorkoutScreen.js:11`.
VISUAL QUALITY: premium — surface2 card radius.md border (228-234); `row` minHeight 64
(243), compact 56 (253); time numeral is a deliberate hero literal `fontSize: 28` (compact 24)
with eslint-disable + comment "rest-timer countdown is a hero numeral" (246-247,254-255),
tabular nums + negative letterSpacing (250-251); 3-2-1 countdown numeral `fontSize.xxxl` (32)
in warning colour (257-264). ±15 buttons use `withAlpha(colors.primary, 0.314)` border on
primaryBg (282-291).
CONSISTENCY: mostly matches — strong selector discipline (useShallow + per-field selectors to
avoid re-rendering every second, comments 26-40), reads remaining off the store inside repeat
to dodge a stale closure (131-134). Deviations are documented hero-numeral literals (28/24) and
hitSlop 6/2 on the ±15 buttons (205) which is below the standard hitSlop token (theme.js:423).
USABILITY: works for all users — Skip and ±15 are `minHeight: 44` (273-275,282-284); the row is
accessibilityLiveRegion="polite" announcing each tick + a clear label (180-186); ±15 buttons have
explicit "Add/Remove 15 seconds" labels (207). The ±15 buttons' tight `left:2/right:2` hitSlop
(205) means horizontal touch tolerance is small, though the 44px min height holds. Audio+haptic
escalation lets the user feel the countdown without looking (doc 84-89).

---

## Cross-cutting findings

- **Two components are not rendered to users:**
  - **PlateCalculator** — `grep -rln "PlateCalculator"` over the repo (excl. node_modules)
    returns only the file itself. No importer anywhere. Dead/unwired.
  - **OptionCard** — only referenced by `selectionControls.test.js`; no screen imports it,
    despite a doc comment claiming onboarding/coached-builder use.
- **PRCelebration IS rendered**, but app-globally from `App.js:827` (lazy-required at
  App.js:804), driven by the `showPRCelebration` store action that screens call
  (ActiveWorkoutScreen.js:841). WorkoutSummaryScreen references it only in comments.
- **Recurring token deviation:** several cards use `colors.border` (#6E6E6E, the documented
  card-EDGE token, theme.js:23) — sometimes faded via withAlpha — for hairlines INSIDE a card,
  where `borderSubtle` #2E2E2C (theme.js:25) is the documented inside-card divider. Seen in
  ExercisePickerModal (separator/header), FeedbackSheet/PeekMenu (sheet/handle), ProgressSections
  (freq row 368), ReadinessCards (dividers 307/319). Consistent with each other, but off-spec
  vs the theme comment. Not a defect per se; flagged for the build phase.
- **Sub-44px touch target:** InfoTooltip trigger is a 14px icon with 8px hitSlop (~30px
  effective), below the 44px guideline (_FORMAT rule). It is the only batch-B interactive
  element clearly under target; RestTimer ±15 and Skip, PartnerRow, ReasonPicker rows all meet 44.
- **Colour grammar:** FatigueTrendCard, WorkloadCard and ReadinessCards map states directly to
  success/warning/error rather than the `stateColors` grammar (theme.js:459). Resolves to the
  same colours today, but bypasses the single vocabulary.
- **Dead style:** ReadinessCards `mfCard` style (331-334) is defined but unused.
- **Billing/winback-adjacent surfaces** (ProGate, PostLapseSheet, ReasonPicker) audited
  READ-ONLY per CLAUDE.md; no logic changed.

## NOT DETERMINED IN CODE
- Exact App.js line mounting `PostLapseSheetHost` (Host is exported from PostLapseSheet.js;
  grep confirms App.js references it, line not pinpointed in this read).
- Device-height threshold at which PRCelebration's fixed `SCREEN_HEIGHT/2 - 160` card offset
  would clip (no compact branch in the component).
- Whether OptionCard was retired or never wired (no production importer found).


<!-- ==== phase1/15c-components.md ==== -->

# Phase 1 — Component Library audit (batch C)

Volyume Ultimate Audit, 2026-06-13. READ-ONLY inventory. Token values resolved
against `src/styles/theme.js`. Every claim cites `file:line`. British English.

Token reference (theme.js): `fontSize.micro`(10, L257) `fontSize.xs`(11, L258)
`fontSize.sm`(13, L259) `fontSize.md`(16, L260) `fontSize.lg`(17, L261)
`fontSize.xl`(20, L262) `fontSize.xxl`(24, L263) `fontSize.xxxl`(32, L264);
`spacing.xxs`(2, L230) `spacing.xs`(4, L231) `spacing.xs2`(6, L232)
`spacing.sm`(8, L233) `spacing.md`(12, L234) `spacing.lg`(16, L235)
`spacing.xl`(24, L236) `spacing.xxl`(32, L237); `radius.xs`(4, L242)
`radius.sm`(6, L243) `radius.md`(10, L244) `radius.lg`(14, L245)
`radius.xl`(20, L246) `radius.full`(999, L247); `iconSize.sm`(16, L502).
Type roles: `type.label`(fontSize.sm 13 / medium, L402-405),
`type.body`(fontSize.md 16 / regular, L394-397),
`type.caption`(fontSize.xs 11, L406-409), `type.num('h3')`(fontSize.xl 20 /
tabular, via num L417 + h3 L387). Min comfortable touch target = 44px.

---

COMPONENT: ScreenHeader
WHAT IT DOES: Unified top-of-screen header — page title on the left, the Volyume
wordmark (or a caller-supplied `right` node) on the right, with an optional
subtitle line below (ScreenHeader.js:26-37).
WHERE IT IS USED: `grep -rl` -> src/screens/HomeScreen.js, AnalyticsScreen.js,
DiaryScreen.js, PlansScreen.js, YouScreen.js, and src/components/BackHeader.js.
Sample import: HomeScreen.js:12 `import ScreenHeader from '../components/ScreenHeader';`.
VISUAL QUALITY: premium — title is `fontSize.xl` (20) bold (ScreenHeader.js:54-55),
subtitle `fontSize.sm` (13) textMuted (L68-70); airy `paddingBottom: spacing.xs`
(4, L43) and `minHeight: 32` title row (L51). The 6px optical paddingTop on the
wordmark (L66) is a hand-tuned magic number rather than a token, but it is
documented as user-driven optical alignment (L61-66).
CONSISTENCY: matches app tokens/patterns — colours/spacing all from theme;
`WORDMARK_HEIGHT = 22` (ScreenHeader.js:24) is a hardcoded constant, not a token,
but documented as a cap-height match for the 24pt title; acceptable deviation.
USABILITY: works for all users — title + optional subtitle is self-explanatory;
`numberOfLines={1}` on both (L30, L35) protects layout from overflow.

---

COMPONENT: SearchBar
WHAT IT DOES: Single shared search input — leading search glyph, text field,
trailing clear button that appears only when there is a value (SearchBar.js:27-53).
WHERE IT IS USED: `grep -rl` -> src/screens/LogCardioScreen.js,
PlanLibraryScreen.js, and src/components/__tests__/inputs.test.js. Sample import:
PlanLibraryScreen.js:13 `import SearchBar from '../components/SearchBar';`.
VISUAL QUALITY: premium — `radius.md` (10) rounded bar on `inputBg` with a
1px `border` (SearchBar.js:62-65); input font `Math.max(16, fontSize.md)` (L72)
deliberately floored at 16 to stop iOS zoom-on-focus (commented L71).
CONSISTENCY: matches app tokens/patterns — all colour/spacing/radius/icon tokens
from theme (SearchBar.js:15, 57-75).
USABILITY: works for all users — recognisable magnifier + clear affordance; clear
button has 10px hitSlop (SearchBar.js:46) and accessibilityLabel "Clear search"
(L48). The 16px close glyph hit area is ~16+20 ≈ 36px before hitSlop; with the
10px slop it clears the comfortable target. Placeholder + accessibilityLabel both
default to "Search" (L21, L40).

---

COMPONENT: SegmentedControl
WHAT IT DOES: Equal-width segmented (radio-group) control; a bordered track of
pill segments, the selected one filled amber (SegmentedControl.js:9-30).
WHERE IT IS USED: `grep -rl` -> src/screens/ProGoalSetupScreen.js,
PlanUpdateScreen.js, ProOnboardingScreen.js, LogCardioScreen.js, and
src/components/__tests__/selectionControls.test.js. Sample import:
ProGoalSetupScreen.js:11 `import SegmentedControl from '../components/SegmentedControl';`.
VISUAL QUALITY: premium — `borderWidth: 1.5` track (SegmentedControl.js:35),
active fill `colors.primary` with `onPrimary` ink (L41, L43); label uses
`type.label` (fontSize.sm 13, L42).
CONSISTENCY: matches app tokens/patterns — proper `accessibilityRole="radiogroup"`
/ `"radio"` + selected state (L11, L20-21). One deviation: `borderRadius: radius.sm - 2`
(SegmentedControl.js:39) hand-computes a 4px corner rather than using `radius.xs`
(4); resolves to the same value but bypasses the token.
USABILITY: works for all users — segment height is `paddingVertical: spacing.sm + 2`
(10) plus label line height (SegmentedControl.js:38); total cell is roughly 34-36px,
**below the 44px comfortable target** for the tap zone, though wide horizontally.
Flag: short option labels only (no truncation handling); long labels could clip.

---

COMPONENT: SetEntry
WHAT IT DOES: The per-set Weight + Reps editor for an active workout — labelled
rows each with a − stepper, a numeric TextInput, and a + stepper; shows a live
estimated-1RM hint beside Reps for non-warmup sets (SetEntry.js:7-145).
WHERE IT IS USED: `grep -rl` -> src/screens/ActiveWorkoutScreen.js (Stepper.js
also names "SetEntry" only in a comment). Sample import: ActiveWorkoutScreen.js:10
`import SetEntry from '../components/SetEntry';`.
VISUAL QUALITY: premium — value inputs are `fontSize.xl` (20) bold tabular-nums
(SetEntry.js:223-227); stepper buttons are a generous 52x52 (SetEntry.js:208-209)
with `fontSize.xxl` (24) +/− glyphs (L215). Ghost (pre-fill) state dims to
textMuted (L229-231).
CONSISTENCY: matches app tokens/patterns — colours/spacing from theme; weight step
fixed at 2.5kg, "Gym weights are kg-only" (SetEntry.js:13-15). Note: this is the
ONE place using raw `Haptics.selectionAsync()` from expo-haptics directly
(SetEntry.js:3, 12) rather than the app's `lib/haptics` wrapper that the streak/
chart components use — inconsistent haptics path. Several declared styles
(`fieldLabelRow`, `plateBtn`, `perSideHint`, `rirRow`/`rirBtn*`, L157-256) are dead
— their JSX was removed (effort picker / set-type row, commented L135-143).
USABILITY: works for all users — clear labels, large targets, decimal entry handled
carefully (preserves a trailing "." so 21.25kg plates can be typed, L62-72).
The "Est. max ≈" 1RM hint (SetEntry.js:96) is jargon a newbie may not parse, but
it is supplementary, not blocking.

---

COMPONENT: SettingsPrimitives (SettingRow, SectionHeader, SettingsPage, settingsStyles)
WHAT IT DOES: Shared building blocks for the Settings landing page and sub-pages —
a tappable icon+label+value/arrow row, a section header, and a SafeAreaView+ScrollView
page wrapper (SettingsPrimitives.js:13-59).
WHERE IT IS USED: `grep -rl` -> 11 screens incl. SettingsScreen.js,
SettingsAccountScreen.js, SettingsPrivacyScreen.js, SettingsProfileScreen.js,
SnapshotsScreen.js, SettingsDisplayScreen.js, SettingsDataScreen.js,
SettingsNotificationsScreen.js, SettingsCoachingScreen.js, SettingsHealthScreen.js,
SettingsAboutScreen.js. Sample import: SettingsScreen.js:5
`import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';`.
VISUAL QUALITY: premium — rows are `padding: spacing.lg` (16) with a 34x34 amber-bg
icon tile (SettingsPrimitives.js:88-95); label uses `type.body` (16), sub
`fontSize.xs` (11) (L97-98). Destructive variant swaps to error tint (L96, L99).
CONSISTENCY: matches app tokens/patterns — uses `PressableCard` for the one shared
press feel (L6, L17); a Switch passed as `rightElement` is auto-given the row label
for screen readers (L36-38). Minor: `settingIcon` uses `borderRadius: 9`
(SettingsPrimitives.js:91) — a hardcoded value, no matching token (radius.sm is 6,
radius.md is 10).
USABILITY: works for all users — row height ≈ 34 icon + 16+16 padding ≈ 66px, well
above target; accessibilityLabel combines label+value (L23). Clear chevron affordance.

---

COMPONENT: Skeleton (Skeleton, SkeletonCard, SkeletonRow)
WHAT IT DOES: Animated grey-block loading placeholders that mirror real content
shape; the shimmer pulses unless Reduce Motion is on (Skeleton.js:23-84).
WHERE IT IS USED: `grep -rl` -> 16 screens incl. HomeScreen.js,
WorkoutHistoryScreen.js, FoodSearchScreen.js, PlanLibraryScreen.js,
ExerciseDetailScreen.js, RecipeBuilderScreen.js etc. Sample import:
HomeScreen.js:16 `import { SkeletonCard } from '../components/Skeleton';`.
VISUAL QUALITY: premium — uses `surface3` fill (Skeleton.js:87), opacity pulse
0.45->0.85 over 750ms each way (L31-43), correctly collapsed to a static 0.6
opacity under reduceMotion (L24, L28, L55).
CONSISTENCY: matches app tokens/patterns — reads `reduceMotion` from the store
(Skeleton.js:21, 24), `accessibilityRole="progressbar"` + label "Loading" (L51-52).
Minor: the `radius` default `r = 6` (Skeleton.js:23) and several inline px
(width/height/marginTop 10/11, L67-80) are literal numbers rather than tokens,
expected for a layout-matching primitive.
USABILITY: works for all users — non-interactive; correctly announced as loading.

---

COMPONENT: Sparkline
WHAT IT DOES: Tiny inline SVG trend curve (no axes/labels/interaction); filters
non-finite values and renders a flat placeholder line when under 2 points
(Sparkline.js:21-63).
WHERE IT IS USED: `grep -rl` -> src/screens/MesocycleBuilderScreen.js,
LiftProgressScreen.js, AnalyticsScreen.js; src/components/ProgressSections.js,
FatigueTrendCard.js, WeightTrendCard.js, TodayStrip.js (SvgBarSparkline.js names it
only in a doc comment). Sample import: LiftProgressScreen.js:19
`import Sparkline from '../components/Sparkline';`.
VISUAL QUALITY: premium — smoothed path at `strokeWidth={1.5}` (Sparkline.js:57),
default colour `colors.primary` (L26); 0.3-opacity placeholder line keeps layout
stable before data (L44-51).
CONSISTENCY: matches app tokens/patterns — shares the chartGeometry maths with the
full chart (Sparkline.js:19); `pointerEvents="none"` (L55). Default `width`/`height`
(100/28) are literals, expected for a sizing primitive.
USABILITY: works for all users — `accessibilityLabel` is NOT set on the Svg here,
so a standalone Sparkline reads as nothing to a screen reader; in practice hosts
(TodayStrip, WeightTrendCard) wrap it in a labelled card, but a bare Sparkline is
not independently accessible. Flag for the experienced/AT user.

---

COMPONENT: Stepper
WHAT IT DOES: Reusable numeric +/- control (clamped to [min,max], steps by `step`,
optional unit/formatValue), extracted from the SetEntry pattern (Stepper.js:18-59).
WHERE IT IS USED: `grep -rl` -> ONLY src/components/__tests__/inputs.test.js. **No
screen or non-test component imports it** (the doc comment claims set counts /
reminder hours / recipe servings as intended consumers, Stepper.js:6-7, but none
wire it up). Effectively unused production code. Sample import (test):
inputs.test.js:10 `import Stepper from '../Stepper';`.
VISUAL QUALITY: premium — 44x44 buttons (Stepper.js:64-65) on `surface2` with
border; value `fontSize.lg` (17) bold tabular-nums, `minWidth: 56` (L74-81);
disabled at min/max dims to 0.5 with textDisabled glyph (L45, L55, L73).
CONSISTENCY: matches app tokens/patterns — `PressableCard`, theme tokens,
accessibilityRole/Label per button (Stepper.js:38-56).
USABILITY: works for all users — exactly 44px targets, clear +/- icons, value
spoken via accessibilityLabel (L47). Caveat: it is dead code, so it currently
serves no user; flag as unused.

---

COMPONENT: StreakWeeksSection
WHAT IT DOES: "Your weeks" — the deep consistency view: a headline run line, a
12-week CVD-safe glyph strip, an optional repaired-week line, longest run, a
plan-less weekly-goal chip editor, and a Pause control with a modal sheet
(StreakWeeksSection.js:42-174). Hidden under ED/wellbeing suppression (L47).
WHERE IT IS USED: `grep -rl` -> ONLY src/screens/ConsistencyScreen.js. Sample
import: ConsistencyScreen.js:16 `import StreakWeeksSection from '../components/StreakWeeksSection';`.
VISUAL QUALITY: premium — card uses `surface`/`radius.lg`/border (StreakWeeksSection.js:177-184);
shape-carries-meaning glyphs (no colour-only state, no red) at size 16 (L106);
goal chips 40x40 (L199); pause button and sheet options enforce `minHeight: 44`/`48`
(L208, L220).
CONSISTENCY: matches app tokens/patterns — uses `lib/haptics`, `withAlpha`, type
roles (L15, 19, 84, 92); state colours pulled from semantic tokens. One deviation:
`glyph` uses `marginRight: 2` raw px (StreakWeeksSection.js:189) instead of a token;
the modal uses a hand-rolled `withAlpha(colors.background, 0.6)` overlay (L211)
rather than the shared `colors.scrim` token (theme.js:88) — minor scrim drift.
USABILITY: works for all users — copy is plainly worded and forgiving; goal chips
have selected state + labels (L132-135). The glyph strip's meaning (kept/recovery/
covered/paused) is opaque without a legend on screen — the screen-reader summary
(L77) is clearer than the visual for a first-time user. No on-screen key for the glyphs.

---

COMPONENT: SvgBarSparkline
WHAT IT DOES: Pure-SVG bar mini-chart with optional per-bar colour and under-bar
labels, right-align option, and a generated accessibility summary
(SvgBarSparkline.js:31-99).
WHERE IT IS USED: `grep -rl` -> src/screens/MesocycleBuilderScreen.js;
src/components/ProgressSections.js, FatigueTrendCard.js. Sample import:
FatigueTrendCard.js:3 `import SvgBarSparkline from './SvgBarSparkline';`.
VISUAL QUALITY: acceptable — bars at 0.9 opacity, `rx={4}` corners
(SvgBarSparkline.js:78-80); default colour `colors.primary` / label `textMuted`
(L40-42). Bar label font is a hardcoded `fontSize={9}` (SvgBarSparkline.js:86) —
below even `fontSize.micro` (10); fine for axis micro-labels but does NOT scale
with the larger-text accessibility setting (SVG text ignores fontSize tokens).
CONSISTENCY: inconsistent (minor) — `barWidth`/`barGap`/`height` defaults and the
`rx={4}`, label `y` offsets, and `fontSize={9}` are all raw literals; the sibling
VolyumeChart uses the same raw `fontSize={9}` for its SVG labels (VolyumeChart.js:237,
273), so they agree with each other but neither uses theme tokens (SVG limitation).
USABILITY: works for all users — has an `accessibilityRole="image"` + generated or
caller summary (SvgBarSparkline.js:47-50, 62); the 9px labels are tiny but
supplementary. Self-hides on empty data (L45).

---

COMPONENT: TierComparisonStrip
WHAT IT DOES: Free vs Pro pricing-comparison strip (paywall / subscription) — two
columns, Pro highlighted, three feature-difference rows, live Play Store price
(TierComparisonStrip.js:27-84).
WHERE IT IS USED: `grep -rl` -> src/screens/PaywallScreen.js, CascadeGateScreen.js.
Sample import: PaywallScreen.js:26 `import TierComparisonStrip from '../components/TierComparisonStrip';`.
VISUAL QUALITY: premium — `borderWidth: 2` columns, highlighted column gets amber
border + `primaryBg` (TierComparisonStrip.js:96-103); price `fontSize.xxl` (24)
semibold (L110-114), header `fontSize.lg` (17, L104-108), rows `fontSize.sm` (13,
L120-124). Empty-cadence spacer keeps Free aligned with Pro (L46-48).
CONSISTENCY: matches app tokens/patterns — all theme tokens; price never hardcoded,
shows "…" until Google Play responds (TierComparisonStrip.js:67); cadence suffix
prevents annual/monthly misreads (L69). Aligns with billing rules (live price).
USABILITY: works for all users — clear two-column scan; Pro column Pressable only
when `onPickPro` provided (L58-59) with `disabled` otherwise. No per-row
accessibilityLabel grouping, but text is literal. Newbie-readable.

---

COMPONENT: Toast (ToastProvider, useToast)
WHAT IT DOES: App-wide ephemeral snackbar system — FIFO queue, one visible at a
time, slide+fade in from bottom, tap-to-dismiss, optional action button, and an
undo/onTimeout pattern for destructive actions (Toast.js:50-195).
WHERE IT IS USED: `grep -rl` -> ~37 screens + components (HomeScreen.js,
DiaryScreen.js, SubscriptionScreen.js, food sheets, ExercisePickerModal etc.).
Sample import: HomeScreen.js:18 `import { useToast } from '../components/Toast';`.
VISUAL QUALITY: premium — floats above the tab bar (`bottom: 80`, Toast.js:202)
with `shadow.lg` (L222); coloured left border per variant (L161, 215), icon at
size 18 (L170), text `fontSize.sm` (13) medium (L226-229), uppercase action label
(L240). Respects reduceMotion (durations -> 0, L99-108, 135-146).
CONSISTENCY: matches app tokens/patterns — all theme tokens; variant tints map to
semantic colours (success/error/warning/primary, Toast.js:40-47);
`accessibilityRole="alert"` + polite live region (L162-163).
USABILITY: works for all users — auto-dismiss 2.5s (errors 4s, undo 8s, Toast.js:40-47)
gives reading time; tap-anywhere dismiss; action button labelled (L183). The
`bottom: 80` is a hardcoded assumption about tab-bar height (L202) — could overlap
content on a screen without a tab bar, but consistent app-wide.

---

COMPONENT: TodayStrip (Pro-only)
WHAT IT DOES: Glanceable Home row under the session hero — up to three cells
(Weight one-tap log, Steps glance, Cardio "+Log"); expands to a morning weigh-in
input during the morning window; stacks under large font scale
(TodayStrip.js:52-366). Parent mounts it for Pro only (L13).
WHERE IT IS USED: `grep -rl` -> src/screens/HomeScreen.js, AnalyticsScreen.js, and
src/components/__tests__/TodayStrip.test.js. Sample import: HomeScreen.js:17
`import TodayStrip from '../components/TodayStrip';`.
VISUAL QUALITY: premium — `surface`/`radius.md`/border card (TodayStrip.js:369-377);
cell labels `fontSize.xs` (11) semibold tracked, values `fontSize.md` (16) semibold
tabular (L399-410); divided cells via 1px borders (L386-397). Logged tick uses the
single allowed state colour (`success`, L254) per the Class B colour rule (L20-23).
CONSISTENCY: matches app tokens/patterns — theme tokens throughout; sparkline is
identity amber not a state colour (L256); weight sparkline hidden under ED flag
(L255). Gating respected (Pro-only mount). Two small literals: `cellInner` uses
`gap: 2`/`minHeight: 40` (L398) and icon sizes 14/15 (L254, 273, 305) as raw px.
USABILITY: works for all users — strong morning-ritual affordance; rich
accessibilityLabels incl. tap/long-press hints (TodayStrip.js:247-249); stacks
rather than truncates at fontScale >= 1.3 (L177, 349-357). The logged cell's
dual tap(open trend)/long-press(edit) gesture (L243-244) is discoverable only via
the spoken hint; a sighted newbie may not know long-press edits.

---

COMPONENT: VolumeBars
WHAT IT DOES: Per-muscle weekly working-set bars with MEV/MAV landmark ticks and a
status-coloured fill + count, driven by `getVolumeStatus` (VolumeBars.js:5-41).
WHERE IT IS USED: `grep -rl "VolumeBars" src` and a repo-wide grep return **only its
own file** — no screen or component imports it. **Dead/unused code.** No sample
import exists.
VISUAL QUALITY: acceptable — 8px bar track (VolumeBars.js:58-65), `radius.full`
fill with `minWidth: 2` (L66-70), landmark ticks 2x12px in `border` colour
(L71-78); muscle name `fontSize.sm` (13, L52-57), count `fontSize.sm` bold
state-coloured (L79-84).
CONSISTENCY: matches app tokens/patterns — uses `volumeStatusColor` from theme
(VolumeBars.js:2, 14) and the algorithms landmarks; well token-aligned. Cannot be
judged against live layout because it is unmounted.
USABILITY: only makes sense to experienced users — MEV/MAV landmark ticks have no
on-screen legend; the rows have `accessibilityLabel` (L23) but the two unlabelled
landmark lines are meaningless to a newbie. Moot in practice since it is unused.

---

COMPONENT: VolyumeChart
WHAT IT DOES: The app's single line/area (and bar-variant) chart engine —
react-native-svg render plus an optional long-press scrub with crosshair, tooltip,
per-point selection haptic, and accessibility announce (VolyumeChart.js:46-293).
WHERE IT IS USED: `grep -rl` -> src/screens/BodyMetricsScreen.js,
VolumeHeatmapScreen.js, ExerciseDetailScreen.js; src/components/WeightTrendCard.js
(Sparkline.js references it only in a doc comment). Sample import:
BodyMetricsScreen.js:25 `import VolyumeChart from '../components/VolyumeChart';`.
VISUAL QUALITY: premium — area gradient via withAlpha (VolyumeChart.js:205-206,
223-228), dashed grid rules at 0.5 opacity (L235-236), scrub crosshair + ringed
active point (L261-267); tooltip card on `surface`/`radius.md`/border (L296-305)
with `fontSize.sm`/`fontSize.xs` text (L306-307). Defaults `interactive={false}`
to a clean static chart (L69).
CONSISTENCY: matches app tokens/patterns — colours from theme aliases, withAlpha,
spacing/radius/font tokens (VolyumeChart.js:35); shares chartGeometry with Sparkline/
SvgBarSparkline; haptics via `lib/haptics` (no-op under Reduce Motion, L8, 137).
SVG axis/label text is raw `fontSize={9}` (L237, 273) — does not scale with the
larger-text setting (RN-SVG limitation, same as SvgBarSparkline).
USABILITY: works for all users (static); the scrub adds a labelled hint
("Touch and hold... drag to read each point", L219) and announces values, but the
hold-then-drag interaction is advanced and undiscoverable without the AT hint —
acceptable as a progressive enhancement over a readable static chart.

---

COMPONENT: WeeklyStreakStrip
WHAT IT DOES: "This week" Progress strip — sessions-this-week count on the left,
the run state on the right; no-shame by construction (no "streak" word, no red,
withheld under suppression) (WeeklyStreakStrip.js:18-57).
WHERE IT IS USED: `grep -rl` -> ONLY src/screens/AnalyticsScreen.js. Sample import:
AnalyticsScreen.js:20 `import WeeklyStreakStrip from '../components/WeeklyStreakStrip';`.
VISUAL QUALITY: premium — `surface`/`radius.md`/border card, `minHeight: 56`
(WeeklyStreakStrip.js:60-72); count uses `type.num('h3')` (fontSize.xl 20 tabular,
L74), sub + run `fontSize.sm` (13, L75-76).
CONSISTENCY: matches app tokens/patterns — theme tokens + type roles only; whole
card `accessible` with a composed label (WeeklyStreakStrip.js:49); reads the same
view-model the deep section uses (per its and StreakWeeksSection's comments).
USABILITY: works for all users — plain "3 of 4 sessions this week" + "N weeks
running"; no jargon, no glyph legend needed. Newbie-clear.

---

COMPONENT: WeightTrendCard (Pro)
WHAT IT DOES: "Your trend" card — smoothed weight line over faint raw weights,
current EWMA value, weekly rate, one plain-English insight with a state dot, and
the adaptive maintenance-kcal estimate; presentation-only off a pre-derived `vm`
(WeightTrendCard.js:28-122).
WHERE IT IS USED: `grep -rl` -> src/screens/AnalyticsScreen.js, DiaryScreen.js.
Sample import: AnalyticsScreen.js:18 `import WeightTrendCard from '../components/WeightTrendCard';`.
VISUAL QUALITY: premium — `surface`/`radius.md`/border card (WeightTrendCard.js:125-132);
uppercase `type.caption` label (L133), EWMA value `type.num('h3')` (fontSize.xl 20
tabular, L136) always textPrimary (never a state colour, per Class B), 88px chart
(L75). 6px state dot is decorative + a11y-hidden (L97, 139).
CONSISTENCY: matches app tokens/patterns — theme tokens + type roles + stateColors
(WeightTrendCard.js:3, 22-26); whole card `accessible` with a composed label
(L54-63); dot caps at watch (no red) per the comment (L16-18).
USABILITY: works for all users — the insight sentence carries the meaning so the dot
is redundant-by-design; "maintenance kcal" and "EWMA"-derived value are presented in
plain words ("estimated maintenance", building-state copy L104-106). Suitable for
both newbie and athlete.

---

COMPONENT: WindowChips
WHAT IT DOES: Shared time-window chip row (e.g. 4w / 12w / 1y) for the hero charts
so windowing looks identical across weight/e1RM/volume (WindowChips.js:10-31).
WHERE IT IS USED: `grep -rl` -> src/screens/BodyMetricsScreen.js,
VolumeHeatmapScreen.js, ExerciseDetailScreen.js. Sample import:
BodyMetricsScreen.js:31 `import WindowChips from '../components/WindowChips';`.
VISUAL QUALITY: premium — equal-flex chips, `radius.md`, active = amber border +
`withAlpha(primary,0.12)` fill / amber text (WindowChips.js:35-47); label uses
`type.label` (fontSize.sm 13).
CONSISTENCY: matches app tokens/patterns — theme tokens + withAlpha + type role
(WindowChips.js:8). Note: `accessibilityRole="tablist"` on the row (L12) but each
chip is `accessibilityRole="button"` (L21) rather than `"tab"` — a tablist normally
contains tabs; minor a11y-role mismatch.
USABILITY: works for all users — explicit `minHeight: 44` touch target (WindowChips.js:42,
commented), selected state + accessibilityLabel with a prefix (L22-23). Clear, scannable.

---

## Cross-cutting findings
- **Dead/unused production code:** `VolumeBars.js` (no importers anywhere) and
  `Stepper.js` (imported only by a test, never by a screen/component) — both are
  fully built and token-clean but currently serve no user. (Mention only, no fix,
  per CLAUDE.md.)
- **Dead styles inside SetEntry.js** (`fieldLabelRow`, `plateBtn*`, `perSideHint`,
  `rirRow`/`rirBtn*`, lines 157-256) left after the effort-picker / set-type row
  removal (SetEntry.js:135-143).
- **SVG text never scales with larger-text:** SvgBarSparkline.js:86 and
  VolyumeChart.js:237,273 hardcode `fontSize={9}` (below `fontSize.micro` 10); an
  RN-SVG limitation, but it does not respond to the in-app larger-text toggle.
- **Bare Sparkline has no accessibility label** (Sparkline.js) — relies on the host
  card to provide context.
- **Haptics path inconsistency:** SetEntry.js uses `expo-haptics` directly
  (SetEntry.js:3) while StreakWeeksSection / VolyumeChart use the `lib/haptics`
  wrapper.
- **Scrim drift:** StreakWeeksSection.js:211 rolls its own
  `withAlpha(colors.background, 0.6)` modal overlay instead of `colors.scrim`
  (theme.js:88).


<!-- ==== phase1/15d-components.md ==== -->

# Phase 1 — Component Library audit (batch D: food + auth subdirs)

Ultimate Audit 2026-06-13. READ-ONLY inventory. Zero-fabrication: every claim
cites `file:line`; token values resolved against `src/styles/theme.js`. British
English throughout. Where a fact is not in the code it is marked
**NOT DETERMINED IN CODE**.

Files audited (14): `src/components/food/*.js` (12) + `src/components/auth/*.js` (2).

Token reference (resolved from `src/styles/theme.js`):
- fontSize: micro 10 (theme.js:257), xs 11 (258), sm 13 (259), md 16 (260),
  lg 17 (261), xl 20 (262), xxl 24 (263), xxxl 32 (264), display 40 (265).
- spacing: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48
  (theme.js:228-239).
- radius: xs 4, sm 6, md 10, lg 14, xl 20, full 999 (theme.js:241-248).
- type roles (theme.js:373-410): body = fontSize.md 16 (394-397); bodyStrong =
  16 semibold (398-401); title = lg 17 semibold (390-393); label = sm 13 (402);
  caption = xs 11 (406).
- Note: numeric font sizes below body min (micro 10, xs 11) are flagged by the
  brief's own bar (`fontSize.micro` comment, theme.js:257, "below body min").

---

COMPONENT: EmptyDiary (`src/components/food/EmptyDiary.js`)
WHAT IT DOES: The designed empty-state card for a diary day with no entries
(EmptyDiary.js:1-10). Shows a restaurant icon, one calm copy line
(`EMPTY_DIARY_COPY`, line 15), an optional full-width "Plan my day" button, and
a row of "Add food" / "Copy yesterday" actions, all conditional on the
respective handler props (lines 22-56).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only. Sample import
`src/screens/DiaryScreen.js:36` (`import EmptyDiary from '../components/food/EmptyDiary'`);
rendered at DiaryScreen.js:579.
VISUAL QUALITY: premium — single bordered surface card (EmptyDiary.js:62-66:
`colors.surface`, `radius.lg` (14), 1px `colors.border`), generous
`paddingVertical: spacing.xl` (24) / `paddingHorizontal: spacing.lg` (16), centred
with `gap: spacing.md` (12). Body uses `type.body` (16px) `textSecondary`
(lines 71-75). All three buttons carry `minHeight: 44` (line 80), meeting the
44px touch-target bar.
CONSISTENCY: matches app tokens/patterns — colours, spacing, radius all token
sourced; primary fill uses `colors.primary` with `colors.onPrimary` ink
(lines 82, 87), the app's correct ink-on-amber pairing. Minor deviation: button
label text is hand-built (`fontSize: fontSize.sm` 13 + `fontWeight.semibold`,
line 86) rather than a `type` role, but this matches the sheet button pattern
elsewhere so it is in-house consistent.
USABILITY: works for all users — copy is plain ("Nothing logged yet today.",
line 15); every action has an `accessibilityLabel` (lines 27, 39, 50). "Plan my
day" is a Pro feature surfaced here; whether a free user ever sees it depends on
the caller passing `onPlanDay` (DiaryScreen, NOT DETERMINED IN CODE within this
component).

---

COMPONENT: EntryRow / SwipeableEntryRow / friendlyFoodName
(`src/components/food/EntryRow.js`)
WHAT IT DOES: `friendlyFoodName` derives a display name from an entry
(EntryRow.js:7-13). `EntryRow` renders one logged food row: name, optional
brand, gram quantity (hidden for quick-add, line 47), and right-aligned kcal +
"P C F" macro line (lines 27-54); supports selection mode with a checkbox
(lines 39-43). `SwipeableEntryRow` wraps it in a swipe-to-delete gesture
(lines 57-91).
WHERE IT IS USED: row component consumed by `src/components/food/MealSection.js`
(imports `SwipeableEntryRow`, MealSection.js:4); the `friendlyFoodName` helper is
imported by `src/screens/DiaryScreen.js:38`. The EntryRow component itself is not
imported directly by any screen — it reaches the diary via MealSection. Sample
import `src/components/food/MealSection.js:4`.
VISUAL QUALITY: premium — flush in-card row, `minHeight: 48` (line 106), hairline
top divider (`StyleSheet.hairlineWidth`, line 105). Name `fontSize.md` (16)
medium (line 122); kcal `fontSize.md` (16) semibold (line 126); brand/quantity/
macro line `fontSize.xs` (11) `textMuted` (lines 123, 124, 127). The 11px macro
line is at the brief's flagged below-body size, but is a secondary data label so
acceptable.
CONSISTENCY: matches app tokens/patterns — selection checkbox uses
`colors.primary` fill + `colors.onPrimary` tick (lines 117-119, 41); swipe-delete
uses `colors.error` (line 129). One deviation: the swipe-delete action width is a
hardcoded `width: 90` (line 130) rather than a token; not a sizing token exists
for this, so it is an inevitable literal.
USABILITY: works for all users — accessibility label changes by mode and reads
the kcal and tap action (lines 33-37); `delayLongPress={300}` (line 30). The
"P C F" abbreviations (line 51) are gym-standard but may not be obvious to a
first-time user; no expansion is shown inline.

---

COMPONENT: FoodDetailSheet (`src/components/food/FoodDetailSheet.js`)
WHAT IT DOES: Bottom sheet to add or edit a food entry: title/brand/source chip,
a quantity (g) input, a live macro summary (kcal/P/C/F pills recomputed via
`macrosFor`, lines 10-22, 101), a meal-slot selector, and Cancel / Save (+ Delete
in edit mode) actions (lines 105-180). Validates quantity 1–5000 g (line 69) and
toasts on error.
WHERE IT IS USED: `src/screens/FoodSearchScreen.js` (import line 48, rendered 733)
and `src/screens/DiaryScreen.js` (import line 34, rendered 619). Sample import
`src/screens/FoodSearchScreen.js:48`.
VISUAL QUALITY: premium — title `fontSize.lg` (17) bold (line 193); quantity
input is a prominent `fontSize.lg` (17) semibold field (line 214); macro pills on
`colors.surface2` with `radius.md` (10) (lines 219-225). Delete button is a
44x44 target (lines 244-249); Save is the flex-1 primary fill (lines 256-262).
CONSISTENCY: matches app tokens/patterns — fully token-driven; uses shared
`BottomSheet`, `useToast`, `appAlert`. Local deviation: the source chip is
hand-rolled here (lines 109-113, 195-203) rather than reusing the dedicated
`SourceChip` component — duplicated source-badge styling. `subtitle` uses
`marginTop: -spacing.xs` (line 194), a negative-margin nudge.
USABILITY: works for all users — field labels uppercase `fontSize.xs` (11)
(lines 204-208); macro summary has an `accessibilityLiveRegion="polite"` label
spelling out the full macro breakdown (lines 129-131). Save label adapts
("Add to diary" / "Save changes" / "Saving", line 175).

---

COMPONENT: FoodRow (`src/components/food/FoodRow.js`)
WHAT IT DOES: A single food-search result row: name (with ★ when favourited),
a meta line (brand · serving · kcal · source tag), an optional add-circle button,
and dislike handling (muted strike-through + cross-circle when
`preference === 'dislike'`, lines 30-85). Long-press cycles favourite state
(a11y label, lines 46-49).
WHERE IT IS USED: `src/screens/FoodSearchScreen.js` only. Sample import
`src/screens/FoodSearchScreen.js:50`; rendered at line 475.
VISUAL QUALITY: premium — `minHeight: 56` row (FoodRow.js:93), name `fontSize.md`
(16) semibold (line 95), meta `fontSize.sm` (13) `textMuted` (line 97). Add
button is an `add-circle` icon size 26 with the standard
`hitSlop` 12 (lines 73-80), comfortably above 44px effective. The non-interactive
`add-circle-outline` variant (size 22) is correctly hidden from a11y
(`importantForAccessibility="no"`, line 82).
CONSISTENCY: matches app tokens/patterns — colours token-sourced;
`borderBottomColor: colors.border` (line 92). Deviation: it carries its own
`SOURCE_LABEL` map (lines 5-11) which differs from the canonical `SourceChip`
labels (`user_ocr` -> "Snapped" here vs "OCR" in SourceChip.js:19; `custom` ->
"You" vs "Custom"). Two divergent source vocabularies exist in the food dir.
USABILITY: works for all users — rich a11y label including kcal and the
long-press affordance (lines 46-49). The source tag is appended as bare text
("  USDA", line 66) with no chip styling, so on the row it reads as a faint
suffix rather than a badge; may be missed by a newcomer.

---

COMPONENT: HeldDecisionCard (`src/components/food/HeldDecisionCard.js`)
WHAT IT DOES: The card shown in weekly coach output when the FFM floor, ED-pattern
flag, or rapid-loss safety override fires (HeldDecisionCard.js:1-11). Amber
"Held this week" badge, plain-English body, optional "Why?" link, and — for
`type === 'ed_pattern'` only — a "Get support" button opening Beat
(`BEAT_URL`, line 16; `openSupport`, lines 20-24). Touches the ED safety
signposting surface.
WHERE IT IS USED: **NOT DETERMINED IN CODE** — no production import found. The
only `src/` reference outside its own file is a doc-comment in
`src/components/DifferentialBadge.js:9` ("Layout per UI_FLOWS_LOCKED.md ... of
HeldDecisionCard"), which is not an import. `grep -rln "import.*HeldDecisionCard"
src/` returns nothing outside its own test. Appears currently unmounted /
unwired.
VISUAL QUALITY: acceptable — clean card (`colors.surface`, `radius.md` 10,
1px border, lines 66-72). Badge is `colors.primary` fill with `colors.onPrimary`
ink (lines 78-84). Body is `fontSize.sm` (13) with a hardcoded `lineHeight: 20`
(lines 86-90) — a non-token line height. "Get support" button uses
`backgroundColor: colors.background` (line 100), the only food-dir component
using the base background as a fill.
CONSISTENCY: inconsistent — body text uses a literal `lineHeight: 20` (line 89)
instead of a `type` role / lineHeight token; the support button's
`colors.background` fill (line 100) is an unusual choice versus the `surface2`
secondary-button pattern used elsewhere (e.g. MacroBreakdownSheet doneBtn,
MacroBreakdownSheet.js:110). Badge text is `fontSize.xs` (11), at the flagged
small size.
USABILITY: works for all users — copy is plain-English (passed as `body` prop);
support link degrades gracefully (if `Linking` fails it surfaces the Beat
address via `appAlert`, lines 21-23) so the support path never dead-ends, per the
safety rule. NOTE: this is a safety-system-adjacent surface (Beat signposting,
calorie/rapid-loss holds) and was read but not modified.

---

COMPONENT: MacroBreakdownSheet (+ `mealBreakdown`)
(`src/components/food/MacroBreakdownSheet.js`)
WHAT IT DOES: `mealBreakdown` sums each meal slot's macros from the day's enriched
entries, dropping empty slots and adding a day total (lines 13-45). The sheet
renders those as read-only rows (label + "kcal · P C F") with a total row and a
Done button (lines 60-92); opened by tapping the macro rings (line 56-58).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only. Sample import
`src/screens/DiaryScreen.js:33`; rendered at line 638.
VISUAL QUALITY: premium — title `fontSize.lg` (17) semibold (line 96), rows with
`fontSize.md` (16) label (line 103) and `fontSize.sm` (13) macro text (line 104),
bottom-divider rows (lines 98-102), Done button `minHeight: 48` (line 109). Empty
state has its own centred copy (line 107).
CONSISTENCY: matches app tokens/patterns — fully token-driven; reuses
`BottomSheet` and the `mealSlotLabel`/`slotOrder` helpers. Done button uses the
standard `colors.surface2` secondary pattern (line 110). No deviations found.
USABILITY: works for all users — read-only by design (line 56-58), so no risk of
mis-tap; sheet a11y label "Macro breakdown by meal" (line 64). The "P C F"
shorthand (MacroLine, lines 47-53) is gym-standard, same minor newcomer caveat as
EntryRow.

---

COMPONENT: MacroRings (+ `bandColour`, `Ring`, `MacroBar`)
(`src/components/food/MacroRings.js`)
WHAT IT DOES: The diary headline card. A Skia kcal ring (size 132, stroke 14,
lines 7-8) with a centre value that counts up + sweeps on change (animated unless
reduce-motion, lines 104-126), a "remaining"/"over" figure, an optional day-type
chip, and three horizontal macro bars (Protein primary, Carbs, Fat,
lines 186-190). Ring colour is the adherence-neutral brand amber by founder
decision — no colour judgement on under/over (`bandColour`, lines 10-19).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only (import line 32, rendered 541).
The `ProSetupCompleteScreen.js:386` reference is a doc-comment, not an import.
Sample import `src/screens/DiaryScreen.js:32`.
VISUAL QUALITY: premium — the strongest card in the batch. Centre kcal value is a
deliberate hero numeral at a hardcoded `fontSize: 34` with an eslint-disable
acknowledging it as a sanctioned exception (lines 214-221) — intentional, not a
drift. Remaining value `fontSize.xxl` (24) bold (lines 230-234). Macro bars 6px
tall (line 280) with amber fill (lines 285-289). Tabular-nums on every numeral
(lines 220, 234, 273).
CONSISTENCY: matches app tokens/patterns — colours, spacing, radius token-sourced;
ring uses `colors.surface2` track (line 164) and `bandColour()` amber tint. The
two hardcoded literals (`fontSize: 34` line 217, `lineHeight: 36` line 219, ring
constants lines 7-8) are documented intentional exceptions for a custom Skia hero,
not unmanaged deviations.
USABILITY: works for all users — builds one spoken a11y summary of kcal + all
macros and hides the decorative rings from screen readers (lines 128-151);
reduce-motion is honoured (lines 104, 111). Newcomer caveat: macro bars label
"Protein/Carbs/Fat" in full (lines 187-189), clearer than the "P C F" shorthand
used elsewhere. Fixed 132px ring will not scale with larger-text accessibility
(it is a fixed constant, line 7) — a small-screen note, though the card itself is
inside the DiaryScreen ScrollView (NOT DETERMINED IN CODE here; confirmed in
DiaryScreen, out of scope).

---

COMPONENT: MealSection (`src/components/food/MealSection.js`)
WHAT IT DOES: Renders one meal as a single contained card: header (meal name +
optional "kcal · g P" subtotal), the meal's `SwipeableEntryRow`s, an in-card
"Add food" row, and an optional quiet "Quick add" row (lines 12-62). Subtotals
computed inline (lines 17-18).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only (import line 37, rendered 588).
Sample import `src/screens/DiaryScreen.js:37`.
VISUAL QUALITY: premium — card owns the border + `radius.lg` (14) and
`overflow: 'hidden'` so child rows are flush (lines 65-69). Meal name uses
`type.bodyStrong` (16 semibold, line 76); subtotal `fontSize.sm` (13) tabular
(line 77). Add rows `minHeight: 48` (line 81) with hairline dividers when items
exist (lines 84-86).
CONSISTENCY: matches app tokens/patterns — token-driven; primary "Add food" in
`colors.primary`, secondary "Quick add" deliberately quieter in `colors.textSecondary`
(lines 44-57, 87-88), a clear primary/secondary hierarchy.
USABILITY: works for all users — both add affordances carry slot-specific a11y
labels (lines 42, 54). The empty section shows the add row directly under the
header with no divider so it reads as one clean block (comment lines 84-85),
avoiding the old dashed-placeholder pattern.

---

COMPONENT: QuickAddSheet (`src/components/food/QuickAddSheet.js`)
WHAT IT DOES: Bottom sheet to log a bare calorie figure plus optional P/C/F
without finding a food (lines 10-20). Required kcal validated 1–5000 (line 50);
blank macros count as 0 (`num`, lines 43-46); meal-slot selector; Cancel / Add to
diary (lines 64-125).
WHERE IT IS USED: `src/screens/FoodSearchScreen.js` (import line) and
`src/screens/DiaryScreen.js` (import line 35, rendered 631). Sample import
`src/screens/DiaryScreen.js:35`.
VISUAL QUALITY: premium — mirrors FoodDetailSheet's shape (line 13). Primary kcal
input `fontSize.lg` (17) semibold (line 143); three small macro inputs
centre-aligned `fontSize.md` (16) (lines 147-153). Save is the flex-1 primary
fill (lines 170-173).
CONSISTENCY: matches app tokens/patterns — token-driven and intentionally a
near-clone of FoodDetailSheet's styles for a consistent add experience. Same
`subtitle` negative-margin nudge as FoodDetailSheet (line 131,
`marginTop: -spacing.xs`). Field labels `fontSize.xs` (11), at the flagged size.
USABILITY: works for all users — clear copy ("Log calories now, with macros if
you have them.", line 67); `autoFocus` on the kcal field (line 77). The three
macro fields use full labels "Protein (g)/Carbs (g)/Fat (g)" (lines 83-85),
newcomer-clear.

---

COMPONENT: ServingPicker (`src/components/food/ServingPicker.js`)
WHAT IT DOES: A standalone quantity input with a unit toggle (g / oz by default,
overridable via `units`) (lines 1-64). Intended as a shared serving-size input
for FoodDetailSheet, AddCustomFoodScreen and future surfaces (doc lines 8-10).
WHERE IT IS USED: **NOT DETERMINED IN CODE** — no production import found. The
`src/screens/FoodSearchScreen.js:13` reference is a doc-comment, not an import;
`grep -rln "import.*ServingPicker" src/` returns nothing outside its own test
(`foodComponents.test.js`). The component its own header says it serves
(FoodDetailSheet) instead hand-rolls a plain TextInput (FoodDetailSheet.js:116).
Appears currently unused.
VISUAL QUALITY: acceptable — clean token-driven row (radius.sm 6, 1px border,
lines 72-91). Active unit pill is `colors.primary` fill with `colors.onPrimary`
ink (lines 97-98, 105-107). Unit `paddingVertical: 6` (line 94) is a literal, not
a token. Effective unit-pill touch target is small: `paddingHorizontal: spacing.sm`
(8) + 6 vertical with `hitSlop={6}` (line 54) — below the 44px bar even with the
slop. Flag: < 44px touch target.
CONSISTENCY: inconsistent — the standalone input background is `colors.surface`
(line 75) whereas the equivalent live FoodDetailSheet quantity input uses
`colors.surface2` (FoodDetailSheet.js:210); the input radius is `radius.sm` (6)
vs `radius.md` (10) on the live sheets. So even if wired it would not match the
sheets it claims to standardise.
USABILITY: only makes sense to experienced users in its current state — being
unmounted, it serves no end user. As written, the unit toggle has a small tap
target (lines 92-95) and no on-screen hint of what the units do; a11y labels are
present (lines 52-53).

---

COMPONENT: SourceChip (`src/components/food/SourceChip.js`)
WHAT IT DOES: A small badge translating a food source code to a label
(off/usda/cofid/user_ocr/custom -> OFF/USDA/CoFID/OCR/Custom, lines 15-21);
unknown codes fall back to an uppercased 6-char slice (line 24).
WHERE IT IS USED: **NOT DETERMINED IN CODE** — no production import found.
`grep -rln "SourceChip" src/` outside its own file returns only
`src/components/food/__tests__/foodComponents.test.js`. Both surfaces its own doc
header names (food results, food detail sheet) instead render source labels
inline (FoodRow.js:5-11, 66; FoodDetailSheet.js:109-113). Appears currently
unused in production.
VISUAL QUALITY: acceptable — minimal chip on `colors.surface` with 1px border and
`radius.sm` (6) (lines 33-41); text `fontSize.xs` (11) `textMuted` tabular
(lines 42-47). Uses a hardcoded `paddingHorizontal: 6` (line 34) rather than a
spacing token (closest token spacing.xs2 = 6).
CONSISTENCY: inconsistent — it is the intended single source of source-label
vocabulary, yet two other live components carry their own divergent maps
(FoodRow.SOURCE_LABEL maps `user_ocr` -> "Snapped", `custom` -> "You",
FoodRow.js:9-10; FoodDetailSheet uppercases the raw source string,
FoodDetailSheet.js:111). The app has three competing source vocabularies and this
canonical one is the unused one.
USABILITY: only makes sense to experienced users — the codes (OFF, USDA, CoFID,
OCR) are database provenance labels that a typical user will not recognise; no
tooltip or expansion. Being unmounted it currently reaches no user.

---

COMPONENT: TodaysPlateTeaser (`src/components/food/TodaysPlateTeaser.js`)
WHAT IT DOES: A read-only static example day shown to FREE users on the Pro-locked
Food diary screen — a show-then-sell conversion lever (lines 1-14). Builds a fixed
sample day from `SAMPLE_TARGET`/`SAMPLE_BAND` via `assembleDayPlan` with a fixed
seed (lines 23-32); renders an eyebrow, headline, sub-copy, per-slot plates, a day
total, and a disclaimer footer (lines 36-64). Nothing is tappable
(`pointerEvents="none"`, line 45).
WHERE IT IS USED: `src/components/ProGate.js` (import line 9, rendered at
ProGate.js:100 behind a `showPlateTeaser` flag). Sample import
`src/components/ProGate.js:9`.
VISUAL QUALITY: premium — bordered surface card, `radius.lg` (14), `padding:
spacing.lg` (16) (lines 68-74). Eyebrow `fontSize.xs` (11) bold amber (line 75);
title `fontSize.lg` (17) bold (line 76); sub `fontSize.sm` (13) with hardcoded
`lineHeight: 20` (line 77). Plates on `surface2` with `radius.md` (10) (lines
79-82). Slot/kcal/total text `fontSize.xs` (11). Dense but calm.
CONSISTENCY: matches app tokens/patterns mostly — colours/spacing/radius token
sourced. Deviations: two hardcoded line heights (`lineHeight: 20` line 77,
`lineHeight: 16` line 89) and a hardcoded `gap: 2` (line 81) rather than
`spacing.xxs` (2); these are literals where tokens exist. Several text elements
sit at the flagged `fontSize.xs` (11).
USABILITY: works for all users — explicitly non-interactive and labelled as an
example ("An example, not medical advice.", line 62); a11y summary explains it is
a Pro preview (line 37). GATING note: this is the deliberate free-side preview of
a Pro feature (header lines 1-14), exposing no Pro function — consistent with the
free/Pro rule. The static plates are information-dense (11px slot/kcal text) and
may read small on a 5.4" device; sizes are fixed (lines 84-89), no scaling guard
in the component.

---

COMPONENT: EmailPasswordFields (`src/components/auth/EmailPasswordFields.js`)
WHAT IT DOES: The shared email + password input block for sign-in / sign-up.
Presentational only — owns focus styling and the show/hide password toggle; the
screen owns values, submit, and all auth logic (lines 6-16). `mode` ('signin' /
'signup') only changes placeholders and autofill hints (lines 53-60).
WHERE IT IS USED: `src/screens/LoginScreen.js` (import line 10, rendered 279) and
`src/screens/ProOnboardingScreen.js`. Sample import `src/screens/LoginScreen.js:10`.
VISUAL QUALITY: premium — inputs use `type.body` (16px, line 93) with generous
`paddingVertical: spacing.md + 2` (14, line 94); focus state lifts the border to
a 50.2%-alpha primary via `withAlpha(colors.primary, 0.502)` (line 91), a polished
focus affordance. Labels `fontSize.xs` (11) semibold `textMuted` (lines 82-85).
Eye toggle has `hitSlop` 8 (line 67) and is vertically centred over the field
(lines 98-101).
CONSISTENCY: matches app tokens/patterns — token-driven, uses the `withAlpha`
helper rather than hex-concat (the sanctioned pattern, theme.js:204). `borderWidth:
1.5` (line 89) is a literal but is a deliberate input-emphasis choice consistent
within the auth surface.
USABILITY: works for all users — correct keyboard/autofill/textContentType per
field and mode (lines 35-60); `testID` and `accessibilityLabel` on both inputs
(lines 27-28, 50-51); show/hide password with a labelled toggle (lines 64-72). The
eye toggle effective target is ~19px icon + hitSlop 8 each side, comfortably
usable. Newcomer-clear.

---

COMPONENT: OAuthButtons (`src/components/auth/OAuthButtons.js`)
WHAT IT DOES: The "Continue with Apple / Google" block plus an "or with email"
divider, shared by LoginScreen and the Pro onboarding account step so the two auth
surfaces stay identical (lines 18-27). iOS renders Apple's official
`AppleAuthenticationButton` (Guideline 4.8), degrading to a HIG-styled custom
button if the native module is absent (lines 8-16, 29-58); Android shows Google
(lines 63-74). Presentational only.
WHERE IT IS USED: `src/screens/LoginScreen.js` (import line 9) and
`src/screens/ProOnboardingScreen.js`. Sample import `src/screens/LoginScreen.js:9`.
VISUAL QUALITY: premium — buttons centre content with `gap: spacing.sm` (8) and
`paddingVertical: spacing.md` (12) (lines 86-90); Apple button uses the brand-locked
`colors.appleBtnBg` / `appleBtnText` tokens (lines 92-96) which theme.js documents
as store-required brand locks (theme.js:74-79). Native Apple button given an
explicit 48px height to line up with the custom buttons (lines 97-100). Divider is
a clean line/label/line (lines 102-104).
CONSISTENCY: matches app tokens/patterns — uses `type.bodyStrong` (16 semibold)
for button text (lines 91, 96); colours token-sourced including the documented
brand-lock exception. Disabled state is a shared `opacity: 0.55` (line 101). No
unmanaged deviations.
USABILITY: works for all users — both buttons carry `accessibilityRole="button"`
and clear labels (lines 50-51, 67-68); disabled state also blocks the native Apple
button via `pointerEvents` (line 36). Buttons are full-width tap targets at 48px
effective height (paddingVertical 12 + 16px text ≈ 40, plus the native 48px
guarantee, line 99). Platform logic (Apple iOS-only, Google Android-only) is
explained in comments (lines 59-62) — store-compliant and clear to the user.

---

## Cross-cutting findings
1. THREE unmounted components: `SourceChip`, `ServingPicker`, and
   `HeldDecisionCard` have no production import (only test-file references).
   HeldDecisionCard is safety-adjacent (Beat signposting) so its non-wiring is
   worth flagging, not fixing.
2. Source-label vocabulary is fragmented: the canonical `SourceChip` is unused,
   while `FoodRow.SOURCE_LABEL` (FoodRow.js:5-11) and FoodDetailSheet's inline
   uppercase (FoodDetailSheet.js:111) carry divergent labels (e.g. `user_ocr` ->
   "Snapped" vs "OCR").
3. "P C F" macro shorthand (EntryRow.js:51, MacroBreakdownSheet.js:50) vs the
   full "Protein/Carbs/Fat" labels (MacroRings.js:187-189, QuickAddSheet.js:83-85)
   is inconsistent newcomer-facing terminology.
4. Several literal line heights where tokens exist: HeldDecisionCard.js:89,
   TodaysPlateTeaser.js:77,89.
(All observations are READ-ONLY; no code was changed.)
