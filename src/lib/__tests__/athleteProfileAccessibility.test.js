import { buildProfileRowAccessibility, profileRowStatusLabel } from '../athleteProfileAccessibility';

describe('athleteProfileAccessibility', () => {
  test('maps freshness tones to the visible pill copy', () => {
    expect(profileRowStatusLabel('attention')).toBe('Update');
    expect(profileRowStatusLabel('soon')).toBe('Soon');
    expect(profileRowStatusLabel('fresh')).toBe('Fresh');
    expect(profileRowStatusLabel('missing')).toBeNull();
  });

  test('keeps the concise row label and exposes status/subtext through the hint', () => {
    const out = buildProfileRowAccessibility({
      label: 'Progress photos',
      sub: 'Last indexed 29 days ago. Retake when light, pose and timing are consistent.',
      status: 'attention',
      pro: true,
    });

    expect(out.accessibilityLabel).toBe('Progress photos');
    expect(out.accessibilityHint).toContain('Status: Update.');
    expect(out.accessibilityHint).toContain('Last indexed 29 days ago');
    expect(out.accessibilityHint).toContain('Pro plan may be required.');
  });

  test('omits empty hints for plain rows', () => {
    expect(buildProfileRowAccessibility({ label: 'Account settings' })).toEqual({
      accessibilityLabel: 'Account settings',
      accessibilityHint: undefined,
    });
  });
});
