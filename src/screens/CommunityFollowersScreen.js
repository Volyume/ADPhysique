/**
 * CommunityFollowersScreen (community product audit `docs/community-
 * product-audit-2026-09-07/40-GAP-CLOSURE.md` §1 "Follow management";
 * server contract `community_list_followers` in
 * `supabase/migrate_164_community_gap_closure.sql` Part 7, self-only).
 *
 * The caller's own followers, keyset-paged. A trailing kebab per row
 * opens a `MenuSheet` with one action, "Remove follower", which calls the
 * existing `removeFollower` lib function after a calm confirm. Reached
 * from `CommunityPrivacyScreen` and from the follower count on the
 * caller's own `CommunityProfileScreen`.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import ProfileCard from '../components/community/ProfileCard';
import MenuSheet from '../components/community/MenuSheet';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import { colors, spacing } from '../styles/theme';
import { listFollowers, removeFollower } from '../lib/community';

const PAGE = 20;

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
};

export default function CommunityFollowersScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState(null);
  const [menuCard, setMenuCard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listFollowers({ limit: PAGE });
      setRows(page.people);
      setCursor(page.cursor);
      setError(null);
    } catch (e) {
      setError(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onEndReached = useCallback(async () => {
    if (paging || !cursor || !rows.length) return;
    setPaging(true);
    try {
      const page = await listFollowers({ cursor, limit: PAGE });
      if (page.people.length) {
        setRows((prev) => [...prev, ...page.people]);
        setCursor(page.cursor);
      } else {
        setCursor(null);
      }
    } catch (_e) {
      setCursor(null);
    } finally {
      setPaging(false);
    }
  }, [cursor, paging, rows.length]);

  function cardOf(row) {
    return row?.card ?? row;
  }

  function confirmRemove(card) {
    setMenuCard(null);
    appAlert(
      'Remove this follower?',
      `@${card.handle} will stop following you. They will not be told.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFollower(card.user_id);
              setRows((prev) => prev.filter((r) => cardOf(r).user_id !== card.user_id));
              toast.show('Follower removed');
            } catch (_e) {
              toast.show('Could not do that just now.', { variant: 'error' });
            }
          },
        },
      ],
    );
  }

  const menuRows = menuCard ? [{
    icon: 'person-remove-outline',
    label: 'Remove follower',
    tone: 'destructive',
    onPress: () => confirmRemove(menuCard),
  }] : [];

  const empty = loading ? (
    <View style={styles.skeleton}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={error === 'offline' ? 'You are offline' : 'Could not load your followers'}
      text={REFUSALS[error] ?? 'Try again in a moment.'}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading your followers again"
    />
  ) : (
    <EmptyState
      icon="people-outline"
      title="No followers yet"
      text="When someone follows you, they will show up here."
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Followers" />
      <FlashList
        data={rows}
        keyExtractor={(row) => cardOf(row).user_id}
        renderItem={({ item }) => {
          const card = cardOf(item);
          return (
            <View style={styles.row}>
              <View style={styles.cardWrap}>
                <ProfileCard
                  card={card}
                  showFollow={false}
                  compact
                  onPress={() => navigation.navigate('CommunityProfile', { userId: card.user_id })}
                />
              </View>
              <Pressable
                onPress={() => setMenuCard(card)}
                hitSlop={spacing.sm}
                style={[styles.kebab, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Options for @${card.handle}`}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={t.colors.textPrimary} />
              </Pressable>
            </View>
          );
        }}
        contentContainerStyle={styles.content}
        ListEmptyComponent={empty}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />
        )}
        ListFooterComponent={paging ? (
          <View style={styles.footer}><ActivityIndicator color={t.colors.primary} /></View>
        ) : null}
      />
      <MenuSheet
        visible={!!menuCard}
        onClose={() => setMenuCard(null)}
        title={menuCard ? `@${menuCard.handle}` : 'Options'}
        rows={menuRows}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  loading: { paddingTop: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.sm },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cardWrap: { flex: 1 },
  kebab: {
    width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
});
