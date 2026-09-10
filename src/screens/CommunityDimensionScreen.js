/**
 * CommunityDimensionScreen (communities revamp 2026-09-10: `docs/
 * communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 3;
 * `20-BLUEPRINT.md` section 9's cohort page). A dimension is a page, not
 * a room: the people who chose the same style, gym or area. `BackHeader`
 * carries the dimension's name; the body is one `label` `textSecondary`
 * count line, then either the gym week roster (`PersonRow`s from
 * `loadBoard`, own row pinned, rank only from eight) or the plain PEOPLE
 * list (`PersonRow`s with a caption, no dots) for every other scope.
 * "Respect everyone who trained today" is phase 3 and renders nothing in
 * phase 1.
 *
 * KNOWN GAP, flagged for the lead (see the lane report): the spec calls
 * for an "Eyebrow RECENT" of the dimension's own recent stories, "the RPC
 * already returns them" -- read against `community_dimension` in every
 * migration that defines it (160, 164, the in-progress 170) and against
 * `loadDimension` in `src/lib/community/feed.js`, none of them carry a
 * stories/posts field; the RPC answers `{label, count, people,
 * programmes, cursor}` only. There is no existing call this lane is
 * allowed to reuse to build that section (the brief forbids new server
 * calls and touching `src/lib/`), so it is NOT rendered here rather than
 * built from data that does not exist.
 *
 * A gym dimension additionally carries a summary (`community_gym_summary`)
 * as a fallback when no board is available (a legacy free-text gym that
 * is not the viewer's own), read alongside `loadDimension` and best
 * effort: the page still works as a plain list if the summary read fails.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles.
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import Eyebrow from '../components/community/Eyebrow';
import PersonRow from '../components/community/PersonRow';
import GymSummary from '../components/community/GymSummary';
import BottomSheet from '../components/BottomSheet';
import ModalHeader from '../components/ModalHeader';
import Chip from '../components/Chip';
import ComposerInput from '../components/community/ComposerInput';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import {
  colors, spacing, type,
} from '../styles/theme';
import {
  loadDimension, gymSummary, loadBoard, metricLabel, COMMUNITY_STYLE_KEYS,
} from '../lib/community';
import {
  report as reportGym, get as getGymVenue, confirmSubmission, isPendingVenue, REPORT_KINDS,
} from '../lib/gyms';

const PAGE = 20;
const REPORT_DETAIL_MAX = 500;

const REPORT_REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  rate_limited: 'That is a lot of reports for one day. Try again tomorrow.',
  not_found: 'This gym is no longer available.',
};

// GD-11 (gym database blueprint `docs/gym-database-2026-09-06/
// 20-BLUEPRINT.md`; migrate_162): a pending submission needs a SECOND,
// DISTINCT person to confirm it before it shows for anyone else.
// `not_allowed` is the submitter's own account trying to confirm its own
// submission; `already_confirmed` is a repeat from someone who already
// has. Neither is detected client-side (there is no submitter identity on
// the venue payload to check against) - the server is asked and its
// refusal is simply spoken calmly.
const CONFIRM_REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  rate_limited: 'That is a lot of confirmations for now. Try again shortly.',
  not_found: 'This gym is no longer available.',
  not_allowed: 'You added this gym, so someone else needs to confirm it.',
  already_confirmed: 'You have already confirmed this gym.',
};

/** "Trains at PureGym Leeds" or a style label: PersonRow's caption slot
 * on a non-board dimension row (spec: "the caption line (gym or
 * style)"). Never repeats plain member-count text; a gym label wins when
 * present, else the person's first style. */
function personCaption(card) {
  if (card?.gym_label) return card.gym_label;
  const first = (card?.styles ?? []).find((k) => COMMUNITY_STYLE_KEYS[k]);
  return first ? COMMUNITY_STYLE_KEYS[first] : null;
}

/**
 * "Report a problem with this gym" (gym database blueprint
 * `docs/gym-database-2026-09-06/20-BLUEPRINT.md`, GD-12). Only shown on a
 * gym dimension whose key is a linked venue (`gym:<uuid>`, GD-14): a
 * legacy free-text gym has no venue row in the directory to report.
 */
function GymReportSheet({ visible, onClose, venueId }) {
  const t = useTheme();
  const toast = useToast();
  const [kind, setKind] = useState(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) { setKind(null); setDetail(''); setBusy(false); }
  }, [visible]);

  async function send() {
    if (!kind || busy || !venueId) return;
    setBusy(true);
    try {
      await reportGym(venueId, kind, detail.trim() || null);
      toast.show('Thank you. A moderator will look at this.');
      onClose?.();
    } catch (e) {
      toast.show(REPORT_REFUSALS[e?.code] ?? 'Could not send that report just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Report a problem with this gym">
      <ModalHeader title="Report a problem" onClose={onClose} />
      <View style={styles.reportBody}>
        <Text style={[styles.sub, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          Pick the closest reason. Two matching reports send this for a moderator to check.
        </Text>
        <View style={styles.reportChips}>
          {Object.entries(REPORT_KINDS).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={kind === key}
              accessibilityRole="radio"
              onPress={() => setKind(key)}
            />
          ))}
        </View>
        <ComposerInput
          value={detail}
          onChangeText={(v) => setDetail(v.slice(0, REPORT_DETAIL_MAX))}
          placeholder="Anything else we should know (optional)"
          maxLength={REPORT_DETAIL_MAX}
          minHeight={72}
          accessibilityLabel="Report detail"
        />
        <Button
          variant="primary"
          title="Send report"
          disabled={!kind}
          loading={busy}
          onPress={send}
          accessibilityLabel="Send report"
        />
      </View>
    </BottomSheet>
  );
}

export default function CommunityDimensionScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const { me } = useCommunityMe();
  const kind = route?.params?.kind ?? null;
  const key = route?.params?.key ?? null;
  const paramLabel = route?.params?.label ?? '';
  const isGym = kind === 'gym';
  // GD-14: only a key linked to a real directory venue (`gym:<uuid>`) can
  // be reported; a legacy free-text gym key has no venue row behind it.
  const venueId = isGym && typeof key === 'string' && key.startsWith('gym:') ? key.slice(4) : null;
  // Lead ruling (community product audit): `community_board`'s 'gym' scope
  // targets `_scope_key` as the gym id when supplied -- any gym's board,
  // not only the caller's own -- falling back server-side to the caller's
  // own gym when it is null. A linked directory venue (`gym:<uuid>`, GD-14)
  // carries that id as `venueId`; a legacy free-text gym has no directory
  // row to key a board by, so it keeps standing in for the caller's own
  // board only when this IS the caller's own gym (the pre-ruling fallback),
  // and keeps the plain summary otherwise.
  const isOwnGym = isGym && !!me?.profile?.gym_label
    && me.profile.gym_label === (route?.params?.label ?? paramLabel);
  const boardGymId = venueId || (isOwnGym ? null : undefined);
  const showBoard = isGym && (!!venueId || isOwnGym);

  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [venue, setVenue] = useState(null);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

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
    if (showBoard) {
      // The week roster replaces the summary at the top, on EVERY gym
      // dimension page (not only the viewer's own), keyed by this page's
      // gym id (boardGymId: the linked venue id, or null to fall back
      // server-side to the caller's own gym).
      try {
        setBoard(await loadBoard({ scope: 'gym', scopeKey: boardGymId, window: 'week', limit: PAGE }));
      } catch (_e) {
        setBoard(null);
      }
    } else {
      setBoard(null);
    }
    if (venueId) {
      // Best effort too: whether "Is this gym real? Confirm it" shows at
      // all depends on this, never the reason the rest of the page fails.
      try {
        setVenue(await getGymVenue(venueId));
      } catch (_e) {
        setVenue(null);
      }
    } else {
      setVenue(null);
    }
  }, [kind, key, isGym, venueId, showBoard, boardGymId]);

  useEffect(() => { load(); }, [load]);

  async function confirmVenue() {
    if (!venueId || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await confirmSubmission(venueId);
      toast.show('Thanks. This gym is now listed.');
      await load();
    } catch (e) {
      toast.show(CONFIRM_REFUSALS[e?.code] ?? 'Could not confirm this just now.', { variant: 'error' });
    } finally {
      setConfirmBusy(false);
    }
  }

  const label = data?.label || paramLabel;
  const people = data?.people ?? [];
  const memberCount = data?.count ?? people.length;

  // Roster mode: gym scope with a board available (spec section 3's first
  // branch). Own row pinned at the bottom when off-page, exactly the
  // pattern `CommunityBoardScreen` already uses.
  const rosterMode = showBoard && !!board;
  const youOffPage = rosterMode && board.you && !board.rows.some((r) => r.isYou);
  const displayRows = useMemo(() => {
    if (!rosterMode) return [];
    if (!youOffPage || !me?.profile) return board.rows;
    return [...board.rows, {
      card: me.profile,
      metric: board.you.metric,
      trainedDays: [],
      trainedToday: false,
      isYou: true,
      rank: board.thresholdMet ? board.you.rank : null,
    }];
  }, [rosterMode, board, youOffPage, me]);
  // Cold start (section 3): with nobody else on the roster, show whatever
  // row exists (0 or 1: just the viewer) plus the honest line, rather
  // than an empty roster with no explanation.
  const rosterThin = rosterMode && displayRows.length <= 1;

  const listData = rosterMode ? displayRows : people;

  function openProfile(card) {
    if (card?.handle) navigation.navigate('CommunityProfile', { handle: card.handle });
  }

  const header = (
    <View style={styles.header}>
      {isGym && summary && !rosterMode ? (
        <GymSummary summary={summary} label={label} />
      ) : (
        <Text style={[styles.label, { ...t.type.label, color: t.colors.textSecondary }]}>
          {rosterMode
            ? `${memberCount} ${memberCount === 1 ? 'member' : 'members'} · ${displayRows.filter((r) => r.trainedToday).length} trained today`
            : `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
        </Text>
      )}
      {venueId && isPendingVenue(venue) ? (
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title="Is this gym real? Confirm it"
          onPress={confirmVenue}
          disabled={confirmBusy}
          accessibilityLabel="Is this gym real? Confirm it"
        />
      ) : null}
      {venueId ? (
        <Pressable
          onPress={() => setReportOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Report a problem with this gym"
        >
          <Text style={[styles.reportLink, { ...t.type.bodySm, color: t.colors.textMuted }]}>
            Report a problem with this gym
          </Text>
        </Pressable>
      ) : null}
      <Eyebrow>{rosterMode ? 'TRAINED THIS WEEK' : 'PEOPLE'}</Eyebrow>
    </View>
  );

  const footer = rosterMode ? (
    <View style={styles.footerBlock}>
      {rosterThin ? (
        <Text style={[styles.coldStart, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          No one else here is sharing yet.
        </Text>
      ) : null}
      <Pressable
        onPress={() => navigation.navigate('CommunityBoard', {
          scope: 'gym', scopeKey: boardGymId, window: 'month', label,
        })}
        style={styles.tertiaryRow}
        accessibilityRole="button"
        accessibilityLabel="This month and consistency"
      >
        <Text style={[styles.tertiaryLabel, { ...t.type.label, color: t.colors.textSecondary }]}>
          This month and consistency
        </Text>
      </Pressable>
    </View>
  ) : null;

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
      title={error === 'offline' ? 'You are offline' : 'Could not load this'}
      text={error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      actionLabel="Try again"
      onAction={load}
      actionAccessibilityLabel="Try loading this again"
    />
  ) : rosterMode ? null : (
    <EmptyState
      icon="people-outline"
      title="Nobody here yet"
      text="When other people choose this, they appear here."
      actionLabel="Find people"
      onAction={() => navigation.navigate('CommunityFindPeople')}
      actionAccessibilityLabel="Find people to follow"
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title={label || 'Community'} />
      <FlashList
        data={listData}
        keyExtractor={(item) => (item.card ?? item).user_id}
        renderItem={({ item }) => (rosterMode ? (
          <PersonRow
            person={{ ...item.card, isYou: item.isYou }}
            metric={metricLabel('week', item.metric)}
            days={item.trainedDays}
            trainedToday={item.trainedToday}
            rank={board.thresholdMet ? item.rank : null}
            onPress={() => openProfile(item.card)}
          />
        ) : (
          <PersonRow
            person={{ ...(item.card ?? item), caption: personCaption(item.card ?? item) }}
            onPress={() => openProfile(item.card ?? item)}
          />
        ))}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
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
      {venueId ? (
        <GymReportSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          venueId={venueId}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  label: { ...type.label, color: colors.textSecondary },
  reportLink: { textDecorationLine: 'underline', marginTop: spacing.xxs },
  footerBlock: { gap: spacing.sm, marginTop: spacing.md },
  coldStart: { ...type.bodySm, color: colors.textSecondary, paddingVertical: spacing.sm },
  tertiaryRow: { minHeight: 48, justifyContent: 'center', paddingVertical: spacing.sm },
  tertiaryLabel: { ...type.label, color: colors.textSecondary },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.sm },
  reportBody: { gap: spacing.md, paddingBottom: spacing.md },
  reportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
});
