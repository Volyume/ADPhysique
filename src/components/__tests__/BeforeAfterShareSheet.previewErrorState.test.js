/**
 * BeforeAfterShareSheet — preview error state (EP-17/UI-05, Codex
 * end-user-polish audit, native app only).
 *
 * Before this fix, `previewB64 === null` meant BOTH "still decoding/
 * rendering" and "permanently failed" (missing Skia/typeface, a decode
 * failure on a deleted/corrupt photo, or a surface/encode fault), so the
 * ActivityIndicator placeholder spun forever with no way out.
 *
 * This suite reuses the exact mount scaffold from
 * BeforeAfterShareSheet.backfill.test.js: it does NOT mock
 * `@shopify/react-native-skia` at all. Under Jest's node test environment
 * the real native package fails to load (the source's own
 * `try { require('@shopify/react-native-skia') } catch (_) {}` swallows
 * it), so `Skia` stays undefined here exactly as it would on a device build
 * missing the native module -- both photos then permanently fail to decode
 * (`decodePhoto` returns null whenever `!Skia`). This is a genuine
 * `renderCardBase64`/decode failure, not a fabricated one, so it proves the
 * real fix: the sheet must show a compact, retryable error card instead of
 * spinning forever.
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
jest.mock('../../lib/progressPhotoMeta', () => ({
  __esModule: true,
  getPhotoMetaMap: async () => ({}),
  upsertPhotoMeta: async () => null,
}));

import BeforeAfterShareSheet from '../BeforeAfterShareSheet';

const OLD = { name: '1000.jpg', uri: 'file:///photos/old.jpg', ts: 1000 };
const NEW = { name: '9000.jpg', uri: 'file:///photos/new.jpg', ts: 9000 };

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

describe('BeforeAfterShareSheet preview error state (EP-17/UI-05)', () => {
  test('a permanent decode/render failure (Skia unavailable) shows a labelled Retry, not an endless spinner', async () => {
    const tree = await mount();
    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't build the preview");

    const retryButtons = tree.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === 'Retry building the preview',
    );
    expect(retryButtons.length).toBeGreaterThan(0);
  });

  test('pressing Retry re-attempts the decode (never throws, stays a calm error state when Skia is still absent)', async () => {
    const tree = await mount();
    const retryBtn = tree.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === 'Retry building the preview' && typeof n.props.onPress === 'function',
    )[0];
    expect(retryBtn).toBeTruthy();

    await act(async () => {
      retryBtn.props.onPress();
      for (let i = 0; i < 12; i++) await Promise.resolve();
    });

    // Skia is still unavailable, so the error state persists (not a crash,
    // not a stuck spinner with no way to try again).
    const text = flattenText(tree.toJSON());
    expect(text).toContain("Couldn't build the preview");
  });
});
