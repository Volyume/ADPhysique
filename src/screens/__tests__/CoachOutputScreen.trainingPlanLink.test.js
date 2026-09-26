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
 *
 * RE-ANCHORED (2026-09-26, founder order on the "Coaching decision" screen,
 * verbatim: "Coaching Decisions looks shit too it doesn't appear to be
 * following the style of the app at all and is a mismatch of texts styles
 * and formats. Sort it."). Every quiet outline action on this screen was
 * renamed from `variant="outline"` to `variant="secondary"` (same Button
 * treatment, one name instead of two for it) -- the CO-2 contract this
 * suite pins is unchanged: the link exists, is gated, and uses the same
 * treatment as its nutrition-side sibling, so the two pins below move to
 * the new literal with it.
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
    // Founder device report 2026-08-06 ("text only links", random look):
    // the hand-rolled planEditLink pill became the shared Button secondary
    // variant (RE-ANCHORED 2026-09-26, was "outline"). The CO-2 contract
    // this suite pins is unchanged: the link exists, is gated, and uses the
    // SAME treatment as the nutrition sibling (asserted below).
    expect(cardBody).toMatch(/<Button\n\s+title="See your updated plan"\n\s+variant="secondary"/);
    expect(cardBody).toMatch(/accessibilityLabel="See your updated plan"/);
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
    // The nutrition sibling (planEditNote.deepLink) uses the same shared
    // Button secondary treatment as the training card's link above
    // (RE-ANCHORED 2026-09-26, was "outline").
    const siblingStart = SCREEN.indexOf('planEditNote?.deepLink ? (');
    expect(siblingStart).toBeGreaterThan(-1);
    const siblingBlock = SCREEN.slice(siblingStart, siblingStart + 600);
    expect(siblingBlock).toMatch(/<Button\n\s+title=\{planEditNote\.deepLink\.label\}\n\s+variant="secondary"/);
    expect(siblingBlock).toMatch(/accessibilityLabel=\{planEditNote\.deepLink\.label\}/);
  });
});
