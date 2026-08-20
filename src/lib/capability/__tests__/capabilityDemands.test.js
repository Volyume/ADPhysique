/**
 * CC27 - demand-ontology invariants (ARCHITECTURE section 8.5).
 *
 * Pins, over the REAL seed library (every RAW row, parsed from
 * seedExercises.js source so the suite can never drift from what ships):
 *  - closed value domains on every derived set (no invented vocabulary);
 *  - zero contradictions per validateDemandMetadata's legal-combination
 *    rules;
 *  - per-axis coverage floors, so a rule regression that silently drops
 *    hundreds of rows to UNKNOWN fails here rather than shipping as a
 *    blanket capability_unknown exclusion;
 *  - the section 33.3 family-thin muscles carry DEMAND coverage (their
 *    rules cannot ride movement families, so demand axes are their lane);
 *  - derivation is pure and deterministic (same input, same output).
 */
const fs = require('fs');
const path = require('path');
const {
  deriveDemandMetadata, validateDemandMetadata, DEMAND_FIELDS,
} = require('../demands');

function rawRows() {
  const src = fs.readFileSync(path.resolve(__dirname, '../../seedExercises.js'), 'utf8');
  const start = src.indexOf('const RAW = [');
  const block = src.slice(start, src.indexOf('\n];', start));
  const rows = [];
  for (const line of block.split('\n')) {
    const t = line.trim();
    if (!t.startsWith("['")) continue;
    // eslint-disable-next-line no-eval
    const arr = (0, eval)(`(${t.replace(/,\s*$/, '')})`);
    rows.push({
      name: arr[0], primaryMuscle: arr[1], equipment: arr[3],
      movementPattern: arr[4], compoundIsolation: arr[5] ? 'compound' : 'isolation',
    });
  }
  return rows;
}

const rows = rawRows();
const derived = rows.map((ex) => ({ ex, meta: deriveDemandMetadata(ex) }));

test('the seed parses to the full library (551 rows as of CC27)', () => {
  expect(rows.length).toBeGreaterThanOrEqual(551);
});

test('every derived set stays inside the closed domains with zero contradictions', () => {
  const bad = derived
    .map((d) => ({ name: d.ex.name, errs: validateDemandMetadata(d.meta) }))
    .filter((d) => d.errs.length);
  expect(bad).toEqual([]);
});

test('per-axis coverage floors hold (a rule regression fails loudly)', () => {
  // Floors sit just under the achieved coverage recorded in
  // CC27-DEMAND-COVERAGE.md, so honest curation headroom remains while a
  // broken rule (coverage collapse) cannot ship silently.
  const floors = {
    position: 0.97, floorAccess: 0.95, overheadPosition: 0.90,
    gripDemand: 0.92, unilateralLoadable: 0.84, bilateralUpper: 0.95,
    bilateralLower: 0.96, axialLoad: 0.90, impact: 1.0, balanceDemand: 0.96,
  };
  for (const f of DEMAND_FIELDS) {
    const known = derived.filter((d) => d.meta[f] !== null && d.meta[f] !== undefined).length;
    expect({ axis: f, coverage: known / rows.length }).toEqual({
      axis: f, coverage: expect.any(Number),
    });
    expect(known / rows.length).toBeGreaterThanOrEqual(floors[f]);
  }
});

test('section 33.3: the family-thin muscles carry demand-axis coverage', () => {
  // These muscles have no movement-family taxonomy, so capability family
  // rules cannot serve them; demand and exercise rules are their lane and
  // the eligibility axes must be known for (nearly) every row.
  const thin = ['front_delts', 'traps', 'adductors', 'forearms', 'neck', 'tibialis'];
  for (const muscle of thin) {
    const list = derived.filter((d) => d.ex.primaryMuscle === muscle);
    expect(list.length).toBeGreaterThan(0);
    for (const axis of ['position', 'gripDemand', 'overheadPosition', 'floorAccess']) {
      const known = list.filter((d) => d.meta[axis] !== null && d.meta[axis] !== undefined).length;
      expect({ muscle, axis, coverage: known / list.length }).toEqual({ muscle, axis, coverage: expect.any(Number) });
      expect(known / list.length).toBeGreaterThanOrEqual(0.85);
    }
  }
});

test('derivation is deterministic and side-effect free', () => {
  const sample = rows.slice(0, 25);
  for (const ex of sample) {
    const a = deriveDemandMetadata(ex);
    const b = deriveDemandMetadata(ex);
    expect(b).toEqual(a);
  }
  // Never mutates its input.
  const frozen = Object.freeze({ name: 'Barbell Bench Press', primaryMuscle: 'chest', equipment: 'barbell', movementPattern: 'push', compoundIsolation: 'compound' });
  expect(() => deriveDemandMetadata(frozen)).not.toThrow();
});

test('anchor rows derive the values the resolver depends on (pinned)', () => {
  const by = (n) => derived.find((d) => d.ex.name === n)?.meta;
  // The Q3 scenario's three axes: cannot stand / no floor / no bar grip.
  expect(by('Barbell Back Squat') ?? by('Barbell Squat')).toMatchObject({ position: 'standing', gripDemand: 'bar' });
  expect(by('Leg Press')).toMatchObject({ position: 'seated', gripDemand: 'supportive', bilateralUpper: false });
  expect(by('Pec Deck (Machine Fly)')).toMatchObject({ position: 'seated', gripDemand: 'supportive' });
  expect(by('Plank')).toMatchObject({ floorAccess: true, gripDemand: 'none' });
  expect(by('Pull-Up')).toMatchObject({ overheadPosition: true, gripDemand: 'bar', bilateralUpper: true });
  expect(by('Deadlift (Conventional)')).toMatchObject({ axialLoad: true, bilateralLower: true, gripDemand: 'bar' });
});
