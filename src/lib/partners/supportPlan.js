import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Your partner sees weekly training status and optional cards only. Food, coach notes, body metrics and photos stay private.';

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
  let headline = 'Keep it simple: each person trains their own plan, then chooses what to share.';
  let primaryAction = { key: 'share_wins', label: 'Preview wins', accessibilityLabel: 'Review shareable wins' };

  if (!myAimSet) {
    headline = 'Set how many sessions you plan to do this week. Your partner sees the number, not your workout details.';
    primaryAction = { key: 'set_aim', label: 'Set weekly aim', accessibilityLabel: 'Set your weekly aim' };
  } else if (cheerAvailable) {
    headline = `A fixed cheer is available for ${name} today.`;
    primaryAction = { key: 'cheer', label: 'Send cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = 'Your shared week is kept.';
  }

  return Object.freeze({
    title: 'This week together',
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'aim',
        label: 'Your aim',
        state: myAimSet ? 'set' : 'next',
        copy: myAimSet ? 'Your session aim is set.' : 'Choose your own session aim for the week.',
      }),
      Object.freeze({
        key: 'partner_aim',
        label: `${name}'s aim`,
        state: partnerAimSet ? 'set' : 'private',
        copy: partnerAimSet ? `${name} chose an aim too.` : `${name}'s aim appears only if they set one.`,
      }),
      Object.freeze({
        key: 'week',
        label: 'Week view',
        state: 'own_plan',
        copy: `Your week row reads ${ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned })} against your own plan.`,
      }),
      Object.freeze({
        key: 'share',
        label: 'Share',
        state: 'optional',
        copy: cheerAvailable ? 'You can send one fixed cheer today. Win cards ask every time.' : 'Your cheer is sent for today. Win cards still ask every time.',
      }),
    ]),
  });
}
