/**
 * CoachDailyBrief (S3, world-class audit 2026-07-03, _SYNTHESIS.md #131-138)
 *
 * Two deterministic pieces below the Train home plan card, so the app reads
 * like a coach mid-sentence between check-ins rather than a bare logger:
 *
 *  (1) `line` -- one line on open, composed by the caller from the SAME
 *      mesocycle week signal the hero's own chip reads (currentMesoWeek.
 *      isDeload). No phase logic lives here; this component only renders
 *      the sentence it is given.
 *  (2) `ledger` -- the "since your check-in" runway: days to the next
 *      check-in, weigh-ins banked vs needed, sessions logged. Built
 *      entirely from src/lib/coachLedger.js's buildCoachLedger, the SAME
 *      ledger the trial-value banner uses (AttentionCard), so these counts
 *      can never disagree with the WeeklyCheckIn gate (MIN_WEIGH_INS /
 *      FIRST_CHECKIN_MIN_DAYS, trialActivation.js).
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
 * session counts. The one-liner is training-schedule data only (no weight
 * or food), so it carries no ED gating, matching the un-gated hero
 * mesocycle chip it sits beside.
 */
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, radius, type } from '../styles/theme';
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

export default function CoachDailyBrief({ line = null, ledger = null }) {
  const countdown = ledger ? formatCheckinCountdown(ledger.unlockDate) : null;
  const runwayRows = ledger?.variant === 'full'
    ? ledger.rows.filter((row) => RUNWAY_ROW_KEYS.has(row.key))
    : [];
  const showRunway = !!ledger && (!!countdown || runwayRows.length > 0);

  if (!line && !showRunway) return null;

  return (
    <View style={styles.wrap}>
      {line ? <Text style={styles.line}>{line}</Text> : null}
      {showRunway ? (
        <View style={[styles.runway, line ? styles.runwayWithLine : null]}>
          <Text style={styles.runwayTitle}>Since your check-in</Text>
          {countdown ? <Text style={styles.countdown}>{countdown}</Text> : null}
          {runwayRows.map((row) => (
            <View key={row.key} style={styles.row}>
              <Ionicons
                name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={row.done ? colors.success : colors.textMuted}
              />
              <Text style={[styles.rowText, row.done && styles.rowTextDone]}>{row.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  line: {
    ...type.bodySm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  runway: { gap: spacing.xs },
  runwayWithLine: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  runwayTitle: { ...type.caption, color: colors.textMuted },
  countdown: { ...type.bodySm, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowText: { ...type.bodySm, color: colors.textSecondary },
  rowTextDone: { color: colors.textPrimary },
});
