/**
 * campaign16.blockReview.test.js — Campaign 16 phase C.
 *
 * FOUNDER BRIEF: "The pure programmeEpoch engine currently has NO
 * production consumer. That must be completed. Do NOT leave another
 * dead-helper architecture." Plus: close the consider_rebuild mismatch,
 * prove Repeat bypasses elective refinement, and never say "your programme
 * has changed" before the user confirms.
 *
 * WHAT THIS SUITE PINS
 *
 * That the engine is CONSUMED, and consumed correctly:
 *
 *   - a real production path calls it (a source guard, because "we will
 *     wire it later" is exactly how the last dead-helper architecture
 *     happened, and Campaign 15 found the previous one);
 *   - a rebuild is only ever CALLED a rebuild when the structure has a
 *     reason to change, never because one or two slots did;
 *   - Repeat cannot reach any of it;
 *   - every user-facing string describes a PROPOSAL.
 */

const fs = require('fs');
const path = require('path');
const {
  proposeNextBlock, verdictCopy, recoveryHeadsUp, blockReadyNotificationBody,
  reviewSections, PROGRAMME_VERDICT, SLOT_VERDICT, SLOT_REASON,
} = require('../blockReview');

const slot = (id, name, workout = 'Upper') => ({ exerciseId: id, exerciseName: name, workout });
const SLOTS = [
  slot('a', 'Barbell Bench Press'),
  slot('b', 'Lat Pulldown (Wide Grip)'),
  slot('c', 'Barbell Back Squat', 'Lower'),
  slot('d', 'Lying Leg Curl', 'Lower'),
];

const productive = { progressing: true, sessions: 10 };
const structure = { workouts: [{ name: 'Upper', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }] }] };
const blocks = n => Array.from({ length: n }, () => ({ structure, completed: true }));

// ---------------------------------------------------------------------------

describe('C16-C the epoch engine has a real production consumer', () => {
  test('blockAdvisor calls the review on a finished block', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../blockAdvisor.js'), 'utf8');
    expect(src).toMatch(/require\('\.\/blockReview'\)/);
    expect(src).toMatch(/buildProgrammeReview\(userId, activeBlock\)/);
    // On the completed-awaiting-decision branch specifically.
    const branch = src.slice(src.indexOf("blockStatus?.status === 'completed_awaiting_decision'"));
    expect(branch.slice(0, 2000)).toMatch(/programmeReview/);
  });

  test('blockReview genuinely delegates to programmeEpoch rather than re-deciding', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../blockReview.js'), 'utf8');
    expect(src).toMatch(/from '\.\/programmeEpoch'/);
    expect(src).toMatch(/slotVerdict\(/);
    expect(src).toMatch(/programmeVerdict\(/);
    // No second opinion: it must not invent its own thresholds.
    const code = src.slice(src.indexOf('export function proposeNextBlock'));
    expect(code).not.toMatch(/>= 3|epochBlocks > \d/);
  });

  test('the review is Pro-only and never costs the card when it fails', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../blockAdvisor.js'), 'utf8');
    expect(src).toMatch(/if \(isPro\) \{\s*\n\s*try \{\s*\n\s*programmeReview = await buildProgrammeReview/);
    expect(src).toMatch(/catch \(_\) \{ programmeReview = null; \}/);
  });
});

describe('C16-C a rebuild is only called a rebuild when the structure moved', () => {
  test('one changed slot is a REFINEMENT, not a rebuild', () => {
    const p = proposeNextBlock({
      slots: SLOTS,
      history: blocks(5),
      currentStructure: structure,
      evidenceFor: id => (id === 'a' ? { excluded: true } : productive),
    });
    expect(p.changedCount).toBe(1);
    expect(p.verdict).toBe(PROGRAMME_VERDICT.REFINE_PROGRAMME);
  });

  test('two changed slots are still a refinement', () => {
    const p = proposeNextBlock({
      slots: SLOTS,
      history: blocks(5),
      currentStructure: structure,
      evidenceFor: id => (id === 'a' || id === 'b' ? { excluded: true } : productive),
    });
    expect(p.changedCount).toBe(2);
    expect(p.verdict).toBe(PROGRAMME_VERDICT.REFINE_PROGRAMME);
  });

  test('a real structural change IS a rebuild', () => {
    const p = proposeNextBlock({
      slots: SLOTS,
      history: blocks(5),
      currentStructure: structure,
      evidenceFor: () => productive,
      daysChanged: true,
      equipmentChanged: true,
    });
    expect(p.verdict).toBe(PROGRAMME_VERDICT.REBUILD_PROGRAMME);
  });

  test('nothing wrong anywhere is CONTINUE_STRUCTURE, recorded as a decision', () => {
    const p = proposeNextBlock({
      slots: SLOTS, history: blocks(5), currentStructure: structure,
      evidenceFor: () => productive,
    });
    expect(p.verdict).toBe(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
    expect(p.changedCount).toBe(0);
    // Quality law 6: every retained slot carries a positive reason.
    expect(p.stays).toHaveLength(SLOTS.length);
    for (const s of p.stays) expect(s.reason).toBe(SLOT_REASON.STILL_PRODUCTIVE);
  });
});

describe('C16-C blocks 1 and 2 keep a strong continuity bias', () => {
  test('an early epoch does not become eligible for structural review', () => {
    for (const n of [0, 1, 2]) {
      const p = proposeNextBlock({
        slots: SLOTS, history: blocks(n), currentStructure: structure,
        evidenceFor: () => ({ sessions: 2, systematicCandidate: true }),
      });
      expect(p.reviewDue).toBe(false);
      expect(p.changedCount).toBe(0);
    }
  });

  test('but an early TRIGGER still fires in block 1', () => {
    const p = proposeNextBlock({
      slots: SLOTS, history: blocks(0), currentStructure: structure,
      evidenceFor: id => (id === 'a' ? { excluded: true } : productive),
    });
    expect(p.changedCount).toBe(1);
    expect(p.changes[0].reason).toBe(SLOT_REASON.USER_EXCLUDED);
  });

  test('at the review point, elective variation becomes eligible - but never for a productive lift', () => {
    const p = proposeNextBlock({
      slots: SLOTS, history: blocks(4), currentStructure: structure,
      evidenceFor: () => ({ sessions: 8, progressing: true, systematicCandidate: true }),
    });
    expect(p.reviewDue).toBe(true);
    expect(p.changedCount).toBe(0);
  });
});

describe('C16-C REPEAT means repeat', () => {
  test('the repeat route carries no learned volume', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../screens/PlansScreen.js'), 'utf8');
    expect(src).toMatch(/allowLearnedCarry: seedIntent !== 'repeat'/);
  });

  test('no elective refinement can leak into it: the review is never called on that path', () => {
    // The structural half is computed for the DECISION SURFACE, and the
    // repeat action takes the user's existing plan untouched. Nothing in
    // the repeat path may consult the proposal.
    const src = fs.readFileSync(path.resolve(__dirname, '../../screens/PlansScreen.js'), 'utf8');
    expect(src).not.toMatch(/proposeNextBlock|programmeReview/);
    const advisor = fs.readFileSync(path.resolve(__dirname, '../blockAdvisor.js'), 'utf8');
    // The review is built only on the finished-block branch, and it is
    // information; it never rewrites a plan.
    expect(advisor).not.toMatch(/addExerciseToRoutine|updateRoutineExerciseExercise/);
  });

  test('the proposal is inert data: it mutates nothing', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../blockReview.js'), 'utf8');
    expect(src).not.toMatch(/await |async function|require\('\.\/database'\)/);
  });
});

describe('C16-C the copy proposes, it never announces', () => {
  test('no verdict copy claims the programme has already changed', () => {
    for (const v of Object.values(PROGRAMME_VERDICT)) {
      const c = verdictCopy(v, { changedCount: 2 });
      expect(c.title).toBeTruthy();
      expect(c.body).toBeTruthy();
      expect(`${c.title} ${c.body}`.toLowerCase()).not.toMatch(/your programme has changed|we have changed|has been updated/);
    }
  });

  test('an unchanged structure explains that it is deliberate', () => {
    const c = verdictCopy(PROGRAMME_VERDICT.CONTINUE_STRUCTURE);
    expect(c.body).toMatch(/still producing good evidence/i);
  });

  test('the recovery heads-up informs and promises nothing', () => {
    const early = recoveryHeadsUp({ epochBlocks: 1 });
    expect(early.body).toMatch(/next block review is coming up/i);
    expect(early.body).not.toMatch(/will change|we will replace|new exercises/i);
    // Only once the epoch is old enough does it mention structure.
    expect(early.body).not.toMatch(/exercise structure/i);
    const mature = recoveryHeadsUp({ epochBlocks: 3 });
    expect(mature.body).toMatch(/exercise structure/i);
  });

  test('the push says review, never "changed", and only claims changes when there are some', () => {
    expect(blockReadyNotificationBody(null)).toBe('Your next block is ready to review.');
    expect(blockReadyNotificationBody({ changedCount: 0 })).toBe('Your next block is ready to review.');
    const withChanges = blockReadyNotificationBody({ changedCount: 2 });
    expect(withChanges).toMatch(/most of your plan stays, with 2 changes recommended/);
    expect(withChanges).not.toMatch(/changed/);
    expect(blockReadyNotificationBody({ changedCount: 1 })).toMatch(/1 change recommended/);
  });

  test('British English and no em dashes in any user-facing string', () => {
    const strings = [
      ...Object.values(PROGRAMME_VERDICT).flatMap(v => {
        const c = verdictCopy(v, { changedCount: 2 });
        return [c.title, c.body];
      }),
      recoveryHeadsUp({ epochBlocks: 1 }).body,
      recoveryHeadsUp({ epochBlocks: 4 }).body,
      blockReadyNotificationBody(null),
      blockReadyNotificationBody({ changedCount: 3 }),
    ];
    for (const s of strings) {
      expect(s).not.toMatch(/—/);
      expect(s).not.toMatch(/\bcolor\b|\bbehavior\b|\boptimize\b/);
    }
  });
});

describe('C16-C the review screen gets what stays, what changes and why', () => {
  test('sections carry both halves with machine-readable reasons', () => {
    const p = proposeNextBlock({
      slots: SLOTS, history: blocks(5), currentStructure: structure,
      evidenceFor: id => (id === 'a' ? { excluded: true } : productive),
    });
    const s = reviewSections(p);
    expect(s.verdict).toBe(PROGRAMME_VERDICT.REFINE_PROGRAMME);
    expect(s.changes).toHaveLength(1);
    expect(s.changes[0].reason).toBe(SLOT_REASON.USER_EXCLUDED);
    expect(s.stays).toHaveLength(3);
    for (const st of s.stays) expect(Object.values(SLOT_REASON)).toContain(st.reason);
  });

  test('a prescription change is shown as a STAY, not a replacement', () => {
    // The amendment is explicit that changing the prescription is often the
    // smaller intervention, and the user should see the exercise as kept.
    const p = proposeNextBlock({
      slots: [slot('a', 'Barbell Bench Press')],
      history: blocks(5), currentStructure: structure,
      evidenceFor: () => ({ plateau: true, prescriptionFix: true }),
    });
    expect(p.changedCount).toBe(0);
    const s = reviewSections(p);
    expect(s.stays[0].prescriptionChange).toBe(true);
    expect(s.stays[0].reason).toBe(SLOT_REASON.PLATEAU);
  });

  test('a removal is distinguishable from a replacement', () => {
    const p = proposeNextBlock({
      slots: [slot('a', 'Cable Lat Pullover')],
      history: blocks(5), currentStructure: structure,
      evidenceFor: () => ({ redundant: true }),
    });
    const s = reviewSections(p);
    expect(s.changes[0].removed).toBe(true);
    expect(s.changes[0].reason).toBe(SLOT_REASON.MOVEMENT_REDUNDANT);
    expect(p.slots[0].verdict).toBe(SLOT_VERDICT.REMOVE_OR_REDISTRIBUTE);
  });
});
