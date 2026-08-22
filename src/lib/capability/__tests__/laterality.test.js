/**
 * Laterality end to end (founder order 2026-08-21, the input-gap fix).
 *
 * What this suite pins and why: the model, the schema and the resolver
 * all understood left/right long before the interface could write one,
 * so every new rule stored laterality null and the carve path below was
 * unreachable in practice. These tests prove the round trip is now real:
 * the side is asked only where it changes resolution, it is stored, the
 * resolver consumes it, legacy null keeps its old meaning exactly, and
 * NOTHING about per-side prescription was introduced.
 *
 * Scenarios A-H are the founder's own list, in order.
 */
import {
  buildCapabilityResolveState, capabilityBlockReason, demandConflicts,
  isSideCarveable, CAPABILITY_BLOCK, _resetCapabilityResolveCache,
} from '../resolve';
import { CONSTRAINT_RULE_KIND, CONSTRAINT_ROLE, CONSTRAINT_SOURCE, CONSTRAINT_STATE, LATERALITY, DEMAND_AXES } from '../model';
import { sideBodyPart, sideLabel, rulePhrase } from '../phrase';

const NOW = 1_760_000_000_000;
const DAY = 86_400_000;

const rule = (over = {}) => ({
  id: over.id ?? 'r1',
  role: CONSTRAINT_ROLE.BASELINE,
  source: CONSTRAINT_SOURCE.SELF,
  ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
  ruleValue: 'grip_bar',
  laterality: null,
  startsAt: NOW - 30 * DAY,
  endsAt: null,
  state: CONSTRAINT_STATE.ACTIVE,
  deletedAt: null,
  ...over,
});

// Real library shapes: a one-side-loadable movement and one that needs
// the bar in both hands.
const oneSideLoadable = {
  id: 'ex_db_row', name: 'Single-Arm Dumbbell Row',
  gripDemand: 'bar', unilateralLoadable: true, bilateralUpper: false,
};
const needsBothHands = {
  id: 'ex_bb_row', name: 'Barbell Row',
  gripDemand: 'bar', unilateralLoadable: false, bilateralUpper: true,
};
const stateOf = (rows) => buildCapabilityResolveState(rows, { atMs: NOW });

beforeEach(() => { _resetCapabilityResolveCache(); });

describe('which rules a side is asked for comes from the model, not a UI list', () => {
  it('the five body-side axes carve; the whole-body ones never do', () => {
    for (const id of ['grip_bar', 'overhead_position', 'bilateral_upper', 'bilateral_lower', 'weight_bearing_hands']) {
      expect(isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, id)).toBe(true);
    }
    for (const id of ['standing', 'floor_access', 'axial_load', 'impact', 'balance_high']) {
      expect(isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, id)).toBe(false);
    }
    // Every axis in the shipped ontology is decided one way or the other,
    // so a new axis cannot quietly default into being asked about.
    for (const axis of DEMAND_AXES) {
      expect(typeof isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, axis.id)).toBe('boolean');
    }
  });

  it('family and exercise rules never carve by side, whatever is stored', () => {
    expect(isSideCarveable(CONSTRAINT_RULE_KIND.FAMILY, 'overhead_press')).toBe(false);
    expect(isSideCarveable(CONSTRAINT_RULE_KIND.EXERCISE, 'ex_1')).toBe(false);
    expect(isSideCarveable(CONSTRAINT_RULE_KIND.EXERCISE_ALLOW, 'ex_1')).toBe(false);
  });

  it('every carveable axis has a body part to name it by', () => {
    for (const id of ['grip_bar', 'overhead_position', 'bilateral_upper', 'bilateral_lower', 'weight_bearing_hands']) {
      expect(typeof sideBodyPart(id)).toBe('string');
    }
    expect(sideBodyPart('impact')).toBeNull();
  });
});

describe('A. one side + an independently loadable movement stays available', () => {
  it('a left-hand grip rule does not block a single-arm row', () => {
    const s = stateOf([rule({ laterality: LATERALITY.LEFT })]);
    expect(capabilityBlockReason(s, oneSideLoadable)).toBeNull();
  });
});

describe('B. one side + a movement needing both sides still conflicts', () => {
  it('a left-hand grip rule still blocks a barbell row', () => {
    const s = stateOf([rule({ laterality: LATERALITY.LEFT })]);
    expect(capabilityBlockReason(s, needsBothHands)).toBe(CAPABILITY_BLOCK.DECLARED);
  });
});

describe('C. no side stored means the rule applies whole', () => {
  it('the same rule without a side blocks BOTH movements', () => {
    const s = stateOf([rule({ laterality: null })]);
    expect(capabilityBlockReason(s, oneSideLoadable)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(capabilityBlockReason(s, needsBothHands)).toBe(CAPABILITY_BLOCK.DECLARED);
  });
});

describe('D. right mirrors left', () => {
  it('right behaves exactly as left does, on both movements', () => {
    const left = stateOf([rule({ laterality: LATERALITY.LEFT })]);
    const right = stateOf([rule({ laterality: LATERALITY.RIGHT })]);
    for (const ex of [oneSideLoadable, needsBothHands]) {
      expect(capabilityBlockReason(right, ex)).toBe(capabilityBlockReason(left, ex));
    }
    // Honest scope: the carve turns on a side being SPECIFIED, not on
    // which one. Volyume does not know which side an exercise loads, and
    // this suite exists so nobody later assumes it does.
    expect(capabilityBlockReason(right, oneSideLoadable)).toBeNull();
  });
});

describe('E. a whole-body rule is unchanged and is never asked about', () => {
  it('an impact rule blocks by demand alone, and storing a side changes nothing', () => {
    const jump = { id: 'ex_jump', name: 'Box Jump', impact: true, unilateralLoadable: true };
    const plain = stateOf([rule({ ruleValue: 'impact', laterality: null })]);
    const sided = stateOf([rule({ ruleValue: 'impact', laterality: LATERALITY.LEFT })]);
    expect(capabilityBlockReason(plain, jump)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(capabilityBlockReason(sided, jump)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, 'impact')).toBe(false);
  });
});

describe('F. the user can still override, exactly as before', () => {
  it('an allowance carves a sided self-declared conflict', () => {
    const s = stateOf([
      rule({ laterality: LATERALITY.LEFT }),
      rule({ id: 'r2', ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW, ruleValue: needsBothHands.id }),
    ]);
    expect(capabilityBlockReason(s, needsBothHands)).toBeNull();
  });

  it('but a clinician-reported sided rule is still not overridable inline (CAP-7)', () => {
    const s = stateOf([
      rule({ laterality: LATERALITY.LEFT, source: CONSTRAINT_SOURCE.CLINICIAN_REPORTED }),
      rule({ id: 'r2', ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW, ruleValue: needsBothHands.id }),
    ]);
    expect(capabilityBlockReason(s, needsBothHands)).toBe(CAPABILITY_BLOCK.CLINICIAN);
  });
});

describe('G. ending a sided temporary rule restores ordinary eligibility', () => {
  it('the ended row stops applying, and the row itself is untouched history', () => {
    const episode = rule({
      id: 'ep1', role: CONSTRAINT_ROLE.EPISODE, episodeGroupId: 'g1',
      laterality: LATERALITY.LEFT, ruleValue: 'bilateral_upper',
    });
    const bench = { id: 'ex_bench', name: 'Barbell Bench Press', bilateralUpper: true, unilateralLoadable: false };
    expect(capabilityBlockReason(stateOf([episode]), bench)).toBe(CAPABILITY_BLOCK.DECLARED);
    const ended = { ...episode, state: CONSTRAINT_STATE.ENDED, endedAt: NOW - 1 };
    expect(capabilityBlockReason(stateOf([ended]), bench)).toBeNull();
    // History keeps what actually happened, side included.
    expect(ended.laterality).toBe(LATERALITY.LEFT);
  });
});

describe('H. a permanent rule on one side and a temporary one on the other', () => {
  const permanentLeftArm = rule({
    id: 'base_left', role: CONSTRAINT_ROLE.BASELINE,
    ruleValue: 'bilateral_upper', laterality: LATERALITY.LEFT,
  });
  const temporaryRightWrist = rule({
    id: 'ep_right', role: CONSTRAINT_ROLE.EPISODE, episodeGroupId: 'g2',
    ruleValue: 'weight_bearing_hands', laterality: LATERALITY.RIGHT,
    startsAt: NOW - DAY, endsAt: NOW + 7 * DAY,
  });
  const pushUp = { id: 'ex_pushup', name: 'Push-Up', weightBearingHands: true, bilateralUpper: true, unilateralLoadable: false };
  const oneArmPress = { id: 'ex_oa_press', name: 'Single-Arm Machine Press', bilateralUpper: false, weightBearingHands: false, unilateralLoadable: true };

  it('both rules apply at once, as a union', () => {
    const s = stateOf([permanentLeftArm, temporaryRightWrist]);
    const ids = demandConflicts(s, pushUp).map(c => c.constraintId).sort();
    expect(ids).toEqual(['base_left', 'ep_right']);
    expect(capabilityBlockReason(s, pushUp)).toBe(CAPABILITY_BLOCK.DECLARED);
    // The one-arm press escapes both: it needs neither both arms nor
    // hand weight-bearing.
    expect(capabilityBlockReason(s, oneArmPress)).toBeNull();
  });

  it('ending the temporary one restores only what it was holding', () => {
    const after = stateOf([permanentLeftArm, { ...temporaryRightWrist, state: CONSTRAINT_STATE.ENDED, endedAt: NOW - 1 }]);
    // The wrist rule is gone from the reasons; the permanent arm rule is not.
    const ids = demandConflicts(after, pushUp).map(c => c.constraintId);
    expect(ids).toEqual(['base_left']);
    expect(capabilityBlockReason(after, pushUp)).toBe(CAPABILITY_BLOCK.DECLARED);
  });
});

describe('a stored side survives being read back, and is spoken naturally', () => {
  it('left stays left, right stays right, and neither becomes the other', () => {
    for (const side of [LATERALITY.LEFT, LATERALITY.RIGHT]) {
      const s = stateOf([rule({ laterality: side })]);
      expect(s.restrictions[0].laterality).toBe(side);
      expect(demandConflicts(s, needsBothHands)[0].laterality).toBe(side);
    }
  });

  it('null is never spoken as a side, and never invented as one', () => {
    expect(sideLabel(rule({ laterality: null }))).toBeNull();
    expect(rulePhrase(rule({ laterality: null }))).toBe('gripping a bar');
  });

  it('a sided rule names the body part, never the word laterality', () => {
    expect(sideLabel(rule({ laterality: LATERALITY.LEFT }))).toBe('left hand');
    expect(sideLabel(rule({ ruleValue: 'bilateral_lower', laterality: LATERALITY.RIGHT }))).toBe('right leg');
    expect(rulePhrase(rule({ laterality: LATERALITY.LEFT }))).toBe('gripping a bar (left hand)');
    for (const side of [LATERALITY.LEFT, LATERALITY.RIGHT]) {
      expect(sideLabel(rule({ laterality: side }))).not.toMatch(/lateral/i);
    }
  });
});

describe('no per-side prescription engine was introduced', () => {
  it('the resolver answers compatibility only: no targets, loads or sides come back', () => {
    const s = stateOf([rule({ laterality: LATERALITY.LEFT })]);
    const conflict = demandConflicts(s, needsBothHands)[0];
    expect(Object.keys(conflict).sort()).toEqual(
      ['constraintId', 'laterality', 'ruleKind', 'ruleValue', 'source', 'unknown'],
    );
    for (const key of ['reps', 'sets', 'weight', 'load', 'targetLeft', 'targetRight']) {
      expect(conflict[key]).toBeUndefined();
    }
  });
});
