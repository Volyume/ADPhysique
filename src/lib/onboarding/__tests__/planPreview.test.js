/**
 * COMP-030 plan-preview derivation — deterministic, no body data, no jargon.
 */
import { buildPlanPreview } from '../planPreview';
import { isQuizComplete } from '../quizFlow';

describe('buildPlanPreview', () => {
  test('3 days -> full body', () => {
    const p = buildPlanPreview({ daysPerWeek: 3, trainingGoal: 'general', sessionLengthMinutes: 45 });
    expect(p.splitName).toBe('Full body');
    expect(p.structure).toContain('45 minutes');
  });

  test('3 days, advanced lifter -> PPL (mirrors selectSplit; preview must not mislabel as full body)', () => {
    const p = buildPlanPreview({ daysPerWeek: 3, experience: 'advanced', trainingGoal: 'bodybuilding' });
    expect(p.splitName).toBe('Push / Pull / Legs');
  });

  test('3 days, advanced but lower-focus division -> still full body (legs every session)', () => {
    const p = buildPlanPreview({ daysPerWeek: 3, experience: 'competitive', trainingGoal: 'bikini' });
    expect(p.splitName).toBe('Full body');
  });

  test('4 days -> upper/lower', () => {
    expect(buildPlanPreview({ daysPerWeek: 4 }).splitName).toBe('Upper / Lower');
  });

  test('6 days -> PPL', () => {
    expect(buildPlanPreview({ daysPerWeek: 6 }).splitName).toBe('Push / Pull / Legs');
  });

  test('classic physique biases shoulders and back', () => {
    expect(buildPlanPreview({ trainingGoal: 'classic_physique', daysPerWeek: 5 }).headline)
      .toContain('shoulders and back');
  });

  test('NEVER leaks calories/macros into the preview (needs body data, post-consent)', () => {
    const p = buildPlanPreview({ daysPerWeek: 4, trainingGoal: 'bikini', trainingPhase: 'cut' });
    const blob = JSON.stringify(p).toLowerCase();
    // The only mention of calories is the honesty note that they come LATER.
    expect(p.nutritionNote).toContain('they need your weight');
    expect(blob).not.toMatch(/\d+\s*kcal|\d+\s*calories|protein\s*\d/);
  });

  test('no jargon (no MEV/MRV/RIR) in the user-facing strings', () => {
    const p = buildPlanPreview({ daysPerWeek: 5, trainingGoal: 'mens_physique' });
    expect(JSON.stringify(p)).not.toMatch(/MEV|MRV|RIR/);
  });

  test('caps weak points at three', () => {
    const p = buildPlanPreview({ daysPerWeek: 4, weakPoints: ['a', 'b', 'c', 'd'] });
    expect(p.weakPoints).toHaveLength(3);
  });
});

describe('isQuizComplete', () => {
  test('needs days + goal + experience', () => {
    expect(isQuizComplete({ daysPerWeek: 4, trainingGoal: 'general', experience: 'beginner' })).toBe(true);
    expect(isQuizComplete({ daysPerWeek: 4, trainingGoal: 'general' })).toBe(false);
    expect(isQuizComplete(null)).toBe(false);
  });
});
