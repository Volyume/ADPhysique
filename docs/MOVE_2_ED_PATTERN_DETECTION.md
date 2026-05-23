# Move #2: ED-pattern detection (locked)

The harm-prevention move. A multi-signal detector that holds further
deficit when risk patterns co-occur, with explicit (not silent)
lockout copy and a single signposting link. Locked 2026-05-23.

## Scope

### Database (migration 006)

From `DATABASE_SCHEMA_LOCKED.md`:

- `ed_pattern_flags` table.
- `engine_telemetry_daily` columns for ED-flag rates (already in
  the migration plan).
- `engine_overrides` table (groundwork for B2B phase 2, no engine
  consumers yet at this move).
- `clear_goal_lock` RPC.
- `record_engine_telemetry` RPC.

### Engine code

```
src/lib/edPatternDetector.js              NEW
  detectEdPatternFlag(userState, weeklyHistory, goalLockAdvanced)
    -> { fired: bool, reason: string, signals: object }

  Signals checked:
    s1: rapid_loss (-1.5% BW/wk or worse)
    s2: low_energy (energy <= 2) for >= 2 weeks
    s3: sustained_under_adherence (adherence = 'under' for >= 2 of last 3 weeks)
    s4: weight_only_checkins (no food data on weeks that have a check-in)

  Threshold:
    goal_lock_advanced = false -> fire on >= 2 signals
    goal_lock_advanced = true  -> fire on >= 3 signals
    FFM floor is independent; never overridden by goal_lock

src/lib/weeklyCoach.js                    EXTENDED
  - on detector firing, refuse further deficit and set
    held-decision type 'ed_pattern_lockout'
  - on detector clearing (signals abate for 2 consecutive weeks),
    set held-decision type 'ed_pattern_cleared' for one week then
    return to standard output

src/lib/whyThisTemplates.js               EXTENDED
  - new WHY_LIBRARY keys 'ed_pattern_lockout', 'ed_pattern_cleared'
  - locked copy per RESEARCH_FINDINGS_SYNTHESISED.md
```

### UI

```
src/screens/onboarding/GoalLockConsentScreen.js   NEW
  (already named in ONBOARDING_SEQUENCE_LOCKED.md)

src/screens/HeldDecisionCard.js                   EXTENDED
  - new variant: ed_pattern_lockout
  - displays explicit lockout copy
  - "Get support" CTA linking to Beat (UK), NEDA (US)

src/screens/YouScreen.js                          EXTENDED
  - new row: Goal lock (only visible when relevant)
  - tap -> opens GoalLockConsentScreen for re-edit
```

### Telemetry additions

```
ed_pattern_flag_fired
held_decision_created (already exists)
held_decision_cleared (already exists)
goal_lock_set
goal_lock_cleared
```

Daily aggregations in `engine_telemetry_daily`:
- `flag_firing_count`
- `flag_firing_rate`
- `false_positive_count` (manual review marking)
- `goal_locked_users`
- `goal_locked_flag_count`

## Locked copy (verbatim)

Held decision card, ED-pattern lockout variant:

```
Header: Held this week
Title:  We've held your calorie cut

Body (free / pro / complete user, identical):
        We've held your calorie cut. We've noticed a few signals
        together: your weight has been dropping faster than your
        intake suggests, your energy scores have been low, and
        your food log shows you eating less than your target for
        a few weeks running.

        Even when a cut is going well in numbers, sustained low
        energy is a safety signal. We'd rather pause than push.

        Once your fuelling and energy recover for two weeks,
        we'll suggest new targets.

Body extension if goal_lock_advanced was true at flag time:
        You set a goal lock for an aggressive cut, so we've held
        off until three signals stacked up instead of two.
        That happened this week.

CTAs:   [ Get support ]  -- links to Beat (UK), NEDA (US), Butterfly (AU) by locale
        [ Read more about why ]  -- opens InfoTooltip with the plain-English science

Bottom note (always shown):
        You can keep using Volyume normally. Your weight log,
        food diary, training, and check-ins all continue. Only
        the calorie target stops shifting.
```

ED-pattern cleared variant (shown for one week after clearance):

```
Header: Hold lifted
Title:  Your numbers are looking better

Body:   The signals that triggered the hold have settled for two
        weeks. We're back to the standard coach output. New
        calorie targets land at the next weekly run.

        Take this gently. Energy recovery beats rushing back into
        a deep cut.
```

## Goal lock copy

Already locked in `ONBOARDING_SEQUENCE_LOCKED.md` Screen 6. The
re-edit surface in You tab uses the same copy.

## Signposting

The "Get support" CTA links to locale-appropriate eating disorder
support:

| Locale | URL | Org |
| --- | --- | --- |
| en-GB | https://www.beateatingdisorders.org.uk | Beat |
| en-US | https://www.nationaleatingdisorders.org | NEDA |
| en-AU | https://butterfly.org.au | Butterfly |
| Other English | Beat (default) | Beat |

Locale picked from device, not from billing address.

The link opens in an external browser, not an in-app webview. We
don't track tap-through to the destination (privacy).

## Tests required

### Unit

- `tests/edPatternDetector.test.js` — every signal combination
  + thresholds + goal-lock interaction.

### Property

- `tests/engine/edPatternDetector.property.test.js`:
  - FFM floor fires regardless of goal_lock_advanced.
  - 1 signal alone never fires the detector.
  - 2 signals fire it when goal_lock_advanced = false.
  - 3 signals fire it when goal_lock_advanced = true.
  - 2 signals do not fire when goal_lock_advanced = true.

### Simulator

- `tests/simulator/scenarios/aggressive_cut_unsupervised.test.js`:
  flag fires by week 4 with no goal lock.
- `tests/simulator/scenarios/aggressive_cut_supervised.test.js`:
  flag does NOT fire when goal-lock prevents it.
- `tests/simulator/scenarios/red_s_trajectory.test.js`: FFM floor
  fires immediately even with goal lock.

### Snapshot

- `tests/snapshots/edPatternCopy.snap.js` — both variants of the
  held-decision card.

### E2E

- `e2e/goal_lock_set_and_clear.yaml`

## Acceptance check

- `aggressive_cut_unsupervised` simulator scenario fires the flag
  by week 4.
- `aggressive_cut_supervised` (same body, goal-lock on) does NOT
  fire by week 12.
- `red_s_trajectory` (intake at 28 kcal/kg FFM) fires the FFM
  floor at week 1 regardless of goal lock.
- Onboarding goal lock screen appears for physique_competition and
  advanced_recomp only.
- ED-pattern flag firing rate in synthetic load is under 5% of
  active simulated users at default thresholds.
- Held decision card displays the verbatim copy above.
- "Get support" link opens the correct org by locale.
- Account deletion path wipes `ed_pattern_flags` rows belonging to
  the user.
- Sentry scrub rules cover `ed_pattern_flags` data; no leak.

## Effort estimate

1-2 weeks. The detector logic is straightforward; the careful copy
work and the onboarding screen take longer to get right.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| False positives push physique competitors away | Goal-lock raises threshold; cleared flag opens engine back up; copy is supportive not accusatory |
| Users perceive the lockout as paternalistic | Explicit copy (not silent), preserves all other app functionality, explains the science |
| Goal lock misused (someone declares experience to disable safety) | FFM floor non-overrideable; thresholds raised, not removed; we accept this trade-off |
| Locale fallback wrong for non-English speakers | Default to Beat (UK) until proper i18n in v2 |
| ED-pattern table leaks | Privacy and consent doc names this as highest-priority incident; specific run-book entry |
