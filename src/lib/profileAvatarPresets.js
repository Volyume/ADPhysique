// D187: no `tone`. The glyph is the identity and draws in ink; the six keys,
// labels and icons are a persisted, synced contract and do not change.
export const AVATAR_PRESETS = Object.freeze([
  Object.freeze({ key: 'volyume_lift', label: 'Strength', icon: 'barbell-outline', badgeIcon: 'flash-outline' }),
  Object.freeze({ key: 'volyume_physique', label: 'Physique', icon: 'body-outline', badgeIcon: 'camera-outline' }),
  Object.freeze({ key: 'volyume_consistency', label: 'Consistency', icon: 'calendar-outline', badgeIcon: 'checkmark-circle-outline' }),
  Object.freeze({ key: 'volyume_progress', label: 'Progress', icon: 'trending-up-outline', badgeIcon: 'analytics-outline' }),
  Object.freeze({ key: 'volyume_power', label: 'Power', icon: 'flash-outline', badgeIcon: 'speedometer-outline' }),
  Object.freeze({ key: 'volyume_conditioning', label: 'Conditioning', icon: 'pulse-outline', badgeIcon: 'stopwatch-outline' }),
]);

export function avatarPresetFor(key) {
  return AVATAR_PRESETS.find((preset) => preset.key === key) || AVATAR_PRESETS[0];
}
