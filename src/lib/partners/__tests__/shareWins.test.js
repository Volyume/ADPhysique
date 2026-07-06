import {
  SHARE_WIN_CARD_RULES,
  SHARE_WIN_DELIVERY_GUARDRAILS,
  SHARE_WIN_FORBIDDEN_FIELDS,
  SHARE_WIN_POLICY,
  SHARE_WIN_REVIEW_STEPS,
  SHARE_WIN_TYPES,
  buildShareWinExampleDrafts,
  buildShareWinExamplePreviews,
  buildShareWinDraft,
  buildShareWinPreview,
  buildShareWinReviewReceipt,
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
    expect(SHARE_WIN_CARD_RULES).toContain('A sent card can be deleted by the sender.');
    expect(SHARE_WIN_DELIVERY_GUARDRAILS).toContain('Preview the exact card before sending.');
    expect(SHARE_WIN_DELIVERY_GUARDRAILS).toContain('Send one card only. No background feed is created.');
    expect(SHARE_WIN_REVIEW_STEPS.map((step) => step.key)).toEqual([
      'choose',
      'preview',
      'partner',
      'control',
    ]);
    expect(SHARE_WIN_REVIEW_STEPS.map((step) => step.title)).toEqual([
      'Choose the moment',
      'Preview exact card',
      'Confirm one partner',
      'Keep control',
    ]);
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
      label: 'Progress photo card',
      dateRange: '5 Jan to 20 Jun',
      format: 'Square',
      includesWeight: false,
      includesScanScore: true,
      scanScore: 82,
      photoUri: 'file:///private-photo.jpg',
    });
    expect(progress.requiresExport).toBe(true);
    expect(progress.summary).toBe('Progress photo card, 5 Jan to 20 Jun.');
    expect(progress.detail).toContain('Only the composed export can be sent');
    expect(progress.detail).toContain('The visible scan score is part of that export');
    expect(progress.detail).toContain('Weight is off for this export');
    expect(progress.detail).toContain('body metrics and the photo library stay private');
    expect(progress.dateRange).toBe('5 Jan to 20 Jun');
    expect(progress.format).toBe('Square');
    expect(Object.keys(progress)).not.toContain('photoUri');
    expect(Object.keys(progress)).not.toContain('scanScore');
    expect(validateShareWinDraft(progress)).toBe(true);
  });

  test('rejects invalid drafts and forbidden raw fields', () => {
    expect(buildShareWinDraft('coach_notes', {})).toBeNull();
    expect(shareWinDraftHasForbiddenFields({ type: 'workout_summary', reps: 10 })).toBe(true);
    expect(shareWinDraftHasForbiddenFields({ type: 'progress_card', photoUri: 'file://x' })).toBe(true);
    expect(validateShareWinDraft({ type: 'workout_summary', title: 'x', summary: 'x', detail: 'x', reps: 10 })).toBe(false);
    for (const key of ['sets', 'reps', 'load', 'food', 'coachNotes', 'bodyMetrics', 'photoUri', 'imageUri', 'imageBase64', 'scanScore']) {
      expect(SHARE_WIN_FORBIDDEN_FIELDS).toContain(key);
    }
  });

  test('builds safe example cards for the review sheet', () => {
    const examples = buildShareWinExampleDrafts();
    expect(examples.map((draft) => draft.type)).toEqual([
      'workout_summary',
      'personal_record',
      'block_milestone',
      'progress_card',
    ]);
    for (const draft of examples) {
      expect(validateShareWinDraft(draft)).toBe(true);
      expect(shareWinDraftHasForbiddenFields(draft)).toBe(false);
      expect(draft.defaultConsent).toBe('Ask every time');
    }
    expect(examples.map((draft) => draft.summary).join(' ')).not.toContain('file://');
  });

  test('builds progress-card previews from a sanitized exported-card payload', () => {
    const previews = buildShareWinExamplePreviews({
      progress_card: {
        label: 'Progress photo card',
        dateRange: '1 Jan to 1 Apr',
        format: 'Portrait',
        includesWeight: true,
        includesScanScore: false,
        imageUri: 'file:///private-export.png',
      },
    });
    const progress = previews.find((preview) => preview.type === 'progress_card');
    expect(progress.draft.summary).toBe('Progress photo card, 1 Jan to 1 Apr.');
    expect(progress.draft.detail).toContain('Scan details stay private unless they are visible on that export.');
    expect(progress.draft.detail).toContain('Weight is included because it was switched on for that export.');
    expect(progress.draft.format).toBe('Portrait');
    expect(Object.keys(progress.draft)).not.toContain('imageUri');
    expect(validateShareWinDraft(progress.draft)).toBe(true);
  });

  test('builds explicit preview receipts for one-card partner sharing', () => {
    const preview = buildShareWinPreview('personal_record', {
      liftName: 'Deadlift',
      recordLabel: 'New triple best',
      bodyWeight: 92,
    });
    expect(preview).toMatchObject({
      type: 'personal_record',
      status: 'Preview only',
      shared: 'The lift name and the record you choose to celebrate.',
      private: 'Your wider lift history and other records stay private.',
      confirmation: 'Not sent until you choose one partner and approve this exact card.',
    });
    expect(preview.draft.summary).toBe('Deadlift: New triple best.');
    expect(preview.guardrails).toContain('Confirm the one partner who will receive it.');
    expect(preview.guardrails).toContain('Keep the sender delete control attached to the card.');
    expect(Object.keys(preview.draft)).not.toContain('bodyWeight');
    expect(buildShareWinPreview('food_diary', {})).toBeNull();
  });

  test('builds a review receipt around the selected preview', () => {
    const preview = buildShareWinPreview('workout_summary', {
      workoutName: 'Pull session',
      completedAt: '6 July 2026',
    });
    const receipt = buildShareWinReviewReceipt(preview);
    expect(receipt).toMatchObject({
      title: 'Review before sending',
      status: 'Preview only',
      visibleToPartner: 'Workout name, date and completed status.',
      remainsPrivate: 'Exercises, sets, reps, loads, notes and effort stay private unless that card asks again.',
      consentLine: 'Not sent until you choose one partner and approve this exact card.',
    });
    expect(receipt.steps).toBe(SHARE_WIN_REVIEW_STEPS);
    expect(receipt.finalCheck).toContain('partner name');
    expect(receipt.finalCheck).toContain('exact card copy');
    expect(buildShareWinReviewReceipt(null)).toBeNull();
  });

  test('builds safe preview examples for every share-win type', () => {
    const previews = buildShareWinExamplePreviews();
    expect(previews.map((preview) => preview.type)).toEqual([
      'workout_summary',
      'personal_record',
      'block_milestone',
      'progress_card',
    ]);
    for (const preview of previews) {
      expect(validateShareWinDraft(preview.draft)).toBe(true);
      expect(shareWinDraftHasForbiddenFields(preview)).toBe(false);
      expect(preview.status).toBe('Preview only');
      expect(preview.confirmation).toContain('Not sent');
    }
  });
});
