/**
 * RespectAllRow (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/23-PHASE3-SPEC.md` section 5).
 *
 * What this suite pins: no row at all when nobody trained today; a tap
 * calls `community_respect_all` for the given scope and shows "Respect
 * given to N people" afterwards; the row starts already-given (disabled)
 * when the device recorded a bulk Respect for this scope earlier TODAY,
 * and starts fresh (enabled) when the recorded day is not today.
 */

import { create, act } from 'react-test-renderer';

const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, v); }),
  },
}));

jest.mock('../../../lib/community/respect', () => ({
  lastRespectGivenState: jest.fn(),
  recordRespectGiven: jest.fn(() => Promise.resolve()),
  respectAll: jest.fn(),
}));

jest.mock('../../../lib/dayKey', () => ({ todayLocalKey: () => '2026-09-10' }));

const { lastRespectGivenState, recordRespectGiven, respectAll } = require('../../../lib/community/respect');
import RespectAllRow from '../RespectAllRow';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function render(props) {
  let tree;
  await act(async () => {
    tree = create(<RespectAllRow scope="gym" scopeKey="g1" hasTrainedToday {...props} />);
  });
  await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  lastRespectGivenState.mockResolvedValue(null);
  respectAll.mockResolvedValue({ given: 4 });
});

describe('RespectAllRow', () => {
  test('renders nothing when nobody trained today', async () => {
    const tree = await render({ hasTrainedToday: false });
    expect(tree.toJSON()).toBeNull();
  });

  test('renders the row when someone trained today and nothing was given yet', async () => {
    const tree = await render({});
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    expect(button.props.accessibilityLabel).toBe('Respect everyone who trained today');
    expect(button.props.accessibilityState).toEqual({ disabled: false });
  });

  test('a tap calls respectAll for the given scope, records it, and shows the count', async () => {
    const tree = await render({});
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    await act(async () => { button.props.onPress(); });
    await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });

    expect(respectAll).toHaveBeenCalledWith({ scope: 'gym', scopeKey: 'g1' });
    expect(recordRespectGiven).toHaveBeenCalledWith('gym', 'g1', '2026-09-10', 4);
    const after = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    expect(after.props.accessibilityLabel).toBe('Respect given to 4 people');
    expect(after.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenText(tree.toJSON())).toContain('Respect given to 4 people');
  });

  test('starts already-given (disabled) when the device recorded a bulk Respect for TODAY', async () => {
    lastRespectGivenState.mockResolvedValue({ day: '2026-09-10', given: 6 });
    const tree = await render({});
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    expect(button.props.accessibilityLabel).toBe('Respect given to 6 people');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(respectAll).not.toHaveBeenCalled();
  });

  test('a record from an earlier day does not disable the row (a new UK-local day resets it)', async () => {
    lastRespectGivenState.mockResolvedValue({ day: '2026-09-09', given: 6 });
    const tree = await render({});
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    expect(button.props.accessibilityLabel).toBe('Respect everyone who trained today');
    expect(button.props.accessibilityState).toEqual({ disabled: false });
  });

  test('a failed bulk Respect leaves the row enabled to try again', async () => {
    respectAll.mockRejectedValueOnce(new Error('offline'));
    const tree = await render({});
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    await act(async () => { button.props.onPress(); });
    await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });

    const after = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    expect(after.props.accessibilityState).toEqual({ disabled: false });
    expect(recordRespectGiven).not.toHaveBeenCalled();
  });
});
