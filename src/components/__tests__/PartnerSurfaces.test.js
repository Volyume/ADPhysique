/**
 * NEW-002 rebuild surface tests (replaces PartnerSection.test.js; the section
 * became PartnerRow on Consistency + the first-class PartnerScreen). Same
 * user-facing contract, same mocked usePartners drive:
 *  - the slim row reports the pair's state in one line and never a fail word;
 *  - the screen shows both sides of the week, the shared streak, the cheer
 *    (disabled once spent), the privacy receipt, and the pairing controls;
 *  - resting NEVER reads as a fail anywhere.
 */
import { create, act } from 'react-test-renderer';

const mockHook = { value: null };
jest.mock('../../hooks/usePartners', () => ({
  __esModule: true,
  default: () => mockHook.value,
}));
jest.mock('../../store/useAppStore', () => {
  const state = { user: { id: 'u1' }, tier: 'free' };
  const useAppStore = (sel) => (sel ? sel(state) : state);
  useAppStore.getState = () => state;
  return { __esModule: true, default: useAppStore };
});

import PartnerRow from '../PartnerRow';
import PartnerScreen from '../../screens/PartnerScreen';

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

function renderRow() {
  let tree;
  act(() => { tree = create(<PartnerRow userId="u1" tier="free" onOpen={jest.fn()} />); });
  return tree;
}

function renderScreen() {
  let tree;
  act(() => { tree = create(<PartnerScreen />); });
  return tree;
}

describe('PartnerRow (Consistency slim row)', () => {
  test('loading renders nothing', () => {
    mockHook.value = base({ loading: true });
    expect(renderRow().toJSON()).toBeNull();
  });

  test('empty state invites a partner', () => {
    mockHook.value = base({ rowState: 'empty' });
    expect(allText(renderRow())).toContain('Train with a partner');
  });

  test('active state names the partner with their ticks', () => {
    mockHook.value = base({
      rowState: 'active', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      partnerWeek: { done: 3, planned: 4, weekMet: false },
    });
    expect(allText(renderRow())).toContain('Sam: 3 of 4 this week');
  });

  test('a resting partner never reads as a fail', () => {
    mockHook.value = base({
      rowState: 'resting', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      partnerWeek: { state: 'resting' },
    });
    const text = allText(renderRow());
    expect(text).toContain('Sam: resting this week');
    expect(text.join(' ')).not.toMatch(/missed|fail|broke/i);
  });

  test('pending reads as waiting', () => {
    mockHook.value = base({ rowState: 'pending', partnership: { id: 'p1', status: 'invited' } });
    expect(allText(renderRow())).toContain('Invitation sent. Waiting for your partner.');
  });
});

describe('PartnerScreen (the first-class home)', () => {
  test('paired: both sides of the week, the shared streak, and a cheer', () => {
    mockHook.value = base({
      rowState: 'active', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      myWeek: { done: 2, planned: 4 },
      partnerWeek: { done: 3, planned: 4, weekMet: false }, cheerEnabled: true,
      sharedStreak: { run: 6, status: 'counting' },
    });
    const text = allText(renderScreen());
    expect(text).toContain('Sam');
    expect(text).toContain('You');
    expect(text).toContain('2 of 4');
    expect(text).toContain('3 of 4');
    expect(text).toContain('6 weeks running');
    expect(text).toContain('Cheer');
    expect(text).toContain('End partnership');
  });

  test('a spent cheer disables and reads "Cheer sent"', () => {
    mockHook.value = base({
      rowState: 'active', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      myWeek: { done: 4, planned: 4 },
      partnerWeek: { done: 4, planned: 4, weekMet: true }, cheerEnabled: false,
    });
    const tree = renderScreen();
    expect(allText(tree)).toContain('Cheer sent');
    const btn = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Cheer sent' && typeof n.props.onPress === 'function',
    )[0];
    expect(btn.props.disabled).toBe(true);
  });

  test('a resting partner reads "Resting this week", never a fail word', () => {
    mockHook.value = base({
      rowState: 'resting', partnership: { id: 'p1', partnerFirstName: 'Sam' },
      myWeek: { done: 1, planned: 3 },
      partnerWeek: { state: 'resting' },
    });
    const text = allText(renderScreen());
    expect(text).toContain('Resting this week');
    expect(text.join(' ')).not.toMatch(/missed|fail|broke/i);
  });

  test('empty state carries the privacy receipt and pairing controls', () => {
    mockHook.value = base({ rowState: 'empty' });
    const text = allText(renderScreen());
    expect(text).toContain('What you each see');
    expect(text).toContain('What neither of you will ever see');
    expect(text).toContain('Whether each of you trained this week, shown as a simple count like three of four. Never the numbers behind it.');
    expect(text).toContain('The weights you lifted, your sets and reps, or anything else from a session.');
    expect(text).toContain('Create invite');
    expect(text).toContain("Or enter a partner's code");
  });

  test('free cap shows when another partner cannot be added', () => {
    mockHook.value = base({ rowState: 'empty', canAdd: false });
    expect(allText(renderScreen())).toContain('Free includes one training partner. With Pro you can train alongside up to three.');
  });

  test('ended state reads "Partnership ended." and offers re-pairing', () => {
    mockHook.value = base({ rowState: 'ended', partnership: { id: 'p1', status: 'ended' } });
    const text = allText(renderScreen());
    expect(text).toContain('Partnership ended.');
    expect(text).toContain('Create invite');
  });
});
