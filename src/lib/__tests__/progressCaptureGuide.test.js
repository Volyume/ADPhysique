import {
  QUALITY_FIRST_CAPTURE_NOTE,
  buildProgressStudioCapturePromptCopy,
  buildProgressStudioCaptureRoutes,
  buildProgressStudioHowItWorksCopy,
  buildScanCaptureSubtitle,
  getPoseCaptureGuidance,
  PROGRESS_SCAN_SEQUENCE,
  PROGRESS_STUDIO_AVOID,
} from '../progressCaptureGuide';

describe('progress capture guide copy', () => {
  test('defines the scan sequence and avoid list used by Physique Studio', () => {
    expect(PROGRESS_SCAN_SEQUENCE).toEqual([
      'Front relaxed',
      'Back relaxed',
      'Optional side relaxed',
    ]);
    expect(PROGRESS_STUDIO_AVOID).toContain('mirror selfies');
    expect(PROGRESS_STUDIO_AVOID).toContain('arms blocking the waist');
  });

  test('returns pose-specific capture guidance', () => {
    expect(getPoseCaptureGuidance('front').checks).toContain('Camera at mid-torso height');
    expect(getPoseCaptureGuidance('side').checks).toContain('Torso not blocked');
    expect(getPoseCaptureGuidance('back').checks).toContain('Shoulders level');
    expect(getPoseCaptureGuidance('unknown').title).toBe('Studio setup');
  });

  test('keeps scan copy constrained to leanness, progress and confidence', () => {
    const prompt = buildProgressStudioCapturePromptCopy();
    const how = buildProgressStudioHowItWorksCopy();
    expect(prompt).toContain('leanness band, progress signal and confidence');
    expect(prompt).toContain('not an exact body-fat percentage');
    expect(prompt).toContain(QUALITY_FIRST_CAPTURE_NOTE);
    expect(how).toContain('withhold the scan read rather than guess');
    expect(how).toContain('cannot use one photo as proof of body fat');
    expect(`${prompt}\n${how}`).toContain('Photos stay on this device unless you choose to share or export them.');
  });

  test('builds action-first capture routes with a partial Check-In priority', () => {
    const routes = buildProgressStudioCaptureRoutes({
      latestPartial: { nextPose: 'back', nextPoseLabel: 'Back' },
      canScan: true,
    });
    expect(routes.map((route) => route.key)).toEqual([
      'complete_latest',
      'scan',
      'guided',
      'camera',
      'library',
    ]);
    expect(routes[0]).toMatchObject({
      actionLabel: 'Complete with Back',
      recommended: true,
    });
    expect(routes[1].bestFor).toContain('Leanness band, progress signal and scan confidence');
    expect(routes[1].bestFor).toContain('Not an exact body-fat percentage');
    expect(routes[4].bestFor).toContain('Backfilling older check-ins');
  });

  test('keeps Physique Scan as the best route when there is no partial set', () => {
    const routes = buildProgressStudioCaptureRoutes({ canScan: false });
    expect(routes[0]).toMatchObject({
      key: 'scan',
      recommended: true,
      disabled: true,
      disabledReason: 'Sign in to save a guided scan.',
    });
    expect(buildProgressStudioCaptureRoutes({ readOnly: true })).toEqual([]);
  });

  test('builds a scan subtitle from the active pose', () => {
    expect(buildScanCaptureSubtitle('front')).toContain('Front relaxed');
    expect(buildScanCaptureSubtitle('front')).toContain('use the timer');
    expect(buildScanCaptureSubtitle('front')).toContain(QUALITY_FIRST_CAPTURE_NOTE);
  });
});
