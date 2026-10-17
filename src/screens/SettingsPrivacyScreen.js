import { useState, useCallback } from 'react';
import { View, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useAccountActions from '../hooks/useAccountActions';
import { withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';
import {
  getConsent as getOffWritebackConsent,
  setConsent as setOffWritebackConsent,
} from '../lib/food/writeback';
import {
  getLockEnabled as getAppLockEnabled,
  setLockEnabled as setAppLockEnabled,
  getBiometricAvailability,
} from '../lib/biometricLock';
import { getSubscribed, setSubscribed } from '../lib/memberEmail/subscription';
import { getTopic, setTopic, TOPIC_WEEKLY_SUMMARY } from '../lib/memberEmail/topics';
import {
  MEMBER_EMAIL_SWITCH_LABEL, MEMBER_EMAIL_SWITCH_LINE, WEEKLY_SUMMARY_SWITCH_LABEL, WEEKLY_SUMMARY_SWITCH_LINE,
} from '../lib/memberEmail/copy';
import { SettingsPage, SectionHeader, SettingRow, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';

// Privacy & legal: health-data consent withdrawal, the two data-sharing
// toggles (Open Food Facts, anonymous usage), and the privacy policy.
export default function SettingsPrivacyScreen({ navigation }) {
  const { userId, healthConsent, privacy, setAnalyticsOptOut } = useAppStore(
    useShallow(s => ({
      userId: s.user?.id,
      healthConsent: s.healthConsent,
      privacy: s.privacy,
      setAnalyticsOptOut: s.setAnalyticsOptOut,
    })),
  );
  const { withdrawing, handleWithdrawConsent } = useAccountActions();
  // CP-10 stage 3: live theme (src/hooks/useTheme.js), so the switch track/
  // thumb colours and the shared chrome follow a theme change.
  const t = useTheme();
  const live = useSettingsStyles();
  const [offConsent, setOffConsent] = useState(false);
  // CP-7 (design-usability audit 2026-07-09): opt-in biometric app lock.
  // Default OFF. `biometricAvailable` is re-checked LIVE on every focus (not
  // cached) so a biometric removed in device settings while the user was
  // away is caught before they could otherwise flip this on. `checkingLock`
  // covers the brief async gap on first focus so the switch never renders
  // enabled/interactive before that check has actually resolved.
  const [appLockOn, setAppLockOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [checkingLock, setCheckingLock] = useState(true);
  // Member email (founder 2026-10-17): members are subscribed unless they
  // turn it off, so the switch starts ON and shows the last known value if
  // the cloud read fails (getSubscribed never throws).
  const [emailOn, setEmailOn] = useState(true);
  // Weekly summary topic: ON by default, shown off and disabled while the
  // main switch is off.
  const [weeklyOn, setWeeklyOn] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getOffWritebackConsent().then(setOffConsent);
      if (userId) getSubscribed(userId).then((r) => { if (active) setEmailOn(r.subscribed); });
      if (userId) getTopic(userId, TOPIC_WEEKLY_SUMMARY).then((r) => { if (active) setWeeklyOn(r.on); });
      setCheckingLock(true);
      getAppLockEnabled().then((v) => { if (active) setAppLockOn(v); });
      getBiometricAvailability().then((a) => {
        if (!active) return;
        setBiometricAvailable(a.available);
        setCheckingLock(false);
      });
      return () => { active = false; };
    }, [userId]),
  );

  async function toggleOffConsent(value) {
    haptics.selection();
    await setOffWritebackConsent(value);
    setOffConsent(value);
  }

  async function toggleAppLock(value) {
    haptics.selection();
    if (value) {
      // Never trust the last-focus read for the ENABLE path: re-check live,
      // right before writing the pref, so a user can never arm a lock they
      // cannot satisfy.
      const avail = await getBiometricAvailability();
      setBiometricAvailable(avail.available);
      if (!avail.available) return;
    }
    const ok = await setAppLockEnabled(value);
    if (ok) setAppLockOn(value);
  }

  async function toggleEmail(value) {
    haptics.selection();
    setEmailOn(value);
    if (userId) await setSubscribed(userId, value);
  }

  async function toggleWeekly(value) {
    haptics.selection();
    setWeeklyOn(value);
    if (userId) await setTopic(userId, TOPIC_WEEKLY_SUMMARY, value);
  }

  return (
    <SettingsPage title="Privacy">
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="share-social-outline"
          label="Share scanned labels with Open Food Facts"
          sub="Only if switched on: sends the label photo and nutrition details you confirm, so future scans can match it."
          showArrow={false}
          rightElement={
            <Switch
              value={offConsent}
              onValueChange={toggleOffConsent}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={offConsent ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="bar-chart-outline"
          label="Share usage data"
          sub="Helps us see which features get used and where the app is slow. Never your training, food, or body data. Turn it off any time."
          showArrow={false}
          rightElement={
            <Switch
              value={!privacy?.analyticsOptOut}
              onValueChange={v => setAnalyticsOptOut(!v)}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={!privacy?.analyticsOptOut ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="document-text-outline"
          label="Privacy policy"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
      </View>

      {/* CP-7 (design-usability audit 2026-07-09, coverage-06-competitive-hps.md):
          optional biometric app lock, off by default. A meaningful privacy
          surface given the app holds body weight, nutrition and check-in
          data -- guards against casual shoulder-surfing on an already-
          unlocked, shared, or borrowed phone. The switch can only ever be
          turned ON when the device has a biometric enrolled right now
          (checked live, never cached); it stays interactive to turn OFF
          even if that stops being true later, so the user is never stuck. */}
      <SectionHeader title="App lock" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="finger-print-outline"
          label="App lock (Face ID / fingerprint)"
          sub={
            !checkingLock && !biometricAvailable
              ? 'Set up Face ID, fingerprint or a passcode on this device to use this.'
              : 'Off by default. When on, Volyume asks for Face ID, your fingerprint, or your device passcode every time you open the app or return to it.'
          }
          showArrow={false}
          rightElement={
            <Switch
              value={appLockOn}
              onValueChange={toggleAppLock}
              disabled={checkingLock || (!appLockOn && !biometricAvailable)}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={appLockOn ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
      </View>

      {/* Member email (founder 2026-10-17). It sits here with the other
          data-sharing choices, not under Notifications: that screen is
          device push and reminder schedules, while this is a choice about
          what Volyume does with your email address, next to the privacy
          policy that describes it. ON by default; the same choice is in the
          unsubscribe link of every email. Works under calm mode and an open
          ED flag: turning emails off is never gated (they are withheld
          server-side under both). */}
      <SectionHeader title="Email" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="mail-outline"
          label={MEMBER_EMAIL_SWITCH_LABEL}
          sub={MEMBER_EMAIL_SWITCH_LINE}
          showArrow={false}
          rightElement={
            <Switch
              value={emailOn}
              onValueChange={toggleEmail}
              accessibilityRole="switch"
              accessibilityLabel={MEMBER_EMAIL_SWITCH_LABEL}
              accessibilityState={{ checked: emailOn }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={emailOn ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="calendar-outline"
          label={WEEKLY_SUMMARY_SWITCH_LABEL}
          sub={WEEKLY_SUMMARY_SWITCH_LINE}
          showArrow={false}
          rightElement={
            <Switch
              value={emailOn && weeklyOn}
              onValueChange={toggleWeekly}
              disabled={!emailOn}
              accessibilityRole="switch"
              accessibilityLabel={WEEKLY_SUMMARY_SWITCH_LABEL}
              accessibilityState={{ checked: emailOn && weeklyOn, disabled: !emailOn }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={emailOn && weeklyOn ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
      </View>

      {/* L04-13/D6 (2026-07-09 design audit): isolate health-data consent
          withdrawal below the routine sharing toggles, in its own
          bordered section, matching SettingsAccountScreen.js's isolated
          destructive-row pattern, so a destructive tap is never mistaken
          for a benign one. Only visually destructive (red icon/label)
          when the row is actually the delete action (healthConsent ===
          true); the underlying withdraw-consent behaviour and its
          existing two-step confirm are unchanged. */}
      <SectionHeader title="Health-data consent" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="shield-checkmark-outline"
          label={healthConsent === true ? 'Delete account and withdraw consent' : 'Health-data consent'}
          sub={healthConsent === true
            ? 'Destructive action. This withdraws health-data consent and permanently deletes your Volyume account, cloud data (including your Community profile and posts) and local data.'
            : healthConsent === false
              ? 'Withdrawn. Account deletion is in progress or complete.'
              : 'Not recorded yet.'}
          value={healthConsent === true ? 'Delete account' : healthConsent === false ? 'Withdrawn' : '-'}
          onPress={healthConsent === true && !withdrawing ? handleWithdrawConsent : undefined}
          showArrow={healthConsent === true}
          destructive={healthConsent === true}
        />
      </View>
    </SettingsPage>
  );
}
