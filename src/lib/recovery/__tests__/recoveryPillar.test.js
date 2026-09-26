/**
 * The Recovery row on Progress (register D208). Pins the two lines it says
 * for every state of the per-muscle estimate, against a fixed clock, and
 * that it only ever describes (D204): no rest, train or wait instruction.
 */
import { buildRecoveryPillarCopy } from '../recoveryPillar';

// Friday 2026-09-25 18:00 local.
const NOW = new Date(2026, 8, 25, 18, 0, 0).getTime();
const HOUR = 3600000;
const entry = (muscle, status, readyInHours) => ({
  muscle, status, recoveredPercent: status === 'recovered' ? 100 : 40,
  readyAtMs: readyInHours == null ? null : NOW + readyInHours * HOUR,
});

describe('buildRecoveryPillarCopy', () => {
  test('loading: nothing yet, so the row shows only its label', () => {
    expect(buildRecoveryPillarCopy(undefined)).toEqual({ state: null, evidence: null });
  });

  test('a failed read says so and never reads as all clear', () => {
    for (const load of [null, { degraded: true }, { degraded: true, map: {} }]) {
      expect(buildRecoveryPillarCopy(load)).toEqual({
        state: 'Estimated recovery by muscle',
        evidence: "Couldn't load the estimate just now.",
      });
    }
  });

  test('no session in 14 days', () => {
    const load = { nowMs: NOW, map: { chest: entry('chest', 'no_recent_session', null) } };
    expect(buildRecoveryPillarCopy(load)).toEqual({
      state: 'No sessions in the last 14 days',
      evidence: "Each muscle's recovery shows here after a session.",
    });
  });

  test('everything recovered', () => {
    const load = { nowMs: NOW, map: { chest: entry('chest', 'recovered', null), back: entry('lats', 'recovered', null) } };
    expect(buildRecoveryPillarCopy(load)).toEqual({
      state: 'All muscles recovered',
      evidence: 'Estimated from your sessions in the last 14 days.',
    });
  });

  test('some still recovering: the count, and the last one with its ready-by day', () => {
    const load = {
      nowMs: NOW,
      map: {
        chest: entry('chest', 'recovering', 20),
        triceps: entry('triceps', 'nearly', 2),
        front_delts: entry('front_delts', 'recovered', null),
        lats: entry('lats', 'recovering', 60), // Monday
      },
    };
    const out = buildRecoveryPillarCopy(load);
    expect(out.state).toBe('3 muscles still recovering');
    expect(out.evidence).toMatch(/^.+ (is|are) the last, estimated ready by Monday\.$/);
  });

  test('one muscle: singular wording', () => {
    const load = { nowMs: NOW, map: { chest: entry('chest', 'recovering', 20) } };
    const out = buildRecoveryPillarCopy(load);
    expect(out.state).toBe('1 muscle still recovering');
    expect(out.evidence).toMatch(/the last, estimated ready by tomorrow\.$/);
  });

  test('describes only: no rest, train or wait instruction in any state (D204)', () => {
    const loads = [
      undefined, null,
      { nowMs: NOW, map: {} },
      { nowMs: NOW, map: { chest: entry('chest', 'recovered', null) } },
      { nowMs: NOW, map: { chest: entry('chest', 'recovering', 20) } },
    ];
    for (const load of loads) {
      const { state, evidence } = buildRecoveryPillarCopy(load);
      expect(`${state ?? ''} ${evidence ?? ''}`).not.toMatch(/\b(rest|train|wait|avoid|skip|take it easy|push)\b/i);
    }
  });
});
