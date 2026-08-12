# Campaign 10 — lead rulings register

Rulings made under the D33 delegation (product forks decided on one
criterion: the best solution for the app and its users, never on effort).
Section 2 inviolables bind every ruling here.

**Recording gap, disclosed rather than papered over.** Campaigns 10A–10F
landed with their rationale in commit messages and in the code comments at
each change site, but no register file was opened for them. This file
starts at 10G. Retro-documenting 10A–10F is real work that has not been
authorised and has not been done; it is surfaced here as a founder
decision, not parked.

---

## C10G-1 — the live block's e1RM slope combines by median, and drops muscles with no reading

**Fork.** `weeklyCoach.getPerformanceScore` takes ONE number,
`blockE1rmSlopePct`; `blockMetrics.computeBlockPerformance` produces a
slope PER MUSCLE. Wiring D91-9's "caller-supplied block e1RM slope >= 1.5%"
therefore needs a rule for turning several muscles into one number, and a
rule for muscles that produced no usable strength series.

**Ruling.**

1. A muscle whose result carries `confidence === 0` is DROPPED, not read as
   0%. In `computeBlockPerformance`, `e1rmSlopePct` is 0 exactly when no
   exercise produced a usable fit (`totalWeight === 0`), and `confidence`
   is greater than 0 in exactly the complementary case — so confidence is
   already the honest "is this a reading at all?" flag. Reading the
   placeholder as 0% would both dilute a real reading and manufacture a
   fake flat one.
2. Every muscle dropped ⇒ `null`, which leaves the engine on its legacy
   PR-only performance read, byte-identical to having no caller.
3. The survivors combine by MEDIAN.

**Rationale for the median.** No new strength formula is defined: every
value combined is `computeBlockPerformance`'s own Theil-Sen output. The
median is the same robust combiner that fit already uses, so the posture is
consistent within the module. The two alternatives were rejected on their
failure modes rather than on effort:

- a session-weighted mean double-counts compound work (one bench session is
  evidence for chest, front delts and triceps, and would vote three times);
- a max lets one lucky muscle buy a whole-body top performance grade.

The direction of the error matters here. The only thing this number can do
downstream is EARN a bigger volume push (grade 1 + adherence ≥ 0.9 ⇒
`volumeDelta` up to +3), so a combiner that fails optimistically prescribes
more training on thinner evidence. The median fails conservatively.

**Mid-block use (the architecture question the order asked first).**
`computeBlockPerformance` is documented as a finished-block metric and its
only previous caller hard-gates on the finished state — but that gate exists
so a ledger cannot be FROZEN prematurely (Stage 6 review #14), not because
the arithmetic assumes the block ended. Every window in the function comes
from the plan (start, planned weeks, deload index) and every point from rows
actually logged. Called part-way through:

- no exercise passes the stability test until it has appeared in both halves
  of the accumulation phase across ≥ 3 block weeks, so the result is
  `confidence: 0` — no reading — never a false flat;
- once it does pass, the slope is TOTAL change across the observed span, so a
  part-block span accumulates less of it than the full block would, and the
  fixed 1.5% threshold therefore reads conservatively mid-block.

So this is NOT blocked on architecture. What the live caller must not read
is `doseResponse` and `prDensity`, which genuinely are block-END evidence;
it reads neither. Nothing is written, so no premature ledger can be frozen.

**Bounds honoured.** `BLOCK_SLOPE_STRONG_PCT` (1.5) unchanged. No second
slope formula. No new dependency. Read failure ⇒ `null` ⇒ legacy read; a
failure never fabricates evidence. Nothing here consults tier, and nothing
here touches an ED-safety surface (this is training volume, not intake).

**Residual property, stated plainly.** The alternative route to the top
performance grade is unavailable for roughly the first half of every block,
because the evidence does not exist yet. That is evidence accruing, not a
defect, and it is recorded in the product map's LIMITATIONS J5.

---

## C10G-2 — F-9 was already fixed; the finding was stale

No ruling was needed. `blockLedgerGather.computeMuscleRecoveryAggregates`
has returned `jointDiscomfortAvg: null` since Campaign 1 P0-4 (`19c109dd`,
2026-08-10), and `blockLedgerRunner` passes it through with no `?? 0`. The
audit finding F-9 and uncertainty U2 in `docs/_FULL-APP-PRODUCT-MAP.md`
predate that fix.

Re-verified end to end on 2026-08-12 rather than taken on trust:

- the null survives the ledger JSON and the sync push/restore round-trip
  (`sync.js` JSON-parses, `database.js` re-stringifies; no coercion);
- `interBlock.classifyMuscleBlock` reads it as zero strain WEIGHT via
  `num(v, 0)` — no evidence adds no strain, and pain the user never
  reported is never manufactured;
- the one positive-recovery gate that unlocks the RESPONSIVE +1 start,
  `blockMetrics.doseResponse.lateRecoveryOk`, requires real answers for BOTH
  soreness and joint, so missing joint feedback can never earn a higher
  starting dose.

The last point had been pinned only by a source-comment guard. It is now
pinned behaviourally too, in
`src/lib/__tests__/campaign10g.blockEvidence.test.js`.
