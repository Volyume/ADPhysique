/**
 * PartnerPreviewScreen
 *
 * Lands here from a volyume://partner/<token> invite deep link. Shows a plain
 * "a training partner invited you" preview, lets the user choose the name their
 * partner will see (never the account name), and accepts. Enforced gracefully:
 * the 7-day onboarding lock and any expired/full-circle errors surface as calm
 * copy, never a crash.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import * as haptics from '../lib/haptics';
import { acceptInvite } from '../lib/partners/partnerService';

const FRIENDLY_ERROR = {
  onboarding_lock: 'You can connect a training partner after your first week.',
  invalid_or_expired_invite: 'This invite has expired or already been used. Ask your partner for a fresh link.',
  circle_full: 'This circle is full.',
};

export default function PartnerPreviewScreen({ route, navigation }) {
  const token = route?.params?.token ?? null;
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleAccept() {
    if (busy || !token) return;
    setBusy(true);
    setError(null);
    haptics.selection();
    const res = await acceptInvite(token, displayName.trim());
    setBusy(false);
    if (res.ok) {
      navigation.replace('TrainingPartners');
      return;
    }
    setError(FRIENDLY_ERROR[res.code] ?? 'We could not accept this invite right now. Try again.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="people-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>A training partner invited you</Text>
        <Text style={styles.body}>
          You will share a simple weekly signal: whether you trained, and your
          session count. Nothing else. No weight, food, body data or coaching.
        </Text>

        <Text style={styles.inputLabel}>The name your partner sees</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Alex"
          placeholderTextColor={colors.textMuted}
          maxLength={40}
          autoCapitalize="words"
          accessibilityLabel="Display name your partner sees"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Accept" onPress={handleAccept} loading={busy} disabled={!token} />
        <Button
          title="Not now"
          variant="tertiary"
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: spacing.lg,
  },
  title: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  body: { ...type.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  inputLabel: { ...type.label, color: colors.textSecondary, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    color: colors.textPrimary, ...type.body,
  },
  error: { ...type.caption, color: colors.error, textAlign: 'center' },
});
