export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Private: full workouts, food, Coach check-ins, body metrics and photos.';

function safeName(name) {
  return (typeof name === 'string' && name.trim()) ? name.trim() : 'Your partner';
}

export function buildPartnerSupportPlan(pair = {}, partnerName = 'Your partner') {
  const name = safeName(partnerName);
  const cheerAvailable = pair.cheerEnabled !== false;
  let headline = `You choose if you want to share a workout, PR or progress update. Nothing detailed is sent automatically.`;
  let primaryAction = null;

  if (cheerAvailable) {
    headline = `${name} can see whether you trained this week, plus any win you send yourself.`;
    primaryAction = { key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = `Last week was kept. ${name} still only sees training status and wins you approve.`;
  }

  return Object.freeze({
    title: `Visible to ${name}`,
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
  });
}
