/**
 * useWeightTrend — the single read surface for COMP-004's "Your trend" card.
 *
 * Reads the last 90 morning weights, smooths them (the same EWMA the burn
 * card uses), derives the weekly rate and the adaptive maintenance estimate
 * from the existing nutritionEngine functions, checks for an open ED flag,
 * and hands the lot to the pure deriveWeightTrend view-model builder.
 *
 * Offline-first: every read is local SQLite. No new DB function — it uses the
 * existing getMorningWeights(userId, 90), which is the 90-day window the
 * adaptive-TDEE path needs (the production 14-day window caps confidence at
 * 'low'; this hook intentionally takes the wider window so the maintenance
 * estimate can firm up as COMP-026's prerequisite lands).
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMorningWeights, getNutritionTargets, getOpenEdPatternFlag, getLatestCoachOutput } from '../lib/database';
import { getRecentIntakeSummary } from '../lib/food/db';
import { computeEWMA, computeWeeklyWeightChange, computeAdaptiveTDEEAdjustment } from '../lib/nutritionEngine';
import { deriveWeightTrend } from '../lib/weightTrend';

const EMPTY = { render: false, state: 0, ewmaData: [], rawData: [], loading: true };

export default function useWeightTrend(userId) {
  const [result, setResult] = useState(EMPTY);

  const load = useCallback(async () => {
    if (!userId) {
      setResult({ ...EMPTY, loading: false });
      return;
    }
    try {
      const [weights, targets, recentIntake, edFlag, lastCoach] = await Promise.all([
        getMorningWeights(userId, 90),
        getNutritionTargets(userId).catch(() => null),
        getRecentIntakeSummary(userId).catch(() => null),
        // ED-safety, fail CLOSED: a transient flag read maps to the truthy
        // 'read_failed' sentinel (edFlagOpen: !!edFlag below), so the rate /
        // maintenance / step-trend suppression holds on a read error.
        getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
        getLatestCoachOutput(userId).catch(() => null),
      ]);

      // C6 R-2 (D97-22): getMorningWeights(90) is ninety ROWS of any age,
      // not ninety days, so after a long absence the card rendered a
      // months-old trend as current ("-0.42 kg/week ... From 8 weeks of
      // data") while the coach - clock-anchored since R-1 - held for lack
      // of recent data. The display surface now shares the decision
      // surface's truth: only weigh-ins from the real trailing 90 days
      // count, so a returning user's card drops to the honest sparse or
      // building state instead of narrating the gap as a live trend.
      const windowStart = Date.now() - 90 * 86400000;
      let windowed = (weights || []).filter(
        (w) => Number.isFinite(Number(w?.loggedAt)) && Number(w.loggedAt) >= windowStart,
      );
      // C6 RB6-1 (D97-25): the 90-day window alone still rendered a full
      // present-tense trend at a 2-week or 1-month return (pre-gap rows
      // are inside the window), while the coach on the SAME rows said
      // "Log morning weight" - the exact divergence R-2 was ruled to
      // remove. The card now also requires a reading inside the 14-day
      // detraining boundary; without one it drops to its honest early
      // state until the user weighs in again.
      const newestMs = windowed.reduce((m, w) => Math.max(m, Number(w.loggedAt)), 0);
      if (!(newestMs >= Date.now() - 14 * 86400000)) windowed = [];
      const ewmaData = computeEWMA(windowed);
      const weeklyChange = computeWeeklyWeightChange(ewmaData);

      const prescribedKcal = targets?.targetKcal ?? null;
      const currentTDEEEstimate = targets?.tdee ?? targets?.maintenanceKcal ?? null;
      const adherenceFactor = recentIntake?.avgKcal && prescribedKcal
        ? recentIntake.avgKcal / prescribedKcal
        : 1.0;

      // The maintenance estimate needs a TDEE baseline to adjust; without one
      // the engine returns insufficient_data and the card shows the building
      // state, which is the correct cold-start behaviour.
      const adaptiveBurn = currentTDEEEstimate
        ? computeAdaptiveTDEEAdjustment({ ewmaData, prescribedKcal, currentTDEEEstimate, adherenceFactor })
        : null;

      // COMP-026 (B): surface the step-trend line only in a week the latest
      // coach run actually sized the calorie change with the modifier. The
      // pure builder suppresses it under an open ED flag.
      const stepTrend = lastCoach?.stepTrendApplied
        ? { applied: true, direction: lastCoach?.stepModifier?.direction ?? 0 }
        : null;

      const vm = deriveWeightTrend({
        ewmaData,
        weeklyChange,
        adaptiveBurn,
        edFlagOpen: !!edFlag,
        stepTrend,
      });

      setResult({ ...vm, ewmaData, rawData: weights || [], loading: false });
    } catch (_e) {
      setResult({ ...EMPTY, loading: false });
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return result;
}
