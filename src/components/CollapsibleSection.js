import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontSize, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// Shared collapsible section, extracted from MethodologyScreen (U-B-1 §3) and
// generalised: renders `children` when given, otherwise the legacy `body`
// string. The header carries a ≥44px tap target and an accessibility
// expanded-state so the disclosure is screen-reader navigable.
export default function CollapsibleSection({ title, body, open, onToggle, children }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.section, live.section]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
      >
        <Text maxFontSizeMultiplier={1.3} style={[styles.sectionTitle, live.sectionTitle]}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.textSecondary} />
      </TouchableOpacity>
      {open
        ? (children != null
          ? <View style={styles.sectionChildren}>{children}</View>
          : (body ? <Text maxFontSizeMultiplier={1.3} style={[styles.sectionBody, live.sectionBody]}>{body}</Text> : null))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // ≥44px header tap target (U-B-1 §5).
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  sectionTitle: { ...type.bodyStrong, color: colors.textPrimary, flex: 1, paddingRight: spacing.md },
  sectionBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22, marginTop: spacing.md },
  sectionChildren: { marginTop: spacing.md, gap: spacing.md },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
// sectionHeader/sectionChildren have no colour tokens.
function buildLiveStyles(t) {
  return {
    section: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    sectionTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sectionBody: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
  };
}
