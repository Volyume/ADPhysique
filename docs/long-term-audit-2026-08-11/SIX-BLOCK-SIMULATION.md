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
