/**
 * CommunityGroupScreen (community product audit `docs/community-product-
 * audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 3-4;
 * presentation law `52-research-community-presentation.md` Part B/C,
 * `docs/social-discovery-2026-09-06/81-VISUAL-RULINGS.md`; server
 * contract `supabase/migrate_165_community_boards_groups.sql`
 * `community_group_get`).
 *
 * Header: name, access, member count. MenuSheet: Leave, Report, and for
 * admins Edit (routes to `CommunityGroupCreateScreen` in edit mode --
 * prefilled name/blurb/access, Save calls `community_group_update`),
 * Invite by handle, Share invite link and Close group. Body: the group board
 * (`community_board` scope group, week window, top rows, "See all" to
 * `CommunityBoard`), then the members' stories feed
 * (`community_group_feed`). Join / Request to join / Requested / Member
 * states drive the header action.
 *
 * Route params: { id: groupId } (also reached via the `g/?id=` deep link,
 * RootNavigator's linking config).
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import { SkeletonCard } from '../components/Skeleton';
import Button from '../components/Button';
import PostCard from '../components/community/PostCard';
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
  loadBoard, daysLabel, GROUP_ACCESS,
} from '../lib/community';

const PREVIEW_ROWS = 3;
const PAGE = 20;

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  minor_restricted: 'Groups are not available under 18.',
  already_member: 'You are already in this group.',
  group_closed: 'This group is closed.',
  last_admin: 'Promote someone else to admin before leaving.',
  not_found: 'This group is no longer available.',
};

function BoardPreview({ t, navigation, group, rows }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <SectionLabel tone="muted">This week</SectionLabel>
        <Pressable
          onPress={() => navigation.navigate('CommunityBoard', {
            scope: 'group', scopeKey: group.id, window: 'week', label: group.name,
          })}
          accessibilityRole="button"
          accessibilityLabel="See the full group board"
        >
          <Text style={[styles.seeAll, { ...t.type.caption, color: t.colors.primary }]}>See all</Text>
        </Pressable>
      </View>
      {rows.length ? (
        <View style={[styles.boardCard, { backgroundColor: t.colors.surface }]}>
          {rows.map((row, i) => {
            const card = row.card;
            const name = card.display_name || card.handle || 'Athlete';
            return (
              <View
                key={card.user_id}
                style={[
                  styles.boardRow,
                  i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.borderSubtle },
                ]}
              >
                <Text style={[styles.boardName, { ...t.type.bodyStrong, color: t.colors.textPrimary }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[styles.boardCaption, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
                  {row.trainedDays.length ? `Trained ${daysLabel(row.trainedDays)}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.emptyLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          No one here is sharing their consistency yet.
        </Text>
      )}
    </View>
  );
}

export default function CommunityGroupScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const { me } = useCommunityMe();
  const groupId = route?.params?.id ?? route?.params?.scopeKey ?? null;
  const isMinor = !!me?.is_minor;

  const [group, setGroup] = useState(null);
  const [boardRows, setBoardRows] = useState([]);
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
        const [board, feed] = await Promise.all([
          loadBoard({ scope: 'group', scopeKey: groupId, window: 'week', limit: PREVIEW_ROWS }),
          loadGroupFeed(groupId, { limit: PAGE }),
        ]);
        setBoardRows(board.rows.slice(0, PREVIEW_ROWS));
        setFeedRows(feed.rows);
        setCursor(feed.cursor);
      } else {
        setBoardRows([]);
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

  if (!groupId) return null;

  const isAdmin = group?.myRole === 'admin';
  const isMember = group?.myState === 'member';
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
      <SkeletonCard height={108} />
      <SkeletonCard height={108} />
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
          <SkeletonCard height={140} />
          <SkeletonCard height={108} />
          <SkeletonCard height={108} />
        </View>
      ) : error && !group ? empty : (
        <FlashList
          data={isMember ? feedRows : []}
          keyExtractor={(item) => item.post.id}
          renderItem={({ item }) => (
            <PostCard
              post={item.post}
              author={item.author}
              myReaction={item.myReaction}
              onPress={() => navigation.navigate('CommunityPost', { id: item.post.id })}
              onReact={() => react(item)}
              onOpenAuthor={() => (item.author?.handle
                ? navigation.navigate('CommunityProfile', { handle: item.author.handle })
                : null)}
            />
          )}
          ListHeaderComponent={(
            <View style={styles.header}>
              <View style={[styles.headerCard, { backgroundColor: t.colors.surface }]}>
                <Text style={[styles.name, { ...t.type.h2, color: t.colors.textPrimary }]}>{group?.name}</Text>
                {group?.blurb ? (
                  <Text style={[styles.blurb, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                    {group.blurb}
                  </Text>
                ) : null}
                <Text style={[styles.meta, { ...t.type.caption, color: t.colors.textMuted }]}>
                  {[GROUP_ACCESS[group?.access] ?? 'Open', group?.memberCount != null
                    ? `${group.memberCount} ${group.memberCount === 1 ? 'member' : 'members'}` : null]
                    .filter(Boolean).join(' · ')}
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
                  />
                ) : null}
              </View>
              {isMember ? <BoardPreview t={t} navigation={navigation} group={group} rows={boardRows} /> : null}
              {isMember ? <SectionLabel tone="muted">Stories</SectionLabel> : null}
            </View>
          )}
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
  skeleton: { gap: spacing.md },
  skeletonScreen: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
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
  header: { gap: spacing.md, marginBottom: spacing.sm },
  headerCard: { borderRadius: 16, padding: spacing.lg, gap: spacing.xs },
  name: { ...type.h2, color: colors.textPrimary },
  blurb: { ...type.bodySm, color: colors.textSecondary },
  meta: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xs },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { ...type.caption, color: colors.primary },
  boardCard: { borderRadius: 16 },
  boardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  boardName: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  boardCaption: { ...type.caption, color: colors.textMuted },
  emptyLine: { ...type.bodySm, color: colors.textSecondary },
});
