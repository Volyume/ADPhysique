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
