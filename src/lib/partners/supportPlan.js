import { ticksLabel } from './signals';

export const PARTNER_SUPPORT_PRIVACY_LINE =
  'Own-plan signals only. Food, coach notes, body metrics and photos stay private.';

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
  const hasActiveBlock = pair.sharedBlock
    && (pair.sharedBlock.status === 'active' || pair.sharedBlock.status === 'proposed');

  let headline = 'Keep the week simple: your own plan, one calm cheer and optional win cards.';
  let primaryAction = { key: 'share_wins', label: 'Preview wins', accessibilityLabel: 'Review shareable wins' };

  if (!myAimSet) {
    headline = 'Start with a calm aim for your own week.';
    primaryAction = { key: 'set_aim', label: 'Set aim', accessibilityLabel: 'Set your aim for the week' };
  } else if (cheerAvailable) {
    headline = `A fixed cheer is available for ${name} today.`;
    primaryAction = { key: 'cheer', label: 'Send cheer', accessibilityLabel: 'Send a cheer' };
  } else if (pair.weekKept) {
    headline = 'Your shared week is kept.';
  } else if (hasActiveBlock) {
    headline = 'Your shared block has a calm support lane.';
  }

  return Object.freeze({
    title: 'Support plan',
    headline,
    primaryAction,
    privacyLine: PARTNER_SUPPORT_PRIVACY_LINE,
    steps: Object.freeze([
      Object.freeze({
        key: 'aim',
        label: 'Aim',
        state: myAimSet ? 'set' : 'next',
        copy: myAimSet ? 'Your aim is set for your own plan.' : 'Set a calm aim for your own plan.',
      }),
      Object.freeze({
        key: 'week',
        label: 'Week',
        state: 'own_plan',
        copy: `Your week row reads ${ticksLabel({ done: pair.myWeek?.done, planned: pair.myWeek?.planned })} against your own plan.`,
      }),
      Object.freeze({
        key: 'cheer',
        label: 'Cheer',
        state: cheerAvailable ? 'available' : 'done',
        copy: cheerAvailable ? 'One fixed acknowledgement is available today.' : 'Your acknowledgement is sent for today.',
      }),
      Object.freeze({
        key: 'win',
        label: 'Win card',
        state: 'optional',
        copy: 'Optional card sharing asks every time.',
      }),
      Object.freeze({
        key: 'block',
        label: 'Block',
        state: hasActiveBlock ? 'shared' : 'optional',
        copy: hasActiveBlock ? 'Shared block name only.' : 'Shared blocks stay optional.',
      }),
      Object.freeze({
        key: 'partner_aim',
        label: 'Partner aim',
        state: partnerAimSet ? 'set' : 'private',
        copy: partnerAimSet ? `${name} set an aim too.` : `${name}'s aim is not shown until they choose one.`,
      }),
    ]),
  });
}
