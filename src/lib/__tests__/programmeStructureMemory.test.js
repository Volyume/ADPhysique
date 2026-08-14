/**
 * programmeStructureMemory.test.js — Campaign 18 job C.
 *
 * "A MATURE ATHLETE'S SUCCESSFUL PROGRAMME HISTORY SHOULD MATTER WHEN VOLYUME
 * NEXT HAS TO CHOOSE PROGRAMME STRUCTURE."
 *
 * And the four constraints that keep that from becoming churn:
 *   C4 explicit user constraints remain senior
 *   C5 division intent remains senior
 *   C6 a new athlete has no fake memory
 *   C7 failure is remembered too, and attributed conservatively
 *
 * WHAT THIS SUITE PINS. The founder's four production cases, and the two
 * seniority rules, against the real generator.
 */
import {
  MIN_BLOCKS_FOR_STRUCTURE, STRUCTURE_ADHERENCE_MIN,
  structureKey, structureEvidence, demonstratedStructure, structureMemoryCopy,
} from '../programmeStructureMemory';
import { generatePlan } from '../planEngine';

const sig = (splitType, dayCount) => ({ splitType, dayCount });
const block = (splitType, dayCount, over = {}) => ({
  signature: sig(splitType, dayCount),
  completed: true, adherenceRatio: 0.9, productive: true,
  structuralProblem: false, recoveryAcceptable: true,
  ...over,
});

describe('what counts as demonstrated', () => {
  test('the key is the SHAPE of the week, never the exercises in it', () => {
    expect(structureKey({ splitType: 'upper_lower', dayCount: 4, exercises: ['a', 'b'] })).toBe('upper_lower|4');
    expect(structureKey({ splitType: null, dayCount: 4 })).toBeNull();
    expect(structureKey(null)).toBeNull();
  });

  test('CASE G: three-plus productive blocks on one structure is personal evidence', () => {
    const ev = structureEvidence(Array.from({ length: 3 }, () => block('upper_lower', 4)));
    const d = demonstratedStructure(ev, { daysPerWeek: 4 });
    expect(d.splitType).toBe('upper_lower');
    expect(d.blocks).toBe(3);
    expect(d.productive).toBe(3);
  });

  test('CASE I: a NEW athlete has no memory at all, and none is invented', () => {
    expect(demonstratedStructure(structureEvidence([]), { daysPerWeek: 4 })).toBeNull();
    const oneBlock = structureEvidence([block('upper_lower', 4)]);
    expect(demonstratedStructure(oneBlock, { daysPerWeek: 4 })).toBeNull();
  });

  test('one good block is not proof: the minimum is a real threshold', () => {
    const nearly = structureEvidence(
      Array.from({ length: MIN_BLOCKS_FOR_STRUCTURE - 1 }, () => block('upper_lower', 4)),
    );
    expect(demonstratedStructure(nearly, { daysPerWeek: 4 })).toBeNull();
  });

  test('A BLOCK THAT WAS NOT RUN SAYS NOTHING about the structure it was written on', () => {
    const unrun = structureEvidence(
      Array.from({ length: 4 }, () => block('upper_lower', 4, { adherenceRatio: STRUCTURE_ADHERENCE_MIN - 0.2 })),
    );
    expect(demonstratedStructure(unrun, { daysPerWeek: 4 })).toBeNull();
  });

  test('CASE H: CURRENT CONSTRAINTS ARE SENIOR - four days does not answer three', () => {
    const ev = structureEvidence(Array.from({ length: 4 }, () => block('upper_lower', 4)));
    expect(demonstratedStructure(ev, { daysPerWeek: 4 })).toBeTruthy();
    // The athlete now trains three days. The old structure is not overridden;
    // it is not eligible.
    expect(demonstratedStructure(ev, { daysPerWeek: 3 })).toBeNull();
  });

  test('CASE J: a structure whose own history is trouble is NOT reproduced', () => {
    const bad = structureEvidence([
      block('ppl', 6, { structuralProblem: true }),
      block('ppl', 6, { structuralProblem: true }),
      block('ppl', 6, { structuralProblem: true }),
      block('ppl', 6),
    ]);
    expect(demonstratedStructure(bad, { daysPerWeek: 6 })).toBeNull();
  });

  test('C7: a missed session is NOT attributed to the structure', () => {
    // structuralProblem is set deliberately by the caller; poor adherence
    // alone drops the block from evidence rather than condemning the split.
    // Poor adherence drops the block from evidence ENTIRELY rather than
    // condemning the split, so nothing is learned against it either way.
    const missed = structureEvidence(
      Array.from({ length: 4 }, () => block('upper_lower', 4, { adherenceRatio: 0.5 })),
    );
    expect(missed.size).toBe(0);
  });

  test('the athlete is offered the structure they were most PRODUCTIVE on', () => {
    const ev = structureEvidence([
      ...Array.from({ length: 3 }, () => block('upper_lower', 4)),
      ...Array.from({ length: 4 }, () => block('ppl', 4, { productive: false })),
    ]);
    expect(demonstratedStructure(ev, { daysPerWeek: 4 }).splitType).toBe('upper_lower');
  });
});

describe('THE REAL GENERATOR uses it, and division intent stays senior', () => {
  const base = {
    experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60,
    equipment: 'full_gym', recoveryRating: 'average',
  };

  test('CASE I: a new athlete gets the template-derived split', () => {
    const plain = generatePlan({ ...base, goal: 'general' });
    const nullMemory = generatePlan({ ...base, goal: 'general', demonstratedSplit: null });
    expect(nullMemory.splitType).toBe(plain.splitType);
  });

  test('CASE G: a demonstrated split reaches the ACTUAL generated programme', () => {
    const plain = generatePlan({ ...base, goal: 'general' });
    const remembered = generatePlan({ ...base, goal: 'general', demonstratedSplit: 'full_body' });
    expect(remembered.splitType).toBe('full_body');
    expect(remembered.splitType).not.toBe(plain.splitType);
    // And it built a real programme from it, not just a label.
    expect(remembered.workouts.length).toBeGreaterThan(0);
  });

  test('C5: DIVISION INTENT IS SENIOR - a matrix division ignores the memory', () => {
    const divisions = ['mens_physique', 'bikini', 'classic_physique'];
    for (const goal of divisions) {
      const plain = generatePlan({ ...base, goal });
      const withMemory = generatePlan({ ...base, goal, demonstratedSplit: 'full_body' });
      // If this division is matrix-driven, the memory changed nothing.
      if (plain.splitType !== 'full_body') {
        expect(withMemory.splitType).toBe(plain.splitType);
      }
    }
  });

  test('a split this engine cannot build is ignored rather than trusted', () => {
    const plain = generatePlan({ ...base, goal: 'general' });
    const nonsense = generatePlan({ ...base, goal: 'general', demonstratedSplit: 'moon_phase_split' });
    expect(nonsense.splitType).toBe(plain.splitType);
  });
});

describe('THE PRODUCTION PATH', () => {
  // eslint-disable-next-line global-require
  const read = (p) => require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, p), 'utf8',
  );

  test('the gatherer reads Campaign 16\'s OWN signatures, not a second history', () => {
    const src = read('../planAutoGen.js');
    expect(src).toMatch(/export async function readDemonstratedStructure/);
    expect(src).toMatch(/ledger\?\.programmeSignature/);
    expect(src).toMatch(/getAllMesocycles/);
    // Adherence decides whether a block counts.
    expect(src).toMatch(/adherenceRatio: planned \?/);
  });

  test('and it reaches the real generator call', () => {
    const src = read('../planAutoGen.js');
    expect(src).toMatch(/plan = generatePlan\(\{\s*\n\s*\.\.\.inputs,\s*\n\s*demonstratedSplit,/);
  });

  test('a read failure means NO memory, never a blocked rebuild', () => {
    const src = read('../planAutoGen.js');
    expect(src).toMatch(/catch \(_\) \{ demonstratedSplit = null; \}/);
  });

  test('THE USER IS TOLD their own history shaped it', () => {
    const screen = read('../../screens/PlanUpdateScreen.js');
    expect(screen).toMatch(/planResult\.structureMemory/);
    expect(screen).toMatch(/structureMemoryCopy\(planResult\.structureMemory/);
  });

  test('and the copy names the evidence, not the algorithm', () => {
    const copy = structureMemoryCopy({ blocks: 4, splitType: 'upper_lower' }, 'Upper / Lower');
    expect(copy).toBe('You have trained well on a Upper / Lower across 4 blocks, so we have started from that rather than from a default.');
    expect(copy).not.toMatch(/signature|epoch|algorithm|score/i);
    expect(copy).not.toContain('—');
  });
});
