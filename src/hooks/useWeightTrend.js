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

      const ewmaData = computeEWMA(weights || []);
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
