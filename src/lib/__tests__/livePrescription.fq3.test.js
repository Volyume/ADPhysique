/**
 * livePrescription.fq3.test.js — the FQ-3 dedicated test plan (D96, founder
 * ruling 2026-08-10), RE-ANCHORED (Campaign 20 Phase 2 Stage 12) onto the
 * resolver after computeSetTargets' retirement. Renamed from
 * computeSetTargets.fq3.test.js; same D96/FQ-3 lineage, same law, migrated
 * onto nextSessionOpeningLoad/resolveSetPrescription
 * (docs/live-prescription-campaign-20-2026-08-16/
 * CAMPAIGN-20-PHASE-1-DESIGN.md §10, §17).
 *
 * Effort truth in progression: per-set effort is unknown unless genuinely
 * known (the RIR picker is permanently removed, so it never is); the
 * previous session's post-workout difficulty rating is a SEPARATE,
 * session-level coarse evidence signal the engine consumes conservatively.
 * These tests run the REAL resolver and pin every behaviour the ruling
 * names: difficulty 1-3 advances, 4-5 holds with very-hard provenance, null
 * (skipped) holds with unknown provenance, and bodyweight/unloaded top sets
 * never advance regardless of effort (the FR-C4-4 resolution, migrated onto
 * the resolver's own tests in full at livePrescription.test.js's "CALC-5 /
 * FR-C4-4" describe — this file keeps its own slim pin as part of the FQ-3
 * law statement, not a duplicate authority).
 */
import fs from 'fs';
import path from 'path';
import { nextSessionOpeningLoad, resolveSetPrescription, assembleEvidencePacket, PROVENANCE } from '../livePrescription';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const BAND = { min: 8, max: 12 };

// ── local fixture helpers (self-contained, house convention, mirrors
// livePrescription.test.js's own helpers) ──────────────────────────────────

function comparableSession({ at, difficulty = 2, sets, band = BAND }) {
  return {
    at,
    difficulty,
    band,
    comparable: true,
    working: sets.map((s, i) => ({ pos: s.pos ?? i + 1, weight: s.weight, reps: s.reps, setType: s.setType ?? 'straight' })),
  };
}

function row({ weight, reps, setType = 'straight', pos = 1, at = NOW, targetRepsMin = 8, targetRepsMax = 12, exerciseId = 'ex1', ...extra }) {
  return {
    exerciseId, setType, weight, actualReps: reps, setNumber: pos,
    targetRepsMin, targetRepsMax, createdAt: at, ...extra,
  };
}

describe('FQ-3: no fabricated per-set effort evidence', () => {
  test('the logger default is null effort, and no surface converts session difficulty into per-set RIR', () => {
    const stripComments = (src) => src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const screen = stripComments(fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ActiveWorkoutScreen.js'), 'utf8'));
    expect(screen).toMatch(/rir: null \}/);
    expect(screen).not.toMatch(/rir: 2/);
    // The resolver reads the rating as a SESSION-level field (session.difficulty,
    // Campaign 20's replacement for computeSetTargets' prevSessionDifficulty
    // option) and never writes it onto a per-set structure, nor reads a
    // per-set rir field from any working row.
    const engine = fs.readFileSync(path.join(__dirname, '..', 'livePrescription.js'), 'utf8');
    expect(engine).toMatch(/difficulty/);
    expect(engine).not.toMatch(/\.rir\b|\brir\b/i);
  });

  test('the per-set RIR picker stays removed (D14/D19)', () => {
    const entry = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'SetEntry.js'), 'utf8');
    expect(entry).not.toMatch(/rirPicker|RIR picker|setRir\(/);
  });
});

describe('FQ-3: rep progression continues from performance evidence alone', () => {
  test('an in-range top set holds load with no effort evidence at all, and prescribes the beat-one-rep continuation', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: null, sets: [{ weight: 60, reps: 10 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.MATCH_LOAD_ADD_REP);
    expect(out.weight).toBe(60);
  });
});

describe('FQ-3: top-of-band load progression needs session-level corroboration', () => {
  test('supported (difficulty 2, easy): load increases, capped as before', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: 2, sets: [{ weight: 60, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(out.weight).toBeGreaterThan(60);
  });

  test('moderate (difficulty 3) also corroborates', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: 3, sets: [{ weight: 60, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test.each([4, 5])('very hard (difficulty %i): the load holds with honest provenance', (sd) => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: sd, sets: [{ weight: 60, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.HOLD_EFFORT_VERY_HARD);
    expect(out.weight).toBe(60);
  });

  test('skipped rating (null): conservative hold with honest provenance, never a log-RIR instruction', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: null, sets: [{ weight: 60, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.HOLD_EFFORT_UNKNOWN);
    expect(out.weight).toBe(60);
  });

  test('the screen never renders a log-RIR instruction for either hold provenance', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ActiveWorkoutScreen.js'), 'utf8');
    const copyTable = screen.slice(screen.indexOf('const PROVENANCE_COPY'), screen.indexOf('function provenanceLineFor'));
    expect(copyTable).not.toMatch(/RIR|left in the tank|note how many/i);
  });
});

describe('FQ-3 resolves FR-C4-4: bodyweight sets never advance regardless of effort', () => {
  test('a topped bodyweight (weight 0) top set with supporting effort still never advances', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: 2, sets: [{ weight: 0, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(out.weight).toBe(0);
  });

  test('a topped bodyweight top set with unknown effort also never advances', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: null, sets: [{ weight: 0, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(out.weight).toBe(0);
  });
});

describe('FQ-3: determinism', () => {
  test('identical inputs produce identical outputs', () => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, difficulty: 3, sets: [{ weight: 60, reps: 12 }, { weight: 60, reps: 11 }] }),
      comparableSession({ at: NOW - 14 * DAY, difficulty: 3, sets: [{ weight: 60, reps: 12 }] }),
    ];
    const a = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    const b = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(a).toEqual(b);
  });
});

describe('FQ-3: legacy per-set rir values no longer drive the overload decision', () => {
  test('a stored rir field on a raw history row grants no headroom on its own and is not read at all', () => {
    const withRir = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
      prescription: { repsMin: 8, repsMax: 12 },
      now: NOW,
      rawHistory: [{ at: NOW - 7 * DAY, difficulty: null, sets: [row({ weight: 60, reps: 12, at: NOW - 7 * DAY, rir: 2 })] }],
    });
    const withoutRir = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
      prescription: { repsMin: 8, repsMax: 12 },
      now: NOW,
      rawHistory: [{ at: NOW - 7 * DAY, difficulty: null, sets: [row({ weight: 60, reps: 12, at: NOW - 7 * DAY })] }],
    });
    const a = resolveSetPrescription(withRir, 1);
    const b = resolveSetPrescription(withoutRir, 1);
    expect(a).toEqual(b);
    expect(a.provenance).toBe(PROVENANCE.HOLD_EFFORT_UNKNOWN);
  });

  test('and a genuinely supportive session difficulty still advances, unaffected by any stray rir field', () => {
    const packet = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
      prescription: { repsMin: 8, repsMax: 12 },
      now: NOW,
      rawHistory: [{ at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 60, reps: 12, at: NOW - 7 * DAY, rir: 0 })] }],
    });
    const rx = resolveSetPrescription(packet, 1);
    expect(rx.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });
});
