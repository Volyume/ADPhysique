const SETUP_STANDARD = Object.freeze([
  'Camera at mid-torso height',
  'Full body visible from head to feet',
  'Same room, lighting and distance',
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
  title: 'Studio setup',
  line: 'Use the same room, lighting, distance and camera height each time.',
  checks: SETUP_STANDARD,
  avoid: Object.freeze(['mirrors', 'busy backgrounds', 'camera tilt']),
});

export function getPoseCaptureGuidance(pose) {
  return POSE_CAPTURE_GUIDANCE[pose] || DEFAULT_CAPTURE_GUIDANCE;
}

export function buildProgressStudioCapturePromptCopy() {
  return [
    'Choose a capture route. The standard is simple: same room, same lighting, same camera height, same distance.',
    'Physique Scan is for a front and back relaxed sequence, with an optional side photo. It gives a leanness band, progress signal and confidence, not an exact body-fat percentage.',
    'Single guided photo is best when you are completing a missing pose or matching an older photo.',
    `Avoid ${PROGRESS_STUDIO_AVOID.join(', ')}.`,
    'Photos stay on this device unless you choose to share or export them.',
  ].join('\n\n');
}

export function buildProgressStudioHowItWorksCopy() {
  return [
    'Build a private visual baseline with repeatable check-ins.',
    `Studio standard: ${SETUP_STANDARD.join(', ')}.`,
    `Physique Scan sequence: ${PROGRESS_SCAN_SEQUENCE.join(', ')}. A side photo improves like-for-like comparison but is optional.`,
    `Avoid ${PROGRESS_STUDIO_AVOID.join(', ')}.`,
    'Physique Scan can show a leanness band, visual progress signal, scan confidence, and why confidence changed. It is not a body-fat percentage.',
    'If the setup is not reliable enough, Volyume should save the photos but withhold the scan read rather than guess.',
    'The coach may use broad trend direction as low-confidence context. It cannot use one photo as proof of body fat, hydration, or readiness.',
    'Use check-ins weekly or every couple of weeks. Daily scanning is not needed.',
  ].join('\n\n');
}

export function buildScanCaptureSubtitle(pose) {
  const guidance = getPoseCaptureGuidance(pose);
  return `${guidance.title}: set the phone down, use the timer, and match the same frame each time.`;
}
