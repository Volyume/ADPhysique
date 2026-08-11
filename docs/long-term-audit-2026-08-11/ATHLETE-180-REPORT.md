# The 180-day athlete - simulation report and relationship/continuity verdict

Campaign 6, Phase 50 + the founder addendum's 180-DAY RELATIONSHIP
REPORT requirement ("RELATIONSHIP/CONTINUITY VERDICT section with the
nine questions", addendum line 134-135).

**Authority and derivation note (D97-21).** The addendum names "the
nine questions" for this report but enumerates none (the six-block
report's seven ARE enumerated inline at line 131-132; the nine are
not, anywhere in the order or the addendum - both read end-to-end).
Rather than guess silently or park the deliverable, the lead ruled
(D33) a transparent derivation: questions 1-5 are the addendum's five
permanent promises applied to the 180-day arc; questions 6-8 are the
campaign's three binding laws (memory-not-trap, provenance,
lapse-is-not-failure) plus the safety inviolables; question 9 is the
honest continuity/loyalty verdict the handover's item 96 requires.
The derivation is flagged for founder confirmation in the final
handover; if the founder's intended nine differ, this section is
re-answered against them.

**Evidence base.** The permanent E2E `src/__tests__/campaign6.athlete180.test.js`
(11 tests, landed 517c2cc3) running the REAL pure chain
(profileAdjustedPrior -> computeLearnedRange -> resolveSeedRange ->
classifyMuscleBlock, plus runWeeklyCoach for the nutrition thread),
with the sibling suites campaign6.sixBlock (24), campaign6.longitudinal
(27), campaign6.lapse90 (11) and the D97 rulings register. Every
answer below cites shipping behaviour; nothing is aspirational.

---

## 1. The simulated six months

Three muscles, six blocks, the order's required beats:

| Block | Chest | Side delts | Calves | Nutrition thread |
|---|---|---|---|---|
| 1 | research/profile seed; earns +1 (dose-response pair) | research/profile | research/profile, peak 14 | baseline period, no adjustment (`weeksInPhase < 2`) |
| 2 | first evidence-driven change: start = block 1 + 1 (`seed.source: 'ledger'`) | retention | peak 15 | trend forming |
| 3 | earns +1 again; block ends into a TRUE REPEAT | retention | peak 15 | calibrated weekly runs |
| 4 | EXERCISE CHANGE -> honestly `INSUFFICIENT_DATA` | MANUAL OVERRIDE 12/20/24 wins; teaches nothing | partial week + missed check-in -> thin data, holds its own numbers | two-week weigh-in gap; confidence drops to 'low', no fabrication |
| 5 | SUPPRESSED (calm) - the dose-response pair is refused | steady | biggest peak of the six months (21) - never teaches the ceiling up | steady |
| 6 | returns to Standard; seeds from HISTORY, not research (`learned.isLearned`, >= 3 evidence blocks) | steady | ceiling unchanged or lower than pre-calm | day-180 run deterministic, never a data hold, floors intact all 25 weeks |

The five thesis assertions all hold in the suite: personalisation
compounds where evidence exists; manual intent wins; safety cannot be
learned around; insufficient evidence stays conservative; the
Free/Pro boundary is intact at every decision point.

---

## 2. RELATIONSHIP/CONTINUITY VERDICT - the nine questions

### Q1 (REMEMBER ME): after 180 days, what does Volyume demonstrably remember that Day 1 did not know?

**Answer: a per-muscle learned band with provenance, block decisions,
manual intent, and the full performance record.** Block 6 chest seeds
from history (`seed.source !== 'research'`, `learned.evidenceBlocks
>= 3` - athlete180:152-155) after an unjudgeable block AND a calm
period; the memory survived disruption while the working start
honestly reset (the test's own distinction, :147-151). PRs, e1RM
records and all completed history persist unbounded (D97-18, P10-1).
Weak spot, stated honestly: memory that only lives in AsyncStorage
choice state is thinner than SQLite memory, and the first
post-reinstall session runs before pref rehydration (D97-19 F4
residual).

### Q2 (RESPOND TO ME): which recurring inputs provably changed decisions?

**Answer: performance evidence (dose-response pair with confidence),
recovery signals, manual overrides, weigh-ins, check-in answers - all
class A with proof in the pure chain.** The +1 earns only on the
paired evidence (sixBlock suite); check-in recency now requires REAL
answers (P-4, 853819d0 - a sleep-only row no longer unfreezes
recalibration); consecutive-week counters require calendar adjacency
(D97-5). The campaign found and closed places where copy implied
response that did not happen (the dead FQ-6.1 retry, P-1) and where
response happened without honest copy (P-6 repeat seeding the learned
band while promising "same as last time" - fixed to seed observed
numbers, 300bd5d1).

### Q3 (HELP ME IMPROVE): is the Block-6 prescription measurably more specific than Block 1?

**Answer: yes where evidence existed, and the difference is
attributable.** Chest block 3 start > block 1 start on earned
evidence; block 6 still seeds from history. Calves show the honest
negative: thin data (partial week, missed check-in) produced
INSUFFICIENT_DATA and the numbers held rather than flattering the
user with invented progression (athlete180:171-175). Specificity
never comes from flattery: recognition copy is evidence-backed and
the banned-phrase walker in campaign6.longTerm guards the repo.

### Q4 (RESPECT MY CHOICES): did explicit choices survive the six months?

**Answer: yes in the simulation; the campaign closed three real-world
gaps.** The block-4 manual override wins the seed AND teaches nothing
(`deferredToManual`, evidenceBlocks unchanged - athlete180:158-163).
The block 3 -> 4 repeat honours observed numbers. Real-world choice
memory was audited separately (CHOICE-MEMORY.md, 39 choices): insight
dismissals now ratchet against cloud nulls (F5), the block snooze is
per-user (F8), the profile blob survives reinstall push-back (F4).
Open, not hidden: F9 (revert expiry undefined) and F3 (workout notes
never sync) are carried founder questions.

### Q5 (SHOW ME WHY): could the user learn what changed, what stayed, and why - without internals?

**Answer: at block boundaries, yes; two communication gaps are
recorded and one copy question is founder-gated.** Seed receipts
distinguish research/profile/learned/ledger/manual (blockExplain
SOURCE_CLAUSE; heldUnjudged split RA-2; mature research line D97-16 +
P-5). Non-change states are distinct by construction (working /
insufficient / user-choice / safety / stimulus / exact-repeat). The
honest weak answers, from RELATIONSHIP-MOMENTS.md (A=12 B=6 C=0
D=2): B1 (per-muscle band provenance dropped at the merge) and B4
(nutrition provenance constant) are the two saturation-rule
implementation candidates; B2 (upward-carry-prevented never spoken)
is founder-gated because calm/ED are deliberately ORed and separating
them in copy risks exposing detector state. No surface overclaims
(C=0) - the promise "consequences, never internals" holds.

### Q6 (LAPSE <> FAILURE): did the gaps produce shame, fabrication, or pressure?

**Answer: no fabrication anywhere in the arc; gap changes confidence,
not history.** The two-week weigh-in gap drops trend confidence to
'low' and the mature week later answers without a data hold
(athlete180:201-212). The 90-day lapse E2E (campaign6.lapse90) pins
the same at journey scale; phase claims are now evidence-bounded
(P-2: "Week 15" counts coached weeks, the diet-break line states the
cut's set-age after a gap, never continuous under-eating). Copy fixes
D97-1 ("last logged weight", "personal baseline") removed the two
stale-history claims found in Phase 7. Counters cannot chain across
gaps (D97-5); the coached auto-walk cannot replay months later
(D97-10).

### Q7 (REFUSED TO INFER): where evidence was insufficient or suppressed, did Volyume stay conservative?

**Answer: yes, and the refusals are the strongest part of the
record.** The exercise change makes the block honestly unjudgeable
(INSUFFICIENT_DATA, never seeds); INSUFFICIENT_DATA never seeds a
band; the suppressed block's biggest peak (calves 21) never raises
the learned ceiling (athlete180:165-169); the suppressed
dose-response pair is refused. The one place a refusal produced a
WRONG route - repeat intent falling through to the learned band - is
fixed (P-6) in the honest direction: the user's own observed numbers.

### Q8 (SAFETY CANNOT BE LEARNED AROUND): did any memory ever route past a floor, gate or suppression?

**Answer: no, pinned at every layer.** Calorie floors hold across all
25 simulated weeks (athlete180:214-220); the ED-flag/calm suppression
is a one-way ratchet in pref sync; guardrails are tier-blind;
evidence-free rows can no longer nudge safety-adjacent counters
(P-3/P-4, the FB-36 rule applied everywhere it was missing). D91-24's
conservative bias is characterised and deliberately unfixed this
campaign.

### Q9 (CONTINUITY): does it still feel like the same relationship end-to-end - and the honest loyalty verdict?

**Answer: within one device, yes - the arc reads as one continuous
record: research start, earned changes, a kept repeat promise, a
respected override, a safe calm period, and a return that remembers.
Across devices and reinstalls, continuity is real but has named
gaps, and the loyalty verdict is honest rather than triumphant:**

- Cross-device adaptive provenance depends on migration 132
  (unapplied; MIGRATION-RELEASE-GATES.md holds the release order
  134-135-132-133) - until then a clean device restores planned rows
  without full provenance.
- The stored-ledger age asymmetry (D97-3) and the
  activation-paths-discard-learned-band question (D97-9) are open
  founder decisions that shape how a long-absent returner re-enters.
- Retention is architecture, not mechanics: no streak anxiety, no
  loss threats, no fake percentages exist to remove (verified by the
  repo walker). What earns the ninth month is the same thing that
  earned the sixth block: the prescription is more specific because
  the user trained, the app can say why, and the user can always say
  no. On the shipping evidence, that claim is TRUE where evidence
  accumulated and HONESTLY ABSENT where it did not - which is the
  addendum's definition of the dividend existing.

---

## 3. What this report deliberately does not do

No freshness/decay design (D91-25 stays unimplemented); no new
surfaces proposed (WHAT-VOLYUME-HAS-LEARNED feasibility is its own
investigate-only lane); no re-litigation of ruled items (citations
throughout are to D97 rulings). The nine-question framework itself is
lead-derived (header note) and awaits founder confirmation in the
handover.
