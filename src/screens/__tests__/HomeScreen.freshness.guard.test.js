/**
 * Home freshness and the weigh-in (founder report "I've seen it [Home] not
 * refresh right or not take the weight or ask for it"). Source-level guards,
 * each written to FAIL on the old code:
 *  1. Home reloads when the app returns to the foreground on a new local day
 *     or after five minutes (an AppState 'active' check, no ticking timer).
 *  2. Overlapping loads: a request id drops a stale run's weight results, and
 *     a successful weigh-in re-reads the weight AND the first-review facts
 *     (recent weights, "ever weighed in", this week's weigh-in count).
 *  3. A finished sync pull (dataPulledVersion, NOT cloudSyncVersion) reloads
 *     Home; the store owns the counter.
 *  5. "Weight saved." success toast.
 *  6. The swallowed loader catches log a warning (no PII).
 *  7. An out-of-range weight says why, with TodayStrip's own message.
 *  8. The weigh-in field and Log button are 48 high.
 * ED-safety: nothing here touches a suppression; the loaders still derive
 * edFlagOpen / weightFiguresWithheld exactly as before.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');
const HS = read('src/screens/HomeScreen.js');
const TS = read('src/components/TodayStrip.js');
const STORE = read('src/store/useAppStore.js');

function body(src, startMarker, len = 3500) {
  const i = src.indexOf(startMarker);
  expect(i).toBeGreaterThan(-1);
  return src.slice(i, i + len);
}

describe('Home reloads on resume', () => {
  test('an AppState active listener consults shouldReloadHomeOnResume with the day key', () => {
    expect(HS).toMatch(/shouldReloadHomeOnResume\(\{[\s\S]{0,200}loadedDayKey: loadedDayKeyRef\.current[\s\S]{0,200}todayKey: todayLocalKey\(\)/);
    expect(HS).toMatch(/AppState\.addEventListener\('change'[\s\S]{0,200}state !== 'active'[\s\S]{0,600}loadDataRef\.current/);
  });
  test('loadData records the day and time it loaded for', () => {
    const b = body(HS, 'async function loadData()');
    expect(b).toMatch(/loadedDayKeyRef\.current = loadedForDay/);
    expect(b).toMatch(/lastLoadAtRef\.current = Date\.now\(\)/);
  });
  test('no ticking interval was added to Home for it', () => {
    expect(HS).not.toMatch(/setInterval\(/);
  });
});

describe('overlapping loads and the weigh-in refresh', () => {
  test('loadData hands one request id to the weight loaders, which drop stale results', () => {
    expect(HS).toMatch(/const reqId = \+\+loadReqRef\.current/);
    expect(HS).toMatch(/loadTodayWeight\(reqId\)/);
    expect(HS).toMatch(/loadFirstReviewFacts\(reqId\)/);
    expect(body(HS, 'async function loadTodayWeight(')).toMatch(/reqId !== loadReqRef\.current\) return/);
    expect(body(HS, 'async function loadFirstReviewFacts(', 9000)).toMatch(/reqId !== loadReqRef\.current\) return/);
  });
  test('a saved weigh-in re-reads both the weight and the first-review facts, then toasts', () => {
    const b = body(HS, 'async function handleLogWeight(');
    expect(b).toMatch(/await logMorningWeight[\s\S]{0,900}await loadTodayWeight\(\);[\s\S]{0,40}await loadFirstReviewFacts\(\);/);
    expect(b).toMatch(/toast\.show\('Weight saved\.', \{ variant: 'success' \}\)/);
  });
  test('the revert-on-failure path is untouched', () => {
    expect(body(HS, 'async function handleLogWeight(')).toMatch(/setTodayWeight\(previousTodayWeight\)/);
  });
});

describe('a finished sync pull reaches Home', () => {
  test('the store has its own counter, separate from the restore banner', () => {
    expect(STORE).toMatch(/dataPulledVersion: 0/);
    expect(STORE).toMatch(/markDataPulled: \(\) => set\(s => \(\{ dataPulledVersion: s\.dataPulledVersion \+ 1 \}\)\)/);
    const mark = STORE.slice(STORE.indexOf('markDataPulled:'), STORE.indexOf('markDataPulled:') + 200);
    expect(mark).not.toMatch(/cloudSyncStatus|cloudSyncVersion/);
  });
  test('Home reloads on dataPulledVersion', () => {
    expect(HS).toMatch(/useAppStore\(s => s\.dataPulledVersion\)/);
    expect(HS).toMatch(/dataPulledVersion > 0 && user\?\.id[\s\S]{0,200}\[dataPulledVersion\]/);
  });
});

describe('failures are logged and out-of-range weights are said', () => {
  test('the weight loaders and coach-output loader log a warning, not a bare catch', () => {
    const w = body(HS, 'async function loadTodayWeight(');
    expect(w).not.toMatch(/catch \(_\) \{\}/);
    expect(w).toMatch(/logWarn\('HomeScreen\.loadTodayWeight'/);
    expect(w).toMatch(/logWarn\('HomeScreen\.loadTodayWeight\.recentWeights'/);
    expect(HS).toMatch(/logWarn\('HomeScreen\.loadLatestCoachOutput'/);
    expect(HS).toMatch(/logWarn\('HomeScreen\.loadFirstReviewFacts'/);
  });
  test('handleLogWeight alerts with the shared range message instead of returning silently', () => {
    expect(body(HS, 'async function handleLogWeight(')).toMatch(/appAlert\('Check that weight', BODY_WEIGHT_RANGE_MESSAGE\)/);
  });
});

describe('TodayStrip weigh-in touch targets', () => {
  test('the weight field and Log button are 48 high, not 40', () => {
    const f = TS.slice(TS.indexOf('weightField: {'), TS.indexOf('weightField: {') + 300);
    const l = TS.slice(TS.indexOf('logBtn: {'), TS.indexOf('logBtn: {') + 400);
    expect(f).toMatch(/minHeight: spacing\.xxxl/);
    expect(l).toMatch(/minHeight: spacing\.xxxl/);
    expect(f + l).not.toMatch(/minHeight: 40/);
  });
});
