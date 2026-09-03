/**
 * D140 (founder decision 2026-09-03): activatePlanKeepingBlock swaps the
 * programme under a running block and never writes a mesocycle.
 *
 * Source guard, matching how activatePlanWithBlock itself is covered
 * (blockLifecycle.stage1, planReplacedTelemetry): the in-memory SQLite
 * double does not execute SQL, so the shape of the writer is what can be
 * pinned. What must hold:
 *   1. the function reads for an active block and returns null without
 *      activating when there is none (the caller then runs the usual
 *      activation, so nobody ends up with a plan and no block);
 *   2. it activates through setActivePlan (the one programme writer, with
 *      its ownership-scoped transaction), never a private UPDATE;
 *   3. it contains NO write to mesocycles, mesocycle_weeks or
 *      planned_muscle_volume, and never calls generateMesocycleWeeks or
 *      generateInitialPlannedVolume - keeping the block means not touching it;
 *   4. generateAndSavePlan only takes this path under keepBlock and falls
 *      back to activatePlanWithBlock when nothing was kept.
 */
const fs = require('fs');
const path = require('path');

const DB = fs.readFileSync(path.resolve(__dirname, '..', 'database.js'), 'utf8');
const GEN = fs.readFileSync(path.resolve(__dirname, '..', 'planAutoGen.js'), 'utf8');

function fnSlice(src, marker) {
  const start = src.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\nexport ', start + marker.length);
  return src.slice(start, next === -1 ? src.length : next);
}

describe('activatePlanKeepingBlock never touches the block', () => {
  const fn = fnSlice(DB, 'export async function activatePlanKeepingBlock');

  test('returns null without activating when there is no active block', () => {
    expect(fn).toMatch(/SELECT id FROM mesocycles WHERE user_id = \? AND is_active = 1/);
    expect(fn).toMatch(/if \(!active\?\.id\) return null;/);
    expect(fn.indexOf('return null;')).toBeLessThan(fn.indexOf('setActivePlan('));
  });

  test('activates through setActivePlan and returns the kept block id', () => {
    expect(fn).toMatch(/await setActivePlan\(userId, planId\);/);
    expect(fn).toMatch(/return active\.id;/);
  });

  test('contains no mesocycle write of any kind', () => {
    expect(fn).not.toMatch(/INSERT INTO mesocycles/);
    expect(fn).not.toMatch(/UPDATE mesocycles/);
    expect(fn).not.toMatch(/mesocycle_weeks/);
    expect(fn).not.toMatch(/planned_muscle_volume/);
    expect(fn).not.toMatch(/generateMesocycleWeeks/);
    expect(fn).not.toMatch(/generateInitialPlannedVolume/);
    expect(fn).not.toMatch(/end_date/);
  });
});

describe('generateAndSavePlan keeps the block only when asked, and falls back', () => {
  const fn = fnSlice(GEN, 'export async function generateAndSavePlan');

  test('keepBlock is an explicit option defaulting to false', () => {
    expect(fn).toMatch(/continuityProposal = null, keepBlock = false,/);
  });

  test('the keep path runs only under keepBlock, and the usual activation runs when nothing was kept', () => {
    expect(fn).toMatch(/if \(keepBlock\) \{\s*const keptBlockId = await activatePlanKeepingBlock\(userId, prog\.id\);\s*blockKept = !!keptBlockId;\s*\}/);
    expect(fn).toMatch(/if \(!blockKept\) \{\s*await activatePlanWithBlock\(userId, prog\.id, planName, \{ ledger, allowLearnedCarry \}\);\s*\}/);
    expect(fn).toMatch(/blockKept,\s*continuity: \{/);
  });
});
