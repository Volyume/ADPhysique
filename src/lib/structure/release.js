/**
 * release.js -- D222 phase 6: the release switch for the structure engine.
 *
 * `STRUCTURE_ENGINE` decides whether a new plan (planAutoGen's
 * generateAndSavePlan, generatePlanDryRun, assessScheduleFit and
 * planGeneratedRebuildV2) is built by the structure engine in this folder
 * (buildStructurePlan) instead of today's planners. It is ON on main
 * (`STRUCTURE_ENGINE = true`), signed off in the D222 addendum of 2026-10-12
 * (spec docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md).
 * With it off every path behaves exactly as before phase 6. Tests turn it on with
 * a module mock:
 *   jest.mock('../structure/release', () => ({
 *     ...jest.requireActual('../structure/release'), STRUCTURE_ENGINE: true,
 *   }));
 *
 * `PROTECTED_PROGRAMME_IDS` (R67, founder standing order): programmes no
 * automatic path may ever delete, regenerate or rebuild. planRebuild's run
 * skips them, and generateAndSavePlan never archives them unless the person
 * saves a new plan themselves from a screen. The guard is not behind the
 * switch: the founder's order holds whichever planner is live.
 *
 * Pure: constants, no I/O.
 */
export const STRUCTURE_ENGINE = true;

export const PROTECTED_PROGRAMME_IDS = Object.freeze([
  // The founder's own hand-built plan (founder standing order).
  '31a3b33c-5548-4c54-9b9a-dd3a927b2c49',
]);

/** True for a programme no automatic path may delete, regenerate or rebuild. */
export function isProtectedProgramme(programmeId) {
  return typeof programmeId === 'string' && PROTECTED_PROGRAMME_IDS.includes(programmeId);
}
