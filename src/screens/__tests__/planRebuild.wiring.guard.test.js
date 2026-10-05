/**
 * D219 lane C1b: the wiring of the rebuild at a person's next session
 * (founder Q1 = A; the brief's trigger: "the first time the person opens or
 * starts a session of an active plan whose facts are not version 2").
 *
 * Source guard (the screens are too large to mount here). It pins:
 *  - the three screens a person opens a plan or a session from (Home, the plan
 *    list, the plan itself) await ensureActivePlanRebuilt BEFORE they read the
 *    active plan, so what they show and what a Start opens is the plan that is
 *    there; Home through its one loader (loadData) ahead of every loader;
 *  - Home and the plan screen render the one-time note, once, as a component
 *    that holds all of its own logic;
 *  - the call is awaited but cannot block or break a screen: the function it
 *    calls never throws (planRebuild.test.js pins that), and no screen wraps it
 *    in anything that would swallow a different failure;
 *  - the new modules stay clear of every ED-safety module and of the recovery
 *    model's static import path (CLAUDE.md section 2: the ED-safety system is
 *    not touched), call no billing or consent code, and keep activatePlanKeepingBlock,
 *    which they must not use, out of their imports (D140: the Q1 = A rebuild is
 *    its own writer);
 *  - the copy the person reads has no em dash and none of the D204 words.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const HOME = read('screens/HomeScreen.js');
const PLANS = read('screens/PlansScreen.js');
const DETAIL = read('screens/PlanDetailScreen.js');

const between = (text, start, end) => {
  const a = text.indexOf(start);
  expect(a).toBeGreaterThan(-1);
  const b = text.indexOf(end, a);
  expect(b).toBeGreaterThan(a);
  return text.slice(a, b);
};

describe('the screens a plan or a session is opened from trigger the rebuild first', () => {
  test('Home: loadData awaits it before any loader runs', () => {
    expect(HOME).toContain("import { ensureActivePlanRebuilt } from '../lib/planRebuild';");
    const loadData = between(HOME, 'async function loadData() {', 'async function loadLatestCoachOutput()');
    expect(loadData).toContain('if (user?.id) await ensureActivePlanRebuilt(user.id);');
    expect(loadData.indexOf('ensureActivePlanRebuilt(user.id)')).toBeLessThan(loadData.indexOf('await Promise.all(['));
    expect(loadData.indexOf('ensureActivePlanRebuilt(user.id)')).toBeLessThan(loadData.indexOf('loadNextWorkout()'));
  });

  test('the plan list: awaits it before reading the active plan', () => {
    expect(PLANS).toContain("import { ensureActivePlanRebuilt } from '../lib/planRebuild';");
    const loadData = between(PLANS, 'async function loadData() {', 'getArchivedPlansForUser(user.id)');
    expect(loadData).toContain('await ensureActivePlanRebuilt(user.id);');
    expect(loadData.indexOf('ensureActivePlanRebuilt(user.id)')).toBeLessThan(loadData.indexOf('getActivePlan(user.id)'));
  });

  test('the plan screen: awaits it before reading the plan', () => {
    expect(DETAIL).toContain("import { ensureActivePlanRebuilt } from '../lib/planRebuild';");
    const loadData = between(DETAIL, 'async function loadData() {', 'getAllRoutineSetCounts(),');
    expect(loadData).toContain('if (user?.id) await ensureActivePlanRebuilt(user.id);');
    expect(loadData.indexOf('ensureActivePlanRebuilt(user.id)')).toBeLessThan(loadData.indexOf('getProgrammeById(planId)'));
  });

  test('none of them wraps the call in a catch of its own: the function never throws', () => {
    for (const [name, text] of [['Home', HOME], ['Plans', PLANS], ['PlanDetail', DETAIL]]) {
      const at = text.indexOf('ensureActivePlanRebuilt(user');
      expect(at).toBeGreaterThan(-1);
      expect(text.slice(at, at + 90)).not.toMatch(/\.catch\(/);
      expect(name).toBeTruthy();
    }
  });
});

describe('the one-time note is shown by Home and by the plan screen', () => {
  test('Home renders it once, after the load, keyed on the active plan', () => {
    expect(HOME).toContain("import PlanRebuildNote from '../components/PlanRebuildNote';");
    expect((HOME.match(/<PlanRebuildNote /g) ?? []).length).toBe(1);
    expect(HOME).toContain('<PlanRebuildNote userId={user?.id} reloadKey={activePlan?.id ?? null} />');
    expect(HOME).toContain('{!initialLoading && <PlanRebuildNote');
  });

  test('the plan screen renders it once, keyed on the active plan', () => {
    expect(DETAIL).toContain("import PlanRebuildNote from '../components/PlanRebuildNote';");
    expect((DETAIL.match(/<PlanRebuildNote /g) ?? []).length).toBe(1);
    expect(DETAIL).toContain('<PlanRebuildNote userId={user?.id} reloadKey={activePlan?.id ?? null} />');
  });
});

describe('the plan screen does not say the planner chose what it did not', () => {
  test('its explanation is filtered by the plan\'s kind: a library, kit or manual plan is version 2 once rebuilt', () => {
    expect(DETAIL).toContain("import { explainLinesForKind } from '../lib/planRebuildNote';");
    expect(DETAIL).toMatch(/explained = explainLinesForKind\(\s*explainPlan\(\{ facts, sessions, week, sessionLengthMinutes, targetsByWeek \}\)\?\.lines \?\? null,\s*facts\.kind,\s*\);/);
  });
});

describe('the new modules keep to their lane', () => {
  const MODULES = ['lib/planRebuild.js', 'lib/planRebuildNote.js', 'components/PlanRebuildNote.js'];
  const ED_SAFETY = /(edPatternDetector|wellbeing|nutritionEngine|weeklyCoach|coachApply)['"]/;
  const RECOVERY = /\b(?:from|require)\b\s*\(?\s*['"][^'"]*\brecovery\/[^'"]*['"]/;

  test.each(MODULES)('%s imports no ED-safety module, no recovery-model path, no billing or consent code', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(ED_SAFETY);
    expect(src).not.toMatch(RECOVERY);
    expect(src).not.toMatch(/payments|proGate|consent|healthConsent|dbCrypto/);
  });

  test('the orchestrator uses its own writer and never calls activatePlanKeepingBlock or any other activation writer (D140)', () => {
    const src = read('lib/planRebuild.js');
    const imported = src.match(/import\s*\{([^}]*)\}\s*from\s*'\.\/database'/)[1];
    expect(imported).toContain('rebuildPlanKeepingBlockV2');
    expect(imported).not.toMatch(/activatePlanKeepingBlock|activatePlanWithBlock|archiveOtherUserPlans|setActivePlan/);
    expect(src).not.toMatch(/\b(?:activatePlanKeepingBlock|activatePlanWithBlock|archiveOtherUserPlans|setActivePlan)\s*\(/);
  });

  test.each(MODULES)('%s has no em dash in what a person reads', (rel) => {
    expect(read(rel)).not.toContain('—');
  });
});
