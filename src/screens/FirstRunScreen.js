import { useState, useRef, useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, type } from '../styles/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import TextField from '../components/TextField';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

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
      appAlert('Something went wrong', e?.message ?? 'Try again.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* L03-C5 (2026-07-09 design audit): standardise on the app's
          KeyboardAvoidingView pattern for consistency, no fixed footer was
          found below this scroll. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>You&apos;re almost set up.</Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          Just your name, then a few quick questions to get you set up.
        </Text>

        <TextField
          ref={nameRef}
          label="What should we call you?"
          containerStyle={styles.nameField}
          fieldStyle={hasName && styles.inputActive}
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
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text maxFontSizeMultiplier={1.3} style={styles.hintText}>
            Next, three quick questions and we'll suggest a starter plan.{' '}
            Prefer to pick your own? You can <Text maxFontSizeMultiplier={1.3} style={styles.hintBold}>skip</Text>{' '}
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
