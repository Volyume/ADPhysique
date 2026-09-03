/**
 * CoachOutputScreen.activationTelemetry.guard.test.js
 *
 * Activation-funnel elevation (lead activation ruling, 2026-09-03).
 * Source-level guard, matching the repo convention for this screen (see
 * CoachOutputScreen.applyAtomicity.guard.test.js's own note: the screen
 * pulls the whole screen stack in at import time, so a source guard is the
 * house pattern here).
 *
 * Pins:
 *   - coach_result_viewed fires once per mount (ref-guarded), gated on
 *     isCompletedCoachDecision, with { first, hold } and no numeric value.
 *   - coach_recommendation_accepted / _declined fire at every apply/decline
 *     handler with the correct small-enum `kind`, never a magnitude.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'CoachOutputScreen.js'), 'utf8',
);

function handler(name) {
  const start = SRC.indexOf(`async function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const rest = SRC.slice(start + 1);
  const next = rest.indexOf('\n  async function ');
  return rest.slice(0, next === -1 ? rest.length : next);
}

describe('coach_result_viewed', () => {
  test('is ref-guarded so it can only fire once per mount', () => {
    expect(SRC).toMatch(/const coachResultViewedRef = useRef\(false\);/);
    const effectIdx = SRC.indexOf('const coachResultViewedRef');
    const block = SRC.slice(effectIdx, effectIdx + 1200);
    expect(block).toMatch(/if \(coachResultViewedRef\.current\) return;/);
    expect(block).toMatch(/coachResultViewedRef\.current = true;/);
  });

  test('gates on the same completed-decision predicate Home uses, not a looser check', () => {
    const effectIdx = SRC.indexOf('const coachResultViewedRef');
    const block = SRC.slice(effectIdx, effectIdx + 1200);
    expect(block).toMatch(/isCompletedCoachDecision\(output, checkin\)/);
  });

  test('hold reflects heldDecisions, first comes from a seen-key, never a numeric value', () => {
    const effectIdx = SRC.indexOf('const coachResultViewedRef');
    const block = SRC.slice(effectIdx, effectIdx + 1200);
    expect(block).toMatch(/hold: !!\(output\.heldDecisions && output\.heldDecisions\.length > 0\)/);
    expect(block).toMatch(/first: !seen/);
    expect(block).not.toMatch(/newKcal|kcal_delta|weightKg|weekly_loss_pct/);
  });
});

describe('coach_recommendation_accepted / declined kind enum', () => {
  test.each([
    ['handleApplyCalories', 'accepted', 'calories'],
    ['handleDeclineCalories', 'declined', 'calories'],
    ['handleApplyTraining', 'accepted', 'volume'],
    ['handleApplyDeload', 'accepted', 'deload'],
    ['handleApplyDietBreak', 'accepted', 'other'],
  ])('%s emits coach_recommendation_%s with kind %s', (fn, verb, kind) => {
    const body = handler(fn);
    const re = new RegExp(`trackEngineEvent\\(user\\.id, 'coach_recommendation_${verb}', \\{ kind: '${kind}' \\}\\)`);
    expect(body).toMatch(re);
  });

  test('the payload is exactly the kind enum, never a magnitude or resulting number', () => {
    const matches = SRC.match(/trackEngineEvent\(user\.id, 'coach_recommendation_(accepted|declined)', (\{[^}]*\})\)/g) || [];
    expect(matches.length).toBe(5);
    for (const m of matches) {
      expect(m).toMatch(/\{ kind: '(calories|volume|deload|other)' \}/);
    }
  });
});
