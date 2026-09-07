/**
 * CommunityPeopleListScreen (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 4,
 * 5, 7 and 10; SD-23, SD-24, SD-26)
 *
 * The scored list behind one door: profile cards with their reasons, a
 * Follow, a Connect and, once connected, a Message.
 *
 * REASONS, NEVER PERCENTAGES (SD-24). The server scores candidates to
 * order them; the row shows the reasons in their fixed wording and no
 * number. A percentage would claim a precision coarse bands cannot carry
 * and invite ranking people against each other.
 *
 * Two sources, one shape. A door opens `community_find_people` for the
 * mode; "People on this programme" opens `community_programme_people`
 * for that programme (SD-26), which is gated behind the person's own
 * "Show which programmes I use" toggle. Both answer profile cards and a
 * server cursor, so the list below does not care which it is reading.
 *
 * The zero state never pretends (SD-28): it says what is true and offers
 * the one thing that changes it, which at this size is the profile link.
 *
 * Route params: { mode, key?, label, programmeId? }
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, RefreshControl, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import ProfileCard from '../components/community/ProfileCard';
import ConnectSheet from '../components/community/ConnectSheet';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing } from '../styles/theme';
import {
  findPeople, programmePeople, doorsFor, doorZeroState, profileUrl,
} from '../lib/community';

const PAGE = 20;

/** Both payload shapes reduced to one row: a card and its reasons. */
export function normaliseRow(row) {
  if (!row) return null;
  const card = row.card ?? row;
  if (!card?.user_id) return null;
  return { card, reasons: Array.isArray(row.reasons) ? row.reasons : [] };
}

export default function CommunityPeopleListScreen({ navigation, route }) {
  const t = useTheme();
  const { me } = useCommunityMe();
  const mode = route?.params?.mode ?? 'like_me';
  const key = route?.params?.key ?? null;
  const label = route?.params?.label ?? 'People';
  const programmeId = route?.params?.programmeId ?? null;

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState(null);
  const [connectCard, setConnectCard] = useState(null);

  const read = useCallback((opts) => (programmeId
    ? programmePeople(programmeId, opts)
    : findPeople(mode, opts)), [programmeId, mode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await read({ limit: PAGE });
      setRows((page.people ?? []).map(normaliseRow).filter(Boolean));
      // The server mints the cursor; a client-built one is refused.
      setCursor(page.cursor);
      setError(null);
    } catch (e) {
      setError(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, [read]);

  useEffect(() => { load(); }, [load]);

  const onEndReached = useCallback(async () => {
    if (paging || !cursor || !rows.length) return;
    setPaging(true);
    try {
      const page = await read({ cursor, limit: PAGE });
      const next = (page.people ?? []).map(normaliseRow).filter(Boolean);
      if (next.length) {
        setRows((prev) => [...prev, ...next]);
        setCursor(page.cursor);
      } else {
        setCursor(null);
      }
    } catch (_e) {
      setCursor(null);
    } finally {
      setPaging(false);
    }
  }, [cursor, paging, read, rows.length]);

  /** Replace one card in place, so a follow or a connect does not reload. */
  function patch(card) {
    if (!card?.user_id) return;
    setRows((prev) => prev.map((row) => (row.card.user_id === card.user_id
      ? { ...row, card }
      : row)));
  }

  function openRules() {
    navigation.navigate('CommunityRules', { mustAccept: true });
  }

  const door = doorsFor(me).find((d) => d.mode === mode)
    ?? { mode, available: true, key, requirement: null };

  const empty = loading ? (
    <View style={styles.loading}><ActivityIndicator color={t.colors.primary} /></View>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={error === 'offline' ? 'You are offline' : 'Could not load this list'}
      text={error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading this list again"
    />
  ) : (
    <EmptyState
      icon="people-outline"
      title="Nobody here yet"
      text={programmeId
        ? 'Nobody else has this programme in their plans yet. Anyone who takes it and shares their programmes will appear here.'
        : doorZeroState({ ...door, key: door.key ?? key })}
      actionLabel="Share your profile link"
      onAction={async () => {
        try { await Share.share({ message: profileUrl(me?.profile?.handle) }); }
        catch (_) { /* the user dismissed the share sheet */ }
      }}
      actionAccessibilityLabel="Share my profile link"
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={label} />
      <FlashList
        data={rows}
        keyExtractor={(item) => item.card.user_id}
        renderItem={({ item }) => (
          <ProfileCard
            card={item.card}
            reasons={item.reasons}
            me={me}
            showConnect
            onPress={() => navigation.navigate('CommunityProfile', { handle: item.card.handle })}
            onFollowChange={(relationship) => patch({ ...item.card, relationship })}
            onConnect={(card) => setConnectCard(card)}
            onConnectChange={patch}
            onMessage={(card) => navigation.navigate('CommunityConversation', { userId: card.user_id })}
            onRulesOutdated={openRules}
          />
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

      <ConnectSheet
        visible={!!connectCard}
        onClose={() => setConnectCard(null)}
        card={connectCard}
        // The partners door is the one place a request already has its
        // reason: that is the door the person came through (SD-25).
        preselect={mode === 'partners' ? ['train_together'] : []}
        onSent={patch}
        onRulesOutdated={openRules}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  footer: { paddingVertical: spacing.lg },
});
