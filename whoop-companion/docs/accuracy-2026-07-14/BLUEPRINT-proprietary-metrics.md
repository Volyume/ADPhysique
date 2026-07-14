# VOLYUME Pulse — Proprietary metric system (2026-07-14)

Founder direction: stop copying WHOOP; where WHOOP's algorithm is proprietary,
build our OWN deterministic, offline, science-based metric — informed by the
physiology and by WHOOP / Oura / Garmin — and aim to be better. Keep all prior
work. Each `src/` edit quotes the normative lines here via `.claude/edit-gate`.
Designs are research-cited (Altini, Oura, Garmin, WHOOP, sleep-stage literature).

## Change SN — Proprietary Sleep Need (`src/metrics/sleep.ts` `computeSleepNeed`)

Replaces screenshot-tuned coefficients (step at strain 10, +6 min/pt capped 66;
100% debt fold capped 120) with science-based terms. Structure unchanged
(baseline − nap + strain + debt), wellbeing floor preserved.

**Spec (normative):**

- The strain term ramps smoothly from a knee at strain 8 to a maximum of 60
  minutes at strain 21 (add = 60 * t^1.15 where t is the fraction of strain
  above the knee), inside WHOOP's published 30-60 minute hard-day range, and is
  zero when strain is unknown or at or below the knee.
- The debt term repays half of accrued sleep debt on a night, capped at 90
  minutes, so recovery from debt is partial and multi-night rather than folded
  100% in one night.
- Nap credit is clamped to at most 120 minutes so a long nap cannot zero the
  night's need.
- The needed minutes are clamped between the 300-minute wellbeing floor (never
  lowered) and the personal baseline plus 180 minutes of headroom.

## Change RV2 — Proprietary Recovery ("Pulse Recovery v2", `src/metrics/recovery.ts`)

Keeps HRV dominance but corrects the statistics and adds non-overlapping signals
WHOOP omits. Reversible via a named weight profile alongside the existing ones.

**Spec (normative):**

- HRV uses a natural-log RMSSD z-score against a log-domain baseline (RMSSD is
  log-normal), when the log baseline is supplied, falling back to the linear
  z-score otherwise.
- Resting heart rate is scored asymmetrically: a lower-than-baseline reading is
  rewarded but the reward saturates, and a reading abnormal by more than two
  standard deviations in either direction is penalised.
- An HRV-trend term (short vs long baseline balance) is included when available
  and dropped otherwise, so a single good night on a declining trend does not
  read as full recovery.
- Bounded load and stability modifiers may only trim the score, never inflate
  it, and equal one (no effect) when their inputs are absent.
- The default profile weights HRV family highest, then RHR, sleep, respiration
  and skin temperature, and renormalises over available terms.

## Change SS — Proprietary Sleep Score (`src/metrics/sleepScore.ts`)

A richer 0-100 score alongside (not replacing) the WHOOP hours/need headline.

**Spec (normative):**

- The sleep score blends duration-vs-need, efficiency, restfulness, REM
  adequacy, deep adequacy, latency and timing, with duration weighted highest.
- REM and deep adequacy use a two-sided curve that penalises both too-little and
  too-much relative to healthy adult ranges (deep 15-20%, REM 20-25% of sleep).
- Latency is two-sided: both a long latency and a suspiciously short latency
  (under five minutes, a sign of overtiredness) score below the ideal band.
- REM and deep contributors are down-weighted by a staging-confidence factor and
  the freed weight moves to the high-confidence contributors, so stage values
  from a low-confidence night cannot move the score.
- The existing hours/need Sleep Performance headline is unchanged.

## Change ST — Proprietary Strain/Load ("Pulse Strain", `src/metrics/strain.ts`)

Replaces Edwards linear zone load + a saturating-exponential map (which can never
reach 21) with an exponentially-weighted Banister load and a genuinely
logarithmic 0-21 curve where 21 is attainable.

**Spec (normative):**

- Per-minute cardiovascular load uses exponentially-weighted Banister TRIMP on
  heart-rate reserve with sex-specific constants (male 0.64/1.92, female
  0.86/1.67), and is zero below a 20% heart-rate-reserve basal gate so strain
  reflects demand above rest, not sitting or sleeping.
- The daily load is the sum of the per-minute loads, and the load-to-strain map
  is applied once to the accumulated load, never by summing per-minute strain.
- Strain maps load to 0-21 with a logarithmic curve reaching exactly 21 at the
  maximal daily load and clamped to 21 above it, so a maximal day attains 21
  rather than approaching it asymptotically, and each successive strain point
  costs more load than the last.
- The Banister female constant is corrected to 0.86 (it was the male 0.64),
  so women's load is no longer computed with the male scalar.

## Change UI — Surface the new metrics where WHOOP surfaces them

So the app is familiar and easy to pick up, the proprietary values are shown in
their WHOOP-equivalent places using the existing components.

**Spec (normative):**

- The recovery contributors list shows an HRV-trend row (multi-day HRV balance)
  when it is available, alongside HRV, resting heart rate, respiration and
  skin temperature.
- The Sleep screen shows the proprietary Sleep Score (0-100) with its
  contributors, in addition to the WHOOP hours/need Sleep Performance ring.

## Verification

Each change ships with invariant tests written to fail (determinism, bounds,
monotonicity, two-sided penalties, confidence gating, modifiers-never-inflate),
`npm run typecheck`, the full Pulse suite, and a fresh-eyes review. British
English; commits carry no attribution.
