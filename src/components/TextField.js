import { forwardRef, useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
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
  fieldStyle,
  inputStyle,
  editable = true,
  multiline = false,
  onFocus,
  onBlur,
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
        <Text style={[styles.label, { ...t.type.captionStrong, color: t.colors.textSecondary }, labelStyle]}>
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
          {...inputProps}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
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
});
