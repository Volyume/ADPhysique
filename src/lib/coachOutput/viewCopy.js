const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Indexed by the stored check-in day (0 = Sunday, matching HomeScreen).
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDay(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function formatDayFull(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekRangeLabel(weekStartMs) {
  if (weekStartMs == null) return 'Week dates unavailable';
  const startMs = Number(weekStartMs);
  if (!Number.isFinite(startMs)) return 'Week dates unavailable';
  const end = new Date(startMs + 6 * 24 * 60 * 60 * 1000);
  return `${formatDay(startMs)} to ${formatDayFull(end)}`;
}

export function buildOffItems(output, checkin) {
  const items = [];
  if (!output) return items;
  const { sessionsCompleted, sessionsPlanned } = output;
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned * 0.75) {
    items.push(`You hit ${sessionsCompleted} of ${sessionsPlanned} sessions.`);
  }
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    items.push(`Your sleep averaged ${checkin.sleepHours.toFixed(1)} hours.`);
  }
  if (checkin?.jointPain) {
    items.push('You flagged joint pain.');
  }
  if (checkin?.energyScore != null && checkin.energyScore <= 2) {
    items.push('Energy was low this week.');
  }
  if (checkin?.sorenessScore != null && checkin.sorenessScore >= 4) {
    items.push('Soreness was high.');
  }
  if (checkin?.calsAdherence === 'untracked') {
    items.push('You did not log your calories.');
  } else if (checkin?.calsAdherence === 'under') {
    items.push('You came in under your calorie target.');
  } else if (checkin?.calsAdherence === 'over') {
    items.push('You went over your calorie target.');
  } else if (checkin?.calsAdherence === 'no') {
    items.push('You were off your calorie target.');
  }
  return items;
}

export function buildFocus(output, checkin) {
  if (!output) return null;
  const { sessionsCompleted, sessionsPlanned, trend } = output;
  if (!trend?.delta && trend?.deltaLabel === 'Log morning weight') {
    return 'Log morning weight every day. The trend gets sharper with each log.';
  }
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    return 'Sleep is the priority this week. Aim for 7 hours or more. Nothing else moves until it does.';
  }
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    return `Hit all ${sessionsPlanned} sessions. Adherence beats everything else.`;
  }
  if (checkin?.jointPain) {
    return 'Reduce load on the painful joint. Substitute exercises if needed.';
  }
  if (checkin?.calsAdherence === 'untracked') {
    return 'Track your calories this week. Without that, the calorie target cannot be adjusted reliably.';
  }
  if (checkin?.calsAdherence === 'over' || checkin?.calsAdherence === 'no') {
    return 'Stay inside the calorie target.';
  }
  return 'Keep doing what you did this week.';
}

export const CONFIDENCE_CAPTIONS = {
  high: 'Confidence: high. A full week of data sits behind this decision.',
  medium: 'Confidence: medium. Some data was thin this week, so changes are sized cautiously.',
  low: 'Confidence: low. The trend is still building, so this week stays conservative.',
};
