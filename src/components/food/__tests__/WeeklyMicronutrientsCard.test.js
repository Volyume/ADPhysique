/**
 * WeeklyMicronutrientsCard.test.js — Ultimate-Audit item 16 (MN-1), D22 16b
 * secondary surface (Food Insights). Pins:
 *   - the coverage-floor rule gates which nutrients ever render
 *   - unknown/below-floor nutrients are OMITTED, never shown as a low number
 *   - planned-but-unconfirmed entries (is_planned=1) never count
 *   - the "awareness, not a target" intro copy, and empty/error states
 */
import { act } from 'react-test-renderer';
const { create } = require('react-test-renderer');

jest.mock('../../../lib/food/db', () => ({ getFoodEntriesForRange: jest.fn() }));
jest.mock('../../../lib/food/sources/localCache', () => ({ resolveFoodRef: jest.fn() }));

import { getFoodEntriesForRange } from '../../../lib/food/db';
import { resolveFoodRef } from '../../../lib/food/sources/localCache';
import WeeklyMicronutrientsCard from '../WeeklyMicronutrientsCard';

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function flatten(tree) {
  return JSON.stringify(tree.toJSON());
}

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<WeeklyMicronutrientsCard {...props} />); });
  await flush();
  return tree;
}

beforeEach(() => {
  getFoodEntriesForRange.mockReset();
  resolveFoodRef.mockReset();
});

describe('WeeklyMicronutrientsCard', () => {
  test('no userId -> nothing loads, no crash', async () => {
    const tree = await mount({ userId: null, startDate: '2026-07-01', endDate: '2026-07-07' });
    expect(getFoodEntriesForRange).not.toHaveBeenCalled();
    expect(flatten(tree)).toContain('VITAMINS AND MINERALS');
  });

  test('no entries in the window -> the calm "log food" empty state, not a grid', async () => {
    getFoodEntriesForRange.mockResolvedValue([]);
    const tree = await mount({ userId: 'u1', startDate: '2026-07-01', endDate: '2026-07-07' });
    expect(flatten(tree)).toContain('Log food across the week to see a picture build here.');
    expect(resolveFoodRef).not.toHaveBeenCalled();
  });

  test('planned-but-unconfirmed entries (is_planned=1) never count towards the average', async () => {
    getFoodEntriesForRange.mockResolvedValue([
      { entry_date: '2026-07-01', food_ref: 'global:1', quantity_g: 100, kcal: 200, is_planned: 1 },
    ]);
    const tree = await mount({ userId: 'u1', startDate: '2026-07-01', endDate: '2026-07-07' });
    expect(resolveFoodRef).not.toHaveBeenCalled();
    expect(flatten(tree)).toContain('Log food across the week to see a picture build here.');
  });

  test('entries exist but no nutrient clears the coverage floor -> the honest "not enough" line, no fabricated averages', async () => {
    getFoodEntriesForRange.mockResolvedValue([
      { entry_date: '2026-07-01', food_ref: 'global:1', quantity_g: 100, kcal: 500, is_planned: 0 },
    ]);
    resolveFoodRef.mockResolvedValue({}); // no micro data at all
    const tree = await mount({ userId: 'u1', startDate: '2026-07-01', endDate: '2026-07-07' });
    expect(flatten(tree)).toContain('Not enough foods with known values yet to show an average.');
    expect(flatten(tree)).not.toContain('mg/day');
  });

  test('a nutrient covering >= 50% of the window kcal is shown; one covering less is omitted entirely', async () => {
    getFoodEntriesForRange.mockResolvedValue([
      // Day 1: 200 kcal food carries iron -> known.
      { entry_date: '2026-07-01', food_ref: 'global:1', quantity_g: 100, kcal: 200, is_planned: 0 },
      // Day 2: 200 kcal food carries NO iron, and NO vitC either -> both unknown here.
      { entry_date: '2026-07-02', food_ref: 'global:2', quantity_g: 100, kcal: 200, is_planned: 0 },
    ]);
    resolveFoodRef.mockImplementation(async (_uid, ref) => {
      if (ref === 'global:1') return { iron_100g: 5, vit_c_100g: 10 };
      return {}; // global:2 carries nothing
    });
    const tree = await mount({ userId: 'u1', startDate: '2026-07-01', endDate: '2026-07-07' });
    const text = flatten(tree);
    // Iron known on 200 of 400 total kcal = exactly 50% = the floor -> included.
    expect(text).toContain('Iron');
    expect(text).toContain('mg/day');
    // Intro copy present once a nutrient is shown.
    expect(text).toContain('A rough picture from the foods with known values. Gaps mean unknown, not zero.');
    expect(text).toContain('Average over 2 days logged this week.');
  });

  test('a nutrient below the coverage floor never appears, even though it has some data', async () => {
    getFoodEntriesForRange.mockResolvedValue([
      { entry_date: '2026-07-01', food_ref: 'global:1', quantity_g: 100, kcal: 100, is_planned: 0 }, // carries zinc
      { entry_date: '2026-07-02', food_ref: 'global:2', quantity_g: 100, kcal: 200, is_planned: 0 }, // no zinc
      { entry_date: '2026-07-03', food_ref: 'global:3', quantity_g: 100, kcal: 200, is_planned: 0 }, // no zinc
    ]);
    resolveFoodRef.mockImplementation(async (_uid, ref) => {
      if (ref === 'global:1') return { zinc_100g: 3 };
      return {};
    });
    const tree = await mount({ userId: 'u1', startDate: '2026-07-01', endDate: '2026-07-07' });
    const text = flatten(tree);
    // Zinc known on 100 of 500 kcal = 20%, below the 50% floor -> omitted entirely.
    expect(text).not.toContain('Zinc');
  });

  test('load failure -> a calm retry-less error line, never a crash', async () => {
    getFoodEntriesForRange.mockRejectedValue(new Error('boom'));
    const tree = await mount({ userId: 'u1', startDate: '2026-07-01', endDate: '2026-07-07' });
    expect(flatten(tree)).toContain("Couldn't load this. Try again later.");
  });
});
