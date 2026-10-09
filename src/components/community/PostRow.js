/**
 * PostRow (D221 build spec 2.4; visual law V4): the one post anatomy for the
 * Hub feed and, in Stage 2, Post detail, Profile, Group and Dimension. It is a
 * `surface`-band row, not a card: no radius, no border, `spacing.lg`
 * horizontal and `spacing.md` vertical padding, a hairline below.
 *
 * Top to bottom: the identity line (avatar 36 with the ring dot when the post
 * is from today, name, the time label right-aligned from `postTimeLabel`),
 * the achievement line (`num('bodyStrong')`, with a PR mark on a record), the
 * stats line (`num('label')`: minutes, sets, lift volume, PR count), the note
 * (3 lines, then "more"), and the reaction bar (heart and comment glyph, each
 * a 48 dp target, flush with the text column).
 *
 * Respect is optimistic: the heart and its count move on the tap, and revert
 * with a calm toast when the call fails (`respectFailureLine`). The 120 ms
 * scale is skipped under Reduce Motion. Rendering reads one named payload
 * field at a time (never a spread), from `POST_PAYLOAD_KEYS[kind]`, and the
 * stats line only ever carries sessions, minutes, sets, lift volume, PR
 * counts and the like. Never imports `../../lib/database`.
 *
 * Props:
 *   item             { post, author, myReaction }
 *   onPress          opens the post
 *   onPressWithLayout origin-aware open (D188), optional
 *   onRespect        (next: boolean) => Promise; omitted = no heart action
 *   onRespectBlocked called instead of onRespect (a reader without a profile)
 *   onRespected      (next: boolean) => void after the call landed
 *   onOpenPerson     (author) opens the author's profile
 *   detail           the post's own page (D221 lane 2B, additive): the word
 *                    "Respect" beside the count, the whole note untruncated
 *                    (no "more"), the comment glyph with its count
 */

import { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Text from '../Text';
// UI-thread scale for the Respect tap (motion fit rule 4: no JS-thread Animated).
import Reanimated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import ProfileAvatarMark from '../ProfileAvatarMark';
import { useToast } from '../Toast';
import useTheme from '../../hooks/useTheme';
import useAppStore from '../../store/useAppStore';
import {
  spacing, radius, circle, iconSize, withAlpha, alpha,
} from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { todayLocalKey, localDayKey } from '../../lib/dayKey';
import { formatNumber, formatWithUnit } from '../../lib/format';
import { postTimeLabel } from '../../lib/community/postTime';
import { respectFailureLine } from '../../lib/community/restriction';

const AVATAR = 36;
const RING = 10;
const PR_MARK_HEIGHT = 18;
const MIDDOT = ' · ';
const NOTE_LINES = 3;
// A note this long is certain to run past three lines; shorter ones are
// shown whole. The row itself opens the post, so "more" is a cue, not a
// separate target.
const NOTE_MORE_CHARS = 120;
const SCALE_MS = 120;

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

/**
 * The achievement line, the stats line and (for a note) the remaining note
 * text for one post. Pure.
 *
 * In `detail` (the post's own page, round 3R SF4) a milestone shows its figure
 * (`heroValue` and `heroUnit`), a block its lift gains (`lifts[].deltaKg`) and
 * a session its plan name, as `extra`; these are the same allow-listed fields
 * the old card read. Never bodyweight, calories or a measurement.
 *
 * @returns {{achievement: string, stats: string, extra: string, record: boolean, noteRest: string}}
 */
export function postRowLines(post, { detail = false } = {}) {
  const p = post?.payload ?? {};
  const caption = typeof post?.caption === 'string' ? post.caption.trim() : '';
  const units = p.units === 'lbs' ? 'lbs' : 'kg';
  switch (post?.kind) {
    case 'pr': {
      const lift = `${p.exerciseName ?? 'Lift'} ${p.weight ?? ''} ${units} x ${p.reps ?? ''}`.replace(/\s+/g, ' ').trim();
      return {
        achievement: lift,
        stats: p.previousBest ? `was ${p.previousBest} ${units}` : '',
        extra: '',
        record: true,
        noteRest: caption,
      };
    }
    case 'session': {
      const prCount = count(p.prCount);
      const minutes = count(p.duration);
      const sets = count(p.workingSets);
      const volume = count(p.tonnage);
      const stats = [
        minutes > 0 ? `${minutes} min` : null,
        sets > 0 ? plural(sets, 'set', 'sets') : null,
        volume > 0 ? formatWithUnit(formatNumber(Math.round(volume)), units) : null,
        prCount > 0 ? plural(prCount, 'PR', 'PRs') : null,
      ].filter(Boolean).join(MIDDOT);
      return {
        achievement: p.sessionName || 'Session',
        stats,
        extra: detail && p.planName ? `Plan: ${p.planName}` : '',
        record: prCount > 0,
        noteRest: caption,
      };
    }
    case 'block': {
      const weeks = count(p.weeks);
      const sessions = count(p.sessions);
      const stats = [
        weeks > 0 ? plural(weeks, 'week', 'weeks') : null,
        sessions > 0 ? plural(sessions, 'session', 'sessions') : null,
      ].filter(Boolean).join(MIDDOT);
      const lifts = detail && Array.isArray(p.lifts) ? p.lifts.slice(0, 3) : [];
      const gains = lifts
        .map((l) => `${l?.exerciseName ?? 'Lift'} +${l?.deltaKg ?? 0} ${l?.units === 'lbs' ? 'lbs' : 'kg'}`)
        .join(MIDDOT);
      return { achievement: p.planName || 'Block complete', stats, extra: gains, record: false, noteRest: caption };
    }
    case 'milestone': {
      const figure = detail
        ? `${p.heroValue ?? ''}${p.heroUnit ? ` ${p.heroUnit}` : ''}`.trim()
        : '';
      const sub = typeof p.caption === 'string' ? p.caption : '';
      return {
        achievement: figure || p.title || 'Milestone',
        stats: figure ? [p.title, sub].filter(Boolean).join(MIDDOT) : sub,
        extra: '',
        record: false,
        noteRest: caption,
      };
    }
    case 'note': {
      const [first = '', ...rest] = caption.split('\n');
      return { achievement: first.trim(), stats: '', extra: '', record: false, noteRest: rest.join('\n').trim() };
    }
    default:
      return { achievement: '', stats: '', extra: '', record: false, noteRest: caption };
  }
}

function isToday(createdAt) {
  const ms = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt);
  return Number.isFinite(ms) && localDayKey(ms) === todayLocalKey();
}

export default function PostRow({
  item, onPress, onPressWithLayout, onRespect, onRespectBlocked, onRespected, onOpenPerson, detail = false, last = false,
}) {
  const t = useTheme();
  const toast = useToast();
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const post = item?.post;
  const serverMine = !!item?.myReaction;
  const serverCount = count(post?.reaction_count);
  const [local, setLocal] = useState(null);
  const busyRef = useRef(false);
  const scale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), [scale]);

  // The server's answer (after a refresh or the Hub's own update) wins.
  useEffect(() => { setLocal(null); }, [serverMine, serverCount, post?.id]);

  if (!post) return null;
  const author = item?.author ?? null;
  const name = author ? (author.display_name || author.handle || 'A lifter') : 'A lifter';
  const {
    achievement, stats, extra, record, noteRest,
  } = postRowLines(post, { detail });
  const mine = local ? local.mine : serverMine;
  const respects = local ? local.count : serverCount;
  const comments = count(post.comment_count);
  const timeLabel = postTimeLabel(post.created_at);
  const showNote = noteRest.length > 0;
  const noteLong = noteRest.length > NOTE_MORE_CHARS || noteRest.split('\n').length > NOTE_LINES;

  async function tapRespect() {
    if (onRespectBlocked) { onRespectBlocked(); return; }
    if (!onRespect || busyRef.current) return;
    const next = !mine;
    busyRef.current = true;
    setLocal({ mine: next, count: Math.max(0, respects + (next ? 1 : -1)) });
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(1.2, { duration: SCALE_MS / 2 }),
        withTiming(1, { duration: SCALE_MS / 2 }),
      );
    }
    try {
      await onRespect(next);
      onRespected?.(next);
    } catch (e) {
      setLocal(null);
      toast.show(respectFailureLine(e?.code), { variant: 'error' });
    } finally {
      busyRef.current = false;
    }
  }

  const readOut = [
    `${name}, ${achievement || 'post'}`,
    stats || null,
    extra || null,
    showNote ? noteRest : null,
    timeLabel || null,
  ].filter(Boolean).join('. ');
  const a11yLabel = [
    readOut,
    `Respect ${respects}`,
    plural(comments, 'comment', 'comments'),
  ].filter(Boolean).join('. ');
  // The post is read out as a labelled group; the avatar, heart and comment
  // glyph are separate controls that carry their own labels (round 3R, SF2).
  // The group is a button only when the post opens (N8: the post's own page
  // is not a dimmed button).
  const opens = !!(onPress || onPressWithLayout);

  return (
    <PressableCard
      onPress={onPress}
      onPressWithLayout={onPressWithLayout}
      disabled={!opens}
      accessibilityRole={opens ? 'button' : 'none'}
      accessibilityLabel={a11yLabel}
      accessible={false}
      style={{ backgroundColor: t.colors.surface }}
    >
      <View style={styles.body}>
        <View style={styles.identity}>
          <Pressable
            style={styles.avatarWrap}
            onPress={() => onOpenPerson?.(author)}
            disabled={!onOpenPerson}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={`Open ${name}'s profile`}
          >
            <ProfileAvatarMark presetKey={author?.avatar_preset} displayName={name} size={AVATAR} />
            {isToday(post.created_at) ? (
              <View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.surface }]} />
            ) : null}
          </Pressable>
          {/* The read-out group below already says the name and the time. */}
          <View
            style={styles.identityText}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <Text style={[t.type.bodyStrong, styles.name, { color: t.colors.textPrimary }]} numberOfLines={1}>
              {name}
            </Text>
            {timeLabel ? (
              <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>{timeLabel}</Text>
            ) : null}
          </View>
        </View>

        <View
          accessible
          accessibilityRole={opens ? 'button' : 'text'}
          accessibilityLabel={readOut}
        >

        {achievement ? (
          <View style={styles.achievementRow}>
            <Text style={[t.type.num('bodyStrong'), styles.achievement, { color: t.colors.textPrimary }]}>
              {achievement}
            </Text>
            {record ? (
              <View style={[styles.prMark, { backgroundColor: withAlpha(t.colors.primary, alpha.soft) }]}>
                <Text style={[t.type.captionStrong, { color: t.colors.primary }]}>PR</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {stats ? (
          <Text style={[styles.stats, t.type.num('label'), { color: t.colors.textSecondary }]}>{stats}</Text>
        ) : null}
        {extra ? (
          <Text style={[styles.stats, t.type.num('label'), { color: t.colors.textSecondary }]}>{extra}</Text>
        ) : null}
        {showNote ? (
          <Text style={[styles.note, t.type.bodySm, { color: t.colors.textPrimary }]} numberOfLines={detail ? undefined : NOTE_LINES}>
            {noteRest}
          </Text>
        ) : null}
        {showNote && noteLong && !detail ? (
          <Text style={[t.type.label, { color: t.colors.textSecondary }]}>more</Text>
        ) : null}
        </View>

        <View style={styles.reactions}>
          <Pressable
            onPress={tapRespect}
            disabled={!onRespect && !onRespectBlocked}
            style={styles.reaction}
            accessibilityRole="button"
            accessibilityState={{ selected: mine }}
            accessibilityLabel={mine ? 'Remove your Respect' : 'Give this post Respect'}
          >
            <Reanimated.View style={heartStyle}>
              <Ionicons name={mine ? 'heart' : 'heart-outline'} size={iconSize.md} color={mine ? t.colors.primary : t.colors.textMuted} />
            </Reanimated.View>
            <Text style={[t.type.num('label'), { color: t.colors.textMuted }]}>{respects}</Text>
            {detail ? <Text style={[t.type.label, { color: t.colors.textMuted }]}>Respect</Text> : null}
          </Pressable>
          <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={styles.reaction}
            accessibilityRole="button"
            accessibilityLabel={`Comments, ${comments}`}
          >
            <Ionicons name="chatbubble-outline" size={iconSize.md} color={t.colors.textMuted} />
            <Text style={[t.type.num('label'), { color: t.colors.textMuted }]}>{comments}</Text>
          </Pressable>
        </View>
      </View>
      {last ? null : <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarWrap: { width: AVATAR, height: AVATAR },
  ringDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: RING,
    height: RING,
    borderRadius: circle(RING),
    borderWidth: 1.5,
  },
  identityText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1 },
  achievementRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs2, marginTop: spacing.sm,
  },
  achievement: { flexShrink: 1 },
  prMark: {
    height: PR_MARK_HEIGHT,
    paddingHorizontal: spacing.xs2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { marginTop: spacing.xxs },
  note: { marginTop: spacing.xs2 },
  // The bar starts flush with the text column: each target carries
  // `spacing.md` of its own inline padding, taken back here.
  reactions: { flexDirection: 'row', marginLeft: -spacing.md, marginTop: spacing.xs },
  reaction: {
    minHeight: touchTarget.minimum,
    minWidth: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
    paddingHorizontal: spacing.md,
  },
  divider: { height: StyleSheet.hairlineWidth },
});
