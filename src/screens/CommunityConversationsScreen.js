/**
 * CommunityConversationsScreen — the Messages list (discovery blueprint
 * sections 2 and 10, `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`;
 * SD-21, SD-31, SD-32).
 *
 * Every conversation you have, most recent first. Messaging is a
 * consequence of connection, not a feature of its own, so the empty
 * state does not sell messaging: it says who you can message and sends
 * you to Find people, which is where a connection actually starts.
 *
 * There are no realtime subscriptions in this campaign. The list is read
 * on focus and on pull to refresh, which is enough for a text
 * conversation and keeps a socket off a training app.
 *
 * A conversation the server has closed (a connection removed, a block
 * placed) is not listed at all, which is what the confirm on those
 * actions promised.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list renders through FlashList.
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import ConversationRow from '../components/community/ConversationRow';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing } from '../styles/theme';
import { listConversations, markRead } from '../lib/community';

const PAGE = 30;

export const CONVERSATIONS_OFFLINE_LINE = 'Volyume could not reach Community just now. Check your connection and try again.';

/** What went wrong, in the words that name the actual reason. */
export function conversationsErrorLine(code) {
  if (code === 'offline') return CONVERSATIONS_OFFLINE_LINE;
  if (code === 'no_profile') return 'Create your Community profile first, then your messages appear here.';
  return 'Volyume could not open your messages just now. Try again in a moment.';
}

export default function CommunityConversationsScreen({ navigation }) {
  const t = useTheme();
  const { refresh: refreshMe } = useCommunityMe();

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [errorCode, setErrorCode] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listConversations({ limit: PAGE });
      setRows(page.conversations);
      // The server mints the cursor; a client-built one is refused.
      setCursor(page.cursor);
      setErrorCode(null);
    } catch (e) {
      setErrorCode(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onEndReached = useCallback(async () => {
    if (paging || !cursor || !rows.length) return;
    setPaging(true);
    try {
      const page = await listConversations({ cursor, limit: PAGE });
      if (page.conversations.length) {
        setRows((prev) => [...prev, ...page.conversations]);
        setCursor(page.cursor);
      } else {
        setCursor(null);
      }
    } catch (_e) {
      setCursor(null); // the page the reader already has stays
    } finally {
      setPaging(false);
    }
  }, [cursor, paging, rows.length]);

  const open = useCallback((conversation) => {
    const id = conversation?.id ?? null;
    if (!id) return;
    if (Number(conversation.unread) > 0) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, unread: 0 } : r)));
      markRead(id)
        .then(() => refreshMe(true))
        .catch(() => { /* best effort: the count clears on the next read */ });
    }
    navigation.navigate('CommunityConversation', { id });
  }, [navigation, refreshMe]);

  const empty = loading ? (
    <View style={styles.skeleton}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : errorCode ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={errorCode === 'offline' ? 'You are offline' : 'Could not load messages'}
      text={conversationsErrorLine(errorCode)}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading your messages again"
    />
  ) : (
    <EmptyState
      icon="chatbubbles-outline"
      title="No messages yet"
      text="Messages are between people you are connected with. Connect with someone from Find people first."
      actionLabel="Find people"
      onAction={() => navigation.navigate('CommunityFindPeople')}
      actionAccessibilityLabel="Find people to connect with"
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Messages" />
      <FlashList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={96}
        renderItem={({ item }) => (
          <ConversationRow conversation={item} onPress={() => open(item)} />
        )}
        ListEmptyComponent={empty}
        ListFooterComponent={paging ? (
          <ActivityIndicator color={t.colors.primary} style={styles.footer} />
        ) : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  separator: { height: spacing.md },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
