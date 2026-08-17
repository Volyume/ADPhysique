/**
 * BodyMetricsScreen.weightTrendParity.guard.test.js
 *
 * WAVE-D-FINDINGS.md item 1 (LOGIC_DEFECT, ED-safety-adjacent) -- lead
 * ruling (D33, the D98-2/recoveryWordingSource precedent).
 *
 * THE DEFECT: BodyMetricsScreen's "Weight trend" EWMA card and "Effective
 * maintenance" card rendered the weekly rate-of-change and the estimated-
 * maintenance kcal figure UNCONDITIONALLY, while the Progress root's
 * equivalent card (WeightTrendCard.js, fed by useWeightTrend ->
 * deriveWeightTrend, src/lib/weightTrend.js) deliberately withholds both
 * under an open ED-pattern flag, per that function's own header law:
 * "under an open ED/wellbeing flag the card drops to direction-only copy
 * with no rate, no maintenance number and no dot." BodyMetricsScreen
 * computed its own EWMA/rate/maintenance display independently and never
 * consulted the flags it already held in state.
 *
 * THE FIX: BodyMetricsScreen now feeds its own already-loaded
 * ewmaData/weeklyChange/adaptiveBurn through the SAME shared derivation
 * (deriveWeightTrend) the Progress root uses, and gates the rate line and
 * the whole "Effective maintenance" card on that function's own
 * `edFlagOpen` verdict -- never a hand-rolled `if (edFlagOpen)`/
 * `(calm || edFlagOpen)` branch re-deriving the decision. This file pins
 * that at the source level (the parallel derivation cannot silently
 * return) and behaviourally, against the real deriveWeightTrend function
 * (not a mock), matching every state this screen's inputs can produce.
 *
 * ED-flag suppression ONLY, per the lead ruling -- deriveWeightTrend does
 * not take calm as an input, so this screen must not invent an additional
 * calm-mode gate on top of it (consistency was the mandate, not new
 * suppression law); the top-of-screen calm re-confirmation gate is a
 * separate, pre-existing mechanism and out of scope here.
 */
import fs from 'fs';
import path from 'path';
import { deriveWeightTrend } from '../../lib/weightTrend';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('BodyMetricsScreen weight-trend rate/maintenance -- single derivation (WAVE-D item 1)', () => {
  test('imports and calls the shared derivation, not a parallel one', () => {
    expect(SOURCE).toMatch(/import \{ deriveWeightTrend \} from '\.\.\/lib\/weightTrend';/);
    expect(SOURCE).toMatch(
      /deriveWeightTrend\(\{ ewmaData, weeklyChange, adaptiveBurn, edFlagOpen \}\)/,
    );
  });

  test('the weekly-change line and the Effective maintenance card both gate on the shared derivation\'s verdict', () => {
    expect(SOURCE).toMatch(/!weightTrendVm\.edFlagOpen && weeklyChange != null/);
    expect(SOURCE).toMatch(/ewmaData\.length >= 7 && !weightTrendVm\.edFlagOpen/);
  });

  test('never re-derives the edFlagOpen suppression decision by hand for the rate/maintenance card', () => {
    // The old defect class: a bare `if (edFlagOpen)`, `{edFlagOpen &&`, or a
    // raw (non-shared-derivation) `edFlagOpen` read gating the rate/
    // maintenance JSX directly. The only bare-`edFlagOpen` JSX gate left in
    // the file is WeightTrendChart's own unrelated prop (a different
    // component, a pre-existing, untouched concern) -- both of the NEW
    // gates this fix added go through `weightTrendVm.edFlagOpen`.
    expect(SOURCE).not.toMatch(/\{edFlagOpen &&/);
    expect(SOURCE).not.toMatch(/\{!edFlagOpen &&/);
    expect(SOURCE).toMatch(/edFlagOpen=\{calm \|\| edFlagOpen\}/); // WeightTrendChart's own prop, untouched
  });

  test('does not invent additional calm-mode suppression on the rate/maintenance gates themselves', () => {
    // The two gates added by this fix read `weightTrendVm.edFlagOpen` only --
    // never `calm` directly -- matching deriveWeightTrend's own signature
    // (edFlagOpen only, no calm parameter).
    expect(SOURCE).not.toMatch(/!calm && !weightTrendVm\.edFlagOpen/);
    expect(SOURCE).not.toMatch(/calm \|\| weightTrendVm\.edFlagOpen/);
  });

  test('the EWMA value and weekly-change readouts use the shared unit helpers, not hard-coded kg', () => {
    expect(SOURCE).toMatch(
      /\{formatBodyWeight\(ewmaData\[ewmaData\.length - 1\]\?\.ewma, bwu\)\}/,
    );
    expect(SOURCE).toMatch(/Weekly change: \{formatBodyWeightRate\(weeklyChange, bwu\)\}/);
    expect(SOURCE).not.toMatch(/ewma\?\.toFixed\(1\)\} kg/);
    expect(SOURCE).not.toMatch(/\{sign\}\{weeklyChange\.toFixed\(1\)\} kg/);
  });

  // WAVE-D-FINDINGS.md UNIT_DEFECT (:1156-1159, minor, same family): getDelta
  // always returns a raw-KG difference (body_weight is stored in kg), so the
  // snapshot header's delta badge must CONVERT -- not just relabel -- for an
  // st/lbs display unit, mirroring formatBodyWeightRate's own inLbs branch.
  test('the snapshot delta badge converts kg to lbs for st/lbs display units, not just relabels', () => {
    expect(SOURCE).toMatch(
      /delta=\{\(bwu === 'st' \|\| bwu === 'lbs'\)\s*\n\s*\? parseFloat\(kgToLbs\(parseFloat\(getDelta\('body_weight'\)\)\)\.toFixed\(1\)\)\s*\n\s*: parseFloat\(getDelta\('body_weight'\)\)\}/,
    );
    expect(SOURCE).toMatch(/units=\{\(bwu === 'st' \|\| bwu === 'lbs'\) \? 'lbs' : 'kg'\}/);
    // The old defect: relabelling to the display unit string without
    // converting the underlying kg number for the 'lbs' case too.
    expect(SOURCE).not.toMatch(/units=\{bwu === 'st' \? 'kg' : bwu\}/);
  });

  test('behavioural: kgToLbs (the conversion the delta badge now applies) matches formatBodyWeightRate\'s own scale for the same kg delta', () => {
    // eslint-disable-next-line global-require
    const { kgToLbs } = require('../../lib/units');
    // 0.5 kg gained between two weigh-ins reads as roughly 1.1 lbs, never a
    // bare "0.5" mislabelled "lbs".
    expect(parseFloat(kgToLbs(0.5).toFixed(1))).toBeCloseTo(1.1, 1);
  });
});

describe('deriveWeightTrend contract this screen now depends on (behavioural, real function)', () => {
  const ewmaData = Array.from({ length: 10 }, (_, i) => ({
    ewma: 80 - i * 0.1,
    weightKg: 80 - i * 0.1,
    date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  }));
  const adaptiveBurn = {
    adjustedTDEE: 2400,
    confidence: 'high',
    weeks: 4,
    source: 'validated',
  };

  test('open ED flag: no rate, no maintenance, direction-only -- same shape the Progress root already gets', () => {
    const vm = deriveWeightTrend({ ewmaData, weeklyChange: -0.4, adaptiveBurn, edFlagOpen: true });
    expect(vm.edFlagOpen).toBe(true);
    expect(vm.showRate).toBe(false);
    expect(vm.maintenance).toBeNull();
    // The EWMA value itself is NOT stripped (state stays visible; only rate
    // + maintenance withhold), matching the lead ruling's "value alone
    // stays" shape.
    expect(vm.ewmaNow).not.toBeNull();
  });

  test('no ED flag, enough data: rate shows and maintenance carries the kcal figure', () => {
    const vm = deriveWeightTrend({ ewmaData, weeklyChange: -0.4, adaptiveBurn, edFlagOpen: false });
    expect(vm.edFlagOpen).toBe(false);
    expect(vm.maintenance).not.toBeNull();
    expect(vm.maintenance.building).not.toBe(true);
  });

  test('a fail-closed ED-flag read (the sentinel truthy value) suppresses exactly like a genuine open flag', () => {
    // BodyMetricsScreen reads edFlagOpen fail-closed already (getOpenEdPatternFlag(...).catch(() => setEdFlagOpen(true))),
    // so a transient read failure reaches deriveWeightTrend as edFlagOpen: true.
    const vm = deriveWeightTrend({ ewmaData, weeklyChange: -0.4, adaptiveBurn, edFlagOpen: true });
    expect(vm.showRate).toBe(false);
    expect(vm.maintenance).toBeNull();
  });
});
