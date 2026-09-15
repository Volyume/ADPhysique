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

describe('CoachOutputScreen R2 radius cohesion', () => {
  test('every plain surface content card uses the app-wide card radius (lg)', () => {
    for (const card of [
      'planEditCard',
      'holdHeroCard',
      'coachLeadCard',
      'focusCard',
      'countdownCard',
    ]) {
      expect(radiusOf(card)).toBe('lg');
    }
  });

  test('the recorded ED-safety Banner class keeps radius.md (not "fixed")', () => {
    expect(radiusOf('edLockoutCard')).toBe('md');
    expect(radiusOf('edClearedCard')).toBe('md');
  });

  // R2 lead-ruled one-liner (2026-07-11, coach/home lane): the adjustment
  // icon-backing joined the control/input/icon-backing family at radius.md
  // (FOOD-DESIGN-STANDARD.md section 4), pinned so it could not drift back to
  // the tighter radius.sm.
  //
  // Re-anchored 2026-09-15 under D174: there is no icon-backing left to give a
  // corner to. The amber census ruled the `primaryBg` disc behind that glyph a
  // "tint behind a glyph" (plan section 3.2) and removed the fill AND the disc
  // geometry, exactly as SettingsPrimitives' 104 rows did. The intent of the
  // case -- this wrap never carries a bespoke corner -- is asserted directly
  // now, and more strongly, because the whole disc has to stay gone for it to
  // pass. `radiusOf` is deliberately NOT reused here: its regex runs on past a
  // key with no borderRadius and reports the NEXT key's radius, which is how
  // this read "full" the moment the disc went.
  test('the adjustment icon-backing carries no disc at all (D174)', () => {
    const block = SOURCE.match(/\n {2}adjustmentIconWrap: \{([\s\S]*?)\n {2}\},/);
    expect(block).not.toBeNull();
    expect(block[1]).not.toMatch(/borderRadius/);
    expect(block[1]).not.toMatch(/backgroundColor/);
    expect(block[1]).toMatch(/width: iconSize\.lg/);
  });
});
