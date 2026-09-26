import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '../Card';
import SectionLabel from '../SectionLabel';
import InfoTooltip from '../InfoTooltip';
import Button from '../Button';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, type, alpha, fontFamily } from '../../styles/theme';
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

// R2 cohesion (2026-09-26, founder order): every StatChip now renders in one
// identical treatment (icon textSecondary, value textPrimary via the role
// below) -- the per-call iconColor/valueColor props that used to colour-code
// the trend arrow and warn-tint the PR chip are gone, so the four chips on
// this screen can no longer drift apart in emphasis. The values and labels
// themselves are unchanged.
export function StatChip({ icon, label, value, tooltip }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.statChip, live.statChip]}>
      {icon ? (
        <Ionicons name={icon} size={15} color={t.colors.textSecondary} />
      ) : null}
      <Text style={[styles.statChipValue, live.statChipValue]}>
        {value}
      </Text>
      {label ? <Text style={[styles.statChipLabel, live.statChipLabel]}>{label}</Text> : null}
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
                <Text style={[styles.bulletText, live.bulletText]}>{item}</Text>
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
                <Text style={[styles.bulletText, live.bulletText]}>{item}</Text>
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
      {/* R2 cohesion (2026-09-26, founder order): a section heading is
          SectionLabel, default tone, everywhere on this screen -- "Why this
          week" is a label, not a sentence, so the colon is dropped too. */}
      <SectionLabel>Why this week</SectionLabel>
      <Text style={[styles.whyText, live.whyText]}>{text}</Text>
      {onLearnMore ? (
        <Button
          variant="secondary"
          size="sm"
          icon="information-circle-outline"
          trailingIcon="chevron-forward"
          title="Understand how this decision was made"
          onPress={onLearnMore}
          accessibilityLabel="Understand how this decision was made"
        />
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
        <Text style={[styles.rapidLossTitle, live.rapidLossTitle]}>Weight dropping quickly</Text>
      </View>
      <Text style={[styles.rapidLossBody, live.rapidLossBody]}>
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
  // D86: borderless surface2 pill (the exercise-nav tab family). The old
  // surface + 1px border chrome matched the app's outlined BUTTONS (rest
  // -15/+15/Skip), so these read as tappable when they are pure stats.
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // R2 cohesion (2026-09-26): value/label now ride the shared type roles
  // (label/caption) instead of a hand-rolled size+weight pair.
  statChipValue: {
    ...type.label,
    color: colors.textPrimary,
  },
  statChipLabel: {
    ...type.caption,
    color: colors.textMuted,
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
  // R2 cohesion (2026-09-26): the "Why this week" label is a SectionLabel
  // now (see WhyBlock above), so whyLabel is gone; the body drops its
  // italic and reads as plain bodySm.
  whyText: {
    ...type.bodySm,
    color: colors.textSecondary,
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
    fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    color: colors.error,
  },
  rapidLossBody: {
    ...type.bodySm,
    color: colors.textPrimary,
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
    statChip: { backgroundColor: t.colors.surface2 },
    statChipValue: { ...t.type.label, color: t.colors.textPrimary },
    statChipLabel: { ...t.type.caption, color: t.colors.textMuted },
    bulletText: { ...t.type.body, color: t.colors.textPrimary },
    whyText: { ...t.type.bodySm, color: t.colors.textSecondary },
    rapidLossCard: {
      backgroundColor: t.colors.errorBg ?? t.colors.warningBg,
      borderColor: withAlpha(t.colors.error, alpha.mid),
    },
    rapidLossTitle: { fontSize: t.fontSize.sm, color: t.colors.error },
    rapidLossBody: { ...t.type.bodySm, color: t.colors.textPrimary },
  };
}
