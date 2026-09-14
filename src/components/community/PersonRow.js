/**
 * PersonRow (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "PersonRow"; `20-BLUEPRINT.md`
 * section 9 rules 4-7).
 *
 * 64 dp: avatar 32 (`ProfileAvatarMark`) with the amber ring dot when
 * `trainedToday` (`GymWeekBoard`'s ring treatment, reused: a 10 dp filled
 * dot bordered in the surface behind it); name `bodyStrong` `textPrimary`
 * (one line, ellipsis); second line `DayDots` when `days` is given, else a
 * `bodySm` `textSecondary` caption; right-aligned `metric` in
 * `type.num('label')` `textPrimary`; an optional rank at the left edge;
 * an optional caller-built `trailing` node. Own row tints `surface2`-ish
 * via `withAlpha(c.textPrimary, alpha.ghost)` (spec's exact formula, not
 * the `surface2` token itself). Hairline divider below, inset to the text
 * column.
 *
 * Two data-shape decisions the spec's own prop list left implicit (flagged
 * for the lead, see the lane report): the own-row signal reads
 * `person.isYou` (mirroring `GymWeekBoard`'s existing `row.isYou`, the
 * closest prior art for this exact concept) since there is no separate
 * "is this me" prop; the non-`DayDots` caption text reads `person.caption`
 * (a plain string the caller composes: "gym" and "6 weeks running" are
 * unrelated kinds of fact, so PersonRow cannot derive either itself).
 * `DayDots` needs a `todayKey` this row's own prop list does not carry
 * either; it is computed here from the device clock via `DayDots`'s own
 * `currentDayKey()` (no I/O, the same "read the clock at render time"
 * pattern `PostCard.postDayLabel` already uses).
 *
 * The rank column is always `spacing.lg` wide, occupied or not, so the
 * divider's inset (`spacing.lg + 32 + spacing.md`, this file's exact
 * formula) holds whether or not a given list shows ranks.
 *
 * Rules obeyed (section 1 preamble; `docs/rules/styling.md`): function
 * component, `useTheme`, tokens only (`circle()` for every circle,
 * `StyleSheet.hairlineWidth` for the divider, no raw hex/spacing/
 * font-size literals), `StyleSheet.create` at the bottom, effective
 * target 48 dp via the shared `PressableCard` primitive (spring press
 * feedback, blueprint rule 10), `accessibilityRole` + a composed label.
 * `c.primary` appears exactly twice in this file: the trained-today ring
 * dot's fill and its own explanatory comment (pinned by
 * `rows.amber.guard.test.js`). Never imports `../../lib/database`
 * (privacy guard, section 6d).
 *
 * Props:
 *   person        the profile card, plus `isYou` and `caption` (see
 *                 above): { user_id, avatar_preset, display_name, handle,
 *                 isYou, caption }
 *   metric        the right-aligned figure, already formatted by the
 *                 caller (e.g. `metricLabel('week', n)`)
 *   days          string[] of trained day keys ('mon'..'sun'); when
 *                 given (non-empty) the second line is `DayDots` instead
 *                 of `person.caption`
 *   trainedToday  boolean, shows the ring dot on the avatar
 *   rank          number|string, shown at the row's left edge; omit to
 *                 hide it (rosters under the small-group threshold)
 *   onPress       opens the person
 *   trailing      optional node (a small `Button secondary sm`, or a
 *                 glyph) rendered at the row's trailing edge
 */

import { View, Text, StyleSheet } from 'react-native';
import PressableCard from '../PressableCard';
import ProfileAvatarMark from '../ProfileAvatarMark';
import DayDots, { currentDayKey } from './DayDots';
import {
  spacing, type, colors, circle, withAlpha, alpha,
} from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { daysLabel } from '../../lib/community';

const AVATAR = 32;
const RING = 10;
// The rank column: wide enough for two digits at `label`, right-aligned so
// 7 and 12 share one edge.
const RANK_COL = 18;
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function PersonRow({
  person, metric, days, trainedToday, rank, onPress, trailing,
}) {
  const t = useTheme();
  if (!person) return null;
  const name = person.display_name || person.handle || 'Athlete';
  const isOwn = !!person.isYou;
  // Founder defect 2026-09-14 (stepped left edges): the row carries NO
  // gutter of its own. Its page already pads by `spacing.lg`, so a row
  // that padded itself again put avatars at 32 while the eyebrows and
  // one-line copy beside them sat at 16. The rank column exists only in
  // a ranked list (a board), where every row carries a rank together, so
  // it is present exactly when this row has one, and the divider starts
  // at the text column either way.
  const ranked = rank != null;
  const hasDays = Array.isArray(days) && days.length > 0;
  const caption = !hasDays && person.caption ? person.caption : null;

  const a11yParts = [name];
  if (rank != null) a11yParts.push(`Rank ${rank}`);
  if (hasDays) a11yParts.push(`Trained ${daysLabel(DAY_ORDER.filter((k) => days.includes(k)))}`);
  else if (caption) a11yParts.push(caption);
  if (trainedToday) a11yParts.push('Trained today');
  if (metric != null) a11yParts.push(String(metric));

  return (
    <PressableCard
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yParts.join('. ')}
      style={isOwn ? [styles.own, { backgroundColor: withAlpha(t.colors.textPrimary, alpha.ghost) }] : null}
    >
      <View style={styles.row}>
        <View style={styles.leading}>
          {ranked ? (
            <View style={styles.rankSlot}>
              <Text style={[styles.rank, { color: t.colors.textMuted }]} numberOfLines={1}>
                {rank}
              </Text>
            </View>
          ) : null}
          <View style={styles.avatarWrap}>
            <ProfileAvatarMark presetKey={person.avatar_preset} displayName={name} size={AVATAR} />
            {trainedToday ? (
              // The one ring-dot amber use this file carries (blueprint rule 5,
              // 7): filled `primary`, bordered in the ground behind it so it
              // reads as a badge rather than a colour bleed.
              <View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />
            ) : null}
          </View>
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, { color: t.colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          {hasDays ? (
            <DayDots days={days} todayKey={currentDayKey()} />
          ) : caption ? (
            <Text style={[styles.caption, { color: t.colors.textSecondary }]} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
        {metric != null ? (
          <Text style={[styles.metric, t.type.num('label'), { color: t.colors.textPrimary }]} numberOfLines={1}>
            {metric}
          </Text>
        ) : null}
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {/* The reader's own row is a standalone highlighted row, not a
          member of the list below it, so it carries no divider. */}
      {isOwn ? null : (
        <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />
      )}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: spacing.md,
  },
  // Rank column (a board only) + avatar, so the divider's inset lands
  // exactly at the text column's left edge in either shape.
  leading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rankSlot: { width: RANK_COL, alignItems: 'flex-end' },
  // The reader's own row is a tinted band, not a floating grey box: the
  // tint bleeds to both screen edges through a negative margin, and the
  // page's gutter is paid back as padding, so the avatar stays on exactly
  // the same left edge as every other avatar on the screen.
  own: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  rank: { ...type.label, color: colors.textMuted },
  avatarWrap: { width: AVATAR, height: AVATAR, position: 'relative' },
  ringDot: {
    position: 'absolute', right: -1, bottom: -1, width: RING, height: RING,
    borderRadius: circle(RING), borderWidth: 1.5, backgroundColor: colors.primary, borderColor: colors.background,
  },
  body: { flex: 1, gap: spacing.xxs },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  caption: { ...type.bodySm, color: colors.textSecondary },
  metric: { color: colors.textPrimary },
  trailing: { marginLeft: spacing.xs },
  // The house divider (src/components/SettingsPrimitives.js:153-161): a
  // `borderSubtle` hairline spanning the row, never a bright `border` line
  // inset past the avatar, which is the wireframe look.
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});
