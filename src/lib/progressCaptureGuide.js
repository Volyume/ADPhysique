const SETUP_STANDARD = Object.freeze([
  'Camera at mid-torso height',
  'Full body visible from head to feet',
  'Same room, lighting and distance',
]);

export const PROGRESS_STUDIO_SETUP_STEPS = Object.freeze([
  Object.freeze({
    key: 'frame',
    title: 'Frame',
    copy: 'Head, feet, waist and shoulders visible. Leave a little space around your body.',
    icon: 'scan-outline',
  }),
  Object.freeze({
    key: 'lighting',
    title: 'Light',
    copy: 'Even front light, no backlighting, no deep shadows and no heavy pump lighting.',
    icon: 'sunny-outline',
  }),
  Object.freeze({
    key: 'repeat',
    title: 'Repeat',
    copy: 'Use the same room, distance, camera height and relaxed pose each time.',
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
  'If the setup drifts, save the photo and let the scan read wait.';

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
  title: 'Progress photo setup',
  line: 'Use the same room, lighting, distance and camera height each time.',
  checks: SETUP_STANDARD,
  avoid: Object.freeze(['mirrors', 'busy backgrounds', 'camera tilt']),
});

export function getPoseCaptureGuidance(pose) {
  return POSE_CAPTURE_GUIDANCE[pose] || DEFAULT_CAPTURE_GUIDANCE;
}

export function buildProgressStudioCapturePromptCopy() {
  return [
    'Choose how you want to add progress photos today. The aim is not a perfect pose. It is a fair photo you can compare later.',
    'Physique Scan is for a front and back relaxed sequence, with an optional side photo. It gives a leanness band, progress signal and confidence, not an exact body-fat percentage.',
    'Single guided photo is best when you are adding one missing pose or matching an older progress photo.',
    `Avoid ${PROGRESS_STUDIO_AVOID.join(', ')}.`,
    QUALITY_FIRST_CAPTURE_NOTE,
    'Photos stay on this device unless you choose to share or export them.',
  ].join('\n\n');
}

export function buildProgressStudioCaptureRoutes({
  latestPartial = null,
  canScan = true,
  readOnly = false,
} = {}) {
  if (readOnly) return [];

  const routes = [];
  const missingPoseLabel = latestPartial?.nextPoseLabel || latestPartial?.missingPoseLabel || null;

  if (latestPartial?.nextPose && missingPoseLabel) {
    routes.push({
      key: 'complete_latest',
      icon: 'checkmark-circle-outline',
      eyebrow: 'Best next',
      title: 'Finish latest photo set',
      body: `Add the ${missingPoseLabel.toLowerCase()} photo so this date has a fuller front, side and back record.`,
      bestFor: 'Finishing an in-progress progress photo set.',
      steps: Object.freeze([
        `Capture ${missingPoseLabel} relaxed`,
        'Match the same room, distance and camera height',
        'Save the pose before comparing this photo set',
      ]),
      actionLabel: `Complete with ${missingPoseLabel}`,
      recommended: true,
    });
  }

  routes.push({
    key: 'scan',
    icon: 'scan',
    eyebrow: latestPartial?.nextPose ? 'Flagship' : 'Best next',
    title: 'Physique Scan',
    body: 'Front and back relaxed photos, with an optional side photo.',
    bestFor: 'Leanness band, progress signal and scan confidence. Not an exact body-fat percentage.',
    steps: PROGRESS_SCAN_SEQUENCE,
    actionLabel: 'Start Physique Scan',
    recommended: !latestPartial?.nextPose,
    disabled: !canScan,
    disabledReason: 'Sign in to save a guided scan.',
  });

  routes.push({
    key: 'guided',
    icon: 'camera-outline',
    eyebrow: 'Guided photo',
    title: 'Single guided photo',
    body: 'Use the ghost overlay and timer to match an older pose.',
    bestFor: 'Replacing a poor photo or adding one missing pose.',
    steps: Object.freeze([
      'Pick or remember the pose you are matching',
      'Use the timer and ghost overlay',
      'Set the date and pose before saving',
    ]),
    actionLabel: 'Open guided camera',
  });

  routes.push({
    key: 'camera',
    icon: 'camera-reverse-outline',
    eyebrow: 'Quick capture',
    title: 'Take normal photo',
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
    title: 'Import from library',
    body: 'Add an existing photo, then set the correct date and pose.',
    bestFor: 'Adding older progress photos without losing the timeline.',
    steps: Object.freeze([
      'Choose the clearest full-body photo',
      'Set the real capture date',
      'Assign front, side, back or leave unposed',
    ]),
    actionLabel: 'Choose from library',
  });

  return routes;
}

export function buildProgressStudioHowItWorksCopy() {
  return [
    'Progress Photos helps you keep a private visual record of your physique without pretending every photo is perfect evidence.',
    `Useful photo standard: ${SETUP_STANDARD.join(', ')}.`,
    `Physique Scan sequence: ${PROGRESS_SCAN_SEQUENCE.join(', ')}. A side photo helps comparison but is optional.`,
    `Avoid ${PROGRESS_STUDIO_AVOID.join(', ')}.`,
    'Physique Scan can show a leanness band, visual progress signal, scan confidence, and why confidence changed. It is not a body-fat percentage.',
    'If the setup is not reliable enough, Volyume should save the photos but withhold the scan read rather than guess.',
    'The coach may use broad trend direction as low-confidence context. It cannot use one photo as proof of body fat, hydration, or readiness.',
    'Use progress photos weekly or every couple of weeks. Daily scanning is not needed.',
  ].join('\n\n');
}

export function buildScanCaptureSubtitle(pose) {
  const guidance = getPoseCaptureGuidance(pose);
  return `${guidance.title}: set the phone down, use the timer, and match the same frame each time. ${QUALITY_FIRST_CAPTURE_NOTE}`;
}
