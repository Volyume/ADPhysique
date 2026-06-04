import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';
import useAppStore from '../store/useAppStore';
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
const CONSENT_VERSION = '2026-05-23';

export default function Article9ConsentScreen({ navigation }) {
  const { user, healthConsentGranted } = useAppStore(s => ({
    user: s.user,
    healthConsentGranted: s.healthConsentGranted,
  }));
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    if (!agreed || busy) return;
    audit('consent.article9.continue.tap');
    setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Cloud client unavailable');
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
        cascade.startCascade().catch((e) => {
          logError('Article9.consent.startCascade', e, { uid: user?.id });
        });
      } catch (e) {
        logError('Article9.consent.startCascade.require', e);
      }
      healthConsentGranted?.();
    } catch (e) {
      logError('Article9.consent.failed', e, { uid: user?.id });
      Alert.alert(
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
          'If you delete your account, all of it is removed within 30 days',
        ]} />

        <Pressable
          onPress={() => setAgreed(v => !v)}
          style={styles.consentRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="I agree to Volyume using my health and nutrition data to coach me"
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Ionicons name="checkmark" size={18} color={colors.background} /> : null}
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
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  withdrawNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
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
  ctaPrimaryText: { ...type.bodyStrong, color: colors.background },
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
});
