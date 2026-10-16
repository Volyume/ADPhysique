/**
 * CopyFromDaySheet: "Copy from another day" (food audit F-3), moved out of
 * DiaryScreen.js as a named component (D230 R4, 4.7) with the same
 * behaviour: open while `days` is an array (null hides it), one row per
 * recent logged day, a tap hands that day back to the caller, which copies
 * it into the day in view. Copy semantics stay with the caller (D230 Wave 3).
 *
 * Rows are the house NavRow (4.7) with the haptic switched OFF: tapping a
 * day WRITES the diary, and diary-marking moments keep the recorded
 * no-haptic exception (Haptics completion pass, 2026-07-10). Each row's sub
 * line reads "3 entries · 1850 kcal", one spaced middle dot (D230 R15).
 * The title is a heading (D230 R16).
 */
import { StyleSheet } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import { NavRow, NavGroup } from '../NavRow';
import { friendlyDate } from '../../lib/food/diaryDates';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { colors, spacing, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

// "3 entries · 1850 kcal"
export function copyDayMeta(day, energyUnit = 'kcal') {
  const count = Number(day?.count) || 0;
  const energy = toEnergy(Math.round(day?.kcal ?? 0), energyUnit);
  return `${count} ${count === 1 ? 'entry' : 'entries'} · ${energy} ${energyUnitLabel(energyUnit)}`;
}

export default function CopyFromDaySheet({ days, onClose, onPick, energyUnit = 'kcal' }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <BottomSheet
      visible={days != null}
      onClose={onClose}
      scroll
      accessibilityLabel="Copy from another day"
    >
      <SectionLabel heading style={styles.title}>Copy from another day</SectionLabel>
      {days && days.length === 0 ? (
        <Text style={[styles.empty, live.empty]}>No earlier days with food logged yet.</Text>
      ) : (
        <NavGroup>
          {(days || []).map((d) => (
            <NavRow
              key={d.entry_date}
              icon="calendar-outline"
              label={friendlyDate(d.entry_date)}
              sub={copyDayMeta(d, energyUnit)}
              haptic={false}
              onPress={() => onPick?.(d.entry_date)}
            />
          ))}
        </NavGroup>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm,
  },
  empty: {
    ...type.bodySm, color: colors.textMuted,
    paddingHorizontal: spacing.sm, paddingBottom: spacing.md,
  },
});

// The tree's frozen-plus-live pattern: colour- and type-bearing keys only.
function buildLiveStyles(t) {
  return {
    empty: { ...t.type.bodySm, color: t.colors.textMuted },
  };
}
