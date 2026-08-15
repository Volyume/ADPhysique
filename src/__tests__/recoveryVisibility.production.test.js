/**
 * recoveryVisibility.production.test.js — Campaign 18 recovery-visibility
 * amendment, the completion law.
 *
 * "MODULE EXISTS != DELIVERED. HELPER EXISTS != DELIVERED. TEST PASSES !=
 * DELIVERED. A banner backed by a separately invented UI boolean is not
 * sufficient."
 *
 * So this suite walks BOTH production chains and refuses to accept any surface
 * that re-derives the state for itself:
 *
 *   A. block lifecycle -> recovery prescription -> resolver -> Home/Today ->
 *      next workout -> Train -> review / notification -> state end
 *   B. recovery evidence -> adaptive reduction -> resolver -> Home/Today ->
 *      next workout -> Train -> notification policy -> state resolves
 *
 * The strings themselves are rendered and read in
 * components/__tests__/RecoveryStateCard.test.js and pinned in
 * lib/__tests__/recoveryState.test.js. What this suite adds is the WIRING:
 * that one resolver feeds every surface, and that no surface can disagree
 * because none of them derive the state independently.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  RECOVERY_STATE, resolveRecoveryState, recoveryStateCard,
  nextWorkoutRecoveryLabel, trainRecoveryDetail, reviewRecoveryLine,
  describePrescriptionDifferences,
} from '../lib/recoveryState';
import { generateDeloadPrescription } from '../lib/algorithms';
import { BLOCK_PLANNED_WEEKS, BLOCK_DELOAD_WEEK } from '../lib/mesocycle';

const read = (p) => readFileSync(resolve(__dirname, '..', p), 'utf8');

const state = (weekIndex, over = {}) => resolveRecoveryState({
  weekIndex,
  plannedWeeks: BLOCK_PLANNED_WEEKS,
  deloadWeek: BLOCK_DELOAD_WEEK,
  isDeload: weekIndex === BLOCK_DELOAD_WEEK,
  ...over,
});

const PLANNED = state(BLOCK_DELOAD_WEEK);
const ADAPTIVE = state(3, { isDeload: true });
const NORMAL = state(2);

describe('ONE AUTHORITATIVE STATE, composed where the block is read', () => {
  test('THE PROVENANCE IS NO LONGER COLLAPSED: the reader returns deloadWeek beside the flag', () => {
    const db = read('lib/database.js');
    // getCurrentMesocycleWeek is the single date-based resolver every consumer
    // already used; it returned is_deload and NOT the block's own recovery
    // position, which is precisely why WHY was lost.
    expect(db).toMatch(/const deloadWeek = meso\.deloadWeek \?\? null;/);
    expect(db).toMatch(/recoveryState: resolveRecoveryState\(\{/);
    expect(db).toMatch(/deloadWeek,\n\s*isDeload: row\.is_deload === 1,\n\s*awaitingDecision,/);
  });

  test('and the resolver reads nothing but the block, so it cannot invent a reason', () => {
    const src = read('lib/recoveryState.js');
    // No check-in, no soreness, no set counts, no clock: this recovers
    // provenance, it does not decide anything.
    expect(src).not.toMatch(/checkin|soreness|energyScore|Date\.now|recoveryScore/i);
    expect(src).not.toMatch(/import .* from/);
  });

  test('POSITION OUTRANKS THE FLAG, so the two states are genuinely distinguishable', () => {
    expect(PLANNED.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
    expect(ADAPTIVE.state).toBe(RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT);
    expect(NORMAL.state).toBe(RECOVERY_STATE.NORMAL_ACCUMULATION);
    // Same flag value on both lighter states. Before this, that was the whole
    // of what any surface could see.
    expect(PLANNED.because).not.toBe(ADAPTIVE.because);
  });
});

describe('CHAIN A + B: HOME / TODAY, the primary fix', () => {
  const home = read('screens/HomeScreen.js');

  test('Home renders the card from the resolved state, not from a UI boolean of its own', () => {
    expect(home).toMatch(/<RecoveryStateCard\s*\n\s*recoveryState=\{currentMesoWeek\?\.recoveryState\}/);
    // No parallel truth: Home does not decide the state anywhere.
    expect(home).not.toMatch(/isRecoveryWeek\s*=|setIsRecoveryWeek/);
  });

  test('THE NEXT-WORKOUT SURFACE names the state too, from the same resolver', () => {
    expect(home).toMatch(/const recoveryLabel = nextWorkoutRecoveryLabel\(currentMesoWeek\?\.recoveryState\)/);
    expect(home).toMatch(/recoveryLabel \? `\$\{recoveryLabel\} · \$\{planProgress\}` : planProgress/);
    expect(nextWorkoutRecoveryLabel(PLANNED)).toBe('Recovery week');
    expect(nextWorkoutRecoveryLabel(ADAPTIVE)).toBe('Recovery-adjusted');
    expect(nextWorkoutRecoveryLabel(NORMAL)).toBeNull();
  });

  test('THE CARD IS NOT DISMISSIBLE: reading it compacts it, and the state ends with the lifecycle', () => {
    // The read marker is keyed by block AND state, so a later adaptive
    // reduction or the next block's recovery week opens expanded again.
    expect(home).toMatch(/@volyume_recovery_read_\$\{userId\}_\$\{mesocycleId\}_\$\{state\}/);
    expect(home).toMatch(/expanded=\{!recoveryRead\}/);
    // And nothing keys the card's VISIBILITY on that marker.
    expect(home).not.toMatch(/recoveryRead &&\s*<RecoveryStateCard/);
    expect(recoveryStateCard(NORMAL)).toBeNull();
    expect(recoveryStateCard(state(BLOCK_DELOAD_WEEK, { awaitingDecision: true }))).toBeNull();
  });

  test('the deload SUGGESTION banner still defers to the block, now on the block\'s own position', () => {
    expect(home).toMatch(/currentMesoWeek\?\.recoveryState\?\.recoveryWeek/);
  });
});

describe('CHAIN A + B: TRAIN, now a detail surface rather than the only one', () => {
  const train = read('screens/ActiveWorkoutScreen.js');

  test('Train consumes the SAME resolved state', () => {
    expect(train).toMatch(/setRecoveryState\(currentWeek\.recoveryState \?\? null\)/);
    expect(train).toMatch(/nextWorkoutRecoveryLabel\(recoveryState\)/);
    expect(train).toMatch(/trainRecoveryDetail\(recoveryState, recoveryDifferences\)/);
  });

  test('THE BANNER NO LONGER CALLS BOTH STATES A RECOVERY WEEK', () => {
    // The defect: one title for two meanings, so a week-three athlete easing
    // off was told the hard part of their block had finished.
    expect(train).toMatch(/\? 'Recovery-adjusted session'\s*\n\s*: 'Recovery week'/);
    expect(trainRecoveryDetail(ADAPTIVE, [])).toMatch(/^Recovery-adjusted session\./);
    expect(trainRecoveryDetail(ADAPTIVE, [])).not.toMatch(/recovery week/i);
  });

  test('WHAT IS DIFFERENT is measured off the REAL prescription, never asserted', () => {
    // The actual first-half recovery prescription: week-1 load kept, reps
    // halved, RIR 4. So "lighter loads" would be FALSE on it, and the
    // describer must not say it.
    const week1 = [
      { weight: 100, actualReps: 10, rir: 1, setType: 'straight' },
      { weight: 100, actualReps: 10, rir: 1, setType: 'straight' },
    ];
    const prescribed = generateDeloadPrescription(week1, true);
    const differences = describePrescriptionDifferences(week1, prescribed);
    expect(differences).toEqual(['fewer reps per set', 'easier effort targets']);
    expect(differences).not.toContain('lighter loads');
    expect(differences).not.toContain('fewer working sets');
    expect(train).toMatch(/describePrescriptionDifferences\(week1Sets, deloadTargets\)/);
  });

  test('and no percentage or internal multiplier reaches the athlete', () => {
    for (const s of [PLANNED, ADAPTIVE]) {
      const line = trainRecoveryDetail(s, ['fewer reps per set', 'easier effort targets']);
      expect(line).not.toMatch(/\d+\s?%|multiplier|peak volume|MEV|MRV/i);
    }
  });
});

describe('CHAIN A + B: THE REVIEW', () => {
  const coachOutput = read('screens/CoachOutputScreen.js');

  test('the weekly review reads the resolved state rather than the bare flag', () => {
    expect(coachOutput).toMatch(/setCurrentRecoveryState\(cur\?\.recoveryState \?\? null\)/);
    // And it renders the SHARED sentence rather than a local paraphrase, so
    // this review cannot describe the state differently from Home or Train.
    expect(coachOutput).toMatch(/const recoveryReviewLine = reviewRecoveryLine\(currentRecoveryState\);/);
    expect(coachOutput).toMatch(/Nothing is added this week\. \$\{recoveryReviewLine/);
  });

  test('SCREEN CONSISTENCY: a mid-block adjustment is not called a recovery week here either', () => {
    // The forbidden pair the amendment names: Home saying one thing while
    // another surface says "Week 4, hard progression" or "your recovery week".
    expect(reviewRecoveryLine(ADAPTIVE))
      .toBe('Training is being held back at the moment while your recovery catches up. Your recovery week still comes at the end of the block as planned.');
    expect(reviewRecoveryLine(ADAPTIVE)).not.toMatch(/you are in your recovery week/i);
    expect(reviewRecoveryLine(PLANNED)).toMatch(/You are in your recovery week/);
  });

  test('and the review warns the recovery week is next only when it genuinely is', () => {
    expect(reviewRecoveryLine(state(BLOCK_DELOAD_WEEK - 1)))
      .toBe('Next is your recovery week. Training will be lighter before you move on from this block.');
    expect(reviewRecoveryLine(NORMAL)).toBeNull();
    // No false promise of an automatic next block.
    expect(reviewRecoveryLine(PLANNED)).toContain('you will choose what comes next');
  });
});

describe('THE NOTIFICATION: one, from the real transition, and never required', () => {
  const scheduler = read('lib/notifications/scheduler.js');

  test('it fires from the RESOLVED PLANNED state, never from a calendar', () => {
    expect(scheduler).toMatch(/if \(recoveryState\?\.state !== RECOVERY_STATE\.PLANNED_BLOCK_RECOVERY\) return;/);
    const fn = scheduler.slice(
      scheduler.indexOf('export async function notifyRecoveryWeekStarted'),
      scheduler.indexOf('export async function cancelBlockReadyToReview'),
    );
    expect(fn).not.toMatch(/weekday|getDay\(\)|Monday/i);
  });

  test('ONCE PER BLOCK, and the marker is only written after it is genuinely laid', () => {
    const fn = scheduler.slice(
      scheduler.indexOf('export async function notifyRecoveryWeekStarted'),
      scheduler.indexOf('export async function cancelBlockReadyToReview'),
    );
    expect(fn).toMatch(/RECOVERY_WEEK_NOTIFIED_KEY\(userId, mesocycleId\)/);
    expect(fn).toMatch(/if \(already\) return;/);
    expect(fn.indexOf('scheduleNotificationAsync')).toBeLessThan(fn.indexOf("AsyncStorage.setItem(key, '1')"));
  });

  test('every existing attention control still governs it', () => {
    const fn = scheduler.slice(
      scheduler.indexOf('export async function notifyRecoveryWeekStarted'),
      scheduler.indexOf('export async function cancelBlockReadyToReview'),
    );
    expect(fn).toMatch(/isCategoryEnabled\(CATEGORY\.WEEKLY_COACH_READY\)/);
    expect(fn).toMatch(/getQuietHours\(\)/);
    expect(fn).toMatch(/requestEventPushSlot\(/);
    expect(fn).toMatch(/if \(!slot\.allowed\) return;/);
  });

  test('NO NEW CATEGORY: it shares the coaching category the athlete already controls', () => {
    expect(read('lib/notifications/categories.js'))
      .toMatch(/case 'recovery_week_started': return CATEGORY\.WEEKLY_COACH_READY;/);
  });

  test('NO NOTIFICATION DEPENDENCY: Home calls it best-effort and never waits on it', () => {
    const home = read('screens/HomeScreen.js');
    expect(home).toMatch(/notifyRecoveryWeekStarted\(user\.id, week\.recoveryState, week\.mesocycleId\)\s*\n\s*\.catch\(\(\) => \{\}\)/);
  });

  test('the adaptive state sends nothing: Home carries it instead', () => {
    const fn = read('lib/notifications/scheduler.js').slice(
      read('lib/notifications/scheduler.js').indexOf('export async function notifyRecoveryWeekStarted'),
    );
    expect(fn).not.toMatch(/ADAPTIVE_RECOVERY_ADJUSTMENT[^)]*\)\s*\{[^}]*scheduleNotificationAsync/);
    expect(recoveryStateCard(ADAPTIVE)).toBeTruthy();
  });
});

describe('NO SURFACE INVENTS ITS OWN RECOVERY TRUTH', () => {
  const surfaces = [
    'screens/HomeScreen.js',
    'screens/ActiveWorkoutScreen.js',
    'screens/CoachOutputScreen.js',
    'components/RecoveryStateCard.js',
  ];

  test('every user-facing recovery title comes from recoveryState, not from a local rule', () => {
    for (const file of surfaces) {
      const src = read(file);
      // A surface may still READ isDeload for prescription work, but none of
      // them may turn it into the state word on their own.
      expect(src).not.toMatch(/isDeload \?\s*'Recovery week'/);
      expect(src).not.toMatch(/weekIndex === (5|6)/);
    }
  });

  test('and no surface hard-codes the block length in its recovery copy', () => {
    for (const file of [...surfaces, 'lib/recoveryState.js']) {
      const src = read(file);
      expect(src).not.toMatch(/(five|four|six) hard weeks/i);
    }
  });
});
