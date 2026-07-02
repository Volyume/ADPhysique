import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
import { SettingsPage } from '../components/SettingsPrimitives';
import { getNutritionTargets, getLatestBodyWeight, getLatestBodyComposition } from '../lib/database';
import { computeFFMFloor } from '../lib/nutritionEngine';
import { safeDayFloorKcal } from '../lib/food/calorieBank';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { useToast } from '../components/Toast';
import {
  WEEKDAY_KEYS, WEEKDAY_LABELS, DEFAULT_PERDAY_OFFSETS, MAX_PERDAY_OFFSET_KCAL,
  loadPerDayOffsets, savePerDayOffsets, sanitiseOffset, hasAnyOffset,
} from '../lib/food/perDayTargets';

// gap #13: per-day-of-week calorie planning. A user who eats more at weekends
// (or trims midweek) sets a kcal offset per weekday; the diary shows that day's
// target shifted by it. PLANNING ONLY — the engine's stored target, the coach's
// rolling average and every ED-safety gate are untouched. Every day is HARD-
// clamped so it can never display below the safe floor (sex floor 1500/1200, FFM
// floor); the clamp is shown live so a user always sees the real, safe number.
const STEP_KCAL = 50;

export default function PerDayTargetsScreen() {
  const { userId, energyUnit, sex } = useAppStore(useShallow((s) => ({
    userId: s.user?.id ?? null,
    energyUnit: s.accessibility?.energyUnit ?? 'kcal',
    sex: s.userProfile?.sex ?? null,
  })));

  const toast = useToast();
  const [baseKcal, setBaseKcal] = useState(0);
  const [floorKcal, setFloorKcal] = useState(() => safeDayFloorKcal({ sex }));
  const [offsets, setOffsets] = useState(DEFAULT_PERDAY_OFFSETS);

  useEffect(() => {
    let active = true;
    (async () => {
      const [t, savedOffsets, bodyWeight, bodyComp] = await Promise.all([
        userId ? getNutritionTargets(userId).catch(() => null) : Promise.resolve(null),
        loadPerDayOffsets(),
        userId ? getLatestBodyWeight(userId).catch(() => null) : Promise.resolve(null),
        userId ? getLatestBodyComposition(userId).catch(() => null) : Promise.resolve(null),
      ]);
      if (!active) return;
      // Same floor the diary and the coach use: max(sex floor, FFM floor).
      let floor = safeDayFloorKcal({ sex });
      if (bodyWeight?.weightKg > 0) {
        try {
          const ffm = computeFFMFloor(bodyWeight.weightKg, {
            bodyFatPercent: bodyComp?.body_fat_percent ?? null,
            bodyFatSource: bodyComp?.body_fat_source ?? null,
            sex,
          });
          floor = safeDayFloorKcal({ sex, ffmFloorKcal: ffm?.floorKcal });
        } catch (_) { /* keep sex floor */ }
      }
      setBaseKcal(Math.round(Number(t?.targetKcal) || 0));
      setFloorKcal(floor);
      setOffsets(savedOffsets);
    })();
    return () => { active = false; };
  }, [userId, sex]);

  // NAV-7 (audit 02): a failed save used to be swallowed (.catch(() => {})),
  // leaving optimistic UI on screen that the diary would never actually use.
  // Now the failure reverts to the last saved offsets and says so plainly.
  const persist = useCallback((next, prev) => {
    setOffsets(next);
    savePerDayOffsets(next).catch(() => {
      setOffsets(prev);
      toast.show('Could not save that change, so it was undone. Try again.', { variant: 'error' });
    });
  }, [toast]);

  const adjust = useCallback((key, dir) => {
    const prev = offsets;
    const next = { ...prev, [key]: sanitiseOffset((Number(prev[key]) || 0) + dir * STEP_KCAL) };
    persist(next, prev);
  }, [offsets, persist]);

  const resetAll = useCallback(() => { persist({ ...DEFAULT_PERDAY_OFFSETS }, offsets); }, [persist, offsets]);

  // The number the diary will actually display for a weekday: base + offset, but
  // never below the floor (matches resolveEffectiveTargets' clamp exactly).
  const displayedKcalFor = (offset) => Math.max(floorKcal, baseKcal + (Number(offset) || 0));
  const unitLabel = energyUnitLabel(energyUnit);
  const anyOffset = hasAnyOffset(offsets);

  return (
    <SettingsPage>
      <View style={local.section}>
        <Text style={local.intro}>
          Plan a different calorie target for each day of the week. The diary shows that day's target shifted by your
          offset. This is planning only. It never changes your coaching, your weekly average, or your safety floor.
        </Text>
        {baseKcal > 0 ? (
          <Text style={local.baseLine}>
            Base target: {toEnergy(baseKcal, energyUnit)} {unitLabel}. No day can go below your safe floor of {toEnergy(floorKcal, energyUnit)} {unitLabel}.
          </Text>
        ) : (
          <Text style={local.baseLine}>
            Set your calorie target in Nutrition targets first, then plan per-day offsets here.
          </Text>
        )}
      </View>

      <View style={local.section}>
        {WEEKDAY_KEYS.map((key) => {
          const offset = Number(offsets[key]) || 0;
          const displayed = displayedKcalFor(offset);
          const floored = baseKcal + offset < floorKcal && offset !== 0;
          const offsetKcalShown = displayed - baseKcal; // post-clamp, for honesty
          const sign = offsetKcalShown > 0 ? '+' : offsetKcalShown < 0 ? '−' : '';
          const offsetMag = Math.abs(offsetKcalShown);
          return (
            <View key={key} style={local.row}>
              <View style={local.rowLabel}>
                <Text style={local.day} numberOfLines={1}>{WEEKDAY_LABELS[key]}</Text>
                <Text style={local.dayTarget}>
                  {baseKcal > 0 ? `${toEnergy(displayed, energyUnit)} ${unitLabel}` : '-'}
                  {baseKcal > 0 && offsetMag > 0 ? (
                    <Text style={local.dayDelta}>{`  ${sign}${toEnergy(offsetMag, energyUnit)}`}</Text>
                  ) : null}
                  {floored ? <Text style={local.floorTag}>  floor</Text> : null}
                </Text>
              </View>
              <View style={local.stepper}>
                <Pressable
                  onPress={() => adjust(key, -1)}
                  disabled={offset <= -MAX_PERDAY_OFFSET_KCAL}
                  style={({ pressed }) => [local.stepBtn, offset <= -MAX_PERDAY_OFFSET_KCAL && local.stepBtnDisabled, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Lower ${WEEKDAY_LABELS[key]} target`}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable
                  onPress={() => adjust(key, 1)}
                  disabled={offset >= MAX_PERDAY_OFFSET_KCAL}
                  style={({ pressed }) => [local.stepBtn, offset >= MAX_PERDAY_OFFSET_KCAL && local.stepBtnDisabled, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Raise ${WEEKDAY_LABELS[key]} target`}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {anyOffset ? (
        <View style={local.section}>
          <Pressable onPress={resetAll} style={({ pressed }) => [local.resetBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Reset all days to your base target">
            <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
            <Text style={local.resetText}>Reset all to base target</Text>
          </Pressable>
        </View>
      ) : null}
    </SettingsPage>
  );
}

const local = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  intro: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.sm },
  baseLine: { ...type.bodySm, color: colors.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  rowLabel: { flex: 1, paddingRight: spacing.md },
  day: { ...type.body, color: colors.textPrimary },
  dayTarget: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'], marginTop: 2 },
  dayDelta: { color: colors.textMuted, fontSize: fontSize.sm },
  floorTag: { color: colors.textMuted, fontSize: fontSize.xs, fontStyle: 'italic' },
  stepper: { flexDirection: 'row', gap: spacing.sm },
  stepBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', paddingVertical: spacing.sm,
  },
  resetText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
