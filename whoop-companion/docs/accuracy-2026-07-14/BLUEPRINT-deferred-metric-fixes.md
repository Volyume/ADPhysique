# VOLYUME Pulse — deferred WHOOP-correctness fixes (2026-07-14)

Founder directed (2026-07-14) to implement the deferred audit items NOW,
accepting that some are recalibrations best sanity-checked later on a device.
Source-of-truth spec; `src/` edits quote these lines via `.claude/edit-gate`.

## Change A — Recovery respiratory/skin-temp terms are neutral at baseline (`src/metrics/recovery.ts`)

**Rationale.** respSub/tempSub used `zToScore(-|z|)` in (0, 50], so a perfectly
stable respiratory rate scored 50 and dragged otherwise-good recovery days down.
A stable supporting signal should be neutral, not a drag.

**Spec (normative):**

- A respiratory or skin-temperature reading at baseline scores neutral-good
  (above 50), and only a deviation of more than about one standard deviation
  pulls the sub-score below neutral.
- Larger deviations still lower the sub-score monotonically, so an abnormal
  respiratory rate or skin temperature still reduces recovery.

## Change B — Daytime stress normalises against the person, not population anchors (`src/metrics/stress.ts`, `src/state/appStore.ts`)

**Rationale.** WHOOP's Stress Monitor compares live HR+HRV to the user's own
baseline; the app used population-absolute Baevsky anchors, systematically
mis-scoring high- and low-HRV individuals.

**Spec (normative):**

- The daytime stress series scores each window from HR and HRV z-scores against
  the day's own distribution (higher HR and lower HRV read as more stress),
  rather than mapping an absolute Stress Index onto fixed anchors.
- The scale stays 0-3 and continuous, centred near the middle for a typical
  window, so an individual's stress is judged relative to their own physiology.
- A window without enough beats to score returns no value rather than a guess.

## Change C — Skin temperature is described as decoded, not clinically validated (`src/screens/HealthScreen.tsx`, `src/screens/MetricDetailScreen.tsx`, `src/metrics/healthMonitor.ts`)

**Rationale.** The byte-73 offset is corroborated by the whoop-vault project, but
the decoded value has not been ground-truthed on-device, so calling it
"validated" overstates it — especially as it feeds the illness monitor.

**Spec (normative):**

- User-facing text describes skin temperature as decoded from the WHOOP 5 v18
  history register, not as a validated or clinical measurement.

## Not changed (with reason)

- Strain 0-21 curve: the active saturating-exponential map is concave (each
  strain point costs progressively more load, matching WHOOP's perceptual
  scale); switching to a pure logarithm inflates moderate-day strain unless
  recalibrated against device data, so the honest step is to correct the header
  wording, not the numbers. The comment is fixed to describe the actual map.
- Auto-night sleep efficiency/latency bias: genuinely data-limited — on
  auto-detected nights there is no true in-bed (bed-time/wake-time) signal, so
  time in bed cannot be extended without inventing it. Correct only on manual
  nights; documented, not code-changed.
- Cardio age: an Oura-style extension, not a WHOOP metric; out of WHOOP-parity
  scope. Left as a labelled estimate.

## Verification

- `npm run typecheck`; new assertions: baseline-stable resp scores > 50 and a
  large deviation scores < 30 (Change A); daytime stress is invariant to an
  individual's absolute HRV level and only tracks within-day change (Change B);
  full Pulse suite; fresh-eyes review. British English; commits carry no attribution.
