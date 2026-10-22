/**
 * The Train stack carries the screens Train now opens (D231, app layout rework,
 * batch 2).
 *
 * Train's Recent sessions open WorkoutSummary, its "All sessions" door opens
 * WorkoutHistory and its volume strip opens VolumeHeatmap on "This week". They
 * were Progress's, registered in ProgressStack only, and React Navigation drops a
 * navigate() to a route the caller's own stack does not register, in silence (the
 * dead-tap class navigationTargets.guard.test.js and capabilityRoutesReachable
 * .test.js exist for). A later batch removes the Progress tab, so each must be in
 * PlansStack with the options it has in ProgressStack (a deliberate duplicate
 * registration, as other screens already have), and so must the routes
 * WorkoutSummary opens, or a summary opened from Train could not share.
 *
 * Source-level (RootNavigator pulls the whole app), reading the stacks the way
 * capabilityRoutesReachable.test.js does.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'RootNavigator.js');
const source = fs.readFileSync(ROOT, 'utf8');

function stackBody(name) {
  const start = source.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const open = source.indexOf('{', source.indexOf(')', start) + 1);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(open, i + 1); }
  }
  throw new Error(`unbalanced ${name}`);
}

/** name -> the full `<Stack.Screen ... />` element text. */
function registrations(body) {
  const out = {};
  const re = /<Stack\.Screen\s+name="(\w+)"[^>]*?\/>/g;
  let m;
  while ((m = re.exec(body)) !== null) out[m[1]] = m[0].replace(/\s+/g, ' ');
  return out;
}

const plans = registrations(stackBody('PlansStack'));
const progress = registrations(stackBody('ProgressStack'));

describe('D231 batch 2: Train opens WorkoutSummary, WorkoutHistory and VolumeHeatmap inside its own stack', () => {
  test.each(['WorkoutSummary', 'WorkoutHistory', 'VolumeHeatmap'])('%s is registered in PlansStack with the options it has in ProgressStack', (name) => {
    expect(plans[name]).toBeDefined();
    expect(progress[name]).toBeDefined();
    expect(plans[name]).toBe(progress[name]);
  });

  test('Train\'s own screen sources navigate to exactly those routes without a cross-tab hop', () => {
    const plansScreen = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'PlansScreen.js'), 'utf8');
    expect(plansScreen).toContain("navigation.navigate('WorkoutSummary', {");
    expect(plansScreen).toContain("navigation.navigate('WorkoutHistory')");
    expect(plansScreen).toContain("navigation.navigate('VolumeHeatmap', { windowWeeks: 1 })");
    expect(plansScreen).not.toMatch(/navigateCrossTab\(navigation, 'ProgressTab', '(WorkoutSummary|WorkoutHistory|VolumeHeatmap)'/);
  });

  test('every route those screens open by a plain navigate() is registered in PlansStack too (no dead tap from a summary opened on Train)', () => {
    const screens = path.join(__dirname, '..', '..', 'screens');
    for (const file of ['WorkoutSummaryScreen.js', 'WorkoutHistoryScreen.js', 'VolumeHeatmapScreen.js']) {
      const src = fs.readFileSync(path.join(screens, file), 'utf8');
      const re = /navigation\.(?:navigate|push|replace)\(\s*['"](\w+)['"]/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const target = m[1];
        // WorkoutSummary's community compose is a recorded exception: ProgressStack does not register it either.
        if (target === 'CommunityCompose') continue;
        expect({ file, target, registered: plans[target] !== undefined }).toEqual({ file, target, registered: true });
      }
    }
  });

  test('ShareCard and ClipCamera ride along with the options they have in ProgressStack', () => {
    expect(plans.ShareCard).toBe(progress.ShareCard);
    expect(plans.ClipCamera).toBe(progress.ClipCamera);
    expect(plans.ClipCamera).toContain('gestureEnabled: false');
  });

  test('the registrations Train already had are untouched, and the other stacks keep theirs', () => {
    for (const name of ['Plans', 'PlanUpdate', 'PlanDetail', 'RoutineDetail', 'ExerciseDetail', 'ManualBuilder', 'PlanLibrary', 'MesocycleBuilder', 'AvoidedMovements', 'HowYouTrain', 'HowYouTrainAdd', 'TrainingConsiderations', 'SettingsWorkout']) {
      expect(plans[name]).toBeDefined();
    }
    for (const name of ['WorkoutSummary', 'WorkoutHistory', 'VolumeHeatmap']) expect(progress[name]).toBeDefined();
    const home = registrations(stackBody('HomeStack'));
    expect(home.WorkoutSummary).toBeDefined();
    expect(home.WorkoutHistory).toBeDefined();
  });
});
