import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../../styles/theme';

// The "Continue with Apple / Google" block plus the "or with email" divider.
// Shared by the LoginScreen and the Pro onboarding account step so the two
// auth surfaces stay byte-identical. Presentational only: the screens pass the
// handlers and the disabled state; no auth logic lives here. Apple is iOS-only
// (App Store rule: offering any social sign-in requires Sign in with Apple).
export default function OAuthButtons({ onApple, onGoogle, disabled, dividerLabel = 'or with email' }) {
  return (
    <View style={styles.block}>
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.btnApple, disabled && styles.btnDisabled]}
          onPress={onApple}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Ionicons name="logo-apple" size={18} color={colors.appleBtnText} />
          <Text style={styles.btnAppleText}>Continue with Apple</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={onGoogle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
        <Text style={styles.btnText}>Continue with Google</Text>
      </TouchableOpacity>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{dividerLabel}</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm, marginBottom: spacing.lg },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  btnText: { ...type.bodyStrong, color: colors.textPrimary },
  btnApple: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.appleBtnBg,
  },
  btnAppleText: { ...type.bodyStrong, color: colors.appleBtnText },
  btnDisabled: { opacity: 0.55 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
