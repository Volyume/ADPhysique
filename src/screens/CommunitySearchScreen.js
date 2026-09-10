/**
 * CommunitySearchScreen (blueprint sections 1, 6; SD-09)
 *
 * People search by handle or display name. A plain match over public
 * content; nothing here ranks by popularity, and blocked people are
 * invisible in both directions server-side.
 *
 * The query is debounced and request-id guarded, the same shape the food
 * search uses, so a slow earlier answer can never overwrite a newer one.
 *
 * Programme search was removed with Community programme-sharing
 * (`docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles.
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import Chip from '../components/Chip';
import ProfileCard from '../components/community/ProfileCard';
import useTheme from '../hooks/useTheme';
import { colors, spacing, type } from '../styles/theme';
import {
  searchPeople, searchGroups, GROUP_ACCESS,
  rankPeople, loadRecentPeopleSearches, recordPeopleSearch, clearRecentPeopleSearches,
} from '../lib/community';

const DEBOUNCE_MS = 250;
const PAGE = 20;

export default function CommunitySearchScreen({ navigation, route }) {
  const t = useTheme();
  const [query, setQuery] = useState(route?.params?.q ?? '');
  const [mode, setMode] = useState('people');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);
  const seqRef = useRef(0);

  // Recent people searches (community product audit `40-GAP-CLOSURE.md`
  // §1, "People search tolerance"): last 8, on-device only, reloaded
  // whenever the box empties out so a search-then-clear shows the fresh
  // entry straight away.
  useEffect(() => {
    if (query.trim() || mode !== 'people') return;
    loadRecentPeopleSearches().then(setRecent).catch(() => {});
  }, [query, mode]);

  // "Find a group" (community product audit 60 §3-4): open groups only,
  // name prefix. Reuses this same search screen with a mode chip rather
  // than a second screen, per the "reachable from the Hub search" brief.
  const run = useCallback(async (q, m) => {
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]); setLoading(false); setError(null); return;
    }
    setLoading(true);
    try {
      const page = m === 'groups'
        ? await searchGroups(trimmed, { limit: PAGE })
        : await searchPeople(trimmed, { limit: PAGE });
      if (seqRef.current !== seq) return;
      // People search tolerance (40-GAP-CLOSURE.md §1): the server returns
      // up to 40 substring candidates, unordered for a human; the client
      // ranks them (exact handle, handle prefix, name token prefix, a
      // small edit-distance allowance), the same shape gyms/rank.js uses.
      setResults(m === 'groups' ? (page.groups ?? []) : rankPeople(page.people ?? [], trimmed));
      setError(null);
      if (m !== 'groups') recordPeopleSearch(trimmed).then(() => {
        loadRecentPeopleSearches().then(setRecent).catch(() => {});
      }).catch(() => {});
    } catch (e) {
      if (seqRef.current !== seq) return;
      setResults([]);
      setError(e?.code ?? 'unavailable');
    } finally {
      if (seqRef.current === seq) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { run(query, mode); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, mode, run]);

  const empty = loading ? (
    // Content-shaped placeholder for the results the query is about to
    // return, rather than a blank list (styling.md "Loading states"; the
    // same pattern FoodSearchScreen's own results loading uses).
    <View style={styles.skeleton}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : !query.trim() ? (
    <View>
      <EmptyState
        icon="search-outline"
        title={mode === 'groups' ? 'Search groups by name' : 'Search by @handle or name'}
        text={mode === 'groups' ? 'Find an open group to join.' : 'Find someone you train with.'}
      />
      {mode === 'people' && recent.length > 0 ? (
        <View style={styles.recentBlock}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { ...t.type.captionStrong, color: t.colors.textSecondary }]}>
              Recent searches
            </Text>
            <TouchableOpacity
              onPress={() => { clearRecentPeopleSearches().then(() => setRecent([])).catch(() => {}); }}
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
            >
              <Text style={[styles.recentClear, { ...t.type.captionStrong, color: t.colors.primary }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentRow}>
            {recent.map((r) => (
              <Chip key={r} label={r} onPress={() => setQuery(r)} accessibilityLabel={`Search for ${r} again`} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={error === 'offline' ? 'You are offline' : 'Could not search just now'}
      text={error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      actionLabel="Try again"
      onAction={() => run(query, mode)}
      actionAccessibilityLabel="Try the search again"
    />
  ) : mode === 'groups' ? (
    <EmptyState
      icon="people-circle-outline"
      title="No open groups by that name yet"
      text="Try the start of the group's name."
    />
  ) : (
    <EmptyState
      icon="people-outline"
      title="No one by that name yet"
      text="Try the start of their handle, or their display name."
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Search" />
      <View style={styles.controls}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={mode === 'groups' ? 'Search groups' : 'Search people'}
          autoFocus
          loading={loading}
          accessibilityLabel="Search Community"
        />
        <View style={styles.modeRow} accessibilityLabel="Search mode">
          <Chip label="People" selected={mode === 'people'} accessibilityRole="radio" onPress={() => setMode('people')} />
          <Chip label="Groups" selected={mode === 'groups'} accessibilityRole="radio" onPress={() => setMode('groups')} />
        </View>
      </View>
      <FlashList
        data={results}
        keyExtractor={(item) => (mode === 'groups' ? item.id : (item.card ?? item).user_id)}
        renderItem={({ item }) => (mode === 'groups' ? (
          <View style={[styles.groupRow, { backgroundColor: t.colors.surface }]}>
            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { ...t.type.bodyStrong, color: t.colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.groupMeta, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
                {`${GROUP_ACCESS[item.access] ?? 'Open'} · ${item.memberCount} ${item.memberCount === 1 ? 'member' : 'members'}`}
              </Text>
            </View>
            <Chip
              label="View"
              onPress={() => navigation.navigate('CommunityGroup', { id: item.id })}
              accessibilityLabel={`View ${item.name}`}
            />
          </View>
        ) : (
          <ProfileCard
            card={item.card ?? item}
            onPress={() => navigation.navigate('CommunityProfile', { handle: (item.card ?? item).handle })}
          />
        ))}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try { await run(query); } finally { setRefreshing(false); }
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
  controls: { padding: spacing.lg, gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  skeleton: { gap: spacing.sm },
  modeRow: { flexDirection: 'row', gap: spacing.xs2 },
  recentBlock: { paddingHorizontal: spacing.lg, marginTop: -spacing.md, gap: spacing.sm },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentTitle: { ...type.captionStrong },
  recentClear: { ...type.captionStrong },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, padding: spacing.md, marginBottom: spacing.md,
  },
  groupInfo: { flex: 1, gap: 2 },
  groupName: { ...type.bodyStrong, color: colors.textPrimary },
  groupMeta: { ...type.caption, color: colors.textMuted },
});
