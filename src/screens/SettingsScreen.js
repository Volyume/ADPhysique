import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getSupabaseClient, signOut } from '../lib/supabase';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { clearWorkoutHistory, buildWorkoutCSV } from '../lib/database';
import { exportBackup, importBackup } from '../lib/dataBackup';
import { getWellbeingMode, setWellbeingMode, WELLBEING_HELPLINE } from '../lib/wellbeing';
import Constants from 'expo-constants';

const WELLBEING_LABELS = {
  calm: 'Calmer experience',
  normal: 'Standard',
  unspecified: 'Not set',
};

function SettingRow({ icon, label, value, onPress, destructive, rightElement, showArrow = true }) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={value ? `${label}: ${value}` : label}
    >
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
  const { user, setUser, setSession, units, setUnits, barWeight, setBarWeight, userProfile, saveLocalProfile, tier } =
    useAppStore(useShallow(s => ({
      user: s.user, setUser: s.setUser, setSession: s.setSession,
      units: s.units, setUnits: s.setUnits,
      barWeight: s.barWeight, setBarWeight: s.setBarWeight,
      userProfile: s.userProfile, saveLocalProfile: s.saveLocalProfile,
      tier: s.tier,
    })));
  const [editName, setEditName] = useState(userProfile?.firstName ?? '');
  const [physiqueEnabled, setPhysiqueEnabled] = useState(false);
  const [wellbeing, setWellbeing] = useState('unspecified');
  function changeWellbeing() {
    Alert.alert(
      'Wellbeing',
      'Have you experienced, or are you in recovery from, an eating disorder or a body-image condition?\n\n'
        + WELLBEING_HELPLINE,
      [
        {
          text: 'Yes, switch to calmer experience',
          onPress: async () => { await setWellbeingMode('calm'); setWellbeing('calm'); },
        },
        {
          text: 'No',
          onPress: async () => { await setWellbeingMode('normal'); setWellbeing('normal'); },
        },
        { text: 'Prefer not to say', style: 'cancel',
          onPress: async () => { await setWellbeingMode('unspecified'); setWellbeing('unspecified'); } },
      ],
    );
  }

  // Re-read on focus so the toggle stays in sync if the user enabled
  // tracking from the BodyMetrics opt-in screen.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PHYSIQUE_PREF_KEY).then(v => setPhysiqueEnabled(v === 'true'));
      getWellbeingMode().then(setWellbeing);
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

  async function handleFullBackup() {
    try {
      const { bytes } = await exportBackup();
      Alert.alert(
        'Backup created',
        `Your entire Volyume database (${(bytes / 1024).toFixed(0)} KB) was exported. Save it to Files, email it to yourself, or move it to your new device. Then use "Restore from backup" there.`,
      );
    } catch (e) {
      Alert.alert('Backup failed', e?.message ?? 'Could not create a backup. Please try again.');
    }
  }

  function handleRestoreBackup() {
    Alert.alert(
      'Restore from backup?',
      'This replaces ALL current data (workouts, routines, plans, body metrics and settings) with the contents of the backup file you choose. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await importBackup();
              if (res?.cancelled) return;
              const total = Object.values(res.counts || {}).reduce((a, b) => a + b, 0);
              Alert.alert(
                'Restore complete',
                `${total} records restored. Please fully close and reopen Volyume so every screen reloads from the restored data.`,
              );
            } catch (e) {
              Alert.alert('Restore failed', e?.message ?? 'Could not read that backup file.');
            }
          },
        },
      ],
    );
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
        {/* Go Pro — free users only */}
        {tier !== 'pro' && (
          <>
            <SectionHeader title="Volyume Pro" />
            <View style={styles.section}>
              <SettingRow
                icon="sparkles"
                label="Go Pro"
                value="Free in beta"
                onPress={() => navigation.navigate('ProUpgrade')}
              />
            </View>
          </>
        )}

        {/* Profile */}
        <SectionHeader title="Profile" />
        <View style={styles.section}>
          <View style={styles.nameRow}>
            <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.nameIcon} />
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your first name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onBlur={async () => {
                const name = editName.trim();
                if (user?.id) {
                  await saveLocalProfile(user.id, { ...(userProfile || {}), firstName: name || undefined });
                }
              }}
            />
          </View>
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
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
            icon="heart-outline"
            label="Wellbeing"
            value={WELLBEING_LABELS[wellbeing] || 'Not set'}
            onPress={changeWellbeing}
          />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            sub="Morning weight reminder and weekly check-in"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </View>

        {/* Pro coaching setup — Pro only */}
        {tier === 'pro' && (
          <>
            <SectionHeader title="Weekly coaching" />
            <View style={styles.section}>
              <SettingRow
                icon="pulse-outline"
                label="Goal phase & step target"
                sub="Update your current goal: fat loss, muscle building, or maintenance"
                onPress={() => navigation.navigate('ProGoalSetup')}
              />
            </View>
          </>
        )}

        {/* Exercise Library */}
        <SectionHeader title="Exercise library" />
        <View style={styles.section}>
          <SettingRow
            icon="barbell-outline"
            label="Browse & manage exercises"
            onPress={() => navigation.navigate('ExerciseLibrary')}
          />
        </View>

        {/* Data */}
        <SectionHeader title="Data & privacy" />
        <View style={styles.section}>
          <SettingRow
            icon="save-outline"
            label="Back up everything (JSON)"
            onPress={handleFullBackup}
          />
          <SettingRow
            icon="cloud-upload-outline"
            label="Restore from backup"
            onPress={handleRestoreBackup}
          />
          <SettingRow
            icon="download-outline"
            label="Export workout log (CSV)"
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
        <SectionHeader title="Account" />
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
          <Text style={styles.appVersion}>v{Constants.expoConfig?.version ?? '1.1.0'} · Free during beta</Text>
          <Text style={styles.tagline}>Less thinking. More lifting.</Text>
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
    letterSpacing: 0.5,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  nameIcon: { marginTop: 1 },
  nameInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
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
