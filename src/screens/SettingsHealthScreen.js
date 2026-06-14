import { useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, withAlpha } from '../styles/theme';
import { useToast } from '../components/Toast';
import { logError } from '../lib/errorLog';
import {
  isHealthAvailable, getHealthProviderLabel,
  getHealthPermissionStatus, requestHealthPermissions, importNewWeights, importNewCardio,
  openSystemHealthSettings, openHealthConnectInstall,
} from '../lib/health';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

// Health connections: per-scope read/write toggles for the device health
// provider (Apple Health / Health Connect). Each scope is requested and
// revoked independently. Runtime-critical (OS permission prompts).
export default function SettingsHealthScreen() {
  const toast = useToast();
  const { user, tier } = useAppStore(useShallow(s => ({ user: s.user, tier: s.tier })));
  // Passive cardio import is a Pro cardio feature; the row is hidden for free
  // users (NA-cux-5). Cardio itself is Pro-gated app-wide (withProGuard 'Cardio').
  const isPro = tier === 'pro';

  // Health integration. Per-scope status: weight read separately from
  // workout write so the user can enable one without the other.
  // healthSyncing tracks the manual "Sync now" tap.
  const [healthWeightStatus, setHealthWeightStatus] = useState('unavailable');
  const [healthWorkoutStatus, setHealthWorkoutStatus] = useState('unavailable');
  const [healthStepsStatus, setHealthStepsStatus] = useState('unavailable');
  const [healthCardioStatus, setHealthCardioStatus] = useState('unavailable');
  const [healthSyncing, setHealthSyncing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isHealthAvailable()) {
        getHealthPermissionStatus(['weight']).then(setHealthWeightStatus).catch(() => {});
        getHealthPermissionStatus(['workout']).then(setHealthWorkoutStatus).catch(() => {});
        getHealthPermissionStatus(['steps']).then(setHealthStepsStatus).catch(() => {});
        if (isPro) getHealthPermissionStatus(['cardio']).then(setHealthCardioStatus).catch(() => {});
      }
    }, [isPro]),
  );

  // When a connect attempt comes back 'sdk_unavailable' the problem isn't a
  // refused permission, it's that Health Connect itself isn't ready on this
  // phone (not installed, or needs an update). A flat "permission needed"
  // toast is a dead end there, so offer the real next step: open the Play
  // listing. Returns true if it handled an sdk_unavailable status.
  async function handleSdkUnavailable(status) {
    if (status !== 'sdk_unavailable') return false;
    appAlert(
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

  async function handleToggleCardio(next) {
    if (!next) {
      toast.show('Open Health settings to turn cardio read off', { variant: 'info' });
      await openSystemHealthSettings();
      return;
    }
    setHealthSyncing(true);
    try {
      const status = await requestHealthPermissions(['cardio']);
      setHealthCardioStatus(status);
      if (status === 'granted') {
        const { imported } = await importNewCardio(user?.id, { isPaid: isPro });
        toast.show(
          imported > 0
            ? `${imported} cardio ${imported === 1 ? 'session' : 'sessions'} imported`
            : 'Connected. No new sessions yet.',
          { variant: 'success' },
        );
      } else if (await handleSdkUnavailable(status)) {
        // handled: prompted to install Health Connect
      } else if (status === 'denied') {
        toast.show(`Permission needed to read cardio from ${getHealthProviderLabel()}`, { variant: 'warning' });
      }
    } catch (e) {
      logError('SettingsScreen.toggleCardio', e);
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

  return (
    <SettingsPage>
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
              : `Read your daily steps from ${getHealthProviderLabel()} (covers your watch, phone and trackers). They feed your step target and the coach.`
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
        {isPro && (
          <SettingRow
            icon="heart-outline"
            label="Read cardio sessions"
            sub={
              healthCardioStatus === 'granted'
                ? `Connected. Volyume brings in your cardio sessions from ${getHealthProviderLabel()} in the background.`
                : `Bring in cardio from ${getHealthProviderLabel()}. Read only. Volyume never sends your health data out.`
            }
            showArrow={false}
            rightElement={
              <Switch
                value={healthCardioStatus === 'granted'}
                onValueChange={handleToggleCardio}
                disabled={healthSyncing}
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                thumbColor={healthCardioStatus === 'granted' ? colors.primary : colors.textMuted}
              />
            }
          />
        )}
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
    </SettingsPage>
  );
}
