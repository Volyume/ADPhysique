/**
 * haptics.importBan.test.js — expo-haptics has exactly one importer.
 *
 * Pins the enforcement of audit 03b fit rule 0 (§3.2): every helper in
 * src/lib/haptics.js no-ops when the user has Reduce Motion on, and that
 * gate only works if the vocabulary is the SOLE importer of expo-haptics.
 * One raw import anywhere else reopens the exact bypass class D2 closed;
 * new haptic events are added to the vocabulary and called by intent name.
 *
 * Also pins the two M1 call sites (audit 03b §3.3f, §4 step 1) so the
 * wiring cannot be silently reverted:
 *   - RootNavigator: switching to a different tab fires haptics.selection();
 *     re-pressing the focused tab (the NAV-5 pop-to-root path) stays silent.
 *   - Button: the primary variant fires haptics.selection() as its onPress
 *     runs; secondary, tertiary and destructive stay silent.
 *
 * Source-level regression guard (same walk as themeTokens.guard.test.js).
 * __tests__ folders are skipped, matching the audit's grep scope: test
 * files legitimately jest.mock('expo-haptics').
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../..');
const VOCABULARY = path.join('lib', 'haptics.js');
const BAN = /from 'expo-haptics'|require\('expo-haptics'\)/;

function listJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listJsFiles(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('expo-haptics import ban (audit 03b fit rule 0)', () => {
  test('no src file imports expo-haptics except lib/haptics.js', () => {
    const offenders = listJsFiles(SRC)
      .filter(file => BAN.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(SRC, file))
      .filter(rel => rel !== VOCABULARY);
    expect(offenders).toEqual([]);
  });

  test('the vocabulary itself is seen by the detector (walk sanity check)', () => {
    // If the walk or the regex ever silently broke, the ban above would
    // pass vacuously; this proves the detector still sees the one real
    // import it exists to count.
    expect(BAN.test(read(VOCABULARY))).toBe(true);
    expect(listJsFiles(SRC).map(f => path.relative(SRC, f))).toContain(VOCABULARY);
  });
});

describe('M1 call sites stay wired (audit 03b §3.3f, §4 step 1)', () => {
  test('RootNavigator: tab change fires haptics.selection(); re-press stays silent', () => {
    const src = read(path.join('navigation', 'RootNavigator.js'));
    expect(src).toMatch(/import \* as haptics from '\.\.\/lib\/haptics';/);
    const idx = src.indexOf('screenListeners');
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, idx + 800);
    expect(block).toContain('tabPress');
    const guardIdx = block.indexOf('if (navigation.isFocused()) return;');
    const tickIdx = block.indexOf('haptics.selection()');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(tickIdx).toBeGreaterThan(-1);
    // The focused re-press bails out BEFORE the tick, so pop-to-root
    // (NAV-5) stays silent and only an actual tab change vibrates.
    expect(guardIdx).toBeLessThan(tickIdx);
  });

  test('Button: exactly one selection tick, conditioned on the primary variant', () => {
    const src = read(path.join('components', 'Button.js'));
    expect(src).toMatch(/import \* as haptics from '\.\.\/lib\/haptics';/);
    const calls = src.match(/haptics\.selection\(\)/g) || [];
    expect(calls).toHaveLength(1);
    const tickIdx = src.indexOf('haptics.selection()');
    // The call is guarded by the resolved primary variant, so secondary,
    // tertiary and destructive CTAs stay silent.
    const before = src.slice(Math.max(0, tickIdx - 120), tickIdx);
    expect(before).toContain('v === VARIANTS.primary');
  });
});
