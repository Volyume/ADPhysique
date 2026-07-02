/**
 * CalorieBankSheet — "Plan a higher-calorie day" (CB-1).
 * Source: docs/ultimate-audit-2026-06-13/pass4-blueprint-calorie-banking.md.
 *
 * Pick a day in the week and how much to bump it; the rest of the week gives up
 * an equal share so the WEEKLY TOTAL stays the same. All the safety maths
 * (floors, band cap, refusal) live in lib/food/calorieBank — this sheet only
 * previews the result and hands a valid plan back to the caller to persist. The
 * caller is responsible for only opening this when banking is allowed (no carb
 * cycle / refeed / floored target / open ED-pattern flag).
 *
 * Voice: British English, plain, no "cheat day"/"binge"/"save up" language.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../BottomSheet';
import { colors, fontSize, fontWeight, spacing, radius, circle, type } from '../../styles/theme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import { planCalorieBank, maxApplicableBumpKcal } from '../../lib/food/calorieBank';

const BUMP_STEP = 50;
const DEFAULT_BUMP = 150;

const ERROR_COPY = {
  floor: "That would take one of your days below your safe minimum, so we can't shift that much. Try a smaller amount.",
  no_room: "This day is already at the top of its range, so there's nothing extra to add.",
  too_small: 'Pick a little more to plan a higher-calorie day.',
  invalid_input: "We couldn't plan that. Try a different day.",
};

export default function CalorieBankSheet({
  visible,
  onClose,
  weekDates = [],
  defaultBigDay,
  baseTargetKcal,
  floorKcal,
  bandMaxKcal,
  existingBank = null,
  onApply,
  onClear,
  dayLabel = (d) => d,
}) {
  const [bigDay, setBigDay] = useState(defaultBigDay);
  const [requestedBump, setRequestedBump] = useState(DEFAULT_BUMP);

  // Energy DISPLAY unit (kcal | kj). Display-only: every kcal value here (bump,
  // step, floors, band, plan deltas) stays kcal and is fed to the engine in
  // kcal; only read-only PREVIEW energy numbers convert. The "+extra" stepper
  // control itself stays kcal (it is the user's chosen kcal bump, persisted as
  // perDayDeltaKcal), like the QuickAdd kcal input.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');

  // Reset the controls each time the sheet opens for a day.
  useEffect(() => {
    if (visible) {
      setBigDay(defaultBigDay);
      setRequestedBump(DEFAULT_BUMP);
    }
  }, [visible, defaultBigDay]);

  const perDayBaseKcal = useMemo(() => {
    const m = {};
    weekDates.forEach((d) => { m[d] = baseTargetKcal; });
    return m;
  }, [weekDates, baseTargetKcal]);

  const plan = useMemo(() => planCalorieBank({
    perDayBaseKcal, bigDayKey: bigDay, requestedBumpKcal: requestedBump, floorKcal, bandMaxKcal,
  }), [perDayBaseKcal, bigDay, requestedBump, floorKcal, bandMaxKcal]);

  // The day's real headroom: the most planCalorieBank could apply. The stepper
  // ceiling is the largest round step at or below it, so every increment changes
  // the plan and the preview never freezes above an invisible cap. Falls back to
  // one step when there is no room (the plan then shows its refusal copy).
  const maxBump = useMemo(() => maxApplicableBumpKcal({
    perDayBaseKcal, bigDayKey: bigDay, floorKcal, bandMaxKcal,
  }), [perDayBaseKcal, bigDay, floorKcal, bandMaxKcal]);
  const stepMax = Math.max(BUMP_STEP, Math.floor(maxBump / BUMP_STEP) * BUMP_STEP);

  // Keep the chosen amount within the current day's ceiling (it can shrink when
  // the big day changes). Only ever lowers the value.
  useEffect(() => {
    setRequestedBump((b) => Math.min(b, stepMax));
  }, [stepMax]);

  const others = Math.max(1, weekDates.length - 1);
  const bigNewKcal = (baseTargetKcal || 0) + (plan.ok ? plan.appliedBumpKcal : 0);
  const perOther = plan.ok ? Math.round(plan.appliedBumpKcal / others) : 0;

  const step = (delta) => setRequestedBump((b) => Math.min(stepMax, Math.max(BUMP_STEP, b + delta)));

  const apply = () => {
    if (!plan.ok) return;
    onApply?.({
      weekStartKey: weekDates[0] ?? bigDay,
      bigDayKey: bigDay,
      perDayDeltaKcal: plan.perDayDeltaKcal,
      appliedAt: Date.now(),
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Plan a higher-calorie day">
      <Text style={styles.title}>Plan a higher-calorie day</Text>
      <Text style={styles.intro}>
        Got a meal out or an occasion coming up? Pick that day and we will move some
        calories onto it from the rest of the week, so you eat a little less on the
        other days to make room. Your weekly total stays the same, and that's what
        counts. Your coach looks at the whole week, not any single day, so one
        bigger day balanced by slightly lighter ones keeps you on plan.
      </Text>

      {existingBank ? (
        <View style={styles.activeRow}>
          <Text style={styles.activeText} numberOfLines={2}>
            A higher-calorie day is planned for {dayLabel(existingBank.bigDayKey)}.
          </Text>
          <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear the planned higher-calorie day">
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Higher-calorie day</Text>
      <View style={styles.dayChips}>
        {weekDates.map((d) => {
          const active = d === bigDay;
          return (
            <Pressable
              key={d}
              onPress={() => setBigDay(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={dayLabel(d)}
              style={({ pressed }) => [styles.dayChip, active && styles.dayChipActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{dayLabel(d)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>How much extra</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => step(-BUMP_STEP)}
          disabled={requestedBump <= BUMP_STEP}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Less"
          style={[styles.stepBtn, requestedBump <= BUMP_STEP && styles.stepBtnDisabled]}
        >
          <Ionicons name="remove" size={24} color={requestedBump <= BUMP_STEP ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepValue} accessibilityLabel={`${requestedBump} kcal`}>+{requestedBump}</Text>
        <TouchableOpacity
          onPress={() => step(BUMP_STEP)}
          disabled={requestedBump >= stepMax}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="More"
          style={[styles.stepBtn, requestedBump >= stepMax && styles.stepBtnDisabled]}
        >
          <Ionicons name="add" size={24} color={requestedBump >= stepMax ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
      </View>

      {plan.ok ? (
        <Text style={styles.preview}>
          {dayLabel(bigDay)}: {toEnergy(bigNewKcal, energyUnit)} {energyUnitLabel(energyUnit)}. The other {others} days drop by about {toEnergy(perOther, energyUnit)} {energyUnitLabel(energyUnit)} each. Your weekly total stays the same.
        </Text>
      ) : (
        <Text style={styles.error}>{ERROR_COPY[plan.reason] ?? ERROR_COPY.invalid_input}</Text>
      )}

      <TouchableOpacity
        style={[styles.applyBtn, !plan.ok && styles.applyBtnDisabled]}
        onPress={apply}
        disabled={!plan.ok}
        accessibilityRole="button"
        accessibilityLabel="Apply the higher-calorie day"
      >
        <Text style={styles.applyText}>Plan it</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  intro: { ...type.bodySm, color: colors.textMuted, marginTop: spacing.xs },
  activeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginTop: spacing.md, gap: spacing.sm,
  },
  activeText: { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm },
  clearText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sectionLabel: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  dayChipTextActive: { color: colors.onPrimary, fontWeight: fontWeight.bold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, alignSelf: 'center' },
  stepBtn: {
    width: 48, height: 48, borderRadius: circle(48),
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.5 },
  stepValue: {
    color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    minWidth: 88, textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  preview: {
    ...type.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.lg, textAlign: 'center',
  },
  error: {
    ...type.bodySm,
    color: colors.warning,
    marginTop: spacing.lg, textAlign: 'center',
  },
  applyBtn: {
    marginTop: spacing.lg, minHeight: 48, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  applyBtnDisabled: { opacity: 0.5 },
  applyText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
