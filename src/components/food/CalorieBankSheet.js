/**
 * CalorieBankSheet, "Plan a higher-calorie day" (CB-1).
 * Source: docs/ultimate-audit-2026-06-13/pass4-blueprint-calorie-banking.md.
 *
 * Pick a day in the week and how much to bump it; the rest of the week gives up
 * an equal share so the WEEKLY TOTAL stays the same. All the safety maths
 * (floors, band cap, refusal) live in lib/food/calorieBank, this sheet only
 * previews the result and hands a valid plan back to the caller to persist. The
 * caller is responsible for only opening this when banking is allowed (no carb
 * cycle / refeed / floored target / open ED-pattern flag).
 *
 * Voice: British English, plain, no "cheat day"/"binge"/"save up" language,
 * and no collaborative "we" (the person is the one planning the day).
 *
 * House parts (D230 food level-up, R4 and 4.9): the day chips are the house
 * `Chip` (single-select, role radio, 48 dp), the amount is the house `Stepper`,
 * "Plan it" is the house `Button`, and the four rules sit under the house
 * `CollapsibleSection` ("How this works") instead of standing on the sheet
 * (R3: explanation is on demand). Only the chrome moved: the floors, the
 * band cap, `planCalorieBank`'s maths, ERROR_COPY's reasons and the
 * `onApply` payload are exactly as they were (R24).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import Chip from '../Chip';
import Stepper from '../Stepper';
import Button from '../Button';
import CollapsibleSection from '../CollapsibleSection';
import { colors, fontSize, fontWeight, spacing, radius, type, fontFamily } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import useTheme from '../../hooks/useTheme';
import { formatEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import { planCalorieBank, maxApplicableBumpKcal, BANK_RULES } from '../../lib/food/calorieBank';

const BUMP_STEP = 50;
const DEFAULT_BUMP = 150;

const ERROR_COPY = {
  floor: 'That would take one of your days below your safe minimum, so that much cannot be moved. Try a smaller amount.',
  no_room: 'This day is already at the top of its range, so there is nothing extra to add.',
  too_small: 'Pick a little more to plan a higher-calorie day.',
  invalid_input: 'That day could not be planned. Try a different day.',
};

export default function CalorieBankSheet({
  visible,
  onClose,
  weekDates = [],
  weekStartKey = null,
  defaultBigDay,
  baseTargetKcal,
  floorKcal,
  bandMaxKcal,
  existingBank = null,
  onApply,
  onClear,
  dayLabel = (d) => d,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [bigDay, setBigDay] = useState(defaultBigDay);
  const [requestedBump, setRequestedBump] = useState(DEFAULT_BUMP);
  // The four rules are collapsed each time the sheet opens (R3: on demand).
  const [rulesOpen, setRulesOpen] = useState(false);

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
      setRulesOpen(false);
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

  const apply = () => {
    if (!plan.ok) return;
    onApply?.({
      weekStartKey: weekStartKey ?? weekDates[0] ?? bigDay,
      bigDayKey: bigDay,
      perDayDeltaKcal: plan.perDayDeltaKcal,
      appliedAt: Date.now(),
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Plan a higher-calorie day">
      <Text accessibilityRole="header" style={[styles.title, live.title]}>Plan a higher-calorie day</Text>
      <Text style={[styles.intro, live.intro]}>
        Pick a day to eat more on, and the rest of the week makes room for it.
      </Text>
      {/* Campaign 17B job 6: the four things the old copy left the user to
          assume. Comprehension only - the maths is unchanged. R3 (D230): they
          now sit under a collapsed row, shown when the person asks. */}
      <View style={styles.rules}>
        <CollapsibleSection title="How this works" open={rulesOpen} onToggle={() => setRulesOpen((o) => !o)}>
          {BANK_RULES.map((line) => (
            <Text key={line} style={[styles.ruleLine, live.ruleLine]}>{line}</Text>
          ))}
        </CollapsibleSection>
      </View>

      {existingBank ? (
        <View style={[styles.activeRow, live.activeRow]}>
          <Text style={[styles.activeText, live.activeText]} numberOfLines={2}>
            A higher-calorie day is planned for {dayLabel(existingBank.bigDayKey)}.
          </Text>
          {/* R16: a text link about 20 dp tall reaches the 48 dp target by
              hit slop (14 on every edge). */}
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} accessibilityRole="button" accessibilityLabel="Clear the planned higher-calorie day">
            <Text style={[styles.clearText, live.clearText]}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Review finding 8: with no other day to make room, the controls are
          not shown; only the line saying why. */}
      {weekDates.length >= 2 ? (
      <>
      <SectionLabel style={styles.sectionLabel}>Higher-calorie day</SectionLabel>
      <View style={styles.dayChips} accessibilityRole="radiogroup" accessibilityLabel="Higher-calorie day">
        {weekDates.map((d) => (
          <Chip
            key={d}
            label={dayLabel(d)}
            selected={d === bigDay}
            onPress={() => setBigDay(d)}
            accessibilityRole="radio"
            style={styles.dayChip}
          />
        ))}
      </View>

      <SectionLabel style={styles.sectionLabel}>How much extra</SectionLabel>
      <Stepper
        value={requestedBump}
        onChange={setRequestedBump}
        min={BUMP_STEP}
        max={stepMax}
        step={BUMP_STEP}
        unit="kcal"
        formatValue={(v) => `+${v}`}
        label="Extra calories"
        decreaseLabel="Less"
        increaseLabel="More"
        valueLabel={`${requestedBump} kcal extra`}
        style={styles.stepper}
      />
      </>
      ) : null}

      {weekDates.length === 0 ? (
        // Founder ruling 2026-10-16: only today onwards can be used, so a week
        // that has already passed has no day left to plan.
        <Text style={[styles.error, live.error]}>
          This week has already passed. You can plan one for this week or a later one.
        </Text>
      ) : weekDates.length < 2 ? (
        // Only one day left (today is Sunday): no other day to make room.
        <Text style={[styles.error, live.error]}>
          Today is the last day of this week, so there is no other day to make room. You can plan one from Monday.
        </Text>
      ) : plan.ok ? (
        <Text style={[styles.preview, live.preview]}>
          {/* R15 number grammar (food Diary audit 2026-10-16, item 12): the
              figures carry thousands grouping ("2,800 kcal"). Display only:
              every figure is the same plan value it was. */}
          {dayLabel(bigDay)}: {formatEnergy(bigNewKcal, energyUnit)} {energyUnitLabel(energyUnit)}. {others === 1 ? 'The other day drops' : `The other ${others} days drop`} by about {formatEnergy(perOther, energyUnit)} {energyUnitLabel(energyUnit)}{others === 1 ? '' : ' each'}. Your weekly total stays the same.
        </Text>
      ) : (
        <Text style={[styles.error, live.error]}>{ERROR_COPY[plan.reason] ?? ERROR_COPY.invalid_input}</Text>
      )}

      <Button
        title="Plan it"
        variant="primary"
        onPress={apply}
        disabled={!plan.ok}
        accessibilityLabel="Apply the higher-calorie day"
        style={styles.applyBtn}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  intro: { ...type.bodySm, color: colors.textMuted, marginTop: spacing.xs },
  // Campaign 17B job 6: what the bank is, and what it is not. Held under the
  // collapsed "How this works" row (R3).
  rules: { marginTop: spacing.md },
  ruleLine: { ...type.bodySm, color: colors.textMuted },
  activeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginTop: spacing.md, gap: spacing.sm,
  },
  activeText: { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm },
  clearText: { color: colors.primary, fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  sectionLabel: {
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  // The house Chip is 44 dp on iOS by default; the day chips are the one-tap
  // control of this sheet, so they take the 48 dp platform minimum everywhere.
  dayChip: { minHeight: touchTarget.minimum },
  stepper: { alignSelf: 'center' },
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
  applyBtn: { marginTop: spacing.lg },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. rules/sectionLabel/dayChips/
// dayChip/stepper/applyBtn have no colour tokens (the chips, stepper and
// button are house parts that follow the live theme themselves).
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    intro: { color: t.colors.textMuted },
    ruleLine: { color: t.colors.textMuted },
    activeRow: { backgroundColor: t.colors.surface2 },
    activeText: { color: t.colors.textSecondary },
    clearText: { color: t.colors.primary },
    preview: { color: t.colors.textSecondary },
    error: { color: t.colors.warning },
  };
}
