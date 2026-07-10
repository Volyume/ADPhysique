import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '../Card';
import SectionLabel from '../SectionLabel';
import InfoTooltip from '../InfoTooltip';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, type, iconSize, alpha } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

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
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.statChip, live.statChip]}>
      {icon ? (
        <Ionicons name={icon} size={15} color={iconColor ?? t.colors.textSecondary} />
      ) : null}
      <Text maxFontSizeMultiplier={1.3} style={[styles.statChipValue, live.statChipValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      {label ? <Text maxFontSizeMultiplier={1.3} style={[styles.statChipLabel, live.statChipLabel]}>{label}</Text> : null}
      {tooltip ? <InfoTooltip text={tooltip} size={12} /> : null}
    </View>
  );
}

export function LedgerCard({ working, off }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
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
                <Ionicons name="checkmark" size={15} color={t.colors.success} style={styles.bulletIcon} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.bulletText, live.bulletText]}>{item}</Text>
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
                <Ionicons name="remove" size={15} color={t.colors.warning} style={styles.bulletIcon} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.bulletText, live.bulletText]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export function WhyBlock({ text, onLearnMore }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.whyBlock}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.whyLabel, live.whyLabel]}>Why this week:</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.whyText, live.whyText]}>{text}</Text>
      {onLearnMore ? (
        <TouchableOpacity
          style={[styles.link44, live.link44]}
          onPress={onLearnMore}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Understand how this decision was made"
        >
          <Ionicons name="information-circle-outline" size={iconSize.sm} color={t.colors.textSecondary} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.whyLearnMore, live.whyLearnMore]}>Understand how this decision was made</Text>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function RapidLossAlert() {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.rapidLossCard, live.rapidLossCard]}>
      <View style={styles.rapidLossHeader}>
        <Ionicons name="warning-outline" size={18} color={t.colors.error} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.rapidLossTitle, live.rapidLossTitle]}>Weight dropping quickly</Text>
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[styles.rapidLossBody, live.rapidLossBody]}>
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
    borderColor: withAlpha(colors.error, alpha.mid),
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

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles -- each of
// StatChip/LedgerCard/WhyBlock/RapidLossAlert calls `const t = useTheme();
// const live = buildLiveStyles(t);` and appends `live.KEY` after `styles.KEY`
// in its own style arrays. SectionHeader has no colour tokens of its own
// (sectionHeader/sectionHeaderRow/sectionHeaderInline are layout-only), so it
// stays untouched -- there is nothing for it to unfreeze. card/bulletList/
// bulletRow/bulletIcon/actions have no colour tokens either.
function buildLiveStyles(t) {
  return {
    statChip: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    statChipValue: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    statChipLabel: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    bulletText: { ...t.type.body, color: t.colors.textPrimary },
    whyLabel: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    whyText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    whyLearnMore: { ...t.type.label, color: t.colors.textSecondary },
    link44: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    rapidLossCard: {
      backgroundColor: t.colors.errorBg ?? t.colors.warningBg,
      borderColor: withAlpha(t.colors.error, alpha.mid),
    },
    rapidLossTitle: { fontSize: t.fontSize.sm, color: t.colors.error },
    rapidLossBody: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
  };
}
