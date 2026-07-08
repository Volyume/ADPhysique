export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Private: full workout details, food, Coach check-ins, body metrics and photos.';

function safeName(name) {
  return (typeof name === 'string' && name.trim()) ? name.trim() : 'Your partner';
}

export function buildPartnerSupportPlan(pair = {}, partnerName = 'Your partner') {
  const name = safeName(partnerName);
  const cheerAvailable = pair.cheerEnabled !== false;
  let headline = 'You decide whether to share a workout, PR or progress update. Nothing detailed is sent automatically.';
  let primaryAction = null;

  if (cheerAvailable) {
    headline = `${name} can see whether you trained this week. They only see extra detail when you choose to send a win.`;
    primaryAction = { key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = `${name} still only sees training status and wins you approve.`;
  }

  return Object.freeze({
    title: `What ${name} sees`,
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
  });
}
