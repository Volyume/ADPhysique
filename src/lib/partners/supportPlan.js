import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'They see weekly training status and cards you choose to send. Food, coach notes, body metrics and photos stay private.';

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
  let headline = `You and ${name} only see simple weekly status, fixed cheers and cards you deliberately send.`;
  let primaryAction = { key: 'share_wins', label: 'Share a chosen win', accessibilityLabel: 'Review shareable wins' };

  if (!myAimSet) {
    headline = `Choose how many sessions you plan to train this week. ${name} sees that number, not your workout details.`;
    primaryAction = { key: 'set_aim', label: 'Set this week\'s sessions', accessibilityLabel: 'Set this week\'s sessions' };
  } else if (cheerAvailable) {
    headline = `You can send ${name} one fixed cheer today. No chat, no feed, no pressure.`;
    primaryAction = { key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = 'You both showed up against your own plans last week.';
  }

  return Object.freeze({
    title: `This week with ${name}`,
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'aim',
        label: 'You',
        state: myAimSet ? 'set' : 'next',
        copy: myAimSet ? `Aiming for ${Math.round(Number(pair.myAim) || 0)} sessions.` : 'Choose your session number for this week.',
      }),
      Object.freeze({
        key: 'partner_aim',
        label: name,
        state: partnerAimSet ? 'set' : 'private',
        copy: partnerAimSet ? `Aiming for ${Math.round(Number(pair.partnerAim) || 0)} sessions.` : 'Appears only if they choose to set it.',
      }),
      Object.freeze({
        key: 'week',
        label: 'Weekly status',
        state: 'own plan',
        copy: `Your row reads ${ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned })}.`,
      }),
      Object.freeze({
        key: 'share',
        label: 'Cards',
        state: 'optional',
        copy: cheerAvailable ? 'Cheers are fixed. Win cards ask every time.' : 'Your cheer is sent. Win cards still ask every time.',
      }),
    ]),
  });
}
