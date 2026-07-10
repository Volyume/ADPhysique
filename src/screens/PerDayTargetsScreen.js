import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, fontSize, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import { settingsStyles, useSettingsStyles } from '../components/SettingsPrimitives';
import { getNutritionTargets, getLatestBodyWeight, getLatestBodyComposition } from '../lib/database';
import { computeFFMFloor } from '../lib/nutritionEngine';
import { safeDayFloorKcal } from '../lib/food/calorieBank';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Stepper from '../components/Stepper';
import {
  WEEKDAY_KEYS, WEEKDAY_LABELS, DEFAULT_PERDAY_OFFSETS, MAX_PERDAY_OFFSET_KCAL,
  loadPerDayOffsets, savePerDayOffsets, sanitiseOffset, hasAnyOffset,
} from '../lib/food/perDayTargets';

// gap #13: per-day-of-week calorie planning. A user who eats more at weekends
// (or trims midweek) sets a kcal offset per weekday; the diary shows that day's
// target shifted by it. PLANNING ONLY, the engine's stored target, the coach's
// rolling average and every ED-safety gate are untouched. Every day is HARD-
// clamped so it can never display below the safe floor (sex floor 1500/1200, FFM
// floor); the clamp is shown live so a user always sees the real, safe number.
const STEP_KCAL = 50;

export default function PerDayTargetsScreen({ navigation }) {
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
            bodyFatPercent: bodyComp?.bodyFatPercent ?? null,
            bodyFatSource: bodyComp?.bodyFatSource ?? null,
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

  const setOffset = useCallback((key, value) => {
    const prev = offsets;
    const next = { ...prev, [key]: sanitiseOffset(value) };
    persist(next, prev);
  }, [offsets, persist]);

  const resetAll = useCallback(() => { persist({ ...DEFAULT_PERDAY_OFFSETS }, offsets); }, [persist, offsets]);

  // The number the diary will actually display for a weekday: base + offset, but
  // never below the floor (matches resolveEffectiveTargets' clamp exactly).
  const displayedKcalFor = (offset) => Math.max(floorKcal, baseKcal + (Number(offset) || 0));
  const unitLabel = energyUnitLabel(energyUnit);
  const anyOffset = hasAnyOffset(offsets);
  // CP-10 stage 3: live theme (src/hooks/useTheme.js) -- colour/type plumbing
  // only, this screen's calorie-floor clamp logic above is untouched. `live`
  // is the shared settingsStyles override (SettingsPrimitives.js); `liveText`
  // covers this screen's own colour/type-bearing style keys the same way.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    intro: { ...t.type.bodySm, color: t.colors.textMuted },
    baseLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    baseLineLink: { color: t.colors.primary },
    row: { borderTopColor: t.colors.border },
    day: { ...t.type.body, color: t.colors.textPrimary },
    dayTarget: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    dayDelta: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    floorTag: { color: t.colors.textMuted, fontSize: t.fontSize.xs },
  };

  return (
    <SafeAreaView style={[settingsStyles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Per-day targets" />
      <ScrollView contentContainerStyle={settingsStyles.content}>
        <View style={local.section}>
          <Text maxFontSizeMultiplier={1.3} style={[local.intro, liveText.intro]}>
            Plan a different calorie target for each day of the week. The diary shows that day's target shifted by your
            offset. This is planning only. It never changes your coaching, your weekly average, or your safety floor.
          </Text>
          {baseKcal > 0 ? (
            <Text maxFontSizeMultiplier={1.3} style={[local.baseLine, liveText.baseLine]}>
              Base target: {toEnergy(baseKcal, energyUnit)} {unitLabel}. No day can go below your safe floor of {toEnergy(floorKcal, energyUnit)} {unitLabel}.
            </Text>
          ) : (
            // L05-cross (2026-07-09 design audit): this named a screen with
            // no way to actually get there. Same stack as this screen, so a
            // plain in-stack navigate is enough (no cross-tab jump needed).
            <Text maxFontSizeMultiplier={1.3}
              style={[local.baseLine, liveText.baseLine, local.baseLineLink, liveText.baseLineLink]}
              onPress={() => navigation.navigate('NutritionTargets')}
              accessibilityRole="link"
              accessibilityLabel="Set your calorie target in Nutrition targets first, then plan per-day offsets here"
            >
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
              <View key={key} style={[local.row, liveText.row]}>
                <View style={local.rowLabel}>
                  <Text maxFontSizeMultiplier={1.3} style={[local.day, liveText.day]} numberOfLines={1}>{WEEKDAY_LABELS[key]}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[local.dayTarget, liveText.dayTarget]}>
                    {baseKcal > 0 ? `${toEnergy(displayed, energyUnit)} ${unitLabel}` : '-'}
                    {baseKcal > 0 && offsetMag > 0 ? (
                      <Text maxFontSizeMultiplier={1.3} style={[local.dayDelta, liveText.dayDelta]}>{`  ${sign}${toEnergy(offsetMag, energyUnit)}`}</Text>
                    ) : null}
                    {floored ? <Text maxFontSizeMultiplier={1.3} style={[local.floorTag, liveText.floorTag]}>  floor</Text> : null}
                  </Text>
                </View>
                <Stepper
                  value={offset}
                  min={-MAX_PERDAY_OFFSET_KCAL}
                  max={MAX_PERDAY_OFFSET_KCAL}
                  step={STEP_KCAL}
                  size="compact"
                  label={`${WEEKDAY_LABELS[key]} target offset`}
                  decreaseLabel={`Lower ${WEEKDAY_LABELS[key]} target`}
                  increaseLabel={`Raise ${WEEKDAY_LABELS[key]} target`}
                  valueLabel={`${WEEKDAY_LABELS[key]} target offset ${offset}`}
                  // L05-PDT2 (2026-07-09 design audit): the control showed no
                  // numeric value between its +/- buttons, reading as empty.
                  // Was formatValue={() => ''}.
                  formatValue={(v) => {
                    const n = toEnergy(v, energyUnit);
                    return n === 0 ? '0' : `${n > 0 ? '+' : ''}${n}`;
                  }}
                  onChange={(next) => setOffset(key, next)}
                />
              </View>
            );
          })}
        </View>

        {anyOffset ? (
          <View style={local.section}>
            <Button
              title="Reset all to base target"
              icon="refresh-outline"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={resetAll}
              accessibilityLabel="Reset all days to your base target"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  intro: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.sm },
  baseLine: { ...type.bodySm, color: colors.textSecondary },
  // L05-cross (2026-07-09 design audit): the tappable variant above, used
  // only when the line links through to Nutrition targets.
  baseLineLink: { color: colors.primary, textDecorationLine: 'underline' },
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
});
