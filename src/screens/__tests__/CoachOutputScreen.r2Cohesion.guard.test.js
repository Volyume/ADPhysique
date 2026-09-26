/**
 * R2 design-cohesion census guard for CoachOutputScreen (remediation
 * 2026-07-11, TASKBOARD R2: the app styled uniformly as one package on the
 * shared design system, primitives only).
 *
 * Source-level lock for the radius census this pass settled:
 *  - every PLAIN surface content card on this screen takes the app-wide card
 *    radius (radius.lg, FOOD-DESIGN-STANDARD.md section 2), never a bespoke
 *    corner. The lone residue was `countdownCard` at radius.md; it is a plain
 *    `colors.surface` card (full spacing.lg padding, role="summary"), NOT a
 *    tinted D69/D70 banner (banners keep radius.md), so it joins its four
 *    sibling surface cards (planEditCard/holdHeroCard/coachLeadCard/focusCard).
 *
 * Chrome only: this pass did not touch the ED/calm suppression gate, the
 * deterministic engine, gating or telemetry. The ED-safety blocks
 * (edLockoutCard/edClearedCard) are the recorded Banner class and stay
 * radius.md by design; asserted here so a future "fix" can't drift them.
 *
 * RE-ANCHORED (2026-09-26, founder order on the "Coaching decision" screen,
 * verbatim: "Coaching Decisions looks shit too it doesn't appear to be
 * following the style of the app at all and is a mismatch of texts styles
 * and formats. Sort it."). The R2 census above still holds -- these five
 * cards still read at the app-wide radius.lg corner -- but the MECHANISM
 * changed: planEditCard/holdHeroCard/coachLeadCard/focusCard/countdownCard
 * now render through the shared `<Card>` primitive (radius.lg is Card's own
 * default), rather than hand-rolling backgroundColor/border/radius/padding
 * locally. A `borderRadius: radius.lg` literal on these style keys would now
 * be dead weight at best and a silent second source of truth at worst, so
 * the census is re-pinned the other way round: each key carries NO
 * `borderRadius` of its own, and the JSX actually renders it through
 * `<Card`. edLockoutCard/edClearedCard (the ED-safety Banner class) and
 * adjustmentIconWrap are untouched by the R2 cohesion pass and keep their
 * original direct pins exactly as before.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'CoachOutputScreen.js'),
  'utf8',
);

function radiusOf(styleName) {
  const m = SOURCE.match(
    new RegExp(`${styleName}:\\s*\\{[\\s\\S]*?borderRadius:\\s*radius\\.(\\w+)`),
  );
  return m ? m[1] : null;
}

// The five R2 cards' style objects are flat (no nested braces), so a
// non-greedy capture up to the FIRST closing brace is the object's whole
// body -- it cannot overrun into a sibling key the way a `[\s\S]*?` scan
// against a later, unrelated `borderRadius` could.
function styleBodyOf(styleName) {
  const m = SOURCE.match(new RegExp(`\\b${styleName}:\\s*\\{([^}]*)\\}`));
  return m ? m[1] : null;
}

// A Card usage is one JSX opening tag; `[^>]*` is bounded to that tag so it
// can't cross into an unrelated later `<Card`.
function rendersThroughCard(styleName) {
  return new RegExp(`<Card[^>]*styles\\.${styleName}\\b`).test(SOURCE);
}

describe('CoachOutputScreen R2 radius cohesion', () => {
  test('the five former hand-rolled cards carry no borderRadius of their own and render through <Card> (radius.lg is the primitive\'s default)', () => {
    for (const card of [
      'planEditCard',
      'holdHeroCard',
      'coachLeadCard',
      'focusCard',
      'countdownCard',
    ]) {
      const body = styleBodyOf(card);
      expect(body).not.toBeNull();
      expect(body).not.toMatch(/borderRadius/);
      expect(rendersThroughCard(card)).toBe(true);
    }
  });

  test('the recorded ED-safety Banner class keeps radius.md (not "fixed")', () => {
    expect(radiusOf('edLockoutCard')).toBe('md');
    expect(radiusOf('edClearedCard')).toBe('md');
  });

  // R2 lead-ruled one-liner (2026-07-11, coach/home lane): the adjustment
  // icon-backing joins the control/input/icon-backing family at radius.md
  // (FOOD-DESIGN-STANDARD.md section 4). Was radius.sm. Pinned so it cannot
  // drift back to the tighter corner.
  test('the adjustment icon-backing uses the icon-backing radius (md)', () => {
    expect(radiusOf('adjustmentIconWrap')).toBe('md');
  });
});
