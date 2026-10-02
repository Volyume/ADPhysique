import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n  (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

/**
 * BodyMetricsScreen empty-state design guard.
 *
 * RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; section 6 table:
 * `BodyMetricsScreen.*` guards (emptyState)). The old file pinned the shared
 * EmptyState "No body metrics yet" (with the onboarding weight in its text), a
 * failed read that never blanked the history, and the share control as a
 * contained control. Day zero is now the This week card's own slot (item 10):
 * "Starting weight from setup: 82 kg, 3 Aug" with "Your trend starts with your
 * first morning weigh-in.", no weigh-in is made up (BM-18) and the history is
 * empty; a failed read says so under its own card and logs (item 11). Kept:
 * a failed read is tracked separately and never blanks what is on screen, and
 * the share control is a contained neutral control, not loose amber text.
 */
describe('BodyMetricsScreen day zero (item 10): no fabricated weigh-in', () => {
  test('the onboarding weight shows as what it is, in the This week card\'s slot', () => {
    expect(source).toMatch(/startingWeightLine\(\{/);
    expect(source).toMatch(/DAY_ZERO_LINE/);
    expect(source).toMatch(/'No weigh-ins yet\.'/);
    expect(source).not.toMatch(/Your progress starts here/);
    expect(source).not.toMatch(/<EmptyBodyIllustration/);
    expect(source).not.toMatch(/styles\.emptyCard/);
  });

  test('the screen writes no seed row: the only body-metric writes are the form, its edit and the legacy migration', () => {
    expect(source).not.toMatch(/Starting weight \(from onboarding\)/);
    expect(source).not.toMatch(/SEED_KEY|volyume_body_metric_seeded/);
    const loadEntries = fnBody(source, 'const loadAll = useCallback(async (weeksArg) => {');
    expect(loadEntries).not.toMatch(/logBodyMetric|logMorningWeight/);
  });

  test('day zero says nothing about records that are not there (BM-17)', () => {
    // the calm/flag line is never printed over an empty log
    const dayZero = source.slice(source.indexOf('// Day zero: no weigh-in is made up.'));
    const block = dayZero.slice(0, dayZero.indexOf('return (\n      <Card padding="lg" style={styles.card}>'));
    expect(block).not.toMatch(/policy\.line/);
  });
});

describe('BodyMetricsScreen failed reads (item 11)', () => {
  // EP-09/P-06: a rejected read must never masquerade as a genuinely empty
  // day, nor blank what was already on screen.
  test('a failed entries read is tracked separately, logged, and never blanks the entries', () => {
    expect(source).toMatch(/const \[entriesStatus, setEntriesStatus\] = useState\('loading'\);/);
    const catchStart = source.indexOf("logError('BodyMetricsScreen.loadEntries'");
    expect(catchStart).toBeGreaterThan(-1);
    const catchBody = source.slice(catchStart, catchStart + 300);
    expect(catchBody).toMatch(/setEntriesStatus\('error'\)/);
    expect(catchBody).not.toMatch(/setEntries\(\[\]\)/);
    expect(catchBody).not.toMatch(/setMorningRows\(\[\]\)/);
  });

  test('each card says so under its own title: "Couldn\'t load your ... just now."', () => {
    expect(source).toMatch(/const readErrorLine = \(what\) => `Couldn't load your \$\{what\} just now\.`;/);
    expect(source).toMatch(/errorCard\('This week', 'weigh-ins'\)/);
    expect(source).toMatch(/const heading = weighIns\.length >= 2 \? trendTitle\(windowKey\) : 'Trend';/);
    expect(source).toMatch(/errorCard\(heading, 'trend'\)/);
    expect(source).toMatch(/errorCard\('History', 'history'\)/);
    expect(source).toMatch(/readErrorLine\('maintenance estimate'\)/);
    expect(source).toMatch(/logError\('BodyMetricsScreen\.loadMaintenance'/);
  });

  test('a loading card is a skeleton in its own slot', () => {
    expect(source).toMatch(/entriesStatus === 'loading'\) return <SkeletonCard height=\{190\} \/>;/);
    expect(source).toMatch(/if \(maintenance\.status === 'loading'\) return <SkeletonCard height=\{150\} \/>;/);
  });
});

describe('BodyMetricsScreen share control', () => {
  test('the recomposition CTA is a contained control, not loose amber text', () => {
    expect(source).toContain('<Ionicons name="image-outline" size={16} color={t.colors.textSecondary} />');
    expect(source).toMatch(/shareRow: \{[\s\S]*?minHeight: touchTarget\.minimum,/); // the touch-target token, no raw dp (closing review)
    expect(source).toMatch(/shareRow: \{ borderColor: c\.border, backgroundColor: c\.surface2 \}/);
    expect(source).toMatch(/shareText: \{ \.\.\.ty\.label, color: c\.textPrimary \}/);
    expect(source).toMatch(/Create share image/);
  });

  test('the free/Pro read-only upsell card is gone (Volyume is fully free, founder decision 2026-09-03)', () => {
    expect(source).not.toMatch(/readOnlyCard/);
    expect(source).not.toMatch(/readOnlyCtaButton/);
    expect(source).not.toMatch(/readOnlyCta\b/);
    expect(source).not.toMatch(/view-only on the free plan/i);
    expect(source).not.toMatch(/Log weight again with Pro/i);
  });
});
