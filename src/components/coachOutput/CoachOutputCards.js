import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '../Card';
import SectionLabel from '../SectionLabel';
import InfoTooltip from '../InfoTooltip';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, type, iconSize } from '../../styles/theme';

// L04-11: an optional `tooltip` string reuses the same InfoTooltip + glossary
// pattern already shipped on 26 other files (BodyMetricsScreen, EngineLog,
// LiftProgressScreen, etc). Undefined by default, so every existing caller
// (LedgerCard's "What worked"/"Needs attention", the held-decisions header)
// renders exactly as before.
export function SectionHeader({ title, tooltip }) {
  if (!tooltip) return <SectionLabel style={styles.sectionHeader}>{title}</SectionLabel>;
  return (
    <View style={styles.sectionHeaderRow}>
      <SectionLabel style={styles.sectionHeaderInline}>{title}</SectionLabel>
      <InfoTooltip text={tooltip} size={13} />
    </View>
  );
}

export function StatChip({ icon, iconColor, label, value, valueColor, tooltip }) {
  return (
    <View style={styles.statChip}>
      {icon ? (
        <Ionicons name={icon} size={15} color={iconColor ?? colors.textSecondary} />
      ) : null}
      <Text style={[styles.statChipValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      {label ? <Text style={styles.statChipLabel}>{label}</Text> : null}
      {tooltip ? <InfoTooltip text={tooltip} size={12} /> : null}
    </View>
  );
}

export function LedgerCard({ working, off }) {
  const hasWorking = working && working.length > 0;
  const hasOff = off && off.length > 0;
  if (!hasWorking && !hasOff) return null;
  return (
    <Card style={styles.card}>
      {hasWorking ? (
        <View>
          <SectionHeader title="What worked" />
          <View style={styles.bulletList}>
            {working.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark" size={15} color={colors.success} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {hasOff ? (
        <View>
          <SectionHeader title="Needs attention" />
          <View style={styles.bulletList}>
            {off.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="remove" size={15} color={colors.warning} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export function WhyBlock({ text, onLearnMore }) {
  return (
    <View style={styles.whyBlock}>
      <Text style={styles.whyLabel}>Why this week:</Text>
      <Text style={styles.whyText}>{text}</Text>
      {onLearnMore ? (
        <TouchableOpacity
          style={styles.link44}
          onPress={onLearnMore}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Understand how this decision was made"
        >
          <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.textSecondary} />
          <Text style={styles.whyLearnMore}>Understand how this decision was made</Text>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function RapidLossAlert() {
  return (
    <View style={styles.rapidLossCard}>
      <View style={styles.rapidLossHeader}>
        <Ionicons name="warning-outline" size={18} color={colors.error} />
        <Text style={styles.rapidLossTitle}>Weight dropping quickly</Text>
      </View>
      <Text style={styles.rapidLossBody}>
        Your weight is falling more than 1.5% of your body weight per week and your energy is low. Losing at this rate risks losing muscle alongside fat and makes training harder. Eating a little more this week protects muscle while you lose.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.xs,
  },
  sectionHeaderInline: {
    marginBottom: 0,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statChipValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statChipLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletIcon: {
    marginTop: spacing.xxs,
  },
  bulletText: {
    ...type.body,
    flex: 1,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  whyBlock: {
    flexDirection: 'column',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  whyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  whyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  whyLearnMore: {
    ...type.label,
    color: colors.textSecondary,
    flex: 1,
  },
  link44: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    justifyContent: 'space-between',
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  rapidLossCard: {
    backgroundColor: colors.errorBg ?? colors.warningBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.error, 0.314),
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rapidLossHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rapidLossTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  rapidLossBody: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 21,
  },
});
