/**
 * WeekRibbon — one of the two signature devices of design direction D
 * ("Ledger, dark"; `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md`
 * section 5, ruled D165/D166).
 *
 * Seven cells, always the same position and the same size: Monday to Sunday,
 * filled for a day you trained, empty for a day you did not, amber for today.
 * Single-letter column headers beneath. The same object appears on Today, on
 * Progress and on a profile, which is what makes an app read as authored
 * rather than assembled — the product has no such device today.
 *
 * TWO STATES, NOT THREE, and that is a correction rather than a simplification
 * (D166 part 2.1). The plan originally specified an outlined "planned rest
 * day". That is not buildable and should never have been written: the founder
 * ruled on 2026-08-03 that "There are no scheduled training days. The app isn't
 * configured for days to be on a set schedule of specific rest or training
 * days" (`docs/audit/cross-surface-consistency-audit-2026-07-30.md:409-411`),
 * a ruling enforced by an absence guard. The only weekday data the product has
 * is a habit inference sanctioned for soft reminder copy alone. So the ribbon
 * draws what is true: what happened.
 *
 * WHY IT IS STILL THE ED-SAFE ANSWER TO A STREAK. Not because a rest day draws
 * as a rest day — it cannot — but because the ribbon is a RECORD rather than a
 * tally that can break. It has no "broken" state, never turns red, never
 * counts down, and is shown beside denominator framing ("trained 47 of the last
 * 50 weeks") rather than a consecutive count. A quiet week draws as a quiet
 * week and the app says nothing about it. Callers are responsible for the
 * usual suppression chain: on Community this data is already gated by
 * `consistencyGateState`, which fails closed.
 *
 * Data: `c_trained_days_week` from `src/lib/community/trainingConsistency.js`
 * is exactly this shape and is already local-Monday-anchored via
 * `localWeekStartMs`. Nothing new is computed.
 *
 * Theming: the migrated-primitive pattern (Card.js, Button.js) — the frozen
 * block holds only palette-invariant properties, everything else comes from
 * useTheme() memoized on `t`. No double-write.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useTheme from '../hooks/useTheme';
import { spacing, radius } from '../styles/theme';
import { DAY_ORDER, DAY_INITIALS, DAY_NAMES, currentDayKey } from '../lib/weekDays';

export default function WeekRibbon({
  days,                      // string[] of trained day keys, 'mon'..'sun'
  todayKey = undefined,      // omit to read the device clock; pass null for no "today"
  height = 30,
  showInitials = true,
  style,
  testID,
}) {
  const t = useTheme();
  const s = useMemo(() => buildStyles(t, height), [t, height]);

  const trained = new Set(Array.isArray(days) ? days : []);
  const today = todayKey === undefined ? currentDayKey() : todayKey;

  // One accessibility node for the whole band, not seven: a screen reader
  // should hear the week, not tick through seven anonymous cells. Same posture
  // DayDots already takes.
  const trainedNames = DAY_ORDER
    .map((k, i) => (trained.has(k) ? DAY_NAMES[i] : null))
    .filter(Boolean);
  const label = trainedNames.length
    ? `This week: trained ${trainedNames.join(', ')}.`
    : 'This week: no sessions yet.';

  return (
    <View style={style} testID={testID} accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={styles.row}>
        {DAY_ORDER.map((key) => {
          const isTrained = trained.has(key);
          const isToday = key === today;
          return (
            <View
              key={key}
              style={[
                styles.cell,
                s.cell,
                isTrained && s.cellTrained,
                // Amber means one thing: now (law 6). Today's cell is the only
                // place this component spends it, and it wins over the trained
                // fill so "now" is never ambiguous. D191 (founder screenshot,
                // 2026-09-17): a solid amber slab was the loudest thing on
                // Today every morning, before anything had happened. Today is
                // an amber OUTLINE until you have trained today, and an amber
                // FILL after -- so a filled cell always means a session, and
                // "now" is still the one amber cell in the band.
                isToday && (isTrained ? s.cellTodayTrained : s.cellToday),
              ]}
            />
          );
        })}
      </View>
      {showInitials && (
        <View style={styles.row} importantForAccessibility="no-hide-descendants">
          {DAY_INITIALS.map((initial, i) => (
            <Text key={DAY_ORDER[i]} style={s.initial}>{initial}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function buildStyles(t, height) {
  return {
    cell: { height, backgroundColor: t.colors.surface },
    cellTrained: { backgroundColor: t.colors.borderLight },
    cellToday: { borderWidth: 1.5, borderColor: t.colors.primary },
    cellTodayTrained: { backgroundColor: t.colors.primary },
    initial: {
      ...t.type.micro,
      color: t.colors.textMuted,
      flex: 1,
      textAlign: 'center',
      marginTop: spacing.xxs,
    },
  };
}

// Palette-invariant only.
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  // `flex: 1` on every cell is what makes the band span its block and stay
  // aligned with the initials beneath: the Community progress strip's bars
  // were centred under one cell of a three-cell row, which is the defect the
  // founder reported as "the graph isn't even under what it is meant".
  cell: { flex: 1, borderRadius: radius.hair },
});
