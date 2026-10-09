/**
 * TrainingDaysGrid (Progress, recovery heatmap and Consistency elevation,
 * register D214; `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` sections 5.2 CS-13 and CS-21, 7.3 item 3 and 7.5).
 *
 * The twelve-week training calendar, drawn so it can be READ as a calendar:
 * one column per Monday-to-Sunday week (thirteen columns cover 84 days ending
 * today, the first and last being part weeks, a day outside the window an
 * empty gap), the weekday initials M T W T F S S down the left, the month
 * name above the first column of each month, and a legend that says
 * "Trained" and "No session". There is no rest day in this product (D166: a
 * day without a session is "no session"), no amber on a fact, and nothing
 * here counts toward a streak: the grid records what happened.
 *
 * Pure presentation. The caller supplies the days (`dayKeys`, the 84 local
 * day keys oldest first as `localDayKeysEndingAt(84)` returns them, which
 * already steps a local Date so a UK clock-change week keeps all seven days),
 * the trained ones (`trainedDayKeys`, a Set or an array of the same keys) and
 * today's key. Every date here is parsed with `dayKey.js` (civil-day ordinals
 * for the weekday, `parseLocalDay` for the calendar fields), never from
 * `new Date(isoString)`, so a key stays on the person's own calendar.
 *
 * Colours: a trained day is `textSecondary` (ink, a fact), any other day
 * `surface2`, today a 1.5 dp `textPrimary` outline (never amber) drawn as a
 * ring around a gap of card ground with the day's own fill inside, so a
 * trained today still reads as today (ring on fill alone was 2.7:1 or
 * worse, lane 1 review S3). Cells are sized from the window width
 * (`useWindowDimensions`) with `spacing.xs` gaps and `radius.xs`.
 *
 * Accessibility (CS-13: one label for 84 cells was the old way): the grid is
 * ONE accessible group labelled "Training days over the last 12 weeks, Monday
 * to Sunday columns. N days trained." and every cell carries its own spoken
 * label ("Mon 14 Sep, trained", "Tue 15 Sep, no session", "today, no session
 * yet") inside it. The group is one focus stop on purpose (the figure's
 * AX-04 rule: no 84 stops by default); the per-cell labels are what a
 * walk through the group, a UI test or an assistive tool that descends into
 * it reads. The legend is its own group, outside it.
 *
 * Live theme (`useTheme`): the frozen block holds layout only.
 */

import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Text from './Text';
import { spacing, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import LegendRow from './LegendRow';
import { civilDayOrdinal, parseLocalDay } from '../lib/dayKey';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const LABEL_COLUMN = spacing.lg;
const GRID_GAP = spacing.xs;
// The window width minus the gutter and the card padding paid on each side
// (16 + 16), the same assumption the retired calendar made with its fixed 90.
const HORIZONTAL_CHROME = spacing.lg * 4;
const MIN_CELL = 10;
const MAX_CELL = 24;
// A month label needs about three columns of room before the next one.
const MONTH_LABEL_ROOM = 3;
const TODAY_OUTLINE = 1.5;

/** Monday = 0 .. Sunday = 6 from a civil-day ordinal (day 0, 1970-01-01, was a Thursday). */
function weekdayIndex(ordinal) {
  return (((ordinal + 3) % 7) + 7) % 7;
}

/**
 * The layout, pure: `columns` is one array of seven slots per Monday-to-Sunday
 * week (a slot is `{ key, ordinal, row, month, date }` or null for a day
 * outside the window), `monthLabels` is `[{ col, text }]`. Keys that are not
 * YYYY-MM-DD are skipped; any order is accepted.
 */
export function buildGrid(dayKeys) {
  const days = [];
  for (const key of Array.isArray(dayKeys) ? dayKeys : []) {
    if (typeof key !== 'string' || !DAY_KEY.test(key)) continue;
    const ordinal = civilDayOrdinal(key);
    if (!Number.isFinite(ordinal)) continue;
    const local = parseLocalDay(key);
    days.push({
      key, ordinal, row: weekdayIndex(ordinal), month: local.getMonth(), date: local.getDate(),
    });
  }
  if (!days.length) return { columns: [], monthLabels: [] };

  const ordinals = days.map((d) => d.ordinal);
  const first = Math.min(...ordinals);
  const firstMonday = first - weekdayIndex(first);
  const columnCount = Math.floor((Math.max(...ordinals) - firstMonday) / 7) + 1;
  const columns = Array.from({ length: columnCount }, () => Array(7).fill(null));
  days.forEach((d) => {
    columns[Math.floor((d.ordinal - firstMonday) / 7)][d.row] = d;
  });

  // A month's label sits above the first column that begins in it; the
  // partly-shown first month is labelled too unless the next label is so
  // close that the two would collide.
  const monthLabels = [];
  let previous = null;
  columns.forEach((column, col) => {
    const top = column.find(Boolean);
    if (!top) return;
    if (previous === null || top.month !== previous) {
      monthLabels.push({ col, text: MONTH_NAMES[top.month] });
    }
    previous = top.month;
  });
  if (monthLabels.length > 1 && monthLabels[1].col - monthLabels[0].col < MONTH_LABEL_ROOM) {
    monthLabels.shift();
  }
  return { columns, monthLabels };
}

/** The spoken label of one cell. */
function cellLabel(day, trained, isToday) {
  if (isToday) return `today, ${trained ? 'trained' : 'no session yet'}`;
  return `${WEEKDAY_NAMES[day.row]} ${day.date} ${MONTH_NAMES[day.month]}, ${trained ? 'trained' : 'no session'}`;
}

export default function TrainingDaysGrid({ trainedDayKeys, dayKeys, todayKey, style }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { columns, monthLabels } = buildGrid(dayKeys);
  if (!columns.length) return null;

  const trained = trainedDayKeys instanceof Set
    ? trainedDayKeys
    : new Set(Array.isArray(trainedDayKeys) ? trainedDayKeys : []);

  const available = width - HORIZONTAL_CHROME - LABEL_COLUMN - GRID_GAP;
  const raw = Math.floor((available - (columns.length - 1) * GRID_GAP) / columns.length);
  const cell = Math.min(MAX_CELL, Math.max(MIN_CELL, raw));

  let trainedCount = 0;
  let dayCount = 0;
  columns.forEach((column) => column.forEach((day) => {
    if (!day) return;
    dayCount += 1;
    if (trained.has(day.key)) trainedCount += 1;
  }));
  const weeks = Math.max(1, Math.round(dayCount / 7));
  const groupLabel = `Training days over the last ${weeks} ${weeks === 1 ? 'week' : 'weeks'}, `
    + `Monday to Sunday columns. ${trainedCount} ${trainedCount === 1 ? 'day' : 'days'} trained.`;

  const captionStyle = { ...t.type.caption, color: t.colors.textMuted };

  return (
    <View style={style}>
      <View
        testID="training-days-grid"
        accessible
        accessibilityRole="image"
        accessibilityLabel={groupLabel}
      >
        <View style={[styles.monthRow, { height: t.type.caption.lineHeight, marginLeft: LABEL_COLUMN + GRID_GAP }]}>
          {monthLabels.map(({ col, text }) => (
            // The position is on a View, not on the Text: layout props belong to
            // the box, and the label then sizes to its own words at any text scale.
            <View key={`${col}-${text}`} testID={`month-${col}`} style={[styles.monthSlot, { left: col * (cell + GRID_GAP) }]}>
              <Text numberOfLines={1} style={captionStyle}>{text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.body}>
          <View style={styles.weekdayColumn}>
            {WEEKDAY_INITIALS.map((letter, row) => (
              // eslint-disable-next-line react/no-array-index-key -- seven fixed weekdays, "T" and "S" repeat
              <View key={row} style={[styles.weekdaySlot, { height: cell }]}>
                <Text numberOfLines={1} style={captionStyle}>{letter}</Text>
              </View>
            ))}
          </View>
          <View style={styles.columns}>
            {columns.map((column, ci) => (
              // eslint-disable-next-line react/no-array-index-key -- week columns have no id of their own
              <View key={ci} testID={`week-${ci}`} style={styles.column}>
                {column.map((day, row) => {
                  if (!day) {
                    // eslint-disable-next-line react/no-array-index-key -- an empty slot in a fixed week
                    return <View key={row} style={{ width: cell, height: cell }} />;
                  }
                  const isTrained = trained.has(day.key);
                  const isToday = day.key === todayKey;
                  const fill = isTrained ? t.colors.textSecondary : t.colors.surface2;
                  if (isToday) {
                    // The ring, a gap of card ground, then the fill inside.
                    return (
                      <View
                        key={day.key}
                        testID={`day-${day.key}`}
                        accessibilityLabel={cellLabel(day, isTrained, isToday)}
                        style={[
                          styles.cell,
                          styles.todayRing,
                          { width: cell, height: cell, borderWidth: TODAY_OUTLINE, padding: TODAY_OUTLINE, borderColor: t.colors.textPrimary },
                        ]}
                      >
                        <View testID={`today-fill-${day.key}`} style={[styles.todayFill, { backgroundColor: fill }]} />
                      </View>
                    );
                  }
                  return (
                    <View
                      key={day.key}
                      testID={`day-${day.key}`}
                      accessibilityLabel={cellLabel(day, isTrained, isToday)}
                      style={[styles.cell, { width: cell, height: cell, backgroundColor: fill }]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
      <LegendRow
        style={styles.legend}
        items={[
          { key: 'trained', label: 'Trained', swatch: { fill: t.colors.textSecondary } },
          { key: 'none', label: 'No session', swatch: { fill: t.colors.surface2, outline: 'solid' } },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    position: 'relative',
  },
  monthSlot: {
    position: 'absolute',
    top: 0,
  },
  body: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  weekdayColumn: {
    width: LABEL_COLUMN,
    gap: GRID_GAP,
  },
  weekdaySlot: {
    justifyContent: 'center',
  },
  columns: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  column: {
    gap: GRID_GAP,
  },
  cell: {
    borderRadius: radius.xs,
  },
  todayRing: {
    backgroundColor: 'transparent',
  },
  todayFill: {
    flex: 1,
    borderRadius: radius.hair,
  },
  legend: {
    marginTop: spacing.sm,
  },
});
