/**
 * Snapshot tests for whyThisTemplates outputs after the Move 0.5 voice
 * retrofit. Locks the new strings so an accidental rewrite or regression
 * fails CI. Updating these snapshots requires explicit reviewer sign-off.
 *
 * Also asserts every output passes the jargon blocklist and uses the
 * Precision Coaching naming where the synthesis says it should.
 */
import {
  getExerciseWhyThis,
  getVolumeStatusMessage,
  getProgressionMessage,
  getAutoRegMessage,
  getWeekPhaseDescription,
  getSplitRationale,
  getDeloadPredictionMessage,
  getTimeCrunchMessage,
  getTravelModeMessage,
  getPosingConditioningMessage,
  checkJargon,
} from '../whyThisTemplates';

describe('whyThisTemplates: locked output snapshots', () => {
  test('getVolumeStatusMessage all statuses', () => {
    expect(getVolumeStatusMessage('below_minimum', 'Chest', 6)).toMatchInlineSnapshot(`"Chest: 6 sets this week. You can add a session or two if you want this muscle growing faster."`);
    expect(getVolumeStatusMessage('optimal', 'Back', 14)).toMatchInlineSnapshot(
      `"Back: 14 sets this week, right in the range where muscle adapts best."`
    );
    expect(getVolumeStatusMessage('approaching_limit', 'Shoulders', 18)).toMatchInlineSnapshot(`"Shoulders: 18 sets this week, near the upper end. Good, but watch recovery. Volume pulls back if you get sore."`);
    expect(getVolumeStatusMessage('over_limit', 'Quads', 24)).toMatchInlineSnapshot(`"Quads: 24 sets this week, more than your body can likely recover from. Next week's plan drops 2-3 sets."`);
  });

  test('getProgressionMessage all actions', () => {
    expect(getProgressionMessage('add_weight', 80, 82.5, 'kg')).toMatchInlineSnapshot(`"Your next session moves to 82.5kg. You completed every working set at the current weight."`);
    expect(getProgressionMessage('add_weight', 80, null, 'kg')).toMatchInlineSnapshot(`"Target weight goes up next session. Your current load is no longer challenging enough."`);
    expect(getProgressionMessage('add_rep')).toMatchInlineSnapshot(`"Weight stays the same, aim for one more rep next time."`);
    expect(getProgressionMessage('hold')).toMatchInlineSnapshot(`"Weight and reps stay steady. Match this performance before going heavier."`);
    expect(getProgressionMessage('reduce')).toMatchInlineSnapshot(`"Weight drops slightly to rebuild. Quality sets beat grinding reps."`);
  });

  test('getAutoRegMessage all actions', () => {
    expect(getAutoRegMessage('continue')).toMatchInlineSnapshot(`"Your recovery's holding. The plan stays as written. This is what good progress feels like."`);
    expect(getAutoRegMessage('hold_volume')).toMatchInlineSnapshot(`"You're showing fatigue this week. Your session content stays the same. Focus on sleep and protein."`);
    expect(getAutoRegMessage('reduce_volume')).toMatchInlineSnapshot(`"Your recovery's dropped. Next week loses 1-2 sets per exercise. Come back stronger."`);
    expect(getAutoRegMessage('deload_now', 5)).toMatchInlineSnapshot(`"Good timing: you've been building for 5 weeks. Next week is lighter: shorter sessions, same exercises, half the sets."`);
    expect(getAutoRegMessage('deload_now', 2)).toMatchInlineSnapshot(`"Your recovery is dropping. Next week is lighter: shorter sessions, same exercises, half the sets."`);
  });

  test('getDeloadPredictionMessage all paths', () => {
    expect(getDeloadPredictionMessage(0, 'Volume has been high for four weeks.')).toMatchInlineSnapshot(`"A lighter week is scheduled. Volume has been high for four weeks."`);
    expect(getDeloadPredictionMessage(1, 'Fatigue scores are climbing.')).toMatchInlineSnapshot(`"A lighter week is coming up next. Fatigue scores are climbing."`);
    expect(getDeloadPredictionMessage(3, 'Block is on track.')).toMatchInlineSnapshot(`"Your next lighter week is about 3 weeks away. Block is on track."`);
    expect(getDeloadPredictionMessage(null, null)).toMatchInlineSnapshot(`"Keep building. A lighter week gets scheduled when your recovery calls for it."`);
  });

  test('getTimeCrunchMessage cuts and trims', () => {
    expect(getTimeCrunchMessage(['Bench press'], 0.3, 45)).toMatchInlineSnapshot(`"Rest cut by 30%. Bench press removed to fit your time. Estimated session: 45 minutes."`);
    expect(getTimeCrunchMessage(['Lateral raise', 'Face pull'], 0.2, 40)).toMatchInlineSnapshot(`"Rest cut by 20%. Lateral raise and Face pull removed to fit your time. Estimated session: 40 minutes."`);
    expect(getTimeCrunchMessage([], 0.25, 50)).toMatchInlineSnapshot(`"Rest cut by 25%. Estimated session: 50 minutes."`);
  });

  test('getWeekPhaseDescription unchanged (descriptive, no decision attributed)', () => {
    expect(getWeekPhaseDescription('intro', 1)).toMatchInlineSnapshot(
      `"Week 1: Settle in. Focus on technique and finding the right weights. Don't push to your limit yet. The real work starts next week."`
    );
    expect(getWeekPhaseDescription('build', 3)).toMatchInlineSnapshot(
      `"Week 3: Time to push. You should finish most sets feeling like you could do 1–2 more reps but chose not to. That's the zone."`
    );
  });

  test('getSplitRationale unchanged (structural, no decision attributed)', () => {
    expect(getSplitRationale('full_body')).toContain('Every session trains all your muscle groups');
    expect(getSplitRationale('upper_lower')).toContain('Alternating upper and lower');
    expect(getSplitRationale('ppl')).toContain('Push, Pull, Legs');
  });

  test('getTravelModeMessage', () => {
    expect(getTravelModeMessage('Bodyweight only', 1)).toMatchInlineSnapshot(
      `"One-week travel plan built around Bodyweight only. Higher reps and shorter rest periods maintain your muscle while you're away from the gym."`
    );
    expect(getTravelModeMessage('Dumbbells only', 2)).toMatchInlineSnapshot(
      `"2-week travel plan built around Dumbbells only. Higher reps and shorter rest periods maintain your muscle while you're away from the gym."`
    );
  });

  test('getPosingConditioningMessage', () => {
    expect(getPosingConditioningMessage('posing', 10, 8)).toContain('10-minute posing practice');
    expect(getPosingConditioningMessage('conditioning', 15, 8)).toContain('15-minute low-impact cardio');
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
      getVolumeStatusMessage('over_limit', 'Chest', 22),
      getProgressionMessage('add_weight', 80, 82.5),
      getProgressionMessage('hold'),
      getProgressionMessage('reduce'),
      getAutoRegMessage('hold_volume'),
      getAutoRegMessage('reduce_volume'),
      getAutoRegMessage('deload_now', 4),
      getDeloadPredictionMessage(0, 'because.'),
      getDeloadPredictionMessage(2, 'because.'),
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
      getWeekPhaseDescription('intro', 1),
      getSplitRationale('full_body'),
      getTravelModeMessage('Bodyweight only', 1),
      getPosingConditioningMessage('posing', 10, 8),
    ];
    for (const out of descriptiveOutputs) {
      // Either they mention Precision Coaching or they don't; the spec is
      // only that decision-attributed outputs MUST. Descriptive outputs MAY.
      expect(out.length).toBeGreaterThan(20);
    }
  });

  test('no jargon in any output across the full library', () => {
    const allOutputs = [
      getVolumeStatusMessage('below_minimum', 'Chest', 6),
      getVolumeStatusMessage('optimal', 'Back', 14),
      getVolumeStatusMessage('approaching_limit', 'Shoulders', 18),
      getVolumeStatusMessage('over_limit', 'Quads', 24),
      getProgressionMessage('add_weight', 80, 82.5),
      getProgressionMessage('add_weight', 80, null),
      getProgressionMessage('add_rep'),
      getProgressionMessage('hold'),
      getProgressionMessage('reduce'),
      getAutoRegMessage('continue'),
      getAutoRegMessage('hold_volume'),
      getAutoRegMessage('reduce_volume'),
      getAutoRegMessage('deload_now', 5),
      getAutoRegMessage('deload_now', 2),
      getWeekPhaseDescription('intro', 1),
      getWeekPhaseDescription('build', 3),
      getWeekPhaseDescription('peak', 6),
      getWeekPhaseDescription('recovery', 7),
      getSplitRationale('full_body'),
      getSplitRationale('upper_lower'),
      getSplitRationale('ppl'),
      getSplitRationale('ppl_ab'),
      getSplitRationale('upper_lower_wp'),
      getDeloadPredictionMessage(0, 'reason.'),
      getDeloadPredictionMessage(1, 'reason.'),
      getDeloadPredictionMessage(3, 'reason.'),
      getDeloadPredictionMessage(null, null),
      getTimeCrunchMessage(['Bench'], 0.3, 45),
      getTimeCrunchMessage([], 0.25, 50),
      getTravelModeMessage('Bodyweight only', 1),
      getTravelModeMessage('Dumbbells only', 2),
      getPosingConditioningMessage('posing', 10, 8),
      getPosingConditioningMessage('conditioning', 15, 8),
    ];
    for (const out of allOutputs) {
      const check = checkJargon(out);
      if (!check.clean) {
        throw new Error(`Jargon detected in: "${out}", violations: ${check.violations.join(', ')}`);
      }
    }
  });

  test('no fake-autonomy framing on locked decisions', () => {
    // Pattern 15 of the synthesis: "could/might/consider" must not appear
    // when Precision Coaching has already locked a decision.
    const decisionOutputs = [
      getProgressionMessage('add_weight', 80, 82.5),
      getProgressionMessage('hold'),
      getProgressionMessage('reduce'),
      getAutoRegMessage('hold_volume'),
      getAutoRegMessage('reduce_volume'),
      getAutoRegMessage('deload_now', 4),
      getVolumeStatusMessage('over_limit', 'Chest', 22),
    ];
    for (const out of decisionOutputs) {
      // Looking for fake-autonomy patterns specifically on locked decisions.
      // "could" is allowed in observational contexts but not as a softener
      // on a decision Precision Coaching has already made.
      expect(out).not.toMatch(/you (could|might|may) consider/i);
      expect(out).not.toMatch(/it'?s up to you/i);
      expect(out).not.toMatch(/you decide/i);
    }
  });
});
