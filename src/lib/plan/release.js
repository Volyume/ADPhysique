/**
 * release.js -- D219: the release switch for the new plan builder.
 *
 * `PLANNER_V2` decides whether `planAutoGen.generateAndSavePlan` builds a new
 * plan with the planner in this folder (`buildPlan`, from the standard
 * catalogue) or with today's generator (`planEngine.generatePlan`).
 *
 * It is on (lead, 2026-10-04, the founder's priority that new plans are
 * built by this planner on the corrected recovery model): the storage home
 * for the plan's facts, prescribe() serving every week, the catalogue, the
 * preview and the continuity path are reviewed and on main (register D219,
 * "Build rulings", and the sequencing ruling). With it off the save path is
 * byte-identical to the one that shipped before D219 (pinned by the two
 * plannerV2 "off" suites, which hold it off with a module mock).
 *
 * A switch for finished work, not a hold on it: nothing else reads this file
 * but planAutoGen.js, and tests turn it on with a module mock
 * (`jest.mock('../plan/release', () => ({ PLANNER_V2: true }))`).
 *
 * Pure: a constant, no I/O.
 */
export const PLANNER_V2 = true;
