/**
 * CoachDailyBrief (S3, world-class audit 2026-07-03, _SYNTHESIS.md #131-138)
 *
 * The "since your check-in" runway below the Train home plan card, so the app
 * reads like a coach mid-sentence between check-ins rather than a bare logger:
 * days to the next check-in, weigh-ins banked vs needed, sessions logged. Built
 * entirely from src/lib/coachLedger.js's buildCoachLedger, the SAME ledger the
 * trial-value banner uses (AttentionCard), so these counts can never disagree
 * with the WeeklyCheckIn gate (MIN_WEIGH_INS / FIRST_CHECKIN_MIN_DAYS,
 * trialActivation.js).
 *
 * (An earlier version also carried a one-line mesocycle brief above the runway
 * -- "Training week. Same targets today." -- but on an ordinary build week it
 * had nothing to say and duplicated the hero chip's own deload/build state, so
 * it was removed on the founder's call 2026-07-03. The runway is the whole
 * component now.)
 *
 * ED-safety: the caller is responsible for tier-gating `ledger` (Pro only;
 * check-ins are a Precision Coaching feature) and for folding the open
 * ED-pattern flag, a positive SCOFF screen, calm mode, and a failed
 * flag/wellbeing read into the ledger's own `edFlagOpen` input (mirroring
 * useWeeklyStreak's edSuppressed OR-chain). This component never re-derives
 * that decision: it only ever reads `ledger.variant`. Under the 'neutral'
 * variant `ledger.rows` is empty by construction, so this component shows
 * only the countdown (a date, not a count -- the same safe disclosure
 * buildHoldReceipt's neutral unlockLine already makes), never weigh-in or
 * session counts.
 */
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { formatCheckinCountdown } from '../lib/coachLedger';

// Of the ledger's three rows (weighIns, days, sessions), only these two map
// to the runway's published items (days to check-in, from unlockDate below,
// covers the third). The 'days of data' row is a pre-first-review signal
// only -- it would read as stale ("Day 5 of 5") forever after, so this
// surface intentionally does not carry it. The full row set is still
// rendered verbatim wherever it already was (AttentionCard's trial banner,
// CoachOutputScreen's InsufficientDataView); this is a display choice here,
// not a change to what buildCoachLedger returns.
const RUNWAY_ROW_KEYS = new Set(['weighIns', 'sessions']);

export default function CoachDailyBrief({ ledger = null }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const countdown = ledger ? formatCheckinCountdown(ledger.unlockDate) : null;
  const runwayRows = ledger?.variant === 'full'
    ? ledger.rows.filter((row) => RUNWAY_ROW_KEYS.has(row.key))
    : [];
  const showRunway = !!ledger && (!!countdown || runwayRows.length > 0);

  if (!showRunway) return null;

  return (
    <View style={[styles.wrap, live.wrap]}>
      <View style={styles.runway}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.runwayTitle, live.runwayTitle]}>Since your check-in</Text>
        {countdown ? <Text maxFontSizeMultiplier={1.3} style={[styles.countdown, live.countdown]}>{countdown}</Text> : null}
        {runwayRows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Ionicons
              name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={row.done ? t.colors.success : t.colors.textMuted}
            />
            <Text maxFontSizeMultiplier={1.3} style={[styles.rowText, live.rowText, row.done && [styles.rowTextDone, live.rowTextDone]]}>{row.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  runway: { gap: spacing.xs },
  runwayTitle: { ...type.caption, color: colors.textMuted },
  countdown: { ...type.bodySm, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowText: { ...type.bodySm, color: colors.textSecondary },
  rowTextDone: { color: colors.textPrimary },
});

// CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): buildLiveStyles
// mirrors only the colour/fontSize/type-bearing sub-properties of the frozen
// `styles` block above, at identical rest values; pure layout keys (flex/
// padding/gap, no token) are correctly omitted. Same pattern as
// WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    wrap: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    runwayTitle: { ...t.type.caption, color: t.colors.textMuted },
    countdown: { ...t.type.bodySm, color: t.colors.textSecondary },
    rowText: { ...t.type.bodySm, color: t.colors.textSecondary },
    rowTextDone: { color: t.colors.textPrimary },
  };
}
