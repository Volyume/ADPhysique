import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Only weekly training status, your weekly sessions, fixed cheers and approved win cards are shared.';

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
  let headline = `Choose one win for ${name} only when you want to. You check the card before it is sent.`;
  let primaryAction = { key: 'share_wins', label: 'Choose one win', accessibilityLabel: 'Choose one win to share' };

  if (!myAimSet) {
    headline = `Set your weekly sessions. ${name} sees the number only, never your plan.`;
    primaryAction = { key: 'set_aim', label: 'Set weekly sessions', accessibilityLabel: 'Set this week\'s sessions' };
  } else if (cheerAvailable) {
    headline = `Send ${name} one fixed cheer for today. It is private to this partnership and is not chat.`;
    primaryAction = { key: 'cheer', label: 'Choose a fixed cheer', accessibilityLabel: 'Choose a cheer for today' };
  } else if (pair.weekKept) {
    headline = `Last week was kept. ${name} still only sees the items listed below and win cards you approve.`;
  }

  return Object.freeze({
    title: `Partner week with ${name}`,
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'aim',
        label: 'Your weekly sessions',
        state: myAimSet ? 'Set' : 'Not set',
        copy: myAimSet
          ? `${name} sees ${Math.round(Number(pair.myAim) || 0)} planned sessions.`
          : `Choose your weekly sessions. ${name} sees only that number.`,
      }),
      Object.freeze({
        key: 'partner_aim',
        label: `${name}'s weekly sessions`,
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
        copy: cheerAvailable ? 'Cheers are fixed. Win cards ask every time.' : 'Today\'s cheer is sent. Win cards still ask before anything is sent.',
      }),
    ]),
  });
}
