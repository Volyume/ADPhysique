/**
 * recoveryState.test.js — Campaign 18 recovery-visibility amendment.
 *
 * THE DEFECT. `mesocycle_weeks.is_deload` carried two different meanings -
 * "this is the block's planned recovery week" and "recovery evidence made us
 * ease off mid-block" - and every surface downstream could only say a generic
 * "deload". The block's own `deload_week` is what tells them apart, and it was
 * never returned beside the flag.
 *
 * WHAT THIS SUITE PINS. That the two states are distinguishable from the facts
 * the app already persists, that the structural recovery week is never
 * explained by recovery evidence, that an adaptive reduction is never called a
 * recovery week, and that no week number is baked into either the logic or the
 * copy.
 *
 * The founder's adversarial cases are numbered as given.
 */
import {
  RECOVERY_STATE, resolveRecoveryState, plannedRecoveryWeek,
  isLighterTrainingState, recoveryStateCard, nextWorkoutRecoveryLabel,
  trainRecoveryDetail, reviewRecoveryLine,
} from '../recoveryState';
import { BLOCK_PLANNED_WEEKS, BLOCK_DELOAD_WEEK } from '../mesocycle';

/** The block the app actually creates today: 5 accumulation + 1 recovery. */
const block = (weekIndex, over = {}) => ({
  weekIndex,
  plannedWeeks: BLOCK_PLANNED_WEEKS,
  deloadWeek: BLOCK_DELOAD_WEEK,
  // generateMesocycleWeeks flags the final week by construction.
  isDeload: weekIndex === BLOCK_DELOAD_WEEK,
  ...over,
});

describe('THE PLANNED RECOVERY POSITION COMES FROM THE BLOCK, never a literal', () => {
  test('the block states it, and the final week is the fallback', () => {
    expect(plannedRecoveryWeek({ plannedWeeks: 6, deloadWeek: 6 })).toBe(6);
    expect(plannedRecoveryWeek({ plannedWeeks: 5, deloadWeek: null })).toBe(5);
    // An older persisted block finishing under its own structure resolves
    // correctly with no code change, which is the whole point of not
    // hard-coding the current default.
    expect(plannedRecoveryWeek({ plannedWeeks: 5, deloadWeek: 5 })).toBe(5);
  });

  test('a position outside the block is not trusted', () => {
    expect(plannedRecoveryWeek({ plannedWeeks: 6, deloadWeek: 9 })).toBe(6);
    expect(plannedRecoveryWeek({ plannedWeeks: 6, deloadWeek: 0 })).toBe(6);
    expect(plannedRecoveryWeek({ plannedWeeks: null })).toBeNull();
  });

  test('NO WEEK NUMBER IS HARD-CODED in this module', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../recoveryState.js'), 'utf8',
    );
    expect(src).not.toMatch(/week\s*===\s*[56]/i);
    expect(src).not.toMatch(/Week 6|Week 5|five hard weeks|four hard weeks/i);
  });
});

describe('THE TWO STATES ARE DISTINGUISHABLE', () => {
  test('CASE 1: a normal first week is not a recovery state', () => {
    const r = resolveRecoveryState(block(1));
    expect(r.state).toBe(RECOVERY_STATE.NORMAL_ACCUMULATION);
    expect(isLighterTrainingState(r)).toBe(false);
    expect(recoveryStateCard(r)).toBeNull();
    expect(nextWorkoutRecoveryLabel(r)).toBeNull();
  });

  test('CASE 2: the last hard week is still hard training', () => {
    const r = resolveRecoveryState(block(BLOCK_DELOAD_WEEK - 1));
    expect(r.state).toBe(RECOVERY_STATE.NORMAL_ACCUMULATION);
    expect(r.weeksToRecovery).toBe(1);
  });

  test('CASE 3 and 5: the recovery week happens after excellent training, and the copy never blames recovery', () => {
    // Nothing about recovery evidence reaches this resolver. It cannot make
    // the athlete's good weeks cancel the structural recovery week, and it
    // cannot explain that week with something that did not cause it.
    const r = resolveRecoveryState(block(BLOCK_DELOAD_WEEK));
    expect(r.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
    expect(r.because).toBe('block_recovery_week');
    const card = recoveryStateCard(r);
    expect(card.title).toBe('Recovery week');
    expect(card.body).toBe('You have finished the hard-training part of this block. Training is lighter on purpose this week so fatigue can come down before you move on.');
    expect(card.body).not.toMatch(/recovery has been|poor|harder|body needs/i);
  });

  test('CASE 7 and 8: an early deload is an ADAPTIVE adjustment, never called a recovery week', () => {
    const r = resolveRecoveryState(block(3, { isDeload: true }));
    expect(r.state).toBe(RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT);
    expect(r.because).toBe('recovery_evidence');
    const card = recoveryStateCard(r);
    expect(card.title).toBe('Training is lighter for now');
    expect(card.title).not.toMatch(/recovery week/i);
    expect(card.body).toBe('Your recent recovery has been harder, so we are holding back some of the workload for now.');
    expect(nextWorkoutRecoveryLabel(r)).toBe('Recovery-adjusted');
    expect(nextWorkoutRecoveryLabel(r)).not.toMatch(/week/i);
  });

  test('CASE 6: POSITION OUTRANKS THE FLAG, so the recovery week is never explained by recovery trouble', () => {
    // Both true at once. The athlete is structurally in their recovery week
    // AND the flag is set. Reading the flag first is exactly the collapse this
    // amendment removes: the top-level reason must stay structural.
    const r = resolveRecoveryState(block(BLOCK_DELOAD_WEEK, { isDeload: true }));
    expect(r.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
    expect(recoveryStateCard(r).body).not.toMatch(/recovery has been harder/);
  });

  test('CASE 9: an adaptive reduction earlier in the block does not cancel the recovery week', () => {
    const adapted = resolveRecoveryState(block(3, { isDeload: true }));
    expect(adapted.state).toBe(RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT);
    // Same block, later. The structural week still arrives.
    const later = resolveRecoveryState(block(BLOCK_DELOAD_WEEK));
    expect(later.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
    // And the review says so while the adaptive state is live.
    expect(reviewRecoveryLine(adapted)).toContain('still comes at the end of the block as planned');
  });

  test('CASE 10 and 19: the adaptive state clears when the flag clears, and fewer sets alone never invent one', () => {
    const cleared = resolveRecoveryState(block(4, { isDeload: false }));
    expect(cleared.state).toBe(RECOVERY_STATE.NORMAL_ACCUMULATION);
    expect(recoveryStateCard(cleared)).toBeNull();
    // The block week is untouched by the state clearing.
    expect(cleared.weekIndex).toBe(4);
    // And nothing in this module reads a set count, so a reduced prescription
    // with no recovery state cannot produce a recovery explanation.
    expect(trainRecoveryDetail(cleared, ['fewer working sets'])).toBeNull();
  });
});

describe('THE STATE ENDS BY THE LIFECYCLE, never by acknowledgement', () => {
  test('CASE 13: a finished block has no live recovery state at all', () => {
    const r = resolveRecoveryState(block(BLOCK_DELOAD_WEEK, { awaitingDecision: true }));
    expect(r).toBeNull();
    expect(recoveryStateCard(r)).toBeNull();
    expect(nextWorkoutRecoveryLabel(r)).toBeNull();
    expect(trainRecoveryDetail(r)).toBeNull();
  });

  test('CASE 20: an unreadable block resolves to nothing rather than a guess', () => {
    expect(resolveRecoveryState({})).toBeNull();
    expect(resolveRecoveryState({ weekIndex: 2, plannedWeeks: null })).toBeNull();
    expect(resolveRecoveryState({ weekIndex: 0, plannedWeeks: 6 })).toBeNull();
  });

  test('a week past the recovery week still reads as recovery, never as a new hard week', () => {
    const r = resolveRecoveryState(block(BLOCK_DELOAD_WEEK + 1));
    expect(r.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
  });
});

describe('WHAT IS DIFFERENT, and WHAT HAPPENS NEXT', () => {
  test('CASE 12 and 17: Train describes only prescription changes it was GIVEN', () => {
    const planned = resolveRecoveryState(block(BLOCK_DELOAD_WEEK));
    expect(trainRecoveryDetail(planned)).toBe('This is your recovery week, so this session is lighter on purpose: you have finished the hard-training part of this block.');
    expect(trainRecoveryDetail(planned, ['fewer working sets', 'easier effort targets']))
      .toBe('This is your recovery week, so this session is lighter on purpose: you have finished the hard-training part of this block. Fewer working sets and easier effort targets.');
    // No invented percentage, no volume multiplier, no MEV/MRV.
    expect(trainRecoveryDetail(planned, ['fewer working sets']))
      .not.toMatch(/%|multiplier|MEV|MRV|peak/i);
  });

  test('CASE 18: the adaptive Train line does not claim the block has finished', () => {
    const adaptive = resolveRecoveryState(block(3, { isDeload: true }));
    const line = trainRecoveryDetail(adaptive, ['fewer working sets']);
    expect(line).toBe('This session is recovery-adjusted, lighter because your recent recovery has been harder. Fewer working sets.');
    expect(line).not.toMatch(/recovery week|finished the hard-training part/i);
  });

  test('NO FALSE PROMISE: the next block never starts on its own', () => {
    const planned = resolveRecoveryState(block(BLOCK_DELOAD_WEEK));
    expect(recoveryStateCard(planned).next)
      .toBe('Once this recovery week is done, you choose what comes next. Nothing starts a new block on its own.');
    expect(recoveryStateCard(planned).next).not.toMatch(/automatic|starts automatically/i);
    const adaptive = resolveRecoveryState(block(3, { isDeload: true }));
    expect(recoveryStateCard(adaptive).next).not.toMatch(/next workout will (be|definitely)/i);
  });

  test('the review warns the week is coming, and only when it genuinely is next', () => {
    expect(reviewRecoveryLine(resolveRecoveryState(block(BLOCK_DELOAD_WEEK - 1))))
      .toBe('Next is your recovery week. Training will be lighter before you move on from this block.');
    expect(reviewRecoveryLine(resolveRecoveryState(block(2)))).toBeNull();
    expect(reviewRecoveryLine(null)).toBeNull();
  });
});

describe('COPY LAW', () => {
  const everyString = () => {
    const states = [
      resolveRecoveryState(block(BLOCK_DELOAD_WEEK)),
      resolveRecoveryState(block(3, { isDeload: true })),
      resolveRecoveryState(block(BLOCK_DELOAD_WEEK - 1)),
    ];
    const out = [];
    for (const s of states) {
      const card = recoveryStateCard(s);
      if (card) out.push(card.title, card.compactTitle, card.body, card.next, card.action);
      const label = nextWorkoutRecoveryLabel(s);
      if (label) out.push(label);
      const train = trainRecoveryDetail(s, ['fewer working sets']);
      if (train) out.push(train);
      const review = reviewRecoveryLine(s);
      if (review) out.push(review);
    }
    return out;
  };

  test('no em dash anywhere', () => {
    for (const s of everyString()) expect(s).not.toContain('—');
  });

  test('no jargon the athlete would have to look up', () => {
    for (const s of everyString()) {
      expect(s).not.toMatch(/\bdeload\b|mesocycle|\bMEV\b|\bMRV\b|autoregulat|multiplier|systemic/i);
    }
  });

  test('NO MEDICAL CLAIMS, and no gamification', () => {
    for (const s of everyString()) {
      expect(s).not.toMatch(/nervous system|\bCNS\b|overtrained|your body needs/i);
      expect(s).not.toMatch(/streak|days left|don't break|badge|congratulations/i);
    }
  });

  test('THE RECOVERY-WEEK PUSH IS GONE, and no dead copy survives it', () => {
    // Founder ruling: it could only ever run from HomeScreen, so it could not
    // tell the athlete anything before they opened Home - and once Home is
    // open the card already says it. Home, the next-workout label, Train and
    // the review carry the state instead.
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../recoveryState.js'), 'utf8',
    );
    expect(src).not.toMatch(/RECOVERY_WEEK_NOTIFICATION|notification/i);
  });
});
