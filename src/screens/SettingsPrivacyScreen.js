import { useState, useCallback } from 'react';
import { View, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useAccountActions from '../hooks/useAccountActions';
import { colors, withAlpha } from '../styles/theme';
import * as haptics from '../lib/haptics';
import {
  getConsent as getOffWritebackConsent,
  setConsent as setOffWritebackConsent,
} from '../lib/food/writeback';
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

  useFocusEffect(
    useCallback(() => {
      getOffWritebackConsent().then(setOffConsent);
    }, []),
  );

  async function toggleOffConsent(value) {
    haptics.selection();
    await setOffWritebackConsent(value);
    setOffConsent(value);
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
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
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
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
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
