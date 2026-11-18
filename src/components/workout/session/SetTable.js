/**
 * SetTable
 *
 * The active exercise's sets as a table: a 36 dp column-label row, then one
 * SetRow per entry of `rows` (12-BUILD-SPEC sections 2, 3, 4 and 6, register
 * D220). It sits inside the active ExerciseSection as a child. Presentation and
 * wiring only: it logs, saves and validates nothing.
 *
 * Props
 *   rows            the SetRow props of each row, in display order, plus an
 *                   `id` (any stable value) used as the React key and handed back
 *                   to the table-level callbacks. Anything else on a row (for
 *                   example onPressLast, or per-row callbacks) flows to SetRow
 *   onPressWell     (id, field) with field 'weight' or 'reps'
 *   onCheck         (id)
 *                   A table-level callback, when given, wins over the row's own
 *                   onPressWell and onCheck; with none, the row's own are used
 *   onLogRemaining  called with no arguments by the tick-all double check in the
 *                   last column label; without it the glyph is not a control
 *   columnsLabel    { weight }: the weight unit, shown as "{weight} · reps".
 *                   Without a weight label the column reads "Reps"
 *   kind            'weight_reps' (default), 'reps_only', 'duration' or
 *                   'distance': the wells column reads "{weight} · reps",
 *                   "Reps", "Time" or "{m|yd} · time". It is also each row's
 *                   kind unless the row names its own
 *   units           'kg' (default) or 'lb': metres or yards in the distance
 *                   label, and handed to every row for its spoken distance
 *   onRowLayout     (id, y) with each row's y inside the table, so the screen
 *                   can scroll the row being typed into above the keypad
 *
 * Row props kind, units, inputField, onLongPressRow and checkLabel flow to
 * SetRow like any other (see SetRow).
 *
 * The fold (spec section 4 and 6: "3 or more logged rows fold behind one line
 * inside the table"). The behaviour is the screen's old one (AWS fold line):
 * with three or more logged rows only the most recent logged row stays
 * visible, behind a one-line toggle reading "{n} earlier sets logged" and, once
 * opened, "Hide earlier sets". Rows that are not logged are never folded, and a
 * row being edited is never hidden. The open or closed state lives here.
 */
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SetColumnLabel, SetColumnsShell, SetFoldLabel, SetFoldShell } from '../../ui/exercise-card-kit';
import { spacing } from '../../../styles/theme';
import SetRow, { SET_COLUMNS } from './SetRow';

// Spec section 2: the column-label row is 36 dp.
const COLUMNS_MIN_HEIGHT = 36;
// Three logged rows are the point at which the fold appears.
const FOLD_AT = 3;
const FOLD_HIT_SLOP = { top: spacing.xs2, bottom: spacing.xs2, left: 0, right: 0 };
// The tick-all label is the check column's 48 dp wide and 36 dp high; its slop
// takes the height to 48 dp.
const TICK_ALL_HIT_SLOP = { top: 6, bottom: 6, left: 0, right: 0 };

function plural(count, one, many) {
  return count === 1 ? one : many;
}

function FoldLine({ collapsed, hiddenCount, onPress }) {
  const label = collapsed
    ? `${hiddenCount} earlier ${plural(hiddenCount, 'set', 'sets')} logged`
    : 'Hide earlier sets';
  const spoken = collapsed
    ? `Show ${hiddenCount} earlier logged ${plural(hiddenCount, 'set', 'sets')}`
    : 'Hide earlier logged sets';
  return (
    <SetFoldShell>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={FOLD_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityState={{ expanded: !collapsed }}
      >
        <SetFoldLabel collapsed={collapsed} label={label} />
      </TouchableOpacity>
    </SetFoldShell>
  );
}

export default function SetTable({
  rows,
  onLogRemaining,
  onPressWell,
  onCheck,
  columnsLabel,
  kind = 'weight_reps',
  units = 'kg',
  onRowLayout,
}) {
  const [expanded, setExpanded] = useState(false);

  const list = Array.isArray(rows) ? rows : [];
  const loggedAt = [];
  list.forEach((row, i) => {
    if (row && row.check === 'logged') loggedAt.push(i);
  });
  const foldable = loggedAt.length >= FOLD_AT;
  const collapsed = foldable && !expanded;
  const lastLogged = loggedAt[loggedAt.length - 1];
  const visible = [];
  list.forEach((row, i) => {
    const hidden = collapsed
      && row && row.check === 'logged'
      && i !== lastLogged
      && !(row.wells && row.wells.state === 'editing');
    if (!hidden) visible.push({ row, i });
  });
  const hiddenCount = list.length - visible.length;

  // One label over each well, on the row's own grid.
  const weightLabel = (columnsLabel && columnsLabel.weight) || 'kg';
  let wellLabels;
  if (kind === 'reps_only') wellLabels = ['Reps'];
  else if (kind === 'duration') wellLabels = ['Time'];
  else if (kind === 'distance') wellLabels = [units === 'kg' ? 'm' : 'yd', 'Time'];
  else wellLabels = [weightLabel, 'Reps'];

  return (
    <View>
      <SetColumnsShell>
        <View style={styles.colMarker}><SetColumnLabel>SET</SetColumnLabel></View>
        <View style={styles.colLast}><SetColumnLabel>LAST</SetColumnLabel></View>
        <View style={styles.colWells}>
          {wellLabels.map((label) => (
            <View key={label} style={styles.colWell}><SetColumnLabel>{label.toUpperCase()}</SetColumnLabel></View>
          ))}
        </View>
        <View style={styles.colCheck}>
          {/* Founder device verdict 2026-10-08: the double check here read as
              a second Finish. The column is unlabelled unless tick-all is
              wired, and then it is a plain word. */}
          {onLogRemaining ? (
            <TouchableOpacity
              testID="volyume-btn-log-remaining"
              style={styles.tickAll}
              hitSlop={TICK_ALL_HIT_SLOP}
              onPress={() => onLogRemaining()}
              accessibilityRole="button"
              accessibilityLabel="Log remaining sets"
            >
              <SetColumnLabel chrome>ALL</SetColumnLabel>
            </TouchableOpacity>
          ) : null}
        </View>
      </SetColumnsShell>

      {foldable ? (
        <FoldLine
          collapsed={collapsed}
          hiddenCount={hiddenCount}
          onPress={() => setExpanded((open) => !open)}
        />
      ) : null}

      {visible.map(({ row, i }) => (
        <SetRow
          key={row.id ?? `row-${i}`}
          {...row}
          kind={row.kind ?? kind}
          units={row.units ?? units}
          onLayout={onRowLayout ? (e) => onRowLayout(row.id, e?.nativeEvent?.layout?.y ?? 0) : row.onLayout}
          onPressWell={onPressWell ? (field) => onPressWell(row.id, field) : row.onPressWell}
          onCheck={onCheck ? () => onCheck(row.id) : row.onCheck}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  colMarker: { width: SET_COLUMNS.marker },
  colLast: { width: SET_COLUMNS.last },
  colWells: { flex: 1, minWidth: 0, flexDirection: 'row', gap: spacing.sm },
  colWell: { flex: 1, minWidth: 0 },
  colCheck: { width: SET_COLUMNS.check, alignItems: 'center', justifyContent: 'center' },
  tickAll: {
    width: SET_COLUMNS.check,
    minHeight: COLUMNS_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
