/**
 * HomeScreen.communityRow.guard.test.js (F7, fresh-eyes review, founder
 * order 2026-09-22 item 2).
 *
 * Source-level guard (repo convention -- see
 * HomeScreen.weekBoundaryConsistency.guard.test.js and
 * profile.leaveCommunity.guard.test.js): pins the shape the F1/F2 fixes
 * put in place in loadCommunityFriendsRow, so a future edit cannot
 * quietly reopen either bug:
 *
 *   F1 - a cache stamped with yesterday's dayKey must never paint under
 *        "today"; the row stays hidden until a SAME-DAY count exists,
 *        cached or fresh.
 *   F2 - fetchFriendsTrainedToday (a live RPC with no client timeout)
 *        must never be awaited inside loadData's Promise.all; the
 *        refresh runs in the background.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

function fnBody(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

const body = fnBody(
  SOURCE,
  'async function loadCommunityFriendsRow() {',
  '\n  const dismissCommunityIntro = useCallback(',
);

describe('HomeScreen Today Community row (F1/F2 fixes, founder order 2026-09-22 item 2)', () => {
  test('there is a loadCommunityFriendsRow to guard', () => {
    expect(body.length).toBeGreaterThan(0);
  });

  test('the row renders only when communityRowVisible is true', () => {
    expect(SOURCE).toMatch(/\{!initialLoading && communityRowVisible && \(\s*<HomeCommunityTodayRow/);
  });

  test('the loader reads readCachedMe before the network call (fetchFriendsTrainedToday)', () => {
    const meIdx = body.indexOf('await readCachedMe(user.id)');
    const fetchIdx = body.indexOf('fetchFriendsTrainedToday(user.id)');
    expect(meIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(meIdx);
  });

  test('F1: a same-day dayKey check precedes painting a cached count', () => {
    const dayCheckIdx = body.indexOf('if (cached && cached.dayKey === today)');
    const paintIdx = body.indexOf('setCommunityFriendsCount(cached.count)');
    expect(dayCheckIdx).toBeGreaterThan(-1);
    expect(paintIdx).toBeGreaterThan(dayCheckIdx);
  });

  test('F1: the cached count is never painted unconditionally (the old bug cannot creep back)', () => {
    expect(body).not.toMatch(/if \(cached\) setCommunityFriendsCount\(cached\.count\)/);
  });

  test('F1: visibility is set only alongside a same-day cached count or a resolved fresh count', () => {
    const setVisibleTrueCalls = body.match(/setCommunityRowVisible\(true\)/g) || [];
    // Exactly two sites: the same-day cache branch, and the background
    // fetch's .then -- never an unconditional call right after the
    // ED/calm gate (the F1 bug).
    expect(setVisibleTrueCalls.length).toBe(2);
  });

  test('F2: the network refresh is chained with .then, never awaited, inside loadCommunityFriendsRow', () => {
    expect(body).toMatch(/fetchFriendsTrainedToday\(user\.id\)\.then\(/);
    expect(body).not.toMatch(/await fetchFriendsTrainedToday\(user\.id\)/);
  });

  test('F2: the background refresh carries its own .catch, so a rejection cannot escape uncaught', () => {
    expect(body).toMatch(/fetchFriendsTrainedToday\(user\.id\)\.then\([\s\S]*?\}\)\.catch\(\(\) => \{/);
  });

  test('loadCommunityFriendsRow itself stays awaited inside loadData\'s Promise.all (only the network hop backgrounds)', () => {
    expect(SOURCE).toMatch(/loadCommunityFriendsRow\(\),/);
  });
});
