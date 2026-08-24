/**
 * A session keeps the name of the day it came from.
 *
 * Founder device report 2026-08-24: "I don't like how it changes the
 * workout name because I swapped these exercises in on the share card. It
 * should still show the original workout name." A Back + Hams day titled
 * itself "Ab Crunch Machine & Seated Leg Curl +more".
 *
 * shareSessionName was never the problem - it has always preferred a named
 * routine. It was never GIVEN one. Two paths starved it:
 *
 *   1. ActiveWorkoutScreen wrote the finished workout's stored name with
 *      shareSessionName(null, exerciseNames), so the fallback ran on every
 *      session from a named day. The title then tracked whichever two
 *      exercises happened to come first, which is why swapping renamed it.
 *   2. WorkoutHistoryScreen opened the summary with no routine at all, so
 *      the summary had nothing to fetch a name with and its share card fell
 *      to the same fallback.
 *
 * This suite pins the rule itself and both call sites.
 */
import { shareSessionName } from '../sessionShareData';

const fs = require('fs');
const path = require('path');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

describe('the rule', () => {
  test('a named day wins over its exercises, whatever they were swapped to', () => {
    const swapped = ['Ab Crunch Machine', 'Seated Leg Curl', 'Lying Leg Curl', 'Machine Curl'];
    expect(shareSessionName('Back + Hams', swapped)).toBe('Back + Hams');
    // The same day, different exercises: the title does not move.
    expect(shareSessionName('Back + Hams', ['Chest-Supported T-Bar Row'])).toBe('Back + Hams');
  });

  test('the exercise join is still what a free-form session gets', () => {
    expect(shareSessionName(null, ['Squat', 'Bench', 'Row']))
      .toBe('Squat & Bench +more');
    expect(shareSessionName('   ', ['Squat'])).toBe('Squat');
    expect(shareSessionName(null, [])).toBe('Workout complete');
  });
});

describe('the finished workout stores that name', () => {
  const SRC = read('screens/ActiveWorkoutScreen.js');

  test('the routine is resolved before the title is built', () => {
    expect(SRC).toMatch(/finishedRoutineName = \(await getRoutineById\(activeWorkout\.routineId\)\)\?\.name/);
    expect(SRC).toContain('const sessionName = shareSessionName(finishedRoutineName, exerciseNames);');
    expect(SRC).not.toContain('shareSessionName(null, exerciseNames)');
  });

  test('a routine that cannot be read still names the session honestly', () => {
    // The lookup is wrapped, and finishedRoutineName starts null, so the
    // exercise join remains the fallback rather than the finish throwing.
    const window = SRC.match(/let finishedRoutineName = null;[\s\S]{0,420}?shareSessionName\(/)?.[0] ?? '';
    expect(window).toContain('try {');
    expect(window).toContain('catch (_)');
  });

  test('a free-form session with no routine never looks one up', () => {
    expect(SRC).toMatch(/if \(activeWorkout\.routineId\) \{\s*\n\s*try \{/);
  });
});

describe('every route into the summary carries its routine', () => {
  const SRC = read('screens/WorkoutHistoryScreen.js');
  const SUMMARY = read('screens/WorkoutSummaryScreen.js');

  test('both View summary routes carry the routine through', () => {
    const passes = SRC.match(/routineId: workout\.routineId \?\? null,\s*\n\s*routineName: workout\.routineName \?\? null,/g) || [];
    expect(passes.length).toBe(2);
  });

  // Enumerated rather than listed. Fixing the two routes that were reported
  // left a third starved one on the Progress tab (Analytics' recent
  // sessions), which is very likely where the founder's card came from. A
  // pin on named screens would not have caught it, and would not catch the
  // next screen that grows a link to the summary either.
  test('no navigation to the summary anywhere omits the routine', () => {
    const fs = require('fs');
    const path = require('path');
    const root = path.join(__dirname, '..', '..');
    const files = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== '__tests__') walk(full); continue; }
        if (entry.name.endsWith('.js')) files.push(full);
      }
    }(root));

    const offenders = [];
    let seen = 0;
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      // Each navigate/replace call to WorkoutSummary, up to its closing brace.
      const calls = src.match(/navigation\.(?:navigate|replace)\('WorkoutSummary',\s*\{[\s\S]*?\n\s*\}\)/g) || [];
      seen += calls.length;
      for (const call of calls) {
        if (!/routineId:/.test(call)) offenders.push(path.relative(root, file));
      }
    }
    // Non-vacuity: the sweep must actually be finding the routes. Four exist
    // today (two in history, one in analytics, the live finish); a regex that
    // silently stopped matching would otherwise pass this test forever.
    expect(seen).toBeGreaterThanOrEqual(4);
    expect(offenders).toEqual([]);
  });

  test('the summary uses the name it is handed, and still fetches when it is not', () => {
    expect(SUMMARY).toContain('routineName: passedRoutineName = null,');
    expect(SUMMARY).toContain("const [routineName, setRoutineName] = useState(passedRoutineName || '');");
    // The live finish flow arrives with an id and no name; that fetch stays.
    expect(SUMMARY).toMatch(/const r = await getRoutineById\(routineId\);/);
  });
});
