# VOLYUME Pulse — Auto-calibrate resting HR (2026-07-15)

Founder is on a beta-2 agonist (clenbuterol), which raises resting heart rate and
suppresses HRV, and asked for the system to **calibrate automatically** rather
than assume a static resting HR/HRV: "we can't assume rhr level, who would always
calibrate and not have a static rhr or hrv".

## Diagnosis

Recovery already uses the *measured* overnight resting HR, and the recovery/illness
HRV and RHR baselines are already rolling (auto-calibrating). But **Strain and the
HR zones** compute heart-rate reserve (Karvonen) from `profile.restingHr` — a value
entered by hand in Settings. If that static value is stale (or lower than the
wearer's current, drug-elevated resting), every heart rate reads as higher effort
and Strain/zones over-read. Nothing should depend on a hand-entered resting HR once
measured overnight data exists.

## Change RHR-CAL-A — Resting HR is auto-calibrated from measured overnight data (`src/state/appStore.ts`)

**Spec (normative):**

- The resting heart rate used for Strain and heart-rate zones is calibrated
  automatically from the rolling median of recent measured overnight resting heart
  rates, never assumed from a static hand-entered value once enough nights exist.
- Until enough measured nights exist the previously stored resting heart rate is
  kept as the fallback, and the calibrated value is clamped to a physiological
  range so a single bad night cannot distort it.

## Verification

`npm run typecheck`; the full Pulse suite; a new test asserting the calibration
returns the clamped rolling median of recent resting heart rates and falls back to
null (keep existing value) when too few nights exist. British English; commits carry
no attribution.
