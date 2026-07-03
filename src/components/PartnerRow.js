/**
 * PartnerRow — the slim training-partner status row on ConsistencyScreen
 * (NEW-002 rebuild, bp-partner-system-rebuild.md). One line that says where
 * the pair stands and opens PartnerScreen; all interaction lives there.
 * Derived signals only; a resting partner never reads as a fail.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, fontSize, fontWeight, type, circle } from '../styles/theme';
import usePartners from '../hooks/usePartners';
import { partnerRowLine } from '../lib/partners/signals';

export default function PartnerRow({ userId, tier, onOpen }) {
  const p = usePartners(userId, tier);
  if (p.loading) return null;

  const partnerName = p.partnership?.partnerFirstName || 'Your partner';
  const line = partnerRowLine({ rowState: p.rowState, partnerName, partnerWeek: p.partnerWeek });

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Training partner. ${line}`}
    >
      <Ionicons name="people-outline" size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Training partner</Text>
        <Text style={styles.line} numberOfLines={1}>{line}</Text>
      </View>
      {p.lastReceived && (p.rowState === 'active' || p.rowState === 'resting') ? (
        <View style={styles.cheerDot}>
          <Ionicons name="hand-left" size={12} color={colors.primary} />
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56,
  },
  title: { ...type.label, color: colors.textSecondary },
  line: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: spacing.hair },
  cheerDot: {
    width: 24, height: 24, borderRadius: circle(24), alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
});
