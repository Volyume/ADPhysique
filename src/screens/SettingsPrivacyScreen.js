import { useState, useCallback } from 'react';
import { View, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useAccountActions from '../hooks/useAccountActions';
import { colors, withAlpha, alpha } from '../styles/theme';
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
import { SettingsPage, SectionHeader, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

// Privacy & legal: health-data consent withdrawal, the two data-sharing
// toggles (Open Food Facts, anonymous usage), and the privacy policy.
export default function SettingsPrivacyScreen({ navigation }) {
  const { healthConsent, privacy, setAnalyticsOptOut } = useAppStore(
    useShallow(s => ({
      healthConsent: s.healthConsent,
      privacy: s.privacy,
      setAnalyticsOptOut: s.setAnalyticsOptOut,
    })),
  );
  const { withdrawing, handleWithdrawConsent } = useAccountActions();
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getOffWritebackConsent().then(setOffConsent);
      setCheckingLock(true);
      getAppLockEnabled().then((v) => { if (active) setAppLockOn(v); });
      getBiometricAvailability().then((a) => {
        if (!active) return;
        setBiometricAvailable(a.available);
        setCheckingLock(false);
      });
      return () => { active = false; };
    }, []),
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

  return (
    <SettingsPage title="Privacy">
      <View style={styles.section}>
        <SettingRow
          icon="share-social-outline"
          label="Share scanned labels with Open Food Facts"
          sub="Only if switched on: sends the label photo and nutrition details you confirm, so future scans can match it."
          showArrow={false}
          rightElement={
            <Switch
              value={offConsent}
              onValueChange={toggleOffConsent}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, alpha.half) }}
              thumbColor={offConsent ? colors.primary : colors.textMuted}
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
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, alpha.half) }}
              thumbColor={!privacy?.analyticsOptOut ? colors.primary : colors.textMuted}
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
      <View style={styles.section}>
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
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, alpha.half) }}
              thumbColor={appLockOn ? colors.primary : colors.textMuted}
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
      <View style={styles.section}>
        <SettingRow
          icon="shield-checkmark-outline"
          label={healthConsent === true ? 'Delete account and withdraw consent' : 'Health-data consent'}
          sub={healthConsent === true
            ? 'Destructive action. This withdraws health-data consent and permanently deletes your Volyume account, cloud data and local data.'
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
