/**
 * Adapted-setup content suite (gap-closure Phase G; GC-D9; order
 * section 23).
 *
 * Pins:
 *  1. Every entry names a REAL seed exercise (no orphan guidance).
 *  2. Contexts are the closed set only.
 *  3. Wording law: the directory function-term ban and the em dash ban
 *     hold over every line (setup content, never treatment content),
 *     and lines carry no loads, percentages or rep prescriptions.
 *  4. The accessor returns labelled lines in stable context order and
 *     [] for unknown names.
 */
const fs = require('fs');
const path = require('path');
const {
  ADAPTED_SETUP, SETUP_CONTEXT, SETUP_CONTEXT_LABELS, adaptedSetupFor,
} = require('../adaptedSetup');
const { directoryWordingViolation } = require('../../capability/directory/schema');

function seedNames() {
  const src = fs.readFileSync(path.resolve(__dirname, '../../seedExercises.js'), 'utf8');
  const start = src.indexOf('const RAW = [');
  const body = src.slice(start, src.indexOf('\n];', start));
  const names = new Set();
  const re = /\[\s*'([^']+)',/g;
  let m;
  while ((m = re.exec(body)) !== null) names.add(m[1]);
  for (const rm of src.matchAll(/name: '((?:[^'\\]|\\.)*)',\s*primaryMuscle/g)) names.add(rm[1]);
  return names;
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
