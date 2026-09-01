import { addLocalCalendarDays } from '../dayKey';

/** Compute the next weekly check-in using civil dates, not fixed 24h days. */
export function computeNextCheckinFireDate(
  weekday,
  hour,
  minute,
  lastCheckinMs,
  minGapDays = 7,
  nowMs = Date.now(),
) {
  const after = new Date(nowMs);
  const target = new Date(after);
  const currentDow = target.getDay();
  let daysUntil = (weekday - currentDow + 7) % 7;
  target.setHours(hour, minute, 0, 0);
  if (daysUntil === 0 && target.getTime() <= after.getTime()) daysUntil = 7;
  target.setDate(target.getDate() + daysUntil);

  if (lastCheckinMs > 0 && minGapDays > 0) {
    // Stored check-ins are Monday week anchors. First align the anchor to the
    // configured weekday, then advance by civil days. A fixed millisecond gap
    // moves by an hour at UK DST and can incorrectly skip a whole occurrence.
    const lastAnchor = new Date(lastCheckinMs);
    const lastDow = lastAnchor.getDay();
    lastAnchor.setDate(lastAnchor.getDate() + ((weekday - lastDow + 7) % 7));
    const earliest = addLocalCalendarDays(lastAnchor, minGapDays);
    while (target.getTime() < earliest.getTime()) target.setDate(target.getDate() + 7);
  }
  return target;
}
