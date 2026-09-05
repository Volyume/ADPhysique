/**
 * Instruction coverage: EVERY built-in exercise must carry structured
 * instructions, or the active-workout sheet and the detail screen fall
 * back to generic copy (founder, 2026-06-20; re-anchored D151 2026-09-05).
 * The hand-written FORM_TIPS map is retired, so the contract is now
 * "setup and execution on every live corpus row", read from the corpus
 * module so a newly added exercise without them fails the build until
 * they are written.
 */
const { CORPUS } = require('../exerciseCorpus');
const { instructionsFor } = require('../exerciseInstructions');

test('every library exercise has setup and execution instructions', () => {
  const live = CORPUS.filter((e) => !e.retiredInto);
  expect(live.length).toBeGreaterThan(400); // sanity: the library actually parsed
  const missing = live
    .filter((e) => !(typeof e.setup === 'string' && e.setup.trim() && typeof e.execution === 'string' && e.execution.trim()))
    .map((e) => e.name);
  expect(missing).toEqual([]);
});

test('instructionsFor resolves every live row and refuses custom rows', () => {
  const live = CORPUS.filter((e) => !e.retiredInto);
  for (const e of live) {
    const ins = instructionsFor({ name: e.name });
    expect(ins && ins.setup === e.setup && ins.execution === e.execution).toBe(true);
  }
  expect(instructionsFor({ name: live[0].name, isCustom: 1 })).toBeNull();
  expect(instructionsFor({ name: 'Not A Real Exercise' })).toBeNull();
});

test('the hand-written FORM_TIPS map stays retired (D151)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../formTips.js'), 'utf8');
  expect(src).not.toMatch(/export const FORM_TIPS/);
});
