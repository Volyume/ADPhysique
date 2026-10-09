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
import { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, spacing, fontScaleCaps } from '../../../styles/theme';
import SetRow, { SET_COLUMNS } from './SetRow';

// Spec section 2: the column-label row is 36 dp.
const COLUMNS_MIN_HEIGHT = 36;
// Three logged rows are the point at which the fold appears.
const FOLD_AT = 3;
const FOLD_HIT_SLOP = { top: spacing.xs2, bottom: spacing.xs2, left: 0, right: 0 };
// The 36 dp tick-all glyph reaches 48 dp with its slop.
const TICK_ALL_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

function plural(count, one, many) {
  return count === 1 ? one : many;
}

function FoldLine({ collapsed, hiddenCount, onPress, live, glyphColor }) {
  const label = collapsed
    ? `${hiddenCount} earlier ${plural(hiddenCount, 'set', 'sets')} logged`
    : 'Hide earlier sets';
  const spoken = collapsed
    ? `Show ${hiddenCount} earlier logged ${plural(hiddenCount, 'set', 'sets')}`
    : 'Hide earlier logged sets';
  return (
    <TouchableOpacity
      style={[styles.fold, live.fold]}
      onPress={onPress}
      hitSlop={FOLD_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityState={{ expanded: !collapsed }}
    >
      <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={iconSize.sm} color={glyphColor} />
      <Text style={live.foldText} maxFontSizeMultiplier={fontScaleCaps.chrome}>{label}</Text>
    </TouchableOpacity>
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
  const t = useTheme();
  const live = useMemo(() => ({
    columns: { borderBottomColor: t.colors.borderSubtle },
    // Column labels in the house overline (SectionLabel grammar).
    label: { ...t.type.overline, color: t.colors.textSecondary },
    fold: { borderBottomColor: t.colors.borderSubtle },
    foldText: { ...t.type.label, color: t.colors.textSecondary },
  }), [t]);
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
      <View style={[styles.columns, live.columns]}>
        <Text style={[styles.label, styles.colMarker, live.label]} numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.chrome}>SET</Text>
        <Text style={[styles.label, styles.colLast, live.label]} numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.chrome}>LAST</Text>
        <View style={styles.colWells}>
          {wellLabels.map((label) => (
            <Text key={label} style={[styles.label, styles.colWell, live.label]} numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.chrome}>{label.toUpperCase()}</Text>
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
              <Text style={[styles.label, live.label]} numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.chrome}>ALL</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {foldable ? (
        <FoldLine
          collapsed={collapsed}
          hiddenCount={hiddenCount}
          onPress={() => setExpanded((open) => !open)}
          live={live}
          glyphColor={t.colors.textSecondary}
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
  columns: {
    minHeight: COLUMNS_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderBottomWidth: 1,
  },
  label: { textAlign: 'center' },
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
  fold: {
    minHeight: COLUMNS_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
});
