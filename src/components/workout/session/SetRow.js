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
 *              ghost marks the coach's numbers, not yet touched; the set you
 *              are on shows them in full-strength ink all the same (LOC-683),
 *              only a finished or pending row fades
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
 *   holdOff    true while the phone's keyboard is up: the row stands aside,
 *              its hold is off and a tap on its blank space is not the row's,
 *              so it reaches the screen's scroll view, which puts the keyboard
 *              away (founder report 2026-10-11: tapping a blank area to put
 *              the keyboard down opened the set sheet instead). Its own
 *              controls keep their presses
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
 * Look (kit trial 2, LOC-412): the pieces are drawn by the kit parts in
 * src/components/ui/set-row-kit.tsx. The weight and reps wells are OUTLINED
 * boxes of the largest type on the row in tabular figures, and the one being
 * edited takes the amber ring (the only amber on the row). The Last fact and
 * the labels are smaller and quieter; a logged set fades back to the muted ink
 * (at least 4.5:1 in every palette). The check is a square tick box in a 48 by
 * 48 dp target (a checkbox, with the checked state spoken); the rows sit in the
 * exercise's one card, separated by the kit's Separator. No text on the row
 * fit-scales (adjustsFontSizeToFit): the columns are sized for their longest
 * content instead (D220 addendum 22).
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SetCheck, SetLastText, SetMarkerBadge, SetRowShell, SetWell } from '../../ui/set-row-kit';
import { spacing } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';
import { formatSeconds } from '../../../lib/workoutHelpers';
import memoByValue from './memoByValue';

// The grid, sized for the house card (a 360 dp phone's card is 326 dp inside
// its border). Marker 24, Last 80 and the check column 48 (the tick box's
// touch target, which sits flush to the card edge) are fixed; the two wells
// share what is left as equal boxes with an 8 dp gap between every column, so
// nothing touches (founder render verdict 2026-10-08, D220 addendum 8).
// SetTable lays its column labels on the same widths. Last is 80 so the
// longest fact it carries ("· 137.5 × 15", a stale three-digit weight with a half,
// 76.7 dp at bodySm in Inter) fits with no font fitting at all: on
// the founder's iPhone every fit-scaled text on the row being typed into
// collapsed far below its declared floor (D220 addendum 22), so nothing on
// the row scales at runtime any more.
export const SET_COLUMNS = Object.freeze({ marker: 24, last: 80, check: touchTarget.minimum });

// 44 dp wells and a 24 dp marker column are taken to 48 dp by their slop.
// Sideways each well takes half the gap between the two wells, so a tap that
// just misses a box lands on the nearer box, never on the row, whose 300 ms
// hold opens the set sheet (founder report 2026-10-11: the note sheet opened
// when tapping a box to enter a weight or reps).
const WELL_HIT_SLOP = { top: 2, bottom: 2, left: spacing.sm / 2, right: spacing.sm / 2 };
const MARKER_HIT_SLOP = { top: 0, bottom: 0, left: 12, right: 12 };

const MIDDLE_DOT = '\u00B7';
const COMPLETE_SET_TEST_ID = 'volyume-btn-complete-set';
const LONG_PRESS_MS = 300;
const LONG_PRESS_HINT = 'Hold for more options';

// The marker letters (D220 addendum 28): the screen stamps a letter for
// every set type but a working set, which carries its number.
const MARKER_NAMES = Object.freeze({
  W: 'warm-up', F: 'failure set', D: 'drop set', M: 'myo-reps set', R: 'rest-pause set', A: 'AMRAP set',
});
function markerName(marker) {
  return MARKER_NAMES[marker] ?? `set ${marker}`;
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

function MarkerCell({ marker, record, onPress, testID, hint }) {
  const isWarmup = marker === 'W';
  const isFailure = marker === 'F';
  const isTyped = typeof marker === 'string' && !isWarmup && !isFailure;
  // A warm-up and a typed set (drop, myo-reps, rest-pause, AMRAP) wear their
  // letter on the quiet badge; a failure set on the destructive one; a working
  // set carries its number (D220 addendum 28).
  const tone = isFailure ? 'failure' : isWarmup ? 'warmup' : isTyped ? 'typed' : 'number';
  const badge = <SetMarkerBadge tone={tone} text={String(marker)} record={record} />;
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

function LastCell({ last, onPress, testID }) {
  if (!last || !last.text) {
    return <View style={styles.lastCol} testID={testID} />;
  }
  const text = last.stale ? `${MIDDLE_DOT} ${last.text}` : last.text;
  const content = <SetLastText text={text} />;
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

function WellCell({ field, word, text, spoken, wellState, editingField, input, onPress, testID, name }) {
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
  const label = `${name} ${word}`;
  // While editing, the well itself is the field: no stepper, no label row. The
  // field fills the whole box and keeps the box's reach: sized to its one line
  // of text it left the box's top and bottom to the row, so a touch there that
  // rested 300 ms opened the set sheet instead of the keyboard (founder
  // report 2026-10-11). Its text wears the same numeral cap the number at rest
  // does, so a typed 137.5 cannot outgrow its well at the phone's largest text
  // (audit D9).
  const inputProps = input
    ? {
      ref: inputRef,
      testID: input.testID,
      value: input.value == null ? '' : String(input.value),
      onChangeText: input.onChangeText,
      keyboardType: input.keyboardType,
      returnKeyType: input.returnKeyType,
      inputAccessoryViewID: input.inputAccessoryViewID,
      onSubmitEditing: input.onSubmitEditing,
      selectTextOnFocus: true,
      submitBehavior: 'submit',
    }
    : null;
  return (
    <SetWell
      text={text}
      state={wellState}
      isEditing={isEditingThis}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={label}
      accessibilityValueText={text === '' ? 'empty' : spoken}
      accessibilityState={{ selected: isEditingThis, disabled: !onPress }}
      hitSlop={WELL_HIT_SLOP}
      input={inputProps}
    />
  );
}

function CheckButton({ check, onPress, testID, label, busy, onMore }) {
  const disabled = !onPress || !!busy;
  // A screen reader cannot hold a row, so the row's overflow is also an
  // accessibility action on the check (the one control every row has).
  const actions = onMore ? [{ name: 'longpress', label: 'More options' }] : undefined;
  return (
    <SetCheck
      testID={testID}
      logged={check === 'logged'}
      next={check === 'next'}
      onPress={disabled ? undefined : onPress}
      disabled={disabled && !onMore}
      busy={!!busy}
      accessibilityLabel={label}
      accessibilityHint={onMore ? LONG_PRESS_HINT : undefined}
      accessibilityActions={actions}
      onAccessibilityAction={onMore ? (e) => { if (e?.nativeEvent?.actionName === 'longpress') onMore(); } : undefined}
    />
  );
}

function SetRowView({
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
  holdOff = false,
  testIDs,
}) {
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
      />
      <LastCell last={last} onPress={onPressLast} testID={ids.last} />
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
              input={editingInput && editingInput.field === spec.field ? editingInput : null}
              onPress={onPressWell ? () => onPressWell(spec.field) : undefined}
              testID={spec.field === 'weight' ? ids.weight : ids.reps}
              name={name}
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
      />
    </>
  );

  // With a hold handler the hold lives on the container with no onPress of
  // its own, so the children keep their plain presses. accessible={false} keeps
  // the row from swallowing its own controls into one element for a screen
  // reader. A Pressable claims every touch on it, onPress or not, so while the
  // keyboard is up it is disabled (holdOff): a disabled Pressable claims
  // nothing, and a tap on the row's blank space puts the keyboard away. The
  // Pressable stays mounted either way, so the field being typed into is never
  // remounted. The divider under the row is the shell's.
  return (
    <SetRowShell
      testID={ids.row}
      onLayout={onLayout}
      onLongPress={onLongPressRow ? () => onLongPressRow() : null}
      holdOff={holdOff}
      longPressMs={LONG_PRESS_MS}
    >
      {body}
    </SetRowShell>
  );
}

const styles = StyleSheet.create({
  markerCol: { width: SET_COLUMNS.marker, alignItems: 'center' },
  markerPress: { minHeight: touchTarget.minimum, justifyContent: 'center' },
  lastCol: { width: SET_COLUMNS.last, alignItems: 'center', justifyContent: 'center' },
  lastPress: { minHeight: touchTarget.minimum },
  // The wells share the row's remaining width as equal boxes with the row gap
  // between them.
  wells: { flex: 1, minWidth: 0, flexDirection: 'row', gap: spacing.sm },
});

// A row draws again only when what it shows changes (LOC-648). The screen builds every
// row's props afresh on each render, which used to redraw every row on every tap.
export default memoByValue(SetRowView);
