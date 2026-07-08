const SETUP_STANDARD = Object.freeze([
  'Camera at mid-torso height',
  'Full body visible from head to feet',
  'Same room, lighting and distance',
]);

export const PROGRESS_STUDIO_SETUP_STEPS = Object.freeze([
  Object.freeze({
    key: 'frame',
    title: 'Frame',
    copy: 'Keep your head, feet, waist and shoulders visible, with a little space around you.',
    icon: 'scan-outline',
  }),
  Object.freeze({
    key: 'lighting',
    title: 'Light',
    copy: 'Even front light, no backlighting, no deep shadows and no dramatic gym lighting.',
    icon: 'sunny-outline',
  }),
  Object.freeze({
    key: 'repeat',
    title: 'Repeat',
    copy: 'Use the same room, distance, camera height and relaxed stance each time.',
    icon: 'repeat-outline',
  }),
]);

export const PROGRESS_STUDIO_AVOID = Object.freeze([
  'mirror selfies',
  'backlighting or deep shadows',
  'bulky clothing',
  'arms blocking the waist',
  'cropped feet or head',
]);

export const PROGRESS_SCAN_SEQUENCE = Object.freeze([
  'Front relaxed',
  'Back relaxed',
  'Optional side relaxed',
]);

export const QUALITY_FIRST_CAPTURE_NOTE =
  'If a set is not clear enough for a score, it still stays in your photo library.';

export const POSE_CAPTURE_GUIDANCE = Object.freeze({
  front: Object.freeze({
    title: 'Front relaxed',
    line: 'Stand tall, feet planted, arms relaxed by your sides, with your waistline visible.',
    checks: Object.freeze([
      'Full body visible',
      'Even light from the front',
      'Camera at mid-torso height',
      'No mirror selfie',
    ]),
    avoid: Object.freeze(['arms across the body', 'cropped feet', 'strong overhead shadows']),
  }),
  side: Object.freeze({
    title: 'Side relaxed',
    line: 'Turn to your usual side, stand naturally, and keep your torso and waistline visible.',
    checks: Object.freeze([
      'Torso not blocked',
      'Same camera height',
      'Head-to-foot frame',
      'Feet planted in the same place',
    ]),
    avoid: Object.freeze(['twisting towards the camera', 'hands covering the waist', 'leaning into the pose']),
  }),
  back: Object.freeze({
    title: 'Back relaxed',
    line: 'Face away from the camera, stand tall, and keep shoulders, waist and feet in frame.',
    checks: Object.freeze([
      'Shoulders level',
      'Feet in frame',
      'Lighting unchanged',
      'Camera still at mid-torso height',
    ]),
    avoid: Object.freeze(['looking back at the camera', 'cropped shoulders', 'different lighting']),
  }),
});

export const DEFAULT_CAPTURE_GUIDANCE = Object.freeze({
  title: 'Progress photo',
  line: 'Use the same room, lighting, distance and camera height each time.',
  checks: SETUP_STANDARD,
  avoid: Object.freeze(['mirrors', 'busy backgrounds', 'camera tilt']),
});

export function getPoseCaptureGuidance(pose) {
  return POSE_CAPTURE_GUIDANCE[pose] || DEFAULT_CAPTURE_GUIDANCE;
}

export function buildProgressStudioCapturePromptCopy() {
  return [
    'Add clear front and back photos from the camera or your photo library. Add side too if you can.',
    'Volyume scans the set for a Score, leanness band, progress signal and confidence.',
    'Repeat the same room, light, distance and camera height each week. Side is optional.',
    QUALITY_FIRST_CAPTURE_NOTE,
  ].join('\n\n');
}

export function buildProgressStudioCaptureRoutes({
  latestPartial = null,
  canScan = true,
  readOnly = false,
  includeScan = true,
} = {}) {
  if (readOnly) return [];

  const routes = [];
  const missingPoseLabel = latestPartial?.nextPoseLabel || latestPartial?.missingPoseLabel || null;

  if (includeScan && latestPartial?.nextPose && missingPoseLabel) {
    routes.push({
      key: 'complete_latest',
      icon: 'checkmark-circle-outline',
      eyebrow: 'Latest set',
      title: 'Latest set needs another angle',
      body: `Add the missing ${missingPoseLabel.toLowerCase()} photo to the same date.`,
      actionLabel: `Add ${missingPoseLabel} photo`,
      recommended: true,
      recommendationLabel: 'Add missing angle',
    });
  }

  if (includeScan) {
    routes.push({
      key: 'scan',
      icon: 'scan',
      eyebrow: 'New set',
      title: 'Take a new photo set',
      body: 'Guided front and back photos for the score, with an optional side photo for comparison.',
      actionLabel: 'Start photo set',
      recommended: !latestPartial?.nextPose,
      recommendationLabel: 'Recommended',
      disabled: !canScan,
      disabledReason: 'Sign in to save a photo set.',
    });
    routes.push({
      key: 'scan_library',
      icon: 'images-outline',
      eyebrow: 'Existing set',
      title: 'Import a photo set',
      body: 'Choose existing front and back photos, add side if you have it, then set the date.',
      actionLabel: 'Import photo set',
      disabled: !canScan,
      disabledReason: 'Sign in to save imported photo sets.',
    });
    return routes;
  }

  if (latestPartial?.nextPose && missingPoseLabel) {
    routes.push({
      key: 'complete_latest',
      icon: 'checkmark-circle-outline',
      eyebrow: 'Best next',
      title: `Add ${missingPoseLabel.toLowerCase()} photo`,
      body: `Your latest date is missing the ${missingPoseLabel.toLowerCase()} photo.`,
      steps: Object.freeze([
        `Capture ${missingPoseLabel} relaxed`,
        'Match the same room, distance and camera height',
        'Save the pose before comparing this photo set',
      ]),
      actionLabel: `Add ${missingPoseLabel} photo`,
      recommended: true,
      recommendationLabel: 'Add missing angle',
    });
  }

  routes.push({
    key: 'guided',
    icon: 'camera-outline',
    eyebrow: 'Guided photo',
    title: 'Guided single photo',
    body: 'Use the guide on screen and the timer to match an older photo.',
    steps: Object.freeze([
      'Pick or remember the pose you are matching',
      'Use the timer and previous-photo guide',
      'Set the date and pose before saving',
    ]),
    actionLabel: 'Open guided photo camera',
  });

  routes.push({
    key: 'camera',
    icon: 'camera-reverse-outline',
    eyebrow: 'Quick capture',
    title: 'Take a quick photo',
    body: 'Take a photo now, then set its date and pose before saving.',
    steps: Object.freeze([
      'Set the phone down at mid-torso height',
      'Keep the full body in frame',
      'Confirm date and pose before saving',
    ]),
    actionLabel: 'Take photo',
  });

  routes.push({
    key: 'library',
    icon: 'images-outline',
    eyebrow: 'Import',
    title: 'Import from photos',
    body: 'Add an existing photo, then set the correct date and pose.',
    steps: Object.freeze([
      'Choose the clearest full-body photo',
      'Set the real capture date',
      'Assign front, side, back or leave without a pose',
    ]),
    actionLabel: 'Choose from photos',
  });

  return routes;
}

export function buildProgressStudioHowItWorksCopy() {
  return [
    'Progress Photos keeps your physique photo sets in date order.',
    `Useful photo standard: ${SETUP_STANDARD.join(', ')}.`,
    `Photo set sequence: ${PROGRESS_SCAN_SEQUENCE.join(', ')}. A side photo helps comparison but is optional.`,
    `Avoid ${PROGRESS_STUDIO_AVOID.join(', ')}.`,
    'Volyume Score is our own progress read from repeatable photos. It shows a score, leanness band, progress signal, confidence and the reason confidence changed.',
    'If a set is not clear enough for a score, Volyume should still save it to the photo library.',
    'The coach may use broad trend direction as low-confidence context. It cannot use one photo as proof of readiness or a reason to make aggressive changes.',
    'Use progress photos once a week. Retake sooner only when you are fixing a poor photo set.',
  ].join('\n\n');
}

export function buildScanCaptureSubtitle(pose) {
  const guidance = getPoseCaptureGuidance(pose);
  return guidance.line;
}
