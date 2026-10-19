import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Text from './Text';
import { colors, spacing, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import { daysLeftLine, scoreLine } from '../lib/challenges/display';

// The gym challenge on Today (gym challenge SPEC section 2): one slim row,
// the same shape as HomeLastSessionCard (a label line, a one-line name, a
// meta line, Card onPress with padding none). It shows a title, the person's
// score out of 100 and the days left, and opens the Challenge screen. It
// carries no prompt to log anything and no weight or food figure.
//
// `challenge` is a `gym_challenge_mine` row: { title, status, days_left, total }.
function HomeChallengeCard({ challenge, onOpen }) {
  const t = useTheme();
  const live = {
    label: { ...t.type.captionStrong, color: t.colors.textMuted },
    meta: { ...t.type.caption, color: t.colors.textMuted },
    name: { ...t.type.label, color: t.colors.textPrimary },
  };
  const when = challenge.status === 'active' ? daysLeftLine(challenge) : 'Finished, scores being confirmed';
  return (
    <Card
      style={styles.card}
      onPress={onOpen}
      padding="none"
      accessibilityLabel={`Open the challenge. ${challenge.title}. ${scoreLine(challenge)}. ${when}`}
    >
      <View style={styles.text}>
        <Text style={[styles.label, live.label]}>Challenge</Text>
        <Text style={[styles.name, live.name]} numberOfLines={1}>{challenge.title}</Text>
        <Text style={[styles.meta, live.meta]} numberOfLines={1}>{`${scoreLine(challenge)} · ${when}`}</Text>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </Card>
  );
}

export default React.memo(HomeChallengeCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: { flex: 1, gap: spacing.xxs },
  label: { ...type.captionStrong, color: colors.textMuted },
  meta: { ...type.caption, color: colors.textMuted },
  name: { ...type.label, color: colors.textPrimary },
});
