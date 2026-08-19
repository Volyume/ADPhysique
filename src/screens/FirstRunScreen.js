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
import { isAppleUser, currentAppleIdentity, currentAppleProfilePatch } from '../lib/appleIdentity';

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
  // C5-P29-03 (D96): prefilled from the saved profile, the same source and
  // the same shape the Pro wizard uses (ProOnboardingScreen's firstName
  // state). A free user killed mid-quiz walks this screen again, and it used
  // to ask for a name the app had already stored and written.
  // App Review Guideline 4 (rejected twice, 2026-07-21 and 2026-08-19): an
  // Apple-authenticated athlete is never shown a name box. Authentication
  // Services already supplies the name, and this is the FREE onboarding screen
  // reached straight after the Apple button, so it asks for exactly what Apple
  // objected to. The Pro wizard's fix was audited and this screen was carrying
  // the same defect with no Apple awareness at all.
  //
  // Derived from the Supabase auth user, so it holds on the first sign-in and
  // on every one after (Apple returns the name once per Apple ID, ever).
  const appleUser = isAppleUser(user);
  const [firstName, setFirstName] = useState(() => (
    userProfile?.firstName
    || (isAppleUser(user)
      ? currentAppleIdentity({ sessionUser: user, storedProfile: userProfile }).firstName
      : null)
    || ''
  ));
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  // FQ-6.1 (D96): true only when a network-failed trial grant is queued for
  // retry (pendingCascade). Read once on mount; best-effort.
  const [trialPending, setTrialPending] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return undefined;
    // eslint-disable-next-line global-require
    require('../lib/payments/pendingCascade').hasPendingCascade(user.id)
      .then((v) => { if (!cancelled) setTrialPending(!!v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);
  const hasName = firstName.trim().length > 0;

  useEffect(() => {
    // Nothing to focus when the field is not rendered, and no keyboard should
    // be raised at an Apple athlete for a question they are not being asked.
    if (appleUser) return undefined;
    const t = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [appleUser]);

  async function finish() {
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      // C5-P1-09 (D96): the name is presentation only, no engine reads it, and
      // a neutral fallback already exists everywhere it is shown (Home's
      // greeting drops it, ProSetupComplete says "there"). It no longer gates
      // the whole free journey. An empty field leaves any stored name intact
      // rather than writing a blank over it.
      const merged = { ...(userProfile || {}), units: localUnits };
      if (hasName) merged.firstName = firstName.trim();
      // App Review Guideline 4: persist what Authentication Services already
      // supplied, so it is never asked for. Fills gaps only. See the matching
      // comment in ProOnboardingScreen for why the e-mail stays device-local.
      if (appleUser) {
        const applePatch = currentAppleProfilePatch({ sessionUser: user, storedProfile: merged });
        if (applePatch) Object.assign(merged, applePatch);
      }
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
          {appleUser
            ? 'A few quick questions to get you set up.'
            : 'Add your name if you like, then a few quick questions to get you set up.'}
        </Text>

        {/* FQ-6.1 (D96): a new user only lands on this FREE path with a
            queued trial when the grant call failed on the network at
            consent. Say so calmly - the sync runner retries and the
            navigator moves them to the Pro setup when it lands. Never
            renders otherwise; never claims the trial is active. */}
        {trialPending ? (
          <Text style={[styles.trialPendingNote, live.trialPendingNote]}>
            Your 14-day trial could not be set up yet because the connection dropped. It will finish setting up automatically when you are back online.
          </Text>
        ) : null}

        {appleUser ? null : (
        <TextField
          ref={nameRef}
          label="What should we call you? (optional)"
          containerStyle={styles.nameField}
          fieldStyle={hasName && [styles.inputActive, live.inputActive]}
          size="lg"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          accessibilityLabel="First name, optional"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={finish}
        />
        )}

        <Button
          title="Continue"
          trailingIcon="arrow-forward"
          size="lg"
          loading={busy}
          onPress={finish}
        />

        <Card radius="md" padding="md" style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={16} color={t.colors.textMuted} />
          {/* RC-8 (D96, Review C): the old line promised "skip and browse
              the library instead", but skipping from first run completes
              first run and lands on Home (the in-quiz library link is
              deliberately hidden in this context; Home's no-plan card
              offers both routes). Say what skipping actually does - a
              cross-remount navigate to honour the old sentence would be
              exactly the C5-P29 interruption class this campaign closed. */}
          <Text style={[styles.hintText, live.hintText]}>
            Next, three quick questions and we'll suggest a starter plan.{' '}
            Prefer to pick your own? You can <Text style={[styles.hintBold, live.hintBold]}>skip</Text>{' '}
            and choose from the plan library on Home.
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
  trialPendingNote: {
    ...type.bodySm, color: colors.textSecondary,
    marginBottom: spacing.md,
  },
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
// unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    title: { ...t.type.h2, color: t.colors.textPrimary },
    subtitle: { ...t.type.bodySm, color: t.colors.textSecondary },
    trialPendingNote: { ...t.type.bodySm, color: t.colors.textSecondary },
    inputActive: { borderColor: t.colors.primary },
    hintText: { ...t.type.captionTight, color: t.colors.textSecondary },
    hintBold: { color: t.colors.textPrimary },
  };
}
