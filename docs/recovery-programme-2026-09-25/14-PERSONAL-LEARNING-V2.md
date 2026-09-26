# Personal recovery learning, rebuild (register D210, v2) -- SPEC

Founder, 2026-09-26: "We had recovery intelligence that learns people's
recovery and adjusts as it goes along based on performance from a start. Is
that what you've used for the recovery section or have you used rudimentary
numbers?" The answer was no: the Recovery estimate (D201, `00-SPEC.md`
sections 2 and 3) reads research baselines and never learns; the app's
learners (`algorithms.computeAdaptiveLandmarks`, `learnedRange.js`) move set
counts only. The first build of a recovery learner (`04c92d66`) was withdrawn
after its adversarial review (D210 addendum). This spec is the rebuild. It
replaces `00-SPEC.md` section 14 when it lands.

## 1. What the first build got wrong, and the rule each failure sets

| Failure (review, file:line in `04c92d66`) | Rule for v2 |
|---|---|
| A binary dip with a missed-set clause turned ordinary rep variation into dips; normal lifters read "more slowly" in up to half of simulated runs | A CONTINUOUS outcome (log ratio of an effort-matched performance index); no thresholds, no missed-set counts |
| Scoring held/dip against bands could be satisfied by a model that predicts drops that never come (nothing tied the size of a predicted drop to the data) | Performance is modelled as `a + s * (change in predicted recovery)`, with the sensitivity `s` bounded below by the literature, so a predicted drop that does not appear costs fit |
| "One session moves one step at most" and "steady schedules cannot move anyone" were false | No such guarantees are claimed; instead a significance gate, CALIBRATED BY SIMULATION, bounds how often a person whose true recovery equals the start is shown any direction |
| Assisted and timed exercises read as strength | Excluded: `load_semantics === 'assisted'`, `exercise_type` in {distance, duration}; reps-only rows carry weight 0 and fall out |
| Copy claimed checks that could not have changed anything | Every "not adjusted" state carries its reason, and the count shown is only of comparisons that carry information |
| 90 to 390 ms on every focus | Computed once per day and history (memo in `load.js`), readings computed as fractions only, contributors from a 14-day window |
| Injury-limit success path untested; return period ignored; unresolved plan week read as "no plan" | The CC30 rule in full (episode AND the 14-day return carry, `capability/eligibility.js`); a session whose plan week did not resolve is not comparable; both pinned by tests |

## 2. The evidence: comparable pairs

For each muscle m, for each completed session B in the last
`PERSONAL_WINDOW_DAYS` (84) and each exercise X whose PRIMARY muscle is m:

- X is load-based strength: not `load_semantics === 'assisted'`, not
  `exercise_type` distance or duration; its rows are trend-eligible
  (`algorithms.isTrendEligibleRow`: no warm-up, myo-rep, rest-pause,
  ballistic or circuit rows), not deleted, weight > 0 and reps > 0.
- Its baseline P is the most recent earlier session with X inside
  `PERSONAL_BASELINE_MAX_GAP_DAYS` (28) that is comparable with B:
  - the same effort target: both sessions' week RIR targets are known and
    equal, or both sessions are outside any plan (no week id). A session
    whose plan week did not resolve (a week id with no week row) is never
    comparable: its effort is unknown;
  - neither session is in a recovery (deload) week;
  - neither session falls under a capability episode for m, or inside the
    14-day return carry after one (`REINTRODUCTION_CARRY_MS`);
  - the walk back skips an incomparable session for an earlier comparable
    one.
- B has a session on m ending inside `LOOKBACK_DAYS` before it (otherwise
  there is nothing to recover from and the pair carries no information).

One pair per (B, X). If B trains m with several exercises, each gives its own
pair (they share B's recovery reading; that is fine for least squares, and
the gate's sample size counts pairs).

## 3. The outcome: an effort-matched performance index

For the pair (B, P) on exercise X: take the first `k = min(3, nB, nP)`
eligible working sets of X in each session, in set order (`set_number`, then
`created_at`). The performance index is the mean of `calculate1RM(weight,
reps)` over those k sets (the canonical estimator). The outcome is

    y = ln(PI_B / PI_P)

Matched set counts compare like with like (a session with an extra back-off
set is not "weaker"); the mean over the first sets reflects the ability to
repeat effort, the quality Ferreira 2017 found recovers last, not the single
best set.

## 4. The predictor and the model

For a candidate factor f (in place of the recovery answer's factor in
`recoveryHours`), the model's own curve (section 3.2 of `00-SPEC.md`) gives
the recovered FRACTION r in [0, 1] (unrounded, `1 - residual / peak`; 1 when
no session on m ended inside the lookback) at the start of B and of P:

    x(f) = r_B(f) - r_P(f)

Performance is modelled as `y = a + s * x(f) + noise`, where `a` is the drift
between the two sessions (progression; fitted) and `s` is how much
performance a muscle loses from full fatigue to full recovery, bounded to
`[S_MIN, S_MAX]` = [0.04, 0.15] (a 4% to 15% decrement right after a hard
session: Goulart 2021, Moran-Navarro 2017, Ferreira 2017; named as a bounded
assumption in the module header). The lower bound is what makes the
question answerable: a candidate that predicts a drop the data does not show
must pay for it.

For each f on `PERSONAL_FACTOR_GRID` (0.75 to 1.40 in 0.05 steps, plus the
start): fit `a` and `s` by least squares with `s` clamped to the bounds (the
clamped fit re-solves `a` for the clamped `s`), giving `SSE(f)`.

## 5. The decision

- `f*` = the candidate with the smallest `SSE`; ties go to the candidate
  nearest the start, then to the longer.
- The factor moves to `f*` only when ALL of these hold; otherwise it stays at
  the start and the reason is recorded:
  - `pairs >= PERSONAL_MIN_PAIRS` (8), else reason `too_few`;
  - the spread of `x(start)` across pairs is at least `PERSONAL_MIN_SPREAD`
    (standard deviation 0.10: the sessions sit at different predicted
    recovery), else reason `no_spread` (a steady schedule, by construction);
  - the improvement is clear: `pairs * ln(SSE(start) / SSE(f*))` is at least
    `PERSONAL_LR_MIN`, else reason `not_clear`. `PERSONAL_LR_MIN` is set by
    the simulation in section 7, not by hand.
- Output per muscle: `{ factor, prior, pairs, reason }` with `reason` one of
  `adjusted`, `too_few`, `no_spread`, `not_clear`.

## 6. On screen

Each muscle's breakdown (MuscleRecoveryList) adds "Adjusted to you":

- adjusted, shorter: "Recovers faster than first estimated, from N of your sessions"
- adjusted, longer: "Recovers more slowly than first estimated, from N of your sessions"
- `not_clear`: "No change: your sessions do not show a clear difference yet"
- `no_spread`: "Not yet: it learns when the time between your sessions of the same lift varies"
- `too_few`: "Not yet: it needs more sessions of the same lift to compare"

N is the number of pairs. The card caption names the input only as far as it
is true for everyone: "... adjusted by your recovery answer and your ratings,
and by how your lifts went when there is enough to compare. Not a
measurement." Plain English (D207), describes and never instructs (D204), no
em dash.

## 7. Calibration by simulation (a deterministic test)

`src/lib/recovery/__tests__/personalRecovery.simulation.test.js`, with a
seeded generator in the test file (the engine stays deterministic; only the
test draws numbers):

- Schedules, 12 weeks each: Mon/Wed/Fri full body; Mon/Thu; upper/lower
  4-day (Mon, Tue, Thu, Fri); PPL 6-day; a variable schedule (gaps of 1 to 4
  days); each with and without a plan (RIR ladder 3, 2, 1, 0, 0, 4 over six
  weeks with no exercise repeated in a week, as `planEngine` generates).
- Each simulated athlete: a true factor, a true sensitivity drawn from
  [0.06, 0.12], a baseline per exercise, a small weekly progression, and
  day-to-day noise on each set's estimated max (standard deviation 3%).
  Performance per set = baseline x progression x (1 - s x (1 - r_true)) x
  noise, with r_true from the model's own curve at the true factor.
- Acceptance, 60 athletes per cell:
  - true factor equal to the start: a direction shown for at most 3 of 60
    per muscle on every schedule (the false-direction rate this spec
    promises);
  - true factor 0.75 or 1.40: a direction in the WRONG sense for at most 1
    of 60; the right-direction rate is reported in the test name, not
    floored (on fixed schedules it is expected to be low, and the screen
    says why).
- `PERSONAL_LR_MIN` is the smallest value that meets the first criterion on
  every schedule, rounded up; the test pins it.

## 8. Cost

`load.js` keeps a module-level memo of the learner's output keyed by user,
local day, recovery answer, the number of sessions read and the newest
session's id; a change to any of them recomputes. Readings inside the fit use
a fraction-only function (no ready-by walk) and take contributors from the
14-day window before the instant (sessions sorted by end time, a moving
start index). Budget: under 40 ms for 84 days at 7 sessions a week in node,
pinned loosely in a test (an operation count, not a clock).

## 9. Unchanged

Plan sequencing (`sequenceSessions.js`) stays on the population prior. The
ratings keep their D201 role (lengthen only). Every figure stays labelled an
estimate. Home, Progress and Recovery read the same map through the same
loader.
