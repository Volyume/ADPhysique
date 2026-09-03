/**
 * No-plan / start-plan copy guard.
 *
 * The Home and Plans screens should speak with one voice when a user has no
 * plan yet: the same title, the same primary verb, and no older fallback
 * phrasing lingering in the empty-state blocks.
 */
import fs from 'fs';
import path from 'path';

const read = rel => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const HOME = read('screens/HomeScreen.js');
const PLANS = read('screens/PlansScreen.js');
const PROGRESS_SECTIONS = read('components/ProgressSections.js');
// D137 (fully free product): FreeStarterScreen.js (the free-onboarding quiz)
// is deleted -- the sub-test that read it is removed below (see the note
// there) rather than this top-level read pointing at a file that no longer
// exists.

describe('no-plan / start-plan copy', () => {
  test('HomeScreen uses one no-plan title and the shared start CTA', () => {
    // Anchor re-pinned (Campaign 22 Phase 2 Stage 2, §7/§17 R5): "Progress at
    // a glance" is deleted outright (3-way duplication fix). RE-ANCHORED
    // AGAIN (D137, fully free, no tier split): the free no-plan branch
    // (FreeStarter quiz) is retired -- the full-tier EmptyState is the only
    // no-plan state now, and it no longer offers a secondary "Browse plans"
    // escape hatch (HomeScreen.js:2282-2316). The whole no-plan section
    // (EmptyState + the once-Pro-only quickStartCard, now shown to
    // everyone) is one block, so the end anchor moves past both to the next
    // stable comment outside the noPlanSection View.
    const block = HOME.slice(HOME.indexOf('<View style={styles.noPlanSection}>'), HOME.indexOf('{/* CC33 D112 R5 (closes audit T1-14/T2-31)'));
    expect(block).toContain('No active plan yet');
    expect(block).toContain('Start with a plan');
    // RE-ANCHORED (D139): the escape hatch is back, as the same real second
    // action PlansScreen offers (pinned below) rather than the retired
    // free-tier text link -- someone with no plan should not have to accept a
    // generated one to see what else exists.
    expect(block).toContain('Browse plans');
    expect(block).not.toContain('Find my plan');
    expect(block).not.toContain('Build my plan');
  });

  // 'HomeScreen blank-workout fallback is a contained neutral control'
  // removed (D137): that test pinned the FREE-ONLY `Button variant="secondary"
  // title="Just want to log? Start a blank workout"` text link
  // (`tier !== 'pro'` branch). Fully free, no tier split -- that branch is
  // deleted outright, not restyled: "the Free-only text-link variant is
  // retired" (HomeScreen.js, the comment above the surviving PressableCard).
  // Everyone now gets the single quickStartCard (formerly Pro-only), which
  // the preceding test's block slice already covers as part of the no-plan
  // section. The specific behaviour this sub-test pinned no longer exists.

  // D137 (fully free product): the separate free (icon="compass-outline")
  // and Pro (icon="barbell-outline") no-plan branches this test used to
  // straddle are MERGED into one branch now (PlansScreen.js:1201-1245's own
  // comment: "the Free no-plan branch (FreeStarter quiz) is retired -- this
  // is the only no-plan state now"). The copy contract this guard protects
  // (shared verb, a real secondary action, no older fallback phrasing) is
  // unchanged, so the two tests that used to check each branch separately
  // are combined into one covering the single surviving block.
  test('PlansScreen no-plan state uses the shared verb and offers a real action', () => {
    const start = PLANS.indexOf('icon="barbell-outline"');
    expect(start).toBeGreaterThan(-1);
    const block = PLANS.slice(start, PLANS.indexOf('{/* Folders'));
    expect(block).toContain('No active plan yet');
    expect(block).toContain('Start with a plan');
    expect(block).toContain('Browse plans');
    // RE-ANCHORED (D139): the action may reach the generator directly or
    // through the shared prepare/commit helper that previews first
    // (lib/startWithPlan.js). Either way the CTA must actually generate a
    // plan, which is what this line has always been guarding.
    expect(block).toMatch(/generateAndSavePlan|handleStartWithPlanPress|prepareStartWithPlan/);
    expect(block).not.toContain('icon="compass-outline"');
    expect(block).not.toContain('Browse the library');
    expect(block).not.toContain('Find my plan');
    expect(block).not.toContain('Build one');
  });

  test('PlansScreen tools section carries one unifying label, and no older fallback phrasing lingers', () => {
    // RE-PINNED (Campaign 25, PLANS-SCREEN-SPEC.md §2 item 3): the decision
    // hub's own dynamic "Switch your plan" / "Start with a plan" SectionLabel
    // is retired -- the training-blocks row and the action cards now share
    // ONE static "Plan tools" label ("only position and the unifying label
    // change"). The underlying verb guarantee this test protects (no older
    // fallback phrasing) is unchanged; where it lives moved to the no-plan
    // EmptyState blocks, already pinned two tests above and one below.
    expect(PLANS).toContain('<SectionLabel>Plan tools</SectionLabel>');
    expect(PLANS).not.toMatch(/<SectionLabel>\s*\{isProWithPlan \? 'Switch your plan' : 'Start with a plan'\}/);
    expect(PLANS).not.toContain('Start or build a plan');
  });

  test('Progress no-plan card uses a contained neutral Browse plans control', () => {
    // 2026-07-10 (CP-10 stage 4 batch C, theming): ProgressSections now reads
    // a live theme (src/hooks/useTheme.js), so this inline colour prop moved
    // from `colors.textSecondary` to `t.colors.textSecondary`, same treatment
    // as the HomeScreen pin above. The pinned RULE (contained neutral
    // control) is unchanged -- the static mesoEmptyBtn/mesoEmptyBtnText
    // definitions (asserted next) are byte-identical to before.
    expect(PROGRESS_SECTIONS).toContain('Ionicons name="compass-outline" size={14} color={t.colors.textSecondary}');
    expect(PROGRESS_SECTIONS).toMatch(/mesoEmptyBtn:     \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border/);
    expect(PROGRESS_SECTIONS).toContain('mesoEmptyBtnText: { ...type.label, color: colors.textPrimary }');
    expect(PROGRESS_SECTIONS).not.toContain('mesoEmptyBtnText: { ...type.label, color: colors.primary }');
  });

  // 'FreeStarter fallback choices are quiet contained controls, not footnote
  // links' removed (D137): FreeStarterScreen.js (the free-onboarding quiz)
  // is deleted outright -- there is no free-tier fallback quiz any more for
  // this control to live on, so the behaviour itself no longer exists.
});
