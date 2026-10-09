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
 *
 * Founder defect 2026-09-14, lead ruling CR-17: a person here used to
 * arrive in a `Card` and a group in a hand-rolled `surface` box with a
 * "View" chip, so the same person and the same group each read as a
 * different product from the Hub one tap away. `20-BLUEPRINT.md` section
 * 9 rule 2 bans `Card` for people and groups. People now render through
 * `ProfileCard` (which is `PersonRow`) and groups through `GroupRow`,
 * the Hub's own group row -- so a group found by search and a group on
 * the Hub are the same row, and the whole row is the target rather than
 * a chip inside a box.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles.
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import SectionHeader from '../components/community/SectionHeader';
import Band, { BandGap } from '../components/community/Band';
import Chip from '../components/Chip';
import ProfileCard from '../components/community/ProfileCard';
import GroupRow from '../components/community/GroupRow';
import useTheme from '../hooks/useTheme';
import { colors, spacing } from '../styles/theme';
import {
  searchPeople, searchGroups, GROUP_ACCESS,
  rankPeople, loadRecentPeopleSearches, recordPeopleSearch, clearRecentPeopleSearches,
} from '../lib/community';

const DEBOUNCE_MS = 250;
const PAGE = 20;

/** "Open · 8 members": the group row's one line, unchanged wording. */
export function groupLine(group) {
  const n = Number(group?.memberCount) || 0;
  return `${GROUP_ACCESS[group?.access] ?? 'Open'} · ${n} ${n === 1 ? 'member' : 'members'}`;
}

export default function CommunitySearchScreen({ navigation, route }) {
  const t = useTheme();
  const [query, setQuery] = useState(route?.params?.q ?? '');
  // D221 2.3: "Browse open groups" on the Hub opens this screen on groups.
  const [mode, setMode] = useState(route?.params?.mode === 'groups' ? 'groups' : 'people');
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
    <Band style={styles.skeleton}>
      <SkeletonPersonRow />
      <SkeletonPersonRow />
      <SkeletonPersonRow />
    </Band>
  ) : !query.trim() ? (
    <View>
      <EmptyState
        icon="search-outline"
        title={mode === 'groups' ? 'Search groups by name' : 'Search by @username or name'}
        text={mode === 'groups' ? 'Find an open group to join.' : 'Find someone you train with.'}
      />
      {mode === 'people' && recent.length > 0 ? (
        <Band>
          <SectionHeader
            title="Recent searches"
            trailing={{
              label: 'Clear',
              accessibilityLabel: 'Clear recent searches',
              onPress: () => { clearRecentPeopleSearches().then(() => setRecent([])).catch(() => {}); },
            }}
          />
          <View style={styles.recentRow}>
            {recent.map((r) => (
              <Chip key={r} label={r} onPress={() => setQuery(r)} accessibilityLabel={`Search for ${r} again`} />
            ))}
          </View>
        </Band>
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
      text="Try the start of their username, or their display name."
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Search" />
      <Band style={styles.controls}>
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
      </Band>
      <BandGap />
      <FlashList
        data={results}
        keyExtractor={(item) => (mode === 'groups' ? item.id : (item.card ?? item).user_id)}
        renderItem={({ item }) => (
          <Band>
            {mode === 'groups' ? (
              <GroupRow
                inBand
                group={item}
                line={groupLine(item)}
                people={[]}
                onPress={() => navigation.navigate('CommunityGroup', { id: item.id })}
                onPressWithLayout={(rect) => navigation.navigate('CommunityGroup', {
                  id: item.id, __heroOrigin: rect || undefined,
                })}
              />
            ) : (
              <ProfileCard
                inBand
                card={item.card ?? item}
                onPress={() => navigation.navigate('CommunityProfile', { handle: (item.card ?? item).handle })}
                onPressWithLayout={(rect) => navigation.navigate('CommunityProfile', {
                  handle: (item.card ?? item).handle, __heroOrigin: rect || undefined,
                })}
              />
            )}
          </Band>
        )}
        ListEmptyComponent={empty}
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
  // The search field and its mode chips are the first band (D221 V1, V9).
  controls: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  list: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  skeleton: { paddingHorizontal: spacing.lg },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  recentRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
});
