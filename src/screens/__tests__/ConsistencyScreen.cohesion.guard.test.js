/**
 * Source guard for the Progress-tab cohesion sweep (R2, 2026-07-11), scoring
 * ConsistencyScreen against docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md.
 *
 * ConsistencyScreen was already fully compliant at the R2 census (it composes
 * only shared primitives: Card, EmptyState, SectionLabel, BackHeader,
 * InfoTooltip, plus the shared ProgressSections cards). This guard PINS that
 * clean baseline so a future edit cannot reintroduce a hand-rolled surface:
 *   1. No raw <Modal> and no hand-rolled TouchableOpacity (every control comes
 *      from a shared primitive).
 *   2. Headers/section labels/empties/cards go through the shared components.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ConsistencyScreen.js'), 'utf8');

describe('ConsistencyScreen cohesion census (R2)', () => {
  test('no hand-rolled raw <Modal>', () => {
    expect(SRC).not.toMatch(/<Modal[\s/>]/);
  });

  test('no hand-rolled TouchableOpacity (controls come from shared primitives)', () => {
    expect(SRC).not.toMatch(/TouchableOpacity/);
  });

  test('composes the shared header / label / empty / card primitives', () => {
    expect(SRC).toMatch(/import BackHeader from '\.\.\/components\/BackHeader'/);
    expect(SRC).toMatch(/import Card from '\.\.\/components\/Card'/);
    expect(SRC).toMatch(/import EmptyState from '\.\.\/components\/EmptyState'/);
    expect(SRC).toMatch(/import SectionLabel from '\.\.\/components\/SectionLabel'/);
    expect(SRC).toMatch(/<BackHeader title="Consistency" \/>/);
  });
});
