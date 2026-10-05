/**
 * D219 learner data path: how a logged set gets its entry_typed fact (register
 * D219, "Founder answers on the learner design, 2026-10-05"; evidence
 * docs/audit/plan-builder-science-2026-10-04/05-LEARNER-RECON.md candidate C).
 *
 *   1     the person typed or changed the weight or the reps
 *   0     the weight and the reps are exactly what the screen filled in
 *   NULL  unknown, and never guessed
 *
 * Pins, each of which fails on the code before this lane (no rule, no wiring):
 *  - normaliseEntryTyped admits only 1, 0, true and false;
 *  - deriveEntryTyped, the rule the logger applies at the tap, is the
 *    comparison hasInProgressSetEntry already makes: a kept set is 0, a typed
 *    or changed one is 1, a cluster that added a mini-set is 1, and anything
 *    with nothing to compare against is null, never a guess;
 *  - the live screen derives the fact at the tap, before any await, from the
 *    entry and the seed, and passes it to the ONE createWorkoutSet call; the
 *    edit path leaves the edit rule to the database layer;
 *  - the paths that cannot know (a watch event, an import) pass nothing, so
 *    their sets are stored NULL (the stored side is pinned in
 *    database.entryTyped.test.js, and the screen's behaviour end to end in
 *    src/__tests__/screen-mount.test.js).
 */
const fs = require('fs');
const path = require('path');
const { deriveEntryTyped, normaliseEntryTyped } = require('../workoutHelpers');

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

describe('normaliseEntryTyped', () => {
  test.each([
    [1, 1], [true, 1], [0, 0], [false, 0],
    [null, null], [undefined, null], [2, null], [-1, null], ['1', null], ['true', null], [NaN, null], [{}, null], [[], null],
  ])('%p becomes %p', (value, expected) => {
    expect(normaliseEntryTyped(value)).toBe(expected);
  });
});

describe('deriveEntryTyped: the comparison hasInProgressSetEntry already makes, taken at the tap', () => {
  const seed = { weight: 60, reps: 8 };

  describe('kept exactly as the screen filled it in is 0', () => {
    test('the weight and the reps untouched', () => {
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 8 }, seed })).toBe(0);
    });

    test('the same number typed over the fill is not a change (the weight is read as text, as the unsaved-work check reads it)', () => {
      expect(deriveEntryTyped({ entry: { weight: '60', reps: 8 }, seed })).toBe(0);
    });

    test('a stepper that comes back to the filled-in numbers is kept', () => {
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 8 }, seed: { weight: '60', reps: 8 } })).toBe(0);
    });

    test('a bodyweight set with nothing in the weight box and the reps as filled in', () => {
      expect(deriveEntryTyped({ entry: { weight: '', reps: 12 }, seed: { weight: '', reps: 12 } })).toBe(0);
    });

    test('a carried-forward fill (the previous set) kept for the next set', () => {
      expect(deriveEntryTyped({ entry: { weight: 62.5, reps: 9 }, seed: { weight: 62.5, reps: 9 } })).toBe(0);
    });
  });

  describe('typed or changed is 1', () => {
    test('the weight changed', () => {
      expect(deriveEntryTyped({ entry: { weight: 62.5, reps: 8 }, seed })).toBe(1);
    });

    test('the reps changed', () => {
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 7 }, seed })).toBe(1);
    });

    test('both changed', () => {
      expect(deriveEntryTyped({ entry: { weight: 65, reps: 6 }, seed })).toBe(1);
    });

    test('a weight typed into a blank box (a first exposure, nothing filled in)', () => {
      expect(deriveEntryTyped({ entry: { weight: '40', reps: 8 }, seed: { weight: '', reps: 8 } })).toBe(1);
    });

    test('the reps box cleared and retyped as something else', () => {
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 10 }, seed })).toBe(1);
      expect(deriveEntryTyped({ entry: { weight: 60, reps: '' }, seed })).toBe(1);
    });

    test('the weight text differs from the fill even when the number is the same (60.0 typed over 60)', () => {
      // The comparison is the unsaved-work check's own: text for the weight.
      expect(deriveEntryTyped({ entry: { weight: '60.0', reps: 8 }, seed })).toBe(1);
    });
  });

  describe('a stored reps number built from more than the box (a cluster set)', () => {
    test('a cluster that added a mini-set is typed, even when the box still matches the fill', () => {
      // The box held the activation set (8, as filled in); the person typed
      // two mini-sets, so the stored total is 8 + 4 + 3.
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 8 }, seed, loggedReps: 15 })).toBe(1);
    });

    test('a cluster that stored only its activation set follows the box and the fill', () => {
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 8 }, seed, loggedReps: 8 })).toBe(0);
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 9 }, seed, loggedReps: 9 })).toBe(1);
    });

    test('a per-side set stores the reps the box held at the start, so it follows the box and the fill', () => {
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 8 }, seed, loggedReps: 8 })).toBe(0);
    });

    test('loggedReps left out is the same as the box', () => {
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 8 }, seed })).toBe(0);
      expect(deriveEntryTyped({ entry: { weight: 60, reps: 8 }, seed, loggedReps: null })).toBe(0);
    });
  });

  describe('nothing to compare against is null, never a guess', () => {
    test.each([
      ['no seed', { entry: { weight: 60, reps: 8 }, seed: null }],
      ['an undefined seed', { entry: { weight: 60, reps: 8 } }],
      ['a seed that is not an object', { entry: { weight: 60, reps: 8 }, seed: 'x' }],
      ['no entry', { entry: null, seed }],
      ['an entry that is not an object', { entry: 7, seed }],
      ['neither', {}],
    ])('%s', (_label, input) => {
      expect(deriveEntryTyped(input)).toBeNull();
    });

    test('no arguments at all', () => {
      expect(deriveEntryTyped()).toBeNull();
    });
  });

  test('over a grid of entries and fills the answer is only ever 1, 0 or null', () => {
    const weights = ['', null, undefined, 0, 60, '60', '60.0', 62.5, 'abc'];
    const reps = ['', null, undefined, 0, 8, '8', 9, 'x'];
    for (const ew of weights) for (const er of reps) for (const sw of weights) for (const sr of reps) {
      const out = deriveEntryTyped({ entry: { weight: ew, reps: er }, seed: { weight: sw, reps: sr } });
      expect([1, 0, null]).toContain(out);
    }
  });
});

describe('the live screen applies the rule at the tap and hands it to the one createWorkoutSet call', () => {
  const SRC = read('..', 'screens', 'ActiveWorkoutScreen.js');

  test('it imports the rule from the shared logger helpers', () => {
    expect(SRC).toMatch(/import \{[^}]*\bderiveEntryTyped\b[^}]*\} from '\.\.\/lib\/workoutHelpers';/);
  });

  test('the ONE createWorkoutSet call carries entryTyped, derived from the entry, the seed and the stored reps', () => {
    expect(SRC.match(/createWorkoutSet\(/g)).toHaveLength(1);
    expect(SRC).toMatch(
      /entryTyped: deriveEntryTyped\(\{\s*entry: currentSet,\s*seed: seededEntryRef\.current,\s*loggedReps: effectiveReps,\s*\}\),/,
    );
  });

  test('nothing is awaited between the tap and that call, so the entry and the seed are read as the tap found them', () => {
    const start = SRC.indexOf('async function handleCompleteSet(');
    const call = SRC.indexOf('await createWorkoutSet({');
    expect(start).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(start);
    expect(SRC.slice(start, call)).not.toMatch(/\bawait\b/);
  });

  test('the rule lives in one place: the cluster and per-side finishers pass no fact of their own', () => {
    const cluster = SRC.match(/async function finishCluster\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    const perSide = SRC.match(/async function finishPerSide\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(cluster).toContain('handleCompleteSet(');
    expect(perSide).toContain('handleCompleteSet(');
    expect(cluster).not.toMatch(/entryTyped|entry_typed/);
    expect(perSide).not.toMatch(/entryTyped|entry_typed/);
  });

  test('an edit after logging goes through updateWorkoutSet with the weight and reps only; the edit rule is the database layer\'s', () => {
    expect(SRC).toMatch(/await updateWorkoutSet\(editingSet\.id, \{ weight, actualReps \}\);/);
    const edit = SRC.match(/async function handleSaveEditedSet\(\) \{[\s\S]*?\n  \}\n/)?.[0] ?? '';
    expect(edit).not.toMatch(/entryTyped|entry_typed/);
  });

  test('the unsaved-work comparison the rule mirrors is untouched', () => {
    expect(SRC).toMatch(/const seed = seededEntryRef\.current;/);
    expect(SRC).toMatch(/return !!cluster\s*\n\s*\|\| !!perSide\s*\n\s*\|\| noteText\.trim\(\)\.length > 0\s*\n\s*\|\| !\(sameWeight && sameReps\);/);
  });
});

describe('the paths that cannot know pass nothing, so their sets are stored NULL', () => {
  test('the watch bridge (applyRemoteSetEvent) logs through createWorkoutSet without a fact', () => {
    const store = read('..', 'store', 'useAppStore.js');
    const body = store.match(/applyRemoteSetEvent: async \(event\) => \{[\s\S]*?\n  \},\n/)?.[0] ?? '';
    expect(body).toContain('createWorkoutSet({');
    expect(body).not.toMatch(/entryTyped|entry_typed/);
  });

  test('the external import inserts its sets without the column, so every imported set is NULL', () => {
    const importer = read('importExternal.js');
    expect(importer).toContain('INSERT INTO workout_sets');
    expect(importer).not.toMatch(/entryTyped|entry_typed/);
  });

  test('the live screen is the only caller that passes a fact to createWorkoutSet', () => {
    const callers = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          walk(full);
        } else if (/\.js$/.test(entry.name)) {
          const text = fs.readFileSync(full, 'utf8');
          if (/\bcreateWorkoutSet\(/.test(text) && !/export async function createWorkoutSet\(/.test(text)) {
            callers.push({ file: path.relative(path.join(__dirname, '..', '..'), full), passesFact: /entryTyped\s*:/.test(text) });
          }
        }
      }
    };
    walk(path.join(__dirname, '..', '..'));
    expect(callers.sort((a, b) => a.file.localeCompare(b.file))).toEqual([
      { file: path.join('screens', 'ActiveWorkoutScreen.js'), passesFact: true },
      { file: path.join('store', 'useAppStore.js'), passesFact: false },
    ]);
  });
});
