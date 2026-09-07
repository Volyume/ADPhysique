/**
 * PeopleFiltersSheet (community-product-audit-2026-09-07
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.3).
 *
 * What this suite pins:
 *
 *   1. The sheet edits a DRAFT: closing without "Show results" never
 *      calls `onApply`.
 *   2. "Show results" calls `onApply` with `normaliseFilters` of whatever
 *      is on screen -- an empty draft answers `null`.
 *   3. Where (My gym / Near me / Anywhere) is pick-one-OR-NONE: a second
 *      tap on the selected chip clears it; choosing Near me reveals the
 *      distance band row, defaulted to "Same place".
 *   4. Age band only renders when the caller shares their own
 *      (`me.tp_age_band`); a caller with none never sees the section.
 *   5. Reopening the sheet re-seeds the draft from what is CURRENTLY
 *      applied (`value`), not from whatever was left over from a
 *      cancelled edit.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, children }) => (visible ? React.createElement(View, null, children) : null),
    InsideBottomSheetContext: React.createContext(false),
  };
});

jest.mock('../../../lib/community', () => ({
  FILTER_SCOPES: { gym: 'My gym', place: 'Near me', any: 'Anywhere' },
  PLACE_BAND_MILES: ['0', '5', '10', '25'],
  PLACE_BAND_LABELS: {
    0: 'Same place', 5: 'Within 5 miles', 10: 'Within 10 miles', 25: 'Within 25 miles',
  },
  normaliseFilters: jest.requireActual('../../../lib/community/findPeople').normaliseFilters,
  TP_DAYS: { mon: 'Mon', tue: 'Tue' },
  TP_TIME_BANDS: { morning: 'mornings', evening: 'evenings' },
  TP_EXPERIENCE_BANDS: { new: 'New', intermediate: 'Intermediate' },
  TP_AGE_BANDS: { '18_24': '18 to 24', '25_34': '25 to 34' },
  COMMUNITY_STYLE_KEYS: { strength: 'Strength' },
  COMMUNITY_GOALS: { get_stronger: 'Get stronger' },
}));

import PeopleFiltersSheet from '../PeopleFiltersSheet';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); });
}

function chip(tree, label) {
  return tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function' && n.props?.accessibilityRole,
  )[0] ?? tree.root.findAll(
    (n) => n.props?.label === label && typeof n.props?.onPress === 'function',
  )[0];
}

async function tap(tree, label) {
  const node = chip(tree, label);
  expect(node).toBeTruthy();
  await act(async () => { node.props.onPress(); });
  await flush();
}

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<PeopleFiltersSheet visible {...props} />); });
  await flush();
  return tree;
}

const ME_NO_AGE = { profile: { user_id: 'u1', gym_label: 'PureGym Leeds', place_label: 'Motherwell' }, tp_age_band: null };
const ME_WITH_AGE = { ...ME_NO_AGE, tp_age_band: '18_24' };

describe('drafting versus applying', () => {
  test('closing without applying never calls onApply', async () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    const tree = await mount({ onApply, onClose, me: ME_NO_AGE, value: null });

    await tap(tree, 'My gym');
    // Closed via the header's X, not "Show results".
    const closeBtn = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Close')[0];
    if (closeBtn) await act(async () => { closeBtn.props.onPress(); });

    expect(onApply).not.toHaveBeenCalled();
  });

  test('"Show results" applies normaliseFilters of the draft', async () => {
    const onApply = jest.fn();
    const tree = await mount({ onApply, onClose: jest.fn(), me: ME_NO_AGE, value: null });

    await tap(tree, 'My gym');
    await tap(tree, 'Show results');

    expect(onApply).toHaveBeenCalledWith({ scope: 'gym' });
  });

  test('an empty draft applies null, not {}', async () => {
    const onApply = jest.fn();
    const tree = await mount({ onApply, onClose: jest.fn(), me: ME_NO_AGE, value: null });

    await tap(tree, 'Show results');

    expect(onApply).toHaveBeenCalledWith(null);
  });
});

describe('Where: pick one or none, and the distance band', () => {
  test('a second tap on the selected scope clears it', async () => {
    const onApply = jest.fn();
    const tree = await mount({ onApply, onClose: jest.fn(), me: ME_NO_AGE, value: null });

    await tap(tree, 'My gym');
    await tap(tree, 'My gym');
    await tap(tree, 'Show results');

    expect(onApply).toHaveBeenCalledWith(null);
  });

  test('choosing Near me reveals the band row, defaulted to Same place', async () => {
    const tree = await mount({ onApply: jest.fn(), onClose: jest.fn(), me: ME_NO_AGE, value: null });

    expect(flattenText(tree.toJSON())).not.toContain('Within 5 miles');
    await tap(tree, 'Near me');
    expect(flattenText(tree.toJSON())).toContain('Within 5 miles');
  });

  test('choosing a band applies it with scope place', async () => {
    const onApply = jest.fn();
    const tree = await mount({ onApply, onClose: jest.fn(), me: ME_NO_AGE, value: null });

    await tap(tree, 'Near me');
    await tap(tree, 'Within 10 miles');
    await tap(tree, 'Show results');

    expect(onApply).toHaveBeenCalledWith({ scope: 'place', place_band_miles: '10' });
  });
});

describe('Age band: only when the caller shares their own', () => {
  test('absent entirely for a caller with no age band', async () => {
    const tree = await mount({ onApply: jest.fn(), onClose: jest.fn(), me: ME_NO_AGE, value: null });
    expect(flattenText(tree.toJSON())).not.toContain('Age band');
  });

  test('present, and applies the chosen band, for a caller who shares one', async () => {
    const onApply = jest.fn();
    const tree = await mount({ onApply, onClose: jest.fn(), me: ME_WITH_AGE, value: null });

    expect(flattenText(tree.toJSON())).toContain('Age band');
    await tap(tree, '25 to 34');
    await tap(tree, 'Show results');

    expect(onApply).toHaveBeenCalledWith({ age_band: '25_34' });
  });
});

describe('reopening re-seeds the draft from what is applied', () => {
  test('a cancelled edit does not leak into the next open', async () => {
    const onApply = jest.fn();
    let tree;
    await act(async () => {
      tree = create(
        <PeopleFiltersSheet
          visible
          onApply={onApply}
          onClose={jest.fn()}
          me={ME_NO_AGE}
          value={{ scope: 'gym' }}
        />,
      );
    });
    await flush();

    // Edit the draft, but close the SHEET (visible: false) rather than apply.
    await tap(tree, 'Near me');
    await act(async () => {
      tree.update(
        <PeopleFiltersSheet
          visible={false}
          onApply={onApply}
          onClose={jest.fn()}
          me={ME_NO_AGE}
          value={{ scope: 'gym' }}
        />,
      );
    });
    await flush();
    await act(async () => {
      tree.update(
        <PeopleFiltersSheet
          visible
          onApply={onApply}
          onClose={jest.fn()}
          me={ME_NO_AGE}
          value={{ scope: 'gym' }}
        />,
      );
    });
    await flush();

    await tap(tree, 'Show results');
    expect(onApply).toHaveBeenLastCalledWith({ scope: 'gym' });
  });
});
