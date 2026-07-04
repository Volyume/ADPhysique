/**
 * RollingNumber commission guard (E15 element 4 + E9 count-ups, approved
 * 2026-07-02; docs/decisions-2026-07-02-e15-e8-e9.md). Pins:
 *   - the HARD ED RULE (03b): the body-weight number NEVER ticks. The
 *     weight surfaces must not reference RollingNumber, ever — not under a
 *     flag, not under calm mode. Absolute.
 *   - the commissioned surfaces are exactly WorkoutSummary, MacroRings
 *     (Diary remaining-kcal hero) and Analytics; anywhere else is scope
 *     creep to re-decide with the founder first.
 *   - the two JS-thread counters the primitive retires stay retired: no
 *     requestAnimationFrame counter in WorkoutSummary, no Animated.Value
 *     listener in MacroRings.
 *   - Reduce Motion renders a static final value (the component's contract).
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const relPath = (p) => path.relative(root, p).split(path.sep).join('/');

const WEIGHT_SURFACES = [
  'src/components/WeightTrendCard.js',
  'src/screens/BodyMetricsScreen.js',
  'src/components/TodayStrip.js',
];

const COMMISSIONED = [
  'src/screens/WorkoutSummaryScreen.js',
  'src/components/food/MacroRings.js',
  'src/screens/AnalyticsScreen.js',
  // Partner shared-streak hero (DESIGN-SPEC B2, orchestrator-fixed 2026-07-03):
  // the "N weeks running, together" count on PartnerScreen is a deliberately
  // commissioned RollingNumber surface — the sanctioned streak-increment roll.
  // The hard ED rule is untouched: no weight number ticks here.
  'src/screens/PartnerScreen.js',
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

describe('RollingNumber: the body-weight number never ticks (hard ED rule)', () => {
  test.each(WEIGHT_SURFACES.filter((f) => fs.existsSync(path.join(root, f))))(
    '%s does not reference RollingNumber',
    (rel) => {
      expect(read(rel)).not.toMatch(/RollingNumber/);
    },
  );
});

describe('RollingNumber: commissioned surfaces only', () => {
  test('importers are exactly the three approved surfaces', () => {
    const importers = walk(path.join(root, 'src'))
      .filter((p) => !p.endsWith(`components${path.sep}RollingNumber.js`))
      .filter((p) => /from '.*RollingNumber'/.test(fs.readFileSync(p, 'utf8')))
      .map(relPath)
      .sort();
    expect(importers).toEqual([...COMMISSIONED].sort());
  });

  test('the retired JS-thread counters stay retired', () => {
    const summary = read('src/screens/WorkoutSummaryScreen.js');
    expect(summary).not.toMatch(/requestAnimationFrame\(step\)/);
    const rings = read('src/components/food/MacroRings.js');
    expect(rings).not.toMatch(/addListener/);
    expect(rings).not.toMatch(/from 'react-native'.*Animated|Animated.*from 'react-native'/);
  });

  test('StartGlow is fully removed: no component file, no importers (founder 2026-07-03)', () => {
    expect(fs.existsSync(path.join(root, 'src/components/StartGlow.js'))).toBe(false);
    const importers = walk(path.join(root, 'src'))
      .filter((p) => /from '.*StartGlow'/.test(fs.readFileSync(p, 'utf8')))
      .map(relPath);
    expect(importers).toEqual([]);
  });

  test('Reduce Motion renders a static Text with the final value', () => {
    const src = read('src/components/RollingNumber.js');
    expect(src).toMatch(/if \(reduceMotion\) \{\s*\n\s*return <Text/);
  });
});
