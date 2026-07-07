import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Shared: weekly training status, one fixed cheer a day and wins you approve. Private: workouts, food, Coach, check-ins, body metrics and photos.';

function safeName(name) {
  return (typeof name === 'string' && name.trim()) ? name.trim() : 'Your partner';
}

export function buildPartnerSupportPlan(pair = {}, partnerName = 'Your partner') {
  const name = safeName(partnerName);
  const cheerAvailable = pair.cheerEnabled !== false;
  let headline = `Share one win with ${name} only when you want to. You approve the preview first.`;
  let primaryAction = { key: 'share_wins', label: 'Share a win', accessibilityLabel: 'Share a win' };

  if (cheerAvailable) {
    headline = `Send ${name} one cheer for today. Fixed lines only, no free text or reply thread.`;
    primaryAction = { key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = `Last week was kept. ${name} still only sees the items listed here and wins you approve.`;
  }

  return Object.freeze({
    title: `Partner week with ${name}`,
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'you',
        label: 'Your week',
        state: ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned }),
        copy: 'Shown as training status from your Coach-assigned plan.',
      }),
      Object.freeze({
        key: 'partner_week',
        label: `${name}'s week`,
        state: pair.partnerWeek?.state === 'resting'
          ? 'Resting'
          : ticksLabel({ done: pair.partnerWeek?.done, planned: pair.partnerWeek?.planned }),
        copy: `${name}'s exact workouts, loads and notes stay private.`,
      }),
      Object.freeze({
        key: 'wins',
        label: 'Wins',
        state: 'You choose',
        copy: cheerAvailable ? 'Cheers use fixed lines. Wins ask every time.' : 'Today\'s cheer is sent. Wins still ask before anything is sent.',
      }),
    ]),
  });
}
