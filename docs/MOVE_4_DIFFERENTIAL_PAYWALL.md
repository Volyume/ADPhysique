⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# Move #4: Differential paywall output (locked)

The conversion lever. When a free user reports adherence as "under"
or "over" in 2 of the last 3 check-ins, the relevant weekly coach
insight surfaces a "with food data, this card would have said X"
preview, tied to a Pro trial CTA. Locked 2026-05-23. (Trial figure
updated 2026-06-06: the CTA offers Google's 7-day intro trial, see
the copy block below.)

## Why this is move #4 not earlier

Depends on:
- Move #1's food data infrastructure being live (so the trial
  actually delivers value when the user starts it).
- Move #5's cascade infrastructure to receive the trial start.

Ship after both. The differential trigger and copy can wire up in
Phase A; the actual trial-start CTA only activates in Phase B once
the cascade is live.

## Scope

### Engine code

```
src/lib/weeklyCoach.js                    EXTENDED
  Output schema gains a new field:
    differential_output: {
      shown: boolean,
      trigger: 'stalled_lift' | 'extreme_soreness' | 'deload' |
               'missing_tdee' | 'block_summary' | 'energy_crash',
      with_food_data_message: string,        // the "would have said X"
      paywall_cta: 'try_pro_14d' | 'buy_pro' // depending on trial state
    }

  Trigger fires when:
    - user_tier = 'free' AND
    - has not yet completed the cascade (paywall_cta = 'try_pro_14d')
      OR cascade already completed (paywall_cta = 'buy_pro')
    - adherence is 'under' or 'over' in 2 of the last 3 weekly check-ins
    - matches one of the six trigger contexts
```

### UI

```
src/components/DifferentialBadge.js       NEW
  Inline card that appears below the relevant insight in InsightsScreen.

src/screens/InsightsScreen.js             EXTENDED
  Renders DifferentialBadge when output.differential_output.shown.

src/screens/PaywallScreen.js              NEW
  Modal opened on tap of DifferentialBadge CTA.
  Shows Pro feature comparison + trial start CTA.
  (Reuses the cascade gate UI primitives.)
```

### Locked conversion copy

Verbatim from `RESEARCH_FINDINGS_SYNTHESISED.md` Section 3 move #4.
Max 25 words each, no blocklist terms.

> **Trial figure updated 2026-06-06:** these CTAs route to the Play
> purchase surface, so the trial promised is Google's 7-day intro
> offer, not 14. The 14-day cardless trial runs before any purchase
> prompt. All "free for 7 days" / "7 days free" below now read 7.
> See `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` 2026-06-06 override.

```
Stalled lift:
  "Your bench has stalled for three weeks. With food data, we could
  tell you if it's training or fuel. Try Pro free for 7 days."

Extreme soreness:
  "Your soreness scores are stacking up. Food intake usually
  explains half of recovery. See yours with Pro, free for 7 days."

Deload:
  "We're holding a deload this week. With food data, we'd know if
  your fuel is the cause. Pro shows you, free for 7 days."

Missing TDEE:
  "Your weight is moving faster than your calories suggest. Pro
  tracks your true daily burn from your own data. 7 days free."

Block summary:
  "Your training block ended. With food data, we'd show how fuel
  shaped your results. Try Pro free for 7 days."

Energy crash:
  "Your energy scores have dropped two weeks running. Food data
  usually shows why. Pro can tell you. 7 days free."
```

If the user has already used their trial entitlement, the copy
swaps "Try Pro free for 7 days" with "Get Pro for £[current
price]/month" (current price reads from the active pricing window).

### Telemetry

```
paywall_shown
  properties: { surface, user_pricing_window, trigger }

paywall_tapped_cta
  properties: { surface, cta: 'pay_pro'|'pay_complete'|'dismiss' }
```

Daily aggregation:
- `differential_paywall_shown_count`
- `differential_paywall_tapped_count`
- `differential_paywall_conversion_rate` (tap / shown)

## Tests required

### Unit

```
tests/lib/weeklyCoach.differentialOutput.test.js
  - Trigger fires on 2 of 3 'under' adherence
  - Trigger fires on 2 of 3 'over' adherence
  - Trigger does NOT fire on 1 of 3 'under' (single off week)
  - Trigger does NOT fire on paid users
  - Trigger CTA changes based on trial entitlement
```

### Snapshot

```
tests/snapshots/differentialCopy.snap.js
  - All six locked copy variants render verbatim
```

### Simulator

```
tests/simulator/scenarios/stalled_lift.test.js
  - Free user with stalled bench + under-adherence twice in three
    weeks sees the DifferentialBadge in week 4 output.
```

### E2E (Maestro)

```
e2e/differential_paywall_dismiss.yaml
  - Free user opens Insights with differential trigger active,
    dismisses paywall, returns to insights normally.

e2e/differential_paywall_start_trial.yaml
  - Free user taps "Try Pro free for 7 days", cascade trial
    activates in Phase B test environment.
```

## Acceptance check

- All six trigger contexts produce the locked verbatim copy.
- Paid users never see DifferentialBadge.
- Free users who already used their trial see the alternative CTA
  ("Get Pro for £X/month") not the trial CTA.
- 2-of-3 threshold passes scenario tests; 1-of-3 fails.
- Telemetry rows record both shown and tapped events.
- Tap on a trial CTA initiates RevenueCat purchase flow correctly.
- Dismissing the paywall returns to Insights with the badge gone
  for the rest of the session (returns next week if condition
  persists).

## Effort estimate

1 week. The trigger logic is straightforward; the copy snapshot
discipline and the paywall screen reuse from cascade gates take
most of the time.

## Out of scope at this move

- A/B testing of conversion copy (no LaunchDarkly / paid A/B
  tools at v1 per budget posture).
- Personalised paywall pricing (no dynamic pricing at v1).
- Email-based paywall reminders (v1.1 when email lands).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Differential appears manipulative ("scaring users into upgrading") | Copy locked, voice rules applied, no fear language. Six contexts only, each tied to a real engine signal. |
| Trigger fires too often (paywall fatigue) | 2-of-3 threshold tolerates a missed check-in but doesn't fire on every off week. One trigger context per weekly run max. |
| Trigger fires on paid users due to state lag | Cascade state read from RevenueCat customer info; double-checked at trigger time. |
| Pricing copy outdated when prices change | Price reads from a single source: catalogue.js, which reads the current pricing window. |
