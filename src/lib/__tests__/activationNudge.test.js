/**
 * activationNudge.js — the staged early-activation lever (S6).
 *
 * Pins the stage state machine (which stall a user is in, and when the nudge
 * should fire), the hard window stop (an elapsed activation window is never
 * chased), mutual exclusivity (at most one stage pending), and the copy rules
 * (forward-looking, never shaming, British English, no em dash).
 */
import {
  resolveActivationNudge,
  activationNudgePush,
  activationBannerLine,
  NUDGE_STAGE,
  COLD_START_GAP_DAYS,
  STALL_GAP_DAYS,
  NUDGE_GRACE_DAYS,
} from '../activationNudge';
import { ACTIVATION_WINDOW_DAYS } from '../activation';

const DAY = 86400000;
const CREATED = 1_700_000_000_000;
const at = (d) => CREATED + d * DAY;

describe('resolveActivationNudge (S6 stages)', () => {
  test('unknowable inputs return null', () => {
    expect(resolveActivationNudge({ accountCreatedAtMs: null, completedStartedAtMs: [], nowMs: at(1) })).toBeNull();
    expect(resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [], nowMs: null })).toBeNull();
    expect(resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [], nowMs: CREATED - DAY })).toBeNull();
    expect(resolveActivationNudge()).toBeNull();
  });

  test('0 sessions -> cold_start, anchored on account creation', () => {
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [], nowMs: at(1) });
    expect(r).toEqual({ stage: NUDGE_STAGE.COLD_START, fireAtMs: at(COLD_START_GAP_DAYS) });
  });

  test('1 session -> stalled_1, anchored on that session + stall gap', () => {
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(2)], nowMs: at(3) });
    expect(r).toEqual({ stage: NUDGE_STAGE.STALLED_1, fireAtMs: at(2 + STALL_GAP_DAYS) });
  });

  test('2 sessions -> stalled_2, anchored on the SECOND session + stall gap', () => {
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(2), at(5)], nowMs: at(6) });
    expect(r).toEqual({ stage: NUDGE_STAGE.STALLED_2, fireAtMs: at(5 + STALL_GAP_DAYS) });
  });

  test('unsorted session input is handled (2nd = latest, not last in the array)', () => {
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(5), at(2)], nowMs: at(6) });
    expect(r.fireAtMs).toBe(at(5 + STALL_GAP_DAYS));
  });

  test('3+ sessions -> null (activated, silence)', () => {
    expect(resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(1), at(3), at(6)], nowMs: at(7) })).toBeNull();
  });

  test('only one stage is ever pending (a function of the current count)', () => {
    // exactly one session -> stalled_1, never also cold_start
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(1)], nowMs: at(9) });
    expect(r.stage).toBe(NUDGE_STAGE.STALLED_1);
  });

  test('sessions outside the 14-day window do not count toward the stage', () => {
    // a session on day 20 is out of window -> still 0 in-window -> cold_start
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(20)], nowMs: at(21) });
    expect(r.stage).toBe(NUDGE_STAGE.COLD_START);
  });

  test('window is half-open: a session at exactly +14d does not count', () => {
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(ACTIVATION_WINDOW_DAYS)], nowMs: at(15) });
    expect(r.stage).toBe(NUDGE_STAGE.COLD_START);
  });

  test('an elapsed window is never chased (fire time past window + grace -> null)', () => {
    // two in-window sessions, the 2nd late enough (day 13.5) that + the stall gap
    // overshoots the day-(14+3) hard stop
    const secondSession = at(ACTIVATION_WINDOW_DAYS - 0.5);
    const r = resolveActivationNudge({
      accountCreatedAtMs: CREATED,
      completedStartedAtMs: [at(1), secondSession],
      nowMs: at(ACTIVATION_WINDOW_DAYS + NUDGE_GRACE_DAYS + 1),
    });
    expect(r).toBeNull();
  });

  test('a stall whose anchored fire time is already past is returned as-is (scheduler SKIPS it, never chases)', () => {
    // 1 session on day 2, now day 10: anchor day 6 is in the past but within window.
    // The resolver returns the anchored (past) fireAtMs; the scheduler skips a
    // past slot so it is never re-laid -- the single-shot rule.
    const r = resolveActivationNudge({ accountCreatedAtMs: CREATED, completedStartedAtMs: [at(2)], nowMs: at(10) });
    expect(r).toEqual({ stage: NUDGE_STAGE.STALLED_1, fireAtMs: at(2 + STALL_GAP_DAYS) });
    expect(r.fireAtMs).toBeLessThan(at(10));
  });
});

describe('activation nudge copy (S6)', () => {
  const STAGES = [NUDGE_STAGE.COLD_START, NUDGE_STAGE.STALLED_1, NUDGE_STAGE.STALLED_2];

  test('every stage has push + banner copy; unknown stage -> null', () => {
    for (const s of STAGES) {
      expect(activationNudgePush(s)).toEqual(expect.objectContaining({ title: expect.any(String), body: expect.any(String) }));
      expect(activationBannerLine(s)).toEqual(expect.objectContaining({ title: expect.any(String), body: expect.any(String) }));
    }
    expect(activationNudgePush('nope')).toBeNull();
    expect(activationBannerLine('nope')).toBeNull();
  });

  test('the first-name suffix is appended to the push title, not the body', () => {
    const p = activationNudgePush(NUDGE_STAGE.STALLED_1, ', Allan');
    expect(p.title).toContain(', Allan');
    expect(p.body).not.toContain('Allan');
  });

  test('no shame, no pressure, no streak language anywhere in the copy', () => {
    const banned = /you missed|missed|behind|fail|failure|lazy|guilt|should have|shouldn't|don't stop|streak|broke|slipping/i;
    for (const s of STAGES) {
      for (const copy of [activationNudgePush(s), activationBannerLine(s)]) {
        expect(`${copy.title} ${copy.body}`).not.toMatch(banned);
      }
    }
  });

  test('British English convention: no em dash in any user-facing string', () => {
    for (const s of STAGES) {
      for (const copy of [activationNudgePush(s), activationBannerLine(s)]) {
        expect(`${copy.title} ${copy.body}`).not.toContain('—');
      }
    }
  });
});
