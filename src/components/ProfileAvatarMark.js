import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, radius, type, circle, withAlpha, alpha } from '../styles/theme';
import { avatarPresetFor } from '../lib/profileAvatarPresets';

function initialFor(displayName) {
  const first = String(displayName || 'Athlete').trim()[0];
  return (first || 'A').toUpperCase();
}

export default function ProfileAvatarMark({
  avatarUri,
  presetKey,
  displayName,
  size = 56,
  editable = false,
  selected = false,
  style,
}) {
  const preset = presetKey ? avatarPresetFor(presetKey) : null;
  const accent = colors[preset?.tone || 'primary'] || colors.primary;
  const borderColor = selected ? colors.primary : withAlpha(accent, alpha.edge);
  const baseStyle = [
    styles.avatar,
    {
      width: size,
      height: size,
      borderRadius: circle(size),
      borderColor,
      backgroundColor: preset ? withAlpha(accent, alpha.tint) : colors.primaryBg,
    },
    style,
  ];
  const iconSize = Math.max(20, Math.round(size * 0.38));
  const badgeSize = Math.max(20, Math.round(size * 0.34));

  if (avatarUri) {
    return (
      <View style={baseStyle}>
        <Image source={{ uri: avatarUri }} style={styles.image} />
        {editable ? (
          <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: colors.primaryFill }]}>
            <Ionicons name="camera-outline" size={Math.max(12, Math.round(size * 0.17))} color={colors.onPrimary} />
          </View>
        ) : null}
      </View>
    );
  }

  if (preset) {
    return (
      <View style={baseStyle}>
        <Ionicons name={preset.icon} size={iconSize} color={accent} />
        <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: selected ? colors.primary : colors.surface }]}>
          <Ionicons
            name={selected ? 'checkmark' : preset.badgeIcon}
            size={Math.max(12, Math.round(size * 0.17))}
            color={selected ? colors.onPrimary : accent}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={baseStyle}>
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.34) }]}>{initialFor(displayName)}</Text>
      {editable ? (
        <View style={[styles.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: colors.primaryFill }]}>
          <Ionicons name="camera-outline" size={Math.max(12, Math.round(size * 0.17))} color={colors.onPrimary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  initial: { ...type.h3, color: colors.primary, fontWeight: fontWeight.black },
  badge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: radius.full,
  },
});
