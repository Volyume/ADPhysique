/**
 * campaign5.firstUse.test.js — Campaign 5 (D96) first-use regression
 * suite.
 *
 * Pins the first-use laws and the spine fixes so no future change can
 * quietly reintroduce a fixed defect: the Step 1 onboarding trap, the
 * destructive wellbeing write, the ungated legacy pull, fabricated
 * biology in the goal-setup recalc, fabricated session ratings, and
 * the onboarding rollback switch. Source-level pins deliberately match
 * the minimal fingerprint of each fix; behavioural coverage lives in
 * the sibling focused suites.
 */
import fs from 'fs';
import path from 'path';

const SRC = (p) => path.join(__dirname, '..', p);
const read = (p) => fs.readFileSync(SRC(p), 'utf8');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('ONBOARDING: the Step 1 trap stays fixed (C5-P29-01, D96)', () => {
  test('no hydrated-profile guard blocks an authenticated user from advancing past step 1', () => {
    const src = stripComments(read('screens/ProOnboardingScreen.js'));
    // The exact defective guard: a bare early-return on userProfile inside
    // the step-1 auto-advance. Any authenticated non-local user advances.
    expect(src).not.toMatch(/if \(userProfile\) return;/);
  });
});

describe('WELLBEING: completing the SCOFF check preserves the body profile (C5-P5-03, D96)', () => {
  test('the scoff write merges the existing row (saveUserBodyProfile writes whole rows)', () => {
    const src = read('screens/WellbeingCheckScreen.js');
    expect(src).toMatch(/getUserBodyProfile\(user\.id\)/);
    expect(src).toMatch(/\.\.\.\(existing \|\| \{\}\), scoffScore/);
    // The bare destructive form never returns.
    expect(stripComments(src)).not.toMatch(/saveUserBodyProfile\(user\.id, \{ scoffScore/);
  });
});

describe('ARTICLE 9: the legacy pull honours the same fail-closed gate as the runner (C-2, D96)', () => {
  test('pullFromCloud refuses unless healthConsent === true, and a failed read fails closed', () => {
    const src = read('lib/sync.js');
    const fn = src.slice(src.indexOf('export async function pullFromCloud'));
    const head = fn.slice(0, fn.indexOf('_pullWorkouts') > 0 ? fn.indexOf('_pullWorkouts') : 4000);
    expect(head).toMatch(/healthConsent/);
    expect(head).toMatch(/!== true/);
    expect(head).toMatch(/fails closed|closed\)/i);
  });
});

describe('NO INVENTED BIOLOGY: the goal-setup recalc never fabricates sex/height/age (C5-P5-02, D96)', () => {
  test('the silent male/175cm/28y fallbacks are gone; incomplete biology skips the recalc', () => {
    const src = stripComments(read('screens/ProGoalSetupScreen.js'));
    expect(src).not.toMatch(/wp\.sex === 'female' \? 'female' : 'male'/);
    expect(src).not.toMatch(/: 175;/);
    expect(src).not.toMatch(/: 28;/);
    expect(src).toMatch(/biologyComplete/);
  });
});

describe('SESSION RATINGS: skipped stays null, never a fabricated answer (C5-P17-01/02, D96)', () => {
  test('Close writes only fields carrying a real answer', () => {
    const src = read('screens/WorkoutSummaryScreen.js');
    expect(src).toMatch(/realFieldsRef\.current\.has\(k\)/);
    // The unconditional four-field write never returns on the Close path.
    expect(stripComments(src)).not.toMatch(/sessionDifficulty: feedback\.sessionDifficulty,\s*\n\s*overallPump: feedback\.overallPump/);
  });
  test('rating rows render unselected until a real answer exists', () => {
    const src = read('screens/WorkoutSummaryScreen.js');
    expect(src).toMatch(/realFieldsRef\.current\.has\('sessionDifficulty'\) \? feedback\.sessionDifficulty : null/);
    expect(src).toMatch(/realFieldsRef\.current\.has\('fatigueLevel'\) \? feedback\.fatigueLevel : null/);
  });
});

describe('ROLLBACK SWITCH: the quiz-first flow stays dark with its infrastructure intact (C5-P39-04, D96)', () => {
  test('ONBOARDING_QUIZ_FIRST remains false', () => {
    const flow = read('lib/onboarding/quizFlow.js');
    expect(flow).toMatch(/export const ONBOARDING_QUIZ_FIRST = false;/);
  });
  test('the dark routes and rollback infrastructure remain (never delete, never wire live)', () => {
    // Rollback infrastructure must survive: routes registered, screens
    // present. Reachability-dark is enforced by the flag above plus the
    // deep-link config, which names only MainTabs routes.
    const nav = read('navigation/RootNavigator.js');
    expect(nav).toMatch(/QuizTraining/);
    expect(nav).toMatch(/PlanPreview/);
    expect(fs.existsSync(SRC('screens/QuizScreen.js'))).toBe(true);
    expect(fs.existsSync(SRC('screens/PlanPreviewScreen.js'))).toBe(true);
  });
});

describe('CARDIO: no onboarding resurrection (standing boundary)', () => {
  test('onboarding and first-run surfaces carry no cardio input or promise', () => {
    for (const f of ['screens/ProOnboardingScreen.js', 'screens/FirstRunScreen.js', 'screens/FreeStarterScreen.js', 'screens/ProSetupCompleteScreen.js']) {
      expect(stripComments(read(f))).not.toMatch(/[Cc]ardio/);
    }
  });
});
