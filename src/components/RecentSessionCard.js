/**
 * RecentSessionCard - one finished session in the Recent sessions list: the
 * routine's name, the date and minutes, the person's own word for how hard it
 * was, tap for the read-only Workout Summary. Moved out of AnalyticsScreen.js
 * under D231 (app layout rework, batch 2) so Train draws the same cards.
 *
 * `onRepeat` (Train only, on the most recent card): a "Repeat" button doing what
 * the Today last-session row's Repeat did. The button is a SIBLING of the
 * pressable summary area, never nested in it (AX-11 law: one touchable never
 * inside another), laid out inside one card surface so the row still reads as a
 * single card.
 *
 * CP-10 batch G (2026-07-11): own useTheme() call; the frozen `styles` block
 * carries layout and tokens at rest, `buildLiveStyles` mirrors only the colour-
 * and type-bearing keys.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import Button from './Button';
import PressableCard from './PressableCard';
import { safeDate, safeFormatDate } from '../lib/safeFormat';

// The person's own word for a session's difficulty (1 to 5), the words the
// Workout Summary rates it in; the spoken label carries "4 of 5" (D214, PR-1).
const DIFFICULTY_WORDS = ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal'];

export default function RecentSessionCard({ workout, onPress, onRepeat = null }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // D214 (PR-9): the routine's name, else the session's own `name`, else
  // "Session", the order Home's last-session card read. `name` is overwritten
  // at finish with an exercise-derived summary, so it is only the right title
  // for a session with no routine; every session used to read "Session" here.
  const title = workout.routineName || workout.name || 'Session';
  const at = workout.startedAt ?? workout.createdAt ?? workout.created_at ?? 0;
  // D214 (PR-1): the difficulty is rated 1 to 5, so the chip prints the
  // person's own word ("Hard") and the spoken label carries "4 of 5", never
  // "/10". A value outside 1 to 5 draws no chip rather than a wrong one.
  const diff = Number(workout.sessionDifficulty);
  const diffWord = Number.isInteger(diff) && diff >= 1 && diff <= 5 ? DIFFICULTY_WORDS[diff] : null;
  const accessibilityLabel = diffWord
    ? `View summary for ${title}, difficulty ${diffWord}, ${diff} of 5`
    : `View summary for ${title}`;

  const body = (
    <>
      <View style={styles.sessionLeft}>
        <Text style={[styles.sessionName, live.sessionName]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.sessionMeta, live.sessionMeta]}>
          {at && safeDate(at) ? safeFormatDate(at, 'EEE d MMM') : ''}
          {workout.durationMinutes ? `${at && safeDate(at) ? ' · ' : ''}${workout.durationMinutes} min` : ''}
        </Text>
      </View>
      {diffWord ? (
        <View style={[styles.diffChip, live.diffChip]} testID="session-difficulty-chip">
          <Text style={[styles.diffText, live.diffText]}>{diffWord}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </>
  );

  // R9 (D70): radius="md" -> default (radius.lg).
  if (!onRepeat) {
    return (
      <Card style={styles.sessionCard} onPress={onPress} accessibilityLabel={accessibilityLabel}>
        {body}
      </Card>
    );
  }
  return (
    <Card padding="none" style={styles.sessionCardRepeat} testID="recent-session-newest">
      <PressableCard
        style={styles.sessionPress}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        {body}
      </PressableCard>
      <View style={styles.repeatRow}>
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title="Repeat"
          icon="refresh-outline"
          hitSlop={8}
          onPress={onRepeat}
          accessibilityLabel="Repeat last session"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md,
  },
  // With a Repeat button the card surface holds two siblings, stacked so the
  // name never loses its width to the chip, the chevron and the button at a
  // large text size: the pressable summary area (carrying the padding the plain
  // card has) and, under it, the button.
  sessionCardRepeat: {},
  sessionPress: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg,
  },
  repeatRow: { alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sessionLeft:  { flex: 1 },
  sessionName:  { ...type.bodyStrong, color: colors.textPrimary },
  sessionMeta:  { ...type.num('caption'), color: colors.textSecondary, marginTop: spacing.xxs },
  // D214 (PR-1): the chip prints the person's own word for a 1 to 5 rating, in
  // ink: a rating is a fact the person gave, not a verdict, so it carries no
  // warning or error tone (the old tones fired at 6 and 8, which 1 to 5 never
  // reaches).
  diffChip:     { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs, backgroundColor: colors.surface2 },
  diffText:     { ...type.captionStrong, color: colors.textSecondary },
});

function buildLiveStyles(t) {
  return {
    sessionName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sessionMeta: { ...t.type.num('caption'), color: t.colors.textSecondary },
    diffChip: { backgroundColor: t.colors.surface2 },
    diffText: { ...t.type.captionStrong, color: t.colors.textSecondary },
  };
}
