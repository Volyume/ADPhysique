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
import { useToast } from '../components/Toast';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { clearWorkoutHistory, buildWorkoutCSV, wipeAllUserData } from '../lib/database';
import { logError } from '../lib/errorLog';
import { exportBackup, importBackup } from '../lib/dataBackup';
import { useFeedback } from '../components/FeedbackSheet';
import { getWellbeingMode, setWellbeingMode } from '../lib/wellbeing';
import {
  isHealthAvailable, getHealthProviderLabel,
  getHealthPermissionStatus, requestHealthPermissions, importNewWeights,
  openSystemHealthSettings,
} from '../lib/health';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

// Larger Text / Higher Contrast / Colour-Blind Safe mutate theme tokens
// that StyleSheet.create has already baked at module-evaluation time, so
// they only take effect after the app is re-launched and bootstrapAccessibility
// in App.js re-applies them before screens load. Prompt the user to reload now
// rather than leaving them confused that the toggle "did nothing".
async function promptRestartForA11y(label) {
  Alert.alert(
    `${label} saved`,
    `Volyume needs to reopen to apply this. Your data and current screen are safe.`,
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Reload now',
        onPress: async () => {
          try { await Updates.reloadAsync(); }
          catch (_) {
            // Dev clients / Expo Go without OTA support — fall back to a
            // soft message. The toggle is saved; next manual restart picks
            // it up.
            Alert.alert('Reload failed', 'Close and reopen Volyume to apply the change.');
          }
        },
      },
    ],
  );
}

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
  const toast = useToast();
  const feedback = useFeedback();
  const { user, setUser, setSession, clearAuthStateForSignOut, userProfile, saveLocalProfile, tier, setTier, accessibility, setAccessibilityPref, loadAccessibility, accessibilityLoaded } =
    useAppStore(useShallow(s => ({
      user: s.user, setUser: s.setUser, setSession: s.setSession,
      clearAuthStateForSignOut: s.clearAuthStateForSignOut,
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
  // Health integration. Per-scope status: weight read separately from
  // workout write so the user can enable one without the other.
  // healthSyncing tracks the manual "Sync now" tap.
  const [healthWeightStatus, setHealthWeightStatus] = useState('unavailable');
  const [healthWorkoutStatus, setHealthWorkoutStatus] = useState('unavailable');
  const [healthSyncing, setHealthSyncing] = useState(false);

  async function toggleCalmMode(value) {
    const mode = value ? 'calm' : 'normal';
    await setWellbeingMode(mode);
    setCalmEnabled(value);
  }

  useFocusEffect(
    useCallback(() => {
      getWellbeingMode().then(m => setCalmEnabled(m === 'calm'));
      if (isHealthAvailable()) {
        getHealthPermissionStatus(['weight']).then(setHealthWeightStatus).catch(() => {});
        getHealthPermissionStatus(['workout']).then(setHealthWorkoutStatus).catch(() => {});
      }
    }, []),
  );

  async function handleToggleWeight(next) {
    if (!next) {
      // Health Connect / HealthKit deliberately don't expose a "revoke"
      // API to the app. Send the user to the system Settings where they
      // can flip it themselves; reflect the intent in our toast.
      toast.show(`Open Health settings to turn weight read off`, { variant: 'info' });
      await openSystemHealthSettings();
      return;
    }
    setHealthSyncing(true);
    try {
      const status = await requestHealthPermissions(['weight']);
      setHealthWeightStatus(status);
      if (status === 'granted') {
        const { imported } = await importNewWeights(user?.id);
        toast.show(
          imported > 0
            ? `${imported} weight ${imported === 1 ? 'reading' : 'readings'} imported`
            : 'Connected. No new readings yet.',
          { variant: 'success' },
        );
      } else if (status === 'denied') {
        toast.show(`Permission needed to read weight from ${getHealthProviderLabel()}`, { variant: 'warning' });
      }
    } catch (e) {
      logError('SettingsScreen.toggleWeight', e);
      toast.show('Could not connect. Try again in a moment.', { variant: 'error' });
    } finally {
      setHealthSyncing(false);
    }
  }

  async function handleToggleWorkout(next) {
    if (!next) {
      toast.show(`Open Health settings to turn workout write off`, { variant: 'info' });
      await openSystemHealthSettings();
      return;
    }
    setHealthSyncing(true);
    try {
      const status = await requestHealthPermissions(['workout']);
      setHealthWorkoutStatus(status);
      if (status === 'granted') {
        toast.show('Workouts will appear in your Health log from now on', { variant: 'success' });
      } else if (status === 'denied') {
        toast.show(`Permission needed to write workouts to ${getHealthProviderLabel()}`, { variant: 'warning' });
      }
    } catch (e) {
      logError('SettingsScreen.toggleWorkout', e);
      toast.show('Could not connect. Try again in a moment.', { variant: 'error' });
    } finally {
      setHealthSyncing(false);
    }
  }

  async function handleSyncHealthNow() {
    if (healthWeightStatus !== 'granted') {
      await handleToggleWeight(true);
      return;
    }
    setHealthSyncing(true);
    try {
      const { imported } = await importNewWeights(user?.id);
      toast.show(
        imported > 0
          ? `${imported} new weight ${imported === 1 ? 'reading' : 'readings'} imported`
          : 'Already up to date',
        { variant: imported > 0 ? 'success' : 'info' },
      );
    } catch (e) {
      logError('SettingsScreen.syncHealthNow', e);
      toast.show('Sync failed. Check your Health connection.', { variant: 'error' });
    } finally {
      setHealthSyncing(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign out?',
      user?.isLocal
        ? "You're signed in locally on this device. Your data stays on this phone. Sign back in any time."
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
        // Server-side wipe via the delete-account Edge Function. The
        // function wipes public.* rows AND deletes auth.users — the RPC
        // alone can't reach auth.users (different schema, lacks rights),
        // which left zombie auth records that resurrected on next sign-in.
        // Falls back to the RPC if the function isn't deployed, so the
        // client keeps working until the function lands in production.
        const sb = getSupabaseClient();
        if (sb) {
          let invokeErr = null;
          let fnBody = null;
          let fnErrorBody = null;
          try {
            const result = await sb.functions.invoke('delete-account');
            if (result.error) invokeErr = result.error;
            fnBody = result.data;
          } catch (e) {
            invokeErr = e;
          }
          if (invokeErr) {
            // FunctionsHttpError stores the Response on `.context`. Read its
            // body so we can see which branch of the Edge Function actually
            // failed (missing env var, RPC error, admin deleteUser error).
            try {
              const ctx = invokeErr?.context;
              if (ctx && typeof ctx.text === 'function') {
                fnErrorBody = await ctx.text();
              }
            } catch (_) { /* body already consumed or unreadable */ }
            logError('SettingsScreen.deleteAccount.fnInvoke', invokeErr, {
              userId,
              fnBody: fnBody ? JSON.stringify(fnBody).slice(0, 500) : null,
              fnErrorBody: fnErrorBody ? String(fnErrorBody).slice(0, 500) : null,
              status: invokeErr?.context?.status ?? null,
            });
            // Fall back to the RPC so a missing or un-deployed Edge Function
            // doesn't block the user. RPC v3 (migrate_008) tolerates missing
            // tables; older RPCs may still fail on a missing table.
            const { error: rpcErr } = await sb.rpc('delete_user_data');
            if (rpcErr) {
              cloudOk = false;
              cloudErr = rpcErr.message ?? 'Unknown error';
              logError('SettingsScreen.deleteAccount.rpc', rpcErr, { userId });
            }
          }
        }

        // CRITICAL: if the cloud wipe failed, ABORT. Previously we still
        // called signOut() and wipeAllUserData() unconditionally, which
        // left the user logged out locally with their cloud account fully
        // intact — and on next sign-in they were dumped back into the
        // main app because firstRunComplete=true still lived in the cloud
        // profile they thought they deleted. Now we surface the failure
        // and leave the session alone so they can retry or contact us.
        if (!cloudOk) {
          Alert.alert(
            "Couldn't delete your account",
            `The cloud delete failed: ${cloudErr}\n\nYour account and data are still safe. Try again in a few minutes, or contact support if it keeps happening.`,
          );
          setDeletingAccount(false);
          return;
        }

        try { await signOut(); }
        catch (e) { logError('SettingsScreen.deleteAccount.signOut', e); }
      }
      // Wipe local SQLite. Reached only when (a) cloud user and cloud
      // wipe succeeded, or (b) local-only user (no cloud to wipe).
      try { await wipeAllUserData(userId); }
      catch (e) { logError('SettingsScreen.deleteAccount.wipeLocal', e); }
      // Clear in-memory state.
      await clearAuthStateForSignOut();
      // Delete-account is the "truly wipe everything" path — distinct
      // from sign-out, which is session-only by policy. Without this,
      // AsyncStorage keeps TIER_KEY, FIRST_RUN_KEY, LOCAL_USER_KEY,
      // PROFILE_KEY_PFX, etc., so the next launch's bootstrap reads
      // them and re-routes the user into the app as a phantom local
      // Pro account ("local · PRO · 0 sessions"). Enumerate all
      // @volyume_-prefixed keys and remove them so the next launch
      // boots a genuine fresh-install state.
      try {
        const keys = await AsyncStorage.getAllKeys();
        const volyumeKeys = keys.filter(k => k.startsWith('@volyume_'));
        if (volyumeKeys.length) await AsyncStorage.multiRemove(volyumeKeys);
      } catch (e) { logError('SettingsScreen.deleteAccount.wipeAsyncStorage', e); }
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
        toast.show(`Exported ${rowCount} sets`, { variant: 'success' });
      }
    } catch (e) {
      toast.show(e?.message ?? 'Could not export your data', { variant: 'error' });
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
              toast.show('Workout history cleared', { variant: 'success' });
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
          {/* Gym weight units, body weight units, and bar weight rows
              removed at user request. UK defaults: gym + bar = kg;
              body weight units come from onboarding (the morning-weight
              setup screen). The store still holds these values; they
              just aren't user-editable from Settings any more. */}
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
              icon="pulse-outline"
              label="Coaching reminders"
              sub="Schedule your morning weight log and weekly check-in"
              onPress={() => navigation.navigate('CoachingReminders')}
            />
          )}
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            sub="Training reminders"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </View>

        {/* Accessibility */}
        <SectionHeader title="Accessibility" />
        <View style={styles.section}>
          <SettingRow
            icon="text-outline"
            label="Larger text"
            sub="Increases font size across the app. For more granular control, use your phone's system text size. Volyume respects it too."
            showArrow={false}
            rightElement={
              <Switch
                value={!!accessibility.largerText}
                onValueChange={async v => {
                  // Await the AsyncStorage write before prompting reload — otherwise
                  // a fast "Reload now" tap can tear down the JS VM before the pref
                  // persists, and the user sees no change on restart.
                  await setAccessibilityPref('largerText', v);
                  promptRestartForA11y('Larger text');
                }}
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
                onValueChange={async v => {
                  await setAccessibilityPref('higherContrast', v);
                  promptRestartForA11y('Higher contrast');
                }}
                trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                thumbColor={accessibility.higherContrast ? colors.primary : colors.textMuted}
              />
            }
          />
          <SettingRow
            icon="eye-outline"
            label="Colour-blind safe palette"
            sub="Replaces success-green and error-red with sky blue and reddish purple. Distinguishable in red-green colour blindness."
            showArrow={false}
            rightElement={
              <Switch
                value={!!accessibility.colorBlindSafe}
                onValueChange={async v => {
                  await setAccessibilityPref('colorBlindSafe', v);
                  promptRestartForA11y('Colour-blind safe palette');
                }}
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
            Reduce motion takes effect immediately. Larger text, higher contrast, and the colour-blind safe palette need Volyume to reopen. You'll be prompted to reload after toggling.
          </Text>
        </View>

        {/* Health connections */}
        {isHealthAvailable() && (
          <>
            <SectionHeader title={getHealthProviderLabel()} />
            <View style={styles.section}>
              <SettingRow
                icon="scale-outline"
                label="Read morning weight"
                sub={
                  healthWeightStatus === 'granted'
                    ? 'Connected. Volyume picks up new readings from your scale or wearable in the background.'
                    : `Pull bodyweight readings from ${getHealthProviderLabel()} into your morning weight log.`
                }
                showArrow={false}
                rightElement={
                  <Switch
                    value={healthWeightStatus === 'granted'}
                    onValueChange={handleToggleWeight}
                    disabled={healthSyncing}
                    trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                    thumbColor={healthWeightStatus === 'granted' ? colors.primary : colors.textMuted}
                  />
                }
              />
              <SettingRow
                icon="barbell-outline"
                label="Write workouts"
                sub={
                  healthWorkoutStatus === 'granted'
                    ? 'On. Completed sessions are written to your health log so your weekly activity stays accurate.'
                    : `Send each completed Volyume session to ${getHealthProviderLabel()}.`
                }
                showArrow={false}
                rightElement={
                  <Switch
                    value={healthWorkoutStatus === 'granted'}
                    onValueChange={handleToggleWorkout}
                    disabled={healthSyncing}
                    trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
                    thumbColor={healthWorkoutStatus === 'granted' ? colors.primary : colors.textMuted}
                  />
                }
              />
              {healthWeightStatus === 'granted' && (
                <SettingRow
                  icon="refresh-outline"
                  label={healthSyncing ? 'Syncing…' : 'Sync weight now'}
                  sub="Pull any new readings since the last check."
                  onPress={healthSyncing ? null : handleSyncHealthNow}
                  showArrow={!healthSyncing}
                />
              )}
              {(healthWeightStatus === 'granted' || healthWorkoutStatus === 'granted') && (
                <SettingRow
                  icon="open-outline"
                  label="Open Health settings"
                  sub={`To turn anything off, change it from inside ${getHealthProviderLabel()}.`}
                  onPress={openSystemHealthSettings}
                />
              )}
            </View>
            <Text style={styles.dataPrivacyNote}>
              Volyume only touches what you switch on. Everything else stays on this device.
            </Text>
          </>
        )}

        {/* Data */}
        <SectionHeader title="Data & privacy" />
        <View style={styles.section}>
          <SettingRow
            icon="swap-horizontal-outline"
            label="Import from another app"
            sub="Bring sessions over from Hevy or Strong"
            onPress={() => navigation.navigate('Import')}
          />
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
          <SettingRow
            icon="information-circle-outline"
            label="Free, Pro, and your data"
            sub="What's free, what Pro adds, what stays if you switch back"
            onPress={() => navigation.navigate('SubscriptionPolicy')}
          />
          {tier === 'pro' && (
            <SettingRow
              icon="arrow-down-circle-outline"
              label="Switch to Free"
              onPress={() =>
                Alert.alert(
                  'Switch to Free?',
                  'Everything you\'ve logged stays. Past coach outputs, check-ins, mesocycles and PRs remain readable. You just won\'t get new Pro coaching adjustments until you re-enable Pro.',
                  [
                    { text: 'Keep Pro', style: 'cancel' },
                    {
                      text: 'Switch to Free',
                      onPress: async () => { await setTier('free', 'SettingsScreen.switchToFree'); },
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
            icon="chatbubble-ellipses-outline"
            label="Send feedback"
            sub="Quick sentiment + optional note"
            onPress={() => feedback?.open({ trigger: 'settings' })}
          />
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
    fontSize: fontSize.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    lineHeight: 16,
  },
});
