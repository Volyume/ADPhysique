# VOLYUME Pulse — Nap false-positive fix (2026-07-14)

Founder reported a false auto-nap: sitting at a desk working was detected as a
100% efficiency nap. Root cause: a continuously sedentary low-HR period passes
the nap gates because (a) short naps (<=90 min) are accepted without any
boundary/transition evidence, and (b) the HR gate only compares to the day
median, which quiet sitting naturally sits below. A real nap shows a HR drop
below the surrounding awake level and a wake->sleep->wake transition; desk work
shows neither. `src/` edits quote the normative lines here via `.claude/edit-gate`.

## Change NAP-A — Every auto-nap needs boundary evidence (`src/metrics/naps.ts`)

**Spec (normative):**

- Every auto-detected nap must show a wake-to-sleep-to-wake boundary transition;
  a continuously sedentary period with no such boundaries is never accepted as
  sleep, however flat and efficient the window looks.

## Change NAP-B — Nap HR must drop below the local surrounding level (`src/state/appStore.ts`)

**Spec (normative):**

- An auto-nap is rejected unless its average heart rate is clearly below the
  heart rate of the awake periods immediately before and after it, so that
  sitting quietly (no real drop) is not mistaken for sleep.

## Change NAP-C — Reject jagged (non-sleep) heart-rate windows (`src/state/appStore.ts`)

The founder's HR trace for the false nap swung erratically between the 50s and
90s — real sleep heart rate is smooth and gradual, sedentary-but-active periods
are jagged. This is an absolute check, independent of the surrounding context.

**Spec (normative):**

- An auto-nap is rejected when its per-minute heart rate is too erratic (a large
  median minute-to-minute change of the smoothed series), because real sleep
  heart rate is smooth and gradual.

## Verification

`npm run typecheck`; the full Pulse suite; a new nap test asserting a short nap
with no boundary evidence is rejected. British English; commits carry no
attribution.
