import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, radius, type, circle, withAlpha, alpha, motion } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { avatarPresetFor } from '../lib/profileAvatarPresets';
import useAppStore from '../store/useAppStore';

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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const preset = presetKey ? avatarPresetFor(presetKey) : null;
  const accent = t.colors[preset?.tone || 'primary'] || t.colors.primary;
  const borderColor = selected ? t.colors.primary : withAlpha(accent, alpha.edge);
  const baseStyle = [
    styles.avatar,
    {
      width: size,
      height: size,
      borderRadius: circle(size),
      borderColor,
      backgroundColor: preset ? withAlpha(accent, alpha.tint) : t.colors.primaryBg,
    },
    style,
  ];
  const iconSize = Math.max(20, Math.round(size * 0.38));
  const badgeSize = Math.max(20, Math.round(size * 0.34));

  if (avatarUri) {
    return (
      <View style={baseStyle}>
        <Image
          source={{ uri: avatarUri }}
          style={styles.image}
          contentFit="cover"
          transition={reduceMotion ? 0 : motion.state}
        />
        {editable ? (
          <View style={[styles.badge, live.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: t.colors.primaryFill }]}>
            <Ionicons name="camera-outline" size={Math.max(12, Math.round(size * 0.17))} color={t.colors.onPrimary} />
          </View>
        ) : null}
      </View>
    );
  }

  if (preset) {
    return (
      <View style={baseStyle}>
        <Ionicons name={preset.icon} size={iconSize} color={accent} />
        <View style={[styles.badge, live.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: selected ? t.colors.primary : t.colors.surface }]}>
          <Ionicons
            name={selected ? 'checkmark' : preset.badgeIcon}
            size={Math.max(12, Math.round(size * 0.17))}
            color={selected ? t.colors.onPrimary : accent}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={baseStyle}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.initial, live.initial, { fontSize: Math.round(size * 0.34) }]}>{initialFor(displayName)}</Text>
      {editable ? (
        <View style={[styles.badge, live.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: t.colors.primaryFill }]}>
          <Ionicons name="camera-outline" size={Math.max(12, Math.round(size * 0.17))} color={t.colors.onPrimary} />
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

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. `avatar`/`image` carry no colour tokens
// of their own (borderColor/backgroundColor are supplied inline per call, see
// baseStyle above).
function buildLiveStyles(t) {
  return {
    initial: { ...t.type.h3, color: t.colors.primary },
    badge: { borderColor: t.colors.surface },
  };
}
