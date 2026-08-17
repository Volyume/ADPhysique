/**
 * MesocycleBuilderScreen.noDeloadAdvisory.guard.test.js
 *
 * Campaign 24 Wave A, WAVE-A-FINDINGS.md AUTHORITY_DEFECT (Class C, :109-160)
 * and its compounding free/pro gating leak (:144-160). ActiveMesoDashboard's
 * "Deload advice banner" independently re-decided the same recovery/deload
 * judgement blockAdvisor.getBlockAdvice already owns on the Train tab, from a
 * disjoint evidence source (per-workout ratings via mesocycle.evaluateAutoReg
 * / predictDeloadWeek, vs blockAdvisor's weekly check-ins) and with no tier
 * gate, leaking adaptive coaching copy to Free. This is an ABSENCE guard:
 * the banner, its copy, its state, and its data source must never come back
 * on this screen. The lib functions in mesocycle.js are deliberately left in
 * place (production-unreferenced, a standing D37 founder-triage item) -- only
 * this screen's use of them is pinned absent, per the mesocycle.js suites
 * (mesocycle.test.js, mesocycle.f10.dst.test.js) which continue to test them
 * directly and are untouched by this change.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'MesocycleBuilderScreen.js'),
  'utf8',
);

describe('MesocycleBuilderScreen carries no independent deload/recovery advisory (Wave A)', () => {
  test('never imports or calls evaluateAutoReg/predictDeloadWeek', () => {
    expect(SOURCE).not.toMatch(/import\s*\{[^}]*evaluateAutoReg[^}]*\}\s*from\s*'\.\.\/lib\/mesocycle'/);
    expect(SOURCE).not.toMatch(/import\s*\{[^}]*predictDeloadWeek[^}]*\}\s*from\s*'\.\.\/lib\/mesocycle'/);
    expect(SOURCE).not.toContain('evaluateAutoReg(');
    expect(SOURCE).not.toContain('predictDeloadWeek(');
  });

  test('never carries the deload advisory state, copy or banner JSX', () => {
    expect(SOURCE).not.toContain('autoReg');
    expect(SOURCE).not.toContain('deloadPrediction');
    expect(SOURCE).not.toContain('deloadCopy');
    expect(SOURCE).not.toContain('Deload advice banner');
    expect(SOURCE).not.toContain('Your body is signalling it needs a lighter week');
    expect(SOURCE).not.toMatch(/A lighter week is likely in about/);
    expect(SOURCE).not.toContain('deloadBanner');
  });

  test('never builds a per-workout feedback window (the removed advisory\'s only consumer)', () => {
    expect(SOURCE).not.toContain('feedbackWindow');
    expect(SOURCE).not.toContain('sessionDifficulty');
    expect(SOURCE).not.toContain('overallPump');
    expect(SOURCE).not.toContain('soreness24hBefore');
    expect(SOURCE).not.toContain('jointDiscomfort');
  });

  test('the factual recovery EMA and tonnage bars stay (class A display, unaffected)', () => {
    expect(SOURCE).toContain('computeRecoveryEMAs');
    expect(SOURCE).toContain('calculateTonnage');
  });
});
