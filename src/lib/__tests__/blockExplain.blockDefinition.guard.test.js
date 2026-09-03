/**
 * D139 (programme creation and planning masterpass, 2026-09-03), finding:
 * "the one good block definition sat behind a tooltip on a secondary screen
 * while 'Week N of M' hid whenever the advisor was not on 'continue'".
 *
 * BLOCK_DEFINITION is the one shared source for the training-block
 * explanation, moved out of MesocycleBuilderScreen's own InfoTooltip (its
 * only home before this) so PlansScreen's active-plan card can carry the
 * same fact. Both screens must read the same constant, never a
 * re-typed copy.
 */
import fs from 'fs';
import path from 'path';
import { BLOCK_DEFINITION } from '../blockExplain';
import { BLOCK_PLANNED_WEEKS } from '../mesocycle';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

describe('BLOCK_DEFINITION: one shared training-block explanation', () => {
  test('is exported from blockExplain.js and states the real block length', () => {
    expect(typeof BLOCK_DEFINITION).toBe('string');
    expect(BLOCK_DEFINITION).toContain('A training block is the multi-week shape of your training');
    expect(BLOCK_DEFINITION).toContain(`a block of ${BLOCK_PLANNED_WEEKS} weeks`);
    expect(BLOCK_DEFINITION).toContain('Nothing rolls into a new block on its own');
  });

  test('MesocycleBuilderScreen reads the shared constant, not an inline copy', () => {
    const src = read('screens/MesocycleBuilderScreen.js');
    expect(src).toContain("import { BLOCK_DEFINITION } from '../lib/blockExplain';");
    expect(src).toContain('text={BLOCK_DEFINITION}');
    expect(src).not.toContain('A training block is the multi-week shape of your training: your weekly sets climb');
  });

  test('PlansScreen reads the same shared constant for its active-plan card tooltip', () => {
    const src = read('screens/PlansScreen.js');
    expect(src).toContain('BLOCK_DEFINITION');
    expect(src).toContain('<InfoTooltip text={BLOCK_DEFINITION} size={13} />');
  });
});
