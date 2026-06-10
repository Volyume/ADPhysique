# Workout Screen Deep Audit — ActiveWorkoutScreen (Phase 1 priority deliverable)

> Source of truth: `src/screens/ActiveWorkoutScreen.js` (2,373 lines),
> `src/components/SetEntry.js` (335), `src/components/RestTimer.js`
> (288), tokens from `src/styles/theme.js`. Every size below is read
> from the StyleSheets, not estimated. Audited 2026-06-10 with the
> harshest possible eye, as briefed.
>
> Token reference: micro=10, xs=11, sm=13, md=16, lg=17, xl=20, xxl=24,
> xxxl=32 (pt). spacing: xxs=2, xs=4, sm=8, md=12, lg=16, xl=24.

---

## 1. Precise screen map (top → bottom, planned-session happy path)

Fixed chrome (does not scroll):

| # | Element | Content & style | Size / TT | Verdict |
|---|---|---|---|---|
| 1 | Header row | close ✕ (icon 22, hitSlop 8) · elapsed timer (xl=20 bold amber, tabular) · "Finish" (md=16 semibold amber, hitSlop 8) | row ≈ 46pt; ✕ TT ≈ 38×38, Finish TT ≈ 40×30+slop | Earns its place. Timer at 20pt is glanceable. ✕ and Finish effective TTs are ~38pt — passable with hitSlop but below the 44pt floor for sweaty-hand use. |
| 2 | Exercise navigator | horizontal pill scroller, maxHeight 48; pill = first 2 words (xs=11 medium) + set-count badge 16×16 (micro=10) | pill ≈ 33pt tall × ≤140 wide | Earns its place (fast jumping). Pills at 33pt tall with 11pt text are fiddly mid-set; truncating to 2 words makes "Incline Dumbbell" vs "Incline Bench" ambiguous. |

Scrolling content (`padding md=12`, `gap sm=8`):

| # | Element | Content & style | Size / TT | Verdict |
|---|---|---|---|---|
| 3 | Exercise name row | name (xxl=24, weight 900) + Swap chip (icon 16 + xs=11, surface2 border) | name ≈ 30pt line; Swap TT ≈ 30×64+slop 8 | Name is correctly the loudest element. Swap chip is small for a primary-adjacent action but acceptable as secondary. |
| 4 | Muscle line | "Chest · primary muscle" (sm=13 secondary) | ≈ 18pt | Marginal. A lifter mid-session knows what bench press trains. Candidate to merge into the target line. |
| 5 | Superset chip (conditional) | "Superset 1 · alternates with X" (xs=11 amber on primaryBg) | ≈ 20pt | Fine when present. |
| 6 | Next-time note banner(s) (conditional, N can be >1) | bulb 16 + note (sm=13, up to 4 lines) + "Got it" | ≥ 44pt each | Good feature, but it stacks: several notes render as several banners on day one of a session. Should cap at 1 visible. |
| 7 | Deload banner (conditional) | battery icon 18 + title sm/sub xs + "Skip" | ≈ 52pt | Fine; dismissible. |
| 8 | Target row | flag 14 + "Target: 3 sets · 8–12 reps" (sm=13 muted) | ≈ 20pt | Duplicates info shown again inside the card (#11/#12). One of the two must go. |
| 9 | **RestTimer** (conditional, between sets — i.e. most of the time mid-workout) | row: icon 18 + time (28pt bold, or xxxl=32 countdown) + "REST" label (xs=11 uppercase) + Skip (sm=13, bordered, TT ≈ 29pt+hitSlop 12) · adjust row: −30/−15/+15/+30 (xs=11 semibold, TT ≈ 26pt+hitSlop 10) | card ≈ 96pt | The 28pt numeral is right. **Five small controls** (Skip + 4 adjusters) at 26–29pt visual height is the worst touch-target cluster on the screen; effective TT with hitSlop ≈ 46pt but the visual affordance is tiny and the four ± options are over-granular (Hevy/Strong ship exactly two: −15/+15 or ±30). |
| 10 | Target-complete banner (conditional) | check 16 + "Target reached: 3 working sets done" (sm=13 on successBg) | ≈ 36pt | Earns its place (state change). |
| 11 | **SetEntry card** (surface, radius 14, padding 16, internal gap 12) | see breakdown below | ≈ 240–330pt depending on chips | The core. See §2. |
| 12 | **Log set** button | check icon 20 + "Log set" (lg=17, weight 800, letter-spacing 0.6, dark-on-amber fill) | **full width × ≈ 56pt** | Correct. The one unambiguous primary action. |
| 13 | Secondary action row | **5 equal buttons**: Note, Info, Add, Pair, Remove — icon 18 + xs=11 label, surface cards, paddingV md=12 | each ≈ 44pt tall × ~59–66pt wide (5.4"–6.1") | Overloaded. Five always-visible options compete directly under the primary CTA. "Remove" (destructive, red) is permanently one accidental tap below "Log set"'s neighbourhood. Width per button on a 5.4" phone ≈ 59pt with 11pt labels. |
| 14 | "This workout" logged sets | label (xs=11 muted) + rows: 28×28 num badge (sm=13) · "60kg × 8" (md=16 semibold) · "Est. max ≈80kg" (xs=11) · check 16 | row ≈ 46pt | Right content, right size — but it sits BELOW #12+#13, so on small phones it is below the fold (see §4). The brief's question "is the current session's logged sets visible without scrolling?" — **No, not reliably.** |
| 15 | Ghost nav (conditional, while target incomplete) | "Next Exercise" outline-amber (md=16 bold, paddingV 16 ≈ 54pt) or "Finish Workout" outline-green | ≈ 54pt | Duplicates #13's job ("advance") and appears/disappears by state; adds a second large button to a screen that already has one. |
| 16 | Time-crunch row (conditional, exercises remain) | timer icon 15 + "Time crunch today" (xs=11 warning) + InfoTooltip 15 | ≈ 30pt | Genuinely novel feature, but it's permanent furniture for something used occasionally — and at 11pt it's simultaneously noisy AND illegible. Belongs behind the header or a menu. |

Modals/sheets reachable from the screen (not simultaneous): set-type
sheet (6 options + explainer), exercise info sheet (text), swap modal
(ranked list + library escape hatch), exercise picker, superset
heads-up, stale-session, discard, cluster banner (inline, replaces
action buttons during myo-reps/rest-pause).

## 2. SetEntry card internal map (the money pixels)

| Element | Style | Size / TT | Verdict |
|---|---|---|---|
| Card title "Set 2 / 3" | **xs=11** semibold muted, letter-spacing 0.2 | ≈ 14pt line | **Wrong size.** This is primary orientation ("which set am I on") rendered at the smallest text size on screen. |
| Inline target chip | flag 11 + "Target: 60kg × 8–12 ↑" (**xs=11** amber on primaryBg) | ≈ 21pt | Right content, wrong size. This is one of the four essentials. |
| Coach-reason chip | sparkles 11 + reason (**xs=11**) | ≈ 24pt | Useful once; rendered every set. |
| Stalled chip (conditional) | trending 12 + 2-line advice (**xs=11**, lineHeight 16) | ≈ 40pt | Good intervention, small text. |
| Beat chip ("Last time: 60kg × 8. Can you hit 9?") | time icon 11 + **xs=11 italic muted** | ≈ 18pt | **The single most important piece of context in a gym** (previous performance) is the smallest, lowest-contrast, italicised element in the card. This is the inverse of the correct hierarchy. |
| Repeat-last button (conditional) | repeat 13 + "Repeat last: 60kg × 8" (xs=11) | TT ≈ 27pt + hitSlop 6/8 | Below TT floor. Competes with the beat chip and ghost prefill for the same job (3 mechanisms for "use previous numbers"). |
| Ghost chip (conditional) | "Pre-filled from last session…" (xs=11 italic) | ≈ 18pt | A 4th "previous numbers" mechanism. |
| First-set hint (first use) | xs=11 on primaryBg | ≈ 40pt | Fine (one-time). |
| **Weight row** | label "Weight (kg)" sm=13 · stepper: **− btn 52×52** (xxl=24 glyph) · value input (**xl=20 bold tabular**, flex) · **+ btn 52×52** | row 52pt | Steppers are the best TTs on the screen. 2.5 kg step. Value at 20pt is good but the field is also the tap-to-type target — fine. |
| **Reps row** | identical; +e1RM hint xs=11 beside label | row 52pt | Good. |
| Live e1RM chip | trending 12 + "Est. max ≈ 80kg" (xs=11) | ≈ 21pt | **Rendered twice**: as a hint beside the Reps label AND as a chip below (both gated similarly), plus a third time on every logged-set row. Triple-stating a derived stat while "last time" gets one italic line. |
| Set-type row | "Set type — Working ›" (sm=13, paddingV 8, **top border**) | **TT ≈ 29–30pt full width** | Below the 44pt floor; mid-workout taps will miss. |

**Taps to log a set (measured):** with prefilled targets, the common
case is **1 tap** (Log set) — genuinely class-leading. Adjusting weight
±2.5/reps ±1 adds 1 tap each; typing = 2 taps + keyboard. Warm-up
first: 2 taps (set type sheet) + log.

**Interactive elements simultaneously visible mid-workout (rest timer
running, 2 chips, no banners):** header 2 + nav pills ~4 + swap 1 +
rest timer 5 + repeat-last 1 + steppers 4 + inputs 2 + set-type 1 +
Log set 1 + action row 5 + ghost nav 1 + time crunch 2 = **~29
interactive elements**. Hevy's equivalent state shows roughly 12–14.

## 3. The four essentials test (brief's hierarchy standard)

| Essential | Where | Size | Grade |
|---|---|---|---|
| Exercise name | top of scroll | 24pt/900 | **A** |
| Target (sets × reps × load) | chip in card + duplicate row above card | 11pt + 13pt | **D** — present twice, prominent nowhere |
| Previous performance | beat chip | 11pt italic muted | **F** — smallest text on screen |
| Logging input + action | steppers + Log set | 52pt TT / 56pt CTA | **A** |

Everything else on the screen is secondary, and the screen does not
treat it that way: secondary/coaching furniture (~9 chip/banner types,
5-button row, time crunch, ghost nav) outweighs the essentials by
vertical area roughly 2:1 before the first set is logged.

## 4. Fold analysis (no scroll, rest timer active, 2 context chips)

Cumulative height from safe-area top (pt, paddings included):

- Header 46 → nav 48 (94) → title block 56 (150) → muscle line 18
  (168) → target row 20 (188+gap) → rest timer 96 (292) → SetEntry
  card ≈ 250 with title+2 chips (550) → Log set 56 (614) → action row
  44 (666) → logged sets label+first row 60 (726+gaps ≈ 740).

| Device | Usable height | What's visible without scrolling |
|---|---|---|
| 5.4" (812×375, ~730pt usable) | ~730 | Logged sets **not visible**; even Log set can hug the fold with one banner present. |
| 6.1" (~810pt usable) | ~810 | First logged-set row visible only when ≤2 chips and no banner; any next-time note or deload banner pushes it off. |
| 6.7" (~870pt usable) | ~870 | 1–2 logged rows visible in the common state. |

The brief's questions: previous set data visible without scrolling —
yes (beat chip) but at 11pt italic; logged sets visible — **no** on
small/standard phones in the common mid-workout state.

## 5. Harshest-eye verdicts (direct answers to the brief)

- **Designed for gym or desk?** The input core (steppers, prefill,
  1-tap log, big amber CTA, haptic+flash ack, audio rest countdown) is
  genuinely gym-designed — better than most competitors. The
  *context layer* around it is desk-designed: nine chip variants of
  11pt text assume a seated reader, not a glancing lifter.
- **Single most cluttered element:** the vertical stack between the
  card title and the weight row — up to five 11pt chips
  (target / coach reason / stalled / beat / repeat-last / ghost) doing
  overlapping jobs. Four separate mechanisms exist just for "use last
  session's numbers" (ghost prefill, ghost chip, beat chip,
  repeat-last button).
- **What a user mid-set never needs to see:** Remove (destructive),
  Pair, Add, time-crunch row, the duplicate target row (#8), the
  duplicate e1RM, the muscle line.
- **What large fingers will struggle with:** set-type row (29pt), rest
  timer's 4 adjusters + Skip (26–29pt visual), repeat-last (27pt),
  Swap chip (30pt), nav pills (33pt). Everything else passes.
- **Three removals (no functionality lost):**
  1. The standalone target row (#8) — the in-card chip already says it.
  2. The repeat-last button + ghost chip — fold into the beat chip /
     prefill (one "previous" mechanism, not four).
  3. Time-crunch row + Remove + Pair from permanent view — into an
     overflow ("⋯") on the exercise header. (Counts as one removal of
     permanent furniture; all remain reachable.)
- **Three font-size changes:** beat chip 11 → 16 tabular non-italic
  (and move it INTO the card header line); set title "Set 2 / 3"
  11 → 13–16; action-row labels 11 → icons-only with 44pt squares or
  two text buttons. (Shrink nothing — the screen's problem is small
  text, not large; the only oversized element is arguably the 24pt/900
  exercise name on long names wrapping to 2 lines, acceptable.)
- **Information hierarchy that would serve the user:** 1) exercise
  name, 2) "Set 2 of 3 · last time 60×8" one strong line, 3) inputs
  with target as the prefill + a single quiet target/coach line,
  4) Log set, 5) logged sets immediately under the card, 6) everything
  else behind Info/⋯.

## 6. What is genuinely good (do not regress)

1-tap logging with intelligent prefill (beat-rep logic); 52pt steppers;
56pt filled CTA with flash + haptic ack; derived-from-wall-clock timers
(background-safe); rest countdown audio/haptic escalation; superset
auto-jump with one-time education; cluster (myo-rep/rest-pause) flow —
no competitor logs these structurally; warm-up sets excluded from
numbering/targets; deload prescriptions in-session; crash/stale
recovery; full accessibility labelling on every control; Reduce Motion
respected; keyboard handling (decimal preservation, select-on-focus,
weight→reps focus chain).

## 7. Inputs to Agent 2 (workout-screen research agent)

Compare against the field specifically on: density of the context
layer, where previous performance lives and at what size, rest-timer
control count, action-row pattern (5 buttons vs overflow), logged-sets
position relative to the input, and tap counts. Volyume's 1-tap
prefilled log and 52pt steppers are likely at or beyond par — verify
rather than assume the gap runs one way.
