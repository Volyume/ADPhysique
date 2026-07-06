import {
  SHARE_WIN_POLICY,
  SHARE_WIN_TYPES,
  isValidShareWinType,
  shareWinTypeByKey,
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
});
