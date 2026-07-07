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
    expect(plan.title).toBe('Partner week with Sam');
    expect(plan.headline).toBe('Send Sam one cheer for today. Fixed lines only, no free text or reply thread.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send a cheer' });
    expect(plan.steps.find((step) => step.key === 'you')).toMatchObject({
      label: 'Your week',
      state: '2 of 4',
      copy: 'Shown as training status from your Coach-assigned plan.',
    });
    expect(plan.steps.find((step) => step.key === 'partner_week')).toMatchObject({
      label: "Sam's week",
      state: '3 of 5',
      copy: "Sam's exact workouts, loads and notes stay private.",
    });
    expect(plan.steps.find((step) => step.key === 'wins')).toMatchObject({
      label: 'Wins',
      state: 'You choose',
      copy: 'Cheers use fixed lines. Wins ask every time.',
    });
    expect(plan.privacyLine).toBe(PARTNER_SUPPORT_PRIVACY_LINE);
    expect(plan.steps).toHaveLength(3);
  });

  test('routes to cheer when the daily acknowledgement is open', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, partnerAim: 3 }, 'Sam');
    expect(plan.headline).toBe('Send Sam one cheer for today. Fixed lines only, no free text or reply thread.');
    expect(plan.primaryAction).toMatchObject({ key: 'cheer', label: 'Send a cheer' });
    expect(plan.steps.find((step) => step.key === 'wins')).toMatchObject({
      label: 'Wins',
      state: 'You choose',
      copy: 'Cheers use fixed lines. Wins ask every time.',
    });
  });

  test('falls back to win preview when cheer is already sent', () => {
    const plan = buildPartnerSupportPlan({ ...pair, myAim: 4, cheerEnabled: false }, 'Sam');
    expect(plan.primaryAction).toMatchObject({ key: 'share_wins', label: 'Share a win' });
    expect(plan.steps.find((step) => step.key === 'wins')).toMatchObject({
      state: 'You choose',
      copy: 'Today\'s cheer is sent. Wins still ask before anything is sent.',
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
    expect(copy).toContain('Shared: weekly training status, one fixed cheer a day and wins you approve. Private: workouts, food, Coach, check-ins, body metrics and photos.');
    expect(copy).not.toMatch(/leaderboard|ahead|behind|workout history|food diary/i);
    expect(copy).not.toMatch(/\bchat\b|chatbot|AI chat/i);
  });
});
