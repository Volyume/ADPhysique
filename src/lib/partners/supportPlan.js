import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'They see the weekly support details on this card and anything you choose to send. Food, coach notes, body metrics and photos stay private.';

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
  let headline = `You and ${name} can support each other without opening up diaries, coach notes or body photos.`;
  let primaryAction = { key: 'share_wins', label: 'Choose a win to share', accessibilityLabel: 'Review shareable wins' };

  if (!myAimSet) {
    headline = `Set how many sessions you plan to train this week. ${name} sees the number only, not your workout details.`;
    primaryAction = { key: 'set_aim', label: 'Set this week\'s sessions', accessibilityLabel: 'Set this week\'s sessions' };
  } else if (cheerAvailable) {
    headline = `You can send ${name} one fixed cheer today. No chat, no feed and no pressure.`;
    primaryAction = { key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = `You both showed up against your own plans last week. ${name} still only sees the support details shown here.`;
  }

  return Object.freeze({
    title: `This week with ${name}`,
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'aim',
        label: 'Your week',
        state: myAimSet ? 'Set' : 'Not set',
        copy: myAimSet
          ? `${name} sees ${Math.round(Number(pair.myAim) || 0)} planned sessions.`
          : `Choose a realistic number. ${name} sees the number only.`,
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
        label: 'This week',
        state: 'Own plan',
        copy: `You have logged ${ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned })}.`,
      }),
      Object.freeze({
        key: 'share',
        label: 'Sharing',
        state: 'Optional',
        copy: cheerAvailable ? 'Cheers are fixed. Wins ask every time before sending.' : 'Your cheer is sent. Wins still ask before sending.',
      }),
    ]),
  });
}
