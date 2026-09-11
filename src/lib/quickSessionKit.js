/**
 * quickSessionKit.js - persists the quick full-body session's remembered
 * equipment kit (D156, ruling 8:
 * docs/quick-session-equipment-2026-09-11/10-SPEC.md).
 *
 * AsyncStorage, not a new table or column: this is a per-account UI
 * preference (which equipment kinds the sheet last showed selected), not
 * programme state, so a schema change is not warranted for it (CLAUDE.md:
 * additive-only, and only when unavoidable). Same pattern as
 * reEntryEaseState.js: never throws, shape-checked on read, first use
 * (nothing stored yet) resolves to the empty kit (bodyweight only), per
 * ruling 8.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logWarn } from './errorLog';

const KEY_PREFIX = '@volyume_quick_kit_v1:';

/**
 * The account's last-chosen kit (an array of QUICK_KIT_KINDS ids), or []
 * when nothing is stored yet or storage is unavailable/malformed. Never
 * throws.
 */
export async function readQuickKit(uid) {
  if (!uid) return [];
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + uid);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === 'string');
  } catch (_e) {
    return [];
  }
}

/**
 * Persist the account's chosen kit. Best-effort: a write failure leaves the
 * previous (or no) value in place rather than throwing, matching
 * reEntryEaseState.js's "silence is safe" default.
 */
export async function writeQuickKit(uid, kit) {
  if (!uid) return;
  try {
    const safe = Array.isArray(kit) ? kit.filter((id) => typeof id === 'string') : [];
    await AsyncStorage.setItem(KEY_PREFIX + uid, JSON.stringify(safe));
  } catch (e) {
    logWarn('quickSessionKit.write', e?.message);
  }
}
