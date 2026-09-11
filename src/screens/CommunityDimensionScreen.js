/**
 * CommunityDimensionScreen (communities revamp 2026-09-10: `docs/
 * communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 3;
 * `20-BLUEPRINT.md` section 9's cohort page; task 6, `22-MIGRATION-
 * 170A-CONTRACT.md`). A dimension is a page, not a room: the people who
 * chose the same gym, area, style, discipline or age group. `BackHeader`
 * carries the dimension's name; the body is one `label` `textSecondary`
 * count line, the week roster (`PersonRow`s from `loadBoard`, own row
 * pinned, rank only from eight) for EVERY kind now (task 6: the board
 * scopes gym/area/style/discipline/age_band all exist), a tertiary row
 * "This month and consistency" opening the matching board scope, then
 * eyebrow RECENT: shared moments from cohort members via the new
 * `community_dimension_recent` RPC (`loadDimensionRecent`), paged, as
 * `ActivityItemRow`s -- the phase 1 gap this closes (that RPC did not
 * exist yet, so phase 1 rendered nothing there). "Respect everyone who
 * trained today" stays phase 3 and renders nothing here.
 *
 * The RECENT block and "This month and consistency" sit between the
 * roster and the paged activity rows in ONE list (`FlashList`), so they
 * travel as their own list item (`type: 'sectionBreak'`) rather than a
 * `ListFooterComponent`, which always renders after every data item and
 * so cannot sit in the MIDDLE of the list -- the same reason
 * `CommunityPeopleListScreen.js`'s `withFallbackDivider` carries its own
 * divider as a list item instead of an `ItemSeparatorComponent`.
 *
 * The age-band page is reciprocal (blueprint section 3, `22-MIGRATION-
 * 170A-CONTRACT.md`): reachable only while the caller shares their own
 * band (`me.tp_age_band`), never a minor's page, never another band's
 * roster. Without one, the page is a single honest line and a tertiary
 * row to Training profile -- no count, no roster, no RECENT read is even
 * attempted, matching the reciprocal shape `community_dimension` and
 * `community_board` both already enforce server-side.
 *
 * The seven physique-division pages (blueprint section 8, Q1b;
 * `PHYSIQUE_DISCIPLINE_KEYS`) carry a standing Beat UK signpost for
 * everyone, and collapse to a single resting line for the VIEWER under
 * calm mode or an open ED flag -- read via `readEdOrCalmSuppressed`
 * (`usePhotoSuppression.js`), never reimplemented, fail closed (the page
 * starts suppressed and only reveals once the check confirms it is
 * safe). This is a client-only decision (the contract's own words: "the
 * server has no reason to know a viewer's calm-mode state to serve a
 * discipline cohort to everyone else"), but the GATE still runs before
 * the LOADS, not only before the render (lead ruling 2): a suppressed
 * physique page makes no dimension, board or RECENT read at all -- `load`
 * itself refuses while `isPhysique && suppressed`, the same early-return
 * shape the age-band lock above already uses.
 *
 * A gym dimension additionally carries a summary (`community_gym_summary`)
 * as a fallback when no board is available (a legacy free-text gym that
 * is not the viewer's own), read alongside `loadDimension` and best
 * effort: the page still works as a plain list if the summary read fails.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
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
import ActivityItemRow from '../components/community/ActivityItemRow';
import RespectAllRow from '../components/community/RespectAllRow';
import GymSummary from '../components/community/GymSummary';
import BottomSheet from '../components/BottomSheet';
import ModalHeader from '../components/ModalHeader';
import Chip from '../components/Chip';
import ComposerInput from '../components/community/ComposerInput';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { readEdOrCalmSuppressed } from '../hooks/usePhotoSuppression';
import { getEdSupportLink } from '../lib/whyThisTemplates';
import {
  colors, spacing, type, iconSize,
} from '../styles/theme';
import {
  loadDimension, loadDimensionRecent, gymSummary, loadBoard, metricLabel, reactToPost,
  COMMUNITY_STYLE_KEYS, PHYSIQUE_DISCIPLINE_KEYS, TP_AGE_BANDS,
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
 * The same normalisation every feed-rendering screen composes locally
 * (`CommunityHubScreen.normalisePostRow`, `CommunityProfileScreen`'s own
 * copy): the RPCs hand back `{post, author, my_reaction}`, and a row read
 * straight out of a list may be the post itself. Kept local to each
 * screen that renders posts rather than reaching across into another
 * screen's module.
 */
function normalisePostRow(row) {
  if (!row) return null;
  const post = row.post ?? row;
  return {
    post,
    author: row.author ?? post.author ?? null,
    myReaction: !!(row.my_reaction ?? post.my_reaction),
  };
}

/**
 * Task 6(a): the standing Beat UK signpost, every physique-division page,
 * shown regardless of calm mode (and the ONLY content left when calm mode
 * or an open ED flag withholds the rest, task 6(b)). Reuses the app's
 * existing locale-aware support-link helper (`whyThisTemplates.js`, the
 * exact call CoachOutputScreen's own ED-pattern lockout card already
 * makes) for the URL it opens -- never a new one -- while the visible
 * copy stays the brief's own fixed British-English wording rather than
 * the helper's locale-varying name, so this row never reads "NEDA" on a
 * US-locale device for a UK-built signpost.
 */
function BeatSignpostRow() {
  const t = useTheme();
  async function open() {
    const link = getEdSupportLink(
      (() => {
        try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch (_e) { return null; }
      })(),
    );
    try { await Linking.openURL(link.url); } catch (_e) { /* nothing to do if it did not open */ }
  }
  return (
    <Pressable
      onPress={open}
      style={styles.beatRow}
      accessibilityRole="button"
      accessibilityLabel="Support with eating and body image: Beat"
    >
      <View style={[styles.beatIcon, { backgroundColor: t.colors.surface2 }]}>
        <Ionicons name="heart-outline" size={iconSize.sm} color={t.colors.textSecondary} />
      </View>
      <Text style={[styles.beatLabel, { ...t.type.bodySm, color: t.colors.textPrimary }]} numberOfLines={2}>
        Support with eating and body image: Beat
      </Text>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </Pressable>
  );
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
  const isAgeBand = kind === 'age_band';
  // Task 6: the seven physique-division keys carry the Beat signpost and
  // the calm-mode / open-ED-flag withhold (blueprint section 8, Q1b).
  const isPhysique = kind === 'discipline' && PHYSIQUE_DISCIPLINE_KEYS.includes(key);

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

  // Task 6: the age-band page is reciprocal client-side too -- reachable
  // only while the caller shares their OWN band. `community_dimension`
  // and `community_board` both refuse (empty shape / `not_allowed`) for
  // anything else server-side; this is the honest state instead of a
  // round trip that would only come back empty.
  const ownAgeBand = me?.tp_age_band ?? null;
  const ageBandLocked = isAgeBand && (!ownAgeBand || key !== ownAgeBand);

  const showBoard = isGym
    ? (!!venueId || isOwnGym)
    : (kind === 'area' || kind === 'style' || kind === 'discipline' || (isAgeBand && !ageBandLocked));
  const boardScopeKey = isGym ? boardGymId : (isAgeBand ? undefined : key);

  // Task 6(b): fail closed (starts suppressed) so the full page can never
  // flash before the check resolves -- the same posture
  // `usePhotoSuppression`'s own hook uses. Read directly rather than
  // through `consistencyGateState` (which needs a share-toggle argument
  // that has no meaning here): both are named in the brief as the
  // existing path to reuse.
  const uid = me?.profile?.user_id ?? null;
  const [suppressed, setSuppressed] = useState(true);
  useEffect(() => {
    if (!isPhysique) { setSuppressed(false); return undefined; }
    let alive = true;
    readEdOrCalmSuppressed(uid).then((s) => { if (alive) setSuppressed(!!s); })
      .catch(() => { if (alive) setSuppressed(true); });
    return () => { alive = false; };
  }, [isPhysique, uid]);
  // Derived, not stored: for every NON-physique kind this is the constant
  // `true` on every render (short-circuits on `!isPhysique`), so it is
  // never a changed `load` dependency and never causes a second, cursor-
  // dropping re-fetch when the ED-check effect above settles `suppressed`
  // to `false` for a page the gate was never going to touch. For a
  // physique kind it tracks `suppressed` exactly (closed while `true`,
  // the fail-closed default; opens once the check confirms `false`).
  const physiqueGateOpen = !isPhysique || !suppressed;

  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [venue, setVenue] = useState(null);
  const [board, setBoard] = useState(null);
  const [recent, setRecent] = useState([]);
  const [recentCursor, setRecentCursor] = useState(null);
  const [recentPaging, setRecentPaging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    // The age-band lock skips every read: there is nothing to ask for
    // (blueprint's own words: "the client's own app simply does not
    // open" that page), not only nothing to show.
    //
    // Lead ruling 2: the SAME applies to a physique page under the ED
    // gate. The gate check runs BEFORE the loads, not only before the
    // render -- a suppressed page makes no dimension, board or RECENT
    // read at all. `physiqueGateOpen` starts closed for a physique kind
    // (fail closed), so this also holds for the one tick before the gate
    // check itself resolves; once it opens, `load`'s own identity
    // changes (it is a dependency below) and the effect that calls it
    // runs again, this time clear to fetch. For every other kind the
    // gate is always open and never causes a second run (see
    // `physiqueGateOpen`'s own comment).
    if (ageBandLocked || !physiqueGateOpen) {
      setData(null); setSummary(null); setBoard(null); setVenue(null);
      setRecent([]); setRecentCursor(null); setError(null); setLoading(false);
      return;
    }
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
      // The week roster replaces the summary at the top, on EVERY
      // dimension page now (task 6: gym/area/style/discipline/age_band
      // all carry a board scope), keyed by this page's own scope key.
      try {
        setBoard(await loadBoard({
          scope: kind, scopeKey: boardScopeKey, window: 'week', limit: PAGE,
        }));
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
    // RECENT (task 6, closing the phase 1 gap): best effort and
    // independent of the roster above -- one failing section never
    // empties the other.
    try {
      const page = await loadDimensionRecent(kind, key, { limit: PAGE });
      setRecent(page.posts.map(normalisePostRow).filter(Boolean));
      setRecentCursor(page.cursor);
    } catch (_e) {
      setRecent([]);
      setRecentCursor(null);
    }
  }, [kind, key, isGym, ageBandLocked, venueId, showBoard, boardScopeKey, physiqueGateOpen]);

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

  // RECENT paging (task 6): the roster stays one page ("small by design",
  // the small-group rule); only RECENT genuinely grows.
  const onEndReached = useCallback(async () => {
    if (recentPaging || !recentCursor) return;
    setRecentPaging(true);
    try {
      const page = await loadDimensionRecent(kind, key, { cursor: recentCursor, limit: PAGE });
      const next = page.posts.map(normalisePostRow).filter(Boolean);
      if (next.length) {
        setRecent((prev) => [...prev, ...next]);
        setRecentCursor(page.cursor);
      } else {
        setRecentCursor(null);
      }
    } catch (_e) {
      setRecentCursor(null);
    } finally {
      setRecentPaging(false);
    }
  }, [kind, key, recentCursor, recentPaging]);

  /** One Respect tap on a RECENT row, the same optimistic-update shape
   * `CommunityHubScreen`/`CommunityProfileScreen` already use for the
   * identical `ActivityItemRow` component. */
  async function respondRecent(item) {
    try {
      await reactToPost(item.post.id, !item.myReaction);
      setRecent((prev) => prev.map((r) => {
        if (r.post.id !== item.post.id) return r;
        const on = !item.myReaction;
        return {
          ...r,
          post: { ...r.post, reaction_count: Math.max(0, Number(r.post.reaction_count ?? 0) + (on ? 1 : -1)) },
          myReaction: on,
        };
      }));
    } catch (_e) {
      // Nothing to interrupt anyone with; the next refresh shows the truth.
    }
  }

  // Task 6: age_band's own label is the raw key server-side (no age-band
  // prose exists anywhere in the schema, by design -- the client owns
  // this mapping); every other kind's label is already display text.
  const label = isAgeBand
    ? (data?.label ? (TP_AGE_BANDS[data.label] ?? data.label) : paramLabel)
    : (data?.label || paramLabel);

  function openProfile(card) {
    if (card?.handle) navigation.navigate('CommunityProfile', { handle: card.handle });
  }

  // Rules of Hooks: every hook below must run on every render, so the
  // two full-page early returns (age-band locked, physique suppressed)
  // sit AFTER all of them, right before the JSX that reads their values.
  const people = useMemo(() => data?.people ?? [], [data]);
  const memberCount = data?.count ?? people.length;

  // Roster mode: a board is available for this kind (task 6: every kind
  // now, gym included). Own row pinned at the bottom when off-page,
  // exactly the pattern `CommunityBoardScreen` already uses.
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

  // The roster, the section break (cold-start line, "This month and
  // consistency", eyebrow RECENT) and RECENT's own paged rows all travel
  // as one list -- see the header comment for why the break cannot be a
  // ListFooterComponent. The non-board fallback (a legacy gym that is not
  // the viewer's own, or the dead "programme" link) stays a plain list,
  // exactly as before.
  const listData = useMemo(() => {
    if (!rosterMode) {
      return people.map((row) => ({ type: 'person', key: (row.card ?? row).user_id, row }));
    }
    const items = displayRows.map((row) => ({ type: 'person', key: row.card.user_id, row }));
    items.push({ type: 'sectionBreak', key: 'section-break' });
    for (const r of recent) items.push({ type: 'recent', key: r.post.id, row: r });
    return items;
  }, [rosterMode, displayRows, people, recent]);

  // Task 6: the age-band page, locked. No count, no roster, no RECENT
  // read was even attempted (see `load`'s own early return) -- one
  // honest line and the one thing that changes it.
  if (ageBandLocked) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
        <BackHeader title={paramLabel || 'Your age group'} />
        <View style={styles.gateWrap}>
          <Text style={[styles.gateLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            Share your age group in your training profile to see people your age.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('CommunityTrainingProfile')}
            style={styles.tertiaryRow}
            accessibilityRole="button"
            accessibilityLabel="Open Training profile"
          >
            <Text style={[styles.tertiaryLabel, { ...t.type.label, color: t.colors.textSecondary }]}>
              Training profile
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Task 6(b): calm mode or an open ED flag, on a physique-division page
  // -- the header, the Beat row and one calm line, nothing else.
  if (isPhysique && suppressed) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
        <BackHeader title={label || 'Community'} />
        <View style={styles.gateWrap}>
          <BeatSignpostRow />
          <Text style={[styles.gateLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            This page is resting just now.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.header}>
      {isPhysique ? <BeatSignpostRow /> : null}
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
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.type === 'sectionBreak') {
            return (
              <View style={styles.sectionBreak}>
                {rosterThin ? (
                  <Text style={[styles.coldStart, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                    No one else here is sharing yet.
                  </Text>
                ) : null}
                {/* Phase 3 (spec section 5), landing where phase 1 reserved
                    the spot: "Respect everyone who trained today", roster
                    scopes only (gym/area/style/discipline/age_band all
                    share community_board's own scope names, so `kind`
                    and `boardScopeKey` pass straight through). */}
                {rosterMode ? (
                  <RespectAllRow
                    scope={kind}
                    scopeKey={boardScopeKey}
                    hasTrainedToday={displayRows.some((row) => row.trainedToday && !row.isYou)}
                  />
                ) : null}
                <Pressable
                  onPress={() => navigation.navigate('CommunityBoard', {
                    scope: kind, scopeKey: boardScopeKey, window: 'month', label,
                  })}
                  style={styles.tertiaryRow}
                  accessibilityRole="button"
                  accessibilityLabel="This month and consistency"
                >
                  <Text style={[styles.tertiaryLabel, { ...t.type.label, color: t.colors.textSecondary }]}>
                    This month and consistency
                  </Text>
                </Pressable>
                <Eyebrow>RECENT</Eyebrow>
              </View>
            );
          }
          if (item.type === 'recent') {
            return (
              <ActivityItemRow
                item={item.row}
                onPress={() => navigation.navigate('CommunityPost', { id: item.row.post.id })}
                onRespect={() => respondRecent(item.row)}
                onOpenPerson={(author) => openProfile(author)}
              />
            );
          }
          return rosterMode ? (
            <PersonRow
              person={{ ...item.row.card, isYou: item.row.isYou }}
              metric={metricLabel('week', item.row.metric)}
              days={item.row.trainedDays}
              trainedToday={item.row.trainedToday}
              rank={board.thresholdMet ? item.row.rank : null}
              onPress={() => openProfile(item.row.card)}
            />
          ) : (
            <PersonRow
              person={{ ...(item.row.card ?? item.row), caption: personCaption(item.row.card ?? item.row) }}
              onPress={() => openProfile(item.row.card ?? item.row)}
            />
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={recentPaging ? (
          <ActivityIndicator color={t.colors.primary} style={styles.pagingFooter} />
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
  sectionBreak: { gap: spacing.sm, marginTop: spacing.md },
  coldStart: { ...type.bodySm, color: colors.textSecondary, paddingVertical: spacing.sm },
  tertiaryRow: { minHeight: 48, justifyContent: 'center', paddingVertical: spacing.sm },
  tertiaryLabel: { ...type.label, color: colors.textSecondary },
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
  skeleton: { gap: spacing.sm },
  pagingFooter: { paddingVertical: spacing.lg },
  reportBody: { gap: spacing.md, paddingBottom: spacing.md },
  reportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  // Task 6(a): a SettingRow-shaped row (icon chip, bodySm label, chevron)
  // at bodySm rather than SettingsPrimitives.js's own `SettingRow` (whose
  // label is a fixed `body`), matching the brief's explicit type role.
  beatRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingVertical: spacing.sm,
  },
  beatIcon: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
  },
  beatLabel: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  // The age-band lock and the calm-mode resting state (task 6): one line,
  // never a paragraph (presentation rule 9).
  gateWrap: { padding: spacing.lg, gap: spacing.md },
  gateLine: { ...type.bodySm, color: colors.textSecondary },
});
