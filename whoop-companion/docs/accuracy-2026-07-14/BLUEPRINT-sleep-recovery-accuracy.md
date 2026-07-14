# VOLYUME Pulse — Sleep & Recovery Accuracy Blueprint (2026-07-14)

Source-of-truth spec for the accuracy work on branch
`claude/whoop-accuracy-sync-yep84l`. Code edits under `src/` quote the
normative lines in this file via `.claude/edit-gate`. Build to exactly what is
written here; do not paraphrase or guess.

Scope was chosen by the founder (2026-07-14) after the audit below: build all
three algorithm changes (recovery weighting, HRV-from-deep-rest, RR-variability
staging). The BLE decode and the connectivity/sync layer were audited and left
unchanged — see "Findings" for why.

---

## Sources (external research, 2026-07-14)

- WHOOP Recovery methodology — HRV is the dominant input, with resting heart
  rate and respiratory rate adding non-overlapping information; sleep and skin
  temperature are surfaced elsewhere, not folded into Recovery. Sourced split is
  approximately HRV 60–65%, RHR ~20%, respiratory ~15%.
  https://www.whoop.com/us/en/thelocker/how-does-whoop-recovery-work-101/ and
  https://www.whoop.com/us/en/thelocker/podcast-84-recovery-update/
- WHOOP HRV is measured during slow-wave (deep) sleep — a stable resting value,
  not an instantaneous awake reading.
  https://www.whoop.com/us/en/thelocker/how-well-whoop-measures-sleep/
- WHOOP sleep staging uses accelerometer + heart rate + HRV + respiratory rate
  on 30-second epochs; respiratory rate is fairly constant during slow-wave
  sleep and increased and more variable during REM.
  https://www.whoop.com/us/en/thelocker/how-well-whoop-measures-sleep/
- WHOOP 5.0 BLE decode reference (same firmware r52 "Maverick" as this device):
  https://github.com/Sophonbot0/whoop-vault ; secondary 5.0 companion:
  https://github.com/ryanbr/noop

---

## Findings (audit, 2026-07-14)

- **BLE decode is at the community frontier.** `decodeV18` byte offsets align
  exactly with whoop-vault's validated fields once the payload base is matched
  (timestamp, motion intensity, gravity vector, high-precision 0.01 °C skin
  temp). The fields Pulse marks "candidate/diagnostic" (sleep-state nibble @81,
  step counter @57) are exactly the ones whoop-vault also does not validate.
  Advancing the decode requires labelled on-device captures, which live on the
  Device screen. No decode change is made in this blueprint.
- **Connectivity/sync is hardened.** Exponential-backoff auto-reconnect
  (2s→60s), `LINK_VALID` keepalive with in-flight guard, stale-link recovery
  after three failures, command-channel rediscovery escalating retry→reconnect,
  full history re-drain on reconnect, and durable-complete gating with its own
  retry/replay backoff. No blind change is justified; no sync change is made.
- **Accuracy headroom is in the scoring algorithms** vs WHOOP's published
  methodology. The three changes below address that headroom.

---

## Change 1 — Recovery weighting becomes HRV-dominant (`src/metrics/recovery.ts`)

**Rationale.** Pulse currently blends HRV 0.40, RHR 0.25, sleep 0.15, resp 0.10,
temp 0.10. WHOOP's published Recovery is HRV-dominant and does not fold sleep
performance or skin temperature into the score. Skin temperature still feeds
illness detection separately, so its signal is not lost.

**Spec (normative):**

- Recovery uses a named weight profile, defaulting to the WHOOP-faithful blend.
- The WHOOP-faithful profile weights HRV 0.65, RHR 0.20, respiratory 0.15, and
  drops the sleep and skin-temperature terms from the Recovery score.
- The previous blend (HRV 0.40, RHR 0.25, sleep 0.15, resp 0.10, temp 0.10) is
  retained as a legacy profile so any night can be rescored and compared.
- A signal with zero weight or missing evidence is excluded from both the score
  and the contributor attribution; remaining weights renormalise to one.
- The weighting profile is a sourced approximation of a proprietary model, not
  WHOOP's exact coefficients, and is labelled as such in code.
- sleepSub and tempSub remain computed and returned as diagnostics even when
  their weight is zero, so existing UI readouts keep working.

## Change 2 — Overnight HRV from the deepest resting window (`src/metrics/overnightVitals.ts`)

**Rationale.** WHOOP measures HRV during slow-wave sleep. In Pulse the "deep"
stage label is itself defined as high-RMSSD epochs, so selecting RMSSD by that
label would select epochs because they have high RMSSD and inflate the result.
The deep-rest window is therefore selected by an independent signal.

**Spec (normative):**

- Overnight RMSSD is computed preferentially from the deepest resting window of
  the night, selected by independent heart-rate and motion stability, never by
  the RMSSD-derived deep-sleep stage label.
- The deep-rest window is the longest contiguous run of stable epochs whose
  heart rate sits in the lower part of the night's sleeping-HR distribution.
- If the deep-rest window yields no valid RMSSD estimate, RMSSD falls back to
  the existing all-stable-epoch computation, so a night never loses HRV it would
  previously have reported.
- RHR and respiratory selection are unchanged; no vital gates or selects another.

## Change 3 — Respiratory-rate variability informs REM vs deep staging (`src/metrics/sleep.ts`)

**Rationale.** Respiratory rate is fairly constant during slow-wave sleep and
increased and more variable during REM. Pulse stages from HR, motion and RMSSD
but ignores this WHOOP staging signal.

**Spec (normative):**

- When per-minute respiratory evidence is available, its short-term variability
  is used as supporting evidence for staging: low, steady respiration supports a
  deep-sleep label and elevated, variable respiration supports a REM label.
- Respiratory variability only refines the choice between deep and REM for
  epochs already classified as asleep; it never converts an awake epoch to sleep
  or a sleep epoch to awake.
- When respiratory evidence is absent for an epoch, staging behaviour is exactly
  as it is today, so nights without respiratory signal are unchanged.

---

## Verification

- `npm run typecheck`.
- `node scripts/test-physiology.cjs` (recovery), `node scripts/test-overnight-vitals.cjs`
  (vitals), `node scripts/test-sleep.cjs` (staging), plus new invariant assertions:
  HRV-dominant ordering, non-circular deep-rest HRV never exceeding a bounded
  delta from the all-epoch value on flat input, and staging refinement never
  changing sleep/wake totals.
- Fresh-eyes adversarial review against this blueprint before commit.
- British English; commit messages carry no attribution.
