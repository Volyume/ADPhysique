import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Only this card and anything you deliberately send is shared. Food, coach notes, body metrics and photos stay private.';

function hasAim(value) {
  return Math.round(Number(value) || 0) > 0;
}

function safeName(name) {
  return (typeof name === 'string' && name.trim()) ? name.trim() : 'Your partner';
}

export function buildPartnerSupportPlan(pair = {}, partnerName = 'Your partner') {
  const name = safeName(partnerName);
  const myAimSet = hasAim(pair.myAim);
  const partnerAimSet = hasAim(pair.partnerAim);
  const cheerAvailable = pair.cheerEnabled !== false;
  let headline = `Share one chosen win with ${name} after checking exactly what they will see.`;
  let primaryAction = { key: 'share_wins', label: 'Share a win', accessibilityLabel: 'Review win sharing' };

  if (!myAimSet) {
    headline = `Set your planned sessions for the week. ${name} sees the number only, not your workout details.`;
    primaryAction = { key: 'set_aim', label: 'Set planned sessions', accessibilityLabel: 'Set planned sessions' };
  } else if (cheerAvailable) {
    headline = `Send ${name} one fixed cheer today. It is a quick acknowledgement, not a chat or feed.`;
    primaryAction = { key: 'cheer', label: 'Send today\'s cheer', accessibilityLabel: 'Send today\'s cheer' };
  } else if (pair.weekKept) {
    headline = `Last week is marked as kept. ${name} still only sees the support details shown here.`;
  }

  return Object.freeze({
    title: 'Support this week',
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'aim',
        label: 'Planned sessions',
        state: myAimSet ? 'Set' : 'Not set',
        copy: myAimSet
          ? `${name} sees ${Math.round(Number(pair.myAim) || 0)} planned sessions.`
          : `Choose a realistic number. ${name} sees only that number.`,
      }),
      Object.freeze({
        key: 'partner_aim',
        label: `${name}'s week`,
        state: partnerAimSet ? 'Set' : 'Not shared',
        copy: partnerAimSet
          ? `${name} shared ${Math.round(Number(pair.partnerAim) || 0)} planned sessions.`
          : `Nothing shows until ${name} chooses a number.`,
      }),
      Object.freeze({
        key: 'week',
        label: 'Training logged',
        state: 'Own plan',
        copy: `You have logged ${ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned })}.`,
      }),
      Object.freeze({
        key: 'share',
        label: 'Optional sharing',
        state: 'Optional',
        copy: cheerAvailable ? 'Cheers are fixed. Wins ask every time before sending.' : 'Today\'s cheer is sent. Wins still ask before sending.',
      }),
    ]),
  });
}
