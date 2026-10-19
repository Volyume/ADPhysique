/**
 * Telemetry schema: the growth and performance event catalogue (founder
 * brief 2026-10-19, "a unified telemetry and continuous improvement layer").
 *
 * Every event added from this brief on is declared here with its area, the
 * kind of signal it is, whether it may be sent before Article 9 consent,
 * a plain-English description, and the exact fields its payload may carry.
 * The transport keeps only declared fields whose values pass their type, so
 * a payload can never carry a name, a weight, food text, a free-text note or
 * an identifier: values are enums, booleans, small integers, buckets or
 * route names. The server catalogue (migrate_200) carries the same names and
 * descriptions, so a dashboard and an AI read the same meanings.
 *
 * Founder decisions 2026-10-19: safety analytics are group totals only
 * (no event carries calm mode or an ED flag); events batch to the server;
 * the server keeps six months; nothing health-related leaves the device
 * before Article 9 consent, but failure and performance events do, so a
 * fault before consent is still seen (`preConsent: true`).
 *
 * Pure.
 */

// ── Buckets: numbers become ranges before they leave the device ─────────
const bucket = (edges, labels) => (n) => {
  // Only a number (or a numeric string) has a bucket: a missing value must
  // never be reported as the lowest range (Number(null) and Number('') are 0).
  if (typeof n !== 'number' && !(typeof n === 'string' && n.trim() !== '')) return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return null;
  for (let i = 0; i < edges.length; i += 1) if (v < edges[i]) return labels[i];
  return labels[labels.length - 1];
};

export const BUCKETS = Object.freeze({
  ms: Object.freeze({
    of: bucket([250, 500, 1000, 2000, 5000, 10000], ['<250ms', '250-500ms', '500ms-1s', '1-2s', '2-5s', '5-10s', '10s+']),
    values: Object.freeze(['<250ms', '250-500ms', '500ms-1s', '1-2s', '2-5s', '5-10s', '10s+']),
  }),
  minutes: Object.freeze({
    of: bucket([1, 5, 15, 30, 60, 90], ['<1m', '1-5m', '5-15m', '15-30m', '30-60m', '60-90m', '90m+']),
    values: Object.freeze(['<1m', '1-5m', '5-15m', '15-30m', '30-60m', '60-90m', '90m+']),
  }),
  count: Object.freeze({
    of: bucket([1, 2, 4, 7, 11], ['0', '1', '2-3', '4-6', '7-10', '11+']),
    values: Object.freeze(['0', '1', '2-3', '4-6', '7-10', '11+']),
  }),
  dwell: Object.freeze({
    // milliseconds on a screen
    of: bucket([3000, 30000, 120000, 600000], ['<3s', '3-30s', '30s-2m', '2-10m', '10m+']),
    values: Object.freeze(['<3s', '3-30s', '30s-2m', '2-10m', '10m+']),
  }),
  age: Object.freeze({
    // hours since something was left
    of: bucket([1, 6, 24, 72], ['<1h', '1-6h', '6-24h', '1-3d', '3d+']),
    values: Object.freeze(['<1h', '1-6h', '6-24h', '1-3d', '3d+']),
  }),
});

/** A number as its bucket label, or null for anything that is not a number. */
export const toBucket = (kind, n) => (BUCKETS[kind] ? BUCKETS[kind].of(n) : null);

// ── Field types ──────────────────────────────────────────────────────────
const enumOf = (...values) => Object.freeze({ type: 'enum', values: Object.freeze(values) });
const bucketOf = (kind) => Object.freeze({ type: 'bucket', kind });
const int = (min, max) => Object.freeze({ type: 'int', min, max });
const BOOL = Object.freeze({ type: 'bool' });
// A navigation route name (PascalCase identifier); cannot carry a person's data.
const ROUTE = Object.freeze({ type: 'route' });
// A short code (lower snake/dot case): a glossary key or an experiment name.
const CODE = Object.freeze({ type: 'code' });

const SETUP_SURFACES = ['nutrition', 'meal_plan', 'targets', 'checkin', 'coach_output', 'coach_home', 'home', 'goal_setup', 'challenge', 'unknown'];
const CHALLENGE_SOURCES = ['link', 'gym_invite', 'code'];
const CHALLENGE_STATUSES = ['upcoming', 'active', 'ended', 'closed'];
const ARCHETYPES = ['balanced', 'v_taper', 'x_frame', 'upper_density', 'powerbuilder', 'minimalist'];
const SHARE_SURFACES = ['workout', 'week', 'pr', 'clip', 'progress', 'other'];
const AUDIENCES = ['followers', 'public', 'gym', 'external', 'none'];
const COACH_KINDS = ['calories', 'training', 'deload', 'diet_break', 'other'];

const ev = (name, area, signal, description, fields = {}, { preConsent = false } = {}) => Object.freeze({
  name, area, signal, description, preConsent, fields: Object.freeze(fields),
});

/**
 * The catalogue. `signal` is one of progression, friction, retention,
 * performance, confusion, exposure. `area` groups a dashboard's filters.
 */
export const EVENT_SCHEMAS = Object.freeze([
  // ── App and session: the path through the app ─────────────────────────
  ev('screen_viewed', 'app', 'progression', 'A screen opened, with the screen before it and how long the person stayed there.',
    { screen: ROUTE, from_screen: ROUTE, prev_dwell: bucketOf('dwell') }, { preConsent: true }),
  ev('session_ended', 'app', 'retention', 'The app went to the background: how long the visit lasted, how many screens, how many errors were shown, and what was achieved.',
    { duration: bucketOf('minutes'), screens: bucketOf('count'), errors: bucketOf('count'), did_workout: BOOL, did_food: BOOL, did_checkin: BOOL }, { preConsent: true }),
  ev('screen_ready', 'performance', 'performance', 'How long a key screen took to show its content.',
    { screen: ROUTE, ms: bucketOf('ms') }, { preConsent: true }),
  ev('error_shown', 'app', 'friction', 'The person saw a failure: an error message, an alert or an error screen.',
    { screen: ROUTE, kind: enumOf('toast', 'alert', 'error_view') }, { preConsent: true }),
  ev('setup_stage_stalled', 'performance', 'performance', 'A setup or start-up stage took far longer than it should (report only).',
    { stage: enumOf('fit', 'fit_full', 'reminder_prefs', 'build', 'notification_permission', 'reminder_lay', 'boot_splash', 'boot_first_run', 'boot_tier', 'boot_auth', 'boot_consent', 'other') }, { preConsent: true }),

  // ── Onboarding and coaching setup ─────────────────────────────────────
  ev('onboarding_path_chosen', 'onboarding', 'progression', 'After consent, the person chose full coaching setup or a quick start (and, for a quick start, a ready-made plan or their own).',
    { path: enumOf('coaching', 'quick_start'), plan_source: enumOf('library', 'builder', 'none') }),
  ev('onboarding_step_viewed', 'onboarding', 'progression', 'A setup step was shown.',
    { step: int(1, 8), mode: enumOf('full', 'coaching_setup') }),
  ev('onboarding_validation_blocked', 'onboarding', 'friction', 'Continue was tapped with a required answer missing.',
    { step: int(1, 8), field: enumOf('sex', 'age', 'height', 'weight', 'phase', 'archetype', 'experience', 'session_length', 'days', 'equipment', 'plan_choice', 'other'), mode: enumOf('full', 'coaching_setup') }),
  ev('onboarding_completed', 'onboarding', 'progression', 'Setup finished.',
    { path: enumOf('coaching', 'quick_start'), mode: enumOf('full', 'coaching_setup'), duration: bucketOf('minutes') }),
  ev('coaching_setup_card_shown', 'onboarding', 'retention', 'A "Set up coaching" card was shown to a quick-start person (once a day per surface).',
    { surface: enumOf(...SETUP_SURFACES) }),
  ev('coaching_setup_started', 'onboarding', 'progression', 'A quick-start person opened coaching setup.',
    { entry: enumOf(...SETUP_SURFACES) }),
  ev('coaching_setup_finished', 'onboarding', 'progression', 'Coaching setup finished: kept the plan or rebuilt it, and how a rebuild ended.',
    { plan_choice: enumOf('keep', 'rebuild'), rebuild_outcome: enumOf('built', 'declined', 'failed', 'none') }),
  ev('archetype_chosen', 'plan', 'progression', 'A training style was chosen.',
    { archetype: enumOf(...ARCHETYPES), surface: enumOf('onboarding', 'plan_update', 'goal_setup') }),

  // ── Workouts ─────────────────────────────────────────────────────────
  ev('workout_discarded', 'workout', 'friction', 'A started workout was thrown away.',
    { sets: bucketOf('count'), duration: bucketOf('minutes') }),
  ev('workout_abandoned', 'workout', 'friction', 'A workout was left open and found unfinished at a later launch.',
    { age: bucketOf('age'), sets: bucketOf('count') }),
  ev('exercise_swapped', 'workout', 'friction', 'An exercise was swapped during a workout.',
    { scope: enumOf('session', 'programme'), cause: enumOf('constraint', 'style', 'choice') }),
  ev('workout_session_summary', 'workout', 'progression', 'A finished workout, as counts of what happened in it.',
    { edits: bucketOf('count'), swaps: bucketOf('count'), rest_timer_uses: bucketOf('count'), warmups_added: bucketOf('count'), discarded_sets: bucketOf('count') }),

  // ── Food ─────────────────────────────────────────────────────────────
  ev('food_search_empty', 'food', 'friction', 'A food search found nothing.',
    { query_length: bucketOf('count') }),
  ev('food_scan_result', 'food', 'progression', 'A barcode or label scan ended.',
    { method: enumOf('barcode', 'label'), outcome: enumOf('found', 'not_found', 'cancelled', 'saved_custom', 'error') }),
  ev('planned_meal_confirmed', 'food', 'progression', 'Planned food was confirmed as eaten.',
    { scope: enumOf('meal', 'day'), items: bucketOf('count') }),
  ev('diary_entries_moved', 'food', 'progression', 'Diary entries were copied or moved.',
    { action: enumOf('copy', 'move'), items: bucketOf('count') }),
  ev('food_plate_logged', 'food', 'progression', 'Several foods were logged in one go from search.',
    { items: bucketOf('count') }),

  // ── Plans ────────────────────────────────────────────────────────────
  ev('plan_generation_finished', 'plan', 'progression', 'A plan build finished: built, refused by the rules, or failed, and how long it took.',
    { outcome: enumOf('ok', 'refused', 'failed'), ms: bucketOf('ms'), trigger: enumOf('onboarding', 'coaching_setup', 'rebuild', 'start_with_plan', 'other') }),

  // ── Gym challenge (docs/gym-challenge-2026-10-19/SPEC.md section 7) ──
  ev('challenge_join_viewed', 'challenge', 'exposure', 'The gym challenge join screen showed a challenge.',
    { source: enumOf(...CHALLENGE_SOURCES), status: enumOf(...CHALLENGE_STATUSES) }),
  ev('challenge_joined', 'challenge', 'progression', 'A person joined a gym challenge.',
    { source: enumOf(...CHALLENGE_SOURCES), coaching: BOOL }),
  ev('challenge_viewed', 'challenge', 'retention', 'An entrant opened their gym challenge.',
    { status: enumOf(...CHALLENGE_STATUSES), tier: enumOf('main', 'second', 'none') }),
  ev('challenge_withdrawn', 'challenge', 'retention', 'An entrant left a gym challenge.'),

  // ── Check-in and coach ───────────────────────────────────────────────
  ev('checkin_completed', 'coach', 'progression', 'A weekly check-in was submitted.',
    { first: BOOL, duration: bucketOf('minutes') }),
  ev('checkin_abandoned', 'coach', 'friction', 'A weekly check-in was left before submitting.',
    { step_reached: int(0, 12) }),
  ev('coach_recommendation_held', 'coach', 'progression', 'A coach recommendation was held (kept as it was).',
    { kind: enumOf(...COACH_KINDS) }),
  ev('coach_recommendation_dismissed', 'coach', 'progression', 'A coach recommendation of any kind was declined.',
    { kind: enumOf(...COACH_KINDS) }),

  // ── Community ────────────────────────────────────────────────────────
  ev('share_attempted', 'community', 'retention', 'The person started sharing something.',
    { surface: enumOf(...SHARE_SURFACES), audience: enumOf(...AUDIENCES) }),
  ev('share_completed', 'community', 'retention', 'A share went out.',
    { surface: enumOf(...SHARE_SURFACES), audience: enumOf(...AUDIENCES) }),

  // ── Confusion, exposure, experiments, reasons, pulling away ─────────
  ev('help_opened', 'app', 'confusion', 'An explanation (info tooltip or help) was opened.',
    { topic: CODE, screen: ROUTE }),
  ev('feature_seen', 'app', 'exposure', 'A new feature was seen for the first time.',
    { feature: enumOf('start_choice', 'archetype_cards', 'warmup_chip', 'shopping_list_days', 'raw_cooked_toggle', 'coaching_setup_card', 'declined_today_card') }),
  ev('experiment_exposed', 'app', 'exposure', 'The person was placed in one arm of an A/B test (once per test).',
    { experiment: CODE, variant: enumOf('a', 'b', 'c', 'd') }),
  ev('exit_reason_given', 'app', 'retention', 'An optional one-tap reason at a moment of leaving.',
    { moment: enumOf('workout_discard', 'setup_leave', 'reminders_off'), reason: enumOf('no_time', 'felt_off', 'app_problem', 'just_browsing', 'too_many_questions', 'not_ready', 'too_many_reminders', 'not_useful', 'other') }),
  ev('reminders_turned_off', 'app', 'retention', 'A reminder category was switched off.',
    { category: enumOf('checkin', 'weigh_in', 'training', 'meals', 'community', 'all', 'other') }),
  ev('notification_permission_result', 'app', 'retention', 'The answer to the system notification prompt.',
    { outcome: enumOf('granted', 'denied', 'blocked') }),
]);

export const SCHEMA_BY_NAME = Object.freeze(Object.fromEntries(EVENT_SCHEMAS.map((e) => [e.name, e])));
export const SIGNALS = Object.freeze(['progression', 'friction', 'retention', 'performance', 'confusion', 'exposure']);

// Events from before this catalogue that may also be sent before Article 9
// consent: the account and consent moments themselves and app lifecycle.
// They carry no health data. Everything else waits for consent.
export const LEGACY_PRE_CONSENT = Object.freeze(new Set([
  'sign_in', 'sign_out', 'account_created', 'article9_consent_recorded', 'article9_consent_withdrawn',
  'app_cold_start', 'app_foregrounded', 'app_backgrounded',
]));

/** True when the event may leave the device before Article 9 consent. */
export function allowedBeforeConsent(event) {
  const s = SCHEMA_BY_NAME[event];
  return s ? s.preConsent === true : LEGACY_PRE_CONSENT.has(event);
}

const ROUTE_RE = /^[A-Z][A-Za-z0-9]{1,40}$/;
const CODE_RE = /^[a-z][a-z0-9_.]{1,40}$/;

function validValue(spec, v) {
  switch (spec.type) {
    case 'enum': return spec.values.includes(v);
    case 'bucket': return BUCKETS[spec.kind].values.includes(v);
    case 'int': return Number.isInteger(v) && v >= spec.min && v <= spec.max;
    case 'bool': return v === true || v === false;
    case 'route': return typeof v === 'string' && ROUTE_RE.test(v);
    case 'code': return typeof v === 'string' && CODE_RE.test(v);
    default: return false;
  }
}

/**
 * A declared event's payload with only its declared, valid fields. Unknown
 * fields and invalid values are dropped and listed in `dropped`, so the
 * transport can say so in development. An event without a schema (one from
 * before this catalogue) is returned as it came.
 */
export function sanitisePayload(event, payload) {
  const schema = SCHEMA_BY_NAME[event];
  if (!schema) return { payload, dropped: [] };
  const out = {};
  const dropped = [];
  for (const [k, v] of Object.entries(payload || {})) {
    const spec = schema.fields[k];
    if (spec && validValue(spec, v)) out[k] = v;
    else dropped.push(k);
  }
  return { payload: out, dropped };
}

/** True for the signals that also go to the on-device debug log in development. */
export const isDebugLoggedSignal = (event) => {
  const s = SCHEMA_BY_NAME[event];
  return !!s && ['friction', 'performance', 'confusion'].includes(s.signal);
};
