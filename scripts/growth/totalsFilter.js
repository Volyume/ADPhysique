/**
 * Weekly growth totals: the allow-list filter (LOC-661; plan LOC-583
 * revision 7, section 8 row 1; figures explained in
 * docs/growth-totals/FIGURES.md).
 *
 * Input: the JSON `public.telemetry_weekly_digest()` returns
 * (supabase/migrate_200_growth_telemetry.sql, Part 6); the JSON of
 * `public.telemetry_new_account_outcomes()` when migrate_204 is applied; and
 * the crash rows read from Sentry (sentryCrashes.js). Output: totals only.
 *
 * This is an allow-list, not a block-list. Nothing is copied across: every
 * output field is built here from one named input field that passes its
 * check. A section, a column or a value this file does not name is never
 * read, so a new digest section or a new view column cannot reach the output
 * until it is added here and the tests change with it. Never read:
 * `safety_activity_groups`, the event catalogue and release notes (free
 * text), and every section not listed in ALLOWED_DIGEST_SECTIONS.
 *
 * Labels (screens, steps, reasons, help topics) are checked against the
 * app's own telemetry schema (src/lib/telemetry/schema.js), because the
 * server stores payload values exactly as the device sent them
 * (record_engine_telemetry checks the event name and size only). A label the
 * app cannot send is counted in "other" and never printed.
 *
 * Small groups: a breakdown row covering fewer than MIN_GROUP people is
 * added into that breakdown's `other`. Week-by-week totals are not
 * breakdowns and are shown as they are.
 *
 * Pure: no I/O and no clock of its own (the digest's generated_at is the
 * clock).
 */
import { SCHEMA_BY_NAME, sanitisePayload } from '../../src/lib/telemetry/schema.js';

export const FORMAT = 'volyume-growth-totals/1';
export const MIN_GROUP = 5;
export const RETENTION_DAYS = Object.freeze([7, 14, 30]);

/** The only digest sections this filter reads. */
export const ALLOWED_DIGEST_SECTIONS = Object.freeze([
  'generated_at', 'weeks', 'core_loops', 'activation_by_path', 'engagement_status_counts',
  'onboarding_funnel', 'lapse_last_screens', 'exit_reasons', 'confusion_topics', 'release_compare',
]);

const DAY_MS = 86400000;
const STATUSES = Object.freeze(['new', 'active', 'slipping', 'lapsed']);
const APP_VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
// A Sentry release as the React Native SDK names it: bundleId@version+build.
const SENTRY_RELEASE_RE = /^[A-Za-z0-9._-]{1,100}@(\d{1,4}\.\d{1,4}\.\d{1,4})(?:\+[0-9A-Za-z.-]{1,40})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Value checks ──────────────────────────────────────────────────────────
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const rowsOf = (v) => (Array.isArray(v) ? v.filter(isObject) : []);
const countOf = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);
const ratioOf = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const pctOf = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null);

function dateOf(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return null;
  const ms = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === v ? v : null;
}

const dayMs = (date) => Date.parse(`${date}T00:00:00Z`);

/**
 * True when `value` is one the app can send in `field` of `event`, by the
 * app's own schema. An event or field the schema does not declare is never
 * valid (sanitisePayload passes an undeclared event through unchecked, so
 * the declaration is checked first).
 */
export function schemaValue(event, field, value) {
  const schema = SCHEMA_BY_NAME[event];
  if (!schema || !schema.fields || !schema.fields[field]) return false;
  const { payload } = sanitisePayload(event, { [field]: value });
  return Object.prototype.hasOwnProperty.call(payload, field) && payload[field] === value;
}

export const appVersionOf = (v) => (v === 'unknown' || (typeof v === 'string' && APP_VERSION_RE.test(v)) ? v : null);

/** The app version inside a Sentry release name, or null. */
export function versionOfRelease(release) {
  if (typeof release !== 'string') return null;
  const m = SENTRY_RELEASE_RE.exec(release);
  return m ? m[1] : null;
}

/**
 * The whole number of people behind a percentage the digest rounded to one
 * decimal (`round(100.0 * avg(flag::int), 1)`), or null when the percentage
 * does not pin it to exactly one value. Postgres rounds numeric halves away
 * from zero, so the check is done in integers.
 */
export function countFromPct(n, pct) {
  if (countOf(n) === null || pctOf(pct) === null) return null;
  if (n === 0) return null;
  const target = Math.round(pct * 10);
  // The counts that round to `target` are the whole numbers in one interval
  // around n * pct / 100. If the nearest whole number is not in it, nothing
  // else is; if two are, the answer is ambiguous. So the neighbours of the
  // nearest whole number settle it.
  const near = Math.round((n * pct) / 100);
  const matches = [];
  for (let k = Math.max(0, near - 2); k <= Math.min(n, near + 2); k += 1) {
    const scaled = 1000 * k;
    const q = Math.floor(scaled / n);
    if (q + (2 * (scaled - q * n) >= n ? 1 : 0) === target) matches.push(k);
  }
  return matches.length === 1 ? matches[0] : null;
}

// ── Folding small groups ──────────────────────────────────────────────────
/**
 * Splits checked rows into the ones shown and one `other`. A row is shown
 * only when its labels passed their checks and it covers at least MIN_GROUP
 * people; every other row's counts are added into `other`. `other` is null
 * when nothing was folded. `people` in `other` is the sum of the folded
 * rows' people, so a person in two folded rows is counted twice there.
 *
 * @param {Array<{labels: object|null, people: number, counts: object}>} rows
 */
export function foldSmallGroups(rows, sumKeys) {
  const shown = [];
  let other = null;
  for (const r of rows) {
    if (r.labels && r.people >= MIN_GROUP) {
      shown.push({ ...r.labels, people: r.people, ...r.counts });
      continue;
    }
    if (!other) {
      other = { people: 0, rows_folded: 0 };
      for (const k of sumKeys) other[k] = 0;
    }
    other.people += r.people;
    other.rows_folded += 1;
    for (const k of sumKeys) other[k] += r.counts[k];
  }
  return { rows: shown, other };
}

// A per-week breakdown: rows grouped by their week, folded within the week.
function weeklyBreakdown(rows, generatedMs, toRow, sumKeys) {
  const byWeek = new Map();
  let notCounted = 0;
  for (const raw of rows) {
    const week = dateOf(raw.week);
    const row = week ? toRow(raw) : null;
    if (!row) { notCounted += 1; continue; }
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(row);
  }
  const weeks = [...byWeek.keys()].sort().map((week) => ({
    week,
    complete: dayMs(week) + 7 * DAY_MS <= generatedMs,
    ...foldSmallGroups(sortRows(byWeek.get(week)), sumKeys),
  }));
  return { weeks, rows_not_counted: notCounted };
}

// Deterministic order: most people first, then labels.
function sortRows(rows) {
  return [...rows].sort((a, b) => (b.people - a.people)
    || JSON.stringify(a.labels).localeCompare(JSON.stringify(b.labels)));
}

function sortShown(list, labelKeys) {
  return [...list].sort((a, b) => (b.people - a.people)
    || labelKeys.map((k) => String(a[k]).localeCompare(String(b[k]))).find((c) => c !== 0) || 0);
}

// ── Sections ──────────────────────────────────────────────────────────────
function activePeopleByWeek(digest, generatedMs) {
  const out = [];
  let notCounted = 0;
  for (const r of rowsOf(digest.core_loops)) {
    const week = dateOf(r.week);
    const people = countOf(r.users_with_events);
    if (!week || people === null) { notCounted += 1; continue; }
    out.push({ week, complete: dayMs(week) + 7 * DAY_MS <= generatedMs, active_people: people });
  }
  out.sort((a, b) => a.week.localeCompare(b.week));
  return { weeks: out, rows_not_counted: notCounted };
}

function signUps(digest, generatedMs) {
  const byWeek = new Map();
  let notCounted = 0;
  for (const r of rowsOf(digest.activation_by_path)) {
    const week = dateOf(r.signup_week);
    const n = countOf(r.users);
    if (!week || n === null) { notCounted += 1; continue; }
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(r);
  }
  const weeks = [...byWeek.keys()].sort().map((week) => {
    const rows = byWeek.get(week);
    const weekEndMs = dayMs(week) + 7 * DAY_MS;
    const sumOf = (fn) => rows.reduce((acc, r) => {
      if (acc === null) return null;
      const v = fn(r);
      return v === null ? null : acc + v;
    }, 0);
    const newAccounts = sumOf((r) => r.users);
    // first_workout_within_7d_pct averages over every row member (no FILTER).
    const firstWorkout = sumOf((r) => (r.users === 0 ? 0 : countFromPct(r.users, r.first_workout_within_7d_pct)));
    const stillUsing = {};
    for (const d of RETENTION_DAYS) {
      // The view averages only people who signed up more than d days ago and
      // does not say how many that is. Once the whole sign-up week is more
      // than d days old, that is everyone in the row, so the count is exact.
      const due = weekEndMs + d * DAY_MS <= generatedMs;
      stillUsing[`day_${d}`] = due
        ? sumOf((r) => (r.users === 0 ? 0 : countFromPct(r.users, r[`active_after_day_${d}_pct`])))
        : null;
    }
    return {
      signup_week: week,
      new_accounts: newAccounts,
      first_workout_within_7_days: firstWorkout,
      first_7_days_over_for_everyone: weekEndMs + 7 * DAY_MS <= generatedMs,
      still_using_app_after: stillUsing,
    };
  });
  return { weeks, rows_not_counted: notCounted };
}

function peopleByStatus(digest) {
  const src = isObject(digest.engagement_status_counts) ? digest.engagement_status_counts : {};
  const rows = [];
  for (const status of STATUSES) {
    const n = countOf(src[status]);
    if (n !== null && n > 0) rows.push({ labels: { status }, people: n, counts: {} });
  }
  // Any other key in the object is a status this filter does not know: its
  // people are counted in "other", its name is never printed.
  for (const [k, v] of Object.entries(src)) {
    const n = countOf(v);
    if (!STATUSES.includes(k) && n !== null && n > 0) rows.push({ labels: null, people: n, counts: {} });
  }
  const folded = foldSmallGroups(sortRows(rows), []);
  return { rows: sortShown(folded.rows, ['status']), other: folded.other };
}

function signUpSteps(digest, generatedMs) {
  return weeklyBreakdown(rowsOf(digest.onboarding_funnel), generatedMs, (r) => {
    const reached = countOf(r.users_reached);
    const completed = countOf(r.users_completed);
    if (reached === null || completed === null) return null;
    const ok = schemaValue('onboarding_step_viewed', 'mode', r.mode)
      && schemaValue('onboarding_path_chosen', 'path', r.path)
      && schemaValue('onboarding_step_viewed', 'step', r.step);
    return {
      labels: ok ? { mode: r.mode, path: r.path, step: r.step } : null,
      people: reached,
      counts: { people_completed: completed },
    };
  }, ['people_completed']);
}

function lastScreenBeforeLeaving(digest) {
  const rows = [];
  let notCounted = 0;
  for (const r of rowsOf(digest.lapse_last_screens)) {
    const left = countOf(r.lapsed_users);
    if (left === null) { notCounted += 1; continue; }
    if (left === 0) continue; // a screen only people who stayed last saw
    const ok = schemaValue('screen_viewed', 'screen', r.last_screen);
    rows.push({ labels: ok ? { screen: r.last_screen } : null, people: left, counts: {} });
  }
  const folded = foldSmallGroups(sortRows(rows), []);
  return { rows: folded.rows, other: folded.other, rows_not_counted: notCounted };
}

function leavingReasons(digest, generatedMs) {
  return weeklyBreakdown(rowsOf(digest.exit_reasons), generatedMs, (r) => {
    const people = countOf(r.users);
    const answers = countOf(r.answers);
    if (people === null || answers === null) return null;
    const ok = schemaValue('exit_reason_given', 'moment', r.moment)
      && schemaValue('exit_reason_given', 'reason', r.reason);
    return { labels: ok ? { moment: r.moment, reason: r.reason } : null, people, counts: { answers } };
  }, ['answers']);
}

function helpTopics(digest, generatedMs) {
  return weeklyBreakdown(rowsOf(digest.confusion_topics), generatedMs, (r) => {
    const people = countOf(r.users);
    const opens = countOf(r.opens);
    if (people === null || opens === null) return null;
    // A tooltip opened where no screen was known carries no screen.
    const screenOk = r.screen === null || r.screen === undefined || schemaValue('help_opened', 'screen', r.screen);
    const ok = schemaValue('help_opened', 'topic', r.topic) && screenOk;
    return { labels: ok ? { topic: r.topic, screen: r.screen ?? null } : null, people, counts: { opens } };
  }, ['opens']);
}

function byAppVersion(digest) {
  const rows = [];
  let notCounted = 0;
  for (const r of rowsOf(digest.release_compare)) {
    const people = countOf(r.users);
    const visits = countOf(r.visits);
    if (people === null || visits === null) { notCounted += 1; continue; }
    const version = appVersionOf(r.app_version);
    rows.push({
      labels: version ? {
        app_version: version,
        first_seen: dateOf(r.first_seen),
        workouts_per_person: ratioOf(r.workouts_per_user),
        workout_discard_pct: pctOf(r.workout_discard_pct),
        errors_per_visit: ratioOf(r.errors_per_visit),
      } : null,
      people,
      counts: { visits },
    });
  }
  const folded = foldSmallGroups(sortRows(rows), ['visits']);
  return { rows: sortShown(folded.rows, ['app_version']), other: folded.other, rows_not_counted: notCounted };
}

const OUTCOME_COUNTS = Object.freeze([
  'new_accounts', 'first_workout_14d', 'window_14d_closed', 'three_workouts_14d',
  'eligible_day_7', 'trained_after_day_7', 'eligible_day_14', 'trained_after_day_14',
  'eligible_day_30', 'trained_after_day_30',
]);

function shapeOutcome(c) {
  const after = {};
  for (const d of RETENTION_DAYS) after[`day_${d}`] = { judged: c[`eligible_day_${d}`], still_training: c[`trained_after_day_${d}`] };
  return {
    new_accounts: c.new_accounts,
    first_workout_in_14_days: c.first_workout_14d,
    judged_14_days: c.window_14d_closed,
    three_workouts_in_14_days: c.three_workouts_14d,
    still_training_after: after,
  };
}

function newAccountOutcomes(outcomes, status) {
  if (status !== 'ok') return { status };
  const byWeek = new Map();
  const byVersion = new Map();
  let notCounted = 0;
  const zero = () => Object.fromEntries(OUTCOME_COUNTS.map((k) => [k, 0]));
  for (const r of rowsOf(outcomes && outcomes.new_account_outcomes)) {
    const week = dateOf(r.signup_week);
    const counts = Object.fromEntries(OUTCOME_COUNTS.map((k) => [k, countOf(r[k])]));
    if (!week || Object.values(counts).some((v) => v === null)) { notCounted += 1; continue; }
    // Unchecked version labels are added together under one key that is
    // never printed (the null key folds into "other" below).
    const version = appVersionOf(r.app_version);
    for (const [map, key] of [[byWeek, week], [byVersion, version]]) {
      if (!map.has(key)) map.set(key, zero());
      const acc = map.get(key);
      for (const k of OUTCOME_COUNTS) acc[k] += counts[k];
    }
  }
  const weeks = [...byWeek.keys()].sort().map((week) => ({ signup_week: week, ...shapeOutcome(byWeek.get(week)) }));
  const total = zero();
  for (const c of byWeek.values()) for (const k of OUTCOME_COUNTS) total[k] += c[k];
  const versionRows = [...byVersion.entries()].map(([version, c]) => ({
    labels: version ? { app_version: version } : null,
    people: c.new_accounts,
    counts: Object.fromEntries(OUTCOME_COUNTS.filter((k) => k !== 'new_accounts').map((k) => [k, c[k]])),
  }));
  const folded = foldSmallGroups(sortRows(versionRows), OUTCOME_COUNTS.filter((k) => k !== 'new_accounts'));
  const reshape = (row) => {
    const { people, rows_folded: rowsFolded, app_version: appVersion, ...rest } = row;
    const shaped = shapeOutcome({ ...rest, new_accounts: people });
    return {
      ...(appVersion !== undefined ? { app_version: appVersion } : {}),
      ...(rowsFolded !== undefined ? { rows_folded: rowsFolded } : {}),
      ...shaped,
    };
  };
  return {
    status: 'ok',
    the_one_measure: {
      judged_14_days: total.window_14d_closed,
      three_workouts_in_14_days: total.three_workouts_14d,
    },
    weeks,
    by_app_version_at_sign_up: {
      rows: sortShown(folded.rows, ['app_version']).map(reshape),
      other: folded.other ? reshape(folded.other) : null,
    },
    rows_not_counted: notCounted,
  };
}

function crashCounts(crashes) {
  const status = crashes && typeof crashes.status === 'string' ? crashes.status : 'not_configured';
  if (status !== 'ok') {
    const out = { status: ['not_configured', 'failed'].includes(status) ? status : 'failed' };
    if (Number.isSafeInteger(crashes && crashes.http_status)) out.http_status = crashes.http_status;
    return out;
  }
  const byVersion = new Map();
  let notCounted = 0;
  for (const r of rowsOf(crashes.rows)) {
    const events = countOf(r.crashes);
    const people = countOf(r.people);
    if (events === null || people === null) { notCounted += 1; continue; }
    const version = versionOfRelease(r.release);
    if (!byVersion.has(version)) byVersion.set(version, { crashes: 0, people: 0 });
    const acc = byVersion.get(version);
    acc.crashes += events;
    acc.people += people;
  }
  const rows = [...byVersion.entries()].map(([version, c]) => ({
    labels: version ? { app_version: version } : null,
    people: c.people,
    counts: { crashes: c.crashes },
  }));
  const folded = foldSmallGroups(sortRows(rows), ['crashes']);
  const total = isObject(crashes.total) ? crashes.total : {};
  return {
    status: 'ok',
    period_days: countOf(crashes.period_days),
    total: { crashes: countOf(total.crashes), people: countOf(total.people) },
    by_app_version: { rows: sortShown(folded.rows, ['app_version']), other: folded.other },
    rows_not_counted: notCounted,
  };
}

// ── The whole output ──────────────────────────────────────────────────────
/**
 * @param {{ digest: object, outcomes?: object|null, outcomesStatus?: string, crashes?: object|null }} input
 * @returns {object} the totals file; throws when the digest is not usable
 */
export function filterGrowthTotals(input) {
  const { outcomes = null, outcomesStatus = 'not_applied', crashes = null } = input || {};
  if (!isObject(input && input.digest)) throw new Error('digest is not an object');
  // Only the named sections are copied out of the digest before anything
  // else reads it; every other section is gone from here on.
  const digest = Object.fromEntries(ALLOWED_DIGEST_SECTIONS
    .filter((k) => Object.prototype.hasOwnProperty.call(input.digest, k))
    .map((k) => [k, input.digest[k]]));
  const generatedMs = Date.parse(digest.generated_at);
  if (typeof digest.generated_at !== 'string' || !Number.isFinite(generatedMs)) throw new Error('digest has no usable generated_at');
  return {
    format: FORMAT,
    generated_at: new Date(generatedMs).toISOString(),
    window_weeks: countOf(digest.weeks),
    minimum_group: MIN_GROUP,
    active_people_by_week: activePeopleByWeek(digest, generatedMs),
    sign_ups_by_week: signUps(digest, generatedMs),
    people_by_status_today: peopleByStatus(digest),
    sign_up_steps_by_week: signUpSteps(digest, generatedMs),
    last_screen_before_leaving: lastScreenBeforeLeaving(digest),
    leaving_reasons_by_week: leavingReasons(digest, generatedMs),
    help_topics_by_week: helpTopics(digest, generatedMs),
    by_app_version: byAppVersion(digest),
    new_account_outcomes: newAccountOutcomes(outcomes, ['ok', 'not_applied', 'failed'].includes(outcomesStatus) ? outcomesStatus : 'failed'),
    crashes: crashCounts(crashes),
  };
}
