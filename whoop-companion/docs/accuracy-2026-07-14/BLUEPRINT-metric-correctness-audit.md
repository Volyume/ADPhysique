# VOLYUME Pulse — WHOOP metric-correctness audit + fixes (2026-07-14)

Source-of-truth spec for the metric-calculation audit the founder asked for
("if we display everything on WHOOP, we need to calculate everything on WHOOP").
Four parallel audits compared every displayed stat to WHOOP's published method.
Code edits under `src/` quote the normative lines here via `.claude/edit-gate`.

## Scorecard

CORRECT (verified against WHOOP / accepted physiology, no change):
- HRV (RMSSD) — Task Force 1996, adjacent-clean-beat differencing, deep-rest window.
- Respiratory rate — RSA/HF-band DFT, correct band, overnight in-window value.
- Sleep efficiency formula (asleep/TIB), stage %-of-TIB, wake events, sleep debt
  (no double-count), calories (Keytel HR regression), max/avg HR, VO2max
  (Uth 2004, gated on measured HRmax+RHR), recovery z->logistic weighting.
- Steps cumulative-counter -> daily delta math (window-based, rollover-safe).
- SpO2 — correctly withheld as unavailable (never fabricated).

FIXED IN THIS CHANGE (clear WHOOP mismatches):
- Change 1 — HR-zone boundaries.
- Change 2 — Sleep Performance headline.

DOCUMENTED, NOT CHANGED (needs founder on-device validation or is a
tuning/architectural change unsafe to make without a device render):
- Skin temperature: offset @73 IS corroborated by the whoop-vault RE project
  (payload 62, 0.01 C high-precision), so it is not a blind guess; but the
  decoded value has not been ground-truthed against the WHOOP app on THIS
  device, and it feeds the illness monitor. Action for founder: capture strap
  frames and compare byte-73 to the WHOOP app's skin temperature before relying
  on it clinically; soften any "validated" wording that overstates it.
- Daytime stress (stress.ts): WHOOP normalises against the user's 14-day HRV
  baseline + motion correction; the app uses population-absolute Baevsky SI
  anchors, systematically mis-scoring high/low-HRV users. Recommended fix:
  normalise SI against a personal rolling baseline and add a motion gate
  (mirroring sleepStress.ts). Deferred: it recalibrates a live 0-3 scale and
  needs device validation.
- Sleep efficiency/latency are biased high on AUTO-detected nights because the
  window trims to onset->final-wake (TIB ~= asleep). Recommended: extend TIB
  with flanking quiet in-bed minutes, or down-confidence on auto captures.
- Strain 0-21 curve is a saturating exponential (never reaches 21); WHOOP's is
  logarithmic and 21 is attainable. A log map already exists unused
  (trimpToStrain). Deferred: recalibrating changes every strain value.
- Recovery resp/temp sub-scores are penalty-only (<=50) and can drag good days
  down. Deferred: recovery weighting was just reworked; re-tuning needs a device.
- Cardio age emits a single-integer "heart age" (false precision); band it.
- Extra scores (resilience, readiness, illness, HRV balance, energy reserve,
  AFib) are honestly labelled Oura/Garmin-style extensions, none presented as
  native WHOOP outputs; no calculation is outright wrong.

## Change 1 — HR zones use WHOOP's five-zone heart-rate-reserve model (`src/metrics/strain.ts`)

**Rationale.** WHOOP zones are on heart-rate reserve (Karvonen), and Zone 1 is
40-60% HRR. The app computed HRR correctly but started Zone 1 at 50%, so 40-50%
HRR was misclassified as rest and excluded from zone time and strain load.

**Spec (normative):**

- The lowest training zone (Zone 1) begins at 40% heart-rate reserve, matching
  WHOOP's five-zone model; only below 40% HRR counts as rest.
- Heart rate between 40% and 50% HRR counts toward Zone 1 and contributes to the
  Edwards strain load, not to the weight-zero rest bucket.
- Zone comments describe heart-rate reserve, not percent of maximum heart rate.

## Change 2 — Sleep Performance is total sleep divided by sleep need (`src/screens/SleepScreen.tsx`)

**Rationale.** WHOOP defines Sleep Performance as the ratio of total sleep time
to sleep need. The headline ring showed a four-factor blend that the code's own
header admits cannot reproduce WHOOP's ground-truth sample. The WHOOP ratio is
already computed.

**Spec (normative):**

- The Sleep Performance ring shows total sleep divided by sleep need as a
  percentage, clamped to 100, matching WHOOP's definition.
- The four-factor blend is retained as separate sleep-quality contributors, not
  as the headline Sleep Performance number.

## Verification

- `npm run typecheck`; `node scripts/test-physiology.cjs` with new HR-zone
  assertions (a 45% HRR sample lands in Zone 1 and adds strain load); full Pulse
  suite; fresh-eyes review. British English; commits carry no attribution.
