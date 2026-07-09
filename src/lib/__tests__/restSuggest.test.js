/**
 * B9: deterministic rest suggestions.
 *
 * Pins the fixed suggestion table and the invariants it must never break:
 * compound working sets suggest 180s, isolation 90s, warm-ups 60s, clusters
 * the 20s breath convention; identical input always yields identical output
 * (no learning, no randomness — the adaptive version was REJECTED in
 * audit/05-enhancements.md); anything unknown falls back to 90s. Also
 * source-guards the one wiring seam (BuildWorkoutScreen pre-fill) so the
 * suggestion stays a builder pre-fill and the runtime rest resolution for
 * saved routines stays untouched.
 */
const fs = require('fs');
const path = require('path');

const {
  suggestRestSeconds,
  REST_SUGGESTION_TABLE,
  FALLBACK_REST_SECONDS,
} = require('../restSuggest');

const COMPOUND = { name: 'Barbell Back Squat', compoundIsolation: 'compound' };
const ISOLATION = { name: 'Cable Lateral Raise', compoundIsolation: 'isolation' };

describe('B9 fixed table: set type x compound-ness', () => {
  // Table-driven over every canonical set type the app knows.
  const CASES = [
    // [setType,      compound, isolation]
    ['straight',      180,      90],
    ['amrap',         180,      90],
    ['dropset',       180,      90],
    ['warmup',        60,       60],
    ['myo_reps',      20,       20],
    ['rest_pause',    20,       20],
  ];

  test.each(CASES)('%s: compound %is, isolation %is', (setType, comp, iso) => {
    expect(suggestRestSeconds({ exercise: COMPOUND, setType })).toBe(comp);
    expect(suggestRestSeconds({ exercise: ISOLATION, setType })).toBe(iso);
  });

  test('the headline norms: compound working 180, isolation working 90, warm-up 60', () => {
    expect(suggestRestSeconds({ exercise: COMPOUND, setType: 'straight' })).toBe(180);
    expect(suggestRestSeconds({ exercise: ISOLATION, setType: 'straight' })).toBe(90);
    expect(suggestRestSeconds({ exercise: COMPOUND, setType: 'warmup' })).toBe(60);
  });

  test('setType defaults to a working set', () => {
    expect(suggestRestSeconds({ exercise: COMPOUND })).toBe(180);
    expect(suggestRestSeconds({ exercise: ISOLATION })).toBe(90);
  });

  test('tolerates raw snake_case DB rows (compound_isolation)', () => {
    expect(suggestRestSeconds({ exercise: { compound_isolation: 'compound' } })).toBe(180);
    expect(suggestRestSeconds({ exercise: { compound_isolation: 'isolation' } })).toBe(90);
  });
});

describe('B9 fallbacks: unknown input never throws, lands on 90', () => {
  test('unknown exercise (no compound-ness tag) falls back to 90 for a working set', () => {
    expect(suggestRestSeconds({ exercise: { name: 'My Custom Move' } })).toBe(90);
    expect(suggestRestSeconds({ exercise: {} })).toBe(90);
    expect(suggestRestSeconds({ exercise: null })).toBe(90);
    expect(suggestRestSeconds({})).toBe(90);
    expect(suggestRestSeconds()).toBe(90);
  });

  test('unknown set type is treated as a working set', () => {
    expect(suggestRestSeconds({ exercise: COMPOUND, setType: 'giant_set' })).toBe(180);
    expect(suggestRestSeconds({ exercise: ISOLATION, setType: 'nonsense' })).toBe(90);
    expect(suggestRestSeconds({ exercise: null, setType: 'nonsense' })).toBe(90);
  });

  test('the fallback constant is 90 (the app-wide default rest)', () => {
    expect(FALLBACK_REST_SECONDS).toBe(90);
  });
});

describe('B9 determinism: same input, same output, always', () => {
  test('repeated calls with identical input are identical', () => {
    for (const setType of Object.keys(REST_SUGGESTION_TABLE)) {
      for (const exercise of [COMPOUND, ISOLATION, {}, null]) {
        const first = suggestRestSeconds({ exercise, setType });
        for (let i = 0; i < 50; i++) {
          expect(suggestRestSeconds({ exercise, setType })).toBe(first);
        }
      }
    }
  });

  test('the table is frozen — nothing can mutate the suggestions at runtime', () => {
    expect(Object.isFrozen(REST_SUGGESTION_TABLE)).toBe(true);
    for (const row of Object.values(REST_SUGGESTION_TABLE)) {
      expect(Object.isFrozen(row)).toBe(true);
    }
  });

  test('the module is pure: no I/O, no Date, no randomness in the source', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../restSuggest.js'), 'utf8');
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/Date\.now|new Date/);
    expect(src).not.toMatch(/\brequire\(|\bimport .* from/);
    expect(src).not.toMatch(/fetch\(|AsyncStorage|expo-/);
  });
});

describe('B9 wiring guard: builder pre-fill only, runtime untouched', () => {
  const BUILD = fs.readFileSync(
    path.resolve(__dirname, '../../screens/BuildWorkoutScreen.js'), 'utf8',
  );
  const ACTIVE = fs.readFileSync(
    path.resolve(__dirname, '../../screens/ActiveWorkoutScreen.js'), 'utf8',
  );

  test('BuildWorkoutScreen pre-fills new exercises from the suggestion table', () => {
    expect(BUILD).toMatch(/from '\.\.\/lib\/restSuggest'/);
    expect(BUILD).toMatch(/suggestRestSeconds\(\{ exercise \}\)/);
    expect(BUILD).toMatch(/restSuggested: !hasCustomDefault/);
  });

  test('a user-set global default always beats the suggestion', () => {
    // The suggestion only fills the gap when defaultRestSeconds is still the
    // shipped 90; a custom default is honoured verbatim.
    expect(BUILD).toMatch(/defaultRestSeconds !== DEFAULT_REST/);
    expect(BUILD).toMatch(/hasCustomDefault \? defaultRestSeconds : suggestRestSeconds/);
  });

  test('the pre-fill is labelled as suggested and editing clears the label', () => {
    expect(BUILD).toMatch(/item\.restSuggested \? 'Rest \(suggested\)' : 'Rest'/);
    expect(BUILD).toMatch(/restSeconds: next, restSuggested: false/);
  });

  test('runtime rest resolution for saved routines is unchanged', () => {
    // Existing logged routines keep restSeconds || defaultRestSeconds || 90;
    // the suggestion must never leak into the live timer resolution. D9
    // (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md)
    // extracted this formula into a `fullRest` local so a per-side compound
    // set's post-pair rest can be conditionally halved (amendment 2); the
    // formula itself, and the fact it still feeds straight into
    // startRestTimer with no suggestion-table involvement, are unchanged.
    expect(ACTIVE).toMatch(
      /const fullRest = routineExercise\?\.restSeconds \|\| defaultRestSeconds \|\| 90;/,
    );
    expect(ACTIVE).toMatch(
      /startRestTimer\(overrides\.perSideCompound \? halfRestSeconds\(fullRest\) : fullRest\);/,
    );
    expect(ACTIVE).not.toMatch(/restSuggest/);
  });
});
