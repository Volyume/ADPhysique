/**
 * Button
 *
 * The single button primitive. One press model (the PressableCard spring),
 * one disabled treatment, one loading treatment, so every CTA in the app
 * looks and behaves the same. Replaces the 14+ hand-rolled `primaryBtn`
 * style blocks the component audit found.
 *
 * Variants:
 *   primary     amber fill, dark text (default)
 *   secondary   raised surface, light text, subtle border
 *   tertiary    text-only, amber label (no fill)
 *   destructive solid error fill, light text
 *
 * Sizes: sm | md (default) | lg. `loading` shows an inline spinner and
 * disables the button. `icon` is a leading Ionicons name.
 */

import React from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableCard from './PressableCard';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.background, border: 'transparent' },
  secondary: { bg: colors.surface2, fg: colors.textPrimary, border: colors.border },
  tertiary: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  destructive: { bg: colors.error, fg: colors.textPrimary, border: 'transparent' },
};

const SIZES = {
  sm: { pv: spacing.sm, ph: spacing.md, font: fontSize.sm, icon: 16, gap: spacing.xs },
  md: { pv: spacing.md, ph: spacing.lg, font: fontSize.md, icon: 18, gap: spacing.sm },
  lg: { pv: spacing.lg, ph: spacing.lg, font: fontSize.md, icon: 20, gap: spacing.sm },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  trailingIcon,
  fullWidth = true,
  style,
  textStyle,
  accessibilityLabel,
  testID,
  children,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <PressableCard
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border === 'transparent' ? 0 : 1,
          paddingVertical: s.pv,
          paddingHorizontal: s.ph,
          gap: s.gap,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={s.icon} color={v.fg} /> : null}
          {title != null ? (
            <Text style={[styles.label, { color: v.fg, fontSize: s.font }, textStyle]}>
              {title}
            </Text>
          ) : null}
          {children}
          {trailingIcon ? <Ionicons name={trailingIcon} size={s.icon} color={v.fg} /> : null}
        </>
      )}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  // One disabled treatment app-wide.
  disabled: { opacity: 0.5 },
  label: { fontWeight: fontWeight.bold },
});
