/**
 * The Hub's one-time receipt (D228 item 1, option C): "Your sessions post to
 * Community", with the real audience sentence and a direct link to change it.
 *
 * Whether the card is seen is remembered per person on the device. Unlike the
 * first-post confirmation (which fails toward holding a post back), this flag
 * fails toward SHOWING: the receipt is the person's own notice about who sees
 * their sessions, so an unreadable flag shows it again rather than losing it
 * for good. Whether it may show at all (sharing on, neither calm mode nor an
 * open ED flag) is the Hub's gate, not this file's.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const JOIN_RECEIPT_SEEN_PREFIX = '@volyume_community_join_receipt_seen_';

export function joinReceiptSeenKey(uid) {
  return `${JOIN_RECEIPT_SEEN_PREFIX}${uid}`;
}

/** Has this person dismissed (or followed the link on) the receipt? An
 * unreadable flag answers false: the receipt shows again. */
export async function readJoinReceiptSeen(uid) {
  if (!uid) return false;
  try {
    return (await AsyncStorage.getItem(joinReceiptSeenKey(uid))) === '1';
  } catch (_e) {
    return false;
  }
}

/** Settle the receipt for this person. Never throws; a failed write only
 * means the receipt shows once more. */
export async function markJoinReceiptSeen(uid) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(joinReceiptSeenKey(uid), '1');
  } catch (_e) { /* best effort: the receipt shows again next time */ }
}
