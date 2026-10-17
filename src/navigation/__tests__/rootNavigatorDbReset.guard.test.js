/**
 * Reset and restore (founder answer 2026-10-17) - RootNavigator wiring.
 *
 * The DB-failed screen used to offer only "Try again", a dead end when the
 * fault lasts. From the second failed open in a launch it now also offers a
 * tertiary "Reset and restore", confirmed first with a destructive alert;
 * the reset runs through src/lib/localDbReset.js (pinned behaviourally in
 * src/lib/__tests__/localDbReset.test.js) and reopens through the SAME
 * attemptDbInit "Try again" uses. A successful reopen after a failure runs
 * the existing sync runner exactly as retryUnresolvedHealthConsent does,
 * gated on a signed-in, non-local user with consent affirmatively true.
 *
 * Source guards, matching rootNavigatorDbInitRecovery.guard.test.js: the
 * navigator pulls the whole native graph and cannot be mounted here.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'RootNavigator.js'), 'utf8');

function between(startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  expect(i).toBeGreaterThan(-1);
  const j = src.indexOf(endMarker, i + startMarker.length);
  expect(j).toBeGreaterThan(i);
  return src.slice(i, j);
}

const gate = between('if (dbInitFailed) {', '// While a cloud restore is in flight');

describe('the reset button is hidden before the second failure and shown after', () => {
  test('failures are counted in the failure branch only (a deferred open returns first)', () => {
    const fn = between('const attemptDbInit = useCallback(async () => {', 'const attemptDbInitRef = useRef(null);');
    const deferredIdx = fn.indexOf('if (e?.dbCryptoDeferred === true) {');
    const countIdx = fn.indexOf('setDbFailCount((n) => n + 1);');
    expect(deferredIdx).toBeGreaterThan(-1);
    expect(countIdx).toBeGreaterThan(deferredIdx);
    expect(fn.indexOf('setDbInitFailed(true);')).toBeGreaterThan(countIdx);
    expect(src).toMatch(/const \[dbFailCount, setDbFailCount\] = useState\(0\);/);
  });

  test('the reset button renders only behind shouldOfferDbReset(dbFailCount)', () => {
    expect(gate).toMatch(/\{shouldOfferDbReset\(dbFailCount\) \? \(\s*<Button[\s\S]*?onPress=\{handleDbReset\}[\s\S]*?\) : null\}/);
    // Exactly one reset button, and Try again is still unconditional.
    expect(gate.match(/onPress=\{handleDbReset\}/g)).toHaveLength(1);
    const tryAgainIdx = gate.indexOf('onPress={handleDbRetry}');
    const offerIdx = gate.indexOf('shouldOfferDbReset(dbFailCount)');
    expect(tryAgainIdx).toBeGreaterThan(-1);
    expect(offerIdx).toBeGreaterThan(tryAgainIdx);
  });

  test('the reset button is tertiary, reads Resetting... while it runs, and both buttons disable', () => {
    expect(gate).toMatch(/title=\{dbResetting \? DB_RESET_COPY\.resettingButton : DB_RESET_COPY\.offerButton\}/);
    expect(gate).toMatch(/variant="tertiary"/);
    expect(gate.match(/disabled=\{dbRetrying\}/g)).toHaveLength(2);
    const run = between('const runDbReset = useCallback(', 'const handleDbReset = useCallback(');
    expect(run).toMatch(/setDbResetting\(true\);\s*setDbRetrying\(true\);/);
    expect(run).toMatch(/finally \{\s*setDbResetting\(false\);\s*setDbRetrying\(false\);/);
  });

  test('the screen scrolls so the buttons stay reachable at the largest text size', () => {
    expect(gate).toMatch(/<ScrollView style=\{dbErrorStyles\.scroll\} contentContainerStyle=\{dbErrorStyles\.scrollContent\}>/);
    expect(src).toMatch(/import \{ View, ScrollView, StyleSheet, AppState \} from 'react-native';/);
  });
});

describe('confirm runs the reset, then the same reopen Try again uses', () => {
  test('the confirmation is a destructive appAlert with Cancel first', () => {
    const confirm = between('const handleDbReset = useCallback(', '// Campaign 24 Wave E');
    expect(confirm).toMatch(/appAlert\(\s*DB_RESET_COPY\.confirmTitle,\s*DB_RESET_COPY\.confirmBody,/);
    expect(confirm).toMatch(/\{ text: DB_RESET_COPY\.cancel, style: 'cancel' \},\s*\{ text: DB_RESET_COPY\.confirm, style: 'destructive', onPress: \(\) => \{ runDbReset\(\); \} \}/);
  });

  test('the reset reopens through attemptDbInit and scopes to a known, non-local user', () => {
    const run = between('const runDbReset = useCallback(', 'const handleDbReset = useCallback(');
    expect(run).toMatch(/runDbResetAndReopen\(\{ userId, reopen: attemptDbInit \}\)/);
    expect(run).toMatch(/st\.user && !st\.user\.isLocal \? \(st\.user\.id \?\? null\) : null/);
  });

  test('a successful reopen after a failure runs the existing runner, consent-gated', () => {
    const fn = between('const attemptDbInit = useCallback(async () => {', 'const attemptDbInitRef = useRef(null);');
    expect(fn).toMatch(/if \(dbOpenFailedRef\.current\) \{\s*dbOpenFailedRef\.current = false;\s*runRestoreSyncAfterReopen\(\);\s*\}\s*setDbInitFailed\(false\);\s*return true;/);
    const sync = between('const runRestoreSyncAfterReopen = useCallback(', 'const attemptDbInit = useCallback(');
    expect(sync).toMatch(/if \(!uid \|\| st\.user\?\.isLocal\) return;/);
    expect(sync).toMatch(/if \(st\.healthConsent !== true\) return;/);
    expect(sync).toMatch(/syncAll\(\{ userId: uid, localUserId: uid, triggeredBy: 'manual' \}\)/);
    expect(sync).toMatch(/markCloudSyncing\(\)/);
    expect(sync).toMatch(/markCloudSyncComplete\(\)/);
    expect(sync).toMatch(/markCloudSyncError\(/);
  });
});

describe('a failed reset keeps the failure screen with a calm line', () => {
  test('ok:false sets the flag; the line renders from DB_RESET_COPY', () => {
    const run = between('const runDbReset = useCallback(', 'const handleDbReset = useCallback(');
    expect(run).toMatch(/if \(!result\.ok\) setDbResetFailed\(true\);/);
    // The failure screen is still the one rendered: nothing here clears
    // dbInitFailed; only a successful attemptDbInit does.
    expect(run).not.toMatch(/setDbInitFailed/);
    expect(gate).toMatch(/\{dbResetFailed \? \(\s*<Text style=\{dbErrorStyles\.body\}[^>]*>\{DB_RESET_COPY\.failedLine\}<\/Text>\s*\) : null\}/);
  });
});

describe('the Article 9 consent gate is untouched by the reset', () => {
  test('the reset wiring never writes consent', () => {
    const wiring = between('const runRestoreSyncAfterReopen = useCallback(', '// Campaign 24 Wave E');
    expect(wiring).not.toMatch(/setHealthConsent/);
  });
});
