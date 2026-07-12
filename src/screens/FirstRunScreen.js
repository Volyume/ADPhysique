import { useState, useRef, useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import TextField from '../components/TextField';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError } from '../lib/errorLog';

// First-run for Free users only. Pro signups go through ProOnboardingStack
// (profile > training > recovery > plan + nutrition generation). Free gets
// name + units, then the FreeStarter micro-quiz (B2, founder decision 4a):
// three plain questions that install a beginner plan from the library, with
// a visible skip for anyone who'd rather choose their own.
export default function FirstRunScreen({ navigation }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, units: _units, setUnits, userProfile, saveLocalProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
    setUnits: s.setUnits,
    userProfile: s.userProfile,
    saveLocalProfile: s.saveLocalProfile,
  })));
  // CP-10 batch D (2026-07-10): live theme (src/hooks/useTheme.js). See
  // buildLiveStyles header comment after the frozen `styles` block below.
  const t = useTheme();
  const live = buildLiveStyles(t);
  // Gym weights are kg-only (UK). No unit choice.
  const localUnits = 'kg';
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  const hasName = firstName.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  async function finish() {
    if (!hasName) return;
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      const merged = { ...(userProfile || {}), units: localUnits, firstName: firstName.trim() };
      if (user?.id) await saveLocalProfile(user.id, merged);
      // B2: hand over to the starter micro-quiz. It calls completeFirstRun
      // itself, after a plan is installed or the user skips.
      navigation.navigate('FreeStarter', { fromFirstRun: true });
      setBusy(false);
    } catch (e) {
      logError('FirstRunScreen.finish', e, { userId: user?.id });
      appAlert('Something went wrong', 'Try again.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]}>
      {/* L03-C5 (2026-07-09 design audit): standardise on the app's
          KeyboardAvoidingView pattern for consistency, no fixed footer was
          found below this scroll. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, live.title]}>You&apos;re almost set up.</Text>
        <Text style={[styles.subtitle, live.subtitle]}>
          Just your name, then a few quick questions to get you set up.
        </Text>

        <TextField
          ref={nameRef}
          label="What should we call you?"
          containerStyle={styles.nameField}
          fieldStyle={hasName && [styles.inputActive, live.inputActive]}
          size="lg"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          accessibilityLabel="First name"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={finish}
        />

        <Button
          title="Continue"
          trailingIcon="arrow-forward"
          size="lg"
          loading={busy}
          disabled={!hasName}
          onPress={finish}
        />

        <Card radius="md" padding="md" style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={16} color={t.colors.textMuted} />
          <Text style={[styles.hintText, live.hintText]}>
            Next, three quick questions and we'll suggest a starter plan.{' '}
            Prefer to pick your own? You can <Text style={[styles.hintBold, live.hintBold]}>skip</Text>{' '}
            and browse the library instead.
          </Text>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  title: { ...type.h2, color: colors.textPrimary, marginTop: spacing.lg },
  subtitle: { ...type.bodySm, color: colors.textSecondary },
  nameField: { marginTop: spacing.md },
  inputActive: { borderColor: colors.primary },
  // backgroundColor/borderRadius/padding/border now come from Card
  // (surface, radius="md", padding="md", 1px colors.border).
  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginTop: spacing.lg,
  },
  hintText: { ...type.captionTight, flex: 1, color: colors.textSecondary },
  hintBold: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
});

// CP-10 batch D (2026-07-10): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing
// sub-properties of the matching frozen style, at identical rest values, so
// this screen's tokens stay live under a theme/accessibility toggle. Pure
// layout keys (flex/gap/padding/width, no token) and static (non-theme)
// tokens like fontWeight are correctly omitted -- there is nothing to
// unfreeze for them. Same pattern as LogCardioScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    title: { ...t.type.h2, color: t.colors.textPrimary },
    subtitle: { ...t.type.bodySm, color: t.colors.textSecondary },
    inputActive: { borderColor: t.colors.primary },
    hintText: { ...t.type.captionTight, color: t.colors.textSecondary },
    hintBold: { color: t.colors.textPrimary },
  };
}
