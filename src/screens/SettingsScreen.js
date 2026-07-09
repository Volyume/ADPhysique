import { View, Platform } from 'react-native';
import { appAlert } from '../components/AppAlert';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { isHealthAvailable, getHealthProviderLabel } from '../lib/health';

// Settings landing. A short list of categories, each opening its own
// focused sub-page. The old single 1,500-line screen put every toggle on
// one wall; this is the tidy entry point into them.
//
// CP-6 (2026-07-09 UX audit): "Workout & units" used to render inline here
// (Hevy teardown 2026-06-29, R1/R2), breaking this screen's own "tap for a
// sub-page" contract. Moved wholesale into SettingsWorkoutScreen.js; this
// screen now just links to it like every other row.
export default function SettingsScreen({ navigation }) {
  const { user, tier } = useAppStore(useShallow(s => ({
    user: s.user,
    tier: s.tier,
  })));
  const healthOn = isHealthAvailable();

  return (
    <SettingsPage title="Settings">
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
          sub="Name, sex, height, date of birth and diet preference"
          onPress={() => navigation.navigate('SettingsProfile')}
        />
        <SettingRow
          icon="barbell-outline"
          label="Coaching"
          sub="Coach tone, cardio and weekly check-ins"
          onPress={() => navigation.navigate('SettingsCoaching')}
        />
        {/* CP-6 (2026-07-09 UX audit): this used to render inline on this
            screen (Hevy teardown 2026-06-29, R1/R2), breaking Settings' own
            "tap for a sub-page" contract. Moved wholesale into its own
            sub-page, SettingsWorkoutScreen.js; this is now just a row like
            every sibling above and below it. */}
        <SettingRow
          icon="body-outline"
          label="Workout & units"
          sub="Body-weight unit, default rest timer and rest alerts"
          onPress={() => navigation.navigate('SettingsWorkout')}
        />
        {tier === 'pro' ? (
          <SettingRow
            icon="nutrition-outline"
            label="Nutrition targets"
            sub="Your calorie and macro goals"
            onPress={() => navigation.navigate('NutritionTargets')}
          />
        ) : null}
        {tier === 'pro' ? (
          <SettingRow
            icon="restaurant-outline"
            label="Meal names"
            sub="Rename your meals"
            onPress={() => navigation.navigate('MealNames')}
          />
        ) : null}
        {tier === 'pro' ? (
          <SettingRow
            icon="calendar-outline"
            label="Per-day targets"
            sub="Plan a different calorie target for each weekday"
            onPress={() => navigation.navigate('PerDayTargets')}
          />
        ) : null}
        {tier === 'pro' ? (
          <SettingRow
            icon="leaf-outline"
            label="Dietary needs"
            sub="Diet, allergies and foods to avoid"
            onPress={() => navigation.navigate('SettingsDietary')}
          />
        ) : null}
        <SettingRow
          icon="notifications-outline"
          label="Notifications and reminders"
          sub="Training, meals, check-ins and quiet hours"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        {tier === 'pro' ? (
          <SettingRow
            icon="pulse-outline"
            label="Coaching reminders"
            sub="Morning weight log and weekly check-in"
            onPress={() => navigation.navigate('CoachingReminders')}
          />
        ) : null}
        <SettingRow
          icon="contrast-outline"
          label="Display and accessibility"
          sub="Text size, contrast, motion"
          onPress={() => navigation.navigate('SettingsDisplay')}
        />
        <SettingRow
          icon="apps-outline"
          label="Home screen widget"
          sub="Your next session, right on your home screen"
          onPress={() => appAlert(
            'Home screen widget',
            Platform.OS === 'android'
              ? 'Volyume has two home screen widgets: your next session, and this week\'s consistency. Long-press an empty spot on your home screen, choose Widgets, then find Volyume to add one.'
              : 'Volyume has home screen widgets for your next session and this week\'s consistency, plus a lock screen widget for your consistency. Long-press your home screen, tap the + in the corner, then find Volyume to add a widget. For the lock screen widget, long-press your lock screen, tap Customise, then add Volyume from the widget gallery.',
            [{ text: 'Got it' }],
          )}
        />
        {healthOn && (
          <SettingRow
            icon="heart-outline"
            label={getHealthProviderLabel()}
            sub="Weight and workouts"
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
          sub="Consent, data sharing and policy"
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
