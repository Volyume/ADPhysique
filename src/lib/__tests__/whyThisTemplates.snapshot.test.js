/**
 * Snapshot tests for whyThisTemplates outputs after the Move 0.5 voice
 * retrofit. Locks the new strings so an accidental rewrite or regression
 * fails CI. Updating these snapshots requires explicit reviewer sign-off.
 *
 * Also asserts every output passes the jargon blocklist and uses the
 * Precision Coaching naming where the synthesis says it should.
 *
 * Campaign 4 (coherence-cleanup-2026-08-10, AUDIT-DEAD-FUNCTIONS.md §3/§6.2):
 * getVolumeStatusMessage, getProgressionMessage, getAutoRegMessage,
 * getWeekPhaseDescription, getDeloadPredictionMessage, getTravelModeMessage
 * and getPosingConditioningMessage were confirmed zero-caller and deleted
 * from whyThisTemplates.js. Their standalone snapshot tests, and their
 * entries in the three voice-law arrays below, are removed with them per
 * D95-RULINGS.md. The "no fake-autonomy framing on locked decisions" law
 * (Pattern 15) had 7 dead subjects and 0 live ones in this file, so that
 * whole test is gone; the law itself was moved onto live coach output FIRST
 * (coachResponse.test.js "no false collaboration or fake autonomy", extended
 * to ban the same patterns) before this deletion landed.
 */
import {
  getExerciseWhyThis,
  getSplitRationale,
  getSetupReceiptLine,
  getStarterSessionMessage,
  getTimeCrunchMessage,
  checkJargon,
} from '../whyThisTemplates';

describe('whyThisTemplates: locked output snapshots', () => {
  test('getTimeCrunchMessage cuts and trims', () => {
    expect(getTimeCrunchMessage(['Bench press'], 0.3, 45)).toMatchInlineSnapshot(`"Rest cut by 30%. Bench press removed to fit your time. Estimated session: 45 minutes."`);
    expect(getTimeCrunchMessage(['Lateral raise', 'Face pull'], 0.2, 40)).toMatchInlineSnapshot(`"Rest cut by 20%. Lateral raise and Face pull removed to fit your time. Estimated session: 40 minutes."`);
    expect(getTimeCrunchMessage([], 0.25, 50)).toMatchInlineSnapshot(`"Rest cut by 25%. Estimated session: 50 minutes."`);
  });

  test('getSplitRationale unchanged (structural, no decision attributed)', () => {
    expect(getSplitRationale('full_body')).toContain('Every session trains all your muscle groups');
    expect(getSplitRationale('upper_lower')).toContain('Alternating upper and lower');
    expect(getSplitRationale('ppl')).toContain('Push, Pull, Legs');
  });

  test('getSetupReceiptLine: division leads with identity (COMP-013)', () => {
    expect(getSetupReceiptLine({ trainingGoal: 'mens_physique' })).toMatchInlineSnapshot(
      `"Built for Men's Physique. Shoulders and back width lead, midsection stays tight."`
    );
    expect(getSetupReceiptLine({ trainingGoal: 'bikini' })).toMatchInlineSnapshot(
      `"Built for Bikini. Glutes and hamstrings lead, upper body stays lean."`
    );
  });

  test('getSetupReceiptLine: general echoes days + weak points the engine acted on', () => {
    expect(getSetupReceiptLine({ trainingGoal: 'general', daysPerWeek: 4, weakPointLabels: ['Rear Delts'] })).toMatchInlineSnapshot(
      `"Built around your 4 days. Extra work on rear delts, like you asked."`
    );
    expect(getSetupReceiptLine({ trainingGoal: 'general', daysPerWeek: 5, weakPointLabels: ['Glutes', 'Calves'] })).toMatchInlineSnapshot(
      `"Built around your 5 days. Extra work on glutes and calves, like you asked."`
    );
    // no weak points → just the commitment, no over-claim
    expect(getSetupReceiptLine({ trainingGoal: 'general', daysPerWeek: 3 })).toMatchInlineSnapshot(
      `"Built around your 3 days."`
    );
    // missing days → safe generic, never a broken string
    expect(getSetupReceiptLine({ trainingGoal: 'general' })).toMatchInlineSnapshot(
      `"Built around your plan."`
    );
  });

  test('getStarterSessionMessage frames the subset honestly (COMP-013)', () => {
    expect(getStarterSessionMessage('Back + Delts (Width)', 4, 2)).toMatchInlineSnapshot(
      `"Short version of Back + Delts (Width): 4 exercises, 2 sets each. The full session starts next time."`
    );
    expect(getStarterSessionMessage('Lower + Abs', 1, 2)).toMatchInlineSnapshot(
      `"Short version of Lower + Abs: 1 exercise, 2 sets each. The full session starts next time."`
    );
    // missing name → safe generic, never a broken string
    expect(getStarterSessionMessage(null, 3)).toMatchInlineSnapshot(
      `"Short version of your plan: 3 exercises, 2 sets each. The full session starts next time."`
    );
  });

  test('getExerciseWhyThis covers all subregions without jargon', () => {
    const subregions = [
      'vertical_pull', 'horizontal_row', 'lower_lat',
      'incline', 'flat', 'decline',
      'overhead_press', 'lateral_raise', 'face_pull', 'horiz_abduction',
      'hip_extension', 'knee_flexion',
      'overhead', 'pushdown',
      'gastro', 'soleus',
      'flexion', 'anti_extension', 'rotation',
      'supinated_curl', 'neutral_curl',
      'default',
    ];
    for (const sub of subregions) {
      const out = getExerciseWhyThis('Test exercise', sub);
      expect(out.length).toBeGreaterThan(20);
      expect(checkJargon(out).clean).toBe(true);
    }
  });
});

describe('whyThisTemplates: voice rules compliance', () => {
  test('decision-outputs state the call plainly, without naming the product', () => {
    // Founder decision 2026-06-03: drop "Precision Coaching has..." as the
    // in-message narrator. Engine actions state the decision plainly (impersonal
    // or "we"), so a real coach voice comes through rather than the app naming
    // its own algorithm every sentence.
    const decisionOutputs = [
      getTimeCrunchMessage(['X'], 0.2, 40),
    ];
    for (const out of decisionOutputs) {
      expect(out).not.toMatch(/Precision Coaching/);
      expect(out.length).toBeGreaterThan(20);
    }
  });

  test('descriptive (non-decision) outputs do not need Precision Coaching naming', () => {
    // These describe state, anatomy, or structure. No decision attributed.
    const descriptiveOutputs = [
      getExerciseWhyThis('Bench press', 'flat'),
      getSplitRationale('full_body'),
    ];
    for (const out of descriptiveOutputs) {
      // Either they mention Precision Coaching or they don't; the spec is
      // only that decision-attributed outputs MUST. Descriptive outputs MAY.
      expect(out.length).toBeGreaterThan(20);
    }
  });

  test('no jargon in any output across the full library', () => {
    const allOutputs = [
      getSplitRationale('full_body'),
      getSplitRationale('upper_lower'),
      getSplitRationale('ppl'),
      getSplitRationale('ppl_ab'),
      getSplitRationale('upper_lower_wp'),
      getTimeCrunchMessage(['Bench'], 0.3, 45),
      getTimeCrunchMessage([], 0.25, 50),
    ];
    for (const out of allOutputs) {
      const check = checkJargon(out);
      if (!check.clean) {
        throw new Error(`Jargon detected in: "${out}", violations: ${check.violations.join(', ')}`);
      }
    }
  });
});
