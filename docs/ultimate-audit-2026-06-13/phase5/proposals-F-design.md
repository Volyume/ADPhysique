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
