/**
 * C12 reschedule-hook safety guard (adversarial review of commit 4e9c3d5).
 *
 * activatePlanWithBlock fires a best-effort training-reminder reschedule so the
 * push names the plan that just became active. That side effect must NEVER
 * endanger plan activation. The review flagged that every caller of
 * activatePlanWithBlock mocks the database wholesale, so no executed test pins
 * this property. This source guard locks the structural safety invariants
 * against a future "cleanup" refactor:
 *   - the reschedule is wrapped in try/catch (a synchronous require failure
 *     cannot escape and abort activation),
 *   - the returned promise has a .catch (a rejection cannot bubble),
 *   - activation still returns after the hook,
 *   - the name is read back from getActivePlan, not the raw planName arg (which
 *     elsewhere in the same function labels the mesocycle), so the push can
 *     never name anything other than the active plan.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '../lib/database.js'), 'utf8');

// Slice one function body: from its declaration to the next top-level export.
function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\nexport (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('C12 reschedule hook cannot endanger plan activation', () => {
  const body = fnBody(SRC, 'export async function activatePlanWithBlock(');

  test('the reminder reschedule is present, wrapped and best-effort', () => {
    expect(body).toMatch(/scheduleTrainingReminders\(/);
    // try/catch so a synchronous require failure never escapes to the caller
    expect(body).toMatch(/try\s*\{[\s\S]*scheduleTrainingReminders\([\s\S]*\}\s*catch/);
    // the returned promise is caught so a rejection is swallowed, never bubbled
    expect(body).toMatch(/scheduleTrainingReminders\([\s\S]*?\)\s*\.catch\(/);
  });

  test('activation still returns after the hook (the hook does not gate the return)', () => {
    const hookIdx = body.indexOf('scheduleTrainingReminders(');
    const returnIdx = body.lastIndexOf('return id;');
    expect(hookIdx).toBeGreaterThan(-1);
    expect(returnIdx).toBeGreaterThan(hookIdx);
  });

  test('the reminder name is read back from the active plan, not the raw arg', () => {
    expect(body).toMatch(/getActivePlan\(userId\)[\s\S]*scheduleTrainingReminders\(\s*activeForReminder\?\.name/);
    // never the raw planName arg (it labels the mesocycle, a different concept)
    expect(body).not.toMatch(/scheduleTrainingReminders\(\s*planName\s*\)/);
  });
});
