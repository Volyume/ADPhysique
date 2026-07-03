/**
 * ConsistencyEcho (S2) — the Home consistency echo + one-time forgiveness
 * explainer. Pins the ED-safety suppression (absent under an open flag / SCOFF /
 * calm mode, all surfaced by the resolver's `suppressed`), the run-line copy,
 * and that the explainer only shows on a clean "not yet seen" read.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import ConsistencyEcho from '../ConsistencyEcho';

jest.mock('../../hooks/useWeeklyStreak');
// eslint-disable-next-line import/first
import useWeeklyStreak from '../../hooks/useWeeklyStreak';

const mockGetItem = jest.fn(() => Promise.resolve('1'));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...a) => mockGetItem(...a),
  setItem: jest.fn(() => Promise.resolve()),
}));

const vm = (o = {}) => ({ render: true, suppressed: false, hasTarget: true, runLength: 5, current: { state: 'kept' }, ...o });

function texts(r) {
  return r.root.findAllByType(Text).map((t) => {
    const c = t.props.children;
    return Array.isArray(c) ? c.join('') : String(c);
  });
}
const has = (r, s) => texts(r).some((t) => t.includes(s));

beforeEach(() => { mockGetItem.mockResolvedValue('1'); });

describe('ConsistencyEcho run line', () => {
  test('renders the run in weeks', () => {
    useWeeklyStreak.mockReturnValue(vm());
    let r; act(() => { r = create(<ConsistencyEcho userId="u" />); });
    expect(has(r, '5 weeks running')).toBe(true);
  });

  test('singular week', () => {
    useWeeklyStreak.mockReturnValue(vm({ runLength: 1 }));
    let r; act(() => { r = create(<ConsistencyEcho userId="u" />); });
    expect(has(r, '1 week running')).toBe(true);
  });

  test('a recovery week reads as the run carrying on', () => {
    useWeeklyStreak.mockReturnValue(vm({ current: { state: 'resting' } }));
    let r; act(() => { r = create(<ConsistencyEcho userId="u" />); });
    expect(has(r, 'Recovery week. Your run carries on.')).toBe(true);
  });
});

describe('ConsistencyEcho suppression (ED safety)', () => {
  test('absent under suppression (ED flag / SCOFF / calm)', () => {
    useWeeklyStreak.mockReturnValue(vm({ suppressed: true }));
    let r; act(() => { r = create(<ConsistencyEcho userId="u" />); });
    expect(r.toJSON()).toBeNull();
  });

  test('absent without a plan-derived target', () => {
    useWeeklyStreak.mockReturnValue(vm({ hasTarget: false }));
    let r; act(() => { r = create(<ConsistencyEcho userId="u" />); });
    expect(r.toJSON()).toBeNull();
  });

  test('absent when there is no run yet (session-count mode)', () => {
    useWeeklyStreak.mockReturnValue(vm({ runLength: 0 }));
    let r; act(() => { r = create(<ConsistencyEcho userId="u" />); });
    expect(r.toJSON()).toBeNull();
  });
});

describe('ConsistencyEcho one-time explainer', () => {
  test('shows the forgiveness promise on a clean "not yet seen" read', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    useWeeklyStreak.mockReturnValue(vm());
    let r; await act(async () => { r = create(<ConsistencyEcho userId="u" />); });
    expect(has(r, 'One off week never breaks your run')).toBe(true);
  });

  test('hidden once the seen flag is set', () => {
    mockGetItem.mockResolvedValue('1');
    useWeeklyStreak.mockReturnValue(vm());
    let r; act(() => { r = create(<ConsistencyEcho userId="u" />); });
    expect(has(r, 'One off week never breaks your run')).toBe(false);
  });
});
