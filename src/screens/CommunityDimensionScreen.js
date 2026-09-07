/**
 * CommunityDimensionScreen (blueprint section 6; SD-10; discovery
 * blueprint `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`
 * section 8; SD-27, SD-31)
 *
 * A dimension is a page, not a room: the people who chose the same
 * style, gym, area or programme, and the programmes published in it.
 * There is no feed of its own, no admin, no leaderboard and no join
 * button, because there is nothing to join.
 *
 * A gym dimension additionally carries a summary (`community_gym_summary`):
 * member count, how many the reader follows, counts by style and by
 * shared time band, and how many are open to training together. Read
 * alongside `loadDimension` rather than instead of it, and best effort:
 * the page still works as a plain dimension list if the summary read
 * fails. Nothing here is live or precise (SD-31): the gym page is a
 * noticeboard, never a room.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles.
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import ProfileCard from '../components/community/ProfileCard';
import ProgrammeTile from '../components/community/ProgrammeTile';
import GymSummary from '../components/community/GymSummary';
import useTheme from '../hooks/useTheme';
import { colors, spacing, type } from '../styles/theme';
import { loadDimension, gymSummary } from '../lib/community';
import { peopleLine } from '../components/community/DimensionRow';

const PAGE = 20;

export default function CommunityDimensionScreen({ navigation, route }) {
  const t = useTheme();
  const kind = route?.params?.kind ?? null;
  const key = route?.params?.key ?? null;
  const paramLabel = route?.params?.label ?? '';
  const isGym = kind === 'gym';

  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const out = await loadDimension(kind, key, { limit: PAGE });
      setData(out);
      setError(null);
    } catch (e) {
      setError(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
    if (isGym && key) {
      // Best effort: the gym summary is an addition on top of the plain
      // dimension list, never the reason the page fails to load.
      try {
        setSummary(await gymSummary(key));
      } catch (_e) {
        setSummary(null);
      }
    } else {
      setSummary(null);
    }
  }, [kind, key, isGym]);

  useEffect(() => { load(); }, [load]);

  const label = data?.label || paramLabel;
  const people = data?.people ?? [];
  const programmes = data?.programmes ?? [];

  const header = (
    <View style={styles.header}>
      {isGym && summary ? (
        <GymSummary summary={summary} label={label} />
      ) : (
        <>
          <Text style={[styles.title, { ...t.type.h2, color: t.colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.sub, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {peopleLine(data?.count ?? people.length)}
          </Text>
        </>
      )}
      {people.length ? <SectionLabel>People</SectionLabel> : null}
    </View>
  );

  const footer = programmes.length ? (
    <View style={styles.footerBlock}>
      <SectionLabel>Programmes</SectionLabel>
      {programmes.map((row) => (
        <ProgrammeTile
          key={(row.programme ?? row).id}
          programme={row.programme ?? row}
          creator={row.creator ?? null}
          onPress={() => navigation.navigate('CommunityProgramme', { id: (row.programme ?? row).id })}
        />
      ))}
    </View>
  ) : null;

  const empty = loading ? (
    <View style={styles.loading}><ActivityIndicator color={t.colors.primary} /></View>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={error === 'offline' ? 'You are offline' : 'Could not load this'}
      text={error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading this again"
    />
  ) : programmes.length ? null : (
    <EmptyState
      icon="people-outline"
      title="Nobody here yet"
      text="When other people choose this, they appear here."
      actionLabel="Find people"
      onAction={() => navigation.navigate('CommunitySearch')}
      actionAccessibilityLabel="Find people to follow"
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={label || 'Community'} />
      <FlashList
        data={people}
        keyExtractor={(item) => (item.card ?? item).user_id}
        renderItem={({ item }) => (
          <ProfileCard
            card={item.card ?? item}
            onPress={() => navigation.navigate('CommunityProfile', { handle: (item.card ?? item).handle })}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => { /* one page per dimension; the list is small by design */ }}
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
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { ...type.h2, color: colors.textPrimary },
  sub: { ...type.bodySm, color: colors.textSecondary },
  footerBlock: { gap: spacing.md, marginTop: spacing.lg },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
});
