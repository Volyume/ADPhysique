import { PARTNER_SUPPORT_PRIVACY_LINE, buildPartnerSupportPlan } from '../supportPlan';

describe('partner support plan', () => {
  const pair = {
    myWeek: { done: 2, planned: 4 },
    partnerWeek: { done: 3, planned: 5 },
    cheerEnabled: true,
    sharedBlock: null,
  };

  test('starts with a calm aim when the user has not set one', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 0, partnerAim: 3 }, 'Sam');
    expect(plan.title).toBe('Support plan');
    expect(plan.headline).toBe('Start with a calm aim for your own week.');
    expect(plan.primaryAction).toMatchObject({ key: 'set_aim', label: 'Set aim' });
    expect(plan.steps.find((step) => step.key === 'aim')).toMatchObject({
      state: 'next',
      copy: 'Set a calm aim for your own plan.',
    });
    expect(plan.steps.find((step) => step.key === 'week')?.copy)
      .toBe('Your week row reads 2 of 4 against your own plan.');
    expect(plan.privacyLine).toBe(PARTNER_SUPPORT_PRIVACY_LINE);
  });

  test('routes to cheer when aim is set and the daily acknowledgement is open', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, partnerAim: 3 }, 'Sam');
    expect(plan.headline).toBe('A fixed cheer is available for Sam today.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send cheer' });
    expect(plan.steps.find((step) => step.key === 'cheer')).toMatchObject({
      state: 'available',
      copy: 'One fixed acknowledgement is available today.',
    });
  });

  test('falls back to win preview when cheer is already sent', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, cheerEnabled: false }, 'Sam');
    expect(plan.primaryAction).toMatchObject({ key: 'share_wins', label: 'Preview wins' });
    expect(plan.steps.find((step) => step.key === 'cheer')).toMatchObject({
      state: 'done',
      copy: 'Your acknowledgement is sent for today.',
    });
  });

  test('keeps the shared-block and privacy language narrow', () => {
    const plan = buildPartnerSupportPlan({
      ...pair,
      myAim: 4,
      cheerEnabled: false,
      sharedBlock: { status: 'active', blockName: 'Upper Lower' },
    }, 'Sam');
    expect(plan.headline).toBe('Your shared block has a calm support lane.');
    expect(plan.steps.find((step) => step.key === 'block')).toMatchObject({
      state: 'shared',
      copy: 'Shared block name only.',
    });
    const copy = JSON.stringify(plan);
    expect(copy).toContain('Food, coach notes, body metrics and photos stay private.');
    expect(copy).not.toMatch(/leaderboard|ahead|behind|workout history|food diary/i);
  });
});
