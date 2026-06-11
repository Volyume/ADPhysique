/**
 * PostLapseSheet tests (COMP-025-A Moment 2).
 *
 * The sheet always states the data-safety body, asks the reason question only
 * when askReason is set, captures on the post_lapse_sheet surface, and marks
 * the episode sheet-shown on dismiss either way (one-time).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true }, tier: 'free', user: { id: 'u1' } });
  fn.getState = () => ({ accessibility: { reduceMotion: true }, tier: 'free', user: { id: 'u1' } });
  return { __esModule: true, default: fn };
});

let mockCaptured = true;
const mockCapture = jest.fn(() => mockCaptured);
jest.mock('../../lib/cancelReason', () => ({
  captureCancelReason: (...a) => mockCapture(...a),
  CANCEL_REASONS: [
    { key: 'price', label: 'It costs too much' },
    { key: 'not_using', label: "I wasn't using it enough" },
    { key: 'missing_feature', label: "It's missing something I need" },
    { key: 'switching', label: "I'm switching to another app" },
    { key: 'temporary_break', label: "I'm taking a break from training" },
  ],
  FREE_TEXT_REASONS: new Set(['missing_feature', 'switching']),
  FREE_TEXT_PROMPT: { missing_feature: 'What was missing?', switching: 'Which one?' },
}));

const mockMarkShown = jest.fn();
const mockMarkReason = jest.fn();
jest.mock('../../lib/payments/winbackState', () => ({
  shouldShowPostLapseSheet: jest.fn(() => Promise.resolve(false)),
  getEpisode: jest.fn(() => Promise.resolve(null)),
  markLapseSheetShown: (...a) => mockMarkShown(...a),
  markReasonCaptured: (...a) => mockMarkReason(...a),
}));

jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));

import PostLapseSheet from '../PostLapseSheet';

function pressByLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  act(() => node.props.onPress());
}

function render(props = {}) {
  let tree;
  act(() => {
    tree = create(
      <PostLapseSheet
        visible
        onClose={props.onClose || (() => {})}
        userId="u1"
        askReason={props.askReason ?? false}
      />,
    );
  });
  return tree;
}

beforeEach(() => {
  mockCapture.mockClear();
  mockMarkShown.mockClear();
  mockMarkReason.mockClear();
  mockCaptured = true;
});

test('always shows the ended-title + data-safety body', () => {
  const json = JSON.stringify(render().toJSON());
  expect(json).toContain('Your Pro subscription has ended');
  expect(json).toContain('Everything you logged is saved');
  expect(json).toContain('stay free');
});

test('askReason=false: no reason rows, "Got it" dismisses and marks sheet shown without capturing', () => {
  const onClose = jest.fn();
  const tree = render({ askReason: false, onClose });
  expect(JSON.stringify(tree.toJSON())).not.toContain('It costs too much');
  pressByLabel(tree, 'Got it');
  expect(mockCapture).not.toHaveBeenCalled();
  expect(mockMarkShown).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('askReason=true: shows rows; selecting + Done captures on the post_lapse surface and marks both', () => {
  const tree = render({ askReason: true });
  expect(JSON.stringify(tree.toJSON())).toContain('It costs too much');
  pressByLabel(tree, 'It costs too much');
  pressByLabel(tree, 'Done');
  expect(mockCapture).toHaveBeenCalledWith({
    reason: 'price', text: '', userId: 'u1', surface: 'post_lapse_sheet',
  });
  expect(mockMarkReason).toHaveBeenCalledTimes(1);
  expect(mockMarkShown).toHaveBeenCalledTimes(1);
});

test('askReason=true but nothing captured: marks sheet shown, does not mark reason', () => {
  mockCaptured = false;
  const tree = render({ askReason: true });
  pressByLabel(tree, 'Done');
  expect(mockMarkReason).not.toHaveBeenCalled();
  expect(mockMarkShown).toHaveBeenCalledTimes(1);
});
