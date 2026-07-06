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
    expect(plan.title).toBe('This week together');
    expect(plan.headline).toBe('Set how many sessions you plan to do this week. Your partner sees the number, not your workout details.');
    expect(plan.primaryAction).toMatchObject({ key: 'set_aim', label: 'Set weekly aim' });
    expect(plan.steps.find((step) => step.key === 'aim')).toMatchObject({
      state: 'next',
      copy: 'Choose your own session aim for the week.',
    });
    expect(plan.steps.find((step) => step.key === 'partner_aim')).toMatchObject({
      state: 'set',
      copy: 'Sam chose an aim too.',
    });
    expect(plan.steps.find((step) => step.key === 'week')?.copy)
      .toBe('Your week row reads 2 of 4 against your own plan.');
    expect(plan.privacyLine).toBe(PARTNER_SUPPORT_PRIVACY_LINE);
    expect(plan.steps).toHaveLength(4);
  });

  test('routes to cheer when aim is set and the daily acknowledgement is open', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, partnerAim: 3 }, 'Sam');
    expect(plan.headline).toBe('A fixed cheer is available for Sam today.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send cheer' });
    expect(plan.steps.find((step) => step.key === 'share')).toMatchObject({
      state: 'optional',
      copy: 'You can send one fixed cheer today. Win cards ask every time.',
    });
  });

  test('falls back to win preview when cheer is already sent', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, cheerEnabled: false }, 'Sam');
    expect(plan.primaryAction).toMatchObject({ key: 'share_wins', label: 'Share a win' });
    expect(plan.steps.find((step) => step.key === 'share')).toMatchObject({
      state: 'optional',
      copy: 'Your cheer is sent for today. Win cards still ask every time.',
    });
  });

  test('keeps the privacy language narrow', () => {
    const plan = buildPartnerSupportPlan({
      ...pair,
      myAim: 4,
      cheerEnabled: false,
      sharedBlock: { status: 'active', blockName: 'Upper Lower' },
    }, 'Sam');
    expect(plan.headline).toBe('A private partner space for encouragement, not comparison.');
    const copy = JSON.stringify(plan);
    expect(copy).toContain('Food, coach notes, body metrics and photos stay private.');
    expect(copy).not.toMatch(/leaderboard|ahead|behind|workout history|food diary/i);
  });
});
