import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../components/Text';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import { SettingsPage } from '../components/SettingsPrimitives';
import { updatePassword } from '../lib/supabase';
import { authErrorMessage } from '../lib/authErrorCopy';
import { logError } from '../lib/errorLog';
import { spacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// Set a new password. Opened by a password-reset link (RootNavigator, after
// the Article 9 gate and onboarding) and from Account > Sign-in methods. An
// Apple- or Google-only account can use it too: it adds email and password
// as another way in. It signs nobody out and changes no identity.
export const MIN_NEW_PASSWORD_LENGTH = 8;

export default function SetNewPasswordScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    if (saving) return;
    if (password.length < MIN_NEW_PASSWORD_LENGTH) {
      setError(`Use a password of at least ${MIN_NEW_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) {
        logError('SetNewPassword.update', err, {});
        setError(authErrorMessage(err));
        return;
      }
      toast.show('Password saved. You can now sign in with your email too.', { variant: 'success' });
      navigation.goBack();
    } catch (e) {
      logError('SetNewPassword.threw', e, {});
      setError(authErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsPage title="Set a new password">
      <View style={styles.block}>
        <Text style={{ ...t.type.body, color: t.colors.textSecondary }}>
          Choose a password for your email sign-in. If you usually sign in with Apple or Google, this adds email as another way in.
        </Text>
        <TextField
          label="New password"
          testID="newPassword"
          accessibilityLabel="New password"
          surface="surface"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm new password"
          testID="confirmPassword"
          accessibilityLabel="Confirm new password"
          surface="surface"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {error ? (
          <Text style={{ ...t.type.caption, color: t.colors.error }} accessibilityLiveRegion="polite">{error}</Text>
        ) : null}
        <Button
          variant="emphatic"
          title="Save password"
          onPress={save}
          loading={saving}
          disabled={saving}
          accessibilityLabel="Save password"
        />
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.lg, paddingTop: spacing.md },
});
