/**
 * D228 addendum Q4-A (founder "Go as recommended", 2026-10-15): a style-tagged
 * plan (kettlebell, circuit, band) keeps its own workouts at a block boundary.
 *
 * What this suite pins and why.
 *
 * OBSERVED: with the structure engine on, generateAndSavePlan and
 * generatePlanDryRun route a style-tagged plan to the legacy generator, and the
 * legacy save passes tags null, so a plan rebuilt there loses its style.
 * PlanUpdateScreen and ProGoalSetupScreen already refuse a rebuild for a style
 * plan (PlanUpdateScreen.styleLock.guard.test.js); the block-boundary path in
 * PlansScreen ("Continue with adjustments") carried no such lock.
 *
 * So at the boundary, a style plan:
 *   - reads the tag the way PlanUpdateScreen does (styleLockFromTags, the one
 *     shared rule) and never re-derives it;
 *   - never reaches generatePlanDryRun (the review) or generateAndSavePlan (the
 *     refined rebuild); it is reactivated with its own workouts through
 *     activatePlanWithBlock, with the set targets the ledger resolved;
 *   - is shown no structural verdict (a "worth rebuilding" or "changes
 *     recommended" card would describe changes that will not be made).
 *
 * Source-level guard, same convention as PlansScreen.capabilityBlockedToast.
 * guard.test.js: PlansScreen pulls the whole SQLite/sync import graph, so what
 * is pinned is textual and structural. The advisor half is also run for real in
 * blockAdvisor.styleBlock.d228.test.js.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');
const ADVISOR = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'blockAdvisor.js'), 'utf8');

function between(src, startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  expect(a).toBeGreaterThan(-1);
  const b = src.indexOf(endMarker, a + startMarker.length);
  expect(b).toBeGreaterThan(a);
  return src.slice(a, b);
}

const REVIEW_FN = between(SCREEN, 'async function openNextBlockReview()', 'async function runBlockActivation(');
const ACTIVATION_FN = between(SCREEN, 'async function runBlockActivation(', 'async function confirmNextBlockReview()');

describe('Q4-A: the style lock is read the way PlanUpdateScreen reads it', () => {
  test('PlansScreen imports the ONE shared rule and never re-derives it', () => {
    expect(SCREEN).toMatch(/import \{ styleLockFromTags \} from '\.\.\/lib\/exercise\/styleLock';/);
    expect(SCREEN).not.toMatch(/function styleLockFromTags/);
    expect(SCREEN).not.toMatch(/startsWith\('kettlebell'\)/);
    expect(SCREEN).not.toMatch(/styleKeyFromTags/);
  });

  test('both block-boundary functions resolve it from the active plan\'s tags (PlanUpdateScreen: styleLockFromTags(active?.tags))', () => {
    expect(REVIEW_FN).toMatch(/const styleLock = styleLockFromTags\(activePlan\?\.tags\);/);
    expect(ACTIVATION_FN).toMatch(/const styleLock = styleLockFromTags\(activePlan\?\.tags\);/);
    const planUpdate = fs.readFileSync(path.join(__dirname, '..', 'PlanUpdateScreen.js'), 'utf8');
    expect(planUpdate).toMatch(/styleLockFromTags\(active\?\.tags\)/);
  });

  test('the rule itself locks kettlebell, circuit and band tags and leaves an ordinary plan alone', () => {
    // eslint-disable-next-line global-require
    const { styleLockFromTags } = require('../../lib/exercise/styleLock');
    expect(styleLockFromTags('library style:kettlebell_foundations')).toMatchObject({ collection: 'kettlebell' });
    expect(styleLockFromTags('style:circuit_full_body')).toMatchObject({ collection: 'circuit' });
    expect(styleLockFromTags('style:band')).toMatchObject({ collection: 'band' });
    expect(styleLockFromTags('hypertrophy upper_lower')).toBeNull();
    expect(styleLockFromTags(null)).toBeNull();
  });
});

describe('Q4-A: the review never dry-runs the generator for a style plan', () => {
  test('generatePlanDryRun is reached only on the not-style side of the lock, and is called once in the whole screen', () => {
    expect(REVIEW_FN).toMatch(/const dry = styleLock\s*\n\s*\? null\s*\n\s*: await generatePlanDryRun\(/);
    expect((SCREEN.match(/generatePlanDryRun\(/g) || []).length).toBe(1);
  });

  test('no continuity proposal, no verdict card and no failed-dry-run flag are carried for a style plan', () => {
    expect(REVIEW_FN).toMatch(/const programmeProposal = styleLock \? null : \(blockAdvice\?\.programmeReview \?\? null\);/);
    expect(REVIEW_FN).toMatch(/verdictCopy: styleLock \? null : \(blockAdvice\?\.programmeReview\?\.copy \?\? null\),/);
    expect(REVIEW_FN).toMatch(/dryFailed: styleLock \? false : !dry\?\.ok,/);
  });

  test('with no dry run there is no receipt, so the existing no-change sheet and the reactivation path apply', () => {
    // exerciseChanges / prescriptionChanges come from the receipt only.
    expect(REVIEW_FN).toMatch(/const receipt = decisions\.length \? buildChangeReceipt\(decisions\) : null;/);
    expect(REVIEW_FN).toMatch(/const decisions = dry\?\.ok \? \(dry\.continuity\?\.decisions \?\? \[\]\) : \[\];/);
    // The sheet's own line for it is unchanged.
    expect(SCREEN).toContain('Your workouts stay exactly as they are. Only your set targets move.');
    // And the confirm derives refine from those counts alone.
    expect(SCREEN).toMatch(/const refine = \(\(reviewed\?\.exerciseChanges \?\? 0\) \+ \(reviewed\?\.prescriptionChanges \?\? 0\)\) > 0;/);
  });
});

describe('Q4-A: the activation never rebuilds a style plan', () => {
  test('mayRefine is closed to a style plan, beside the authored-plan lock', () => {
    expect(ACTIVATION_FN).toMatch(
      /const mayRefine = refine === true && seedIntent === 'adjust' && !authoredPlan && !styleLock;/,
    );
  });

  test('generateAndSavePlan is called once in the screen, and only inside the mayRefine branch', () => {
    expect((SCREEN.match(/generateAndSavePlan\(/g) || []).length).toBe(1);
    const gate = ACTIVATION_FN.indexOf('if (mayRefine) {');
    const call = ACTIVATION_FN.indexOf('generateAndSavePlan(');
    const elseBranch = ACTIVATION_FN.indexOf('} else {', call);
    expect(gate).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(gate);
    expect(elseBranch).toBeGreaterThan(call);
  });

  test('the style plan takes the same reactivation the screen already uses: activatePlanWithBlock on the SAME plan id', () => {
    const elseBranch = ACTIVATION_FN.slice(ACTIVATION_FN.indexOf('} else {', ACTIVATION_FN.indexOf('generateAndSavePlan(')));
    expect(elseBranch).toMatch(/await activatePlanWithBlock\(user\.id, activePlan\.id, planHeadingName\(activePlan\.name\), \{/);
    expect(elseBranch).not.toMatch(/generateAndSavePlan|generatePlanDryRun/);
  });

  test('an asked-for rebuild that the style withheld says the screen\'s existing words, and the original fallback toast is unchanged', () => {
    const words = "toast.show('Your next block started with your current workouts', { variant: 'warning' });";
    expect((SCREEN.match(new RegExp(words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length).toBe(2);
    expect(ACTIVATION_FN).toMatch(/if \(refine === true && seedIntent === 'adjust' && styleLock\) \{\s*\n\s*toast\.show\('Your next block started with your current workouts', \{ variant: 'warning' \}\);/);
  });

  test('"Continue with adjustments" still opens the review (the set targets are still shown), and Repeat is untouched', () => {
    const handler = between(SCREEN, 'async function handleRestartPlan(', 'async function openNextBlockReview()');
    expect(handler).toMatch(/if \(intent === 'adjust'\) \{[\s\S]{0,400}?await openNextBlockReview\(\);/);
    expect(handler).toMatch(/await runBlockActivation\(\{ intent, refine: false \}\);/);
  });
});

describe('Q4-A: the advisor gives a style plan no structural verdict', () => {
  test('buildProgrammeReview returns null for a style-tagged plan before it reads a single routine', () => {
    const fn = between(ADVISOR, 'async function buildProgrammeReview(', 'const libraryById');
    expect(fn).toMatch(/const \{ styleLockFromTags \} = require\('\.\/exercise\/styleLock'\);/);
    const lock = fn.indexOf('if (styleLockFromTags(plan.tags)) return null;');
    expect(lock).toBeGreaterThan(-1);
    expect(lock).toBeGreaterThan(fn.indexOf('const plan = await getActivePlan(userId);'));
    expect(lock).toBeLessThan(fn.indexOf('await getRoutinesForPlan(plan.id)'));
  });
});
