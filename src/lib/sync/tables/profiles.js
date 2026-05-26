/**
 * profiles per-table push + pull.
 *
 * The cloud table is users_profile (legacy name; the registry
 * uses 'profiles'). The user profile lives in useAppStore in
 * memory (Zustand) backed by AsyncStorage, not in SQLite — so
 * this handler reads/writes app state directly rather than going
 * through database.js.
 *
 * Registry says conflictStrategy=merge. The conflict.resolve()
 * merge path needs a column_updates_at JSONB column on
 * users_profile to track per-column write timestamps; that
 * column does not yet exist (no migration ships it). Until then
 * this handler does a single-direction last-write-wins push +
 * pull. The merge path is genuinely follow-up work, not a code
 * lift — it requires:
 *   1. New migration 045 adding column_updates_at JSONB.
 *   2. Client push to populate column_updates_at on every field
 *      write.
 *   3. Client pull to feed conflict.resolve() with
 *      column_updates_at.
 * Tracked. The registry stays at merge to record intent; the
 * handler comments record the actual current behaviour.
 *
 * tier is excluded from the push payload per the existing
 * syncProfile contract — only the server controls tier, via the
 * upgrade_tier RPC and the play-billing-rtdn webhook.
 */

import { logSyncError } from '../telemetry';

function readProfileFromStore() {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../../store/useAppStore').default;
    const state = useAppStore.getState();
    return state?.userProfile ?? null;
  } catch (_) {
    return null;
  }
}

function applyProfileToStore(cloudRow) {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../../store/useAppStore').default;
    const setUserProfile = useAppStore.getState()?.setUserProfile;
    if (typeof setUserProfile !== 'function') return false;
    setUserProfile({
      firstName: cloudRow.first_name ?? null,
      units: cloudRow.units ?? 'kg',
      trainingFocus: cloudRow.training_focus ?? 'bodybuilding',
      trainingAgeYears: cloudRow.training_age ?? null,
      primaryEquipment: cloudRow.primary_equipment ?? null,
      barWeight: cloudRow.bar_weight ?? 20,
    });
    return true;
  } catch (_) {
    return false;
  }
}

export async function pushProfiles(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const profile = readProfileFromStore();
    if (!profile) return { count: 0, errors: 0 };
    const payload = {
      id: userId,
      first_name: profile.firstName ?? null,
      units: profile.units ?? 'kg',
      training_focus: profile.trainingFocus ?? 'bodybuilding',
      training_age: profile.trainingAgeYears ?? null,
      primary_equipment: profile.primaryEquipment ?? null,
      bar_weight: profile.barWeight ?? 20,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb
      .from('users_profile')
      .upsert(payload, { onConflict: 'id' });
    if (error) {
      logSyncError('sync.tables.profiles.pushUpsert', error);
      return { count: 0, errors: 1 };
    }
    return { count: 1, errors: 0 };
  } catch (e) {
    logSyncError('sync.tables.profiles.push', e);
    return { count: 0, errors: 1 };
  }
}

export async function pullProfiles(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('users_profile')
      .select('first_name, units, training_focus, training_age, primary_equipment, bar_weight, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      logSyncError('sync.tables.profiles.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data) return { count: 0, errors: 0 };
    const ok = applyProfileToStore(data);
    return { count: ok ? 1 : 0, errors: 0 };
  } catch (e) {
    logSyncError('sync.tables.profiles.pull', e);
    return { count: 0, errors: 1 };
  }
}
