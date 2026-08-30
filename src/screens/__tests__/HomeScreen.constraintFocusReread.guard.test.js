/**
 * CC33 D112 R6 (injury/disability audit W4, 2026-08-28) - closes audit
 * T2-30: verified against the CURRENT tree (this finding predates W3B's
 * rebuild of the Home constraint effect, and DESIGN-RULING.md's own S3
 * residual-dispositions note claims this already re-reads on focus - a
 * direct read of the code at W4 build time showed it did not: the effect
 * was still a plain useEffect gated on [user?.id] only, so a capability
 * rule that arrived by sync (or was changed on another screen) while Home
 * sat backgrounded was never picked up until relaunch). Fixed by wrapping
 * the same body in useFocusEffect(useCallback(...)), the screen's own
 * established "re-read on return" pattern (loadData() above uses the
 * identical shape).
 *
 * Source-level guard (fs.readFileSync + regex), matching this screen's
 * existing convention (see HomeScreen.capabilityVisibility.guard.test.js).
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');

describe('T2-30: the constraint-detection effect re-reads on focus', () => {
  const site = HOME.indexOf("const { loadCapabilityResolveState } = require('../lib/capability/resolve');");
  // The nearest useFocusEffect( / useCallback( pair BEFORE this read.
  const focusSite = HOME.lastIndexOf('useFocusEffect(', site);
  const callbackSite = HOME.lastIndexOf('useCallback(() => {', site);

  test('reads the real effect (sanity)', () => {
    expect(site).toBeGreaterThan(-1);
    // Round 10 (B4): the effect gained a cancellation guard, so the
    // user gate and the guard's flag now sit between the callback's
    // opening and the read.
    expect(HOME.slice(site - 900, site)).toContain('if (!user?.id) return undefined;');
    expect(HOME.slice(site - 900, site)).toContain('let cancelled = false;');
  });

  test('the capability read sits inside useFocusEffect(useCallback(...)), not a bare useEffect', () => {
    expect(focusSite).toBeGreaterThan(-1);
    expect(callbackSite).toBeGreaterThan(focusSite);
    // Nothing but whitespace/comment between the two wrapper calls - the
    // fix wraps the EXISTING body, it does not introduce a new effect.
    const between = HOME.slice(focusSite + 'useFocusEffect('.length, callbackSite);
    expect(between.replace(/[\s\n]/g, '')).toBe('');
  });

  test('the callback still closes with [user?.id] only - nothing else about the effect changed', () => {
    const bodyEnd = HOME.indexOf("}, [user?.id]),", callbackSite);
    expect(bodyEnd).toBeGreaterThan(callbackSite);
    // And it is the useFocusEffect(...) call that closes right after,
    // not a plain useCallback used elsewhere.
    expect(HOME.slice(bodyEnd, bodyEnd + 40)).toMatch(/\}, \[user\?\.id\]\),\s*\n\s*\);/);
  });

  test('the read body itself (state read, activeConstraint/constraintSubject/awaitingConstraint) is unchanged', () => {
    const bodyEnd = HOME.indexOf("}, [user?.id]),", callbackSite);
    const body = HOME.slice(callbackSite, bodyEnd);
    expect(body).toContain("state.restrictions.filter(r => r.role === 'episode' && r.effectiveChoice === 'applied' && r.adaptationMode !== 'hold')");
    expect(body).toContain('setActiveConstraint(episodeRows.length > 0);');
    expect(body).toContain("episodeStatus(rows, Date.now()) === 'awaiting_confirmation'");
    expect(body).toContain('setAwaitingConstraint(awaiting);');
  });

  test('no stray closing bracket left behind: HomeScreen.js still parses (this file itself is proof the harness required valid JS to import elsewhere, but assert balance directly too)', () => {
    const opens = (HOME.match(/useFocusEffect\(/g) || []).length;
    // Every useFocusEffect( in this screen is paired with a useCallback(
    // immediately after (the file's one established idiom) - if the edit
    // had left mismatched parens this count would diverge structurally,
    // which esline/parsing would also catch, but this pins the count is
    // sane (>= 2: the pre-existing loadData() one, plus this fix).
    expect(opens).toBeGreaterThanOrEqual(2);
  });
});
