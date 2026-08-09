/**
 * blockExplain.stage8.test.js — TEST-FIRST, Stage 8 of the adaptive
 * mesocycle build (founder order: "block-start and block-end
 * explanations; Never claim an adjustment has been learned or applied
 * unless the underlying plan actually contains it"; authority blueprint
 * §3.6).
 *
 * Pins the pure src/lib/blockExplain.js BEFORE it exists:
 * - summariseSeededPlan reads the WRITTEN planned_muscle_volume rows —
 *   the plan as it actually exists — never the seed map that was merely
 *   requested, so a skipped insert can never be narrated as applied.
 * - buildBlockStartLines speaks only for PERSONALISED sources
 *   (seed_ledger / seed_learned / seed_manual); template and
 *   research/profile ramps produce no false "learned" claims.
 * - buildLedgerReflectionRows orders the block-end story by what needs
 *   attention (STRAINED first, INSUFFICIENT_DATA last) and reuses each
 *   entry's delta-composed rationale verbatim (already honest).
 * - recoveryProposalLine speaks ONLY when the ledger proposes the
 *   longer window, and always as the user's call.
 * - buildRampPositionLine names the ramp position and claims a coach
 *   adjustment ONLY when one was actually applied.
 */
import fs from 'fs';
import path from 'path';
import {
  summariseSeededPlan,
  buildBlockStartLines,
  buildLedgerReflectionRows,
  recoveryProposalLine,
  buildRampPositionLine,
} from '../blockExplain';

const plannedRow = (muscle, weekIndex, planned, source) => ({
  muscle, week_index: weekIndex, planned_sets: planned, source,
});

describe('summariseSeededPlan (the plan as written, never the request)', () => {
  test('groups the written rows into week-1, peak and deload per muscle with the source', () => {
    const rows = [
      plannedRow('chest', 1, 11, 'seed_ledger'),
      plannedRow('chest', 2, 13, 'seed_ledger'),
      plannedRow('chest', 4, 17, 'seed_ledger'),
      plannedRow('chest', 5, 10, 'seed_ledger'),
      plannedRow('back', 1, 10, 'template'),
      plannedRow('back', 4, 20, 'template'),
      plannedRow('back', 5, 10, 'template'),
    ];
    const summary = summariseSeededPlan(rows, 5);
    expect(summary.chest).toEqual({ week1: 11, peak: 17, deload: 10, source: 'seed_ledger' });
    expect(summary.back).toEqual({ week1: 10, peak: 20, deload: 10, source: 'template' });
  });

  test('empty rows summarise to an empty object', () => {
    expect(summariseSeededPlan([], 5)).toEqual({});
  });
});

describe('block-start lines (§3.6): personalised sources only', () => {
  const summary = {
    chest: { week1: 11, peak: 17, deload: 10, source: 'seed_ledger' },
    back: { week1: 12, peak: 18, deload: 10, source: 'seed_learned' },
    quads: { week1: 8, peak: 14, deload: 8, source: 'seed_profile' },
    biceps: { week1: 8, peak: 14, deload: 8, source: 'template' },
    calves: { week1: 6, peak: 10, deload: 6, source: 'seed_manual' },
  };

  test('speaks for ledger, learned and manual seeds; never for template or profile ramps', () => {
    const lines = buildBlockStartLines({ summary, limit: 5 });
    const joined = lines.join(' | ');
    expect(joined).toContain('Chest starts at 11 sets, climbing to 17');
    expect(joined).toContain('set by how your last block went');
    expect(joined).toContain('Back');
    expect(joined).toContain('what past blocks have shown');
    expect(joined).toContain('Calves');
    expect(joined).toContain('your own setting');
    expect(joined).not.toContain('Quads');
    expect(joined).not.toContain('Biceps');
  });

  test('respects the limit, largest peaks first, and returns [] with nothing personalised', () => {
    const lines = buildBlockStartLines({ summary, limit: 1 });
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Back'); // peak 18 outranks chest 17
    expect(buildBlockStartLines({ summary: { quads: summary.quads } })).toEqual([]);
  });

  test('no em dash, British voice', () => {
    for (const line of buildBlockStartLines({ summary, limit: 5 })) {
      expect(line).not.toMatch(/—/);
    }
  });
});

describe('block-end reflection rows', () => {
  const ledger = {
    version: 1,
    proposedRecoveryDays: 7,
    entries: [
      { muscle: 'chest', classification: 'RESPONSIVE', rationale: 'Chest responded well, so the next block starts 1 set higher.' },
      { muscle: 'quads', classification: 'STRAINED', rationale: 'Quads lost ground while recovery ran poor, so the next block starts 2 sets lower and the peak comes down.' },
      { muscle: 'back', classification: 'INSUFFICIENT_DATA', rationale: 'No recovery information was logged for back this block, so the starting volume carries over unchanged.' },
      { muscle: 'front_delts', classification: 'STALE', rationale: 'Front delts held steady this block with recovery fine, so the starting volume carries over unchanged.' },
    ],
  };

  test('orders by attention: STRAINED first, INSUFFICIENT_DATA last, display names attached', () => {
    const rows = buildLedgerReflectionRows(ledger);
    expect(rows.map((r) => r.muscle)).toEqual(['quads', 'chest', 'front_delts', 'back']);
    expect(rows[0].label).toBe('Quads');
    expect(rows[2].label).toBe('Front delts');
    expect(rows[0].rationale).toContain('starts 2 sets lower');
  });

  test('a null or empty ledger produces no rows', () => {
    expect(buildLedgerReflectionRows(null)).toEqual([]);
    expect(buildLedgerReflectionRows({ entries: [] })).toEqual([]);
  });

  test('the longer-recovery proposal line appears ONLY when proposed, always as the user\'s call', () => {
    expect(recoveryProposalLine(ledger)).toBeNull();
    const line = recoveryProposalLine({ ...ledger, proposedRecoveryDays: 10 });
    expect(line).toContain('10 days');
    expect(line.toLowerCase()).toContain('your call');
    expect(line).not.toMatch(/—/);
  });
});

describe('the weekly ramp position line', () => {
  test('names the position and the planned direction', () => {
    const line = buildRampPositionLine({ weekIndex: 3, plannedWeeks: 5 });
    expect(line).toBe('Week 3 of 5 in your block. The plan climbs next week.');
  });

  test('the final accumulation week points at the recovery week', () => {
    expect(buildRampPositionLine({ weekIndex: 4, plannedWeeks: 5 }))
      .toBe('Week 4 of 5 in your block. Your recovery week is next.');
  });

  test('claims a coach adjustment ONLY when one was actually applied', () => {
    const applied = buildRampPositionLine({ weekIndex: 3, plannedWeeks: 5, appliedDelta: 1 });
    expect(applied).toContain('the coach added 1 set on top');
    const none = buildRampPositionLine({ weekIndex: 3, plannedWeeks: 5, appliedDelta: null });
    expect(none).not.toContain('coach');
    const down = buildRampPositionLine({ weekIndex: 3, plannedWeeks: 5, appliedDelta: -2 });
    expect(down).toContain('the coach pulled 2 sets back');
  });

  test('no block context, no line', () => {
    expect(buildRampPositionLine({})).toBeNull();
    expect(buildRampPositionLine({ weekIndex: 5, plannedWeeks: 5 })).toBeNull(); // recovery week: the deload copy owns it
  });
});

describe('surface wiring pins', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

  test('the block sheet renders the seed lines from the WRITTEN plan', () => {
    expect(read('components/HomeBlockShapeSheet.js')).toMatch(/seedLines/);
    const home = read('screens/HomeScreen.js');
    expect(home).toMatch(/getPlannedMuscleVolumeForBlock/);
    expect(home).toMatch(/summariseSeededPlan|buildBlockStartLines/);
  });

  test('the Plans decision card carries the ledger story and the recovery proposal', () => {
    const src = read('screens/PlansScreen.js');
    expect(src).toMatch(/buildLedgerReflectionRows/);
    expect(src).toMatch(/recoveryProposalLine/);
  });

  test('BlockReflection gains the ledger section', () => {
    expect(read('screens/BlockReflectionScreen.js')).toMatch(/buildLedgerReflectionRows/);
  });

  test('the coach training card names the ramp position', () => {
    expect(read('screens/CoachOutputScreen.js')).toMatch(/buildRampPositionLine/);
  });
});

describe('purity', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'blockExplain.js'), 'utf8');
  test('no clocks, no randomness, no I/O, no store, tier-blind', () => {
    expect(SRC).not.toMatch(/Date\.now|Math\.random|new Date\(\)/);
    expect(SRC).not.toMatch(/require\(|from '\.\/database'|AsyncStorage|useAppStore|supabase/);
    expect(SRC).not.toMatch(/tier/i);
  });
});
