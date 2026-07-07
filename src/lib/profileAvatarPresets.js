export const AVATAR_PRESETS = Object.freeze([
  Object.freeze({ key: 'volyume_lift', label: 'Strength', icon: 'barbell-outline', badgeIcon: 'flash-outline', tone: 'primary' }),
  Object.freeze({ key: 'volyume_physique', label: 'Physique', icon: 'body-outline', badgeIcon: 'camera-outline', tone: 'macroFat' }),
  Object.freeze({ key: 'volyume_consistency', label: 'Consistency', icon: 'calendar-outline', badgeIcon: 'checkmark-circle-outline', tone: 'success' }),
  Object.freeze({ key: 'volyume_progress', label: 'Progress', icon: 'trending-up-outline', badgeIcon: 'analytics-outline', tone: 'macroCarb' }),
  Object.freeze({ key: 'volyume_power', label: 'Power', icon: 'flash-outline', badgeIcon: 'trophy-outline', tone: 'warning' }),
  Object.freeze({ key: 'volyume_conditioning', label: 'Conditioning', icon: 'pulse-outline', badgeIcon: 'stopwatch-outline', tone: 'error' }),
]);

export function avatarPresetFor(key) {
  return AVATAR_PRESETS.find((preset) => preset.key === key) || AVATAR_PRESETS[0];
}
