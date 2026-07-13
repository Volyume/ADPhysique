/**
 * Coach-wiring audit finding 1 (2026-07-13): the consecutive off-target
 * counter fed to runWeeklyCoach was derived from the PREVIOUS saved coach
 * output (lastOutput.consecutiveOffTargetWeeks + 1) but the counter was
 * never included in any saved output, so it could only ever be 0 or 1 --
 * and the standard calorie-adjustment gate (2 consecutive weeks at high
 * confidence, 3 otherwise) could never fire. The core calorie coaching
 * loop was silently dead for every user; only the rapid-loss safety
 * override could ever change calories.
 *
 * This guard pins the wiring: the counter is persisted with the fresh
 * mount save AND kept in the React state object (`persistedResult`), so
 * the apply handlers -- which re-save the whole record from state -- can
 * never wipe it back off.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '..', 'CoachOutputScreen.js'),
  'utf8',
);

describe('CoachOutputScreen off-target counter persistence (audit 2026-07-13)', () => {
  test('the counter passed to the engine is persisted with the saved output', () => {
    expect(src).toMatch(/const persistedResult = \{ \.\.\.result, consecutiveOffTargetWeeks, lastCalAdjustmentWeekStart \};/);
    expect(src).toMatch(/await saveCoachOutput\(user\.id, \{ weekStart, \.\.\.persistedResult \}\);/);
  });

  test('the React state holds the persisted object so apply-handler re-saves keep the counter', () => {
    expect(src).toMatch(/setOutput\(persistedResult\);/);
    // The fresh result must never be saved or stored bare on the mount path.
    expect(src).not.toMatch(/await saveCoachOutput\(user\.id, \{ weekStart, \.\.\.result, lastCalAdjustmentWeekStart \}\);/);
  });

  test('the derivation still increments from the previous saved output', () => {
    expect(src).toMatch(/lastOutput\?\.trend\?\.onTarget === false\s*\?\s*\(lastOutput\?\.consecutiveOffTargetWeeks \?\? 0\) \+ 1\s*:\s*0/);
  });
});
