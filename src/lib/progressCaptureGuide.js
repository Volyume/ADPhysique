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
  'If the photo is not clear enough, save it as a progress photo instead of forcing a visual index.';

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
    'Take new photos or import existing ones. Both routes save a dated photo set to your private library.',
    'Clear front and back photos can receive a Volyume visual index, leanness band, progress signal and confidence. It is not a body fat estimate.',
    'Use the same room, light, distance and camera height each time. Side is optional.',
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
      body: `Keep the latest date together by adding its missing ${missingPoseLabel.toLowerCase()} photo.`,
      bestFor: 'Adds to the existing date.',
      actionLabel: `Add missing photo: Add ${missingPoseLabel} photo`,
      recommended: true,
    });
  }

  if (includeScan) {
    routes.push({
      key: 'scan',
      icon: 'scan',
      eyebrow: 'New set',
      title: 'Take a new photo set',
      body: 'Guided front and back photos. Side is optional. Clear sets can receive a visual index.',
      bestFor: 'Best for today\'s progress check.',
      actionLabel: 'Start photo set',
      recommended: !latestPartial?.nextPose,
      disabled: !canScan,
      disabledReason: 'Sign in to save a photo set.',
    });
    routes.push({
      key: 'scan_library',
      icon: 'images-outline',
      eyebrow: 'Existing set',
      title: 'Import a photo set',
      body: 'Choose existing front and back photos, set the real date, and save them to the same library.',
      bestFor: 'Best for older photos.',
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
      bestFor: 'Adding the missing photo for the same date.',
      steps: Object.freeze([
        `Capture ${missingPoseLabel} relaxed`,
        'Match the same room, distance and camera height',
        'Save the pose before comparing this photo set',
      ]),
      actionLabel: `Add ${missingPoseLabel} photo`,
      recommended: true,
    });
  }

  routes.push({
    key: 'guided',
    icon: 'camera-outline',
    eyebrow: 'Guided photo',
    title: 'Guided single photo',
    body: 'Use the guide on screen and the timer to match an older photo.',
    bestFor: 'Replacing a poor photo or adding one missing pose.',
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
    bestFor: 'Fast capture when you do not need the overlay.',
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
    bestFor: 'Adding older photos in the right order.',
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
    'Progress Photos helps you keep private physique photos in date order.',
    `Useful photo standard: ${SETUP_STANDARD.join(', ')}.`,
    `Photo set sequence: ${PROGRESS_SCAN_SEQUENCE.join(', ')}. A side photo helps comparison but is optional.`,
    `Avoid ${PROGRESS_STUDIO_AVOID.join(', ')}.`,
    'Volyume visual index is our own visual progress measure. It can show a leanness band, progress signal, confidence, and why that confidence changed. It is not a body fat estimate.',
    'If the photo is not clear enough, Volyume should save it as a progress photo instead of guessing.',
    'The coach may use broad trend direction as low-confidence context. It cannot use one photo as proof of body fat, hydration, or readiness.',
    'Use progress photos weekly or every couple of weeks. Daily scanning is not needed.',
  ].join('\n\n');
}

export function buildScanCaptureSubtitle(pose) {
  const guidance = getPoseCaptureGuidance(pose);
  return guidance.line;
}
