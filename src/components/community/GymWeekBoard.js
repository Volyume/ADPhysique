/**
 * GymWeekBoard (design ruling
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 4: "This week at [gym]"; presentation `52-research-community-
 * presentation.md` Part B D2)
 *
 * The compact preview of a gym's week board, embedded at the top of the
 * caller's own gym dimension page in place of the old style/time-band
 * summary. Roster form (no rank numbers) below the small-group threshold
 * (`board.thresholdMet === false`), amber ring dot for trained today, the
 * caller's own row tinted `surface2`.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import Card from '../Card';
import ProfileAvatarMark from '../ProfileAvatarMark';
import useTheme from '../../hooks/useTheme';
import { spacing, type, colors } from '../../styles/theme';
import { metricLabel, daysLabel } from '../../lib/community';

const PREVIEW_ROWS = 8;

export default function GymWeekBoard({ board, label, onSeeAll }) {
  const t = useTheme();
  if (!board) return null;
  const rows = (board.rows ?? []).slice(0, PREVIEW_ROWS);
  const title = label || 'This week at your gym';

  return (
    <Card padding="none" style={styles.card}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { ...t.type.bodyStrong, color: t.colors.textPrimary }]} numberOfLines={1}>
          {`This week at ${title}`}
        </Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel="See all at this gym">
            <Text style={[styles.seeAll, { ...t.type.caption, color: t.colors.primary }]}>See all</Text>
          </Pressable>
        ) : null}
      </View>
      {rows.length ? rows.map((row, i) => {
        const card = row.card;
        const name = card.display_name || card.handle || 'Athlete';
        const caption = row.trainedDays.length ? `Trained ${daysLabel(row.trainedDays)}` : '';
        return (
          <View
            key={card.user_id}
            style={[
              styles.row,
              i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.borderSubtle },
              row.isYou && { backgroundColor: t.colors.surface2 },
            ]}
          >
            {board.thresholdMet && row.rank != null ? (
              <Text style={[styles.rank, { ...t.type.label, color: t.colors.textMuted }]}>{row.rank}</Text>
            ) : (
              <View style={styles.rankSpacer} />
            )}
            <View style={styles.avatarWrap}>
              <ProfileAvatarMark presetKey={card.avatar_preset} displayName={name} size={32} />
              {row.trainedToday ? (
                <View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.surface }]} />
              ) : null}
            </View>
            <View style={styles.nameCol}>
              <Text style={[styles.name, { ...t.type.bodyStrong, color: t.colors.textPrimary }]} numberOfLines={1}>
                {name}
              </Text>
              {caption ? (
                <Text style={[styles.caption, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
                  {caption}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.metric, t.type.num('bodyStrong'), { color: t.colors.textPrimary }]}>
              {metricLabel('week', row.metric)}
            </Text>
          </View>
        );
      }) : (
        <Text style={[styles.empty, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          No one else at your gym is sharing yet.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0 },
  headRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { ...type.bodyStrong, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  seeAll: { ...type.caption, color: colors.primary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  rank: { ...type.label, color: colors.textMuted, width: 20, textAlign: 'center' },
  rankSpacer: { width: 20 },
  avatarWrap: { position: 'relative' },
  ringDot: { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  nameCol: { flex: 1, gap: 2 },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  caption: { ...type.caption, color: colors.textMuted },
  metric: { color: colors.textPrimary },
  empty: { ...type.bodySm, color: colors.textSecondary, padding: spacing.md },
});
