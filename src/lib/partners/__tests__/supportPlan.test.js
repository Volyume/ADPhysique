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
    expect(plan.title).toBe('This week with Sam');
    expect(plan.headline).toBe('Set how many sessions you plan to train this week. Sam sees the number only, not your workout details.');
    expect(plan.primaryAction).toMatchObject({ key: 'set_aim', label: "Set this week's sessions" });
    expect(plan.steps.find((step) => step.key === 'aim')).toMatchObject({
      label: 'Your week',
      state: 'Not set',
      copy: 'Choose a realistic number. Sam sees the number only.',
    });
    expect(plan.steps.find((step) => step.key === 'partner_aim')).toMatchObject({
      label: "Sam's week",
      state: 'Set',
      copy: 'Sam shared 3 planned sessions.',
    });
    expect(plan.steps.find((step) => step.key === 'week')?.copy)
      .toBe('You have logged 2 of 4.');
    expect(plan.privacyLine).toBe(PARTNER_SUPPORT_PRIVACY_LINE);
    expect(plan.steps).toHaveLength(4);
  });

  test('routes to cheer when aim is set and the daily acknowledgement is open', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, partnerAim: 3 }, 'Sam');
    expect(plan.headline).toBe('You can send Sam one fixed cheer today. No chat, no feed and no pressure.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send a cheer' });
    expect(plan.steps.find((step) => step.key === 'share')).toMatchObject({
      label: 'Sharing',
      state: 'Optional',
      copy: 'Cheers are fixed. Wins ask every time before sending.',
    });
  });

  test('falls back to win preview when cheer is already sent', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, cheerEnabled: false }, 'Sam');
    expect(plan.primaryAction).toMatchObject({ key: 'share_wins', label: 'Choose a win to share' });
    expect(plan.steps.find((step) => step.key === 'share')).toMatchObject({
      state: 'Optional',
      copy: 'Your cheer is sent. Wins still ask before sending.',
    });
  });

  test('keeps the privacy language narrow', () => {
    const plan = buildPartnerSupportPlan({
      ...pair,
      myAim: 4,
      cheerEnabled: false,
      sharedBlock: { status: 'active', blockName: 'Upper Lower' },
    }, 'Sam');
    expect(plan.headline).toBe('You and Sam can support each other without opening up diaries, coach notes or body photos.');
    const copy = JSON.stringify(plan);
    expect(copy).toContain('Food, coach notes, body metrics and photos stay private.');
    expect(copy).not.toMatch(/leaderboard|ahead|behind|workout history|food diary/i);
  });
});
