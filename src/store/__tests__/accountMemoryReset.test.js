import useAppStore from '../useAppStore';

describe('cross-account in-memory reset', () => {
  afterEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  test('A user, active workout, entitlement and profile state are gone before B publication', () => {
    useAppStore.setState({
      user: { id: 'account-a' },
      session: { user: { id: 'account-a' } },
      userProfile: { firstName: 'Account A' },
      userProfileFieldUpdatedAt: { first_name: 123 },
      tier: 'pro',
      billingPeriod: 'annual',
      _optimisticPaidUntil: Date.now() + 60_000,
      healthConsent: true,
      healthConsentChecked: true,
      activeWorkout: { id: 'a-workout' },
      workoutExercises: [{ id: 'a-exercise' }],
      currentExerciseIndex: 4,
      restTimerActive: true,
      hasUnseenCoachChange: true,
      cloudSyncStatus: 'complete',
    });

    useAppStore.getState().resetAccountMemoryForTransition();

    const state = useAppStore.getState();
    const initial = useAppStore.getInitialState();
    for (const key of [
      'user', 'session', 'userProfile', 'userProfileFieldUpdatedAt', 'tier',
      'billingPeriod', '_optimisticPaidUntil', 'healthConsent',
      'healthConsentChecked', 'activeWorkout', 'workoutExercises',
      'currentExerciseIndex', 'restTimerActive', 'hasUnseenCoachChange',
      'cloudSyncStatus',
    ]) {
      expect(state[key]).toEqual(initial[key]);
    }
    expect(typeof state.resetAccountMemoryForTransition).toBe('function');
  });
});
