/**
 * CommunityPeopleListScreen (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 4,
 * 5, 7 and 10; SD-23, SD-24, SD-26; community-product-audit-2026-09-07
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.3)
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
 * server cursor, so the list below does not care which it is reading --
 * except the combinable filters (spec 1.3): those are a `find_people`
 * concept only, so the filter button and its row never appear on a
 * programme list.
 *
 * FILTERS ARE HARD (spec 1.1 C). Applying one narrows the scored query;
 * it never re-weights it. Applied filters render as removable chips
 * above the list, and the count line reads "N people" once it is exact
 * or "N+ people" once the server's scan cap made it a floor
 * (`count_truncated`).
 *
 * FALLBACK ROWS (SD-28) are recently active public profiles with no
 * reasons at all, appended only to a first page under 5 with no filters
 * applied. They render under their own "More people on Volyume" divider,
 * inserted as its own list item (`withFallbackDivider`) so it recycles
 * and virtualizes exactly like a row, never as an ItemSeparator quirk.
 *
 * The zero state never pretends (SD-28): it says what is true and offers
 * the one thing that changes it, which at this size is the profile link.
 *
 * Route params: { mode, key?, label, programmeId? }
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator, Share, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import Chip from '../components/Chip';
import ProfileCard from '../components/community/ProfileCard';
import ConnectSheet from '../components/community/ConnectSheet';
import PeopleFiltersSheet from '../components/community/PeopleFiltersSheet';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, iconSize, hitSlop } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import * as haptics from '../lib/haptics';
import {
  findPeople, programmePeople, doorsFor, doorZeroState, profileUrl,
  filterChips, removeFilterChip, peopleCountLine,
  TP_DAYS, TP_TIME_BANDS, TP_EXPERIENCE_BANDS, TP_AGE_BANDS,
  COMMUNITY_STYLE_KEYS, COMMUNITY_GOALS,
} from '../lib/community';

const PAGE = 20;

/** Both payload shapes reduced to one row: a card, its reasons and
 * whether it is an SD-28 fallback row (never for programme people, which
 * has no such concept and so is never flagged). */
export function normaliseRow(row) {
  if (!row) return null;
  const card = row.card ?? row;
  if (!card?.user_id) return null;
  return {
    card,
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    fallback: !!row.fallback,
  };
}

/** The label maps `filterChips` renders applied filters with. Plain data,
 * built once: see `findPeople.js`'s own note on why this is dependency
 * injection rather than an import inside that module. */
const FILTER_LABELS = Object.freeze({
  styles: COMMUNITY_STYLE_KEYS,
  goals: COMMUNITY_GOALS,
  days: TP_DAYS,
  timeBands: TP_TIME_BANDS,
  experience: TP_EXPERIENCE_BANDS,
  ageBand: TP_AGE_BANDS,
});

const FALLBACK_DIVIDER = Object.freeze({ type: 'divider', key: 'fallback-divider' });

/**
 * Interleave the SD-28 fallback divider as its OWN list item, directly
 * before the first fallback row, rather than as an ItemSeparator: the
 * divider must recycle and virtualize exactly like a row. Fallback rows
 * are only ever appended once, to the first page, so there is at most
 * one contiguous block and at most one divider.
 *
 * @param {Array<{card: object, reasons: string[], fallback: boolean}>} rows
 * @returns {Array<{type: 'person', key: string, row: object}|{type: 'divider', key: string}>}
 */
export function withFallbackDivider(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const items = list.map((row) => ({ type: 'person', key: row.card.user_id, row }));
  const firstFallback = list.findIndex((row) => row?.fallback);
  if (firstFallback === -1) return items;
  items.splice(firstFallback, 0, FALLBACK_DIVIDER);
  return items;
}

export default function CommunityPeopleListScreen({ navigation, route }) {
  const t = useTheme();
  const { me } = useCommunityMe();
  const mode = route?.params?.mode ?? 'like_me';
  const key = route?.params?.key ?? null;
  const label = route?.params?.label ?? 'People';
  const programmeId = route?.params?.programmeId ?? null;
  // Spec 1.3: filters are a `community_find_people` concept only.
  const filterable = !programmeId;

  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState(null);
  const [connectCard, setConnectCard] = useState(null);
  const [filters, setFilters] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [count, setCount] = useState(null);
  const [countTruncated, setCountTruncated] = useState(false);

  const read = useCallback((opts) => (programmeId
    ? programmePeople(programmeId, opts)
    : findPeople(mode, { ...opts, filters })), [programmeId, mode, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await read({ limit: PAGE });
      setRows((page.people ?? []).map(normaliseRow).filter(Boolean));
      // The server mints the cursor; a client-built one is refused.
      setCursor(page.cursor);
      setCount(Number.isFinite(page.count) ? page.count : null);
      setCountTruncated(!!page.count_truncated);
      setError(null);
    } catch (e) {
      setError(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, [read]);

  // Re-runs whenever `filters` changes: `read` (and so `load`) closes
  // over it, so applying or clearing a filter is just another load.
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

  const listItems = useMemo(() => withFallbackDivider(rows), [rows]);
  const chips = useMemo(() => (filterable ? filterChips(filters, FILTER_LABELS) : []), [filterable, filters]);
  const countLine = peopleCountLine(count, countTruncated);

  const listHeader = (chips.length || countLine) ? (
    <View style={styles.listHeader}>
      {countLine ? (
        <Text style={[styles.countLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          {countLine}
        </Text>
      ) : null}
      {chips.length ? (
        <View style={styles.chips} accessibilityLabel="Applied filters">
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              selected
              icon="close-outline"
              accessibilityLabel={`Remove filter: ${chip.label}`}
              onPress={() => setFilters((prev) => removeFilterChip(prev, chip.key))}
            />
          ))}
        </View>
      ) : null}
    </View>
  ) : null;

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
  ) : filters ? (
    <EmptyState
      icon="funnel-outline"
      title="Nobody matches these filters"
      text="Try removing one, or widen the distance."
      actionLabel="Clear filters"
      onAction={() => setFilters(null)}
      actionAccessibilityLabel="Clear all filters"
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
      <BackHeader
        title={label}
        right={filterable ? (
          <TouchableOpacity
            onPress={() => { haptics.selection(); setFiltersOpen(true); }}
            hitSlop={hitSlop}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Filters"
          >
            <Ionicons
              name={filters ? 'options' : 'options-outline'}
              size={iconSize.md}
              color={filters ? t.colors.primary : t.colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      />
      <FlashList
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (item.type === 'divider' ? (
          <View style={styles.divider} accessibilityRole="header">
            <View style={[styles.dividerLine, { backgroundColor: t.colors.borderSubtle }]} />
            <Text style={[styles.dividerLabel, { ...t.type.caption, color: t.colors.textMuted }]}>
              More people on Volyume
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: t.colors.borderSubtle }]} />
          </View>
        ) : (
          <ProfileCard
            card={item.row.card}
            reasons={item.row.reasons}
            me={me}
            showConnect
            onPress={() => navigation.navigate('CommunityProfile', { handle: item.row.card.handle })}
            onFollowChange={(relationship) => patch({ ...item.row.card, relationship })}
            onConnect={(card) => setConnectCard(card)}
            onConnectChange={patch}
            onMessage={(card) => navigation.navigate('CommunityConversation', { userId: card.user_id })}
            onRulesOutdated={openRules}
          />
        ))}
        ListHeaderComponent={listHeader}
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

      {filterable ? (
        <PeopleFiltersSheet
          visible={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          value={filters}
          onApply={setFilters}
          me={me}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  footer: { paddingVertical: spacing.lg },
  headerAction: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  listHeader: { gap: spacing.sm, marginBottom: spacing.md },
  countLine: { ...type.bodySm, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: { ...type.caption, color: colors.textMuted },
});
