/**
 * CommunityGroupScreen (communities revamp 2026-09-10: `docs/communities-
 * revamp-2026-09-10/21-PHASE1-SPEC.md` section 4; `20-BLUEPRINT.md`
 * section 9's group page; server contract `supabase/migrate_165_
 * community_boards_groups.sql` `community_group_get`).
 *
 * `BackHeader` carries the group's name and the 48 dp menu glyph, so the
 * body no longer repeats the name (no `h2`, no `Card`): one `label` line
 * ("8 members . invite only"; the Together line is phase 3), `Eyebrow`
 * MEMBERS with `PersonRow`s from the group's week board and a trailing
 * "See all" to `CommunityGroupMembers`, `Eyebrow` ACTIVITY with the
 * members' stories as `ActivityItemRow`s. A non-member sees the Join or
 * Request `Button` in place of both (the board and feed reads are member-
 * only, unchanged from before). Admin actions (Edit, Invite, Share link,
 * Close group), Leave and Report stay exactly in the existing `MenuSheet`.
 *
 * Route params: { id: groupId } (also reached via the `g/?id=` deep link,
 * RootNavigator's linking config).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import Button from '../components/Button';
import Eyebrow from '../components/community/Eyebrow';
import PersonRow from '../components/community/PersonRow';
import ActivityItemRow from '../components/community/ActivityItemRow';
import MenuSheet from '../components/community/MenuSheet';
import ReportSheet from '../components/community/ReportSheet';
import GroupInviteSheet from '../components/community/GroupInviteSheet';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, hitSlop } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import {
  getGroup, joinGroup, leaveGroup, closeGroup, loadGroupFeed, reactToPost,
  loadBoard, metricLabel,
} from '../lib/community';

const PAGE = 20;

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  minor_restricted: 'Groups are not available under 18.',
  already_member: 'You are already in this group.',
  group_closed: 'This group is closed.',
  last_admin: 'Promote someone else to admin before leaving.',
  not_found: 'This group is no longer available.',
};

/** "8 members . invite only" (spec section 4, and the same wording the
 * Hub's GroupRow line uses): member count first, access lower-case. Kept
 * local rather than exported from `lib/`, same precedent as the Hub's
 * own copy of this helper. */
function groupLine(group) {
  const n = Number(group?.memberCount ?? 0);
  const access = group?.access === 'invite' ? 'invite only' : 'open';
  return `${n} ${n === 1 ? 'member' : 'members'} · ${access}`;
}

export default function CommunityGroupScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const { me } = useCommunityMe();
  const groupId = route?.params?.id ?? route?.params?.scopeKey ?? null;
  const isMinor = !!me?.is_minor;

  const [group, setGroup] = useState(null);
  const [board, setBoard] = useState(null);
  const [feedRows, setFeedRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const g = await getGroup(groupId);
      setGroup(g);
      setError(null);
      if (g?.myState === 'member') {
        const [b, feed] = await Promise.all([
          loadBoard({ scope: 'group', scopeKey: groupId, window: 'week', limit: PAGE }),
          loadGroupFeed(groupId, { limit: PAGE }),
        ]);
        setBoard(b);
        setFeedRows(feed.rows);
        setCursor(feed.cursor);
      } else {
        setBoard(null);
        setFeedRows([]);
        setCursor(null);
      }
    } catch (e) {
      setError(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const onEndReached = useCallback(async () => {
    if (paging || !cursor || !feedRows.length || group?.myState !== 'member') return;
    setPaging(true);
    try {
      const page = await loadGroupFeed(groupId, { cursor, limit: PAGE });
      if (page.rows.length) {
        setFeedRows((prev) => [...prev, ...page.rows]);
        setCursor(page.cursor);
      } else {
        setCursor(null);
      }
    } catch (_e) {
      setCursor(null);
    } finally {
      setPaging(false);
    }
  }, [cursor, feedRows.length, group?.myState, groupId, paging]);

  function openProfile(card) {
    if (card?.handle) navigation.navigate('CommunityProfile', { handle: card.handle });
  }

  async function react(item) {
    const on = !item.myReaction;
    setFeedRows((prev) => prev.map((r) => (r.post.id === item.post.id
      ? { ...r, myReaction: on, post: { ...r.post, reaction_count: Math.max(0, Number(r.post.reaction_count ?? 0) + (on ? 1 : -1)) } }
      : r)));
    try {
      await reactToPost(item.post.id, on);
    } catch (_e) {
      // A reaction that did not land is not worth interrupting for; the
      // next refresh shows the truth.
    }
  }

  async function doJoin() {
    if (isMinor || joining) return;
    setJoining(true);
    try {
      const out = await joinGroup(groupId);
      toast.show(out.state === 'requested' ? 'Requested to join.' : 'Joined.');
      await load();
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not join that group just now.', { variant: 'error' });
    } finally {
      setJoining(false);
    }
  }

  async function doLeave() {
    setMenuOpen(false);
    try {
      await leaveGroup(groupId);
      toast.show('You left the group.');
      navigation.goBack();
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not leave that group just now.', { variant: 'error' });
    }
  }

  async function doClose() {
    setMenuOpen(false);
    try {
      await closeGroup(groupId);
      toast.show('Group closed.');
      await load();
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not close that group just now.', { variant: 'error' });
    }
  }

  const isMember = group?.myState === 'member';

  // Own row pinned at the bottom when off-page, the same pattern
  // `CommunityDimensionScreen` and `CommunityBoardScreen` already use.
  // Computed above the `!groupId` early return (rules of hooks: every
  // hook this component calls must run on every render, including the
  // one render where there is no groupId at all).
  const youOffPage = isMember && board?.you && !board.rows.some((r) => r.isYou);
  const displayMembers = useMemo(() => {
    if (!board) return [];
    if (!youOffPage || !me?.profile) return board.rows;
    return [...board.rows, {
      card: me.profile,
      metric: board.you.metric,
      trainedDays: [],
      trainedToday: false,
      isYou: true,
      rank: board.thresholdMet ? board.you.rank : null,
    }];
  }, [board, youOffPage, me]);

  if (!groupId) return null;

  const isAdmin = group?.myRole === 'admin';
  const isRequested = group?.myState === 'requested';

  const headerAction = isMember ? (
    <Pressable
      onPress={() => setMenuOpen(true)}
      hitSlop={hitSlop}
      style={styles.headerAction}
      accessibilityRole="button"
      accessibilityLabel="Group menu"
    >
      <Ionicons name="ellipsis-horizontal" size={22} color={t.colors.textPrimary} />
    </Pressable>
  ) : null;

  const menuRows = [
    ...(isAdmin ? [{
      icon: 'create-outline',
      label: 'Edit',
      onPress: () => {
        setMenuOpen(false);
        navigation.navigate('CommunityGroupCreate', {
          mode: 'edit',
          group: { id: group.id, name: group.name, blurb: group.blurb, access: group.access },
        });
      },
    }, {
      icon: 'person-add-outline',
      label: 'Invite by handle',
      onPress: () => { setMenuOpen(false); setInviteOpen(true); },
    }, {
      icon: 'share-outline',
      label: 'Share invite link',
      onPress: () => { setMenuOpen(false); setInviteOpen(true); },
    }] : []),
    {
      icon: 'people-outline',
      label: 'View members',
      onPress: () => {
        setMenuOpen(false);
        navigation.navigate('CommunityGroupMembers', { id: groupId, name: group?.name, myRole: group?.myRole });
      },
    },
    {
      icon: 'flag-outline',
      label: 'Report this group',
      onPress: () => { setMenuOpen(false); setReportOpen(true); },
    },
    ...(isAdmin ? [{
      icon: 'lock-closed-outline',
      label: 'Close group',
      tone: 'destructive',
      onPress: doClose,
    }] : []),
    {
      icon: 'exit-outline',
      label: 'Leave group',
      tone: 'destructive',
      onPress: doLeave,
    },
  ];

  const empty = loading ? (
    <View style={styles.skeleton}>
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={error === 'offline' ? 'You are offline' : 'Could not load this group'}
      text={error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading this group again"
    />
  ) : isMember ? (
    <EmptyState icon="images-outline" title="No stories yet" text="Nothing here yet from this group's members." />
  ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={group?.name || 'Group'} right={headerAction} />
      {loading && !group ? (
        <View style={styles.skeletonScreen}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : error && !group ? empty : (
        <FlashList
          data={isMember ? feedRows : []}
          keyExtractor={(item) => item.post.id}
          renderItem={({ item }) => (
            <ActivityItemRow
              item={item}
              onPress={() => navigation.navigate('CommunityPost', { id: item.post.id })}
              onRespect={() => react(item)}
              onOpenPerson={(author) => openProfile(author)}
            />
          )}
          ListHeaderComponent={(
            <View style={styles.header}>
              <Text style={[styles.label, { ...t.type.label, color: t.colors.textSecondary }]}>
                {groupLine(group)}
              </Text>
              {!isMember && !isMinor ? (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  title={isRequested ? 'Requested' : 'Join'}
                  disabled={isRequested}
                  loading={joining}
                  onPress={doJoin}
                  accessibilityLabel={isRequested ? 'Join requested' : 'Join group'}
                  style={styles.joinBtn}
                />
              ) : null}
              {isMember ? (
                <>
                  <Eyebrow trailing={{
                    label: 'See all',
                    onPress: () => navigation.navigate('CommunityGroupMembers', { id: groupId, name: group?.name, myRole: group?.myRole }),
                  }}
                  >
                    MEMBERS
                  </Eyebrow>
                  {displayMembers.map((row) => (
                    <PersonRow
                      key={row.card.user_id}
                      person={{ ...row.card, isYou: row.isYou }}
                      metric={metricLabel('week', row.metric)}
                      days={row.trainedDays}
                      trainedToday={row.trainedToday}
                      rank={board?.thresholdMet ? row.rank : null}
                      onPress={() => openProfile(row.card)}
                    />
                  ))}
                  <Eyebrow>ACTIVITY</Eyebrow>
                </>
              ) : null}
            </View>
          )}
          ListEmptyComponent={empty}
          ListFooterComponent={paging ? (
            <ActivityIndicator color={t.colors.primary} style={styles.footer} />
          ) : null}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
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
      )}
      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={group?.name || 'Group'} rows={menuRows} />
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="group"
        targetId={groupId}
      />
      <GroupInviteSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groupId={groupId}
        groupName={group?.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.sm },
  skeletonScreen: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  footer: { paddingVertical: spacing.lg },
  // Matches CommunityConversationScreen's header kebab: a fixed 48dp box so
  // the glyph clears the platform touch-target floor regardless of its own
  // visual size (Community accessibility pass, CLAUDE.md styling.md).
  headerAction: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  label: { ...type.label, color: colors.textSecondary },
  joinBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
});
