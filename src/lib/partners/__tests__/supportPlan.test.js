import { PARTNER_SUPPORT_PRIVACY_LINE, buildPartnerSupportPlan } from '../supportPlan';

describe('partner accountability copy', () => {
  const pair = {
    myWeek: { done: 2, planned: 4 },
    partnerWeek: { done: 3, planned: 5 },
    cheerEnabled: true,
    sharedBlock: null,
  };

  test('starts from Coach-plan status, not a manual session target', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 0, partnerAim: 3 }, 'Sam');
    expect(plan.title).toBe('What Sam can see');
    expect(plan.headline).toBe('Sam can see whether you trained this week. They do not see your workouts, food, photos or Coach check-ins.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send a cheer' });
    expect(plan.steps.find((step) => step.key === 'you')).toMatchObject({
      label: 'You',
      state: '2 of 4',
      copy: 'Training status from your current plan.',
    });
    expect(plan.steps.find((step) => step.key === 'partner_week')).toMatchObject({
      label: 'Sam',
      state: '3 of 5',
      copy: 'Their workout details stay private too.',
    });
    expect(plan.steps.find((step) => step.key === 'wins')).toMatchObject({
      label: 'Wins',
      state: 'You choose',
      copy: 'Wins ask before anything is sent.',
    });
    expect(plan.privacyLine).toBe(PARTNER_SUPPORT_PRIVACY_LINE);
    expect(plan.steps).toHaveLength(3);
  });

  test('routes to cheer when the daily acknowledgement is open', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, partnerAim: 3 }, 'Sam');
    expect(plan.headline).toBe('Sam can see whether you trained this week. They do not see your workouts, food, photos or Coach check-ins.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send a cheer' });
    expect(plan.steps.find((step) => step.key === 'wins')).toMatchObject({
      label: 'Wins',
      state: 'You choose',
      copy: 'Wins ask before anything is sent.',
    });
  });

  test('leaves win sharing to the stable card when cheer is already sent', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, cheerEnabled: false }, 'Sam');
    expect(plan.primaryAction).toBeNull();
    expect(plan.steps.find((step) => step.key === 'wins')).toMatchObject({
      state: 'You choose',
      copy: 'Today\'s cheer is sent. Wins still ask first.',
    });
  });

  test('keeps the privacy language narrow', () => {
    const plan = buildPartnerSupportPlan({
      ...pair,
      myAim: 4,
      cheerEnabled: false,
      sharedBlock: { status: 'active', blockName: 'Upper Lower' },
    }, 'Sam');
    expect(plan.headline).toBe('Share one win with Sam only when you want to. You approve the preview first.');
    const copy = JSON.stringify(plan);
    expect(copy).toContain('Private: workout details, food, Coach check-ins, body metrics and photos. Shared only when you press a button.');
    expect(copy).not.toMatch(/leaderboard|ahead|behind|workout history|food diary/i);
    expect(copy).not.toMatch(/\bchat\b|chatbot|AI chat/i);
  });
});
