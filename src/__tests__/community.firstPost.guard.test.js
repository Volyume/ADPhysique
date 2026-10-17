/**
 * community.firstPost.guard.test.js (D228 item 1, options B and C).
 *
 * Source-level regression guards (the order of the calls IS the safety
 * property here, and the behaviour tests cannot see an order that a refactor
 * quietly swaps), locking:
 *
 *  1. (2026-10-17: the summary sheet is REMOVED, see the guard below.) The auto-share effect: the sharing and
 *     membership checks, THEN the calm / open-flag gate
 *     (`sessionShareGateState`), THEN the first-post confirmation read, THEN
 *     the sheet, and only after all of those the publish. The sheet decision
 *     sits after the gate and before `publishAmbientItems`.
 *  2. `publishAmbientItems` has exactly one call site in the screen, inside
 *     `runAmbientPublish`, which is reached from exactly two places: the
 *     effect (past the confirmation) and the sheet's answer handler (past
 *     `saveShareSessions` and `markFirstPostConfirmed`).
 *  3. The sheet's answers go through the existing sharing path
 *     (`saveShareSessions`), never a direct store write, and "Not now" returns
 *     before any of it.
 *  4. The sheet's exact words, action order and minor handling.
 *  5. The Hub receipt: its words, its key, the real sentence, the gate before
 *     anything is surfaced, the change link target.
 *  6. D194 addendum 2 stands: this lane changes no default.
 *
 * Mirrors the 'source-pinned on WorkoutSummaryScreen.js' convention of
 * community.ambient.guard.test.js.
 */

const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const SUMMARY = read('../screens/WorkoutSummaryScreen.js');
const HUB = read('../screens/CommunityHubScreen.js');
const FIRST_POST = read('../lib/community/firstPost.js');
const JOIN_RECEIPT = read('../lib/community/joinReceipt.js');
const AMBIENT = read('../lib/community/ambient.js');

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

const EFFECT = between(SUMMARY, 'ambientPublishedRef.current = true;', '}, [readOnly, workoutId, user?.id]);');
const HELPER = between(SUMMARY, 'const runAmbientPublish = async () => {', 'ambientPublishedRef.current = true;');
describe('the summary has no first-post sheet and no post-to-Community action (founder order 2026-10-17)', () => {
  test('no sheet, no answer handler, no sheet state', () => {
    expect(SUMMARY).not.toMatch(/FirstPostSheet|firstPostSheet|answerFirstPost|setFirstPostSheet|saveShareSessions|markFirstPostConfirmed/);
  });

  test('no invitation copy and no post action on the strip', () => {
    expect(SUMMARY).not.toMatch(/Only you can see this session|Post this session|Share this session|are what Community is for/);
    expect(SUMMARY).not.toMatch(/Share every session/);
  });

  test('the factual states stay', () => {
    expect(SUMMARY).toContain("'Shared to Community'");
    expect(SUMMARY).toContain("'Shares to Community when you are back online'");
    expect(SUMMARY).toContain("'Not shared to Community'");
    expect(SUMMARY).toContain("'Check sharing settings'");
    expect(SUMMARY).toContain("'Add a note'");
  });

  test('unconfirmed: the gate runs first, then the outcome is recorded silently and nothing is published', () => {
    const gate = EFFECT.indexOf('sessionShareGateState(user.id, share.share_sessions)');
    const read = EFFECT.indexOf('readFirstPostConfirmed(user.id)');
    const skip = EFFECT.indexOf("skipped: 'not_confirmed'");
    const publish = EFFECT.indexOf('runAmbientPublish()');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(read);
    expect(read).toBeLessThan(skip);
    expect(skip).toBeLessThan(publish);
    expect(EFFECT.slice(skip, publish)).toMatch(/return;/);
  });

  test('a closed (or unanswerable) gate records "gated" and returns before the confirmation is even read', () => {
    const gate = EFFECT.indexOf('sessionShareGateState(');
    const confirmed = EFFECT.indexOf('readFirstPostConfirmed(');
    const between_ = EFFECT.slice(gate, confirmed);
    expect(between_).toMatch(/catch \(_e\) \{ gateOpen = false; \}/);
    expect(between_).toMatch(/if \(!gateOpen\) \{ setAmbientOutcome\(\{ created: 0, queued: 0, skipped: 'gated' \}\); return; \}/);
  });

  test('publishAmbientItems has one call site, inside runAmbientPublish, reached once', () => {
    expect(SUMMARY.match(/publishAmbientItems\(/g)).toHaveLength(1);
    expect(HELPER).toMatch(/publishAmbientItems\(/);
    expect(SUMMARY.match(/runAmbientPublish\(\)/g)).toHaveLength(1);
  });
});

describe('the confirmation keys', () => {
  test('per-user device keys under the Volyume community prefix', () => {
    expect(FIRST_POST).toContain("'@volyume_community_first_post_confirmed_'");
    expect(JOIN_RECEIPT).toContain("'@volyume_community_join_receipt_seen_'");
  });

  test('the first-post read fails CLOSED and the receipt read fails toward showing', () => {
    expect(between(FIRST_POST, 'export async function readFirstPostConfirmed', 'export async function markFirstPostConfirmed'))
      .toMatch(/catch \(_e\) \{\s*return false;/);
    expect(between(JOIN_RECEIPT, 'export async function readJoinReceiptSeen', 'export async function markJoinReceiptSeen'))
      .toMatch(/catch \(_e\) \{\s*return false;/);
  });

  test('the flush reads the confirmation after the gate and before any send', () => {
    const body = between(AMBIENT, 'export async function flushPendingAmbientItems(userId)', 'export async function clearPendingAmbientItems');
    expect(body.indexOf('sessionShareGateState(')).toBeLessThan(body.indexOf('readFirstPostConfirmed('));
    expect(body.indexOf('readFirstPostConfirmed(')).toBeLessThan(body.indexOf('sendAutoItem('));
  });
});

describe('the Hub receipt', () => {
  const REFRESH = between(HUB, 'const refreshJoinReceipt = useCallback(async () => {', 'useFocusEffect(useCallback(() => { refreshJoinReceipt(); }');

  test('the gate is consulted before anything is surfaced, and the sentence is the real one', () => {
    expect(REFRESH.indexOf('sessionShareGateState(uid, share.share_sessions)')).toBeGreaterThan(-1);
    expect(REFRESH.indexOf('sessionShareGateState(')).toBeLessThan(REFRESH.indexOf('settle({ sentence'));
    expect(REFRESH.indexOf('readJoinReceiptSeen(')).toBeLessThan(REFRESH.indexOf('settle({ sentence'));
    expect(REFRESH).toMatch(/sessionsSharingSentence\(share\.share_sessions, share\.sessions_audience\)/);
    expect(REFRESH).toMatch(/if \(!allowed \|\| share\.read_failed\) \{ settle\(null\); return; \}/);
    expect(REFRESH).toMatch(/catch \(_e\) \{\s*settle\(null\);/);
  });

  test('the card renders only while the consistency gate (calm / open flag) is also clear', () => {
    expect(HUB).toMatch(/\{joinReceipt && !consistencyGated \? \(/);
  });

  test('its words and its two actions', () => {
    expect(HUB).toContain('Your sessions post to Community');
    expect(HUB).toContain('title="Change who sees this"');
    expect(HUB).toContain('title="Dismiss"');
    expect(HUB).toMatch(/settleJoinReceipt\(\); navigation\.navigate\('CommunityPrivacy'\);/);
  });

  test('it is a member-only card in the notices block', () => {
    const notices = between(HUB, 'const notices = (', 'const hero = !joined');
    expect(notices).toContain('Your sessions post to Community');
    expect(REFRESH).toMatch(/if \(!joined \|\| !uid\) \{ settle\(null\); return; \}/);
  });
});

describe('copy and defaults', () => {
  test('no em dash in any file this lane adds', () => {
    for (const source of [FIRST_POST, JOIN_RECEIPT]) {
      expect(source).not.toMatch(/—/);
    }
  });

  test('D194 addendum 2 stands: sharing is still on by default, to everyone', () => {
    // eslint-disable-next-line global-require
    const { TP_DEFAULT_SHARE, DEFAULT_SESSIONS_AUDIENCE } = require('../lib/community/trainingProfile');
    expect(TP_DEFAULT_SHARE.share_sessions).toBe(true);
    expect(DEFAULT_SESSIONS_AUDIENCE).toBe('everyone');
  });
});
