/**
 * CoachOutputScreen.checkinPlacement.guard.test.js -- D219 lane A3: the weekly
 * check-in card for a plan the new planner built (design 4.10, 6 and 11 test
 * 10; register D219).
 *
 * What this pins, and why:
 *   - Nothing changes without Apply (D96). The card is drawn from
 *     resolveCheckinPlan, which only reads; the one writeCheckinPlan call lives
 *     in handleApplyTraining, before the atomic apply, and the preview effect
 *     never reaches a writer.
 *   - A hold has an Apply only where the card shows one (a plan the new planner
 *     built): on every other plan a zero signal stays informational, and the
 *     legacy apply path (computeVolumeApply on next week's rows) is untouched.
 *   - The hold and withheld cards show Apply and say what happens if left; +1
 *     shows no Apply (the card's own `showApply`, drawn from the pure model,
 *     tested in plan/__tests__/checkinPlacement.test.js) and says the plan's
 *     climb goes ahead; the card lines are the model's words, none its own.
 *   - A hold leaves no volume-start record to be judged later: it added nothing,
 *     so no later increase may wait on it.
 *   - Any failure of the preview shows today's card; a plan that moved on
 *     between the card and the tap writes nothing and says so.
 *
 * The screen cannot be rendered safely in Jest (live store, no mount scaffold),
 * so this is a source guard, the house convention for this screen.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|junk|cut back|you should|reduce your|train more|train less|must|avoid|never|always|recommend(ed)?|need to|try to)\b/i;

function between(start, end) {
  const a = SRC.indexOf(start);
  expect(a).toBeGreaterThan(-1);
  const b = SRC.indexOf(end, a + start.length);
  expect(b).toBeGreaterThan(a);
  return SRC.slice(a, b);
}

const HANDLER = between('async function handleApplyTraining() {', '\n  async function handleApplyDeload');
const PREVIEW = between('const trainingApplied = isApplied(output, \'training\');', '}, [user?.id, output?.weekStart');
const CARD = between('function TrainingNextWeekCard({', '\n// NU-4: the button drops the old');

describe('the card is a preview: it reads, and only Apply writes (D96)', () => {
  test('the preview effect resolves the plan and reaches no writer', () => {
    expect(PREVIEW).toContain('resolveCheckinPlan(');
    for (const writer of ['writeCheckinPlan', 'applyCoachTrainingAdjustmentAtomically', 'saveCoachOutput', 'upsertPlannedMuscleVolume', 'markApplied', 'setOutput']) {
      expect(PREVIEW).not.toContain(writer);
    }
  });

  test('writeCheckinPlan is called once in the whole screen, in the Apply handler, before the atomic apply', () => {
    expect(SRC.split('writeCheckinPlan(').length - 1).toBe(1);
    const write = HANDLER.indexOf('writeCheckinPlan(');
    expect(write).toBeGreaterThan(HANDLER.indexOf('resolveCheckinPlan('));
    expect(write).toBeLessThan(HANDLER.indexOf('applyCoachTrainingAdjustmentAtomically({'));
    expect(write).toBeLessThan(HANDLER.indexOf('markApplied(output'));
  });

  test('the Apply tap recomputes from the device, never from the card the person saw', () => {
    expect(HANDLER).toMatch(/const v2 = await resolveCheckinPlan\(\{\s*userId: user\.id, profile: userProfile, signal: delta, withheld: checkinWithheld\(output\), holdMuscles,\s*\}\);/);
    expect(HANDLER).not.toMatch(/checkinV2\.(plan|changes|nextWeekChanges)/);
  });

  test('the preview is skipped for a recovery-week card and once applied, and any failure shows today\'s card', () => {
    expect(PREVIEW).toMatch(/output\.deloadSuggested \|\| trainingApplied/);
    expect(PREVIEW).toMatch(/catch \(e\) \{\s*logError\('CoachOutputScreen\.checkinPreview', e, \{ userId: user\?\.id \}\);\s*if \(!cancelled\) setCheckinV2\(null\);/);
  });
});

describe('the Apply handler on a new-planner plan and on every other plan', () => {
  test('a hold applies only where the card shows Apply, before the handler takes its lock', () => {
    const guard = HANDLER.indexOf('if (!delta && !checkinV2?.showApply) return;');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(HANDLER.indexOf('applyingRef.current = true;'));
  });

  test('every other plan takes today\'s path: next week\'s rows through computeVolumeApply, unchanged', () => {
    expect(HANDLER).toMatch(/\} else \{\s*const rows = await getPlannedMuscleVolume\(nextTrainingWeekId\);\s*changes = computeVolumeApply\(rows, delta, holdMuscles\);\s*\}/);
    expect(HANDLER).toMatch(/holdMuscles = await loadVolumeIncreaseHolds\(user\.id\);/);
    expect(HANDLER).toMatch(/if \(delta > 0 && nextWeekIsDeload\) return;/);
  });

  test('a plan that moved on since the card was drawn writes nothing and says so', () => {
    expect(HANDLER).toMatch(/if \(\(!v2 && !delta\) \|\| \(v2 && \(v2\.nextWeekId !== nextTrainingWeekId \|\| !v2\.card\.showApply\)\)\) \{[\s\S]{0,400}?toast\.show\([^)]*\{ variant: 'warning' \}\);\s*return;\s*\}/);
  });

  test('the receipt keeps the card\'s heading, the step and the exercises added', () => {
    expect(HANDLER).toContain('checkinKind: v2.plan.kind,');
    expect(HANDLER).toContain('checkinStep: v2.plan.step,');
    expect(HANDLER).toContain('checkinHeading: v2.card.heading,');
    expect(HANDLER).toContain('exercisesAdded: v2.plan.opened.length,');
  });

  test('a hold builds no volume-start record, an increase and a pull-back still do', () => {
    expect(HANDLER).toContain('kind: (v2 && !delta) ? null : INTERVENTION_KIND.VOLUME_START,');
    expect(HANDLER).toMatch(/intervention: buildInterventionRecord\(\{/);
  });
});

describe('the card words (design 4.10, 6; D204)', () => {
  test('Apply shows by the model\'s own showApply for a new-planner plan, and today\'s rule for every other', () => {
    expect(CARD).toMatch(/const v2 = !applied && !deloadSuggested \? checkin : null;/);
    expect(CARD).toMatch(/const applyable = v2\s*\?\s*canApply && v2\.showApply && !applied\s*:\s*canApply && signal !== 0 && !applied && !upwardBlocked;/);
  });

  test('the heading and every line are the model\'s: the screen holds no check-in sentence of its own', () => {
    expect(CARD).toContain('const shownLabel = v2 ? v2.heading : (appliedHeading ?? label);');
    expect(CARD).toMatch(/\[\.\.\.v2\.lines, \.\.\.v2\.unplacedLines, v2\.notRaisedLine, v2\.ifLeft\]\.filter\(Boolean\)/);
  });

  test('the one sentence the screen adds, the toast, describes and carries no banned word or em dash', () => {
    const toast = HANDLER.match(/toast\.show\('(Your plan changed[^']*)'/);
    expect(toast).not.toBeNull();
    expect(toast[1]).not.toMatch(NEVER);
    expect(toast[1]).not.toMatch(/\u2014/);
  });

  test('the new code carries no em dash', () => {
    for (const part of [HANDLER, PREVIEW, CARD]) expect(part).not.toMatch(/\u2014/);
  });

  test('the card is given the preview, and only the preview', () => {
    expect(SRC).toMatch(/<TrainingNextWeekCard[\s\S]{0,600}?checkin=\{checkinV2\}/);
  });
});
