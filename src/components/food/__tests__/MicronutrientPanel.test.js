/**
 * MicronutrientPanel (MN-1, audit §15 item 2): collapsed-by-default diary
 * surface. Pins the behaviour the blueprint calls out explicitly:
 *   - lazy: nothing resolves while collapsed
 *   - grouped Vitamins then Minerals
 *   - a null day-total renders "unknown", NEVER "0" or a dash implying zero
 *   - NRV percent is shown for a known total
 *   - the empty/error states use the app's standard retry pattern
 *
 * The Pro-only gate itself lives on the DiaryScreen call site (this
 * component trusts its caller, same as the rest of the diary's Pro
 * affordances); that gate is pinned separately by
 * diaryMicronutrientPanel.guard.test.js.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../../lib/food/sources/localCache', () => ({
  resolveFoodRef: jest.fn(),
}));

import { resolveFoodRef } from '../../../lib/food/sources/localCache';
import MicronutrientPanel from '../MicronutrientPanel';

function findHeader(tree) {
  return tree.root.findByProps({ accessibilityLabel: 'Vitamins and minerals' });
}

function flattenText(tree) {
  return JSON.stringify(tree.toJSON());
}

async function expandPanel(tree) {
  const header = findHeader(tree);
  await act(async () => { header.props.onPress(); });
}

describe('MicronutrientPanel', () => {
  beforeEach(() => {
    resolveFoodRef.mockReset();
  });

  test('collapsed by default: no rows rendered, resolveFoodRef never called (lazy)', () => {
    const tree = create(
      <MicronutrientPanel entries={[{ food_ref: 'global:1', quantity_g: 200 }]} userId="u1" />
    );
    expect(flattenText(tree)).toContain('Vitamins and minerals');
    expect(flattenText(tree)).not.toContain('Vitamin C');
    expect(resolveFoodRef).not.toHaveBeenCalled();
  });

  test('expanding resolves every entry, groups Vitamins then Minerals, shows NRV%, and renders a missing nutrient as "unknown" not zero', async () => {
    resolveFoodRef.mockResolvedValue({
      vit_c_100g: 40, // 200g -> 80mg -> 100% of the 80mg NRV
      // every other micro column is absent -> unknown, never 0
    });
    const tree = create(
      <MicronutrientPanel entries={[{ food_ref: 'global:1', quantity_g: 200 }]} userId="u1" />
    );

    await expandPanel(tree);

    const text = flattenText(tree);
    expect(resolveFoodRef).toHaveBeenCalledWith('u1', 'global:1');
    expect(text).toContain('Vitamins');
    expect(text).toContain('Minerals');
    expect(text).toContain('Vitamin C');
    expect(text).toContain('80 mg');
    expect(text).toContain('100% NRV');
    // Iron had no data from any logged food today: unknown, never "0 mg".
    expect(text).toContain('Iron');
    expect(text).toContain('unknown');
    // Exact quoted rendered value, not a loose substring: "80 mg" legitimately
    // ends in "0 mg", so a bare substring check would false-fail here.
    expect(text).not.toContain('"0 mg"');
    expect(text).not.toContain('Iron, 0 mg');

    // Vitamins group appears before Minerals in the flattened render order.
    expect(text.indexOf('"Vitamins"')).toBeLessThan(text.indexOf('"Minerals"'));
  });

  test('no entries: shows the empty-data copy, never a zero/dash reading', async () => {
    const tree = create(<MicronutrientPanel entries={[]} userId="u1" />);
    await expandPanel(tree);
    const text = flattenText(tree);
    expect(text).toContain("We don't have the vitamin and mineral data for some of these foods yet.");
    expect(resolveFoodRef).not.toHaveBeenCalled();
  });

  test('entries present but every food lacks micronutrient data: same empty-data copy', async () => {
    resolveFoodRef.mockResolvedValue({}); // no micro columns at all
    const tree = create(
      <MicronutrientPanel entries={[{ food_ref: 'global:2', quantity_g: 100 }]} userId="u1" />
    );
    await expandPanel(tree);
    const text = flattenText(tree);
    expect(text).toContain("We don't have the vitamin and mineral data for some of these foods yet.");
  });

  test('a resolve failure shows the standard retryable error state, and Try again re-attempts', async () => {
    resolveFoodRef.mockRejectedValueOnce(new Error('db closed'));
    const tree = create(
      <MicronutrientPanel entries={[{ food_ref: 'global:1', quantity_g: 200 }]} userId="u1" />
    );
    await expandPanel(tree);
    expect(flattenText(tree)).toContain("Couldn't load vitamin and mineral data.");

    resolveFoodRef.mockResolvedValueOnce({ vit_c_100g: 40 });
    const retry = tree.root.findByProps({ accessibilityLabel: 'Try again' });
    await act(async () => { retry.props.onPress(); });
    expect(flattenText(tree)).toContain('Vitamin C');
  });
});
