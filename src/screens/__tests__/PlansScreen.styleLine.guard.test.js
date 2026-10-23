/**
 * PlansScreen.styleLine.guard.test.js: pins the Train tab's "Training style"
 * line on the active plan card (founder approved 2026-10-20). Display only.
 * The label comes from planTrainingStyleLabel (unit-tested against engine and
 * authored facts in trainingArchetypes.test.js), fed by ONE read of the active
 * plan's facts, with the library style lock passed so authored and library
 * plans show nothing. D231 (batch 2): it is a plain line now; it no longer opens
 * Adjust training at the style section (the PlanUpdate focus param stays).
 * Source-level guard: the screen pulls the whole SQLite/sync graph.
 */
import fs from 'fs';
import path from 'path';

const plans = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');
const update = fs.readFileSync(path.join(__dirname, '..', 'PlanUpdateScreen.js'), 'utf8');

describe('PlansScreen training style line', () => {
  test('label derives from the active plan facts and the style lock', () => {
    expect(plans).toMatch(/getProgrammePlanFacts\(active\.id\)/);
    expect(plans).toMatch(/planTrainingStyleLabel\(styleFacts, \{ styleLocked: !!styleLockFromTags\(active\?\.tags\) \}\)/);
  });
  // RE-POINTED (D231, app layout rework batch 2; owner decision 2026-10-20 keeps
  // the rules above): the line is plain text now, no longer its own tappable row
  // (rule 3, one door per screen: Adjust training plan below is the door). It
  // renders only when a label exists, directly after the workouts meta line.
  test('renders only when a label exists, directly after the workouts meta line, as plain text', () => {
    const i = plans.indexOf('{activePlanStyle ? (');
    expect(i).toBeGreaterThan(plans.indexOf("workout{planWorkoutCounts[activePlan.id] !== 1 ? 's' : ''}") - 1);
    const block = plans.slice(i, i + 400);
    expect(block).toMatch(/<Text testID="active-plan-style"/);
    expect(block).toMatch(/Training style: \{activePlanStyle\}/);
    expect(block).not.toMatch(/accessibilityRole="button"|onPress|TouchableOpacity|chevron-forward|navigate\(/);
    expect(plans).not.toMatch(/activePlanStyleRow/);
  });
});

describe('PlanUpdateScreen focus param', () => {
  test('scrolls to the style section once, only when it is rendered', () => {
    expect(update).toMatch(/route\?\.params\?\.focus === 'style'/);
    expect(update).toMatch(/archetypeApplies\(selectedGoal\) \? \(\s*<View\s+testID="plan-update-style-section"\s+onLayout=/);
    expect(update).toMatch(/styleScrolledRef/);
    expect(update).toMatch(/scrollRef\.current\?\.scrollTo\?\.\(\{ y: Math\.max\(0, styleYRef\.current - spacing\.md\)/);
  });
  test('works with no params', () => {
    expect(update).toMatch(/export default function PlanUpdateScreen\(\{ navigation, route \}\)/);
    expect(update).toMatch(/!focusStyle \|\|/);
  });
});
