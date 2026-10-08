/**
 * The one setter for "Share what I did" (D221 spec 2.6 L17). The Training
 * profile row and the mirrored Privacy row both go through this, so the
 * two switches can never disagree about how a change is saved, reverted
 * or queued. Behaviour is the Training profile screen's own, moved here
 * unchanged: optimistic local write, a pending-publish marker owed from
 * before the call, the server call, a revert on `rules_outdated`, and a
 * queued retry when the call did not land.
 */
// Through the barrel on purpose: one import path for the module's
// collaborators, the same one the screens use (and tests mock).
import {
  readShareSettings, writeShareSettings, publishSharingSettings, setSharingPublishPending,
} from './index';

export const SHARE_OFF_TITLE = 'Remove the posts already shared?';
export const SHARE_OFF_BODY =
  'Turning this off stops new posts straight away. You can also remove what has already been shared, or keep it as it is.';

/**
 * Save a new sharing settings object.
 *
 * @param {string} uid
 * @param {object} prevSettings what the device held before this change
 * @param {object} nextSettings the settings being asked for
 * @param {{removeShared?: boolean, isMinor?: boolean}} [opts]
 * @returns {Promise<{settings: object, status: 'sent'|'queued'|'rules_outdated'}>}
 *   `settings` is what the screen should now show (the revert on
 *   `rules_outdated`, the audience clamp for a minor otherwise)
 */
export async function saveShareSessions(uid, prevSettings, nextSettings, { removeShared = false, isMinor = false } = {}) {
  // A minor never gets an audience beyond followers (belt and braces: the
  // server also forces this).
  const clamped = isMinor ? { ...nextSettings, sessions_audience: 'followers' } : nextSettings;
  await writeShareSettings(uid, clamped);
  // D194 addendum 2: owed from BEFORE the call, so a profile refresh that
  // lands mid-flight never mirrors the old row back over the change.
  await setSharingPublishPending(uid, true, { removeShared });
  const out = await publishSharingSettings(uid, clamped, { removeShared });
  if (out?.reason === 'rules_outdated') {
    await writeShareSettings(uid, prevSettings);
    await setSharingPublishPending(uid, false);
    return { settings: prevSettings, status: 'rules_outdated' };
  }
  if (out?.sent) {
    await setSharingPublishPending(uid, false);
    return { settings: clamped, status: 'sent' };
  }
  // F4: withdrawing or granting must never be lost to one failed call.
  await setSharingPublishPending(uid, true, { removeShared });
  return { settings: clamped, status: 'queued' };
}

export { readShareSettings };
