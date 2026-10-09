/**
 * CommunityGroupMembersScreen (community product audit `docs/community-
 * product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 3-4;
 * server contract `community_group_members(_group_id, _cursor, _limit)`).
 *
 * A flat roster: avatar 32, name, role badge. Admins additionally see
 * pending requests to approve, and get a row menu (Remove / Make admin)
 * on every other member. `community_group_members` itself only returns
 * request rows to an admin caller, so this screen never has to decide
 * that -- it renders whatever state each row carries.
 *
 * Route params: { id: groupId, name?, myRole? }
 */

import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import Ionicons from '@expo/vector-icons/Ionicons';
import SectionHeader from '../components/community/SectionHeader';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import PersonRow from '../components/community/PersonRow';
import Band from '../components/community/Band';
import Button from '../components/Button';
import MenuSheet from '../components/community/MenuSheet';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import { colors, spacing, iconSize } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import {
  listGroupMembers, approveGroupRequest, removeGroupMember, promoteGroupMember,
} from '../lib/community';
import { RESTRICTION_REFUSALS } from '../lib/community/restriction';

const PAGE = 20;

const ROLE_LABEL = Object.freeze({ admin: 'Admin', member: 'Member' });

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  ...RESTRICTION_REFUSALS,
  last_admin: 'Promote someone else to admin first.',
  not_found: 'This is no longer available.',
  not_allowed: 'You cannot do that here.',
};

/** One member: the shared roster row (D221 V3) with the role as its second
 * line and the admin's one action at the trailing edge. */
function MemberRow({ t, row, myRole, onOpenMenu, onApprove, busy }) {
  const card = row.card;
  const name = card.display_name || card.handle || 'Athlete';
  const isRequest = row.state === 'requested';
  const caption = isRequest ? 'Requested to join' : (ROLE_LABEL[row.role] ?? 'Member');
  let trailing = null;
  if (isRequest) {
    trailing = (
      <Button
        variant="primary"
        size="sm"
        fullWidth={false}
        title="Approve"
        loading={busy}
        onPress={() => onApprove(card.user_id)}
        accessibilityLabel={`Approve ${name}`}
      />
    );
  } else if (myRole === 'admin') {
    trailing = (
      <Pressable
        onPress={() => onOpenMenu(row)}
        style={styles.action}
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${name}`}
      >
        <Ionicons name="ellipsis-horizontal" size={iconSize.md} color={t.colors.textPrimary} />
      </Pressable>
    );
  }
  return (
    <Band>
      <PersonRow inBand person={{ ...card, caption }} trailing={trailing} />
    </Band>
  );
}

export default function CommunityGroupMembersScreen({ route }) {
  const t = useTheme();
  const toast = useToast();
  const groupId = route?.params?.id ?? null;
  const groupName = route?.params?.name ?? 'Group';
  const myRole = route?.params?.myRole ?? null;

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const page = await listGroupMembers(groupId, { limit: PAGE });
      setRows(page.members);
      setCursor(page.cursor);
      setError(null);
    } catch (e) {
      setError(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const onEndReached = useCallback(async () => {
    if (paging || !cursor || !rows.length) return;
    setPaging(true);
    try {
      const page = await listGroupMembers(groupId, { cursor, limit: PAGE });
      if (page.members.length) {
        setRows((prev) => [...prev, ...page.members]);
        setCursor(page.cursor);
      } else {
        setCursor(null);
      }
    } catch (_e) {
      setCursor(null);
    } finally {
      setPaging(false);
    }
  }, [cursor, groupId, paging, rows.length]);

  async function approve(userId) {
    setBusyId(userId);
    try {
      await approveGroupRequest(groupId, userId);
      setRows((prev) => prev.map((r) => (r.card.user_id === userId ? { ...r, state: 'member' } : r)));
      toast.show('Approved.');
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not approve that request just now.', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(userId) {
    try {
      await removeGroupMember(groupId, userId);
      setRows((prev) => prev.filter((r) => r.card.user_id !== userId));
      toast.show('Removed from the group.');
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not remove that member just now.', { variant: 'error' });
    }
  }

  async function makeAdmin(userId) {
    try {
      await promoteGroupMember(groupId, userId);
      setRows((prev) => prev.map((r) => (r.card.user_id === userId ? { ...r, role: 'admin' } : r)));
      toast.show('Now an admin.');
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not do that just now.', { variant: 'error' });
    }
  }

  const menuRows = menuRow ? [
    ...(menuRow.role !== 'admin' ? [{
      icon: 'ribbon-outline',
      label: 'Make admin',
      onPress: () => { setMenuRow(null); makeAdmin(menuRow.card.user_id); },
    }] : []),
    {
      icon: 'person-remove-outline',
      label: 'Remove from group',
      tone: 'destructive',
      onPress: () => { setMenuRow(null); remove(menuRow.card.user_id); },
    },
  ] : [];

  const empty = loading ? (
    <Band style={styles.skeleton}>
      <SkeletonPersonRow />
      <SkeletonPersonRow />
      <SkeletonPersonRow />
      <SkeletonPersonRow />
    </Band>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={error === 'offline' ? 'You are offline' : 'Could not load members'}
      text={error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading members again"
    />
  ) : (
    <EmptyState icon="people-outline" title="No members yet" text="Members appear here once they join." />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={`${groupName} members`} />
      <FlashList
        data={rows}
        keyExtractor={(item) => item.card.user_id}
        renderItem={({ item }) => (
          <MemberRow
            t={t}
            row={item}
            myRole={myRole}
            onOpenMenu={setMenuRow}
            onApprove={approve}
            busy={busyId === item.card.user_id}
          />
        )}
        ListHeaderComponent={rows.length ? <Band><SectionHeader title="Members" /></Band> : null}
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
      <MenuSheet
        visible={!!menuRow}
        onClose={() => setMenuRow(null)}
        title={menuRow?.card?.display_name || menuRow?.card?.handle || 'Member'}
        rows={menuRows}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { paddingHorizontal: spacing.lg },
  footer: { paddingVertical: spacing.lg },
  action: {
    width: touchTarget.minimum, height: touchTarget.minimum, alignItems: 'center', justifyContent: 'center',
    marginRight: -spacing.sm,
  },
});
