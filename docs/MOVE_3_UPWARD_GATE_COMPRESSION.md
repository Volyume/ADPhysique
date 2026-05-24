# Move #3: Upward-only compressed calorie gate (locked)

A small but important engine math change. When the rapid weight loss
safety flag fires, compress the upward calorie adjustment cycle from
two weeks to one and bypass the `consecutiveOffTargetWeeks` cooldown.
Downward cuts retain full gates. Locked 2026-05-23.

## Why this is its own move

It's a 30-line engine change with measurable safety impact. Doesn't
belong inside move #1 (which is foundation work) or move #2 (which
introduces a new state machine). Cleaner to ship and verify on its
own.

## Scope

### Engine code

```
src/lib/nutritionEngine.js                EXTENDED
  computeAdaptiveTDEEAdjustment now accepts a third argument:
  rapidLossOverride: boolean

  When true:
    - Bypass the 2-week cooldown.
    - Bypass the consecutiveOffTargetWeeks check.
    - Apply an upward correction (positive adjustment) immediately.
    - Magnitude scales with the severity of the loss (the existing
      adaptive math).
  When false (default):
    - Existing behaviour. No change.

src/lib/weeklyCoach.js                    EXTENDED
  Sets rapidLossOverride = true when:
    - latest weekly weight change <= -1.5% AND
    - energy_score <= 2
  Otherwise rapidLossOverride = false.
```

### Held decision

When the override fires, the weekly coach output includes a new
held-decision type: `'rapid_loss_corrected'`.

WHY_LIBRARY copy:

```
Title: We've added calories straight away

Body:  Your weight dropped more than 1.5% this week and your
       energy is low. We're not waiting two weeks to react; we've
       bumped your daily target up immediately.

       This isn't a punishment for hitting your goal too fast.
       It's a safety call. Steady is the goal.
```

### Telemetry

```
rapid_loss_compression_triggered
  properties: { weekly_loss_pct, energy_score, days_compressed: 7 }
```

Daily aggregation in `engine_telemetry_daily.rapid_loss_compression_count`.

## Tests required

### Property

```
tests/engine/upwardGateCompression.property.test.js
  - downward adjustments still respect 2-week cooldown
  - downward adjustments still respect consecutiveOffTargetWeeks
  - upward adjustment with rapidLossOverride bypasses both gates
  - upward adjustment without override respects both gates
  - magnitude never exceeds the +300 kcal/wk cap
```

### Simulator

```
tests/simulator/scenarios/rapid_loss_correction.test.js
  - week 1 deficit too steep, weight drops 1.8%
  - week 2 engine fires upward correction immediately (not week 4)
  - subsequent weeks return to normal cadence
```

### Unit

```
tests/lib/nutritionEngine.computeAdaptiveTDEEAdjustment.test.js
  - covers the new rapidLossOverride parameter explicitly
```

## Acceptance check

- `rapid_loss_correction` simulator: upward correction at week 2,
  not week 4.
- Symmetric downward case (rapid weight GAIN, +1.5% wk1): standard
  2-week cooldown applies, no compression.
- `rapid_loss_compression_triggered` event fires once per
  qualifying scenario.
- Telemetry dashboard panel shows the compression count.
- Engine output snapshot tests show the `rapid_loss_corrected`
  held-decision card on the qualifying scenarios only.

## Effort estimate

2-3 days. Tiny engine change; the tests and simulator updates are
where the time goes.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Compression fires too aggressively | Tied to BOTH weight loss AND low energy, not weight alone. Twin requirement is conservative. |
| User feels yanked around by week-to-week changes | Held decision copy explains exactly why; not silent. |
| Symmetric bug: someone gaining fast at low energy gets a downward compression they didn't ask for | Override is upward-only by design. Math change is explicit. Tested. |
