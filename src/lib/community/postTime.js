/**
 * postTimeLabel (D221 build spec 2.4, visual law V4): the one time label a
 * post carries, right-aligned on its identity line. "Today", "Yesterday", a
 * short weekday within the last seven days, "12 Oct" beyond that. Never a
 * clock time. Pure: the caller passes `now` (epoch ms) so a test can pin it.
 * Days are local calendar days (`dayKey.js`), so a post at 23:50 reads
 * "Yesterday" the next morning.
 */
import { localDayKey } from '../dayKey';

const DAY_MS = 86400000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toMs(value) {
  if (typeof value === 'number') return value;
  const ms = Date.parse(value);
  return ms;
}

/** Whole local calendar days from `fromMs` to `toMs` (0 = same day). */
function daysBetween(fromMs, nowMs) {
  const a = new Date(`${localDayKey(fromMs)}T00:00:00`);
  const b = new Date(`${localDayKey(nowMs)}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * @param {number|string} createdAt epoch ms or an ISO string
 * @param {number} [now] epoch ms, defaults to the device clock
 * @returns {string} '' when the timestamp cannot be read
 */
export function postTimeLabel(createdAt, now = Date.now()) {
  const ms = toMs(createdAt);
  if (!Number.isFinite(ms)) return '';
  const days = daysBetween(ms, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const d = new Date(ms);
  if (days < 7) return WEEKDAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default postTimeLabel;
