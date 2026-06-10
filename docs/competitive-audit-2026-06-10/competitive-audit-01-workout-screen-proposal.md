# Workout Logging Screen — Redesign Proposal (Agent 2)

> Grounded in: `competitive-audit-00-workout-screen-deep-audit.md`
> (measured current state; element numbers `#1–#16` below refer to its
> screen map) and
> `competitive-audit-01-workout-screen-research.md` (field evidence).
> Tokens: font micro=10, xs=11, sm=13, md=16, lg=17, xl=20, xxl=24;
> spacing xxs=2, xs=4, sm=8, md=12, lg=16, xl=24.
> This is a design proposal only — no code has been modified.

## 0. Design thesis

The research is unambiguous: users reward speed and legible context,
and punish "extra options during a workout", small input controls and
chip noise (Jefit is the cautionary tale; Hevy/Strong the benchmark).
Volyume's input core already beats the field (1-tap prefilled log, 52pt
steppers, 56pt CTA). The redesign therefore changes **no logging
mechanics**. It does three things:

1. Promotes previous performance from an 11pt italic chip to a 16pt
   data line (the gold-standard pattern: previous = data, not
   commentary, at input size).
2. Collapses four "previous numbers" mechanisms into one, and five
   always-visible secondary actions into two plus an overflow.
3. Moves logged sets above the secondary furniture so they sit above
   the fold on 6.1" phones.

## 1. Keep exactly as-is (do not regress — per deep audit §6)

| Element | Spec (unchanged) |
|---|---|
| Log set CTA (#12) | full width × 56pt, lg=17 weight 800, dark-on-amber, flash + haptic ack |
| Steppers (weight/reps rows) | 52×52 buttons, xxl=24 glyphs, 2.5kg/1-rep steps |
| Input values | xl=20 bold tabular, tap-to-type, select-on-focus, weight→reps focus chain |
| Exercise name (#3) | xxl=24 weight 900 |
| Header elapsed timer (#1) | xl=20 bold amber tabular |
| 1-tap prefilled logging (beat-rep prefill logic) | unchanged |
| Cluster (myo-rep/rest-pause) inline flow | unchanged |
| Superset auto-jump + one-time education | unchanged |
| Rest countdown audio/haptic escalation; wall-clock-derived timers | unchanged |
| Warm-up exclusion from numbering/targets; deload prescriptions | unchanged |
| Accessibility labels on every control; Reduce Motion | unchanged (extend to all new/merged controls) |
| Crash/stale recovery, discard/stale sheets | unchanged |
| First-set hint (one-time), superset chip (#5), deload banner (#7), target-complete banner (#10) | unchanged |

## 2. The SetEntry card — rebuild the context stack as two lines

Current: card title (xs=11) + up to five xs=11 chips (target, coach
reason, stalled, beat, repeat-last/ghost) stacked above the inputs.
Replace with a fixed two-line card header (three lines max in
intervention states):

**Line 1 — orientation row.** `Set 2 of 3 · Working ›`
- sm=13, weight 600, textSecondary; `›` indicates the set-type sheet.
- The whole line is the set-type tap target: paddingV md=12 →
  **≥44pt touch target** (fixes the 29pt set-type row, which moves up
  here from the card foot and is deleted below the inputs).
- Warm-up sets render `Warm-up · Set W1` here, same row.

**Line 2 — the beat line (the headline change).** `Last: 60 kg × 8 · Target 8–12 ↑`
- **md=16, weight 600, tabular numerals, non-italic, textPrimary** for
  the numbers; "Last:" and "Target" labels sm=13 textSecondary.
- This is the single previous-performance mechanism. Delete the
  repeat-last button, the ghost chip, and the standalone beat chip;
  silent prefill remains. Tapping the beat line re-applies last
  session's exact numbers (Hevy's tap-previous-to-fill pattern) —
  lineHeight ≥ 24 with paddingV sm=8 → ≥40pt target with hitSlop 4.
- When no history exists: `First time · Target 8–12`.

**Line 3 — coaching line (conditional, max one).**
- One line only, sm=13 (up from xs=11), amber, sparkles icon 13.
  Priority when competing: stalled advice > deload note > coach reason.
- Coach reason renders on the **first set of the exercise only**, not
  every set. Full text and any suppressed messages open from a tap
  (chevron) into the existing info sheet.

**e1RM:** keep exactly one in-card instance — the xs=11 hint beside the
Reps label. Delete the duplicate chip below the inputs. (Logged-set
rows keep theirs — that is history, not input furniture.)

Card height: ≈250–330pt → **≈205pt fixed** (header 2 lines ≈ 46 +
weight row 52 + gap md=12 + reps row 52 + padding lg=16×2 + internal
gap ≈ 11; +18 when the coaching line shows).

## 3. Action row: 5 buttons → 2 + overflow

- Visible row under the CTA: **Add Set** and **Note** only. Two
  buttons, each ≥44pt tall, icon 18 + sm=13 label (labels finally
  legible; width per button ≈170pt on a 5.4" phone vs 59pt today).
- New **⋯ overflow button (44×44, icon 20)** on the exercise name row,
  right-aligned next to a retained-but-merged Swap entry. Overflow
  sheet contains: Swap exercise, Exercise info, Pair as superset,
  Time-crunch mode, Remove exercise (destructive, red, with confirm,
  listed last). The Swap chip and Info button leave the permanent
  surface; the #16 time-crunch row is deleted (when active, show a
  15pt timer glyph next to the elapsed timer instead).
- This takes Remove (destructive) out of the CTA's blast radius and
  cuts permanent furniture by three controls while keeping everything
  one tap away — the Hevy/Strong "behind the row" pattern.

## 4. Logged sets move above the action row

New order: SetEntry card → **Log set** → **"This workout" logged sets**
→ action row (Add Set · Note). Rows stay at current sizes (28×28
badge sm=13, values md=16 semibold, check 16) but row height trims
46→40pt (paddingV sm=8); section label xs=11 → sm=13 muted. On the
common 6.1" state this puts 1–2 logged rows above the fold (see §8
fold math); the deep audit's "No, not reliably" becomes yes.

## 5. Rest timer: 5 controls → 3

- Keep: icon, countdown numeral (28pt / xxxl countdown), REST label.
- Controls become exactly **−15 · +15 · Skip** (Hevy parity; the −30/+30
  pair is deleted). Each button: sm=13 weight 600 label, minHeight
  44, paddingH lg=16, hitSlop 4 — visible affordance ≥44pt, not 26–29pt.
- Long-press on −15/+15 repeats at 200ms intervals (covers the ±30 use
  case without buttons). Card height 96 → ≈64pt (single row: numeral
  left, three controls right).

## 6. Remaining deletions and demotions (mapped to audit numbers)

| # | Element | Action |
|---|---|---|
| #4 | Muscle line | Delete from session screen; lives in the Info sheet. |
| #6 | Next-time note banners | Cap at 1 visible; "+N more" expands. |
| #8 | Standalone target row | Delete — target now lives on the beat line. |
| #13 | 5-button action row | → 2 buttons + overflow (§3). |
| #15 | Ghost nav | Delete the parallel button. On target completion, the CTA area state-swaps: primary 56pt filled button becomes "Next Exercise" (or "Finish Workout" on the last exercise), with "Log another set" as a text button (sm=13, 44pt target) beneath. One large button on screen at any time. |
| #16 | Time-crunch row | → overflow + header glyph (§3). |
| #2 | Nav pills | Keep; pill height 33→40pt (paddingV sm=8), label xs=11 → sm=13, keep 2-word truncation but switch to middle-out uniqueness (keep the word that disambiguates, e.g. "Incline DB" vs "Incline Bench"). |
| #1 | Header ✕ / Finish | Keep; raise hitSlop so effective targets ≥44×44. |

## 7. Final type scale (every text element)

| Element | Now | Proposed |
|---|---|---|
| Exercise name | xxl=24/900 | unchanged |
| Elapsed timer | xl=20 | unchanged |
| Rest countdown numeral | 28 / xxxl=32 | unchanged |
| Input values | xl=20 bold tabular | unchanged |
| Log set label | lg=17/800 | unchanged |
| **Beat line numbers** | xs=11 italic muted | **md=16/600 tabular, textPrimary** |
| Beat/target labels | — | sm=13 textSecondary |
| Set orientation "Set 2 of 3 · Working" | xs=11 | **sm=13/600** |
| Coaching line (max 1) | xs=11 | **sm=13** |
| Weight/Reps field labels | sm=13 | unchanged |
| e1RM hint (single instance) | xs=11 | unchanged |
| Logged-set values / label | md=16 / xs=11 | md=16 / **sm=13** |
| Action button labels | xs=11 | **sm=13** |
| Rest adjust/skip labels | xs=11 / sm=13 | **sm=13/600** |
| Nav pill labels | xs=11 | **sm=13** |
| Superset chip, first-set hint, banners | xs/sm | unchanged |

Nothing shrinks. micro=10 and italic styles no longer appear anywhere
on the active session screen.

## 8. Touch targets and fold behaviour

**Touch floor: 44pt effective everywhere**; primary logging inputs stay
above it by design (steppers 52, CTA 56, set-type line 44, beat line
≥40+slop, rest controls 44, overflow 44, action buttons 44, pills
40+slop, header icons 44 effective).

**Fold math (6.1", ~810pt usable, rest timer active, coach line showing):**
header 46 + nav 48 (94) + title row 56 (150) + rest timer 64 (≈222
with gaps) + card 223 (≈453) + Log set 56 (≈517) + logged label
18 + 2 rows 80 (≈623) + action row 44 (≈675). **Two logged rows and
the action row above the fold**, with ~135pt headroom for a banner.
5.4" (~730pt): one logged row guaranteed; small-screen rules below
protect it.

**Small screens (<700pt usable height, by `useWindowDimensions`):**
rest timer uses the 56pt compact variant (numeral 24pt inline with
controls); logged sets cap at last 2 rows + "All sets (5) ›"; Note
moves into the overflow leaving Add Set full-width at 44pt; nav
maxHeight 40. **Large screens (≥800pt):** up to 3 logged rows, full
64pt rest timer, both action buttons.

## 9. Hierarchy and tap count

**Eye order (and the layout now enforces it):**
1. Exercise name (24pt) → 2. Beat line "Last: 60 kg × 8 · Target 8–12"
(16pt, the decision input) → 3. Input values + steppers (20pt/52pt) →
4. Log set (56pt amber) → 5. Logged sets → 6. Rest timer when running
(its 28pt numeral takes slot 2 between sets, which is correct) →
7. Everything else behind ⋯/Info.

**Tap counts (unchanged where class-leading):** prefilled log = **1
tap** (keep; this beats Hevy's 2-tap cold path); ±2.5kg/±1 rep = +1 tap
each; warm-up first set = 2 taps + log; repeat-last-exactly = 1 tap on
the beat line + log. Ideal remains 1; no flow gains a tap. Mid-workout
simultaneous interactive elements: **~29 → ~19** (header 2 + pills 4 +
⋯ 1 + rest 3 + steppers 4 + inputs 2 + set-type line 1 + beat line 1 +
CTA 1 + actions 2), inside the Hevy-benchmark range once Volyume's
extra coaching surface is accounted for.

## 10. Before / after summary

| | Before | After |
|---|---|---|
| Previous performance | xs=11 italic muted chip (smallest text on screen) | md=16 tabular line, 2nd item in hierarchy, tap-to-apply |
| "Use last numbers" mechanisms | 4 (prefill, ghost chip, beat chip, repeat-last) | 1 (+ silent prefill) |
| Chips above inputs | up to 5 | 0 (two fixed header lines, max 1 coaching line) |
| Target | stated twice (11pt + 13pt) | once, on the 16pt beat line |
| e1RM | 3 renderings | 1 in-card + logged rows |
| Secondary actions | 5 always visible incl. Remove | 2 + 44pt overflow; Remove behind confirm |
| Rest timer controls | 5 at 26–29pt visual | 3 at ≥44pt |
| Set-type target | 29pt | 44pt (merged into header line) |
| Logged sets | below action row, below fold on 5.4–6.1" | directly under CTA, above fold on 6.1" |
| Ghost nav | parallel 54pt button | CTA state-swap, one large button at a time |
| Interactive elements | ~29 | ~19 |
| Card height | 250–330pt | ~205–223pt |
| Smallest interactive text | xs=11 | sm=13 |
| Taps to log (prefilled) | 1 | 1 |

**Implementation order (each step independently shippable):**
1) beat line + chip consolidation (§2); 2) action row + overflow (§3);
3) logged-sets reorder (§4); 4) rest timer (§5); 5) deletions/demotions
(§6); 6) small-screen variants (§8). Steps 1–3 deliver ~80% of the
value.
