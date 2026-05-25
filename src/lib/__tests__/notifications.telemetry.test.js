/**
 * notifications.telemetry.test.js
 *
 * Asserts:
 *   - notification_sent payload shape (category + scheduled_for + delivered_at)
 *   - notification_tapped payload shape (category + tapped_at + extra data)
 *   - notification_failed payload shape (category + reason)
 *   - silently no-ops when nobody is signed in
 *   - silently no-ops when category can't be resolved from notification
 *   - resolveCategory uses explicit category if passed
 *   - resolveCategory falls back to categoryForDataType on notification.request.content.data.type
 *   - .catch on the inner track call swallows errors (no throw out of helpers)
 *   - PII keys (weight*, kcal*, email) are NOT in the payload Body the
 *     helpers build (defensive; redactPII is the second line of defence)
 */

// Hoisted to module scope so the lazy require in telemetry.js picks up
// the mock when it first resolves.
const mockTrack = jest.fn(() => Promise.resolve('id'));
const mockGetState = jest.fn();

jest.mock('../engineTelemetry', () => ({
  track: (...args) => mockTrack(...args),
}));

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockGetState() },
}));

const {
  trackNotificationSent,
  trackNotificationTapped,
  trackNotificationFailed,
} = require('../notifications/telemetry');
const { CATEGORY } = require('../notifications/categories');

beforeEach(() => {
  mockTrack.mockReset();
  mockTrack.mockImplementation(() => Promise.resolve('id'));
  mockGetState.mockReset();
  mockGetState.mockReturnValue({ user: { id: 'user-123' } });
});

describe('trackNotificationSent', () => {
  test('fires notification_sent with category + delivered_at + scheduled_for', () => {
    trackNotificationSent({
      category: CATEGORY.MORNING_WEIGHT,
      scheduledFor: '2026-05-25T19:00:00Z',
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      'user-123',
      'notification_sent',
      expect.objectContaining({
        category: 'morning_weight',
        scheduled_for: '2026-05-25T19:00:00Z',
        delivered_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });

  test('resolves category from notification.request.content.data.type', () => {
    trackNotificationSent({
      notification: { request: { content: { data: { type: 'weekly_checkin' } } } },
    });
    expect(mockTrack).toHaveBeenCalledWith(
      'user-123',
      'notification_sent',
      expect.objectContaining({ category: CATEGORY.WEEKLY_CHECKIN_REMINDER }),
    );
  });

  test('no-op when nobody is signed in', () => {
    mockGetState.mockReturnValue({ user: null });
    trackNotificationSent({ category: CATEGORY.MORNING_WEIGHT });
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('no-op when neither category nor data.type resolves', () => {
    trackNotificationSent({
      notification: { request: { content: { data: { type: 'some_unknown_type' } } } },
    });
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('no-op on missing notification object', () => {
    trackNotificationSent({});
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('swallows track errors (helper never throws)', () => {
    mockTrack.mockImplementation(() => Promise.reject(new Error('telemetry down')));
    expect(() => trackNotificationSent({ category: CATEGORY.MORNING_WEIGHT })).not.toThrow();
  });
});

describe('trackNotificationTapped', () => {
  test('fires notification_tapped with category + tapped_at', () => {
    trackNotificationTapped({
      category: CATEGORY.WEEKLY_CHECKIN_REMINDER,
      payload: { data_type: 'weekly_checkin' },
    });
    expect(mockTrack).toHaveBeenCalledWith(
      'user-123',
      'notification_tapped',
      expect.objectContaining({
        category: 'weekly_checkin_reminder',
        tapped_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        data_type: 'weekly_checkin',
      }),
    );
  });

  test('no-op when signed out', () => {
    mockGetState.mockReturnValue({ user: null });
    trackNotificationTapped({ category: CATEGORY.MORNING_WEIGHT });
    expect(mockTrack).not.toHaveBeenCalled();
  });
});

describe('trackNotificationFailed', () => {
  test('fires notification_failed with category + reason', () => {
    trackNotificationFailed({
      category: CATEGORY.MORNING_WEIGHT,
      reason: 'schedule_threw',
      payload: { message: 'bridge offline' },
    });
    expect(mockTrack).toHaveBeenCalledWith(
      'user-123',
      'notification_failed',
      expect.objectContaining({
        category: 'morning_weight',
        reason: 'schedule_threw',
        message: 'bridge offline',
      }),
    );
  });

  test('no-op when category is missing (so we never log "unknown" failures)', () => {
    trackNotificationFailed({ reason: 'schedule_threw' });
    expect(mockTrack).not.toHaveBeenCalled();
  });

  test('defaults reason to "unknown" when not provided', () => {
    trackNotificationFailed({ category: CATEGORY.MORNING_WEIGHT });
    expect(mockTrack).toHaveBeenCalledWith(
      'user-123',
      'notification_failed',
      expect.objectContaining({ reason: 'unknown' }),
    );
  });
});

describe('payload PII discipline', () => {
  // The helpers build payloads from a small set of fields. None of those
  // fields are PII (no weight, kcal, email, body fat). This is the FIRST
  // line of defence; sentryScrub + redactPII are the second.
  test('notification_sent payload contains only structural fields', () => {
    trackNotificationSent({ category: CATEGORY.MORNING_WEIGHT, scheduledFor: '2026-05-25T19:00:00Z' });
    const payload = mockTrack.mock.calls[0][2];
    const keys = Object.keys(payload).sort();
    // Acceptable keys: anything except PII tokens.
    const pii = ['weight', 'weight_kg', 'kcal', 'protein', 'carbs', 'fat', 'body_fat', 'email', 'first_name'];
    for (const k of keys) {
      expect(pii).not.toContain(k);
    }
  });
});
