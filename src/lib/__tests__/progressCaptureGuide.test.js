import {
  QUALITY_FIRST_CAPTURE_NOTE,
  PROGRESS_STUDIO_SETUP_STEPS,
  buildProgressStudioCapturePromptCopy,
  buildProgressStudioCaptureRoutes,
  buildProgressStudioHowItWorksCopy,
  buildScanCaptureSubtitle,
  getPoseCaptureGuidance,
  PROGRESS_SCAN_SEQUENCE,
  PROGRESS_STUDIO_AVOID,
} from '../progressCaptureGuide';

describe('progress capture guide copy', () => {
  test('defines the scan sequence and avoid list used by Progress Photos', () => {
    expect(PROGRESS_SCAN_SEQUENCE).toEqual([
      'Front relaxed',
      'Back relaxed',
      'Optional side relaxed',
    ]);
    expect(PROGRESS_STUDIO_SETUP_STEPS.map((step) => step.key)).toEqual([
      'frame',
      'lighting',
      'repeat',
    ]);
    expect(PROGRESS_STUDIO_SETUP_STEPS.map((step) => step.title)).toEqual([
      'Frame',
      'Light',
      'Repeat',
    ]);
    expect(PROGRESS_STUDIO_AVOID).toContain('mirror selfies');
    expect(PROGRESS_STUDIO_AVOID).toContain('arms blocking the waist');
  });

  test('returns pose-specific capture guidance', () => {
    expect(getPoseCaptureGuidance('front').checks).toContain('Camera at mid-torso height');
    expect(getPoseCaptureGuidance('side').checks).toContain('Torso not blocked');
    expect(getPoseCaptureGuidance('back').checks).toContain('Shoulders level');
    expect(getPoseCaptureGuidance('unknown').title).toBe('Progress photo');
  });

  test('keeps scan copy constrained to leanness, progress and confidence', () => {
    const prompt = buildProgressStudioCapturePromptCopy();
    const how = buildProgressStudioHowItWorksCopy();
    expect(prompt).toContain('Add clear front and back photos');
    expect(prompt).toContain('Volyume scans the set for a Score');
    expect(prompt).toContain('progress signal');
    expect(prompt).toContain('leanness band');
    expect(prompt).toContain('confidence');
    expect(prompt).not.toContain('not a body fat estimate');
    expect(prompt).toContain(QUALITY_FIRST_CAPTURE_NOTE);
    expect(how).toContain('Volyume Score is our own progress read from repeatable photos');
    expect(how).toContain('still save it to the photo library');
    expect(how).toContain('cannot use one photo as proof of readiness');
    expect(how).toContain('once a week');
    expect(how).not.toContain('every couple of weeks');
    expect(`${prompt}\n${how}`).not.toMatch(/private visual progress score/i);
  });

  test('builds action-first photo-set routes for capture and import', () => {
    const routes = buildProgressStudioCaptureRoutes({
      canScan: true,
    });
    expect(routes.map((route) => route.key)).toEqual([
      'scan',
      'scan_library',
    ]);
    expect(routes[0]).toMatchObject({
      title: 'Take a new photo set',
      actionLabel: 'Start photo set',
      recommended: true,
      recommendationLabel: 'Recommended',
    });
    expect(routes[0].bestFor).toBeUndefined();
    expect(routes[0].steps).toBeUndefined();
    expect(routes[1]).toMatchObject({
      title: 'Import a photo set',
      actionLabel: 'Import photo set',
    });
    expect(routes[1].bestFor).toBeUndefined();
    expect(routes[1].steps).toBeUndefined();
  });

  test('prioritises finishing the latest partial photo set', () => {
    const routes = buildProgressStudioCaptureRoutes({
      latestPartial: { nextPose: 'back', nextPoseLabel: 'Back' },
      canScan: true,
    });
    expect(routes.map((route) => route.key)).toEqual([
      'complete_latest',
      'scan',
      'scan_library',
    ]);
    expect(routes[0]).toMatchObject({
      title: 'Latest set needs another angle',
      actionLabel: 'Add Back photo',
      recommended: true,
      recommendationLabel: 'Add missing angle',
    });
    expect(routes[0].bestFor).toBeUndefined();
    expect(routes[1]).toMatchObject({
      key: 'scan',
      recommended: false,
    });
  });

  test('can still build the legacy non-scan fallback routes', () => {
    const routes = buildProgressStudioCaptureRoutes({ includeScan: false });
    expect(routes.map((route) => route.key)).toEqual(['guided', 'camera', 'library']);
  });

  test('keeps Physique Scan as the best route when there is no partial set', () => {
    const routes = buildProgressStudioCaptureRoutes({ canScan: false });
    expect(routes[0]).toMatchObject({
      key: 'scan',
      recommended: true,
      disabled: true,
      disabledReason: 'Sign in to save a photo set.',
    });
    expect(buildProgressStudioCaptureRoutes({ readOnly: true })).toEqual([]);
  });

  test('builds a scan subtitle from the active pose', () => {
    expect(buildScanCaptureSubtitle('front')).toContain('Stand tall');
    expect(buildScanCaptureSubtitle('front')).toBe(getPoseCaptureGuidance('front').line);
    expect(buildScanCaptureSubtitle('front')).not.toContain('timer');
    expect(buildScanCaptureSubtitle('front')).not.toContain(QUALITY_FIRST_CAPTURE_NOTE);
  });
});
