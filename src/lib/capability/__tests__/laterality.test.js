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
  isSideCarveable, isSideCarvedAvailable, CAPABILITY_BLOCK, _resetCapabilityResolveCache,
} from '../resolve';
import { CONSTRAINT_RULE_KIND, CONSTRAINT_ROLE, CONSTRAINT_SOURCE, CONSTRAINT_STATE, LATERALITY, DEMAND_AXES } from '../model';
import { sideBodyPart, sidedRuleLabel, rulePhrase } from '../phrase';

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
    expect(sidedRuleLabel(rule({ laterality: null }))).toBeNull();
    expect(rulePhrase(rule({ laterality: null }))).toBe('gripping a bar');
  });

  it('a sided rule reads like a person, not like a field with a value', () => {
    // Founder wording law: "Firm gripping with your left hand", never
    // "Gripping a bar or handle firmly (left hand)".
    expect(rulePhrase(rule({ laterality: LATERALITY.LEFT }))).toBe('firm gripping with your left hand');
    expect(sidedRuleLabel(rule({ laterality: LATERALITY.LEFT }))).toBe('Firm gripping with your left hand');
    for (const r of [rule({ laterality: LATERALITY.LEFT }), rule({ ruleValue: 'bilateral_lower', laterality: LATERALITY.RIGHT })]) {
      expect(sidedRuleLabel(r)).not.toMatch(/lateral|\(/i);
    }
  });

  // Q6: the founder's mirror cases, wording and behaviour together.
  it.each([
    ['left hand', 'grip_bar', LATERALITY.LEFT, 'Firm gripping with your left hand'],
    ['right hand', 'grip_bar', LATERALITY.RIGHT, 'Firm gripping with your right hand'],
    ['left arm', 'bilateral_upper', LATERALITY.LEFT, 'Using both arms together, left arm'],
    ['right leg', 'bilateral_lower', LATERALITY.RIGHT, 'Using both legs together, right leg'],
  ])('%s reads naturally and keeps its side', (_name, ruleValue, side, label) => {
    const r = rule({ ruleValue, laterality: side });
    expect(sidedRuleLabel(r)).toBe(label);
    expect(stateOf([r]).restrictions[0].laterality).toBe(side);
  });

  it('both hands keeps the plain wording and applies whole', () => {
    const r = rule({ ruleValue: 'grip_bar', laterality: null });
    expect(sidedRuleLabel(r)).toBeNull();
    expect(rulePhrase(r)).toBe('gripping a bar');
    expect(capabilityBlockReason(stateOf([r]), oneSideLoadable)).toBe(CAPABILITY_BLOCK.DECLARED);
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

describe('the app never PROPOSES work the user has just ruled out', () => {
  const fs = require('fs');
  const path = require('path');

  it('a movement available only because of the carve is identifiable', () => {
    const sided = stateOf([rule({ laterality: LATERALITY.LEFT })]);
    // Only here because the left-hand rule was carved.
    expect(isSideCarvedAvailable(sided, oneSideLoadable)).toBe(true);
    // Not carve-available: it conflicts outright rather than being carved in.
    expect(isSideCarvedAvailable(sided, needsBothHands)).toBe(false);
    // Not carve-available: no side declared, so nothing was carved.
    expect(isSideCarvedAvailable(stateOf([rule({ laterality: null })]), oneSideLoadable)).toBe(false);
    // Not carve-available: the rule does not touch this movement at all.
    const legPress = { id: 'ex_leg', name: 'Leg Press', gripDemand: 'none', unilateralLoadable: true };
    expect(isSideCarvedAvailable(sided, legPress)).toBe(false);
    // Empty state never claims a carve.
    expect(isSideCarvedAvailable(stateOf([]), oneSideLoadable)).toBe(false);
  });

  it('the workout screen holds its own both-sides suggestion for exactly those', () => {
    // The per-side prompt says "Do the same reps on each side", which is
    // the one thing a user with a one-sided rule cannot do. It is the
    // APP's suggestion that is held; the manual toggle stays, because an
    // explicit choice is the user's to make.
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../../screens/ActiveWorkoutScreen.js'), 'utf8',
    );
    // Round 8 (R8-1): the suppression consumes sidedRuleTouches, NOT
    // the carve answer - the union turns the carve off when BOTH sides
    // are restricted, and that is the strongest case for holding the
    // prompt, not an exemption. The one-side-at-a-time NOTE keeps
    // isSideCarvedAvailable.
    expect(src).toMatch(/if \(sidedRuleBearsOnThis\) return;/);
    expect(src).not.toMatch(/if \(carvedForOneSide\) return;/);
    expect(src).toMatch(/sidedRuleTouches\(intentState\.capability, judgedExercise\)/);
    // F1 (adversarial review): judged on the library-RESOLVED row - the
    // entry's own partial exercise had no unilateralLoadable column, so
    // this answered false for every planned row and the hold never held.
    expect(src).toMatch(/isSideCarvedAvailable\(intentState\.capability, judgedExercise\)/);
    // The guard sits inside the suggestion effect, before the ask.
    const effect = src.slice(src.indexOf('const acknowledgedUnilateralRef'), src.indexOf('Log this one side at a time?'));
    expect(effect.length).toBeGreaterThan(200);
    expect(effect).toMatch(/sidedRuleBearsOnThis/);
    // The manual per-side toggle is untouched.
    expect(src).toMatch(/accessibilityLabel=\{unilateralExercises\.has\(exercise\.id\) \? 'Stop logging this exercise per side'/);
  });

  it('no capability copy claims Volyume programmes the unaffected side or records sides apart', () => {
    // Per-side logging enters ONE rep count used for both sides
    // (finishPerSide passes perSide.reps), so nothing may say otherwise.
    const files = [
      '../../../lib/capability/directory/conditions.js',
      '../../../screens/HowYouTrainScreen.js',
      '../../../components/ExercisePickerModal.js',
    ];
    const banned = /each side actually did|unaffected side|only the (good|strong|working) side|records each side|different reps|per-side target/i;
    for (const rel of files) {
      const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      const literals = src
        .replace(/\/\*[^]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
        .match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? [];
      expect(literals.length).toBeGreaterThan(20); // really scanning copy
      for (const lit of literals) expect(lit).not.toMatch(banned);
    }
  });
});

describe('R7-3 (round 7): the side carve is a UNION decision per axis, never per rule', () => {
  // The round-7 reviewer's executed probe: a LEFT rule and a RIGHT rule
  // on one carveable axis each carved independently, so two rules
  // saying "not this side" combined into "fully available" - the
  // exercise survived generation, was offered as a substitute, and the
  // in-session note told the user Volyume counts it one side at a time
  // when they had said they cannot do it on either.
  const left = (over = {}) => rule({ id: 'r-left', laterality: LATERALITY.LEFT, ...over });
  const right = (over = {}) => rule({ id: 'r-right', laterality: LATERALITY.RIGHT, ...over });

  it('LEFT + RIGHT on one axis: both sides restricted, the carve is OFF and the exercise blocks', () => {
    const s = stateOf([left(), right()]);
    const conflicts = demandConflicts(s, oneSideLoadable).filter((c) => !c.unknown);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(capabilityBlockReason(s, oneSideLoadable)).toBe(CAPABILITY_BLOCK.DECLARED);
    // And the one-side-at-a-time note must agree with the block: never
    // spoken about an axis whose carve no longer applies.
    expect(isSideCarvedAvailable(s, oneSideLoadable)).toBe(false);
  });

  it('LEFT + LEFT (a duplicate side): still one restricted side, still carved', () => {
    const s = stateOf([left(), left({ id: 'r-left-2' })]);
    expect(demandConflicts(s, oneSideLoadable).filter((c) => !c.unknown)).toHaveLength(0);
    expect(capabilityBlockReason(s, oneSideLoadable)).toBeNull();
    expect(isSideCarvedAvailable(s, oneSideLoadable)).toBe(true);
  });

  it('a sided rule beside an UNSIDED rule on the same axis: the unsided rule already covers both sides - no carve', () => {
    const s = stateOf([left(), rule({ id: 'r-unsided', laterality: null })]);
    expect(capabilityBlockReason(s, oneSideLoadable)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(isSideCarvedAvailable(s, oneSideLoadable)).toBe(false);
  });

  it('LEFT (clinician) + RIGHT (self): sources differ, both sides are still covered - blocked at the clinician rank', () => {
    const s = stateOf([
      left({ source: CONSTRAINT_SOURCE.CLINICIAN_REPORTED }),
      right(),
    ]);
    expect(capabilityBlockReason(s, oneSideLoadable)).toBe(CAPABILITY_BLOCK.CLINICIAN);
    expect(isSideCarvedAvailable(s, oneSideLoadable)).toBe(false);
  });

  it('sides on DIFFERENT axes never combine: left grip + right overhead each keep their own carve', () => {
    const s = stateOf([
      left(),
      right({ id: 'r-oh', ruleValue: 'overhead_position' }),
    ]);
    const ohOneSide = { id: 'ex_db_press', name: 'Single-Arm Dumbbell Press', gripDemand: 'supportive', overheadPosition: true, unilateralLoadable: true };
    // The grip fixture answers the overhead axis definitely here, so the
    // cross-axis case is judged on facts, not unknowns.
    expect(capabilityBlockReason(s, { ...oneSideLoadable, overheadPosition: false })).toBeNull();
    expect(capabilityBlockReason(s, ohOneSide)).toBeNull();
  });

  it('a movement that needs both hands is blocked by ONE sided rule exactly as before - the union changes nothing there', () => {
    const s = stateOf([left()]);
    expect(capabilityBlockReason(s, needsBothHands)).toBe(CAPABILITY_BLOCK.DECLARED);
  });
});

describe('R8-1 + D120 (round 8): suppression asks its own question; a held rule contributes facts, not automation', () => {
  const left = (over = {}) => rule({ id: 'r-left', laterality: LATERALITY.LEFT, ...over });
  const right = (over = {}) => rule({ id: 'r-right', laterality: LATERALITY.RIGHT, ...over });

  it('sidedRuleTouches answers true whenever ANY sided rule bears on the movement - both-sides included', () => {
    // R8-1: the both-sides logging prompt is suppressed on THIS answer,
    // never on isSideCarvedAvailable - the union correctly turns the
    // carve OFF when both sides are restricted, which is the strongest
    // case for suppressing "do the same reps on each side", not an
    // exemption from it.
    const { sidedRuleTouches } = require('../resolve');
    expect(sidedRuleTouches(stateOf([left()]), oneSideLoadable)).toBe(true);
    expect(sidedRuleTouches(stateOf([left(), right()]), oneSideLoadable)).toBe(true);
    // No sided rule, or a movement the axis does not bear on: false.
    expect(sidedRuleTouches(stateOf([rule({ laterality: null })]), oneSideLoadable)).toBe(false);
    const gripless = { id: 'ex_legpress', name: 'Leg Press', gripDemand: 'supportive', unilateralLoadable: true };
    expect(sidedRuleTouches(stateOf([left()]), gripless)).toBe(false);
  });

  it('D120: a HELD opposite-side rule completes the union; the LIVE rule substitutes, and that is ruled correct', () => {
    // Hold and decline suspend a rule's own automation, never the fact
    // it records - the side is still restricted, exactly as pickers and
    // generation already honour it. So a held left rule beside a live
    // applied right rule makes the live rule's conflict definite; the
    // automation that follows is the applied rule's own.
    const { actionableEpisodeConflicts } = require('../effective');
    const s = stateOf([
      left({ role: CONSTRAINT_ROLE.EPISODE, episodeGroupId: 'g1', adaptationMode: 'hold', effectiveChoice: 'applied' }),
      right({ role: CONSTRAINT_ROLE.EPISODE, episodeGroupId: 'g2', effectiveChoice: 'applied' }),
    ]);
    expect(capabilityBlockReason(s, oneSideLoadable)).toBe(CAPABILITY_BLOCK.DECLARED);
    expect(isSideCarvedAvailable(s, oneSideLoadable)).toBe(false);
    // Only the live rule may DRIVE what happens next.
    expect(actionableEpisodeConflicts(s, oneSideLoadable).map((c) => c.constraintId)).toEqual(['r-right']);
  });
});

// Round 16 (R16-3): the ONE union question both phrasing surfaces ask.
// The picker held this scan inline for eight rounds while the
// in-session named line named one side of a closed union on a movement
// that CAN be loaded a side at a time - the R8-4 class at a second
// consumer.
describe('R16-3: sidedUnionShape - the shared union question for phrasing', () => {
  const { sidedUnionShape } = require('../phrase');
  const rule = (over) => ({ ruleKind: 'demand', ruleValue: 'overhead_position', laterality: 'left', ...over });
  const state = (rows) => ({ restrictions: rows });

  test('a side that genuinely stands alone phrases sided', () => {
    expect(sidedUnionShape(rule(), state([rule()]))).toBe(null);
  });

  test('an opposite-side rule completes the union: both_sides', () => {
    expect(sidedUnionShape(rule(), state([rule(), rule({ laterality: 'right' })]))).toBe('both_sides');
  });

  test('an unsided rule already covers the axis: unsided_covered', () => {
    expect(sidedUnionShape(rule(), state([rule(), rule({ laterality: null })]))).toBe('unsided_covered');
  });

  test('role and choice do not matter - a held or baseline opposite side still completes the union (facts, D120 ruling 2)', () => {
    expect(sidedUnionShape(rule(), state([rule(), rule({ laterality: 'right', role: 'baseline' })]))).toBe('both_sides');
    expect(sidedUnionShape(rule(), state([rule(), { ...rule({ laterality: 'right' }), adaptationMode: 'hold' }]))).toBe('both_sides');
  });

  test('unsided rules, other axes and non-demand kinds never union-shape', () => {
    expect(sidedUnionShape(rule({ laterality: null }), state([rule()]))).toBe(null);
    expect(sidedUnionShape(rule(), state([rule({ ruleValue: 'impact', laterality: 'right' })]))).toBe(null);
    expect(sidedUnionShape({ ruleKind: 'family', ruleValue: 'x', laterality: 'left' }, state([rule()]))).toBe(null);
  });
});
