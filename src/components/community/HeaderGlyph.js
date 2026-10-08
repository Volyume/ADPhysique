/**
 * HeaderGlyph (D221 visual law V8): a glyph in a screen header. A 48 dp
 * target, the glyph in `textPrimary`, no container behind it (no circle, no
 * fill, no border). Pushed screens carry at most two of these in
 * `BackHeader`'s `right` slot. Never amber: an active state is a filled
 * glyph, not a colour.
 *
 * Props:
 *   icon     Ionicons name
 *   label    the accessibility label
 *   onPress
 */
import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../hooks/useTheme';
import { iconSize } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';

export default function HeaderGlyph({ icon, label, onPress }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={styles.glyph}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={iconSize.lg} color={t.colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glyph: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
