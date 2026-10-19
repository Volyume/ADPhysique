/**
 * Training style cards and hand-off (founder ruling 2026-10-19).
 * Pins:
 *  1. One card per rulebook archetype, in the rulebook's order, each with a
 *     plain line about training: no em dash, no promise of a look.
 *  2. Each card's muscle map is read from the rulebook's tiers: priority
 *     muscles strong, maintenance light, nothing for standard muscles.
 *  3. The style applies only to "Not competing" (and the general aliases).
 *  4. The profile's style reaches the engine through buildPlanInputs and
 *     structureArgs; an unknown stored value never does.
 *  5. Onboarding requires a style while not competing, pre-selects nothing,
 *     and hides the cards for a competing category.
 */
import fs from 'fs';
import path from 'path';
import {
  ARCHETYPE_OPTIONS, archetypeApplies, normaliseArchetype, archetypeEmphasis, archetypeEmphasisLabel,
} from '../trainingArchetypes';
import { ARCHETYPE_KEYS } from '../structure/rulebook';
import { structureArgs, structurePlanName } from '../structure/adapt';

describe('the cards', () => {
  test('one per archetype, in the rulebook order', () => {
    expect(ARCHETYPE_OPTIONS.map((o) => o.value)).toEqual([...ARCHETYPE_KEYS]);
  });

  test('plain lines about training, never about a look', () => {
    for (const o of ARCHETYPE_OPTIONS) {
      expect(o.description).not.toMatch(/—/);
      expect(o.description).not.toMatch(/\b(look|physique|body you|aesthetic|shred|ripped|lean)\b/i);
    }
  });

  test('the muscle map is the rulebook tiers', () => {
    expect(archetypeEmphasis('balanced')).toEqual({});
    expect(archetypeEmphasis('minimalist')).toEqual({});
    expect(archetypeEmphasis('v_taper')).toMatchObject({ back: 'priority', side_delts: 'priority', quads: 'maintenance', calves: 'maintenance' });
    expect(archetypeEmphasis('x_frame')).toMatchObject({ back: 'priority', side_delts: 'priority', quads: 'priority', hamstrings: 'priority' });
    expect(archetypeEmphasis('upper_density')).toMatchObject({ chest: 'priority', back: 'priority', quads: 'maintenance' });
    expect(archetypeEmphasis('powerbuilder')).toMatchObject({ quads: 'priority', glutes: 'priority', chest: 'priority', back: 'priority', biceps: 'maintenance' });
    expect(archetypeEmphasis('x_frame').chest).toBeUndefined();
    expect(archetypeEmphasisLabel('v_taper')).toMatch(/more work for back and side shoulders/);
  });
});

describe('when the style applies', () => {
  test('not competing only', () => {
    expect(archetypeApplies('general')).toBe(true);
    expect(archetypeApplies('mens_physique')).toBe(false);
    expect(archetypeApplies('bikini')).toBe(false);
  });

  test('an unknown stored value is never guessed', () => {
    expect(normaliseArchetype('x_frame')).toBe('x_frame');
    expect(normaliseArchetype('bulk')).toBeNull();
    expect(normaliseArchetype(null)).toBeNull();
  });
});

describe('the hand-off to the engine', () => {
  const inputs = { goal: 'general', daysPerWeek: 4, sessionLengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', weakPoints: [] };

  test('structureArgs passes a known style and drops an unknown one', () => {
    expect(structureArgs({ ...inputs, archetype: 'powerbuilder' }).archetype).toBe('powerbuilder');
    expect(structureArgs({ ...inputs, archetype: 'bulk' })).not.toHaveProperty('archetype');
    expect(structureArgs(inputs)).not.toHaveProperty('archetype');
  });

  test('the plan is named for its style', () => {
    expect(structurePlanName({ goal: 'general', archetype: 'v_taper', days: 4 })).toBe('V-taper, 4 days a week');
    expect(structurePlanName({ goal: 'general', days: 4 })).toBe('General, 4 days a week');
  });

  test('buildPlanInputs reads the profile style', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'planAutoGen.js'), 'utf8');
    expect(src).toMatch(/archetype: migrated\.trainingArchetype \?\? null,/);
  });
});

describe('onboarding step 7', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ProOnboardingScreen.js'), 'utf8');

  test('nothing is pre-selected', () => {
    expect(src).toMatch(/const \[trainingArchetype, setTrainingArchetype\] = useState\(null\);/);
  });

  test('a style is required while not competing', () => {
    expect(src).toMatch(/if \(archetypeApplies\(trainingGoal\) && !trainingArchetype\) errs\.archetype = /);
    expect(src).toMatch(/surfaceGaps\(errs, \['phase', 'archetype'\]/);
  });

  test('the cards show only for not competing, and a competing category saves no style', () => {
    expect(src).toMatch(/\{archetypeApplies\(trainingGoal\) \? \(\s*<View style=\{styles\.section\}>\s*<Text[^>]*>Your training style/);
    expect(src).toMatch(/const effectiveArchetype = archetypeApplies\(trainingGoal\) \? trainingArchetype : null;/);
    expect(src).toMatch(/trainingArchetype: effectiveArchetype,/);
  });
});
