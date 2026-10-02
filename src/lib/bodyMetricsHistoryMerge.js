// BUG-WEIGHT-HISTORY (2026-07-11): pure helper, deliberately dependency-free
// (no React/React Native imports) so it's unit-testable without mounting
// BodyMetricsScreen (which pulls in react-native-svg via VolyumeChart).
//
// Root cause this fixes: Home's quick weigh-in widget
// (HomeScreen.handleLogWeight -> logMorningWeight) writes dated rows into
// morning_weights, a separate table from the body_metric_log rows
// BodyMetricsScreen's own "Log weight" form writes via logBodyMetric.
// getLatestBodyWeight (used for the CURRENT weight shown elsewhere, e.g.
// HomeScreen's stat tile) already reads both tables and picks the newest, so
// a Home quick-log correctly moves the CURRENT weight shown around the app.
// BodyMetricsScreen's History, though, only ever queried body_metric_log, so
// every weigh-in logged from Home was invisible there -- History looked
// frozen on whichever single body_metric_log row existed (often just the
// onboarding auto-seed), even as "current weight" kept updating underneath
// it from morning_weights.
import {
  localDayKey, localWeekStartMs, localWeekEndMs, civilDayDifference,
} from './dayKey';

// Shaped like BodyMetricsScreen's rowToEntry so it drops into the same
// history/trend/EWMA pipeline; measurement fields are always null since
// morning_weights only ever carries a weight + notes.
//
// D214 addendum 4 (lane 7): the entry also carries its own `loggedAt`, the
// ids of the rows it stands for (`logIds` in body_metric_log, `morningIds` in
// morning_weights) so a delete can retract the whole day, and the body-fat
// method (null here: a quick weigh-in holds no body fat).
export function morningWeightToEntry(row) {
  return {
    id: row.id,
    metric_date: localDayKey(new Date(row.loggedAt ?? row.createdAt ?? Date.now()).getTime()),
    loggedAt: Number(row.loggedAt ?? row.createdAt ?? Date.now()),
    body_weight: row.weightKg ?? null,
    body_fat: null,
    body_fat_source: null,
    chest: null, shoulders: null, arms: null, forearms: null,
    waist: null, hips: null, quads: null, hamstrings: null, calves: null,
    notes: row.notes ?? '',
    source: 'morning_weight',
    logIds: [],
    morningIds: [row.id],
  };
}

// The entry shape of one body_metric_log row (camelCase, as
// database.getBodyMetricLog returns it). It moved here from the screen's
// rowToEntry so the shape is pure and testable; `source` tags the writable
// table so an edit or a delete reaches the right one.
export function logRowToEntry(row) {
  const at = Number(row.loggedAt ?? row.createdAt ?? Date.now());
  return {
    id: row.id,
    // TZ-1: local calendar day, matching morning-weight buckets.
    metric_date: localDayKey(new Date(at).getTime()),
    loggedAt: at,
    body_weight: row.weightKg ?? null,
    body_fat: row.bodyFatPercent ?? null,
    body_fat_source: row.bodyFatSource ?? null,
    chest: row.chestCm ?? null,
    shoulders: row.shouldersCm ?? null,
    arms: row.armCm ?? null,
    forearms: row.forearmCm ?? null,
    waist: row.waistCm ?? null,
    hips: row.hipsCm ?? null,
    quads: row.thighCm ?? null,
    hamstrings: row.hamCm ?? null,
    calves: row.calfCm ?? null,
    notes: row.notes ?? '',
    source: 'body_metric_log',
    logIds: [row.id],
    morningIds: [],
  };
}

// bodyMetricEntries is already rowToEntry-shaped (most-recent-first, from
// getBodyMetricLog); morningRows is raw getMorningWeights() output
// (camelCase, may include soft-deleted or non-positive rows that a genuine
// weigh-in never produces). A calendar day that already has a
// body_metric_log entry is left exactly as-is, no field-merging, so one save
// never becomes two rows and edit/delete keep targeting the richer,
// user-editable record for that day (body_metric_log, via
// updateBodyMetric/deleteBodyMetric -- a merged-in morning_weights row has
// no body_metric_log id for those to target).
/**
 * The canonical weigh-in series, in the `{ weightKg, loggedAt }` shape the
 * coaching engine consumes.
 *
 * NOT THE SAFETY PATH. Do not wire this into the rapid-loss reader.
 *
 * It was written for finding X3 (cross-surface audit 2026-07-30), when a
 * weigh-in logged through BodyMetricsScreen's own form was invisible to the
 * ED-safety gates. Merging the two tables into the gate's input was tried,
 * and REVERTED (dd67bbf4) for crossing an ED-safety inviolable.
 *
 * That finding was then closed a different way, and the canonical law is:
 *
 *   RAPID-LOSS SAFETY READS THE CANONICAL `morning_weights` SERIES.
 *   A DELIBERATE POSITIVE WEIGHT ENTERED THROUGH BODY METRICS IS WRITTEN
 *   THROUGH INTO THAT CANONICAL SERIES AT ENTRY TIME.
 *
 * The write-through is the D90 founder ruling of 2026-08-06 (c569e00c),
 * live in `src/lib/database/bodyMetrics.js` and injected at
 * `database.js:104`. So the gate already sees every legitimate Body
 * Metrics weigh-in, WITHOUT `body_metric_log` becoming a second evidence
 * source. Measurements-only entries are bypassed; non-positive, invalid
 * and deleted entries stay excluded by the existing readers.
 *
 * Reading both tables HERE would therefore double-count nothing today but
 * would re-create the dual-source shape the revert and the source guard
 * (`CoachOutputScreen.morningWeightsSource.guard.test.js`) exist to
 * prevent. This function survives for non-safety history/trend use only.
 *
 * Open, deliberately NOT actioned (recorded 2026-08-12): a Body Metrics
 * weight entry does not by itself prove morning/fasted measurement
 * conditions. That is a measurement-provenance and UX question for its
 * own targeted decision, not something to resolve here.
 *
 * Dedupe is by calendar day, inherited from mergeMorningWeightsIntoHistory, so
 * a day recorded in both tables contributes once. Non-positive and
 * soft-deleted rows are dropped, matching computeEWMA's own guard.
 *
 * @param {Array} bodyMetricEntries - rowToEntry-shaped, from getBodyMetricLog
 * @param {Array} morningRows       - raw getMorningWeights() output
 * @returns {Array} [{ weightKg, loggedAt }] oldest-first
 */
export function buildWeighInSeries(bodyMetricEntries, morningRows) {
  const merged = mergeMorningWeightsIntoHistory(bodyMetricEntries, morningRows, Number.MAX_SAFE_INTEGER);
  return merged
    .map((e) => {
      const weightKg = Number(e.body_weight);
      if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
      // metric_date is a local day key; anchor at local midday so a timezone
      // shift can never move a reading across a day boundary.
      const [y, m, d] = String(e.metric_date || '').split('-').map(Number);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      const loggedAt = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
      if (!Number.isFinite(loggedAt)) return null;
      return { weightKg, loggedAt };
    })
    .filter(Boolean)
    .sort((a, b) => a.loggedAt - b.loggedAt);
}

export function mergeMorningWeightsIntoHistory(bodyMetricEntries, morningRows, limit = 50) {
  const daysWithBodyMetric = new Set(bodyMetricEntries.map(e => e.metric_date));
  const morningOnlyEntries = (morningRows || [])
    .filter(r => r && r.deletedAt == null && Number.isFinite(r.weightKg) && r.weightKg > 0)
    .map(morningWeightToEntry)
    .filter(e => !daysWithBodyMetric.has(e.metric_date));
  return [...bodyMetricEntries, ...morningOnlyEntries]
    .sort((a, b) => b.metric_date.localeCompare(a.metric_date))
    .slice(0, limit);
}

// ─── D214 addendum 4 (Body metrics, lane 7): one entry per day, weeks, readings ──
//
// Spec docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 items 2, 7 and 8. A day holds
// ONE weigh-in: the entries below are one per local day, and every weekly
// figure on the screen (the This week card, the History groups) is worked out
// by the same helpers over those entries.

/** Eight weeks a page: the History opens on the current week and the seven before it. */
export const HISTORY_PAGE_WEEKS = 8;
/** The longest chart window (the "1 year" chip), plus one day so the whole window is in the read. */
export const CHART_RANGE_DAYS = 366;
/** The note Pro enrolment writes on the starting-weight row (checkinDerive.ENROLMENT_WEIGHT_NOTE). */
export const ENROLMENT_NOTE = 'enrolment';

/** The fields a full entry can carry beyond the weight (body fat and the nine sites). */
export const READING_FIELDS = Object.freeze([
  'body_fat', 'chest', 'shoulders', 'arms', 'forearms', 'waist', 'hips', 'quads', 'hamstrings', 'calves',
]);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Local noon of a 'YYYY-MM-DD' day key: a timestamp no time-zone shift can move across a day. */
export function noonOfDay(dayKey) {
  const [y, m, d] = String(dayKey || '').split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

/**
 * One entry per local day from the two tables. A day with several rows (a
 * second save the same day, a Home weigh-in beside a form entry) reads as the
 * newest row, completed from the day's older rows for any field it lacks; the
 * weight is the day's `morning_weights` weight when there is one (that is the
 * series the trend and the coach read, and the write-through keeps it equal
 * to the latest form weight) and the log row's otherwise. The ids of every
 * row the day stands for ride on the entry, so a delete retracts all of them.
 *
 * @param {Array} logEntries   logRowToEntry-shaped rows (live, any order)
 * @param {Array} morningRows  raw getMorningWeights() rows (soft-deleted and
 *                             non-positive rows are ignored)
 * @returns {Array} entries, newest day first
 */
export function buildDayEntries(logEntries, morningRows) {
  const byDay = new Map();
  const slot = (day) => {
    if (!byDay.has(day)) byDay.set(day, { logs: [], mornings: [] });
    return byDay.get(day);
  };
  for (const e of logEntries || []) {
    if (e && e.metric_date) slot(e.metric_date).logs.push(e);
  }
  for (const r of morningRows || []) {
    if (!r || r.deletedAt != null || !(Number(r.weightKg) > 0)) continue;
    const m = morningWeightToEntry(r);
    slot(m.metric_date).mornings.push(m);
  }
  const out = [];
  for (const [day, { logs, mornings }] of byDay) {
    logs.sort((a, b) => b.loggedAt - a.loggedAt);
    mornings.sort((a, b) => b.loggedAt - a.loggedAt);
    const primary = logs[0] ?? mornings[0];
    const entry = { ...primary, metric_date: day, logIds: logs.map((l) => l.id), morningIds: mornings.map((m) => m.id) };
    // Complete the newest row from the day's older rows (a measurements-only
    // save does not hide the day's weight, nor a weight-only save its sites).
    for (const key of READING_FIELDS) {
      if (entry[key] == null) {
        const src = logs.find((l) => l[key] != null);
        if (src) {
          entry[key] = src[key];
          if (key === 'body_fat') entry.body_fat_source = src.body_fat_source ?? null;
        }
      }
    }
    const morningWeight = mornings.find((m) => Number(m.body_weight) > 0);
    const logWeight = logs.find((l) => Number(l.body_weight) > 0);
    const weightRow = morningWeight ?? logWeight ?? null;
    entry.body_weight = weightRow ? weightRow.body_weight : null;
    if (weightRow) entry.loggedAt = weightRow.loggedAt;
    // The note: the form's own text first, then whatever the quick row holds.
    const noteSrc = [...logs, ...mornings].find((r) => typeof r.notes === 'string' && r.notes.trim());
    entry.notes = noteSrc ? noteSrc.notes : '';
    entry.source = logs.length ? 'body_metric_log' : 'morning_weight';
    entry.id = (logs[0] ?? mornings[0]).id;
    // A starting weight typed at setup is a point of the series, but not a
    // morning the person weighed (checkinDerive.isEnrolmentSeedWeight).
    entry.isEnrolmentSeed = mornings.some((m) => String(m.notes || '').trim() === ENROLMENT_NOTE);
    out.push(entry);
  }
  return out.sort((a, b) => b.metric_date.localeCompare(a.metric_date) || b.loggedAt - a.loggedAt);
}

/** Entries that hold a weigh-in, oldest first, each anchored at its day's local noon. */
export function weighInsOf(entries) {
  return (entries || [])
    .filter((e) => e && e.metric_date && Number(e.body_weight) > 0)
    .map((e) => ({ dayKey: e.metric_date, kg: Number(e.body_weight), ms: noonOfDay(e.metric_date), entry: e }))
    .filter((w) => Number.isFinite(w.ms))
    .sort((a, b) => a.ms - b.ms);
}

/**
 * The plain average of a Monday-anchored local week's weigh-ins: the ONE
 * helper the This week card and every History group read.
 * @param {Array} entries      day entries
 * @param {number} weekStartMs local Monday 00:00 (dayKey.localWeekStartMs)
 * @param {object} [opts]
 * @param {string} [opts.untilKey] last day to count (today, for the open week:
 *   an entry dated tomorrow is not part of this week so far)
 * @returns {{ count: number, averageKg: ?number, weekStartMs: number }}
 */
export function weekAverage(entries, weekStartMs, { untilKey = null } = {}) {
  const from = localDayKey(weekStartMs);
  const sunday = localDayKey(localWeekEndMs(weekStartMs) - 1);
  const to = untilKey && untilKey < sunday ? untilKey : sunday;
  const inWeek = weighInsOf(entries).filter((w) => w.dayKey >= from && w.dayKey <= to);
  const count = inWeek.length;
  const averageKg = count ? inWeek.reduce((s, w) => s + w.kg, 0) / count : null;
  return { count, averageKg, weekStartMs };
}

/** The Monday-anchored start of the week before `weekStartMs`, by local calendar days. */
export function previousWeekStart(weekStartMs) {
  const d = new Date(weekStartMs);
  d.setDate(d.getDate() - 7);
  return d.getTime();
}

/**
 * "weighed N of M mornings so far this week": N is the days of the open
 * Monday-anchored week that hold a weigh-in the person made (the setup
 * starting weight is not one), M the days elapsed including today.
 * A denominator, never a streak.
 */
export function morningsThisWeek(entries, nowMs = Date.now()) {
  const mondayKey = localDayKey(localWeekStartMs(nowMs));
  const todayKey = localDayKey(nowMs);
  const weighed = weighInsOf(entries)
    .filter((w) => w.dayKey >= mondayKey && w.dayKey <= todayKey && !w.entry.isEnrolmentSeed).length;
  const elapsed = Math.max(1, civilDayDifference(todayKey, mondayKey) + 1);
  return { weighed, elapsed };
}

/**
 * Weekly groups for the History: the last `weeks` Monday-anchored calendar
 * weeks (the open week first), only the weeks that hold an entry. An entry
 * dated after today (a date the form accepted before it learnt to refuse
 * them, BM-40) is not part of any week: it comes back separately so the
 * person can still reach it to correct or delete it.
 * @returns {{ groups: Array<{ key: string, weekStartMs: number, open: boolean,
 *   entries: Array, count: number, averageKg: ?number }>, future: Array }}
 *   groups newest week first
 */
export function groupEntriesByWeek(entries, { nowMs = Date.now(), weeks = HISTORY_PAGE_WEEKS } = {}) {
  const thisWeekStart = localWeekStartMs(nowMs);
  const earliest = new Date(thisWeekStart);
  earliest.setDate(earliest.getDate() - 7 * Math.max(0, weeks - 1));
  const firstKey = localDayKey(earliest.getTime());
  const todayKey = localDayKey(nowMs);
  const groups = new Map();
  const future = [];
  for (const e of entries || []) {
    if (!e || !e.metric_date || e.metric_date < firstKey) continue;
    if (e.metric_date > todayKey) { future.push(e); continue; }
    const startMs = localWeekStartMs(noonOfDay(e.metric_date));
    if (!Number.isFinite(startMs)) continue;
    const key = localDayKey(startMs);
    if (!groups.has(key)) groups.set(key, { key, weekStartMs: startMs, open: startMs === thisWeekStart, entries: [] });
    groups.get(key).entries.push(e);
  }
  const ordered = [...groups.values()]
    .sort((a, b) => b.weekStartMs - a.weekStartMs)
    .map((g) => {
      const avg = weekAverage(g.entries, g.weekStartMs);
      return {
        ...g,
        entries: g.entries.sort((a, b) => b.metric_date.localeCompare(a.metric_date) || b.loggedAt - a.loggedAt),
        count: avg.count,
        averageKg: avg.averageKg,
      };
    });
  return { groups: ordered, future: future.sort((a, b) => b.metric_date.localeCompare(a.metric_date)) };
}

/**
 * The newest reading of a body-fat or site field from ANY entry (never gated
 * on the newest entry being a full one: BM-37), and the one before it.
 * @param {Array} entries day entries, newest first
 * @param {string} field one of READING_FIELDS
 * @returns {{ latest: ?object, previous: ?object }} each { value, metric_date, entry }
 */
export function readingsOf(entries, field) {
  const hits = [];
  for (const e of entries || []) {
    if (!e) continue;
    const v = Number(e[field]);
    if (isNum(v) && v > 0 && e.metric_date) hits.push({ value: v, metric_date: e.metric_date, entry: e });
    if (hits.length === 2) break;
  }
  return { latest: hits[0] ?? null, previous: hits[1] ?? null };
}

/**
 * The rows the Progress root's hook reads, windowed the way the hook windows
 * them (useWeightTrend.js, D97-22 R-2 and D97-25 RB6-1: the real trailing 90
 * DAYS, and a reading inside the 14-day boundary or nothing). The two lines
 * below are the hook's, character for character, so the trend weight on Body
 * metrics and on the Progress root can never disagree; `weights` is what
 * getMorningWeights(userId, 90) returns (the newest 90 rows, oldest first).
 */
export function trendWindowRows(weights) {
  const windowStart = Date.now() - 90 * 86400000;
  let windowed = (weights || []).filter(
    (w) => Number.isFinite(Number(w?.loggedAt)) && Number(w.loggedAt) >= windowStart,
  );
  const newestMs = windowed.reduce((m, w) => Math.max(m, Number(w.loggedAt)), 0);
  if (!(newestMs >= Date.now() - 14 * 86400000)) windowed = [];
  return windowed;
}

/**
 * The weigh-in a typed weight is compared with before saving: the newest
 * weigh-in BEFORE the entry's own day, else the oldest after it (an entry
 * for a past day is never judged against today's weight). The entry's own
 * day is skipped: it is the weigh-in being replaced.
 * @returns {?{ kg: number, dayKey: string }}
 */
export function plausibilityReference(entries, dayKey) {
  const rows = weighInsOf(entries).filter((w) => w.dayKey !== dayKey);
  const before = rows.filter((w) => w.dayKey < dayKey);
  if (before.length) {
    const w = before[before.length - 1];
    return { kg: w.kg, dayKey: w.dayKey };
  }
  const after = rows.filter((w) => w.dayKey > dayKey);
  return after.length ? { kg: after[0].kg, dayKey: after[0].dayKey } : null;
}

/** Is there anything of the person's older than `dayKey`? (the "Show earlier weeks" test, on loaded entries) */
export function hasEntryBefore(entries, dayKey) {
  return (entries || []).some((e) => e && e.metric_date && e.metric_date < dayKey);
}

