import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput, Share, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import * as SecureStore from 'expo-secure-store';
import { getSupabaseClient, signOut } from '../lib/supabase';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';
import PressableCard from '../components/PressableCard';
import * as haptics from '../lib/haptics';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { clearWorkoutHistory, buildWorkoutCSV, wipeAllUserData, getUserBodyProfile } from '../lib/database';
import { getCycleTracking, setCycleTracking } from '../lib/cyclePrefs';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
import { exportBackup, importBackup } from '../lib/dataBackup';
import { useFeedback } from '../components/FeedbackSheet';
import { getWellbeingMode, setWellbeingMode } from '../lib/wellbeing';
import {
  getConsent as getOffWritebackConsent,
  setConsent as setOffWritebackConsent,
} from '../lib/food/writeback';
import {
  isHealthAvailable, getHealthProviderLabel,
  getHealthPermissionStatus, requestHealthPermissions, importNewWeights,
  openSystemHealthSettings, getHealthConnectSdkStatus, openHealthConnectInstall,
} from '../lib/health';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { getStatus as getSyncStatus, syncAll } from '../lib/sync';
import { formatLastSynced } from '../lib/syncStatusLabel';

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
            // Dev clients / Expo Go without OTA support, fall back to a
            // soft message. The toggle is saved; next manual restart picks
            // it up.
            Alert.alert('Reload failed', 'Close and reopen Volyume to apply the change.');
          }
        },
      },
    ],
  );
}

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

function SettingRow({ icon, label, sub, value, onPress, destructive, rightElement, showArrow = true }) {
  // One press feel app-wide: tappable rows use the PressableCard spring.
  // Rows that are just a label + a Switch (rightElement, no onPress) render
  // as a static View so the row itself isn't "pressable", the Switch is.
  const Wrapper = onPress ? PressableCard : View;
  return (
    <Wrapper
      style={styles.settingRow}
      onPress={onPress}
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
    </Wrapper>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen({ navigation }) {
  const toast = useToast();
  const feedback = useFeedback();
  const { user, setUser, setSession, clearAuthStateForSignOut, userProfile, saveLocalProfile, setDietPreference, tier, setTier, accessibility, setAccessibilityPref, loadAccessibility, accessibilityLoaded, healthConsent, setHealthConsent } =
    useAppStore(useShallow(s => ({
      user: s.user, setUser: s.setUser, setSession: s.setSession,
      clearAuthStateForSignOut: s.clearAuthStateForSignOut,
      userProfile: s.userProfile, saveLocalProfile: s.saveLocalProfile,
      setDietPreference: s.setDietPreference,
      tier: s.tier, setTier: s.setTier,
      accessibility: s.accessibility,
      setAccessibilityPref: s.setAccessibilityPref,
      loadAccessibility: s.loadAccessibility,
      accessibilityLoaded: s.accessibilityLoaded,
      healthConsent: s.healthConsent,
      setHealthConsent: s.setHealthConsent,
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
  const [diet, setDiet] = useState(userProfile?.dietPreference ?? 'omnivore');
  const [offConsent, setOffConsent] = useState(false);
  const [cycleEnabled, setCycleEnabled] = useState(false);
  // Daily movement. stepsEnabled undefined means never opted out, so on.
  const [stepsEnabled, setStepsEnabled] = useState(userProfile?.stepsEnabled !== false);
  const [stepTargetInput, setStepTargetInput] = useState(String(userProfile?.stepsTarget ?? 8000));
  const [bioSex, setBioSex] = useState(null);
  // Health integration. Per-scope status: weight read separately from
  // workout write so the user can enable one without the other.
  // healthSyncing tracks the manual "Sync now" tap.
  const [healthWeightStatus, setHealthWeightStatus] = useState('unavailable');
  const [healthWorkoutStatus, setHealthWorkoutStatus] = useState('unavailable');
  const [healthStepsStatus, setHealthStepsStatus] = useState('unavailable');
  const [healthSyncing, setHealthSyncing] = useState(false);
  // Cloud sync status line (A2-006). Quiet, read from the runner snapshot;
  // syncingNow tracks the manual "tap to sync" so the row shows progress.
  const [syncSnapshot, setSyncSnapshot] = useState(null);
  const [syncingNow, setSyncingNow] = useState(false);

  async function toggleCalmMode(value) {
    haptics.selection();
    const mode = value ? 'calm' : 'normal';
    await setWellbeingMode(mode);
    setCalmEnabled(value);
  }

  async function toggleOffConsent(value) {
    haptics.selection();
    await setOffWritebackConsent(value);
    setOffConsent(value);
  }

  async function toggleCycleTracking(value) {
    haptics.selection();
    await setCycleTracking(value);
    setCycleEnabled(value);
  }

  async function toggleStepTarget(value) {
    haptics.selection();
    setStepsEnabled(value);
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), stepsEnabled: value });
    }
    // Turning steps on is the moment to ask for the health step permission, so
    // the foreground auto-read can populate daily_steps. Silent if declined:
    // the check-in then falls back to a manual average.
    if (value) {
      try {
        // eslint-disable-next-line global-require
        const { requestStepPermission } = require('../lib/activitySteps');
        requestStepPermission().catch(() => {});
      } catch (_) { /* activitySteps unavailable */ }
    }
  }

  // Save the typed target on blur. Clamp to a sane band and never let an
  // empty or junk value through; fall back to the current target or 8,000.
  async function saveStepTarget() {
    const parsed = Math.round(Number(stepTargetInput));
    const current = userProfile?.stepsTarget ?? 8000;
    const next = Number.isFinite(parsed) && parsed > 0
      ? Math.min(Math.max(parsed, 1000), 30000)
      : current;
    setStepTargetInput(String(next));
    if (user?.id && next !== current) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), stepsTarget: next });
    }
  }

  useFocusEffect(
    useCallback(() => {
      getWellbeingMode().then(m => setCalmEnabled(m === 'calm'));
      getOffWritebackConsent().then(setOffConsent);
      getCycleTracking().then(setCycleEnabled).catch(() => {});
      getSyncStatus().then(setSyncSnapshot).catch(() => {});
      if (user?.id) getUserBodyProfile(user.id).then(p => setBioSex(p?.sex ?? null)).catch(() => {});
      if (isHealthAvailable()) {
        getHealthPermissionStatus(['weight']).then(setHealthWeightStatus).catch(() => {});
        getHealthPermissionStatus(['workout']).then(setHealthWorkoutStatus).catch(() => {});
        getHealthPermissionStatus(['steps']).then(setHealthStepsStatus).catch(() => {});
      }
    }, [user?.id]),
  );

  // When a connect attempt comes back 'sdk_unavailable' the problem isn't a
  // refused permission, it's that Health Connect itself isn't ready on this
  // phone (not installed, or needs an update). A flat "permission needed"
  // toast is a dead end there, so offer the real next step: open the Play
  // listing. Returns true if it handled an sdk_unavailable status.
  async function handleSdkUnavailable(status) {
    if (status !== 'sdk_unavailable') return false;
    Alert.alert(
      'Health Connect needed',
      'Volyume reads and writes this through Health Connect. It isn\'t set up on this phone yet. Install or update it, then try again.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Get Health Connect', onPress: () => { openHealthConnectInstall(); } },
      ],
    );
    return true;
  }

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
      } else if (await handleSdkUnavailable(status)) {
        // handled: prompted to install Health Connect
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

  async function handleToggleSteps(next) {
    if (!next) {
      toast.show('Open Health settings to turn step read off', { variant: 'info' });
      await openSystemHealthSettings();
      return;
    }
    setHealthSyncing(true);
    try {
      const status = await requestHealthPermissions(['steps']);
      setHealthStepsStatus(status);
      if (status === 'granted') {
        // Read today's steps straight away so the figure shows without waiting
        // for the next app foreground.
        try {
          // eslint-disable-next-line global-require
          const { recordTodaySteps } = require('../lib/activitySteps');
          await recordTodaySteps(user?.id);
        } catch (_) { /* read is best-effort */ }
        toast.show('Connected. Volyume reads your daily steps from your watch, phone or tracker.', { variant: 'success' });
      } else if (await handleSdkUnavailable(status)) {
        // handled: prompted to install Health Connect
      } else if (status === 'denied') {
        toast.show(`Permission needed to read steps from ${getHealthProviderLabel()}`, { variant: 'warning' });
      }
    } catch (e) {
      logError('SettingsScreen.toggleSteps', e);
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
      } else if (await handleSdkUnavailable(status)) {
        // handled: prompted to install Health Connect
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

  // Manual cloud resync. The lock (PRODUCTION_READINESS_LOCKED § 1) allows a
  // manual resync from Settings; this routes through the same syncAll runner
  // as the automatic triggers, so its in-memory lock dedupes against any
  // background round already in flight.
  async function handleSyncNow() {
    if (syncingNow) return;
    haptics.selection();
    setSyncingNow(true);
    try {
      let supabaseUserId = null;
      try {
        const sb = getSupabaseClient();
        const { data: { session: s } = {} } = await sb.auth.getSession();
        supabaseUserId = s?.user?.id ?? null;
      } catch (_) { /* offline / no session — push local, pull skips */ }
      await syncAll({ userId: supabaseUserId, localUserId: user?.id ?? null, triggeredBy: 'manual' });
      const snap = await getSyncStatus();
      setSyncSnapshot(snap);
      toast.show(
        (snap?.queue_depth ?? 0) > 0 ? 'Synced. Some changes are still uploading.' : 'Synced.',
        { variant: 'success' },
      );
    } catch (e) {
      logError('SettingsScreen.syncNow', e);
      getSyncStatus().then(setSyncSnapshot).catch(() => {});
      toast.show("Couldn't sync. It retries automatically.", { variant: 'error' });
    } finally {
      setSyncingNow(false);
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

  // ─── Health-data consent withdrawal (UK GDPR Article 9) ─────────────────
  // Per PRIVACY_CONSENT_LOCKED.md lines 71-72 and 251: withdrawing
  // Article 9 consent is the legal end of our lawful basis to process
  // the user's special-category data, so it must queue account
  // deletion (not merely flip a flag). The earlier behaviour
  // (record_health_consent(false) + UI gate) left the data on our
  // servers without a lawful basis, which is itself a UK GDPR
  // breach. This flow now records the withdrawal in consent_log
  // (the immutable audit trail) THEN drives the standard delete-
  // account pipeline so SQLite, Supabase rows, and auth.users are
  // all wiped within the 30-day window the policy promises.
  const [withdrawing, setWithdrawing] = useState(false);
  async function handleWithdrawConsent() {
    if (withdrawing || deletingAccount) return;
    Alert.alert(
      'Withdraw health-data consent?',
      "Withdrawing consent means we lose the legal basis to keep " +
        "your weight, food, body composition, and check-in data. " +
        "Your account will be deleted and your data wiped from our " +
        "servers within 30 days. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              "There's no undo. All your workouts, plans, check-ins, " +
                "food log, and progress are wiped from every device " +
                "within 30 days.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Withdraw and delete',
                  style: 'destructive',
                  onPress: async () => {
                    audit('consent.article9.withdraw.tap');
                    setWithdrawing(true);
                    try {
                      // Record the withdrawal in consent_log before we
                      // tear the account down. The Edge Function's
                      // delete sequence wipes consent_log via FK
                      // cascade, but Panel 8's withdrawal-rate
                      // dashboard reads via the engine_telemetry
                      // event below (account_deletions_log is the
                      // non-cascading audit trail that survives).
                      const sb = getSupabaseClient();
                      if (sb) {
                        const { error: rpcErr } = await sb.rpc('record_health_consent', {
                          _granted: false,
                          _app_version: null,
                          _platform: Platform.OS,
                        });
                        if (rpcErr) {
                          logError('SettingsScreen.withdrawConsent.rpc', rpcErr, { uid: user?.id });
                          // Soft-fail: we still proceed with the
                          // delete. The user's intent is clear and
                          // delaying for a server hiccup would be
                          // worse than a missing audit row.
                        }
                      }
                      setHealthConsent(false, true);
                      try {
                        // eslint-disable-next-line global-require
                        const { track } = require('../lib/engineTelemetry');
                        if (user?.id) {
                          track(user.id, 'article9_consent_withdrawn', {
                            surface: 'settings',
                          }).catch(() => {});
                        }
                      } catch (_) {}
                      // Now drive the standard delete-account flow
                      // with reason='consent_withdrawal' so Panel 8
                      // can compute the withdrawal-to-deletion
                      // ratio against the engine_telemetry event.
                      audit('account.delete.confirm', { isLocal: !!user?.isLocal, source: 'consent_withdrawal' });
                      await performDeleteAccount('consent_withdrawal');
                    } catch (e) {
                      logError('SettingsScreen.withdrawConsent', e, { uid: user?.id });
                      Alert.alert("Couldn't withdraw", e?.message ?? 'Unknown error.');
                    } finally {
                      setWithdrawing(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function handleSignOut() {
    audit('auth.signout.tap');
    // Block sign-out mid-workout. The workout row stays in SQLite, but the
    // in-memory active state is cleared and the user lands on Login mid-set,
    // which reads as data loss even though nothing is lost.
    const activeWorkout = useAppStore.getState().activeWorkout;
    if (activeWorkout) {
      Alert.alert(
        'Finish your workout first',
        'You have a session in progress. Finish or discard it before signing out so nothing gets left in a half-state.',
      );
      return;
    }
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
            // The steps after the local wipe: cloud sign-out (after the wipe so
            // a failed wipe doesn't strand a dead session) then reload the JS
            // bundle (an install-on-top leaves the old bundle running until the
            // process restarts). Best-effort; dev / Expo Go can't reload.
            async function finishCloudSignOut() {
              if (!user?.isLocal) {
                // AUTH-3 (I4): retry once so a transient cloud signOut failure
                // doesn't leave the supabase client holding a live in-memory
                // session (which a later INITIAL_SESSION could re-enter on).
                // The SecureStore tokens were already deleted in
                // clearAuthStateForSignOut, so storage can't revive it either.
                let signedOut = false;
                for (let attempt = 0; attempt < 2 && !signedOut; attempt += 1) {
                  try { await signOut(); signedOut = true; }
                  catch (e) { logError('SettingsScreen.handleSignOut.cloudSignOut', e); }
                }
              }
              try { await Updates.reloadAsync(); }
              catch (_) { /* dev / Expo Go, no-op */ }
            }
            try {
              // Push-first sign-out: wipes local SQLite only after a
              // successful cloud sync, so unsynced edits aren't lost.
              // If the push fails, sign-out is aborted and the user
              // stays signed in (unless they choose "Sign out anyway").
              const result = await clearAuthStateForSignOut();
              if (result?.ok === false) {
                // AUTH-5 escape hatch: rather than a dead-end "couldn't sign
                // out", let the user decide. 'skipped'/'error' often means the
                // device is offline or a background sync held the lock; the
                // user may accept losing unsynced changes to sign out anyway.
                Alert.alert(
                  'Sync incomplete',
                  "We couldn't sync your latest changes (you might be offline). Sign out anyway? Any changes since your last successful sync may be lost.",
                  [
                    { text: 'Stay signed in', style: 'cancel' },
                    {
                      text: 'Sign out anyway',
                      style: 'destructive',
                      onPress: async () => {
                        setSigningOut(true);
                        try {
                          await clearAuthStateForSignOut({ force: true });
                          await finishCloudSignOut();
                        } finally {
                          setSigningOut(false);
                        }
                      },
                    },
                  ],
                );
                return;
              }
              await finishCloudSignOut();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  }

  async function handleDeleteAccount() {
    audit('account.delete.tap', { isLocal: !!user?.isLocal });
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
                  onPress: () => {
                    audit('account.delete.confirm', { isLocal: !!user?.isLocal });
                    performDeleteAccount();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function performDeleteAccount(reason = 'user_requested') {
    if (!user?.id) return;
    setDeletingAccount(true);
    const userId = user.id;
    let cloudOk = true;
    let cloudErr = null;
    try {
      if (!user?.isLocal) {
        // Server-side wipe via the delete-account Edge Function. The
        // function wipes public.* rows AND deletes auth.users, the RPC
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
            // Pass deletion metadata so the Edge Function can write
            // a rich row to account_deletions_log. reason is 'in_app'
            // by default; the consent-withdrawal flow (when SettingsScreen
            // ships the privacy management section) will pass
            // 'consent_withdrawal' so Panel 8 can compute the
            // withdrawal-to-deletion ratio.
            let appVersion = null;
            try {
              // eslint-disable-next-line global-require
              const Application = require('expo-application');
              appVersion = Application.nativeApplicationVersion ?? null;
            } catch (_) { /* tolerate */ }
            const result = await sb.functions.invoke('delete-account', {
              body: {
                reason,
                app_version: appVersion,
                platform: Platform.OS,
              },
            });
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
        // intact, and on next sign-in they were dumped back into the
        // main app because firstRunComplete=true still lived in the cloud
        // profile they thought they deleted. Now we surface the failure
        // and leave the session alone so they can retry or contact us.
        if (!cloudOk) {
          Alert.alert(
            "Couldn't delete your account",
            'Try again.',
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
      // Delete-account is the "truly wipe everything" path, distinct
      // from sign-out, which is session-only by policy. The selective
      // @volyume_ prefix wipe used to miss three keys that don't carry
      // the @ (volyume_review_prompted, volyume_notif_prompt_seen,
      // volyume_sessions_since_install) and any future un-prefixed key.
      // AsyncStorage.clear() is scoped to this app only, so it's the
      // right hammer here. Without this, next launch sees a stale
      // firstRunComplete=true and re-routes into the home flow as a
      // phantom user.
      try {
        await AsyncStorage.clear();
      } catch (e) { logError('SettingsScreen.deleteAccount.wipeAsyncStorage', e); }

      // Belt-and-braces SecureStore wipe. signOut() above should have
      // cleared the supabase-js auth tokens, but if the network call
      // failed the tokens can persist and restoreSessionFromCloud will
      // happily revive a session for an account that no longer exists.
      // The Supabase storage key is `sb-<projectref>-auth-token`, which
      // we can derive from the public URL. Best-effort: any failure
      // here is a logged warning, not a blocker.
      try {
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
        const projectRef = url.replace(/^https?:\/\//, '').split('.')[0];
        if (projectRef) {
          await SecureStore.deleteItemAsync(`sb-${projectRef}-auth-token`).catch(() => {});
        }
        // Older supabase-js versions used this key.
        await SecureStore.deleteItemAsync('supabase.auth.token').catch(() => {});
      } catch (e) { logError('SettingsScreen.deleteAccount.wipeSecureStore', e); }
      // Reload the JS bundle so any installed-but-not-yet-loaded APK
      // update takes effect on the next launch back to Welcome. Without
      // this, an install-on-top of a newer APK keeps the OLD bundle
      // running, the user signs up again, and the old sync code fires
      // against a fresh account, re-producing whatever the new bundle
      // was meant to fix. Best-effort: dev builds and Expo Go don't
      // support reload.
      try { await Updates.reloadAsync(); }
      catch (_) { /* dev / Expo Go, no-op */ }
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
              Alert.alert('Couldn\'t clear history', e?.message ?? 'Try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account: identity, plan, upgrade/downgrade. Destructive
            account actions live at the very bottom of the screen. */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingRow
            icon="person-circle-outline"
            label={user?.email || 'Signed in'}
            sub={tier === 'pro' ? 'Volyume Pro' : 'Free plan'}
            showArrow={false}
          />
          <SettingRow
            icon="card-outline"
            label="Subscription"
            sub="Plan, billing, restore purchases"
            onPress={() => navigation.navigate('Subscription')}
          />
          {tier !== 'pro' && (
            <SettingRow
              icon="sparkles"
              label="Go Pro"
              sub="Precision Coaching and weekly check-ins"
              onPress={() => navigation.navigate('ProUpgrade')}
            />
          )}
          {tier === 'pro' && (
            <SettingRow
              icon="arrow-down-circle-outline"
              label="Switch to Free"
              onPress={() =>
                Alert.alert(
                  'Switch to Free?',
                  'Everything you\'ve logged stays. Past coach outputs, check-ins, training blocks and PRs remain readable. You just won\'t get new Precision Coaching adjustments until you re-enable Pro.',
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
        </View>

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
          {/* Gym weight units, body weight units, and bar weight rows
              removed at user request. UK defaults: gym + bar = kg;
              body weight units come from onboarding (the morning-weight
              setup screen). The store still holds these values; they
              just aren't user-editable from Settings any more. */}
          <View style={styles.dietBlock}>
            <View style={styles.dietHeader}>
              <View style={styles.settingIcon}>
                <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Diet preference</Text>
                <Text style={styles.settingSub}>Filters the meals we suggest</Text>
              </View>
            </View>
            <View style={styles.dietChips}>
              {DIET_OPTIONS.map(opt => {
                const active = diet === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dietChip, active && styles.dietChipActive]}
                    onPress={() => { setDiet(opt.value); setDietPreference(opt.value); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.dietChipText, active && styles.dietChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Coaching */}
        <SectionHeader title="Coaching" />
        <View style={styles.section}>
          <SettingRow
            icon="heart-outline"
            label="Calmer experience"
            sub="Removes aggressive calorie targets and quietens progress prompts"
            showArrow={false}
            rightElement={
              <Switch
                value={calmEnabled}
                onValueChange={toggleCalmMode}
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                thumbColor={calmEnabled ? colors.primary : colors.textMuted}
              />
            }
          />
          {tier === 'pro' && (
            <>
              <SettingRow
                icon="footsteps-outline"
                label="Daily step target"
                sub={stepsEnabled
                  ? "Steps are the coach's first lever when progress slows, before your food. Your phone fills the number in."
                  : 'Off. The coach leans on your food, and later cardio, instead of steps.'}
                showArrow={false}
                rightElement={
                  <Switch
                    value={stepsEnabled}
                    onValueChange={toggleStepTarget}
                    trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                    thumbColor={stepsEnabled ? colors.primary : colors.textMuted}
                  />
                }
              />
              {stepsEnabled && (
                <View style={styles.stepTargetRow}>
                  <Text style={styles.stepTargetLabel}>Steps a day</Text>
                  <TextInput
                    style={styles.stepTargetInput}
                    value={stepTargetInput}
                    onChangeText={setStepTargetInput}
                    onBlur={saveStepTarget}
                    onSubmitEditing={saveStepTarget}
                    keyboardType="number-pad"
                    maxLength={5}
                    returnKeyType="done"
                    accessibilityLabel="Daily step target"
                  />
                </View>
              )}
            </>
          )}
          {bioSex === 'female' && (
            <SettingRow
              icon="calendar-outline"
              label="Cycle tracking"
              sub="Adds an optional question to your weekly check-in so the coach can steady your targets around your period"
              showArrow={false}
              rightElement={
                <Switch
                  value={cycleEnabled}
                  onValueChange={toggleCycleTracking}
                  trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                  thumbColor={cycleEnabled ? colors.primary : colors.textMuted}
                />
              }
            />
          )}
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
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

        {/* Display & accessibility */}
        <SectionHeader title="Display & accessibility" />
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
                  // Await the AsyncStorage write before prompting reload, otherwise
                  // a fast "Reload now" tap can tear down the JS VM before the pref
                  // persists, and the user sees no change on restart.
                  await setAccessibilityPref('largerText', v);
                  promptRestartForA11y('Larger text');
                }}
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
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
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
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
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
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
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
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
                    trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                    thumbColor={healthWeightStatus === 'granted' ? colors.primary : colors.textMuted}
                  />
                }
              />
              <SettingRow
                icon="walk-outline"
                label="Read daily steps"
                sub={
                  healthStepsStatus === 'granted'
                    ? 'Connected. Volyume reads your daily steps from your watch, phone or tracker in the background.'
                    : `Read your daily steps from ${getHealthProviderLabel()} (covers your watch, phone and trackers). Used for your step target and the coach.`
                }
                showArrow={false}
                rightElement={
                  <Switch
                    value={healthStepsStatus === 'granted'}
                    onValueChange={handleToggleSteps}
                    disabled={healthSyncing}
                    trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                    thumbColor={healthStepsStatus === 'granted' ? colors.primary : colors.textMuted}
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
                    trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
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

        {/* Your data */}
        <SectionHeader title="Your data" />
        <View style={styles.section}>
          <SettingRow
            icon="cloud-outline"
            label={syncingNow ? 'Syncing…' : 'Cloud sync'}
            sub={syncingNow ? 'Checking for changes.' : formatLastSynced(syncSnapshot)}
            onPress={syncingNow ? null : handleSyncNow}
            showArrow={!syncingNow}
          />
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

        {/* Privacy & legal */}
        <SectionHeader title="Privacy & legal" />
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
            sub="Sends the macros you confirm and the label photo. Helps the next user get a hit."
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
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </View>

        {/* Help & about */}
        <SectionHeader title="Help & about" />
        <View style={styles.section}>
          <SettingRow
            icon="chatbubble-ellipses-outline"
            label="Send feedback"
            sub="Quick sentiment + optional note"
            onPress={() => feedback?.open({ trigger: 'settings' })}
          />
          <SettingRow
            icon="star-outline"
            label="Rate Volyume"
            sub="A rating helps other lifters find it"
            onPress={() => {
              const pkg = Constants.expoConfig?.android?.package || 'app.volyume';
              const market = `market://details?id=${pkg}`;
              const web = `https://play.google.com/store/apps/details?id=${pkg}`;
              Linking.openURL(market).catch(() => Linking.openURL(web).catch(() => {}));
            }}
          />
          <SettingRow
            icon="information-circle-outline"
            label="Credits"
            sub="OpenFoodFacts, CoFID, USDA attribution"
            onPress={() => navigation.navigate('Credits')}
          />
        </View>

        {/* Sign out and delete account, isolated at the bottom so a
            destructive tap is never next to a routine toggle. */}
        <View style={styles.section}>
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

        {/* About */}
        <View style={styles.about}>
          <View style={styles.appNameRow}>
            <Text style={styles.appName}>Volyume</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaBadgeText}>BETA</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              // Tap to share the build identifier. Useful for beta
              // testers when they file bugs: paste this into the
              // report and we know exactly which build they're on.
              const v = Constants.expoConfig?.version ?? '1.1.0';
              const code = Platform.OS === 'ios'
                ? Constants.expoConfig?.ios?.buildNumber
                : Constants.expoConfig?.android?.versionCode;
              const env = __DEV__ ? 'dev' : 'release';
              const id = `Volyume v${v} (${Platform.OS} ${code ?? '?'}, ${env})`;
              Share.share({ message: id }).catch(() => {});
            }}
            onLongPress={() => navigation.navigate('DebugLog')}
            delayLongPress={600}
            activeOpacity={0.7}
            accessibilityLabel="App version. Tap to share, press and hold for debug logs."
          >
            <Text style={styles.appVersion}>
              v{Constants.expoConfig?.version ?? '1.1.0'}
              {' '}
              ({Platform.OS === 'ios'
                ? Constants.expoConfig?.ios?.buildNumber
                : Constants.expoConfig?.android?.versionCode})
            </Text>
          </TouchableOpacity>
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
    ...type.body,
    flex: 1,
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
  stepTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepTargetLabel: { ...type.body, color: colors.textSecondary },
  stepTargetInput: {
    minWidth: 88,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    ...type.body,
    textAlign: 'center',
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
  settingLabel: { ...type.body, color: colors.textPrimary },
  settingSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xxs, lineHeight: 16 },
  settingLabelDestructive: { color: colors.error },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  dietBlock: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  dietChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dietChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  dietChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  dietChipText: {
    ...type.label,
    color: colors.textSecondary,
  },
  dietChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  comingSoon: { ...type.caption, color: colors.textMuted, fontStyle: 'italic' },
  about: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  appName: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary, letterSpacing: 2 },
  appNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  betaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  betaBadgeText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.background,
    letterSpacing: 1,
  },
  appVersion: { fontSize: fontSize.sm, color: colors.textMuted },
  a11yNote: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', paddingHorizontal: spacing.md, paddingTop: spacing.xs, lineHeight: 16 },
  tagline: { ...type.caption, color: colors.textMuted },
  dataPrivacyNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    lineHeight: 16,
  },
});
