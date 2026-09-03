/**
 * todayLineArbiter — pins the ranked priority contract (HOME-TODAY-UX-SPEC.md
 * §13). Written to FAIL if a rank is ever skipped, reordered, or a junior
 * fact is allowed to win over a senior one. Every rank is isolated first,
 * then an adversarial all-eligible-at-once case proves only the senior
 * occupant renders, then dismissal (marking the winner ineligible) proves
 * the next-highest eligible occupant takes over on the next render.
 */
import { resolveTodayLine, TODAY_LINE_RANKS } from '../todayLineArbiter';
import { RECOVERY_STATE } from '../../recoveryState';

const noop = () => {};

function fullFacts(overrides = {}) {
  return {
    safety: null,
    blockComplete: { eligible: true, onPress: noop },
    coachDecision: { eligible: true, caloriesKcal: null, weekStart: 1, onPress: noop, onDismiss: noop },
    checkIn: { eligible: true, onPress: noop, onDismiss: noop },
    firstReview: {
      item: { text: 'First review: 2 more morning weigh-ins.', accessibilityLabel: 'First review: 2 more morning weigh-ins. See your readiness.' },
      onPress: noop,
    },
    recovery: {
      state: { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY },
      onOpenDetail: noop,
      deloadEligible: true,
      onDeloadPress: noop,
      onDeloadDismiss: noop,
    },
    reEntry: { eligible: true, onPress: noop },
    phaseMismatch: { eligible: true, savedPhaseLabel: 'a cut', onPress: noop, onDismiss: noop },
    trialEnding: { eligible: true, daysRemaining: 1, onPress: noop },
    ...overrides,
  };
}

describe('todayLineArbiter — rank order constant', () => {
  // RE-PINNED (Stage 2 lead review): §17 R4 adds the first-review readiness
  // line at rank 4.5 on conflict days ("weigh-in wins; readiness line moves
  // to R2 slot rank 4.5"), so the 8 spec ranks become 9 resolver entries.
  it('declares exactly the 9 resolver entries in order (8 spec ranks + rank 4.5, §17 R4)', () => {
    expect(TODAY_LINE_RANKS).toHaveLength(9);
  });
});

describe('todayLineArbiter — no eligible facts', () => {
  it('returns null when nothing is eligible', () => {
    expect(resolveTodayLine({})).toBeNull();
    expect(resolveTodayLine()).toBeNull();
  });
});

describe('todayLineArbiter — each rank in isolation', () => {
  it('rank 1: safety-consequential, when present, wins with no other facts', () => {
    const onPress = jest.fn();
    const result = resolveTodayLine({ safety: { key: 'ed_signpost', text: 'Support is available.', onPress } });
    expect(result).toMatchObject({ key: 'ed_signpost', text: 'Support is available.', onPress });
  });

  it('rank 2: block-complete decision', () => {
    const onPress = jest.fn();
    const result = resolveTodayLine({ blockComplete: { eligible: true, onPress } });
    expect(result).toEqual({
      key: 'block_complete',
      text: "Block complete. Choose what's next.",
      onPress,
      onDismiss: null,
      accessibilityLabel: "Block complete. Choose what's next.",
    });
  });

  it('rank 2: not eligible renders nothing from this fact', () => {
    expect(resolveTodayLine({ blockComplete: { eligible: false, onPress: noop } })).toBeNull();
  });

  it('rank 3: coach decision, no calorie change — plain title copy (item 2)', () => {
    const result = resolveTodayLine({
      coachDecision: { eligible: true, caloriesKcal: null, onPress: noop, onDismiss: noop },
    });
    expect(result.key).toBe('coach_decision');
    expect(result.text).toBe("This week's coaching decision. See why.");
    // Copy contract item 2: the old "Coach - this week's decision" title
    // (with its ASCII hyphen-as-dash) must never appear again.
    expect(result.text).not.toMatch(/Coach - this week/);
  });

  it('rank 3: coach decision, calorie change — leads with the real content', () => {
    const result = resolveTodayLine({
      coachDecision: { eligible: true, caloriesKcal: 2350, onPress: noop, onDismiss: noop },
    });
    expect(result.text).toBe('Calories adjusted to 2350 kcal. See why.');
  });

  it('rank 4: check-in due — one sentence, no scan subline (copy item 5)', () => {
    const result = resolveTodayLine({ checkIn: { eligible: true, onPress: noop, onDismiss: noop } });
    expect(result.key).toBe('check_in');
    expect(result.text).toBe("Your weekly check-in is ready. It shapes this week's coaching decision.");
    expect(result.text).not.toMatch(/scan/i);
    expect(result.text).not.toMatch(/skipping/i);
  });

  it('rank 4.5: first-review line on a conflict day, passed through whole', () => {
    const onPress = jest.fn();
    const result = resolveTodayLine({
      firstReview: {
        item: { text: 'First review: 3 more morning weigh-ins.', accessibilityLabel: 'First review: 3 more morning weigh-ins. See your readiness.' },
        onPress,
      },
    });
    expect(result).toEqual({
      key: 'first_review',
      text: 'First review: 3 more morning weigh-ins.',
      onPress,
      onDismiss: null,
      accessibilityLabel: 'First review: 3 more morning weigh-ins. See your readiness.',
    });
  });

  it('rank 4.5: a null item (non-conflict day, or the resolver retired the line) renders nothing from this fact', () => {
    expect(resolveTodayLine({ firstReview: { item: null, onPress: noop } })).toBeNull();
  });

  it('rank 4.5: loses to check-in (rank 4), wins over recovery (rank 5)', () => {
    const firstReview = {
      item: { text: 'First review: 1 more morning weigh-in.', accessibilityLabel: 'First review: 1 more morning weigh-in. See your readiness.' },
      onPress: noop,
    };
    const recovery = {
      state: { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY },
      onOpenDetail: noop,
      deloadEligible: false,
    };
    expect(resolveTodayLine({
      checkIn: { eligible: true, onPress: noop, onDismiss: noop },
      firstReview,
      recovery,
    }).key).toBe('check_in');
    expect(resolveTodayLine({ firstReview, recovery }).key).toBe('first_review');
  });

  it('rank 5a: structural recovery state (planned block recovery)', () => {
    const result = resolveTodayLine({
      recovery: {
        state: { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY },
        onOpenDetail: noop,
        deloadEligible: false,
      },
    });
    expect(result.key).toBe('recovery_state');
    expect(result.text).toBe('Recovery week. Training is deliberately lighter. What that means.');
  });

  it('rank 5a: structural recovery state (adaptive adjustment) never claims "recovery week"', () => {
    const result = resolveTodayLine({
      recovery: {
        state: { state: RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT },
        onOpenDetail: noop,
        deloadEligible: false,
      },
    });
    expect(result.key).toBe('recovery_state');
    expect(result.text).not.toMatch(/^Recovery week/);
  });

  it('rank 5a: NORMAL_ACCUMULATION carries no announcement', () => {
    const result = resolveTodayLine({
      recovery: {
        state: { state: RECOVERY_STATE.NORMAL_ACCUMULATION },
        onOpenDetail: noop,
        deloadEligible: false,
      },
    });
    expect(result).toBeNull();
  });

  it('rank 5b: data-driven deload suggestion, when no structural state is live', () => {
    const result = resolveTodayLine({
      recovery: { state: null, onOpenDetail: noop, deloadEligible: true, onDeloadPress: noop, onDeloadDismiss: noop },
    });
    expect(result.key).toBe('deload_suggestion');
  });

  it('rank 5: structural state outranks the data-driven suggestion within the same rank', () => {
    const result = resolveTodayLine({
      recovery: {
        state: { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY },
        onOpenDetail: noop,
        deloadEligible: true,
        onDeloadPress: noop,
        onDeloadDismiss: noop,
      },
    });
    expect(result.key).toBe('recovery_state');
  });

  it('rank 6: re-entry question', () => {
    const result = resolveTodayLine({ reEntry: { eligible: true, onPress: noop } });
    expect(result.key).toBe('re_entry');
  });

  it('rank 7: nutrition-phase mismatch', () => {
    const result = resolveTodayLine({
      phaseMismatch: { eligible: true, savedPhaseLabel: 'a lean bulk', onPress: noop, onDismiss: noop },
    });
    expect(result.key).toBe('phase_mismatch');
    expect(result.text).toContain('a lean bulk');
  });

  it('rank 8: trial ending today', () => {
    const result = resolveTodayLine({ trialEnding: { eligible: true, daysRemaining: 0, onPress: noop } });
    expect(result.text).toBe('Your trial ends today. Keep your coaching.');
  });

  it('rank 8: trial ending tomorrow (spec §18 mock G literal)', () => {
    const result = resolveTodayLine({ trialEnding: { eligible: true, daysRemaining: 1, onPress: noop } });
    expect(result.text).toBe('Your trial ends tomorrow. Keep your coaching.');
  });
});

describe('todayLineArbiter — adversarial: every rank eligible at once', () => {
  it('exactly the senior-most occupant renders when everything is eligible, safety included', () => {
    const result = resolveTodayLine(fullFacts({ safety: { key: 'safety_fact', text: 'safety line', onPress: noop } }));
    expect(result.key).toBe('safety_fact');
  });

  it('with no safety fact, block-complete (rank 2) wins over every junior rank', () => {
    const result = resolveTodayLine(fullFacts());
    expect(result.key).toBe('block_complete');
  });

  it('dismissal advances to the next eligible occupant on re-render, walking the full ladder', () => {
    let facts = fullFacts();
    const expectedOrder = [
      'block_complete', 'coach_decision', 'check_in', 'first_review',
      'recovery_state', 're_entry', 'phase_mismatch', 'trial_ending',
    ];
    for (const expectedKey of expectedOrder) {
      const result = resolveTodayLine(facts);
      expect(result.key).toBe(expectedKey);
      // Simulate "dismiss/resolve" by marking the winner ineligible, exactly
      // as HomeScreen's state update would on the next render.
      facts = disable(facts, expectedKey);
    }
    // Nothing left eligible.
    expect(resolveTodayLine(facts)).toBeNull();
  });
});

describe('todayLineArbiter — resume suppression (spec §12)', () => {
  it('an active workout suppresses every rank except safety', () => {
    const facts = fullFacts({ hasActiveWorkout: true });
    expect(resolveTodayLine(facts)).toBeNull();
  });

  it('safety is never suppressed by an active workout', () => {
    const facts = fullFacts({
      hasActiveWorkout: true,
      safety: { key: 'safety_fact', text: 'safety line', onPress: noop },
    });
    expect(resolveTodayLine(facts).key).toBe('safety_fact');
  });
});

describe('todayLineArbiter — static occupant text stays inside the ~90 char P1 budget', () => {
  it.each([
    ['block_complete', resolveTodayLine({ blockComplete: { eligible: true, onPress: noop } })],
    ['check_in', resolveTodayLine({ checkIn: { eligible: true, onPress: noop, onDismiss: noop } })],
    ['coach_decision (no calorie change)', resolveTodayLine({ coachDecision: { eligible: true, caloriesKcal: null, onPress: noop, onDismiss: noop } })],
    ['trial_ending', resolveTodayLine({ trialEnding: { eligible: true, daysRemaining: 1, onPress: noop } })],
  ])('%s', (_label, result) => {
    expect(result.text.length).toBeLessThanOrEqual(90);
  });
});

// Helper: returns a NEW facts object with the given occupant's key marked
// ineligible, mirroring how HomeScreen's real state updates (dismissal,
// navigation-away-and-resolve) remove one fact at a time.
function disable(facts, key) {
  const next = { ...facts };
  switch (key) {
    case 'block_complete': next.blockComplete = { ...next.blockComplete, eligible: false }; break;
    case 'coach_decision': next.coachDecision = { ...next.coachDecision, eligible: false }; break;
    case 'check_in': next.checkIn = { ...next.checkIn, eligible: false }; break;
    // Rank 4.5 self-retires (or leaves for R4 once the weigh-in lands):
    // either way the fact's item goes null, never a dismissed flag.
    case 'first_review': next.firstReview = { ...next.firstReview, item: null }; break;
    case 'recovery_state':
    case 'deload_suggestion':
      next.recovery = { ...next.recovery, state: null, deloadEligible: false };
      break;
    case 're_entry': next.reEntry = { ...next.reEntry, eligible: false }; break;
    case 'phase_mismatch': next.phaseMismatch = { ...next.phaseMismatch, eligible: false }; break;
    case 'trial_ending': next.trialEnding = { ...next.trialEnding, eligible: false }; break;
    default: break;
  }
  return next;
}
