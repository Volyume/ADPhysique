/**
 * AttentionCard (D3, founder decision 2026-07-03, Option 1)
 *
 * The ONE "worth your attention" card class: the three commercial or
 * informational banners that used to be three separate state machines on
 * Home (trial-value ledger, free-tier weekly line, differential paywall
 * badge) now live here as variants of a single card. The four
 * coaching-signal banners (coach review, recovery week, phase mismatch,
 * plateau) stay distinct on HomeScreen, each has its own action.
 *
 * INTERNAL PRIORITY (recorded per the founder's condition; highest wins):
 *   1. 'trial'        : the trial-value ledger. Pro-trial users only, so it
 *                        also outranks every coaching banner except a fresh
 *                        coach review (its historical slot, unchanged).
 *   2. 'free_line'    : the free-tier weekly one-liner.
 *   3. 'differential' : the differential paywall badge, always last.
 * 'trial' can never co-occur with the other two (pro-trial vs free tier),
 * so in practice the order decides free_line vs differential; it is stated
 * in full so a future variant slots in deliberately, not by accident.
 * pickAttentionVariant() below is the single decision point.
 *
 * No billing logic here: every CTA only navigates; ProUpgrade owns the sell.
 * Voice rules: CLAUDE.md. British English, no em dashes.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, spacing, radius, fontWeight, type, withAlpha, iconSize, alpha,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from './Button';
import DifferentialBadge from './DifferentialBadge';

// The single decision point for which variant (if any) shows. Pass each
// candidate as already-gated truthiness (tier, dismissal and freshness checks
// stay with their owners); this only encodes the ORDER.
export function pickAttentionVariant({ trial, freeLine, differential }) {
  if (trial) return 'trial';
  if (freeLine) return 'free_line';
  if (differential) return 'differential';
  return null;
}

export default function AttentionCard({
  variant,
  // trial
  trialBanner, onTrialPress, onTrialDismiss, onMethodology,
  // free_line
  freeCoachLine, onFreeLineDismiss, onUpgrade,
  // differential
  differential, onDifferentialCta,
}) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour-bearing
  // keys only. Called unconditionally before the variant branches below so
  // hook order stays stable.
  const t = useTheme();
  const live = {
    trialBanner: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.mid) },
    trialBannerText: { ...t.type.bodySm, fontWeight: fontWeight.semibold, color: t.colors.textPrimary },
    trialLedgerTitle: { ...t.type.caption, color: t.colors.textMuted },
    trialLedgerRowText: { ...t.type.bodySm, color: t.colors.textSecondary },
    trialLedgerRowTextDone: { color: t.colors.textPrimary },
    freeCoachCard: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.mid) },
    freeCoachLineText: { ...t.type.bodySm, fontWeight: fontWeight.semibold, color: t.colors.textPrimary },
  };
  if (variant === 'trial' && trialBanner) {
    return (
      <TouchableOpacity
        style={[styles.trialBanner, live.trialBanner]}
        onPress={onTrialPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={trialBanner.line}
      >
        <View style={styles.trialBannerTopRow}>
          <Ionicons name="checkmark-done-outline" size={18} color={t.colors.primary} />
          <Text style={[styles.trialBannerText, live.trialBannerText]} numberOfLines={2}>{trialBanner.line}</Text>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.primary} />
          <TouchableOpacity
            onPress={onTrialDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss trial banner"
          >
            <Ionicons name="close" size={15} color={t.colors.textMuted} />
          </TouchableOpacity>
        </View>
        {trialBanner.ledger?.rows?.length ? (
          <View style={styles.trialLedger}>
            <Text style={[styles.trialLedgerTitle, live.trialLedgerTitle]}>{trialBanner.ledger.title}</Text>
            {trialBanner.ledger.rows.map((row) => (
              <View key={row.key} style={styles.trialLedgerRow}>
                <Ionicons
                  name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={row.done ? t.colors.success : t.colors.textMuted}
                />
                <Text style={[styles.trialLedgerRowText, live.trialLedgerRowText, row.done && [styles.trialLedgerRowTextDone, live.trialLedgerRowTextDone]]}>
                  {row.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {/* Wave A B3: the trial should never be a black box. One quiet link
            to the methodology page, from day 0. */}
        <Button
          variant="outline"
          size="sm"
          fullWidth={false}
          title="How Precision Coaching works"
          icon="information-circle-outline"
          trailingIcon="chevron-forward"
          onPress={onMethodology}
          accessibilityLabel="How Precision Coaching works"
          style={styles.trialMethodologyButton}
        />
      </TouchableOpacity>
    );
  }

  if (variant === 'free_line' && freeCoachLine) {
    return (
      <View style={[styles.freeCoachCard, live.freeCoachCard]}>
        <View style={styles.freeCoachTopRow}>
          <Ionicons name="pulse-outline" size={16} color={t.colors.primary} style={{ marginTop: spacing.hair }} />
          <Text style={[styles.freeCoachLineText, live.freeCoachLineText]}>{freeCoachLine}</Text>
          <TouchableOpacity
            onPress={onFreeLineDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss this week's summary"
          >
            <Ionicons name="close" size={15} color={t.colors.textMuted} />
          </TouchableOpacity>
        </View>
        <Button
          variant="outline"
          size="sm"
          fullWidth={false}
          title="Pro reads the full story"
          icon="lock-open-outline"
          trailingIcon="chevron-forward"
          onPress={onUpgrade}
          accessibilityLabel="Pro reads the full story. Learn about Pro coaching."
        />
      </View>
    );
  }

  if (variant === 'differential' && differential) {
    return <DifferentialBadge differential={differential} onTapCta={onDifferentialCta} />;
  }

  return null;
}

const styles = StyleSheet.create({
  trialBanner: {
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.mid),
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  trialBannerTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  trialBannerText: {
    ...type.bodySm,
    flex: 1, fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  trialLedger: {
    marginTop: spacing.sm, gap: spacing.xs,
  },
  trialLedgerTitle: {
    ...type.caption, color: colors.textMuted,
  },
  trialLedgerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  trialLedgerRowText: {
    ...type.bodySm, color: colors.textSecondary,
  },
  trialLedgerRowTextDone: {
    color: colors.textPrimary,
  },
  // R9/D70: box/fill/radius/padding/label now come from the shared <Button
  // variant="outline">; only the layout margin survives.
  trialMethodologyButton: {
    marginTop: spacing.sm,
  },
  freeCoachCard: {
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.mid),
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  freeCoachTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  freeCoachLineText: {
    ...type.bodySm,
    flex: 1, fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
});
