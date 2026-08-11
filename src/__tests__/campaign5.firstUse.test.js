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
import { BLOCK_PLANNED_WEEKS, BLOCK_DELOAD_WEEK } from '../lib/mesocycle';
import { buildBlockStartLines, buildSeedReceipt, BLOCK_START_SENTENCE } from '../lib/blockExplain';
import { buildReadinessSummary } from '../lib/readinessSummary';
import { getQuizRecommendation } from '../screens/PlanLibraryScreen';

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

/**
 * ACCOUNT (Wave B, D96). The account is the only identity the app has, so
 * every way in has to be honest and every way in has to be recoverable. These
 * pins hold the entry surface's four laws: no anonymous escape hatch, a
 * failed sign-in strands nobody, a duplicate address is told the truth, and
 * nothing on the way back can step past consent or required-safe data.
 */
describe('ACCOUNT: no anonymous flow (identity invariant, standing)', () => {
  test('LoginScreen offers no way in without an account', () => {
    const src = stripComments(read('screens/LoginScreen.js'));
    expect(src).not.toMatch(/[Cc]ontinue without an account/);
    expect(src).not.toMatch(/anonymous|isLocal|guest|skip sign|local user/i);
  });

  test('the entry screens still route only to a real sign-in', () => {
    const welcome = stripComments(read('screens/WelcomeScreen.js'));
    expect(welcome).toMatch(/navigation\.navigate\('Login'/);
    expect(welcome).not.toMatch(/anonymous|guest|without an account/i);
  });
});

describe('ACCOUNT: the sign-up CTA opens a sign-up form (E-1, D96)', () => {
  test('LoginScreen reads the intent param Welcome has always sent', () => {
    const src = read('screens/LoginScreen.js');
    expect(src).toMatch(/route\?\.params\?\.intent === 'pro_signup' \? 'signup' : 'signin'/);
    // And the param is still sent, so the CTA is not silently back on sign-in.
    expect(read('screens/WelcomeScreen.js')).toMatch(/navigation\.navigate\('Login', \{ intent: 'pro_signup' \}\)/);
  });

  test('"Already have an account?" still opens sign-in (no intent)', () => {
    const welcome = read('screens/WelcomeScreen.js');
    expect(welcome).toMatch(/onPress=\{\(\) => navigation\.navigate\('Login'\)\}/);
  });
});

describe('ACCOUNT: failed auth is recoverable (E-3 / E-5, D96)', () => {
  test('the forgot-password flow calls the reset helper that nothing used to call', () => {
    const src = read('screens/LoginScreen.js');
    expect(src).toMatch(/import \{[^}]*resetPassword[^}]*\} from '\.\.\/lib\/supabase'/s);
    expect(src).toMatch(/async function handleForgotPassword\(\)/);
    expect(stripComments(src)).toMatch(/await resetPassword\(e\)/);
    expect(src).toMatch(/Forgot your password\?/);
  });

  test('the reset promise stays conditional (Supabase answers unknown addresses identically)', () => {
    const src = read('screens/LoginScreen.js');
    expect(src).toMatch(/If that email has an account/);
  });

  test('a connection failure names connectivity instead of blaming credentials', () => {
    const src = stripComments(read('screens/LoginScreen.js'));
    // Every user-facing failure path routes through the shared mapping.
    expect(src).toMatch(/authErrorMessage\(result\.error\)/);
    expect(src).toMatch(/authErrorMessage\(error\)/);
    expect(src).toMatch(/authErrorMessage\(err\)/);
    // The old hard-coded fallbacks no longer stand in for a dead connection.
    expect(src).not.toMatch(/toast\.show\("That didn't go through\. Try again\."/);
    const copy = read('lib/authErrorCopy.js');
    expect(copy).toMatch(/internet connection to create an account or sign in/);
  });
});

describe('ACCOUNT: a duplicate email is told the truth (E-2 / E-8, D96)', () => {
  test('the enumeration-protection shape is read as a duplicate, not a sent email', () => {
    const src = stripComments(read('screens/LoginScreen.js'));
    expect(src).toMatch(/isDuplicateSignup\(data\)/);
    expect(read('lib/authErrorCopy.js')).toMatch(/identities\.length === 0/);
  });

  test('the confirm-email instruction persists on the form, it is not a toast', () => {
    const src = stripComments(read('screens/LoginScreen.js'));
    // The state the user has to leave the app to act on lives on screen.
    expect(src).toMatch(/setNotice\(\{ text: AUTH_COPY\.unconfirmed \}\)/);
    expect(src).toMatch(/setNotice\(\{ text: AUTH_COPY\.duplicate \}\)/);
    expect(src).not.toMatch(/toast\.show\('Check your email to confirm/);
  });

  test('LoginScreen has a visible back affordance (E-9)', () => {
    const src = read('screens/LoginScreen.js');
    expect(src).toMatch(/accessibilityLabel="Back"/);
    expect(src).toMatch(/navigation\?\.canGoBack\?\.\(\)/);
  });
});

describe('ACCOUNT: Back cannot bypass consent or required-safe data (C5-P30-01/02/05/06, D96)', () => {
  test('the wizard maps hardware Back to its own goBack only past the gated steps', () => {
    const src = read('screens/ProOnboardingScreen.js');
    expect(src).toMatch(/BackHandler\.addEventListener\('hardwareBackPress'/);
    // step > 2 steps back; steps 1-2 (account, then sex/age/height/weight)
    // return false, so the fail-closed exit stands and neither can be
    // reached past backwards.
    expect(stripComments(src)).toMatch(/if \(step > 2\) \{ goBack\(\); return true; \}\s*\n\s*return false;/);
    // goBack itself still refuses the two gated steps.
    expect(stripComments(src)).toMatch(/if \(step === 1\) return;/);
    expect(stripComments(src)).toMatch(/if \(step === 2 && accountCreated\) return;/);
  });

  test('the consent stack gains no back affordance of any kind', () => {
    const nav = stripComments(read('navigation/RootNavigator.js'));
    const start = nav.indexOf('function Article9ConsentStack()');
    const stack = nav.slice(start, nav.indexOf('function ProOnboardingStack()', start));
    expect(start).toBeGreaterThan(-1);
    expect(stack).not.toMatch(/BackHandler|goBack/);
    expect(stripComments(read('screens/Article9ConsentScreen.js'))).not.toMatch(/BackHandler/);
  });

  test('FreeStarter hardware Back mirrors its chevron instead of discarding the quiz', () => {
    const src = stripComments(read('screens/FreeStarterScreen.js'));
    expect(src).toMatch(/BackHandler\.addEventListener\('hardwareBackPress'/);
    expect(src).toMatch(/if \(step > 0\) \{ setStep\(s => s - 1\); return true; \}/);
  });
});

describe('ACCOUNT: the consent latch failsafe fails CLOSED (C5-P29-04, D96)', () => {
  test('it resolves the latch to null (the gate), and can never grant consent', () => {
    const nav = read('navigation/RootNavigator.js');
    const start = nav.indexOf('C5-P29-04 (D96)');
    const block = nav.slice(start, nav.indexOf('const bootGateResolved', start));
    expect(start).toBeGreaterThan(-1);
    expect(block).toMatch(/setHealthConsent\(null, true\)/);
    // Neither true nor false: true would grant consent nobody gave, false
    // would re-prompt a user who already consented.
    expect(block).not.toMatch(/setHealthConsent\(\s*true/);
    expect(block).not.toMatch(/setHealthConsent\(\s*false/);
    expect(block).not.toMatch(/healthConsentGranted/);
    // A landed real check always wins the race.
    expect(block).toMatch(/if \(useAppStore\.getState\(\)\.healthConsentChecked\) return;/);
  });

  test('an unresolved latch still routes a new user INTO the Article 9 gate', () => {
    // The failsafe's only escape is the gate itself, which is the existing
    // consentUnresolvedForNewUser rule (pinned in full by
    // onboardingConsentRouting.guard.test.js).
    const nav = read('navigation/RootNavigator.js');
    expect(nav).toMatch(/const consentUnresolvedForNewUser = healthConsent == null && !firstRunComplete;/);
  });
});

describe('ACCOUNT: first use never duplicates the starter plan (C5-P29-02, D96)', () => {
  test('the starter copy is idempotent by plan identity and guarded synchronously', () => {
    const src = stripComments(read('screens/FreeStarterScreen.js'));
    expect(src).toMatch(/if \(startingRef\.current\) return;/);
    expect(src).toMatch(/getAllPlansForUser\(user\.id\)/);
    expect(src).toMatch(/existingPlans\.find\(p => p\.name === recommendation\.name\)/);
    // An already-active copy is never re-activated (that restarted the block).
    expect(src).toMatch(/if \(existing\?\.isActive\)/);
  });
});

describe('ACCOUNT: the free path does not block on a display name (C5-P29-03 / C5-P1-09, D96)', () => {
  test('Continue is never disabled by the name, and the field prefills', () => {
    const src = stripComments(read('screens/FirstRunScreen.js'));
    expect(src).toMatch(/useState\(userProfile\?\.firstName \|\| ''\)/);
    expect(src).not.toMatch(/disabled=\{!hasName\}/);
    expect(src).not.toMatch(/if \(!hasName\) return;/);
    // An empty field must not write a blank over a stored name.
    expect(src).toMatch(/if \(hasName\) merged\.firstName = firstName\.trim\(\);/);
  });
});

describe('ACCOUNT: the final build survives a retry (C5-P29-07, D96)', () => {
  test('the enrolment metric and the generated plan are written once per build', () => {
    const src = stripComments(read('screens/ProOnboardingScreen.js'));
    expect(src).toMatch(/loadBuildProgress\(user\.id\)/);
    expect(src).toMatch(/if \(!priorBuild\?\.weightLoggedAt\)/);
    expect(src).toMatch(/markBuildProgress\(user\.id, \{ weightLoggedAt/);
    expect(src).toMatch(/markBuildProgress\(user\.id, \{ planId: planResult\.programmeId, planSignature \}\)/);
    // Edited answers still rebuild: reuse is keyed on the same inputs.
    expect(src).toMatch(/priorBuild\.planSignature === planSignature/);
  });
});

describe('CARDIO: no onboarding resurrection (standing boundary)', () => {
  test('onboarding and first-run surfaces carry no cardio input or promise', () => {
    for (const f of ['screens/ProOnboardingScreen.js', 'screens/FirstRunScreen.js', 'screens/FreeStarterScreen.js', 'screens/ProSetupCompleteScreen.js']) {
      expect(stripComments(read(f))).not.toMatch(/[Cc]ardio/);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────
// Wave C (D96): plan / block / Home / workout surfaces.
// ───────────────────────────────────────────────────────────────────────

// The C5-P10-03 pin runs the REAL library quiz scorer, so this file imports
// PlanLibraryScreen, which pulls the shared Button -> haptics -> expo-haptics
// chain in at import time. Same mock the other pure-builder suites use
// (recapCards.test.js); jest.mock is hoisted above the imports above.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('PLAN: activating a plan says what it does, once, on every path (C5-P10-01/05/08/10, D96)', () => {
  test('the block sentence describes the block the writer actually creates', () => {
    // C5-P11-01: derived from BLOCK_PLANNED_WEEKS, so no surface can
    // describe a block length activatePlanWithBlock does not write.
    expect(BLOCK_PLANNED_WEEKS).toBe(6);
    expect(BLOCK_DELOAD_WEEK).toBe(BLOCK_PLANNED_WEEKS);
    expect(BLOCK_START_SENTENCE).toBe(
      'This starts a six-week training block: five weeks that build, then a lighter recovery week.',
    );
    // No mesocycle jargon, no em dash (house style, lint-enforced).
    expect(BLOCK_START_SENTENCE).not.toMatch(/mesocycle|deload|MEV|MAV|MRV|RIR/i);
    expect(BLOCK_START_SENTENCE).not.toContain('—');
  });

  test('the planEngine narrative no longer derives its own week count from experience', () => {
    const src = stripComments(read('lib/planEngine.js'));
    expect(src).not.toMatch(/const weeks = \(experience === 'advanced'/);
    expect(src).toMatch(/const weeks = BLOCK_PLANNED_WEEKS;/);
  });

  test('the block writer and the narrative read the same constant', () => {
    const db = read('lib/database.js');
    expect(db).toMatch(/BLOCK_PLANNED_WEEKS, BLOCK_PLANNED_WEEKS, BLOCK_DELOAD_WEEK/);
    // The old hardcoded literals never return to the INSERT.
    expect(db).not.toMatch(/VALUES \(\?, \?, \?, \?, \?, 6, 6, 6,/);
  });

  test('every first-plan activation decision point states it', () => {
    for (const f of [
      'screens/PlanLibraryScreen.js',
      'screens/PlanDetailScreen.js',
      'screens/PlansScreen.js',
      'screens/ManualBuilderScreen.js',
    ]) {
      expect(read(f)).toContain('BLOCK_START_SENTENCE');
    }
  });

  test('activation confirms itself everywhere, so a silent one is never retried by mistake', () => {
    // C5-P10-05: the two library paths ended in a bare goBack(), visually
    // identical to "Save for later"; a user who saw no change activated a
    // second plan and silently replaced the block created seconds earlier.
    for (const f of ['screens/PlanLibraryScreen.js', 'screens/PlanDetailScreen.js', 'screens/PlansScreen.js']) {
      expect(read(f)).toMatch(/is now your active plan`, \{ variant: 'success' \}/);
    }
  });

  test('no activation path skips the mid-block confirm, so one plan/block stays one decision', () => {
    // C5-P10-10: ManualBuilder was the one path that called
    // activatePlanWithBlock without confirmPlanSwitchMidBlock.
    for (const f of [
      'screens/PlanLibraryScreen.js',
      'screens/PlanDetailScreen.js',
      'screens/PlansScreen.js',
      'screens/ManualBuilderScreen.js',
      'screens/ProGoalSetupScreen.js',
    ]) {
      expect(read(f)).toContain('confirmPlanSwitchMidBlock');
    }
  });

  test('the manual builder success CTA names the tab it opens', () => {
    // C5-P10-06: "Go to Train" navigated to HomeTab, the tab titled Today.
    const src = read('screens/ManualBuilderScreen.js');
    expect(src).toContain('title="Go to Today"');
    expect(src).not.toContain('title="Go to Train"');
  });
});

describe('PLAN: the library answers what it is asking of you (C5-P10-02/03/04/09, D96)', () => {
  const gymAdvanced = {
    id: 'p-div', name: "Men's Physique", difficulty: 2,
    tags: 'category:division division:mens_physique days:5 advanced featured goal:build_muscle',
  };
  const bodyweightStarter = {
    id: 'p-bw', name: 'Bodyweight Start', difficulty: 0,
    tags: 'full_body equipment:bodyweight home gender:all goal:build_muscle days:3 beginner',
  };

  test('a no-equipment answer never returns a full-gym plan, whatever the goal scores', () => {
    // C5-P10-03: equipment used to be a +4 score bump, which "Get on stage"
    // (+5 for a division plan) outranked, so a "Home / no equipment" user
    // was shown a five-day advanced gym plan as "our suggestion".
    const pick = getQuizRecommendation(
      { goal: 'stage_prep', equipment: 'bodyweight' },
      [gymAdvanced, bodyweightStarter],
    );
    expect(pick).toBe(bodyweightStarter);
  });

  test('an emptied pool returns null, so the screen falls through to its own no-match branch', () => {
    expect(getQuizRecommendation({ goal: 'stage_prep', equipment: 'bodyweight' }, [gymAdvanced])).toBeNull();
    expect(read('screens/PlanLibraryScreen.js')).toContain('No exact match found');
  });

  test('a full-gym answer still sees everything', () => {
    const pick = getQuizRecommendation(
      { goal: 'stage_prep', equipment: 'full_gym' },
      [gymAdvanced, bodyweightStarter],
    );
    expect(pick).toBe(gymAdvanced);
  });

  test('browse and preview render days a week and equipment from the data plans already carry', () => {
    for (const f of ['screens/PlanLibraryScreen.js', 'screens/PlanDetailScreen.js']) {
      const src = read(f);
      expect(src).toContain('getPlanDays');
      expect(src).toContain('planEquipmentLabel');
    }
  });

  test('the Pro no-plan state on Train offers the action it names', () => {
    // C5-P10-09: an inert Card naming "Start with a plan", an action with
    // no Pro affordance, beside a free branch with two working CTAs.
    const block = read('screens/PlansScreen.js');
    const start = block.indexOf('icon="barbell-outline"');
    expect(start).toBeGreaterThan(-1);
    const empty = block.slice(start, block.indexOf('{/* Folders'));
    expect(empty).toContain('generateAndSavePlan');
    expect(empty).toContain('Browse plans');
    expect(stripComments(block)).not.toContain('No active plan · Start with a plan, browse the library');
  });
});

describe('HOME: zero history has one clear next action and claims no history (C5-P12-*, D96)', () => {
  test('the block chip names what it counts, so two "N of M" lines cannot be confused', () => {
    const summary = buildReadinessSummary({
      currentMesoWeek: { isDeload: false, weekIndex: 1, plannedWeeks: 6, rirTarget: 3 },
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: null,
    });
    expect(summary.line).toBe('Block week 1 of 6 - stop 3 short of failure');
  });

  test('the top card on a zero-history Home leads to the session it names, or stops claiming to', () => {
    // C5-P12-01: the S3 variant (completed sessions <= 0) scrolled to y=0,
    // where the user already was, from the first element on the screen.
    const home = read('screens/HomeScreen.js');
    expect(home).not.toMatch(/variant === 'S3'\)\s*\{\s*\n\s*scrollRef\.current\?\.scrollTo/);
    expect(home).toMatch(/trialBanner\.variant === 'S3'\s*\n?\s*\? \(activePlan && nextWorkout \? \(\) => handleStartNextWorkout\(false\) : null\)/);
    // The card renders inert rather than as a chevroned button with nowhere
    // to go when the caller has no honest destination.
    const card = read('components/AttentionCard.js');
    expect(card).toMatch(/const Wrapper = onTrialPress \? TouchableOpacity : View;/);
    expect(card).toMatch(/\{onTrialPress \? <Ionicons name="chevron-forward"/);
  });

  test('no surface presupposes a check-in that has never happened', () => {
    // C5-P12-04: the runway's fixed title asserted a past event.
    const brief = read('components/CoachDailyBrief.js');
    expect(stripComments(brief)).not.toContain('>Since your check-in<');
    expect(brief).toMatch(/ledger\?\.title \?\? 'What your coach is reading'/);
  });

  test('the first block cannot claim personal history (standing law, re-pinned)', () => {
    const [line, ...rest] = buildBlockStartLines({
      summary: { chest: { week1: 8, peak: 14, peakWeek: 4, deload: 8, source: 'template' } },
    });
    expect(rest).toEqual([]);
    expect(line).toContain('Not enough personal history yet');
    expect(line).not.toMatch(/last block|past blocks|learned/);
  });
});

describe('WORKOUT: the first session completes honestly with no history (C5-P13-02/P15-01/P16-*/P17-03, D96)', () => {
  const AWS = read('screens/ActiveWorkoutScreen.js');

  test('the finish confirm compares against what the app seeded, not the module default', () => {
    // C5-P13-02: DEFAULT_SET.reps is 8, but a zero-history exercise seeds
    // reps from recommendedRepsMax (10/12/25/30 in the seeded plans) and
    // the carry-forward puts a number in weight after any logged set, so
    // "an unlogged set will be lost" was true in almost every real state.
    expect(stripComments(AWS)).not.toMatch(/currentSet\.reps !== DEFAULT_SET\.reps/);
    expect(AWS).toMatch(/const seed = seededEntryRef\.current;/);
    expect(AWS).toMatch(/return !!cluster\s*\n\s*\|\| !!perSide\s*\n\s*\|\| noteText\.trim\(\)\.length > 0\s*\n\s*\|\| !\(sameWeight && sameReps\);/);
    // The carry-forward is a seed, which is the state that made the claim
    // false for the rest of every session.
    expect(AWS).toMatch(/seededEntryRef\.current = \{ weight: setData\.weight, reps: setData\.actualReps \};/);
  });

  test('the honest first-lift guard keys on WORKING sets, so a warm-up never spends it', () => {
    // C5-P15-01: a 20kg warm-up used to consume the quiet "logged as your
    // starting point" acknowledgement, and the first working set ever was
    // then given the full gold record for beating it.
    expect(AWS).toMatch(/const isWorkingSetRow = \(s\) =>/);
    expect(AWS).toMatch(/\.\.\.allTimeSets\.filter\(isWorkingSetRow\)/);
    expect(AWS).toMatch(/const prs = isWeightReps && !isWarmupSet \? detectPR\(/);
    // The recorded Wave A A1 gate itself is untouched.
    expect(AWS).toMatch(/prs\.length > 0 && prHistory\.length === 0/);
    // And the live record line reads the same history shape (D87 contract).
    expect(AWS).toMatch(/historySets: \[\.\.\.allTimeSets, \.\.\.loggedSets\]\.filter\(isWorkingSetRow\)/);
  });

  test('the summary states a week in progress instead of a finished-week verdict', () => {
    // C5-P16-01: after session one of a four-session week every muscle read
    // "Below target" and was told to add sets its own plan already covers.
    const src = read('screens/WorkoutSummaryScreen.js');
    expect(src).toContain('Week in progress: {weekProgress.logged} of {weekProgress.planned} sessions logged.');
    expect(src).toMatch(/const insight = weekJudgeable \? getVolumeInsight\(/);
    expect(src).toMatch(/const why = weekJudgeable \? getVolumeWhy\(/);
    // getVolumeStatus, the landmarks and the colours are untouched.
    expect(src).toMatch(/const \{ label, status \} = getVolumeStatus\(data\.workingSets, muscle, landmarkResolution\?\.table\);/);
  });

  test('the first summary answers what happens next, and says why feedback is asked before asking', () => {
    const src = read('screens/WorkoutSummaryScreen.js');
    expect(src).toContain('Next up: {nextSessionName}. It is ready on Today whenever you are.');
    // C5-P17-03: the purpose sentence renders OUTSIDE the expander.
    const card = src.slice(src.indexOf('Workout feedback'), src.indexOf('{feedbackExpanded &&'));
    expect(card).toContain('Your answers shape how your recovery is read');
  });
});

describe('BLOCK: the first block explains itself and never advances on its own (C5-P11-*, FB-*, D96)', () => {
  test('block start explains build then recovery, and that nothing rolls over', () => {
    const sheet = read('components/HomeBlockShapeSheet.js');
    expect(sheet).toMatch(/When the block finishes, you choose what comes next; nothing starts on its own/);
    // C5-P11-06: the definition is read before the provenance lines.
    expect(sheet.indexOf('GLOSSARY.mesocycle')).toBeLessThan(sheet.indexOf('seedLines.map'));
    // C5-P11-07: the countdown carries its unit noun.
    expect(read('components/BlockShapeCard.js')).toMatch(/Recovery week in \$\{weeksToRecovery\} \$\{weeksToRecovery === 1 \? 'week' : 'weeks'\}/);
  });

  test('nothing describes a block as an optional layer the user configures', () => {
    // C5-P11-03: the Train side's only block definition described controls
    // (start date, duration, recovery week) that do not exist.
    const src = stripComments(read('screens/MesocycleBuilderScreen.js'));
    expect(src).not.toMatch(/optional layer you add on top/);
    expect(src).not.toMatch(/Set a start date,\s*\n?\s*duration and recovery week/);
    expect(src).toMatch(/Nothing rolls into a new block on its own/);
    // FB-20: and it no longer promises the block moves to Past blocks the
    // moment the last week completes.
    expect(src).not.toMatch(/the block closes and moves to Past blocks below/);
  });

  test('block completion does not auto-transition (FB-34/35 mechanisms stay intact)', () => {
    // The four FB-34 mechanisms, unchanged by this wave: a terminal
    // awaiting-decision state, one block writer, an explicit confirm in
    // front of it, and the re-entry guard FB-35 depends on.
    expect(read('lib/mesocycle.js')).toMatch(/completed_awaiting_decision/);
    const plans = read('screens/PlansScreen.js');
    expect(plans).toMatch(/if \(restartingRef\.current\) return;/);
    expect(plans).toMatch(/appAlert\(\s*\n?\s*isAdjust \? 'Start your next block\?' : 'Run this plan again\?'/);
    expect(read('lib/blockAdvisor.js')).not.toMatch(/autoStart|automaticTransition/);
    // The suggestion banner is suppressed inside a scheduled recovery week
    // (FB-02), a display gate only -- shouldDeload is untouched.
    const home = read('screens/HomeScreen.js');
    expect(home).toMatch(/const inScheduledRecovery = !!currentMesoWeek\?\.isDeload \|\| !!currentMesoWeek\?\.awaitingDecision;/);
    expect(home).toMatch(/deloadBannerEligible = !!deloadSuggestion && !deloadDismissed && !inScheduledRecovery/);
  });

  test('"Block finished" fires on the finished state, once, not on every recovery-week session', () => {
    // FB-03: weekIndex >= plannedWeeks && !awaitingDecision IS the recovery
    // week itself, and the effect had no once-only guard.
    const src = read('screens/WorkoutSummaryScreen.js');
    expect(stripComments(src)).not.toMatch(/wk\.weekIndex >= wk\.plannedWeeks && !wk\.awaitingDecision/);
    expect(src).toMatch(/if \(wk\.mesocycleId && wk\.awaitingDecision\)/);
    expect(src).toMatch(/@volyume_block_finished_seen_\$\{wk\.mesocycleId\}/);
  });

  test('the finished block\'s summary is reachable during the decision window', () => {
    // FB-15: a finished block keeps is_active = 1 until the NEXT block is
    // created, so it was in neither Past blocks nor the summary button.
    const src = read('screens/MesocycleBuilderScreen.js');
    expect(src).toMatch(/\{finished && \(\s*\n\s*<Button\s*\n\s*title="View block summary"/);
    // And at the decision itself, where the summary is what informs it.
    const plans = read('screens/PlansScreen.js');
    expect(plans).toMatch(/blockAdvice\.action === 'post_recovery' && activeBlockId/);
    expect(plans).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'BlockReflection', \{ mesocycleId: activeBlockId \}\)/);
  });

  test('block bests are labelled as bests, and the progress figure compares like for like', () => {
    // FB-16 / FB-17.
    const reflection = read('screens/BlockReflectionScreen.js');
    expect(reflection).toContain('Your best estimated max per lift');
    expect(reflection).not.toContain('Records set this block');
    const db = read('lib/database.js');
    expect(db).toMatch(/const lastAccumWeek = Number\.isFinite\(deloadWeek\) && deloadWeek > 1/);
    expect(stripComments(db)).not.toMatch(/const lastWeekCutoff = endMs - 7 \* 86400000;/);
  });

  test('the two next-block confirms describe their own actions, and the repeat label says repeat', () => {
    // FB-26 / FB-32 (copy only: no branch logic, no tier reachability, and
    // the two options are still never rendered side by side -- that is FQ-2).
    const advisor = read('lib/blockAdvisor.js');
    expect(advisor).toContain("actionLabel: 'Run this plan again, unchanged'");
    const plans = read('screens/PlansScreen.js');
    expect(plans).toMatch(/The weekly set targets start from what your last block showed/);
    expect(plans).toMatch(/the same set targets as last time/);
    // The seed mapping is untouched.
    expect(plans).toMatch(/const seedIntent = intent === 'adjust' \? 'adjust' : 'repeat';/);
  });

  test('continuing with adjustments leaves a receipt naming what changed and what held', () => {
    // FB-24 / FB-27: composed from the seed ranges and the stored ledger,
    // so it can only describe what the write actually did.
    const receipt = buildSeedReceipt({
      ranges: {
        back: { startSets: 11, peakSets: 16, source: 'ledger' },
        chest: { startSets: 6, peakSets: 14, source: 'ledger' },
        biceps: { startSets: 6, peakSets: 12, source: 'ledger' },
      },
      ledger: {
        entries: [
          { muscle: 'back', observed: { startSets: 10, plannedPeak: 16 }, rationale: 'Back responded well.' },
          { muscle: 'chest', observed: { startSets: 6, plannedPeak: 14 }, rationale: 'Chest responded well at this dose.' },
          { muscle: 'biceps', observed: { startSets: 6, plannedPeak: 14 }, rationale: 'Biceps recovery cost ran high.' },
        ],
      },
    });
    expect(receipt.changed.map((r) => r.muscle).sort()).toEqual(['back', 'biceps']);
    expect(receipt.changed.find((r) => r.muscle === 'back').change).toContain('week 1 up from 10 to 11 sets');
    expect(receipt.changed.find((r) => r.muscle === 'biceps').change).toContain('peak down from 14 to 12 sets');
    expect(receipt.changed[0].rationale).toBeTruthy();
    expect(receipt.held).toBe(1);
    expect(receipt.heldLine).toMatch(/Keeping a dose that worked is a decision too/);
    expect(read('screens/PlansScreen.js')).toContain('buildSeedReceipt');
  });

  test('the block-start lines lead with what moved, say holding was a decision, and name the research remainder', () => {
    // FB-25 / FB-27 / FB-28: sorting by peak buried the only muscle whose
    // peak came down, and twelve research-seeded muscles were silent inside
    // a personalised-looking list.
    const lines = buildBlockStartLines({
      summary: {
        back: { week1: 11, peak: 16, peakWeek: 4, deload: 10, source: 'seed_ledger' },
        chest: { week1: 6, peak: 14, peakWeek: 4, deload: 6, source: 'seed_ledger' },
        biceps: { week1: 6, peak: 12, peakWeek: 4, deload: 6, source: 'seed_ledger' },
        quads: { week1: 8, peak: 14, peakWeek: 4, deload: 8, source: 'seed_profile' },
      },
      limit: 2,
      previous: {
        back: { startSets: 10, peakSets: 16 },
        chest: { startSets: 6, peakSets: 14 },
        biceps: { startSets: 6, peakSets: 14 },
      },
    });
    const joined = lines.join(' | ');
    expect(joined).toContain('Biceps');   // the reduced peak is no longer dropped
    expect(joined).toContain('Back');
    expect(joined).not.toContain('Chest'); // unchanged sorts last
    expect(joined).toContain('up from 10 in week 1');
    expect(joined).toContain('Plus 1 more muscle group, set the same way.');
    expect(joined).toContain('The rest still start from research-based guidance');
    // A retained muscle, when it is shown, states the retention.
    const held = buildBlockStartLines({
      summary: { chest: { week1: 6, peak: 14, peakWeek: 4, deload: 6, source: 'seed_ledger' } },
      previous: { chest: { startSets: 6, peakSets: 14 } },
    });
    expect(held[0]).toContain('kept where it was');
  });

  test('the recovery week is not reported back as a problem, and the coach card knows which week it is in', () => {
    // FB-05 / FB-06.
    const aws = read('screens/ActiveWorkoutScreen.js');
    const pill = aws.slice(aws.indexOf('Dismiss recovery week banner'));
    expect(pill.slice(0, 600)).toContain('>Got it<');
    const coach = read('screens/CoachOutputScreen.js');
    expect(coach).toMatch(/const upwardInRecovery = signal > 0 && currentWeekIsDeload;/);
    expect(coach).toContain('This is your recovery week, so nothing is added to it. Volume changes start again with your next block.');
  });

  test('the peak-week warning is reachable in the week it is true', () => {
    // FB-04: the advisor composed it and no screen ever rendered it.
    const plans = read('screens/PlansScreen.js');
    expect(plans).toMatch(/const showPeakWeekNote = blockAdvice\?\.action === 'continue'/);
    expect(plans).toMatch(/blockAdvice\?\.action === 'continue' && showPeakWeekNote/);
    expect(read('lib/blockAdvisor.js')).toContain("One more week before your recovery week");
  });

  test('the block story ends where the decision is, not with an instruction to recover again', () => {
    // FB-23.
    const story = read('screens/YearOfLiftsScreen.js');
    expect(story).toContain('That block is done, recovery week included.');
    expect(story).not.toContain('Recover well, then go again.');
    expect(story).not.toContain('Your full block summary is inside.');
  });

  test('no wave C copy reintroduces block jargon', () => {
    for (const f of [
      'components/HomeBlockShapeSheet.js',
      'components/BlockShapeCard.js',
      'screens/MesocycleBuilderScreen.js',
      'screens/BlockReflectionScreen.js',
    ]) {
      const src = stripComments(read(f));
      // Identifiers, module paths and props may carry the words; the
      // strings the user reads may not. Import specifiers are the one
      // legitimate literal use of the module name.
      const literals = (src.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [])
        .filter((l) => !l.includes('/mesocycle'));
      for (const literal of literals) {
        expect(literal).not.toMatch(/\b(mesocycle|periodisation|hypertrophy|deload)\b/i);
      }
    }
  });
});
