# Ultimate Audit 01 — Volyume Workout Screen: Redesign Proposal

Companion to `docs/ultimate-audit-2026-06-13/phase2/research-01-workout-screen.md`
(read that first — every recommendation here traces to a finding ID Fx.y in it).
British English. This is a PROPOSAL, not a change: no code has been edited.

**Grounding in the real code (read, not summarised):**
- `src/screens/ActiveWorkoutScreen.js` — render tree (header, exercise nav,
  exercise header, COMP-001 three-line card header, SetEntry, log button) and
  its StyleSheet.
- `src/components/SetEntry.js` — weight/reps steppers and inputs.
- `src/styles/theme.js` — base font scale (`baseFontSize`) and `applyAccessibility`
  larger-text 1.2× swap.

**Headline:** Volyume's active screen is already close to best-in-class. It
already does the two things the research says define "perfect": it surfaces the
previous session inline and tap-to-fill (the `beatLine`, "Last: W × R · Target",
`ActiveWorkoutScreen.js:1601-1672`) and it consolidated a chip stack into three
fixed lines (COMP-001, `:1580-1585`). The work is **refinement and verification
against the standards, not a rebuild.** Several items below are "keep" or
"measure", and several "shrink/remove" items are deliberately flagged as
ASK-FIRST because they touch a deterministic engine boundary or are larger than
a one-line change.

---

## 1. Current screen inventory (what renders, with measured values)

From the code, top to bottom of the active session:

| Element | Current value (code) | Source line |
|---|---|---|
| Header: close / timer / Finish | timer `fontSize.xl` = 20pt bold; Finish `md` = 16pt | `:2399, :2397` |
| Starter-session banner | `xs` text | `:2400-2411` |
| Exercise navigator (horizontal tabs) | `navTabText` `sm` = 13pt; badge `micro` = 10pt | `:2412-2415` |
| Exercise name + Swap + ⋯ | name `xxl` = 24pt **black**; Swap `xs`=11pt; ⋯ icon 20 | `:2420-2422` |
| Superset chip | `xs` | `:2487-2494` |
| Next-time coaching banners | `nextTimeBanner` text | `:1498-1512` |
| Set-entry card header L1 orientation | `orientationText` `sm` = 13pt | `:2451` |
| L2 beat line ("Last: W × R · Target") | label `sm`=13pt; **value `md`=16pt** tabular | `:2453-2455` |
| L3 coach line (1st working set only) | `sm` = 13pt | `:2457` |
| First-set hint | `xs` = 11pt | `:2448` |
| SetEntry weight/reps inputs | `valueInput` `fontSize.xl` = 20pt, stepper 52px | `SetEntry.js:209, :223` |
| SetEntry +/- stepper glyphs | `xxl` = 24pt | `SetEntry.js:215` |
| Input labels (weight/reps) | `xs` = 11pt | `SetEntry.js:183-193` |
| Log set button | `completeBtn` filled amber, pad `lg`; text `lg`=17pt heavy | `:2463-2465` |
| Extra-set button | `sm`=13pt, minHeight 44 | `:2469-2470` |

Base scale (`theme.js:256-266`): micro 10, xs 11, sm 13, **md 16**, lg 17,
xl 20, xxl 24, xxxl 32, display 40. Larger-text accessibility toggle multiplies
all by 1.2 (`theme.js:325-338`).

---

## 2. Keep / Shrink / Remove (per element, each traced to a finding)

### KEEP (already matches best-in-class)

- **Beat line "Last: W × R · Target" with tap-to-fill** — exactly the Strong
  pre-load + Hevy tap-previous-to-fill mechanic (F3.1). The value at `md`=16pt
  tabular is at the body floor (F2.2). **Keep as-is.**
- **Two-tap log path** — previous values pre-fill the stepper (`:629-644`,
  `:851-861`); a confirm-and-tap-Log is two taps, matching the Strong benchmark
  (F6.1) and the ≤3-step retention rule (F8.1). **Keep; protect this in a test
  (see §6).**
- **Filled amber Log button, 17pt heavy, full-width** — large primary target
  for one-handed/fatigued use (F5.1, F2.3). **Keep.**
- **Three fixed card-header lines (COMP-001)** replacing a chip stack — directly
  counters the JEFIT clutter failure (F1.2). **Keep the one-mechanism rule;** do
  not let new chips creep back.
- **Exercise name at 24pt black** — comfortably above the 20pt title guidance
  (F2.2). **Keep.**

### SHRINK / TIGHTEN

- **Exercise navigator tabs (`navTabText` 13pt, badge 10pt micro).** The 10pt
  badge is below the 16px body floor (F2.2) — acceptable as a non-critical count
  glyph, but verify it survives the 1.2× larger-text swap legibly. **Shrink
  scope, not size:** when only one exercise exists the nav is already hidden
  (`:1409`); good. No change to the count itself.
- **First-set hint (`xs`=11pt) + next-time banners.** These are the most likely
  density offenders for a NEWBIE on set 1 (F1.1, F7.1). Keep the *content* but
  ensure only **one** guidance element shows at a time on the first set (hint OR
  coach line OR next-time note, never stacked) — the research's "one context
  line at a time" principle the code already states (`:1677`). **Tighten the
  mutual-exclusion, don't add.**
- **Starter/time-crunch + superset chips at `xs`=11pt.** Below body floor; they
  are status, not data, so acceptable — but **bump to `sm` (13pt)** to stay
  readable mid-set without adding height. Small, low-risk.

### REMOVE / DO-NOT-ADD (guardrails)

- **Do not add a social feed, streaks, or badges to this screen** (F1.3). None
  are present today — keep it that way.
- **Do not add an explicit mesocycle/volume-target widget to the logging screen**
  (F4.1/F4.2 — even the depth apps keep that off the log). Programmed depth
  belongs behind the ⋯ / info sheet, which already exists (`:1684` opens
  Execution sheet). **ASK-FIRST** if any overload-target surfacing is proposed:
  the target/prescription numbers come from the **deterministic coaching engine**
  (`computeSetTargets`, `:613-626`), which is a SACRED boundary — no AI, no
  change without permission.

---

## 3. Recommended font scale (workout screen)

Anchored to F2.2 (iOS 17pt body / Android 16sp preferred / never <16px) and
F2.3 (≥44pt targets). Volyume's existing tokens already encode this; the
proposal is to **hold the line and fix the two sub-floor data elements**, not
introduce a new scale.

| Role on screen | Recommend | Token | Rationale (finding) |
|---|---|---|---|
| Exercise name | 24pt black (keep) | `xxl` | Title ≥20px, glanceable (F2.2) |
| **Weight / reps value (the numbers you log)** | **24pt** (raise from 20pt `xl`→`xxl`) | `xxl` | These are THE data; F2.2 wants the primary numerals largest and the research's "perfect" = the numbers dominate. 20pt is fine; 24pt is better for one-handed glance (F5.1). Low-risk, isolated to `SetEntry.valueInput`. |
| Beat-line value ("Last 60kg × 8") | 16pt tabular (keep) | `md` | At body floor, already promoted from xs (F3.1) |
| Orientation / coach / beat label | 13pt (keep) | `sm` | Secondary context, acceptable below body for non-critical |
| Status chips (starter/superset) | 13pt (raise from 11pt) | `sm` | Pull off the 11pt sub-floor |
| Log button | 17pt heavy (keep) | `lg` | Primary CTA, above body (F2.2) |
| Input labels (WEIGHT/REPS) | 11pt (keep) | `xs` | Static labels, decorative-adjacent |

**Mandatory:** every size must continue to flow through `fontSize` tokens so
`applyAccessibility`'s 1.2× larger-text swap (`theme.js:325-338`) and OS Dynamic
Type keep working (F2.2 requires sp/Dynamic-Type support). No hard-coded px.

---

## 4. Touch targets & one-hand adaptation (F2.3, F5.1)

- **Keep** the 52px steppers (`SetEntry.js:209`) and full-width 17pt Log button —
  both exceed the 44pt floor.
- **Verify (audit task, not a guess):** every `hitSlop` on the header/beat/coach
  rows yields an effective ≥44pt target. The header icons use `hitSlop 8`
  (`:1361, :1382`) on a 22px icon → ~38px; **widen to reach 44pt.** Small fix.
- **No tiny swipes or precise gestures** for primary logging — the +/- steppers
  and tap-to-fill satisfy this; do not introduce swipe-to-log as the only path
  (F5.1: numb-finger / sweaty-hand failure mode).
- **Thumb reach:** the Log button sits at the bottom of the card under the
  inputs — good for one-handed bottom-thumb use. Keep the primary action low.

---

## 5. Phone-size adaptation

The screen is a single vertical `ScrollView` (`:1443`) with a
`KeyboardAvoidingView` (`:1355`), so it already reflows. Recommendations
(all consistent with F1.1 "one exercise of set entry visible"):

- **Small phones (≤5.4"):** the keyboard + 52px steppers + Log button must keep
  the **active input and the Log button visible together** when the number pad is
  up. Verify the card scrolls the beat line off-screen *before* it ever hides the
  Log button. This is the most important small-screen invariant.
- **Large phones:** do not fill the extra height with more elements (F1.2 — more
  pixels is not licence for more clutter). Extra space → breathing room, larger
  numerals, bottom-anchored Log button within thumb arc.
- **Larger-text accessibility on:** at 1.2× the three header lines + inputs must
  not push Log below the fold on a small phone — test the worst case.

---

## 6. Ideal tap count & the invariant test

- **Target: 2 taps to log a working set** when a previous session exists
  (confirm pre-filled value → Log), matching Strong (F6.1) and inside the
  ≤3-step retention rule (F8.1).
- **No-history first set:** still ≤3 taps (set weight, set reps, Log) — newbie
  must never face more friction than the athlete (F7.1, F8.1 60-second first
  workout).
- **CONTRACT TEST (write to fail):** an invariant test asserting that, given a
  prior session, the common log action is reachable in ≤2 taps and that the Log
  button never falls outside a reachable region with the keyboard open. This is
  the "tests are the contract" rule — it locks the research's headline finding
  into CI so future feature-creep can't quietly regress it.

---

## 7. Information hierarchy (top → bottom)

Ordered by the research's "speed + absence" principle (F1.1, "perfect" = nothing
in the way). Volyume's current order already broadly matches; this is the
target to hold:

1. **Timer** (small, ambient) — header, keep.
2. **Exercise name** — biggest text, instant orientation.
3. **Where am I** — "Set 2 of 4 · Working" (orientation line).
4. **The numbers I'm beating** — "Last: 60kg × 8 · Target 8–10", tap to fill.
5. **The numbers I'm logging** — weight/reps steppers (largest data numerals).
6. **Log set** — primary CTA, bottom, thumb-reachable.
7. Everything else (coach reason, swap, info, history) — **one tap away**, never
   competing with 1–6.

---

## 8. Newbie vs athlete view (F7.1, F7.2)

Single screen, two behaviours — driven by presence/absence of history, NOT a
separate mode (avoids JEFIT-style complexity, F1.2):

- **NEWBIE (no history):** beat line shows the "First time · Target X–Y" state
  the code already has (`:1660-1671`) — a confident default, never a blank field
  (F7.1). The first-set hint (`:1704-1712`) explains "choose weight + reps, tap
  Log; tap ⋯ for how to do it." Keep this; ensure it shows for genuinely first
  sessions only.
- **ATHLETE (history + programming):** beat line shows "Last: W × R · Target ↑/↓"
  with the engine's per-set target and direction glyph (`:1632-1656`). Deeper
  programming (deload weeks, session adjustment, stalled-progress nudge) is
  already handled by the deterministic engine and surfaced as **one** coach line
  + the info sheet — not as on-screen widgets (F4.2). **Do not move
  programmed-target detail onto the main log** (engine-boundary ASK-FIRST).

The same layout serves both because the *previous-data line adapts its content*
to the history state — exactly the best-in-class pattern, and exactly what
Volyume already built.

---

## 9. Summary of proposed changes (for founder go/no-go)

Low-risk, isolated, traceable:

1. Raise weight/reps **value** 20pt→24pt (`SetEntry.valueInput`). [F2.2/F5.1]
2. Raise status chips 11pt→13pt (`sm`). [F2.2]
3. Widen header-icon `hitSlop` to reach 44pt. [F2.3]
4. Enforce single guidance element on first set (mutual exclusion). [F1.1/F7.1]
5. Add the ≤2-tap + Log-reachable **invariant test**. [F6.1/F8.1]
6. Small-phone check: active input + Log visible with keyboard up. [§5]

ASK-FIRST / out of scope here:
- Any surfacing of engine-computed overload targets beyond the existing beat
  line — touches the deterministic coaching boundary (SACRED RULE).
- Anything described as a "mode switch" between newbie/athlete — rejected in
  favour of the existing history-driven single screen.

No code changed. Awaiting "go" before any edit, per CLAUDE.md (anything larger
than a one-line change = plan first). On go, each item runs as one verifiable
step with `npm run lint && npm test` reported after.
