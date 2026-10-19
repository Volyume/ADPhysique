/**
 * Source guard for the founder brief of 2026-10-19 (coaching-first onboarding
 * with an optional quick start): every coach-owned surface shows the calm
 * CoachingSetupCard until coaching is set up. Pins, per screen, that the hook
 * is imported and the card rendered; that CoachOutputScreen's runWeeklyCoach
 * effect returns early when not set up; and that the card-instead-of-content
 * return sits after the last hook in DiaryScreen, MealPlanScreen,
 * NutritionTargetsScreen, WeeklyCheckInScreen and CoachOutputScreen (hook
 * order must never change).
 */
import fs from 'fs';
import path from 'path';

const read = (n) => fs.readFileSync(path.join(__dirname, '..', n), 'utf8');
const SCREENS = ['DiaryScreen', 'MealPlanScreen', 'NutritionTargetsScreen', 'WeeklyCheckInScreen', 'CoachOutputScreen', 'YouScreen'];

describe('coaching setup gating', () => {
  it.each(SCREENS)('%s imports the hook and renders CoachingSetupCard', (name) => {
    const src = read(`${name}.js`);
    expect(src).toMatch(/import useCoachingSetUp\b/);
    expect(src).toMatch(/import CoachingSetupCard from/);
    expect(src).toMatch(/<CoachingSetupCard\b/);
    expect(src).toMatch(/useCoachingSetUp\(\)/);
  });

  it.each(['DiaryScreen', 'MealPlanScreen', 'NutritionTargetsScreen', 'WeeklyCheckInScreen', 'CoachOutputScreen'])(
    '%s returns the card after its last hook',
    (name) => {
      const src = read(`${name}.js`);
      const gate = src.search(/if \(!coachingSetUp\) \{\n\s+return/);
      expect(gate).toBeGreaterThan(-1);
      // Last hook call (use[A-Z]...( ) inside the default export, before the gate.
      const start = src.indexOf(`export default function ${name}`);
      const hooks = [...src.slice(start, gate).matchAll(/\buse[A-Z][A-Za-z]*\(/g)];
      expect(hooks.length).toBeGreaterThan(0);
      // And no hook call after the gate inside the default export body.
      const stripComments = (x) => x.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const after = stripComments(src.slice(gate).split(/\n(?:const|function|export) /)[0]);
      expect(after).not.toMatch(/\buse[A-Z][A-Za-z]*\(/);
    },
  );

  it('DiaryScreen stands its data effects down when not set up', () => {
    const src = read('DiaryScreen.js');
    expect(src).toMatch(/if \(!coachingSetUp\) return; \/\/ 2026-10-19 brief: no bank writes/);
    expect(src).toMatch(/if \(!coachingSetUp\) return; load\(\)/);
  });

  it('CoachOutputScreen never starts the weekly coach run when not set up', () => {
    const src = read('CoachOutputScreen.js');
    const guard = src.indexOf('if (!coachingSetUp) {\n      setLoading(false);\n      return;');
    const run = src.indexOf('runWeeklyCoach({');
    const effectStart = src.lastIndexOf('useEffect(() => {\n    async function load()', run);
    expect(guard).toBeGreaterThan(effectStart);
    expect(effectStart).toBeGreaterThan(-1);
    // The guard sits before the load() call that reaches runWeeklyCoach.
    expect(src.indexOf('load().catch', guard)).toBeGreaterThan(guard);
    expect(src).toMatch(/redirectWeekStart, coachingSetUp\]/);
  });

  it('YouScreen shows the coach card non-blocking, others use plain navigate or the cross-tab helper', () => {
    expect(read('YouScreen.js')).toMatch(/variant="coach"/);
    expect(read('DiaryScreen.js')).toMatch(/openCoachingSetup\(navigation\)/);
    expect(read('MealPlanScreen.js')).toMatch(/openCoachingSetup\(navigation\)/);
    for (const n of ['NutritionTargetsScreen', 'WeeklyCheckInScreen', 'CoachOutputScreen', 'YouScreen']) {
      expect(read(`${n}.js`)).toMatch(/navigation\.navigate\('CoachingSetup'\)/);
    }
  });
});
