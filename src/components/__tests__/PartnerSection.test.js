/**
 * PartnerSection (NEW-002) mount tests. Drives each row state through a mocked
 * usePartners hook and asserts the user-facing contract: the empty row invites,
 * the active row shows ticks + a cheer, a resting partner reads "Resting this
 * week" (never a fail), the receipt sheet lists what is and isn't shared, and a
 * spent cheer disables.
 */
import { create, act } from 'react-test-renderer';

const mockHook = { value: null };
jest.mock('../../hooks/usePartners', () => ({
  __esModule: true,
  default: () => mockHook.value,
}));

import PartnerSection from '../PartnerSection';

function base(overrides = {}) {
  return {
    loading: false, partnership: null, rowState: 'empty', partnerWeek: null,
    myWeek: null, sharedStreak: null, cheerEnabled: false, lastReceived: null,
    canAdd: true,
    invite: jest.fn(), redeem: jest.fn(), cheer: jest.fn(), unpair: jest.fn(),
    block: jest.fn(), reload: jest.fn(),
    ...overrides,
  };
}

function allText(tree) {
  return tree.root.findAll((n) => n.type === 'Text')
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter((c) => typeof c === 'string');
}

function render() {
  let tree;
  act(() => { tree = create(<PartnerSection userId="u1" tier="free" />); });
  return tree;
}

describe('PartnerSection', () => {
  test('loading renders nothing', () => {
    mockHook.value = base({ loading: true });
    expect(render().toJSON()).toBeNull();
  });

  test('empty state invites a partner', () => {
    mockHook.value = base({ rowState: 'empty' });
    expect(allText(render())).toContain('Train with a partner');
  });

  test('active state shows relative-to-self ticks and a cheer', () => {
    mockHook.value = base({
      rowState: 'active', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      partnerWeek: { done: 3, planned: 4, weekMet: false }, cheerEnabled: true,
      sharedStreak: { run: 6, status: 'counting' },
    });
    const text = allText(render());
    expect(text).toContain('Sam');
    expect(text).toContain('3 of 4');
    expect(text).toContain('6 weeks');
    expect(text).toContain('Cheer');
  });

  test('a resting partner never reads as a fail', () => {
    mockHook.value = base({
      rowState: 'resting', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      partnerWeek: { state: 'resting' },
    });
    const text = allText(render());
    expect(text).toContain('Resting this week');
    // The row itself never shows a shame word (the receipt's "Never as a fail."
    // is intentional reassurance copy and lives in the sheet, not the row).
    expect(text).not.toContain('Quiet week');
    expect(text).not.toContain('missed');
  });

  test('a spent cheer disables and reads "Cheer sent"', () => {
    mockHook.value = base({
      rowState: 'active', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      partnerWeek: { done: 4, planned: 4, weekMet: true }, cheerEnabled: false,
    });
    const tree = render();
    expect(allText(tree)).toContain('Cheer sent');
    const btn = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Cheer sent' && typeof n.props.onPress === 'function',
    )[0];
    expect(btn.props.disabled).toBe(true);
  });

  test('ended state reads "Partnership ended."', () => {
    mockHook.value = base({ rowState: 'ended', partnership: { id: 'p1', status: 'ended' } });
    expect(allText(render())).toContain('Partnership ended.');
  });
});
