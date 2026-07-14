# VOLYUME Pulse — Guided step audit walk (2026-07-14)

Founder reported daily steps reading low (~6k when more was expected) and asked
for the guided auditor discussed earlier: press start, walk a known number of
steps, press stop, enter the real count.

## Why steps under-count today (diagnosis)

`estimateBandStepsFromCounters` only credits counter ticks whose interval is
"movement-linked" — the WHOOP's own activity class is walking/active (class 1 or
2) at one endpoint. Ticks with no active class are held back as
`inactiveRawTicks` and excluded from the published step count. Real walking that
the strap classifies as inactive is therefore dropped. Counter resets, >15-minute
gaps, and low confidence can also gate the estimate. A controlled walk over a
known step count is the only way to see, in one clean window, how many ticks the
strap produced, how many the movement filter accepted, and how many it rejected —
and to set the calibration divisor precisely.

## Change STEP-AUDIT-A — Read-only walk audit (`src/state/appStore.ts`)

**Spec (normative):**

- A guided step audit takes a start time, a stop time and the real step count,
  reads the band counter samples for exactly that window, and reports the total
  counter ticks, the movement-accepted ticks, the ticks rejected as inactive, and
  the divisor that would make the accepted ticks equal the real step count.
- The audit is read-only: it computes the breakdown from stored counter samples
  and never fabricates steps or changes a stored metric on its own.

## Change STEP-AUDIT-B — Walk audit controls (`src/screens/AdvancedDeviceScreen.tsx`)

**Spec (normative):**

- The audit surface lets the wearer mark the start and stop of a known walk,
  enter the real number of steps taken, see the counter breakdown for that walk,
  and choose to apply the suggested calibration divisor.
- When no band counters are synced for the walk window yet, the surface says so
  and invites the wearer to pull history and re-check rather than showing a
  misleading zero.

## Verification

`npm run typecheck`; the full Pulse suite; a new test asserting the audit
breakdown reports accepted vs rejected ticks and a suggested divisor that maps
accepted ticks onto the real step count. British English; commits carry no
attribution.
