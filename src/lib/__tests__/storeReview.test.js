/**
 * Store-review prompt gating. The OS allows effectively one review prompt, so
 * it must land on a habituated user: at least REVIEW_PROMPT_AFTER completed
 * sessions AND REVIEW_MIN_DAYS since the first counted session, and never
 * twice. These tests pin both gates and the legacy-install behaviour (counts
 * that predate the first-session anchor start the clock rather than prompt).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const {
  incrementSessionCount,
  shouldPromptReview,
  REVIEW_PROMPT_AFTER,
  REVIEW_MIN_DAYS,
} = require('../storeReview');

const DAY = 24 * 60 * 60 * 1000;

describe('storeReview gating', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  async function logSessions(n) {
    let count = 0;
    for (let i = 0; i < n; i++) count = await incrementSessionCount();
    return count;
  }

  test('counts sessions and anchors the first-session timestamp once', async () => {
    expect(await logSessions(3)).toBe(3);
    const firstAt = Number(await AsyncStorage.getItem('volyume_first_session_at'));
    expect(Number.isFinite(firstAt)).toBe(true);
    await logSessions(1);
    expect(Number(await AsyncStorage.getItem('volyume_first_session_at'))).toBe(firstAt);
  });

  test('not enough sessions: no prompt even after the days gate', async () => {
    await logSessions(REVIEW_PROMPT_AFTER - 1);
    const later = Date.now() + (REVIEW_MIN_DAYS + 1) * DAY;
    expect(await shouldPromptReview(later)).toBe(false);
  });

  test('enough sessions but too soon: no prompt', async () => {
    await logSessions(REVIEW_PROMPT_AFTER);
    expect(await shouldPromptReview(Date.now())).toBe(false);
  });

  test('both gates pass: prompt', async () => {
    await logSessions(REVIEW_PROMPT_AFTER);
    const later = Date.now() + (REVIEW_MIN_DAYS + 1) * DAY;
    expect(await shouldPromptReview(later)).toBe(true);
  });

  test('never prompts twice', async () => {
    await logSessions(REVIEW_PROMPT_AFTER);
    await AsyncStorage.setItem('volyume_review_prompted', 'true');
    const later = Date.now() + (REVIEW_MIN_DAYS + 1) * DAY;
    expect(await shouldPromptReview(later)).toBe(false);
  });

  test('legacy install (count exists, no anchor): waits for an anchor instead of prompting', async () => {
    await AsyncStorage.setItem('volyume_sessions_since_install', String(REVIEW_PROMPT_AFTER + 5));
    expect(await shouldPromptReview(Date.now() + 365 * DAY)).toBe(false);
    // The next completed session sets the anchor and starts the days clock.
    await incrementSessionCount();
    const later = Date.now() + (REVIEW_MIN_DAYS + 1) * DAY;
    expect(await shouldPromptReview(later)).toBe(true);
  });
});
