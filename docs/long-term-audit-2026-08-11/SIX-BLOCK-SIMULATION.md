# Campaign 6 — Phases 3 + 4: the six-block synthetic athlete

Authority: the Campaign 6 order, Phases 3 and 4. Harness:
`src/__tests__/campaign6.sixBlock.test.js` (24 tests, all green), which
walks the REAL pure chain per muscle per block:

    profileAdjustedPrior -> computeLearnedRange -> resolveSeedRange
    -> buildSeededWeeklyTargets -> (scripted outcome)
    -> classifyMuscleBlock -> entry appended to the ledger history

exactly as the persisted `block_ledger` chain feeds the next block
(`priorLedgerEntries` / `trailingStaleCount` semantics). Rerun the full
numeric trace any time with:

    C6_TRACE=1 npx jest campaign6.sixBlock -t "identical rerun"

Profile: intermediate, average recovery, lean gain, age 31. Calm
suppression is BLOCK-level in the real architecture, so the athlete's
calm period is block 5 for every muscle; the manual override is
per-muscle (side delts, block 4). All transitions are
"Continue with adjustments" (intent 'adjust'), prompt (0 weeks gap).

## The six arcs, with the chain's own numbers

Notation: seed start/peak (source) -> classification -> proposal.

**CHEST** (sustainable progress; dose-response pairs in B2 and B4):
B1 6/23 (profile) RESPONSIVE -> 6/23 · B2 6/23 (ledger) RESPONSIVE+pair
-> 7/23 · B3 7/23 RESPONSIVE -> 7/23 · B4 7/23 RESPONSIVE+pair -> 8/23
· B5 (SUPPRESSED) seeds 7/23, pair present but earns nothing -> hold ·
B6 seeds <= 7. Six good blocks moved the start by exactly the two
earned pairs (+2 max), and the suppressed block's pair was refused.

**BACK** (responsive then plateau): B1 10/27 (profile) RESPONSIVE+pair
-> 11 · B2 11/27 RESPONSIVE -> hold · B3 STALE (first flat: quiet hold,
no stimulus proposal) · B4 STALE entrenched -> stimulusChange
{variant_swap / rep_range}, volume UNCHANGED · B5 STALE · B6 RESPONSIVE
after the change. Three flat blocks never added a set: the lever is the
stimulus, not more volume.

**QUADS** (high strain then recovery): B1 8/21 (profile) STRAINED ·
B2 8/21 STRAINED · B3 RESPONSIVE 8/21 -> peak capped 17 ·
B4 8/17 RESPONSIVE · B5 suppressed hold · B6 RESPONSIVE+pair -> 9/21.
Two key characterisations (both pinned):
- **Strain reduction floors at the effective MEV.** The STRAINED branch
  targets previousStart - 2, but the clamp floors at the effective MEV
  (`interBlock.js` finish(): `clampInt(startTarget, mev, peakCeiling)`),
  so a muscle already at its MEV holds AT the productive floor and is
  never pushed below it. The reduction is real in the PEAK dimension:
  two strained blocks stepped the learned ceiling down 2 sets each
  (21 -> 19 -> 17) and the next responsive peak was capped by it.
- **Rebuild is slow**: recovery re-earns the ceiling at +2/block and the
  start climbs only with the evidence pair (+1, block 6).

**HAMSTRINGS** (insufficient early, stronger later): B1 and B2 return
INSUFFICIENT_DATA (no recovery data), hold their own numbers, and count
as ZERO learning evidence; the block-3 seed honestly falls back to
'profile' (the unjudged ledger entry cannot seed). From B3 real
evidence exists: B4 seeds from the ledger, earns +1 with the pair, and
by B6 the learned range is genuinely learned (>= 2 evidence blocks).

**SIDE DELTS** (manual override during block 4): B4 seeds 12/20
(source 'manual'), the entry defers to manual (proposal start/peak
null), and the learner's evidence count does NOT grow through it.
After the override is removed, block 5 seeds from 'profile' (the
deferred manual entry cannot seed; the learned band is skipped in the
suppressed block), and block 6 returns to the ledger. Manual intent
wins while present and teaches nothing after it is gone.

**CALVES** (peak volume during the suppressed block): B5 (calm)
achieves its biggest peak (20 sets, recorded `observed.suppressed:
true`). The learned ceiling after calm lifts (block 6) reflects ONLY
the unsuppressed evidence: 15, exactly where blocks 1-4 left it - the
20-set suppressed peak never taught the ceiling, retroactively or
otherwise. The suppressed block itself held rather than climbed.

## Phase 4 invariants (all pinned in the suite)

1. Block 1 is honestly research/profile for every muscle
   (`seed.source === 'profile'`, `isLearned === false`).
2. Personalisation compounds: by block 6 every evidence-bearing muscle
   seeds from ledger/learned history, none from raw research.
3. A successful dose is retained by default; +1 start ONLY with the
   dose-response evidence pair, and at most +1.
4. Strain reduces (ceiling and peak; start floors at effective MEV).
5. Stale muscles receive a stimulus-change proposal, never more sets.
6. Insufficient data falls back honestly and is never evidence.
7. Manual overrides win and never teach.
8. Calm/ED-suppressed blocks can never raise the learned ceiling,
   at fold time or retroactively.
9. Research remains a prior: every seed respects the research-MEV
   anchor; nothing ever exceeds the 30-set absolute ceiling.
10. The weekly ramp is monotone across accumulation, recovery week is
    lighter than the start, start never jumps more than +1 between
    blocks except by explicit manual intent.
11. The whole athlete is byte-identical on every rerun (deterministic
    engine law).

## Notable engine facts surfaced (for the maturity model and Phase 7)

- The profile-adjusted MAVhigh is the ramp top from day 1 (e.g. chest
  6 -> 23 across five accumulation weeks for an intermediate); the
  learned ceiling starts AT that value and only strain/overreach pull
  it down, only handled RESPONSIVE peaks pull it up (max +-2/block).
- A muscle whose start sits at effective MEV shows "no change" through
  strain: the honest explanation is the ceiling/peak reduction, not
  the start (feeds Phase 46 non-change states).
- The suppressed-block seed path degrades to the repeat numbers at the
  SEED level too (chest B5 seeded 7, not B4's proposed 8): suppression
  binds proposal, seed and memory independently - three separate locks.

---

# ADDENDUM SECTION — the six-block RELATIONSHIP report (Personalisation Dividend)

Per the founder's 2026-08-11 addendum. Every number below is the
chain's own output (rerun with the C6_TRACE command above); every
"explanation" cites the live copy source the user would actually see.

## Block 1 → Block 3 → Block 6, per muscle

**CHEST**
- B1: 6 start / 23 peak, source `profile`. Knows: profile inputs
  (intermediate, average recovery, lean gain, 31). Does not know: any
  personal response. Explanation the user sees: the research line
  ("Not enough personal history yet, so this block starts from
  research-based guidance…", blockExplain RESEARCH_START_LINE) - an
  honest non-claim.
- B3: 7/23, source `ledger`. New knowledge since B1: two judged
  RESPONSIVE blocks, one carrying the dose-response pair - the +1 to 7
  exists BECAUSE block 2 kept progressing in its higher-volume weeks
  with recovery to spare (interBlock's earned-pair rationale, spoken
  verbatim on the decision card). Still research-framed: the peak
  ceiling (learned ceiling never yet moved off the prior MAV).
- B6: seeds 7/23 after the suppressed block held B5 (the B4-earned 8
  was deliberately not carried through calm). Different from B1
  specifically because of history: start +1 (would be 6 on profile
  alone), seed source `ledger` not `profile`, and the recovery week is
  strain-scaled from the block's own achieved peak rather than flat
  research MEV. What would have been prescribed without the user's
  history: 6/23 from the profile prior, every block, for ever.

**BACK**
- B1: 10/27 `profile` → earns +1 (pair). B3: 11/27 `ledger`, now flat
  (STALE, first quiet hold). B6: 11/27 `ledger` with the entrenched
  plateau having proposed a STIMULUS CHANGE (variant swap / rep
  range) in B4 rather than a single added set - three flat blocks
  never bought volume. The dividend here is knowledge of what NOT to
  do: without history the profile prior would happily re-ramp; with
  it, the app knows more sets are not this muscle's lever, and says so
  ("…a change of stimulus is proposed rather than more volume").
- What it deliberately did NOT infer: that flatness means try harder.

**QUADS**
- B1: 8/21 `profile`, STRAINED. B3: 8/21 `ledger` with the learned
  ceiling already stepped 21 → 19 → 17 by two strained blocks; B3's
  own proposal caps the peak at 17. B6: 9/21 - the start's first climb
  in six blocks, earned only by B6's evidence pair after three clean
  responsive blocks slowly re-proved capacity (+2/block ceiling
  recovery). Dividend: the app REMEMBERED the strain (peaks stayed
  reduced for three blocks) and also remembered the recovery (the
  ceiling was re-earned, not reset). Without history: 8/21 every
  block, with the strain invisible to the prescription.

**HAMSTRINGS**
- B1/B2: 6/21 `profile`, INSUFFICIENT_DATA (no recovery feedback) -
  and the B3 seed HONESTLY fell back to `profile`, refusing the
  unjudged entries as personalisation. B6: `ledger`-seeded with a
  genuinely learned range (>= 2 evidence blocks) and a B4-earned +1.
  Dividend: two blocks of "we still can't judge this" were never
  laundered into claims; the moment real evidence existed, it took
  over.

**SIDE DELTS**
- B4 seeds 12/20 `manual`; the entry defers (proposal null); the
  learner's evidence count does not grow. B5 (override removed, calm
  block) seeds `profile`; B6 returns to `ledger`. Dividend expressed
  as autonomy: the user's number OWNED the block, taught nothing,
  and its removal restored engine coaching without residue. The
  explanation the user sees during B4 is the deferred-manual clause
  ("Your manual volume settings stay as they are; this is a note,
  not a change.").

**CALVES**
- B5 (calm) achieved its biggest peak, 20 sets, recorded
  `suppressed: true`. B6's learned ceiling: 15 - exactly where the
  unsuppressed blocks 1-4 left it. Dividend expressed as safety: the
  suppressed peak is REMEMBERED as history but can never teach the
  ceiling upward, at fold time or retroactively.

## The addendum's seven questions, answered from the record

1. **What did Volyume learn?** Chest and hamstrings' earned climbs
   (+1 per evidence pair, never more); quads' reduced-then-re-earned
   ceiling; back's plateau being a stimulus problem; per-muscle
   independence throughout (six different arcs in one athlete).
2. **What did it remember?** The strain (three blocks of reduced quad
   peaks), the manual override (for exactly one block), the
   suppressed peak (as history, never as capacity), every observed
   start/peak (the repeat option's exact numbers).
3. **How did it respond?** Only ever by ±1 start and ±2 ceiling per
   block, only on qualifying evidence, with every hold recorded
   (upwardCarryPrevented provenance).
4. **What improved?** Block-6 seeds are ledger/learned for every
   evidence-bearing muscle; zero rely on raw research; the recovery
   week is strain-scaled instead of flat.
5. **Where did the user retain control?** The manual block (won,
   taught nothing); every proposal remains confirm-gated
   (Repeat/Adjust both always rendered - FQ-2).
6. **Could the user tell why?** Yes at every block: the rationale
   strings are composed from the FINAL clamped numbers (interBlock),
   the receipt distinguishes judged holds from unjudged holds (RA-2),
   and the research line renders when nothing is personalised.
7. **What did it correctly refuse to infer?** Personalisation from
   INSUFFICIENT_DATA blocks, capacity from the suppressed peak,
   progress from the manual block, volume from the plateau, and any
   climb without the dose-response pair.

**Verdict: Block 6 is measurably more individual than Block 1** - not
Block 1 plus more data, but different numbers for different reasons
per muscle, each with provenance the user can be shown.
