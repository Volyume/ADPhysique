import { View, Platform } from 'react-native';
import { appAlert } from '../components/AppAlert';
import { SettingsPage, SettingRow, SectionHeader, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import * as haptics from '../lib/haptics';

// Settings landing. A short list of categories, each opening its own
// focused sub-page. The old single 1,500-line screen put every toggle on
// one wall; this is the tidy entry point into them.
//
// CP-6 (2026-07-09 UX audit): "Workout & units" used to render inline here
// (Hevy teardown 2026-06-29, R1/R2), breaking this screen's own "tap for a
// sub-page" contract. Moved wholesale into SettingsWorkoutScreen.js; this
// screen now just links to it like every other row.
export default function SettingsScreen({ navigation }) {
  // Volyume is fully free (founder ruling): no tier, no Pro rows to gate.
  const { user } = useAppStore(useShallow(s => ({
    user: s.user,
  })));
  // CP-10 stage 3: live theme override appended after the frozen static
  // base, so this row-list card follows a theme change (SettingsPrimitives.js).
  const live = useSettingsStyles();

  return (
    <SettingsPage title="Settings">
      {/* Stage 2 item 11 (owner answer): six headings, rows exactly as the
          owner's table. Row mapping old -> new is in J2.md. */}
      {/* D231 (app layout rework, batch 5; amends item 11): "Injuries &
          limitations" (home: Train) and "Nutrition targets" (home: Coach and
          the Nutrition tab) no longer have a row here. */}
      <SectionHeader title="Training" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="barbell-outline"
          label="Coaching"
          sub="Calmer coaching, session readiness and coaching preferences"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsCoaching'); }}
        />
        <SettingRow
          icon="body-outline"
          label="Workout"
          sub="Session length, default rest timer and rest alerts"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsWorkout'); }}
        />
      </View>
      <SectionHeader title="Nutrition" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="leaf-outline"
          label="Dietary needs"
          sub="Diet, allergies and foods to avoid"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsDietary'); }}
        />
      </View>
      <SectionHeader title="Reminders" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="notifications-outline"
          label="Notifications"
          sub="Training reminder, getting-started nudges, welcome-back note, Community alerts, meal-log reminders and quiet hours"
          onPress={() => { haptics.selection(); navigation.navigate('NotificationSettings'); }}
        />
        <SettingRow
          icon="pulse-outline"
          label="Coaching reminders"
          sub="Morning weigh-in, weekly check-in, missed check-in follow-up and planned-meal confirmation"
          onPress={() => { haptics.selection(); navigation.navigate('CoachingReminders'); }}
        />
      </View>
      <SectionHeader title="Display & accessibility" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="contrast-outline"
          label="Display"
          sub="Appearance, text size, contrast, colour-blind palette, motion and haptics"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsDisplay'); }}
        />
        <SettingRow
          icon="scale-outline"
          label="Units"
          sub="Body weight and food energy"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsUnits'); }}
        />
        {Platform.OS === 'android' && (
          <SettingRow
            icon="apps-outline"
            label="Home screen widget"
            sub="Your next session, right on your home screen"
            onPress={() => { haptics.selection(); appAlert(
              'Home screen widget',
              'Volyume has two home screen widgets: your next session, and this week\'s consistency. Long-press an empty spot on your home screen, choose Widgets, then find Volyume to add one.',
              [{ text: 'Got it' }],
            ); }}
          />
        )}
      </View>
      <SectionHeader title="Privacy & data" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="cloud-outline"
          label="Your data"
          sub="Sync, backup, import, export"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsData'); }}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label="Privacy and legal"
          sub="Consent, data sharing and policy"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsPrivacy'); }}
        />
        {/* Community: opens Community privacy and sharing, not the tab's root
            (D231, batch 5). That screen works for someone who has not joined
            (it shows what Community would share and a way in), so the row is
            the same for everyone. The sub line names what the screen holds.
            D231 (batch 4): the Coach stack registers CommunityPrivacy, so the
            row opens it in place and Back returns to Settings (it was a
            cross-tab jump into the Community tab). */}
        <SettingRow
          icon="people-outline"
          label="Community"
          sub="Who can follow you, what you share, and who you have blocked or muted"
          onPress={() => { haptics.selection(); navigation.navigate('CommunityPrivacy'); }}
        />
      </View>
      <SectionHeader title="Account & help" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="person-circle-outline"
          label="Account"
          sub={user?.email || ''}
          onPress={() => { haptics.selection(); navigation.navigate('SettingsAccount'); }}
        />
        <SettingRow
          icon="person-outline"
          label="Profile"
          sub="Name, sex, height, date of birth and diet preference"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsProfile'); }}
        />
        <SettingRow
          icon="information-circle-outline"
          label="Help and about"
          sub="Feedback, rating, version"
          onPress={() => { haptics.selection(); navigation.navigate('SettingsAbout'); }}
        />
      </View>
    </SettingsPage>
  );
}
