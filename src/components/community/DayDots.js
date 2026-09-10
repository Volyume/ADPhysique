/**
 * DayDots (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "DayDots"; `20-BLUEPRINT.md`
 * section 9 rule 5: "Trained days are seven 6 dp dots on the row's second
 * line").
 *
 * Seven 6 dp dots, Monday first: filled `primary` for a trained day,
 * `border` for not; today gets a 1 dp `primary` ring when it has not been
 * trained yet (spec: "today ringed 1 dp primary when not yet trained").
 * Pure presentation, no text of its own; the whole group collapses to one
 * accessibility node carrying the composed label ("Trained Mon, Wed,
 * Fri"), the same wording `daysLabel` already gives `GymWeekBoard`'s
 * caption line, so the two read identically.
 *
 * Rules obeyed (section 1 preamble; `docs/rules/styling.md`): function
 * component, `useTheme`, tokens only (`circle(6)` for the dots,
 * `spacing.xs` gap, `colors.primary`/`colors.border`, no raw hex/spacing/
 * font-size literals), `StyleSheet.create` at the bottom. `c.primary`
 * appears only for a trained dot's fill and the not-yet-trained-today
 * ring (pinned by `rows.amber.guard.test.js`). Never imports
 * `../../lib/database` (privacy guard, section 6d).
 *
 * Props:
 *   days      string[] of trained day keys ('mon'..'sun', the vocabulary
 *             `src/lib/community/boards.js`'s `trainedDays`/`daysLabel`
 *             already use), any order/subset
 *   todayKey  today's day key in the same vocabulary, or omitted when
 *             there is no "today" to ring (a past week's board)
 */

import { View, StyleSheet } from 'react-native';
import { spacing, colors, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { daysLabel } from '../../lib/community';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Today's short day key ('mon'..'sun'), the local-device weekday in
 * `boards.js`'s vocabulary. No existing helper produces this form
 * (`dayKey.js` keys by calendar date, not weekday, for a different job);
 * named and kept here since DayDots owns this vocabulary and `PersonRow`
 * (the only other caller that needs "today") already imports from this
 * file.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function currentDayKey(now = new Date()) {
  return WEEKDAY_KEYS[now.getDay()];
}

export default function DayDots({ days, todayKey }) {
  const t = useTheme();
  const trained = new Set(Array.isArray(days) ? days : []);
  const label = trained.size
    ? `Trained ${daysLabel(DAY_ORDER.filter((k) => trained.has(k)))}`
    : 'Not trained yet this week';

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {DAY_ORDER.map((key) => {
        const isTrained = trained.has(key);
        const ringToday = key === todayKey && !isTrained;
        return (
          <View
            key={key}
            style={[
              styles.dot,
              {
                backgroundColor: isTrained ? t.colors.primary : t.colors.border,
                borderColor: ringToday ? t.colors.primary : 'transparent',
                borderWidth: ringToday ? 1 : 0,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: circle(6), backgroundColor: colors.border },
});
