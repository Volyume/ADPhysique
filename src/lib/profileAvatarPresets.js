export const AVATAR_PRESETS = Object.freeze([
  Object.freeze({ key: 'volyume_lift', label: 'Strength', icon: 'barbell-outline' }),
  Object.freeze({ key: 'volyume_physique', label: 'Physique', icon: 'body-outline' }),
  Object.freeze({ key: 'volyume_consistency', label: 'Consistency', icon: 'calendar-outline' }),
  Object.freeze({ key: 'volyume_progress', label: 'Progress', icon: 'trending-up-outline' }),
]);

export function avatarPresetFor(key) {
  return AVATAR_PRESETS.find((preset) => preset.key === key) || AVATAR_PRESETS[0];
}
