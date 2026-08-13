/**
 * campaign16.programmeEpoch.test.js — the Campaign 16 amendment.
 *
 * What this suite pins and why:
 *
 * A block is about four hard weeks plus recovery. A programme epoch is the
 * run of consecutive blocks sharing substantially one exercise structure.
 * Conflating them is how an app rotates someone's exercises every four
 * weeks, and there is no defensible evidence for doing that. The rule this
 * encodes is the founder's:
 *
 *   A block boundary is a REVIEW OPPORTUNITY.
 *   A block boundary is NOT an exercise-change trigger.
 *
 * Two failure modes are equally bad and both are pinned here. Manufacturing
 * change - rotating a productive movement because it is "old" - and never
 * reviewing at all, so the app quietly runs the same plan forever because
 * nobody changed their training days.
 *
 * The longitudinal cases A-H from the amendment are pinned by name at the
 * bottom, so a future change that breaks one is legible as breaking THAT
 * scenario rather than as an anonymous assertion failure.
 */

const {
  PROGRAMME_VERDICT, SLOT_VERDICT, SLOT_REASON,
  EPOCH_REVIEW_BLOCKS, EPOCH_CONTINUITY_SIMILARITY,
  structureSignature, structureSimilarity, isSameEpochStructure,
  countEpochBlocks, epochReviewDue, slotVerdict, programmeVerdict,
  epochContinues, isEarlyTrigger,
} = require('../programmeEpoch');

// A four-day upper/lower programme, expressed the way the app holds one.
const programme = (over = {}) => ({
  splitType: 'upper_lower',
  days: [
    { name: 'Upper A', exercises: [{ exerciseId: 'bench' }, { exerciseId: 'pulldown' }, { exerciseId: 'lateral' }] },
    { name: 'Lower A', exercises: [{ exerciseId: 'squat' }, { exerciseId: 'rdl' }, { exerciseId: 'calf' }] },
    { name: 'Upper B', exercises: [{ exerciseId: 'incline' }, { exerciseId: 'row' }, { exerciseId: 'curl' }] },
    { name: 'Lower B', exercises: [{ exerciseId: 'legpress' }, { exerciseId: 'legcurl' }, { exerciseId: 'abs' }] },
  ],
  ...over,
});

const sig = over => structureSignature(programme(over));
const BASE = sig();

// A history of N completed blocks all on the same structure.
const ranBlocks = (n, signature = BASE) =>
  Array.from({ length: n }, () => ({ signature, completed: true }));

// A productive slot: nothing wrong, still adding load.
const productive = { progressing: true };

describe('C16-E structural identity ignores what a block is allowed to change', () => {
  test('sets, ramps, recovery and rep ranges are not part of the signature (14)', () => {
    // The amendment is explicit: changing volume must not reset the epoch.
    // The signature never sees these fields, so it cannot.
    const withPrescription = structureSignature({
      splitType: 'upper_lower',
      days: programme().days.map(d => ({
        ...d,
        exercises: d.exercises.map(e => ({ ...e, sets: 5, repMin: 12, repMax: 15, restSec: 90 })),
      })),
    });
    expect(withPrescription).toEqual(BASE);
    expect(isSameEpochStructure(BASE, withPrescription)).toBe(true);
  });

  test('the programme database id is deliberately not part of it', () => {
    // A rebuilt or copied plan can carry an identical structure under a new
    // id. Treating that as a fresh epoch would hand the user a structural
    // review they have not earned.
    const copied = structureSignature({ ...programme(), id: 'a-brand-new-programme-id' });
    expect(isSameEpochStructure(BASE, copied)).toBe(true);
  });

  test('one refined accessory keeps the epoch (12)', () => {
    const refined = sig({
      days: programme().days.map(d => (d.name === 'Upper B'
        ? { ...d, exercises: [{ exerciseId: 'incline' }, { exerciseId: 'row' }, { exerciseId: 'hammercurl' }] }
        : d)),
    });
    expect(structureSimilarity(BASE, refined)).toBeGreaterThan(EPOCH_CONTINUITY_SIMILARITY);
    expect(isSameEpochStructure(BASE, refined)).toBe(true);
  });

  test('a different day count always starts a new epoch (13)', () => {
    const fiveDay = sig({ days: [...programme().days, { name: 'Arms', exercises: [{ exerciseId: 'curl2' }] }] });
    expect(isSameEpochStructure(BASE, fiveDay)).toBe(false);
  });

  test('a different split always starts a new epoch (13)', () => {
    expect(isSameEpochStructure(BASE, sig({ splitType: 'push_pull_legs' }))).toBe(false);
  });

  test('wholesale exercise replacement starts a new epoch (13)', () => {
    const rebuilt = sig({
      days: programme().days.map((d, i) => ({
        ...d, exercises: [{ exerciseId: `new${i}a` }, { exerciseId: `new${i}b` }, { exerciseId: `new${i}c` }],
      })),
    });
    expect(structureSimilarity(BASE, rebuilt)).toBe(0);
    expect(isSameEpochStructure(BASE, rebuilt)).toBe(false);
  });
});

describe('C16-E the epoch counter counts real repeated exposure', () => {
  test('only COMPLETED blocks count', () => {
    // An abandoned block is not evidence, and counting it would hand
    // someone a structural review they never trained for.
    expect(countEpochBlocks(BASE, ranBlocks(3))).toBe(3);
    expect(countEpochBlocks(BASE, [
      { signature: BASE, completed: true },
      { signature: BASE, completed: false },
      { signature: BASE, completed: true },
    ])).toBe(1);
  });

  test('the run stops at the first structurally different block', () => {
    const other = sig({ splitType: 'push_pull_legs' });
    expect(countEpochBlocks(BASE, [
      { signature: BASE, completed: true },
      { signature: BASE, completed: true },
      { signature: other, completed: true },
      { signature: other, completed: true },
    ])).toBe(2);
  });

  test('review is due only at the threshold', () => {
    expect(epochReviewDue(0)).toBe(false);
    expect(epochReviewDue(EPOCH_REVIEW_BLOCKS - 1)).toBe(false);
    expect(epochReviewDue(EPOCH_REVIEW_BLOCKS)).toBe(true);
    expect(epochReviewDue(EPOCH_REVIEW_BLOCKS + 5)).toBe(true);
  });
});

describe('C16-E early blocks do not rotate for variety (1, 2, 6)', () => {
  test('block 1 produces no elective rotation (1)', () => {
    const v = slotVerdict({ systematicCandidate: true }, { epochBlocks: 1 });
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
    expect(v.reason).toBe(SLOT_REASON.INSUFFICIENT_HISTORY);
  });

  test('block 2 produces no elective rotation (2)', () => {
    const v = slotVerdict({ systematicCandidate: true }, { epochBlocks: 2 });
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
  });

  test('calendar age ALONE never produces REPLACE, at any age (6)', () => {
    // The core of the ruling. An exercise that is simply old, with no
    // evidence against it, is never rotated out.
    for (const epochBlocks of [1, 2, 3, 4, 8, 20]) {
      expect(slotVerdict({}, { epochBlocks }).verdict).toBe(SLOT_VERDICT.KEEP);
      expect(slotVerdict(productive, { epochBlocks }).verdict).toBe(SLOT_VERDICT.KEEP);
    }
  });

  test('a single bad session cannot replace anything (8)', () => {
    // One swap is not a pattern, and one uncomfortable session is not
    // repeated joint evidence. Both need to be sustained.
    expect(slotVerdict({ swappedAwayCount: 1 }, { epochBlocks: 5 }).verdict).toBe(SLOT_VERDICT.KEEP);
    expect(slotVerdict({ jointDiscomfort: false }, { epochBlocks: 5 }).verdict).toBe(SLOT_VERDICT.KEEP);
  });
});

describe('C16-E safety and user intent outrank continuity (7)', () => {
  test.each([
    ['an explicit exclusion', { excluded: true }, SLOT_REASON.USER_EXCLUDED],
    ['repeated joint discomfort', { jointDiscomfort: true }, SLOT_REASON.JOINT_DISCOMFORT],
    ['repeated swaps away', { swappedAwayCount: 2 }, SLOT_REASON.USER_SWAPPED_AWAY],
    ['equipment no longer available', { equipmentLost: true }, SLOT_REASON.EQUIPMENT_LOST],
    ['no longer auto-eligible', { autoEligible: false }, SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE],
  ])('%s replaces even in block 1 (7)', (_label, evidence, reason) => {
    const v = slotVerdict(evidence, { epochBlocks: 1 });
    expect(v.verdict).toBe(SLOT_VERDICT.REPLACE);
    expect(v.reason).toBe(reason);
    expect(isEarlyTrigger(v.reason)).toBe(true);
  });

  test('exactly one reason is gated on the review threshold', () => {
    // Everything except systematic variation is either something being
    // wrong or the user telling us, and neither can be made to wait for a
    // block count.
    expect(isEarlyTrigger(SLOT_REASON.SYSTEMATIC_VARIATION)).toBe(false);
    for (const r of [
      SLOT_REASON.USER_EXCLUDED, SLOT_REASON.JOINT_DISCOMFORT,
      SLOT_REASON.USER_SWAPPED_AWAY, SLOT_REASON.EQUIPMENT_LOST,
      SLOT_REASON.NO_LONGER_AUTO_ELIGIBLE, SLOT_REASON.MOVEMENT_REDUNDANT,
      SLOT_REASON.COVERAGE_GAP, SLOT_REASON.GOAL_CHANGED,
      SLOT_REASON.SESSION_LENGTH_CHANGED,
    ]) expect(isEarlyTrigger(r)).toBe(true);
  });

  test('safety outranks even a still-progressing exercise', () => {
    const v = slotVerdict({ progressing: true, jointDiscomfort: true }, { epochBlocks: 9 });
    expect(v.verdict).toBe(SLOT_VERDICT.REPLACE);
  });
});

describe('C16-E plateau opens a question, it does not decide the answer (9, 10)', () => {
  test('a genuine multi-session plateau reaches review (9)', () => {
    const v = slotVerdict({ plateau: true }, { epochBlocks: 3 });
    expect(v.reason).toBe(SLOT_REASON.PLATEAU);
    expect([SLOT_VERDICT.REPLACE, SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE]).toContain(v.verdict);
  });

  test('a plateau can be answered by changing the prescription instead (10)', () => {
    // Often the smaller and better intervention. Plateau must not always
    // mean replacement.
    const v = slotVerdict({ plateau: true, prescriptionFix: true }, { epochBlocks: 3 });
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE);
    expect(v.reason).toBe(SLOT_REASON.PLATEAU);
  });

  test('plateau does not need the review threshold: it is evidence, not variety', () => {
    const v = slotVerdict({ plateau: true, prescriptionFix: true }, { epochBlocks: 1 });
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE);
  });
});

describe('C16-E block 3 enables review without forcing change (3, 4, 5)', () => {
  test('the structural review becomes available at block 3 (3)', () => {
    const v = slotVerdict({ systematicCandidate: true }, { epochBlocks: 3 });
    expect(v.verdict).toBe(SLOT_VERDICT.REPLACE);
    expect(v.reason).toBe(SLOT_REASON.SYSTEMATIC_VARIATION);
  });

  test('block 3 does NOT force change when the evidence is still positive (4)', () => {
    // Positive evidence actively protects a movement. This is the case the
    // amendment calls out by name: everything works, so nothing changes.
    const v = slotVerdict({ systematicCandidate: true, progressing: true }, { epochBlocks: 3 });
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
    expect(v.reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
  });

  test('a productive exercise survives five or more blocks (5)', () => {
    // There is no maximum exercise age. A productive incline press, leg
    // press or chest-supported row does not expire because it is old.
    for (const epochBlocks of [5, 8, 12, 30]) {
      const v = slotVerdict({ progressing: true, systematicCandidate: true }, { epochBlocks });
      expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
      expect(v.reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
    }
  });
});

describe('C16-E the programme verdict is proportionate (11, 12, 13)', () => {
  const keeps = n => Array.from({ length: n }, () => ({ verdict: SLOT_VERDICT.KEEP, reason: SLOT_REASON.STILL_PRODUCTIVE }));
  const replace = reason => ({ verdict: SLOT_VERDICT.REPLACE, reason });

  test('nothing to change is CONTINUE_STRUCTURE, and the review still happened', () => {
    const r = programmeVerdict({ epochBlocks: 4, slotVerdicts: keeps(12) });
    expect(r.verdict).toBe(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
    expect(r.changedSlots).toBe(0);
    // The distinction that stops "same plan forever because nobody asked":
    // the review was DUE and was performed, and its answer was yes.
    expect(r.reviewDue).toBe(true);
  });

  test('a couple of justified slots is a REFINEMENT, never a rebuild (11)', () => {
    const r = programmeVerdict({
      epochBlocks: 3,
      slotVerdicts: [...keeps(10), replace(SLOT_REASON.MOVEMENT_REDUNDANT), replace(SLOT_REASON.PLATEAU)],
    });
    expect(r.verdict).toBe(PROGRAMME_VERDICT.REFINE_PROGRAMME);
    expect(r.changedSlots).toBe(2);
    expect(r.reasons).toEqual(
      expect.arrayContaining([SLOT_REASON.MOVEMENT_REDUNDANT, SLOT_REASON.PLATEAU]),
    );
  });

  test('a refinement does NOT start a new epoch (12)', () => {
    const r = programmeVerdict({ epochBlocks: 3, slotVerdicts: [...keeps(10), replace(SLOT_REASON.PLATEAU)] });
    expect(epochContinues(r)).toBe(true);
  });

  test('material structural change is a REBUILD regardless of slot churn (13)', () => {
    for (const change of [
      { daysChanged: true }, { equipmentChanged: true },
      { sessionLengthChanged: true }, { goalChanged: true },
    ]) {
      const r = programmeVerdict({ epochBlocks: 6, slotVerdicts: keeps(12), ...change });
      expect(r.verdict).toBe(PROGRAMME_VERDICT.REBUILD_PROGRAMME);
      expect(epochContinues(r)).toBe(false);
    }
  });

  test('volume changes alone never reset the epoch (14)', () => {
    // No slot moved and nothing structural changed, so the verdict is
    // continue and the counter carries on, however much volume moved.
    const r = programmeVerdict({ epochBlocks: 7, slotVerdicts: keeps(12) });
    expect(epochContinues(r)).toBe(true);
    expect(r.epochBlocks).toBe(7);
  });
});

// ─── The amendment's longitudinal cases, pinned by name ───────────────────

describe('C16-E longitudinal cases A to H', () => {
  test('A: first successful block keeps its productive press', () => {
    const v = slotVerdict(productive, { epochBlocks: 1 });
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
  });

  test('B: second successful block still keeps it, with no "it has been 10 weeks"', () => {
    const v = slotVerdict(productive, { epochBlocks: 2 });
    expect(v.verdict).toBe(SLOT_VERDICT.KEEP);
    expect(v.reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
  });

  test('C: three blocks, one redundant back row, refine only that slot', () => {
    const slots = [
      slotVerdict(productive, { epochBlocks: 3 }),
      slotVerdict(productive, { epochBlocks: 3 }),
      slotVerdict({ redundant: true }, { epochBlocks: 3 }),
      ...Array.from({ length: 9 }, () => slotVerdict(productive, { epochBlocks: 3 })),
    ];
    const r = programmeVerdict({ epochBlocks: 3, slotVerdicts: slots });
    expect(r.verdict).toBe(PROGRAMME_VERDICT.REFINE_PROGRAMME);
    expect(r.changedSlots).toBe(1);
    expect(slots[2].verdict).toBe(SLOT_VERDICT.REMOVE_OR_REDISTRIBUTE);
  });

  test('D: three blocks and everything works, so nothing is manufactured', () => {
    const slots = Array.from({ length: 12 }, () => slotVerdict(productive, { epochBlocks: 3 }));
    const r = programmeVerdict({ epochBlocks: 3, slotVerdicts: slots });
    expect(r.verdict).toBe(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
    expect(r.changedSlots).toBe(0);
    expect(r.reviewDue).toBe(true);   // reviewed, and retained
  });

  test('E: multi-block stall picks the better of two interventions', () => {
    expect(slotVerdict({ plateau: true, prescriptionFix: true }, { epochBlocks: 4 }).verdict)
      .toBe(SLOT_VERDICT.KEEP_WITH_PRESCRIPTION_CHANGE);
    expect(slotVerdict({ plateau: true, prescriptionFix: false }, { epochBlocks: 4 }).verdict)
      .toBe(SLOT_VERDICT.REPLACE);
  });

  test('F: repeated joint issue replaces before the three-block threshold', () => {
    const v = slotVerdict({ jointDiscomfort: true, progressing: true }, { epochBlocks: 1 });
    expect(v.verdict).toBe(SLOT_VERDICT.REPLACE);
    expect(v.reason).toBe(SLOT_REASON.JOINT_DISCOMFORT);
  });

  test('G: repeated swaps away replace during an early epoch', () => {
    const v = slotVerdict({ swappedAwayCount: 3 }, { epochBlocks: 2 });
    expect(v.verdict).toBe(SLOT_VERDICT.REPLACE);
    expect(v.reason).toBe(SLOT_REASON.USER_SWAPPED_AWAY);
  });

  test('H: five-plus productive blocks keep the exercise, but were still reviewed', () => {
    const slots = Array.from({ length: 12 }, () => slotVerdict(productive, { epochBlocks: 6 }));
    const r = programmeVerdict({ epochBlocks: 6, slotVerdicts: slots });
    expect(r.verdict).toBe(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
    expect(r.reviewDue).toBe(true);
    expect(epochContinues(r)).toBe(true);
  });
});
