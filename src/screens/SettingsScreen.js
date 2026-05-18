import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getSupabaseClient, signOut } from '../lib/supabase';
import useAppStore from '../store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { clearWorkoutHistory, buildWorkoutCSV } from '../lib/database';

function SettingRow({ icon, label, value, onPress, destructive, rightElement, showArrow = true }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress && !rightElement}>
      <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>{label}</Text>
      <View style={styles.settingRight}>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        {rightElement}
        {showArrow && onPress && !rightElement ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

const PHYSIQUE_PREF_KEY = '@volyume_physique_tracking_enabled';

export default function SettingsScreen({ navigation }) {
  const { user, setUser, setSession, units, setUnits, barWeight, setBarWeight } =
    useAppStore();
  const [physiqueEnabled, setPhysiqueEnabled] = useState(false);

  // Re-read on focus so the toggle stays in sync if the user enabled
  // tracking from the BodyMetrics opt-in screen.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PHYSIQUE_PREF_KEY).then(v => setPhysiqueEnabled(v === 'true'));
    }, []),
  );

  async function togglePhysique(value) {
    if (value) {
      Alert.alert(
        'Enable Physique Tracking',
        'This feature stores your body weight and measurements on this device. Your data never leaves your phone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              await AsyncStorage.setItem(PHYSIQUE_PREF_KEY, 'true');
              setPhysiqueEnabled(true);
            },
          },
        ],
      );
    } else {
      await AsyncStorage.setItem(PHYSIQUE_PREF_KEY, 'false');
      setPhysiqueEnabled(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (!user?.isLocal) {
            await signOut().catch(() => {});
          }
          await AsyncStorage.removeItem('@volyume_local_user_id');
          setUser(null);
          setSession(null);
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This will permanently delete all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            if (!user?.isLocal) {
              await getSupabaseClient()?.rpc('delete_user_data').catch(() => {});
              await signOut().catch(() => {});
            }
            await AsyncStorage.removeItem('@volyume_local_user_id');
            setUser(null);
            setSession(null);
          },
        },
      ],
    );
  }

  async function exportData() {
    if (!user?.id) return;
    try {
      const { csv, rowCount } = await buildWorkoutCSV(user.id);
      if (rowCount === 0) {
        Alert.alert('Nothing to export', 'Log some workouts first, then export your data here.');
        return;
      }
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileUri = `${FileSystem.cacheDirectory}volyume_export_${date}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Volyume data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export saved', `${rowCount} sets written to ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e?.message ?? 'Could not export your data. Please try again.');
    }
  }

  async function handleClearHistory() {
    Alert.alert(
      'Clear workout history?',
      'This permanently deletes all your logged sessions and sets. Your personal records will also be cleared as they are calculated from your history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            await clearWorkoutHistory(user.id).catch(() => {});
            Alert.alert('Done', 'Your workout history has been cleared.');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Preferences */}
        <SectionHeader title="PREFERENCES" />
        <View style={styles.section}>
          <SettingRow
            icon="scale-outline"
            label="Weight units"
            value={units}
            onPress={() =>
              Alert.alert('Weight units', 'Choose your preferred unit', [
                { text: 'kg', onPress: () => setUnits('kg') },
                { text: 'lbs', onPress: () => setUnits('lbs') },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
          <SettingRow
            icon="barbell"
            label="Bar weight"
            value={`${barWeight}kg`}
            onPress={() =>
              Alert.alert('Bar weight', 'Standard (20kg) or other?', [
                { text: '15 kg', onPress: () => setBarWeight(15) },
                { text: '20 kg', onPress: () => setBarWeight(20) },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
          <SettingRow
            icon="body-outline"
            label="Physique tracking"
            showArrow={false}
            rightElement={
              <Switch
                value={physiqueEnabled}
                onValueChange={togglePhysique}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={physiqueEnabled ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            showArrow={false}
            rightElement={<Text style={styles.comingSoon}>Coming soon</Text>}
          />
        </View>

        {/* Exercise Library */}
        <SectionHeader title="EXERCISE LIBRARY" />
        <View style={styles.section}>
          <SettingRow
            icon="barbell-outline"
            label="Browse & manage exercises"
            onPress={() => navigation.navigate('ExerciseLibrary')}
          />
        </View>

        {/* Data */}
        <SectionHeader title="DATA & PRIVACY" />
        <View style={styles.section}>
          <SettingRow
            icon="download-outline"
            label="Export my data (CSV)"
            onPress={exportData}
          />
          <SettingRow
            icon="trash-outline"
            label="Clear workout history"
            destructive
            onPress={handleClearHistory}
          />
        </View>

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.section}>
          <SettingRow
            icon="log-out-outline"
            label="Sign out"
            destructive
            onPress={handleSignOut}
          />
          <SettingRow
            icon="trash-outline"
            label="Delete account"
            destructive
            onPress={handleDeleteAccount}
          />
        </View>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.appName}>Volyume</Text>
          <Text style={styles.appVersion}>v1.0.0 · Free during beta</Text>
          <Text style={styles.tagline}>Intelligent Hypertrophy Logbook</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: { backgroundColor: colors.errorBg },
  settingLabel: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
  settingLabelDestructive: { color: colors.error },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  comingSoon: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  about: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  appName: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary, letterSpacing: 2 },
  appVersion: { fontSize: fontSize.sm, color: colors.textMuted },
  tagline: { fontSize: fontSize.xs, color: colors.textMuted },
});
