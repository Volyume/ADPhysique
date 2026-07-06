export const SHARE_WIN_TYPES = Object.freeze([
  Object.freeze({
    key: 'workout_summary',
    title: 'Workout summary',
    shared: 'Workout name, date and completed status.',
    private: 'Exercises, sets, reps, loads, notes and effort stay private unless that card asks again.',
  }),
  Object.freeze({
    key: 'personal_record',
    title: 'Personal record',
    shared: 'The lift name and the record you choose to celebrate.',
    private: 'Your wider lift history and other records stay private.',
  }),
  Object.freeze({
    key: 'block_milestone',
    title: 'Block milestone',
    shared: 'The block name and milestone you choose to share.',
    private: 'Programme contents, exercise selection and loading stay private.',
  }),
  Object.freeze({
    key: 'progress_card',
    title: 'Progress card',
    shared: 'The composed progress card image, with only the details shown in its export receipt.',
    private: 'Raw photos, the photo library, unexported scan details and body metrics stay private.',
  }),
]);

export const SHARE_WIN_POLICY = Object.freeze({
  defaultState: 'Ask every time',
  summary: 'Partner wins are off by default. A partner only sees the win card you choose to send.',
  excluded: 'No passive feed, leaderboard, workout history browsing, food diary, coach notes, body metrics or automatic photo sharing.',
});

export const SHARE_WIN_CARD_RULES = Object.freeze([
  'Ask every time before a card is sent.',
  'One card, one moment, one partner.',
  'The card never opens workout history, food diary, coach notes, body metrics or photos.',
  'A sent card can be deleted by the sender.',
]);

export const SHARE_WIN_DELIVERY_GUARDRAILS = Object.freeze([
  'Preview the exact card before sending.',
  'Confirm the one partner who will receive it.',
  'Send one card only. No background feed is created.',
  'Keep the sender delete control attached to the card.',
]);

export const SHARE_WIN_REVIEW_STEPS = Object.freeze([
  Object.freeze({
    key: 'choose',
    title: 'Choose the moment',
    body: 'Pick one workout, record, block milestone or exported progress card.',
  }),
  Object.freeze({
    key: 'preview',
    title: 'Preview exact card',
    body: 'Show the exact title, summary and privacy receipt before anything leaves the device.',
  }),
  Object.freeze({
    key: 'partner',
    title: 'Confirm one partner',
    body: 'Send to one selected partner only. No feed, no audience and no automatic repeats.',
  }),
  Object.freeze({
    key: 'control',
    title: 'Keep control',
    body: 'Sent cards keep a delete control for the sender.',
  }),
]);

export const SHARE_WIN_FORBIDDEN_FIELDS = Object.freeze([
  'sets',
  'reps',
  'load',
  'loads',
  'weight',
  'bodyWeight',
  'calories',
  'macros',
  'food',
  'diary',
  'coachNotes',
  'bodyMetrics',
  'photoUri',
  'rawPhotoUri',
  'imageUri',
  'imageBase64',
  'scanScore',
]);

const TYPE_KEYS = new Set(SHARE_WIN_TYPES.map((type) => type.key));
const FORBIDDEN_FIELD_SET = new Set(SHARE_WIN_FORBIDDEN_FIELDS);
const EXAMPLE_PAYLOADS = Object.freeze({
  workout_summary: Object.freeze({
    workoutName: 'Upper body session',
    completedAt: 'chosen date',
  }),
  personal_record: Object.freeze({
    liftName: 'Bench press',
    recordLabel: 'New rep best',
  }),
  block_milestone: Object.freeze({
    blockName: 'Strength block',
    milestone: 'Block complete',
  }),
  progress_card: Object.freeze({
    label: 'Exported Progress Photos card',
    dateRange: 'selected dates',
    format: 'chosen export format',
    includesWeight: false,
    includesScanScore: true,
  }),
});

export function isValidShareWinType(key) {
  return TYPE_KEYS.has(key);
}

export function shareWinTypeByKey(key) {
  return SHARE_WIN_TYPES.find((type) => type.key === key) || null;
}

function cleanText(value, max = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanDate(value) {
  const text = cleanText(value, 32);
  return text || null;
}

function baseDraft(typeKey, title, summary, detail, extra = {}) {
  return Object.freeze({
    type: typeKey,
    title,
    summary,
    detail,
    defaultConsent: SHARE_WIN_POLICY.defaultState,
    privateReminder: shareWinTypeByKey(typeKey)?.private || '',
    ...extra,
  });
}

export function buildShareWinDraft(typeKey, payload = {}) {
  if (!isValidShareWinType(typeKey)) return null;
  const safePayload = payload && typeof payload === 'object' ? payload : {};

  if (typeKey === 'workout_summary') {
    const workoutName = cleanText(safePayload.workoutName || safePayload.name || 'Workout');
    const date = cleanDate(safePayload.completedAt || safePayload.date);
    return baseDraft(
      typeKey,
      'Workout complete',
      date ? `${workoutName} completed on ${date}.` : `${workoutName} completed.`,
      'Exercises, sets, reps, loads, notes and effort stay private.',
      { date },
    );
  }

  if (typeKey === 'personal_record') {
    const liftName = cleanText(safePayload.liftName || safePayload.exerciseName || 'A lift');
    const recordLabel = cleanText(safePayload.recordLabel || safePayload.record || 'New personal record', 64);
    return baseDraft(
      typeKey,
      'Personal record',
      `${liftName}: ${recordLabel}.`,
      'Only this chosen record is shared. Wider lift history stays private.',
    );
  }

  if (typeKey === 'block_milestone') {
    const blockName = cleanText(safePayload.blockName || 'Training block');
    const milestone = cleanText(safePayload.milestone || safePayload.milestoneLabel || 'Milestone reached', 64);
    return baseDraft(
      typeKey,
      'Block milestone',
      `${blockName}: ${milestone}.`,
      'Programme contents, exercise selection and loading stay private.',
    );
  }

  if (typeKey === 'progress_card') {
    const dateRange = cleanText(safePayload.dateRange || safePayload.range || '', 64);
    const format = cleanText(safePayload.format || safePayload.aspect || '', 32);
    const label = cleanText(safePayload.label || 'Progress photo card', 64);
    const includesScanScore = safePayload.includesScanScore === true;
    const includesWeight = safePayload.includesWeight === true;
    const summary = dateRange ? `${label}, ${dateRange}.` : `${label}.`;
    const detail = [
      'Only the composed export can be sent.',
      includesScanScore ? 'The visible scan score is part of that export.' : 'Scan details stay private unless they are visible on that export.',
      includesWeight ? 'Weight is included because it was switched on for that export.' : 'Weight is off for this export.',
      'Raw photos, body metrics and the photo library stay private.',
    ].join(' ');
    return baseDraft(
      typeKey,
      'Progress card',
      summary,
      detail,
      { requiresExport: true, dateRange: dateRange || null, format: format || null },
    );
  }

  return null;
}

export function shareWinDraftHasForbiddenFields(payload = {}) {
  if (!payload || typeof payload !== 'object') return false;
  return Object.keys(payload).some((key) => FORBIDDEN_FIELD_SET.has(key));
}

export function validateShareWinDraft(draft) {
  if (!draft || typeof draft !== 'object') return false;
  if (!isValidShareWinType(draft.type)) return false;
  if (!draft.title || !draft.summary || !draft.detail) return false;
  if (shareWinDraftHasForbiddenFields(draft)) return false;
  return draft.defaultConsent === SHARE_WIN_POLICY.defaultState;
}

export function buildShareWinPreview(typeKey, payload = {}) {
  const type = shareWinTypeByKey(typeKey);
  const draft = buildShareWinDraft(typeKey, payload);
  if (!type || !validateShareWinDraft(draft)) return null;
  return Object.freeze({
    type: type.key,
    status: 'Preview only',
    draft,
    shared: type.shared,
    private: type.private,
    confirmation: 'Not sent until you choose one partner and approve this exact card.',
    guardrails: SHARE_WIN_DELIVERY_GUARDRAILS,
  });
}

export function buildShareWinReviewReceipt(preview) {
  if (!preview || typeof preview !== 'object' || !validateShareWinDraft(preview.draft)) return null;
  return Object.freeze({
    title: 'Review before sending',
    status: preview.status,
    steps: SHARE_WIN_REVIEW_STEPS,
    visibleToPartner: preview.shared,
    remainsPrivate: preview.private,
    consentLine: preview.confirmation,
    finalCheck: 'Send controls show the partner name, card type and exact card copy on one screen.',
  });
}

function examplePayloadFor(typeKey, overrides = {}) {
  const override = overrides && typeof overrides === 'object' ? overrides[typeKey] : null;
  if (override && typeof override === 'object') return override;
  return EXAMPLE_PAYLOADS[typeKey];
}

export function buildShareWinExampleDrafts(overrides = {}) {
  return Object.freeze(SHARE_WIN_TYPES
    .map((type) => buildShareWinDraft(type.key, examplePayloadFor(type.key, overrides)))
    .filter(Boolean));
}

export function buildShareWinExamplePreviews(overrides = {}) {
  return Object.freeze(SHARE_WIN_TYPES
    .map((type) => buildShareWinPreview(type.key, examplePayloadFor(type.key, overrides)))
    .filter(Boolean));
}
