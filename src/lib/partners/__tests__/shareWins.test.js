import {
  SHARE_WIN_CARD_RULES,
  SHARE_WIN_FORBIDDEN_FIELDS,
  SHARE_WIN_POLICY,
  SHARE_WIN_TYPES,
  buildShareWinDraft,
  isValidShareWinType,
  shareWinDraftHasForbiddenFields,
  shareWinTypeByKey,
  validateShareWinDraft,
} from '../shareWins';

describe('partner shareable wins policy', () => {
  test('defines the explicit shareable win categories', () => {
    expect(SHARE_WIN_TYPES.map((type) => type.key)).toEqual([
      'workout_summary',
      'personal_record',
      'block_milestone',
      'progress_card',
    ]);
    expect(SHARE_WIN_TYPES.map((type) => type.title)).toEqual([
      'Workout summary',
      'Personal record',
      'Block milestone',
      'Progress card',
    ]);
  });

  test('keeps partner wins consent-gated and narrow', () => {
    expect(SHARE_WIN_POLICY.defaultState).toBe('Ask every time');
    expect(SHARE_WIN_POLICY.summary).toContain('off by default');
    expect(SHARE_WIN_POLICY.summary).toContain('only sees the win card you choose to send');
    expect(SHARE_WIN_POLICY.excluded).toContain('No passive feed');
    expect(SHARE_WIN_POLICY.excluded).toContain('workout history browsing');
    expect(SHARE_WIN_POLICY.excluded).toContain('food diary');
    expect(SHARE_WIN_POLICY.excluded).toContain('coach notes');
    expect(SHARE_WIN_POLICY.excluded).toContain('body metrics');
    expect(SHARE_WIN_POLICY.excluded).toContain('automatic photo sharing');
    expect(SHARE_WIN_CARD_RULES).toContain('Ask every time before a card is sent.');
    expect(SHARE_WIN_CARD_RULES).toContain('Future delivery must support revoke and delete.');
  });

  test('each category states both shared and private boundaries', () => {
    for (const type of SHARE_WIN_TYPES) {
      expect(type.shared).toEqual(expect.any(String));
      expect(type.shared.length).toBeGreaterThan(12);
      expect(type.private).toEqual(expect.any(String));
      expect(type.private.length).toBeGreaterThan(12);
      expect(type.shared).not.toContain('!');
      expect(type.private).not.toContain('!');
    }
  });

  test('validates and resolves shareable win types', () => {
    expect(isValidShareWinType('personal_record')).toBe(true);
    expect(isValidShareWinType('body_metrics')).toBe(false);
    expect(shareWinTypeByKey('progress_card')?.title).toBe('Progress card');
    expect(shareWinTypeByKey('coach_notes')).toBeNull();
  });

  test('builds narrow share-win drafts without raw training or body fields', () => {
    const workout = buildShareWinDraft('workout_summary', {
      workoutName: 'Upper Lower Strength',
      completedAt: '6 July 2026',
      sets: [{ reps: 8, load: 100 }],
    });
    expect(workout).toMatchObject({
      type: 'workout_summary',
      title: 'Workout complete',
      summary: 'Upper Lower Strength completed on 6 July 2026.',
      defaultConsent: 'Ask every time',
    });
    expect(workout.detail).toContain('sets, reps, loads, notes and effort stay private');
    expect(Object.keys(workout)).not.toContain('sets');
    expect(Object.keys(workout)).not.toContain('load');
    expect(validateShareWinDraft(workout)).toBe(true);

    const pr = buildShareWinDraft('personal_record', {
      liftName: 'Incline press',
      recordLabel: 'New 8-rep best',
      bodyWeight: 88,
    });
    expect(pr.summary).toBe('Incline press: New 8-rep best.');
    expect(pr.detail).toContain('Wider lift history stays private');
    expect(validateShareWinDraft(pr)).toBe(true);

    const progress = buildShareWinDraft('progress_card', {
      label: '12-week progress card',
      scanScore: 82,
      photoUri: 'file:///private-photo.jpg',
    });
    expect(progress.requiresExport).toBe(true);
    expect(progress.detail).toContain('body metrics and the photo library stay private');
    expect(Object.keys(progress)).not.toContain('photoUri');
    expect(Object.keys(progress)).not.toContain('scanScore');
    expect(validateShareWinDraft(progress)).toBe(true);
  });

  test('rejects invalid drafts and forbidden raw fields', () => {
    expect(buildShareWinDraft('coach_notes', {})).toBeNull();
    expect(shareWinDraftHasForbiddenFields({ type: 'workout_summary', reps: 10 })).toBe(true);
    expect(shareWinDraftHasForbiddenFields({ type: 'progress_card', photoUri: 'file://x' })).toBe(true);
    expect(validateShareWinDraft({ type: 'workout_summary', title: 'x', summary: 'x', detail: 'x', reps: 10 })).toBe(false);
    for (const key of ['sets', 'reps', 'load', 'food', 'coachNotes', 'bodyMetrics', 'photoUri', 'scanScore']) {
      expect(SHARE_WIN_FORBIDDEN_FIELDS).toContain(key);
    }
  });
});
