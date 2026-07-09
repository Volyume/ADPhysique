import { forwardRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, lineHeight, type, withAlpha } from '../styles/theme';
import { fontFamily } from '../styles/fontFamily';

const SURFACES = {
  surface: colors.surface,
  surface2: colors.surface2,
  surfaceElevated: colors.surfaceElevated,
};

const SIZES = {
  md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fontSize.md, minHeight: 50 },
  lg: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.lg, minHeight: 54 },
};

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
  placeholderTextColor = colors.textMuted,
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
  const sizeStyle = SIZES[size] || SIZES.md;
  const surfaceColor = SURFACES[surface] || surface;
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
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          {
            minHeight: sizeStyle.minHeight,
            backgroundColor: surfaceColor,
          },
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          disabled && styles.disabled,
          fieldStyle,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
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
          placeholderTextColor={placeholderTextColor}
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

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.xs * lineHeight.snug),
    color: colors.textSecondary,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fieldFocused: { borderColor: withAlpha(colors.primary, 0.65) },
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
    ...type.body,
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
