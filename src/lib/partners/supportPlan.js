import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Private: workout details, food, Coach check-ins, body metrics and photos. Shared only when you press a button.';

function safeName(name) {
  return (typeof name === 'string' && name.trim()) ? name.trim() : 'Your partner';
}

export function buildPartnerSupportPlan(pair = {}, partnerName = 'Your partner') {
  const name = safeName(partnerName);
  const cheerAvailable = pair.cheerEnabled !== false;
  let headline = `Share one win with ${name} only when you want to. You approve the preview first.`;
  let primaryAction = null;

  if (cheerAvailable) {
    headline = `${name} can see whether you trained this week. They do not see your workouts, food, photos or Coach check-ins.`;
    primaryAction = { key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = `Last week was kept. ${name} still only sees training status and wins you approve.`;
  }

  return Object.freeze({
    title: `What ${name} can see`,
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'you',
        label: 'You',
        state: ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned }),
        copy: 'Training status from your current plan.',
      }),
      Object.freeze({
        key: 'partner_week',
        label: name,
        state: pair.partnerWeek?.state === 'resting'
          ? 'Resting'
          : ticksLabel({ done: pair.partnerWeek?.done, planned: pair.partnerWeek?.planned }),
        copy: 'Their workout details stay private too.',
      }),
      Object.freeze({
        key: 'wins',
        label: 'Wins',
        state: 'You choose',
        copy: cheerAvailable ? 'Wins ask before anything is sent.' : 'Today\'s cheer is sent. Wins still ask first.',
      }),
    ]),
  });
}
