/**
 * Campaign 25 (docs/plans-screen-campaign-25-2026-08-17/PLANS-SCREEN-SPEC.md
 * §2 target architecture, §3 implementation notes, §4 edge cases): the Train
 * tab's render order inverted the founder's priority -- the hero was right,
 * everything after it was not. Folders and "My plans" rendered as an
 * unbounded stack of hero-weight cards in the middle of the page, and the
 * ways to change plans (Plan library / manual build / adjust / switch) sat
 * at the very bottom, below that stack.
 *
 * This suite pins the rebuilt hierarchy at the source level (the mounted order
 * is pinned in PlansScreen.d231Train.test.js; see PlansScreen.loadErrorState.
 * guard.test.js for the same convention):
 *   - section order: hero -> block-advice card -> Recent sessions -> "Your
 *     setup" -> "Plans" (the plan library, Create your own, Past blocks) ->
 *     "Previous plans" header -> "Archived plans" header (source-position
 *     assertions, so a future edit that silently reorders them fails here).
 *     RE-POINTED (D231, app layout rework batch 2): "Plan tools" became "Your
 *     setup" and "Plans", and Recent sessions came from Progress.
 *   - previousExpanded defaults false and the section is gated on
 *     myPlans.length > 0 (renders nothing for a brand-new user -- no empty
 *     shell).
 *   - renderPlanCard is gone entirely: no hero-weight per-plan card exists
 *     outside the active hero.
 *   - the previous-row Set-active affordance exists and reaches
 *     handleSetActive; archived rows carry no inline Set-active.
 *   - the deleted-folder fallthrough still routes dangling plans to the
 *     unfiled list, now inside the Previous plans section.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');

function idx(needle, from = 0) {
  const i = source.indexOf(needle, from);
  if (i === -1) throw new Error(`Not found: ${needle}`);
  return i;
}

describe('Campaign 25 / D231: section order (hero -> strip -> block card -> Recent sessions -> Your setup -> Plans -> Previous plans -> Archived)', () => {
  test('the hero (Active Plan) renders before the volume strip and the block-advice card', () => {
    const heroIdx = idx('{/* Active Plan. Campaign 25');
    const stripIdx = idx('<Card testID="train-volume-strip">');
    const blockCardIdx = idx('{/* Block advisor card */}');
    expect(heroIdx).toBeLessThan(stripIdx);
    expect(stripIdx).toBeLessThan(blockCardIdx);
  });

  test('the block-advice card renders before Recent sessions, Your setup and Plans', () => {
    const blockCardIdx = idx('{/* Block advisor card */}');
    const recentIdx = idx('<SectionLabel>Recent sessions</SectionLabel>');
    const setupIdx = idx('<SectionLabel>Your setup</SectionLabel>');
    const plansIdx = idx('<SectionLabel>Plans</SectionLabel>');
    expect(blockCardIdx).toBeLessThan(recentIdx);
    expect(recentIdx).toBeLessThan(setupIdx);
    expect(setupIdx).toBeLessThan(plansIdx);
  });

  test('Plans (library, Create your own, Past blocks) renders before "Previous plans"', () => {
    const plansIdx = idx('<SectionLabel>Plans</SectionLabel>');
    const pastBlocksIdx = idx('label="Past blocks"', plansIdx);
    const previousIdx = idx('{/* Previous plans. Campaign 25');
    expect(pastBlocksIdx).toBeGreaterThan(plansIdx);
    expect(previousIdx).toBeGreaterThan(pastBlocksIdx);
  });

  test('"Previous plans" renders before "Archived plans"', () => {
    const previousIdx = idx('{/* Previous plans. Campaign 25');
    const archivedIdx = idx('{/* Archived Plans. Campaign 25');
    expect(previousIdx).toBeLessThan(archivedIdx);
  });

  test('the "Plan tools" label and the Training blocks / Avoided movements / Training style rows are retired', () => {
    expect(source).not.toContain('<SectionLabel>Plan tools</SectionLabel>');
    expect(source).not.toContain('accessibilityLabel="Training blocks"');
    expect(source).not.toMatch(/<SectionLabel>\s*\{isProWithPlan \? 'Switch your plan' : 'Start with a plan'\}/);
    expect(source).toContain('label="Past blocks"');
    expect(source).toContain('sub="Completed blocks and long-term progress"');
  });
});

describe('Campaign 25: "Previous plans" collapsed section', () => {
  test('previousExpanded state exists, defaults false, mirrors archivedExpanded', () => {
    expect(source).toMatch(/const \[archivedExpanded, setArchivedExpanded\] = useState\(false\);/);
    expect(source).toMatch(/const \[previousExpanded, setPreviousExpanded\] = useState\(false\);/);
  });

  test('the section is gated on myPlans.length > 0 -- a brand-new user with zero previous plans renders no empty shell', () => {
    const sectionIdx = idx('{/* Previous plans. Campaign 25');
    const gateIdx = idx('{myPlans.length > 0 && (', sectionIdx);
    // The gate must be the very next conditional after the section's own
    // explanatory comment -- nothing unconditional renders ahead of it.
    expect(gateIdx - sectionIdx).toBeLessThan(600);
  });

  test('the header reads "Previous plans · N" where N = myPlans.length, toggled by previousExpanded, on the archivedHeader style pair', () => {
    const sectionIdx = idx('{/* Previous plans. Campaign 25');
    const headerBlock = source.slice(sectionIdx, sectionIdx + 1400);
    expect(headerBlock).toMatch(/style=\{styles\.archivedHeader\}/);
    expect(headerBlock).toMatch(/onPress=\{\(\) => setPreviousExpanded\(v => !v\)\}/);
    expect(headerBlock).toMatch(/accessibilityState=\{\{ expanded: previousExpanded \}\}/);
    expect(headerBlock).toMatch(/accessibilityLabel=\{`Previous plans, \$\{myPlans\.length\}`\}/);
    expect(headerBlock).toMatch(/style=\{\[styles\.archivedHeaderText, live\.archivedHeaderText\]\}/);
    expect(headerBlock).toContain('Previous plans · {myPlans.length}');
  });

  test('expanded content is gated on previousExpanded and contains both the folders map and the unfiled list', () => {
    const sectionIdx = idx('{/* Previous plans. Campaign 25');
    const archivedIdx = idx('{/* Archived Plans. Campaign 25');
    const body = source.slice(sectionIdx, archivedIdx);
    expect(body).toMatch(/\{previousExpanded && \(/);
    expect(body).toContain('folders.length > 0 && folders.map(folder => {');
    expect(body).toContain('unfiledPlans.length > 0 && (');
    // The folders map appears before the unfiled list, matching §2's order.
    const foldersAt = body.indexOf('folders.length > 0 && folders.map(folder => {');
    const unfiledAt = body.indexOf('unfiledPlans.length > 0 && (');
    expect(foldersAt).toBeLessThan(unfiledAt);
  });

  test('the deleted-folder fallthrough still routes dangling plans to the unfiled list (edge case, unchanged logic)', () => {
    expect(source).toContain('const folderIds = new Set(folders.map(f => f.id));');
    expect(source).toMatch(/if \(plan\.folderId && folderIds\.has\(plan\.folderId\)\) \{/);
    expect(source).toMatch(/unfiledPlans\.push\(plan\);/);
  });

  test('the empty-folder copy is unchanged', () => {
    expect(source).toContain('No plans in here yet. Use a plan&apos;s options to move it in.');
  });
});

describe('Campaign 25: renderPlanCard and its archived duplicate are retired', () => {
  test('renderPlanCard no longer exists as a function', () => {
    expect(source).not.toMatch(/function renderPlanCard\(/);
  });

  test('no hero-weight per-plan Card exists outside the active hero (planCard/archivedPlanCard styles gone)', () => {
    expect(source).not.toMatch(/\n\s*planCard: \{/);
    expect(source).not.toMatch(/\n\s*archivedPlanCard: \{/);
    expect(source).not.toMatch(/styles\.planCard\b/);
  });

  test('the archived section no longer duplicates card JSX -- it renders CompactPlanRow like every other list', () => {
    const archivedIdx = idx('{/* Archived Plans. Campaign 25');
    const templatesIdx = idx('{/* Workout Templates.');
    const archivedBlock = source.slice(archivedIdx, templatesIdx);
    expect(archivedBlock).toContain('<CompactPlanRow');
    expect(archivedBlock).not.toContain('<PressableCard');
    expect(archivedBlock).not.toMatch(/padding="none" style=\{\[styles\.planCard/);
  });
});

describe('Campaign 25: Set-active affordance (previous rows keep it, archived rows never inline it)', () => {
  test('previous rows (folder-body and unfiled) pass a working onSetActive', () => {
    const previousIdx = idx('{/* Previous plans. Campaign 25');
    const archivedIdx = idx('{/* Archived Plans. Campaign 25');
    const body = source.slice(previousIdx, archivedIdx);
    const matches = body.match(/onSetActive=\{\(\) => handleSetActive\(plan\)\}/g) || [];
    // One in the folder body, one in the unfiled body.
    expect(matches.length).toBe(2);
  });

  test('CompactPlanRow renders "Set active" only when onSetActive is supplied', () => {
    const fnStart = idx('function CompactPlanRow(');
    const fnEnd = idx('\nexport default function PlansScreen');
    const rowFn = source.slice(fnStart, fnEnd);
    expect(rowFn).toMatch(/\{onSetActive \? \(/);
    expect(rowFn).toContain('title="Set active"');
  });

  test('archived rows pass onSetActive={null} -- activation stays inside handleArchivedPlanOptions\'s sheet, never inline', () => {
    const archivedIdx = idx('{/* Archived Plans. Campaign 25');
    const templatesIdx = idx('{/* Workout Templates.');
    const archivedBlock = source.slice(archivedIdx, templatesIdx);
    expect(archivedBlock).toMatch(/onSetActive=\{null\}/);
    expect(archivedBlock).not.toMatch(/onSetActive=\{\(\) => handleSetActive/);
    expect(archivedBlock).toContain('handleArchivedPlanOptions(plan)');
  });
});

describe('Campaign 25: free/pro tier logic is retired (FOUNDER DECISION: fully free, no tier split)', () => {
  // RE-ANCHORED (D139, programme creation masterpass, 2026-09-03, finding:
  // "'Adjust training plan' rendered with no plan to adjust"): the plan rows are
  // gated on having an active plan, never on tier. With no active plan only
  // "Create your own" and "Past blocks" render (the library is already offered by
  // the no-plan EmptyState's own "Browse plans"). RE-POINTED (D231, batch 2): the
  // actionCards table became NavRows in Your setup and Plans.
  test('Adjust training plan and the library row are gated on having an active plan, never on tier', () => {
    expect(source).toMatch(/\{activePlan \? \(\s*<NavRow\s+icon="flag-outline"\s+label="Adjust training plan"/);
    expect(source).toMatch(/\{activePlan \? \(\s*<NavRow\s+icon="library-outline"\s+label="Pick from the plan library"/);
    // Comments stripped: a retirement note may name the retired constant in
    // prose without that counting as it surviving in code.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('ACTION_CARDS_DEFAULT');
  });

  // RETIRED (founder device order 2026-09-08: "unnecessary, looks ugly, get
  // rid"). The sentence and its isProWithPlan gate are both gone; pin the
  // removal so neither drifts back in.
  test('the "check-ins keep working" subtitle sentence is retired', () => {
    expect(source).not.toContain('Your check-ins, PRs, and coach output keep working whichever plan you choose.');
    expect(source).not.toContain('isProWithPlan');
  });

  test('FreeStarter/quiz is retired; the coach-built no-plan entry is the only one', () => {
    expect(source).not.toContain("navigation.navigate('FreeStarter')");
    // RE-ANCHORED (D139): the no-plan CTA now previews before it generates
    // (lib/startWithPlan.js), so the direct generateAndSavePlan(user.id,
    // userProfile) call is gone from this handler -- the real generation
    // (commitStartWithPlan) still ends in generateAndSavePlan, just one hop
    // away and only after the athlete confirms in PlanPreviewSheet.
    expect(source).toContain('handleStartWithPlanPress');
    expect(source).toContain("prepareStartWithPlan(user.id, userProfile, { mode: 'first' })");
    expect(source).toContain('commitStartWithPlan(user.id, userProfile)');
  });
});
