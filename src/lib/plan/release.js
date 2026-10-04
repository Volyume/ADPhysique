/**
 * release.js -- D219: the release switch for the new plan builder.
 *
 * `PLANNER_V2` decides whether `planAutoGen.generateAndSavePlan` builds a new
 * plan with the planner in this folder (`buildPlan`, from the standard
 * catalogue) or with today's generator (`planEngine.generatePlan`).
 *
 * It is false. The planner and everything it needs are on main so that every
 * commit stays shippable (founder law: merge to main continually), and the
 * lead turns this on only after the core lanes are reviewed and on main (the
 * storage home for the plan's facts, `prescribe()`, the readers, the check-ins,
 * the planner and the next-session rebuild; register D219, "Build rulings",
 * and the sequencing ruling in the register entry). While it is false the save
 * path is byte-identical to the one that shipped before D219.
 *
 * A switch for finished work, not a hold on it: nothing else reads this file
 * but planAutoGen.js, and tests turn it on with a module mock
 * (`jest.mock('../plan/release', () => ({ PLANNER_V2: true }))`).
 *
 * Pure: a constant, no I/O.
 */
export const PLANNER_V2 = false;
