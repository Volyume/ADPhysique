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
const FREE_STARTER = read('screens/FreeStarterScreen.js');

describe('no-plan / start-plan copy', () => {
  test('HomeScreen uses one no-plan title and the shared start CTA', () => {
    const block = HOME.slice(HOME.indexOf('<View style={styles.noPlanSection}>'), HOME.indexOf('{/* Progress at a glance'));
    expect(block).toContain('No active plan yet');
    expect(block).toContain('Start with a plan');
    expect(block).toContain('Browse plans');
    expect(block).not.toContain('Find my plan');
    expect(block).not.toContain('Build my plan');
  });

  test('HomeScreen blank-workout fallback is a contained neutral control', () => {
    // R9/D70 (design-cohesion sweep, 2026-07-11): the hand-rolled
    // TouchableOpacity pill (bespoke blankSessionLink/blankSessionLinkText
    // style blocks, asserted here up to 2026-07-11) was converted onto the
    // shared <Button variant="secondary"> primitive per
    // docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md section 4 ("every
    // CTA is the shared Button primitive"). The RULE this test pins is
    // UNCHANGED -- a contained neutral control, never a loose text link --
    // Button's secondary variant IS that contained neutral treatment
    // (raised surface2 fill, textPrimary ink, a visible border,
    // Button.js:54), just expressed through the shared primitive instead of
    // a bespoke style block, so there is no longer a static
    // blankSessionLink/blankSessionLinkText pair to assert byte-for-byte.
    expect(HOME).toMatch(/variant="secondary"[\s\S]{0,200}title="Just want to log\? Start a blank workout"/);
    expect(HOME).toContain('icon="play-outline"');
    expect(HOME).toContain('trailingIcon="chevron-forward"');
    expect(HOME).not.toContain('blankSessionLinkText: { fontSize: fontSize.sm, color: colors.textMuted }');
  });

  test('PlansScreen free no-plan copy matches the shared verb', () => {
    // CP-10 batch G: the noPlanCard anchor gained its live-theme override
    // (style={[styles.noPlanCard, live.noPlanCard]}); the slice anchor
    // tracks that spelling (noActivePlanRow carries no colour token, so it
    // stays single-style). The pinned copy inside the block is unchanged.
    const block = PLANS.slice(PLANS.indexOf('<Card style={[styles.noPlanCard, live.noPlanCard]}>'), PLANS.indexOf('<Card style={styles.noActivePlanRow}>'));
    expect(block).toContain('No active plan yet');
    expect(block).toContain('Start with a plan');
    expect(block).toContain('Browse plans');
    expect(block).not.toContain('Browse the library');
    expect(block).not.toContain('Find my plan');
  });

  test('PlansScreen decision hub label stays on the same verb for no-plan users', () => {
    expect(PLANS).toContain("{isProWithPlan ? 'Switch your plan' : 'Start with a plan'}");
    expect(PLANS).not.toContain('Start or build a plan');
  });

  test('PlansScreen Pro no-plan row uses the same verb', () => {
    const block = PLANS.slice(PLANS.indexOf('<Card style={styles.noActivePlanRow}>'), PLANS.indexOf('{/* Folders'));
    expect(block).toContain('Start with a plan');
    expect(block).not.toContain('Build one');
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

  test('FreeStarter fallback choices are quiet contained controls, not footnote links', () => {
    // CP-10 batch G lane 1: both icons' ink now resolves from the live theme.
    expect(FREE_STARTER).toContain('Ionicons name="library-outline" size={14} color={t.colors.textSecondary}');
    expect(FREE_STARTER).toContain('Ionicons name="arrow-forward" size={14} color={t.colors.textSecondary}');
    expect(FREE_STARTER).toMatch(/skipLink: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(FREE_STARTER).toContain('skipLinkText: { ...type.label, color: colors.textPrimary }');
    expect(FREE_STARTER).not.toContain('skipLinkText: { fontSize: fontSize.sm, color: colors.textMuted }');
  });
});
