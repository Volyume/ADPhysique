/**
 * RecoveryStateCard — Campaign 18 recovery-visibility amendment.
 *
 * THE PROBLEM IT SOLVES. Volyume can make training deliberately lighter for
 * two different reasons, and until now the only surface that said so was
 * Train. An athlete who lives on Home, Food and Progress and opens Train only
 * to start a session would discover a consequential coaching state by noticing
 * their sets had dropped. That is not coaching, it is a puzzle.
 *
 * NOT A SECOND SOURCE OF TRUTH. Every word here comes from
 * `recoveryState.recoveryStateCard`, which reads the block's own persisted
 * recovery position and week flag. This component renders; it decides nothing,
 * derives nothing, and cannot disagree with Train or the review because none
 * of them re-derive the state.
 *
 * PERSISTENT, NOT NAGGING. The card stays while the state is true. Once the
 * athlete has read the detail it collapses to a single quiet line, but it does
 * NOT disappear: acknowledgement is not what ends a coaching state, and the
 * athlete should not have to remember a card they dismissed on Tuesday. The
 * state ends when the block lifecycle moves on, which the resolver decides by
 * returning nothing.
 *
 * No streaks, no countdown, no badge, no guilt. Voice rules: CLAUDE.md.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, spacing, radius, fontWeight, type, withAlpha, iconSize, alpha,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { RECOVERY_STATE, recoveryStateCard } from '../lib/recoveryState';

export default function RecoveryStateCard({ recoveryState, expanded = false, onToggle }) {
  const t = useTheme();
  const card = recoveryStateCard(recoveryState);
  if (!card) return null;

  const planned = card.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY;
  const live = {
    card: {
      backgroundColor: t.colors.primaryBg,
      borderColor: withAlpha(t.colors.primary, alpha.mid),
    },
    title: { ...t.type.bodySm, fontWeight: fontWeight.semibold, color: t.colors.textPrimary },
    body: { ...t.type.bodySm, color: t.colors.textSecondary },
    next: { ...t.type.caption, color: t.colors.textMuted },
    action: { ...t.type.caption, color: t.colors.primary, fontWeight: fontWeight.semibold },
  };

  // Compact once read, and still unmistakably present.
  const title = expanded ? card.title : card.compactTitle;

  return (
    <TouchableOpacity
      style={[styles.card, live.card]}
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ expanded: !!expanded }}
      accessibilityLabel={expanded ? `${card.title}. ${card.body} ${card.next}` : `${card.compactTitle}. ${card.action}`}
    >
      <View style={styles.topRow}>
        <Ionicons
          name={planned ? 'moon-outline' : 'pulse-outline'}
          size={18}
          color={t.colors.primary}
          style={{ marginTop: spacing.hair }}
        />
        <Text style={[styles.title, live.title]} numberOfLines={2}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={iconSize.sm}
          color={t.colors.primary}
        />
      </View>
      {expanded ? (
        <View style={styles.detail}>
          <Text style={[styles.body, live.body]}>{card.body}</Text>
          <Text style={[styles.next, live.next]}>{card.next}</Text>
        </View>
      ) : (
        <Text style={[styles.action, live.action]}>{card.action}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.mid),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...type.bodySm, flex: 1, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  detail: { gap: spacing.xs },
  body: { ...type.bodySm, color: colors.textSecondary },
  next: { ...type.caption, color: colors.textMuted },
  action: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },
});
