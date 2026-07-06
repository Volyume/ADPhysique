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

const TYPE_KEYS = new Set(SHARE_WIN_TYPES.map((type) => type.key));

export function isValidShareWinType(key) {
  return TYPE_KEYS.has(key);
}

export function shareWinTypeByKey(key) {
  return SHARE_WIN_TYPES.find((type) => type.key === key) || null;
}
