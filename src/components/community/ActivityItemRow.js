/**
 * ActivityItemRow (communities revamp 2026-09-10: `docs/communities-
 * revamp-2026-09-10/21-PHASE1-SPEC.md` section 1, "ActivityItemRow";
 * `20-BLUEPRINT.md` section 9's Hub ACTIVITY row and rules 4-7).
 *
 * The feed row that replaces `PostCard` on the Hub, group and profile
 * feeds (`PostCard` itself is untouched: it stays for
 * `CommunityPostScreen`'s detail header until phase 3 retires it).
 * Anatomy: avatar 32 with a ring dot when the item happened today; line
 * one, name plus a per-kind headline; line two, tabular per-kind figures;
 * the note text when the author wrote one; a trailing column, a Respect
 * heart and the comment count. Renders every kind
 * `src/lib/community/validation.js`'s `POST_PAYLOAD_KEYS` carries (pr,
 * session, block, milestone), reading one named `payload` field at a time
 * (never a spread) exactly the way `PostCard.bodyForKind` does -- see
 * `activityItemLines` below -- with this row's own field selection and
 * wording, since section 1's own line-two examples ("52 min . 18 sets .
 * 2 PRs . Tue") use a different figure set than `PostCard` shows today.
 *
 * `item` shape: `{ post, author, myReaction }` -- confirmed against
 * `CommunityHubScreen.js`'s existing `normalisePostRow`, which already
 * produces exactly this bundle for the same feed this row replaces
 * `PostCard` on, rather than guessed. `post.caption` is the free-text
 * note a person can attach to any story kind; `payload.caption` (used
 * only for `milestone`, per `POST_PAYLOAD_KEYS`) is a different field
 * this component reads separately, never confused with the note.
 *
 * The "PR mark" blueprint rule 7 names as one of the three sanctioned
 * amber uses is not defined anywhere in either spec document; this
 * renders it as a small amber "PR" label leading the pr-kind row's line
 * two, flagged in the lane report as a decision the lead may want
 * changed.
 *
 * Rules obeyed (section 1 preamble; `docs/rules/styling.md`): function
 * component, `useTheme`, tokens only (`circle()` for the ring dot,
 * `StyleSheet.hairlineWidth` for the divider, no raw hex/spacing/
 * font-size literals), `StyleSheet.create` at the bottom, effective
 * target 48 dp (`hitSlop` on the Respect glyph; the row itself via the
 * shared `PressableCard` primitive, blueprint rule 10),
 * `accessibilityRole` + labels on every interactive element,
 * `type.num('label')` for the tabular figures line. `c.primary` appears
 * exactly three times in this file: the ring dot, the Respect heart when
 * given, and the PR mark (pinned by `rows.amber.guard.test.js`). Long
 * press does nothing (no hidden gestures). Never imports
 * `../../lib/database` (privacy guard, section 6d).
 *
 * Props:
 *   item          { post: {id, kind, payload, caption, created_at,
 *                  comment_count}, author: {user_id, avatar_preset,
 *                  display_name, handle}, myReaction }
 *   onPress       opens the item
 *   onRespect     (next: boolean) toggles the viewer's own Respect
 *   onOpenPerson  (author) opens the author's profile
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import ProfileAvatarMark from '../ProfileAvatarMark';
import {
  spacing, type, colors, circle, iconSize, hitSlop,
} from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { localDayKey, todayLocalKey } from '../../lib/dayKey';

const AVATAR = 32;
const RING = 10;

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** A short weekday ("Tue"), from `payload.date` when the kind carries one
 * (pr, session), else the post's own `created_at`. */
function weekdayShort(value) {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString('en-GB', { weekday: 'short' }) : '';
}

/**
 * Line one's headline and line two's tabular figures for one post. Every
 * field is named explicitly, read only from `POST_PAYLOAD_KEYS[kind]`'s
 * own list, the same defensive shape `PostCard.bodyForKind` uses.
 *
 * @param {{kind: string, payload: object, created_at: (number|string)}} post
 * @returns {{headline: string, figures: string}}
 */
export function activityItemLines(post) {
  const p = post?.payload ?? {};
  switch (post?.kind) {
    case 'pr': {
      const units = p.units ?? 'kg';
      const lift = `${p.exerciseName ?? 'Lift'} ${p.weight ?? ''} ${units} × ${p.reps ?? ''}`.trim();
      const was = p.previousBest ? ` · was ${p.previousBest} ${units}` : '';
      return { headline: 'new best', figures: `${lift}${was}` };
    }
    case 'session': {
      const prCount = count(p.prCount);
      const day = weekdayShort(p.date ?? post?.created_at);
      const figures = [
        `${count(p.duration)} min`,
        `${count(p.workingSets)} sets`,
        prCount ? `${prCount} PR${prCount === 1 ? '' : 's'}` : null,
        day || null,
      ].filter(Boolean).join(' · ');
      return { headline: p.sessionName || 'Session', figures };
    }
    case 'block':
      return {
        headline: p.planName || 'Block complete',
        figures: `${count(p.weeks)} weeks · ${count(p.sessions)} sessions`,
      };
    case 'milestone':
      return { headline: p.title || 'Milestone', figures: typeof p.caption === 'string' ? p.caption : '' };
    default:
      return { headline: '', figures: '' };
  }
}

/** Whether `post` happened today, local calendar day (`dayKey.js`). A
 * different question from `DayDots`' mon..sun weekday vocabulary: this is
 * "was this posted today", not "which weekdays did they train". */
function isToday(post) {
  const raw = post?.created_at;
  const ms = typeof raw === 'number' ? raw : Date.parse(raw);
  return Number.isFinite(ms) && localDayKey(ms) === todayLocalKey();
}

export default function ActivityItemRow({
  item, onPress, onRespect, onOpenPerson,
}) {
  const t = useTheme();
  const post = item?.post;
  if (!post) return null;
  const author = item?.author ?? null;
  const name = author ? (author.display_name || author.handle) : 'A lifter';
  const { headline, figures } = activityItemLines(post);
  const note = typeof post.caption === 'string' ? post.caption.trim() : '';
  const respected = !!item?.myReaction;
  const comments = count(post.comment_count);
  const isPr = post.kind === 'pr';

  const a11yLabel = [
    headline ? `${name}, ${headline}` : name,
    figures || null,
    note || null,
    `${comments} comment${comments === 1 ? '' : 's'}`,
  ].filter(Boolean).join('. ');

  return (
    <PressableCard
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => onOpenPerson?.(author)}
          disabled={!onOpenPerson}
          accessibilityRole="button"
          accessibilityLabel={author?.display_name ? `Open ${author.display_name}'s profile` : 'Open profile'}
        >
          <ProfileAvatarMark presetKey={author?.avatar_preset} displayName={name} size={AVATAR} />
          {isToday(post) ? (
            // The ring dot: the row's first of three sanctioned amber uses
            // (blueprint rule 7).
            <View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />
          ) : null}
        </TouchableOpacity>
        <View style={styles.body}>
          <Text numberOfLines={1}>
            <Text style={[styles.name, { color: t.colors.textPrimary }]}>{name}</Text>
            {headline ? (
              <Text style={[styles.headline, { color: t.colors.textSecondary }]}>{` · ${headline}`}</Text>
            ) : null}
          </Text>
          {figures ? (
            <Text style={[styles.figures, t.type.num('label'), { color: t.colors.textMuted }]} numberOfLines={1}>
              {isPr ? (
                // The PR mark: the row's third sanctioned amber use, only
                // ever shown on a pr-kind row.
                <Text style={{ color: t.colors.primary }}>PR </Text>
              ) : null}
              {figures}
            </Text>
          ) : null}
          {note ? (
            <Text style={[styles.note, { color: t.colors.textPrimary }]} numberOfLines={3}>
              {note}
            </Text>
          ) : null}
        </View>
        <View style={styles.trailing}>
          <TouchableOpacity
            onPress={() => onRespect?.(!respected)}
            disabled={!onRespect}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityState={{ selected: respected }}
            accessibilityLabel={respected ? 'Remove your respect' : 'Give this respect'}
          >
            <Ionicons
              name={respected ? 'heart' : 'heart-outline'}
              size={iconSize.md}
              // The Respect glyph: the row's second sanctioned amber use,
              // amber only once the viewer has actually given it.
              color={respected ? t.colors.primary : t.colors.textMuted}
            />
          </TouchableOpacity>
          <Text style={[styles.comments, { color: t.colors.textMuted }]}>{comments}</Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: t.colors.border }]} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md,
  },
  avatarWrap: { width: AVATAR, height: AVATAR, position: 'relative' },
  ringDot: {
    position: 'absolute', right: -1, bottom: -1, width: RING, height: RING,
    borderRadius: circle(RING), borderWidth: 1.5, backgroundColor: colors.primary, borderColor: colors.background,
  },
  body: { flex: 1, gap: spacing.xxs },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  headline: { ...type.body, color: colors.textSecondary },
  figures: { color: colors.textMuted },
  note: { ...type.bodySm, color: colors.textPrimary },
  trailing: { alignItems: 'center', gap: spacing.xxs },
  comments: { ...type.caption, color: colors.textMuted },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + AVATAR + spacing.md, backgroundColor: colors.border },
});
