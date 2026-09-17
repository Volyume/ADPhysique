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
  // D187: the glyph is the identity and draws in ink; no borrowed state colour.
  // Lead visual review 2026-09-06, ruling V5: an unselected preset's ring is
  // neutral (`border` at `alpha.edge`), never the preset's own accent (the
  // accent then lived in the glyph; D187 retired it). D174 A4 then took the selected ring off the
  // accent too: choosing an avatar in a picker is A2's category, so the
  // selected ring is `borderLight`, exactly as AthleteProfileScreen's own
  // preset tile now draws it.
  const borderColor = selected ? t.colors.borderLight : withAlpha(t.colors.border, alpha.edge);
  const baseStyle = [
    styles.avatar,
    {
      width: size,
      height: size,
      borderRadius: circle(size),
      borderColor,
      // D174 A4 / §3.2: no tint behind the glyph, whichever branch renders.
      backgroundColor: t.colors.surface2,
    },
    style,
  ];
  // Founder defect 2026-09-14 ("it looks rubbish"): both of these floored
  // at 20 dp, so a 24 dp avatar in a cohort stack drew a 20 dp glyph AND a
  // 20 dp badge inside a 24 dp disc with a 2 dp ring -- an unreadable blob
  // rather than a person. The floor now scales with the mark, so the look
  // at 40 dp and above is byte-identical to before and only the small
  // sizes are fixed. The preset badge is a PICKER affordance (it shows the
  // category, or the selection tick); on a list row at 32 dp or less it is
  // decoration covering the glyph, so it renders only where it can be read.
  const iconSize = Math.max(Math.round(size * 0.38), Math.min(20, Math.round(size * 0.5)));
  const badgeSize = Math.max(Math.round(size * 0.34), Math.min(20, Math.round(size * 0.42)));
  const showBadge = selected || editable || size >= 40;

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
          <View style={[styles.badge, live.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: t.colors.surface3 }]}>
            <Ionicons name="camera-outline" size={Math.max(12, Math.round(size * 0.17))} color={t.colors.textPrimary} />
          </View>
        ) : null}
      </View>
    );
  }

  if (preset) {
    return (
      <View style={baseStyle}>
        <Ionicons name={preset.icon} size={iconSize} color={t.colors.textPrimary} />
        {showBadge ? (
          <View style={[styles.badge, live.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: selected ? t.colors.surface3 : t.colors.surface }]}>
            <Ionicons
              name={selected ? 'checkmark' : preset.badgeIcon}
              size={Math.max(10, Math.round(badgeSize * 0.6))}
              color={selected ? t.colors.textPrimary : t.colors.textSecondary}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={baseStyle}>
      <Text style={[styles.initial, live.initial, { fontSize: Math.round(size * 0.34) }]}>{initialFor(displayName)}</Text>
      {editable ? (
        <View style={[styles.badge, live.badge, { width: badgeSize, height: badgeSize, borderRadius: circle(badgeSize), backgroundColor: t.colors.surface3 }]}>
          <Ionicons name="camera-outline" size={Math.max(12, Math.round(size * 0.17))} color={t.colors.textPrimary} />
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
  initial: { ...type.h3, color: colors.textPrimary, fontWeight: fontWeight.black },
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
    initial: { ...t.type.h3, color: t.colors.textPrimary },
    badge: { borderColor: t.colors.surface },
  };
}
