/**
 * SetRow
 *
 * One set of the active exercise as a 64 dp row of the set table
 * (12-BUILD-SPEC sections 2, 2a and 3, register D220). Columns, left to right:
 * marker, Last, Target, the joined weight and reps wells, the check. The row
 * is display plus callbacks: every number arrives formatted or raw from the
 * screen, and nothing here validates, logs or stores.
 *
 * Props
 *   marker     'W' (warm-up), 'F' (failure set) or the set number
 *   last       { text, stale } | null. Last session's set at this position as
 *              "72.5 x 8". `stale` marks one carried from an earlier session
 *              (last session had no set here): muted ink and a leading dot
 *   target     { value, rule }: the coach's numbers over the coach's rule or
 *              the record threshold ("+2.5 at 10", "9 reps beats your best")
 *   wells      { weight, reps, state, editingField }. state is 'logged',
 *              'next', 'pending' (placeholder ink) or 'editing' (amber edge,
 *              and the field named by editingField, 'weight' or 'reps', in amber)
 *   check      'logged' | 'next' | 'pending'
 *   record     true shows the small "PR" tag after the Target value
 *   prTarget   { weight, reps } | null. The smallest set that would be a record
 *              at this row's weight. When present, the Target cell's second
 *              line is the "PR" tag then the set ("PR 70 x 9", no sentence) and
 *              replaces target.rule; null shows target.rule as before
 *   onPressLast    makes the Last cell a 48 dp button, "Use last session's set"
 *   onPressMarker  (added, section 4 says the marker opens the set type sheet
 *                  but section 3 lists no callback) makes the marker a button
 *   onPressWell    called with 'weight' or 'reps'
 *   onCheck        called with no arguments
 *   testIDs        { row, marker, last, weight, reps, check }. The check of the
 *                  next row defaults to "volyume-btn-complete-set", the primary
 *                  control's existing id, unless testIDs.check overrides it
 *
 * Ink (spec section 2): cell values are primary ink on tabular figures; on a
 * pending row they drop to secondary ink at the regular weight. Wells are the
 * page colour inside a hairline, 44 tall, two 48 wide cells; values are
 * semibold, placeholders disabled ink. The check is a 32 dp circle in a 48 dp
 * target: logged is an amber fill, next an amber ring, pending a raised grey.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { circle, radius, spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

// The drawing's grid. SetTable lays its column labels on the same widths; the
// Target column takes whatever is left.
export const SET_COLUMNS = Object.freeze({ marker: 30, last: 80, wells: 98, check: 36 });

// Spec section 2 sizes.
const ROW_MIN_HEIGHT = 64;
const MARKER_SIZE = 24;
const WELL_HEIGHT = 44;
const CHECK_SIZE = 32;
const TICK_SIZE = 18;
const RING_WIDTH = 1.5;
const PR_TAG_MIN_HEIGHT = 18;
// Dense numeric cells shrink a little before they would wrap or clip.
const FIT_SCALE = 0.75;
// 44 dp wells and a 30 dp marker column are taken to 48 dp by their slop.
const WELL_HIT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };
const CHECK_HIT_SLOP = { top: 0, bottom: 0, left: 6, right: 6 };
const MARKER_HIT_SLOP = { top: 0, bottom: 0, left: 9, right: 9 };

const MIDDLE_DOT = '\u00B7';
const TIMES = '\u00D7';
const COMPLETE_SET_TEST_ID = 'volyume-btn-complete-set';

function markerName(marker) {
  if (marker === 'W') return 'warm-up';
  if (marker === 'F') return 'failure set';
  return `set ${marker}`;
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function wellText(value) {
  return value == null || value === '' ? '' : String(value);
}

function checkLabel(check, marker) {
  const name = markerName(marker);
  if (check === 'next') return `Log ${name}`;
  if (check === 'logged') return `${capitalise(name)} logged`;
  return `${capitalise(name)} not logged yet`;
}

function repWord(reps) {
  return Number(reps) === 1 ? 'rep' : 'reps';
}

function buildLive(t) {
  const c = t.colors;
  const { num, w } = t.type;
  return {
    row: { borderBottomColor: c.borderSubtle },
    markerNumber: { ...num('label'), color: c.textSecondary },
    markerWarmup: { backgroundColor: c.primaryBg },
    markerWarmupText: { ...t.type.captionStrong, color: c.primary },
    markerFailure: { backgroundColor: c.errorBg },
    markerFailureText: { ...t.type.captionStrong, color: c.error },
    cell: { ...num('bodyStrong'), color: c.textPrimary },
    cellDim: { ...num('body'), color: c.textSecondary },
    cellStale: { color: c.textMuted },
    rule: { ...num('label'), color: c.textSecondary },
    prTag: { backgroundColor: c.primaryBg },
    prText: { ...t.type.captionStrong, color: c.primary },
    prTargetText: { ...num('label'), color: c.textPrimary },
    wells: { backgroundColor: c.background, borderColor: c.borderSubtle },
    wellsEditing: { borderColor: c.primary },
    wellDivider: { borderLeftColor: c.borderSubtle },
    wellValue: { ...w(num('bodyStrong'), 'semibold'), color: c.textPrimary },
    wellPlaceholder: { ...num('bodyStrong'), color: c.textDisabled },
    wellActive: { color: c.primary },
    checkLogged: { backgroundColor: c.primary },
    checkNext: { borderColor: c.primary },
    checkPending: { backgroundColor: c.surface3 },
  };
}

function MarkerCell({ marker, onPress, testID, live }) {
  const isWarmup = marker === 'W';
  const isFailure = marker === 'F';
  const badge = (
    <View style={[styles.marker, isWarmup && live.markerWarmup, isFailure && live.markerFailure]}>
      <Text
        style={isWarmup ? live.markerWarmupText : isFailure ? live.markerFailureText : live.markerNumber}
        numberOfLines={1}
      >
        {String(marker)}
      </Text>
    </View>
  );
  if (!onPress) {
    return <View style={styles.markerCol} testID={testID}>{badge}</View>;
  }
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.markerCol, styles.markerPress]}
      onPress={onPress}
      hitSlop={MARKER_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`Set type for ${markerName(marker)}`}
    >
      {badge}
    </TouchableOpacity>
  );
}

function LastCell({ last, onPress, testID, dim, live }) {
  if (!last || !last.text) {
    return <View style={styles.lastCol} testID={testID} />;
  }
  const text = last.stale ? `${MIDDLE_DOT} ${last.text}` : last.text;
  const content = (
    <Text
      style={[styles.cellText, dim ? live.cellDim : live.cell, last.stale && live.cellStale]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={FIT_SCALE}
    >
      {text}
    </Text>
  );
  if (!onPress) {
    return <View style={styles.lastCol} testID={testID}>{content}</View>;
  }
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.lastCol, styles.lastPress]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Use last session's set"
      accessibilityValue={{ text: last.stale ? `${last.text}, from an earlier session` : last.text }}
    >
      {content}
    </TouchableOpacity>
  );
}

function PrTag({ live, label }) {
  return (
    <View style={[styles.prTag, live.prTag]} accessible={!!label} accessibilityLabel={label}>
      <Text style={live.prText}>PR</Text>
    </View>
  );
}

function TargetCell({ target, record, prTarget, dim, live }) {
  const value = target && target.value != null ? String(target.value) : '';
  const rule = target && target.rule ? String(target.rule) : '';
  return (
    <View style={styles.targetCol}>
      <View style={styles.targetValueRow}>
        <Text
          style={[styles.cellText, styles.targetValue, dim ? live.cellDim : live.cell]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={FIT_SCALE}
        >
          {value}
        </Text>
        {record ? <PrTag live={live} label="Personal record" /> : null}
      </View>
      {prTarget ? (
        <View
          style={styles.prTargetRow}
          accessible
          accessibilityLabel={`A record at ${prTarget.weight} kilograms is ${prTarget.reps} ${repWord(prTarget.reps)}`}
        >
          <PrTag live={live} />
          <Text style={[styles.cellText, styles.targetValue, live.prTargetText]} numberOfLines={1}>
            {`${prTarget.weight} ${TIMES} ${prTarget.reps}`}
          </Text>
        </View>
      ) : rule ? (
        <Text style={[styles.cellText, styles.targetValue, live.rule]} numberOfLines={1}>{rule}</Text>
      ) : null}
    </View>
  );
}

function WellCell({ field, text, wellState, editingField, onPress, testID, name, divider, live }) {
  const isEditingThis = wellState === 'editing' && editingField === field;
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.wellCell, divider && styles.wellDivider, divider && live.wellDivider]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={WELL_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${field}`}
      accessibilityValue={{ text: text === '' ? 'empty' : text }}
      accessibilityState={{ selected: isEditingThis, disabled: !onPress }}
    >
      <Text
        style={[
          wellState === 'pending' ? live.wellPlaceholder : live.wellValue,
          isEditingThis && live.wellActive,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={FIT_SCALE}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function CheckButton({ check, onPress, testID, label, live, colors }) {
  const logged = check === 'logged';
  const next = check === 'next';
  const tick = logged ? colors.onPrimary : next ? colors.primary : colors.textDisabled;
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.checkCol}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={CHECK_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
    >
      <View
        style={[
          styles.check,
          logged && live.checkLogged,
          next && styles.checkRing,
          next && live.checkNext,
          !logged && !next && live.checkPending,
        ]}
      >
        <Ionicons name="checkmark" size={TICK_SIZE} color={tick} />
      </View>
    </TouchableOpacity>
  );
}

export default function SetRow({
  marker,
  last,
  target,
  wells,
  check = 'pending',
  record = false,
  prTarget = null,
  onPressLast,
  onPressMarker,
  onPressWell,
  onCheck,
  testIDs,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLive(t), [t]);
  const ids = testIDs || {};
  const w = wells || {};
  const wellState = w.state || 'pending';
  // Spec section 2: pending rows read in secondary ink at the regular weight.
  const dim = wellState === 'pending';
  const name = capitalise(markerName(marker));

  return (
    <View testID={ids.row} style={[styles.row, live.row]}>
      <MarkerCell marker={marker} onPress={onPressMarker} testID={ids.marker} live={live} />
      <LastCell last={last} onPress={onPressLast} testID={ids.last} dim={dim} live={live} />
      <TargetCell target={target} record={record} prTarget={prTarget} dim={dim} live={live} />
      <View style={[styles.wells, live.wells, wellState === 'editing' && live.wellsEditing]}>
        <WellCell
          field="weight"
          text={wellText(w.weight)}
          wellState={wellState}
          editingField={w.editingField}
          onPress={onPressWell ? () => onPressWell('weight') : undefined}
          testID={ids.weight}
          name={name}
          live={live}
        />
        <WellCell
          field="reps"
          text={wellText(w.reps)}
          wellState={wellState}
          editingField={w.editingField}
          onPress={onPressWell ? () => onPressWell('reps') : undefined}
          testID={ids.reps}
          name={name}
          divider
          live={live}
        />
      </View>
      <CheckButton
        check={check}
        onPress={onCheck ? () => onCheck() : undefined}
        testID={ids.check ?? (check === 'next' ? COMPLETE_SET_TEST_ID : undefined)}
        label={checkLabel(check, marker)}
        live={live}
        colors={t.colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderBottomWidth: 1,
  },
  markerCol: { width: SET_COLUMNS.marker },
  markerPress: { minHeight: touchTarget.minimum, justifyContent: 'center' },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  lastCol: { width: SET_COLUMNS.last, alignItems: 'center', justifyContent: 'center' },
  lastPress: { minHeight: touchTarget.minimum },
  targetCol: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  targetValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  targetValue: { flexShrink: 1 },
  prTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  cellText: { textAlign: 'center' },
  prTag: {
    minHeight: PR_TAG_MIN_HEIGHT,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  wells: {
    width: SET_COLUMNS.wells,
    height: WELL_HEIGHT,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  wellCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wellDivider: { borderLeftWidth: 1 },
  checkCol: {
    width: SET_COLUMNS.check,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: circle(CHECK_SIZE),
  },
  checkRing: { borderWidth: RING_WIDTH },
});
