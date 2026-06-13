import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius, type } from '../styles/theme';

// Shared collapsible section, extracted from MethodologyScreen (U-B-1 §3) and
// generalised: renders `children` when given, otherwise the legacy `body`
// string. The header carries a ≥44px tap target and an accessibility
// expanded-state so the disclosure is screen-reader navigable.
export default function CollapsibleSection({ title, body, open, onToggle, children }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {open
        ? (children != null
          ? <View style={styles.sectionChildren}>{children}</View>
          : (body ? <Text style={styles.sectionBody}>{body}</Text> : null))
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
