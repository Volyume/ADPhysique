/**
 * Campaign 21 Step 11 — regression pins for the four confirmed production
 * defects surfaced by the temporal/property sweep (class B, all fixed with
 * the smallest authoritative change; see the campaign folder's final
 * handover for the triage record):
 *
 *   Finding 3: the EWMA trend double-learned same-day duplicate weigh-ins
 *     (both variants), against the codebase's own one-weight-truth-per-
 *     local-day convention (C10C confidence gate, canonicalWeightEvidence).
 *     The nutritionEngine variant additionally smoothed in INPUT order.
 *   Finding 5: the weekly-coach weigh-in windows bounded the past only, so
 *     a clock-skewed future-dated row could become the trend's "latest"
 *     point or inflate the confidence day-count (weakening the data hold).
 *   Finding 6: livePrescription's 45-day recency bound accepted
 *     future-dated sessions as comparable (negative gap).
 *   Finding 7: computeVolumeApply let a non-numeric planned_sets survive
 *     as string-concatenation junk in its output.
 *
 * Every fix moves in the conservative direction only: fewer rows counted,
 * holds fire more often, junk rows hold instead of polluting.
 */
import { computeEWMA as coachEWMA, computeWeeklyTrendPct } from '../weeklyCoach';
import { computeEWMA as dietEWMA } from '../nutritionEngine';
import { assembleEvidencePacket } from '../livePrescription';
import { computeVolumeApply } from '../coachApply';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 16, 12, 0, 0);

const w = (daysAgo, kg, hourOffset = 8) => ({
  loggedAt: NOW - daysAgo * DAY - (12 - hourOffset) * 3_600_000,
  weightKg: kg,
});

describe('finding 3: one weight truth per local day in BOTH EWMA variants', () => {
  test('a same-day duplicate weigh-in does not shift the coach trend (latest of the day wins)', () => {
    const base = [w(3, 80), w(2, 80), w(1, 80), w(0, 80)];
    const withDup = [...base, { ...w(1, 70), loggedAt: base[2].loggedAt - 3_600_000 }];
    // The duplicate is EARLIER in its day, so the day's later 80 kg row
    // wins and the series is identical to the clean one.
    expect(coachEWMA(withDup)).toEqual(coachEWMA(base));
    expect(dietEWMA(withDup).map((p) => p.ewma)).toEqual(dietEWMA(base).map((p) => p.ewma));
  });

  test('when the duplicate is the LATER row of its day, it IS the day truth (canonical semantics, not row deletion)', () => {
    const base = [w(2, 80), w(1, 80), w(0, 80)];
    const laterDup = { ...w(1, 79), loggedAt: base[1].loggedAt + 3_600_000 };
    const series = coachEWMA([...base, laterDup]);
    expect(series).toHaveLength(3);
    expect(series[1].rawKg).toBe(79);
  });

  test('diet-planning EWMA smooths in chronological order regardless of input order', () => {
    const rows = [w(0, 81), w(3, 80), w(1, 80.5), w(2, 80.2)];
    const shuffled = [rows[2], rows[0], rows[3], rows[1]];
    expect(dietEWMA(rows).map((p) => p.ewma)).toEqual(dietEWMA(shuffled).map((p) => p.ewma));
  });
});

describe('finding 5: future-dated weigh-ins are excluded from the coach windows', () => {
  test('a future-dated row can never become the trend\'s latest point', () => {
    const past = [w(6, 80), w(4, 80), w(2, 80), w(1, 80)];
    const future = { loggedAt: NOW + 2 * DAY, weightKg: 60 };
    const clean = computeWeeklyTrendPct(past, null, NOW);
    const skewed = computeWeeklyTrendPct([...past, future], null, NOW);
    expect(skewed).toBe(clean);
  });
});

describe('finding 6: a future-dated session is never comparable evidence', () => {
  const session = (at) => ({
    at,
    sets: [{ exerciseId: 'ex1', setType: 'straight', weight: 80, actualReps: 10, setNumber: 1, targetRepsMin: 8, targetRepsMax: 12, createdAt: at }],
  });

  test('past session comparable, future session reference-only', () => {
    const packet = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps' },
      prescription: { repsMin: 8, repsMax: 12 },
      rawHistory: [session(NOW + 3 * DAY), session(NOW - 7 * DAY)],
      now: NOW,
    });
    const flags = packet.history.map((s) => s.comparable);
    expect(flags).toContain(true);
    const futureSession = packet.history.find((s) => s.at > NOW);
    expect(futureSession.comparable).toBe(false);
  });
});

describe('finding 7: a non-numeric planned_sets holds its row instead of emitting junk', () => {
  test('string planned_sets rows are skipped; numeric rows still apply', () => {
    const out = computeVolumeApply(
      [
        { muscle: 'chest', planned_sets: 'twelve', mev: 6, mav: 14, mrv: 22 },
        { muscle: 'back', planned_sets: 12, mev: 8, mav: 16, mrv: 25 },
      ],
      1,
    );
    expect(out).toHaveLength(1);
    expect(out[0].muscle).toBe('back');
    expect(out[0].plannedSets).toBe(13);
  });
});
