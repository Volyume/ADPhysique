/**
 * CommunityHubScreen (blueprint sections 1, 6; SD-01, SD-04, SD-06,
 * SD-09, SD-10)
 *
 * The one Community destination. Two halves: Following (the people you
 * chose, newest first, never ranked) and Discover (people you may want
 * to follow, the dimensions you share with others, and recent training
 * stories). Community carries no programme section of any kind -- see
 * `docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2.
 *
 * Nobody is in Community until they create a profile, but the value is
 * visible before that: with no profile the hero explains what this is,
 * carries the privacy receipt, and Discover renders read-only beneath
 * it (SD-04). "Browse first" collapses that hero to one slim line so
 * Discover is what the screen shows, and the same line offers the way
 * back to joining; the reads that need a profile are not made at all.
 *
 * Offline is a first-class state, not an error: the hub payload is
 * cached per user, so an offline open shows the last thing the user saw
 * with one quiet line.
 *
 * Discovery additions (discovery blueprint `docs/social-discovery-
 * 2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 4 and 10; SD-23): a "Find
 * people" card opens the six-door screen; a messages glyph beside
 * Activity carries its own unread count (the hub sends people to two
 * different places, so one dot cannot serve both); "People you may want
 * to follow" becomes "Lifters like you", the top five from
 * `findPeople('like_me')`, read separately from the rest of the hub
 * payload because it is a scored list, not a feed page.
 *
 * Moderated-person notice (community product audit `docs/community-
 * product-audit-2026-09-07/40-GAP-CLOSURE.md` §1): on load, `myStatus()`
 * reads the caller's own moderation state; a restricted or suspended
 * profile sees one calm line at the top naming the reason class, with a
 * link to Community rules. Additive only, per the concurrent build lane
 * on this screen (menu rows): never reorders or reformats anything else.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator, Pressable, AppState, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles.
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import { SkeletonCard } from '../components/Skeleton';
import Chip from '../components/Chip';
import PostCard from '../components/community/PostCard';
import ProfileCard from '../components/community/ProfileCard';
import DimensionRow from '../components/community/DimensionRow';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, circle, fontSize, fontWeight } from '../styles/theme';
import {
  loadHub, hasProfile, hasUnseen, hasUnreadMessages, reactToPost,
  COMMUNITY_DIMENSION_MIN_FOR_HUB, findPeople,
  loadBoard, daysLabel, readShareSettings, loadConsistency,
  listMyGroups, myStatus, isModeratedStatus, REPORT_REASONS,
} from '../lib/community';

const PAGE = 20;
const GYM_HUB_ROWS = 3;

/**
 * "This week" one-line summary and "At [gym]" preview (design ruling 60
 * §4, D1): device-computed and shown only when the person shares their
 * consistency (SD-30 gate lives in `trainingConsistency.js`, not here --
 * this reads the same toggle `readShareSettings` already exposes and asks
 * for the counters only when it is on).
 */
function ThisWeekLine({ t, counters }) {
  if (!counters) return null;
  const streak = Number(counters.c_weeks_streak) || 0;
  const sessions = Number(counters.c_sessions_week) || 0;
  const streakLabel = streak > 0 ? (streak === 1 ? '1 week in a row' : `${streak} weeks in a row`) : 'Getting back into it';
  return (
    <View style={styles.section}>
      <SectionLabel tone="muted">This week</SectionLabel>
      <View style={[styles.weekLine, { backgroundColor: t.colors.surface2 }]}>
        <View style={[styles.streakChip, { backgroundColor: t.colors.primaryBg }]}>
          <Ionicons name="flame-outline" size={14} color={t.colors.primary} />
          <Text style={[styles.streakLabel, { ...t.type.caption, color: t.colors.primary }]}>{streakLabel}</Text>
        </View>
        <Text style={[styles.weekFigure, t.type.num('bodyStrong'), { color: t.colors.textPrimary }]}>
          {sessions === 1 ? '1 session' : `${sessions} sessions`}
        </Text>
      </View>
    </View>
  );
}

function AtGymBlock({ t, navigation, gymLabel, rows }) {
  if (!gymLabel) {
    return (
      <View style={styles.section}>
        <SectionLabel tone="muted">At your gym</SectionLabel>
        <Text style={[styles.gymEmptyLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          Add your gym to see who else trains there this week.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <SectionLabel tone="muted">{`At ${gymLabel}`}</SectionLabel>
        <Pressable
          onPress={() => navigation.navigate('CommunityBoard', { scope: 'gym', window: 'week' })}
          accessibilityRole="button"
          accessibilityLabel="See all at your gym this week"
        >
          <Text style={[styles.seeAll, { ...t.type.caption, color: t.colors.primary }]}>See all</Text>
        </Pressable>
      </View>
      {rows.length ? (
        <View style={[styles.gymCard, { backgroundColor: t.colors.surface }]}>
          {rows.map((row, i) => {
            const card = row.card;
            const name = card.display_name || card.handle || 'Athlete';
            return (
              <Pressable
                key={card.user_id}
                onPress={() => (card.handle
                  ? navigation.navigate('CommunityProfile', { handle: card.handle })
                  : null)}
                style={[
                  styles.gymRow,
                  i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.borderSubtle },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${name}${row.trainedToday ? ', trained today' : ''}`}
              >
                <View style={styles.gymAvatarWrap}>
                  <ProfileAvatarMark presetKey={card.avatar_preset} displayName={name} size={32} />
                  {row.trainedToday ? (
                    <View style={[styles.ringDot, { backgroundColor: t.colors.primary, borderColor: t.colors.surface }]} />
                  ) : null}
                </View>
                <Text style={[styles.gymName, { ...t.type.bodyStrong, color: t.colors.textPrimary }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[styles.gymCaption, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
                  {row.trainedDays.length ? `Trained ${daysLabel(row.trainedDays)}` : (row.trainedToday ? 'Trained today' : '')}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={t.colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.gymEmptyLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          No one else at your gym is sharing yet.
        </Text>
      )}
    </View>
  );
}

/**
 * "Your groups" chip row (design 60 §4, D1): group names with "New
 * group" trailing. Minors never see "New group" (server refuses
 * `community_group_create` for a minor; this is the fail-closed
 * client-side mirror on the cached `me.is_minor`) but still see the
 * chip row itself if the server ever answered any groups -- it never
 * does for a minor since they cannot join or be created into one, so
 * this only ever renders empty for them in practice.
 */
function YourGroupsRow({ navigation, groups, isMinor }) {
  if (!groups.length && isMinor) return null;
  return (
    <View style={styles.section}>
      <SectionLabel tone="muted">Your groups</SectionLabel>
      <View style={styles.chipRow}>
        {groups.map((row) => (
          <Chip
            key={row.group.id}
            label={row.group.name}
            onPress={() => navigation.navigate('CommunityGroup', { id: row.group.id })}
            accessibilityLabel={`Open ${row.group.name}`}
          />
        ))}
        {!isMinor ? (
          <Chip
            icon="add"
            label="New group"
            onPress={() => navigation.navigate('CommunityGroupCreate')}
            accessibilityLabel="Create a new group"
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * The feed rows arrive as `{post, author, my_reaction}` from the RPCs.
 * Older cached payloads (and a row read straight from a list) may be the
 * post itself with the author alongside, so both shapes are accepted and
 * one shape leaves this function.
 */
export function normalisePostRow(row) {
  if (!row) return null;
  const post = row.post ?? row;
  return {
    post,
    author: row.author ?? post.author ?? null,
    myReaction: !!(row.my_reaction ?? post.my_reaction),
  };
}

export default function CommunityHubScreen({ navigation, route }) {
  const t = useTheme();
  const { me, loading: meLoading, refresh: refreshMe } = useCommunityMe();
  const joined = hasProfile(me);
  const legacyPartnerCode = route?.params?.legacyPartnerCode ?? null;

  const [segment, setSegment] = useState(route?.params?.segment === 'discover' ? 'discover' : 'following');
  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [legacyCardShown, setLegacyCardShown] = useState(!!legacyPartnerCode);
  const [browsing, setBrowsing] = useState(false);
  const [likeMe, setLikeMe] = useState([]);
  const [weekCounters, setWeekCounters] = useState(null);
  const [gymRows, setGymRows] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [status, setStatus] = useState(null);
  const listRef = useRef(null);

  const uid = me?.profile?.user_id ?? null;
  const gymLabel = me?.profile?.gym_label ?? null;
  const isMinor = !!me?.is_minor;

  // "This week" (design 60 §4, D1): device-computed, own counters, shown
  // only when this person shares their consistency.
  useEffect(() => {
    if (!joined || !uid) { setWeekCounters(null); return undefined; }
    let alive = true;
    readShareSettings(uid).then(async (share) => {
      if (!alive) return;
      if (!share?.consistency) { setWeekCounters(null); return; }
      try {
        const counters = await loadConsistency(uid);
        if (alive) setWeekCounters(counters);
      } catch (_e) {
        if (alive) setWeekCounters(null);
      }
    }).catch(() => { if (alive) setWeekCounters(null); });
    return () => { alive = false; };
  }, [joined, uid]);

  // "At [gym]" (design 60 §4, D1): up to 3 rows from the gym-scope week
  // board. Best effort -- a failed or empty read just leaves the block's
  // own empty line, never the reason the rest of the hub fails to show.
  useEffect(() => {
    if (!joined || !gymLabel) { setGymRows([]); return undefined; }
    let alive = true;
    loadBoard({ scope: 'gym', window: 'week', limit: GYM_HUB_ROWS })
      .then((page) => { if (alive) setGymRows(page.rows.slice(0, GYM_HUB_ROWS)); })
      .catch(() => { if (alive) setGymRows([]); });
    return () => { alive = false; };
  }, [joined, gymLabel]);

  // "Your groups" chip row (design 60 §4, D1). Best effort, same posture
  // as the gym block: a failed read just leaves the row empty.
  useEffect(() => {
    if (!joined || !uid) { setMyGroups([]); return undefined; }
    let alive = true;
    listMyGroups()
      .then((rows) => { if (alive) setMyGroups(rows.filter((r) => r.state === 'member')); })
      .catch(() => { if (alive) setMyGroups([]); });
    return () => { alive = false; };
  }, [joined, uid]);

  // Moderated-person notice (40-GAP-CLOSURE.md §1): best effort, own
  // request, same posture as the rest of `me` -- a failed read is silent
  // rather than blocking the rest of the Hub.
  useEffect(() => {
    if (!joined) { setStatus(null); return undefined; }
    let alive = true;
    myStatus().then((out) => { if (alive) setStatus(out); }).catch(() => { if (alive) setStatus(null); });
    return () => { alive = false; };
  }, [joined]);

  // Someone without a profile only ever sees Discover (SD-04), so the
  // segment follows the profile rather than the other way round.
  const shown = joined ? segment : 'discover';

  const load = useCallback(async (opts = {}) => {
    if (!opts.quiet) setLoading(true);
    // `joined` is passed through: the suggestions and dimensions reads are
    // about the reader's own profile and raise `no_profile` without one,
    // which is exactly the state Discover has to render for (SD-04).
    const out = await loadHub(shown, { limit: PAGE, joined });
    setHub(out);
    setLoading(false);
  }, [shown, joined]);

  useEffect(() => { load(); }, [load]);

  // Community product audit section 1: the app-foreground trigger for the
  // consistency counters, alongside the workout-completion one in
  // ActiveWorkoutScreen. `publishConsistencyOnForeground` itself compares
  // the local week key and no-ops when it has not changed, so this can
  // safely fire on every mount and every return-to-foreground.
  const consistencyUid = me?.profile?.user_id ?? null;
  useEffect(() => {
    if (!consistencyUid) return undefined;
    // eslint-disable-next-line global-require
    const { publishConsistencyOnForeground } = require('../lib/community');
    publishConsistencyOnForeground(consistencyUid).catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') publishConsistencyOnForeground(consistencyUid).catch(() => {});
    });
    return () => sub.remove();
  }, [consistencyUid]);

  // The hub is a tab root, so an entry point that names a segment usually
  // arrives at a screen that is ALREADY mounted: initial state alone would
  // land it on Following whichever half the reader last looked at (product
  // review 2026-09-06, item 13). The whole params object is the dependency
  // because React Navigation
  // mints a new one per navigate, so repeating the same entry point still
  // re-applies it.
  const routeParams = route?.params;
  const paramSegment = routeParams?.segment ?? null;
  useEffect(() => {
    if (paramSegment === 'discover' || paramSegment === 'following') setSegment(paramSegment);
  }, [routeParams, paramSegment]);

  // "Lifters like you" (discovery blueprint section 4): a scored list, so
  // it is read on its own rather than folded into `loadHub`'s feed page.
  // Without a profile there is no caller to score against, and the RPC
  // would only answer `no_profile`.
  useEffect(() => {
    if (!joined) { setLikeMe([]); return undefined; }
    let alive = true;
    findPeople('like_me', { limit: 5 })
      .then((page) => { if (alive) setLikeMe(page.people ?? []); })
      .catch(() => { if (alive) setLikeMe([]); });
    return () => { alive = false; };
  }, [joined, me?.profile?.user_id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load({ quiet: true }), refreshMe(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshMe]);

  const onEndReached = useCallback(async () => {
    if (paging || !hub?.cursor) return;
    setPaging(true);
    try {
      const next = await loadHub(shown, { cursor: hub.cursor, limit: PAGE, joined });
      setHub((prev) => (prev ? {
        ...prev,
        posts: [...(prev.posts ?? []), ...(next.posts ?? [])],
        cursor: next.cursor,
      } : next));
    } finally {
      setPaging(false);
    }
  }, [hub, paging, shown, joined]);

  const posts = useMemo(
    () => (hub?.posts ?? []).map(normalisePostRow).filter(Boolean),
    [hub],
  );
  // `hub.people` (once `community_suggested_people`) was never rendered
  // here, so `loadHub` no longer reads it (feed.js, spec 1.3); nothing
  // reads it from the hub payload on this screen either.
  const dimensions = (hub?.dimensions ?? [])
    .filter((d) => Number(d?.count ?? 0) >= COMMUNITY_DIMENSION_MIN_FOR_HUB);

  // The quiet line is about CACHED content: it is only true when there is
  // something on screen that was read earlier. A failure with no cache is
  // an empty state, not a caption.
  const offline = !!hub?.fromCache && !!hub?.error;
  const failed = !!hub?.error && !hub?.fromCache;

  function openProfile(card) {
    if (card?.handle) navigation.navigate('CommunityProfile', { handle: card.handle });
  }

  async function react(item) {
    try {
      await reactToPost(item.post.id, !item.myReaction);
      setHub((prev) => (prev ? {
        ...prev,
        posts: (prev.posts ?? []).map((row) => {
          const n = normalisePostRow(row);
          if (n?.post?.id !== item.post.id) return row;
          const on = !item.myReaction;
          const post = {
            ...n.post,
            reaction_count: Math.max(0, Number(n.post.reaction_count ?? 0) + (on ? 1 : -1)),
          };
          return { post, author: n.author, my_reaction: on };
        }),
      } : prev));
    } catch (_e) {
      // A reaction that did not land is not worth interrupting anyone for;
      // the next refresh shows the truth.
    }
  }

  const headerRight = (
    <View style={styles.headerActions}>
      {joined ? (
        <Pressable
          onPress={() => navigation.navigate('CommunityProfile', { userId: me?.profile?.user_id })}
          hitSlop={spacing.sm}
          style={styles.headerAvatar}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
        >
          <ProfileAvatarMark
            presetKey={me?.profile?.avatar_preset ?? null}
            displayName={me?.profile?.display_name || me?.profile?.handle || ''}
            size={30}
          />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => navigation.navigate('CommunitySearch')}
        hitSlop={spacing.sm}
        style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Search Community"
      >
        <Ionicons name="search-outline" size={18} color={t.colors.primary} />
      </Pressable>
      {joined ? (
        <Pressable
          onPress={() => navigation.navigate('CommunityActivity')}
          hitSlop={spacing.sm}
          style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={hasUnseen(me) ? 'Activity, new activity' : 'Activity'}
        >
          <Ionicons name="notifications-outline" size={18} color={t.colors.primary} />
          {hasUnseen(me) ? (
            <View style={[styles.dot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />
          ) : null}
        </Pressable>
      ) : null}
      {joined ? (
        <Pressable
          onPress={() => navigation.navigate('CommunityConversations')}
          hitSlop={spacing.sm}
          style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={hasUnreadMessages(me)
            ? `Messages, ${Number(me?.unseen_messages ?? 0)} unread`
            : 'Messages'}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={t.colors.primary} />
          {hasUnreadMessages(me) ? (
            <View style={[styles.badge, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]}>
              <Text style={[styles.badgeText, { color: t.colors.onPrimary }]}>
                {Number(me?.unseen_messages ?? 0) > 9 ? '9+' : String(me?.unseen_messages ?? 0)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );

  const header = (
    <View style={styles.header}>
      {isModeratedStatus(status?.status) ? (
        <View style={[styles.statusNotice, { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle }]}>
          <Text style={[styles.statusNoticeLine, { color: t.colors.textPrimary }]}>
            {status.status === 'suspended'
              ? 'Your Community access is suspended.'
              : 'Some of your Community access is restricted.'}
            {status.reason_class && REPORT_REASONS[status.reason_class]
              ? ` Reason: ${REPORT_REASONS[status.reason_class]}.`
              : ''}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CommunityRules')}
            accessibilityRole="button"
            accessibilityLabel="Read Community rules"
          >
            <Text style={[styles.statusNoticeLink, { color: t.colors.primary }]}>Community rules</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {legacyCardShown ? (
        <Card style={styles.block}>
          <Text style={[styles.blockTitle, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
            Partner invites have moved
          </Text>
          <Text style={[styles.blockBody, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            Training partners are now part of Community. Search for the person who sent this and follow each other.
          </Text>
          <View style={styles.blockActions}>
            <Button
              variant="primary"
              size="sm"
              fullWidth={false}
              title="Find people"
              onPress={() => navigation.navigate('CommunitySearch')}
              accessibilityLabel="Find people in Community"
            />
            <Button
              variant="secondary"
              size="sm"
              fullWidth={false}
              title="Dismiss"
              onPress={() => setLegacyCardShown(false)}
              accessibilityLabel="Dismiss the partner invite notice"
            />
          </View>
        </Card>
      ) : null}

      {!joined && browsing ? (
        <View style={styles.browsingRow}>
          <Text style={[styles.browsingLine, { ...t.type.caption, color: t.colors.textMuted }]}>
            Not joined yet
          </Text>
          <Button
            variant="tertiary"
            size="sm"
            fullWidth={false}
            title="Create my profile"
            onPress={() => setBrowsing(false)}
            accessibilityLabel="Show how to create my Community profile"
          />
        </View>
      ) : null}

      {!joined && !browsing ? (
        <>
          {/* V3a: PrivacyReceipt lives directly under the hero, not nested
              inside it, and the hero body drops its own privacy sentence
              since the receipt beneath says exactly that
              (docs/social-discovery-2026-09-06/81-VISUAL-RULINGS.md). */}
          <Card style={styles.block}>
            <Text style={[styles.heroTitle, { ...t.type.h3, color: t.colors.textPrimary }]}>
              Train alongside other lifters
            </Text>
            <Text
              style={[styles.heroBody, { ...t.type.bodySm, color: t.colors.textSecondary }]}
            >
              Follow people, find a training partner and share the training you actually did.
            </Text>
            <View style={styles.heroActions}>
              <Button
                variant="primary"
                size="sm"
                fullWidth={false}
                icon="person-add-outline"
                title="Create my profile"
                onPress={() => navigation.navigate('CommunityJoin')}
                accessibilityLabel="Create my Community profile"
              />
              <Button
                variant="secondary"
                size="sm"
                fullWidth={false}
                title="Browse first"
                onPress={() => setBrowsing(true)}
                accessibilityLabel="Browse Community first"
              />
            </View>
          </Card>
          <PrivacyReceipt />
        </>
      ) : null}

      {joined ? <ThisWeekLine t={t} counters={weekCounters} /> : null}
      {joined ? <AtGymBlock t={t} navigation={navigation} gymLabel={gymLabel} rows={gymRows} /> : null}
      {joined ? <YourGroupsRow navigation={navigation} groups={myGroups} isMinor={isMinor} /> : null}

      {joined ? (
        <View style={styles.segmentRow} accessibilityLabel="Community view">
          <Chip
            label="Following"
            selected={shown === 'following'}
            onPress={() => setSegment('following')}
            accessibilityRole="radio"
          />
          <Chip
            label="Discover"
            selected={shown === 'discover'}
            onPress={() => setSegment('discover')}
            accessibilityRole="radio"
          />
        </View>
      ) : null}

      {joined ? (
        <Card
          onPress={() => navigation.navigate('CommunityFindPeople')}
          style={styles.findCard}
          accessibilityLabel="Find people. At your gym, near you, training like you and more."
        >
          <View style={styles.findRow}>
            <View style={[styles.findGlyph, { backgroundColor: t.colors.surface2 }]}>
              <Ionicons name="compass-outline" size={20} color={t.colors.textSecondary} />
            </View>
            <View style={styles.findBody}>
              <Text style={[styles.findTitle, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
                Find people
              </Text>
              <Text style={[styles.findSub, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                At your gym, near you, training like you and more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
          </View>
        </Card>
      ) : null}

      {offline ? (
        <Text style={[styles.offline, { ...t.type.caption, color: t.colors.textMuted }]}>
          Showing what you last saw. You are offline.
        </Text>
      ) : null}

      {shown === 'discover' ? (
        <>
          {likeMe.length ? (
            <View style={styles.section}>
              <SectionLabel tone="muted">Lifters like you</SectionLabel>
              {likeMe.map((row) => (
                <ProfileCard
                  key={(row.card ?? row).user_id}
                  card={row.card ?? row}
                  reasons={row.reasons ?? []}
                  onPress={() => openProfile(row.card ?? row)}
                  showFollow={joined}
                />
              ))}
            </View>
          ) : null}

          {dimensions.length ? (
            <View style={styles.section}>
              <SectionLabel tone="muted">Around you</SectionLabel>
              {dimensions.map((d) => (
                <DimensionRow
                  key={`${d.kind}:${d.key}`}
                  dimension={d}
                  onPress={() => navigation.navigate('CommunityDimension', {
                    kind: d.kind, key: d.key, label: d.label,
                  })}
                />
              ))}
            </View>
          ) : null}

          {posts.length ? <SectionLabel tone="muted">Recent training stories</SectionLabel> : null}
        </>
      ) : null}

      {shown === 'following' && likeMe.length ? (
        <View style={styles.section}>
          <SectionLabel tone="muted">Lifters like you</SectionLabel>
          {likeMe.map((row) => (
            <ProfileCard
              key={(row.card ?? row).user_id}
              card={row.card ?? row}
              reasons={row.reasons ?? []}
              onPress={() => openProfile(row.card ?? row)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  const empty = loading || meLoading ? (
    <View style={styles.skeleton}>
      <SkeletonCard height={132} />
      <SkeletonCard height={132} />
      <SkeletonCard height={132} />
    </View>
  ) : failed ? (
    // A read that did not answer is never reported as an empty community.
    <EmptyState
      icon="cloud-offline-outline"
      title={hub.error === 'offline' ? 'You are offline' : 'Could not load Community'}
      text={hub.error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      secondaryLabel="Try again"
      onSecondary={() => load()}
      secondaryAccessibilityLabel="Try loading Community again"
    />
  ) : shown === 'following' ? (
    <EmptyState
      icon="people-outline"
      title="Nothing here yet"
      text="Follow a few people and their training stories will appear here."
      actionLabel="Find people"
      onAction={() => navigation.navigate('CommunitySearch')}
      actionAccessibilityLabel="Find people to follow"
    />
  ) : likeMe.length || dimensions.length ? null : (
    <EmptyState
      icon="sparkles-outline"
      title="You are early"
      text="Be the first to post a training story."
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Community" right={headerRight} />
      <FlashList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.post.id}
        renderItem={({ item }) => (
          <PostCard
            post={item.post}
            author={item.author}
            myReaction={item.myReaction}
            onPress={() => navigation.navigate('CommunityPost', { id: item.post.id })}
            onReact={() => react(item)}
            onOpenAuthor={() => openProfile(item.author)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={paging ? (
          <ActivityIndicator color={t.colors.primary} style={styles.footer} />
        ) : null}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={onEndReached}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.textMuted}
            colors={[t.colors.primary]}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { gap: spacing.lg, marginBottom: spacing.md },
  statusNotice: {
    borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.xs,
  },
  statusNoticeLine: { ...type.bodySm },
  statusNoticeLink: { ...type.captionStrong },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAvatar: { alignItems: 'center', justifyContent: 'center' },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: circle(34),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: circle(8),
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: circle(16),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, lineHeight: 12 },
  block: { gap: spacing.md },
  browsingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  browsingLine: { ...type.caption, color: colors.textMuted },
  blockTitle: { ...type.bodyStrong, color: colors.textPrimary },
  blockBody: { ...type.bodySm, color: colors.textSecondary },
  blockActions: { flexDirection: 'row', gap: spacing.sm },
  heroTitle: { ...type.h3, color: colors.textPrimary },
  heroBody: { ...type.bodySm, color: colors.textSecondary },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
  segmentRow: { flexDirection: 'row', gap: spacing.sm },
  findCard: { padding: spacing.md },
  findRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  findGlyph: {
    width: 36,
    height: 36,
    borderRadius: circle(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  findBody: { flex: 1, gap: spacing.xxs },
  findTitle: { ...type.bodyStrong, color: colors.textPrimary },
  findSub: { ...type.bodySm, color: colors.textSecondary },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  weekLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: spacing.sm,
  },
  streakLabel: { ...type.caption },
  weekFigure: { color: colors.textPrimary },
  seeAll: { ...type.caption, color: colors.primary },
  gymEmptyLine: { ...type.bodySm, color: colors.textSecondary },
  gymCard: { borderRadius: 12, overflow: 'hidden' },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  gymAvatarWrap: { position: 'relative' },
  ringDot: { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  gymName: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  gymCaption: { ...type.caption, color: colors.textMuted },
  offline: { ...type.caption, color: colors.textMuted },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.md },
  footer: { paddingVertical: spacing.lg },
});
