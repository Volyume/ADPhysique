/**
 * profiles per-table push + pull.
 *
 * The cloud table is users_profile (legacy name; the registry
 * uses 'profiles'). The user profile lives in useAppStore in
 * memory (Zustand) backed by AsyncStorage, not in SQLite, so
 * this handler reads/writes app state directly.
 *
 * Migration 045 adds users_profile.column_updates_at jsonb plus
 * a safe-merge trigger; per-field write timestamps live in the
 * client store at userProfileFieldUpdatedAt (camelCase keyed,
 * matching how the profile itself is shaped in the store). The
 * handler maps both to snake_case on push and feeds the cloud's
 * column_updates_at into conflict.resolve(merge) on pull.
 *
 * tier is excluded from the push payload — the server owns tier
 * exclusively via the upgrade_tier RPC + play-billing-rtdn
 * webhook, and migrate_005's trigger rolls back any client UPDATE
 * to it.
 */

import { logSyncError } from '../telemetry';
import { resolve as resolveConflict } from '../conflict';

// camelCase store keys → snake_case users_profile columns. Order
// matters only for stable column_updates_at serialisation in tests.
const FIELD_MAP = Object.freeze([
  ['firstName',        'first_name'],
  ['units',            'units'],
  ['trainingFocus',    'training_focus'],
  ['trainingAgeYears', 'training_age'],
  ['primaryEquipment', 'primary_equipment'],
  ['barWeight',        'bar_weight'],
]);

function _toIso(ms) {
  if (!ms) return null;
  if (typeof ms === 'string') return ms;
  return new Date(Number(ms)).toISOString();
}

function _readStore() {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../../store/useAppStore').default;
    return useAppStore.getState() ?? {};
  } catch (_) {
    return {};
  }
}

function _writeStore(profile) {
  try {
    // eslint-disable-next-line global-require
    const useAppStore = require('../../../store/useAppStore').default;
    const setUserProfile = useAppStore.getState()?.setUserProfile;
    if (typeof setUserProfile !== 'function') return false;
    setUserProfile(profile);
    return true;
  } catch (_) {
    return false;
  }
}

function _profileToCloudPayload(userId, profile, fieldUpdatedAt) {
  const payload = {
    id: userId,
    updated_at: new Date().toISOString(),
  };
  const columnUpdatesAt = {};
  for (const [camel, snake] of FIELD_MAP) {
    if (camel === 'firstName')        payload[snake] = profile.firstName ?? null;
    else if (camel === 'units')       payload[snake] = profile.units ?? 'kg';
    else if (camel === 'trainingFocus') payload[snake] = profile.trainingFocus ?? 'bodybuilding';
    else if (camel === 'trainingAgeYears') payload[snake] = profile.trainingAgeYears ?? null;
    else if (camel === 'primaryEquipment') payload[snake] = profile.primaryEquipment ?? null;
    else if (camel === 'barWeight')   payload[snake] = profile.barWeight ?? 20;

    const ts = fieldUpdatedAt?.[camel];
    if (ts) columnUpdatesAt[snake] = _toIso(ts);
  }
  payload.column_updates_at = columnUpdatesAt;
  return payload;
}

export async function pushProfiles(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const state = _readStore();
    const profile = state.userProfile;
    if (!profile) return { count: 0, errors: 0 };

    const fieldUpdatedAt = state.userProfileFieldUpdatedAt || {};
    const payload = _profileToCloudPayload(userId, profile, fieldUpdatedAt);

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
      .select('first_name, units, training_focus, training_age, primary_equipment, bar_weight, updated_at, column_updates_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      logSyncError('sync.tables.profiles.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data) return { count: 0, errors: 0 };

    // Build the local row in the same snake_case shape the cloud
    // ships so conflict.resolve(merge) can compare like-for-like.
    const state = _readStore();
    const localProfile = state.userProfile ?? {};
    const localFieldUpdatedAt = state.userProfileFieldUpdatedAt ?? {};
    const localCloudShape = _profileToCloudPayload(userId, localProfile, localFieldUpdatedAt);

    // resolveConflict honours profiles.conflictStrategy=merge in
    // the registry; per-column timestamps win column-by-column.
    const { row: merged, winner } = await resolveConflict({
      table: 'profiles',
      recordId: userId,
      local: localCloudShape,
      server: data,
      userId,
    });

    // Apply the merged row back to the store. winner=='client'
    // means nothing in the cloud changed our state; we still
    // re-set to keep the column_updates_at map consistent (the
    // server's merged jsonb is the source of truth from now on).
    const mergedProfile = {
      firstName:        merged.first_name ?? null,
      units:            merged.units ?? 'kg',
      trainingFocus:    merged.training_focus ?? 'bodybuilding',
      trainingAgeYears: merged.training_age ?? null,
      primaryEquipment: merged.primary_equipment ?? null,
      barWeight:        merged.bar_weight ?? 20,
    };
    const ok = _writeStore(mergedProfile);
    return {
      count: ok ? 1 : 0,
      errors: 0,
      ...(winner ? { winner } : {}),
    };
  } catch (e) {
    logSyncError('sync.tables.profiles.pull', e);
    return { count: 0, errors: 1 };
  }
}
