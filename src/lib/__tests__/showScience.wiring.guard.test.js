/**
 * showScience.wiring.guard.test.js
 *
 * T15, comprehension-trust audit 2026-08-06
 * (docs/audit/comprehension-trust-audit-2026-08-06.md): the Settings "Show
 * the science" toggle shipped wired to NOTHING — it wrote
 * userProfile.showScience and no code ever read it, so the promised
 * bracketed technical terms could never render. This suite pins the wiring
 * against the REAL response builders in both registers, so disconnecting
 * the preference again fails a test naming the finding.
 */

import { buildCoachResponse } from '../coachResponse';
import { buildRegisteredCoachResponse, withScience } from '../coachRegister';

const output = {
  sessionsCompleted: 3,
  sessionsPlanned: 3,
  prsThisWeek: 0,
  trend: { delta: 0.2, onTarget: true },
};

describe('the Show the science preference reaches the coach copy (T15)', () => {
  test('supportive register: ON brackets the technical term, OFF stays plain', () => {
    const on = buildCoachResponse({ output, units: 'kg', showScience: true });
    expect(on.interpretation).toContain('7-day average (EWMA)');

    const off = buildCoachResponse({ output, units: 'kg', showScience: false });
    expect(off.interpretation).toContain('7-day average');
    expect(off.interpretation).not.toContain('EWMA');

    // Default is OFF: omitting the preference must equal explicit false.
    const omitted = buildCoachResponse({ output, units: 'kg' });
    expect(omitted.interpretation).toBe(off.interpretation);
  });

  test('precise register: the same opt-in flows through buildRegisteredCoachResponse', () => {
    const on = buildRegisteredCoachResponse({
      coachTone: 'precise', output, units: 'kg', showScience: true,
    });
    expect(on.register).toBe('precise');
    expect(on.interpretation).toContain('7-day average (EWMA)');

    const off = buildRegisteredCoachResponse({
      coachTone: 'precise', output, units: 'kg', showScience: false,
    });
    expect(off.interpretation).not.toContain('EWMA');
  });

  test('suppressed paths never carry the science layer (supportive base untouched)', () => {
    const suppressed = buildCoachResponse({
      output, units: 'kg', showScience: true, calmMode: true,
    });
    expect(suppressed.suppressed).toBe(true);
    expect(suppressed.interpretation ?? '').not.toContain('EWMA');
  });

  test('withScience contract: plain term always leads, technical never appears alone', () => {
    expect(withScience('7-day average', 'EWMA', true)).toBe('7-day average (EWMA)');
    expect(withScience('', 'EWMA', true)).toBe('');
    expect(withScience('7-day average', 'EWMA')).toBe('7-day average');
  });
});
