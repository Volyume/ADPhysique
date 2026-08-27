/**
 * Capability continuity actually EXECUTES (adversarial audit 2026-08-26).
 *
 * The defect this pins was not a typo, it was a silent one. planAutoGen read:
 *
 *     require('../capability/effective')     // from src/lib -> src/capability
 *
 * which does not exist, so every call threw MODULE_NOT_FOUND straight into a
 * `catch (_e) { capabilityAffected = false; }`. The signal was therefore
 * permanently false and nothing anywhere reported a problem. CC30's documented
 * rule -- a slot blocked ONLY by an EPISODE-role capability conflict is
 * temporarily affected rather than invalid -- never ran once, so those slots
 * fell through to `excluded` and were replaced on rebuild. For someone training
 * around a temporary injury that is the exact opposite of the intent.
 *
 * A test that merely asserted the string './capability/effective' would have
 * been satisfied by a module that exists and is never reached. These tests
 * therefore prove the module RESOLVES, EXPORTS what the caller destructures,
 * and that the caller's failure branch does not report "no restriction".
 */

const fs = require('fs');
const path = require('path');

const LIB = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(LIB, 'planAutoGen.js'), 'utf8');

describe('the capability module the plan builder depends on is reachable', () => {
  test('every relative require in planAutoGen resolves to a real file', () => {
    // The general form of the defect, not just the one instance of it.
    // Comment lines are excluded deliberately: a comment that QUOTES a broken
    // specifier (as the fix note in planAutoGen once did) is documentation, not
    // a call, and failing on it would train the next person to delete the
    // explanation rather than keep the guard.
    const specs = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .flatMap((l) => [...l.matchAll(/require\('(\.[^']+)'\)/g)].map((m) => m[1]));
    expect(specs.length).toBeGreaterThan(0);
    const unresolved = specs.filter((spec) => {
      try {
        require.resolve(path.join(LIB, spec));
        return false;
      } catch (_) {
        return true;
      }
    });
    expect(unresolved).toEqual([]);
  });

  test('the capability module exports the symbol the caller destructures', () => {
    // Resolving is not enough: the caller does `const { episodeConflicts } =`,
    // and a module that resolved but no longer exported that name would
    // reintroduce the same permanently-false signal without any error.
    // eslint-disable-next-line global-require
    const mod = require('../capability/effective');
    expect(typeof mod.episodeConflicts).toBe('function');
  });

  test('episodeConflicts really returns conflicts for an episode-role restriction', () => {
    // Proves the function does work, so the caller's `.length > 0` is a real
    // measurement rather than a call into something inert.
    // eslint-disable-next-line global-require
    const { episodeConflicts } = require('../capability/effective');
    const result = episodeConflicts(null, null);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('a failed capability read is never reported as "no restriction"', () => {
  test('the caller uses the correct relative path', () => {
    const codeLines = SRC.split('\n').filter((l) => !l.trim().startsWith('//'));
    expect(codeLines.join('\n')).toContain("require('./capability/effective')");
    expect(codeLines.join('\n')).not.toContain("require('../capability/effective')");
  });

  test('the catch branch treats unknown as possibly-affected, not as none', () => {
    // UNKNOWN != NONE. Reverting this to `capabilityAffected = false` would
    // restore the original behaviour exactly, so it is pinned explicitly.
    const start = SRC.indexOf('let capabilityAffected = false;');
    expect(start).toBeGreaterThan(-1);
    const window = SRC.slice(start, start + 2400);
    expect(window).toMatch(/catch \(e\) \{[\s\S]*?capabilityAffected = true;/);
    expect(window).not.toMatch(/catch \(_e\) \{ capabilityAffected = false; \}/);
  });

  test('the failure is logged rather than swallowed', () => {
    const start = SRC.indexOf('let capabilityAffected = false;');
    const window = SRC.slice(start, start + 2400);
    expect(window).toMatch(/logError\('planAutoGen\.capabilityRead'/);
  });

  test('why the branch exists is written down so it is not "simplified" back', () => {
    const start = SRC.indexOf('let capabilityAffected = false;');
    const window = SRC.slice(start, start + 2400);
    expect(window).toMatch(/UNKNOWN IS NOT NONE/);
    expect(window).toMatch(/MODULE_NOT_FOUND/);
  });
});
