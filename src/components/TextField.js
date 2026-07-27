import { forwardRef, useState, useContext, useId } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Keyboard, InputAccessoryView, Platform } from 'react-native';
import { spacing, radius, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { InsideBottomSheetContext } from './BottomSheet';

// CP-10 stage 1: SURFACES (colour) and SIZES (fontSize) were module-scope
// consts baked at import time (class 2, CP-10 plan section 1.4). Built
// per-render from the live theme now, so a TextField re-renders correctly
// on a theme change.
function buildSurfaces(c) {
  return {
    surface: c.surface,
    surface2: c.surface2,
    surfaceElevated: c.surfaceElevated,
  };
}

function buildSizes(fs) {
  return {
    md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fs.md, minHeight: 50 },
    lg: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fs.lg, minHeight: 54 },
  };
}

// Lazy-required so importing TextField -- the base component nearly every
// screen uses -- does not drag expo-haptics into every test that renders a
// field. Matches the lazy-require pattern used elsewhere in the codebase.
function doneFeedback() {
  try {
    // eslint-disable-next-line global-require
    require('../lib/haptics').selection();
  } catch (_) { /* haptics are best-effort */ }
}

const TextField = forwardRef(function TextField({
  label,
  value,
  onChangeText,
  accessibilityLabel,
  // Default is textMuted, not textDisabled: textDisabled fails WCAG contrast
  // for placeholder text in an enabled, editable field (measured 2.85-3.47:1
  // across surfaces; see docs/design-usability-audit-2026-07-09/
  // coverage-04-accessibility.md AY-1). textMuted clears 4.5:1 on every
  // surface in both themes and is already what most explicit overrides use.
  // Was a default-PARAMETER read of the static `colors` singleton (already
  // reactive-shaped, CP-10 plan section 1.4 class 3); now resolved inside
  // the body against the live theme so an explicit override still wins.
  placeholderTextColor,
  surface = 'surface2',
  size = 'md',
  leading,
  trailing,
  containerStyle,
  labelStyle,
  // Clamp the label to N lines. Default (undefined) keeps the label free to
  // wrap, which is right for full-width single-field prompts. Multi-column
  // rows (several fields side by side) pass 1 so a longer label can't wrap
  // and drop its field below the single-line siblings, breaking row alignment.
  labelNumberOfLines,
  fieldStyle,
  inputStyle,
  editable = true,
  multiline = false,
  onFocus,
  onBlur,
  keyboardType,
  // A1 (pre-release sweep 2026-07-27, LANE A): iOS number-pad/decimal-pad
  // keyboards have no Return key, so a numeric TextField auto-grows a Done
  // bar (InputAccessoryView) above the keyboard -- the fix SetEntry.js
  // pioneered, centralised here so every numeric field in the app inherits
  // it rather than being born broken. Opt out with noAccessory when a
  // caller already renders its own bar (so a field never gets two).
  noAccessory = false,
  // A4 (pre-release sweep 2026-07-27, LANE A -- "focus chaining between
  // sibling fields"): iOS number-pad/decimal-pad keyboards have no Return
  // key, so returnKeyType/onSubmitEditing are inert on them (the previous
  // wave deliberately removed exactly those dead props, A3). A numeric
  // sibling chain (feet -> inches, MEV -> MAV -> MRV, ...) therefore has no
  // native way to advance focus. When a caller supplies onAccessoryNext, the
  // numeric Done bar grows a leading "Next" button that calls it (typically
  // `() => nextRef.current?.focus()`); "Done" stays exactly as before.
  // Absent (the default, every existing caller), the bar is byte-for-byte
  // unchanged from A1.
  onAccessoryNext,
  ...inputProps
}, ref) {
  const [focused, setFocused] = useState(false);
  const t = useTheme();
  // Inside a bottom sheet the input MUST be gorhom's BottomSheetTextInput
  // (library requirement): a plain TextInput fights the sheet's keyboard
  // coordination and Android dismisses the keyboard after each keystroke
  // (founder-reported, 2026-07-10). Outside a sheet, the ordinary TextInput.
  const insideSheet = useContext(InsideBottomSheetContext);
  const InputComponent = insideSheet ? BottomSheetTextInput : TextInput;
  const SURFACES = buildSurfaces(t.colors);
  const SIZES = buildSizes(t.fontSize);
  const sizeStyle = SIZES[size] || SIZES.md;
  const surfaceColor = SURFACES[surface] || surface;
  const resolvedPlaceholderColor = placeholderTextColor ?? t.colors.textMuted;
  const disabled = editable === false;

  // A1: iOS only (InputAccessoryView is a no-op on Android, which has its
  // own back gesture -- Android behaviour is unchanged). Mirrors SetEntry's
  // isIOS / accessoryID / numericAccessory shape exactly.
  const isIOS = Platform.OS === 'ios';
  const isNumericPad = keyboardType === 'number-pad' || keyboardType === 'decimal-pad';
  const wantsAccessory = isIOS && isNumericPad && !noAccessory;
  const accessoryID = 'volyume-textfield-done-' + useId().replace(/:/g, '');
  const numericAccessory = wantsAccessory ? { inputAccessoryViewID: accessoryID } : null;

  function handleFocus(event) {
    setFocused(true);
    if (onFocus) onFocus(event);
  }

  function handleBlur(event) {
    setFocused(false);
    if (onBlur) onBlur(event);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { ...t.type.captionStrong, color: t.colors.textSecondary }, labelStyle]} numberOfLines={labelNumberOfLines}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            minHeight: sizeStyle.minHeight,
            backgroundColor: surfaceColor,
            borderColor: t.colors.border,
          },
          multiline && styles.fieldMultiline,
          focused && { borderColor: withAlpha(t.colors.primary, alpha.strong) },
          disabled && styles.disabled,
          fieldStyle,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <InputComponent
          ref={ref}
          style={[
            styles.input,
            {
              ...t.type.body,
              color: t.colors.textPrimary,
              paddingHorizontal: sizeStyle.paddingHorizontal,
              paddingVertical: sizeStyle.paddingVertical,
              fontSize: sizeStyle.fontSize,
            },
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={accessibilityLabel || label}
          placeholderTextColor={resolvedPlaceholderColor}
          editable={editable}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          {...numericAccessory}
          {...inputProps}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {/* A1: Done bar over the numeric keypad (iOS only; InputAccessoryView is
          a no-op on Android). Gives number-pad/decimal-pad fields a one-tap
          dismiss the OS keyboards do not provide, exactly as SetEntry.js.
          A4: when the caller wires onAccessoryNext, a leading "Next" button
          shares the same bar so a numeric sibling chain (no Return key to
          chain through) can still advance focus with one tap; omitted by
          every existing caller, so the bar is unchanged for them. */}
      {wantsAccessory && (
        <InputAccessoryView nativeID={accessoryID}>
          <View style={[styles.keyboardDoneBar, { backgroundColor: t.colors.surface2, borderTopColor: t.colors.border }]}>
            {onAccessoryNext ? (
              <TouchableOpacity
                onPress={() => { doneFeedback(); onAccessoryNext(); }}
                style={styles.keyboardDoneBtn}
                accessibilityRole="button"
                accessibilityLabel="Next field"
              >
                <Text style={[styles.keyboardDoneText, { ...t.type.bodyStrong, color: t.colors.primary }]}>Next</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => { doneFeedback(); Keyboard.dismiss(); }}
              style={styles.keyboardDoneBtn}
              accessibilityRole="button"
              accessibilityLabel="Done, close keyboard"
            >
              <Text style={[styles.keyboardDoneText, { ...t.type.bodyStrong, color: t.colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
});

export default TextField;

// Layout-only (theme-invariant): colour / type-size values (label, field
// border, fieldFocused, input text colour + type role) now come from the
// live theme per-render above (CP-10 stage 1) so TextField follows a theme
// flip with no restart.
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: {},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  fieldMultiline: { alignItems: 'flex-start' },
  disabled: { opacity: 0.55 },
  leading: {
    paddingLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailing: {
    paddingRight: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  // A1: numeric-keypad Done bar (iOS InputAccessoryView), same shape as
  // SetEntry.js's keyboardDoneBar/keyboardDoneBtn. Colours come from the
  // inline live-theme override applied at the call site above.
  keyboardDoneBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
  },
  keyboardDoneBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardDoneText: {},
});
