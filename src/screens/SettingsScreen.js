import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { isHealthAvailable, getHealthProviderLabel } from '../lib/health';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

// Settings landing. A short list of categories, each opening its own
// focused sub-page. The old single 1,500-line screen put every toggle on
// one wall; this is the tidy entry point into them.
export default function SettingsScreen({ navigation }) {
  const { user, tier } = useAppStore(useShallow(s => ({ user: s.user, tier: s.tier })));
  const healthOn = isHealthAvailable();

  return (
    <SettingsPage>
      <View style={styles.section}>
        <SettingRow
          icon="person-circle-outline"
          label="Account"
          sub={user?.email || (tier === 'pro' ? 'Volyume Pro' : 'Free plan')}
          onPress={() => navigation.navigate('SettingsAccount')}
        />
        <SettingRow
          icon="person-outline"
          label="Profile"
          sub="Name and diet preference"
          onPress={() => navigation.navigate('SettingsProfile')}
        />
        <SettingRow
          icon="barbell-outline"
          label="Coaching"
          sub="Calmer mode, steps, cardio"
          onPress={() => navigation.navigate('SettingsCoaching')}
        />
        <SettingRow
          icon="notifications-outline"
          label="Notifications"
          sub="Training and coaching reminders"
          onPress={() => navigation.navigate('SettingsNotifications')}
        />
        <SettingRow
          icon="contrast-outline"
          label="Display and accessibility"
          sub="Text size, contrast, motion"
          onPress={() => navigation.navigate('SettingsDisplay')}
        />
        {healthOn && (
          <SettingRow
            icon="heart-outline"
            label={getHealthProviderLabel()}
            sub="Weight, steps and workouts"
            onPress={() => navigation.navigate('SettingsHealth')}
          />
        )}
        <SettingRow
          icon="cloud-outline"
          label="Your data"
          sub="Sync, backup, import, export"
          onPress={() => navigation.navigate('SettingsData')}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label="Privacy and legal"
          sub="Consent, data sharing, policy"
          onPress={() => navigation.navigate('SettingsPrivacy')}
        />
        <SettingRow
          icon="information-circle-outline"
          label="Help and about"
          sub="Feedback, rating, version"
          onPress={() => navigation.navigate('SettingsAbout')}
        />
      </View>
    </SettingsPage>
  );
}
