import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, hitSlop } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { touchTarget } from '../styles/layout';

/**
 * ModalHeader: the sanctioned chrome for a full-screen modal (docs/rules/
 * styling.md, the header trio). Close X on `closePosition`, the title
 * centred, an optional accessory on the other side.
 *
 * Additive props (D220 addendum 14, the logger as a modal screen):
 *   subtitle      a string, or a node, drawn centred under the title at the
 *                 bodySm muted role (ScreenHeader's subtitle role)
 *   closeLabel    the close control's spoken name (default "Close")
 *   closeTestID   a test id for the close control
 *   balanced      true centres the title on the SCREEN when the accessory
 *                 is wider than the close slot (two header glyphs): both
 *                 sides share the free width equally and the title keeps
 *                 its own. Off by default, so every existing modal is
 *                 unchanged.
 */
function CloseButton({ onClose, style, iconColor, label, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={style}
      onPress={onClose}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="close" size={24} color={iconColor} />
    </TouchableOpacity>
  );
}

export default function ModalHeader({
  title, subtitle = null, onClose, closePosition = 'right', rightAccessory = null, closeLabel = 'Close', closeTestID,
  balanced = false,
}) {
  // CP-10 stage 1: live theme instead of the static colors/type imports —
  // one of the three sanctioned screen chrome shapes (docs/rules/
  // styling.md), so this covers modal chrome for every screen at once.
  const t = useTheme();
  // The close control is always a 48 dp box with its glyph centred, so a
  // glyph on either edge sits 12 dp in from the margin on both sides.
  const closeBox = (
    <CloseButton onClose={onClose} style={styles.side} iconColor={t.colors.textPrimary} label={closeLabel} testID={closeTestID} />
  );
  const closeButton = balanced
    ? <View style={[styles.sideBalanced, closePosition === 'left' ? styles.sideStart : styles.sideEnd]}>{closeBox}</View>
    : closeBox;
  const rightSlot = rightAccessory
    ? <View style={[styles.accessory, balanced && styles.sideBalanced]}>{rightAccessory}</View>
    : <View style={[styles.side, balanced && styles.sideBalanced]} />;
  const sub = subtitle == null || subtitle === '' ? null
    : (typeof subtitle === 'string'
      ? <Text style={[styles.subtitle, { ...t.type.bodySm, color: t.colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
      : subtitle);

  return (
    <View style={[styles.header, { borderBottomColor: t.colors.borderSubtle }]}>
      {closePosition === 'left' ? closeButton : <View style={styles.side} />}
      <View style={[styles.centre, balanced && styles.centreBalanced]}>
        <Text style={[styles.title, { ...t.type.title, color: t.colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {sub}
      </View>
      {closePosition === 'left' ? rightSlot : closeButton}
    </View>
  );
}

// Layout-only (theme-invariant): border colour / text colour / type role now
// come from the live theme per-render above (CP-10 stage 1) so ModalHeader
// follows a theme flip with no restart.
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: touchTarget.minimum,
    minHeight: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  // Balanced: the sides grow equally and the centre keeps its own width.
  centreBalanced: { flex: 0, flexShrink: 1 },
  sideBalanced: { flex: 1, flexBasis: 0 },
  sideStart: { alignItems: 'flex-start' },
  sideEnd: { alignItems: 'flex-end' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  // An accessory wider than the close slot (two header glyphs) keeps its
  // own width; the title centres in what is left.
  accessory: { minWidth: touchTarget.minimum, minHeight: touchTarget.minimum, alignItems: 'flex-end', justifyContent: 'center' },
});
