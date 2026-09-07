/**
 * CommunityDimensionScreen (blueprint section 6; SD-10; discovery
 * blueprint `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`
 * section 8; SD-27, SD-31)
 *
 * A dimension is a page, not a room: the people who chose the same
 * style, gym or area. There is no feed of its own, no admin, no
 * leaderboard and no join button, because there is nothing to join.
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
import { View, Text, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
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
import GymSummary from '../components/community/GymSummary';
import BottomSheet from '../components/BottomSheet';
import ModalHeader from '../components/ModalHeader';
import Chip from '../components/Chip';
import ComposerInput from '../components/community/ComposerInput';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type } from '../styles/theme';
import { loadDimension, gymSummary, loadBoard } from '../lib/community';
import {
  report as reportGym, get as getGymVenue, confirmSubmission, isPendingVenue, REPORT_KINDS,
} from '../lib/gyms';
import { peopleLine } from '../components/community/DimensionRow';
import GymWeekBoard from '../components/community/GymWeekBoard';

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
      // Design 60 §4: the week board replaces the summary at the top, on
      // EVERY gym dimension page (not only the viewer's own), keyed by
      // this page's gym id (boardGymId: the linked venue id, or null to
      // fall back server-side to the caller's own gym).
      try {
        setBoard(await loadBoard({ scope: 'gym', scopeKey: boardGymId, window: 'week', limit: 20 }));
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

  const header = (
    <View style={styles.header}>
      {showBoard && board ? (
        <GymWeekBoard
          board={board}
          label={label}
          onSeeAll={() => navigation.navigate('CommunityBoard', {
            scope: 'gym', scopeKey: boardGymId, window: 'week', label,
          })}
        />
      ) : isGym && summary ? (
        <GymSummary summary={summary} label={label} />
      ) : (
        <>
          <Text style={[styles.title, { ...t.type.h3, color: t.colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.sub, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            {peopleLine(data?.count ?? people.length)}
          </Text>
        </>
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
      {people.length ? <SectionLabel tone="muted">People</SectionLabel> : null}
    </View>
  );

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
  ) : (
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
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { ...type.h3, color: colors.textPrimary },
  sub: { ...type.bodySm, color: colors.textSecondary },
  reportLink: { textDecorationLine: 'underline', marginTop: spacing.xxs },
  footerBlock: { gap: spacing.md, marginTop: spacing.lg },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  reportBody: { gap: spacing.md, paddingBottom: spacing.md },
  reportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
});
