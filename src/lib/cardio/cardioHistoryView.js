import { parseLocalDay } from '../dayKey';

const DAY_MS = 24 * 60 * 60 * 1000;

export function prettyCardioDate(key) {
  try {
    const d = parseLocalDay(key);
    if (!Number.isFinite(d?.getTime?.())) return key;
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch (_) {
    return key;
  }
}

export function buildCardioWeekWindows(weeks, nowMs = Date.now(), dayKey) {
  const count = Math.max(0, Number(weeks) || 0);
  const toDayKey = typeof dayKey === 'function'
    ? dayKey
    : (ms) => new Date(ms).toISOString().slice(0, 10);

  const out = [];
  for (let i = 0; i < count; i++) {
    const toKey = toDayKey(nowMs - i * 7 * DAY_MS);
    const fromKey = toDayKey(nowMs - (i * 7 + 6) * DAY_MS);
    out.push({ fromKey, toKey });
  }
  return out;
}

export function cardioWeekRangeLabel(fromKey, toKey) {
  try {
    const f = parseLocalDay(fromKey);
    const t = parseLocalDay(toKey);
    if (!Number.isFinite(f?.getTime?.()) || !Number.isFinite(t?.getTime?.())) return '';
    const fM = f.toLocaleDateString('en-GB', { month: 'short' });
    const tM = t.toLocaleDateString('en-GB', { month: 'short' });
    return fM === tM ? `${f.getDate()} to ${t.getDate()} ${tM}` : `${f.getDate()} ${fM} to ${t.getDate()} ${tM}`;
  } catch (_) {
    return '';
  }
}

export function trimEmptyTrendWeeks(weeks) {
  const rows = Array.isArray(weeks) ? weeks : [];
  let lastNonEmpty = -1;
  rows.forEach((w, i) => { if (Number(w?.sessions) > 0) lastNonEmpty = i; });
  return rows.slice(0, Math.max(1, lastNonEmpty + 1));
}

export function cardioTrendWhenLabel(week, index) {
  if (index === 0) return 'This week';
  if (index === 1) return 'Last week';
  return cardioWeekRangeLabel(week?.fromKey, week?.toKey);
}

export function cardioTrendAccessibilityLabel({ when, sessions, goal, mark }) {
  return `${when}, ${sessions}${goal > 0 ? ` of ${goal}` : ''} sessions${mark ? `, ${mark}` : ''}`;
}
