import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

// Notifications: a short hub that points at the two reminder screens.
// Coaching reminders are Pro-only.
export default function SettingsNotificationsScreen({ navigation }) {
  const tier = useAppStore(useShallow(s => s.tier));

  return (
    <SettingsPage>
      <View style={styles.section}>
        <SettingRow
          icon="notifications-outline"
          label="Training reminders"
          sub="Set when Volyume nudges you to train"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        {tier === 'pro' && (
          <SettingRow
            icon="pulse-outline"
            label="Coaching reminders"
            sub="Morning weight log and weekly check-in"
            onPress={() => navigation.navigate('CoachingReminders')}
          />
        )}
      </View>
    </SettingsPage>
  );
}
