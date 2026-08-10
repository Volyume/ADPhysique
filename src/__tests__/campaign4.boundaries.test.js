/**
 * campaign4.boundaries.test.js — Campaign 4 (D95) product-boundary
 * regression suite.
 *
 * Pins the founder's permanent boundaries so no future change can
 * quietly reintroduce a removed or rejected surface. Behavioural pins
 * run the REAL engine; static pins are named-file/named-symbol checks
 * with deliberate allowlists — decision docs, historical migrations,
 * steps/activity code, retained compatibility schema and precedent
 * comments are all legitimate and must never trip these guards.
 */
import fs from 'fs';
import path from 'path';
import { runWeeklyCoach } from '../lib/weeklyCoach';

const SRC = (p) => path.join(__dirname, '..', p);
const read = (p) => fs.readFileSync(SRC(p), 'utf8');
const exists = (p) => fs.existsSync(SRC(p));
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const DAY = 24 * 60 * 60 * 1000;
function cutTrend(startKg, count = 14) {
  const out = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    out.push({ loggedAt: now - (count - 1 - i) * DAY, weightKg: startKg });
  }
  return out;
}

describe('CARDIO: logging is not part of Volyume (founder ruling, D92-1/D95)', () => {
  test('BEHAVIOURAL: a stalled cut with steps at the ceiling produces calorie/step coaching and NO cardio anything', () => {
    const out = runWeeklyCoach({
      checkin: {
        weekStart: Date.now() - 7 * DAY,
        energyScore: 4, sorenessScore: 2, stressScore: 2, sleepHours: 7.5,
        calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit',
        jointPain: false, soreMuscles: null, notes: null,
      },
      morningWeights: cutTrend(85),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_cut', trainingGoal: 'build_muscle', weeksInPhase: 4,
      consecutiveOffTargetWeeks: 3, consecutivePoorRecoveryWeeks: 0,
      lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
      currentCalTarget: 2400, currentStepsTarget: 15000,
      bodyweightKg: 85, units: 'kg',
    });
    // The engine still coaches the levers that exist...
    expect(out.adjustments.training).toBeDefined();
    expect('calories' in out.adjustments).toBe(true);
    expect('steps' in out.adjustments).toBe(true);
    // ...and emits NOTHING cardio-shaped, on the exact fixture that used
    // to fire the cardio prescription (cut + off-target + steps maxed).
    expect('cardio' in out.adjustments).toBe(false);
    expect('cardioFlag' in out).toBe(false);
    expect('cardioAcknowledgement' in out).toBe(false);
  });

  test('the engine and coach screen carry no cardio prescription path', () => {
    expect(stripComments(read('lib/weeklyCoach.js'))).not.toMatch(/cardioAdjustment|cutCardioTarget|nextCardioTarget|cardioRecoveryFlag/);
    expect(stripComments(read('screens/CoachOutputScreen.js'))).not.toMatch(/handleApplyCardio|onApplyCardio|cardioFlag|cardioAcknowledgement/);
  });

  test('no cardio logging screens or routes exist', () => {
    expect(exists('screens/LogCardioScreen.js')).toBe(false);
    expect(exists('screens/CardioHistoryScreen.js')).toBe(false);
    expect(stripComments(read('navigation/RootNavigator.js'))).not.toMatch(/LogCardio|CardioHistory/);
  });

  test('no cardio toggle, entry point or Pro promise survives', () => {
    expect(stripComments(read('screens/SettingsCoachingScreen.js'))).not.toMatch(/[Cc]ardio logging/);
    expect(stripComments(read('screens/YouScreen.js'))).not.toMatch(/Log cardio/);
    expect(stripComments(read('components/ProGate.js'))).not.toMatch(/[Cc]ardio/);
    expect(stripComments(read('screens/SettingsFaqScreen.js'))).not.toMatch(/cardio logging/i);
  });

  test('the legitimate steps/activity and health systems SURVIVE', () => {
    // Removing cardio logging must never take general activity with it.
    expect(exists('lib/activitySteps.js')).toBe(true);
    expect(read('lib/weeklyCoach.js')).toMatch(/stepsAdjustment/);
    expect(read('lib/nutritionEngine.js')).toMatch(/computeStepTrendModifier/);
    // Historical data compatibility stays: schema + wipe + per-row erasure.
    expect(read('lib/database.js')).toMatch(/cardio_log/);
    expect(read('lib/database/activity.js')).toMatch(/deleteCardioLog/);
  });
});

describe('AI / determinism', () => {
  test('no LLM coaching path: the engine imports no network or AI client', () => {
    const src = read('lib/weeklyCoach.js');
    expect(src).not.toMatch(/fetch\(|axios|openai|anthropic|llm/i);
  });
});

describe('BLOCKS and EXERCISES: never automatic', () => {
  test('block transition remains a user decision (advisor labels, no auto-start)', () => {
    const src = stripComments(read('lib/blockAdvisor.js'));
    expect(src).not.toMatch(/autoStart|automaticTransition/);
    expect(read('components/BlockShapeCard.js')).toMatch(/until you choose what comes next/);
  });
  test('no automatic exercise substitution', () => {
    expect(stripComments(read('lib/swapEngine.js'))).not.toMatch(/autoSwap|autoSubstitute/);
  });
});

describe('REVERTED / REJECTED surfaces stay gone', () => {
  test('the flat timeline diary stays reverted (D37); meal cards are canonical', () => {
    expect(exists('lib/food/diaryTimeline.js')).toBe(false);
    expect(exists('components/food/MealSection.js')).toBe(true);
  });
  test('the plate calculator stays deleted (D14/D57)', () => {
    expect(exists('lib/plateMath.js')).toBe(false);
  });
  test('the per-set RIR picker remains removed (D14/D19)', () => {
    expect(stripComments(read('components/SetEntry.js'))).not.toMatch(/rirPicker|RIR picker|setRir\(/);
  });
});

describe('PEAK WEEK: no user feature, held migration, live compatibility', () => {
  test('migration 049 exists unapplied and the contest countdown consumers stay live', () => {
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'supabase/migrate_049_drop_peak_week_plans.sql'))).toBe(true);
    // The B4 contest countdown is the LIVE consumer of peak_week_plans -
    // deleting these would strand shipping screens (AUDIT-PEAKWEEK-SYNC).
    expect(read('screens/ProGoalSetupScreen.js')).toMatch(/getActivePeakWeekPlan/);
  });
});

describe('BILLING and ED: untouched', () => {
  test('product IDs unchanged', () => {
    const src = read('lib/payments/catalogue.js');
    expect(src).toMatch(/pro_monthly/);
    expect(src).toMatch(/pro_annual/);
  });
  test('the calorie floors stay canonical and sacred', () => {
    const src = read('lib/nutritionEngine.js');
    expect(src).toMatch(/kcalFloorForSex/);
    expect(src).toMatch(/sex === 'female' \? 1200 : 1500/);
  });
});
