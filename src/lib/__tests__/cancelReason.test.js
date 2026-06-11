/**
 * cancelReason tests (COMP-025-A shared capture).
 *
 * The enum goes to telemetry; the free text goes to user_feedback and ONLY for
 * missing_feature / switching; no reason → no side effects.
 */
const mockTrack = jest.fn(() => ({ catch: () => {} }));
const mockSubmitFeedback = jest.fn(() => ({ catch: () => {} }));
jest.mock('../telemetry', () => ({ track: (...a) => mockTrack(...a) }));
jest.mock('../feedback', () => ({ submitFeedback: (...a) => mockSubmitFeedback(...a) }));

const { captureCancelReason, CANCEL_REASONS, FREE_TEXT_REASONS } = require('../cancelReason');

beforeEach(() => {
  mockTrack.mockClear();
  mockSubmitFeedback.mockClear();
});

test('no reason → no telemetry, no feedback, returns false', () => {
  expect(captureCancelReason({ reason: null, surface: 'pre_store_handoff' })).toBe(false);
  expect(mockTrack).not.toHaveBeenCalled();
  expect(mockSubmitFeedback).not.toHaveBeenCalled();
});

test('a reason emits the enum event with the surface', () => {
  expect(captureCancelReason({ reason: 'price', userId: 'u1', surface: 'post_lapse_sheet' })).toBe(true);
  expect(mockTrack).toHaveBeenCalledWith('u1', 'cancel_reason_captured', {
    reason: 'price', surface: 'post_lapse_sheet',
  });
  expect(mockSubmitFeedback).not.toHaveBeenCalled();
});

test('free text routes to user_feedback only for missing_feature / switching', () => {
  captureCancelReason({ reason: 'missing_feature', text: ' Watch app ', userId: 'u1', surface: 'pre_store_handoff' });
  expect(mockSubmitFeedback).toHaveBeenCalledWith({
    trigger: 'cancel_reason', sentiment: 'missing_feature', message: 'Watch app', userId: 'u1',
  });
});

test('free text is ignored for non-free-text reasons', () => {
  captureCancelReason({ reason: 'price', text: 'too dear', userId: 'u1', surface: 'pre_store_handoff' });
  expect(mockSubmitFeedback).not.toHaveBeenCalled();
});

test('the enum keys and free-text set are consistent', () => {
  const keys = CANCEL_REASONS.map(r => r.key);
  expect(keys).toEqual(['price', 'not_using', 'missing_feature', 'switching', 'temporary_break']);
  for (const k of FREE_TEXT_REASONS) expect(keys).toContain(k);
});
