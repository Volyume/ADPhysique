/**
 * BackHeader
 *
 * The standard header for pushed / modal screens: a back chevron on the
 * left, the screen title, and an optional action on the right. Top-level
 * tab screens use ScreenHeader (title + compact Volyume V) instead; this
 * is its sibling for everything you navigate INTO.
 *
 * Extracted to kill ~16 hand-rolled copies that had drifted apart (some
 * titles rendered at fontSize.lg/semibold, others at md/bold), which read
 * as an unfinished, templated app. One definition, one look.
 *
 * Props:
 *   title    string, required.
 *   onBack   optional; defaults to navigation.goBack().
 *   right    optional node rendered on the right (e.g. an add button). A
 *            fixed-width spacer is rendered when absent so the title stays
 *            optically centred against the back chevron.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { spacing, hitSlop } from '../styles/theme';
import useTheme from '../hooks/useTheme';

const SIDE_WIDTH = 44;

export default function BackHeader({ title, onBack, right }) {
  // CP-10 stage 1: live theme instead of the static colors/type imports —
  // one of the three sanctioned screen chrome shapes (docs/rules/
  // styling.md), so this covers navigation-adjacent chrome for every pushed
  // / modal screen at once.
  const t = useTheme();
  // useNavigation throws when rendered outside a navigation container
  // (e.g. some isolated mount tests). Guard it so the header degrades to
  // a no-op back rather than crashing the screen; real screens always
  // have a navigator, and an explicit onBack takes precedence anyway.
  let navigation = null;
  // Deliberate single-hook guard (see comment above): the call order is
  // consistent for any given mount, so rules-of-hooks does not apply here.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  try { navigation = useNavigation(); } catch (_) { navigation = null; }
  const goBack = onBack ?? (() => navigation?.goBack?.());
  return (
    <View style={[styles.header, { borderBottomColor: t.colors.borderSubtle }]}>
      <TouchableOpacity
        onPress={goBack}
        hitSlop={hitSlop}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={t.colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.title, { ...t.type.title, color: t.colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right ?? null}</View>
    </View>
  );
}

// Layout-only (theme-invariant): border colour / text colour / type role now
// come from the live theme per-render above (CP-10 stage 1) so BackHeader
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
  backButton: {
    width: SIDE_WIDTH,
    minHeight: SIDE_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  // Matches the 24px back chevron so the title sits optically centred.
  right: { minWidth: SIDE_WIDTH, alignItems: 'flex-end', justifyContent: 'center' },
});
