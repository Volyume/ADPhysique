/**
 * The Recovery row on Progress (register D208). Pins the two lines it says
 * for every state of the per-muscle estimate, against a fixed clock, and
 * that it only ever describes (D204): no rest, train or wait instruction.
 *
 * RE-ANCHORED under D214 (lane 2, RC-4 and RC-15): the headline counts the
 * muscles still RECOVERING only, the number the Recovery screen's "Still
 * recovering" group and answer line print, and names the nearly-recovered
 * ones after it; the evidence reads "Glutes will be the last to recover,
 * estimated ready by Saturday." instead of the ambiguous "the last".
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

  test('some still recovering: the recovering count, the nearly count after it, and the last muscle with its ready-by day', () => {
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
    // D214 RC-4: two muscles are RECOVERING (chest, lats); the nearly one is
    // named after the count, never inside it.
    expect(out.state).toBe('2 muscles still recovering and 1 nearly recovered');
    // D214 RC-15: "will be the last to recover", not the ambiguous "the last".
    expect(out.evidence).toBe('Lats will be the last to recover, estimated ready by Monday.');
  });

  test('the nearly muscles never count as recovering, and the last to recover may be one of them', () => {
    const load = {
      nowMs: NOW,
      map: {
        chest: entry('chest', 'recovering', 20),
        triceps: entry('triceps', 'nearly', 40),
        back: entry('back', 'recovered', null),
      },
    };
    const out = buildRecoveryPillarCopy(load);
    expect(out.state).toBe('1 muscle still recovering and 1 nearly recovered');
    expect(out.evidence).toBe('Triceps will be the last to recover, estimated ready by Sunday.');
  });

  test('only nearly-recovered muscles: the headline says so and does not invent a recovering count', () => {
    const load = {
      nowMs: NOW,
      map: { triceps: entry('triceps', 'nearly', 3), chest: entry('chest', 'nearly', 2) },
    };
    const out = buildRecoveryPillarCopy(load);
    expect(out.state).toBe('2 muscles nearly recovered');
    expect(out.state).not.toMatch(/still recovering/);
    expect(out.evidence).toBe('Triceps will be the last to recover, estimated ready later today.');
  });

  test('one muscle: singular wording', () => {
    const load = { nowMs: NOW, map: { chest: entry('chest', 'recovering', 20) } };
    const out = buildRecoveryPillarCopy(load);
    expect(out.state).toBe('1 muscle still recovering');
    expect(out.evidence).toBe('Chest will be the last to recover, estimated ready by tomorrow.');
  });

  test('describes only: no rest, train or wait instruction in any state (D204)', () => {
    const loads = [
      undefined, null,
      { nowMs: NOW, map: {} },
      { nowMs: NOW, map: { chest: entry('chest', 'recovered', null) } },
      { nowMs: NOW, map: { chest: entry('chest', 'recovering', 20) } },
      { nowMs: NOW, map: { chest: entry('chest', 'recovering', 20), back: entry('back', 'nearly', 3) } },
    ];
    for (const load of loads) {
      const { state, evidence } = buildRecoveryPillarCopy(load);
      expect(`${state ?? ''} ${evidence ?? ''}`).not.toMatch(/\b(rest|train|wait|avoid|skip|take it easy|push)\b/i);
    }
  });
});
