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
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

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
    <SettingsPage>
      <View style={styles.section}>
        <SettingRow
          icon="shield-checkmark-outline"
          label="Health-data consent"
          sub={healthConsent === true
            ? 'Granted. Tap to withdraw at any time.'
            : healthConsent === false
              ? 'Withdrawn. Some features are read-only.'
              : 'Not recorded yet.'}
          value={healthConsent === true ? 'On' : healthConsent === false ? 'Off' : '-'}
          onPress={healthConsent === true && !withdrawing ? handleWithdrawConsent : undefined}
          showArrow={healthConsent === true}
        />
        <SettingRow
          icon="share-social-outline"
          label="Share scanned labels with Open Food Facts"
          sub="This sends the macros you confirm and the label photo, so the next person who scans it gets a match."
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
          label="Privacy Policy"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
      </View>
    </SettingsPage>
  );
}
