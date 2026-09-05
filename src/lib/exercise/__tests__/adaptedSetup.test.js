/**
 * Adapted-setup content suite (gap-closure Phase G; GC-D9; order
 * section 23; class layer GC-D11 at the 2026-08-21 reconciliation).
 *
 * Pins:
 *  1. Every entry names a REAL seed exercise (no orphan guidance).
 *  2. Contexts are the closed set only.
 *  3. Wording law: the directory function-term ban and the em dash ban
 *     hold over every line (setup content, never treatment content),
 *     and lines carry no loads, percentages or rep prescriptions -
 *     class defaults included.
 *  4. The accessor returns labelled lines in stable context order and
 *     [] for unknown names.
 *  5. The class classifier (materialContextsFor) makes the judgement
 *     calls this suite fixes: grip-purpose rows never get strap text,
 *     impact rows get nothing, and the class/specific merge lets the
 *     richer per-exercise line win.
 */
const {
  ADAPTED_SETUP, SETUP_CONTEXT, SETUP_CONTEXT_LABELS, CLASS_TEXT,
  adaptedSetupFor, materialContextsFor,
} = require('../adaptedSetup');
const { directoryWordingViolation } = require('../../capability/directory/schema');
const { CORPUS, RETIRED_ENTRIES } = require('../../exerciseCorpus');

// Re-anchored EL-14 (exercise-library-expansion-2026-09-05): this used to
// regex-parse seedExercises.js's RAW tuple text plus seedRoutines.js's
// REQUIRED_EXERCISES literal. Both are gone — the corpus is the source of
// truth. Retired names are included too (ADAPTED_SETUP entries reference
// them by their pre-retirement name and remain valid guidance text for
// that canonical id).
function seedNames() {
  return new Set([...CORPUS.map((e) => e.name), ...RETIRED_ENTRIES.map((e) => e.name)]);
}

const CONTEXTS = new Set(Object.values(SETUP_CONTEXT));

test('every entry names a real seed exercise', () => {
  const names = seedNames();
  const missing = Object.keys(ADAPTED_SETUP).filter(n => !names.has(n));
  expect(missing).toEqual([]);
});

test('contexts are closed and labelled', () => {
  for (const [name, entry] of Object.entries(ADAPTED_SETUP)) {
    for (const ctx of Object.keys(entry)) {
      expect({ name, ctx, known: CONTEXTS.has(ctx) }).toEqual({ name, ctx, known: true });
      expect(SETUP_CONTEXT_LABELS[ctx]).toBeTruthy();
    }
  }
});

test('wording law holds over every line: no function terms, no em dash, no prescriptions', () => {
  const bad = [];
  for (const [name, entry] of Object.entries(ADAPTED_SETUP)) {
    for (const [ctx, text] of Object.entries(entry)) {
      const violation = directoryWordingViolation(text);
      if (violation) bad.push(`${name}/${ctx}: ${violation}`);
      if (/\d+\s?(%|per cent|kg|lb|reps)\b/i.test(text)) bad.push(`${name}/${ctx}: prescription-like number`);
    }
  }
  expect(bad).toEqual([]);
});

test('accessor returns labelled lines in stable order and [] for unknowns', () => {
  const lines = adaptedSetupFor('Lat Pulldown (Wide Grip)');
  expect(lines.length).toBeGreaterThan(0);
  for (const l of lines) {
    expect(CONTEXTS.has(l.context)).toBe(true);
    expect(typeof l.label).toBe('string');
    expect(typeof l.text).toBe('string');
  }
  expect(adaptedSetupFor('Not A Real Movement')).toEqual([]);
  expect(adaptedSetupFor(null)).toEqual([]);
});

test('coverage is real: the layer carries a meaningful entry count', () => {
  expect(Object.keys(ADAPTED_SETUP).length).toBeGreaterThanOrEqual(25);
});

test('class default lines obey the same wording laws as entries', () => {
  const bad = [];
  for (const [ctx, text] of Object.entries(CLASS_TEXT)) {
    if (!CONTEXTS.has(ctx)) bad.push(`${ctx}: unknown context`);
    const violation = directoryWordingViolation(text);
    if (violation) bad.push(`${ctx}: ${violation}`);
    if (/\d+\s?(%|per cent|kg|lb|reps)\b/i.test(text)) bad.push(`${ctx}: prescription-like number`);
  }
  expect(bad).toEqual([]);
});

test('classifier judgement calls hold', () => {
  // Grip-purpose rows never get strap text: strapping a grip exercise
  // removes it rather than adapting it.
  expect(materialContextsFor({
    name: 'Plate Pinch', primaryMuscle: 'forearms', equipment: 'plate',
    movementPattern: 'carry', gripDemand: 'bar', position: 'standing',
  })).toEqual([]);
  // Gripped pulls DO get strap text.
  expect(materialContextsFor({
    name: 'Barbell Shrug', primaryMuscle: 'traps', equipment: 'barbell',
    movementPattern: 'pull', gripDemand: 'bar', position: 'standing',
  })).toContain(SETUP_CONTEXT.STRAP_CUFF);
  // Impact rows get nothing: eligibility, not setup, governs.
  expect(materialContextsFor({
    name: 'Box Jump', primaryMuscle: 'quads', equipment: 'bodyweight',
    movementPattern: 'squat', position: 'standing', impact: true, balanceDemand: 'high',
  })).toEqual([]);
  // Two-handed cable upper work converts to a single handle.
  expect(materialContextsFor({
    name: 'Cable Lateral Raise', primaryMuscle: 'side_delts', equipment: 'cable',
    movementPattern: 'push', gripDemand: 'supportive', position: 'standing',
  })).toEqual(expect.arrayContaining([SETUP_CONTEXT.ONE_ARM, SETUP_CONTEXT.SEATED]));
  // Single-leg standing patterns earn support text.
  expect(materialContextsFor({
    name: 'Bulgarian Split Squat', primaryMuscle: 'quads', equipment: 'dumbbell',
    movementPattern: 'squat', position: 'standing', balanceDemand: 'high',
  })).toContain(SETUP_CONTEXT.SUPPORTED);
  // Null-tolerant floor: unknown metadata earns no class line.
  expect(materialContextsFor({ name: 'Mystery Movement' })).toEqual([]);
  expect(materialContextsFor(null)).toEqual([]);
});

test('class and specific lines merge with the richer entry winning', () => {
  // Seated Cable Row has a rich STRAP_CUFF entry; passing the full row
  // must return THAT text, not the class default.
  const row = {
    name: 'Seated Cable Row', primaryMuscle: 'back', equipment: 'cable',
    movementPattern: 'pull', gripDemand: 'bar', position: 'seated',
  };
  const lines = adaptedSetupFor(row);
  const strap = lines.find(l => l.context === SETUP_CONTEXT.STRAP_CUFF);
  expect(strap.text).toBe(ADAPTED_SETUP['Seated Cable Row'][SETUP_CONTEXT.STRAP_CUFF]);
  expect(strap.text).not.toBe(CLASS_TEXT[SETUP_CONTEXT.STRAP_CUFF]);
  // A row with no rich entry gets the class default.
  const classOnly = adaptedSetupFor({
    name: 'Cable Shrug', primaryMuscle: 'traps', equipment: 'cable',
    movementPattern: 'pull', gripDemand: 'bar', position: 'standing',
  });
  const classStrap = classOnly.find(l => l.context === SETUP_CONTEXT.STRAP_CUFF);
  expect(classStrap.text).toBe(CLASS_TEXT[SETUP_CONTEXT.STRAP_CUFF]);
  // Name-only calls keep the original entry-only behaviour.
  expect(adaptedSetupFor('Cable Shrug')).toEqual([]);
});
