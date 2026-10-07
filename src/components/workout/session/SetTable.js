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
 *
 * The fold (spec section 4 and 6: "3 or more logged rows fold behind one line
 * inside the table"). The behaviour is the screen's old one (AWS fold line):
 * with three or more logged rows only the most recent logged row stays
 * visible, behind a one-line toggle reading "{n} earlier sets logged" and, once
 * opened, "Hide earlier sets". Rows that are not logged are never folded, and a
 * row being edited is never hidden. The open or closed state lives here.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { iconSize, spacing } from '../../../styles/theme';
import SetRow, { SET_COLUMNS } from './SetRow';

// Spec section 2: the column-label row is 36 dp.
const COLUMNS_MIN_HEIGHT = 36;
// Three logged rows are the point at which the fold appears.
const FOLD_AT = 3;
const FOLD_HIT_SLOP = { top: spacing.xs2, bottom: spacing.xs2, left: 0, right: 0 };
const MIDDLE_DOT = '\u00B7';

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
      <Text style={live.foldText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SetTable({
  rows,
  onLogRemaining,
  onPressWell,
  onCheck,
  columnsLabel,
}) {
  const t = useTheme();
  const live = useMemo(() => ({
    columns: { borderBottomColor: t.colors.borderSubtle },
    label: { ...t.type.label, color: t.colors.textSecondary },
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

  const weightLabel = columnsLabel && columnsLabel.weight;
  const wellsLabel = weightLabel ? `${weightLabel} ${MIDDLE_DOT} reps` : 'Reps';

  return (
    <View>
      <View style={[styles.columns, live.columns]}>
        <Text style={[styles.label, styles.colMarker, live.label]} numberOfLines={1}>Set</Text>
        <Text style={[styles.label, styles.colLast, live.label]} numberOfLines={1}>Last</Text>
        <Text style={[styles.label, styles.colTarget, live.label]} numberOfLines={1}>Target</Text>
        <Text style={[styles.label, styles.colWells, live.label]} numberOfLines={1}>{wellsLabel}</Text>
        <View style={styles.colCheck}>
          {onLogRemaining ? (
            <TouchableOpacity
              style={styles.tickAll}
              onPress={() => onLogRemaining()}
              accessibilityRole="button"
              accessibilityLabel="Log remaining sets"
            >
              <Ionicons name="checkmark-done" size={iconSize.md} color={t.colors.textDisabled} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="checkmark-done" size={iconSize.md} color={t.colors.textDisabled} />
          )}
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
    gap: spacing.xs2,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderBottomWidth: 1,
  },
  label: { textAlign: 'center' },
  colMarker: { width: SET_COLUMNS.marker },
  colLast: { width: SET_COLUMNS.last },
  colTarget: { flex: 1, minWidth: 0 },
  colWells: { width: SET_COLUMNS.wells },
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
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
});
