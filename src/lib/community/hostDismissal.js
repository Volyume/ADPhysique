/**
 * The HOST row's "Not now" (26-EARLY-DAYS-SPEC.md 1.2; review note 14,
 * the calm posture of CR-09): a reader who does not want to follow the
 * founder says so once, on this device, and the row and its read never
 * come back for them. Per reader, so a second account on the same phone
 * decides for itself. Best effort either way: a storage failure reads as
 * "not dismissed", which only ever shows the row again.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@volyume_community_host_dismissed_';

export function hostDismissalKey(uid) {
  return `${PREFIX}${String(uid ?? '')}`;
}

export async function readHostDismissed(uid) {
  if (!uid) return false;
  try {
    return (await AsyncStorage.getItem(hostDismissalKey(uid))) === '1';
  } catch (_e) {
    return false;
  }
}

export async function writeHostDismissed(uid) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(hostDismissalKey(uid), '1');
  } catch (_e) { /* best effort: the row shows again next time */ }
}
