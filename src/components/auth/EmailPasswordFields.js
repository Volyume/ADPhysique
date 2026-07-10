import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import TextField from '../TextField';

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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const isSignup = mode === 'signup';

  return (
    <View style={styles.block}>
      <View style={styles.group}>
        <TextField
          label="Email"
          testID="email"
          accessibilityLabel="Email"
          surface="surface"
          value={email}
          onChangeText={onEmailChange}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
      </View>

      <View style={styles.group}>
        <TextField
          label="Password"
          testID="password"
          accessibilityLabel="Password"
          surface="surface"
          value={password}
          onChangeText={onPasswordChange}
          placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isSignup ? 'new-password' : 'password'}
          textContentType={isSignup ? 'newPassword' : 'password'}
          trailing={(
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={onToggleShowPassword}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={t.colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.lg },
  group: { gap: spacing.sm },
  eyeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
