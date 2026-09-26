import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '../Card';
import InfoTooltip from '../InfoTooltip';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, type, alpha, fontFamily, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { touchTarget } from '../../styles/layout';

// The Coaching decision screen's parts (D206, founder order 2026-09-26:
// "Redesign it in line with the rest of the app"). Every part below is one
// of the app's own shapes, named where it comes from:
//
//   CardTitle     a card's name: type.title in the text colour.
//   WeekRow       one fact of the week, the Weekly check-in's summary-row
//                 grammar (a small grey glyph, the fact's name in the
//                 secondary colour, its value in the text colour, a
//                 status mark at the end), set at the app's row size.
//   TextRow       a statement with its reason under it: the Coach tab's
//                 NavRow grammar (title bodyStrong, one secondary line),
//                 with the small grey glyph of a row you cannot tap.
//   LinkRow       a quiet in-card link: glyph, label, chevron.
//
// Rows share one rule: a hairline between them, never around them; the
// card around a group is the shared Card primitive. An amber icon box is
// kept for rows that TAKE you somewhere (SettingRow), so amber keeps its
// meaning on this screen.
export function CardTitle({ title, tooltip }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!tooltip) return <Text style={[styles.cardTitle, live.cardTitle]}>{title}</Text>;
  return (
    <View style={styles.cardTitleRow}>
      <Text style={[styles.cardTitle, live.cardTitle]}>{title}</Text>
      <InfoTooltip text={tooltip} size={13} />
    </View>
  );
}

// The glyph and mark columns: an 18 dp icon with a little air.
const iconColumn = iconSize.md;

const MARK_ICON = Object.freeze({ good: 'checkmark-circle', attention: 'alert-circle' });
const MARK_WORD = Object.freeze({ good: 'on plan', attention: 'worth a look' });

/**
 * One fact of the week. `mark` is 'good' | 'attention' | null; the rows
 * builder (viewCopy.buildWeekRows) never marks a body-weight or a food row.
 */
export function WeekRow({ icon, label, value, mark = null, tooltip = null, first = false }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const markColour = mark === 'good' ? t.colors.success : t.colors.warning;
  return (
    <View
      style={[styles.row, !first && [styles.rowDivider, live.rowDivider]]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={[`${label}: ${value}`, mark ? MARK_WORD[mark] : null].filter(Boolean).join(', ')}
    >
      <Ionicons name={icon} size={18} color={t.colors.textSecondary} style={styles.rowGlyph} />
      <View style={styles.rowLabelWrap}>
        <Text style={[styles.rowLabel, live.rowLabel]} numberOfLines={1}>{label}</Text>
        {tooltip ? <InfoTooltip text={tooltip} size={13} /> : null}
      </View>
      <Text style={[styles.rowValue, live.rowValue]} numberOfLines={2}>{value}</Text>
      <View style={styles.rowMark}>
        {mark ? <Ionicons name={MARK_ICON[mark]} size={18} color={markColour} /> : null}
      </View>
    </View>
  );
}

/** The week's facts as one card of rows. Renders nothing for no rows. */
export function WeekRowsCard({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <Card padding="none">
      {rows.map((r, i) => (
        <WeekRow key={r.key} first={i === 0} {...r} />
      ))}
    </Card>
  );
}

/** A statement with its reason under it. */
export function TextRow({ icon, title, sub = null, first = false }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View
      style={[styles.textRow, !first && [styles.rowDivider, live.rowDivider]]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={[title, sub].filter(Boolean).join(' ')}
    >
      <Ionicons name={icon} size={18} color={t.colors.textSecondary} style={styles.textRowGlyph} />
      <View style={styles.textRowBody}>
        <Text style={[styles.textRowTitle, live.textRowTitle]}>{title}</Text>
        {sub ? <Text style={[styles.textRowSub, live.textRowSub]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

/** A quiet in-card link: glyph, label, chevron; 44 dp tall at least. */
export function LinkRow({ icon, label, onPress, accessibilityLabel }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <TouchableOpacity
      style={styles.linkRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Ionicons name={icon} size={16} color={t.colors.textSecondary} />
      <Text style={[styles.linkRowLabel, live.linkRowLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
    </TouchableOpacity>
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
  cardTitle: { ...type.title, color: colors.textPrimary },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  // WeekRow: the app's row size (48 dp floor, 16 side padding), hairline
  // between rows only.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.minimum,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  rowGlyph: { width: iconColumn },
  rowLabelWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minWidth: 0 },
  rowLabel: { ...type.body, color: colors.textSecondary, flexShrink: 1 },
  rowValue: { ...type.bodyStrong, color: colors.textPrimary, textAlign: 'right', fontVariant: ['tabular-nums'], maxWidth: '55%' },
  rowMark: { width: iconColumn, alignItems: 'center' },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  textRowGlyph: { width: iconColumn, marginTop: spacing.xxs },
  textRowBody: { flex: 1, gap: spacing.xxs },
  textRowTitle: { ...type.bodyStrong, color: colors.textPrimary },
  textRowSub: { ...type.bodySm, color: colors.textSecondary },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.minimum,
  },
  linkRowLabel: { ...type.label, color: colors.textPrimary, flex: 1 },
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

// Live override for the frozen `styles` block above (the tree's
// frozen-plus-live pattern): every part here calls `const t = useTheme();
// const live = buildLiveStyles(t);` and appends `live.KEY` after
// `styles.KEY`, so a theme change needs no restart. Layout-only keys have no
// colour to unfreeze and are not repeated here.
function buildLiveStyles(t) {
  return {
    cardTitle: { ...t.type.title, color: t.colors.textPrimary },
    rowDivider: { borderTopColor: t.colors.borderSubtle },
    rowLabel: { ...t.type.body, color: t.colors.textSecondary },
    rowValue: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    textRowTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    textRowSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    linkRowLabel: { ...t.type.label, color: t.colors.textPrimary },
    rapidLossCard: {
      backgroundColor: t.colors.errorBg ?? t.colors.warningBg,
      borderColor: withAlpha(t.colors.error, alpha.mid),
    },
    rapidLossTitle: { fontSize: t.fontSize.sm, color: t.colors.error },
    rapidLossBody: { ...t.type.bodySm, color: t.colors.textPrimary },
  };
}
