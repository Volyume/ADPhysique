/**
 * The one setter for a training-profile share switch (consistency, age
 * group and the other bands), D221 Stage 3, 3e. The Training profile screen
 * and the privacy panel both go through this, so the two can never disagree
 * about how a change is saved, reverted or queued. Behaviour is the Training
 * profile screen's own `toggleBand`, moved here unchanged: optimistic local
 * write, then the server call (`publishConsistency` for the consistency
 * switch, which is the only path that computes the counters, otherwise
 * `syncTrainingProfile`), a revert on `rules_outdated`.
 */

// Through the barrel on purpose, as `shareSessions.js` does: one import path
// for the collaborators, the one the screens use (and tests mock).
import { writeShareSettings, syncTrainingProfile, publishConsistency } from './index';

/**
 * @param {string} uid
 * @param {object} prevSettings the settings before this change
 * @param {string} key a share key (`consistency`, `age_band`, `days`, ...)
 * @param {boolean} next
 * @returns {Promise<{settings: object, status: 'sent'|'queued'|'rules_outdated'}>}
 */
export async function saveBandToggle(uid, prevSettings, key, next) {
  const settings = { ...prevSettings, [key]: next };
  await writeShareSettings(uid, settings);
  const out = key === 'consistency'
    ? await publishConsistency(uid)
    : await syncTrainingProfile(uid, { force: true });
  if (out?.reason === 'rules_outdated') {
    await writeShareSettings(uid, prevSettings);
    return { settings: prevSettings, status: 'rules_outdated' };
  }
  return { settings, status: out?.sent ? 'sent' : 'queued' };
}
