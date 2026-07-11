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
    // CP-10 stage 3 (theming batch 2, 2026-07-10): HomeScreen now reads a
    // live theme (src/hooks/useTheme.js), so this inline colour prop moved
    // from `colors.textSecondary` to `t.colors.textSecondary`. The pinned
    // RULE (contained neutral control, not a loose text link) is unchanged
    // -- the static blankSessionLink/blankSessionLinkText definitions
    // (asserted next) are byte-identical to before.
    expect(HOME).toContain('Ionicons name="play-outline" size={14} color={t.colors.textSecondary}');
    expect(HOME).toMatch(/blankSessionLink: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(HOME).toContain('blankSessionLinkText: { ...type.label, color: colors.textPrimary }');
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
