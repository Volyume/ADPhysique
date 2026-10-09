/**
 * Exercise history and records, derived from an exercise's previous completed
 * sets. Pure: no I/O, no React, no store. The workout logger's HistorySheet,
 * the Records segment and the section's bests line all read this one result
 * so they cannot describe the same history differently.
 *
 * Authority: docs/audit/workout-logger-audit-2026-10-06/12-BUILD-SPEC.md
 * sections 2a and 2b (register D220 addenda 1 and 2).
 *
 * Input is what `getAllCompletedSetsForExercise` returns (previous completed
 * sessions only, camelCase via rowToCamel; snake_case is accepted too).
 * Warm-ups are left out of everything. A set without a finite positive weight
 * and finite positive reps is shown in history but kept out of the records
 * and the bests.
 */
import { calculate1RM, isE1rmEligibleRow } from './algorithms';

const DAY_MS = 24 * 60 * 60 * 1000;
const THREE_MONTHS_MS = 90 * DAY_MS;

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

function isPositive(n) {
  return Number.isFinite(n) && n > 0;
}

/** "6 Oct", with the year appended when it is not `now`'s year. */
function formatDateLabel(ms, now) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  try {
    return d.toLocaleDateString(
      'en-GB',
      sameYear
        ? { day: 'numeric', month: 'short' }
        : { day: 'numeric', month: 'short', year: 'numeric' },
    );
  } catch (_) {
    // A missing locale must never throw into the logger.
    const base = `${d.getDate()}/${d.getMonth() + 1}`;
    return sameYear ? base : `${base}/${d.getFullYear()}`;
  }
}

/** Normalise one stored row, or null for a warm-up or a non-object. */
// What makes a row count, by exercise kind (D220 addendum 34): a weight
// exercise needs a weight and reps; a reps-only or timed exercise needs its
// reps (seconds, for timed work); a distance exercise needs its distance,
// which the screen keeps in `weight`.
function isValidForKind(kind, weight, reps) {
  if (kind === 'reps_only' || kind === 'duration') return isPositive(reps);
  if (kind === 'distance') return isPositive(weight);
  return isPositive(weight) && isPositive(reps);
}

function normaliseRow(row, index, kind = 'weight_reps') {
  if (!row || typeof row !== 'object') return null;
  const setType = row.setType ?? row.set_type ?? 'straight';
  if (setType === 'warmup') return null;
  const weight = toNumber(row.weight);
  const reps = toNumber(row.actualReps ?? row.actual_reps ?? row.reps);
  const createdAtRaw = toNumber(row.createdAt ?? row.created_at);
  const workoutId = row.workoutId ?? row.workout_id;
  return {
    index,
    sessionKey: workoutId === undefined || workoutId === null ? '__none__' : String(workoutId),
    weight: Number.isFinite(weight) ? weight : 0,
    reps: Number.isFinite(reps) ? reps : 0,
    valid: isValidForKind(kind, weight, reps),
    // A cluster row's reps are a summed total and a ballistic row is not a
    // strength effort: neither may feed an estimated max (the same rule the
    // record system applies, algorithms.isE1rmEligibleRow).
    e1rmEligible: isE1rmEligibleRow(row),
    createdAt: Number.isFinite(createdAtRaw) ? createdAtRaw : 0,
  };
}

/** Higher weight, then more reps, then more recent wins. */
function isBetterHeaviest(a, b) {
  if (a.weight !== b.weight) return a.weight > b.weight;
  if (a.reps !== b.reps) return a.reps > b.reps;
  return a.createdAt > b.createdAt;
}

function pickHeaviest(valid) {
  let best = null;
  for (const s of valid) if (!best || isBetterHeaviest(s, best)) best = s;
  return best;
}

function groupBySession(rows) {
  const map = new Map();
  for (const r of rows) {
    let g = map.get(r.sessionKey);
    if (!g) {
      g = { key: r.sessionKey, rows: [], latest: 0 };
      map.set(r.sessionKey, g);
    }
    g.rows.push(r);
    if (r.createdAt > g.latest) g.latest = r.createdAt;
  }
  return Array.from(map.values());
}

/** Logged order: createdAt ascending; equal stamps keep reverse input order
 *  (the input is newest first, so a later index was logged earlier). */
function loggedOrder(rows) {
  return rows.slice().sort((a, b) => a.createdAt - b.createdAt || b.index - a.index);
}

function computeRecords(rows, todayWeight, now) {
  const valid = rows.filter((r) => r.valid);
  if (valid.length === 0) {
    return { heaviest: null, mostRepsAtWeight: null, bestEstimatedMax: null, bestSessionVolume: null };
  }

  const h = pickHeaviest(valid);
  const heaviest = { weight: h.weight, reps: h.reps, dateLabel: formatDateLabel(h.createdAt, now) };

  let mostRepsAtWeight = null;
  if (isPositive(todayWeight)) {
    let m = null;
    for (const s of valid) {
      if (s.weight !== todayWeight) continue;
      if (!m || s.reps > m.reps || (s.reps === m.reps && s.createdAt > m.createdAt)) m = s;
    }
    if (m) {
      mostRepsAtWeight = { weight: todayWeight, reps: m.reps, dateLabel: formatDateLabel(m.createdAt, now) };
    }
  }

  let e = null;
  let eValue = 0;
  for (const s of valid) {
    if (!s.e1rmEligible) continue;
    const est = calculate1RM(s.weight, s.reps);
    if (!Number.isFinite(est) || est <= 0) continue;
    if (!e || est > eValue || (est === eValue && s.createdAt > e.createdAt)) {
      e = s;
      eValue = est;
    }
  }
  const bestEstimatedMax = e
    ? { value: Math.round(eValue * 10) / 10, dateLabel: formatDateLabel(e.createdAt, now) }
    : null;

  let v = null;
  for (const g of groupBySession(valid)) {
    const volume = g.rows.reduce((sum, s) => sum + s.weight * s.reps, 0);
    if (!v || volume > v.volume || (volume === v.volume && g.latest > v.latest)) {
      v = { volume, latest: g.latest };
    }
  }
  const bestSessionVolume = v
    ? { value: Math.round(v.volume), dateLabel: formatDateLabel(v.latest, now) }
    : null;

  return { heaviest, mostRepsAtWeight, bestEstimatedMax, bestSessionVolume };
}

/**
 * @param {{ sets: Array<object>, todayWeight?: number, now?: number, units?: string }} args
 * @returns {{
 *   history: Array<{ dateLabel: string, sets: Array<{ weight: number, reps: number, isBest: boolean }> }>,
 *   records: { lifetime: object, threeMonths: object },
 *   repsAtWeight: Array<{ weight: number, reps: number, dateLabel: string }>,
 *   bests: null | { lastDateLabel: string, heaviest: null | { weight: number, reps: number }, atWeight: null | { weight: number, reps: number } },
 * }}
 */
/**
 * Records for the kinds that have no weight (D220 addendum 34): a reps-only
 * exercise keeps its most reps in a set and its most reps in a session; a
 * timed exercise its longest set and its longest session (seconds); a
 * distance exercise its farthest set (distance and time) and its farthest
 * session. Each record carries its date label, as the weight records do.
 */
function computeKindRecords(kind, rows, now) {
  const valid = rows.filter((r) => r.valid);
  const empty = emptyKindRecords(kind);
  if (valid.length === 0) return empty;
  const sessions = groupBySession(valid);
  const bestSession = (sum) => {
    let b = null;
    for (const g of sessions) {
      const value = g.rows.reduce((acc, s) => acc + sum(s), 0);
      if (!b || value > b.value || (value === b.value && g.latest > b.latest)) b = { value, latest: g.latest };
    }
    return b ? { value: Math.round(b.value * 10) / 10, dateLabel: formatDateLabel(b.latest, now) } : null;
  };
  if (kind === 'reps_only') {
    let m = null;
    for (const s of valid) if (!m || s.reps > m.reps || (s.reps === m.reps && s.createdAt > m.createdAt)) m = s;
    return {
      mostReps: { reps: m.reps, dateLabel: formatDateLabel(m.createdAt, now) },
      bestSessionReps: bestSession((s) => s.reps),
    };
  }
  if (kind === 'duration') {
    let m = null;
    for (const s of valid) if (!m || s.reps > m.reps || (s.reps === m.reps && s.createdAt > m.createdAt)) m = s;
    return {
      longestSet: { reps: m.reps, dateLabel: formatDateLabel(m.createdAt, now) },
      longestSession: bestSession((s) => s.reps),
    };
  }
  // distance: the farthest set, ties to the faster one, then the latest.
  let f = null;
  for (const s of valid) {
    if (!f || s.weight > f.weight || (s.weight === f.weight && (s.reps < f.reps || (s.reps === f.reps && s.createdAt > f.createdAt)))) f = s;
  }
  return {
    farthestSet: { weight: f.weight, reps: f.reps, dateLabel: formatDateLabel(f.createdAt, now) },
    bestSessionDistance: bestSession((s) => s.weight),
  };
}

function emptyKindRecords(kind) {
  if (kind === 'reps_only') return { mostReps: null, bestSessionReps: null };
  if (kind === 'duration') return { longestSet: null, longestSession: null };
  return { farthestSet: null, bestSessionDistance: null };
}

/** The session's best valid set for a kind without a weight (D220 addendum 34). */
function pickBestOfSessionForKind(kind, ordered) {
  let best = null;
  for (const s of ordered) {
    if (!s.valid) continue;
    if (!best) { best = s; continue; }
    if (kind === 'distance') {
      if (s.weight > best.weight || (s.weight === best.weight && s.reps < best.reps)) best = s;
    } else if (s.reps > best.reps) best = s;
  }
  return best;
}

export function buildExerciseHistory({ sets, todayWeight, now, units = 'kg', kind = 'weight_reps' } = {}) {
  void units; // kept for the signature; the numbers are unit-free
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const weightKind = kind !== 'reps_only' && kind !== 'duration' && kind !== 'distance';
  const emptyRecords = () => (weightKind ? {
    heaviest: null,
    mostRepsAtWeight: null,
    bestEstimatedMax: null,
    bestSessionVolume: null,
  } : emptyKindRecords(kind));
  const empty = {
    history: [],
    records: { lifetime: emptyRecords(), threeMonths: emptyRecords() },
    repsAtWeight: [],
    bests: null,
  };
  if (!Array.isArray(sets) || sets.length === 0) return empty;

  const rows = [];
  sets.forEach((raw, i) => {
    const r = normaliseRow(raw, i, weightKind ? 'weight_reps' : kind);
    if (r) rows.push(r);
  });
  if (rows.length === 0) return empty;

  const today = typeof todayWeight === 'number' || typeof todayWeight === 'string'
    ? toNumber(todayWeight)
    : NaN;

  // History: one entry per session, newest first by latest createdAt.
  const sessions = groupBySession(rows).sort((a, b) => b.latest - a.latest);
  const history = sessions.map((g) => {
    const ordered = loggedOrder(g.rows);
    const best = weightKind ? pickBestOfSession(ordered) : pickBestOfSessionForKind(kind, ordered);
    return {
      dateLabel: formatDateLabel(g.latest, nowMs),
      sets: ordered.map((s) => ({ weight: s.weight, reps: s.reps, isBest: s === best })),
    };
  });

  const cutoff = nowMs - THREE_MONTHS_MS;
  const recent = rows.filter((r) => r.createdAt >= cutoff);
  if (!weightKind) {
    // No weight: no reps-at-weight table and no bests line; the records are
    // the kind's own (D220 addendum 34).
    return {
      history,
      records: { lifetime: computeKindRecords(kind, rows, nowMs), threeMonths: computeKindRecords(kind, recent, nowMs) },
      repsAtWeight: [],
      bests: null,
    };
  }
  const lifetime = computeRecords(rows, today, nowMs);
  const threeMonths = computeRecords(recent, today, nowMs);

  // Best reps at each distinct weight over the last 90 days, heaviest first.
  const perWeight = new Map();
  for (const s of recent) {
    if (!s.valid) continue;
    const cur = perWeight.get(s.weight);
    if (!cur || s.reps > cur.reps || (s.reps === cur.reps && s.createdAt > cur.createdAt)) {
      perWeight.set(s.weight, s);
    }
  }
  const repsAtWeight = Array.from(perWeight.values())
    .sort((a, b) => b.weight - a.weight)
    .map((s) => ({ weight: s.weight, reps: s.reps, dateLabel: formatDateLabel(s.createdAt, nowMs) }));

  const bests = {
    lastDateLabel: history[0].dateLabel,
    heaviest: lifetime.heaviest
      ? { weight: lifetime.heaviest.weight, reps: lifetime.heaviest.reps }
      : null,
    atWeight: lifetime.mostRepsAtWeight
      ? { weight: lifetime.mostRepsAtWeight.weight, reps: lifetime.mostRepsAtWeight.reps }
      : null,
  };

  return { history, records: { lifetime, threeMonths }, repsAtWeight, bests };
}

/** The session's best valid set: heaviest, ties by most reps, then first logged. */
function pickBestOfSession(ordered) {
  let best = null;
  for (const s of ordered) {
    if (!s.valid) continue;
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s;
  }
  return best;
}
