import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('BodyMetricsScreen empty-state design guard', () => {
  test('uses the shared EmptyState for the no-history branch', () => {
    expect(source).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="body-outline"[\s\S]*title="No body metrics yet"[\s\S]*formatBodyWeightShort\(onboardingWeightKg, bodyWeightUnits\)[\s\S]*Log body weight or measurements when you want this trend to start\./,
    );
    expect(source).not.toMatch(/Your progress starts here/);
    expect(source).not.toMatch(/<EmptyBodyIllustration/);
    expect(source).not.toMatch(/styles\.emptyCard/);
  });

  // EP-09/P-06 (Codex end-user-polish audit): before this fix, loadHistory()'s
  // catch block reset a rejected read straight to `setHistory([]);
  // setEwmaData([]);`, which the render below could then only ever paint as
  // "No body metrics yet" -- a load FAILURE masquerading as a genuinely empty
  // history. This suite pins that a failure is now tracked separately and
  // never wipes whatever history was already on screen.
  test('a failed history read is tracked separately and never blanks existing history', () => {
    expect(source).toMatch(/const \[historyLoadError, setHistoryLoadError\] = useState\(false\);/);
    const catchStart = source.indexOf('} catch (_e) {\n      // EP-09/P-06');
    expect(catchStart).toBeGreaterThan(-1);
    const catchEnd = source.indexOf('\n    }\n\n    // Lift data', catchStart);
    expect(catchEnd).toBeGreaterThan(catchStart);
    const catchBody = source.slice(catchStart, catchEnd);
    expect(catchBody).toMatch(/setHistoryLoadError\(true\);/);
    expect(catchBody).not.toMatch(/setHistory\(\[\]\)/);
    expect(catchBody).not.toMatch(/setEwmaData\(\[\]\)/);
  });

  test('a failed history read renders its own retryable error, ahead of the real empty state', () => {
    const idxError = source.indexOf('historyLoadError ? (');
    const idxEmpty = source.indexOf('title="No body metrics yet"');
    expect(idxError).toBeGreaterThan(-1);
    expect(idxEmpty).toBeGreaterThan(idxError);
    const errorBlock = source.slice(idxError, idxEmpty);
    expect(errorBlock).toMatch(/title="Couldn't load body metrics"/);
    expect(errorBlock).toMatch(/actionLabel="Retry"/);
    expect(errorBlock).toMatch(/onAction=\{loadHistory\}/);
  });

  test('the recomposition CTA is a contained control, not loose amber text', () => {
    // CP-10 batch G lane 1: both icons' ink resolves from the live theme;
    // the contained-neutral-chrome contract is unchanged.
    expect(source).toContain('<Ionicons name="image-outline" size={16} color={t.colors.textSecondary} />');
    expect(source).toMatch(/recompCtaRow: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(source).toContain('recompCta: { ...type.label, color: colors.textPrimary }');
    expect(source).not.toMatch(/recompCta: \{ fontSize: fontSize\.sm,[\s\S]*color: colors\.primary/);
  });

  test('the free/Pro read-only upsell card is gone (Volyume is fully free, founder decision 2026-09-03)', () => {
    expect(source).not.toMatch(/readOnlyCard/);
    expect(source).not.toMatch(/readOnlyCtaButton/);
    expect(source).not.toMatch(/readOnlyCta\b/);
    expect(source).not.toMatch(/view-only on the free plan/i);
    expect(source).not.toMatch(/Log weight again with Pro/i);
  });
});
