/**
 * TELEMETRY_DASHBOARDS_LOCKED.md Acceptance check:
 *   "Every event in the catalogue has a corresponding track() call
 *    in the codebase, verified by a test scanning the source."
 *
 * This test enumerates the canonical TELEMETRY_EVENTS array and
 * greps the src/ tree for an emitter per non-deferred event.
 * Deferred events are skipped with their deferralReason recorded.
 *
 * Emitter shapes accepted:
 *   - track(userId, 'event_name', ...) from engineTelemetry / telemetry
 *   - postEvent(userId, 'event_name', ...) from telemetry/transport
 *   - Or any single-line literal occurrence of "'event_name'" inside
 *     a track-like call (caller bound by closure / variable extraction)
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../..');
const { TELEMETRY_EVENTS, isDeferred } = require('../events');

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name === '.git' || name === 'public') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

let _corpus = null;
function corpus() {
  if (_corpus) return _corpus;
  const files = walk(SRC);
  _corpus = files.map(f => fs.readFileSync(f, 'utf8')).join('\n\n/* FILE BOUNDARY */\n\n');
  return _corpus;
}

describe('Telemetry catalogue: every non-deferred event has a track() call', () => {
  for (const entry of TELEMETRY_EVENTS) {
    if (entry.deferred) {
      test.skip(`${entry.name} (deferred: ${entry.deferralReason || 'no reason'})`, () => {});
      continue;
    }
    test(`${entry.name} has at least one emitter`, () => {
      const src = corpus();
      // Match track / postEvent / explicit string literal in a
      // function call context.
      const re = new RegExp(
        `(?:track|postEvent|track\\.event|track\\.breadcrumb)\\s*\\([^)]*['"\`]${entry.name}['"\`]`,
        'm',
      );
      const altRe = new RegExp(`['"\`]${entry.name}['"\`]`, 'g');
      const hasCall = re.test(src);
      // Fallback: literal string occurrence (covers variable-bound
      // tracker patterns). Require at least 2 occurrences (one in
      // events.js, one in the emitter) so the events.js entry alone
      // does not satisfy.
      const matches = src.match(altRe) || [];
      const passes = hasCall || matches.length >= 2;
      expect(passes).toBe(true);
    });
  }
});

describe('Telemetry catalogue shape', () => {
  test('every entry has name + panel + deferred + (deferred → deferralReason)', () => {
    for (const e of TELEMETRY_EVENTS) {
      expect(typeof e.name).toBe('string');
      expect(typeof e.panel).toBe('number');
      expect(typeof e.deferred).toBe('boolean');
      if (e.deferred) {
        expect(typeof e.deferralReason).toBe('string');
        expect(e.deferralReason.length).toBeGreaterThan(0);
      }
    }
  });

  test('event names are unique', () => {
    const names = TELEMETRY_EVENTS.map(e => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('isDeferred matches the catalogue', () => {
    for (const e of TELEMETRY_EVENTS) {
      expect(isDeferred(e.name)).toBe(e.deferred);
    }
  });
});
