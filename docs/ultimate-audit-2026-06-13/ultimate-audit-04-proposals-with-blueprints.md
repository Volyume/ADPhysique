# Volyume — Master Proposals & Blueprints (Ultimate Audit 2026-06-13, Phase 5)

70 proposals (62 cluster + 8 navigation), each with a full ULTIMATE-NNN blueprint
in the body below. Every proposal traces to a Phase-3 comparison finding (with its
VERIFIED/PARTIAL/NOT-FOUND status) and cites Phase-1 file:line for implementation.

## How to read this
- **FOUNDER-GATE** = touches a SACRED constraint (deterministic engine, `src/coaching/safety/`,
  billing, locked docs, no-AI boundary). Input only — do NOT build autonomously.
- **NOT-DETERMINED** = an implementation fact the drafting agent could not confirm in code;
  must be checked before building (listed in each blueprint).
- **evidence-thin** = rests on a PARTIAL/NOT-FOUND or INTERPRETATION finding (Reddit was
  blocked, so user-sentiment items are secondary-sourced). Validate before relying on it.
- IDs `U-<cluster>-<n>` are the body anchors; `ULTIMATE-NNN` is the global priority number.

## Cross-cluster MERGES (the same fix surfaced in several areas — build once)
- **M1 Jargon-translation layer** = U-F-5 + U-D-3 + U-E-1 + U-E-2 + U-B-9 (inline tap-to-define
  + on-screen legends + tone-driven copy). Build as one programme.
- **M2 44px touch-target pass** = U-A-3 + U-F-2.
- **M3 Design-token/type/contrast pass** = U-F-1 + U-A-2 + U-F-6.
- **M4 Exercise-media programme** = U-A-6 + U-G-2 + U-A-8 (FOUNDER-GATE: no-AI + licensed media).
- **M5 Coach-output progressive disclosure** = U-B-1 + U-B-3.
- **M6 Fatigue/readiness/overreach** = U-G-1 + U-G-4 + U-G-3 (FOUNDER-GATE: ED-safety + engine).
- **M7 Consistency reward / streak** = U-D-8 + U-G-5 (FOUNDER-GATE: ED-safety).
- **M8 History import + export** = U-D-5 + U-D-6 + U-E-5.

## TIER 1 — CRITICAL (build first: high impact, buildable now, no founder/media block)
| ULTIMATE | src | proposal | I/E | notes |
|---|---|---|---|---|
| 001 | U-B-6 | Free CoachReview: tell read-error from no-data (stop silent-catch masquerade) | 7/2 | quick trust win |
| 002 | U-F-1 | Fix latent light-theme Button onPrimary contrast (WCAG) | 6/2 | quick correctness |
| 003 | U-A-1 | Workout: keep beat-line + inputs above the fold; collapse the banner stack | 9/5 | highest-freq screen |
| 004 | U-C-1 | "Set it for me" fast nutrition target before the full form | 9/5 | newbie on-ramp |
| 005 | M5 (U-B-1/B-3) | Progressive disclosure of the ~14-card coach output (one hero decision) | 8/5 | overload churn |
| 006 | M1 (F-5/D-3/E-1/E-2/B-9) | Inline jargon-translation layer + legends across data/coaching surfaces | 8/5 | biggest newbie gap |
| 007 | U-C-7 | Curated VERIFIED UK best-match food result + meaningful verified marker | 9/8 | food make-or-break; higher effort |
| 008 | U-D-4 | Encouragement-framed empty / near-empty states | 7/3 | first-value |
| 009 | M2 (U-A-3/F-2) | Bring every interactive element to a 44px effective target | 7/4 | reliability |

## TIER 2 — HIGH IMPACT (next)
| ULTIMATE | src | proposal | I/E | notes |
|---|---|---|---|---|
| 010 | U-D-1 | Progress photos — private, on-device visual log | 9/6 | largest absent progress feature |
| 011 | U-B-7 | Plan-rebuild preview/diff before PlanUpdate commits (parity w/ ProGoalSetup) | 8/5 | trust |
| 012 | U-C-5 | Persistent meal "plate"/timeline logger across a meal | 8/6 | logging friction |
| 013 | U-D-2 | Live mid-session personal-best celebration | 8/5 | reuses PR concept |
| 014 | U-A-7 | Guarantee form guidance always renders + common-mistakes/safety cues | 7/5 | brittle today |
| 015 | U-B-2 | Conditional Weekly check-in steps (show a section only when triggered) | 7/5 | length/abandon |
| 016 | U-F-5b | On-screen legends/keys on the deep data surfaces (volume heatmap etc.) | 8/5 | part of M1 |
| 017 | U-B-4 | Coached / Collaborative / Manual mode switch | 8/7 | **FOUNDER-GATE** apply-contract |
| 018 | U-B-5 | "This didn't fit" feedback recorded to held-history | 8/6 | **FOUNDER-GATE** if it feeds engine |
| 019 | M6 (U-G-1) | "You're overreaching → lighter week" warning (the market white-space) | 9/6 | **FOUNDER-GATE** ED-safety/engine |
| 020 | U-C-10 | Remove punitive over/under diary colour framing; no pressure streaks | 8/4 | **FOUNDER-GATE** ED-safety |
| 021 | M4 (U-A-6/G-2) | Tap-to-watch looping exercise demo clips at the exercise slot | 9/8 | **FOUNDER-GATE** no-AI + licensed media |
| 022 | U-G-4 | Readiness (green/amber/red) from sleep + RPE + bodyweight trend | 7/7 | **FOUNDER-GATE** engine |
| 023 | nav U-NAV-1..6 | Navigation restructure + relocations (see Phase 4 doc) | — | partly **FOUNDER-GATE** locked tabs |

## TIER 3 — MEANINGFUL IMPROVEMENTS
U-A-2 (card-header type), U-A-5 (confirm unconfirmed default reps — FOUNDER-GATE engine-data),
U-B-8 (per-muscle volume on PlanDetail), U-B-10 (explained quiz reveal), U-C-3 (contest-prep goal
— FOUNDER-GATE ED-floor), U-C-4 (longer Food-Insights range), U-C-6 (primary "log food" over barcode FAB),
U-C-8 (manual barcode entry), U-D-5/U-D-6/U-E-5 = M8 (history import + export), U-D-7 (cold-start cliff bridge),
U-E-3 (quiz heading/gate fix), U-E-4 (3-band vs 4-band quiz reconcile), U-F-3 (dead-code/primitive consolidation —
some FOUNDER-GATE), U-F-4 (unify animation systems), U-G-3 (RPE/RIR trend — FOUNDER-GATE engine, RPE disabled),
U-G-5 = M7 (non-coercive streak — FOUNDER-GATE), U-G-6 (pain-flag rotation — FOUNDER-GATE engine).

## TIER 4 — ENHANCEMENTS / POLISH
U-A-4 (plate-loading helper), U-A-8 (anatomy layer — media), U-C-2 (collapse "why" card),
U-C-9 (configurable water target), U-D-8 (lenient streak — FOUNDER-GATE), U-D-9 (notification copy variety —
FOUNDER-GATE), U-E-6 (newbie "why this"), U-E-7 (Noom-style wizard micro-copy), U-F-6 = M3 (token hygiene),
U-F-7 (opt-in dense mode), U-F-8 (privacy trust signal), U-G-7 (cycle-phase strength — Pro/Article 9),
U-G-8 (audio cues), U-G-9 (VBT/velocity — hardware), U-G-10 (mood↔activity correlation).

## Recommended build order
1. **Quick wins first (days):** ULTIMATE-001, 002, 008 — cheap, no gates, immediate quality lift.
2. **Tier-1 core (the dual-audience on-ramp):** 003, 004, 005, 006, 009, then 007 (food search, larger).
3. **Founder-decision batch (before their Tier-2 items can build):** modes/feedback (017/018),
   ED-safety-adjacent (019/020), exercise media + licence/spend (021), engine-touching (022, U-G-3/5/6).
   Route all `src/coaching/safety/` and billing items to the safety/billing owners.
4. **Then** the remaining Tier-2/3/4 by priority.

---
# Full proposal blueprints (bodies)


<!-- ============ phase5/proposals-A-training-execution.md ============ -->

# Phase 5 proposals — CLUSTER A: Training execution

Buildable proposals for the workout-logging screen and the exercise-library /
technique surface. British English. Each block follows
`phase5/_PROPOSAL-FORMAT.md` exactly. No code has been changed — these are
blueprints.

**Sources read in full for this cluster:**
- `docs/ultimate-audit-2026-06-13/phase3/compare-01-workout-screen.md` (gaps/leads/lags + statuses)
- `docs/ultimate-audit-2026-06-13/phase3/compare-08-exercise-library.md` (gaps/leads/lags + statuses)
- `docs/ultimate-audit-2026-06-13/phase1/01-workout-session.md` (file:line, resolved px)
- `docs/ultimate-audit-2026-06-13/phase1/02-workout-build-history.md` (adjacent surfaces, file:line)
- `docs/ultimate-audit-2026-06-13/phase1/10-share-exercise.md` (ExerciseDetail, file:line)
- `docs/ultimate-audit-2026-06-13/ultimate-audit-01-workout-screen-proposal.md` (prior proposal — reconciled below)

**Reconciliation with the existing `ultimate-audit-01-workout-screen-proposal.md`:**
That document already proposed six low-risk workout-screen items (raise weight/reps
value 20→24pt; raise status chips 11→13pt; widen header-icon hitSlop to 44pt;
enforce single guidance element on first set; add the ≤2-tap + Log-reachable
invariant test; small-phone keyboard check). Those are NOT re-issued here as new
IDs. The proposals below are the items that document did NOT cover or only
flagged as ASK-FIRST/out-of-scope: the banner-stacking fix (U-A-1), the
sub-44px non-header controls (U-A-3), the plate-maths helper (U-A-4), and the
no-confirm-log safety nudge (U-A-5). U-A-2 (card-header type) overlaps the prior
doc's "raise status chips" item but extends it to the orientation/coach lines
that the prior doc explicitly chose to KEEP at 13pt — so it is presented here as
a distinct, founder-decidable variant and cross-referenced. The exercise-library
proposals (U-A-6, U-A-7, U-A-8) are wholly new — the prior doc covered the
active-logging screen only.

---

```
ID: U-A-1
AREA: Workout logging screen — Active Workout layout
TITLE: Pin the beat line + inputs above the fold; collapse stacked banners into one rail
SUGGESTED TIER: 1 Critical
IMPACT (1-10): 9 — The single most-frequent market complaint is "too many taps to log a set" (F6.1, PARTIAL) and the verified best-in-class rule is that previous data stays always-visible at the input, never behind scroll/tap (F1.1+F3.1, VERIFIED). Banner stacking directly defeats Volyume's own strongest asset (the beat line). It degrades the highest-frequency screen in the app for every user with banners active.
EFFORT (1-10): 5 — Layout/composition change only, no engine touch. The banners already exist as discrete conditional blocks (file:line below); the work is to constrain how many render above the card simultaneously and verify fold position. No new data, no gating change. Risk is regression of an existing well-loved layout, so it needs the invariant test (U-A-9-style) and a real small-phone walk.
CURRENT STATE: Between the header and the set-entry card, up to seven optional blocks can stack: starter-session banner (ActiveWorkoutScreen.js:1393-1406), superset chip (:1487-1494), next-time coaching notes — up to several (:1498-1514), deload "Recovery week" banner (:1517-1534), target line (:1537-1544), rest timer (:1551), and "Target reached" banner (:1554-1561). The set-entry card (:1564-1742) — which holds the beat line (:1605-1672) and the weight/reps inputs (SetEntry.js:42-133) — sits below all of them. Body is a single ScrollView (:1443). RestTimer already has a short-screen path (COMPACT_SCREEN, RestTimer.js:17) but it is computed once at module load and does not react at runtime (phase1/01 :185-189).
THE PROBLEM: When several banners co-occur, the beat line and the actual inputs are pushed below the fold; worst case the inputs themselves require scrolling (phase1/01 CURRENT WEAKNESSES :107-110, EXTRA §4 :315-327). NEWBIE impact: a first-timer who cannot yet filter signal faces a wall of banners before the one action they understand ("Weight", "Reps", "Log set"); clutter is "disproportionately costly" for newbies (F1.2, PARTIAL). ATHLETE impact: the always-visible previous-number anchor that makes fast logging possible is the thing pushed off-screen, forcing a scroll mid-rest under time pressure — exactly the friction the market punishes (F1.1, VERIFIED; F6.1, PARTIAL).
THE EVIDENCE: compare-01 WHERE WE LAG "Banner stacking pushes inputs/previous-data below the fold" (F1.1+F3.1, VERIFIED for the always-visible-previous-data standard). compare-01 USER SENTIMENT: "perfect" defined by ABSENCE/speed (VERIFIED App Store quotes). "Too many taps" most-frequent complaint (F6.1, PARTIAL — Reddit-via-aggregator). Implementation facts: phase1/01 :107-110, :315-327, banner file:lines above.
BEST REFERENCE IMPLEMENTATION: Strong — built on the assumption the user is mid-rest under time pressure, previous weight/reps pre-loaded and visible at the input on open (F6.1/F3.1, VERIFIED; https://repreturn.com/strong-app-vs-hevy/). Setgraph/FitNotes minimalism ("very minimal, easy layout", VERIFIED) reinforce: nothing between the user and the input.
PROPOSED SOLUTION: Guarantee that the set-entry card's beat line and the first input row are within the initial viewport on a 5.4" device in the default state. Concretely: (a) cap the pre-card banner region to at most ONE banner visible at a time, by priority (rest timer when running > deload > target-reached > next-time note > superset chip > starter), with the rest collapsed into a single compact, tappable "N notes" affordance that expands on demand; (b) move the non-urgent target line (:1537-1544) and superset chip (:1487-1494) into the card header region or behind the existing ⋯ info sheet rather than above the card; (c) keep the rest timer's existing compact path but recompute it on layout change, not only at module load (phase1/01 :185-189 flags the once-at-load limitation). NOT a redesign of the card itself — the card already matches best-in-class (prior proposal headline).
NEWBIE EXPERIENCE: On opening any set, the newbie sees the exercise name, the orientation line, the beat line/first-time target, and the inputs — nothing else competing. Guidance is reachable but not stacked in front of them. This is the "tell me exactly what to do, on one uncluttered surface" the research says beginners need (F7.1, PARTIAL).
ATHLETE EXPERIENCE: The previous-session numbers are always visible at the input without scrolling, matching Strong/Hevy. Deload/superset/next-time context is one tap away, never blocking the log. Mid-rest, the athlete confirms-and-logs in ≤2 taps with no scroll (F6.1/F8.1).
IMPLEMENTATION BLUEPRINT: Files: `src/screens/ActiveWorkoutScreen.js` only (banners and card all live here). Affected blocks by file:line — starter (:1393-1406), nav strip (:1409-1441, leave as-is), superset chip (:1487-1494), next-time notes (:1498-1514), deload (:1517-1534), target line (:1537-1544), rest timer mount (:1551), target-reached (:1554-1561), set-entry card (:1564-1742), beat line (:1605-1672). Introduce a single priority-ranked "context rail" component above the card that renders at most one block and collapses the remainder into a tappable summary chip. NAVIGATION PLACEMENT: unchanged — same route (`ActiveWorkout`, RootNavigator.js:295). GATING: none — FREE feature, ungated (phase1/01 :79-85); change introduces no tier read. EMPTY/LOADED/ERROR: empty (no banners) → card sits directly under header/nav, no change; loaded (banners present) → one shows, rest collapse; the rest timer when running takes top priority (it is the time-critical one). EDGE CASES: 5.4" device + larger-text 1.2× (theme.js:325-337) is the worst case — verify beat line + first input row visible; KeyboardAvoidingView is `padding` iOS / `undefined` Android (:1355) so on small Android the number pad can still obscure — verify the input + Log stay reachable with the pad up (this is the prior proposal's small-phone item, reused). NOT DETERMINED IN CODE — confirm before building: the exact intended priority ordering of the banners is a product decision, not in code; the proposed order above is a recommendation to confirm. Whether collapsing the target line off the main surface is acceptable to the founder is a layout judgement call.
VERIFICATION: PARTIAL-dependent on F6.1 (Reddit "too many taps", PARTIAL) and F1.2/F7.1 (newbie clutter cost, PARTIAL); the core always-visible-previous-data standard it rests on is VERIFIED (F1.1+F3.1). Banner file:lines VERIFIED in phase1/01. Banner priority order NOT DETERMINED — founder confirm. Not FOUNDER-GATE (no engine/billing/safety/gating touch) but is larger than one line → plan-first per CLAUDE.md.
```

```
ID: U-A-2
AREA: Workout logging screen — set-entry card typography
TITLE: Lift the card-header data lines off the sub-body floor without adding height
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — The densest, smallest-text zone sits exactly where the eye must land fastest (the orientation/beat/coach lines directly above the inputs). The only citable type anchor is the platform standard "body ≥16-17pt, never below 16px" (F2.2, VERIFIED platform standard). Real but lower-impact than the layout fix, and partly addressed already by the prior proposal.
EFFORT (1-10): 2 — Token swaps on named styles, all flowing through `fontSize` tokens so accessibility 1.2× and OS Dynamic Type keep working. No layout reflow if the beat-line value (already `md`/16) is left as the anchor.
CURRENT STATE: The three card-header lines are all small: orientation line `fontSize.sm`=13px (`orientationText`, ActiveWorkoutScreen.js:2451); beat-line LABEL `sm`=13px (`beatLineLabel`, :2453) with the beat-line VALUE — the actual previous numbers — at `md`=16px (`beatLineValue`, :2454); coach line `sm`=13px (`coachLineText`, :2457). Status chips (superset `xs`=11px :2503; first-set hint `xs`=11px :2448) sit below the 16px floor. The exercise name is `xxl`=24px (`exerciseName`, :2420).
THE PROBLEM: The beat-line VALUE is already at the 16px body floor (good, F2.2) but the surrounding labels and the coach/orientation lines at 13px, plus the 11px chips/hints, form a dense grey block at the most-scanned point of the screen (compare-01 WHERE WE LAG "Dense, small-text card-header zone", VERIFIED platform standard F2.2). NEWBIE impact: a first-timer reading "Set 1 of 3 · Working", "Last: … · Target …" and the first-set hint together, all small and grey, gets the densest text where they most need clarity. ATHLETE impact: lower — they parse it fast — but the 11px chips are below the floor for anyone with reduced vision.
THE EVIDENCE: compare-01 WHERE WE LAG "Dense, small-text card-header zone" (F2.2, VERIFIED platform standard; NB no competitor discloses in-app font sizes — F2.1 NOT-FOUND — so this is measured against the platform standard only, not a rival value). Implementation facts: phase1/01 EXTRA §1 :239-244, :214, :238; resolved px in phase1/01 header.
BEST REFERENCE IMPLEMENTATION: No app discloses its in-app type sizes (F2.1, NOT-FOUND), so there is no reference VALUE — only the platform standard (iOS 17pt body / Android 16sp / never <16px, F2.2, VERIFIED, https://fontfyi.com/blog/mobile-typography-accessibility/). This proposal is measured against that standard, NOT a competitor.
PROPOSED SOLUTION: Raise the two sub-floor status elements off 11px to `sm`=13px — superset chip (`supersetChipText`, :2503) and first-set hint (`firstSetHintText`, :2448) — matching the prior proposal's "raise status chips 11→13pt" item (so this part is the SAME change, recorded for completeness). NEW beyond the prior doc: keep the beat-line VALUE as the 16px anchor (do not shrink), and OPTIONALLY consider whether the beat-line LABEL "Last:" prefix can drop to caption weight so the VALUE reads as the dominant element in that line. Do NOT raise the orientation/coach lines to 16px — the prior proposal deliberately keeps them at 13px as secondary context; this proposal respects that and confines the change to the sub-floor elements. The point is: no element below 13px in the card header, and the previous-numbers value remains the visual anchor.
NEWBIE EXPERIENCE: The first-set hint and any chips are legible at 13px rather than 11px; the previous-numbers value stays the boldest thing in the beat line, so the newbie's eye lands on "what to put in".
ATHLETE EXPERIENCE: No change to the data they read; the chips are slightly more legible. No added height, so nothing pushes the input down.
IMPLEMENTATION BLUEPRINT: File: `src/screens/ActiveWorkoutScreen.js`. Styles to change: `supersetChipText` (:2503) `fontSize.xs`→`sm`; `firstSetHintText` (:2448) `fontSize.xs`→`sm`. Leave `orientationText` (:2451), `beatLineLabel` (:2453), `beatLineValue` (:2454), `coachLineText` (:2457) unchanged unless founder elects the optional label-de-emphasis. MANDATORY: every value flows through `fontSize` tokens (theme.js:256-266) so the 1.2× larger-text swap (theme.js:325-338) and OS Dynamic Type keep working — no hard-coded px. NAVIGATION: unchanged. GATING: none (FREE). EMPTY/LOADED/ERROR: no state dependence — pure style. EDGE CASES: at 1.2× larger-text, 13px → ~15.6px; verify the extra height across the three lines does not push the first input below the fold on a 5.4" device (ties to U-A-1's fold guarantee). NOT DETERMINED: whether the founder wants the optional beat-line label de-emphasis — present as a choice, do not assume.
VERIFICATION: VERIFIED against the platform type standard (F2.2). F2.1 (no competitor font value) is NOT-FOUND and honoured — this is not benchmarked against a rival. Overlaps the prior `ultimate-audit-01` "raise status chips" item by design (same two styles). Not FOUNDER-GATE.
```

```
ID: U-A-3
AREA: Workout logging screen — touch targets (non-header controls)
TITLE: Bring the beat line, orientation row, Swap and inputs to a 44px effective target
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — The market standard is WCAG/iOS 44×44 and explicitly warns against tiny targets for numb/sweaty hands (F2.3 VERIFIED; F5.1 PARTIAL). A mis-tap on the beat line applies the wrong previous numbers; a mis-tap on Swap launches a full-screen flow over the log — both are high-cost slips mid-effort. Affects every set logged.
EFFORT (1-10): 3 — hitSlop / padding adjustments on named controls; the prior proposal already covers the HEADER icons (X/Finish), so this is the remaining non-header set. No engine/gating touch.
CURRENT STATE (phase1/01 VISUAL touch-targets, EXTRA §7): beat-line tap ≈27px (paddingVertical `spacing.xs`=4 + hitSlop 4; `beatLine` :2452, applied :1647); orientation row ≈33px box (~45 with slop; :2450, :1593); "Swap" button <44px (paddingVertical `spacing.xs`=4 + hitSlop 8; `swapBtnText` :2421, :1457); "⋯" overflow 36×36 + hitSlop ≈44 borderline (:2494, :1476); weight/reps text inputs ≈36px tall (paddingVertical `spacing.sm`=8; SetEntry.js:220-228). The 52×52 steppers (SetEntry.js:207-213) and the filled Log button (`paddingVertical spacing.lg`=16, :2463) already PASS.
THE PROBLEM: The thin tappable text strips (beat line ~27px, orientation row) sit immediately above the inputs; a sweaty/numb thumb reaching for the weight stepper can slip onto them — applying wrong previous numbers (beat line, :1635) or opening the set-type sheet (:1589) (phase1/01 EXTRA §7 :366-368). The Swap target is small and adjacent to ⋯, and a wet mis-tap launches a full-screen swap over the logging surface (§7 :369-371). The direct-tap-to-type inputs are <44px tall (§7 :372-376). NEWBIE impact: accidental sheet/swap launches are confusing and break the simple loop. ATHLETE impact: the "sweaty/numb hands mid-set" failure mode is precisely the one the market warns about (F5.1).
THE EVIDENCE: compare-01 WHERE WE LAG "Sub-44px edge/strip controls for fatigued hands" (F2.3 VERIFIED, https://fontfyi.com/blog/mobile-typography-accessibility/; F5.1 PARTIAL, https://developer.apple.com/forums/thread/678265). compare-01 CURRENT STRENGTHS confirm the steppers/primary button already PASS (F5.1/F8.1). Implementation facts: phase1/01 VISUAL touch-targets :160-166, EXTRA §7 :358-382.
BEST REFERENCE IMPLEMENTATION: The standard itself — WCAG 2.5.5 / iOS Human Interface 44pt minimum (F2.3, VERIFIED). Strong/Hevy's large easy-to-tap controls and "no tiny swipes" are the design exemplar (F5.1, PARTIAL/VERIFIED).
PROPOSED SOLUTION: Raise the effective tap area of each flagged non-header control to ≥44px via hitSlop and/or padding, WITHOUT growing the visible card height where possible (hitSlop expands the touch region invisibly): beat line `beatLine` (:2452) — widen hitSlop from 4 to reach 44px tall; orientation row (:2450) — confirm ≥44 (currently borderline ~45 with slop, may pass); "Swap" (`swapBtnText`/:1457) — widen to 44px OR (cross-ref phase1/01 EXTRA §5 item 3) consider removing the dedicated Swap button entirely since swap already lives in the ⋯ overflow sheet (:2112-2122) — that would remove a small target and a mis-tap risk at once (founder choice); "⋯" (:2494) — confirm 44 with slop; text inputs (SetEntry.js:220-228) — raise paddingVertical so the row is ≥44px tall. Keep the 52×52 steppers and Log button unchanged (already PASS).
NEWBIE EXPERIENCE: Fewer accidental sheet/swap launches; the simple loop stays simple. If Swap is removed from the title row, one fewer mystery control next to the inputs.
ATHLETE EXPERIENCE: Reliable taps with sweaty/chalked hands; no accidental wrong-previous-numbers application mid-set.
IMPLEMENTATION BLUEPRINT: Files: `src/screens/ActiveWorkoutScreen.js` (beat line, orientation row, Swap, overflow) and `src/components/SetEntry.js` (text inputs). Specific: beat-line hitSlop at apply-handler mount (:1647) and/or `beatLine` style (:2452); orientation row hitSlop (:1593)/style (:2450); Swap hitSlop (:1457)/`swapBtnText` (:2421) — or remove the button (render block :1451-1484, the dedicated Swap is :1454-1463); overflow hitSlop (:1476); inputs `valueInput`/row padding (SetEntry.js:220-228). NAVIGATION: unchanged. GATING: none (FREE). EMPTY/LOADED/ERROR: no state dependence. EDGE CASES: hitSlop on stacked strips (beat line directly above orientation row directly above inputs) must not OVERLAP into each other's regions — verify the expanded touch zones do not collide, or the slip problem gets worse not better. The HEADER X/Finish targets are NOT in scope here — they are the prior proposal's "widen header-icon hitSlop" item. NOT DETERMINED: whether to remove the dedicated Swap button (phase1/01 flags it as removable, EXTRA §5) is a founder choice — present both options.
VERIFICATION: VERIFIED standard (F2.3). F5.1 (sweaty-hand sentiment) PARTIAL — the size fix itself rests on the VERIFIED 44px standard, so the proposal is sound regardless. Element sizes VERIFIED in phase1/01. Swap-removal is a founder choice, not an assumption. Not FOUNDER-GATE.
```

```
ID: U-A-4
AREA: Workout logging screen — plate-maths / bar-loading helper
TITLE: Surface the existing-but-unused plate-loading helper for barbell lifts
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — Present in the market (Caliber, Gravitus cite plate calc, PARTIAL) and a real convenience for barbell work, but the market leaders Strong/Hevy are loved without it being the headline; it is a "nice gap to fill" not a churn driver. A `plateBtn` style already EXISTS in Volyume but is unused, suggesting it was scoped then dropped.
EFFORT (1-10): 4 — A style hook exists (`plateBtn`, SetEntry.js:173) but the helper logic and render are NOT present; the maths (plates per side from a target weight, bar weight, available plates) and a small modal/inline display must be built. Offline-only computation, no engine boundary.
CURRENT STATE: No plate-maths/bar-loading helper renders. A `plateBtn` style exists at SetEntry.js:173 but is UNUSED in render (phase1/01 ATHLETE QUESTION :135; CURRENT WEAKNESSES context). The weight value is logged via the 52×52 steppers / input (SetEntry.js:207-228).
THE PROBLEM: A lifter loading a barbell must do plates-per-side maths in their head (e.g. 100kg target, 20kg bar → 40kg per side → 1×20 + … ). NEWBIE impact: a beginner often does not know how to load a bar at all — this is a genuine knowledge gap, and the helper would teach it. ATHLETE impact: minor convenience; experienced lifters do the maths fast but appreciate a checker for awkward numbers.
THE EVIDENCE: compare-01 MISSING ENTIRELY "Plate-maths / bar-loading helper — present in market (Caliber, Gravitus cite plate calc; PARTIAL, MARKET §1 #10/#16); a `plateBtn` style exists in Volyume but is unused in render (phase1/01 :135)". Status: PARTIAL (the market presence is PARTIAL; the unused-style fact is VERIFIED in code).
BEST REFERENCE IMPLEMENTATION: Caliber / Gravitus plate calculators (PARTIAL, MARKET §1 #10/#16). No VERIFIED exemplar — flagged evidence-thin on the market side.
PROPOSED SOLUTION: For barbell exercises, add a small "Plates" affordance (using the existing `plateBtn` style, SetEntry.js:173) beside the weight input that opens a compact display showing plates-per-side for the current weight value, given a configurable bar weight (default 20kg/45lb) and a standard plate set. Read-only helper — it does not change the logged value, it explains how to load it. Offline, on-device computation only.
NEWBIE EXPERIENCE: A first-timer who does not know how to load a bar taps "Plates" and sees "Per side: 1×20kg + 1×5kg" — turning a blocking knowledge gap into a glanceable answer.
ATHLETE EXPERIENCE: A quick checker for awkward loads; ignorable otherwise. Does not add height to the default surface (it is behind a tap).
IMPLEMENTATION BLUEPRINT: File: `src/components/SetEntry.js`. The `plateBtn` style already exists (:173) — wire a control that uses it near the weight row (weight row is SetEntry.js:42-133). Show ONLY for barbell-equipment exercises (equipment data exists on the exercise — cf. ExerciseDetail tag chips, 10-share-exercise.md :86 equipment :315-319; the equipment field is on the exercise object). GATING: this is a logging-screen helper; workout logging is FREE (phase1/01 :79-85) — keep it FREE, do not gate. EMPTY/LOADED/ERROR: if the weight is not cleanly loadable with standard plates, show the nearest achievable + remainder; if equipment is not barbell, do not render the affordance at all. EDGE CASES: lb vs kg units (the app has a `units` value; honour it — note phase1/02 flags hardcoded-kg inconsistencies elsewhere, cross-screen :722-726 — do NOT repeat that bug here, use `units`); micro-plates / non-standard bars are out of scope unless founder wants configurability. NOT DETERMINED IN CODE — confirm before building: the available plate denominations and default bar weight are NOT defined anywhere read; the plate-calc logic does NOT exist (only the style does); whether a configurable plate inventory is wanted. These must be specced before building.
VERIFICATION: evidence-thin on the market side (F-equivalent is PARTIAL; no VERIFIED reference implementation). The unused-`plateBtn`-style fact is VERIFIED in code (phase1/01 :135). Plate-calc logic, denominations and bar weight are NOT DETERMINED IN CODE. Not FOUNDER-GATE (no engine/billing/safety) but lowest-priority and needs a spec — recommend founder confirm scope before build.
```

```
ID: U-A-5
AREA: Workout logging screen — one-tap log safety
TITLE: Prevent a stray tap committing an unconfirmed default rep count
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — A wet-thumb mis-tap on the large amber Log button commits a set whose reps were never confirmed (reps default to 8). This pollutes the user's own training history and the data the deterministic engine reads. Real-data-integrity issue on the highest-frequency screen, though not a market-comparison gap.
EFFORT (1-10): 3 — Logic guard around the existing log handler; no UI rebuild. Must be careful not to ADD taps to the loved ≤2-tap path (F6.1) — the guard must only trigger on the genuinely-unconfirmed first set, not the normal accept-previous flow.
CURRENT STATE: `DEFAULT_SET` reps = 8 (ActiveWorkoutScreen.js:35). A set can be logged in 1 tap — just "Log set" (:1829 → `handleCompleteSet` :736) — and saves with NO further confirmation even if the user never touched the rep count (phase1/01 CURRENT WEAKNESSES :117-118; EXTRA §3 :304-306; EXTRA §7 :377-379). When previous data exists, both weight and reps are pre-filled by `loadHistory` (:640-658) — in that case the pre-fill IS a deliberate confirmable value.
THE PROBLEM: On a FIRST set with no previous data, reps sit at the default 8 that the user never chose; a stray tap on the prominent amber button logs "X kg × 8" silently (phase1/01 :117-118, :377-379). NEWBIE impact: a beginner may not notice the reps were auto-set and log wrong data, then trust a corrupted history. ATHLETE impact: rare but high-cost — a mis-logged set skews tonnage and the engine's reads. NOTE: this is the ONE element of the loved fast-log path that carries a real downside — the fix must NOT slow the legitimate ≤2-tap path.
THE EVIDENCE: phase1/01 CURRENT WEAKNESSES :117-118 ("Reps default to a pre-filled value (DEFAULT_SET reps:8) — a logged set can be saved without the user ever confirming the rep count"); EXTRA §3 :304-306; EXTRA §7 :377-379 ("No confirm on the one-tap log"). This is an INTERNAL code finding, NOT a market-comparison finding — it does not trace to an Fx.y. Flagged accordingly.
BEST REFERENCE IMPLEMENTATION: Not a market-comparison item — no external reference. The design constraint comes from Volyume's own deterministic-data integrity and the SACRED engine boundary (the engine reads logged sets; garbage-in must be minimised). The ≤2-tap benchmark (Strong, F6.1 VERIFIED) is the constraint NOT to violate.
PROPOSED SOLUTION: On a set where reps were NEVER touched AND no previous-session value was applied (i.e. the value is the raw `DEFAULT_SET` default, not a user-confirmed or pre-filled-from-history number), require a light confirmation before commit — e.g. focus/highlight the reps field once, or a single inline "is this 8 reps?" confirm — WITHOUT adding a tap to the normal accept-previous-then-Log path (which is a confirmed value and must stay 2 taps). Do NOT change `DEFAULT_SET` and do NOT touch the engine. This is purely a guard on the commit path for the genuinely-unconfirmed case.
NEWBIE EXPERIENCE: The first time they log with the untouched default, they are nudged to confirm the rep count once, learning that reps are theirs to set — then never blocked again on confirmed values.
ATHLETE EXPERIENCE: The fast path they rely on is untouched (pre-filled-from-history = confirmed). Only the raw-default case is guarded, which an athlete rarely hits.
IMPLEMENTATION BLUEPRINT: File: `src/screens/ActiveWorkoutScreen.js`. Guard sits in/around `handleCompleteSet` (:736), gated on a "reps untouched AND not applied-from-history" condition. `DEFAULT_SET` (:35) and `loadHistory` pre-fill (:640-658) are the inputs that define "touched/applied". The beat-line apply path (:1635) and one-tap pre-filled path (EXTRA §3 :304-306) must remain ≤2 taps. NAVIGATION: unchanged. GATING: none (FREE). EMPTY/LOADED/ERROR: only the no-history first-set default state triggers the guard; history-present states are unaffected. EDGE CASES: must not fire when the user has accepted the previous numbers (those are confirmed); must not fire on warm-up sets if those carry their own defaults — confirm the exact set-state matrix. ENGINE BOUNDARY: this changes only what reaches the data store, not the engine's logic — but because logged sets feed the deterministic engine, treat any change to what gets committed as adjacent to the SACRED boundary and confirm with the founder. NOT DETERMINED IN CODE — confirm before building: the precise "touched vs untouched" tracking does not exist in the read code; whether warm-up/other set types share the default; the founder's preferred confirmation UX (focus-field vs inline confirm).
VERIFICATION: NOT a market-comparison finding — traces to an INTERNAL Phase-1 code finding only (phase1/01 :117-118, :377-379), so flagged evidence-thin against the audit's traceability rule (no Fx.y). The code facts are VERIFIED. Adjacent to the deterministic-engine SACRED boundary (logged-set data feeds it) → flag FOUNDER-GATE for confirmation that guarding the commit path is acceptable. Must preserve the ≤2-tap path (F6.1 VERIFIED).
```

```
ID: U-A-6
AREA: Exercise library / technique — visual demonstration
TITLE: Add a tap-to-watch looping demo clip to ExerciseDetail (text stays primary)
SUGGESTED TIER: 1 Critical
IMPACT (1-10): 9 — Stated as Volyume's "single biggest gap in this area" (compare-08 WHERE WE LAG). The strongest VERIFIED UX evidence in the cluster is that a short, immediately-looping clip is the highest-engagement instructional unit (NN/g, VERIFIED). Best-in-class (Jefit/Hevy) ships short HD clips and earns explicit praise for them. Directly serves the newbie who today gets no way to copy a movement.
EFFORT (1-10): 8 — Volyume imports NO Image component on this screen (10-share-exercise.md :164) — the demo affordance does not exist; a media component, an asset/source strategy, and offline-first storage must be built. Demo-source catalogues exist (ExerciseDB, MoveKit, GymVisual — VERIFIED licences) but selecting/licensing/bundling assets is substantial. Offline-first constraint (CLAUDE.md) means on-device assets, raising size questions.
CURRENT STATE: ExerciseDetailScreen technique guidance is TEXT-ONLY: "How to do it" renders `formTip ?? exercise.notes` where `formTip = FORM_TIPS[exercise.name]` (ExerciseDetailScreen.js:246, 672-679). There is NO image, illustration, GIF, animation or video anywhere — the file imports no Image component (10-share-exercise.md :164; imports 1-31 cover RN primitives, Ionicons, VolyumeChart, Skeleton, AnimatedEntrance, InfoTooltip only). The only graphics are Ionicons glyphs, emoji medals (608-609) and the strength-trend chart.
THE PROBLEM: A first-time gym-goer gets no picture/diagram/GIF/video to copy a movement from; text like "elbows at roughly 45-75° from your torso" assumes vocabulary a beginner lacks (compare-08 NEWBIE VERDICT). NEWBIE impact: severe — demo-only/text-only is a documented churn cause and newbies want demonstration PLUS cue text (Fitbod "didn't give enough form guidance", PARTIAL). ATHLETE impact: low — athletes are less format-sensitive and often skip demos (NN/g, VERIFIED), so the clip must be RETRIEVABLE not forced.
THE EVIDENCE: compare-08 WHERE WE LAG "NO visual demonstration of any kind … This is Volyume's single biggest gap in this area" (Phase-1 finding ExerciseDetailScreen.js:164, VERIFIED in code; NN/g short-looping-clip = highest-engagement VERIFIED). MISSING ENTIRELY "Any demonstration media" and "Tap-to-watch demo retrievable on demand … the verified ideal: text + tap-to-watch, never forced/auto-blocking — NN/g VERIFIED". USER SENTIMENT: users resent video as the SOLE path; want text + tap-to-watch ("I like to read first", NN/g VERIFIED); format CONSISTENCY matters more than choice (MoveKit, VERIFIED).
BEST REFERENCE IMPLEMENTATION: Jefit / Hevy — short HD looping rep clip + named target muscles + step text per exercise; Hevy clips earn "Amazing quality videos" (PARTIAL, https://www.hotelgyms.com/blog/hevy-workout-app-review-...; Jefit https://www.gymbird.com/fitness-apps/fitbod-vs-jefit). The VERIFIED principle behind it: 3-6s looping clip, "shorter is better" (NN/g, https://www.nngroup.com/articles/instructional-video-guidelines/).
PROPOSED SOLUTION: Add a tap-to-watch looping demo clip to ExerciseDetailScreen, placed with the "How to do it" section, so TEXT remains the primary/default and the clip is an opt-in tap (never auto-playing, never blocking) — exactly the NN/g verified ideal. Use ONE consistent media format across all exercises (MoveKit consistency finding, VERIFIED — mixed styles read as low-quality). Assets must be on-device to honour offline-first (CLAUDE.md). Keep the existing text tip as the fallback/companion. Do NOT auto-play or force the video.
NEWBIE EXPERIENCE: Reads the cue text, then taps to watch a short looping clip and copies the movement — closing the documented churn gap. Never forced to watch.
ATHLETE EXPERIENCE: Ignores the clip by default (text/data primary); taps it only for an unfamiliar or complex lift. No clutter added to their flow.
IMPLEMENTATION BLUEPRINT: File: `src/screens/ExerciseDetailScreen.js`. Place the affordance with the "How to do it" section (render :672-679; section is conditional on `formTip || exercise.notes` today — the demo should have its OWN presence condition, see U-A-7). A media component must be ADDED (no Image/Video import exists today, :164). GATING: ExerciseDetail surfaces exercise-library data, which CLAUDE.md lists as FREE; the screen has no tier guard today (10-share-exercise.md :102 GATING NOT DETERMINED IN CODE — confirm). Keep demo media FREE unless the founder decides otherwise — exercise library is a FREE feature per CLAUDE.md, so gating it Pro would breach "Never gate a free feature behind Pro". EMPTY/LOADED/ERROR: no clip for an exercise → fall back to text only (no broken affordance); clip loading → skeleton/placeholder; clip fails to load → silent fall back to text (mirror the screen's existing skeleton/empty handling, :232-244, :552, :592-599). OFFLINE-FIRST: assets on-device (CLAUDE.md architecture rule) — a streamed-only solution would violate "every feature works with no internet". EDGE CASES: ED-safety posture — the research flags AI-generated demos carry documented body-image harm concerns (compare-08 USER SENTIMENT, PARTIAL) and "AI demos not reliably premium / 'meme/pointless'" (Strava, VERIFIED) → do NOT use AI-generated demo media; and per CLAUDE.md no AI may be introduced silently. NOT DETERMINED IN CODE — confirm before building: which media format (video vs animation vs GIF — raw user FORMAT preference was NOT FOUND in research, compare-08 USER SENTIMENT/VERIFICATION); the asset SOURCE and licence (catalogues are VERIFIED to exist but selection/licence is a decision); on-device storage budget; coverage (how many of the library's exercises get a clip — the market band is ~1,000-1,500 with common lifts fully covered, PARTIAL); whether a custom-exercise gets a clip (custom-exercise path itself NOT DETERMINED, compare-08 MISSING ENTIRELY).
VERIFICATION: The CORE principle (short looping clip = highest engagement; text + tap-to-watch ideal; consistency matters) is VERIFIED (NN/g, MoveKit). The competitor exemplars (Jefit/Hevy clip praise) and the churn finding (Fitbod) are PARTIAL. Raw FORMAT preference (video vs animation vs photo) is NOT FOUND — so the format choice is NOT DETERMINED and must be a founder decision, not an assumption. The "no Image import / text-only" code fact is VERIFIED. AI-generated media is ruled OUT (SACRED no-AI rule + ED-safety concern) → flag FOUNDER-GATE on the no-AI constraint and the offline-asset strategy. High effort + several NOT-DETERMINED inputs → spec before build.
```

```
ID: U-A-7
AREA: Exercise library / technique — form-guidance robustness + common mistakes/safety
TITLE: Guarantee technique guidance always renders, and add common-mistakes/safety cues
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — Form guidance today is brittle: it renders ONLY when the exact exercise name matches FORM_TIPS or a notes field exists, otherwise the whole section is omitted (no guidance at all). Demo-only/insufficient-guidance is a documented churn cause (Fitbod, PARTIAL); text-only-AND-sometimes-absent is weaker still. Safety/common-mistakes guidance is entirely absent and aligns with Volyume's ED-safety/serious-coaching posture.
EFFORT (1-10): 5 — The render path exists (`formTip ?? exercise.notes`, ExerciseDetailScreen.js:672-679) but a robust fallback and a new mistakes/safety block must be authored; FORM_TIPS is keyed by EXACT exercise name (src/lib/formTips.js) so the brittleness is a data-coverage problem as much as a code one.
CURRENT STATE: "How to do it" renders `formTip ?? exercise.notes` and the section is CONDITIONAL on `(formTip || exercise.notes)` (ExerciseDetailScreen.js:672); `formTip = FORM_TIPS[exercise.name]` keyed by exact name (:246, src/lib/formTips.js). If neither a FORM_TIPS entry nor a notes value exists, NO form guidance renders at all (10-share-exercise.md :113, :162). A one-line coaching cue (`exercise.cue`) shows separately in a bulb card only if a cue exists (:252, 663-668). There is NO common-mistakes/safety/contraindication guidance beyond the prose tip (:163).
THE PROBLEM: For any exercise lacking a FORM_TIPS entry AND a notes field, a first-timer gets zero technique help (compare-08 WHERE WE LAG "Form guidance is brittle and conditional … otherwise omitted entirely (672)"). NEWBIE impact: high — the people who most need guidance can land on a blank technique section. ATHLETE impact: low for basic form, but common-mistakes/safety cues for complex/skill lifts are valued (Caliber advanced-cueing praise, PARTIAL) and align with a serious-coaching app.
THE EVIDENCE: compare-08 WHERE WE LAG "Form guidance is brittle and conditional: only present when the exact exercise name matches FORM_TIPS or carries a notes field, otherwise omitted entirely (672). Market evidence says demo-only / insufficient-form-guidance is a churn cause (Fitbod, PARTIAL)" and "No common-mistakes / safety / contraindication guidance beyond the prose tip (Phase-1, 163)". Caliber advanced-cueing praise (PARTIAL). Code facts VERIFIED (672, 163, 246).
BEST REFERENCE IMPLEMENTATION: Caliber — breakdowns of complex lifts (deadlift/bench phases) that even experienced users praise (PARTIAL, https://wellness.alibaba.com/fitlife/caliber-app-coaching-vs-cost-guide). For coverage discipline, JuggernautAI's curated ~300 exercises each WITH cues (PARTIAL) — counter-evidence that every exercise should at least carry cues.
PROPOSED SOLUTION: (a) Guarantee the "How to do it" section ALWAYS renders something useful — replace the silent omission (:672) with a sensible default (e.g. a category/movement-pattern-level generic cue keyed by muscle/equipment) when no exact-name FORM_TIPS entry and no notes exist, so a beginner never hits a blank. (b) Add a distinct "Common mistakes" / "Watch out for" block with short cues, and (c) where relevant, brief safety notes — TEXT cues authored deterministically (NOT AI-generated). Keep all of this as prose/cue content consistent with the existing tooltip-and-text voice. This pairs with U-A-6 (the clip) but stands alone if the clip is deferred.
NEWBIE EXPERIENCE: Every exercise now shows at least baseline technique guidance and a "common mistakes" steer — no blank section, fewer first-rep errors.
ATHLETE EXPERIENCE: Complex-lift mistake/safety cues add value for skill lifts; ignorable for trivial ones. No data-screen clutter (the form section is last, easily skipped — acceptable for them per compare-08 ATHLETE VERDICT).
IMPLEMENTATION BLUEPRINT: Files: `src/screens/ExerciseDetailScreen.js` (render :672-679, condition :672) and `src/lib/formTips.js` (the keyed-by-exact-name data, e.g. "Barbell Bench Press" at formTips.js:3). Change the section's render condition so it never silently omits; add a fallback path (generic cue by muscle/equipment — the exercise carries primary muscle + equipment, cf. tag chips :309-319). Add a "Common mistakes" block as a new section with its own data field. GATING: exercise library is FREE per CLAUDE.md; keep FREE — do not gate. The screen has no tier guard today (NOT DETERMINED, :102). EMPTY/LOADED/ERROR: the entire point is to remove the empty case — verify the fallback renders for an exercise with no FORM_TIPS and no notes; safety/mistakes block hidden only if genuinely none authored for that pattern. SAFETY-SYSTEM NOTE: this is GENERAL exercise technique/safety cueing, NOT the ED-safety system in src/coaching/safety/ — do NOT touch that system; keep any injury-safety copy as plain technique guidance, not calorie/ED logic. NO AI: all cues authored as static data — introducing AI to generate them would breach the SACRED no-AI rule. NOT DETERMINED IN CODE — confirm before building: the content/voice of the generic fallback cues; the source of the common-mistakes data (must be authored, not AI); how the muscle/equipment-keyed fallback maps (the mapping does not exist in read code).
VERIFICATION: The brittleness/omission code fact is VERIFIED (672, 246, formTips.js). The churn-cause (Fitbod) and Caliber-cueing evidence are PARTIAL. The fallback-content and mistakes-data sources are NOT DETERMINED — must be authored deterministically. Not the ED-safety system (general technique cueing only) but flag FOUNDER-GATE on the no-AI authoring constraint to be explicit. Not billing/gating.
```

```
ID: U-A-8
AREA: Exercise library / technique — anatomical "what am I working" layer
TITLE: Add a muscle-activation visual layer beyond the text muscle chips
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — Muscle & Motion's 3D activation animation is the VERIFIED benchmark for the "what am I working" question and is a distinct layer from a form clip. Genuinely educational for newbies, but it is a secondary layer behind the form-demo gap (U-A-6), and Volyume already states muscles as text chips, so the information is present — just not visual.
EFFORT (1-10): 8 — Like U-A-6, no Image/animation component exists on the screen (:164); a 3D/animated anatomical asset set is a large media + licensing undertaking, on-device for offline-first. MoveKit (~200 3D) and similar catalogues are VERIFIED to exist but integration is substantial.
CURRENT STATE: Muscles are stated as TEXT chips only — primary muscle (ExerciseDetailScreen.js:309), subregion (:311-314), "Also works:" secondary muscles list (:334-344). No anatomical/visual activation layer; no Image import (10-share-exercise.md :164, :86, :31).
THE PROBLEM: A beginner reading "primary: pectoralis major; also works: anterior deltoid, triceps" may not know where those muscles are or what the movement targets visually. NEWBIE impact: moderate — a visual "what am I working" answers a question text chips leave abstract. ATHLETE impact: low — they know their anatomy; this is education, not data they lack.
THE EVIDENCE: compare-08 WHERE WE LAG "No anatomical 'what am I working' visual layer; Volyume states muscles as text chips only. Muscle & Motion's 3D activation animation is the benchmark for this distinct layer (VERIFIED)". MISSING ENTIRELY "Anatomical muscle-activation animation layer (Muscle & Motion model, VERIFIED)". Code fact (text chips only, no Image) VERIFIED (:309-344, :164).
BEST REFERENCE IMPLEMENTATION: Muscle & Motion — 3D anatomical animation of primary/secondary activation across 1,200+ moves; the benchmark for "what am I working", a distinct layer from form video (VERIFIED, https://www.muscleandmotion.com/strength-training-app/). MoveKit ~200 3D as a consistency exemplar (VERIFIED).
PROPOSED SOLUTION: Add a muscle-activation visual layer on ExerciseDetail — e.g. a simple highlighted-muscle diagram (primary vs secondary shaded) keyed off the muscle chips that already exist — placed in/near the overview card. Start with a static highlighted-anatomy image keyed by the existing primary/secondary muscle data rather than full 3D animation (lower effort, same core benefit, offline-friendly), with animation as a later upgrade. NOT AI-generated. This is a SEPARATE layer from the U-A-6 form clip (the research is explicit they are distinct layers).
NEWBIE EXPERIENCE: Sees the worked muscles highlighted on a body diagram, connecting the text chips to actual anatomy.
ATHLETE EXPERIENCE: Ignorable; provides nothing they do not already know. No clutter on the data they care about (it sits in the overview, not on the trend/PR data).
IMPLEMENTATION BLUEPRINT: File: `src/screens/ExerciseDetailScreen.js`. Key off the EXISTING muscle data: primary (:309), subregion (:311-314), secondary "Also works" (:334-344). Place near the overview card (:306-377). A media/diagram component must be ADDED (none today, :164). GATING: exercise library is FREE per CLAUDE.md — keep FREE. EMPTY/LOADED/ERROR: if no diagram asset for the muscle set, fall back to the existing text chips only (current behaviour) — no broken state. OFFLINE-FIRST: on-device assets (CLAUDE.md). EDGE CASES: muscle-name → diagram-region mapping must cover the app's muscle taxonomy (MUSCLE_DISPLAY_NAMES is referenced elsewhere, phase1/02 :48); NO AI-generated anatomy (SACRED no-AI + ED-safety body-image concern, compare-08 USER SENTIMENT). NOT DETERMINED IN CODE — confirm before building: the asset source/licence; the muscle-taxonomy → diagram-region mapping (does not exist in read code); static-diagram vs animation scope; on-device storage budget. Lower priority than U-A-6 — recommend sequencing after the form clip.
VERIFICATION: The benchmark (Muscle & Motion 3D activation as the distinct "what am I working" layer) is VERIFIED. The "text chips only / no visual" code fact is VERIFIED (:309-344, :164). Asset source, mapping and scope are NOT DETERMINED. Enhancement tier, large effort. Flag FOUNDER-GATE on the no-AI constraint and offline-asset strategy (shared with U-A-6). Not billing/gating/ED-safety-system.
```

---

## Cluster note

U-A-1, U-A-2, U-A-3, U-A-5 sit on the live FREE workout-logging screen
(`ActiveWorkoutScreen.js` / `SetEntry.js`); none change tier, billing or the
deterministic engine, but U-A-5 is adjacent to the engine's data input and is
flagged FOUNDER-GATE for that reason. U-A-1's banner-priority order, U-A-3's
Swap-removal option, and U-A-4/U-A-6/U-A-7/U-A-8's media/data sources are all
NOT-DETERMINED product/spec decisions surfaced for founder input, not assumed.
The exercise-library media proposals (U-A-6, U-A-8) explicitly rule out
AI-generated assets per the SACRED no-AI rule and the ED-safety body-image
concern, and require an on-device offline-first asset strategy. The two
low-risk overlaps with the prior `ultimate-audit-01-workout-screen-proposal.md`
(status-chip type in U-A-2; header-icon hitSlop, which U-A-3 deliberately does
NOT re-cover) are called out so the dispatcher does not double-count them.


<!-- ============ phase5/proposals-B-coaching.md ============ -->

# Phase 5 proposals — CLUSTER B: Coaching, plan generation & check-in (2026-06-13)

Cluster sources (read in full):
- `phase3/compare-02-plan-generation.md`, `phase3/compare-03-coaching.md`, `phase3/compare-14-checkin.md`
- `phase1/04-coaching.md`, `phase1/05-checkin-safety.md`, `phase1/06-plans.md`

Sacred-constraint note carried throughout: the Precision Coaching engine is
**deterministic — no LLM, no AI** (compare-03 framing note line 7; CLAUDE.md). No
proposal below introduces AI. Anything that alters engine logic, the
`src/coaching/safety/` system, calorie floors, rapid-loss thresholds, or Beat-UK
signposting is flagged **FOUNDER-GATE** and treated as input only. Several
proposals are deliberately presentation-only (copy, layout, gating) so they can
ship without touching the engine boundary.

British English throughout. NEWBIE and ATHLETE experiences stated separately.

---

```
ID: U-B-1
AREA: Coaching — weekly output presentation
TITLE: Progressive disclosure of the ~14-card Precision Coaching output (one hero decision first)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the cold-start/overload churn point is named the prime churn driver across all three fragments (compare-03 WHERE WE LAG "Cold-start / overload", VERIFIED research 6.4/4.1; compare-14 NEWBIE VERDICT "every extra field is paid in churn, 71% abandon by month 3", F1.4 VERIFIED; review-floor "1-2 numbers + one action", F2.2 VERIFIED).
EFFORT (1-10): 5 — presentation-layer reorganisation of an existing screen; no engine change. The cards already exist and are individually rendered; the work is collapsing/prioritising them, not computing anything new.
CURRENT STATE: CoachOutputScreen renders up to ~14 distinct cards/blocks in one ScrollView (training, nutrition, plan-edit, two cardio notes, macro cycle, refeed, why, focus, rapid-loss, diet-break, forward line, held decisions, paywall, two credential notes) with multiple Apply buttons of identical visual weight and no single emphasised primary action; the most visually prominent control is the dismissive "Done" button (04-coaching.md:48-49,89; CoachOutputScreen.js cards :1561-1809, Done :1799-1801).
THE PROBLEM:
  - Newbie impact: a first-timer is "likely to overwhelm" — they meet "volume", "sets per muscle group", "deload", "refeed", "macro cycle", "maintenance calories" and several equal-weight Apply buttons at once, with no guided "here is the one thing to do" (04-coaching.md:52; compare-03 NEWBIE VERDICT).
  - Athlete impact: lower, but the redundancy and the lack of a primary action still costs scanning time; athletes are well served on substance (compare-03 ATHLETE VERDICT "Strongly served").
THE EVIDENCE:
  - compare-03 WHERE WE LAG "Cold-start / overload on the Pro screen" — VERIFIED (research 6.4 line 223, 4.1 line 127).
  - compare-14 WHERE WE LAG "Length / single-focus … 1-2 numbers + one action" — VERIFIED (F2.2). NOTE: the NUMERIC "too long" time limit is NOT FOUND in the research (compare-14 VERIFICATION); the argument rests on the 1-2-number principle (F2.2 VERIFIED), not a published threshold. Mark evidence-partial on the exact threshold only.
  - Phase-1 weaknesses 04-coaching.md:48-49 — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: MacroFactor — surfaces only the modules this week's data triggers and explains why each appeared (compare-14 BEST IN CLASS, F2.1 VERIFIED). Carbon Diet Coach — minimum-friction, adherence-gated (compare-14 BEST IN CLASS, F1.1 VERIFIED). Both reduce the decision count to what actually fired this week.
PROPOSED SOLUTION (presentation only — does NOT change which signals the engine produces):
  Restructure the existing CoachOutputScreen render order into three zones, surfacing the engine's already-computed outputs differently:
  1. A single "This week's main move" hero zone at the top: the engine's highest-priority firing adjustment (its existing primary signal) presented as ONE emphasised Apply action with its one-line "why".
  2. Secondary adjustments collapsed under a "More adjustments (N)" expander, expanded by the user, each retaining its existing Apply button and "Applied" chip exactly as today (confirm-then-apply preserved, CoachOutputScreen.js:1341-1345).
  3. Safety blocks (rapid-loss, diet-break, held decisions) remain ALWAYS-VISIBLE and never collapsed — these are surfaced unchanged.
  Determination of "main move" must use the engine's EXISTING priority/ordering output, NOT a new heuristic added in the screen. If the engine does not already expose a priority, this becomes FOUNDER-GATE (see VERIFICATION).
NEWBIE EXPERIENCE: Opens to one clear thing to do this week with its reason; everything else is one tap away if they want it. Removes the wall of equal-weight buttons.
ATHLETE EXPERIENCE: Taps "More adjustments" once and sees the full set they expect (volume signal, macro cycle, refeed, steps, cardio) — same controls, one extra tap. Could be given a SettingsCoaching "always expand all" preference (ties to U-B-9) so power users skip the collapse.
IMPLEMENTATION BLUEPRINT:
  - Screen: CoachOutputScreen.js. Reorder the card render block (currently :1561-1809) into hero / collapsed-secondary / always-visible-safety groups.
  - Hero card: reuse the existing TrainingNextWeekCard / NextWeekCard / DietBreakCard components (:1648-1749) — do NOT build a new card; promote one to the hero slot.
  - Collapse mechanism: reuse the CollapsibleSection pattern already in the codebase (MethodologyScreen.js CollapsibleSection, 04-coaching.md:184) for visual consistency.
  - Safety blocks NEVER collapse: RapidLossAlert (:1739), DietBreakCard (:1742), HeldDecisionsCard (:1759) stay in the always-visible zone. **This is a hard requirement — FOUNDER-GATE if collapsing any safety block is ever proposed.**
  - Touch targets: while editing, raise the Apply button height to >=44px (currently ~32px, FLAGS <44px, 04-coaching.md:79) and the share/why/held links (all FLAG <44px, :82-85). Cosmetic-adjacent; include since the cards are being touched.
  - Gating: unchanged — screen stays Pro via GatedCoachOutput (RootNavigator.js:152, 04-coaching.md:40).
  - Empty/loaded/error: preserve the existing LoadingView / InsufficientDataView / LoadErrorView split (04-coaching.md:38) untouched.
  - Edge case: a week where only ONE signal fires — the hero zone shows it and the "More adjustments" expander is hidden (count 0), not shown empty.
  - **NOT DETERMINED IN CODE — confirm before building:** whether runWeeklyCoach already returns an ordered priority for adjustments (the Phase-1 fragment lists the cards but not a priority field). If no priority exists, choosing the hero card requires either reading engine internals or adding ordering logic — the latter is engine work and FOUNDER-GATE.
VERIFICATION: Mostly VERIFIED. Evidence-partial on the exact "too long" numeric threshold (compare-14 VERIFICATION, NOT FOUND). FOUNDER-GATE on: (a) any reliance on engine-side priority/ordering not already present; (b) the absolute rule that safety blocks never collapse. Presentation reorder itself does not touch the engine boundary.
```

---

```
ID: U-B-2
AREA: Coaching — full check-in length / conditional surfacing
TITLE: Conditional wizard steps in the Weekly check-in (show a section only when its data triggers it)
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — length/density is the converging market signal and the abandonment economics are explicit (compare-14 WHERE WE LAG, F1.4 VERIFIED 71% abandon by month 3; NEWBIE VERDICT "every extra field is paid in churn").
EFFORT (1-10): 5 — the fast card already proves the auto-derivation path exists; this extends the same conditional logic to the full wizard. No engine change; the check-in already conditionally shows several sections.
CURRENT STATE: The full four-step wizard's step 1 ("This week's data") can stack weight + cycle + nutrition + steps + cardio into a long scroll (05-checkin-safety.md:126; WeeklyCheckInScreen.js step1 :732). Several sections ALREADY render conditionally (cycle only when shouldShowCycleQuestion :769; cardio only when a prescription exists :894; "Which muscles?" only when soreness>=2 :933). A condensed "fast" card already exists when fastEligible (:1071) reducing most weeks to confirming two ratings (compare-14 VOLYUME CURRENT; 05:118-119).
THE PROBLEM:
  - Newbie impact: the full wizard introduces "working sets", "training volume up X%", deload-adjacent and "prescribed cardio" framing in one long step-1 scroll (05:126-133; compare-14 NEWBIE VERDICT). Dense italic derived-note paragraphs add reading load (05:128-129).
  - Athlete impact: minimal — athletes are "well served on substance" (compare-14 ATHLETE VERDICT); the cost is scan time, not capability.
THE EVIDENCE:
  - compare-14 WHERE WE LAG "Conditional surfacing" — MacroFactor shows a module only if triggered, F2.1 VERIFIED/PARTIAL (the app behaviour is VERIFIED; only the numeric time limit is NOT FOUND). Mark evidence-partial on the timing only.
  - compare-14 NEWBIE VERDICT + Phase-1 05:126-133 — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: MacroFactor — conditional, explained check-in (compare-14 BEST IN CLASS, F2.1 VERIFIED). Carbon Diet Coach — exactly three questions, adherence-gated (F1.1 VERIFIED).
PROPOSED SOLUTION:
  Extend the existing conditional-render pattern so step 1 sections appear ONLY when relevant, matching what the fast card already auto-reads:
  - Suppress the nutrition-adherence section when no kcal target exists (already routes to NutritionTargets — keep that, but don't show the three Hit/Off/Didn't-track options against a non-existent target). Currently a "no target" note is shown (:818-826); make it a single line, not a section.
  - Suppress the steps section entirely when stepsEnabled is false (already partially conditional at :831) AND no target is set — collapse to nothing rather than a "No step target set" note.
  - When the auto-derived value is confidently read (the fast-card path's auto-derivation, :1114-1123), default the wizard to the fast card and make the full wizard an explicit "Add more detail" expansion (the link already exists, :1427-1437) rather than the default for eligible users.
  This is purely which sections render; it does NOT change what the engine consumes (every field still saved as today via saveWeeklyCheckin :577).
NEWBIE EXPERIENCE: Most weeks = the two-tap fast card. When the full wizard is needed, only the sections with real data to confirm appear; no empty "no target set" prompts.
ATHLETE EXPERIENCE: Unchanged capability — an athlete with targets, steps and cardio set sees all sections (their data triggers them). Can still expand to full detail any time.
IMPLEMENTATION BLUEPRINT:
  - Screen: WeeklyCheckInScreen.js, step 1 render (renderStep1 :732) and the fast/wizard branch (fastEligible :1071, expand link :1427).
  - Reuse the existing conditional guards (shouldShowCycleQuestion :769, cardio-prescription guard :894, kcal-target guard :788/:818) — extend, don't replace.
  - Default-to-fast: when fastEligible is true, render the fast card as the entry and gate the wizard behind the existing "Add more detail" control (:1427-1437) — flip the default, keep the override.
  - Gating: unchanged — Pro via GatedWeeklyCheckIn (RootNavigator.js:149, 05:115).
  - Gate states (loading / wrong_day / too_soon / need_weights / load_error, 05:30-44) untouched — they fail closed on load error and that stays.
  - Empty/loaded/error: the load_error gate (:1276) and need_weights gate (:1245) are unchanged.
  - Edge case: a brand-new Pro user with no targets/steps/cardio set yet — they still get step 0 (feeling) and the training-performance step; the nutrition/steps/cardio sections simply don't render until configured.
  - **NOT DETERMINED IN CODE — confirm before building:** the exact `fastEligible` derivation rule (Phase-1 names the flag at :1071 but not its full condition); confirm it before making fast the default so a week that genuinely needs the wizard isn't forced into the fast card.
VERIFICATION: VERIFIED on the length/conditional principle (F2.1 app-behaviour, F1.4 economics). Evidence-partial on the numeric timing threshold only (NOT FOUND, compare-14 VERIFICATION). No engine boundary touched — presentation/section-visibility only. Confirm fastEligible rule before flipping the default.
```

---

```
ID: U-B-3
AREA: Coaching — top-of-screen redundancy
TITLE: Collapse the three-way status restatement at the top of CoachOutput into one narrated hero number
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — direct PAIR "don't over-explain" violation and the Spotify-Wrapped "hero number" benchmark for feeling personal (compare-03 WHERE WE LAG "Top-of-screen redundancy", VERIFIED 3.3; compare-14 WHERE WE LAG "Story/personal framing", F5.1 VERIFIED).
EFFORT (1-10): 3 — small, contained edit to the top three render blocks; no engine change, no new data.
CURRENT STATE: The headline sentence (:1566), the coach-lead acknowledgement+interpretation (:1571), and the trend chips row (:1587) all restate the same week status in three different forms before the user reaches any decision (04-coaching.md:50). buildHeadline/buildOffItems/buildFocus are LOCAL string builders (:89-165) layered on top of the engine's own coachResponse parts, so two parallel narration systems coexist (04-coaching.md:51).
THE PROBLEM:
  - Newbie impact: reads three near-identical status statements before any action — cognitive load with no payoff (compare-14 F5.1; compare-03 VERIFIED 3.3 PAIR).
  - Athlete impact: same; the wasted vertical space pushes the actual decisions further down.
THE EVIDENCE:
  - compare-03 WHERE WE LAG "Top-of-screen redundancy … against PAIR's 'don't over-explain'" — VERIFIED (3.3 line 120).
  - compare-14 WHERE WE LAG "Story/personal framing … Spotify Wrapped narrative + hero-number" — F5.1 VERIFIED.
  - Phase-1 04-coaching.md:50-51 — VERIFIED in code (two parallel narration systems).
BEST REFERENCE IMPLEMENTATION: Spotify Wrapped — narrative framing + one or two hero numbers + low cognitive load (compare-14 BEST IN CLASS, VERIFIED). Google PAIR — "tie explanations to the user's action; don't over-explain" (compare-03 BEST IN CLASS, VERIFIED).
PROPOSED SOLUTION:
  Reduce the top zone to one hero status: keep the trend chip row (the hero NUMBER — weight delta, sessions, PRs at :1587-1610) plus a single narrated line, and remove the duplicate restatement. Decide ONE narration source — prefer the engine's coachResponse parts (the deterministic source) over the local buildHeadline string builder (:89-106), retiring the duplicate local narration on this screen so only one narration system remains.
  This is a copy/layout consolidation; it does not change what the engine outputs, only which of the two existing narration outputs is shown.
NEWBIE EXPERIENCE: Sees one clear "here's your week" line plus the hero numbers, then goes straight to the decision — no triple restatement.
ATHLETE EXPERIENCE: Same hero numbers (trend/sessions/PRs) they value, less preamble before the levers.
IMPLEMENTATION BLUEPRINT:
  - Screen: CoachOutputScreen.js top zone (:1561-1610).
  - Keep: week header (:1561-1562), trend chips row (:1587-1610).
  - Consolidate: choose engine coachResponse acknowledgement+interpretation (:1571-1584, from buildRegisteredCoachResponse :1517) OR the local buildHeadline (:1566) — not both. Recommend keeping the engine-sourced coach lead and removing the local headline duplicate.
  - **FOUNDER-GATE:** the choice of which narration to keep affects what the user reads as the coach's voice. buildHeadline/buildRegisteredCoachResponse are narration of engine output; removing one is a copy/voice decision the founder owns. Surface as a structured choice: (A) keep engine coachResponse, drop local headline; (B) keep local headline, drop coachResponse lead; (C) keep both but merge into one line. Do NOT pick silently.
  - Gating: unchanged (Pro). Empty/error states unchanged.
  - Edge case: a week with no weights logged — trend chip already shows "No weights logged" (:1511); the single narrated line must still read sensibly with no trend (the coachResponse already handles this path).
VERIFICATION: VERIFIED on the redundancy finding and the hero-number benchmark. FOUNDER-GATE on which narration voice survives (it is a coach-voice/copy decision, not a mechanical merge). No engine LOGIC change — only which existing narration string is displayed.
```

---

```
ID: U-B-4
AREA: Coaching — control spectrum
TITLE: A single Coached / Collaborative / Manual coaching mode switch (presentation + apply-behaviour, not engine logic)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — named best-in-class gap; the single strongest defence against algorithm aversion is letting the user adjust/hand over control, and MacroFactor's three modes are the cited benchmark (compare-03 WHERE WE LAG, VERIFIED 5.2/7.3; MISSING ENTIRELY VERIFIED 5.2).
EFFORT (1-10): 7 — touches how suggestions are presented/applied across CoachOutput and how SettingsCoaching exposes the mode; "Coached" (auto-apply) crosses into apply-behaviour, which is FOUNDER-GATE because it changes the confirm-then-apply contract.
CURRENT STATE: SettingsCoaching exposes a coaching TONE register (Automatic / Supportive / Precise) + a "calmer experience" toggle + step/cardio toggles + "show the science" (04-coaching.md:269-279; SettingsCoachingScreen.js tone block :183-213). These personalise VOICE and individual levers, but there is NO single mode switch that hands a newbie a fully-automated experience or lets an athlete drop to manual override (compare-03 WHERE WE LAG, VERIFIED). The engine is confirm-then-apply throughout — every suggestion needs an explicit Apply, never auto-written (04-coaching.md:42; CoachOutputScreen.js:1341-1345).
THE PROBLEM:
  - Newbie impact: no "do it for me" default; faces the full set of Apply decisions (compare-03 NEWBIE VERDICT; market lesson newbies need decisions made for them, 4.1 VERIFIED).
  - Athlete impact: no single switch to drop the engine to manual override; must use individual toggles (compare-03 WHERE WE LAG).
THE EVIDENCE:
  - compare-03 WHERE WE LAG "No user-selectable control spectrum (Coached/Collaborative/Manual)" — VERIFIED (5.2 line 143, 7.3 line 175, §4 line 204).
  - compare-03 MISSING ENTIRELY "Coached/Collaborative/Manual mode switch (MacroFactor)" — VERIFIED (5.2).
  - Phase-1 SettingsCoachingScreen.js tone block (04-coaching.md:277) — VERIFIED in code as a tone-only lever, not a mode switch.
BEST REFERENCE IMPLEMENTATION: MacroFactor — Coached / Collaborative / Manual program styles, named best-in-class for exactly this (compare-03 BEST IN CLASS + MISSING ENTIRELY, VERIFIED; help.macrofactorapp.com/en/articles/91-program-styles).
PROPOSED SOLUTION (split into a safe presentation part and a FOUNDER-GATE apply part):
  Add a single "Coaching mode" three-way control in SettingsCoaching:
  - **Manual:** the engine still computes everything; CoachOutput shows all suggestions, NONE pre-applied — identical to today's confirm-then-apply. (Safe, no boundary crossed.)
  - **Collaborative:** today's behaviour with the U-B-1 hero/secondary presentation — one emphasised decision, rest one tap away. (Safe, presentation only.)
  - **Coached:** suggestions are PRE-MARKED to apply with a single "Confirm all" action (still one explicit confirm, not silent auto-write) so a newbie does one tap. **This changes the apply interaction and is FOUNDER-GATE** because it edits the confirm-then-apply contract that is a documented WHERE-WE-LEAD trust asset (compare-03 WHERE WE LEAD, VERIFIED 7.3/5.2). It must NOT become silent auto-write — the sacred "never auto-written" rule (04-coaching.md:42) stays; "Coached" is one-confirm-for-all, not zero-confirm.
NEWBIE EXPERIENCE: Picks "Coached" once at setup; each week sees the recommended set and taps "Confirm all" — decisions made for them, still with one consent tap.
ATHLETE EXPERIENCE: Picks "Manual"; sees every suggestion, applies the ones they agree with individually exactly as today, with full override.
IMPLEMENTATION BLUEPRINT:
  - Settings: add a "Coaching mode" three-chip control in SettingsCoachingScreen.js alongside the existing tone chips (:183-213) — reuse the tone-chip component pattern. Store as a local-only profile field that survives sync (mirror the tone field handling, 04-coaching.md:286).
  - CoachOutput: read the mode and switch presentation (Manual=all expanded, Collaborative=U-B-1 hero/secondary). The "Coached" / "Confirm all" affordance is the FOUNDER-GATE part.
  - Gating: the mode switch sits in the Pro block of SettingsCoaching (tier === 'pro', 04-coaching.md:281); free users (who only see Calmer-experience) are unaffected. This keeps Precision Coaching adjustments Pro per CLAUDE.md.
  - Touch targets: toneChip currently minHeight 40, FLAGS <44px (04-coaching.md:302) — raise the new mode chips to >=44px.
  - **FOUNDER-GATE** specifically on "Coached" / "Confirm all" apply behaviour. Manual and Collaborative are presentation-only and safe.
  - **NOT DETERMINED IN CODE — confirm before building:** whether a "Confirm all" batch-apply can reuse the existing per-suggestion apply handlers (CoachOutputScreen.js:1341-1345) or needs new wiring; confirm the apply path before building Coached.
VERIFICATION: VERIFIED on the gap and the benchmark. FOUNDER-GATE on the "Coached" batch-apply (alters the confirm-then-apply contract; must never become silent auto-write). Manual/Collaborative modes are presentation-only.
```

---

```
ID: U-B-5
AREA: Coaching — feedback loop / disagreement path
TITLE: A "this didn't fit" feedback control on coach suggestions, recorded to the held-history audit trail
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the unmet user want named across fragments: a coach you can override and "argue with"; PAIR's "let users teach the system"; one unexplained error causes lasting asymmetric distrust (compare-03 WHERE WE LAG + USER SENTIMENT, VERIFIED 6.3/6.1/7.1; 4.2 VERIFIED).
EFFORT (1-10): 6 — adds a UI affordance and a stored feedback record; whether that feedback FEEDS the next decision is FOUNDER-GATE (engine logic). The audit-trail-only version is buildable without touching the engine.
CURRENT STATE: The engine is confirm-then-apply (04-coaching.md:42) and CoachHeldHistory logs every decision AND every hold with reasons plus an EngineLog (04-coaching.md:139,151) — a transparency moat. But the fragment records NO documented feedback loop where a user's disagreement visibly feeds the next decision (compare-03 WHERE WE LAG "No explicit 'this felt wrong / teach the system' override path", VERIFIED).
THE PROBLEM:
  - Newbie impact: limited — newbies rarely disagree with substance; but a "this didn't fit" tap is reassuring.
  - Athlete impact: high — athletes specifically want to override and argue with the algorithm; Garmin lost them precisely by being an unexplained number with "no way in" (compare-03 USER SENTIMENT, VERIFIED 4.2/6.1).
THE EVIDENCE:
  - compare-03 WHERE WE LAG "No explicit 'this felt wrong / teach the system' override path" — VERIFIED (6.3 line 161, 6.1 line 155, 7.1 line 169).
  - compare-03 USER SENTIMENT "disagrees-gracefully" — VERIFIED (4.2/6.1).
  - compare-14 USER SENTIMENT "Decisions that feel like collaboration … not a verdict" — F5.2 VERIFIED; partner caution F6.1/F6.2 ~1/3 of feedback interventions backfire when attention shifts to the self — VERIFIED. (This caution must shape the copy: keep it task-focused, not self-judgemental.)
BEST REFERENCE IMPLEMENTATION: Google PAIR — "give a remittance plan and let users teach the system after a failure" (compare-03 BEST IN CLASS, VERIFIED). MacroFactor — self-corrects visibly off real outcomes so trust compounds (compare-03 BEST IN CLASS, VERIFIED).
PROPOSED SOLUTION (audit-trail version is safe; the "feeds next decision" version is FOUNDER-GATE):
  Add a low-emphasis "This didn't fit" link on each adjustment card. Tapping records a structured feedback note (which suggestion, optional reason chip: "too aggressive" / "not enough" / "didn't apply to me") into the held-history trail so the user can see the coach acknowledged their input, and the founder/engine can later use it. The recorded note appears in CoachHeldHistory as a "you flagged this" row.
  Copy must be task-focused per the backfire caution (F6.1/F6.2 VERIFIED): e.g. "Tell the coach this didn't fit" not "Was the coach wrong about you?".
  Whether this feedback then ALTERS the next week's engine decision is FOUNDER-GATE engine logic and is explicitly OUT of the buildable scope here.
NEWBIE EXPERIENCE: A gentle, optional "this didn't fit" they can ignore; not pushed on them.
ATHLETE EXPERIENCE: Finally a way to register disagreement that the system records and shows back — the "argue with it" affordance they want, even before any engine learning.
IMPLEMENTATION BLUEPRINT:
  - Add a text link (style like the existing whyLearnMore link, CoachOutputScreen.js whyLearnMore :2141, with a >=44px tap target — current FLAGS <44px, 04-coaching.md:83) on each adjustment card (TrainingNextWeekCard :1648, NextWeekCard :1658).
  - Store the feedback note locally (offline-first; no Supabase direct write — sync layer only per CLAUDE.md). Surface it in CoachHeldHistoryScreen as a new row type in buildDecisionRows (CoachHeldHistoryScreen.js:23-76).
  - Gating: Pro (the feedback control lives on the Pro CoachOutput screen).
  - Empty/error: if the write fails, fail visibly (do not silent-catch — note the free-review silent-catch failure-masquerade the fragment flags, 04-coaching.md:113/52, as the anti-pattern to avoid).
  - Edge case: user flags then later applies the same suggestion — record both events in order; do not suppress.
  - **FOUNDER-GATE:** any path where recorded feedback changes a subsequent engine decision (that is engine learning logic, deterministic-engine territory). The audit-trail-only capture is safe and buildable now.
  - **NOT DETERMINED IN CODE — confirm before building:** the held-history storage schema and whether it can carry a new "user-flagged" row type without an engine change (Phase-1 describes buildDecisionRows :23-76 but not the underlying record shape).
VERIFICATION: VERIFIED on the gap and the want. FOUNDER-GATE on feeding feedback into the engine. Capture-and-display-only is buildable without crossing the boundary. Copy must honour the F6.1/F6.2 backfire caution (task-focused, not self-judgemental).
```

---

```
ID: U-B-6
AREA: Coaching — free-tier reliability
TITLE: Distinguish read-error from no-data on the free CoachReview screen (stop the silent-catch failure-masquerade)
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — a visible wrong/empty output erodes trust disproportionately; the Pro screen already fixed exactly this, so the free screen is an inconsistency that hits the free majority (compare-03 WHERE WE LAG "Free-tier silent-catch failure-masquerade", VERIFIED 6.1/7.1).
EFFORT (1-10): 2 — a small, contained fix to one catch block; no engine change.
CURRENT STATE: CoachReviewScreen's loadData swallows ALL errors and shows the no-data state (CoachReviewScreen.js:339-341), so a genuine read failure is indistinguishable from "no sessions this week" — the same failure-masquerade the Pro CoachOutputScreen explicitly fixed (04-coaching.md:113). CoachOutput distinguishes load error (retryable) from insufficient data (04-coaching.md:43; CoachOutputScreen.js:1448-1463).
THE PROBLEM:
  - Newbie impact: high — the free review is the most newbie-appropriate decision surface (compare-03 NEWBIE VERDICT); a hidden read error tells a beginner "you logged nothing" when they did, which reads as the app losing their work.
  - Athlete impact: low — serious users are on the Pro CoachOutput.
THE EVIDENCE:
  - compare-03 WHERE WE LAG "Free-tier silent-catch failure-masquerade … the same failure the Pro screen explicitly fixed" — VERIFIED (6.1/7.1).
  - Phase-1 04-coaching.md:113 (silent catch :339-341) and 04-coaching.md:43 (Pro fix :1448-1463) — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Volyume's own CoachOutputScreen — already does the load-error vs insufficient-data split correctly (04-coaching.md:43); this proposal brings the free screen to parity.
PROPOSED SOLUTION:
  Mirror the CoachOutput pattern on CoachReviewScreen: catch read failures separately from the genuine empty case and render a retryable "Couldn't load your review" state (with a Try again that re-runs loadData) instead of the no-data card. The no-data card stays for genuinely-empty weeks only.
NEWBIE EXPERIENCE: On a real read failure, sees "Couldn't load your review — Try again" rather than a false "no sessions"; trust preserved.
ATHLETE EXPERIENCE: Unaffected (Pro screen already correct).
IMPLEMENTATION BLUEPRINT:
  - Screen: CoachReviewScreen.js loadData catch (:339-341). Add an error state flag distinct from the empty flag.
  - Reuse the CoachOutput error-view pattern (LoadErrorView "Couldn't load your coach" with Try again / Close, 04-coaching.md:38) for visual + behavioural consistency; adapt copy to "review".
  - Keep all computation local/offline (getAllWorkouts etc., 04-coaching.md:108) — offline-first unchanged.
  - Gating: Free, unchanged (no guard, 04-coaching.md:106).
  - Empty/loaded/error: three explicit states — loading (existing SkeletonCards :384-395), genuinely-empty (existing no-data card :410-416), and the NEW error state.
  - Edge case: offline with no cached data — that is genuinely-empty for this week, show the no-data card, not the error state (only show error on an actual read throw).
  - Out of scope (flagged, not fixed, per CLAUDE.md "mention don't fix"): the hardcoded `weeksSinceLastDeload: 99` (:328) and the convoluted warmup filter (:44) — note only.
VERIFICATION: All-VERIFIED. No engine boundary touched — a screen-level error-handling fix bringing the free screen to the Pro screen's existing standard.
```

---

```
ID: U-B-7
AREA: Plan generation — preview/diff before a Pro rebuild commits
TITLE: Show a preview/diff of the rebuilt plan before PlanUpdate commits (parity with ProGoalSetup's change summary)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — best-in-class apps make the reveal a felt-understood moment; editability/visibility before commit underpins trust; PlanUpdate currently only shows a post-hoc toast + goBack (compare-02 WHERE WE LAG, VERIFIED 8.1-8.3/7.4).
EFFORT (1-10): 5 — ProGoalSetup ALREADY routes to a GoalChangeSummary diff screen; this brings PlanUpdate to the same pattern by reusing that surface for training changes. Deterministic generation is unchanged.
CURRENT STATE: PlanUpdate rebuilds the plan (generateAndSavePlan), commits the training profile on success, surfaces a toast, then goBack — NO preview/diff before commit (06-plans.md:223,227,229; PlanUpdateScreen.js:83-140). By contrast ProGoalSetup routes to GoalChangeSummary, a full diff of what changed with plain-language reasons (06-plans.md:268; GoalChangeSummaryScreen.js:126; 05-checkin-safety.md:439-466). GoalChangeSummary handles training goal, phase, calories, macros, protein.
THE PROBLEM:
  - Newbie impact: moderate — a less-experienced Pro user doesn't see how the rebuild reshaped the plan before it's done (06-plans.md:228).
  - Athlete impact: high — "Missing: a preview/diff of the rebuilt plan before saving" is explicitly the athlete gap (06-plans.md:229); athletes want to see the reveal before committing (compare-02 ATHLETE VERDICT, WHERE WE LAG).
THE EVIDENCE:
  - compare-02 WHERE WE LAG "No plan preview/diff before a Pro rebuild commits … Volyume only shows a post-hoc toast + goBack" — VERIFIED (8.1-8.3, 7.4).
  - Phase-1 06-plans.md:227,229 (PlanUpdate) and :268 (ProGoalSetup → GoalChangeSummary) — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Plan-reveal onboarding (Zing Coach, Planfit) — quiz → felt-understood tailored plan, reveal kept un-paywalled (compare-02 BEST IN CLASS, VERIFIED 8.2). Volyume's OWN GoalChangeSummary is the internal best reference — it already does narrate-then-number diff (compare-14 WHERE WE LEAD, F3.1/F3.2 VERIFIED).
PROPOSED SOLUTION:
  Before PlanUpdate commits, present a training-change diff (days/week, session length, split, equipment, recovery, estimated volume) as a confirmation step, then commit on user confirm. Reuse the GoalChangeSummary diff/reason pattern (struck-through prev → highlighted next + a plain-language reason per change, 05-checkin-safety.md:480-483) rather than building a new surface. Because PlanUpdate explicitly does NOT touch nutrition (06-plans.md:211,214), the diff shows training fields only; calorie/macro rows stay absent.
  IMPORTANT: this must follow the existing safe-failure model — PlanUpdate currently rebuilds FIRST and only commits the profile on success (06-plans.md:226; FF-002). The preview must be computed from the would-be rebuild result without permanently committing until the user confirms, preserving that safety property.
NEWBIE EXPERIENCE: Sees "here's how your plan changes" before it's applied, with one-line reasons; can back out.
ATHLETE EXPERIENCE: Gets the pre-commit reveal/diff they explicitly want, in their own terms (days, session length, split, volume), before the rebuild lands.
IMPLEMENTATION BLUEPRINT:
  - Reuse GoalChangeSummaryScreen.js (:126) ChangeCard/diff pattern (:190-248) OR factor its diff component for a training-only variant. Do NOT invent a new screen if the existing one can carry a training-only payload.
  - PlanUpdate flow: change handleSave (PlanUpdateScreen.js:83-140) to (1) compute the rebuild result, (2) navigate to the diff/preview with before/after training params, (3) commit + toast + goBack only on explicit confirm — preserving rebuild-first/commit-on-success (06-plans.md:226).
  - Volume figure shown in the diff is the existing "~N Est. sets/week" heuristic (exerciseCount × 3, 06-plans.md:94,104) — label it approximate; see U-B-8 for improving it.
  - Gating: Pro, unchanged (GatedPlanUpdate, 06-plans.md:225).
  - Empty/loaded/error: if the rebuild fails, keep the user on PlanUpdate with the existing partial/shortfall/error toasts (06-plans.md:223) — do NOT navigate to a diff of a failed rebuild.
  - Edge case: a rebuild that changes nothing meaningful — GoalChangeSummary already handles the no-change case ("Nothing meaningful changed", 05-checkin-safety.md:448) — reuse that.
  - **NOT DETERMINED IN CODE — confirm before building:** whether generateAndSavePlan can produce a preview WITHOUT persisting (Phase-1 says it rebuilds then commits on success, 06-plans.md:223,226, but not whether a dry-run/preview-only mode exists). If generation always persists, a preview-before-commit needs a non-persisting generation path — confirm this; it must NOT alter the deterministic engine's output, only defer the write.
VERIFICATION: VERIFIED on the gap and the internal reference. The deterministic generator is unchanged; the only open question is whether a non-persisting preview path exists (NOT DETERMINED — confirm). Not a coaching-engine LOGIC change; a commit-ordering + presentation change. Flag the dry-run question to the founder before building.
```

---

```
ID: U-B-8
AREA: Plan generation — volume detail
TITLE: Replace the "~N Est. sets/week" heuristic with a per-muscle volume breakdown on PlanDetail
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — athletes want individualised volume detail; the current figure is an approximate exerciseCount × 3 with no per-muscle breakdown and is "potentially misleading for an athlete" (compare-02 WHERE WE LAG, VERIFIED 5.1; 06-plans.md:94,104).
EFFORT (1-10): 5 — requires reading actual set counts per exercise/muscle from the plan's routines rather than the multiplier; the data exists (routines carry exercises with sets) but must be aggregated; not an engine change.
CURRENT STATE: PlanDetail shows per-plan volume only as "~N Est. sets/week" computed as exerciseCount × 3 (06-plans.md:94, PlanDetailScreen.js:180-183), "accurate only if every exercise is 3 sets; potentially misleading for an athlete" (06-plans.md:104). Per-muscle set targets require drilling into RoutineDetail (compare-02 ATHLETE VERDICT; 06-plans.md:106). CoachOutput likewise summarises rather than showing per-muscle set targets (compare-03 ATHLETE VERDICT, 04-coaching.md:53).
THE PROBLEM:
  - Newbie impact: low — a beginner "may not know what a set target implies" anyway (06-plans.md:105); a per-muscle breakdown is athlete-facing detail.
  - Athlete impact: high — an experienced competitor wants set/rep schemes and per-muscle volume; the approximate single number is the gap (compare-02 ATHLETE VERDICT; 06-plans.md:106).
THE EVIDENCE:
  - compare-02 WHERE WE LAG "Per-plan volume shown only as an approximate '~N Est. sets/week' (exerciseCount × 3), no per-muscle breakdown" — VERIFIED (5.1 on individualised quality; PlanDetailScreen.js:180-183).
  - Phase-1 06-plans.md:94,104,106 — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Fitbod — per-muscle recovery 0-100% (compare-14 TOP 50 RANGE, VERIFIED) — the precedent for per-muscle granularity. (Volyume already uses a per-muscle volume grammar on CoachReview — getVolumeStatus / volume landmarks, 04-coaching.md:100,110 — so the internal grammar exists.)
PROPOSED SOLUTION:
  On PlanDetail, replace the single "~N Est. sets/week" stat with an actual per-muscle weekly set breakdown computed from the plan's routines (sum real set counts per muscle across all workouts in the plan), reusing the existing volume-landmark grammar already used on CoachReview (status labels Good range / Just enough / Getting close / Too much / Below target, 04-coaching.md:100). Keep a single headline total too. For library plans where set data may be templated, show the real count where available and fall back to the approximate only when actual sets are absent (labelled "~" only then).
NEWBIE EXPERIENCE: Sees a simple total plus, if they look, a per-muscle list with the same plain status badges the free review uses — consistent grammar, not new jargon.
ATHLETE EXPERIENCE: Gets the per-muscle weekly volume they want directly on PlanDetail without drilling into each RoutineDetail.
IMPLEMENTATION BLUEPRINT:
  - Screen: PlanDetailScreen.js stats row (:235-254) and the volume computation (:180-183) — replace exerciseCount × 3 with a per-muscle aggregation over the plan's workouts/exercises/sets.
  - Reuse the shared volume-landmark helpers used by CoachReview (getVolumeStatus, statusDotColor, status labels, 04-coaching.md:100,110, CoachReviewScreen.js:14-33) for consistent grammar — do NOT invent new status labels.
  - Present as a compact expandable section (consistent with the screen's existing card hierarchy, 06-plans.md:103) so newbies aren't forced to read it.
  - Gating: Free screen, unchanged (PlanDetail is free, no guard, 06-plans.md:102) — this is plan structure, a free feature; do NOT gate it behind Pro.
  - Empty/loaded/error: if a plan has workouts but exercises carry no explicit set counts, fall back to the existing approximate with the "~" label and a note; if no workouts, the existing empty card stays (06-plans.md:96).
  - Edge case: library plans (isLibrary) — show real per-muscle counts if the seeded plan carries them; otherwise the labelled approximate. Library plans intentionally have no start/edit affordance (06-plans.md:104), but the volume readout still applies.
  - **NOT DETERMINED IN CODE — confirm before building:** whether plan/routine records store explicit per-set/per-muscle data accessible at PlanDetail level, or only an exercise list (Phase-1 says set/rep schemes live in RoutineDetail, 06-plans.md:106, implying the data exists but its shape at PlanDetail is not confirmed). Confirm the data model before building the aggregation.
VERIFICATION: VERIFIED on the gap. The volume grammar already exists internally (reuse, not invent). NOT DETERMINED: the per-set data shape at PlanDetail — confirm before building. No coaching-engine boundary crossed (this reads plan structure, it does not change generation).
```

---

```
ID: U-B-9
AREA: Coaching — newbie/athlete dual presentation
TITLE: Use the existing tone register (Automatic/Supportive/Precise) to drive a newbie-vs-athlete copy layer on coaching surfaces
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — the tone register is named the foundation for the dual-audience translation layer the research argues for; newbies need softened/translated terms while athletes want native units (compare-14 WHERE WE LEAD "Tone register already exists … the foundation for the dual-audience translation layer", F3.3/F3.4 VERIFIED; INTERPRETATION §5).
EFFORT (1-10): 5 — the tone field already exists and is read; the work is wiring it to swap copy on the coaching screens; no engine change.
CURRENT STATE: SettingsCoaching exposes Automatic / Supportive / Precise tone chips + "show the science" (04-coaching.md:277, SettingsCoachingScreen.js:183-213,217-232), documented as local-only profile fields that survive sync (04-coaching.md:286). But the fragments note the coaching screens still confront newbies with "volume", "deload", "refeed", "macro cycle", "maintenance calories" regardless (compare-03 NEWBIE VERDICT; 04-coaching.md:52; 05-checkin-safety.md:130-133). The tone lever currently personalises VOICE but is not described as swapping the technical-term copy. An explicit "athlete mode" units switch is MISSING (compare-14 MISSING ENTIRELY — labelled INTERPRETATION §5).
THE PROBLEM:
  - Newbie impact: high — even on "Supportive", a beginner meets unexplained jargon (compare-03 NEWBIE VERDICT; 05:130-133).
  - Athlete impact: moderate — "Precise" already implies numbers-first (04-coaching.md:293), but the engine "summarises rather than showing per-muscle set targets / RPE-style detail" (compare-14 WHERE WE LAG "Athlete-native units", F3.3 VERIFIED).
THE EVIDENCE:
  - compare-14 WHERE WE LEAD "Tone register already exists … foundation for the dual-audience translation layer" — VERIFIED (F3.3/F3.4); the "one engine + two presentation layers / athlete mode" framing is INTERPRETATION (compare-14 MISSING ENTIRELY + VERIFICATION) — mark evidence-thin on the "athlete mode units switch" specifically.
  - compare-03 NEWBIE VERDICT + Phase-1 04-coaching.md:52, 05-checkin-safety.md:130-133 — VERIFIED in code (jargon present).
BEST REFERENCE IMPLEMENTATION: JuggernautAI / RP Hypertrophy — decisions delivered in the athlete's own units (RPE, %1RM, sets) (compare-14 BEST IN CLASS, VERIFIED) for the athlete end; MacroFactor's plain-data explanation for the newbie end (compare-03 BEST IN CLASS, VERIFIED).
PROPOSED SOLUTION (copy/presentation layer only — no engine change):
  Wire the EXISTING tone field to a copy-translation layer on the coaching surfaces:
  - "Supportive" (newbie-leaning): coaching terms carry an inline plain-language gloss on first appearance (e.g. "training volume (the total work for a muscle)"), softened phrasing already partially present on CoachReview (04-coaching.md:117).
  - "Precise" (athlete-leaning): show the native numbers the screen already summarises where the underlying value exists (e.g. surface the per-muscle set figure from U-B-8 inline rather than a summary).
  - "Automatic": pick based on the existing experience signal the engine already has.
  This is a copy/format swap keyed off an existing field; it does NOT change engine logic or outputs.
NEWBIE EXPERIENCE: On Supportive, every technical term is glossed in plain words the first time it appears on the screen — no need to leave for Methodology.
ATHLETE EXPERIENCE: On Precise, sees the underlying numbers (per-muscle sets, deltas) inline instead of summaries, in their own units.
IMPLEMENTATION BLUEPRINT:
  - Read the existing tone field (SettingsCoachingScreen.js tone block :183-213) on CoachOutputScreen, CoachReviewScreen and WeeklyCheckInScreen.
  - Build a copy map: term → {supportive gloss, precise form}; apply at render. Do NOT generate copy dynamically (no LLM); a static deterministic map only.
  - Reuse the "show the science" toggle (04-coaching.md:278) semantics for the Precise end where it already adds technical terms.
  - Gating: tone is in the Pro block of SettingsCoaching (04-coaching.md:281); free CoachReview can use the same static glosses without the tone toggle (default to Supportive glosses for free, since the lever is Pro). Keep the free screen's existing softened copy.
  - Empty/error states unchanged.
  - Edge case: long glosses must not break layout on small screens or under the Larger-text 1.2× toggle (theme.js:325, 04-coaching.md:9) — keep glosses short.
  - **Evidence-thin:** the "athlete mode units switch" is INTERPRETATION (compare-14 §5), not a finding. The buildable, evidence-VERIFIED part is the copy-gloss layer keyed off the EXISTING tone field; a separate units-presentation toggle beyond tone is the thin part — treat as optional/FOUNDER input.
  - **NOT DETERMINED IN CODE — confirm before building:** the exact stored values of the tone field and whether "Automatic" already resolves to an experience signal the screens can read (Phase-1 names the chips but not the resolved values).
VERIFICATION: VERIFIED that the tone register exists and that jargon hits newbies. EVIDENCE-THIN on the dedicated "athlete mode units switch" (INTERPRETATION §5). The copy-gloss layer keyed off the existing tone field is the safe, sourced build. No engine boundary touched.
```

---

```
ID: U-B-10
AREA: Plan generation — library recommendation quiz payoff
TITLE: Give the Plan Library recommendation quiz an explained, felt-understood result (not a bare single "best")
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — the quiz→reveal payoff is praised (Zing/Planfit) but Volyume's quiz returns a single "best" with little explanation, weaker than the felt-understood moment (compare-02 WHERE WE LAG, VERIFIED 8.2).
EFFORT (1-10): 3 — the quiz, scoring and result step already exist; the work is adding an explanation ("why this plan for you") to the existing result card. Free feature, no engine change.
CURRENT STATE: PlanLibrary's 2-question recommendation quiz scores by a simple tag-weight heuristic (goal + equipment) and returns a single suggestion in a result step with Add/Preview/Browse actions (06-plans.md:135-141; PlanLibraryScreen.js:82-142, result :828-850). The scoring "can return a single 'best' with little explanation" (06-plans.md:147; compare-02 WHERE WE LAG). Generated active plans DO carry a "Why this plan, for you" rationale (compare-02 VOLYUME CURRENT; PlanDetailScreen.js:317-332) — but the LIBRARY quiz result does not.
THE PROBLEM:
  - Newbie impact: high — the quiz is "an excellent beginner on-ramp" (06-plans.md:148) but the payoff lands flat without a reason; newbies are exactly who the felt-understood reveal serves (compare-02 NEWBIE VERDICT, 8.2 VERIFIED).
  - Athlete impact: low — athletes bypass the quiz and filter to their division (06-plans.md:149).
THE EVIDENCE:
  - compare-02 WHERE WE LAG "Library recommendation quiz uses a simple tag-weight heuristic returning a single 'best' with little explanation … weaker than the felt-understood quiz→reveal payoff praised for Zing/Planfit" — VERIFIED (8.2).
  - Phase-1 06-plans.md:141,147 (quiz scoring :122-142, result :828-850) — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION: Zing Coach / Planfit — quiz → felt-understood tailored plan, reveal kept un-paywalled (compare-02 BEST IN CLASS, VERIFIED 8.2). Volyume's OWN "Why this plan, for you" rationale (PlanDetailScreen.js:317-332) is the internal pattern to mirror onto the quiz result.
PROPOSED SOLUTION:
  Add a short "why this matches you" explanation to the quiz RESULT step, derived deterministically from the user's two answers (goal + equipment) that produced the match — e.g. "You picked build muscle + full gym, so this hypertrophy split fits." Mirror the existing "Why this plan, for you" rationale style (06-plans.md:97) but built from the quiz answers. This is a deterministic string from the existing tag-weight inputs; no AI, no new scoring engine.
NEWBIE EXPERIENCE: The quiz result now SAYS why it picked this plan, turning a bare suggestion into a felt-understood reveal — the praised pattern.
ATHLETE EXPERIENCE: Unaffected (they skip the quiz, 06-plans.md:149).
IMPLEMENTATION BLUEPRINT:
  - Screen: PlanLibraryScreen.js quiz result step (:828-850), under quizResultName/quizResultDesc (06-plans.md:161).
  - Build the reason from the existing quiz answers (goal/equipment, :82-102) and the matched plan's tags — a deterministic template, NOT generated copy.
  - Keep the result's existing actions (Add this plan filled amber button :840-844, Preview, Browse all) — the reveal stays un-paywalled (Library is free, 06-plans.md:145), honouring the explicit counter-praise that the reveal must NOT be paywalled (compare-02 WHERE WE LEAD, 8.2 VERIFIED).
  - Gating: Free, unchanged.
  - Touch targets: addBtn currently paddingVertical spacing.xs (4), FLAGS <44px (06-plans.md:165); raise while editing the result card.
  - Empty/loaded/error: the no-result step ("Browse all plans", 06-plans.md:141) is unchanged; only the positive result gains the reason line.
  - Edge case: if two answers map to multiple equally-scored plans, the reason should reference the shared criteria honestly rather than implying a unique fit (the heuristic returns one "best", 06-plans.md:147 — keep returning one, just explain the basis).
VERIFICATION: All-VERIFIED on the gap and the un-paywalled-reveal requirement. Deterministic reason from existing inputs — no AI, no engine change. No NOT-DETERMINED facts.
```

---

## Status

1. **Proposals written: 10** (U-B-1 … U-B-10) covering coaching output presentation (U-B-1, U-B-3, U-B-6, U-B-9), check-in length (U-B-2), control spectrum (U-B-4), feedback loop (U-B-5), and plan generation (U-B-7, U-B-8, U-B-10).
2. **FOUNDER-GATE: U-B-3** (which narration voice survives — a coach-voice/copy decision), **U-B-4** (the "Coached" batch-apply alters the confirm-then-apply contract; must never become silent auto-write), **U-B-5** (any path feeding user feedback into the engine = engine logic); plus the absolute rule in **U-B-1** that safety blocks never collapse. **Evidence-thin: U-B-9** (the dedicated "athlete-mode units switch" rests on INTERPRETATION §5; the copy-gloss layer is the VERIFIED build) and the exact "too long" numeric thresholds in **U-B-1 / U-B-2** (NOT FOUND in research; the principle is VERIFIED).
3. **NOT-DETERMINED implementation facts flagged:** U-B-1 (does runWeeklyCoach expose adjustment priority?); U-B-2 (the full `fastEligible` derivation rule); U-B-4 (can "Confirm all" reuse existing per-suggestion apply handlers?); U-B-5 (held-history record schema / new row type); U-B-7 (does generateAndSavePlan have a non-persisting preview/dry-run path?); U-B-8 (per-set/per-muscle data shape at PlanDetail level); U-B-9 (stored tone-field values and whether "Automatic" resolves to a readable experience signal).


<!-- ============ phase5/proposals-C-nutrition.md ============ -->

# Phase 5 proposals — CLUSTER C: Nutrition & food logging

Volyume Ultimate Audit, 2026-06-13. Buildable proposals for the nutrition &
food-logging cluster. Drafted READ-ONLY from already-produced, already-sourced
documents — no new web research, no code changes.

Sources read in full:
- `phase3/compare-04-nutrition.md` (Area 04 — Nutrition & macro management)
- `phase3/compare-05-food-logging.md` (Area 05 — Food logging & diary)
- `phase1/07-nutrition-targets.md` (inventory: NutritionTargets, NutritionEducation, MealPlan, FoodInsights)
- `phase1/08-food-logging.md` (inventory: Diary, FoodSearch, AddCustomFood, MyMeals, MyRecipes, RecipeBuilder, ScanBarcode, ScanLabel)

British English throughout. Newbie and athlete experiences stated separately.
SACRED constraints honoured: deterministic engine (no AI/LLM on food logging),
ED-safety system untouched, billing unchanged, free/Pro gating respected. Any
proposal touching ED-safety framing, calorie floors, or billing is flagged
**FOUNDER-GATE** and treated as input only. Proposals resting on PARTIAL/NOT-FOUND
evidence are flagged **evidence-thin**.

---

ID: U-C-1
AREA: Nutrition & macro management — onboarding / target setting
TITLE: Add a "set it for me" fast-target path that gives a usable target before the full form
SUGGESTED TIER: 2 High
IMPACT (1-10): 9 — The market's single strongest newbie pattern is "give a usable
target immediately, teach the why afterwards" (Finding 1.1, VERIFIED; Finding 2.1,
PARTIAL). The nutrition comparison's NEWBIE VERDICT is that Volyume is the opposite:
it "gates a usable target behind a long expert-framed form". This is the primary
beginner abandonment lever on the nutrition surface.
EFFORT (1-10): 5 — The calculation engine, prefill, and results rendering already
exist; this is a new lightweight entry mode, not new maths. The form already
prefills from the saved body profile (07-nutrition-targets.md:93-94, L296-340), so
a "minimal questions" path can reuse that data and the existing
`Calculate targets` flow.
CURRENT STATE: NutritionTargetsScreen.js is a single long scroll where a usable
target only appears after the full form (sex, age, height, weight, optional body
fat % + BF source, activity level, and a four-card protein approach
Standard/Optimised/Advanced/Custom) is completed and `Calculate targets` is pressed
(07-nutrition-targets.md:22-77, form fields L515-728, button L777-795). The
education card sits at the top but has "no call-to-action at the end … no 'set your
targets' button" (07-nutrition-targets.md:238-239).
THE PROBLEM:
- Newbie: faces "a long form (body fat %, BF source, activity level, four protein
  approaches with g/kg ranges) that is intimidating", and the protein-approach
  section "in particular … is expert framing" (07-nutrition-targets.md:114-119;
  compare-04 NEWBIE VERDICT :83-97). No target is visible until all of it is done.
- Athlete: less affected — they understand the inputs — but a fast path costs them
  nothing and is skippable into the full form.
THE EVIDENCE: compare-04 WHERE WE LAG "Newbie onboarding is 'understand-first,' not
'set-it-for-them'" (Finding 1.1 VERIFIED; Finding 2.1 PARTIAL). NEWBIE VERDICT
contrast with "set it for them, explain the why separately" (Finding 1.1 VERIFIED).
BEST REFERENCE IMPLEMENTATION: Yazio — quiz-set targets, then explanation
(compare-04 TOP 50 RANGE, VERIFIED); reinforced by the beginner-simplicity band
(Macro Champ / Macro Simple / Welling) that "sets targets without requiring the user
to understand them first" (compare-04 TOP 50 RANGE :79-81, PARTIAL).
PROPOSED SOLUTION: Add an opt-in "Set it for me" path at the top of
NutritionTargetsScreen (where the education card now sits, L493-508). It asks only
the minimum the engine needs that is not already on the saved body profile, defaults
the protein approach to **Optimised** (already badged "Recommended", L667-728), skips
body fat %/source, defaults activity to Moderate, and immediately runs the existing
`Calculate targets` path to render the existing results state (hero kcal + macro row,
L804-832). A persistent "Fine-tune these numbers" affordance expands the full form
(the existing `formCollapsed`/`Adjust` mechanism, L758-773). The maths, floors, and
ED-safety framing are unchanged — only the input gate is shortened.
NEWBIE EXPERIENCE: Sees a usable daily kcal + protein target within ~3 short
questions, with the "why" available but not blocking. Matches the market's proven
newbie pattern.
ATHLETE EXPERIENCE: Can ignore the fast path and go straight to the full form, or
use the fast path then "Fine-tune" into body-fat source, LBM protein basis and
custom g/kg (07-nutrition-targets.md:121-126).
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/NutritionTargetsScreen.js. Add the fast-path entry where the
  education card renders (L493-508); reuse `formCollapsed` state (L510, L758) so the
  full form is the "expanded" state behind a "Fine-tune these numbers" pill (the
  existing "Adjust" pattern, L758-773).
- Reuse existing prefill (L296-340) and the existing `Calculate targets` handler
  (button L777-795) — do NOT add a second calculation path.
- Defaults to apply in fast mode: protein approach = Optimised (the
  already-recommended card, L667-728); activity = Moderate (existing pill group
  L619-628); body fat % left blank so the bodyweight protein basis is used.
- Navigation/placement: unchanged — screen stays in ProfileStack route
  "NutritionTargets" (RootNavigator.js:384), reached from YouScreen.js:140 and
  WeeklyCheckInScreen.js:821.
- Gating: unchanged — Pro via `withProGuard(NutritionTargetsScreen, 'Nutrition
  targets')` (RootNavigator.js:150). Do NOT expose to free users.
- Empty/loaded/error states: empty = fast-path prompt visible, full form collapsed;
  loaded = existing results state; error = existing form-incomplete disabled button
  behaviour (L777-795) reused.
- Edge cases: if the saved body profile already has all stats, the fast path may
  need zero new questions — go straight to results; the "calm/wellbeing mode hides
  the fast cut" rule (L634-663) must still apply to any goal shown in fast mode.
VERIFICATION: Evidence VERIFIED (Finding 1.1) with a PARTIAL corroborator (Finding
2.1, beginner-simplicity band). Implementation facts (form fields, prefill, collapse
mechanism, button, gating) all VERIFIED against 07-nutrition-targets.md file:line.
The exact list of "minimum questions the engine needs" is NOT DETERMINED IN CODE —
confirm against the calculator's required inputs before building.

---

ID: U-C-2
AREA: Nutrition & macro management — target results
TITLE: Default the "Why these numbers" card to collapsed for returning users
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 4 — Low-risk, low-effort newbie/returning-user polish; reduces the
"lands on four long paragraphs" cognitive-load complaint without removing any
content.
EFFORT (1-10): 1 — A single initial-state change.
CURRENT STATE: The "Why these numbers for you?" collapsible card defaults to
EXPANDED (`whyExpanded` initial true, 07-nutrition-targets.md:201), "so a returning
user lands on four long paragraphs before the controls" (07-nutrition-targets.md:106,
:104-106; card L930-1043).
THE PROBLEM:
- Newbie: on first view the expanded "why" is valuable; on every subsequent view it
  is repetitive density they must scroll past to reach the recalculate/per-meal
  controls.
- Athlete: same — they have read it once and want the numbers, not the prose.
THE EVIDENCE: 07-nutrition-targets.md CURRENT WEAKNESSES :104-106 (Phase-1, VERIFIED
in-code). compare-04 NEWBIE VERDICT: "The 'Why these numbers' card defaults to
expanded, so a returning user lands on four long paragraphs" (:92-93).
BEST REFERENCE IMPLEMENTATION: Volyume's own MealPlan progressive-disclosure pattern
(calm first, detail a tap deeper, 07-nutrition-targets.md:339) — apply the same
intent here.
PROPOSED SOLUTION: Change the initial `whyExpanded` state so the card is collapsed
by default once `results` exist, with the header tappable to expand. Keep it
expanded on the very first calculation (before targets are saved) so a first-timer
still sees the education inline; collapse on subsequent loads of saved targets.
NEWBIE EXPERIENCE: First calculation still shows the full "why"; on return the card
is a tidy header they can tap to re-read.
ATHLETE EXPERIENCE: Lands on the numbers immediately; the "why" is one tap away.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/NutritionTargetsScreen.js. Change `whyExpanded` initial value
  (currently `true`, L201). Gate the default on whether targets were freshly
  calculated this session vs hydrated from a saved record (hydration via
  `hydrateLoadedTargets`, L34-62) — collapsed when hydrated, expanded on fresh calc.
- The card itself (L930-1043) and its four WhySections are unchanged.
- Gating, navigation: unchanged.
- Empty/error states: unaffected (the card only renders when `results`, L799).
VERIFICATION: All-VERIFIED (Phase-1 in-code weakness + corroborating compare-04
line). No new evidence dependency.

---

ID: U-C-3
AREA: Nutrition & macro management — phase/goal selection
TITLE: Make contest-prep a selectable goal in the targets grid
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — Volyume already has contest-prep phase copy but athletes "can't
choose the periodised phase Carbon/RP make central"; the comparison names this an
athlete-facing gap (compare-04 ATHLETE VERDICT, MISSING ENTIRELY).
EFFORT (1-10): 3 — Phase description already exists (PHASE_DESCRIPTIONS, contest_prep
copy at 07-nutrition-targets.md:96, :124-126); the work is adding a selectable entry
to the GOALS grid and confirming the engine accepts it as a goal.
CURRENT STATE: "contest-prep phase copy exists (PHASE_DESCRIPTIONS L96) though
contest_prep is NOT a selectable goal in the GOALS grid (L80-87) — it can only
arrive from a loaded target" (07-nutrition-targets.md:124-126). The GOALS grid offers
six goals: Build muscle slow/fast, Maintain, Hold muscle lose fat, Lose weight
steady/fast (07-nutrition-targets.md:42-44, GOALS L80-87).
THE PROBLEM:
- Newbie: not relevant — a beginner would not select contest prep; it should not be
  prominent for them.
- Athlete: a competitor cannot choose the periodised contest-prep phase the engine
  already understands; they must arrive at it via a loaded target, which is opaque
  (compare-04 ATHLETE VERDICT :106-108).
THE EVIDENCE: compare-04 MISSING ENTIRELY "A selectable contest-prep goal in the
targets grid — copy exists but the goal is not user-selectable
(07-nutrition-targets.md:124-126); athletes can't choose the periodised phase
Carbon/RP make central (Finding 3.2, PARTIAL/VERIFIED)". Phase-1 ATHLETE QUESTION
:124-126 confirms in-code.
BEST REFERENCE IMPLEMENTATION: Carbon Diet Coach + RP Diet — phased coaching mapping
to 16–20 week contest-prep periodisation (compare-04 BEST IN CLASS :47-51,
PARTIAL/VERIFIED).
PROPOSED SOLUTION: Add a `contest_prep` entry to the GOALS grid (L80-87 /
L634-663), reusing the existing PHASE_DESCRIPTIONS contest-prep copy (L96) for the
results phase card (L1046-1055). Surface it for athletes only — e.g. behind the same
visibility convention that hides the fast cut in calm/wellbeing mode (L634-663) —
so it does not push contest framing at beginners.
NEWBIE EXPERIENCE: Unchanged — contest prep is de-emphasised / not surfaced
prominently for a first-timer.
ATHLETE EXPERIENCE: Can select contest prep directly from the goal grid; the
existing phase description and "How was this calculated?" breakdown (L1080-1141)
explain the periodised numbers.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/NutritionTargetsScreen.js, GOALS constant (L80-87) and the
  goal grid render (L634-663). Add `contest_prep` with its surplus/deficit and
  label; reuse PHASE_DESCRIPTIONS contest_prep copy (L96).
- ED-SAFETY CHECK: a contest-prep deficit MUST still respect the calorie floors
  (1,200 kcal women / 1,500 kcal men) and the rapid-loss threshold (1.5%/wk) owned
  by src/coaching/safety/. **FOUNDER-GATE** — do not let a new aggressive goal route
  bypass the safety system; confirm the engine clamps contest-prep targets to the
  floors before this goal is exposed.
- The deficit percentage attached to contest_prep is **NOT DETERMINED IN CODE** —
  the GOALS grid lists +17%…−22% for existing goals (07-nutrition-targets.md:42-44)
  but the contest-prep figure is not captured in the inventory; confirm against the
  engine before building.
- Gating: Pro, unchanged.
- Edge cases: if the engine does not currently accept `contest_prep` as an *input*
  goal (only as a loaded phase), that wiring is NOT DETERMINED IN CODE — confirm.
VERIFICATION: Evidence is PARTIAL/VERIFIED (Finding 3.2) — mark **evidence-thin** on
the market-demand side (Carbon/RP via vendor+store). Phase-1 facts VERIFIED. The
contest-prep deficit value and engine-input acceptance are NOT DETERMINED IN CODE.
The safety-floor interaction is **FOUNDER-GATE**.

---

ID: U-C-4
AREA: Nutrition & macro management — insights
TITLE: Extend Food Insights with a selectable longer date range and CSV beyond 7 days
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — Athletes find Insights "shallow … only 7 days, no longer trend"
and "would likely export CSV and analyse elsewhere" (compare-04 ATHLETE VERDICT).
The expenditure/adherence trend loop is what athletes expect (Finding 5.1, VERIFIED).
EFFORT (1-10): 4 — The bar chart, adherence rows, tolerance helper, and CSV export
already exist (07-nutrition-targets.md:433-452, :471); the work is a date-range
control and parameterising the fixed 7-day window.
CURRENT STATE: FoodInsightsScreen shows a fixed last-7-days kcal bar chart vs target,
a four-row macro hit-rate summary, and an "Export 7 days as CSV" action
(07-nutrition-targets.md:433-452). "No date range control — fixed to last 7 days
(L42-47); no way to view a longer trend" and "Only kcal bars are charted; the macro
block is just hit-counts, no per-day macro visualisation"
(07-nutrition-targets.md:480-483).
THE PROBLEM:
- Newbie: 7 days is fine; longer ranges are not their need.
- Athlete: cannot see a longer trend or export more than 7 days, so they leave the
  app to analyse (compare-04 ATHLETE VERDICT :108-110; WHERE WE LAG :151-154).
THE EVIDENCE: compare-04 WHERE WE LAG "Shallow insights for athletes. Fixed 7-day
window, kcal-only chart, no longer trend … below the weekly expenditure-trend loop
athletes expect (Finding 5.1, VERIFIED)". MISSING ENTIRELY "Longer-range /
date-selectable insights and CSV-beyond-7-days (07-nutrition-targets.md:481-482)".
BEST REFERENCE IMPLEMENTATION: MacroFactor's weekly expenditure-trend loop
(compare-04 BEST IN CLASS :39-46, VERIFIED help-docs) — the trend-over-time read
athletes expect.
PROPOSED SOLUTION: Add a range selector (e.g. 7 / 14 / 30 days) to FoodInsights,
parameterising the fixed window (07-nutrition-targets.md:42-47) and the CSV export
(:471) to honour the selected range. Keep the default at 7 days so the newbie view
is unchanged. Do NOT add weight-correlation or per-day macro charts in this proposal
(separate, larger work); scope is range + matching CSV.
NEWBIE EXPERIENCE: Default 7-day view is unchanged.
ATHLETE EXPERIENCE: Can switch to 14/30 days and export the matching CSV without
leaving the app.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/FoodInsightsScreen.js. Add a range control near the
  "LAST 7 DAYS · CALORIES" section label (L137); parameterise the 7-day window
  (L42-47) and the CSV export (L100-118, button L195-211).
- Reuse the existing `within()` tolerance helper (kcal/protein 10%, carbs/fat 15%,
  L92-95, L217-220) and bar/adherence rendering (L138-193) for the longer window.
- Navigation/placement: unchanged — route "FoodInsights" in DiaryStack
  (RootNavigator.js:262), reached from DiaryScreen.js:530. NOTE: Phase-1 flags this
  screen's location as "admitted-temporary … should eventually be its own Insights
  tab" (07-nutrition-targets.md:476-477, :498-501) — out of scope here; do not move
  the screen.
- Gating: Pro by-stack (inside gated DiaryStack), unchanged.
- Empty/loaded/error states: reuse existing no-target fallback (L169-173) and
  no-logged-days empty state (L189-191) for the selected range.
- Edge cases: a 30-day chart with the current "seven bar rows" layout (L138-174)
  needs a scroll/condense decision — the current chart is built for exactly 7 bars;
  rendering 30 is NOT DETERMINED IN CODE and must be designed before building.
VERIFICATION: Evidence VERIFIED (Finding 5.1) + Phase-1 in-code weakness. The 30-day
chart rendering approach is NOT DETERMINED IN CODE — confirm the chart layout before
building.

---

ID: U-C-5
AREA: Food logging & diary — logging speed
TITLE: Keep the logger open across a meal (persistent plate / timeline)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — "MacroFactor's open plate/timeline is the single biggest
deterministic friction reducer and underpins its 50%-fewer-actions lead"
(compare-05 WHERE WE LAG, VERIFIED). Low-friction logging is the main adherence
lever; ~80% quit food logging, ~97% within a week (compare-05 NEWBIE VERDICT,
VERIFIED).
EFFORT (1-10): 6 — Volyume already has a multi-add "plate" (FoodSearchScreen.js:234-306),
so the building block exists; the work is changing each per-meal log path to NOT
`goBack()` to the diary so the logger stays open across the meal.
CURRENT STATE: "Volyume's plate exists (FoodSearchScreen.js:234-306) but each
per-meal log path returns to the diary (goBack, FoodSearchScreen.js:289, 374)"
(compare-05 WHERE WE LAG :111-118). Logging one already-visible food is a minimum 3
taps and the search log returns to the diary (08-food-logging.md:82-92, :107). The
plate is "a sub-flow that closes back to the diary, not a persistent timeline"
(compare-05 MISSING ENTIRELY :136-138).
THE PROBLEM:
- Newbie: each food relaunches the picker; re-entry friction is exactly where
  week-one abandonment happens (compare-05 NEWBIE VERDICT, VERIFIED).
- Athlete: logging a multi-item meal means repeated round-trips instead of one
  staying-open session (compare-05 ATHLETE VERDICT; WHERE WE LAG).
THE EVIDENCE: compare-05 WHERE WE LAG "Logger does not stay open across a meal …
goBack, FoodSearchScreen.js:289, 374 … VERIFIED (macrofactor.com/new-food-logger;
nutriscan FLSI)". compare-05 MISSING ENTIRELY :136-138. NOTE the benchmark caveat in
compare-05 VERIFICATION STATUS :165-170: the 24-vs-36 / 3- / 5-action figures all
trace to MacroFactor's own FLSI cross-cited by nutriscan — VERIFIED but
single-sourced.
BEST REFERENCE IMPLEMENTATION: MacroFactor — plate/timeline workflow that "keeps the
logger open between items so you do not re-launch per food; 24 total actions across
four workflows vs MyFitnessPal's 36 (50% fewer) … deterministic adaptive expenditure
(no LLM)" (compare-05 BEST IN CLASS :38-44, VERIFIED). NOTE: MacroFactor's "Describe"
feature IS LLM-based and is explicitly OUT of scope (compare-05 :42-43, MISSING
ENTIRELY :147-150).
PROPOSED SOLUTION: Make the plate the default logging session: when the user adds
items via FoodSearch, the logger stays open (does not `goBack()`) until the user
explicitly taps "Log {n}" / "Done", at which point all items write and the diary
refreshes. The plate bar and review modal already exist
(FoodSearchScreen.js:667-731); the change is the post-add navigation, not new UI.
Keep a single-item fast path for users who want it. Strictly deterministic — no
natural-language "Describe", no AI photo (boundary held).
NEWBIE EXPERIENCE: Adds several foods to one meal in a single open session, then logs
them together; far fewer relaunches.
ATHLETE EXPERIENCE: Logs a full prepped meal in one staying-open pass using
recents/favourites/frequents (FoodSearchScreen.js:104-114).
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/FoodSearchScreen.js. The per-food log paths currently call
  `navigation.goBack()` after a single log (FoodSearchScreen.js:289, 374, confirmed
  08-food-logging.md:107); change so single-add into a meal does not auto-close —
  keep the picker open and route the user through the existing plate bar (L667-687)
  and plate review modal (L689-731) / `logPlate` (L257-306).
- Reuse the existing double-log guard `loggingPlateRef` (FoodSearchScreen.js:259-305)
  and slot-aware recents that pre-fill last portion (L104-114).
- Navigation/placement: route "FoodSearch" in DiaryStack, presentation 'modal'
  (RootNavigator.js:231-235); it must still close back to the diary on explicit
  "Done"/"Log {n}". Recipe pick mode (`pickMode 'recipe'`, RecipeBuilderScreen.js:118-124)
  MUST keep its existing return-to-returnTo behaviour (FoodSearchScreen.js:341-350) —
  do not change the recipe-ingredient flow.
- Gating: Pro by-stack, unchanged. NO LLM, NO AI photo — boundary held.
- Empty/loaded/error states: empty plate = existing browse/search; partial-failure
  on multi-log already has honest messaging (FoodSearchScreen.js:259-305) — reuse.
- Edge cases: quick-add (no food, 2 taps, DiaryScreen.js:592, 631-636) and the
  barcode-scan-into-search path (ScanBarcode replace → FoodSearch, ScanBarcodeScreen.js:117-119)
  must both still resolve correctly into the staying-open session — the exact merge
  behaviour is NOT DETERMINED IN CODE; confirm before building.
VERIFICATION: Evidence VERIFIED but the action-count benchmark is single-sourced
(MacroFactor FLSI cross-cited by nutriscan; macrofactor.com/fastest-food-logger-2025
was bot-gated) — compare-05 VERIFICATION STATUS :165-170. The quick-add / scanned-food
merge into a staying-open session is NOT DETERMINED IN CODE.

---

ID: U-C-6
AREA: Food logging & diary — primary action prominence
TITLE: Give the diary a single prominent primary "log food" action over the barcode FAB
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — The most prominent diary control is the amber 56px barcode FAB,
"not search-add, which can mislead a newbie into thinking scanning is the main path"
(compare-05 NEWBIE VERDICT; WHERE WE LAG; Phase-1 :48, :79). Beginners abandon
when the primary path is unclear.
EFFORT (1-10): 4 — Re-prioritising / adding a primary log affordance; the search-add
flow already exists (addFood, DiaryScreen.js:229, 591).
CURRENT STATE: "Two different 'add food' entry points with different reach: the
per-meal add inside MealSection vs the barcode FAB. There is no single prominent
primary 'log food' action at the diary level — the most prominent floating control
is Scan barcode (DiaryScreen.js:647-657), not search-add" (08-food-logging.md:48,
:79; compare-05 WHERE WE LAG :129-130). The FAB is amber 56px with shadow.lg
(DiaryScreen.js:781-787).
THE PROBLEM:
- Newbie: the visually dominant control is scanning, implying that is the main way
  to log, when search-add is the more common path (compare-05 NEWBIE VERDICT :67-78).
- Athlete: less affected — they know both paths — but a clearer primary does no harm.
THE EVIDENCE: compare-05 WHERE WE LAG "No prominent single primary 'log food' action
at diary level; prominence sits on the barcode FAB rather than search-add
(DiaryScreen.js:647-657, 79)". Phase-1 CURRENT WEAKNESSES :48 and
"Most important action prominence … Arguably the prominence is on the wrong action"
(:79).
BEST REFERENCE IMPLEMENTATION: MacroFactor's clear primary logger entry (compare-05
BEST IN CLASS :38-44, VERIFIED). NOTE: also heed compare-05's caution that MFP's 2026
redesign added "space-consuming cards" that drove users away (WHERE WE LAG :131-134,
VERIFIED) — the fix must not add density.
PROPOSED SOLUTION: Demote the barcode FAB to a secondary affordance and give the
diary one obvious primary "Log food" action (opening FoodSearch via the existing
`addFood`). Two viable forms — present both to the founder rather than picking
silently: (a) replace the barcode-only FAB with a primary "Log food" FAB that opens
search, with scan as a secondary icon inside the picker (scan already lives in the
FoodSearch header, FoodSearchScreen.js:595); or (b) keep the FAB but make its primary
tap = search-add and move scan to a smaller secondary control. No new cards on the
diary (respect the density caution).
NEWBIE EXPERIENCE: One obvious "Log food" button that opens search; scanning is still
available but no longer reads as the main path.
ATHLETE EXPERIENCE: Both paths remain one tap apart; scan stays reachable from the
diary and the picker.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/DiaryScreen.js. The FAB is at L647-657 (style L781-787) and
  navigates to ScanBarcode (L650). The search-add path is `addFood` →
  navigate('FoodSearch') (DiaryScreen.js:226-230, per-meal Add at L591). Scan is also
  reachable from the FoodSearch header (FoodSearchScreen.js:595), so demoting the
  diary FAB does not orphan scanning.
- Navigation/placement: keep the FAB position scheme (spacing-based, scales,
  DiaryScreen.js:782); change which action is primary.
- Gating: Pro, unchanged. Do NOT add information-dense cards (compare-05 caution).
- Empty/loaded/error states: the empty state already offers onAdd/onCopyYesterday/
  onPlanDay (DiaryScreen.js:578-583) — keep its primary as "add/search". FAB is
  hidden during multi-select (L647-657) — preserve.
- Edge cases: the FAB is "hidden during selection" (DiaryScreen.js:647-657) — any new
  primary action must preserve that selection-mode hiding.
VERIFICATION: All-VERIFIED (compare-05 WHERE WE LAG + Phase-1 in-code). The two
solution forms are presented as founder choices, not a silent pick. No
NOT-DETERMINED implementation facts.

---

ID: U-C-7
AREA: Food logging & diary — food database quality
TITLE: Surface a curated, verified UK best-match (one correct result) with a meaningful verified marker
SUGGESTED TIER: 1 Critical
IMPACT (1-10): 9 — "The market's make-or-break is ONE correct UK top result, not
crowdsourced duplicates; UK users hit a day-one wall on Tesco meal deals, Greggs,
Costa, Nando's, and own-brand ranges" (compare-05 WHERE WE LAG, VERIFIED). DB
accuracy/coverage is "the dimension athletes abandon over" (compare-05 ATHLETE
VERDICT, VERIFIED) and the #1 cited frustration (compare-04 USER SENTIMENT, VERIFIED).
EFFORT (1-10): 8 — Touches the search/data layer and likely a data-sourcing decision;
the inventory shows search plumbing but "no evidence of a curated, verified UK
best-match or a meaningful verified marker" (compare-05 WHERE WE LAG), so the actual
DB internals are not established in the audited screens.
CURRENT STATE: FoodSearch has a debounced 250ms local-first waterfall search with a
2-char gate (08-food-logging.md:100, :111; FoodSearchScreen.js:206-226) and an Open
Food Facts barcode backbone (DiaryScreen.js:557-576, OFF consent card). But "UK
best-match / DB-accuracy unproven. The inventory shows search plumbing
(FoodSearchScreen.js:206-226) but no evidence of a curated, verified UK best-match or
a meaningful verified marker" (compare-05 WHERE WE LAG :123-128).
THE PROBLEM:
- Newbie: the decisive week-one wall is "20 wrong results" and not finding their
  actual supermarket item (compare-05 NEWBIE VERDICT, VERIFIED).
- Athlete: abandons over DB accuracy/coverage when own-brand/UK items are missing or
  US-portion-contaminated (compare-05 ATHLETE VERDICT; USER SENTIMENT :152-160).
THE EVIDENCE: compare-05 WHERE WE LAG :123-128 (VERIFIED — Nutracheck, mynetdiary
DB-accuracy, cronometer UK thread, OFF brands); USER SENTIMENT :152-160 (VERIFIED);
compare-04 USER SENTIMENT :178-179 (MFP under-estimates protein ~7.8% / carbs ~6.4%,
PARTIAL on the figures). MISSING ENTIRELY "Curated nutritionist-verified UK item set
with food images (Nutracheck, VERIFIED) — not evidenced in the inventory".
BEST REFERENCE IMPLEMENTATION: Nutracheck — "curated not crowdsourced, 500K+ UK
items, nutritionist-verified, food images, Tesco/Greggs/Costa/Nando's coverage"
(compare-05 BEST IN CLASS :46-47, VERIFIED). Open Food Facts as the boundary-safe
barcode backbone (already wired, compare-05 BEST IN CLASS :50-52, VERIFIED).
PROPOSED SOLUTION: Establish a curated/verified UK best-match in food search — return
ONE correct top result for common UK supermarket/takeaway items rather than a list of
crowdsourced duplicates, and show a verified marker that genuinely means verified (not
MFP's "enough people upvoted it", compare-05 USER SENTIMENT :156-158). This is a
data-sourcing and ranking decision, not a UI tweak; it likely depends on the backing
food database, which is NOT established in the audited screens.
NEWBIE EXPERIENCE: Searches "Tesco …" / "Greggs …" and the correct UK item is the top
result with a trustworthy verified badge.
ATHLETE EXPERIENCE: Trusts the data enough to log in-app instead of building everything
as custom foods.
IMPLEMENTATION BLUEPRINT:
- The backing food database, its provenance, and whether a curated UK source or a
  verified-marker field exists are **NOT DETERMINED IN CODE** — the audited screens
  show only the search waterfall (FoodSearchScreen.js:206-226) and OFF as a barcode
  source (DiaryScreen.js:557-576). Confirm the data layer (search service, DB
  schema, any verified flag) before designing the solution.
- Constraints from CLAUDE.md/architecture: offline-first (local DB is source of
  truth on device; FoodSearch is already "local-first", FoodSearchScreen.js:206-226);
  EU data residency; NO PII to external services; deterministic, NO LLM/AI ranking.
- A dependency decision (new/curated UK data source) would need founder sign-off per
  the "never add dependencies without asking" rule — present the candidate source(s)
  (Nutracheck-style curation vs expanded OFF UK coverage), purpose, and licence.
- Gating: Pro by-stack, unchanged.
- This is a spine/data-layer change — per the build operating model it is hands-on
  Claude work, not an agent surface.
VERIFICATION: Market evidence VERIFIED (Nutracheck, OFF, mynetdiary). The entire
implementation side is NOT DETERMINED IN CODE — the backing DB, provenance, verified
marker, and ranking are not established in the audited screens; this proposal is
**evidence-thin on the Volyume side** and must start with a data-layer investigation
before any build. Dependency/data-source choice requires founder sign-off.

---

ID: U-C-8
AREA: Food logging & diary — barcode scanning
TITLE: Add a manual "type a barcode" escape to the live scanner
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 5 — The scanner has "no manual 'type a barcode' or 'type it in'
escape on this screen itself … the only non-scan exit is Close" (compare-05 ATHLETE
VERDICT; 08-food-logging.md:348-349, ScanBarcodeScreen.js:200-203). Frustrating
"when a code won't read" (Phase-1 ATHLETE QUESTION :353).
EFFORT (1-10): 3 — A small affordance on the scanner that routes into the existing
heal chain (ScanLabel keeps the barcode, or AddCustomFood with prefillBarcode).
CURRENT STATE: ScanBarcodeScreen has a live camera, torch, and permission handling
but "No manual 'type a barcode' or 'type it in' escape on this screen itself (unlike
ScanLabel which offers Type it in) — the only non-scan exit is Close"
(08-food-logging.md:348-349; ScanBarcodeScreen.js:200-203). The heal chain
(ScanLabel) does offer "Type it in" downstream (08-food-logging.md:385,
ScanLabelScreen.js:310-316).
THE PROBLEM:
- Newbie: less likely to hit this (they will retry the scan), but a damaged/unreadable
  code with no manual option is a dead-feeling moment.
- Athlete: "the lack of a manual-barcode entry path may frustrate when a code won't
  read" (08-food-logging.md:353).
THE EVIDENCE: 08-food-logging.md CURRENT WEAKNESSES :348-349 and ATHLETE QUESTION
:353 (Phase-1, VERIFIED in-code). compare-05 ATHLETE VERDICT "no
manual-barcode-entry escape on the scanner (ScanBarcodeScreen.js:200-203)".
BEST REFERENCE IMPLEMENTATION: Volyume's own ScanLabel "never dead-ends" heal pattern
("Type it in" that keeps the barcode, ScanLabelScreen.js:310-316) — extend the same
philosophy to the scanner entry (this heal chain is a Volyume-current strength per
compare-05 WHERE WE LEAD :100-103).
PROPOSED SOLUTION: Add a "Type it in" / "Enter barcode" affordance to ScanBarcodeScreen
alongside Close (header region, ScanBarcodeScreen.js:200-218), routing into the
existing miss/heal path so a hand-typed code either resolves via the same waterfall or
hands off to ScanLabel/AddCustomFood with the barcode preserved.
NEWBIE EXPERIENCE: If the scan won't read, an obvious "Enter it manually" option keeps
them moving instead of forcing a Close.
ATHLETE EXPERIENCE: Types a known/damaged barcode and proceeds without leaving the
scan flow.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/ScanBarcodeScreen.js. Add the affordance near the header
  controls (Close/torch at L200-218). On submit, route through the existing scan
  resolution — a hit does `navigation.replace('FoodSearch', { scannedFood })`
  (ScanBarcodeScreen.js:117-119), a miss does `navigation.replace('ScanLabel',
  { prefillBarcode })` (ScanBarcodeScreen.js:122-124). Reuse, do not duplicate.
- Navigation/placement: route "ScanBarcode" in DiaryStack, presentation 'modal'
  (RootNavigator.js:241-245); reached from the diary FAB (DiaryScreen.js:650) and the
  FoodSearch header scan icon (FoodSearchScreen.js:595).
- Gating: Pro (barcode scanning is a Pro feature per CLAUDE.md), unchanged.
- Empty/loaded/error states: while resolving a typed code, reuse the existing
  resolving spinner badge (ScanBarcodeScreen.js:235-239) and scan-lock
  (ScanBarcodeScreen.js:64, 104-107) so a typed lookup can't race a camera detect.
- Edge cases: validate the typed input is a plausible barcode before lookup; the exact
  validation rule is NOT DETERMINED IN CODE — confirm acceptable formats (EAN-8/13 etc.)
  before building.
VERIFICATION: All-VERIFIED on the gap (Phase-1 in-code + compare-05). The barcode
input-validation rule is NOT DETERMINED IN CODE.

---

ID: U-C-9
AREA: Food logging & diary — hydration target
TITLE: Make the daily water target user-configurable instead of hardcoded 3 L
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 4 — Named in both the athlete verdict and Phase-1 weaknesses; a small
but repeatedly-flagged gap. "The hardcoded 3 L water target" is a listed athlete gap
(compare-05 ATHLETE VERDICT :87-88) and Phase-1 notes it is "acknowledged as a
follow-up" (08-food-logging.md:49).
EFFORT (1-10): 3 — Replace one hardcoded constant with a per-user setting and a
small editor; the WaterRow UI already exists.
CURRENT STATE: "WaterRow at the bottom … '{litres} / 3.0 L' value, minus and plus
250 ml buttons … Daily target hardcoded at 3000 ml (DiaryScreen.js:750)"
(08-food-logging.md:33, :49; WaterRow DiaryScreen.js:616, 752-777).
THE PROBLEM:
- Newbie: 3 L is a reasonable default; low impact.
- Athlete: a competitor with a specific hydration target cannot set it
  (compare-05 ATHLETE VERDICT :87-88).
THE EVIDENCE: compare-05 ATHLETE VERDICT :87-88 and 08-food-logging.md CURRENT
WEAKNESSES :49 ("acknowledged as a follow-up") — Phase-1 VERIFIED in-code. This is a
Volyume-current follow-up, not a sourced market comparison.
BEST REFERENCE IMPLEMENTATION: None cited specifically — this is a self-identified
follow-up rather than a market-driven feature.
PROPOSED SOLUTION: Add a per-user daily water target (default 3000 ml to preserve
current behaviour) editable from the diary water row or settings, replacing the
hardcoded 3000 ml. The +/- 250 ml increment UI (DiaryScreen.js:752-777) is unchanged.
NEWBIE EXPERIENCE: Unchanged default (3 L); editing is optional and out of the way.
ATHLETE EXPERIENCE: Sets their own hydration target.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/DiaryScreen.js. Replace the hardcoded 3000 ml (DiaryScreen.js:750)
  with a stored per-user value; the WaterRow value string "{litres} / 3.0 L"
  (DiaryScreen.js:616, 752-777, label L892-893) reads from that value.
- Storage: must follow offline-first (local DB is source of truth on device; sync via
  the sync layer only — never query Supabase directly from the component). The exact
  local-storage/profile field for a water target is NOT DETERMINED IN CODE — confirm
  where per-user diary settings live before building.
- Gating: Pro by-stack (diary is Pro), unchanged.
- Empty/error states: missing/unset value falls back to 3000 ml default.
- Edge cases: enforce a sane minimum/maximum on the editable target; exact bounds NOT
  DETERMINED IN CODE.
VERIFICATION: Gap VERIFIED in-code (Phase-1 :49, :33). The per-user settings storage
location is NOT DETERMINED IN CODE — confirm before building.

---

ID: U-C-10
AREA: Food logging & diary — ED-safety / anti-shame framing
TITLE: Audit diary feedback to remove punitive over/under colour framing and avoid pressure streaks
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — The load-bearing ED-safety signal: a BJPsych study ties harm to
numeric "fixation … fuelled heavily by the app's quantification", red/green feedback,
and competitive streaks (compare-05 USER SENTIMENT, VERIFIED; flagged to safety owners
per Phase-2 proposal item 7). The market's #1 design risk is number-focus/red-shame
signalling fuelling disordered eating (compare-04 WHERE WE LEAD, Finding 4.5, VERIFIED).
EFFORT (1-10): 4 — Mostly an audit of existing feedback affordances (colour rules,
any streak/percentage framing) against the safety philosophy; changes are
copy/colour-rule adjustments, not new systems. But it is safety-adjacent.
CURRENT STATE: Volyume already has protective framing — Nutrition Education states a
5% adjustment cap, 2-week cooldown, "adherence beats perfection", and never adds
exercise calories back (07-nutrition-targets.md:48-52, :211-212; compare-04 WHERE WE
LEAD). FoodInsights uses an amber-fill bar that "turns green when within 10% of
target" (07-nutrition-targets.md:138-174) and four adherence "hit/total" rows
(:177-193). The diary uses MacroRings vs targets (08-food-logging.md:28, :540-547).
THE PROBLEM:
- Newbie: most vulnerable to red/shame signalling and streak pressure linked to
  disordered eating (compare-05 USER SENTIMENT, VERIFIED).
- Athlete: also at risk under restrictive phases; adherence-neutral, anti-shame
  framing is what users want (compare-04 USER SENTIMENT, Finding 5.2, VERIFIED).
THE EVIDENCE: compare-05 USER SENTIMENT :159-163 "BJPsych study ties harm to numeric
'fixation … red/green feedback, and competitive streaks — so the diary should avoid
punitive over/under colour framing and pressure streaks (VERIFIED; flag to safety
owners per Phase-2 proposal item 7)". compare-04 WHERE WE LEAD (Finding 4.5 VERIFIED)
and USER SENTIMENT (Finding 5.2 VERIFIED).
BEST REFERENCE IMPLEMENTATION: MacroFactor's adherence-neutral, explicit anti-shame
language ("Tracking isn't something that should stress you out … without shaming,
judgment, or the requirement that you adhere to your targets perfectly")
(compare-04 BEST IN CLASS :39-46, VERIFIED help-docs). Volyume's own education copy is
already the protective counter-pattern (compare-04 WHERE WE LEAD :119-124).
PROPOSED SOLUTION: Audit the diary/insights feedback surfaces for any punitive
over/under colour framing or streak/competitive pressure, and align them with the
existing adherence-neutral, anti-shame philosophy. Concretely: review the FoodInsights
green/amber bar rule (07-nutrition-targets.md:138-174) and adherence "hit/total"
framing (:177-193), and the diary MacroRings over/under colour treatment
(08-food-logging.md:540-547), to ensure none reads as red-shame for being over/under
and that no competitive streak mechanic is introduced.
NEWBIE EXPERIENCE: Feedback reads as informative, never punitive — protecting the most
vulnerable user.
ATHLETE EXPERIENCE: Same adherence-neutral framing during restrictive phases.
IMPLEMENTATION BLUEPRINT:
- This proposal touches ED-safety framing — **FOUNDER-GATE**. Per CLAUDE.md the ED
  safety system (src/coaching/safety/) must NOT be modified/disabled/worked around;
  calorie floors (1,200 women / 1,500 men), Beat UK signposting, and the 1.5%/wk
  rapid-loss threshold are untouchable. This is an audit + copy/colour-rule
  alignment, not a change to the safety engine — treat as INPUT ONLY and route to the
  safety owners (compare-05 explicitly says "flag to safety owners per Phase-2
  proposal item 7").
- Surfaces to audit (do NOT change without sign-off): FoodInsights bar colour rule
  (07-nutrition-targets.md:166-168, :138-174) and adherence rows (:177-193); diary
  MacroRings (08-food-logging.md:540-547, DiaryScreen.js:540-547). The "within 10%
  turns green" rule is currently explained only in a footnote (07-nutrition-targets.md:478-479).
- Whether any competitive streak mechanic exists in the diary is NOT DETERMINED IN
  CODE in the audited screens — confirm none exists / none is planned.
- Gating: Pro by-stack, unchanged.
VERIFICATION: Evidence VERIFIED (BJPsych via compare-05; Findings 4.5/5.2 via
compare-04). **FOUNDER-GATE** — touches ED-safety framing; INPUT ONLY, route to safety
owners. Presence/absence of any streak mechanic is NOT DETERMINED IN CODE.

---

## Cluster summary (for the dispatcher)

Ten proposals (U-C-1 … U-C-10). Cross-cutting SACRED constraints respected: no
LLM/AI on food logging or ranking (U-C-5, U-C-7 explicitly hold the boundary); ED
safety untouched (U-C-3 and U-C-10 are FOUNDER-GATE); billing unchanged; free/Pro
gating preserved (the whole diary domain stays Pro by-stack via
`withProGuard(DiaryScreen, 'Food diary')`, RootNavigator.js:160, 225; NutritionTargets
Pro via withProGuard at RootNavigator.js:150).

FOUNDER-GATE: U-C-3 (contest-prep goal must respect calorie floors / rapid-loss
threshold), U-C-10 (diary anti-shame framing — ED-safety-adjacent, route to safety
owners).

Evidence-thin: U-C-3 (Carbon/RP periodisation, Finding 3.2 PARTIAL/VERIFIED),
U-C-7 (Volyume DB side wholly NOT DETERMINED IN CODE).

NOT-DETERMINED implementation facts flagged: U-C-1 (exact minimum engine inputs),
U-C-3 (contest-prep deficit %, engine accepting contest_prep as input goal),
U-C-4 (30-day chart rendering), U-C-5 (quick-add/scanned-food merge into staying-open
session), U-C-7 (backing food DB, provenance, verified marker, ranking — entire impl
side), U-C-8 (barcode input-validation rule), U-C-9 (per-user water-target storage
location and bounds), U-C-10 (presence of any streak mechanic).


<!-- ============ phase5/proposals-D-progress-retention.md ============ -->

# Phase 5 proposals — CLUSTER D: Progress tracking & retention / habit formation

> Drafted from already-produced, already-sourced documents (READ-ONLY, no new
> web research). British English. Dual-audience (newbie / athlete) stated
> separately. Every proposal traces to a finding in the comparison/research and
> every implementation detail traces to the Phase-1 inventory with file:line, or
> is explicitly marked NOT DETERMINED IN CODE.
>
> Sources read in full:
> - `phase3/compare-06-progress.md` (Progress tracking & visualisation)
> - `phase3/compare-09-retention.md` (Retention mechanics & habit formation)
> - `phase1/09-progress-analytics.md` (Progress & Analytics screens — file:line)
> - `phase1/03-home.md` (Home / FreeStarter screens — file:line)
>
> SACRED-constraint flags used: **FOUNDER-GATE** = touches ED-safety
> (`src/coaching/safety/`), deterministic-engine boundary, billing, or free/Pro
> gating; treated as INPUT ONLY, never an autonomous build.

---

```
ID: U-D-1
AREA: Progress tracking & visualisation
TITLE: Progress photos — a private, on-device visual progress log
SUGGESTED TIER: 2 High
IMPACT (1-10): 9 — compare-06 names this "the single largest absent feature for
  this area". Research rates photos as beating the scale for emotional
  reinforcement, the most legible early newbie win, and the recomp/contest-prep
  truth when scale weight is flat (2.2, 5.2 VERIFIED); a body-composition study
  found visual-progress trackers stayed more consistent than weight-only
  trackers (2.2 VERIFIED).
EFFORT (1-10): 6 — new capture/store/compare surface; must respect offline-first
  (local source of truth), EU residency, and no-PII-to-external rules. No
  existing photo component anywhere in the Phase-1 progress inventory, so this is
  net-new UI plus storage; the Body Metrics screen already owns the opt-in /
  calm-mode pattern this should reuse.
CURRENT STATE: No progress-photo capability appears anywhere in the Phase-1
  progress inventory (compare-06:142-148). The Body Metrics screen
  (src/screens/BodyMetricsScreen.js) is the nearest physique surface — it logs
  weight / body fat / 9 measurements behind a Pro guard + opt-in + calm-mode
  re-confirmation (09-progress-analytics.md:178-223; gating 09:196).
THE PROBLEM:
  - Newbie impact: the scale is the most demotivating early signal because body
    recomposition hides on it; photos are "the most legible early newbie win"
    and beat the scale for emotional reinforcement (2.2, 5.2 VERIFIED). Without
    photos, a beginner whose scale weight is flat sees no progress and is at the
    primary newbie churn point (compare-06:76-77).
  - Athlete impact: for recomp and contest prep, photos are "the truth when
    scale weight is flat" (5.2 VERIFIED) — a physique competitor currently has
    no in-app visual record alongside their measurements.
THE EVIDENCE: compare-06:142-148 (MISSING ENTIRELY, "single largest absent
  feature"); findings 2.2 and 5.2 — both VERIFIED (compare-06 VERIFICATION
  STATUS:192-195). No PARTIAL sub-claim is load-bearing.
BEST REFERENCE IMPLEMENTATION: The long tail of single-purpose App Store
  body-measurement / progress-photo trackers (#38–55) plus the general finding
  that visual-progress trackers out-retain weight-only trackers
  (compare-06:64-65, 2.2 VERIFIED). No single named best-in-class app for photos
  specifically in the fragment — the strength of the evidence is the category
  finding, not one exemplar.
PROPOSED SOLUTION: A private, on-device progress-photo log living inside the Body
  Metrics surface. Capture a photo (camera or gallery), store it locally with a
  date, optionally tag it to a measurement entry, and view a date-ordered grid
  plus a side-by-side two-photo compare. All images stay on device (offline-first
  + EU residency + no-PII rules); never uploaded to any external service. Neutral,
  non-valenced framing consistent with the existing Body Metrics safety handling.
NEWBIE EXPERIENCE: A "Photos" entry inside Body Metrics. First visit shows an
  encouragement-framed empty state ("Your first photo is your baseline") rather
  than a blank grid. One tap to capture; the photo appears dated in the grid. No
  jargon. Gives a beginner a visible win that the scale cannot.
ATHLETE EXPERIENCE: Date-tagged photos alongside the existing 9-site measurement
  grid and smoothed weight trend, with a side-by-side compare across any two
  dates — the contest-prep visual record that complements flat scale weight.
IMPLEMENTATION BLUEPRINT:
  - HOST SCREEN: src/screens/BodyMetricsScreen.js. Add a "Photos" section to the
    existing ScrollView (BodyMetricsScreen.js:725), placed after the
    Measurements snapshot block (currently BodyMetricsScreen.js:1000-1061) and
    before History (1063-1086), so the screen's visual-progress material sits
    together. Reuse the existing section-label treatment type.label/13
    (BodyMetricsScreen.js:1114-1116).
  - GATING: PRO. Body Metrics is wrapped `GatedBodyMetrics = withProGuard(
    BodyMetricsScreen, 'Body metrics')` (RootNavigator.js:151; registered
    347/386). Photos are physique-tracking and therefore Pro under the product's
    free/Pro split (CLAUDE.md: "check-ins" / physique are Pro). DO NOT expose to
    free users. Honour the in-screen opt-in (`PHYSIQUE_PREF_KEY`,
    BodyMetricsScreen.js:455-466) and the calm-mode re-confirmation
    (BodyMetricsScreen.js:684-712) — the same gates the rest of the screen uses.
  - EMPTY STATE: mirror EmptyBodyIllustration pattern already on this screen
    (BodyMetricsScreen.js:845-861, "Your progress starts here") with
    encouragement-framed copy; do NOT show a blank grid.
  - LOADED STATE: date-ordered grid of thumbnails; tap a thumbnail to view full;
    a "Compare" action picks two dates side-by-side.
  - ERROR STATES: camera/gallery permission denied → plain-English prompt, no
    crash; storage write failure → reuse the optimistic-save-with-rollback
    pattern already present (BodyMetricsScreen.js:633-663).
  - EDGE CASES: device-only storage and retention (mirror Snapshots' device-only
    framing, SnapshotsScreen.js:87-90); deletion must be possible; photos must be
    included in / excluded from the local snapshot+restore story
    (SnapshotsScreen.js) — confirm with founder which.
  - STORAGE MECHANISM, DB SCHEMA, AND IMAGE LIBRARY: NOT DETERMINED IN CODE —
    confirm before building. The Phase-1 inventory does not record any
    image-capture component, photo table, or file-store path. Adding an
    image-picker / camera dependency requires the CLAUDE.md "ask before adding a
    dependency" step (state package, purpose, licence; wait for yes).
VERIFICATION: Evidence all-VERIFIED (2.2, 5.2). Implementation host, placement,
  gating, opt-in/calm reuse and empty-state pattern are VERIFIED against
  Phase-1. NOT DETERMINED: photo storage mechanism, DB schema, image library,
  and snapshot inclusion — flagged above, confirm before building. Pro gating is
  a stated product rule, not a change; if any photo capability were proposed for
  free users that would be FOUNDER-GATE (free/Pro split) — not proposed here.
```

---

```
ID: U-D-2
AREA: Progress tracking & visualisation
TITLE: Live mid-session personal-best celebration moment
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — research calls live PR detection + an in-the-moment
  celebration "now table stakes" (4.2 VERIFIED; Hevy live PR, RepCount
  auto-confetti, FitPros recap cards). The upward strength signal is the single
  most-cited motivator that keeps users training (2.1, 6.3 VERIFIED).
EFFORT (1-10): 5 — PR detection logic and a PR concept already exist (static
  "PR" tag, landing PR sparkline, long-press share); the gap is an in-the-moment
  animated moment. The live trigger point is the active-workout screen, whose
  internals are NOT in this cluster's Phase-1 scope.
CURRENT STATE: Volyume surfaces PRs STATICALLY only — a "PR" tag on a lift row
  and a landing PR sparkline (09-progress-analytics.md:35, 110), and shares a PR
  via long-press PeekMenu → ShareCard (09:110, LiftProgressScreen.js:111-135).
  There is no in-the-moment celebration in the inventory (compare-06:122-126).
THE PROBLEM:
  - Newbie impact: a beginner setting an early PR gets no acknowledgement at the
    moment it happens; the celebratory feedback loop that builds the habit is
    absent (4.2 VERIFIED).
  - Athlete impact: competitors expect live PR detection + celebration as a
    baseline; its absence reads as a missing table-stakes feature (4.2 VERIFIED).
THE EVIDENCE: compare-06:122-126 (WHERE WE LAG, "no live mid-session PR
  celebration / confetti"); compare-06:149 (MISSING ENTIRELY). Finding 4.2 —
  VERIFIED (compare-06:192-195).
BEST REFERENCE IMPLEMENTATION: Hevy live PR notifications + RepCount auto-confetti
  + FitPros recap cards (compare-06:40-42, 124; "now table stakes"). Hevy's
  live-PR feature is the named exemplar (https://www.hevyapp.com/features/live-pr/
  — VERIFIED).
PROPOSED SOLUTION: When a logged set establishes a new personal best during an
  active session, show a brief, neutral-but-celebratory in-session moment (badge
  / lightweight animation) naming the lift and the new best, with an optional
  one-tap share that reuses the existing factual-stats-only share payload.
  Celebration must respect calm/ED flags (suppress or neutralise framing) exactly
  as the existing recap surfaces do.
NEWBIE EXPERIENCE: A first-timer who beats a previous best sees a clear,
  encouraging moment naming the achievement — the proven retention reward — with
  no jargon and no comparison to others.
ATHLETE EXPERIENCE: Live confirmation of a PR at the moment of the set, matching
  Hevy/RepCount, with one-tap share to the existing ShareCard.
IMPLEMENTATION BLUEPRINT:
  - TRIGGER LOCATION: the active-workout / set-logging screen. NOT DETERMINED IN
    CODE — the ActiveWorkout screen is referenced as a navigation target
    (HomeScreen.js:821,855,1148) but its file and set-logging internals are NOT
    in this cluster's Phase-1 scope (09-progress-analytics.md covers Progress
    screens only; 03-home.md covers Home). Confirm the active-workout file and
    where a set is committed before building.
  - PR DETECTION SOURCE: the existing estimated-1RM / "best" computation that
    already drives the "PR" tag and "est. max" on LiftProgress
    (LiftProgressScreen.js:244-294) — reuse it; do NOT introduce a second PR
    definition. Exact function/module NOT DETERMINED IN CODE; locate the existing
    e1RM/best calculation and call it from the live trigger.
  - SHARE PATH: reuse the existing factual-stats-only share payload + ShareCard
    navigation (YearOfLiftsScreen.js:425-471, LiftProgressScreen.js:123).
  - SAFETY FRAMING: neutralise/suppress under calm/ED flags exactly as recap and
    Body Metrics surfaces do (YearOfLiftsScreen.js:167,371-377;
    BodyMetricsScreen.js:757,1092-1108). Any new copy is user-facing string →
    British English. The celebration must NOT introduce comparison-to-others or
    loss-aversion mechanics (see U-D-8 founder note). Animation/celebration is
    presentation only; it must NOT touch `src/coaching/safety/` or the
    deterministic engine.
  - GATING: PRs and Lifts are FREE (LiftProgress registers with no withProGuard,
    RootNavigator.js:348; 09:113). Keep the celebration FREE to match.
VERIFICATION: Evidence all-VERIFIED (4.2, 2.1, 6.3). Share path, safety framing
  and free gating VERIFIED against Phase-1. NOT DETERMINED: the active-workout
  file/trigger point and the exact existing PR/e1RM function — both flagged,
  confirm before building.
```

---

```
ID: U-D-3
AREA: Progress tracking & visualisation
TITLE: Plain-English glossary / inline explanations for training jargon
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the jargon-heavy newbie experience is named as a direct
  collision with the research's sub-30-second-first-value and
  result-surfaced-and-interpreted standards (3.1, 3.3, F1.4, F9.1 VERIFIED).
  First-week activation is decisive (3.2 VERIFIED).
EFFORT (1-10): 4 — Volyume already has the right primitive (InfoTooltip) deployed
  on some surfaces; the work is extending plain-English explanation to the terms
  that currently lack it. No new architecture.
CURRENT STATE: Jargon appears across the progress and home surfaces, partly
  unexplained:
  - Landing: "This week's volume", "below target"/"over max", "est. max"
    (09-progress-analytics.md:41); the InfoTooltip on volume helps but the rest
    leans on jargon (09:41).
  - Consistency: "ACWR" in a section title, plus Mesocycle/deload/fatigue-trend
    (09:82-83); deload + frequency tooltips exist but section labels are
    coach-jargon (09:83).
  - Lifts: "est. max"/"estimated 1RM" is unexplained on the row itself (only
    relative-strength has a tooltip); level taxonomy Beginner→Elite has no in-row
    threshold explanation (09:115).
  - Volume: MEV/MAV/MRV, "working sets", ghost fills — the densest screen; legend
    is plain-English but the underlying model is not (09:156).
  - Body Metrics: "EWMA", "Estimated daily burn / adaptive TDEE", confidence
    tiers (09:199).
  - Home: "Deload week", "stop R short of failure" (RIR), "Recovery week
    suggested" unexplained at a glance (03-home.md:52).
THE PROBLEM:
  - Newbie impact: the empty/early experience is "a blank jargon canvas" against
    the standard of sub-30s first value and interpreted (not raw) results (3.1,
    3.3, F1.4 VERIFIED); this is the primary newbie churn point (compare-06:76).
  - Athlete impact: minimal — these terms are signal for a competitor (athlete
    verdict Strong, compare-06:83-86). The change must not dilute athlete depth.
THE EVIDENCE: compare-06:73-81 (NEWBIE VERDICT), compare-06:128-131 (WHERE WE
  LAG, jargon-heavy newbie experience); compare-09:96-101 (NEWBIE VERDICT,
  "newbies need the result surfaced and interpreted, not raw jargon"). Findings
  3.1, 3.2, 3.3, F1.4, F9.1 — all VERIFIED.
BEST REFERENCE IMPLEMENTATION: The research's interpreted-result standard
  generally; on the Volyume side the LiftProgress relative-strength InfoTooltip
  is called "genuinely educational" (09:114) — extend that same pattern.
PROPOSED SOLUTION: Add inline InfoTooltip explanations (the existing primitive)
  to the currently-unexplained terms, in plain British English, without removing
  the terms themselves (athletes keep their vocabulary; newbies get the
  translation on tap). Specifically: "est. max"/estimated-1RM on the Lifts row;
  the level-badge thresholds; "ACWR" / "Training load"; the MEV/MAV/MRV model and
  "working sets"; "EWMA" and "Estimated daily burn"; and the Home meso-chip
  terms ("Deload", "stop R short of failure"/RIR).
NEWBIE EXPERIENCE: Every advanced term carries a tap-for-plain-English tooltip;
  the first-timer can decode any number on screen in seconds. Reduces the "blank
  jargon canvas" friction without hiding capability.
ATHLETE EXPERIENCE: Unchanged surface; the depth and the terms remain. Tooltips
  are opt-in (tap), so a competitor is not slowed down.
IMPLEMENTATION BLUEPRINT:
  - PRIMITIVE: reuse the existing InfoTooltip already used on the landing volume
    strip (AnalyticsScreen.js:277-291), Consistency deload + frequency
    (ConsistencyScreen.js:54-70, 125-137), Lifts relative-strength
    (LiftProgressScreen.js:170-192), and Volume legend
    (VolumeHeatmapScreen.js:275-288). Do NOT introduce a new tooltip component.
  - EXACT PLACEMENTS (add InfoTooltip beside each):
    * Lifts "est. max" stat label — LiftProgressScreen.js:404-416 row
      (statValue/statLabel at :414-415); plus a level-threshold tooltip on the
      level badge (LiftProgressScreen.js:357-360).
    * Consistency "Training load (ACWR)" section label —
      ConsistencyScreen.js:110-114 (label at :111).
    * Volume MEV/MAV/MRV + "working sets": extend the existing legend tooltip
      (VolumeHeatmapScreen.js:275-288) to define the landmark model in plain
      English.
    * Body Metrics "Weight trend"/EWMA card (BodyMetricsScreen.js:766-797) and
      "Estimated daily burn" card (BodyMetricsScreen.js:799-825) — add tooltips
      to the section labels.
    * Home meso-chip terms (HomeScreen.js:1180-1202) and deload banner
      (HomeScreen.js:1068-1096) — add a tap-for-plain-English explanation.
  - COPY: plain British English (colour, behaviour, etc.); newbie-legible, one or
    two short lines each.
  - STATES: tooltip is presentation only; no empty/error states beyond the
    existing InfoTooltip behaviour. Touch target: ensure any new tap glyph carries
    hitSlop to clear 44px (the file already uses hitSlop 8–10 on small targets,
    AnalyticsScreen.js:189,225,316).
  - DO NOT: remove or rename any term, change a calculation, or alter the engine /
    safety code. This is additive explanation only.
  - EXACT TOOLTIP COPY STRINGS: NOT DETERMINED IN CODE — must be written to spec
    and reviewed; the inventory gives the terms, not approved definitions.
VERIFICATION: Evidence all-VERIFIED. Primitive and every placement VERIFIED
  against Phase-1 file:line. NOT DETERMINED: the approved plain-English wording
  for each term — flagged, write to spec and confirm.
```

---

```
ID: U-D-4
AREA: Progress tracking & visualisation
TITLE: Encouragement-framed empty and near-empty progress states
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — best practice is sub-30-second first value and
  encouragement-framed (not blank) near-empty charts; the empty state is the
  primary newbie churn point and first-week activation is decisive (3.1, 3.2,
  3.3 VERIFIED).
EFFORT (1-10): 3 — empty states already exist on several screens; the work is
  making them encouragement-framed and consistent, and handling the
  near-empty-chart case. Small, copy-and-presentation scoped.
CURRENT STATE: Empty states exist but are factual rather than encouragement-framed
  in places:
  - Landing: EmptyChartIllustration + "No data yet" + body copy
    (AnalyticsScreen.js:200-208) — explicit but neutral/flat (09:39, 76).
  - Lifts: "No lifts logged yet"/"No recent bests" + explainer
    (LiftProgressScreen.js:295-308).
  - Body Metrics: EmptyBodyIllustration + "Your progress starts here" +
    onboarding-weight-aware copy (BodyMetricsScreen.js:845-861) — this one IS
    encouragement-framed already and is the model.
  - Year of Lifts: legible but data-gated until 10 sessions / 365 days
    (09:279-280); rated the one fully newbie-legible screen (09:282).
THE PROBLEM:
  - Newbie impact: a first-timer most often meets an empty or near-empty chart;
    "No data yet" is accurate but does not encourage the next action, against the
    encouragement-framed standard (3.3 VERIFIED) at the decisive first-week
    moment (3.2 VERIFIED).
  - Athlete impact: minimal — athletes rarely sit on empty states, and the
    cold-start-import need is handled separately (U-D-5).
THE EVIDENCE: compare-06:76-81 (NEWBIE VERDICT, empty state = primary churn
  point, near-empty charts must be encouragement-framed). Findings 3.1, 3.2, 3.3
  — all VERIFIED (compare-06:192-195).
BEST REFERENCE IMPLEMENTATION: Hevy's near-empty encouragement framing and the
  Volyume Body Metrics empty state itself ("Your progress starts here",
  BodyMetricsScreen.js:845-861) — the in-app exemplar to copy across.
PROPOSED SOLUTION: Bring the landing and Lifts empty states up to the
  encouragement-framed standard set by Body Metrics, and add an
  encouragement-framed near-empty state for charts with 1–2 data points (frame
  the first logged session as progress rather than showing a near-blank chart).
NEWBIE EXPERIENCE: After one logged session the progress screens say something
  encouraging and point to the next action, instead of a flat "No data yet". The
  first week feels like momentum.
ATHLETE EXPERIENCE: Unchanged once populated; near-empty framing only appears in
  the first one or two sessions.
IMPLEMENTATION BLUEPRINT:
  - LANDING: AnalyticsScreen.js:200-208 — revise empty-state body copy to
    encouragement framing matching BodyMetricsScreen.js:845-861. Keep the
    EmptyChartIllustration (140px, AnalyticsScreen.js:203).
  - LIFTS: LiftProgressScreen.js:295-308 — encouragement-framed copy for both the
    "No lifts logged yet" and "No recent bests" variants.
  - NEAR-EMPTY: for charts/sparklines with 1–2 points, show an encouragement line
    rather than a near-flat chart. Sparkline lives per-row (LiftProgressScreen.js:
    288) and the landing PRSparkline (AnalyticsScreen.js:307-326); decide a
    minimum-points threshold below which the encouragement line shows.
  - SAFETY: copy must stay neutral / non-valenced consistent with the ED-aware
    framing already in place (no weight-loss or appearance framing); British
    English.
  - DO NOT change gating, calculations, or the data-gating thresholds for Year of
    Lifts / Recaps (those are separate, U-D-7 touches the cold-start window).
  - EXACT COPY: NOT DETERMINED IN CODE — write to spec; the inventory gives the
    current strings and the standard, not the approved replacements.
VERIFICATION: Evidence all-VERIFIED (3.1, 3.2, 3.3). In-app exemplar and exact
  edit locations VERIFIED against Phase-1. NOT DETERMINED: replacement copy and
  the near-empty threshold — flagged, write to spec.
```

---

```
ID: U-D-5
AREA: Progress tracking & visualisation / cold-start
TITLE: Fast training-history import / backfill so the long graph appears at once
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — the long upward strength line over months is the reason
  experienced users stay (2.1 VERIFIED); the athlete's distinct churn risk is
  cold-start data portability — getting the long graph to appear immediately
  (3.1, 3.2 VERIFIED). compare-06 flags this and notes it is "absent from the
  Phase-1 inventory".
EFFORT (1-10): 7 — net-new import/parse/validate pipeline that must write through
  the local DB (offline-first source of truth) and the sync layer only; no
  evidenced import surface for training history in this cluster's scope.
CURRENT STATE: No fast history import/backfill for experienced users is in the
  Phase-1 progress inventory (compare-06:137-139). An `Import` screen is named in
  navigation (compare-09:113 → ultimate-audit-00-navigation-psychology.md:148)
  but its scope (whether it imports training history, and in what format) is NOT
  DETERMINED IN CODE.
THE PROBLEM:
  - Athlete impact: a competitor switching apps starts with an empty long graph —
    the very thing that retains them — and may churn before their history
    accrues (3.1, 3.2 VERIFIED; "the cold-start the research names as the
    athlete's churn risk").
  - Newbie impact: low — a beginner has no prior history to import.
THE EVIDENCE: compare-06:90-93 (ATHLETE VERDICT, cold-start data portability),
  compare-06:137-139 (WHERE WE LAG). Findings 2.1, 3.1, 3.2 — all VERIFIED.
BEST REFERENCE IMPLEMENTATION: Setgraph — complete movement history regardless of
  routine ("every time you train an exercise, you see your complete history",
  compare-06:53-55, VERIFIED). Hevy/Strong-style history portability is the
  athlete expectation.
PROPOSED SOLUTION: An import flow that ingests prior training history (e.g. a
  CSV/standard export from a competitor app) and backfills the local DB so the
  Lifts e1RM trend, Volume, and Consistency screens immediately show the full
  history. Must validate/normalise units (the lbs/kg correctness care already
  shown at LiftProgressScreen.js:72-78 applies) and respect offline-first +
  sync-layer-only writes.
NEWBIE EXPERIENCE: Not targeted; offered but skippable. A first-timer ignores it.
ATHLETE EXPERIENCE: On first run (or from the Import screen), bring across months
  of history so the upward strength line — the retention anchor — is present from
  day one rather than after months of re-logging.
IMPLEMENTATION BLUEPRINT:
  - ENTRY: the existing `Import` route (ultimate-audit-00-navigation-psychology.md
    :148) is the candidate home, but its current scope is NOT DETERMINED IN CODE —
    confirm whether it already handles training history or only something else
    before extending vs adding.
  - WRITE PATH: import must write to the LOCAL DB (source of truth on device) and
    propagate via the sync layer only — components never write Supabase directly
    (CLAUDE.md ARCHITECTURE). The exact local-DB write API and the sync entry
    point are NOT DETERMINED IN CODE in this cluster's scope — confirm.
  - DOWNSTREAM: once backfilled, the Lifts list/e1RM (LiftProgressScreen.js:
    244-294), Volume bars (VolumeHeatmapScreen.js:299-351) and Consistency
    calendar (ConsistencyScreen.js:140-145) should reflect history with no extra
    work if they read from the same store — VERIFY they read local store, not a
    session-scoped cache.
  - FORMAT(S) TO SUPPORT, UNIT-NORMALISATION RULES, AND DEDUP/CONFLICT HANDLING:
    NOT DETERMINED IN CODE — must be specified before building.
  - GATING: history import is a free-tier-relevant data-portability feature
    (logging + progress stats are free per CLAUDE.md); confirm tier with founder —
    if placed behind Pro that is a free/Pro decision (FOUNDER-GATE).
VERIFICATION: Evidence VERIFIED on the market side (2.1, 3.1, 3.2). EVIDENCE-THIN
  on the Volyume side: the gap rests on a NOT-FOUND-in-inventory observation
  (compare-06:139, compare-09:113) — the `Import` screen exists but its scope is
  unknown. NOT DETERMINED: Import-screen scope, local-DB write API, sync entry
  point, supported formats, unit/dedup rules, and tier — all flagged, confirm
  before building. Mark this proposal evidence-thin on implementation facts.
```

---

```
ID: U-D-6
AREA: Retention mechanics / data portability
TITLE: Data export of accumulated training history
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — athletes stay because of exportable history (it is part of the
  switching-cost / ownership anchor); F1.4, F9.1 VERIFIED on the market side.
EFFORT (1-10): 5 — read the local history and serialise to a file; offline-first
  read, no external upload of PII.
CURRENT STATE: Export is NOT DETERMINED IN CODE. compare-09 states an `Import`
  screen exists (ultimate-audit-00-navigation-psychology.md:148) but "export
  status NOT DETERMINED IN CODE" (compare-09:111-113, 152, 205). No export
  surface appears in the Phase-1 progress inventory either.
THE PROBLEM:
  - Athlete impact: experienced lifters want to own and move their data; absence
    of export weakens the ownership story (F1.4, F9.1 VERIFIED). It is also the
    reciprocal of U-D-5 — portability in both directions.
  - Newbie impact: low.
THE EVIDENCE: compare-09:150-152 (WHERE WE LAG, "Progress is interpreted but
  possibly not exportable"), compare-09:159-160 (MISSING ENTIRELY, "Data
  export"). Findings F1.4, F9.1 VERIFIED; the Setgraph reference is PARTIAL.
BEST REFERENCE IMPLEMENTATION: Strava (open API / export) and Setgraph
  (compare-09:159-160). Setgraph is PARTIAL; Strava's export/API is the VERIFIED
  anchor (F9.1).
PROPOSED SOLUTION: An export action that serialises the user's accumulated
  training history (sessions, sets, e1RM-relevant data, optionally body metrics)
  to a standard on-device file the user can share/save. No upload to any external
  service (no-PII rule); export is a local file the user controls.
NEWBIE EXPERIENCE: Not targeted; harmless if ignored. Reassures that data is
  theirs.
ATHLETE EXPERIENCE: One action produces a portable file of their full history —
  the ownership/switching-cost anchor.
IMPLEMENTATION BLUEPRINT:
  - PLACEMENT: the You/Settings "Your data" area is the natural home — the same
    region that hosts Snapshots ("Settings, Your data", RootNavigator.js:859;
    Snapshots route RootNavigator.js:381). Confirm exact settings location.
  - READ PATH: read from the LOCAL DB (source of truth) only; never from Supabase
    directly (CLAUDE.md ARCHITECTURE). Exact local-DB read API NOT DETERMINED IN
    CODE in this cluster's scope — confirm.
  - FORMAT: NOT DETERMINED — specify (CSV / JSON) before building; ideally a format
    symmetric with the U-D-5 import.
  - PRIVACY: file stays on device / user-shared only; no analytics, no external
    send (no-PII rule).
  - GATING: NOT DETERMINED — data-export tier is a free/Pro decision (FOUNDER-GATE
    if gated); export of one's own data is arguably a free/ownership feature,
    confirm with founder.
  - EDGE CASES: empty history → disabled/explained action; large history →
    progress indication.
VERIFICATION: Evidence VERIFIED on market side (F1.4, F9.1); Setgraph reference is
  PARTIAL (named only as breadth colour, not load-bearing). EVIDENCE-THIN on the
  Volyume side (rests on "export NOT DETERMINED IN CODE", compare-09:152,205).
  NOT DETERMINED: existing export presence, settings location, local-DB read API,
  format, and tier — all flagged. Mark evidence-thin on implementation facts.
```

---

```
ID: U-D-7
AREA: Retention mechanics / cold-start scaffolding
TITLE: Bridge the ~7–15 session personalisation window after the trial banners end
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — the cold-start / cliff is where the cliff bites hardest;
  personalisation-payoff apps retain only if the user survives the ~7–15 session
  window (Fitbod "struggles to retain beyond the first seven"); trial banners
  stop at day 7 leaving a gap (F3.2, F7.2 VERIFIED).
EFFORT (1-10): 4 — reuses the existing typed-notification + Home-banner machinery;
  no new architecture, primarily a new trigger/condition and copy.
CURRENT STATE: Trial value-countdown banner runs Pro trial days 2–7 when no coach
  output exists (03-home.md:21, HomeScreen.js:1039-1065); `trial_day3` notification
  routes to WeeklyCheckIn/Home (ultimate-audit-00-navigation-psychology.md:236);
  `winback` handles +30-day lapse (:240). No evidenced mechanic bridges the
  ~7–15-session gap between trial-banner end and personalisation payoff
  (compare-09:146-149).
THE PROBLEM:
  - Newbie impact: the cliff (days/sessions 1–15) is where beginners quit; once
    the day-7 trial banner stops, nothing scaffolds the user to the point the
    progress data and coaching become rewarding (F3.2, F7.2 VERIFIED).
  - Athlete impact: low — an athlete with imported history (U-D-5) already has a
    rich graph; this is a beginner-retention bridge.
THE EVIDENCE: compare-09:146-149 (WHERE WE LAG, "Cold-start / cliff scaffolding
  stops early"). Findings F3.2, F7.2 — VERIFIED (compare-09:193-195).
BEST REFERENCE IMPLEMENTATION: Fitbod's missing piece is named as exactly this
  gap (compare-09:82-83, 164-165); the fix is graded structure + interpreted
  reward (Zombies Run / C25K / NTC carry beginners past the cliff, F8/F9.2
  VERIFIED).
PROPOSED SOLUTION: Extend the existing Home banner / typed-notification scaffolding
  so that between roughly session ~3 and ~15 the user receives an interpreted
  progress moment (e.g. surfacing "you've logged N sessions — here's what's
  improving"), reusing the free weekly coach one-liner mechanism rather than a new
  engine. NON-AI, deterministic, built from logged data only.
NEWBIE EXPERIENCE: After the day-7 trial banner ends, the free user keeps getting
  a short, interpreted "here's your progress" nudge through the cliff window,
  pointing back at the visible progress that retains them.
ATHLETE EXPERIENCE: Largely irrelevant / suppressible once enough history exists.
IMPLEMENTATION BLUEPRINT:
  - REUSE: the free weekly coach one-liner (`showFreeCoachLine` /
    `buildFreeCoachLine` / `loadFreeCoachLine`, HomeScreen.js:383-411, 943-944,
    1099-1122) is the existing deterministic, data-derived interpreted line —
    extend its trigger to cover the ~3–15-session window, OR add a parallel
    cold-start line using the same builder. DO NOT introduce AI/LLM or randomness
    (CLAUDE.md SACRED: deterministic engine).
  - NOTIFICATION: reuse the typed/deep-linked notification system
    (ultimate-audit-00-navigation-psychology.md:166-176, notificationRoute.js:
    20-65) if a push is wanted; respect the per-category notification controls
    (RootNavigator.js:377,396). Content must VARY (see U-D-9) — repetition drives
    fatigue (F6.3 VERIFIED).
  - DATA SOURCE: sessions-this-week + existing progress signals already used by
    the free coach line (HomeScreen.js:383-411). No new data needed.
  - ONE-BANNER INVARIANT: respect it (HomeScreen.js:924-944) — this must slot into
    the existing priority order, not stack a new always-on banner.
  - SAFETY: any copy touching nutrition/weight is safety-adjacent and must respect
    calorie floors / rapid-loss threshold / Beat UK signposting — keep this nudge
    to training-progress framing to stay clear (see FOUNDER note on U-D-9). British
    English.
  - GATING: free-tier cold-start bridge (the free coach line is free,
    HomeScreen.js:943). Keep free.
  - EXACT TRIGGER THRESHOLDS (session counts) AND COPY: NOT DETERMINED IN CODE —
    specify before building.
VERIFICATION: Evidence all-VERIFIED (F3.2, F7.2, F8/F9.2). Reuse machinery and
  one-banner constraint VERIFIED against Phase-1. NOT DETERMINED: exact
  session-count thresholds and copy — flagged. NOTE: if the bridge copy ever
  frames weight/calories, that is safety-adjacent → FOUNDER-GATE; this proposal
  scopes it to training-progress framing to avoid that.
```

---

```
ID: U-D-8
AREA: Retention mechanics / habit formation
TITLE: Lenient consistency reward (weekly "showing up" recognition) — RESEARCH INPUT ONLY
SUGGESTED TIER: 4 Enhancement (FOUNDER-GATE — do not build autonomously)
IMPACT (1-10): 8 (claimed) — lenient streaks (freezes, grace, "X sessions/week")
  are reported to raise commitment ~60% and cut at-risk churn ~21% (F5.1, F5.2
  VERIFIED). Impact is contingent on the founder accepting the ED-safety trade.
EFFORT (1-10): 5 — Volyume already has the lenient WEEKLY shape (WeeklyStreakStrip
  + Consistency StreakWeeksSection); the question is whether to add any reward
  emphasis, not architecture.
CURRENT STATE: Volyume has the SAFE shape already: a "This week" consistency strip
  (WeeklyStreakStrip) that self-hides for brand-new users and under a wellbeing
  flag (AnalyticsScreen.js:177-197), a Consistency "Your weeks" StreakWeeksSection
  (ConsistencyScreen.js:46), milestone rows ("4 weeks of showing up.",
  AnalyticsScreen.js:180-195), and "sessions this week" framing (03-home.md:31).
  A DAILY streak counter / streak-freeze / unbroken-chain mechanic is NOT
  DETERMINED IN CODE (compare-09:51-56) — i.e. not evidenced, treated as
  not-evidenced rather than confirmed-absent.
THE PROBLEM:
  - Newbie impact: no explicit streak/consistency REWARD scaffolds the habit
    through days 1–3 and the cold-start window (F7.2 VERIFIED) — but the research
    ALSO documents the harm (guilt/shame, compulsion) and the ED-risk literature
    (F4.4, F5.3, 7.2).
  - Athlete impact: a strict DAILY streak is "actively harmful for an athlete
    whose programme includes rest days" (F5.3 VERIFIED) — the existing
    weekly/Consistency framing is the correct shape for them (compare-09:115-117).
THE EVIDENCE: compare-09:137-141 (WHERE WE LAG, with the explicit "See ED-safety
  note — research-input only"), compare-09:155-156 (MISSING), and the **ED-SAFETY
  NOTE at compare-09:180-190** which states: "Strict daily streaks conflict with
  rest days AND with the ED-safety boundary… streak adoption [is] STOP-and-ask
  territory given the ED rules… Any streak/consistency reward is a founder
  decision, not an autonomous build." Findings F5.1, F5.2, F5.3, F4.4, 7.2 —
  VERIFIED (the 2017/2023 ED-study FIGURES are PARTIAL, compare-06:184-187).
BEST REFERENCE IMPLEMENTATION: Duolingo's lenient streak (Streak Freeze / grace;
  leniency raised DAU, Streak Freeze cut at-risk churn ~21%, F5.2 VERIFIED) and
  Gentler Streak (rest days don't break the streak; sick/injured/off statuses;
  Apple Watch App of the Year 2022, compare-06:47-49 VERIFIED) — the
  supportive-not-punitive model.
PROPOSED SOLUTION (INPUT ONLY — NOT TO IMPLEMENT WITHOUT FOUNDER SIGN-OFF): If the
  founder chooses to add any reward emphasis, it must be the LENIENT WEEKLY model
  only — never a daily chain, never loss-aversion / shame framing, with rest days
  and a grace/"life happens" allowance built in (Gentler Streak model), respecting
  `src/coaching/safety/` untouched and the wellbeing-flag self-hide already present.
  Options for the founder: (a) leave as-is (the existing weekly strip is already
  the safe shape); (b) add a gentle, non-punitive weekly recognition; (c) do
  nothing on streaks and invest the retention effort in U-D-3/U-D-4/U-D-7 instead.
NEWBIE EXPERIENCE: (if chosen) gentle weekly "you showed up" recognition that
  never guilts a missed day. (if not) unchanged — the existing milestone rows
  already provide light recognition.
ATHLETE EXPERIENCE: must remain weekly/rest-day-aware; a daily streak would be
  harmful and is explicitly out (F5.3 VERIFIED).
IMPLEMENTATION BLUEPRINT (for the founder's decision, NOT a build order):
  - Surfaces that already exist and must be reused, not replaced:
    WeeklyStreakStrip (AnalyticsScreen.js:177-197), milestone rows
    (AnalyticsScreen.js:180-195), Consistency StreakWeeksSection
    (ConsistencyScreen.js:46). The wellbeing-flag self-hide
    (AnalyticsScreen.js:177-197) and ED-aware neutral framing must remain.
  - HARD CONSTRAINTS (CLAUDE.md SACRED): never modify/disable/work around
    `src/coaching/safety/`; never introduce daily-streak loss-aversion pressure;
    any nutrition/weight-adjacent notification respects calorie floors, the
    1.5%/week rapid-loss threshold, and Beat UK signposting.
  - The internals of WeeklyStreakStrip / StreakWeeksSection are NOT DETERMINED IN
    CODE (sub-component files not in this cluster's scope).
VERIFICATION: FOUNDER-GATE — explicitly research-input-only per compare-09:180-190
  and the dispatch brief. Market findings VERIFIED; the ED-harm STUDY FIGURES are
  PARTIAL (compare-06:184-187) — do not present as fully verified. Volyume daily-
  streak absence is NOT DETERMINED IN CODE (not asserted absent). DO NOT BUILD
  without explicit founder "proceed".
```

---

```
ID: U-D-9
AREA: Retention mechanics / notifications
TITLE: Vary notification content so reminders don't become noise — SAFETY-ADJACENT
SUGGESTED TIER: 4 Enhancement (FOUNDER-GATE for any nutrition/weight-framed copy)
IMPACT (1-10): 6 — "content repetition, not frequency, drives fatigue"; users
  want reminders that vary and aren't noise (F6.3 VERIFIED). Disciplined typed
  notifications already align with the recommended envelope (F6.2/F6.3 VERIFIED).
EFFORT (1-10): 3 — the typed-notification system + per-category controls already
  exist; the work is content variation, not new plumbing.
CURRENT STATE: Volyume runs a typed push-notification system with deep-link
  routing per type (`weekly_checkin`, `year_of_lifts_unlock`, `monthly_recap`,
  `cascade_gate`, `weekly_coach_ready`, `winback`, `partner_cheer`,
  `checkin_missed`, `trial_day3` — ultimate-audit-00-navigation-psychology.md:
  166-176, notificationRoute.js:20-65) with per-category controls
  (SettingsNotifications RootNavigator.js:377; NotificationSettings :396;
  CoachingReminders GATED :398). This already beats single on/off toggles
  (compare-09:124-127). Whether copy VARIES per send is NOT DETERMINED IN CODE.
THE PROBLEM:
  - Newbie + athlete impact: repeated identical reminder copy drives opt-out;
    users explicitly want "something different" each time (F6.3 VERIFIED). The
    delivery system is good; the content-variation discipline is the gap.
THE EVIDENCE: compare-09:171-173 (USER SENTIMENT, "Reminders that vary and aren't
  noise"), compare-09:124-127 (WHERE WE LEAD on delivery design). Finding F6.3 —
  VERIFIED.
BEST REFERENCE IMPLEMENTATION: The research's varied-content standard generally
  (F6.3 VERIFIED); Volyume's own typed/deep-linked system is the right delivery
  envelope to layer variation onto (compare-09:124-127).
PROPOSED SOLUTION (INPUT — copy that touches nutrition/weight is FOUNDER-GATE):
  Maintain a small set of varied, deterministic copy variants per notification
  type so successive sends of the same type differ. NO AI / no generation
  (deterministic engine boundary) — a curated rotation only. Any variant that
  references calories/weight-loss is safety-adjacent and must respect the calorie
  floors, the 1.5%/week rapid-loss threshold and Beat UK signposting.
NEWBIE EXPERIENCE: reminders feel fresh, not nagging — supports habit formation
  without the chore/guilt cycle (F4.2/F4.4 VERIFIED).
ATHLETE EXPERIENCE: same; less likely to mute notifications.
IMPLEMENTATION BLUEPRINT:
  - REUSE: the existing typed notification system and route helper
    (notificationRoute.js:20-65, ultimate-audit-00-navigation-psychology.md:
    166-176); add curated copy variants per type, selected deterministically (no
    randomness — CLAUDE.md). Per-category controls already exist
    (RootNavigator.js:377,396,398) — do not change them.
  - SAFETY (FOUNDER-GATE): any nutrition/weight-framed variant is safety-adjacent
    (compare-09 ED-SAFETY NOTE:188-190) — respect calorie floors (1,200 women /
    1,500 men), the 1.5%/week rapid-loss threshold, and Beat UK signposting; do
    NOT touch `src/coaching/safety/`. Training-only variants are not safety-gated.
  - LANGUAGE: all variants British English.
  - WHERE NOTIFICATION COPY CURRENTLY LIVES / whether it already varies: NOT
    DETERMINED IN CODE — locate the copy source before adding variants.
VERIFICATION: Evidence VERIFIED (F6.3, F6.2, F4.2/F4.4). FOUNDER-GATE for any
  nutrition/weight-framed copy (safety-adjacent, compare-09:188-190). NOT
  DETERMINED: current notification copy location and whether variation already
  exists — flagged, confirm before building. Training-only copy variation is not
  gated; nutrition/weight copy requires founder sign-off.
```


<!-- ============ phase5/proposals-E-onboarding-newbie.md ============ -->

# Phase 5 proposals — CLUSTER E: Onboarding & newbie/light-user experience

Cluster sources (read in full):
- `phase3/compare-07-onboarding.md` (Onboarding & first-time experience)
- `phase3/compare-13-newbie.md` (Newbie & light-user experience)
- `phase1/11-onboarding-auth.md` (Welcome, FirstRun, Quiz, Login, ProOnboarding, ProSetupComplete, Article9Consent, Import)
- `phase1/03-home.md` (Home / FreeStarter)

Conventions: IDs U-E-n. British English. SACRED constraints respected — deterministic
engine (no AI/LLM), ED-safety untouched, billing unchanged, free/Pro gating absolute.
Any proposal that alters the onboarding SEQUENCE, the consent gate, or the trial-grant
coupling is flagged FOUNDER-GATE and treated as INPUT ONLY (per dispatch:
"FOUNDER-GATE onboarding-sequence/consent changes").

---

ID: U-E-1
AREA: Onboarding & newbie education — jargon
TITLE: Inline tap-to-define glossary for coaching terms shown before they are explained
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — "terminology must be glossed inline the first time shown" is the
  clearest beginner weakness in BOTH cluster fragments; instructiveness was the single
  most-mentioned valued attribute in the qualitative study (24×, ahead of personalisation)
  (compare-13 USER SENTIMENT, F1.3 VERIFIED; compare-13 WHERE WE LAG, F6.1 VERIFIED).
EFFORT (1-10): 4 — additive component + a static term map; touches several existing
  surfaces but no engine, no gating, no sequence change. The terms and their host
  screens are all enumerated in Phase-1.
CURRENT STATE:
  - Welcome shows "Precision Coaching™" with no gloss (WelcomeScreen.js:25 per
    11-onboarding-auth.md:66) and "division-specific" framing pre-explanation.
  - Home meso chip shows "Deload week" / "stop R short of failure" (RIR) unexplained
    (HomeScreen.js:1180–1202, 1193–1198 per 03-home.md:52); "Recovery week suggested"
    deload banner (HomeScreen.js:1068–1096) unexplained.
  - ProOnboarding step 4 shows phase (cut/lean-gain/maintain), competition divisions,
    protein "optimised/advanced", and body-fat methods BIA/caliper/DEXA unexplained
    (ProOnboardingScreen.js:1175–1309 per 11-onboarding-auth.md:206).
  - No inline tap-to-define affordance exists on any audited surface (compare-13 WHERE
    WE LAG; compare-07 WHERE WE LAG).
THE PROBLEM:
  Newbie impact: a brand-new gym-goer meets working vocabulary (RIR/deload/macros/
  divisions/BIA) with no inline definition, producing the "built for someone else"
  feeling the research names (compare-13 NEWBIE VERDICT; F3.1/F3.3 VERIFIED). Athlete
  impact: none negative — for an experienced lifter these are expected working terms;
  the gloss must be dismissible/non-intrusive so it never nags them (F6.2 ATHLETE,
  PARTIAL — carried as a constraint, not the justification).
THE EVIDENCE:
  - compare-13 WHERE WE LAG: "No inline tap-to-define glossary for RPE/RIR/AMRAP/macros/
    progressive overload" — F6.1 VERIFIED; F6.2 terminology-barrier ranking PARTIAL.
  - compare-07 WHERE WE LAG: "Jargon before explanation on the first screen … violates
    F3.5 and F6.1 (no jargon for newbies, VERIFIED). Best-in-class teaches science
    inside the questions (Noom green/yellow/red, F3.1)."
  - compare-07 MISSING ENTIRELY: "No just-in-time progressive disclosure for the dense
    steps … F3.3 (progressive disclosure / tooltips) is the named anti-overwhelm
    pattern (VERIFIED)."
BEST REFERENCE IMPLEMENTATION:
  Noom — teaches the science INSIDE the questions (green/yellow/red food teaching) rather
  than naming concepts cold (compare-07 BEST IN CLASS; F3.1 VERIFIED). The pattern to
  copy is in-context definition at the point the term first appears, not a separate
  glossary page.
PROPOSED SOLUTION:
  A lightweight, reusable "DefinedTerm" inline affordance: terms render with a subtle
  dotted underline / info-dot; tapping opens a small bottom-sheet or popover with a
  one-to-two-sentence plain-English definition and (optionally) a "why it matters" line.
  Definitions come from a single static term map (deterministic, no AI). Each term is
  glossed the FIRST time it is shown on a surface; the affordance is visually quiet so
  athletes can ignore it. No copy is removed — the gloss is additive.
NEWBIE EXPERIENCE: First time they meet "RIR", "Deload", "macros", "BIA", "division",
  or "Precision Coaching™", a tap reveals a plain definition without leaving the screen —
  the "teaching beats cheerleading" want (compare-13 USER SENTIMENT, F1.2 VERIFIED).
ATHLETE EXPERIENCE: Unchanged reading flow; the dotted underline is ignorable and the
  sheet only opens on explicit tap, satisfying the dismissible-not-forced constraint
  (F6.2 ATHLETE, PARTIAL).
IMPLEMENTATION BLUEPRINT:
  - New reusable component (e.g. `DefinedTerm`) — NOT DETERMINED IN CODE whether a
    tooltip/popover primitive already exists; confirm before building (no such component
    is cited in 11-onboarding-auth.md or 03-home.md).
  - Static term map (term → definition) as a new data file. Deterministic, no LLM.
    Initial term set from the audited gaps: "Precision Coaching™", "division" /
    "division-specific", "RIR / stop R short of failure", "Deload" / "Recovery week",
    "macros", "BIA", "caliper", "DEXA", "cut / lean-gain / maintain (phase)",
    "protein optimised/advanced".
  - Wiring points (exact, from Phase-1):
    · Welcome "Precision Coaching™" (WelcomeScreen.js:25).
    · Home meso chip (HomeScreen.js:1180–1202; text :1193–1198) and deload banner
      (HomeScreen.js:1068–1096).
    · ProOnboarding step 4 controls (ProOnboardingScreen.js:1175–1309) — phase,
      division, protein tier; and step 2 body-fat method segmented control
      (ProOnboardingScreen.js:879–1097, method visual/BIA/caliper/DEXA).
  - Gating: none — purely presentational; appears on both Free and Pro surfaces where
    the term appears. (Home is a Free screen with Pro-conditional content per
    03-home.md:40; the Pro-only terms render only when their Pro content renders, so no
    gating change is needed.)
  - States: empty/loaded/error — the sheet is static content, no fetch; if a term is
    missing from the map, render plain text with NO underline (fail-safe, never a broken
    affordance).
  - Edge cases: larger-text toggle must scale the sheet text (use tokens, not literals);
    Reduce Motion must skip any open/close animation (match existing pattern, e.g.
    WelcomeScreen.js:36–46). Touch target of the term tap ≥44px via hitSlop.
VERIFICATION: Justification VERIFIED (F6.1, F1.3, F1.2, F3.1, F3.3). Athlete-dismissibility
  constraint PARTIAL (F6.2 ATHLETE) — carried as a design constraint, not load-bearing.
  Whether a reusable tooltip/popover primitive exists is NOT DETERMINED IN CODE — confirm
  before building.

---

ID: U-E-2
AREA: Onboarding — Pro acquisition front door (Welcome)
TITLE: Gloss or defer "Precision Coaching™" / "division-specific" so the first screen does not front-load jargon
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — first-impression physics: jargon on the very first screen risks the
  "built for someone else" feeling before any value is shown (compare-07 NEWBIE VERDICT;
  compare-13 WHERE WE LAG, F3.1/F3.3 VERIFIED).
EFFORT (1-10): 2 — copy/treatment change on one screen; the exact strings and lines are
  in Phase-1. No logic, no gating, no sequence change.
CURRENT STATE:
  Welcome PRO_BULLETS and headings use "Precision Coaching™" cold (WelcomeScreen.js:25,
  bullets :22–27 per 11-onboarding-auth.md:58, 66) and a "division-specific" framing
  before any explanation; PRO_BULLETS are long two-sentence lines at fontSize.sm (13),
  flagged "heavy reading on a landing screen" (11-onboarding-auth.md:66).
THE PROBLEM:
  Newbie impact: meets the brand term and "division-specific" with no context
  (11-onboarding-auth.md:67 "assume domain knowledge a first-timer lacks"). Athlete
  impact: minimal — but note the Pro bullets do NOT yet name competition divisions for an
  experienced competitor either (11-onboarding-auth.md:68), so this is a clarity, not a
  depth, fix.
THE EVIDENCE:
  - compare-07 WHERE WE LAG: jargon before explanation on the first screen — F3.5/F6.1
    VERIFIED.
  - compare-13 WHERE WE LAG: "Jargon front-loaded before explanation on the Pro
    acquisition path ('Precision Coaching™', 'division-specific' on Welcome before any
    gloss — 11-onboarding-auth.md:66–67)" — F3.1/F3.3 VERIFIED.
  - Phase-1 CURRENT WEAKNESSES (WelcomeScreen): "'Precision Coaching™' jargon appears
    before any explanation (WelcomeScreen.js:25)."
BEST REFERENCE IMPLEMENTATION:
  Noom in-context teaching (F3.1 VERIFIED) and MacroFactor's plain, non-shaming framing
  (F3.4 VERIFIED) — describe the benefit in the user's own words before (or instead of)
  naming the proprietary mechanism.
PROPOSED SOLUTION:
  Keep the brand term but attach a one-line plain-English gloss on first use (e.g. pair
  "Precision Coaching™" with a short benefit clause), OR defer the trademark term until
  after the first benefit is stated. Replace "division-specific" with a plain benefit
  phrase on Welcome, leaving the precise division language for ProOnboarding step 4 where
  it is in context. Trim the two-sentence PRO_BULLETS to single benefit lines. This
  pairs naturally with U-E-1 (DefinedTerm) if that ships.
NEWBIE EXPERIENCE: The first screen states what they get in plain language; the brand
  term, if present, carries its own one-line meaning.
ATHLETE EXPERIENCE: Still sees the differentiators they care about (auto-adjusting
  training+nutrition, personalised targets, written rationale per 11-onboarding-auth.md:68);
  division depth still arrives in context at ProOnboarding step 4.
IMPLEMENTATION BLUEPRINT:
  - Edit PRO_BULLETS strings (WelcomeScreen.js:22–27) and any "Precision Coaching™" /
    "division-specific" copy (WelcomeScreen.js:25). British English.
  - Do NOT change tier routing, CTA targets, or the two-tier hierarchy
    (WelcomeScreen.js:55–64) — copy only.
  - States: static screen; no empty/error states affected. Price handling
    (usePlayPrices, WelcomeScreen.js:33–34) untouched — this is NOT a billing change.
  - Edge case: keep within the single ScrollView so it still scales (Phase-1 notes the
    screen is already dense, 11-onboarding-auth.md:65–66).
VERIFICATION: VERIFIED (F3.5/F6.1, F3.1/F3.3). No PARTIAL/NOT-FOUND. Not billing
  (no price/product-ID change). Trademark wording is a brand decision — surface the exact
  new strings to the founder before merge.

---

ID: U-E-3
AREA: Onboarding — pre-account Pro quiz (QuizScreen)
TITLE: Fix the quiz heading/body count mismatch and the "ready" gate that lets length/equipment be skipped
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — a first-impression credibility dent ("first-impression physics of
  F.7.1") and a "decorative onboarding" smell (every question should visibly change the
  plan) — both VERIFIED mechanisms.
EFFORT (1-10): 2 — heading string + the `ready` boolean on one screen; exact lines in
  Phase-1.
CURRENT STATE:
  - Heading "Eight quick questions." (QuizScreen.js:64) vs actual 5–6 distinct asks
    (experience, days, length, equipment, goal, conditional phase)
    (11-onboarding-auth.md:138).
  - `ready` = experience && daysPerWeek && trainingGoal (QuizScreen.js:54), so session
    length and equipment can be left unset and the user still advances
    (11-onboarding-auth.md:138).
THE PROBLEM:
  Newbie impact: the number mismatch reads as carelessness on the trust-critical first
  funnel screen (compare-13 WHERE WE LAG; F7.1 VERIFIED mechanism). Athlete impact:
  unset length/equipment weaken the PlanPreview the "your plan takes shape as you answer"
  promise depends on (compare-07 ATHLETE VERDICT; 11-onboarding-auth.md:140), and the
  quiz is already shallow for them.
THE EVIDENCE:
  - compare-07 WHERE WE LAG: "Quiz heading/content mismatch ('Eight quick questions' vs
    5–6 actual; session length/equipment not in the ready-gate) dents the first-
    impression credibility F.7.1 prizes (11-onboarding-auth.md:138, VERIFIED mechanism)."
  - compare-13 WHERE WE LAG: same mismatch — "minor friction against the 'every question
    must visibly change the plan / no decorative onboarding' principle (F2.5 — VERIFIED)."
  - Phase-1 CURRENT WEAKNESSES (QuizScreen): heading/body mismatch and the ready-gate
    skip enumerated (11-onboarding-auth.md:138).
BEST REFERENCE IMPLEMENTATION:
  RevenueCat/Flo principle — every question must visibly deepen perceived personalisation
  (compare-13 BEST IN CLASS, Flo VERIFIED; F2.5 VERIFIED). The fix is to make the count
  honest and to ensure each asked field actually feeds the plan.
PROPOSED SOLUTION:
  (a) Replace the heading with an accurate count (or a count-free phrasing) matching the
  rendered questions. (b) Decide deliberately whether session length and equipment are
  required: either add them to the `ready` gate so a complete plan is built, OR mark them
  explicitly optional in copy. FOUNDER-INPUT on which: the dispatch flags onboarding-
  sequence changes as gated; adding fields to the ready-gate changes funnel completion
  behaviour, so present both options.
NEWBIE EXPERIENCE: Honest expectation of length; no decorative questions.
ATHLETE EXPERIENCE: If length/equipment become required, PlanPreview is built on complete
  inputs, strengthening the teaser the athlete judges (11-onboarding-auth.md:140).
IMPLEMENTATION BLUEPRINT:
  - Edit heading string (QuizScreen.js:64) — British English.
  - `ready` definition (QuizScreen.js:54): option A add `&& sessionLength && equipment`;
    option B leave as-is and add "optional" microcopy to those question labels
    (QuizScreen.js:82–95).
  - CTA "See your plan" disable logic flows from `ready` (QuizScreen.js:117–124) — no
    other change.
  - Gating: pre-auth, no tier guard (correct, 11-onboarding-auth.md:136) — unchanged.
  - States: chips already minHeight 44 (QuizScreen.js:137, compliant) — no touch-target
    work needed here.
  - Edge case: telemetry markQuizStep('quiz_done') fires on advance (QuizScreen.js:57) —
    if the ready-gate tightens, confirm the funnel-completion metric still reads sensibly
    (NOT DETERMINED IN CODE how the funnel metric is consumed — confirm before building).
VERIFICATION: VERIFIED (F7.1, F2.5). The choice between required vs optional length/
  equipment is a FOUNDER-GATE onboarding-sequence decision — present as multi-choice,
  do not pick silently. Funnel-metric consumption NOT DETERMINED IN CODE.

---

ID: U-E-4
AREA: Onboarding — quiz↔wizard experience-band consistency
TITLE: Reconcile the 3-band pre-account quiz with the 4-band Pro wizard so prefill maps cleanly
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 5 — a correctness/consistency gap: a value carried across the account wall
  may not map, and the user can be shown a band the other side never offered
  (compare-07 WHERE WE LAG; VERIFIED in code).
EFFORT (1-10): 3 — align two enumerations + the prefill mapping; exact lines in Phase-1.
CURRENT STATE:
  - QuizScreen EXPERIENCE chips: New to lifting / A year or two in / Experienced (3 bands)
    (QuizScreen.js:21–25 per 11-onboarding-auth.md:127, 138).
  - ProOnboarding training-experience Dropdown: 4 options incl. "Competitive"
    (ProOnboardingScreen.js:71–76, step 3 :1101–1171 per 11-onboarding-auth.md:197, 205).
  - Quiz-prefill copies onboardingQuiz fields into the wizard on mount
    (ProOnboardingScreen.js:196–210; experience prefill :203) — so a 3-band value lands
    in a 4-band control (11-onboarding-auth.md:205).
THE PROBLEM:
  Newbie impact: low (a beginner picks "New to lifting" either way). Athlete impact: a
  competitor who self-identified as "Experienced" in the quiz may be silently re-mapped
  or shown a different set, and "advanced" cannot map cleanly across — undermining the
  "no value the other side never offered" trust point (11-onboarding-auth.md:138, 205).
THE EVIDENCE:
  - compare-07 WHERE WE LAG: "the bands even differ between quiz (3) and wizard (4)
    (11-onboarding-auth.md:138, 205)" — VERIFIED in code.
  - Phase-1 CURRENT WEAKNESSES (QuizScreen and ProOnboarding): the 3-vs-4 mismatch and
    its prefill consequence are stated explicitly (11-onboarding-auth.md:138, 205).
BEST REFERENCE IMPLEMENTATION:
  Fitbod/Freeletics non-condescending level handling (compare-07 BEST IN CLASS, VERIFIED)
  — declared level is handled consistently. The minimal fix is a single source of truth
  for the band set, or an explicit, documented mapping.
PROPOSED SOLUTION:
  Either (a) make the quiz and wizard share the SAME experience enumeration (single
  source of truth — note QuizScreen docstring already states it reuses coachingGoals so
  nothing is re-asked, 11-onboarding-auth.md:137; extend that principle to experience),
  OR (b) keep 3 bands pre-account for simplicity and add an explicit, documented prefill
  mapping (e.g. quiz "Experienced" → wizard default, with "Competitive" only selectable
  in the wizard). Deterministic mapping only — no inference. FOUNDER-INPUT on whether to
  unify (changes the quiz UI) vs map (keeps quiz simpler).
NEWBIE EXPERIENCE: Unchanged.
ATHLETE EXPERIENCE: A declared level carries across the wall without surprise re-mapping;
  "Competitive" remains reachable in the wizard where division depth lives
  (11-onboarding-auth.md:207).
IMPLEMENTATION BLUEPRINT:
  - QuizScreen EXPERIENCE source (QuizScreen.js:21–25) and ProOnboarding experience
    options (ProOnboardingScreen.js:71–76).
  - Prefill mapping (ProOnboardingScreen.js:196–210; :203). If option (b), define the
    explicit map here.
  - Gating: pre-auth quiz / Pro wizard — unchanged.
  - States: no new states; ensure prefill never leaves the wizard Dropdown on an invalid/
    blank value (Phase-1 notes the engine must never get a silent fallback,
    11-onboarding-auth.md:204 — keep that guarantee).
  - Edge case: PHYSIQUE_GOALS / GOAL_LABELS / TRAINING_PHASES enums live outside the
    audited files (11-onboarding-auth.md:131, 139) — NOT DETERMINED whether experience
    bands share a module; confirm the single source before unifying.
VERIFICATION: VERIFIED in code (the 3-vs-4 mismatch and prefill are directly cited).
  Unify-vs-map is a FOUNDER-GATE onboarding decision (input only). Whether a shared
  experience-band module exists is NOT DETERMINED IN CODE — confirm before building.

---

ID: U-E-5
AREA: Onboarding — migration / switching-cost moment
TITLE: Surface the Hevy/Strong import as an offer during first-run, not only buried in Profile
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — a switching-cost/migration moment for experienced users arriving from
  another tracker is currently not surfaced when it matters (compare-07 MISSING ENTIRELY;
  VERIFIED that ImportScreen lives in Profile, outside the first-run chain).
EFFORT (1-10): 3 — add an entry point/offer into the first-run chain that routes to the
  existing ImportScreen; ImportScreen itself is already a complete state-machine (no new
  import logic). Exact routes in Phase-1.
CURRENT STATE:
  ImportScreen exists and works (Hevy/Strong CSV, full idle→preview→done state machine,
  ImportScreen.js per 11-onboarding-auth.md:302–318) but is registered ONLY in
  ProfileStack (RootNavigator.js:397) and is "NOT in the first-run onboarding chain …
  a new migrator must find it in settings" (11-onboarding-auth.md:312, 318).
THE PROBLEM:
  Newbie impact: none (a brand-new gym-goer has nothing to import — 11-onboarding-auth.md:316).
  Athlete impact: an experienced lifter migrating from Hevy/Strong is never OFFERED the
  meaningful switching-cost reducer at the moment of switching; they must discover it in
  settings (11-onboarding-auth.md:317–318).
THE EVIDENCE:
  - compare-07 MISSING ENTIRELY: "Onboarding-time offer of the Hevy/Strong import:
    ImportScreen exists but lives in Profile, outside the first-run chain
    (11-onboarding-auth.md:312, 318) — a switching-cost/migration moment is not surfaced
    during onboarding." (Status: the gap is VERIFIED against code; it is a placement gap,
    not a missing capability.)
  - Phase-1 LOCATION QUESTION (ImportScreen): "a discoverability gap rather than a wrong
    placement" (11-onboarding-auth.md:318).
BEST REFERENCE IMPLEMENTATION:
  Hevy's <90s expert onboarding (compare-07 BEST IN CLASS, VERIFIED) — get the
  experienced user to their data fast. Offering import at first-run is the
  switching-cost-reduction move that respects an arriving expert's existing history.
PROPOSED SOLUTION:
  Add a non-blocking, skippable "Coming from another app? Bring your history" offer to the
  first-run flow that routes to the EXISTING ImportScreen, then returns to the normal
  flow. Placement options (FOUNDER-INPUT, sequence change): (i) on FirstRunScreen for Free
  (an "Import instead" secondary affordance) and/or (ii) as a card on ProSetupComplete for
  Pro ("Bring your Hevy/Strong history"). Import is a FREE feature (ImportScreen has no
  Pro guard, 11-onboarding-auth.md:313) so it can appear on both paths. No change to the
  import logic itself.
NEWBIE EXPERIENCE: A true beginner sees a clearly skippable, plainly worded offer ("New?
  skip this") and ignores it — no forced step.
ATHLETE EXPERIENCE: Offered their migration at the right moment; one tap brings sessions/
  sets/weights/reps across with the honest matched/created/skipped breakdown
  (11-onboarding-auth.md:308, 317).
IMPLEMENTATION BLUEPRINT:
  - Reuse ImportScreen (RootNavigator.js:397) — register/route it so it is reachable from
    the first-run chain (FirstRunStack RootNavigator.js:470, and/or ProOnboardingStack
    RootNavigator.js:502/506) and returns to the flow afterward. NOT DETERMINED IN CODE
    whether ImportScreen can be navigated to and back without disrupting the first-run
    completion state machine (FreeStarter owns completeFirstRun, FirstRunScreen.js:36–37;
    ProSetupComplete owns it, ProSetupCompleteScreen.js:84–86) — confirm the return path
    before building.
  - Entry copy on FirstRunScreen (FirstRunScreen.js:77–84 hint area) and/or a card on
    ProSetupComplete (alongside cards :142–307). British English.
  - Gating: Free feature (no Pro guard) — show on both paths; do NOT gate it.
  - States: ImportScreen already handles idle/parsing/preview/importing/done/error
    (11-onboarding-auth.md:306–311) — no new states. The offer itself must be skippable
    (empty action) and must never block first-run completion.
  - Edge case: a user who imports during onboarding then proceeds must not double-create
    a starter plan; confirm interaction with FreeStarter's copy+activate
    (FreeStarterScreen.js per 03-home.md:81). NOT DETERMINED — confirm before building.
VERIFICATION: The placement gap is VERIFIED against code. Adding it to the first-run chain
  is a FOUNDER-GATE onboarding-sequence change (input only — present placements (i)/(ii) as
  multi-choice). Two implementation facts NOT DETERMINED IN CODE: the import→return-to-flow
  path, and the import-then-starter-plan interaction.

---

ID: U-E-6
AREA: Newbie & light-user — per-action "why" microcopy
TITLE: Plain-English one-line "why this" attached to the newbie's first sessions/movements
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 6 — "teaching beats cheerleading"; beginners want the WHY attached to the
  action, and instructiveness was the most-valued attribute (compare-13 USER SENTIMENT,
  F1.2 VERIFIED; F1.3 VERIFIED). Carried as enhancement because the supporting per-exercise
  finding is VERIFIED/PARTIAL.
EFFORT (1-10): 5 — copy/data surface on FreeStarter result and/or Home hero; whether a
  per-movement rationale source exists is unknown.
CURRENT STATE:
  - FreeStarter explains the PLAN in plain terms but not per-movement: result intro "Built
    for people starting out. Every session tells you exactly what to do: the exercises,
    the sets, and the reps." (FreeStarterScreen.js:191–194 per 03-home.md:85) — no
    per-exercise "why".
  - ProSetupComplete has a "Why this plan, for you" reasons block (whyThis) for Pro
    (ProSetupCompleteScreen.js:232–292 per 11-onboarding-auth.md:234), but the FREE newbie
    surfaces have no equivalent per-movement line.
THE PROBLEM:
  Newbie impact: the highest-leverage newbie surface (FreeStarter) tells them WHAT but not
  WHY at the level of the action; research values a one-line "why" attached to the action
  (compare-13 WHERE WE LAG, F1.2/F4.1–F4.2 VERIFIED/PARTIAL). Athlete impact: none — the
  athlete already gets rationale in the Pro path (11-onboarding-auth.md:207, 234, 244).
THE EVIDENCE:
  - compare-13 WHERE WE LAG: "Per-exercise 'why this exercise / why this weight'
    plain-English coach line for newbies is not evidenced on the newbie surfaces
    (FreeStarter explains the plan but not per-movement) — research values a one-line
    'why' attached to the action (F1.2, F4.1–F4.2 — VERIFIED/PARTIAL)."
  - compare-13 MISSING ENTIRELY: "Per-exercise form video / coach audio cues at the moment
    of need (Future-style — F4.2 VERIFIED): not present on any audited Volyume surface."
    (We propose only the plain-text "why", NOT video/audio — see VERIFICATION.)
BEST REFERENCE IMPLEMENTATION:
  Future — per-exercise rationale/cues at the moment of need (compare-13 BEST IN CLASS,
  F4.2 VERIFIED). Adapted to Volyume's offline/no-AI constraints as deterministic
  plain-text "why" lines, not media.
PROPOSED SOLUTION:
  Add a short, deterministic plain-English "why this" line to the newbie's primary
  action: on the FreeStarter result card (one line on the recommended plan) and/or as a
  one-line rationale on the Home hero for the free first-timer. Lines are static/rule-based
  (e.g. tied to the chosen goal/equipment/days), reusing the same non-AI approach as the
  deterministic FreeStarter scoring (03-home.md:94) and the Pro whyThis pattern
  (11-onboarding-auth.md:234). No LLM, no randomness.
NEWBIE EXPERIENCE: The recommended plan/first session carries a one-line reason ("Chosen
  because you picked X and Y") — teaching at the point of the action.
ATHLETE EXPERIENCE: Not shown on athlete surfaces (FreeStarter is the beginner on-ramp,
  03-home.md:96); no change.
IMPLEMENTATION BLUEPRINT:
  - FreeStarter result card (FreeStarterScreen.js:185–220; recommendation logic in
    lib/onboarding/freeStarter.js per 03-home.md:81) — add a deterministic rationale line
    near the result meta (FreeStarterScreen.js:195–209).
  - Optionally Home free first-timer hero (HomeScreen.js:1162–1301; free no-plan/starter
    area :1331–1413) — a one-line "why" near the plan card.
  - Gating: Free surfaces only (FreeStarter is Free per 03-home.md:89; Home is Free).
  - Source of the "why": MUST be deterministic. NOT DETERMINED IN CODE whether
    freeStarter.js exposes the reason for its pick (the rule that selected the plan); if
    not, the rationale must be derived from the answered quiz inputs, not invented.
    Confirm before building — do NOT fabricate a per-movement reason the engine cannot
    support.
  - States: empty/loaded — if no deterministic reason is available, render NO line (never
    a guessed one). Error: same fail-safe.
  - Edge case: the no-recommendation fallback (FreeStar.js result "We couldn't pick a plan",
    FreeStarterScreen.js:221–235) must not show a "why" line.
VERIFICATION: Justification VERIFIED (F1.2, F1.3) with the per-exercise specifics
  VERIFIED/PARTIAL — flagged EVIDENCE-THIN at the per-movement level; the plan-level "why"
  is the safer scope. The media form (Future video/audio) is explicitly OUT OF SCOPE
  (offline/no-AI constraints). Whether freeStarter.js exposes its pick rationale is NOT
  DETERMINED IN CODE — confirm before building.

---

ID: U-E-7
AREA: Onboarding — acknowledgement / progress feedback during intake
TITLE: Add Noom-style acknowledgement micro-copy and/or an updating live projection across the Pro wizard
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 6 — "Length isn't the enemy; emptiness is"; long flows convert when every
  screen returns value (compare-07 BEST IN CLASS / TOP 50 RANGE, Noom & Lose It! VERIFIED;
  progress predictability F2.5/F7.2 VERIFIED).
EFFORT (1-10): 6 — per-step copy plus, for the projection, a deterministic recompute as
  answers change; touches the multi-step wizard.
CURRENT STATE:
  - ProOnboarding has an endowed-progress bar + "Step X of 5" counters
    (ProOnboardingScreen.js:766–807 per 11-onboarding-auth.md:194) but the screens "do not
    respond to each input" (compare-07 MISSING ENTIRELY).
  - The "your plan takes shape as you answer" promise (QuizScreen.js:65) is delivered as a
    SINGLE PlanPreview/ProSetupComplete reveal, not a continuously updating figure
    (compare-07 MISSING ENTIRELY; 11-onboarding-auth.md:140, 231–234).
THE PROBLEM:
  Newbie impact: a long Pro wizard with no per-answer acknowledgement feels emptier than
  best-in-class; acknowledgement and a moving projection sustain motivation
  (compare-07 MISSING ENTIRELY, F5.4/F7.4 VERIFIED). Athlete impact: a live figure that
  updates as they set division/recovery/protein would reinforce that each lever matters
  (compare-07 ATHLETE VERDICT; F2.5 VERIFIED).
THE EVIDENCE:
  - compare-07 MISSING ENTIRELY: "An updating live projection during the intake (Noom's
    moving goal date, F5.4 VERIFIED) … delivered as a single reveal, not a continuously
    updating figure"; and "Acknowledgement/empathy micro-copy on individual intake answers
    (Noom 'Thank you for sharing…', F7.4 VERIFIED) — Volyume's screens are clean but do not
    respond to each input."
  - compare-07 WHERE WE LEAD: endowed-progress bar already lifts completion ~22%
    (F2.5/F7.2 VERIFIED) — this proposal extends an already-working mechanism.
BEST REFERENCE IMPLEMENTATION:
  Noom — acknowledgement copy on nearly every screen + an updating weight-loss projection
  date (compare-07 BEST IN CLASS, VERIFIED). Adapt the projection to a DETERMINISTIC,
  engine-computed figure (never an AI estimate).
PROPOSED SOLUTION:
  Two separable parts, both deterministic:
  (a) Acknowledgement micro-copy: short, neutral acknowledgements on intake steps (NOT
  shaming, NOT cheerleading — respects MacroFactor "no shaming", F3.4, and the ED-safety
  tone). Pure copy.
  (b) Live projection: a small, continuously-updating figure (e.g. an estimated target or
  timeline) recomputed by the EXISTING deterministic engine as answers change in the
  wizard. No new estimation logic beyond what the engine already produces at submit.
  Part (a) is low-risk copy; part (b) is the sequence/feel change and is FOUNDER-GATE.
NEWBIE EXPERIENCE: Each answer is acknowledged; the live figure shows their inputs
  mattering — the "every question visibly changes the plan" want (F2.5 VERIFIED).
ATHLETE EXPERIENCE: Setting recovery/division/protein visibly moves the figure, reinforcing
  the depth they came for (11-onboarding-auth.md:207).
IMPLEMENTATION BLUEPRINT:
  - Per-step copy in ProOnboarding step bodies (steps 2–5: ProOnboardingScreen.js:879–1556).
  - Live projection: recompute via the SAME shared engine the wizard already calls at
    submit (nutrition targets computed via "the shared engine",
    ProOnboardingScreen.js:514–762 per 11-onboarding-auth.md:201). MUST be deterministic —
    no AI/LLM, no randomness (SACRED). NOT DETERMINED IN CODE whether the engine can be
    called incrementally/cheaply mid-wizard without side effects (the submit path writes
    profile/metrics/plan) — confirm an isolated, side-effect-free compute path before
    building.
  - ED-safety: any projected figure MUST respect calorie floors and the rapid-loss
    threshold and MUST NOT bypass src/coaching/safety/ — FOUNDER-GATE, do not touch the
    safety system (CLAUDE.md). If the projection could imply an unsafe target, it must not
    be shown.
  - Gating: Pro wizard only (ProOnboardingStack).
  - States: projection shows only once enough inputs exist; otherwise hidden (never a
    placeholder number). Reduce Motion: no animated counter.
  - Edge case: the existing "Building your plan" honest staged overlay
    (ProOnboardingScreen.js:451–497) must remain the truthful final compute — a live
    pre-figure must be framed as an estimate, not the finished plan, to preserve the
    operational-honesty lead (compare-07 WHERE WE LEAD, F3.2 VERIFIED).
VERIFICATION: Justification VERIFIED (F5.4, F7.4, F2.5, F7.2, F3.2, F3.4). FOUNDER-GATE:
  part (b) is an onboarding-sequence/feel change AND touches engine-output presentation
  near the ED-safety boundary — input only, do not build the projection without sign-off;
  part (a) copy is low-risk. NOT DETERMINED IN CODE: a side-effect-free incremental engine
  compute path. Carry as INPUT ONLY.

---

## Cross-cluster notes (not proposals)

- The dual-audience tension ("the same app rarely serves both with one flow", F6.4
  VERIFIED; compare-07 USER SENTIMENT) is structurally already addressed by Volyume's
  tier-branched onboarding (Free quick-setup vs Pro 5-step wizard). The branching
  short-core-plus-optional-deep-intake structure noted under compare-07 MISSING ENTIRELY
  is explicitly INTERPRETATION in the source (§2/§5), NOT a sourced claim — NOT proposed.
- Behaviour-based recalibration of declared level (Freeletics F1.4 VERIFIED) and
  coach-matched onboarding (F1.5 VERIFIED/PARTIAL) are noted MISSING but are mechanism
  changes to the deterministic engine / a product direction (human coaches) — NOT proposed
  here; they are SACRED-adjacent and would be founder product decisions.
- Peer/community belonging (compare-13 MISSING ENTIRELY, F7.1/F7.3 VERIFIED) is flagged in
  the source itself as architecture-constrained by offline-first / EU-residency / no-PII
  (CLAUDE.md) and "must be a founder decision, not built silently" — NOT proposed.
- The no-anonymous-mode speed-to-tool lag vs Hevy (compare-07 WHERE WE LAG) is a
  deliberate backup/sync decision (LoginScreen.js:270–277, 327–331) — NOT proposed.


<!-- ============ phase5/proposals-F-design.md ============ -->

# Phase 5 proposals — CLUSTER F: Design system & visual quality

Volyume Ultimate Audit, 2026-06-13. Buildable proposals drawn ONLY from the
already-produced, already-sourced cluster documents:
- Phase 3 comparison: `phase3/compare-11-design.md` (Area 11).
- Phase 1 inventory: `phase1/15a-components.md`, `15b-components.md`,
  `15c-components.md`, `15d-components.md`.

Every proposal traces to a finding with its status; every implementation detail
cites a Phase-1 `file:line`. Where a fact is not in the inventory it is marked
"NOT DETERMINED IN CODE — confirm before building". British English. READ-ONLY
authoring; no code changed. Dispatcher renumbers IDs to ULTIMATE-NNN later.

SACRED-constraint note: none of these proposals touch the deterministic coaching
engine, the ED-safety system, billing logic, or free/Pro gating. Two surfaces are
safety/billing/gating-ADJACENT and are flagged FOUNDER-GATE where they appear
(HeldDecisionCard in U-F-3; any privacy-copy claims in U-F-8).

---

```
ID: U-F-1
AREA: Design, visual quality & premium feel
TITLE: Fix the latent light-theme contrast bug — Button primary/destructive must use onPrimary ink, not colors.background
SUGGESTED TIER: 2 High
IMPACT (1-10): 6 — invisible today (dark mode only) but a guaranteed WCAG-AA
  failure the instant a light theme ships: near-white text on bright amber. The
  research treats contrast as a hard accessibility requirement, not a preference
  (compare-11 WHERE-WE-LAG "LATENT LIGHT-THEME CONTRAST BUG", Smashing Magazine
  inclusive-dark-mode source — VERIFIED for the principle, light-theme application
  by inference). It also undermines the "intentional, considered" premium signal
  the whole design system trades on.
EFFORT (1-10): 2 — a two-line token swap in one primitive, plus a regression test.
  The correct token already exists and is already used correctly by two siblings,
  so there is a proven reference in-repo.
CURRENT STATE: Button primary and destructive variants set `fg: colors.background`
  for the on-fill ink (Button.js:25 and Button.js:28, per 15a:262-271 and
  cross-cutting 15a:540-543). theme.js introduced `onPrimary` (theme.js:42)
  specifically to replace "dark ink on a coloured fill" sites — the inventory
  records this as a ~124-site migration (theme.js:36-42, cited 15a:265). In dark
  mode `background` and `onPrimary` are value-identical (#0D0D0D), so there is no
  visual diff today; in the light theme `background` becomes #FAFAF7 (theme.js:102)
  while the amber fill stays bright (15a:266-270). DifferentialBadge (15a:401-402,
  :108) and EmptyState (15a:456,:119) already use `onPrimary` correctly, as do
  EmptyDiary (15d:41,:82,:87) and ProBadge/lock chip (15b:317).
THE PROBLEM:
  Newbie impact: a first-time user on a light device would read primary CTAs
  ("Save", "Continue", "Get Pro") as near-white-on-amber — low-contrast, hard to
  read, and reading as broken/cheap on exactly the buttons that carry the most
  weight. Erodes the "predictable, in-control, trustworthy" feel.
  Athlete impact: same legibility hit on fast-logging CTAs; an experienced user
  reads sloppy contrast as a lack of care.
  This is latent: it only manifests if/when the light theme is shipped, but the
  bug is in the single most-used button primitive, so the blast radius is the
  whole app.
THE EVIDENCE:
  - Phase-1 15a:262-271 (the deviation), 15a:540-543 (cross-cutting #3) — VERIFIED
    in code (file:line cited).
  - compare-11 WHERE-WE-LAG "LATENT LIGHT-THEME CONTRAST BUG" (Button.js:25,:28) —
    status: the contrast PRINCIPLE is VERIFIED (Smashing inclusive-dark-mode
    source); the light-theme APPLICATION is by INFERENCE (compare-11 VERIFICATION
    STATUS Q4 NOTE: no source critiques a named fitness app's dark/light mode).
    Flag: inference-flagged, but the in-code token mismatch is a hard fact.
BEST REFERENCE IMPLEMENTATION:
  In-repo: DifferentialBadge.js:108 and EmptyDiary.js:82,:87 — they put
  `colors.onPrimary` ink on `colors.primary` fill, which is the pattern theme.js:42
  was created for (15a:401-402; 15d:41). No external app needed; the correct
  pattern already lives beside the broken one.
PROPOSED SOLUTION:
  In Button.js, change the primary variant's `fg` from `colors.background` to
  `colors.onPrimary` (Button.js:25) and the destructive variant's `fg` likewise
  (Button.js:28). No other change. This makes Button consistent with the two
  siblings that already do it right and removes the latent light-theme failure.
  Do NOT touch billing CTAs' logic — only the ink token. Do NOT alter the dark
  theme appearance (identical value, so dark renders unchanged).
NEWBIE EXPERIENCE: no visible change in dark mode (today's default); if light
  theme ships, primary CTAs render legible near-black ink on amber instead of
  near-white.
ATHLETE EXPERIENCE: same — invisible now, correct-by-construction later.
IMPLEMENTATION BLUEPRINT:
  - File: src/components/Button.js. Lines: the primary variant `fg: colors.background`
    at Button.js:25 and the destructive variant `fg: colors.background` at
    Button.js:28 (both pinned by 15a:262-271). Replace each with
    `fg: colors.onPrimary`. NOT DETERMINED IN CODE: whether destructive uses an
    error-specific ink token — the inventory only names `onPrimary`; confirm
    against theme.js whether an `onError`/`onDestructive` exists before applying to
    the destructive variant, else use `onPrimary` (theme.js:42).
  - Verify spinner colour still matches: Button colours the inline spinner to the
    variant foreground (15a:261,:80) — after the swap the spinner inherits
    `onPrimary` automatically; confirm no separate spinner literal.
  - Test (the contract): add an assertion in the existing Button test path that the
    primary/destructive fg resolves to `onPrimary`, not `background`, so the
    regression cannot silently return. (Test file path NOT DETERMINED IN CODE —
    locate the Button test; inputs.test.js covers other primitives 15a:369.)
  - Empty/loaded/error states: unaffected — this is a static style token, no state
    branching.
  - Edge case: any caller passing a custom `fg` is unaffected (this only changes the
    variant default).
VERIFICATION: in-code mismatch VERIFIED (15a:262-271,:540-543). The WCAG-failure
  consequence is inference-flagged (compare-11 Q4 NOTE) — the fix is correct
  regardless because it aligns Button with theme.js:42's stated purpose and its own
  siblings. NOT-DETERMINED: the Button test file path and whether a destructive-ink
  token exists.
```

---

```
ID: U-F-2
AREA: Design, visual quality & premium feel
TITLE: Bring every interactive element up to the 44px minimum touch target
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — touch-target reliability maps directly to the "predictable,
  in-control = trust" finding the research ties to credibility in healthtech
  (compare-11 WHERE-WE-LAG sub-44px point, Insivia trust source — VERIFIED). Misses
  affect everyday actions (log cardio, pick a window, dismiss). Newbie-heavy
  benefit; athletes feel it as logging friction.
EFFORT (1-10): 4 — many small, isolated padding/hitSlop edits across ~8
  components; each is trivial but they are spread out, and a couple (SVG regions,
  rotated plate text) need a hit-area wrapper rather than a token bump. Several of
  the offending components are dead code (see U-F-3) and may be deleted instead of
  fixed — sequence after U-F-3 to avoid fixing code that is about to be removed.
CURRENT STATE: Sub-44px interactive elements catalogued in Phase-1 cross-cutting
  (15a:551-556, 15b:445-447, 15c:74-76, 15d:281-283). Specifically:
  - InfoTooltip trigger ~30px: 14px icon + 8px hitSlop (15b:445-446, InfoTooltip.js:6,:12).
  - Chip ~29px: paddingVertical spacing.sm (8) + fontSize.sm (13) (15a:381-383,
    Chip.js:60-61) — but Chip is unused (see U-F-3).
  - CancelReasonSheet break chips ~29px (15a:304-305, CancelReasonSheet.js:181-182).
  - CardioPlanCard "Log cardio" ~21px (pv spacing.xs 4 + 13px), "History" ~34px
    (hitSlop 8 + ~18px) (15a:354-356, CardioPlanCard.js:74-76,:43).
  - DifferentialBadge CTA ~40px (pv spacing.md 12 + 16px) (15a:408-409,
    DifferentialBadge.js:102-104).
  - EmptyState CTAs ~37px (15a:462-463, EmptyState.js:116-124).
  - SegmentedControl cell ~34-36px (15c:74-76, SegmentedControl.js:38).
  - Dropdown list rows ~40px (15a:438, Dropdown.js:86).
  - ServingPicker unit pill <44px even with hitSlop 6 (15d:281-283,
    ServingPicker.js:54,:94) — but ServingPicker is unused (see U-F-3).
  - BodyDiagramHeatmap SVG muscle regions: small ellipse/rect shapes, no hitSlop
    (15a:187-188, e.g. biceps rx8 ry16 BodyDiagramHeatmap.js:132).
  Already-compliant references in-repo: Stepper 44x44 (15c:178), ReasonPicker rows
  minHeight 44 (15b:397), WindowChips explicit minHeight 44 (15c:393-394),
  RestTimer Skip/±15 minHeight 44 (15b:421), AppAlert buttons minHeight 44
  (15a:70-71), EmptyDiary buttons minHeight 44 (15d:38,:80), Dropdown TRIGGER ~44px
  (15a:437).
THE PROBLEM:
  Newbie impact: hard-to-hit controls read as the app fighting them; the worst
  offender (CardioPlanCard "Log cardio" at ~21px, 15a:354) is a primary Pro action
  on the Analytics tab. Mis-taps on "History" (~34px) and the InfoTooltip "(i)"
  (~30px, the very control meant to TEACH a newbie) compound the jargon problem.
  Athlete impact: logging-speed friction — every missed tap is a re-tap; the
  research frames spartan speed as the experienced user's idea of beauty.
THE EVIDENCE:
  - compare-11 WHERE-WE-LAG "Sub-44px touch targets on multiple interactive
    elements" — VERIFIED (Insivia trust-design source).
  - Phase-1 15a:551-556 (cross-cutting #6), 15b:445-447, 15c:74-76, 15d:281-283 —
    VERIFIED in code per cited file:line.
BEST REFERENCE IMPLEMENTATION:
  In-repo, already correct: WindowChips minHeight 44 with a comment marking it as
  the deliberate target (15c:393-394), Stepper 44x44 (15c:178), ReasonPicker rows
  minHeight 44 (15b:397). The 44px floor is the WCAG/HIG minimum the research
  affirms (Insivia — VERIFIED). Apply WindowChips' explicit-minHeight pattern as the
  house pattern.
PROPOSED SOLUTION:
  Raise each LIVE interactive element to a ≥44px effective target, preferring an
  explicit `minHeight: 44` (the WindowChips pattern, 15c:393) over hitSlop where the
  element drives layout, and hitSlop where the glyph must stay visually small:
  - InfoTooltip: keep the 14px icon visual but expand the touch area to 44px — wrap
    the Pressable with padding to a 44x44 box or add hitSlop ≥15 each side
    (currently 8, InfoTooltip.js:12). (15b:445-446.)
  - CardioPlanCard "Log cardio": replace the hand-rolled TouchableOpacity pill with
    the Button primitive at size that yields ≥44px, or set minHeight 44 on the pill
    (CardioPlanCard.js:73-78); "History" link hitSlop up to reach 44 (:43). Note:
    this overlaps U-F-3 (the component hand-rolls a button the Button primitive
    should provide).
  - DifferentialBadge CTA: minHeight 44 on the CTA (DifferentialBadge.js:102-104) —
    again, U-F-3 proposes replacing it with Button, which would solve this for free.
  - EmptyState CTAs: minHeight 44 (EmptyState.js:116-124) — overlaps U-F-3 (Button
    swap).
  - SegmentedControl: increase cell paddingVertical so the cell clears 44px
    (SegmentedControl.js:38).
  - Dropdown list rows: paddingVertical so rows clear 44px (Dropdown.js:86).
  - BodyDiagramHeatmap: this is the only non-trivial one — SVG regions cannot take a
    minHeight. Option A: enlarge the smallest tap shapes' invisible hit geometry
    (add a larger transparent overlay shape per region). Option B (founder choice):
    leave the visual but document the constraint. PRESENT BOTH; do not pick silently.
    (15a:187-188.) NOT DETERMINED IN CODE: whether react-native-svg here supports a
    separate transparent hit shape per region — confirm before building Option A.
NEWBIE EXPERIENCE: controls become reliably tappable on the first try, including the
  "(i)" help triggers and the Log-cardio action.
ATHLETE EXPERIENCE: faster logging, fewer re-taps; the data surfaces stay visually
  tight while gaining a forgiving hit area.
IMPLEMENTATION BLUEPRINT:
  - Sequence AFTER U-F-3: Chip (Chip.js:60-61), ServingPicker (ServingPicker.js:94)
    are flagged unused — do not fix them if U-F-3 deletes them; if U-F-3 instead
    WIRES Chip in, fix Chip's target as part of that wiring.
  - For each live element above, apply the explicit-minHeight-or-hitSlop fix at the
    cited line. Keep visual glyph sizes unchanged where a small glyph is intended
    (InfoTooltip "(i)", chevrons).
  - Empty/loaded/error states: targets are static styles; no state branching.
  - Edge cases: large-font-scale users — verify the minHeight does not clip text at
    fontScale ≥ 1.3 (TodayStrip already stacks at 1.3, 15c:291-292, as the pattern
    to follow if a control must grow).
  - Test (the contract): a snapshot/measure assertion that each fixed component's
    interactive node reports ≥44px. Test file paths NOT DETERMINED IN CODE.
VERIFICATION: all sub-44px findings VERIFIED in code (file:line). The
  BodyDiagramHeatmap SVG fix path is NOT DETERMINED (Option A feasibility) and is
  flagged as a founder multi-choice. Sequencing dependency on U-F-3 noted.
```

---

```
ID: U-F-3
AREA: Design, visual quality & premium feel
TITLE: Resolve the dead/unwired components and retire the hand-rolled buttons/chips that the primitives exist to replace
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 5 — no end-user sees the dead components, so user-facing impact is
  indirect: it is the "premium consistency" lever the research ties to the
  intentional/considered feel (Linear/Craft — VERIFIED), plus reduced drift risk
  and a smaller, truer component set. The hand-rolled-primitive half DOES touch
  users: it is why press feel, contrast (U-F-1), and touch targets (U-F-2) diverge
  across screens.
EFFORT (1-10): 5 — decisions before code. Each dead component needs a founder
  WIRE-IN-or-DELETE call; the hand-rolled replacements are mechanical but spread
  across 5 files; HeldDecisionCard is safety-adjacent and must not be wired without
  sign-off.
CURRENT STATE:
  Dead/unwired (no production importer; only own test references), per Phase-1
  cross-cutting:
  - Chip — only its own test imports it; screens hand-roll chips (15a:366-371,
    cross-cutting 15a:532-533; Chip.js).
  - ExerciseCard — no importer anywhere in src (15a:507-511,:534).
  - Stepper — imported only by inputs.test.js (15c:173-176,:399-401; Stepper.js).
  - VolumeBars — no importers anywhere (15c:301-303,:399-401; VolumeBars.js).
  - PlateCalculator — no importer anywhere in the repo (15b:241-244,:432-433).
  - OptionCard — only selectionControls.test.js; doc comment claims
    onboarding/coached-builder use, none found (15b:154-158,:434-435).
  - SourceChip — only foodComponents.test.js; doc claims food results/detail use
    (15d:300-305,:406; SourceChip.js).
  - ServingPicker — only foodComponents.test.js; doc claims FoodDetailSheet use
    (15d:272-277,:406; ServingPicker.js).
  - HeldDecisionCard — no production import; safety-adjacent (Beat signposting)
    (15d:142-147,:406-409). FOUNDER-GATE / safety-adjacent.
  Hand-rolled buttons/chips where a primitive exists (cross-cutting 15a:536-539):
  - AppAlert buttons (15a:537, AppAlert.js:158-173) — intentional dialog idiom
    (15a:66-69); likely LEAVE.
  - CancelReasonSheet break-window chips (15a:295-298, CancelReasonSheet.js:180-200)
    — billing-adjacent surface; chips duplicate Chip (15a:296).
  - CardioPlanCard "Log cardio" TouchableOpacity (15a:348-351,:537).
  - DifferentialBadge CTA TouchableOpacity (15a:402-404,:537).
  - EmptyState CTAs TouchableOpacity, also missing accessibilityRole (15a:457-458,
    :463-464,:557).
  Food-dir source-vocab fragmentation (15d:410-413): canonical SourceChip unused
  while FoodRow.SOURCE_LABEL (FoodRow.js:5-11) and FoodDetailSheet inline uppercase
  (FoodDetailSheet.js:111) carry divergent labels (`user_ocr` -> "Snapped" vs "OCR").
THE PROBLEM:
  Newbie + athlete (indirect): the divergent hand-rolled controls are precisely why
  press spring, ink contrast and tap targets are inconsistent across the app — fixing
  U-F-1/U-F-2 piecemeal leaves the drift able to return. The fragmented food
  source-vocabulary means a user sees "Snapped" in one place and "OCR" in another for
  the same provenance (15d:411-412), a small but real credibility nick.
  Dead code: no user impact, but it is a maintenance and consistency hazard (e.g. a
  future dev "fixes" VolumeBars' missing legend, U-F-5, in a component nobody renders).
THE EVIDENCE:
  - Phase-1 cross-cutting: 15a:532-539, 15b:431-435, 15c:399-401, 15d:406-413 —
    VERIFIED in code (greps cited per component).
  - compare-11 MISSING-ENTIRELY NOTE explicitly lists these dead/unwired surfaces as
    a "premium consistency" Phase-1 finding and states "No market source bears on
    this; flagged as a Phase-1 finding only" — status: code-VERIFIED, NO market
    source. Evidence-thin on market justification; STRONG on code fact.
BEST REFERENCE IMPLEMENTATION:
  In-repo: GradientCard is the model for the right outcome — the audit found it
  identical to Card and CONSOLIDATED it into a thin shim that deprecates itself in
  favour of `<Card tone>` (15b:90-101). The same consolidate-or-document discipline
  applies here. The research's Linear/Craft "considered component set" lesson
  (compare-11 BEST-IN-CLASS — VERIFIED) is the why.
PROPOSED SOLUTION:
  Two tracks. Track 1 (dead code) requires a founder decision PER component —
  present as structured choices, do not pick silently:
  - For each of Chip, ExerciseCard, Stepper, VolumeBars, PlateCalculator, OptionCard,
    SourceChip, ServingPicker: choose WIRE-IN (replace the matching hand-rolled
    surface with it) or DELETE (remove file + its test). Recommended default from the
    evidence: WIRE-IN Chip (screens already hand-roll its exact treatment,
    15a:378-379) and SourceChip (it is the canonical vocab the others diverge from,
    15d:310-315); the rest lean DELETE unless a near-term screen needs them.
  - HeldDecisionCard: FOUNDER-GATE — it is ED-safety signposting (Beat). Do NOT wire
    or delete without sign-off (CLAUDE.md SAFETY SYSTEM). Treat as input only here.
  Track 2 (hand-rolled -> primitive), only after U-F-1 so Button is correct:
  - Replace CardioPlanCard "Log cardio", DifferentialBadge CTA, and EmptyState CTAs
    with the Button primitive (this also fixes their sub-44px targets in U-F-2 and
    EmptyState's missing accessibilityRole, 15a:557). Keep DifferentialBadge's
    impression ping behaviour intact (15a:401-402).
  - CancelReasonSheet break chips -> Chip primitive IF Chip is wired in; this is a
    billing-adjacent file (15a:301) — FOUNDER-GATE the edit (visual-only, but state
    the change and wait per CLAUDE.md billing rule).
  - Leave AppAlert's dialog buttons as-is (intentional idiom, 15a:66-69) unless the
    founder wants them unified.
  - Food source vocab: make FoodRow and FoodDetailSheet consume SourceChip's labels
    (15d:411-412) so one vocabulary wins; FOUNDER decision on which label set
    ("Snapped" vs "OCR", "You" vs "Custom") is canonical.
NEWBIE EXPERIENCE: consistent press feel, contrast and tap targets across every
  button/chip; one consistent source label per provenance.
ATHLETE EXPERIENCE: same consistency; no functional change to data density.
IMPLEMENTATION BLUEPRINT:
  - Track 1: founder multi-choice per component (WIRE-IN / DELETE). On DELETE: remove
    the component file and its test only (paths per the inventory: Chip.js + inputs.test.js;
    VolumeBars.js; PlateCalculator.js; OptionCard.js + selectionControls.test.js;
    Stepper.js + inputs.test.js; ExerciseCard.js; ServingPicker.js + foodComponents.test.js;
    SourceChip.js + foodComponents.test.js). Confirm no dynamic/string require first —
    the inventory found none but marked it NOT DETERMINED for ExerciseCard (15a:510-511)
    and did the same grep-only check for the others.
  - Track 2 CardioPlanCard: src/components/CardioPlanCard.js:49-52,:73-78 — swap the
    TouchableOpacity for Button; preserve the focus-load behaviour (15a:337-340).
  - Track 2 DifferentialBadge: src/components/DifferentialBadge.js:55-62,:101-106 —
    swap CTA for Button; keep onTapCta('shown') impression ping (15a:401-402,:27-32).
  - Track 2 EmptyState: src/components/EmptyState.js:66-74,:113-127 — swap CTAs for
    Button (gains accessibilityRole, fixes 15a:557).
  - Track 2 CancelReasonSheet (FOUNDER-GATE, billing-adjacent):
    src/components/CancelReasonSheet.js:103-118,:180-200 — only if Chip wired.
  - Food vocab: src/components/food/SourceChip.js:15-24 is the canonical map; point
    FoodRow.js:5-11,:66 and FoodDetailSheet.js:109-113 at it. FOUNDER picks the label set.
  - Empty/loaded/error states: unchanged behaviour; this is presentation consolidation.
  - Test (the contract): the existing component tests (inputs.test.js,
    selectionControls.test.js, foodComponents.test.js) MUST be updated to match each
    decision (a deleted component's test is removed; a wired component gains a
    render-in-context test).
VERIFICATION: dead/unwired and hand-rolled facts VERIFIED in code (file:line per
  component). Market justification for the dead-code half is NOT-FOUND (compare-11
  NOTE: "No market source bears on this") — mark this half EVIDENCE-THIN on market,
  STRONG on code. FOUNDER-GATE: HeldDecisionCard (safety) and CancelReasonSheet
  (billing). NOT-DETERMINED: dynamic-require safety before any delete.
```

---

```
ID: U-F-4
AREA: Design, visual quality & premium feel
TITLE: Unify the two animation systems — give the sheets the tokenised motion language
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 4 — subtle but it is exactly the "intentional, consistent motion"
  premium signal the research names (Craft animation-as-premium — VERIFIED). Today a
  sheet opening at an untokenised 260ms next to a list entering at the tokenised
  320ms is a quiet inconsistency users feel without naming.
EFFORT (1-10): 4 — token swap is small, but BottomSheet uses RN `Animated` while the
  tokenised path is Reanimated; matching the curves needs care (and FeedbackSheet,
  PeekMenu, PRCelebration each roll their own RN Animated timing too). Behaviour must
  stay byte-for-byte under reduce-motion.
CURRENT STATE: Two animation systems coexist (compare-11 WHERE-WE-LAG; Phase-1
  cross-cutting 15a:548-550):
  - AnimatedEntrance uses Reanimated FadeInDown on the tokenised `motion.enter`
    (320ms) emphasized-decelerate curve, reduce-motion aware (AnimatedEntrance.js:22,
    :38-45, 15a:32-41).
  - BottomSheet uses RN `Animated` with LITERAL durations (OPEN 260 / CLOSE 200 /
    backdrop 200/160) and `Easing.out/in(Easing.cubic)` rather than the tokenised
    `motion.ease*` curves (BottomSheet.js:24-27,:57,:67, 15a:198-199,:208-213). Motion
    tokens exist: `motion.enter` 320 / `motion.exit` 220 and `motion.ease*`
    (theme.js:517-537, cited 15a:210-211).
  - FeedbackSheet (15b:73-75, animated translateY + backdrop), PeekMenu (15b:224-228)
    and PRCelebration (15b:180-181) also use RN Animated with their own timings.
THE PROBLEM:
  Newbie + athlete: motion inconsistency reads as "two apps stitched together"; the
  research's premium bar is one motion language. The sheets are high-frequency
  surfaces (every food add, every churn flow, every context menu).
THE EVIDENCE:
  - compare-11 WHERE-WE-LAG "TWO animation systems coexist" and MISSING-ENTIRELY "No
    tokenised motion system shared by sheets" — VERIFIED (Craft animation-quality
    source).
  - Phase-1 15a:548-550 (cross-cutting #5), 15a:208-213 — VERIFIED in code.
BEST REFERENCE IMPLEMENTATION:
  In-repo: AnimatedEntrance is the model — it reads `motion.enter` from theme with no
  hardcoded timing and falls back cleanly under reduce-motion (15a:32-41). The target
  is to make the sheets speak that same tokenised motion vocabulary.
PROPOSED SOLUTION:
  Replace the literal durations/easings in the RN-Animated sheets with the `motion.*`
  tokens (theme.js:517-537), so all motion derives from one source of truth.
  - Minimum (low-risk): swap the literals in BottomSheet (OPEN/CLOSE/backdrop) to
    `motion.enter`/`motion.exit` and the easing to the tokenised `motion.ease*`
    curves, preserving the reduce-motion instant path exactly (BottomSheet.js:24-27,
    :43,:52-53,:62-63). Then do the same for FeedbackSheet and PeekMenu timings.
  - Maximum (founder choice, higher risk): migrate the sheets to Reanimated to share
    one engine. PRESENT BOTH; recommend the minimum (token swap on the existing RN
    Animated) as the safe default — it captures the premium signal without an engine
    migration. Do NOT migrate silently.
  PRCelebration is the app's one hero moment (15b:169-183); leave its bespoke spring
  timing and sanctioned non-token confetti hexes (15b:185-186) alone unless the
  founder asks — it is deliberately exceptional.
NEWBIE + ATHLETE EXPERIENCE: sheets open/close on the same rhythm as list entrances;
  motion feels like one considered system. No behavioural change; reduce-motion users
  unaffected.
IMPLEMENTATION BLUEPRINT:
  - File: src/components/BottomSheet.js:24-27 (OPEN_MS/CLOSE_MS/backdrop literals),
    :57 and :67 (Easing). Map to motion tokens at theme.js:517-537 (exact token names
    NOT DETERMINED beyond `motion.enter`/`motion.exit`/`motion.ease*` as named in
    15a:210-211 — read theme.js to confirm the easing token names before building).
  - Preserve reduce-motion: BottomSheet shows/hides instantly under reduceMotion
    (15a:215-216, BottomSheet.js:43,:52-53,:62-63) — that branch must remain.
  - Then FeedbackSheet.js animated translateY/backdrop (15b:73-75, lines 155-166 per
    15b:75) and PeekMenu.js (15b:224-228) — same token swap.
  - Handle radius literal `borderRadius: 2` (BottomSheet.js:133, 15a:207,:212) is a
    separate micro-literal; fold into U-F-6 (token-hygiene), not here.
  - Empty/loaded/error states: not applicable (motion timing only).
  - Edge case: confirm RN Animated `useNativeDriver` compatibility is unchanged after
    the token swap (durations only; no driver change intended).
  - Test (the contract): an assertion that BottomSheet's durations resolve from
    `motion.*` not literals; a reduce-motion test that the instant path still fires.
    bottomsheet.test.js exists (15a:202) — extend it.
VERIFICATION: VERIFIED in code (15a:548-550,:208-213). NOT-DETERMINED: exact
  `motion.ease*` token names (read theme.js:517-537 before building). Max-track
  (Reanimated migration) is a founder multi-choice, not a silent default.
```

---

```
ID: U-F-5
AREA: Design, visual quality & premium feel
TITLE: Add on-screen legends/keys and inline jargon teaching to the deep data surfaces
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — this is the cluster's biggest user-facing gap for the newbie: the
  research says empty states and data surfaces should double as onboarding (what /
  why / what-to-do), but several deep surfaces drop coaching jargon cold (compare-11
  WHERE-WE-LAG "Jargon without inline teaching", Eleken empty-state-as-onboarding —
  VERIFIED). Directly serves the "calm + supportive for the beginner" half of the
  dual-audience gap the research says nobody else resolves.
EFFORT (1-10): 5 — additive UI (legends, an inline definition affordance) across
  several components; no engine or data change. The InfoTooltip primitive already
  exists to carry the explanations (15b:128-146), so the mechanism is in place.
CURRENT STATE: Several data surfaces use coaching-literate terms with no on-screen
  legend/teaching (compare-11 WHERE-WE-LAG + MISSING-ENTIRELY "on-screen LEGEND/KEY
  ... is missing"):
  - BodyDiagramHeatmap: a 5-band volume legend exists (Below/Optimal/Near/Over/No
    data) but assumes MAV/MRV concepts; "Over limit" is undefined for a newcomer
    (15a:163-164,:182-188).
  - EngineLog: "Engine Log", "Rep regression", "+1 set", "Avg reps x->y->z over 3
    weeks" — coaching-literate, no inline teaching (15a:491-497).
  - VolumeBars: MEV/MAV landmark ticks have NO on-screen legend (15c:298-313) — and
    the component is currently dead (U-F-3); only teach it if it is wired in.
  - StreakWeeksSection: the 12-week glyph strip (kept/recovery/covered/paused) is
    "opaque without a legend on screen" (15c:206-208,:189 the glyph strip).
  - SetEntry "Est. max ≈" 1RM hint is jargon (15c:96,:101-102).
  - BlockProgressCard "Effort {5 - rirTarget}" is a 0-5 number with no scale shown
    (15a:124-127).
  Counter-examples that already teach well (use as the house pattern): BlockShapeCard
  uses jargon-free "Ease in / Build / Push / Recover" (15a:131-153), ProgressSections'
  calendar has a Rest/Trained legend (15b:349-350), WorkloadCard explains ACWR in an
  InfoTooltip (15b:351), ReadinessCards states the 1-5 scale and direction in copy +
  tooltip (15b:375-378).
THE PROBLEM:
  Newbie impact: the deep surfaces are where a beginner most needs the "what does
  this mean / what do I do" scaffold and get none; "Over limit", "Rep regression",
  bare MEV/MAV ticks and an unlabelled glyph strip are dead ends. This is the single
  clearest newbie failure in the design cluster.
  Athlete impact: none negative — a tappable definition is dismissible and does not
  add density; athletes ignore it.
THE EVIDENCE:
  - compare-11 WHERE-WE-LAG "Jargon without inline teaching on the deep surfaces"
    (Eleken empty-state-ux — VERIFIED) and MISSING-ENTIRELY "on-screen LEGEND/KEY
    ... missing" (StreakWeeksSection 15c:208; VolumeBars 15c:311-313;
    BodyDiagramHeatmap 15a:182-188).
  - Phase-1: 15a:182-188,:491-497,:124-127; 15c:206-208,:311-313,:96. VERIFIED in code.
BEST REFERENCE IMPLEMENTATION:
  In-repo: ReadinessCards (states scale + direction in copy AND an InfoTooltip,
  15b:375-378) and ProgressSections WorkloadCard (ACWR explained via InfoTooltip,
  15b:351) are the gold pattern already shipping. Externally, Gentler Streak's
  "stats translated into words" (compare-11 BEST-IN-CLASS — VERIFIED) is the tone.
PROPOSED SOLUTION:
  Add the existing InfoTooltip (15b:128-146) and small on-screen legends to the
  untaught surfaces, matching the ReadinessCards/WorkloadCard pattern:
  - BodyDiagramHeatmap: add an InfoTooltip "(i)" by the legend explaining the bands in
    plain words ("how much you've trained a muscle this week vs the helpful range"),
    define "Over limit" without MAV/MRV jargon (15a:182-188). (Coordinate the tooltip
    trigger's touch target with U-F-2.)
  - EngineLog: add a one-line plain-English subtitle or InfoTooltip on the header
    defining what the log is and what "rep regression" means in lay terms
    (15a:491-497).
  - StreakWeeksSection: add a compact on-screen key for the glyph strip
    (kept/recovery/covered/paused) — the screen-reader summary already exists
    (15c:207-208); mirror it visually.
  - SetEntry: a tiny InfoTooltip on "Est. max" explaining estimated 1RM in one line
    (15c:96).
  - BlockProgressCard: show the effort scale (e.g. "Effort 4/5") or an InfoTooltip,
    so "Effort 3" is not a context-free number (15a:124-127).
  - VolumeBars: a MEV/MAV legend — ONLY if U-F-3 wires VolumeBars in; otherwise drop
    this bullet (the component is dead).
  All teaching is additive and dismissible; no jargon is removed, so the athlete
  surface is unchanged. This must NOT introduce any AI/LLM — the copy is static,
  authored strings (CLAUDE.md deterministic-engine rule).
NEWBIE EXPERIENCE: every deep surface now answers "what is this / what do I do" in a
  tap, in plain British English; the heatmap, engine log and glyph strip stop being
  dead ends.
ATHLETE EXPERIENCE: unchanged density; the "(i)" affordances are ignorable.
IMPLEMENTATION BLUEPRINT:
  - Mechanism: reuse src/components/InfoTooltip.js (15b:128-146) — already used on
    NutritionTargets, WorkoutSummary, VolumeHeatmap, Analytics, and internally in
    ProgressSections/ReadinessCards (15b:131-135). Fix its sub-44px target as part of
    U-F-2 first, since this proposal adds more of them.
  - BodyDiagramHeatmap legend region: src/components/BodyDiagramHeatmap.js:255-268
    (the 5-item legend) — add the tooltip adjacent.
  - EngineLog header: src/components/EngineLog.js:84-95 (collapsed header).
  - StreakWeeksSection glyph strip: src/components/StreakWeeksSection.js:106 (glyphs),
    add a visible key near it.
  - SetEntry hint: src/components/SetEntry.js:96 ("Est. max ≈").
  - BlockProgressCard effort label: src/components/BlockProgressCard.js:25.
  - Copy: authored static strings (British English), NO AI. NOT DETERMINED IN CODE:
    exact wording — must be founder/spec-approved per CLAUDE.md "work from the source
    documents"; do not invent coaching definitions. Confirm against any glossary spec
    before writing the strings.
  - Empty/loaded/error states: legends render with the surface; tooltips only on
    demand. No new error states.
  - Edge case: under ED/wellbeing suppression, StreakWeeksSection is withheld
    (15c:193) — the new key must respect that suppression (do not render the key when
    the strip is suppressed).
  - Test (the contract): each new tooltip/legend has an accessibilityLabel; suppression
    test that the StreakWeeksSection key is absent under the ED flag.
VERIFICATION: jargon-without-teaching VERIFIED in code and in compare-11 (Eleken
  source — VERIFIED). NOT-DETERMINED: the exact teaching copy (must be spec/founder
  approved, not invented). VolumeBars bullet is conditional on U-F-3 wiring it in.
```

---

```
ID: U-F-6
AREA: Design, visual quality & premium feel
TITLE: Token-hygiene pass — one colour grammar, the borderSubtle hairline, scrim, and dead styles
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 4 — invisible-to-near-invisible to users today (most resolve to the
  same pixels), but it is the "consistency = premium" maintenance lever and removes
  drift risk: parallel colour mappings can diverge the moment a token value changes
  (compare-11 WHERE-WE-LAG/Phase-1 cross-cutting). Modest but real for the
  "intentional, considered" signal.
EFFORT (1-10): 3 — many tiny, isolated, like-for-like token substitutions across
  several files; each is low-risk because the resolved value is identical today. The
  risk is volume and the temptation to "improve adjacent code" — must touch only the
  cited lines (CLAUDE.md).
CURRENT STATE: Recurring off-spec token uses, all cited in Phase-1:
  - Colour grammar bypassed: BlockProgressCard fill thresholds use raw
    colors.primary/colors.warning (15a:118-123, :31-34); BodyDiagramHeatmap legend
    uses raw success/warning/error not volumeColors (15a:174-181,:263-267); EngineLog
    status colours raw (15a:484-488,:101-118); FatigueTrendCard raw success/warning/
    error with a dead level-1/2 branch (15b:52-58); ProgressSections WorkloadCard raw
    (15b:347-348); ReadinessCards raw (15b:372). The theme defines
    `stateColors`/`volumeColors` as the single grammar (theme.js:459-492, cited
    15a:546).
  - Inside-card hairlines use `colors.border` (#6E6E6E, the card-EDGE token) instead
    of `borderSubtle` (#2E2E2C): ExercisePickerModal separator/header (15b:31-34),
    FeedbackSheet/PeekMenu sheet+handle (15b:80,:230), ProgressSections freq row
    withAlpha(border) (15b:347), ReadinessCards dividers (15b:369-370). Documented
    intent: borderSubtle is the inside-card divider (theme.js:25, cited 15b:13-15,
    :439-444).
  - Scrim drift: StreakWeeksSection hand-rolls withAlpha(colors.background, 0.6) as a
    modal overlay instead of colors.scrim (15c:203-204,:414-416); FeedbackSheet
    backdrop sets scrim AND an extra static opacity 0.55 that compounds with the
    animated 0->1 (15b:77-80).
  - Dead styles: ReadinessCards `mfCard` unused (15b:373-374,:451); SetEntry dead
    styles fieldLabelRow/plateBtn*/perSideHint/rirRow/rirBtn* after JSX removal
    (15c:97-98,:403-405).
  - Micro-literals where tokens exist: BottomSheet handle radius 2 (15a:207),
    BlockProgressCard bar borderRadius 3 (15a:118-123), several lineHeight literals
    (HeldDecisionCard.js:89, TodaysPlateTeaser.js:77,:89 — 15d:417-418; AppAlert 22,
    DifferentialBadge 22, etc.). SVG-intrinsic literals (Illustrations, PlateCalculator
    plate colours, MacroRings hero numeral, RestTimer hero numeral) are SANCTIONED
    exceptions and must be LEFT (15b:115-121,:185-186; 15d:209-211; 15b:413-414) —
    they carry eslint-disables and comments.
THE PROBLEM:
  Newbie + athlete (latent): nothing visibly broken today, but the parallel colour
  mappings mean a future theme tweak (e.g. changing the watch/act colour) updates
  some surfaces and not others — exactly the drift the single grammar was built to
  prevent. The borderSubtle/edge mix is off the theme's own documented spec.
THE EVIDENCE:
  - compare-11 WHERE-WE-LAG (does not foreground this; it is primarily a Phase-1
    cross-cutting consistency finding) — status: code-VERIFIED, market-NEUTRAL.
  - Phase-1: 15a:544-547 (#4), 15b:439-444,:448-451; 15c:402-405,:414-416; 15d:417-418.
    VERIFIED in code (file:line).
BEST REFERENCE IMPLEMENTATION:
  In-repo: Card.js — "No literals found ... a model-consistent primitive"
  (15a:323-325) — is the standard every surface should meet. TodayStrip and
  WeightTrendCard already use stateColors correctly and obey the Class-B rule
  (15c:284-285,:370-372).
PROPOSED SOLUTION:
  A scoped, like-for-like token-hygiene pass — substitute ONLY at the cited lines, no
  adjacent refactor:
  - Route the volume/coaching colour surfaces through `stateColors`/`volumeColors`
    (theme.js:459-492): BlockProgressCard (:31-34), BodyDiagramHeatmap legend
    (:263-267), EngineLog (:101-118), FatigueTrendCard (also fix the dead level-1/2
    branch, 15b:57-58), WorkloadCard (15b:347-348), ReadinessCards (15b:372).
  - Replace inside-card `colors.border` hairlines with `borderSubtle`: ExercisePickerModal
    (styles 235,:250), FeedbackSheet/PeekMenu sheet+handle, ProgressSections freq row
    (:368), ReadinessCards dividers (:307-308,:319). KEEP `colors.border` where it is a
    genuine card EDGE (PartnerRow row border is correct, 15b:209).
  - Scrim: StreakWeeksSection modal overlay -> colors.scrim (15c:211); remove
    FeedbackSheet's redundant static opacity 0.55 (15b:78-80).
  - Delete dead styles: ReadinessCards mfCard (15b:331-334); SetEntry dead style block
    (15c:157-256, the named blocks at 15c:97-98). Confirm no JSX references first.
  - Micro-literals -> tokens where a token exists (BottomSheet handle radius 2 ->
    radius token; BlockProgressCard bar radius 3; the non-SVG lineHeight literals).
  - LEAVE all sanctioned SVG/hero literals untouched (they are documented exceptions
    with eslint-disables).
NEWBIE + ATHLETE EXPERIENCE: no visible change today; the system becomes future-proof
  against theme drift and matches its own documented token spec.
IMPLEMENTATION BLUEPRINT:
  - Each edit is a single-line token substitution at the file:line cited above; touch
    nothing else in the file (CLAUDE.md "touch only what the task requires").
  - NOT DETERMINED IN CODE: the exact `stateColors`/`volumeColors` API shape — read
    theme.js:459-492 to confirm how a level maps to a colour before substituting (the
    inventory names the grammar but not the call signature).
  - Sequence this LAST in the cluster (after U-F-1..U-F-5) so it cleans up any literals
    those proposals leave behind, and so a deleted component (U-F-3) is not hygiene-fixed.
  - Empty/loaded/error states: unaffected (pure token/style hygiene).
  - Edge case: the FatigueTrendCard dead branch fix changes level-1 vs level-2 colour
    — confirm the intended mapping against the engine's level semantics before changing
    behaviour; if uncertain, only collapse the literal-to-token and LEAVE the branch
    logic (flag for founder).
  - Test (the contract): snapshot tests on the touched cards to prove no pixel change
    today; an assertion that the colour surfaces resolve through the grammar.
VERIFICATION: all findings VERIFIED in code (file:line). Market evidence NEUTRAL
  (this is a Phase-1 consistency finding, not a market gap) — mark EVIDENCE-THIN on
  market, STRONG on code. NOT-DETERMINED: stateColors/volumeColors call signature
  (read theme.js); the FatigueTrendCard dead-branch intended mapping (founder-confirm).
```

---

```
ID: U-F-7
AREA: Design, visual quality & premium feel
TITLE: Add a global summary-first / opt-in dense ("power-user") view mode
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 7 — this is the research's headline design recommendation and the
  one move that would let Volyume OWN the unmet market gap (data-deep for the athlete
  AND calm for the beginner in one product). High strategic impact, but it rests on
  an INTERPRETATION not a sourced competitor observation, so the score is held.
EFFORT (1-10): 8 — large: a global preference, a density context, and per-component
  dense/summary branches across the data surfaces; touches many components and a
  settings surface. Not a one-screen change.
CURRENT STATE: No global summary-first/dense split exists; density is decided
  per-component and the data-dense Progress cards always render dense (compare-11
  WHERE-WE-LAG "NO global summary-first / opt-in dense split"; MISSING-ENTIRELY "No
  opt-in compact/dense 'power-user' view mode anywhere in the library"). There IS a
  fontScale-driven stacking precedent (TodayStrip stacks at fontScale ≥1.3,
  15c:291-292,:177,:349-357) and a SettingsDisplay screen exists (SettingsPrimitives
  used by SettingsDisplayScreen.js, 15c:110-113) — NOT DETERMINED IN CODE whether it
  already holds a density toggle (none found in the inventory).
THE PROBLEM:
  Newbie impact: today the deep Progress cards render at full density regardless of
  user — the research says beginners want summary-first calm (Oura's four scores), and
  Volyume gives them Whoop-style density by default on those surfaces.
  Athlete impact: no single power-user toggle to turn EVERYTHING dense at once;
  density is piecemeal (compare-11 ATHLETE VERDICT).
THE EVIDENCE:
  - compare-11 WHERE-WE-LAG + MISSING-ENTIRELY + USER-SENTIMENT INTERPRETATION — the
    Whoop-vs-Oura comparison is VERIFIED (Tom's Guide source), BUT the mapping onto
    Volyume's dual audience is the research's own INTERPRETATION, not a sourced market
    finding (compare-11 VERIFICATION STATUS: "the interpretation is not itself a
    sourced market finding"). Flag: EVIDENCE-THIN (interpretation-led).
BEST REFERENCE IMPLEMENTATION:
  Oura default + Whoop opt-in (compare-11 BEST-IN-CLASS / Tom's Guide — VERIFIED):
  summary scores front-and-centre by default, full density available on demand.
PROPOSED SOLUTION (DIRECTION + founder decision required — this is the one cluster-F
  proposal that is bigger than a well-specified surface and per CLAUDE.md's build
  model is spine work, not agent leverage work):
  - A single user preference "Detail level: Summary / Detailed" in SettingsDisplay,
    persisted in the local store (offline-first; local is source of truth per
    CLAUDE.md ARCHITECTURE), read via a density selector the data cards subscribe to.
  - Summary mode collapses the data-dense Progress cards to their headline read; a
    "Show more" reveals the dense view per card. Detailed mode renders today's density.
  - Default = Summary for new users (Oura-calm default), with the choice remembered.
  - Reuse the existing fontScale-stacking precedent (TodayStrip 15c:177) as the
    technical pattern for conditional density.
  - This is NOT a Pro feature and must not be gated (it is a presentation preference,
    not a Pro capability — CLAUDE.md gating rule).
NEWBIE EXPERIENCE: a calm, summary-first Progress tab by default; depth is one tap away.
ATHLETE EXPERIENCE: one switch flips the whole app to full density — the power-user
  toggle the research says is missing.
IMPLEMENTATION BLUEPRINT:
  - FOUNDER-GATE on scope: this is large and interpretation-led — confirm GO and the
    exact surface list before building (CLAUDE.md: "for anything larger than a one-line
    change: write a plan first, wait for go").
  - Preference store + selector: NOT DETERMINED IN CODE (the inventory does not pin the
    store shape); model on the existing `accessibility.reduceMotion` selector pattern
    that components already subscribe to (15a:29; PressableCard 15b:295).
  - Settings surface: SettingsDisplayScreen via SettingsPrimitives (15c:110-113) — add
    a SettingRow toggle/segmented control (SegmentedControl exists, 15c:60-66; fix its
    target per U-F-2).
  - Candidate dense surfaces (from the inventory): ProgressSections cards
    (MesocyclePulseCard/TrainingCalendar/SessionDurationChart/MuscleFrequencyTable/
    WorkloadCard, 15b:328-352), ReadinessCards (15b:356-379), BodyDiagramHeatmap
    (15a:157-188), VolumeBars (if wired, U-F-3). EXACT surface list is a founder
    decision.
  - Gating: NONE (presentation preference).
  - Empty/loaded/error states: each card keeps its existing empty/skeleton states
    (Skeleton across 16 screens, 15c:129-144) in both modes.
  - Edge case: must compose with the existing fontScale stacking and reduce-motion;
    do not double-collapse.
  - Test (the contract): a card renders summary vs detailed off the preference; default
    is Summary; the preference persists offline.
VERIFICATION: the density GAP is VERIFIED (Whoop-vs-Oura, Tom's Guide). The
  dual-audience MAPPING and the specific solution are INTERPRETATION-led — EVIDENCE-THIN,
  flagged. FOUNDER-GATE on scope. NOT-DETERMINED: store/selector shape; the canonical
  dense-surface list; whether SettingsDisplay already has any density control.
```

---

```
ID: U-F-8
AREA: Design, visual quality & premium feel
TITLE: Surface the privacy / data-residency posture as a visible trust signal
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — the research says EU-residency / no-third-party-PII should be
  VISIBLE in the UI, not merely true, as a healthtech trust lever; Volyume already
  HAS the strong posture (CLAUDE.md ARCHITECTURE: EU Dublin, no PII to third parties)
  but does not surface it. Real trust upside, but the "make it visible" point is a
  VERIFIED principle applied by the research's architecture-alignment INTERPRETATION,
  not an observed competitor doing it — so the score is held.
EFFORT (1-10): 3 — a small, additive trust surface (a badge/line and/or a short
  "where your data lives" note), likely in Settings/About or onboarding; no data or
  sync change.
CURRENT STATE: No trust-badge / data-residency surface exists in the component
  library (compare-11 WHERE-WE-LAG + MISSING-ENTIRELY: "absent from all four
  fragments"). The closest existing signal is FeedbackSheet's privacy line stating
  what is stripped/attached and that body measurements/names are removed
  (15b:84-86,:336-339, FeedbackSheet.js) — a per-feature statement, not a standing
  trust surface. SettingsAbout and a PrivacyPolicyScreen exist (SettingsAboutScreen
  uses useFeedback 15b:71-72; PrivacyPolicyScreen uses BackHeader 15a:82-87) as
  natural homes.
THE PROBLEM:
  Newbie impact: a beginner deciding whether to log food/body data has no in-UI
  reassurance about where it goes — the research ties visible privacy posture to
  trust at exactly this decision point.
  Athlete impact: same; data-conscious users get no standing signal that data stays
  in the EU and off third-party services.
THE EVIDENCE:
  - compare-11 WHERE-WE-LAG "Privacy posture not surfaced as a trust signal" +
    MISSING-ENTIRELY — the trust-design PRINCIPLE is VERIFIED (thisisglance
    healthcare-trust source); the "Volyume should surface it" is the research's
    ARCHITECTURE-ALIGNMENT INTERPRETATION (compare-11 VERIFICATION STATUS: "rests on a
    VERIFIED trust-design principle plus the research's architecture-alignment
    INTERPRETATION (not a market observation of a competitor doing it)"). Flag:
    EVIDENCE-THIN (principle VERIFIED, application interpretation-led).
BEST REFERENCE IMPLEMENTATION:
  The principle source (thisisglance healthcare-app trust — VERIFIED): make the
  privacy posture visible, not just real. In-repo the FeedbackSheet privacy line
  (15b:336-339) is the tone to extend into a standing surface.
PROPOSED SOLUTION (additive, copy-bearing — FOUNDER-GATE on the exact claims):
  - Add a small, calm trust surface stating the true posture in plain British English:
    data stored in the EU (Dublin), no PII sent to third-party analytics/crash
    reporters (the CLAUDE.md ARCHITECTURE facts). Place it in SettingsAbout/Privacy
    and optionally a one-line reassurance at the food/body-metrics first-use point.
  - Use the existing Card surface (15a:309-325) and tokens; no new primitive needed.
  - It must state ONLY what is verifiably true of the architecture (CLAUDE.md "work
    from the source documents, never from your own interpretation") — the exact claim
    wording is FOUNDER-GATE (privacy/legal copy), confirm against the privacy policy
    and architecture before shipping; do NOT invent guarantees.
NEWBIE EXPERIENCE: a clear, reassuring "your data stays in the EU and isn't sold or
  sent to third parties" signal at the moment of deciding to log sensitive data.
ATHLETE EXPERIENCE: a standing, findable trust statement in Settings.
IMPLEMENTATION BLUEPRINT:
  - Home: SettingsAboutScreen.js (15b:71) and/or PrivacyPolicyScreen.js (15a:82-87);
    a Card (15a:309) with the trust copy. Optional first-use line on the food diary /
    body-metrics entry — NOT DETERMINED IN CODE which screen/first-use hook (confirm).
  - Copy: authored, factual, British English; FOUNDER/legal-approved. NOT DETERMINED:
    exact wording — must match the privacy policy and the EU-Dublin/no-PII architecture
    facts; do not fabricate.
  - Gating: NONE (trust copy is for all users).
  - No data, sync, or billing change — presentation only.
  - Empty/loaded/error states: static copy; none.
  - Edge case: keep it calm and non-clinical (research USER-SENTIMENT: users resent
    control-and-numbers framing) — a quiet line, not a banner.
  - Test (the contract): the surface renders with an accessibilityLabel; copy matches
    an approved source string (not hardcoded ad hoc).
VERIFICATION: the GAP (no trust surface) is VERIFIED in the inventory (absent from all
  fragments). The "surface it" recommendation is interpretation-led — EVIDENCE-THIN,
  flagged. FOUNDER-GATE on the privacy claim wording. NOT-DETERMINED: exact copy and
  the first-use placement hook.
```


<!-- ============ phase5/proposals-G-feature-gaps.md ============ -->

# Phase 5 proposals — CLUSTER G: New features (genuine gaps vs the market)

Source documents (read in full):
- `docs/ultimate-audit-2026-06-13/phase3/compare-12-feature-gaps.md` (the
  confirmed-absent features, with carried statuses).
- `docs/ultimate-audit-2026-06-13/ultimate-audit-00-navigation-psychology.md`
  (placement + confirms absence from the nav map).
- Phase-1 inventory fragments for implementation file:line:
  `phase1/01-workout-session.md`, `phase1/05-checkin-safety.md`,
  `phase1/09-progress-analytics.md`, `phase1/14-partner-cardio.md`,
  `phase1/08-food-logging.md`.

Scope note: this cluster is the "MISSING ENTIRELY (confirmed absent from the
nav-psychology map)" list (compare-12 :104–120) plus the white-space items
under WHERE WE LEAD / USER SENTIMENT. Every proposal that touches the
deterministic engine, the ED-safety system, gating, or billing is flagged
**FOUNDER-GATE** and is INPUT ONLY — not a build instruction. British English
throughout.

---

```
ID: U-G-1
AREA: Feature gaps — honest overreaching / deload warning
TITLE: Ship the "you're overreaching → take a lighter week" warning no consumer app ships
SUGGESTED TIER: 2 High
IMPACT (1-10): 9 — compare-12 names this the single clearest white-space in the
  whole market: "no consumer app was found shipping it; apps appear to fear
  telling paying users to train less" (USER SENTIMENT F1.1) and WHERE WE LEAD
  states the ED-safety stance + deterministic engine "uniquely position Volyume
  to ship the honest 'you're overreaching → deload' warning no consumer app
  ships". Beginner-protective and competitor-valued at once.
EFFORT (1-10): 6 — the surfacing primitives already exist (a deload banner with
  reason line + InfoTooltip on Consistency, ConsistencyScreen.js:54-70; a
  "Recovery week" banner on Active Workout, ActiveWorkoutScreen.js:1517-1534;
  FatigueTrendCard + WorkloadCard/ACWR on Consistency, ConsistencyScreen.js:
  97-114). The *decision* of when to fire is engine + ED-safety territory —
  FOUNDER-GATE — which is where the effort and the risk sit, not the UI.
CURRENT STATE: A `deloadAlert`-driven "Lighter week recommended" banner already
  renders on Consistency (moon icon, title, reason line, InfoTooltip)
  (ConsistencyScreen.js:54-70), and Active Workout shows a deload "Recovery
  week" banner with a "Skip" action (ActiveWorkoutScreen.js:1517-1534,
  styles 2621-2623). A `FatigueTrendCard` and a `WorkloadCard` labelled
  "Training load (ACWR)" already exist on Consistency (ConsistencyScreen.js:
  97-114). What is NOT DETERMINED IN CODE: whether `deloadAlert` is *fatigue/
  overreaching*-triggered or merely date/block-scheduled (compare-12 lists
  fatigue-TRIGGERED auto-deload as a LAG, F3.4), and what rule populates it.
THE PROBLEM: NEWBIE — a novice has no way to know they are doing too much too
  soon; compare-12 NEWBIE VERDICT flags "no readiness/overreaching warning to
  protect a novice from doing too much too soon (F1.1, F2.2)". ATHLETE — a
  competitor must currently time deloads by hand (compare-12 ATHLETE VERDICT:
  "a fitness-fatigue-form load curve to time deloads by fatigue rather than by
  hand (F2.1)"; "fatigue-triggered (not date-locked) auto-deload (F3.4)").
THE EVIDENCE: compare-12 MISSING/LEAD/SENTIMENT — F1.1 honest deload warning
  marked **NOT FOUND elsewhere = white-space**; F3.4 fatigue-triggered
  auto-deload **VERIFIED/PARTIAL**; F2.1 CTL/ATL/TSB load model **VERIFIED**.
BEST REFERENCE IMPLEMENTATION: Existence proofs for the *signal*: TrainingPeaks
  PMC (CTL 42-day EWMA, ATL 7-day EWMA, TSB = CTL − ATL), generalised to
  RPE-only by intervals.icu (compare-12 BEST IN CLASS F2.1,
  https://www.trainingpeaks.com/coach-blog/a-coachs-guide-to-atl-ctl-tsb/);
  auto-deload in a lifting app: Alpha Progression + Stronger by the Day (F3.4).
  No app ships the *honest warning* itself — that is the white-space Volyume
  would be first to fill (F1.1).
PROPOSED SOLUTION: A deterministic "back-off" recommendation that, when the
  engine's fatigue/load rule trips, surfaces a plain-English, non-alarming
  banner — "Your load has climbed faster than usual. A lighter week now will
  let it pay off." — with the rule stated as the rationale ("the rule is the
  rationale", compare-12 WHERE WE LEAD). It reuses the EXISTING deload banner on
  Consistency (ConsistencyScreen.js:54-70) and the Active-Workout recovery
  banner (ActiveWorkoutScreen.js:1517-1534); no new screen. The *trigger rule*
  is a deterministic engine output — no AI, no randomness — and must defer to
  the ED-safety floors (it can never push training UP, only down).
NEWBIE EXPERIENCE: Sees a gentle, opt-out banner ("Take a lighter week" + a
  one-line why + a "Tell me more" InfoTooltip in the existing pattern,
  ConsistencyScreen.js:62-66) instead of silently overreaching. Never shaming.
ATHLETE EXPERIENCE: Gets a fatigue-timed (not date-locked) deload prompt tied to
  the existing FatigueTrendCard/ACWR surface (ConsistencyScreen.js:97-114), with
  the numeric rationale on tap — replacing hand-timing.
IMPLEMENTATION BLUEPRINT:
  - Surface (no new nav): reuse the deload banner block on ConsistencyScreen.js:
    54-70 (moon icon, title, reason line, InfoTooltip) and the Active-Workout
    "Recovery week" banner at ActiveWorkoutScreen.js:1517-1534 (deloadBannerTitle
    style 2621, deloadBannerSub 2622, deloadSkip 2623). The "Skip" action already
    exists — keep it (the warning is advisory, never coercive).
  - Trigger rule: a deterministic engine signal. The fatigue/load inputs already
    rendered (FatigueTrendCard, WorkloadCard ratio !== null,
    ConsistencyScreen.js:110-114) imply a load model exists, but the rule that
    fires `deloadAlert` and whether it is fatigue- vs date-driven is **NOT
    DETERMINED IN CODE — confirm before building** (compare-12 holds F3.4 at
    VERIFIED/PARTIAL and Phase-1 did not read the engine).
  - Gating: the banner appears on Consistency (a FREE screen, no withProGuard,
    RootNavigator.js:349 per phase1/09 GATING) and Active Workout (FREE,
    phase1/01 GATING). Confirm against the FREE/PRO matrix whether a
    fatigue-warning counts as a "Precision Coaching adjustment" (Pro) before
    exposing it to free users.
  - States: loaded = banner present when rule trips; empty = banner absent
    (already self-hides "only when deloadAlert is set", ConsistencyScreen.js:54);
    error = no banner (fail-safe to silence, never a false alarm).
  - Edge cases: must NEVER fire during an active ED-safety hold or lower a
    floor; must never streak-shame (interacts with U-G-5).
VERIFICATION: FOUNDER-GATE (engine trigger rule + ED-safety boundary +
  free/Pro classification). UI primitives all VERIFIED in Phase-1. The trigger
  rule (fatigue- vs date-driven) and the FREE/PRO classification are NOT
  DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-2
AREA: Feature gaps — form-check video attached to a logged set/exercise
TITLE: Attach a form-check video to the exact exercise slot, with in-context per-exercise notes
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — the most-quoted competitor-communication ask in the research:
  "TrueCoach... upload the video directly to the exercise slot" (Jack Suljevic,
  VERIFIED) and "add videos/pictures to their workout comments... instead of
  having to navigate out... to the messenger" (Nick Cowell, VERIFIED)
  (compare-12 USER SENTIMENT). Beginner self-review and athlete cross-block form
  history both benefit.
EFFORT (1-10): 7 — there is NO video/media attachment surface anywhere in
  RootNavigator.js (compare-12 MISSING: "No video/media attachment screen
  anywhere in RootNavigator.js"); needs a new capture/attach affordance on a
  2625-line screen and offline-first local storage. Expo media capture is a
  native capability — confirm it is reachable via an Expo config plugin (managed
  workflow, CLAUDE.md ARCHITECTURE) before committing.
CURRENT STATE: Active Workout has a per-exercise overflow ("⋯") menu
  (ActiveWorkoutScreen.js:1464-1484, overflow sheet 2112-2122) and an optional
  per-set note TextInput (ActiveWorkoutScreen.js:1729-1741) and a "Note"
  secondary button (1882). There is no media attach. ExerciseDetail exists
  (RootNavigator.js:323,351) but per phase1 carries no attached-media surface
  (NOT DETERMINED beyond the nav map). Self-attach form-video is held PARTIAL
  (compare-12 F3.7).
THE PROBLEM: NEWBIE — cannot self-review technique against a demo in context
  (compare-12 NEWBIE VERDICT: "no form-video self-review/demos-in-context
  (F7.1, F4.1)", "no in-context per-exercise coaching notes (F5.5)"). ATHLETE —
  no durable form-video history tied to a lift across blocks (ATHLETE VERDICT,
  F4.1).
THE EVIDENCE: compare-12 MISSING ENTIRELY F3.7/F4.1/F5.5 — TrueCoach VERIFIED;
  self-attach PARTIAL. USER SENTIMENT quotes VERIFIED.
BEST REFERENCE IMPLEMENTATION: TrueCoach — video uploaded to the exercise slot,
  time-stamped comments + drawing tools; "the feature Trainerize users beg for,
  115 votes" (compare-12 BEST IN CLASS F4.1, https://truecoach.co/features/).
PROPOSED SOLUTION: Let a user attach a short self-recorded clip (and a text
  note) to a specific exercise within a logged session, stored locally
  (offline-first, device is source of truth — CLAUDE.md ARCHITECTURE), and
  re-view it from ExerciseDetail as a per-lift history. NO coaching/LLM analysis
  of the video — it is a self-review artefact only (respects the no-AI boundary).
NEWBIE EXPERIENCE: From the exercise "⋯" overflow during logging, "Add a form
  clip" → record/pick → it pins to that exercise; later, the demo + their own
  clip sit side by side in ExerciseDetail for self-comparison.
ATHLETE EXPERIENCE: Builds a durable clip history per lift across blocks,
  viewable in ExerciseDetail (RootNavigator.js:323,351); pairs with the existing
  per-set note (ActiveWorkoutScreen.js:1729-1741).
IMPLEMENTATION BLUEPRINT:
  - Attach entry point: add an item to the existing exercise overflow sheet
    (ActiveWorkoutScreen.js:2112-2122) — NOT a new top-level screen — so it sits
    beside the existing "Swap exercise" affordance.
  - Review surface: ExerciseDetail (ExerciseDetailScreen, RootNavigator.js:323
    PlansStack / :351 ProgressStack). Whether ExerciseDetail currently renders
    any media list is **NOT DETERMINED IN CODE — confirm before building**
    (Phase-1 nav map only; ExerciseDetailScreen.js not read in this cluster).
  - Storage: local-first; sync via the sync layer only, never a direct Supabase
    write from the component (CLAUDE.md ARCHITECTURE). "No PII to any external
    service" — a self-video must NOT be sent anywhere except EU Dublin via the
    sync target, and only if the user opts in. Exact storage path/table NOT
    DETERMINED IN CODE.
  - Native capability: media capture in Expo managed workflow requires an Expo
    config plugin (no eject — CLAUDE.md). Confirm the plugin + its licence as a
    dependency ask before installing (CLAUDE.md SACRED RULES — dependencies).
  - Gating: workout logging is FREE (phase1/01 GATING, no withProGuard on
    ActiveWorkout). Decide whether form-video is a FREE add or Pro — NOT
    DETERMINED; confirm against the FREE/PRO matrix.
  - States: empty = "No clips yet" in ExerciseDetail; loaded = clip thumbnails;
    error = capture/permission failure toast. Edge: large files on low storage;
    permission denied; offline (must still capture + store locally).
VERIFICATION: PARTIAL/evidence-thin on self-attach (compare-12 F3.7 PARTIAL).
  NOT DETERMINED IN CODE: ExerciseDetail media rendering, storage location, Expo
  media plugin availability, and FREE/PRO classification — all confirm before
  building. New dependency (media plugin) requires a founder yes.
```

---

```
ID: U-G-3
AREA: Feature gaps — RPE/RIR trend to catch creeping fatigue
TITLE: An RPE/RIR trend graph so creeping fatigue is visible
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 7 — compare-12 WHERE WE LAG: "No RPE/RIR trend surfaced to detect
  creeping fatigue (logging exists everywhere; trend graph does not — F3.3)";
  ATHLETE VERDICT flags "an RPE/RIR trend graph to catch creeping fatigue
  (F3.3) — note the nav map shows no RPE-trend screen". Primarily an athlete
  feature.
EFFORT (1-10): 7 — a complication flagged in Phase-1: RPE is HARD-DISABLED in
  logging (`rpe:null` at ActiveWorkoutScreen.js:791,811) and RIR is "no longer
  asked per set" (SetEntry.js:135-138 comment) (phase1/01 ATHLETE QUESTION). So
  there is currently NO per-set RPE/RIR data to trend — capturing it again is a
  prerequisite, which touches the highest-frequency logging screen and likely
  the engine's autoregulation inputs.
CURRENT STATE: RPE is hard-disabled (`rpe:null`, ActiveWorkoutScreen.js:791,
  811); RIR no longer asked per set (SetEntry.js:135-138 comment). The
  Consistency screen surfaces fatigue via FatigueTrendCard (ConsistencyScreen.js:
  97-104) and ACWR (WorkloadCard :110-114) but no RPE/RIR trend. No RPE-trend
  screen anywhere in the nav map (compare-12 WHERE WE LAG / ATHLETE VERDICT).
THE PROBLEM: ATHLETE — cannot see whether effort-at-load is creeping up week to
  week (early fatigue), the F3.3 gap. NEWBIE — low relevance (RPE/RIR is athlete
  vocabulary; compare-12 places it in the ATHLETE column).
THE EVIDENCE: compare-12 WHERE WE LAG F3.3 — logging VERIFIED / trend PARTIAL.
  Phase-1 confirms RPE/RIR capture is currently OFF (ActiveWorkoutScreen.js:791,
  811; SetEntry.js:135-138).
BEST REFERENCE IMPLEMENTATION: intervals.icu RPE-only load curve (compare-12
  F2.1, generalises TrainingPeaks PMC to RPE). No single named RPE-trend graph
  app cited; held at the F3.3 PARTIAL.
PROPOSED SOLUTION: Re-enable optional per-set RPE/RIR capture and add a
  deterministic RPE/RIR-over-time line to the Consistency recovery section, beside
  the existing FatigueTrendCard. No AI; a plain rolling chart of logged effort.
NEWBIE EXPERIENCE: Off by default; an advanced toggle (Settings → Coaching,
  SettingsCoachingScreen RootNavigator.js:376) keeps the beginner logging path at
  1-3 taps (phase1/01 EXTRA ANSWER 3) unchanged.
ATHLETE EXPERIENCE: Sees an RPE/RIR trend line in the Consistency "Recovery
  signals" area (ConsistencyScreen.js:107) — the natural home next to fatigue/ACWR.
IMPLEMENTATION BLUEPRINT:
  - Prerequisite (FOUNDER-GATE): re-enabling RPE/RIR capture touches
    ActiveWorkoutScreen.js:791,811 and SetEntry.js:135-138 and likely the engine's
    autoregulation path. Whether the engine consumes RPE/RIR is NOT DETERMINED IN
    CODE — confirm before building (no-AI boundary: the trend is descriptive, not
    a coaching adjustment, unless founder says otherwise).
  - Surface: add a card in the Consistency recovery section
    (ConsistencyScreen.js:107 ReadinessCards / :97-104 FatigueTrendCard area) — no
    new nav route. Consistency is FREE (RootNavigator.js:349, phase1/09).
  - Gating: if RPE/RIR feeds Precision Coaching it is Pro; if purely descriptive
    it may be FREE — NOT DETERMINED, confirm against the FREE/PRO matrix.
  - States: empty = "Log a few sessions with effort on to see your trend";
    loaded = line chart; error = hide. Edge: sparse/irregular logging; mixed
    sessions with effort on/off.
VERIFICATION: FOUNDER-GATE (re-enabling capture touches the logging contract and
  possibly the engine). Evidence PARTIAL (F3.3). Engine consumption of RPE/RIR
  and FREE/PRO classification NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-4
AREA: Feature gaps — readiness traffic-light gating daily volume
TITLE: A readiness (green/amber/red) signal from sleep + RPE + bodyweight trend
SUGGESTED TIER: 2 High
IMPACT (1-10): 7 — compare-12 WHERE WE LAG: "No readiness/recovery traffic-light
  gating daily volume from sleep + RPE + bodyweight trend (F2.2)"; NEWBIE VERDICT
  ties it to protecting a novice from doing too much (F1.1/F2.2). Both audiences.
EFFORT (1-10): 7 — a `ReadinessCards` component already renders in the
  Consistency "Recovery signals" section (ConsistencyScreen.js:107), and the
  inputs are already captured weekly (energy/motivation, stress, sleep hours,
  soreness — WeeklyCheckInScreen.js:685-726, 919-930) and daily (morning weight
  trend, WeeklyCheckInScreen.js:739-763; EWMA weight on BodyMetrics,
  BodyMetricsScreen.js:766-797). The scoring rule (deterministic) and any
  daily-volume *gating* is the engine + ED-safety risk.
CURRENT STATE: `ReadinessCards` exists on Consistency (ConsistencyScreen.js:107)
  — its internal content is NOT DETERMINED IN CODE (sub-component not read).
  Weekly check-in captures energy/stress/sleep/soreness/joint-pain
  (WeeklyCheckInScreen.js:685-726, 919-976); BodyMetrics has an EWMA weight trend
  (BodyMetricsScreen.js:766-797). No traffic-light readiness screen in the nav map
  (compare-12 WHERE WE LAG).
THE PROBLEM: NEWBIE — no daily "are you recovered enough?" guard. ATHLETE —
  cannot gate prescribed volume by recovery state.
THE EVIDENCE: compare-12 WHERE WE LAG F2.2 — VERIFIED/PARTIAL (Oura baseline
  held PARTIAL). Inputs VERIFIED present in Phase-1.
BEST REFERENCE IMPLEMENTATION: Whoop (green/amber/red recovery) + Oura
  (personal-baseline scoring, PARTIAL) gating daily strain/volume (compare-12
  BEST IN CLASS F2.2).
PROPOSED SOLUTION: A deterministic readiness score (green/amber/red) computed
  from already-captured inputs (sleep, soreness, energy/stress, bodyweight EWMA
  trend), surfaced in the existing `ReadinessCards` slot on Consistency, with the
  rule stated as the rationale. NO HRV/wearable dependency in v1 (Oura/Whoop
  inputs are PARTIAL and wearable integration is a separate Pro line —
  CLAUDE.md FREE vs PRO).
NEWBIE EXPERIENCE: A single plain card — "Recovery looks good / mixed / low" with
  a one-line why — no jargon, no required wearable.
ATHLETE EXPERIENCE: An amber/red day can suggest backing volume off (advisory,
  ties to U-G-1); pairs with FatigueTrendCard/ACWR already present.
IMPLEMENTATION BLUEPRINT:
  - Surface: populate the EXISTING `ReadinessCards` on ConsistencyScreen.js:107
    (no new route). Consistency is FREE (RootNavigator.js:349, phase1/09).
  - Inputs (all already captured): sleep hours (WeeklyCheckInScreen.js:715-726),
    soreness (WeeklyCheckInScreen.js:919-930), energy/stress
    (WeeklyCheckInScreen.js:685-711), morning-weight trend
    (WeeklyCheckInScreen.js:739-763), EWMA weight (BodyMetricsScreen.js:766-797).
  - Scoring rule: deterministic, no AI/randomness (CLAUDE.md SACRED). The rule is
    NOT DETERMINED IN CODE and is engine-adjacent — define under founder sign-off.
  - ED-safety: readiness can only ever advise REDUCING volume, never increasing
    it, and must defer to the ED-safety system (CLAUDE.md SAFETY). FOUNDER-GATE.
  - Gating: readiness is Precision-Coaching-adjacent → likely Pro (compare-12
    confirms readiness sits in the Pro coaching domain). Confirm against the
    FREE/PRO matrix; the inputs (BodyMetrics, WeeklyCheckIn) are already Pro
    (phase1/05, phase1/09 GATING), so the score likely should be too.
  - States: empty = "Check in this week to see your readiness"; loaded =
    coloured card + reason; error = hide. Edge: missing sleep input (optional,
    WeeklyCheckInScreen.js:715); too little data to score.
VERIFICATION: FOUNDER-GATE (deterministic scoring rule + ED-safety boundary +
  Pro gating). Evidence VERIFIED/PARTIAL (F2.2). `ReadinessCards` current
  content, the scoring rule, and FREE/PRO classification NOT DETERMINED IN CODE
  — confirm before building.
```

---

```
ID: U-G-5
AREA: Feature gaps — gentle, safe streak gamification
TITLE: A non-coercive consistency streak with a "streak freeze", and a consistency/PR partner leaderboard
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — compare-12 MISSING ENTIRELY: "Streak + streak-freeze
  gamification; closure-ring targets; consistency/PR partner leaderboard
  (Duolingo/Apple Fitness/Strava/Finch; F6.1/F6.4/F2.7/F6.3, mostly VERIFIED).
  No streak, ring, badge or leaderboard surface in the map." Retention driver;
  social-proof maps onto the existing Partner surface (WHERE WE LEAD).
EFFORT (1-10): 5 — consistency surfaces already exist: a `WeeklyStreakStrip` on
  the Progress landing (AnalyticsScreen.js:177-197) with milestone copy
  ("4 weeks of showing up.", :180-195) and a "Make a card" CTA at >=12 weeks;
  `StreakWeeksSection` on Consistency (ConsistencyScreen.js:46); a shared-streak
  chip + toggle on Partner (PartnerScreen.js:100-102, 201-208). A "streak
  freeze" and a leaderboard are net-new additions on these surfaces.
CURRENT STATE: WeeklyStreakStrip (AnalyticsScreen.js:177-197) and milestone row;
  StreakWeeksSection (ConsistencyScreen.js:46); Partner shared-streak chip
  (PartnerScreen.js:100-102) + "Share a consistency streak" toggle
  (PartnerScreen.js:201-208). Partner explicitly shares "Ticks only, like 3 of 4"
  and NEVER weights/sets/reps (PartnerScreen.js:34, 39-40). No streak-freeze, no
  closure ring, no leaderboard.
THE PROBLEM: NEWBIE — a missed week breaks the streak with no humane recovery,
  risking the exact "you missed a session, here's what to do" gap compare-12
  flags (NEWBIE VERDICT F7.5). ATHLETE — no social-proof leaderboard on the
  existing Partner surface.
THE EVIDENCE: compare-12 MISSING F6.1/F6.4/F2.7/F6.3 — "mostly VERIFIED"; Strava
  leagues decomposition source held PARTIAL (VERIFICATION). ED-safety caveat
  carried: "no coercive ratcheting, never streak-shame a deload" (compare-12
  MISSING caveat + research §5).
BEST REFERENCE IMPLEMENTATION: Finch (bird never dies) + Duolingo streak freeze
  (compare-12 BEST IN CLASS F6.1/F6.4); Strava kudos as the social-proof driver
  (WHERE WE LEAD, F6.2 VERIFIED academic).
PROPOSED SOLUTION: (a) A "streak freeze" so a planned light/recovery week or a
  single miss does NOT break the consistency streak — implemented on the existing
  WeeklyStreakStrip/StreakWeeksSection; (b) an optional consistency/PR leaderboard
  limited to the Partner surface's existing privacy model (ticks/PRs only, never
  weights). All gentle: the streak never shames, and a deload week must auto-apply
  a freeze (interacts with U-G-1).
NEWBIE EXPERIENCE: A missed week shows "Streak protected — life happens" rather
  than a reset, reusing the supportive milestone copy pattern
  (AnalyticsScreen.js:180-195).
ATHLETE EXPERIENCE: An opt-in consistency/PR leaderboard within an existing
  partnership (PartnerScreen.js), respecting the SEES/NEVER_SEES contract
  (PartnerScreen.js:33-45).
IMPLEMENTATION BLUEPRINT:
  - Streak-freeze surface: WeeklyStreakStrip (AnalyticsScreen.js:177-197) and
    StreakWeeksSection (ConsistencyScreen.js:46) — no new route. Progress is
    FREE (RootNavigator.js:342, phase1/09).
  - Leaderboard surface: extend PartnerScreen.js within its privacy model — it
    already shares a streak chip (PartnerScreen.js:100-102) and "ticks only"
    (PartnerScreen.js:34). It must NOT expose weights/sets/reps/body/food
    (PartnerScreen.js:39-45). Partner is FREE for 1 partner / Pro for up to 3
    (PartnerScreen.js:14,210-212).
  - ED-safety (FOUNDER-GATE): streak logic must never coercively ratchet and must
    never streak-shame a deload (compare-12 caveat). A deload/recovery week
    (U-G-1) must auto-freeze, not break, the streak. The streak-break rule is NOT
    DETERMINED IN CODE.
  - Closure-ring targets (F2.7): lower priority; not specified here (no existing
    ring surface in the nav map) — mark NOT DETERMINED and treat as a later add.
  - States: empty = no streak yet; loaded = streak + freeze count; error = hide.
    Edge: timezone/week-boundary for "a week"; a deload week; a paused account.
VERIFICATION: FOUNDER-GATE (ED-safety: no coercive ratcheting, no deload-shaming).
  Evidence mostly VERIFIED; Strava-leagues source PARTIAL. Streak-break rule and
  closure-ring surface NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-6
AREA: Feature gaps — injury / pain logging with auto-rotation
TITLE: Log a joint/tendon pain flag and rotate the plan around it
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — compare-12 MISSING ENTIRELY: "Injury / pain / joint logging
  with auto-rotation around it (F3.6 PARTIAL). Absent." ATHLETE VERDICT lists
  "injury/pain logging with auto-rotation (F3.6)". Mainly athlete; protective for
  beginners too.
EFFORT (1-10): 6 — the *capture* half already exists: the weekly check-in asks
  "Any joint or tendon pain? No / Yes" (WeeklyCheckInScreen.js:966-976) and
  per-muscle soreness with a muscle grid (WeeklyCheckInScreen.js:919-964). The
  missing half is the deterministic *auto-rotation* of exercises around a flagged
  joint — engine territory (substitution), and the exercise-swap UI already
  exists (ActiveWorkoutScreen.js:2112-2122 overflow → swap).
CURRENT STATE: Weekly check-in captures joint/tendon pain (Yes/No,
  WeeklyCheckInScreen.js:966-976) and muscle soreness with a 10-muscle grid
  (WeeklyCheckInScreen.js:933-964). Active Workout has a "Swap" affordance
  (ActiveWorkoutScreen.js:1454-1463 and overflow 2112-2122). No pain-driven
  auto-rotation; compare-12 confirms absent. Equipment-aware/deterministic
  substitution is held PARTIAL (compare-12 VERIFICATION F1.5).
THE PROBLEM: ATHLETE — must manually work around a niggle; no auto-rotation.
  NEWBIE — no protective rotation away from a painful movement.
THE EVIDENCE: compare-12 MISSING F3.6 — **PARTIAL**. Capture VERIFIED present in
  Phase-1 (WeeklyCheckInScreen.js:966-976).
BEST REFERENCE IMPLEMENTATION: compare-12 cites F3.6 as PARTIAL with no single
  named exemplar; substitution is the deterministic-substitution gap (F1.5,
  PARTIAL). Treat as evidence-thin.
PROPOSED SOLUTION: When a user flags joint/tendon pain (the existing check-in
  question, WeeklyCheckInScreen.js:966-976) or flags it inline, the deterministic
  engine offers a pain-aware substitution for affected movements via the existing
  swap surface — advisory, opt-in, no AI.
NEWBIE EXPERIENCE: "You flagged knee pain — want a knee-friendly swap for these?"
  with a one-tap accept reusing the existing swap flow.
ATHLETE EXPERIENCE: Pain flag persists and the plan rotates affected lifts until
  cleared, surfaced where swaps already live.
IMPLEMENTATION BLUEPRINT:
  - Capture: reuse the joint/tendon question (WeeklyCheckInScreen.js:966-976);
    optionally add an inline flag during logging (NOT DETERMINED — needs a new
    affordance on ActiveWorkout).
  - Rotation: deterministic substitution is engine work and is held PARTIAL
    (F1.5) — the substitution rule is NOT DETERMINED IN CODE. FOUNDER-GATE
    (engine + no-AI boundary).
  - Surface: the existing exercise swap (ActiveWorkoutScreen.js:1454-1463,
    overflow 2112-2122). Active Workout is FREE; WeeklyCheckIn is Pro
    (phase1/05 GATING). Confirm whether pain-aware rotation is Pro (Precision
    Coaching) before exposing on the FREE logging screen.
  - States: empty = no pain flagged; loaded = swap suggestion; error = hide. Edge:
    conflicting flags; cleared pain; an exercise with no safe substitute.
VERIFICATION: FOUNDER-GATE (engine substitution rule + no-AI boundary + gating).
  Evidence PARTIAL/evidence-thin (F3.6, F1.5). Substitution rule and any inline
  flag UI NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-7
AREA: Feature gaps — menstrual-cycle phase effect on lifts
TITLE: Phase-tagged strength trends (cycle-aware) for female users
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — compare-12 MISSING ENTIRELY: "Menstrual-cycle phase effect on
  lifts / phase-tagged strength trends (Drop It, Lunaletics, Wild.AI; F3.8
  VERIFIED). Absent." Audience is female competitors specifically (ATHLETE
  VERDICT, "for female competitors").
EFFORT (1-10): 5 — a cycle question already exists in the weekly check-in
  ("Affecting the scale / Not this week", WeeklyCheckInScreen.js:769-785,
  shouldShowCycleQuestion), so the data hook is partly present; the new work is
  phase tagging on the Lifts strength trend (LiftProgressScreen sparklines,
  LiftProgressScreen.js:244-294).
CURRENT STATE: Weekly check-in has a cycle question gated by
  `shouldShowCycleQuestion` (WeeklyCheckInScreen.js:769-785). Lifts shows per-lift
  e1RM sparklines (LiftProgressScreen.js:244-294, 288). No phase tagging of
  strength trends; compare-12 confirms absent.
THE PROBLEM: ATHLETE (female) — cannot see strength variation by cycle phase.
  NEWBIE — low relevance; advanced.
THE EVIDENCE: compare-12 MISSING F3.8 — **VERIFIED**. Gate caveat carried:
  "Precision-Coaching-adjacent → likely Pro; confirm against FREE/PRO matrix
  before any build" (compare-12 MISSING note, research §5).
BEST REFERENCE IMPLEMENTATION: Drop It / Lunaletics / Wild.AI (cycle-synced)
  (compare-12 BEST IN CLASS / MISSING F3.8).
PROPOSED SOLUTION: Optionally tag the e1RM trend on the Lifts screen by cycle
  phase for users who track a cycle, so phase-related strength variation is
  legible. Descriptive only — no AI, no programme adjustment in v1.
NEWBIE EXPERIENCE: Hidden unless cycle tracking is on; no added complexity.
ATHLETE EXPERIENCE (female): Lift sparklines (LiftProgressScreen.js:288)
  optionally banded by phase.
IMPLEMENTATION BLUEPRINT:
  - Data: extend the existing cycle capture (WeeklyCheckInScreen.js:769-785). A
    phase model (vs the current binary "affecting the scale") is NOT DETERMINED
    IN CODE — confirm what cycle data is actually stored before building.
  - Surface: Lifts (LiftProgressScreen, FREE per phase1/09 GATING,
    RootNavigator.js:348) — sparkline rows (LiftProgressScreen.js:244-294).
  - Gating (FOUNDER-GATE): compare-12 explicitly says cycle-aware is
    Precision-Coaching-adjacent → likely Pro; the cycle question itself lives in
    the Pro WeeklyCheckIn (phase1/05). Confirm against the FREE/PRO matrix before
    any build (compare-12 MISSING note).
  - Privacy: cycle data is health data — EU Dublin residency, no PII to external
    services, local-first (CLAUDE.md ARCHITECTURE; Article 9 consent flow exists,
    RootNavigator.js:1134-1136).
  - States: empty = cycle tracking off (feature hidden); loaded = banded trend;
    error = fall back to un-banded. Edge: irregular/absent cycle data.
VERIFICATION: FOUNDER-GATE (Pro classification + Article 9 health data + no-AI
  boundary). Evidence VERIFIED (F3.8). Stored cycle data model and FREE/PRO
  classification NOT DETERMINED IN CODE — confirm before building.
```

---

```
ID: U-G-8
AREA: Feature gaps — audio coaching during the set
TITLE: Optional audio cues during a working set
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — compare-12 MISSING ENTIRELY: "Audio coaching during the set
  (Freeletics/Aaptiv/Peloton; F7.2 VERIFIED). No audio-cue surface." NEWBIE
  VERDICT lists "no audio coaching during the set (F7.2)". Mainly beginner-facing.
EFFORT (1-10): 4 — an audio primitive already exists: the RestTimer "escalates
  haptics + audio 3-2-1" (RestTimer.js:90-110, phase1/01 CURRENT STRENGTHS), so
  audio playback during a session is already wired; extending it to set cues is
  incremental, not net-new infrastructure.
CURRENT STATE: RestTimer plays an escalating audio 3-2-1 countdown
  (RestTimer.js:90-110). No coaching audio during the working set itself;
  compare-12 confirms no audio-cue surface.
THE PROBLEM: NEWBIE — no eyes-free guidance during a set (form/pace prompts).
  ATHLETE — lower relevance.
THE EVIDENCE: compare-12 MISSING F7.2 — **VERIFIED**.
BEST REFERENCE IMPLEMENTATION: Freeletics / Aaptiv / Peloton audio coaching
  (compare-12 BEST IN CLASS / MISSING F7.2).
PROPOSED SOLUTION: Optional, pre-recorded/deterministic audio cues (e.g. tempo
  count, "last rep", rest start) during a working set, reusing the RestTimer
  audio pipeline. NO generated/AI speech — fixed clips or deterministic
  tone/haptic cues only (no-AI boundary).
NEWBIE EXPERIENCE: Toggle on; hears simple cues so they needn't watch the screen
  mid-effort (complements the wet-hands failure points in phase1/01).
ATHLETE EXPERIENCE: Optional tempo cues for tempo work; off by default.
IMPLEMENTATION BLUEPRINT:
  - Pipeline: extend the existing RestTimer audio (RestTimer.js:90-110) to the
    set phase on ActiveWorkout (RootNavigator.js:295). Active Workout is FREE
    (phase1/01 GATING).
  - Setting: a toggle under Settings → Display & accessibility
    (SettingsDisplayScreen, RootNavigator.js:378) or Coaching
    (SettingsCoachingScreen, RootNavigator.js:376) — exact home NOT DETERMINED.
  - Content: fixed audio assets, no AI/TTS generation (no-AI boundary). The set
    of cues and their triggers is NOT DETERMINED IN CODE.
  - Gating: likely FREE (logging is FREE); confirm against the FREE/PRO matrix.
  - States: off (default), on; error = silent fallback. Edge: silent mode / OS
    volume; headphones; cue overlap with the rest-timer countdown.
VERIFICATION: Evidence VERIFIED (F7.2). No-AI boundary respected (fixed clips).
  Cue set, settings home, and FREE/PRO classification NOT DETERMINED IN CODE —
  confirm before building.
```

---

```
ID: U-G-9
AREA: Feature gaps — bar velocity (VBT) and tempo tracking
TITLE: Bar-speed / velocity and tempo capture
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 4 — compare-12 MISSING ENTIRELY: "Bar speed / velocity (VBT) and
  tempo tracking (Metric; F3.5 VERIFIED). Absent." Niche athlete feature;
  compare-12 treats Metric as "a gap-confirming existence proof" (BEST IN CLASS
  F3.5), i.e. a hardware-class capability.
EFFORT (1-10): 8 — VBT typically needs device sensors/hardware; there is no
  capture surface and no plate-maths helper even exists in render (the `plateBtn`
  style is defined but unused, SetEntry.js:173, phase1/01 ATHLETE QUESTION).
  This is the heaviest, most uncertain item in the cluster.
CURRENT STATE: No velocity/tempo capture anywhere; compare-12 confirms absent.
  An unused `plateBtn` style hints plate-maths was scoped but not built
  (SetEntry.js:173). Per-set logging is weight/reps only (SetEntry.js:42-133).
THE PROBLEM: ATHLETE — no VBT/tempo for velocity-based training. NEWBIE — not
  relevant.
THE EVIDENCE: compare-12 MISSING F3.5 — VERIFIED as a "gap-confirming existence
  proof" (i.e. the gap is real; the implementation class is hardware).
BEST REFERENCE IMPLEMENTATION: Metric — auto-measures bar speed/ROM/path →
  estimated 1RM (compare-12 BEST IN CLASS F3.5, https://metric.coach/).
PROPOSED SOLUTION: Defer hardware VBT; v1 could at most add manual tempo
  capture (e.g. a tempo field per exercise) without sensors. Full VBT is a
  hardware/native-sensor capability that conflicts with the
  managed-workflow/no-eject constraint unless via an Expo config plugin.
NEWBIE EXPERIENCE: None (hidden / not applicable).
ATHLETE EXPERIENCE: At most a manual tempo notation per set; true bar-velocity
  is out of scope without hardware.
IMPLEMENTATION BLUEPRINT:
  - Capture: a tempo field would extend SetEntry (SetEntry.js:42-133) — NOT
    DETERMINED whether a tempo field exists; none seen.
  - VBT proper: requires native sensor access (camera/accelerometer) → Expo
    config plugin, no eject (CLAUDE.md ARCHITECTURE), and likely a new dependency
    (founder yes required). Strongly evidence-thin / scope-heavy — recommend
    parking pending a dedicated decision.
  - Gating: NOT DETERMINED.
VERIFICATION: Evidence VERIFIED that the GAP exists (F3.5) but the
  implementation is hardware-class and EFFORT is high; mark **evidence-thin for
  a buildable v1**. Tempo field, VBT pipeline, dependency, and gating all NOT
  DETERMINED IN CODE — confirm/scope before building.
```

---

```
ID: U-G-10
AREA: Feature gaps — mood ↔ activity correlation
TITLE: A Daylio-style mood/activity correlation output with a confidence label
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 5 — compare-12 MISSING ENTIRELY: "Daylio-style mood↔activity
  correlation engine with a confidence label (F2.4 VERIFIED). WellbeingCheck
  (:399) captures wellbeing but the map shows no correlation-output surface —
  correlation engine NOT DETERMINED present (treat as missing pending Phase-1
  per-screen brief)." Cross-category insight; modest pull.
EFFORT (1-10): 5 — wellbeing capture exists (WellbeingCheck SCOFF screen,
  WellbeingCheckScreen.js; energy/stress/sleep in WeeklyCheckIn,
  WeeklyCheckInScreen.js:685-726) and an "insight" surface exists on the Progress
  landing (InsightRow stack, AnalyticsScreen.js:235-242, 398-415). The new work
  is the deterministic correlation output + a confidence label.
CURRENT STATE: WellbeingCheck captures a SCOFF self-screen (private, device-only,
  WellbeingCheckScreen.js:76-120); WeeklyCheckIn captures energy/stress/sleep
  (WeeklyCheckInScreen.js:685-726). The Progress landing renders an InsightRow
  stack with severity icons + copy (AnalyticsScreen.js:235-242, 398-415). NO
  correlation-output surface — compare-12 explicitly treats it as missing /
  NOT DETERMINED.
THE PROBLEM: NEWBIE/ATHLETE — captured wellbeing data is never turned into a
  "training seems to lift your mood (medium confidence)"-style insight.
THE EVIDENCE: compare-12 MISSING F2.4 — **VERIFIED** (the correlation feature
  exists in Daylio); the *Volyume* correlation engine is **NOT DETERMINED**
  present (compare-12 nav-map caveat + VERIFICATION).
BEST REFERENCE IMPLEMENTATION: Daylio mood↔activity correlation with a
  confidence label (compare-12 BEST IN CLASS / MISSING F2.4).
PROPOSED SOLUTION: A deterministic correlation between logged training/activity
  and captured wellbeing (energy/mood/sleep), surfaced as an InsightRow on the
  Progress landing with an explicit confidence label and the rule as rationale.
  No AI — a transparent statistical readout, never a claim beyond the data.
NEWBIE EXPERIENCE: A plain insight card ("Weeks you trained 3+ times, your energy
  was higher — low confidence so far") that grows in confidence with data.
ATHLETE EXPERIENCE: Same surface; useful for spotting wellbeing/volume links.
IMPLEMENTATION BLUEPRINT:
  - Surface: the existing InsightRow stack on AnalyticsScreen.js:235-242 (render
    398-415) — no new route. Progress landing is FREE (RootNavigator.js:342).
  - Inputs: WellbeingCheck (WellbeingCheckScreen.js) is device-only and private
    (WellbeingCheckScreen.js:118-120) — do NOT surface SCOFF answers; use only
    non-clinical wellbeing (energy/mood/sleep from WeeklyCheckInScreen.js:
    685-726) for any visible correlation. Whether a correlation engine already
    exists is NOT DETERMINED IN CODE (compare-12 caveat).
  - Confidence: a deterministic confidence label is required (compare-12 F2.4) —
    the statistic + threshold rule is NOT DETERMINED IN CODE.
  - Gating: WeeklyCheckIn inputs are Pro (phase1/05); the Progress landing
    self-hides Pro sections by tier (AnalyticsScreen.js:76). Confirm FREE/PRO
    classification for the correlation output.
  - No-AI: deterministic statistics only; never an LLM-generated narrative.
  - States: empty = "Not enough data yet"; loaded = insight + confidence; error =
    hide. Edge: spurious correlation on tiny n (the confidence label must guard
    against this); never imply causation.
VERIFICATION: Evidence VERIFIED for the market feature (F2.4); Volyume presence
  NOT DETERMINED (compare-12 nav-map caveat) → **evidence-thin** on absence.
  No-AI boundary respected. Correlation engine presence, confidence rule, and
  FREE/PRO classification NOT DETERMINED IN CODE — confirm before building.
```

---

## Cluster summary

10 proposals (U-G-1 … U-G-10), traced to the compare-12 "MISSING ENTIRELY",
"WHERE WE LAG" and "USER SENTIMENT/WHERE WE LEAD" findings, with implementation
detail cited to Phase-1 fragments 01/05/08/09/14.

FOUNDER-GATE (engine / ED-safety / gating boundary, input only): U-G-1, U-G-3,
U-G-4, U-G-5, U-G-6, U-G-7. Evidence-thin: U-G-2 (self-attach PARTIAL, F3.7),
U-G-6 (F3.6/F1.5 PARTIAL), U-G-9 (hardware-class, buildable v1 thin),
U-G-10 (Volyume presence NOT DETERMINED, F2.4).

Recurring NOT-DETERMINED-IN-CODE facts to confirm before building: the
deload/fatigue trigger rule (U-G-1); ExerciseDetail media rendering + storage
path + Expo media plugin (U-G-2); engine consumption of re-enabled RPE/RIR
(U-G-3); the `ReadinessCards` content + readiness scoring rule (U-G-4); the
streak-break rule + closure-ring surface (U-G-5); the deterministic
substitution rule + any inline pain-flag UI (U-G-6); the stored cycle-data
model (U-G-7); the audio-cue set + settings home (U-G-8); a tempo field / VBT
pipeline + dependency (U-G-9); the correlation-engine presence + confidence
rule (U-G-10). Plus the FREE/PRO classification on nearly every proposal.
