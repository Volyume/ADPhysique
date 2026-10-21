/**
 * Item 12 (owner 2026-10-20): the quick check-in never stores a calorie
 * answer derived from 1 to 4 logged days. Below MIN_INTAKE_DAYS (the coach's
 * own bar, coachContext.js) it asks one tap, "Did you mostly eat to your
 * target this week?", Yes / No / Didn't track, and stores that answer
 * ('untracked' for Didn't track). Under calm, an open flag or a failed read
 * (safety.suppressed) nothing food-adjacent is asked and nothing is stored.
 * Ticks mean a good outcome only; "filled in from logs" is a neutral dot.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.join(__dirname, '..', 'WeeklyCheckInScreen.js'), 'utf8');

describe('quick check-in, thin diary', () => {
  test('a derived answer from fewer than MIN_INTAKE_DAYS days is never pre-selected or stored', () => {
    expect(SCREEN).toMatch(/if \(calsAdh && loggedRollups\.length >= MIN_INTAKE_DAYS\) setCalsAdherence\(calsAdh\);/);
    expect(SCREEN).not.toMatch(/\n\s+if \(calsAdh\) setCalsAdherence\(calsAdh\);/);
  });

  test('the one-tap question has the three answers, stored as yes / no / untracked', () => {
    expect(SCREEN).toContain('Did you mostly eat to your target this week?');
    expect(SCREEN).toMatch(/\{ value: 'yes', label: 'Yes' \},\s+\{ value: 'no', label: 'No' \},\s+\{ value: 'untracked', label: "Didn't track" \}/);
  });

  test('it is asked when the diary is thin, under calm too, never under a flag, a failed read or the unknown state', () => {
    expect(SCREEN).toMatch(/const calsLowCoverage = hasNutritionTarget\s+&& \(autoDerived\.calsMeta\?\.daysLogged \?\? 0\) < MIN_INTAKE_DAYS;/);
    // Founder 2026-10-21: the gate is the tier that withholds weight figures
    // (an open flag, a failed read, the unknown state; never calm alone).
    expect(SCREEN).toMatch(/const calsAsk = calsLowCoverage && !withholdWeight;/);
    expect(SCREEN).toMatch(/const withholdWeight = withholdsWeightFigures\(safety\);/);
    expect(SCREEN).toMatch(/\{calsAsk && \(/);
  });

  test('the gate, read against the real safety state: calm asks, a flag, a failed read or the unknown state do not', () => {
    const { deriveSafetyState, withholdsWeightFigures, SAFETY_STATE_UNKNOWN } = require('../../lib/safetyState');
    const asks = (state) => !withholdsWeightFigures(state);
    expect(asks(deriveSafetyState({ mode: 'normal', edFlag: null }))).toBe(true);
    expect(asks(deriveSafetyState({ mode: 'calm', edFlag: null }))).toBe(true);
    expect(asks(deriveSafetyState({ mode: 'calm', edFlag: { id: 'f' } }))).toBe(false);
    expect(asks(deriveSafetyState({ mode: 'normal', edFlag: { id: 'f' } }))).toBe(false);
    expect(asks(deriveSafetyState({ mode: 'normal', edFlag: 'read_failed' }))).toBe(false);
    expect(asks(deriveSafetyState({ mode: 'read_failed', edFlag: null }))).toBe(false);
    expect(asks(SAFETY_STATE_UNKNOWN)).toBe(false);
  });

  test('the quick path stays open and submit waits for the answer', () => {
    expect(SCREEN).toMatch(/\(!hasNutritionTarget \|\| calsAdherence != null \|\| calsLowCoverage\)/);
    expect(SCREEN).toMatch(/&& \(!calsAsk \|\| calsAdherence != null\)/);
  });

  test('the Nutrition summary row is a verdict only with enough days, and a tick only for a hit', () => {
    expect(SCREEN).toMatch(/value: \(calsAdherence && !quiet && !calsLowCoverage\) \? CALS_TEXT\[calsAdherence\] : null,/);
    expect(SCREEN).toMatch(/good: !quiet && !calsLowCoverage && calsAdherence === 'yes',/);
    expect(SCREEN).toMatch(/row\.good\s+\? <Ionicons name="checkmark-circle"/);
  });

  test('re-opening a check-in with a legacy or empty answer never derives one from a thin diary', () => {
    // Lead review 2026-10-21.
    expect(SCREEN).toMatch(/: \(\(calsAdh && loggedRollups\.length >= MIN_INTAKE_DAYS\) \? calsAdh : null\)\);/);
    expect(SCREEN).not.toMatch(/existingCheckin\.calsAdherence : \(calsAdh \?\? null\)/);
  });
});
