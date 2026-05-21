import React, { useState, useCallback, useEffect } from 'react';
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
import { clearWorkoutHistory, buildWorkoutCSV, wipeAllUserData } from '../lib/database';
import { logError } from '../lib/errorLog';
import { exportBackup, importBackup } from '../lib/dataBackup';
import { getWellbeingMode, setWellbeingMode } from '../lib/wellbeing';
import Constants from 'expo-constants';

function SettingRow({ icon, label, sub, value, onPress, destructive, rightElement, showArrow = true }) {
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
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>{label}</Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
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

export default function SettingsScreen({ navigation }) {
  const { user, setUser, setSession, clearAuthStateForSignOut, units, setUnits, bodyWeightUnits, setBodyWeightUnits, barWeight, setBarWeight, userProfile, saveLocalProfile, tier, setTier, accessibility, setAccessibilityPref, loadAccessibility, accessibilityLoaded } =
    useAppStore(useShallow(s => ({
      user: s.user, setUser: s.setUser, setSession: s.setSession,
      clearAuthStateForSignOut: s.clearAuthStateForSignOut,
      units: s.units, setUnits: s.setUnits,
      bodyWeightUnits: s.bodyWeightUnits, setBodyWeightUnits: s.setBodyWeightUnits,
      barWeight: s.barWeight, setBarWeight: s.setBarWeight,
      userProfile: s.userProfile, saveLocalProfile: s.saveLocalProfile,
      tier: s.tier, setTier: s.setTier,
      accessibility: s.accessibility,
      setAccessibilityPref: s.setAccessibilityPref,
      loadAccessibility: s.loadAccessibility,
      accessibilityLoaded: s.accessibilityLoaded,
    })));

  // Hydrate accessibility prefs once on mount so the toggles reflect the
  // user's saved state (otherwise they all read as 'off' until the user
  // touches one).
  useEffect(() => {
    if (!accessibilityLoaded) loadAccessibility();
  }, [accessibilityLoaded, loadAccessibility]);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editName, setEditName] = useState(userProfile?.firstName ?? '');
  const [calmEnabled, setCalmEnabled] = useState(false);
  async function toggleCalmMode(value) {
    const mode = value ? 'calm' : 'normal';
    await setWellbeingMode(mode);
    setCalmEnabled(value);
  }

  useFocusEffect(
    useCallback(() => {
      getWellbeingMode().then(m => setCalmEnabled(m === 'calm'));
    }, []),
  );

  async function handleSignOut() {
    Alert.alert(
      'Sign out?',
      user?.isLocal
        ? "You're signed in locally on this device. Your data stays on this phone — sign back in any time."
        : 'Your data is safe in the cloud. Sign in again on any device to pick up where you left off.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              if (!user?.isLocal) {
                // Best-effort cloud sign-out; we still clear local state
                // even if the auth call fails (so the user isn't stuck
                // signed in locally with a dead session).
                try { await signOut(); }
                catch (e) {
                  logError('SettingsScreen.handleSignOut.cloudSignOut', e);
                }
              }
              await clearAuthStateForSignOut();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  }

  async function handleDeleteAccount() {
    // Two-step confirmation so a thumb-tap can't nuke an account.
    Alert.alert(
      'Delete account?',
      user?.isLocal
        ? 'This permanently deletes your local data on this device. Local accounts have no cloud backup. This cannot be undone.'
        : 'This permanently deletes your account and all your training data across every device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Are you sure?',
              user?.isLocal
                ? "There's no undo. All your workouts, plans, and progress are wiped from this device."
                : "There's no undo. All your workouts, plans, check-ins, and progress are wiped from every device.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: () => performDeleteAccount(),
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function performDeleteAccount() {
    if (!user?.id) return;
    setDeletingAccount(true);
    const userId = user.id;
    let cloudOk = true;
    let cloudErr = null;
    try {
      if (!user?.isLocal) {
        // Server-side wipe via the RPC. RPC checks auth.uid() so we don't
        // need to pass it. If this fails, surface the error to the user
        // — don't silently pretend their cloud data is gone.
        const sb = getSupabaseClient();
        if (sb) {
          const { error } = await sb.rpc('delete_user_data');
          if (error) {
            cloudOk = false;
            cloudErr = error.message ?? 'Unknown error';
            logError('SettingsScreen.deleteAccount.rpc', error, { userId });
          }
        }
        try { await signOut(); }
        catch (e) { logError('SettingsScreen.deleteAccount.signOut', e); }
      }
      // Wipe local SQLite regardless of cloud outcome — if cloud failed
      // the local data still goes (it's the user's intent).
      try { await wipeAllUserData(userId); }
      catch (e) { logError('SettingsScreen.deleteAccount.wipeLocal', e); }
      // Clear auth state + AsyncStorage prefs
      await clearAuthStateForSignOut();

      if (!cloudOk) {
        Alert.alert(
          'Local data deleted',
          'Your local data has been removed from this device, but the cloud delete failed: ' + cloudErr + '. Sign in again to retry, or contact support.',
        );
      }
    } finally {
      setDeletingAccount(false);
    }
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
            try {
              await clearWorkoutHistory(user.id);
              Alert.alert('Done', 'Your workout history has been cleared.');
            } catch (e) {
              logError('SettingsScreen.handleClearHistory', e, { userId: user.id });
              Alert.alert('Couldn\'t clear history', e?.message ?? 'Please try again.');
            }
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
            <SectionHeader title="Precision Coaching" />
            <View style={styles.section}>
              <SettingRow
                icon="sparkles"
                label="Go Pro"
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
            label="Gym weight units"
            value={units}
            onPress={() =>
              Alert.alert('Gym weight units', 'Used for barbells, dumbbells and machines', [
                { text: 'kg', onPress: () => setUnits('kg') },
                { text: 'lbs', onPress: () => setUnits('lbs') },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
          <SettingRow
            icon="body-outline"
            label="Body weight units"
            value={bodyWeightUnits === 'st' ? 'Stone+lbs' : bodyWeightUnits}
            onPress={() =>
              Alert.alert('Body weight units', 'Used for your morning weight and body tracking', [
                { text: 'Stone + lbs', onPress: () => setBodyWeightUnits('st') },
                { text: 'kg', onPress: () => setBodyWeightUnits('kg') },
                { text: 'lbs', onPress: () => setBodyWeightUnits('lbs') },
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
            icon="heart-outline"
            label="Calmer experience"
            sub="Removes aggressive calorie targets and quietens progress prompts"
            showArrow={false}
            rightElement={
              <Switch
                value={calmEnabled}
                onValueChange={toggleCalmMode}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={calmEnabled ? colors.primary : colors.textMuted}
              />
            }
          />
          {tier === 'pro' && (
            <SettingRow
              icon="shield-checkmark-outline"
              label="Wellbeing check"
              sub="Update your health screening answers. Shapes how your Precision Coaching is applied."
              onPress={() => navigation.navigate('WellbeingCheck')}
            />
          )}
          {tier === 'pro' && (
            <SettingRow
              icon="notifications-outline"
              label="Notifications"
              sub="Morning weight reminder and weekly check-in"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
          )}
        </View>

        {/* Accessibility */}
        <SectionHeader title="Accessibility" />
        <View style={styles.section}>
          <SettingRow
            icon="text-outline"
            label="Larger text"
            sub="Increases font size across the app. For more granular control, use your phone's system text size — Volyume respects it too."
            showArrow={false}
            rightElement={
              <Switch
                value={!!accessibility.largerText}
                onValueChange={v => setAccessibilityPref('largerText', v)}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={accessibility.largerText ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="contrast-outline"
            label="Higher contrast"
            sub="Brightens secondary text and strengthens dividers. Easier to read in bright light or with low vision."
            showArrow={false}
            rightElement={
              <Switch
                value={!!accessibility.higherContrast}
                onValueChange={v => setAccessibilityPref('higherContrast', v)}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={accessibility.higherContrast ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="eye-outline"
            label="Colour-blind safe palette"
            sub="Replaces success-green and error-red with blue and orange — distinguishable in red-green colour blindness."
            showArrow={false}
            rightElement={
              <Switch
                value={!!accessibility.colorBlindSafe}
                onValueChange={v => setAccessibilityPref('colorBlindSafe', v)}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={accessibility.colorBlindSafe ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="pause-circle-outline"
            label="Reduce motion"
            sub="Disables PR celebration particles, rest timer animations, and other large transitions. Helps with vestibular sensitivity."
            showArrow={false}
            rightElement={
              <Switch
                value={!!accessibility.reduceMotion}
                onValueChange={v => setAccessibilityPref('reduceMotion', v)}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={accessibility.reduceMotion ? colors.primary : colors.textMuted}
              />
            }
          />
          <Text style={styles.a11yNote}>
            Reduce motion takes effect immediately. The colour and contrast options take effect the next time you reopen the app.
          </Text>
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
        <Text style={styles.dataPrivacyNote}>
          Your data is always yours. Export or back up any time, no account required.
        </Text>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          {tier === 'pro' && (
            <SettingRow
              icon="arrow-down-circle-outline"
              label="Switch to Free"
              onPress={() =>
                Alert.alert(
                  'Switch to Free?',
                  'You can come back to Pro any time. Your logbook and history stay exactly as they are.',
                  [
                    { text: 'Keep Pro', style: 'cancel' },
                    {
                      text: 'Switch to Free',
                      onPress: async () => { await setTier('free'); },
                    },
                  ],
                )
              }
            />
          )}
          <SettingRow
            icon="log-out-outline"
            label={signingOut ? 'Signing out…' : 'Sign out'}
            destructive
            onPress={signingOut ? undefined : handleSignOut}
          />
          <SettingRow
            icon="trash-outline"
            label={deletingAccount ? 'Deleting account…' : 'Delete account'}
            destructive
            onPress={deletingAccount ? undefined : handleDeleteAccount}
          />
        </View>

        {/* Legal */}
        <SectionHeader title="Legal" />
        <View style={styles.section}>
          <SettingRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </View>

        {/* Diagnostics */}
        <SectionHeader title="Diagnostics" />
        <View style={styles.section}>
          <SettingRow
            icon="bug-outline"
            label="Debug logs"
            onPress={() => navigation.navigate('DebugLog')}
          />
        </View>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.appName}>Volyume</Text>
          <Text style={styles.appVersion}>v{Constants.expoConfig?.version ?? '1.1.0'}</Text>
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
  settingLabel: { fontSize: fontSize.md, color: colors.textPrimary },
  settingSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
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
  a11yNote: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', paddingHorizontal: spacing.md, paddingTop: spacing.xs, lineHeight: 16 },
  tagline: { fontSize: fontSize.xs, color: colors.textMuted },
  dataPrivacyNote: {
    fontSize: 11,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    lineHeight: 16,
  },
});
