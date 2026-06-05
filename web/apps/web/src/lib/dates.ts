// UK locale + timezone, always (locked rule). On Cloudflare the server runs in
// UTC, so every date the user sees, and every day-bucket we query, is computed
// against Europe/London, never the server's clock. This mirrors the mobile
// dayKey helpers (src/lib/dayKey.js) but is timezone-explicit because the server
// has no local UK clock to lean on.

const TZ = 'Europe/London';

// Local UK day-key 'YYYY-MM-DD' for the given instant (defaults to now).
// en-CA formats as YYYY-MM-DD; the timeZone option does the BST/GMT shift.
export function ukDayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

// Europe/London UTC offset in minutes at a given instant (0 in winter, 60 BST).
function londonOffsetMinutes(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === '24' ? '0' : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUTC - utcMs) / 60000);
}

// The UTC instant of local midnight in London for a 'YYYY-MM-DD' day-key.
export function londonMidnightUTC(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  const guess = Date.UTC(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0);
  const off = londonOffsetMinutes(guess);
  return new Date(guess - off * 60000);
}

// Weekday for a day-key, 0=Sun..6=Sat. Built from the calendar date directly
// (getUTCDay on the date's own UTC midnight), so it never drifts with TZ.
function weekdayOf(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

// Day-key of the Monday that starts the UK week containing `d`.
export function ukWeekStartKey(d: Date = new Date()): string {
  const key = ukDayKey(d);
  const wd = weekdayOf(key); // 0=Sun..6=Sat
  const back = (wd + 6) % 7; // days since Monday
  const [y, m, day] = key.split('-').map(Number);
  const monday = new Date(Date.UTC(y!, (m ?? 1) - 1, (day ?? 1) - back));
  return ukDayKey(new Date(monday.getTime()));
}

// ISO instant of the start of the current UK week (Monday 00:00 London), for
// gte filters against ISO timestamp columns.
export function ukWeekStartISO(d: Date = new Date()): string {
  return londonMidnightUTC(ukWeekStartKey(d)).toISOString();
}

// Human date for the top bar, e.g. "Fri 5 Jun 2026", in UK locale + zone.
export function ukDisplayDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Short UK date for chart axes, e.g. "5 Jun".
export function ukShortDate(t: number): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(t));
}

// ISO instant N days before now, for gte filters against ISO timestamp columns.
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
