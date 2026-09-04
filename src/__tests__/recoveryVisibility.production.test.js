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
    expect(home).toMatch(/<RecoveryStateCard\s*\n\s*recoveryState=\{gatedRecoveryState\}/);
    // C18 block progression: the state Home renders is the GATED one, so a
    // recovery week cannot appear while a required session is outstanding.
    expect(home).toMatch(/const gatedRecoveryState = programmePosition\?\.recoveryState/);
    // No parallel truth: Home does not decide the state anywhere.
    expect(home).not.toMatch(/isRecoveryWeek\s*=|setIsRecoveryWeek/);
  });

  test('THE NEXT-WORKOUT SURFACE names the state too, from the same resolver', () => {
    expect(home).toMatch(/const recoveryLabel = nextWorkoutRecoveryLabel\(gatedRecoveryState\)/);
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

  // RE-PINNED (Campaign 22 Phase 2 Stage 1): the "your block already has a
  // recovery week scheduled at week N" addendum this pinned
  // (scheduledRecoveryWeekIndex, built from currentMesoWeek?.recoveryState?.
  // recoveryWeek) was display-only extra colour on the old two-line banner;
  // the new Today line idiom is ONE sentence (spec §17 R2), and the
  // addendum did not survive the compression. The underlying suggestion,
  // its eligibility gate and its CoachReview tap-through (where the block's
  // own recovery position is still shown) are unchanged -- this test now
  // pins that persistence instead of the retired addendum string.
  test('the deload SUGGESTION banner still defers to the block via its unchanged eligibility gate', () => {
    expect(home).toMatch(/const inScheduledRecovery = !!currentMesoWeek\?\.isDeload \|\| !!currentMesoWeek\?\.awaitingDecision;/);
    expect(home).toMatch(/const deloadBannerEligible = !!deloadSuggestion && !deloadDismissed && !inScheduledRecovery;/);
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
    expect(trainRecoveryDetail(ADAPTIVE, [])).toMatch(/^This session is recovery-adjusted/);
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
    expect(coachOutput).toMatch(/setCurrentRecoveryState\(pos\?\.recoveryState \?\? cur\?\.recoveryState \?\? null\)/);
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

describe('THE REDUNDANT RECOVERY PUSH IS REMOVED (founder ruling)', () => {
  test('no scheduler, no route, no category, no marker survives it', () => {
    // It could only ever run from HomeScreen.loadBlockProgress, so it could
    // not reach the athlete before they opened Home - and once Home is open
    // the card already says it. A local push fired while the user is looking
    // at the card is redundant, and a background scheduler for one
    // notification is not worth building.
    expect(read('lib/notifications/scheduler.js')).not.toMatch(/notifyRecoveryWeekStarted|recovery_week/);
    expect(read('lib/notifications/notificationRoute.js')).not.toMatch(/recovery_week_started/);
    expect(read('lib/notifications/categories.js')).not.toMatch(/recovery_week_started/);
    expect(read('screens/HomeScreen.js')).not.toMatch(/notifyRecoveryWeekStarted/);
  });

  test('and ordinary coaching notifications are undisturbed', () => {
    const scheduler = read('lib/notifications/scheduler.js');
    expect(scheduler).toMatch(/export async function scheduleBlockReadyToReview/);
    expect(read('lib/notifications/categories.js'))
      .toMatch(/case 'block_ready_to_review': return CATEGORY\.WEEKLY_COACH_READY;/);
  });

  test('IN-APP CARRIES IT ALL: the card is the delivery mechanism', () => {
    expect(recoveryStateCard(PLANNED).title).toBe('Recovery week');
    expect(recoveryStateCard(ADAPTIVE).title).toBe('Training is lighter for now');
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
