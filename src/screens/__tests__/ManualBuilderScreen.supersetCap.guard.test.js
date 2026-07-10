/**
 * Guard: the SPLIT between user-built giant sets and auto-generated pairings.
 *
 * HISTORY: this file previously pinned a hard pair cap in the builder ("Supersets
 * pair two exercises for now") because the live session only understood an
 * alternating pair. Campaign item 21 (docs/ux-world-class-audit-2026-07-09/
 * CAMPAIGN-2026-07-10-APPROVED-SLATE.md) lifted that: the session now cycles
 * every member of a shared supersetGroupId, so the builder authors giant sets of
 * 3+. The old cap is therefore GONE by design, not by regression.
 *
 * What still must hold, and is pinned here:
 *   1. The builder no longer caps superset selection/grouping at two - the old
 *      cap expressions must NOT reappear (a silent re-cap would break item 21).
 *   2. The AUTO-generation engine stays pairs-only. assignSupersets is
 *      pairs-by-design (MAX_PAIRS_PER_WORKOUT, tier-2 compound->isolation intent);
 *      it must NEVER auto-emit a 3+ giant set. Giant sets are a user-built
 *      feature only. Verified against the REAL engine (generatePlan), so this
 *      cannot drift from a re-export of the code under test.
 */
const fs = require('fs');
const path = require('path');
const { generatePlan } = require('../../lib/planEngine');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ManualBuilderScreen.js'),
  'utf8',
);

describe('ManualBuilderScreen allows giant sets; the engine stays pairs-only', () => {
  test('the old builder pair cap is gone (selection is not capped at two)', () => {
    expect(src).not.toMatch(/cur\.size\s*>=\s*2/);
    expect(src).not.toMatch(/selected\.size\s*>\s*2/);
    expect(src).not.toContain('Supersets pair two exercises for now.');
  });

  test('the group button reflects the live selection size (no fixed "2")', () => {
    // Dynamic label proves 3+ can be grouped in one action.
    expect(src).toContain('Group ${selected.size} into superset');
  });

  test('auto-generated supersets never exceed a pair (real engine)', () => {
    // A config the existing suite (supersets.test.js) shows DOES produce
    // supersets, so the cap is a meaningful assertion, not a vacuous one.
    const plan = generatePlan({
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
      equipment: 'full_gym', goal: 'general_hypertrophy', phase: 'maintain',
      weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
    });
    for (const w of plan.workouts) {
      const byGroup = new Map();
      for (const ex of w.exercises) {
        if (ex.supersetGroupId == null) continue;
        byGroup.set(ex.supersetGroupId, (byGroup.get(ex.supersetGroupId) ?? 0) + 1);
      }
      for (const [, count] of byGroup) {
        expect(count).toBeLessThanOrEqual(2);
      }
    }
  });
});
