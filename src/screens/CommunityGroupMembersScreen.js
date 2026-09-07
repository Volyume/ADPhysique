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
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import Button from '../components/Button';
import MenuSheet from '../components/community/MenuSheet';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import { colors, spacing, type } from '../styles/theme';
import {
  listGroupMembers, approveGroupRequest, removeGroupMember, promoteGroupMember,
} from '../lib/community';

const PAGE = 20;

const ROLE_LABEL = Object.freeze({ admin: 'Admin', member: 'Member' });

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  last_admin: 'Promote someone else to admin first.',
  not_found: 'This is no longer available.',
  not_allowed: 'You cannot do that here.',
};

function MemberRow({ t, row, myRole, isFirst, isLast, onOpenMenu, onApprove, busy }) {
  const card = row.card;
  const name = card.display_name || card.handle || 'Athlete';
  const isRequest = row.state === 'requested';
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: t.colors.surface },
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.borderSubtle },
      ]}
    >
      <ProfileAvatarMark presetKey={card.avatar_preset} displayName={name} size={32} />
      <View style={styles.nameCol}>
        <Text style={[styles.name, { ...t.type.bodyStrong, color: t.colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.caption, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
          {isRequest ? 'Requested to join' : (ROLE_LABEL[row.role] ?? 'Member')}
        </Text>
      </View>
      {isRequest ? (
        <Button
          variant="primary"
          size="sm"
          fullWidth={false}
          title="Approve"
          loading={busy}
          onPress={() => onApprove(card.user_id)}
          accessibilityLabel={`Approve ${name}`}
        />
      ) : myRole === 'admin' ? (
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          icon="ellipsis-horizontal"
          title=""
          onPress={() => onOpenMenu(row)}
          accessibilityLabel={`More actions for ${name}`}
        />
      ) : null}
    </View>
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
    <View style={styles.loading}><ActivityIndicator color={t.colors.primary} /></View>
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
    <EmptyState icon="people-outline" title="No members yet" text="" />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={`${groupName} members`} />
      <FlashList
        data={rows}
        keyExtractor={(item) => item.card.user_id}
        renderItem={({ item, index }) => (
          <MemberRow
            t={t}
            row={item}
            myRole={myRole}
            isFirst={index === 0}
            isLast={index === rows.length - 1}
            onOpenMenu={setMenuRow}
            onApprove={approve}
            busy={busyId === item.card.user_id}
          />
        )}
        ListHeaderComponent={<SectionLabel tone="muted">Members</SectionLabel>}
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
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  footer: { paddingVertical: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  rowFirst: { marginTop: spacing.sm },
  rowLast: {},
  nameCol: { flex: 1, gap: 2 },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  caption: { ...type.caption, color: colors.textMuted },
});
