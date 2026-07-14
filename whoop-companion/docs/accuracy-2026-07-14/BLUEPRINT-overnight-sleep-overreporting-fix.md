# VOLYUME Pulse — Overnight sleep over-reporting fix (2026-07-14)

Founder reported two linked problems with overnight sleep:

1. "Sleep was reporting excessively long" — the reported hours asleep are
   inflated on some nights.
2. The same erratic-heart-rate signal that exposed the false desk nap (jagged
   per-minute HR is quiet wakefulness, not sleep) should also lower trust in an
   overnight window that looks like sleep but is physiologically implausible.

## Empirical finding (validated 2026-07-14, before writing production code)

A staging change that reclassified jagged in-bed "light" minutes as awake was
prototyped and measured against synthetic smooth-sleep, jagged-quiet-wakefulness
and mixed windows. It changed **nothing**: the existing sleep/wake staging
already marks jagged/elevated minutes as awake via its window-relative wake
ceiling (a jagged low lands as deep, a jagged high as awake), so a jaggedness
pass had no minutes left to move. It was therefore **not shipped** — an
unvalidated staging change that touches every night for no measured benefit.

The measurement also isolated the true over-reporting mechanism: a **smooth,
still, low-heart-rate** period of quiet wakefulness (lying in bed relaxed,
resting, or dozing) is indistinguishable from sleep on heart rate and motion
alone, and reads as ~100% sleep. Jaggedness cannot catch smooth wakefulness.
Fixing this correctly requires either richer motion micro-movement evidence than
the strap currently decodes, or tightening the sleep-window onset/offset — both
change every night and must be tuned against a **real captured over-reported
night**, not a synthetic guess. That capture is an outstanding founder action.

## Change SLEEP-OVER-B — A jagged overnight window lowers sleep confidence (`src/state/appStore.ts`)

This is the shippable, bounded, safe half. It never changes the reported hours
and never deletes a night; it only lowers the trust in a window whose whole-night
heart rate is implausibly erratic, which caps the reported performance and
quality. The median is robust, so a good night with one rough patch is not
penalised — only a mostly-jagged capture is downgraded.

**Spec (normative):**

- When the detected overnight window's per-minute heart rate is too erratic across
  the whole night, the sleep confidence is lowered and never raised, which caps
  the reported sleep performance and quality without deleting the night.
- The confidence downgrade applies to automatically detected sleep only; a window
  the wearer logged by hand is left at its evidence-based confidence.

## Verification

`npm run typecheck`; the full Pulse suite; a new test asserting a jagged overnight
window is downgraded (never upgraded) while a smooth window keeps its confidence,
and that a hand-logged (manual) window is never downgraded. British English;
commits carry no attribution.
