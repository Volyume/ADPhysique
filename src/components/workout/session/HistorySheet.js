/**
 * HistorySheet
 *
 * The previous sets of one exercise and its records, one tap from the row
 * (12-BUILD-SPEC section 2b, register D220). Opened by the history button in
 * an exercise header and by the bests line. It is a presentational sheet: it
 * owns only which period the Records rows show, and nothing else, no
 * persistence and no store. The screen supplies every figure.
 *
 * Props
 *   visible, onClose  the BottomSheet contract
 *   exerciseName      the title
 *   segment           'history' | 'records', controlled by the caller
 *   onSegment         called with the segment the person picked
 *   history           newest first: [{ dateLabel, sets: [{ weight, reps, isBest }] }]
 *   records           { lifetime, threeMonths }, each { heaviest, mostRepsAtWeight,
 *                     bestEstimatedMax, bestSessionVolume }, any of them null
 *   repsAtWeight      [{ weight, reps, dateLabel }] best reps at each weight in the
 *                     last three months, heaviest first
 *   onUseSet          called with { weight, reps } when a set is tapped. The sheet
 *                     does not close itself: the caller decides.
 *   units             'kg'
 *
 * History: one block per session, the date, then its sets as house Chips
 * ("72.5 × 8"); the session's best set wears an amber ring. Records: a
 * Lifetime or 3 months toggle, four rows (label left, value right, date under
 * the value), then "Best reps at each weight" as a table whose rows are
 * pressable. Every pressable is at least 48 dp and reads "Use 72.5 kilograms
 * for 8 reps". No percentage table and nothing but weight and reps.
 */

import { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../../Text';
import BottomSheet from '../../BottomSheet';
import Chip from '../../Chip';
import SegmentedControl from '../../SegmentedControl';
import useTheme from '../../../hooks/useTheme';
import { formatSeconds } from '../../../lib/workoutHelpers';
import { spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

const TIMES = '×';
const MIDDLE_DOT = '\u00B7';
const EMPTY_TEXT = 'No sets logged yet for this exercise.';
const EMPTY_RECENT_TEXT = 'No sets in the last three months.';
const NONE_TEXT = 'None yet';

const SEGMENTS = [
  { label: 'History', value: 'history' },
  { label: 'Records', value: 'records' },
];

const PERIODS = [
  { key: 'lifetime', label: 'Lifetime' },
  { key: 'threeMonths', label: '3 months' },
];

function unitWord(units) {
  if (units === 'kg') return 'kilograms';
  if (units === 'lb' || units === 'lbs') return 'pounds';
  return units || 'kilograms';
}

function pressLabel(weight, reps, units) {
  return `Use ${weight} ${unitWord(units)} for ${reps} ${Number(reps) === 1 ? 'rep' : 'reps'}`;
}

function figure(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return (Math.round(n * 10) / 10).toLocaleString('en-GB');
}

// The set, by exercise kind (D220 addendum 34): reps alone, a time, a
// distance with its time, or the weight and reps.
function setText(set, units, kind = 'weight_reps') {
  if (kind === 'reps_only') return `${set.reps} ${Number(set.reps) === 1 ? 'rep' : 'reps'}`;
  if (kind === 'duration') return formatSeconds(set.reps);
  if (kind === 'distance') return `${figure(set.weight)} ${distanceWord(units)} ${MIDDLE_DOT} ${formatSeconds(set.reps)}`;
  return `${figure(set.weight)} ${units} ${TIMES} ${set.reps}`;
}

function distanceWord(units) {
  return units === 'kg' ? 'm' : 'yd';
}

function chipLabel(set, units, kind) {
  if (kind === 'reps_only') return String(set.reps);
  if (kind === 'duration') return formatSeconds(set.reps);
  if (kind === 'distance') return `${figure(set.weight)} ${MIDDLE_DOT} ${formatSeconds(set.reps)}`;
  return `${figure(set.weight)} ${TIMES} ${set.reps}`;
}

function chipSpoken(set, units, kind) {
  if (kind === 'reps_only') return `Use ${set.reps} ${Number(set.reps) === 1 ? 'rep' : 'reps'}`;
  if (kind === 'duration') return `Use ${formatSeconds(set.reps)}`;
  if (kind === 'distance') return `Use ${figure(set.weight)} ${units === 'kg' ? 'metres' : 'yards'} in ${formatSeconds(set.reps)}`;
  return pressLabel(figure(set.weight), set.reps, units);
}

function recordRows(period, units, kind = 'weight_reps') {
  const p = period || {};
  if (kind === 'reps_only') {
    return [
      { key: 'mostReps', label: 'Most reps in a set', record: p.mostReps, value: (r) => setText(r, units, kind) },
      { key: 'bestSessionReps', label: 'Most reps in a session', record: p.bestSessionReps, value: (r) => `${figure(r.value)} reps` },
    ];
  }
  if (kind === 'duration') {
    return [
      { key: 'longestSet', label: 'Longest set', record: p.longestSet, value: (r) => formatSeconds(r.reps) },
      { key: 'longestSession', label: 'Longest session', record: p.longestSession, value: (r) => formatSeconds(r.value) },
    ];
  }
  if (kind === 'distance') {
    return [
      { key: 'farthestSet', label: 'Farthest set', record: p.farthestSet, value: (r) => setText(r, units, kind) },
      { key: 'bestSessionDistance', label: 'Farthest session', record: p.bestSessionDistance, value: (r) => `${figure(r.value)} ${distanceWord(units)}` },
    ];
  }
  return [
    {
      key: 'heaviest',
      label: 'Heaviest set',
      record: p.heaviest,
      value: (r) => setText(r, units),
    },
    {
      key: 'mostRepsAtWeight',
      label: 'Most reps at this weight',
      record: p.mostRepsAtWeight,
      value: (r) => setText(r, units),
    },
    {
      key: 'bestEstimatedMax',
      label: 'Best estimated max',
      record: p.bestEstimatedMax,
      value: (r) => `${figure(r.value)} ${units}`,
    },
    {
      key: 'bestSessionVolume',
      label: 'Best session volume',
      record: p.bestSessionVolume,
      value: (r) => `${figure(r.value)} ${units}`,
    },
  ];
}

function hasAnyRecord(records) {
  return ['lifetime', 'threeMonths'].some(k => Object.values(records?.[k] || {}).some(Boolean));
}

export default function HistorySheet({
  visible, onClose, exerciseName, segment, onSegment,
  history, records, repsAtWeight, onUseSet, units = 'kg', kind = 'weight_reps',
}) {
  const t = useTheme();
  const live = useMemo(() => ({
    title: { ...t.type.title, color: t.colors.textPrimary },
    date: { ...t.type.label, color: t.colors.textSecondary },
    empty: { ...t.type.bodySm, color: t.colors.textMuted },
    bestChip: { borderColor: t.colors.primary },
    rowLabel: { ...t.type.label, color: t.colors.textSecondary },
    rowValue: { ...t.type.num('bodyStrong'), color: t.colors.textPrimary },
    rowNone: { ...t.type.bodySm, color: t.colors.textMuted },
    rowDate: { ...t.type.caption, color: t.colors.textMuted },
    heading: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    tableHead: { ...t.type.caption, color: t.colors.textMuted },
    tableRow: { borderBottomColor: t.colors.borderSubtle },
    cellStrong: { ...t.type.num('bodyStrong'), color: t.colors.textPrimary },
    cellDate: { ...t.type.label, color: t.colors.textSecondary },
  }), [t]);

  const [period, setPeriod] = useState('lifetime');
  // Each open starts on Lifetime; reseed on the closed-to-open edge, in render.
  const [wasVisible, setWasVisible] = useState(!!visible);
  if (!!visible !== wasVisible) {
    setWasVisible(!!visible);
    if (visible) setPeriod('lifetime');
  }

  const sessions = history || [];
  const recent = repsAtWeight || [];

  function use(weight, reps) {
    onUseSet?.({ weight, reps });
  }

  function renderHistory() {
    if (sessions.length === 0) {
      return <Text style={live.empty} testID="volyume-history-empty">{EMPTY_TEXT}</Text>;
    }
    return sessions.map((session, i) => (
      <View key={`${session.dateLabel}-${i}`} style={styles.block} testID={`volyume-history-session-${i}`}>
        <Text style={live.date}>{session.dateLabel}</Text>
        <View style={styles.chips}>
          {(session.sets || []).map((set, j) => (
            <Chip
              key={j}
              label={chipLabel(set, units, kind)}
              onPress={() => use(set.weight, set.reps)}
              accessibilityLabel={chipSpoken(set, units, kind)}
              style={set.isBest ? live.bestChip : undefined}
              testID={`volyume-history-chip-${i}-${j}`}
            />
          ))}
        </View>
      </View>
    ));
  }

  function renderRecords() {
    if (!hasAnyRecord(records) && recent.length === 0) {
      return <Text style={live.empty} testID="volyume-records-empty">{EMPTY_TEXT}</Text>;
    }
    const rows = recordRows(records?.[period], units, kind);
    return (
      <>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {PERIODS.map(p => (
            <Chip
              key={p.key}
              label={p.label}
              selected={period === p.key}
              onPress={() => setPeriod(p.key)}
              accessibilityRole="radio"
              testID={`volyume-records-period-${p.key}`}
            />
          ))}
        </View>

        <View>
          {rows.map(row => (
            <View key={row.key} style={styles.recordRow} testID={`volyume-records-row-${row.key}`}>
              <Text style={[styles.recordLabel, live.rowLabel]}>{row.label}</Text>
              <View style={styles.recordValue}>
                {row.record ? (
                  <>
                    <Text style={[styles.right, live.rowValue]}>{row.value(row.record)}</Text>
                    {row.record.dateLabel ? (
                      <Text style={[styles.right, live.rowDate]}>{row.record.dateLabel}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={[styles.right, live.rowNone]}>{NONE_TEXT}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* The reps-at-weight table is a weight exercise's (D220 addendum 34). */}
        {kind === 'weight_reps' ? (
          <>
        <Text style={live.heading} accessibilityRole="header">Best reps at each weight</Text>
        {recent.length === 0 ? (
          <Text style={live.empty} testID="volyume-records-table-empty">{EMPTY_RECENT_TEXT}</Text>
        ) : (
          <View>
            <View style={styles.tableHead}>
              <Text style={[styles.cellWeight, live.tableHead]}>Weight</Text>
              <Text style={[styles.cellReps, live.tableHead]}>Reps</Text>
              <Text style={[styles.cellDate, styles.right, live.tableHead]}>Date</Text>
            </View>
            {recent.map((row, i) => (
              <TouchableOpacity
                key={`${row.weight}-${i}`}
                style={[styles.tableRow, live.tableRow]}
                onPress={() => use(row.weight, row.reps)}
                accessibilityRole="button"
                accessibilityLabel={pressLabel(figure(row.weight), row.reps, units)}
                testID={`volyume-records-reps-${i}`}
              >
                <Text style={[styles.cellWeight, live.cellStrong]}>{`${figure(row.weight)} ${units}`}</Text>
                <Text style={[styles.cellReps, live.cellStrong]}>{String(row.reps)}</Text>
                <Text style={[styles.cellDate, styles.right, live.cellDate]}>{row.dateLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
          </>
        ) : null}
      </>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll accessibilityLabel={exerciseName}>
      <View style={styles.content}>
        <Text style={live.title} accessibilityRole="header">{exerciseName}</Text>
        <SegmentedControl
          options={SEGMENTS}
          value={segment === 'records' ? 'records' : 'history'}
          onChange={(value) => onSegment?.(value)}
          accessibilityLabel="History or records"
        />
        {segment === 'records' ? renderRecords() : renderHistory()}
      </View>
    </BottomSheet>
  );
}

// Layout only (theme-invariant). Type roles and colours come from the live
// theme above.
const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  block: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  recordLabel: { flex: 1 },
  recordValue: { alignItems: 'flex-end', flexShrink: 1 },
  right: { textAlign: 'right' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.xs },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.minimum,
    borderBottomWidth: 1,
  },
  cellWeight: { flex: 2 },
  cellReps: { flex: 1 },
  cellDate: { flex: 2 },
});
