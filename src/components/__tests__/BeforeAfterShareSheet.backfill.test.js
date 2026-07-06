/**
 * BeforeAfterShareSheet — weight backfill (progress-photos DATING upgrade).
 *
 * When a chosen photo has no snapshotted weigh-in (it was added before the
 * metadata layer existed), the sheet lazily backfills it ONCE so the card can
 * show its weight — guarded to weightKg missing (never overwriting an existing
 * snapshot) and best-effort. This pins that guard on the real component:
 *   - the null-weight photo is upserted once with just its takenAt;
 *   - the photo that already has a weight is never upserted.
 *
 * The pure params builder already proves a present weight flows onto the card
 * (see BeforeAfterShareSheet.test.js), so this suite only pins the backfill.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: () => false }));
jest.mock('../../store/useAppStore', () => {
  const fn = (sel) => sel({ tier: 'pro', user: { id: 'u-share-1' }, bodyWeightUnits: 'kg' });
  return { __esModule: true, default: fn };
});
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const OLD = { name: '1000.jpg', uri: 'file:///photos/old.jpg', ts: 1000 };
const NEW = { name: '9000.jpg', uri: 'file:///photos/new.jpg', ts: 9000 };

// Older has NO weight snapshot; newer already does.
const mockGetPhotoMetaMap = jest.fn(async () => ({
  [OLD.name]: { name: OLD.name, takenAt: OLD.ts, pose: null, weightKg: null, note: null },
  [NEW.name]: { name: NEW.name, takenAt: NEW.ts, pose: null, weightKg: 78.1, note: null },
}));
const mockUpsertPhotoMeta = jest.fn(async () => ({ name: OLD.name, takenAt: OLD.ts, pose: null, weightKg: 80.4, note: null }));
jest.mock('../../lib/progressPhotoMeta', () => ({
  __esModule: true,
  getPhotoMetaMap: (...a) => mockGetPhotoMetaMap(...a),
  upsertPhotoMeta: (...a) => mockUpsertPhotoMeta(...a),
}));

import BeforeAfterShareSheet from '../BeforeAfterShareSheet';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function mount() {
  let tree;
  await act(async () => {
    tree = create(<BeforeAfterShareSheet visible onClose={jest.fn()} photos={[OLD, NEW]} />);
  });
  await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); });
  return tree;
}

beforeEach(() => jest.clearAllMocks());

test('backfills the null-weight photo exactly once with just its takenAt', async () => {
  await mount();
  const oldCalls = mockUpsertPhotoMeta.mock.calls.filter((c) => c[1] === OLD.name);
  expect(oldCalls.length).toBe(1);
  expect(oldCalls[0]).toEqual(['u-share-1', OLD.name, { takenAt: OLD.ts }]);
});

test('never backfills a photo that already has a weight snapshot', async () => {
  await mount();
  const newCalls = mockUpsertPhotoMeta.mock.calls.filter((c) => c[1] === NEW.name);
  expect(newCalls.length).toBe(0);
});

test('renders the private share-card receipt', async () => {
  const tree = await mount();
  const text = flattenText(tree.toJSON());
  expect(text).toContain('One composed image. No raw photo files. You choose share or save.');
  expect(text).toContain('Exports one composed PNG, not your raw photos.');
  expect(text).toContain('Nothing leaves the device until you tap Share or Save.');
  expect(text).toContain('Names, notes, measurements and your photo library never appear.');
});
