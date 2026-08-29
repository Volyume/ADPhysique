/**
 * CC33 round 5 (R5-1, R5-3; scorecard rows A13/C2) - the block-boundary
 * change receipt is COMPLETE on BOTH renderers.
 *
 * Round 4 (Q2) made continuity account for every incumbent and added the
 * "No longer in your plan" section - to PlanUpdateScreen only. The round-5
 * review found the block-boundary sheet (PlansScreen's "Your next block",
 * the more travelled rebuild route) still rendering stays/changes/added
 * and counting exerciseChanges without the drops, so:
 *  - a dropped incumbent appeared nowhere on that sheet (the exact
 *    silence D116 ruling 6 closed), and
 *  - a drop-only rebuild counted 0 exercise changes, took the
 *    reactivation path (refine=false), and REACTIVATED the old plan -
 *    the receipt's drop would never actually have happened.
 *
 * These are byte-level checks against the real screens, matching the
 * sibling guard convention (RoutineDetailScreen.capabilityPlanMarkers,
 * ActiveWorkoutScreen.sideCarveNote): the module-level receipt logic has
 * driven tests in campaign16.rationale/continuity; what needs pinning
 * here is that the two screens actually consume all four sections.
 */
const fs = require('fs');
const path = require('path');

const PLANS = fs.readFileSync(
  path.join(__dirname, '..', 'PlansScreen.js'),
  'utf8',
);
const UPDATE = fs.readFileSync(
  path.join(__dirname, '..', 'PlanUpdateScreen.js'),
  'utf8',
);

describe('R5-1: PlansScreen renders the no-longer-in section and counts drops as changes', () => {
  test('the block review sheet renders all FOUR receipt sections', () => {
    expect(PLANS).toContain('>What stays</Text>');
    expect(PLANS).toContain('>What changes</Text>');
    expect(PLANS).toContain('>New in your plan</Text>');
    expect(PLANS).toContain('>No longer in your plan</Text>');
    expect(PLANS).toContain('blockReview.receipt.noLongerIn.map');
  });

  test('exerciseChanges counts drops, so a drop-only rebuild takes the REBUILD path, not reactivation', () => {
    expect(PLANS).toContain(
      '? receipt.changes.length + receipt.added.length + receipt.noLongerIn.length',
    );
    // The refine gate reads this count - that is what makes the receipt
    // honest: what it shows is what the confirm does.
    expect(PLANS).toContain(
      "const refine = ((reviewed?.exerciseChanges ?? 0) + (reviewed?.prescriptionChanges ?? 0)) > 0;",
    );
  });

  test('the "Your workouts stay exactly as they are" line is gated on the FULL count (drops included)', () => {
    // With drops outside exerciseChanges this line rendered above a
    // "No longer in your plan" section that contradicted it.
    expect(PLANS).toContain('&& blockReview.exerciseChanges === 0');
  });
});

describe('R5-3: both renderers key the gone-list on exercise IDENTITY, never a display name', () => {
  test('PlansScreen keys on previousExerciseId', () => {
    expect(PLANS).toContain('key={`rv-gone-${l.previousExerciseId ?? i}`}');
  });

  test('PlanUpdateScreen keys on previousExerciseId', () => {
    expect(UPDATE).toContain('key={`gone-${l.previousExerciseId ?? i}`}');
    expect(UPDATE).not.toContain('key={`gone-${l.exerciseName}`}');
  });

  test('PlanUpdateScreen still renders the section itself (round 4, Q2)', () => {
    expect(UPDATE).toContain('>No longer in your plan</Text>');
    expect(UPDATE).toContain('staged.receipt.noLongerIn.map');
  });

  test('R6-5: the OTHER three lists key on identity too, on both renderers', () => {
    expect(PLANS).toContain('key={`rv-stay-${l.exerciseId ?? l.exerciseName}-${i}`}');
    expect(PLANS).toContain('key={`rv-chg-${l.exerciseId ?? l.exerciseName}-${i}`}');
    expect(PLANS).toContain('key={`rv-new-${l.exerciseId ?? l.exerciseName}-${i}`}');
    expect(UPDATE).toContain('key={`stay-${l.exerciseId ?? l.exerciseName}-${i}`}');
    expect(UPDATE).toContain('key={`chg-${l.exerciseId ?? l.exerciseName}-${i}`}');
    expect(UPDATE).toContain('key={`new-${l.exerciseId ?? l.exerciseName}-${i}`}');
  });

  test('R6-5: PlanUpdateScreen renders the rep-target change on its stays lines - the headline count has a section', () => {
    // The headline says "N rep targets would change too"; this renderer
    // used to carry no prescription copy at all, so with a drop present
    // the count referred to nothing on screen.
    expect(UPDATE).toContain("{l.prescriptionCopy ? ` ${l.prescriptionCopy}` : ''}");
  });
});
