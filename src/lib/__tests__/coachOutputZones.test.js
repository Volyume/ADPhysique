/**
 * U-B-1 §6: the CoachOutput hero/secondary/safety zoning is driven entirely by
 * the engine-derived output.primary. These assert the spec invariants against
 * the pure selector the screen uses:
 *   - the hero is the engine's top applyable decision;
 *   - the other applyable adjustments are NOT in the hero (they go to the
 *     collapsed "More adjustments" secondary);
 *   - the ED-safety blocks are never the hero and never in the secondary;
 *   - primary:null (on-target/holding) → no hero, and the expander is empty-safe.
 * (Render integration is covered by the screen-mount harness; the collapse
 * behaviour by CollapsibleSection.test.js.)
 */
import { selectCoachOutputZones } from '../coachOutputZones';

const out = (domain) => ({ hasEnoughData: true, primary: { domain, reasonKey: domain ?? 'on_target_holding' } });

describe('selectCoachOutputZones (U-B-1 §3/§6)', () => {
  test('calories primary → nutrition is the hero; training drops to secondary', () => {
    const z = selectCoachOutputZones(out('calories'), {});
    expect(z.heroKind).toBe('nutrition');
    expect(z.secondaryKinds).toContain('training');
    expect(z.secondaryKinds).not.toContain('nutrition'); // the hero is not duplicated
    expect(z.dietBreakInSafety).toBe(false);
  });

  test('steps primary also makes nutrition the hero', () => {
    expect(selectCoachOutputZones(out('steps'), {}).heroKind).toBe('nutrition');
  });

  test('training and deload primary both make training the hero', () => {
    expect(selectCoachOutputZones(out('training'), {}).heroKind).toBe('training');
    const z = selectCoachOutputZones(out('deload'), {});
    expect(z.heroKind).toBe('training');
    expect(z.secondaryKinds).toContain('nutrition');
    expect(z.secondaryKinds).not.toContain('training');
  });

  test('macro/refeed are always secondary, never the hero', () => {
    const z = selectCoachOutputZones(out('calories'), { hasMacro: true, hasRefeed: true });
    expect(z.secondaryKinds).toEqual(expect.arrayContaining(['training', 'macro', 'refeed']));
  });

  test('primary:null (on-target/holding) → no hero, no empty expander assumptions', () => {
    const z = selectCoachOutputZones(out(null), {});
    expect(z.heroKind).toBeNull();
    // both applyable cards fall to the secondary (shown as held/hold rows)
    expect(z.secondaryKinds).toEqual(['training', 'nutrition']);
  });

  test('diet break is a safety block by default, never the hero or secondary', () => {
    const z = selectCoachOutputZones(out('calories'), { dietBreakSuggested: true });
    expect(z.dietBreakInSafety).toBe(true);
    expect(z.secondaryKinds).not.toContain('dietBreak');
    expect(z.heroKind).toBe('nutrition');
  });

  test('diet break is the hero only when it is the engine top decision', () => {
    const z = selectCoachOutputZones(out('dietBreak'), { dietBreakSuggested: true });
    expect(z.heroKind).toBe('dietBreak');
    expect(z.dietBreakInSafety).toBe(false); // rendered once, as the hero
  });

  test('an ED-safety primary (null domain) never promotes a hero', () => {
    // ffm_floor_hold / rapid_loss_corrected resolve to domain:null in the engine.
    const z = selectCoachOutputZones({ hasEnoughData: true, primary: { domain: null, reasonKey: 'rapid_loss_corrected' } }, {});
    expect(z.heroKind).toBeNull();
  });
});
