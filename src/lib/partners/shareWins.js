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
    shared: 'Only the image or card you deliberately export.',
    private: 'Progress photos, scan details and body metrics stay private by default.',
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
  'Future delivery must support revoke and delete.',
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
  'scanScore',
]);

const TYPE_KEYS = new Set(SHARE_WIN_TYPES.map((type) => type.key));
const FORBIDDEN_FIELD_SET = new Set(SHARE_WIN_FORBIDDEN_FIELDS);

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
    const label = cleanText(safePayload.label || 'Progress card', 64);
    return baseDraft(
      typeKey,
      'Progress card',
      label,
      'Only the deliberately exported card can be sent. Scan details, body metrics and the photo library stay private.',
      { requiresExport: true },
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
