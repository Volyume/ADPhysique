/**
 * SetRow
 *
 * One set of the active exercise as a 64 dp row of the set table
 * (12-BUILD-SPEC sections 2, 2a and 3, register D220; the row redrawn on the
 * founder's render verdict, D220 addendum 8). Columns, left to right: marker,
 * Last, the weight and reps wells as two separate boxes, the check. There is
 * no Target column: a pending row's wells carry the coach's weight and rep
 * range as placeholders, and the coach's rule and the record threshold are one
 * quiet line above the table (the screen's). The row is display plus
 * callbacks: every number arrives formatted or raw from the screen, and
 * nothing here validates, logs or stores.
 *
 * Props
 *   marker     'W' (warm-up), 'F' (failure set) or the set number
 *   last       { text, stale } | null. Last session's set at this position as
 *              "72.5 x 8". `stale` marks one carried from an earlier session
 *              (last session had no set here): muted ink and a leading dot
 *   wells      { weight, reps, state, editingField, ghost }. state is 'logged',
 *              'next', 'pending' (placeholder ink) or 'editing' (amber edge,
 *              and the field named by editingField, 'weight' or 'reps', in amber).
 *              ghost true renders the values in secondary ink: the coach's
 *              numbers, not yet touched (amber editing ink wins over it)
 *   kind       'weight_reps' (default, and 'weighted_bodyweight'), 'reps_only',
 *              'duration' or 'distance'. The screen keeps seconds in `reps` and
 *              distance in `weight`, so the wells keep their weight and reps
 *              keys and the kind only changes how they render: reps_only one
 *              reps well, duration one well of m:ss, distance two wells (the
 *              distance, then the time as m:ss). onPressWell still reports the
 *              field key, 'weight' or 'reps', never the meaning
 *   units      'kg' (default) or 'lb', used only for the spoken distance unit
 *              (metres or yards)
 *   inputField { field, value, onChangeText, keyboardType, returnKeyType,
 *              inputAccessoryViewID, testID, onSubmitEditing } | null. While
 *              wells.state is 'editing', the well named by field is a TextInput
 *              on the phone's keyboard (D220 addendum 18: the one input path);
 *              the other well stays a pressable value. returnKeyType and
 *              inputAccessoryViewID pass through as given, undefined included:
 *              the screen leaves the return key unset on an iOS number pad so
 *              the system draws no return-key capsule of its own, and names
 *              the keyboard bar as the input's accessory there (D220 addendum
 *              23)
 *   onLongPressRow  when given, the whole row answers a 300 ms hold with no
 *              arguments (the marker button carries "Hold for more options");
 *              a press on a well or the check is still a plain press
 *   checkLabel a string that replaces the check's spoken name (the screen's
 *              "Log warm-up", "Log other side", "Start cluster"); the spoken
 *              name IS the action's name (R4/D64)
 *   busy       true while the screen is saving: the check is disabled and
 *              speaks busy (P9: every save-path control exposes its in-flight
 *              state)
 *   onLayout   passed to the row's root view (the screen scrolls the row
 *              being typed into above the keypad)
 *   check      'logged' | 'next' | 'pending'
 *   record     true marks the row a personal record: a small amber "PR" under
 *              the set number, out of the entry area (founder verdict
 *              2026-10-08: nothing but the numbers lives beside the wells)
 *   onPressLast    makes the Last cell a 48 dp button, "Use last session's set"
 *   onPressMarker  (added, section 4 says the marker opens the set type sheet
 *                  but section 3 lists no callback) makes the marker a button
 *   onPressWell    called with 'weight' or 'reps'
 *   onCheck        called with no arguments
 *   testIDs        { row, marker, last, weight, reps, check }. The check of the
 *                  next row defaults to "volyume-btn-complete-set", the primary
 *                  control's existing id, unless testIDs.check overrides it
 *
 * Ink: the Last fact is secondary ink on tabular figures; the live number in a
 * well is the one figure at bodyStrong, a placeholder in disabled ink. No text
 * on the row fit-scales (adjustsFontSizeToFit): the columns are sized for
 * their longest content instead (D220 addendum 22). Each
 * well is the house field (surface2, 1.5 border, radius md) and only the well
 * being edited takes the amber edge. The check is a 28 dp mark in a 36 by 48
 * target: logged is the app's success checkmark-circle, next the one amber
 * ring on the card, pending a subtle ring.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../../hooks/useTheme';
import { alpha, circle, radius, spacing, withAlpha } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';
import { formatSeconds } from '../../../lib/workoutHelpers';

// The grid, sized for the house card (a 360 dp phone's card is 326 dp inside
// its border). Marker 24, Last 80 and the check 36 are fixed; the two wells
// share what is left as equal boxes with an 8 dp gap between every column, so
// nothing touches (founder render verdict 2026-10-08, D220 addendum 8).
// SetTable lays its column labels on the same widths. Last is 80 so the
// longest fact it carries ("· 137.5 × 15", a stale three-digit weight with a half,
// 76.7 dp at bodySm in Inter) fits with no font fitting at all: on
// the founder's iPhone every fit-scaled text on the row being typed into
// collapsed far below its declared floor (D220 addendum 22), so nothing on
// the row scales at runtime any more.
export const SET_COLUMNS = Object.freeze({ marker: 24, last: 80, check: 36 });

// Spec section 2 sizes.
const ROW_MIN_HEIGHT = 64;
const MARKER_SIZE = 24;
const WELL_HEIGHT = 44;
const CHECK_SIZE = 28;
const TICK_SIZE = 16;
const RING_WIDTH = 1.5;
// 44 dp wells and a 24 dp marker column are taken to 48 dp by their slop.
const WELL_HIT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };
const CHECK_HIT_SLOP = { top: 0, bottom: 0, left: 6, right: 6 };
const MARKER_HIT_SLOP = { top: 0, bottom: 0, left: 12, right: 12 };

const MIDDLE_DOT = '\u00B7';
const COMPLETE_SET_TEST_ID = 'volyume-btn-complete-set';
const LONG_PRESS_MS = 300;
const LONG_PRESS_HINT = 'Hold for more options';

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

function defaultCheckLabel(check, marker) {
  const name = markerName(marker);
  if (check === 'next') return `Log ${name}`;
  if (check === 'logged') return `${capitalise(name)} logged`;
  return `${capitalise(name)} not logged yet`;
}

function isEmpty(value) {
  return value == null || value === '';
}

// Seconds as m:ss; an empty or non-positive value is an empty well, never 0:00.
function timeText(value) {
  if (isEmpty(value)) return '';
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return formatSeconds(n);
}

function countWord(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// "1 minute 30 seconds", "2 minutes", "45 seconds".
function spokenTime(value) {
  if (timeText(value) === '') return '';
  const whole = Math.floor(Number(value));
  const mm = Math.floor(whole / 60);
  const ss = whole % 60;
  const parts = [];
  if (mm > 0) parts.push(countWord(mm, 'minute', 'minutes'));
  if (ss > 0) parts.push(countWord(ss, 'second', 'seconds'));
  return parts.join(' ');
}

function spokenDistance(value, units) {
  if (isEmpty(value)) return '';
  const n = Number(value);
  const word = units === 'kg' ? ['metre', 'metres'] : ['yard', 'yards'];
  return `${value} ${n === 1 ? word[0] : word[1]}`;
}

// The wells each kind renders, in order: the field key (what onPressWell and
// the store call it), the spoken name, and how the value reads on screen and
// aloud. weight_reps is the default, and weighted_bodyweight shares it.
function wellsFor(kind, units) {
  const plainText = wellText;
  const plainSpoken = (v) => wellText(v);
  if (kind === 'reps_only') {
    return [{ field: 'reps', word: 'reps', text: plainText, spoken: plainSpoken }];
  }
  if (kind === 'duration') {
    return [{ field: 'reps', word: 'time', text: timeText, spoken: spokenTime }];
  }
  if (kind === 'distance') {
    return [
      { field: 'weight', word: 'distance', text: plainText, spoken: (v) => spokenDistance(v, units) },
      { field: 'reps', word: 'time', text: timeText, spoken: spokenTime },
    ];
  }
  return [
    { field: 'weight', word: 'weight', text: plainText, spoken: plainSpoken },
    { field: 'reps', word: 'reps', text: plainText, spoken: plainSpoken },
  ];
}

function buildLive(t) {
  const c = t.colors;
  const { num } = t.type;
  return {
    row: { borderBottomColor: c.borderSubtle },
    markerNumber: { ...num('label'), color: c.textSecondary },
    markerWarmup: { backgroundColor: c.primaryBg },
    markerWarmupText: { ...t.type.captionStrong, color: c.primary },
    markerFailure: { backgroundColor: c.errorBg },
    markerFailureText: { ...t.type.captionStrong, color: c.error },
    // Facts are ink (the app's rule): Last in secondary ink at the list's
    // small numeric role; the live number in the well is the one figure at
    // bodyStrong.
    cellDim: { ...num('bodySm'), color: c.textSecondary },
    cellStale: { color: c.textMuted },
    prText: { ...t.type.captionStrong, color: c.primary },
    // Each well is the house field (TextField: surface2 fill, border 1.5
    // `border`, radius.md); the one being edited takes the field's focus edge.
    well: { backgroundColor: c.surface2, borderColor: c.border },
    wellEditing: { borderColor: withAlpha(c.primary, alpha.strong) },
    wellValue: { ...num('bodyStrong'), color: c.textPrimary },
    wellGhost: { color: c.textSecondary },
    // The house TextField's placeholder ink (textMuted); textDisabled is for
    // disabled controls (2026-10-09 audit D6).
    wellPlaceholder: { ...num('bodyStrong'), color: c.textMuted },
    wellActive: { color: c.textPrimary },
    // A logged set wears the app's "done" mark (checkmark-circle in
    // success); the set you are on is the one amber ring on the card.
    checkNext: { borderColor: c.primary },
    checkPending: { borderColor: c.borderSubtle },
  };
}

function MarkerCell({ marker, record, onPress, testID, hint, live }) {
  const isWarmup = marker === 'W';
  const isFailure = marker === 'F';
  const badge = (
    <View style={styles.markerStack}>
      <View style={[styles.marker, isWarmup && live.markerWarmup, isFailure && live.markerFailure]}>
        <Text
          style={isWarmup ? live.markerWarmupText : isFailure ? live.markerFailureText : live.markerNumber}
          numberOfLines={1}
        >
          {String(marker)}
        </Text>
      </View>
      {record ? (
        <Text style={live.prText} accessible accessibilityLabel="Personal record" numberOfLines={1}>PR</Text>
      ) : null}
    </View>
  );
  if (!onPress) {
    if (hint) {
      // Not a button, but it still has to say the row answers a hold.
      return (
        <View
          style={styles.markerCol}
          testID={testID}
          accessible
          accessibilityLabel={capitalise(markerName(marker))}
          accessibilityHint={hint}
        >
          {badge}
        </View>
      );
    }
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
      accessibilityHint={hint}
    >
      {badge}
    </TouchableOpacity>
  );
}

function LastCell({ last, onPress, testID, live }) {
  if (!last || !last.text) {
    return <View style={styles.lastCol} testID={testID} />;
  }
  const text = last.stale ? `${MIDDLE_DOT} ${last.text}` : last.text;
  const content = (
    <Text style={[styles.cellText, live.cellDim, last.stale && live.cellStale]} numberOfLines={1}>
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

function WellCell({ field, word, text, spoken, wellState, editingField, ghost, input, onPress, testID, name, live }) {
  const isEditingThis = wellState === 'editing' && editingField === field;
  // Focus through the input's own focus method, not autoFocus: on the new
  // architecture autoFocus makes the field first responder directly and never
  // applies selectTextOnFocus (2026-10-09 audit E1, verified in React
  // Native's RCTTextInputComponentView), which is why the founder's iPhone
  // showed the caret after the seed with nothing selected.
  const inputRef = useRef(null);
  const hasInput = !!input;
  useEffect(() => {
    if (!hasInput) return;
    const el = inputRef.current;
    if (el && typeof el.focus === 'function') el.focus();
  }, [hasInput]);
  const box = [styles.well, live.well, isEditingThis && live.wellEditing];
  const label = `${name} ${word}`;
  if (input) {
    // The well itself is the field: no stepper, no label row. A plain View, not
    // a button, so the field is its own element for a screen reader.
    return (
      <View style={box}>
        <TextInput
          ref={inputRef}
          testID={input.testID}
          style={[live.wellValue, live.wellActive, styles.wellInput]}
          value={input.value == null ? '' : String(input.value)}
          onChangeText={input.onChangeText}
          keyboardType={input.keyboardType}
          returnKeyType={input.returnKeyType}
          inputAccessoryViewID={input.inputAccessoryViewID}
          onSubmitEditing={input.onSubmitEditing}
          selectTextOnFocus
          submitBehavior="submit"
          accessibilityLabel={label}
        />
      </View>
    );
  }
  return (
    <TouchableOpacity
      testID={testID}
      style={box}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={WELL_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: text === '' ? 'empty' : spoken }}
      accessibilityState={{ selected: isEditingThis, disabled: !onPress }}
    >
      <Text
        style={[
          wellState === 'pending' ? live.wellPlaceholder : live.wellValue,
          ghost && wellState !== 'pending' && live.wellGhost,
          isEditingThis && live.wellActive,
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function CheckButton({ check, onPress, testID, label, busy, onMore, live, colors }) {
  const logged = check === 'logged';
  const next = check === 'next';
  const disabled = !onPress || !!busy;
  // A screen reader cannot hold a row, so the row's overflow is also an
  // accessibility action on the check (the one control every row has).
  const actions = onMore ? [{ name: 'longpress', label: 'More options' }] : undefined;
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.checkCol}
      onPress={disabled ? undefined : onPress}
      disabled={disabled && !onMore}
      hitSlop={CHECK_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={onMore ? LONG_PRESS_HINT : undefined}
      accessibilityState={{ disabled, busy: !!busy }}
      accessibilityActions={actions}
      onAccessibilityAction={onMore ? (e) => { if (e?.nativeEvent?.actionName === 'longpress') onMore(); } : undefined}
    >
      {logged ? (
        <Ionicons name="checkmark-circle" size={CHECK_SIZE} color={colors.success} />
      ) : (
        <View style={[styles.check, styles.checkRing, next ? live.checkNext : live.checkPending]}>
          {next ? <Ionicons name="checkmark" size={TICK_SIZE} color={colors.primary} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SetRow({
  marker,
  last,
  wells,
  check = 'pending',
  record = false,
  onPressLast,
  onPressMarker,
  onPressWell,
  onCheck,
  onLongPressRow,
  checkLabel,
  busy = false,
  onLayout,
  kind = 'weight_reps',
  units = 'kg',
  inputField = null,
  testIDs,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLive(t), [t]);
  const ids = testIDs || {};
  const w = wells || {};
  const wellState = w.state || 'pending';
  const name = capitalise(markerName(marker));

  const specs = wellsFor(kind, units);
  const editingInput = wellState === 'editing' && inputField ? inputField : null;
  const body = (
    <>
      <MarkerCell
        marker={marker}
        record={record}
        onPress={onPressMarker}
        testID={ids.marker}
        hint={onLongPressRow && !onPressMarker ? LONG_PRESS_HINT : undefined}
        live={live}
      />
      <LastCell last={last} onPress={onPressLast} testID={ids.last} live={live} />
      <View style={styles.wells}>
        {specs.map((spec) => {
          const value = w[spec.field];
          return (
            <WellCell
              key={spec.field}
              field={spec.field}
              word={spec.word}
              text={spec.text(value)}
              spoken={spec.spoken(value)}
              wellState={wellState}
              editingField={w.editingField}
              ghost={!!w.ghost}
              input={editingInput && editingInput.field === spec.field ? editingInput : null}
              onPress={onPressWell ? () => onPressWell(spec.field) : undefined}
              testID={spec.field === 'weight' ? ids.weight : ids.reps}
              name={name}
              live={live}
            />
          );
        })}
      </View>
      <CheckButton
        check={check}
        onPress={onCheck ? () => onCheck() : undefined}
        testID={ids.check ?? (check === 'next' ? COMPLETE_SET_TEST_ID : undefined)}
        label={checkLabel || defaultCheckLabel(check, marker)}
        busy={busy}
        onMore={onLongPressRow}
        live={live}
        colors={t.colors}
      />
    </>
  );

  if (onLongPressRow) {
    // The hold lives on the container with no onPress of its own, so the
    // children keep their plain presses. accessible={false} keeps the row from
    // swallowing its own controls into one element for a screen reader.
    return (
      <Pressable
        testID={ids.row}
        style={[styles.row, live.row]}
        onLayout={onLayout}
        onLongPress={() => onLongPressRow()}
        delayLongPress={LONG_PRESS_MS}
        accessible={false}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={ids.row} style={[styles.row, live.row]} onLayout={onLayout}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderBottomWidth: 1,
  },
  markerCol: { width: SET_COLUMNS.marker, alignItems: 'center' },
  markerPress: { minHeight: touchTarget.minimum, justifyContent: 'center' },
  markerStack: { alignItems: 'center' },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  lastCol: { width: SET_COLUMNS.last, alignItems: 'center', justifyContent: 'center' },
  lastPress: { minHeight: touchTarget.minimum },
  cellText: { textAlign: 'center' },
  // The wells share the row's remaining width as equal boxes with the row gap
  // between them.
  wells: { flex: 1, minWidth: 0, flexDirection: 'row', gap: spacing.sm },
  well: {
    flex: 1,
    minWidth: 0,
    height: WELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  wellInput: { alignSelf: 'stretch', minWidth: 0, padding: 0, textAlign: 'center' },
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
