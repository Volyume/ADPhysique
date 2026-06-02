import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, type, withAlpha } from '../../styles/theme';

// The email + password inputs shared by the LoginScreen and the Pro onboarding
// account step. Presentational only: it owns the focus styling and the
// show/hide toggle; the screen owns the values, the submit, and all auth logic.
// `mode` is 'signin' or 'signup' and only changes the placeholder and the
// autofill hints, never behaviour.
export default function EmailPasswordFields({
  mode = 'signin',
  email, onEmailChange,
  password, onPasswordChange,
  showPassword, onToggleShowPassword,
}) {
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const isSignup = mode === 'signup';

  return (
    <View style={styles.block}>
      <View style={styles.group}>
        <Text style={styles.label}>Email</Text>
        <View style={[styles.wrap, emailFocused && styles.wrapFocused]}>
          <TextInput
            testID="email"
            accessibilityLabel="Email"
            style={styles.input}
            value={email}
            onChangeText={onEmailChange}
            placeholder="you@example.com"
            placeholderTextColor={colors.textDisabled}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Password</Text>
        <View style={[styles.wrap, passwordFocused && styles.wrapFocused]}>
          <TextInput
            testID="password"
            accessibilityLabel="Password"
            style={[styles.input, styles.inputPassword]}
            value={password}
            onChangeText={onPasswordChange}
            placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
            placeholderTextColor={colors.textDisabled}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isSignup ? 'new-password' : 'password'}
            textContentType={isSignup ? 'newPassword' : 'password'}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={onToggleShowPassword}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.lg },
  group: { gap: spacing.sm },
  label: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3,
  },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  wrapFocused: { borderColor: withAlpha(colors.primary, 0.502) },
  input: {
    ...type.body,
    flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    color: colors.textPrimary,
  },
  inputPassword: { paddingRight: spacing.xxxl },
  eyeBtn: {
    position: 'absolute', right: spacing.md,
    top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: spacing.xs,
  },
});
