/**
 * CO-2 (2026-07-09 UX audit) — the training-volume card's missing link to
 * the plan it changed.
 *
 * SCORECARD.md: "Coach Output's missing cross-tab links (CO-2/CO-3). The
 * training card tells the user 'N updated' without ever linking to the plan
 * it changed, unlike its own nutrition-side sibling two lines away."
 *
 * The nutrition sibling is the food-level receipt's deepLink
 * (planExplain.js: `deepLink: { label: opts.deepLinkLabel || 'See your meal
 * plan', target: 'MealPlan' }`), rendered a couple of hundred lines below as
 * a TouchableOpacity with styles.planEditLink / styles.planEditLinkText,
 * accessibilityRole="button" and an accessibilityLabel matching its visible
 * text. This pins the training card's new link mirroring that same
 * component, style and a11y contract.
 *
 * This screen cannot be safely `require`'d in Jest (live zustand store, no
 * existing mock scaffold — see CoachOutputScreen.profileMerge.guard.test.js
 * and progressScanCoachIsolation.guard.test.js). Source-guard style,
 * following the same house convention.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

function matchingBraceSlice(source, openBraceIndex) {
  let depth = 0;
  let i = openBraceIndex;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  expect(depth).toBe(0);
  return source.slice(openBraceIndex, i + 1);
}

describe('TrainingNextWeekCard receives navigation from the screen', () => {
  test('function signature accepts a navigation prop', () => {
    const start = SCREEN.indexOf('function TrainingNextWeekCard({');
    expect(start).toBeGreaterThan(-1);
    const sig = matchingBraceSlice(SCREEN, SCREEN.indexOf('{', start));
    expect(sig).toMatch(/\bnavigation\b/);
  });

  test('the screen passes its own navigation prop down to the card', () => {
    const start = SCREEN.indexOf('<TrainingNextWeekCard');
    expect(start).toBeGreaterThan(-1);
    const end = SCREEN.indexOf('/>', start);
    const block = SCREEN.slice(start, end + 2);
    expect(block).toMatch(/navigation=\{navigation\}/);
  });
});

describe('the training card links to the plan it changed once applied (CO-2)', () => {
  test('renders "See your updated plan", gated on applied + musclesChanged + navigation, mirroring the nutrition sibling', () => {
    const cardStart = SCREEN.indexOf('function TrainingNextWeekCard({');
    const cardEnd = SCREEN.indexOf('\nfunction ', cardStart + 1);
    const cardBody = SCREEN.slice(cardStart, cardEnd === -1 ? SCREEN.length : cardEnd);

    expect(cardBody).toMatch(
      /\{applied && output\.appliedAdjustments\?\.training\?\.musclesChanged && navigation \? \(/,
    );
    // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): the
    // frozen styles.planEditLink now carries a mechanical live-theme append
    // (style={[styles.planEditLink, live.planEditLink]}), same pattern as
    // every other themed screen; the style key/behaviour it names is
    // unchanged.
    expect(cardBody).toMatch(/style=\{\[styles\.planEditLink, live\.planEditLink\]\}/);
    expect(cardBody).toMatch(/accessibilityRole="button"/);
    expect(cardBody).toMatch(/accessibilityLabel="See your updated plan"/);
    expect(cardBody).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{\[styles\.planEditLinkText, live\.planEditLinkText\]\}>See your updated plan<\/Text>/);
  });

  test('navigates to the Plans tab landing screen (no specific routine/plan id is tracked on this screen)', () => {
    const cardStart = SCREEN.indexOf('function TrainingNextWeekCard({');
    const cardEnd = SCREEN.indexOf('\nfunction ', cardStart + 1);
    const cardBody = SCREEN.slice(cardStart, cardEnd === -1 ? SCREEN.length : cardEnd);

    expect(cardBody).toMatch(
      /onPress=\{\(\) => navigation\.navigate\('PlansTab', \{ screen: 'Plans', initial: false \}\)\}/,
    );
  });

  test('reuses the exact same link component/style as the nutrition-side food-level-receipt deep link', () => {
    // The nutrition sibling (planEditNote.deepLink) uses the same
    // styles.planEditLink / styles.planEditLinkText pair and
    // accessibilityRole="button" convention.
    const siblingStart = SCREEN.indexOf('planEditNote?.deepLink ? (');
    expect(siblingStart).toBeGreaterThan(-1);
    const siblingBlock = SCREEN.slice(siblingStart, siblingStart + 600);
    // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): same
    // mechanical live-theme style-array append as the training card above.
    expect(siblingBlock).toMatch(/style=\{\[styles\.planEditLink, live\.planEditLink\]\}/);
    expect(siblingBlock).toMatch(/style=\{\[styles\.planEditLinkText, live\.planEditLinkText\]\}/);
    expect(siblingBlock).toMatch(/accessibilityRole="button"/);
  });
});
