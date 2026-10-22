/**
 * todayLineArbiter — pins the ranked priority contract (HOME-TODAY-UX-SPEC.md
 * §13). Written to FAIL if a rank is ever skipped, reordered, or a junior
 * fact is allowed to win over a senior one. Every rank is isolated first,
 * then an adversarial all-eligible-at-once case proves only the senior
 * occupant renders, then dismissal (marking the winner ineligible) proves
 * the next-highest eligible occupant takes over on the next render.
 */
import {
  resolveTodayLine, TODAY_LINE_RANKS, limitationDecisionText, LIMITATION_DECISION_GENERIC,
} from '../todayLineArbiter';
import { RECOVERY_STATE } from '../../recoveryState';

const noop = () => {};

function fullFacts(overrides = {}) {
  return {
    safety: null,
    blockComplete: { eligible: true, onPress: noop },
    // D231: the three occupants the Today line took over.
    planChoice: { eligible: true, onPress: noop, onDismiss: noop },
    coachDecision: { eligible: true, caloriesKcal: null, weekStart: 1, onPress: noop, onDismiss: noop },
    checkIn: { eligible: true, onPress: noop, onDismiss: noop },
    limitation: { awaitingCount: 1, awaitingSubject: 'your shoulder', undecided: false, onPress: noop },
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
    planNote: { eligible: true, onPress: noop },
    phaseMismatch: { eligible: true, savedPhaseLabel: 'a cut', onPress: noop, onDismiss: noop },
    ...overrides,
  };
}

describe('todayLineArbiter — rank order constant', () => {
  // RE-PINNED (Stage 2 lead review): §17 R4 adds the first-review readiness
  // line at rank 4.5 on conflict days ("weigh-in wins; readiness line moves
  // to R2 slot rank 4.5"), so the 8 spec ranks became 9 resolver entries.
  // FOUNDER DECISION (fully free, no trial, no expiry): rank 8 (trial
  // ending) is retired along with the trial itself, back down to 8.
  it('declares exactly the 8 resolver entries in order (7 spec ranks + rank 4.5, §17 R4)', () => {
    // RE-POINTED (D231, app layout rework batch 1): three occupants joined the
    // line (the plan update choice, a limitation waiting for a decision, the
    // plan-rebuilt note), so the 8 resolver entries are 11 now. The order
    // itself is pinned by the walk-the-ladder test below.
    expect(TODAY_LINE_RANKS).toHaveLength(11);
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
      text: "Block finished. Choose what comes next.",
      onPress,
      onDismiss: null,
      accessibilityLabel: "Block finished. Choose what comes next.",
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

  // FOUNDER DECISION (fully free, no trial, no expiry): rank 8 (trial
  // ending) and its resolver are retired; there is no trial state left to
  // isolate here.
});

describe('todayLineArbiter — D231 occupants (app layout rework, batch 1)', () => {
  it('plan update needs a choice: the spec sentence, tap and "Not now" dismissal passed through', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    const result = resolveTodayLine({ planChoice: { eligible: true, onPress, onDismiss } });
    expect(result).toEqual({
      key: 'plan_choice',
      text: 'Your plan can be updated. It needs a choice from you.',
      onPress,
      onDismiss,
      accessibilityLabel: 'Your plan can be updated. It needs a choice from you. Tap to update your plan.',
      wrap: true,
    });
  });

  it('plan update needs a choice: not eligible renders nothing from this fact', () => {
    expect(resolveTodayLine({ planChoice: { eligible: false, onPress: noop, onDismiss: noop } })).toBeNull();
  });

  it('plan rebuilt note: the spec sentence, a tap that opens the note, and no dismissal on the line', () => {
    const onPress = jest.fn();
    const result = resolveTodayLine({ planNote: { eligible: true, onPress } });
    expect(result).toEqual({
      key: 'plan_note',
      text: 'Your plan was updated. See what changed.',
      onPress,
      onDismiss: null,
      accessibilityLabel: 'Your plan was updated. Tap to see what changed.',
      wrap: true,
    });
    expect(resolveTodayLine({ planNote: { eligible: false, onPress } })).toBeNull();
  });

  it('limitation decision: exactly one "Still need it?" prompt pending uses its own sentence (named subject)', () => {
    const onPress = jest.fn();
    const result = resolveTodayLine({ limitation: { awaitingCount: 1, awaitingSubject: 'your shoulder', undecided: false, onPress } });
    expect(result.key).toBe('limitation_decision');
    expect(result.text).toBe('You thought you would be back to your shoulder by about now. Still need it?');
    expect(result.onPress).toBe(onPress);
    expect(result.onDismiss).toBeNull();
  });

  it('limitation decision: one prompt pending with no subject uses the unnamed sentence', () => {
    expect(limitationDecisionText({ awaitingCount: 1, awaitingSubject: null })).toBe(
      'You thought this would be done by about now. Still need it?',
    );
  });

  it('limitation decision: several prompts pending, or a rule that arrived undecided, use the generic sentence', () => {
    expect(limitationDecisionText({ awaitingCount: 2, awaitingSubject: 'your shoulder' })).toBe(LIMITATION_DECISION_GENERIC);
    expect(limitationDecisionText({ awaitingCount: 0, undecided: true })).toBe('A change to your limitations is waiting for your decision.');
    // An awaiting prompt wins over an undecided rule, as the two rows did (one ask-class row at a time).
    expect(limitationDecisionText({ awaitingCount: 1, awaitingSubject: 'your knee', undecided: true })).toMatch(/Still need it\?$/);
  });

  it('limitation decision: nothing pending renders nothing', () => {
    expect(limitationDecisionText({ awaitingCount: 0, undecided: false })).toBeNull();
    expect(limitationDecisionText(undefined)).toBeNull();
    expect(resolveTodayLine({ limitation: { awaitingCount: 0, undecided: false, onPress: noop } })).toBeNull();
  });

  it('the three new occupants show in full (wrap), the older ones keep their clamp', () => {
    expect(resolveTodayLine({ planChoice: { eligible: true, onPress: noop } }).wrap).toBe(true);
    expect(resolveTodayLine({ planNote: { eligible: true, onPress: noop } }).wrap).toBe(true);
    expect(resolveTodayLine({ limitation: { awaitingCount: 1, awaitingSubject: 'your shoulder', onPress: noop } }).wrap).toBe(true);
    expect(resolveTodayLine({ checkIn: { eligible: true, onPress: noop } }).wrap).toBeUndefined();
    expect(resolveTodayLine({ blockComplete: { eligible: true, onPress: noop } }).wrap).toBeUndefined();
  });

  it('none of the new copy carries an em dash (CLAUDE.md section 3)', () => {
    const lines = [
      resolveTodayLine({ planChoice: { eligible: true, onPress: noop } }).text,
      resolveTodayLine({ planNote: { eligible: true, onPress: noop } }).text,
      limitationDecisionText({ awaitingCount: 1, awaitingSubject: 'your shoulder' }),
      limitationDecisionText({ awaitingCount: 0, undecided: true }),
    ];
    for (const t of lines) expect(t).not.toMatch(/\u2014/);
  });
});

describe('todayLineArbiter — D231 rank order, pairwise (the spec order, exactly)', () => {
  // block finished, plan update needs a choice, coaching decision, weekly
  // check-in, limitation decision, recovery week, re-entry, plan rebuilt note,
  // nutrition phase.
  const only = (key) => {
    const full = fullFacts();
    const facts = { safety: null };
    const map = {
      block_complete: 'blockComplete', plan_choice: 'planChoice', coach_decision: 'coachDecision', check_in: 'checkIn',
      limitation_decision: 'limitation', recovery_state: 'recovery', re_entry: 'reEntry', plan_note: 'planNote',
      phase_mismatch: 'phaseMismatch',
    };
    facts[map[key]] = full[map[key]];
    return facts;
  };
  const ORDER = [
    'block_complete', 'plan_choice', 'coach_decision', 'check_in', 'limitation_decision',
    'recovery_state', 're_entry', 'plan_note', 'phase_mismatch',
  ];

  it('every senior occupant beats every junior one, for every pair', () => {
    for (let i = 0; i < ORDER.length; i++) {
      for (let j = i + 1; j < ORDER.length; j++) {
        const result = resolveTodayLine({ ...only(ORDER[i]), ...only(ORDER[j]) });
        expect(result.key).toBe(ORDER[i]);
      }
    }
  });

  it('the plan update choice outranks the coaching decision, and the limitation decision sits under the check-in and over the recovery week', () => {
    expect(resolveTodayLine({ ...only('plan_choice'), ...only('coach_decision') }).key).toBe('plan_choice');
    expect(resolveTodayLine({ ...only('check_in'), ...only('limitation_decision') }).key).toBe('check_in');
    expect(resolveTodayLine({ ...only('limitation_decision'), ...only('recovery_state') }).key).toBe('limitation_decision');
  });

  it('the plan-rebuilt note sits under re-entry and over the nutrition phase', () => {
    expect(resolveTodayLine({ ...only('re_entry'), ...only('plan_note') }).key).toBe('re_entry');
    expect(resolveTodayLine({ ...only('plan_note'), ...only('phase_mismatch') }).key).toBe('plan_note');
  });

  it('an active workout still silences the new occupants (resume outranks them), safety excepted', () => {
    expect(resolveTodayLine({ ...only('plan_choice'), hasActiveWorkout: true })).toBeNull();
    expect(resolveTodayLine({ ...only('plan_note'), hasActiveWorkout: true })).toBeNull();
    expect(resolveTodayLine({ ...only('limitation_decision'), hasActiveWorkout: true })).toBeNull();
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
    // D231 (docs/app-rework-2026-10/SPEC.md, Batch 1): block finished, plan
    // update needs a choice, coaching decision, weekly check-in, limitation
    // decision, [first review, unfed since Campaign 26], recovery week,
    // re-entry, plan rebuilt note, nutrition phase.
    const expectedOrder = [
      'block_complete', 'plan_choice', 'coach_decision', 'check_in', 'limitation_decision',
      'first_review', 'recovery_state', 're_entry', 'plan_note', 'phase_mismatch',
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
    case 'plan_choice': next.planChoice = { ...next.planChoice, eligible: false }; break;
    case 'coach_decision': next.coachDecision = { ...next.coachDecision, eligible: false }; break;
    case 'check_in': next.checkIn = { ...next.checkIn, eligible: false }; break;
    case 'limitation_decision': next.limitation = { ...next.limitation, awaitingCount: 0, undecided: false }; break;
    case 'plan_note': next.planNote = { ...next.planNote, eligible: false }; break;
    // Rank 4.5 self-retires (or leaves for R4 once the weigh-in lands):
    // either way the fact's item goes null, never a dismissed flag.
    case 'first_review': next.firstReview = { ...next.firstReview, item: null }; break;
    case 'recovery_state':
    case 'deload_suggestion':
      next.recovery = { ...next.recovery, state: null, deloadEligible: false };
      break;
    case 're_entry': next.reEntry = { ...next.reEntry, eligible: false }; break;
    case 'phase_mismatch': next.phaseMismatch = { ...next.phaseMismatch, eligible: false }; break;
    default: break;
  }
  return next;
}
