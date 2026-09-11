/**
 * The training profile: observed training turned into coarse bands
 * (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 3;
 * SD-22, SD-30, SD-31).
 *
 * Volyume is the only product in this space that already knows how the
 * person actually trains. That history stays on the device. What may
 * leave it is a handful of COARSE BANDS the person has looked at and
 * chosen, one toggle at a time, to share.
 *
 * Two halves, deliberately kept apart:
 *  - `deriveTrainingProfile` is PURE. Given completed-workout start
 *    timestamps, set rows, the stated experience and the canonical
 *    exercise ids, it answers the bands. No I/O, no store, no clock of
 *    its own (`nowMs` is injected), so the derivation is testable to the
 *    boundary and cannot drift with the wall clock.
 *  - `loadTrainingProfile` is the I/O half. It reads exactly four things
 *    from the device: completed-workout start timestamps, the set rows in
 *    the window (for exercise ids only), the exercise library (to tell a
 *    canonical id from a custom one) and the active plan. SD-30: nothing
 *    about the body, food, Progress Scan, injuries, coaching or check-ins
 *    is read here, ever.
 *
 *    Communities revamp (2026-09-10): the active plan's read stopped
 *    producing a shareable `tp_programme_key` -- there is no Programme
 *    toggle any more and the training profile never sends that field
 *    (the SD-30 read stays exactly as pinned by
 *    `community.privacy.guard.test.js`, so `getActivePlan` is still
 *    imported and called; its result is simply never surfaced).
 *
 *    Phase 3 (2026-09-10, `docs/communities-revamp-2026-09-10/
 *    23-PHASE3-SPEC.md` section 1): a second toggle, `share_sessions`
 *    ("Share what I did"), plus its `sessions_audience` choice
 *    (followers/groups/everyone). Unlike the bands above, `share_sessions`
 *    is never age-gated (a minor may set it; only the CHOSEN audience is
 *    narrowed, downstream of this file, to followers). Both fields always
 *    travel in `shareablePayload`'s output, the same "the current value
 *    travels every time" shape `share_consistency` already has.
 *
 * SD-31, the creepiness rule, is why every value in this file is a BAND.
 * Nothing finer than a band exists in the payload: no dates, no times, no
 * "last trained", no session count. A band says "usually trains
 * evenings"; it can never say where someone was on Tuesday.
 *
 * The age band is the one exception to derivation: it is server-derived
 * from the person's own record when they opt in, so all that leaves the
 * device here is the boolean `share_age_band`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { callCommunity } from './transport';
import { currentUserId } from './profile';
import { styleKeyFromTags } from '../exercise/stylePools';
import {
  getCompletedWorkoutStartTimestamps, getWorkoutSetsSince, getAllExercises, getActivePlan,
} from '../database';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The closed set of weekday keys, in week order (UK weeks start Monday). */
export const TP_DAYS = Object.freeze({
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
});

/** `Date#getDay()` is Sunday-first; the app's week is Monday-first. */
const DAY_KEYS_BY_JS_INDEX = Object.freeze(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
const DAY_ORDER = Object.freeze(Object.keys(TP_DAYS));

/**
 * The closed set of start bands, with the words the preview line and the
 * reasons line use. Bounds are LOCAL start hours: morning 05:00-09:00,
 * midday 09:00-14:00, afternoon 14:00-17:00, evening 17:00-22:00, late
 * 22:00-05:00.
 */
export const TP_TIME_BANDS = Object.freeze({
  morning: 'mornings',
  midday: 'at midday',
  afternoon: 'in the afternoon',
  evening: 'evenings',
  late: 'late',
});

const TIME_BAND_ORDER = Object.freeze(Object.keys(TP_TIME_BANDS));

/** Average sessions a week, as a band. */
export const TP_SESSIONS_BANDS = Object.freeze({
  '1_2': '1 to 2',
  3: '3',
  '4_5': '4 to 5',
  '6_plus': '6 or more',
});

/**
 * The sessions bands IN ORDER. `TP_SESSIONS_BANDS` cannot carry the order
 * itself: '3' is an integer-like key, so JavaScript hoists it to the
 * front of `Object.keys`, and any code that read the order off the object
 * would put "3" before "1 to 2". The migration's list is in this order.
 */
export const TP_SESSIONS_BAND_ORDER = Object.freeze(['1_2', '3', '4_5', '6_plus']);

export const TP_EXPERIENCE_BANDS = Object.freeze({
  new: 'New',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
});

/** Server-derived when the person opts in; never for a minor (SD-32). */
export const TP_AGE_BANDS = Object.freeze({
  '18_24': '18 to 24',
  '25_34': '25 to 34',
  '35_44': '35 to 44',
  '45_54': '45 to 54',
  '55_plus': '55 or over',
});

/**
 * The thresholds, named rather than inlined so the test that pins them
 * reads as the rule it is pinning (blueprint section 3).
 */
export const TP_DAY_SHARE = 0.25;
export const TP_DAY_MIN_SESSIONS = 6;
export const TP_TIME_BAND_SHARE = 0.35;
export const TP_MAX_TIME_BANDS = 2;
export const TP_MAX_STAPLE_LIFTS = 5;
export const TP_WINDOW_WEEKS = 12;

/**
 * Defaults (blueprint section 3): sessions, staple lifts and experience
 * ON; days, time bands and age band OFF. The three that are off are the
 * three that say most about where a person is and when, so they start
 * off and are switched on deliberately.
 */
export const TP_DEFAULT_SHARE = Object.freeze({
  days: false,
  time_bands: false,
  sessions: true,
  staple_lifts: true,
  experience: true,
  age_band: false,
  // Community product audit `60-DESIGN-PROGRESS-COMMUNITY.md` section 1:
  // "Share my consistency" - sessions this week/month, weeks streak. A
  // moving weekly figure, not a static band, so it defaults OFF like the
  // other revealing toggles and is handled separately in
  // `shareablePayload` (its fields come from `trainingConsistency.js`,
  // not from `deriveTrainingProfile`).
  consistency: false,
  // Phase 3 (spec section 1): "Share what I did" - off by default, same
  // as every other revealing toggle. Its audience lives in the sibling
  // `sessions_audience` field below, kept OUTSIDE this boolean set
  // because it is a three-way choice, not a switch.
  share_sessions: false,
});

export const TP_SHARE_KEYS = Object.freeze(Object.keys(TP_DEFAULT_SHARE));

/** The closed set `sessions_audience` may hold (contract Part B). */
export const SESSIONS_AUDIENCE_VALUES = Object.freeze(['followers', 'groups', 'everyone']);

/** The three `Chip` labels the audience row renders, in this order. */
export const SESSIONS_AUDIENCE_LABELS = Object.freeze({
  followers: 'Followers',
  groups: 'My groups',
  everyone: 'Everyone',
});

export const DEFAULT_SESSIONS_AUDIENCE = 'followers';

/**
 * Which band each toggle carries. The payload is built from THIS map and
 * nothing else, so a field that was never named here cannot travel, no
 * matter what a future derivation adds to its answer.
 */
const SHARE_KEY_TO_FIELD = Object.freeze({
  days: 'tp_days',
  time_bands: 'tp_time_bands',
  sessions: 'tp_sessions_band',
  staple_lifts: 'tp_staple_lifts',
  experience: 'tp_experience_band',
});

export const TP_SHARE_PREFIX = '@volyume_community_tp_share_';
export const TP_SYNCED_PREFIX = '@volyume_community_tp_synced_';
export const TP_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function tpShareKey(uid) {
  return `${TP_SHARE_PREFIX}${uid ?? 'unknown'}`;
}

export function tpSyncedKey(uid) {
  return `${TP_SYNCED_PREFIX}${uid ?? 'unknown'}`;
}

// ─── The pure half ───────────────────────────────────────────────────

/** The band a local start hour falls in. */
export function timeBandForHour(hour) {
  const h = Number(hour);
  if (!Number.isFinite(h)) return null;
  if (h >= 5 && h < 9) return 'morning';
  if (h >= 9 && h < 14) return 'midday';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'late';
}

/**
 * The stated experience, as one of the three bands. An unrecognised value
 * answers null rather than a guess: an empty band shares nothing, which is
 * the safe direction.
 */
export function experienceBand(experience) {
  switch (String(experience ?? '').trim().toLowerCase()) {
    case 'beginner':
    case 'new':
      return 'new';
    case 'intermediate':
      return 'intermediate';
    case 'advanced':
    case 'experienced':
    // The engine's fourth level (lead ruling 2026-09-06): a competitive
    // lifter is experienced; the closed set must not drop a real value.
    case 'competitive':
      return 'experienced';
    default:
      return null;
  }
}

/**
 * The sessions band from an average per week. The boundaries round to the
 * nearest whole session, so 2.5 reads as three and 5.5 as six.
 */
export function sessionsBandFor(perWeek) {
  const n = Number(perWeek);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 2.5) return '1_2';
  if (n < 3.5) return '3';
  if (n < 5.5) return '4_5';
  return '6_plus';
}

function toIdSet(ids) {
  if (ids instanceof Set) return ids;
  return new Set(Array.isArray(ids) ? ids : []);
}

/**
 * Derive the bands. PURE.
 *
 * @param {object} input
 * @param {number[]} input.startTimestamps completed-workout start times,
 *   epoch ms. Unfiltered history is fine: the window is applied here.
 * @param {Array<{exerciseId?: string, exercise_id?: string,
 *   workoutId?: string, workout_id?: string, createdAt?: number,
 *   created_at?: number}>} input.setsRows set rows. Only the exercise id,
 *   the workout id and the created timestamp are read.
 * @param {string|null} input.experience the stated experience level
 * @param {number} input.nowMs injected clock
 * @param {number} [input.windowWeeks]
 * @param {Set<string>|string[]} input.canonicalIds every non-custom
 *   exercise id. Anything outside this set is a custom exercise and is
 *   never a staple lift: a custom name is free text the person wrote.
 * @returns {{tp_days: (string[]|null), tp_time_bands: string[],
 *   tp_sessions_band: (string|null), tp_staple_lifts: string[],
 *   tp_experience_band: (string|null), sessions: number}}
 */
export function deriveTrainingProfile({
  startTimestamps = [], setsRows = [], experience = null,
  nowMs = 0, windowWeeks = TP_WINDOW_WEEKS, canonicalIds = null,
} = {}) {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const weeks = Number.isFinite(windowWeeks) && windowWeeks > 0 ? windowWeeks : TP_WINDOW_WEEKS;
  const since = now - (weeks * WEEK_MS);

  const inWindow = (Array.isArray(startTimestamps) ? startTimestamps : [])
    .map((t) => Number(t))
    .filter((t) => Number.isFinite(t) && t >= since && t <= now)
    .sort((a, b) => a - b);

  const sessions = inWindow.length;

  const empty = {
    tp_days: null,
    tp_time_bands: [],
    tp_sessions_band: null,
    tp_staple_lifts: [],
    tp_experience_band: experienceBand(experience),
    sessions,
  };
  if (sessions === 0) return empty;

  // Days. A weekday is a training day when it carries a quarter of the
  // sessions, and only once there are enough sessions for a share to mean
  // anything: three sessions would make every one of them a "usual" day.
  let days = null;
  if (sessions >= TP_DAY_MIN_SESSIONS) {
    const byDay = new Map();
    for (const ts of inWindow) {
      const key = DAY_KEYS_BY_JS_INDEX[new Date(ts).getDay()];
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    days = DAY_ORDER.filter((key) => (byDay.get(key) ?? 0) / sessions >= TP_DAY_SHARE);
    if (days.length === 0) days = null;
  }

  // Time bands. At most two, in the order they rank; a tie falls back to
  // the declared band order so the answer is stable run to run.
  const byBand = new Map();
  for (const ts of inWindow) {
    const band = timeBandForHour(new Date(ts).getHours());
    if (band) byBand.set(band, (byBand.get(band) ?? 0) + 1);
  }
  const timeBands = TIME_BAND_ORDER
    .filter((band) => (byBand.get(band) ?? 0) / sessions >= TP_TIME_BAND_SHARE)
    .map((band) => ({ band, count: byBand.get(band) ?? 0, index: TIME_BAND_ORDER.indexOf(band) }))
    .sort((a, b) => (b.count - a.count) || (a.index - b.index))
    .slice(0, TP_MAX_TIME_BANDS)
    .map((row) => row.band);

  // Sessions a week. Weeks with nothing in them count, so a fortnight off
  // shows as a lower band rather than disappearing; the denominator is
  // capped at the window and floored at one week so a brand new account
  // cannot read as six a week from two sessions in three days.
  const elapsedWeeks = Math.max(1, Math.ceil((now - inWindow[0]) / WEEK_MS));
  const perWeek = sessions / Math.min(weeks, elapsedWeeks);

  // Staple lifts. Counted by DISTINCT sessions, not by sets: twenty sets
  // of one movement in a single session is not a staple, it is one day.
  const canonical = toIdSet(canonicalIds);
  const sessionsByExercise = new Map();
  for (const row of Array.isArray(setsRows) ? setsRows : []) {
    const exerciseId = row?.exerciseId ?? row?.exercise_id ?? null;
    if (!exerciseId || !canonical.has(exerciseId)) continue;
    const createdAt = Number(row?.createdAt ?? row?.created_at);
    if (Number.isFinite(createdAt) && (createdAt < since || createdAt > now)) continue;
    const workoutId = row?.workoutId ?? row?.workout_id ?? null;
    if (!workoutId) continue;
    if (!sessionsByExercise.has(exerciseId)) sessionsByExercise.set(exerciseId, new Set());
    sessionsByExercise.get(exerciseId).add(workoutId);
  }
  const staples = [...sessionsByExercise.entries()]
    .map(([id, set]) => ({ id, count: set.size }))
    .sort((a, b) => (b.count - a.count) || (a.id < b.id ? -1 : 1))
    .slice(0, TP_MAX_STAPLE_LIFTS)
    .map((row) => row.id);

  return {
    tp_days: days,
    tp_time_bands: timeBands,
    tp_sessions_band: sessionsBandFor(perWeek),
    tp_staple_lifts: staples,
    tp_experience_band: experienceBand(experience),
    sessions,
  };
}

/** "Mon, Wed and Fri" from `['mon','wed','fri']`. */
export function dayListLabel(days) {
  const labels = (Array.isArray(days) ? days : [])
    .filter((key) => TP_DAYS[key])
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map((key) => TP_DAYS[key]);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** "evenings", or "mornings and evenings" for two. */
export function timeBandsLabel(bands) {
  const labels = (Array.isArray(bands) ? bands : [])
    .filter((key) => TP_TIME_BANDS[key])
    .map((key) => TP_TIME_BANDS[key]);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * The one-line preview shown beside the toggles, so nobody shares a band
 * they have not read first (SD-22).
 *
 * Only the parts actually being shared appear, which is why the caller
 * passes the FILTERED bands: the preview is a promise about what leaves
 * the device, and a preview that showed more than that would be a lie.
 *
 * `ageBand` (spec 1.3) is the raw key ('18_24', etc), never the label:
 * this is the one place that maps it, exactly like every other band
 * here, so a caller never has to know `TP_AGE_BANDS` exists to preview
 * correctly. It is a SEPARATE argument rather than a field on `bands`
 * because `shareablePayload` never puts a value on the wire for it (the
 * server derives the band itself); the caller passes the person's own
 * `tp_age_band` only when their `age_band` toggle is on.
 *
 * @param {object} bands
 * @param {string|null} [ageBand]
 * @returns {string} e.g. "Usually trains Mon, Wed and Fri evenings ·
 *   4 to 5 sessions a week · Intermediate · 35 to 44"
 */
export function previewLine(bands = {}, ageBand = null) {
  const parts = [];
  const days = dayListLabel(bands?.tp_days);
  const times = timeBandsLabel(bands?.tp_time_bands);
  if (days && times) parts.push(`Usually trains ${days} ${times}`);
  else if (days) parts.push(`Usually trains ${days}`);
  else if (times) parts.push(`Usually trains ${times}`);

  const sessions = TP_SESSIONS_BANDS[bands?.tp_sessions_band];
  if (sessions) parts.push(`${sessions} sessions a week`);

  const level = TP_EXPERIENCE_BANDS[bands?.tp_experience_band];
  if (level) parts.push(level);

  const ageLabel = TP_AGE_BANDS[ageBand];
  if (ageLabel) parts.push(ageLabel);

  return parts.join(' · ');
}

// ─── Share settings ──────────────────────────────────────────────────

/** Only the known toggles, only booleans, plus `sessions_audience` (the
 * one string-valued member of this settings object, validated against
 * its own closed set), defaults for the rest. */
function normaliseShare(raw) {
  const out = { ...TP_DEFAULT_SHARE, sessions_audience: DEFAULT_SESSIONS_AUDIENCE };
  if (raw && typeof raw === 'object') {
    for (const key of TP_SHARE_KEYS) {
      if (typeof raw[key] === 'boolean') out[key] = raw[key];
    }
    if (SESSIONS_AUDIENCE_VALUES.includes(raw.sessions_audience)) {
      out.sessions_audience = raw.sessions_audience;
    }
  }
  return out;
}

/**
 * This person's toggles. A missing or unreadable value answers the
 * DEFAULTS, which have the three revealing bands off: an unreadable
 * store must never turn sharing up.
 *
 * @param {string} uid
 * @returns {Promise<object>}
 */
export async function readShareSettings(uid) {
  try {
    const raw = await AsyncStorage.getItem(tpShareKey(uid));
    return normaliseShare(raw ? JSON.parse(raw) : null);
  } catch (_e) {
    return { ...TP_DEFAULT_SHARE };
  }
}

/**
 * @param {string} uid
 * @param {object} settings
 * @returns {Promise<object>} the settings as stored
 */
export async function writeShareSettings(uid, settings) {
  const next = normaliseShare(settings);
  try {
    await AsyncStorage.setItem(tpShareKey(uid), JSON.stringify(next));
  } catch (_e) { /* best effort: the toggles re-derive from the defaults */ }
  return next;
}

// ─── The I/O half ────────────────────────────────────────────────────

/**
 * The active plan's training style, kept internal and never returned.
 * (Community programme-sharing, and the two lookups this key used to try
 * first, were removed entirely --
 * `docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2; the
 * Programme share toggle itself was retired in the communities revamp,
 * 2026-09-10, `docs/communities-revamp-2026-09-10/20-BLUEPRINT.md`
 * section 10.)
 *
 * `loadTrainingProfile` still calls this, and this still reads the
 * active plan, ONLY because `community.privacy.guard.test.js` pins this
 * file's device-read surface to exactly `getCompletedWorkoutStartTimestamps`,
 * `getWorkoutSetsSince`, `getAllExercises` and `getActivePlan` (SD-30):
 * dropping the call would leave `getActivePlan` imported and unused. The
 * value it returns is discarded, never attached to the bands object, and
 * never reaches a screen or the server.
 */
async function programmeKeyFor(userId) {
  let plan = null;
  try {
    plan = await getActivePlan(userId);
  } catch (_e) {
    return null;
  }
  if (!plan?.id) return null;

  const style = styleKeyFromTags(plan.tags ?? null);
  return style ? `style:${style}` : null;
}

/**
 * Read the device and derive. The ONLY four reads are the four named
 * here, and each answers training structure: when sessions started, which
 * exercise ids they contained, which ids are canonical, and which plan is
 * active (SD-30). The active-plan read is kept only to hold that SD-30
 * surface steady; see `programmeKeyFor`.
 *
 * @param {string} userId
 * @param {{nowMs?: number, windowWeeks?: number}} [opts]
 * @returns {Promise<object>} the bands. No `tp_programme_key`: the
 *   Programme share toggle was retired in the communities revamp
 *   (2026-09-10).
 */
export async function loadTrainingProfile(userId, { nowMs = Date.now(), windowWeeks = TP_WINDOW_WEEKS } = {}) {
  const uid = userId ?? currentUserId();
  const since = nowMs - (windowWeeks * WEEK_MS);

  const [startTimestamps, setsRows, exercises] = await Promise.all([
    getCompletedWorkoutStartTimestamps(uid).catch(() => []),
    getWorkoutSetsSince(uid, since).catch(() => []),
    getAllExercises().catch(() => []),
    // Discarded on purpose: kept only so `getActivePlan` stays a real,
    // exercised read (see `programmeKeyFor`'s header).
    programmeKeyFor(uid),
  ]);

  const canonicalIds = new Set(
    (Array.isArray(exercises) ? exercises : [])
      .filter((row) => !(row?.isCustom ?? row?.is_custom))
      .map((row) => row?.id)
      .filter(Boolean),
  );

  let experience = null;
  try {
    // Lazy require: lib modules reach the store this way to avoid an
    // import cycle (CLAUDE.md section 3).
    // eslint-disable-next-line global-require
    experience = require('../../store/useAppStore').default.getState().userProfile?.experience ?? null;
  } catch (_e) {
    experience = null;
  }

  const bands = deriveTrainingProfile({
    startTimestamps, setsRows, experience, nowMs, windowWeeks, canonicalIds,
  });
  return { ...bands };
}

/**
 * Keep only what the toggles allow, and shape it for the RPC.
 *
 * The payload is assembled from `SHARE_KEY_TO_FIELD`, so a band whose
 * toggle is off is not sent at all: `community_update_training_profile`
 * NULLS anything absent, which is what makes switching a toggle off an
 * erasure rather than a stale row left behind.
 *
 * `consistency` is handled separately from the band fields above, and
 * always stamps `share_consistency` (true or false), the same pattern
 * `share_age_band` already uses: unlike a band, whose absence from the
 * payload is enough to have the server null it, a person who turns
 * consistency sharing OFF (or trips the ED gate) while the toggle was
 * on needs the field EXPLICITLY flipped false, or the server would keep
 * serving the counters from before this call.
 *
 * @param {object} bands
 * @param {object} share
 * @param {{consistencyCounters?: (object|null), consistencyGated?: boolean}} [opts]
 *   `consistencyGated` is true when calm mode, an open ED-pattern flag,
 *   or a minor's account means the counters must never be sent even if
 *   the toggle itself is on (`trainingConsistency.js` computes this).
 * @returns {object} the `_p` payload. Phase 3: always carries
 *   `share_sessions` and `sessions_audience` (contract Part B,
 *   `community_upsert_profile`'s new keys); `c_planned_per_week` only
 *   when consistency sharing is allowed (see the field's own comment
 *   below), so a caller who does not share consistency at all never
 *   reveals their plan's shape either. `c_prs_4w` (migrate_172) rides
 *   alongside the other counters, under the same gate.
 */
export function shareablePayload(bands = {}, share = TP_DEFAULT_SHARE, {
  consistencyCounters = null, consistencyGated = false,
} = {}) {
  const settings = normaliseShare(share);
  const payload = {};
  for (const key of Object.keys(SHARE_KEY_TO_FIELD)) {
    if (!settings[key]) continue;
    const field = SHARE_KEY_TO_FIELD[key];
    payload[field] = bands?.[field] ?? null;
  }
  // The age band never crosses as a value: the server derives it from the
  // person's own record when this says it may, and never for a minor.
  payload.share_age_band = !!settings.age_band;

  // Phase 3 (spec section 1): always stamped, the same "the current
  // value travels every time" shape `share_consistency` uses just below.
  // Never folded into the age-gated band loop above: a minor may set
  // `share_sessions` (nothing in it is age-restricted per the contract),
  // only the chosen audience is narrowed downstream of this function.
  payload.share_sessions = !!settings.share_sessions;
  payload.sessions_audience = settings.sessions_audience;

  const shareConsistency = !!settings.consistency && !consistencyGated;
  payload.share_consistency = shareConsistency;
  if (shareConsistency) {
    payload.c_sessions_week = consistencyCounters?.c_sessions_week ?? null;
    payload.c_sessions_month = consistencyCounters?.c_sessions_month ?? null;
    payload.c_weeks_streak = consistencyCounters?.c_weeks_streak ?? null;
    payload.c_planned_pct_4w = consistencyCounters?.c_planned_pct_4w ?? null;
    payload.c_consistent_weeks_12w = consistencyCounters?.c_consistent_weeks_12w ?? null;
    payload.c_trained_days_week = Array.isArray(consistencyCounters?.c_trained_days_week)
      ? consistencyCounters.c_trained_days_week : [];
    payload.c_last_trained_day = consistencyCounters?.c_last_trained_day ?? null;
    // Design 60 §4, D4: the 8-week history behind the profile-strip mini
    // bars, sent under the same share_consistency consent as every other
    // counter above.
    payload.c_weeks_history = Array.isArray(consistencyCounters?.c_weeks_history)
      ? consistencyCounters.c_weeks_history : [];
    payload.c_updated_at = consistencyCounters?.c_updated_at ?? null;
    // Phase 3 ("Together this week", blueprint section 6): the plan's
    // sessions per week, the same figure `trainingConsistency.js` already
    // derives for `c_planned_pct_4w`. Kept behind the SAME
    // share_consistency gate as every counter above rather than
    // `share_sessions`'s own state, because it is a consistency-domain
    // fact (a schedule shape), and the one place it is ever read back
    // (`community_group_get`'s Together sums) already restricts itself to
    // members who share consistency -- sending it under a narrower
    // consent than that would be pointless exposure for no product
    // benefit. Clamped to the contract's 0-14 range; out of range or
    // absent is null, never a refusal.
    // `null`/absent (no plan) is checked FIRST and separately: `Number(null)`
    // is 0, a perfectly finite number, so folding the null check into the
    // isFinite test below would silently turn "no plan" into "a 0-day plan".
    payload.c_planned_per_week = consistencyCounters?.c_planned_per_week == null
      ? null
      : (Number.isFinite(Number(consistencyCounters.c_planned_per_week))
        ? Math.max(0, Math.min(14, Math.trunc(Number(consistencyCounters.c_planned_per_week))))
        : null);
    // migrate_172 (blueprint section 4, CR-05): "N PRs in 4 weeks" on the
    // progress strip. Exactly the same gate as every counter above -- a
    // count only, computed device-side by `getPRCountInWindow`
    // (trainingConsistency.js's `loadConsistency`); nothing about the
    // exercise, weight or reps behind it ever reaches this payload.
    payload.c_prs_4w = consistencyCounters?.c_prs_4w ?? null;
  }
  return payload;
}

/**
 * Recompute and send, at most once a day.
 *
 * Called on hub open. The throttle is per user and lives in AsyncStorage
 * so it survives a restart; `force` is for the Training profile screen,
 * where the person has just changed a toggle and expects it to take.
 *
 * @param {string} userId
 * @param {{force?: boolean, nowMs?: number}} [opts]
 * @returns {Promise<{sent: boolean, reason: (string|null), payload: (object|null)}>}
 *   never throws: this is a background convenience on top of the hub.
 */
export async function syncTrainingProfile(userId, { force = false, nowMs = Date.now() } = {}) {
  const uid = userId ?? currentUserId();
  if (!uid) return { sent: false, reason: 'no_user', payload: null };

  if (!force) {
    try {
      const last = Number(await AsyncStorage.getItem(tpSyncedKey(uid)));
      if (Number.isFinite(last) && last > 0 && nowMs - last < TP_SYNC_INTERVAL_MS) {
        return { sent: false, reason: 'throttled', payload: null };
      }
    } catch (_e) { /* unreadable throttle: send, the server is idempotent */ }
  }

  try {
    const [bands, share] = await Promise.all([
      loadTrainingProfile(uid, { nowMs }),
      readShareSettings(uid),
    ]);
    const payload = shareablePayload(bands, share);
    await callCommunity('community_update_training_profile', { _p: payload });
    try {
      await AsyncStorage.setItem(tpSyncedKey(uid), String(nowMs));
    } catch (_e) { /* best effort: at worst it sends again tomorrow */ }
    return { sent: true, reason: null, payload };
  } catch (e) {
    return { sent: false, reason: e?.code ?? 'unavailable', payload: null };
  }
}

/** Forget the throttle, so the next open recomputes. Used on leaving. */
export async function clearTrainingProfileState(uid) {
  try {
    await AsyncStorage.multiRemove([tpShareKey(uid), tpSyncedKey(uid)]);
  } catch (_e) { /* best effort */ }
}
