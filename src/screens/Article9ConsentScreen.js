import { useState } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import useAccountActions from '../hooks/useAccountActions';
import { getSupabaseClient } from '../lib/supabase';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';

/**
 * Article 9 health-data consent screen.
 *
 * Locked copy in docs/PRIVACY_CONSENT_LOCKED.md. Shown to every
 * signed-in user who hasn't yet granted explicit consent to Volyume
 * using their health and nutrition data. Blocks the rest of the app
 * until they tick the checkbox and tap Continue.
 *
 * On consent: calls record_health_consent(true) on Supabase which
 * updates users_profile.health_data_consent AND appends a row to
 * consent_log (audit trail). Local AsyncStorage caches the result
 * so the gate doesn't query cloud on every boot.
 */

const CONSENT_KEY_PFX = '@volyume_health_consent_';

// Version of the on-screen consent text the user is shown. Pinned in the
// audit trail (Art 7(1) / EDPB: the record should capture which consent copy
// was presented, not just the app version). Bump this whenever the consent
// body copy changes. Mirrors the locked-copy date in PRIVACY_CONSENT_LOCKED.md.
const CONSENT_VERSION = '2026-06-06';

export default function Article9ConsentScreen({ navigation }) {
  const { user, healthConsentGranted } = useAppStore(s => ({
    user: s.user,
    healthConsentGranted: s.healthConsentGranted,
  }));
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  // OB-6 (audit 02): the quiet "What if I don't agree?" affordance below the
  // actions. Purely additive: the consent copy above is compliance-locked and
  // untouched, and the gate itself is not weakened, reordered or skippable.
  const [declineInfoOpen, setDeclineInfoOpen] = useState(false);
  const { signingOut, deletingAccount, handleSignOut, handleDeleteAccount } = useAccountActions();

  async function handleContinue() {
    if (!agreed || busy) return;
    audit('consent.article9.continue.tap');
    setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Cloud client unavailable');
      // Make sure a profile row exists first. A brand-new account may not
      // have one yet, and both record_health_consent (an UPDATE) and
      // start_cascade (which raises 'profile not found' on a missing row)
      // need it. Without this the post-beta trial never starts for a new
      // user, so they fall through to the free setup instead of Pro
      // onboarding. The protect-tier trigger forces the new row to 'free'.
      if (user?.id) {
        try {
          await sb.from('users_profile').upsert({ id: user.id }, { onConflict: 'id' });
        } catch (e) {
          logError('Article9.ensureProfileRow', e, { uid: user?.id });
        }
      }
      const { error } = await sb.rpc('record_health_consent', {
        _granted: true,
        _app_version: Application.nativeApplicationVersion ?? null,
        _platform: Platform.OS,
      });
      // The cloud RPC is the source of truth for the audit log, but
      // network failure or a missing RPC (cloud migration not yet
      // applied) must not strand the user on this screen. Local
      // consent is still recorded so they can proceed. The cloud
      // sync layer will reconcile when the RPC + connectivity are
      // both available; until then the local flag governs gating.
      if (error) {
        logError('Article9.consent.cloudFailed', error, { uid: user?.id });
        // Don't lose the audit evidence: queue the consent so the next sync
        // retries record_health_consent once the RPC + connectivity are both
        // available (founder decision 2026-06-18). The local flag below still
        // lets the user proceed now.
        try {
          // eslint-disable-next-line global-require
          const { queuePendingConsent } = require('../lib/consent/pendingConsent');
          queuePendingConsent({
            userId: user?.id ?? null,
            granted: true,
            appVersion: Application.nativeApplicationVersion ?? null,
            platform: Platform.OS,
            consentVersion: CONSENT_VERSION,
          }).catch(() => {});
        } catch (_) { /* tolerate */ }
      }
      if (user?.id) {
        await AsyncStorage.setItem(`${CONSENT_KEY_PFX}${user.id}`, 'true');
      }
      logInfo('Article9.consent.granted', `uid=${user?.id ?? 'unknown'}`, {
        cloudRecorded: !error,
      });
      // Funnel telemetry: the legal evidence row lives in consent_log
      // via record_health_consent; this event is the dashboard
      // counterpart so the consent rate can be tracked over time.
      if (user?.id) {
        try {
          // eslint-disable-next-line global-require
          const { track } = require('../lib/engineTelemetry');
          track(user.id, 'article9_consent_recorded', {
            granted: true,
            cloudRecorded: !error,
            consentVersion: CONSENT_VERSION,
            appVersion: Application.nativeApplicationVersion ?? null,
            platform: Platform.OS,
          }).catch(() => {});
        } catch (_) {}
      }
      // Trial cascade starts at Article 9 consent per
      // SUBSCRIPTION_AND_PAYMENT_LOCKED.md line 106. RPC is
      // idempotent (no-ops for already-started users) and tolerates
      // network failure. Fire-and-forget; cascade catches up on next
      // sync if this one round-trip fails.
      try {
        // eslint-disable-next-line global-require
        const { cascade } = require('../lib/payments');
        // Await so the trial grant (tier='pro') lands before the navigator
        // re-renders on healthConsentGranted; otherwise a new user briefly
        // flashes the free setup before the cloud catches up. Failure is
        // tolerated: they proceed and can upgrade later.
        await cascade.startCascade().catch((e) => {
          logError('Article9.consent.startCascade', e, { uid: user?.id });
        });
      } catch (e) {
        logError('Article9.consent.startCascade.require', e);
      }
      healthConsentGranted?.();
      // F2 (audit SC-1): the sign-in cloud restore is consent-gated
      // (fail closed), so for a user who granted consent on THIS screen it
      // never ran. Kick one now that the store carries consent === true;
      // the runner's lock makes any overlapping trigger a harmless skip.
      if (user?.id) {
        try {
          // eslint-disable-next-line global-require
          const { syncAll } = require('../lib/sync');
          // eslint-disable-next-line global-require
          const store = require('../store/useAppStore').default;
          store.getState().markCloudSyncing?.();
          syncAll({ userId: user.id, localUserId: user.id, triggeredBy: 'manual' })
            .then(() => store.getState().markCloudSyncComplete?.())
            .catch((e2) => store.getState().markCloudSyncError?.(e2?.message));
        } catch (_) { /* the next foreground sync covers it */ }
      }
    } catch (e) {
      logError('Article9.consent.failed', e, { uid: user?.id });
      appAlert(
        'Could not save',
        'We could not record your consent. Check your connection and try again.',
      );
      setBusy(false);
    }
  }

  function openPrivacyPolicy() {
    // Show the policy in-app (native screen with its own BackHeader) instead of
    // bouncing to the system browser mid-consent.
    navigation?.navigate('PrivacyPolicy');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Health and nutrition data consent</Text>

        <Text style={styles.body}>
          Volyume works by using your health and nutrition data to tell you what to train, what to eat, and when to back off. Under UK and EU data law, we need your explicit consent to use this data.
        </Text>

        <Text style={styles.subhead}>The information Volyume uses to do its job:</Text>
        <BulletList items={[
          'Your weight and how it changes over time',
          'Your body fat percentage and lean mass when you enter them',
          'Everything you log to your food diary',
          'Your weekly check-ins, including energy, recovery, and how you feel',
          'The screening questions you answer about eating habits',
        ]} />

        <Text style={styles.subhead}>An automated safety check:</Text>
        <Text style={styles.body}>
          Volyume watches your weight trend, energy, and food logs together for signs of under-fuelling or disordered eating. If a concerning pattern shows up, it pauses your calorie changes and points you to support. This runs automatically on your health data.
        </Text>

        <Text style={styles.subhead}>What we never do with it:</Text>
        <BulletList items={[
          'Never sell it',
          'Never share it with advertisers',
          'Never use it to train a public AI model',
        ]} />

        <Text style={styles.subhead}>Where it lives:</Text>
        <BulletList items={[
          'On your phone, in encrypted local storage',
          'On our servers in the UK, with row-level security so only you and the team supporting your account can see it',
          'If you delete your account, all of it is removed straight away',
        ]} />

        <Pressable
          onPress={() => setAgreed(v => !v)}
          style={styles.consentRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="I agree to Volyume using my health and nutrition data to coach me"
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
          </View>
          <Text style={styles.consentText}>
            I agree to Volyume using my health and nutrition data to coach me.
          </Text>
        </Pressable>

        {/* Art 7(3): the user must be informed of the right to withdraw BEFORE
            giving consent, and withdrawal must be as easy as giving it. */}
        <Text style={styles.withdrawNote}>
          You can withdraw this consent at any time in You {'→'} Privacy.
        </Text>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!agreed || busy}
          style={[styles.ctaPrimary, (!agreed || busy) && styles.ctaDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !agreed || busy }}
        >
          <Text style={styles.ctaPrimaryText}>{busy ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={openPrivacyPolicy} style={styles.ctaGhost} accessibilityRole="link">
          <Text style={styles.ctaGhostText}>Read the full privacy policy</Text>
        </TouchableOpacity>

        {/* OB-6: a factual exit affordance for a hesitant user, whose only
            option used to be killing the app. One quiet line that expands a
            short explanation with a sign-out (and delete) route. Additive
            only: it sits BELOW the existing actions, rewords none of the
            locked consent copy above, and the gate stays un-skippable. */}
        <TouchableOpacity
          onPress={() => {
            if (!declineInfoOpen) audit('consent.article9.declineInfo.open');
            setDeclineInfoOpen(v => !v);
          }}
          style={styles.declineLink}
          accessibilityRole="button"
          accessibilityState={{ expanded: declineInfoOpen }}
          accessibilityLabel="What if I don't agree?"
        >
          <Text style={styles.declineLinkText}>What if I don't agree?</Text>
        </TouchableOpacity>

        {declineInfoOpen ? (
          <View style={styles.declineBox}>
            <Text style={styles.declineBody}>
              Without this consent, Volyume cannot process your health data, so the app cannot be used. Nothing is processed until you agree. Your options are to agree above, sign out and decide later, or delete your account and any data already stored.
            </Text>
            <TouchableOpacity
              onPress={signingOut ? undefined : handleSignOut}
              style={styles.declineAction}
              accessibilityRole="button"
              accessibilityState={{ disabled: signingOut }}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.declineActionText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deletingAccount ? undefined : handleDeleteAccount}
              style={styles.declineAction}
              accessibilityRole="button"
              accessibilityState={{ disabled: deletingAccount }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.declineActionText}>{deletingAccount ? 'Deleting account…' : 'Delete my account'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function BulletList({ items }) {
  return (
    <View style={styles.bullets}>
      {items.map((text, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  title: {
    ...type.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  subhead: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  bullets: { gap: spacing.xs, marginLeft: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: {
    color: colors.primary,
    fontSize: fontSize.md,
    lineHeight: 22,
    width: 12,
  },
  bulletText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 24, height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.hair,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  consentText: {
    ...type.bodySm,
    flex: 1,
    color: colors.textPrimary,
  },
  withdrawNote: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  ctaPrimary: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaPrimaryText: { ...type.bodyStrong, color: colors.onPrimary },
  ctaGhost: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaGhostText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
  // OB-6 "What if I don't agree?" affordance. Deliberately quieter than the
  // policy link so it reads as information, not a competing call to action.
  declineLink: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  declineLinkText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
  declineBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  declineBody: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  declineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  declineActionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
