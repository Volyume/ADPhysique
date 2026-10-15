/**
 * community.firstPost.guard.test.js (D228 item 1, options B and C).
 *
 * Source-level regression guards (the order of the calls IS the safety
 * property here, and the behaviour tests cannot see an order that a refactor
 * quietly swaps), locking:
 *
 *  1. The auto-share effect on WorkoutSummaryScreen: the sharing and
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
const SHEET = read('../components/community/FirstPostSheet.js');
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
const ANSWER = between(SUMMARY, 'const answerFirstPost = async (choice) => {', '// Communities revamp phase 3 (Q2): decide whether to show the');

describe('the summary decision order: the sheet sits after the gate and before the publish', () => {
  test('membership and sharing-on, then the gate, then the confirmation, then the sheet, then the publish', () => {
    const at = (needle) => {
      const i = EFFECT.indexOf(needle);
      expect(i).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at('readCachedMe(user.id)'),
      at("skipped: 'no_profile'"),
      at("skipped: 'sharing_off'"),
      at('sessionShareGateState(user.id, share.share_sessions)'),
      at('readFirstPostConfirmed(user.id)'),
      at('setFirstPostSheetOpen(true)'),
      at('runAmbientPublish()'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('an unconfirmed person returns before the publish is reachable', () => {
    const ask = EFFECT.indexOf('setFirstPostSheetOpen(true);');
    const publish = EFFECT.indexOf('runAmbientPublish()');
    expect(EFFECT.slice(ask, publish)).toMatch(/return;/);
  });

  test('a closed (or unanswerable) gate records "gated" and returns before the confirmation is even read', () => {
    const gate = EFFECT.indexOf('sessionShareGateState(');
    const confirmed = EFFECT.indexOf('readFirstPostConfirmed(');
    const between_ = EFFECT.slice(gate, confirmed);
    expect(between_).toMatch(/catch \(_e\) \{ gateOpen = false; \}/);
    expect(between_).toMatch(/if \(!gateOpen\) \{ setAmbientOutcome\(\{ created: 0, queued: 0, skipped: 'gated' \}\); return; \}/);
  });

  test('publishAmbientItems has one call site, inside runAmbientPublish', () => {
    expect(SUMMARY.match(/publishAmbientItems\(/g)).toHaveLength(1);
    expect(HELPER).toMatch(/publishAmbientItems\(/);
  });

  test('runAmbientPublish is reached from exactly two places, each past the confirmation', () => {
    expect(SUMMARY.match(/runAmbientPublish\(\)/g)).toHaveLength(2);
    expect(EFFECT.indexOf('readFirstPostConfirmed(')).toBeLessThan(EFFECT.indexOf('runAmbientPublish()'));
    expect(ANSWER.indexOf('markFirstPostConfirmed(')).toBeGreaterThan(-1);
    expect(ANSWER.indexOf('markFirstPostConfirmed(')).toBeLessThan(ANSWER.indexOf('runAmbientPublish()'));
  });
});

describe('the sheet answers go through the existing sharing path', () => {
  test('saveShareSessions, then the confirmation, then the publish; never a direct store write', () => {
    const save = ANSWER.indexOf('saveShareSessions(');
    const mark = ANSWER.indexOf('markFirstPostConfirmed(');
    const publish = ANSWER.indexOf('runAmbientPublish()');
    expect(save).toBeGreaterThan(-1);
    expect(save).toBeLessThan(mark);
    expect(mark).toBeLessThan(publish);
    expect(ANSWER).not.toMatch(/writeShareSettings\(/);
    expect(ANSWER).not.toMatch(/AsyncStorage/);
  });

  test('Not now returns before anything is written, marked or posted', () => {
    const notNow = ANSWER.indexOf("choice === 'not_now'");
    expect(notNow).toBeGreaterThan(-1);
    expect(notNow).toBeLessThan(ANSWER.indexOf('saveShareSessions('));
    expect(ANSWER.slice(notNow, ANSWER.indexOf('let confirmed')))
      .toMatch(/keepPrivate\(\); return;/);
  });

  test('a minor is clamped to followers and passed as a minor to the setter', () => {
    expect(ANSWER).toMatch(/sessions_audience: isMinor \? 'followers' : choice/);
    expect(ANSWER).toMatch(/saveShareSessions\(user\.id, prev, next, \{ isMinor \}\)/);
  });

  test('rules_outdated confirms nothing', () => {
    const rules = ANSWER.indexOf("saved?.status === 'rules_outdated'");
    expect(rules).toBeGreaterThan(-1);
    expect(rules).toBeLessThan(ANSWER.indexOf('markFirstPostConfirmed('));
  });

  test('the sheet is rendered by the screen and wired to the answer handler', () => {
    expect(SUMMARY).toMatch(/<FirstPostSheet\s+visible=\{firstPostSheetOpen\}\s+isMinor=\{firstPostSheetMinor\}\s+onChoose=\{answerFirstPost\}\s+onNotNow=\{\(\) => answerFirstPost\('not_now'\)\}/);
  });
});

describe('the sheet itself', () => {
  test('is the app BottomSheet and Button, with the exact words', () => {
    expect(SHEET).toMatch(/import BottomSheet from '\.\.\/BottomSheet';/);
    expect(SHEET).toMatch(/import Button from '\.\.\/Button';/);
    expect(SHEET).toContain("export const FIRST_POST_TITLE = 'Share this session?';");
    expect(SHEET).toContain(
      "'Every session you finish can post to Community automatically: exercises, sets, the total lifted and any PRs. Never your body, food or coaching. Who should see them?'",
    );
  });

  test('three actions, in this order: Everyone, People who follow me, Not now', () => {
    const a = SHEET.indexOf('title="Everyone"');
    const b = SHEET.indexOf('title="People who follow me"');
    const c = SHEET.indexOf('title="Not now"');
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  test('only Everyone is withheld from a minor', () => {
    expect(SHEET).toMatch(/\{isMinor \? null : \(\s*<Button[\s\S]*?title="Everyone"/);
    expect(SHEET.match(/isMinor/g).length).toBeGreaterThanOrEqual(2);
  });

  test('a swipe, a scrim tap or back is Not now', () => {
    expect(SHEET).toMatch(/onClose=\{onNotNow\}/);
  });

  test('Everyone and People who follow me carry the same weight; Not now is a plain equal way out', () => {
    expect(SHEET).toMatch(/variant="primary"\s+title="Everyone"/);
    expect(SHEET).toMatch(/variant="primary"\s+title="People who follow me"/);
    expect(SHEET).toMatch(/variant="secondary"\s+title="Not now"/);
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
    for (const source of [SHEET, FIRST_POST, JOIN_RECEIPT]) {
      expect(source).not.toMatch(/—/);
    }
  });

  test('no first-person plural for a coaching decision in the sheet words', () => {
    expect(SHEET.replace(/\/\*[\s\S]*?\*\//, '')).not.toMatch(/\b[Ww]e\b/);
  });

  test('D194 addendum 2 stands: sharing is still on by default, to everyone', () => {
    // eslint-disable-next-line global-require
    const { TP_DEFAULT_SHARE, DEFAULT_SESSIONS_AUDIENCE } = require('../lib/community/trainingProfile');
    expect(TP_DEFAULT_SHARE.share_sessions).toBe(true);
    expect(DEFAULT_SESSIONS_AUDIENCE).toBe('everyone');
  });
});
