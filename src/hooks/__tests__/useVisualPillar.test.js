/**
 * useVisualPillar — Campaign 23 R1 (founder ruling, FOUNDER-RULINGS-PHASE2.md:
 * "derived signal only... a core evidence pillar, not a navigation tile").
 *
 * Volyume is fully free (founder decision 2026-09-03): there is no Free/Pro
 * split and the hook takes no tier argument any more.
 *
 * What this suite pins and why:
 *  - FAIL CLOSED: while usePhotoSuppression reports suppressed (its own
 *    default, and the state it returns under calm mode / an open ED flag /
 *    a read failure), the hook never even reads scan data -- the scan store
 *    is not queried at all, matching the other high-risk photo surfaces'
 *    contract.
 *  - Once suppression is confirmed lifted, the scan store is queried for
 *    every signed-in user.
 *  - The eligibility/status fields consumed downstream come straight from
 *    the shared v1/v2 producer chain (getProgressScanCoachSummary ->
 *    resolveProgressScanCoachNote -> buildProgressScanCoachEvidence ->
 *    buildScanEvidencePacket) -- no local re-derivation.
 */
import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';
import useVisualPillar from '../useVisualPillar';

const mockGetProgressScanCoachSummary = jest.fn();
jest.mock('../../lib/progressScanStore', () => ({
  getProgressScanCoachSummary: (...args) => mockGetProgressScanCoachSummary(...args),
}));

let mockSuppressed = true;
jest.mock('../usePhotoSuppression', () => ({
  __esModule: true,
  default: () => mockSuppressed,
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderHook(userId) {
  const ref = { current: null };
  function Probe() {
    ref.current = useVisualPillar(userId);
    return null;
  }
  let tree;
  await act(async () => { tree = create(<Probe />); });
  await flush();
  return { ref, tree };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSuppressed = true;
});

describe('useVisualPillar fail-closed suppression', () => {
  test('suppressed (the default/fail-closed state): never queries the scan store', async () => {
    mockSuppressed = true;
    const { ref, tree } = await renderHook('u1');
    expect(ref.current.suppressed).toBe(true);
    expect(ref.current.hasScan).toBe(false);
    expect(mockGetProgressScanCoachSummary).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });

  test('not suppressed: queries the scan store exactly once', async () => {
    mockSuppressed = false;
    mockGetProgressScanCoachSummary.mockResolvedValue(null);
    const { ref, tree } = await renderHook('u1');
    expect(mockGetProgressScanCoachSummary).toHaveBeenCalledTimes(1);
    expect(mockGetProgressScanCoachSummary).toHaveBeenCalledWith('u1', { suppressed: false });
    expect(ref.current.hasScan).toBe(false); // null scan -> "no scan ever"
    act(() => { tree.unmount(); });
  });

  test('no signed-in user: never queries the scan store even when not suppressed', async () => {
    mockSuppressed = false;
    const { ref, tree } = await renderHook(null);
    expect(ref.current.hasScan).toBe(false);
    expect(mockGetProgressScanCoachSummary).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });
});

describe('useVisualPillar source-level guard', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'useVisualPillar.js'), 'utf8');

  test('reads suppression through the shared usePhotoSuppression hook, not a local re-derivation', () => {
    expect(src).toMatch(/import usePhotoSuppression from '\.\/usePhotoSuppression';/);
    expect(src).toMatch(/const suppressed = usePhotoSuppression\(userId\);/);
  });

  test('the scan-store read is gated on suppression before any query runs', () => {
    expect(src).toMatch(/if \(!userId \|\| suppressed\)/);
  });

  test('reuses the shared producer chain, no local scan-signal derivation', () => {
    expect(src).toMatch(/import \{ getProgressScanCoachSummary \} from '\.\.\/lib\/progressScanStore';/);
    expect(src).toMatch(/import \{ resolveProgressScanCoachNote \} from '\.\.\/lib\/progressScanCoachResolver';/);
    expect(src).toMatch(/import \{ buildProgressScanCoachEvidence \} from '\.\.\/lib\/progressScanCoachEvidence';/);
    expect(src).toMatch(/import \{ buildScanEvidencePacket \} from '\.\.\/lib\/progressScanCheckInEvidence';/);
  });
});
