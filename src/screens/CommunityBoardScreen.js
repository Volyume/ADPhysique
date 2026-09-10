/**
 * CommunityBoardScreen (community product audit
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 2, 4; presentation law `52-research-community-presentation.md`
 * Part B/C D3, `docs/social-discovery-2026-09-06/81-VISUAL-RULINGS.md`;
 * communities revamp 2026-09-10, `docs/communities-revamp-2026-09-10/
 * 21-PHASE1-SPEC.md` section 4: "rows become PersonRow with DayDots and
 * the metric; hairlines; nothing else changes").
 *
 * One flat ranked list: rank number (hidden under the small-group
 * threshold), avatar, name, trained-day dots, right-aligned metric. The
 * caller's own row gets a `surface2` tint (`PersonRow`'s own formula) and
 * is pinned at the bottom when it is off the loaded page. No medals, no
 * all-time window, calm copy throughout.
 *
 * Decision the spec left open, flagged for the lead: `PersonRow` is
 * always a pressable row (its `accessibilityRole="button"` is not
 * conditional on `onPress` being set), and every other PersonRow usage
 * this campaign adds opens the person's profile, so a row here opens
 * `CommunityProfile` on tap too -- the plain hand-rolled row this
 * replaces had no tap target at all, and leaving one that announces as a
 * button but does nothing felt like the worse regression of the two.
 *
 * Route params: { scope ('gym'|'following'|'everyone'|'group'),
 *   scopeKey?, window? ('week'|'month'|'consistency'), label? }
 * A 'group' scope is passed in by params (lane B2b's groups screens use
 * this same screen); this lane never opens it itself.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import { SkeletonRow } from '../components/Skeleton';
import Chip from '../components/Chip';
import PersonRow from '../components/community/PersonRow';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing } from '../styles/theme';
import {
  loadBoard, metricLabel,
  BOARD_SCOPES, BOARD_SCOPE_ORDER, BOARD_WINDOWS, BOARD_WINDOW_ORDER,
  readShareSettings,
} from '../lib/community';

const PAGE = 20;

/** One row: `PersonRow` with `DayDots` and the right-aligned metric
 * (spec section 4). `onPress` opens the person's profile (see the
 * header comment); a card with no handle simply has nothing to open. */
function BoardRow({ row, window, onOpenPerson }) {
  return (
    <PersonRow
      person={{ ...row.card, isYou: row.isYou }}
      metric={metricLabel(window, row.metric)}
      days={row.trainedDays}
      trainedToday={row.trainedToday}
      rank={row.rank}
      onPress={row.card?.handle ? () => onOpenPerson(row.card) : undefined}
    />
  );
}

export default function CommunityBoardScreen({ navigation, route }) {
  const t = useTheme();
  const { me } = useCommunityMe();
  const scope = route?.params?.scope ?? 'gym';
  const scopeKey = route?.params?.scopeKey ?? null;
  const label = route?.params?.label ?? null;
  const isGroup = scope === 'group';

  const [window, setWindow] = useState(
    BOARD_WINDOWS[route?.params?.window] ? route.params.window : 'week',
  );
  const [rows, setRows] = useState([]);
  const [you, setYou] = useState(null);
  const [count, setCount] = useState(0);
  const [thresholdMet, setThresholdMet] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(true);

  const uid = me?.profile?.user_id ?? null;

  useEffect(() => {
    let alive = true;
    readShareSettings(uid).then((s) => { if (alive) setSharing(!!s?.consistency); }).catch(() => {});
    return () => { alive = false; };
  }, [uid]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await loadBoard({ scope, scopeKey, window, limit: PAGE });
      setRows(page.rows);
      setYou(page.you);
      setCount(page.count);
      setThresholdMet(page.thresholdMet);
      setCursor(page.cursor);
      setError(null);
    } catch (e) {
      setError(e?.code ?? 'unavailable');
    } finally {
      setLoading(false);
    }
  }, [scope, scopeKey, window]);

  useEffect(() => { load(); }, [load]);

  const onEndReached = useCallback(async () => {
    if (paging || !cursor || !rows.length) return;
    setPaging(true);
    try {
      const page = await loadBoard({ scope, scopeKey, window, cursor, limit: PAGE });
      if (page.rows.length) {
        setRows((prev) => [...prev, ...page.rows]);
        setCursor(page.cursor);
      } else {
        setCursor(null);
      }
    } catch (_e) {
      setCursor(null);
    } finally {
      setPaging(false);
    }
  }, [cursor, paging, rows.length, scope, scopeKey, window]);

  // Pin the caller's own row at the bottom of the loaded page when the
  // server says they are off it (design 60 §4).
  const youOffPage = you && !rows.some((r) => r.isYou);
  const displayRows = useMemo(() => {
    if (!youOffPage || !me?.profile) return rows;
    return [...rows, {
      card: me.profile,
      metric: you.metric,
      trainedDays: [],
      trainedToday: false,
      isYou: true,
      rank: thresholdMet ? you.rank : null,
    }];
  }, [rows, youOffPage, you, me, thresholdMet]);

  const scopeChips = BOARD_SCOPE_ORDER;
  const boardLabel = label || BOARD_SCOPES[scope] || 'Board';

  function openProfile(card) {
    if (card?.handle) navigation.navigate('CommunityProfile', { handle: card.handle });
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <SectionLabel tone="muted">{boardLabel}</SectionLabel>
      {!isGroup ? (
        <View style={styles.chipRow} accessibilityLabel="Scope">
          {scopeChips.map((key) => (
            <Chip
              key={key}
              label={BOARD_SCOPES[key]}
              selected={scope === key}
              accessibilityRole="radio"
              onPress={() => (key !== scope
                ? navigation.setParams({ scope: key, scopeKey: null, label: null })
                : null)}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.chipRow} accessibilityLabel="Window">
        {BOARD_WINDOW_ORDER.map((key) => (
          <Chip
            key={key}
            label={BOARD_WINDOWS[key]}
            selected={window === key}
            accessibilityRole="radio"
            onPress={() => setWindow(key)}
          />
        ))}
      </View>
    </View>
  );

  const empty = loading ? (
    <View style={styles.skeleton}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={error === 'offline' ? 'You are offline' : 'Could not load this board'}
      text={error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading this board again"
    />
  ) : (
    <EmptyState
      icon="podium-outline"
      title={count > 0 ? `${count} ${count === 1 ? 'person is' : 'people are'} sharing so far` : 'Nobody here yet'}
      text={sharing
        ? 'When more people share their consistency, this board fills in.'
        : 'Share your consistency to appear here.'}
      actionLabel={sharing ? undefined : 'Share my consistency'}
      onAction={sharing ? undefined : () => navigation.navigate('CommunityTrainingProfile')}
      actionAccessibilityLabel={sharing ? undefined : 'Share my consistency in Training profile'}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={boardLabel} />
      <FlashList
        data={displayRows}
        keyExtractor={(item) => item.card.user_id}
        renderItem={({ item }) => (
          <BoardRow row={item} window={window} onOpenPerson={openProfile} />
        )}
        ListHeaderComponent={listHeader}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerBlock: { gap: spacing.md, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
