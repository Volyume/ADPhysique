/**
 * capability/weekNote.js - the section 19 conditional check-in answer.
 *
 * When an episode is ACTIVE, the weekly check-in asks ONE conditional
 * question in place of nothing else: "How did training around your
 * restriction go this week?" The answer updates exactly one thing - the
 * episode's weekly note in the coach context (hold vs
 * suggest-reviewing-the-restriction). It never auto-modifies
 * constraints and never infers deterioration (CC-C2 keeps that
 * clinical-review territory).
 *
 * Storage ruling (lead, D33, recorded in the bundle tracker): the note
 * is DEVICE-LOCAL AsyncStorage, one week's shelf life, never synced -
 * it is transient coaching context, and keeping it out of the cloud
 * keeps the Article 9 surface exactly where CC26 drew it. A read
 * failure returns null (no note, no drama).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = (userId) => `capabilityWeekNote.v1.${userId}`;

export const CAPABILITY_WEEK_ANSWER = Object.freeze({
  FINE: 'fine',
  IN_THE_WAY: 'in_the_way',
  NOT_RELEVANT: 'not_relevant',
});

/** Record this week's answer. Overwrites the previous week's note. */
export async function setCapabilityWeekNote(userId, { weekStart, answer, episodeGroupId = null } = {}) {
  if (!userId || !weekStart || !answer) return false;
  if (!Object.values(CAPABILITY_WEEK_ANSWER).includes(answer)) return false;
  try {
    await AsyncStorage.setItem(KEY(userId), JSON.stringify({ weekStart, answer, episodeGroupId }));
    return true;
  } catch (_e) { return false; }
}

/** The note for the given week, or null (missing, stale or unreadable). */
export async function getCapabilityWeekNote(userId, weekStart) {
  if (!userId || !weekStart) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return null;
    const note = JSON.parse(raw);
    return note?.weekStart === weekStart ? note : null;
  } catch (_e) { return null; }
}
