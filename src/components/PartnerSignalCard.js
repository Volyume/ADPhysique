/**
 * PartnerSignalCard
 *
 * One member's weekly consistency signal: name + optional streak line, a row of
 * filled/outline pips (done vs planned, abstracted like Apple's rings so the
 * exact training is never exposed), and a never-shaming status line. For
 * partners (not "you"), an optional one-tap emoji nudge row appears.
 *
 * The card shows ONLY: display name, status word, sessions done/planned, streak.
 * No weight, food, performance or coaching data — by design and by schema.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, type, fontSize, withAlpha } from '../styles/theme';
import { deriveSignalView, NUDGE_EMOJI } from '../lib/partners/partnerService';

function Pips({ pips }) {
  return (
    <View style={styles.pips}>
      {pips.map((p, i) => (
        <View
          key={i}
          style={[styles.pip, p === 'done' ? styles.pipDone : styles.pipTodo]}
        />
      ))}
    </View>
  );
}

export default function PartnerSignalCard({
  displayName, signal, prevSignal = null, isSelf = false, streakLabel,
  onNudge, nudgeEnabled = false, nudged = false,
}) {
  const view = deriveSignalView(signal, prevSignal);
  const streak = streakLabel
    || (view.streakWeeks >= 2 ? `week ${view.streakWeeks} of a streak` : null);

  return (
    <View style={[styles.card, isSelf && styles.cardSelf]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {isSelf ? 'You' : displayName}
        </Text>
        {streak ? <Text style={styles.streak}>{streak}</Text> : null}
      </View>

      <View style={styles.signalRow}>
        <Pips pips={view.pips} />
        <Text style={styles.status}>
          {view.label}
          {view.planned > 0 ? ` · ${view.done} of ${view.planned}` : ''}
        </Text>
      </View>

      {!isSelf && nudgeEnabled ? (
        nudged ? (
          <Text style={styles.nudged}>Nudge sent</Text>
        ) : (
          <View style={styles.nudgeRow}>
            {Object.keys(NUDGE_EMOJI).map((key) => (
              <Pressable
                key={key}
                onPress={() => onNudge?.(key)}
                style={styles.nudgeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Nudge ${displayName}`}
                hitSlop={8}
              >
                <Text style={styles.nudgeEmoji}>{NUDGE_EMOJI[key]}</Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  cardSelf: { borderColor: withAlpha(colors.primary, 0.4) },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  streak: { ...type.caption, color: colors.primary },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pips: { flexDirection: 'row', gap: spacing.xs },
  pip: { width: 12, height: 12, borderRadius: 6 },
  pipDone: { backgroundColor: colors.primary },
  pipTodo: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
  status: { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  nudgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  nudgeBtn: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  nudgeEmoji: { fontSize: fontSize.xl },
  nudged: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
});
