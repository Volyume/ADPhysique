/**
 * blockLifecycle.stage1.test.js — TEST-FIRST, Stage 1 of the adaptive
 * mesocycle build (founder order 2026-08-09; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §1.8/§3.5).
 *
 * A finished block enters an explicit COMPLETED_AWAITING_DECISION state:
 * the week index never wraps back to week 1, the user is never left
 * silently training deload targets under an "Introduction week" label, no
 * new mesocycle is ever created without explicit user action, and the
 * "Continue with adjustments" path gains the seam a Block Ledger result
 * will flow through in Stage 6.
 */
import fs from 'fs';
import path from 'path';
import { getBlockStatus, getCurrentMesoWeek } from '../mesocycle';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
const WEEK = 7 * 24 * 60 * 60 * 1000;
const START = new Date(2026, 0, 5).getTime(); // a Monday, local

describe('COMPLETED_AWAITING_DECISION is a first-class block state', () => {
  test('a block one week past recovery reports completed_awaiting_decision, not complete', () => {
    const s = getBlockStatus(START, 5, START + 5 * WEEK);
    expect(s.status).toBe('completed_awaiting_decision');
    expect(s.awaitingDecision).toBe(true);
    expect(s.weeksOverdue).toBe(0);
  });

  test('an ignored block three weeks on stays in the SAME state with weeksOverdue counting', () => {
    const s = getBlockStatus(START, 5, START + 8 * WEEK);
    expect(s.status).toBe('completed_awaiting_decision');
    expect(s.awaitingDecision).toBe(true);
    expect(s.weeksOverdue).toBe(3);
  });

  test("the legacy 'complete' and 'overdue' statuses are gone from the module", () => {
    const SRC = read('lib/mesocycle.js');
    expect(SRC).not.toMatch(/status = 'complete';/);
    expect(SRC).not.toMatch(/status = 'overdue';/);
  });

  test('active and recovery weeks are untouched', () => {
    expect(getBlockStatus(START, 5, START + 1 * WEEK).status).toBe('active');
    expect(getBlockStatus(START, 5, START + 4 * WEEK).status).toBe('recovery');
    expect(getBlockStatus(START, 5, START + 4 * WEEK).awaitingDecision).toBe(false);
  });
});

describe('the week index never wraps or resets while awaiting a decision', () => {
  test('getBlockStatus.currentWeek keeps counting real weeks, never returns to 1', () => {
    expect(getBlockStatus(START, 5, START + 6 * WEEK).currentWeek).toBe(7);
    expect(getBlockStatus(START, 5, START + 11 * WEEK).currentWeek).toBe(12);
  });

  test('the generic narrative resolver can refuse to wrap', () => {
    // getCurrentMesoWeek keeps its generic wrapping contract, plus a
    // { wrap: false } clamp at the EXPERIENCE SCHEDULE's end (5 weeks for
    // intermediate). This is NOT a block week: block-bound code resolves
    // through getCurrentBlockWeekIndex + getBlockStatus (see the db
    // resolver test below), never through this narrative layer, which has
    // no production callers.
    expect(getCurrentMesoWeek(START, 'intermediate', START + 6 * WEEK)).toBe(2); // legacy wrap intact
    expect(getCurrentMesoWeek(START, 'intermediate', START + 6 * WEEK, { wrap: false })).toBe(5);
  });

  test('the db week resolver reports awaitingDecision alongside the clamped final row', () => {
    // Source-guard (the resolver is DB-bound): getCurrentMesocycleWeek must
    // compute the block status and return awaitingDecision, so no consumer
    // can show "Week 5 of 5" as if the block were still live.
    const SRC = read('lib/database.js');
    const fn = SRC.slice(SRC.indexOf('export async function getCurrentMesocycleWeek'), SRC.indexOf('export async function getCurrentMesocycleWeek') + 2200);
    expect(fn).toMatch(/getBlockStatus\(/);
    expect(fn).toMatch(/awaitingDecision/);
  });
});

describe('no silent mesocycle creation', () => {
  // Writing this suite surfaced that createMesocycle (database.js) is DEAD
  // code: zero callers anywhere in src. The ONLY live block-creation path
  // is activatePlanWithBlock's inline INSERT, reached from explicit user
  // plan activation. Stage 6 resolves the dead function (delete or become
  // the ledger-seeded path); until then these pins hold the invariant that
  // no scheduler, sync handler or coach-apply path grows a way to create a
  // block without explicit user action.
  const SRC_ROOT = path.resolve(__dirname, '..', '..');
  const filesMatching = (pattern) => {
    const hits = [];
    const walk = (dir) => {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) { if (!full.includes('__tests__')) walk(full); continue; }
        if (!f.endsWith('.js')) continue;
        if (pattern.test(fs.readFileSync(full, 'utf8'))) hits.push(path.relative(SRC_ROOT, full));
      }
    };
    walk(SRC_ROOT);
    return hits.sort();
  };

  test('createMesocycle stays deleted (Stage 6 resolved the dead code)', () => {
    const offenders = filesMatching(/[^a-zA-Z]createMesocycle\(/)
      .filter((rel) => rel !== path.join('lib', 'database.js'));
    expect(offenders).toEqual([]);
    // Stage 6 deleted the dead definition outright; the name reappearing
    // as a call would be a new creation path bypassing this review.
    const dbSrc = fs.readFileSync(path.join(SRC_ROOT, 'lib', 'database.js'), 'utf8');
    expect((dbSrc.match(/createMesocycle\(/g) || []).length).toBe(0);
  });

  test('every INSERT variant into mesocycles lives only inside database.js', () => {
    // OR REPLACE / OR IGNORE variants count too, or a future silent-creation
    // path could walk straight past this pin.
    expect(filesMatching(/INSERT (OR \w+ )?INTO mesocycles/)).toEqual(['lib/database.js']);
    // Exactly two sites there: activatePlanWithBlock (live, user-initiated
    // plan activation) and insertMesocycleFromCloud (the sync pull, which
    // only mirrors a block the same user explicitly created on another
    // device). createMesocycle was dead code and Stage 6 deleted it. A
    // third site appearing means a new creation path bypassed this review.
    const dbSrc = fs.readFileSync(path.join(SRC_ROOT, 'lib', 'database.js'), 'utf8');
    expect((dbSrc.match(/INSERT (OR \w+ )?INTO mesocycles/g) || []).length).toBe(2);
  });
});

describe('honest copy while awaiting the decision', () => {
  test('HomeScreen has a block-finished branch keyed on awaitingDecision', () => {
    const SRC = read('screens/HomeScreen.js');
    expect(SRC).toMatch(/awaitingDecision/);
    expect(SRC).toContain('Block finished');
  });

  test('the widget writer stops claiming a live week for a finished block', () => {
    const SRC = read('lib/widgets/writer.js');
    expect(SRC).toMatch(/awaitingDecision/);
  });

  test("the advisor's adjust option no longer promises an automatic adjustment that does not exist", () => {
    const SRC = read('lib/blockAdvisor.js');
    expect(SRC).not.toContain('a small volume or load adjustment based on how this block went');
    // The advisor reads the merged state, not the retired pair.
    expect(SRC).toContain("'completed_awaiting_decision'");
    expect(SRC).not.toMatch(/=== 'complete'|=== 'overdue'/);
  });
});

describe("the 'Continue with adjustments' seam exists for the Stage 6 ledger", () => {
  test('activatePlanWithBlock accepts and threads a ledger option', () => {
    const SRC = read('lib/database.js');
    expect(SRC).toMatch(/export async function activatePlanWithBlock\(userId, planId, planName, \{ ledger = null \} = \{\}\)/);
    const fn = SRC.slice(SRC.indexOf('export async function activatePlanWithBlock'), SRC.indexOf('export async function activatePlanWithBlock') + 3000);
    expect(fn).toMatch(/generateInitialPlannedVolume\([^)]*ledger/);
  });

  test('generateInitialPlannedVolume consumes the resolved seed map (Stage 6)', () => {
    const SRC = read('lib/database.js');
    expect(SRC).toMatch(/export async function generateInitialPlannedVolume\(mesocycleId, volumeLandmarks, ledger = null\)/);
    // The seeded write records its source per row so the explanation
    // layer can never claim a personalisation that is not there.
    expect(SRC).toMatch(/seed_\$\{seed\.source\}/);
    expect(SRC).toMatch(/buildSeededWeeklyTargets/);
  });
});
