/**
 * coachTrainingExecution.test.js — Campaign 18 job 5.
 *
 * FOUNDER LAW: "The training engine should know enough to avoid blaming the
 * programme for obvious lack of nutritional execution. But nutrition must not
 * become an excuse that prevents legitimate training changes forever."
 *
 * And the case that produced this work:
 *   A. Training stalls + adherence clearly poor -> avoid strong "this
 *      exercise/programme failed" conclusions.
 *   B. Training stalls + everything else good -> plateau logic operates
 *      normally.
 *   C. Training stalls + nutrition unknown -> UNKNOWN, not "nutrition caused
 *      it".
 *   D. Training progresses despite imperfect food logging -> do not punish
 *      the user for not using the diary.
 *
 * WHAT THIS SUITE PINS. That the execution gate suppresses exactly the two
 * verdicts that CLAIM THE PRESCRIPTION FAILED, and suppresses nothing else -
 * because an exclusion, a repeated swap or joint discomfort is true whether
 * or not the block was run, and silencing those would be a safety regression
 * dressed as restraint.
 */
import { slotVerdict, SLOT_VERDICT, SLOT_REASON, EPOCH_REVIEW_BLOCKS } from '../programmeEpoch';
import { proposeNextBlock } from '../blockReview';
import { explainReason } from '../planRationale';

const RUN = { executionJudgeable: true };
const UNRUN = { executionJudgeable: false };

describe('CASE A: a plateau on a block that was not run is not a plateau verdict', () => {
  test('run: a plateau replaces the exercise, exactly as before', () => {
    const v = slotVerdict({ plateau: true }, RUN);
    expect(v.verdict).toBe(SLOT_VERDICT.REPLACE);
    expect(v.reason).toBe(SLOT_REASON.PLATEAU);
  });

  test('UNRUN: the same evidence KEEPS it, and says why', () => {
    const v = slotVerdict({ plateau: true }, UNRUN);
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
    expect(v.reason).toBe(SLOT_REASON.INSUFFICIENT_EXECUTION);
  });

  test('UNRUN: a prescription change is withheld too', () => {
    const v = slotVerdict({ plateau: true, prescriptionFix: true }, UNRUN);
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
  });

  test('UNRUN: rotation "for variation" is churn wearing a rationale', () => {
    const opts = { ...UNRUN, epochBlocks: EPOCH_REVIEW_BLOCKS };
    const v = slotVerdict({ systematicCandidate: true, progressing: false }, opts);
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
    expect(v.reason).toBe(SLOT_REASON.INSUFFICIENT_EXECUTION);
  });

  test('the reason renders as a fact about the BLOCK, not about the person', () => {
    const copy = explainReason(SLOT_REASON.INSUFFICIENT_EXECUTION);
    expect(copy).toBeTruthy();
    expect(copy).toMatch(/not trained often enough/);
    expect(copy).not.toMatch(/you failed|lazy|excuse|discipline/i);
    expect(copy).not.toContain('—');
  });
});

describe('WHAT THE GATE MUST NEVER SILENCE', () => {
  // Intent and safety are true whether or not the block was run. Suppressing
  // these would be a regression wearing restraint's clothes.
  const cases = [
    ['an explicit exclusion', { excluded: true }, SLOT_REASON.USER_EXCLUDED],
    ['repeated deliberate swaps', { swappedAwayCount: 3 }, SLOT_REASON.USER_SWAPPED_AWAY],
    ['repeated joint discomfort', { jointDiscomfort: true }, SLOT_REASON.JOINT_DISCOMFORT],
    ['equipment they no longer have', { equipmentLost: true }, SLOT_REASON.EQUIPMENT_LOST],
    ['no longer auto-eligible', { autoEligible: false }, SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE],
  ];

  test.each(cases)('%s still fires on an unrun block', (_name, evidence, reason) => {
    const v = slotVerdict(evidence, UNRUN);
    expect(v.reason).toBe(reason);
    expect(v.verdict).not.toBe(SLOT_VERDICT.KEEP);
  });

  test('a redundant movement is still flagged', () => {
    expect(slotVerdict({ redundant: true }, UNRUN).reason).toBe(SLOT_REASON.MOVEMENT_REDUNDANT);
  });

  test('a changed goal still applies', () => {
    const v = slotVerdict({ conflictsWithGoal: true }, { ...UNRUN, goalChanged: true });
    expect(v.reason).toBe(SLOT_REASON.GOAL_CHANGED);
  });

  test('SAFETY OUTRANKS THE GATE: discomfort beats a plateau on an unrun block', () => {
    const v = slotVerdict({ plateau: true, jointDiscomfort: true }, UNRUN);
    expect(v.reason).toBe(SLOT_REASON.JOINT_DISCOMFORT);
  });
});

describe('CASE B: a run, recovered block is judged exactly as it always was', () => {
  test('every existing caller is byte-identical: the flag defaults to judgeable', () => {
    const withFlag = slotVerdict({ plateau: true }, { epochBlocks: 2 });
    const withoutFlag = slotVerdict({ plateau: true }, { epochBlocks: 2, executionJudgeable: true });
    expect(withFlag).toEqual(withoutFlag);
    expect(withFlag.verdict).toBe(SLOT_VERDICT.REPLACE);
  });

  test('a still-progressing exercise is protected on a run block, as before', () => {
    expect(slotVerdict({ progressing: true }, RUN).reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
  });
});

describe('CASE D: the diary is irrelevant to all of this', () => {
  test('the gate reads TRAINING execution only, never a nutrition field', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../programmeEpoch.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/intake|calorie|protein|diary|nutrition/i);
  });
});

describe('THE WHOLE PROPOSAL, through the real engine', () => {
  const slots = [
    { exerciseId: 'a', exerciseName: 'Bench press' },
    { exerciseId: 'b', exerciseName: 'Row' },
    { exerciseId: 'c', exerciseName: 'Squat' },
    { exerciseId: 'd', exerciseName: 'Curl' },
  ];
  const allPlateaued = () => ({ plateau: true });

  test('a RUN block proposes the changes its evidence supports', () => {
    const p = proposeNextBlock({
      slots, evidenceFor: allPlateaued, executionJudgeable: true,
      currentStructure: { workouts: [{ name: 'A', exercises: slots }] },
    });
    expect(p.changedCount).toBe(4);
    expect(p.executionJudgeable).toBe(true);
  });

  test('THE PRODUCT RESULT: an UNRUN block proposes NOTHING, and says so', () => {
    const p = proposeNextBlock({
      slots, evidenceFor: allPlateaued, executionJudgeable: false,
      currentStructure: { workouts: [{ name: 'A', exercises: slots }] },
    });
    expect(p.changedCount).toBe(0);
    expect(p.stays).toHaveLength(4);
    expect(p.executionJudgeable).toBe(false);
    for (const s of p.slots) expect(s.reason).toBe(SLOT_REASON.INSUFFICIENT_EXECUTION);
  });

  test('and it cannot reach a structural rebuild either', () => {
    const p = proposeNextBlock({
      slots, evidenceFor: allPlateaued, executionJudgeable: false,
      currentStructure: { workouts: [{ name: 'A', exercises: slots }] },
    });
    expect(p.verdict).not.toBe('rebuild_programme');
  });

  test('the live gatherer measures execution with the SAME fact the coach uses', () => {
    // One definition of "did they run it", shared by the block review and the
    // weekly card, so the two cannot disagree about the same block.
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../blockAdvisor.js'), 'utf8',
    );
    expect(src).toMatch(/trainingExecutionFact/);
    expect(src).toMatch(/executionJudgeable = fact\.signal === SIGNAL\.GOOD/);
    // A read failure is not judgeable: the conservative direction.
    expect(src).toMatch(/catch \(_\) \{\s*executionJudgeable = false;/);
  });
});
