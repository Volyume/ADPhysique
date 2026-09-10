/**
 * CommunityProfileScreen (blueprint sections 2, 6; SD-05)
 *
 * One person as a lifter: the facts they chose, what they have posted
 * and what they have published. Nothing else about them exists here.
 *
 * The three states that are not "a profile with content" are all real
 * destinations, not errors: a followers-only profile you do not follow
 * says so and offers the follow; a person you have blocked says so and
 * offers the unblock; your own profile swaps the follow control for
 * Edit and Share link.
 *
 * Followers and following open in a sheet rather than a pushed screen:
 * the list is transient content about the profile you are already on,
 * which is what the app's sheets are for.
 *
 * The action row is the three tiers of the relationship, left to right
 * (discovery blueprint `docs/social-discovery-2026-09-06/
 * 70-DISCOVERY-BLUEPRINT.md` section 1): Follow is one way and instant on
 * a public profile, Connect is mutual and accepted, and Message appears
 * only once that tie exists. An under-18 account never sees Connect or
 * Message at all (SD-32), and the training profile line shows only the
 * bands this person chose to share (SD-22).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, Pressable, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles.
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import ModalHeader from '../components/ModalHeader';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import PostCard from '../components/community/PostCard';
import ProfileCard from '../components/community/ProfileCard';
import FollowButton from '../components/community/FollowButton';
import ConnectButton from '../components/community/ConnectButton';
import ConnectSheet from '../components/community/ConnectSheet';
import TrainingProfileLine from '../components/community/TrainingProfileLine';
import ProfileMenuSheet from '../components/community/ProfileMenuSheet';
import ReportSheet from '../components/community/ReportSheet';
import { factLabels, placeLine } from '../components/community/ProfileCard';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, circle } from '../styles/theme';
import ProgressStrip from '../components/community/ProgressStrip';
import {
  getProfile, listFollows, profileUrl, reactToPost, unblockUser, relationships, connectionState,
  readShareSettings, loadConsistency,
} from '../lib/community';

/**
 * The same normalisation the hub does: the RPCs hand back
 * `{post, author, my_reaction}`, and a row read straight out of a list
 * may be the post itself. Kept local to each screen that renders posts
 * rather than reaching across into another screen's module.
 */
function normalisePostRow(row, fallbackAuthor) {
  if (!row) return null;
  const post = row.post ?? row;
  return {
    post,
    author: row.author ?? post.author ?? fallbackAuthor ?? null,
    myReaction: !!(row.my_reaction ?? post.my_reaction),
  };
}

/**
 * The card for this person in the reader's own blocked list, or null.
 * Never throws: a relationships read that fails simply leaves the screen
 * saying the profile is not available, which is still true.
 */
async function findInMyBlocked({ handle, userId }) {
  try {
    const out = await relationships();
    const rows = Array.isArray(out?.blocked) ? out.blocked : [];
    return rows
      .map((row) => row?.card ?? row)
      .find((c) => (userId && c?.user_id === userId) || (handle && c?.handle === handle)) ?? null;
  } catch (_e) {
    return null;
  }
}

export default function CommunityProfileScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const { me } = useCommunityMe();
  // The deep link carries `h` (volyume://u/?h=handle); the in-app routes
  // carry `handle` / `userId`. Both resolve to the same read.
  const handle = route?.params?.handle ?? route?.params?.h ?? null;
  const userId = route?.params?.userId ?? route?.params?.uid ?? null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [followsKind, setFollowsKind] = useState(null);
  const [follows, setFollows] = useState([]);
  const [error, setError] = useState(null);
  const [blockedCard, setBlockedCard] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [progress, setProgress] = useState(null);

  const card = data?.card ?? null;
  const isMe = !!card && card.user_id === me?.profile?.user_id;
  const viewable = !!data?.viewable;

  // Progress strip (design 60 §4, D4): own profile only, and only when
  // sharing consistency. Device-computed -- there is no server read for a
  // caller's own raw counters (`_community_profile_card` never carries
  // them, blueprint 60 §1's counters are board inputs, not profile
  // fields), so this reads the same local `trainingConsistency.js` the
  // Hub's "This week" line uses.
  useEffect(() => {
    if (!isMe || !card?.user_id) { setProgress(null); return undefined; }
    let alive = true;
    readShareSettings(card.user_id).then(async (share) => {
      if (!alive) return;
      if (!share?.consistency) { setProgress(null); return; }
      try {
        const counters = await loadConsistency(card.user_id);
        if (alive) setProgress(counters);
      } catch (_e) {
        if (alive) setProgress(null);
      }
    }).catch(() => { if (alive) setProgress(null); });
    return () => { alive = false; };
  }, [isMe, card?.user_id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const out = await getProfile({ handle, userId });
      setData(out);
      setError(null);
      setBlockedCard(null);
    } catch (e) {
      const code = e?.code ?? 'unavailable';
      setError(code);
      // `community_get_profile` raises `not_found` for a block in EITHER
      // direction, so the read alone cannot tell "I blocked them" from
      // "they blocked me" or "no such handle". The blocked list is the
      // reader's OWN record, so it answers the one case we can state
      // honestly: a person the reader blocked gets the blocked state and
      // the way out of it, and nothing else claims to know why.
      setBlockedCard(code === 'not_found' ? await findInMyBlocked({ handle, userId }) : null);
    } finally {
      setLoading(false);
    }
  }, [handle, userId]);

  useEffect(() => { load(); }, [load]);

  const openFollows = useCallback(async (kind) => {
    if (!card?.user_id || !viewable) return;
    setFollowsKind(kind);
    setFollows([]);
    try {
      const page = await listFollows(card.user_id, kind, { limit: 30 });
      setFollows(page.people);
    } catch (_e) {
      setFollows([]);
    }
  }, [card, viewable]);

  async function react(item) {
    try {
      await reactToPost(item.post.id, !item.myReaction);
      setData((prev) => (prev ? {
        ...prev,
        posts: (prev.posts ?? []).map((row) => {
          const n = normalisePostRow(row, prev.card);
          if (n?.post?.id !== item.post.id) return row;
          const on = !item.myReaction;
          return {
            post: {
              ...n.post,
              reaction_count: Math.max(0, Number(n.post.reaction_count ?? 0) + (on ? 1 : -1)),
            },
            author: n.author,
            my_reaction: on,
          };
        }),
      } : prev));
    } catch (_e) {
      // Nothing to interrupt anyone with; the next load shows the truth.
    }
  }

  const posts = (data?.posts ?? []).map((r) => normalisePostRow(r, card)).filter(Boolean);
  const facts = card ? factLabels(card) : [];
  const chipLabels = card?.open_to_partner
    ? [...facts, 'Open to training together']
    : facts;
  const place = card ? placeLine(card) : null;
  // Null when the viewer may not see the profile: an absent count is not
  // a zero, and "0 connections" about a private profile would be a claim
  // the card never made.
  const connectionCount = card?.connection_count == null ? null : Number(card.connection_count);

  /** One card in, one card out: every control on this screen writes the
   * card the server just answered with, so the row never guesses. */
  function patchCard(next) {
    setData((prev) => (prev
      ? { ...prev, card: next?.user_id ? next : { ...prev.card, ...next } }
      : prev));
  }

  const headerRight = card && !isMe ? (
    <Pressable
      onPress={() => setMenuOpen(true)}
      hitSlop={spacing.sm}
      style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
      accessibilityRole="button"
      accessibilityLabel="Profile options"
    >
      <Ionicons name="ellipsis-horizontal" size={18} color={t.colors.textPrimary} />
    </Pressable>
  ) : null;

  const hero = card ? (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <ProfileAvatarMark
          presetKey={card.avatar_preset}
          displayName={card.display_name || card.handle}
          size={56}
        />
        <View style={styles.heroBody}>
          <Text style={[styles.name, { ...t.type.h3, color: t.colors.textPrimary }]}>
            {card.display_name || card.handle}
          </Text>
          <Text style={[styles.handle, { ...t.type.caption, color: t.colors.textSecondary }]}>
            {`@${card.handle}`}
          </Text>
        </View>
      </View>

      {card.bio ? (
        <Text style={[styles.bio, { ...t.type.body, color: t.colors.textPrimary }]}>{card.bio}</Text>
      ) : null}

      {chipLabels.length ? (
        <Text style={[styles.facts, { ...t.type.caption, color: t.colors.textSecondary }]}>
          {chipLabels.join(' · ')}
        </Text>
      ) : null}

      {place ? (
        <Text style={[styles.place, { ...t.type.bodySm, color: t.colors.textSecondary }]}>{place}</Text>
      ) : null}

      {/* Spec D (migrate_164 Part 8): the owner always sees their own gym
          and place (the server never hides a fact from its own owner),
          `show_gym`/`show_place` only travel to the owner's own card, so
          this can never render for anyone else's profile. */}
      {isMe && card.gym_label && card.show_gym === false ? (
        <Text style={[styles.hiddenNote, { ...t.type.caption, color: t.colors.textMuted }]}>
          Hidden from others
        </Text>
      ) : null}
      {isMe && (card.place_label || card.area_label) && card.show_place === false ? (
        <Text style={[styles.hiddenNote, { ...t.type.caption, color: t.colors.textMuted }]}>
          Hidden from others
        </Text>
      ) : null}

      <TrainingProfileLine card={card} />

      {isMe && progress ? (
        <ProgressStrip
          counters={progress}
          onPress={() => navigation.navigate('CommunityBoard', { scope: 'following', window: 'week' })}
        />
      ) : null}

      <View style={styles.counts}>
        <Pressable
          // Spec C (40-GAP-CLOSURE.md §1 "Follow management"): the owner's
          // own count opens the full Followers screen (self-only,
          // remove-capable); a viewer on someone else's profile keeps the
          // existing transient sheet.
          onPress={() => (isMe ? navigation.navigate('CommunityFollowers') : openFollows('followers'))}
          disabled={!isMe && !viewable}
          accessibilityRole="button"
          accessibilityLabel={`${card.follower_count ?? 0} followers`}
        >
          <Text style={[styles.count, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {`${card.follower_count ?? 0} followers`}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => openFollows('following')}
          disabled={!viewable}
          accessibilityRole="button"
          accessibilityLabel={`${card.following_count ?? 0} following`}
        >
          <Text style={[styles.count, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {`${card.following_count ?? 0} following`}
          </Text>
        </Pressable>
        {connectionCount !== null && Number.isFinite(connectionCount) ? (
          isMe ? (
            <Pressable
              onPress={() => navigation.navigate('CommunityConnections')}
              accessibilityRole="button"
              accessibilityLabel={connectionCount === 1 ? '1 connection' : `${connectionCount} connections`}
            >
              <Text style={[styles.count, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                {connectionCount === 1 ? '1 connection' : `${connectionCount} connections`}
              </Text>
            </Pressable>
          ) : (
            <Text
              style={[styles.count, { ...t.type.bodySm, color: t.colors.textSecondary }]}
              accessibilityRole="text"
            >
              {connectionCount === 1 ? '1 connection' : `${connectionCount} connections`}
            </Text>
          )
        ) : null}
      </View>

      {isMe ? (
        <View style={styles.actions}>
          <Button
            variant="primary"
            size="sm"
            fullWidth={false}
            title="Edit profile"
            icon="create-outline"
            onPress={() => navigation.navigate('CommunityEditProfile')}
            accessibilityLabel="Edit my Community profile"
          />
          <Button
            variant="secondary"
            size="sm"
            fullWidth={false}
            title="Share link"
            onPress={async () => {
              try { await Share.share({ message: profileUrl(card.handle) }); }
              catch (_) { /* the user dismissed the share sheet */ }
            }}
            accessibilityLabel="Share my profile link"
          />
        </View>
      ) : card.relationship?.blocked ? (
        <View style={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            fullWidth={false}
            title="Unblock"
            onPress={() => unblock(card.user_id)}
            accessibilityLabel={`Unblock @${card.handle}`}
          />
        </View>
      ) : (
        // V7a (docs/social-discovery-2026-09-06/81-VISUAL-RULINGS.md): once
        // connected, Following collapses to icon-only and the row reads
        // Following · Connected · Message on one line; ConnectButton renders
        // Message after Connected from `onMessage`.
        <View style={styles.actions}>
          <FollowButton
            card={card}
            size="md"
            iconOnly={connectionState(card) === 'connected'}
            onChange={(relationship) => patchCard({ relationship })}
          />
          <ConnectButton
            card={card}
            me={me}
            size="md"
            onConnect={() => setConnectOpen(true)}
            onChange={patchCard}
            onMessage={() => navigation.navigate('CommunityConversation', { userId: card.user_id })}
            onRulesOutdated={() => navigation.navigate('CommunityRules', { mustAccept: true })}
          />
        </View>
      )}

    </View>
  ) : null;

  const listData = !card || !viewable ? [] : posts;

  async function unblock(targetId) {
    try {
      await unblockUser(targetId);
      toast.show('Unblocked');
      load();
    } catch (_e) {
      toast.show('Could not do that just now.', { variant: 'error' });
    }
  }

  const empty = loading ? (
    <View style={styles.skeleton}>
      <View style={styles.skeletonHero}>
        <Skeleton width={56} height={56} radius={circle(56)} />
        <View style={styles.skeletonHeroLines}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="35%" height={13} style={styles.skeletonHandle} />
        </View>
      </View>
      <SkeletonCard height={110} />
      <SkeletonCard height={110} />
    </View>
  ) : blockedCard ? (
    <EmptyState
      icon="ban-outline"
      title="You have blocked this person"
      text="Neither of you can see the other in Community."
      actionLabel="Unblock"
      onAction={() => unblock(blockedCard.user_id)}
      actionAccessibilityLabel={blockedCard.handle ? `Unblock @${blockedCard.handle}` : 'Unblock this person'}
    />
  ) : error === 'offline' ? (
    <EmptyState
      icon="cloud-offline-outline"
      title="You are offline"
      text="Community needs a connection. Your training is unaffected."
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading this profile again"
    />
  ) : error === 'not_found' ? (
    // No "Try again": the read has answered, and repeating it cannot
    // change the answer.
    <EmptyState
      icon="person-outline"
      title="Profile not available"
      text="This profile is not available."
    />
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title="Could not open this profile"
      text="Try that again in a moment."
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading this profile again"
    />
  ) : card?.relationship?.blocked ? (
    <EmptyState
      icon="ban-outline"
      title="You have blocked this person"
      text="Neither of you can see the other in Community. You can unblock above."
    />
  ) : !viewable ? (
    <EmptyState
      icon="lock-closed-outline"
      title="This profile is private"
      text="Follow to see their training stories."
    />
  ) : (
    <EmptyState
      icon="chatbubble-outline"
      title="No training stories yet"
      text="When they post a session, a personal best or a finished block, it appears here."
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={card ? `@${card.handle}` : 'Profile'} right={headerRight} />
      <FlashList
        data={listData}
        keyExtractor={(item) => item.post.id}
        renderItem={({ item }) => (
          <PostCard
            post={item.post}
            author={item.author}
            myReaction={item.myReaction}
            onPress={() => navigation.navigate('CommunityPost', { id: item.post.id })}
            onReact={() => react(item)}
          />
        )}
        ListHeaderComponent={hero}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => { /* the profile read returns the latest 20; there is no deeper page */ }}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try { await load(); } finally { setRefreshing(false); }
            }}
            tintColor={t.colors.textMuted}
            colors={[t.colors.primary]}
          />
        )}
      />

      <ProfileMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        card={card}
        onChanged={(relationship) => patchCard({ relationship })}
        onReport={() => setReportOpen(true)}
      />

      <ConnectSheet
        visible={connectOpen}
        onClose={() => setConnectOpen(false)}
        card={card}
        onSent={patchCard}
        onRulesOutdated={() => navigation.navigate('CommunityRules', { mustAccept: true })}
      />

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="profile"
        targetId={card?.user_id}
      />

      <BottomSheet
        visible={!!followsKind}
        onClose={() => setFollowsKind(null)}
        accessibilityLabel={followsKind === 'following' ? 'Following' : 'Followers'}
      >
        <ModalHeader
          title={followsKind === 'following' ? 'Following' : 'Followers'}
          onClose={() => setFollowsKind(null)}
        />
        <View style={styles.sheet}>
          {follows.length ? follows.map((row) => (
            <ProfileCard
              key={(row.card ?? row).user_id}
              card={row.card ?? row}
              showFollow={false}
              compact
              onPress={() => {
                setFollowsKind(null);
                navigation.push('CommunityProfile', { handle: (row.card ?? row).handle });
              }}
            />
          )) : (
            <EmptyState
              compact
              icon="people-outline"
              title="Nobody yet"
              text={followsKind === 'following'
                ? 'Nobody followed yet. Search for someone you train with.'
                : 'No followers yet. Search for someone you train with.'}
              actionLabel="Find people"
              onAction={() => {
                setFollowsKind(null);
                navigation.navigate('CommunitySearch');
              }}
              actionAccessibilityLabel="Find people to follow"
            />
          )}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { gap: spacing.md, marginBottom: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroBody: { flex: 1, gap: spacing.xxs },
  name: { ...type.h3, color: colors.textPrimary },
  handle: { ...type.caption, color: colors.textSecondary },
  bio: { ...type.body, color: colors.textPrimary },
  facts: { ...type.caption, color: colors.textSecondary },
  place: { ...type.bodySm, color: colors.textSecondary },
  hiddenNote: { ...type.caption, color: colors.textMuted },
  counts: { flexDirection: 'row', gap: spacing.lg },
  count: { ...type.bodySm, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: circle(34),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.lg },
  skeletonHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  skeletonHeroLines: { flex: 1, gap: spacing.xxs },
  skeletonHandle: { marginTop: spacing.xs },
  sheet: { gap: spacing.md, paddingBottom: spacing.md },
});
