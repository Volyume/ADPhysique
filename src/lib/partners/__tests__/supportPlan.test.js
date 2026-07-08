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
    expect(plan.title).toBe('What Sam sees');
    expect(plan.headline).toBe('Sam can see whether you trained this week. They only see extra detail when you choose to send a win.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' });
    expect(plan.privacyLine).toBe(PARTNER_SUPPORT_PRIVACY_LINE);
    expect(plan.steps).toBeUndefined();
  });

  test('routes to cheer when the daily acknowledgement is open', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, partnerAim: 3 }, 'Sam');
    expect(plan.headline).toBe('Sam can see whether you trained this week. They only see extra detail when you choose to send a win.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send a cheer', accessibilityLabel: 'Send a cheer' });
  });

  test('leaves win sharing to the stable card when cheer is already sent', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, cheerEnabled: false }, 'Sam');
    expect(plan.primaryAction).toBeNull();
    expect(plan.privacyLine).toBe(PARTNER_SUPPORT_PRIVACY_LINE);
  });

  test('keeps the privacy language narrow', () => {
    const plan = buildPartnerSupportPlan({
      ...pair,
      myAim: 4,
      cheerEnabled: false,
      sharedBlock: { status: 'active', blockName: 'Upper Lower' },
    }, 'Sam');
    expect(plan.headline).toBe('You decide whether to share a workout, PR or progress update. Nothing detailed is sent automatically.');
    const copy = JSON.stringify(plan);
    expect(copy).toContain('Private: full workout details, food, Coach check-ins, body metrics and photos.');
    expect(copy).not.toContain('Visible to');
    expect(copy).not.toContain('You choose if you want');
    expect(copy).not.toMatch(/leaderboard|ahead|behind|workout history|food diary/i);
    expect(copy).not.toMatch(/\bchat\b|chatbot|AI chat/i);
  });
});
