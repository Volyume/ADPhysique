/**
 * CommunityHubScreen: the Community tab's root (D221, build spec 2.3; the
 * visual law `docs/audit/community-level-up-2026-10-08/13-VISUAL-LAW.md`,
 * look D3).
 *
 * Rebuilt render, unchanged logic. A header (title "Community", three 48 dp
 * glyphs: search, activity, messages), a 48 dp segment bar (Feed | People |
 * Groups | You, the choice kept per device), then one of four segments, each
 * a stack of full-bleed `surface` bands separated by the logger's `BAND`
 * strip of page colour. The rows inside a band carry the gutter.
 *
 * - Feed: scope chips (Following, My gym, My groups, Everyone) and a sort
 *   control, the compose well, then `PostRow`s. A scope the server cannot
 *   serve yet (migration 190 unapplied, `fallback === 'scope'`) is a disabled
 *   chip, never an explanation.
 * - People: search, Find people, Requests, then the gym, discipline and area
 *   rows from `community_hub_summary` (the age group is a Find people filter
 *   now, not a Hub row).
 * - Groups: my groups, pending invites (Accept, or Later to hide the row for
 *   this session), New group and Browse open groups.
 * - You: the You row and ProgressStrip (withheld under calm mode or an open
 *   ED flag by `consistencyGateState`, exactly as before), the HOST and
 *   early-days rows, and the rows to profile, followers, privacy, training
 *   profile and rules.
 *
 * `route.params.segment` ('feed' | 'people' | 'groups' | 'you') opens a
 * segment (the Today row sends 'people').
 *
 * A reader without a profile sees the hero band and the Everyone feed,
 * read-only; Respect and the compose entry route to Join.
 *
 * Every loader and gate from the previous Hub is kept: join state, the host
 * row, early days, the moderation and rules notices, the legacy partner card,
 * the `me` refresh (the unseen dot is published by `useCommunityMe`), the
 * foreground publish and the pending-join drain.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator, Pressable, AppState, ScrollView, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from '../components/Button';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import PressableCard from '../components/PressableCard';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import SectionHeader from '../components/community/SectionHeader';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import SkeletonPostRow from '../components/community/SkeletonPostRow';
import PersonRow from '../components/community/PersonRow';
import CohortRow from '../components/community/CohortRow';
import GroupRow from '../components/community/GroupRow';
import PostRow from '../components/community/PostRow';
import ProgressStrip from '../components/community/ProgressStrip';
import MenuSheet from '../components/community/MenuSheet';
import JoinToInteractRow from '../components/community/JoinToInteractRow';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import {
  colors, spacing, circle, radius, iconSize,
} from '../styles/theme';
import { BAND, touchTarget } from '../styles/layout';
import {
  loadHub, hasProfile, hasUnseen, hasUnreadMessages, reactToPost,
  loadHubSummary, metricLabel, loadConsistency, consistencyGateState,
  myStatus, isModeratedStatus, REPORT_REASONS,
  getProfile, follow, COMMUNITY_HOST_HANDLE, inviteMessage, inviteLabel, firstHereLine,
  hostRowVisible, hostCaption, readHostDismissed, writeHostDismissed, GROUP_PURPOSE_LINE,
  listMyGroups, acceptGroupInvite,
} from '../lib/community';
import { todayLocalKey } from '../lib/dayKey';

const PAGE = 20;

/** The chosen segment, per device (build spec 2.3). */
export const HUB_SEGMENT_KEY = 'community.hub.segment';
const SEGMENTS = Object.freeze([
  { key: 'feed', label: 'Feed' },
  { key: 'people', label: 'People' },
  { key: 'groups', label: 'Groups' },
  { key: 'you', label: 'You' },
]);
const SEGMENT_KEYS = SEGMENTS.map((s) => s.key);

const SCOPES = Object.freeze([
  { key: 'following', label: 'Following' },
  { key: 'gym', label: 'My gym' },
  { key: 'groups', label: 'My groups' },
  { key: 'everyone', label: 'Everyone' },
]);
const SORT_LABELS = Object.freeze({ newest: 'Newest', respected: 'Most respected' });

const HEADER_HEIGHT = 48;
const WELL_HEIGHT = 44;
const FILTER_CHIP_HEIGHT = 32;
const FILTER_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };
const MARK = 32;
const MARK_BIG = 44;
const ROW_ONE_LINE = 56;
const ROW_TWO_LINES = 64;
const ROW_BIG = 88;

// The HOST row's read (26-EARLY-DAYS-SPEC.md 1.2) happens once per app
// session per reader once its answer is "no row": the reader is the host,
// already follows, or has a block or mute (review note 15). A follow made
// elsewhere in the session is picked up by the next launch.
let _hostHiddenForUid = null;
/** Test seam: the session cache above. */
export function _resetHostCacheForTests() { _hostHiddenForUid = null; }

/**
 * "3 trained today · 8 members": the one line every People and Groups row
 * composes from the Hub summary's two counts.
 */
function trainedTodayLine(memberCount, trainedTodayCount) {
  const n = Number(memberCount) || 0;
  const td = Number(trainedTodayCount) || 0;
  return `${td} trained today · ${n} ${n === 1 ? 'member' : 'members'}`;
}

/** Row order for the People cohorts: gym, then each discipline, then area.
 * Style is never a Hub row (Find people is where it lives) and the age group
 * left the Hub (it is a filter on Find people, D221 2.3). */
const COHORT_KIND_ORDER = Object.freeze({ gym: 0, discipline: 1, area: 2 });

/** "6 weeks in a row" / "Getting back into it": the You row's second-line
 * fallback when there are no trained days to draw this week. */
function streakCaption(streak) {
  const n = Number(streak) || 0;
  if (n <= 0) return 'Getting back into it';
  return n === 1 ? '1 week in a row' : `${n} weeks in a row`;
}

/**
 * The feed rows arrive as `{post, author, my_reaction}` from the RPCs.
 * Older cached payloads (and a row read straight from a list) may be the
 * post itself with the author alongside, so both shapes are accepted and
 * one shape leaves this function.
 */
export function normalisePostRow(row) {
  if (!row) return null;
  const post = row.post ?? row;
  return {
    post,
    author: row.author ?? post.author ?? null,
    myReaction: !!(row.my_reaction ?? post.my_reaction),
  };
}

/** A full-bleed `surface` band: no radius, no border; the rows inside carry
 * the gutter (visual law V1). */
function Band({ children, style }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.colors.surface }, style]}>{children}</View>;
}

/** The strip of page colour between two bands: the logger's `BAND`. */
function BandGap() {
  return <View style={styles.bandGap} />;
}

/**
 * One row in a band (visual law V3): a roster row is 64 dp with two lines and
 * 56 dp with one; a large entry row (a door such as Find people) is 88 dp
 * with a 44 dp icon tile. A hairline below, a chevron or a caller's trailing
 * node, a 48 dp minimum target through `PressableCard`.
 */
function HubRow({
  icon, leading, title, subtitle, trailing, onPress, big = false, accessibilityLabel,
}) {
  const t = useTheme();
  const size = big ? MARK_BIG : MARK;
  return (
    <PressableCard
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || [title, subtitle].filter(Boolean).join('. ')}
      style={[
        styles.row,
        {
          minHeight: big ? ROW_BIG : (subtitle ? ROW_TWO_LINES : ROW_ONE_LINE),
          borderBottomColor: t.colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.rowInner}>
        {leading || (icon ? (
          <View style={[styles.mark, { width: size, height: size, backgroundColor: t.colors.surface2 }]}>
            <Ionicons name={icon} size={big ? iconSize.lg : iconSize.md} color={t.colors.textPrimary} />
          </View>
        ) : null)}
        <View style={styles.rowText}>
          <Text style={[big ? t.type.title : t.type.body, { color: t.colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
        {trailing === undefined ? (
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        ) : trailing}
      </View>
    </PressableCard>
  );
}

/** An input-shaped entry: the search and compose wells (visual law V9). */
function Well({
  icon, text, onPress, accessibilityLabel,
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{
        top: 2, bottom: 2, left: 0, right: 0,
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || text}
      style={[styles.well, { backgroundColor: t.colors.background, borderColor: t.colors.borderSubtle }]}
    >
      {icon ? <Ionicons name={icon} size={iconSize.md} color={t.colors.textMuted} /> : null}
      <Text style={[t.type.body, styles.wellText, { color: t.colors.textMuted }]} numberOfLines={1}>{text}</Text>
    </Pressable>
  );
}

/** A 32 dp filter chip with a 48 dp hit area (visual law V9). */
function FilterChip({
  label, selected, disabled, onPress,
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={FILTER_HIT_SLOP}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={disabled ? 'Not available yet' : undefined}
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      style={[
        styles.filterChip,
        { borderColor: t.colors.border },
        selected && { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
      ]}
    >
      <Text
        style={[
          t.type.label,
          { color: disabled ? t.colors.textMuted : (selected ? t.colors.primary : t.colors.textSecondary) },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A header glyph: 48 dp target, `textPrimary`, no container (visual law V8). */
function HeaderGlyph({
  icon, label, onPress, children,
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={styles.glyph}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={iconSize.lg} color={t.colors.textPrimary} />
      {children}
    </Pressable>
  );
}

export default function CommunityHubScreen({ navigation, route }) {
  const t = useTheme();
  const { me, loading: meLoading, refresh: refreshMe } = useCommunityMe();
  const joined = hasProfile(me);
  // The Community rules moved on since this person accepted them (founder
  // report 2026-09-27). The server then refuses the weekly training update
  // ('rules_outdated') in the background, so their training stops showing at
  // their gym. Absent fields (an older server) compare as not behind.
  const rulesBehind = joined
    && Number(me?.accepted_rules_version) < Number(me?.rules_version);
  const legacyPartnerCode = route?.params?.legacyPartnerCode ?? null;
  const segmentParam = route?.params?.segment ?? null;

  const [segment, setSegmentState] = useState('feed');
  const [segmentReady, setSegmentReady] = useState(false);
  const [scope, setScopeState] = useState('following');
  const [sort, setSortState] = useState('newest');
  const scopeRef = useRef('following');
  const sortRef = useRef('newest');
  const [scopeUnavailable, setScopeUnavailable] = useState(false);
  const [sortUnavailable, setSortUnavailable] = useState(false);
  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [legacyCardShown, setLegacyCardShown] = useState(!!legacyPartnerCode);
  const [browsing, setBrowsing] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [weekCounters, setWeekCounters] = useState(null);
  // Fails CLOSED: no You row renders until the gate explicitly clears it
  // (mirrors `consistencyGateState`'s own "fail closed" posture).
  const [consistencyGated, setConsistencyGated] = useState(true);
  // People and Groups: one call, `community_hub_summary`.
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [invites, setInvites] = useState([]);
  const [inviteBusy, setInviteBusy] = useState(null);
  // "Later" hides an invite row for this session only; nothing is sent.
  const [laterIds, setLaterIds] = useState([]);
  // Early days (26-EARLY-DAYS-SPEC.md 1.2): the founder's real profile,
  // shown as the host while the reader is not yet following them.
  const [host, setHost] = useState(null);
  const [hostBusy, setHostBusy] = useState(false);
  const toast = useToast();
  const requestRef = useRef(0);

  const uid = me?.profile?.user_id ?? null;
  const isMinor = !!me?.is_minor;

  const setScope = useCallback((value) => { scopeRef.current = value; setScopeState(value); }, []);
  const setSort = useCallback((value) => { sortRef.current = value; setSortState(value); }, []);

  // The remembered segment (build spec 2.3): first open lands on Feed; a
  // failed read is simply Feed.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(HUB_SEGMENT_KEY)
      .then((value) => { if (alive && SEGMENT_KEYS.includes(value)) setSegmentState(value); })
      .catch(() => { /* a remembered tab is a convenience: Feed it is */ })
      .finally(() => { if (alive) setSegmentReady(true); });
    return () => { alive = false; };
  }, []);

  const chooseSegment = useCallback((key) => {
    setSegmentState(key);
    AsyncStorage.setItem(HUB_SEGMENT_KEY, key).catch(() => { /* best effort */ });
  }, []);

  // A caller that wants a segment (the Today row sends 'people') says so in
  // the route params; it wins over the remembered one.
  useEffect(() => {
    if (segmentReady && SEGMENT_KEYS.includes(segmentParam)) chooseSegment(segmentParam);
  }, [segmentReady, segmentParam, chooseSegment]);

  // The You line's own device counters (lead ruling 2026-09-10): shown
  // whenever the ED gate allows, independent of the "Share my consistency"
  // toggle. Gated ONLY on `consistencyGateState`: its `gated` field is
  // calm mode or an open ED flag, never the toggle. When it withholds, the
  // You row and the ProgressStrip do not render at all.
  useEffect(() => {
    if (!joined || !uid) { setWeekCounters(null); setConsistencyGated(true); return undefined; }
    let alive = true;
    consistencyGateState(uid, true).then(async ({ gated }) => {
      if (!alive) return;
      setConsistencyGated(gated);
      if (gated) { setWeekCounters(null); return; }
      try {
        const counters = await loadConsistency(uid);
        if (alive) setWeekCounters(counters);
      } catch (_e) {
        if (alive) setWeekCounters(null);
      }
    }).catch(() => { if (alive) { setConsistencyGated(true); setWeekCounters(null); } });
    return () => { alive = false; };
  }, [joined, uid]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await loadHubSummary());
    } catch (_e) {
      setSummary(null);
    }
  }, []);

  // People and Groups (`community_hub_summary`): one call for both
  // sections, counts, trained today and samples all carried already.
  useEffect(() => {
    if (!joined || !uid) { setSummary(null); setSummaryLoading(false); return undefined; }
    let alive = true;
    setSummaryLoading(true);
    loadHubSummary()
      .then((out) => { if (alive) setSummary(out); })
      .catch(() => { if (alive) setSummary(null); })
      .finally(() => { if (alive) setSummaryLoading(false); });
    return () => { alive = false; };
  }, [joined, uid]);

  const loadInvites = useCallback(async () => {
    try {
      const rows = await listMyGroups();
      setInvites(rows.filter((r) => r.state === 'invited').map((r) => r.group));
    } catch (_e) {
      setInvites([]);
    }
  }, []);

  // Pending group invites sit on the Groups segment; one read when it opens.
  useEffect(() => {
    if (!joined || segment !== 'groups') return;
    loadInvites();
  }, [joined, segment, loadInvites]);

  // The HOST row's card (spec 1.2): one read per Hub mount once joined,
  // best effort, hidden on any failure. `hostRowVisible` owns the rules.
  useEffect(() => {
    if (!joined || !uid || _hostHiddenForUid === uid) { setHost(null); return undefined; }
    let alive = true;
    (async () => {
      try {
        if (await readHostDismissed(uid)) {
          _hostHiddenForUid = uid;
          if (alive) setHost(null);
          return;
        }
        const out = await getProfile({ handle: COMMUNITY_HOST_HANDLE });
        if (!alive) return;
        const card = out?.card ?? null;
        const visible = hostRowVisible({ card, viewable: out?.viewable, uid });
        // A card that answered and hides by rule stays hidden for the
        // session; a read that did not answer is asked again next mount.
        if (card && !visible) _hostHiddenForUid = uid;
        setHost(visible ? card : null);
      } catch (_e) {
        if (alive) setHost(null);
      }
    })();
    return () => { alive = false; };
  }, [joined, uid]);

  // Moderated-person notice (40-GAP-CLOSURE.md section 1): best effort, own
  // request -- a failed read is silent rather than blocking the rest.
  useEffect(() => {
    if (!joined) { setStatus(null); return undefined; }
    let alive = true;
    myStatus().then((out) => { if (alive) setStatus(out); }).catch(() => { if (alive) setStatus(null); });
    return () => { alive = false; };
  }, [joined]);

  // The feed. A member reads Following first; a reader without a profile
  // reads Everyone, read-only (SD-04: reading is never gated on a profile).
  // A server that cannot serve the scope or the sort yet (migration 190
  // unapplied) answers the old shape with `fallback`; the chip is then
  // disabled and the view returns to Following or Newest.
  const load = useCallback(async (opts = {}) => {
    const sc = opts.scope ?? scopeRef.current;
    const so = opts.sort ?? sortRef.current;
    const id = requestRef.current + 1;
    requestRef.current = id;
    if (!opts.quiet) setLoading(true);
    const out = await loadHub(sc, {
      limit: PAGE, joined, sort: so,
    });
    if (id !== requestRef.current) return;
    if (out?.fallback === 'scope') { setScopeUnavailable(true); setScope('following'); }
    if (out?.fallback === 'sort') { setSortUnavailable(true); setSort('newest'); }
    setHub(out);
    setLoading(false);
  }, [joined, setScope, setSort]);

  useEffect(() => {
    const sc = joined ? 'following' : 'everyone';
    setScope(sc);
    setSort('newest');
    load({ scope: sc, sort: 'newest' });
  }, [joined, load, setScope, setSort]);

  // F5 (Opus adversarial review, founder order 2026-09-22): after Say
  // hello -> Post -> Back, the Hub still showed the zero state. Reload on
  // every return to focus; the ref skips the call focus fires alongside the
  // mount effect, and every later focus reloads QUIETLY.
  const focusedOnceRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!focusedOnceRef.current) { focusedOnceRef.current = true; return; }
    load({ quiet: true });
  }, [load]));

  // Community product audit section 1: the app-foreground trigger for the
  // consistency counters, alongside the workout-completion one in
  // ActiveWorkoutScreen. `publishConsistencyOnForeground` itself compares
  // the local week key and no-ops when it has not changed. The SAME trigger
  // drains ambient items queued while offline (`client_ref` makes a repeat
  // delivery idempotent server-side) and retries an owed sharing publish.
  const consistencyUid = me?.profile?.user_id ?? null;
  useEffect(() => {
    if (!consistencyUid) return undefined;
    // eslint-disable-next-line global-require
    const {
      publishConsistencyOnForeground, flushPendingAmbientItems, retryPendingSharingPublish,
    } = require('../lib/community');
    publishConsistencyOnForeground(consistencyUid).catch(() => {});
    flushPendingAmbientItems(consistencyUid).catch(() => {});
    retryPendingSharingPublish(consistencyUid).catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        publishConsistencyOnForeground(consistencyUid).catch(() => {});
        flushPendingAmbientItems(consistencyUid).catch(() => {});
        retryPendingSharingPublish(consistencyUid).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [consistencyUid]);

  // Communities revamp 2026-09-10 (onboarding join, spec section 4.2,
  // ruling h): opening Community is one of the three drain points for a
  // join that could not run when it was decided. Its own effect: it must
  // catch someone who has NO Community profile yet. Mount only; best effort.
  useEffect(() => {
    // eslint-disable-next-line global-require
    const { retryPendingJoin, currentUserId } = require('../lib/community');
    const pendingUid = currentUserId();
    if (pendingUid) retryPendingJoin(pendingUid).catch(() => { /* best effort: drained again next open */ });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load({ quiet: true }), refreshMe(true), joined ? loadSummary() : null]);
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshMe, joined, loadSummary]);

  const onEndReached = useCallback(async () => {
    if (paging || !hub?.cursor) return;
    setPaging(true);
    const id = requestRef.current;
    try {
      const next = await loadHub(scopeRef.current, {
        cursor: hub.cursor, limit: PAGE, joined, sort: sortRef.current,
      });
      if (id !== requestRef.current) return;
      setHub((prev) => (prev ? {
        ...prev,
        posts: [...(prev.posts ?? []), ...(next.posts ?? [])],
        cursor: next.cursor,
      } : next));
    } finally {
      setPaging(false);
    }
  }, [hub, paging, joined]);

  // Early days (spec 1.1, 1.5): the member's own invite, from the native
  // share sheet. A dismissed sheet is silent; nothing else is recorded.
  const inviteFriend = useCallback(async () => {
    try {
      await Share.share({
        message: inviteMessage({ handle: me?.profile?.handle, gymLabel: me?.profile?.gym_label }),
      });
    } catch (_e) { /* the person dismissed the share sheet */ }
  }, [me]);

  // Follow the host (spec 1.2): instant for a public profile; the row goes
  // and the feed reloads so the host's shared items land as first content.
  const followHost = useCallback(async () => {
    if (!host?.user_id || hostBusy) return;
    setHostBusy(true);
    try {
      const out = await follow(host.user_id);
      // Honest about what the server did (review fix 9): a followers-only
      // profile receives a request, and the row goes either way.
      toast.show(out?.state === 'requested'
        ? 'Requested.'
        : `Following ${host.display_name || host.handle || 'the host'}.`);
      _hostHiddenForUid = uid;
      setHost(null);
      await load({ quiet: true });
    } catch (e) {
      toast.show(e?.code === 'offline'
        ? 'You are offline. Try again when you have a connection.'
        : 'Could not follow just now.', { variant: 'error' });
    } finally {
      setHostBusy(false);
    }
  }, [host, hostBusy, load, toast, uid]);

  // "Not now" (spec 1.2; review note 14): the row and its read never come
  // back for this reader on this device.
  const dismissHost = useCallback(async () => {
    _hostHiddenForUid = uid;
    setHost(null);
    await writeHostDismissed(uid);
  }, [uid]);

  const acceptInvite = useCallback(async (group) => {
    if (!group?.id || inviteBusy) return;
    setInviteBusy(group.id);
    try {
      await acceptGroupInvite({ groupId: group.id });
      toast.show('Joined.');
      await Promise.all([loadInvites(), loadSummary()]);
    } catch (e) {
      toast.show(e?.code === 'offline'
        ? 'You are offline. Try again when you have a connection.'
        : 'Could not join that group just now.', { variant: 'error' });
    } finally {
      setInviteBusy(null);
    }
  }, [inviteBusy, loadInvites, loadSummary, toast]);

  const selectScope = useCallback((key) => {
    if (key === scopeRef.current) return;
    setScope(key);
    setHub(null);
    load({ scope: key });
  }, [load, setScope]);

  const selectSort = useCallback((key) => {
    setSortOpen(false);
    if (key === sortRef.current) return;
    setSort(key);
    setHub(null);
    load({ sort: key });
  }, [load, setSort]);

  // "Your last session" from the compose sheet: the same id-only read the
  // group page uses (`getLatestCompletedWorkoutId`, never the workout row),
  // handed to CommunityCompose exactly as the group page hands it.
  const composeLastSession = useCallback(async () => {
    setComposeOpen(false);
    if (!uid) return;
    try {
      // eslint-disable-next-line global-require
      const { getLatestCompletedWorkoutId } = require('../lib/database');
      const latestId = await getLatestCompletedWorkoutId(uid);
      if (!latestId) {
        toast.show('Finish a workout first, then share it here.');
        return;
      }
      navigation.navigate('CommunityCompose', { kind: 'session', workoutId: latestId });
    } catch (_e) {
      toast.show('Could not open that just now.', { variant: 'error' });
    }
  }, [uid, navigation, toast]);

  const posts = useMemo(
    () => (hub?.posts ?? []).map(normalisePostRow).filter(Boolean),
    [hub],
  );

  // The quiet line is about CACHED content: it is only true when there is
  // something on screen that was read earlier. A failure with no cache is
  // an empty state, not a caption.
  const offline = !!hub?.fromCache && !!hub?.error;
  const failed = !!hub?.error && !hub?.fromCache;

  const cohorts = useMemo(
    () => (summary?.cohorts ?? [])
      .filter((c) => COHORT_KIND_ORDER[c?.kind] !== undefined)
      .slice()
      .sort((a, b) => COHORT_KIND_ORDER[a.kind] - COHORT_KIND_ORDER[b.kind]),
    [summary],
  );
  const gymCohort = cohorts.find((c) => c.kind === 'gym') ?? null;
  const disciplineCohorts = cohorts.filter((c) => c.kind === 'discipline');
  const areaCohorts = cohorts.filter((c) => c.kind === 'area');
  const groups = summary?.groups ?? [];
  // The zero state is a statement of fact, so it needs a summary that
  // ANSWERED and carries no cohort at all, style included (review blocker
  // 2): a failed or rate-limited read shows nothing rather than telling a
  // member of a full gym that they are the first here.
  const summaryEmpty = !!summary && Array.isArray(summary.cohorts) && summary.cohorts.length === 0;
  const requestCount = (Number(me?.pending_requests) || 0) + (Number(me?.pending_connect_requests) || 0);
  const visibleInvites = invites.filter((g) => !laterIds.includes(g.id));

  const youPerson = joined ? {
    user_id: uid,
    avatar_preset: me?.profile?.avatar_preset ?? null,
    handle: me?.profile?.handle ?? null,
    display_name: 'You',
    isYou: true,
    caption: weekCounters ? streakCaption(weekCounters.c_weeks_streak) : null,
  } : null;
  const youDays = weekCounters?.c_trained_days_week;
  const youMetric = weekCounters ? metricLabel('week', weekCounters.c_sessions_week) : null;
  const youTrainedToday = !!weekCounters && weekCounters.c_last_trained_day === todayLocalKey();

  function openProfile(card) {
    if (card?.handle) navigation.navigate('CommunityProfile', { handle: card.handle });
  }

  function applyRespect(postId, on) {
    setHub((prev) => (prev ? {
      ...prev,
      posts: (prev.posts ?? []).map((row) => {
        const n = normalisePostRow(row);
        if (n?.post?.id !== postId) return row;
        const post = {
          ...n.post,
          reaction_count: Math.max(0, Number(n.post.reaction_count ?? 0) + (on ? 1 : -1)),
        };
        return { post, author: n.author, my_reaction: on };
      }),
    } : prev));
  }

  const unseenCount = Number(me?.unseen_messages ?? 0);

  // ─── Header and segment bar ─────────────────────────────────────────

  const chrome = (
    <AnimatedEntrance>
      <View style={styles.header}>
        <Text style={[styles.title, t.type.h3, { color: t.colors.textPrimary }]} accessibilityRole="header">
          Community
        </Text>
        <HeaderGlyph
          icon="search-outline"
          label="Search Community"
          onPress={() => navigation.navigate('CommunitySearch')}
        />
        {joined ? (
          <HeaderGlyph
            icon="notifications-outline"
            label={hasUnseen(me) ? 'Activity, new activity' : 'Activity'}
            onPress={() => navigation.navigate('CommunityActivity')}
          >
            {hasUnseen(me) ? (
              <View style={[styles.dot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />
            ) : null}
          </HeaderGlyph>
        ) : null}
        {joined ? (
          <HeaderGlyph
            icon="chatbubbles-outline"
            label={hasUnreadMessages(me) ? `Messages, ${unseenCount} unread` : 'Messages'}
            onPress={() => navigation.navigate('CommunityConversations')}
          >
            {hasUnreadMessages(me) ? (
              <View style={[styles.badge, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]}>
                <Text style={[t.type.captionStrong, { color: t.colors.onPrimary }]}>
                  {unseenCount > 9 ? '9+' : String(unseenCount)}
                </Text>
              </View>
            ) : null}
          </HeaderGlyph>
        ) : null}
      </View>
      <View style={styles.segmentBar} accessibilityRole="radiogroup" accessibilityLabel="Community sections">
        {SEGMENTS.map((s) => {
          const selected = segment === s.key;
          return (
            <Chip
              key={s.key}
              label={s.label}
              selected={selected}
              accessibilityRole="radio"
              onPress={() => chooseSegment(s.key)}
              style={[styles.segmentChip, selected && { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]}
              labelStyle={styles.segmentLabel}
              selectedLabelStyle={{ color: t.colors.onPrimary }}
            />
          );
        })}
      </View>
    </AnimatedEntrance>
  );

  // ─── Notices, hero and the pieces shared by segments ────────────────

  const notices = (
    <>
      {isModeratedStatus(status?.status) ? (
        <>
          <Band style={styles.notice}>
            <Text style={[t.type.bodySm, { color: t.colors.textPrimary }]}>
              {status.status === 'suspended'
                ? 'Your Community access is suspended.'
                : 'Some of your Community access is restricted.'}
              {status.reason_class && REPORT_REASONS[status.reason_class]
                ? ` Reason: ${REPORT_REASONS[status.reason_class]}.`
                : ''}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('CommunityRules')}
              style={styles.noticeLink}
              accessibilityRole="button"
              accessibilityLabel="Read Community rules"
            >
              <Text style={[t.type.captionStrong, { color: t.colors.textPrimary }]}>Community rules</Text>
            </Pressable>
          </Band>
          <BandGap />
        </>
      ) : null}

      {/* The same account notice as a restriction above: a status line
          about this person's own Community standing. */}
      {rulesBehind ? (
        <>
          <Band style={styles.notice}>
            <Text style={[t.type.bodySm, { color: t.colors.textPrimary }]}>
              The Community rules have changed. Your training at your gym stops updating until you read and accept them.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('CommunityRules', { mustAccept: true })}
              style={styles.noticeLink}
              accessibilityRole="button"
              accessibilityLabel="Read and accept the updated Community rules"
            >
              <Text style={[t.type.captionStrong, { color: t.colors.textPrimary }]}>Read the rules</Text>
            </Pressable>
          </Band>
          <BandGap />
        </>
      ) : null}

      {legacyCardShown ? (
        <>
          <Band style={styles.notice}>
            <Text style={[t.type.bodyStrong, { color: t.colors.textPrimary }]}>
              Partner invites have moved
            </Text>
            <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
              Training partners are now part of Community. Search for the person who sent this and follow each other.
            </Text>
            <View style={styles.noticeActions}>
              <Button
                variant="primary"
                size="sm"
                fullWidth={false}
                title="Find people"
                onPress={() => navigation.navigate('CommunityFindPeople')}
                accessibilityLabel="Find people in Community"
              />
              <Button
                variant="secondary"
                size="sm"
                fullWidth={false}
                title="Dismiss"
                onPress={() => setLegacyCardShown(false)}
                accessibilityLabel="Dismiss the partner invite notice"
              />
            </View>
          </Band>
          <BandGap />
        </>
      ) : null}
    </>
  );

  // Not joined: the hero band, or after "Browse first" one quiet line with
  // the way in (the loop between the two is gone, L14).
  const hero = !joined ? (
    browsing ? (
      <>
        <Band style={styles.browsingRow}>
          <Text style={[styles.browsingLine, t.type.caption, { color: t.colors.textMuted }]}>Not joined yet</Text>
          <Button
            variant="tertiary"
            size="sm"
            fullWidth={false}
            title="Join Community"
            onPress={() => navigation.navigate('CommunityJoin')}
            accessibilityLabel="Join Community"
          />
        </Band>
        <BandGap />
      </>
    ) : (
      <>
        <Band style={styles.hero}>
          <Text style={[t.type.h3, { color: t.colors.textPrimary }]}>See what people are training</Text>
          <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
            See who is training around you, keep up with friends, give respect.
          </Text>
          <View style={styles.noticeActions}>
            <Button
              variant="primary"
              size="sm"
              fullWidth={false}
              icon="person-add-outline"
              title="Join Community"
              onPress={() => navigation.navigate('CommunityJoin')}
              accessibilityLabel="Join Community"
            />
            <Button
              variant="tertiary"
              size="sm"
              fullWidth={false}
              title="Browse first"
              onPress={() => setBrowsing(true)}
              accessibilityLabel="Browse Community first"
            />
          </View>
        </Band>
        <BandGap />
        <View style={styles.receipt}>
          <PrivacyReceipt />
        </View>
        <BandGap />
      </>
    )
  ) : null;

  // ─── Feed ───────────────────────────────────────────────────────────

  const sortLabel = SORT_LABELS[sort] ?? SORT_LABELS.newest;

  const feedHeader = (
    <View>
      {notices}
      {hero}
      {joined ? (
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
            accessibilityRole="radiogroup"
            accessibilityLabel="Feed"
          >
            {SCOPES.map((s) => (
              <FilterChip
                key={s.key}
                label={s.label}
                selected={scope === s.key}
                disabled={scopeUnavailable && (s.key === 'gym' || s.key === 'groups')}
                onPress={() => selectScope(s.key)}
              />
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setSortOpen(true)}
            style={styles.sortControl}
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${sortLabel}`}
          >
            <Text style={[t.type.label, { color: t.colors.textSecondary }]}>{sortLabel}</Text>
            <Ionicons name="chevron-down" size={iconSize.sm} color={t.colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}
      {offline ? (
        <Text style={[styles.offline, t.type.caption, { color: t.colors.textMuted }]}>
          Showing what you last saw. You are offline.
        </Text>
      ) : null}
      <Band>
        {joined ? (
          <Well
            text="Share something from your training"
            onPress={() => setComposeOpen(true)}
            accessibilityLabel="Share something from your training"
          />
        ) : (
          <JoinToInteractRow onPress={() => navigation.navigate('CommunityJoin')} />
        )}
      </Band>
    </View>
  );

  const scopeEmpty = (() => {
    if (scope === 'following') {
      return {
        line: 'Follow a few people to fill this feed',
        label: 'Find people',
        onPress: () => navigation.navigate('CommunityFindPeople'),
      };
    }
    if (scope === 'gym') {
      return me?.profile?.gym_label
        ? { line: 'Nobody at your gym has posted yet.', label: null, onPress: null }
        : {
          line: 'Set your gym to see who trains there',
          label: 'Set gym',
          onPress: () => navigation.navigate('CommunityEditProfile'),
        };
    }
    if (scope === 'groups') {
      return groups.length
        ? { line: 'Nothing from your groups yet.', label: null, onPress: null }
        : { line: 'Join or start a group', label: 'Groups', onPress: () => chooseSegment('groups') };
    }
    return {
      line: 'Nothing posted yet. Yours could be first.',
      label: 'Write a post',
      onPress: () => (joined ? setComposeOpen(true) : navigation.navigate('CommunityJoin')),
    };
  })();

  const feedEmpty = (loading || meLoading) ? (
    <View>
      <SkeletonPostRow />
      <SkeletonPostRow />
      <SkeletonPostRow />
    </View>
  ) : failed ? (
    // A read that did not answer is never reported as an empty community.
    <EmptyState
      icon="cloud-offline-outline"
      title={hub.error === 'offline' ? 'You are offline' : 'Could not load Community'}
      text={hub.error === 'offline'
        ? 'Community needs a connection. Your training is unaffected.'
        : 'Try that again in a moment.'}
      secondaryLabel="Try again"
      onSecondary={() => load()}
      secondaryAccessibilityLabel="Try loading Community again"
    />
  ) : (
    <Band style={styles.sectionEmpty}>
      <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>{scopeEmpty.line}</Text>
      {scopeEmpty.label ? (
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title={scopeEmpty.label}
          onPress={scopeEmpty.onPress}
          accessibilityLabel={scopeEmpty.label}
        />
      ) : null}
    </Band>
  );

  const feed = (
    <FlashList
      data={posts}
      keyExtractor={(item) => item.post.id}
      renderItem={({ item }) => (
        <PostRow
          item={item}
          onPress={() => navigation.navigate('CommunityPost', { id: item.post.id })}
          onRespect={joined ? (next) => reactToPost(item.post.id, next, item.author?.user_id) : undefined}
          onRespectBlocked={joined ? undefined : () => navigation.navigate('CommunityJoin')}
          onRespected={(next) => applyRespect(item.post.id, next)}
          onOpenPerson={(author) => openProfile(author)}
        />
      )}
      ListHeaderComponent={feedHeader}
      ListEmptyComponent={feedEmpty}
      ListFooterComponent={paging ? (
        <ActivityIndicator color={t.colors.primary} style={styles.footer} />
      ) : null}
      contentContainerStyle={styles.list}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.colors.textMuted}
          colors={[t.colors.primary]}
        />
      )}
    />
  );

  // ─── People ─────────────────────────────────────────────────────────

  const cohortRow = (c) => (
    <CohortRow
      key={`${c.kind}:${c.key}`}
      inBand
      title={c.label}
      line={trainedTodayLine(c.member_count, c.trained_today_count)}
      people={Array.isArray(c.sample) ? c.sample : []}
      onPress={() => navigation.navigate('CommunityDimension', {
        kind: c.kind, key: c.key, label: c.label,
      })}
    />
  );

  const people = joined ? (
    <>
      <Band>
        <Well
          icon="search-outline"
          text="Search people and groups"
          onPress={() => navigation.navigate('CommunitySearch')}
        />
        <HubRow
          big
          icon="people-outline"
          title="Find people"
          subtitle="Train like you, same gym, near you, same discipline"
          onPress={() => navigation.navigate('CommunityFindPeople')}
        />
        <HubRow
          icon="person-add-outline"
          title="Requests"
          subtitle={requestCount > 0
            ? `${requestCount} ${requestCount === 1 ? 'person wants' : 'people want'} to connect`
            : 'No new requests'}
          onPress={() => navigation.navigate('CommunityActivity')}
          trailing={requestCount > 0 ? (
            <Text style={[t.type.num('label'), { color: t.colors.textPrimary }]}>{requestCount}</Text>
          ) : undefined}
        />
      </Band>
      <BandGap />
      <Band>
        <SectionHeader title="Your gym" />
        {summaryLoading ? (
          <View style={styles.skeletonRow}><SkeletonPersonRow /></View>
        ) : gymCohort ? (
          cohortRow(gymCohort)
        ) : !me?.profile?.gym_label ? (
          <HubRow
            icon="location-outline"
            title="Set your gym"
            subtitle="See who trains there"
            onPress={() => navigation.navigate('CommunityEditProfile')}
          />
        ) : null}
      </Band>
      {summaryLoading || disciplineCohorts.length ? (
        <>
          <BandGap />
          <Band>
            <SectionHeader title="Disciplines" />
            {summaryLoading ? (
              <View style={styles.skeletonRow}><SkeletonPersonRow /></View>
            ) : disciplineCohorts.map(cohortRow)}
          </Band>
        </>
      ) : null}
      {areaCohorts.length ? (
        <>
          <BandGap />
          <Band>
            <SectionHeader title="Near you" />
            {areaCohorts.map(cohortRow)}
          </Band>
        </>
      ) : null}
    </>
  ) : null;

  // ─── Groups ─────────────────────────────────────────────────────────

  const groupsSegment = joined ? (
    <>
      {!(groups.length === 0 && isMinor) ? (
        <>
          <Band>
            <SectionHeader title="My groups" />
            {summaryLoading ? (
              <View style={styles.skeletonRow}><SkeletonPersonRow /></View>
            ) : groups.length ? (
              groups.map((g) => (
                <GroupRow
                  key={g.id}
                  inBand
                  group={g}
                  line={trainedTodayLine(g.member_count, g.trained_today_count)}
                  people={Array.isArray(g.sample) ? g.sample : []}
                  onPress={() => navigation.navigate('CommunityGroup', { id: g.id })}
                />
              ))
            ) : (
              <Text style={[styles.sectionLine, t.type.bodySm, { color: t.colors.textMuted }]}>
                {GROUP_PURPOSE_LINE}
              </Text>
            )}
          </Band>
          <BandGap />
        </>
      ) : null}
      {visibleInvites.length ? (
        <>
          <Band>
            <SectionHeader title="Invites" />
            {visibleInvites.map((g) => (
              <HubRow
                key={g.id}
                icon="mail-outline"
                title={g.name || 'Group'}
                subtitle="Invited you to join"
                onPress={() => navigation.navigate('CommunityGroup', { id: g.id })}
                trailing={(
                  <View style={styles.inviteActions}>
                    <Button
                      variant="tertiary"
                      size="sm"
                      fullWidth={false}
                      title="Later"
                      disabled={inviteBusy === g.id}
                      onPress={() => setLaterIds((prev) => [...prev, g.id])}
                      accessibilityLabel={`Hide the invite to ${g.name || 'the group'} for now`}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      title="Accept"
                      loading={inviteBusy === g.id}
                      disabled={!!inviteBusy}
                      onPress={() => acceptInvite(g)}
                      accessibilityLabel={`Accept the invite to ${g.name || 'the group'}`}
                    />
                  </View>
                )}
              />
            ))}
          </Band>
          <BandGap />
        </>
      ) : null}
      <Band>
        {!isMinor ? (
          <HubRow
            icon="add-circle-outline"
            title="New group"
            subtitle="Train together and see each other's weeks"
            onPress={() => navigation.navigate('CommunityGroupCreate')}
          />
        ) : null}
        <HubRow
          icon="search-outline"
          title="Browse open groups"
          subtitle="Find a group to join"
          onPress={() => navigation.navigate('CommunitySearch', { mode: 'groups' })}
        />
      </Band>
    </>
  ) : null;

  // ─── You ────────────────────────────────────────────────────────────

  const youSegment = joined ? (
    <>
      {!consistencyGated ? (
        <>
          <Band>
            <PersonRow
              inBand
              person={youPerson}
              metric={youMetric}
              days={youDays}
              trainedToday={youTrainedToday}
              metricRole="title"
              onPress={() => navigation.navigate('CommunityProfile', { userId: uid })}
            />
            {weekCounters ? (
              <ProgressStrip
                band
                counters={weekCounters}
                onPress={() => navigation.navigate('CommunityBoard', { scope: 'following', window: 'week' })}
              />
            ) : null}
          </Band>
          <BandGap />
        </>
      ) : null}
      {host ? (
        <>
          <Band>
            <SectionHeader title="Host" trailing={{ label: 'Not now', onPress: dismissHost }} />
            <PersonRow
              inBand
              person={{ ...host, caption: hostCaption(host) }}
              onPress={() => navigation.navigate('CommunityProfile', { handle: host.handle })}
              trailing={(
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  title="Follow"
                  loading={hostBusy}
                  disabled={hostBusy}
                  onPress={followHost}
                  accessibilityLabel={`Follow ${host.display_name || host.handle || 'the host'}`}
                />
              )}
            />
          </Band>
          <BandGap />
        </>
      ) : null}
      {summaryEmpty ? (
        // Early days (spec 1.1): the summary omits every cohort with nobody
        // else in it, so an empty answer means the reader is the first here.
        // One honest line and one action.
        <>
          <Band style={styles.sectionEmpty}>
            <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
              {firstHereLine(me?.profile?.gym_label)}
            </Text>
            <Button
              variant="tertiary"
              size="sm"
              fullWidth={false}
              icon="person-add-outline"
              title={inviteLabel({ gymLabel: me?.profile?.gym_label })}
              onPress={inviteFriend}
              accessibilityLabel="Invite someone to Volyume"
            />
          </Band>
          <BandGap />
        </>
      ) : null}
      <Band>
        <HubRow
          leading={(
            <ProfileAvatarMark
              presetKey={me?.profile?.avatar_preset ?? null}
              displayName={me?.profile?.display_name || me?.profile?.handle || ''}
              size={MARK}
            />
          )}
          title="My profile"
          subtitle={me?.profile?.handle ? `@${me.profile.handle}` : undefined}
          onPress={() => navigation.navigate('CommunityProfile', { userId: uid })}
        />
        <HubRow
          icon="people-outline"
          title="Followers and connections"
          onPress={() => navigation.navigate('CommunityFollowers')}
        />
        <HubRow
          icon="shield-checkmark-outline"
          title="Privacy and sharing"
          onPress={() => navigation.navigate('CommunityPrivacy')}
        />
        <HubRow
          icon="barbell-outline"
          title="Training profile"
          onPress={() => navigation.navigate('CommunityTrainingProfile')}
        />
        <HubRow
          icon="document-text-outline"
          title="Community rules"
          onPress={() => navigation.navigate('CommunityRules')}
        />
      </Band>
    </>
  ) : null;

  const scrollSegment = (content) => (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.colors.textMuted}
          colors={[t.colors.primary]}
        />
      )}
    >
      {notices}
      {!joined ? hero : null}
      {content}
    </ScrollView>
  );

  let body = null;
  if (segmentReady) {
    if (segment === 'feed') body = feed;
    else if (segment === 'people') body = scrollSegment(people);
    else if (segment === 'groups') body = scrollSegment(groupsSegment);
    else body = scrollSegment(youSegment);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      {chrome}
      {body}
      <MenuSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sort posts"
        rows={[
          {
            icon: 'time-outline', label: 'Newest', sub: 'The latest posts first', onPress: () => selectSort('newest'),
          },
          ...(sortUnavailable ? [] : [{
            icon: 'heart-outline',
            label: 'Most respected',
            sub: 'The last two weeks, most Respect first',
            onPress: () => selectSort('respected'),
          }]),
        ]}
      />
      <MenuSheet
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Share something"
        rows={[
          {
            icon: 'create-outline',
            label: 'A note',
            sub: 'A few words for the people who follow you',
            onPress: () => { setComposeOpen(false); navigation.navigate('CommunityCompose', { kind: 'note' }); },
          },
          {
            icon: 'barbell-outline',
            label: 'Your last session',
            sub: 'Post the session you finished most recently',
            onPress: composeLastSession,
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xxl },
  bandGap: { height: BAND },
  header: {
    flexDirection: 'row', alignItems: 'center', minHeight: HEADER_HEIGHT, paddingLeft: spacing.lg, paddingRight: spacing.xs,
  },
  title: { flex: 1, color: colors.textPrimary },
  glyph: {
    width: touchTarget.minimum, height: touchTarget.minimum, alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: circle(8), borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: circle(16),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  segmentBar: {
    flexDirection: 'row', alignItems: 'center', minHeight: touchTarget.minimum, gap: spacing.xs2, paddingHorizontal: spacing.lg,
  },
  segmentChip: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  segmentLabel: { textAlign: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  filterScroll: { flex: 1 },
  filterContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  filterChip: {
    height: FILTER_CHIP_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortControl: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  notice: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.xs },
  noticeLink: { minHeight: touchTarget.minimum, justifyContent: 'center' },
  noticeActions: { flexDirection: 'row', gap: spacing.sm },
  inviteActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hero: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.sm },
  receipt: { paddingHorizontal: spacing.lg },
  browsingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
  },
  browsingLine: { flex: 1 },
  well: {
    minHeight: WELL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  wellText: { flex: 1 },
  row: { paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  rowText: { flex: 1 },
  mark: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  skeletonRow: { paddingHorizontal: spacing.lg },
  sectionEmpty: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'flex-start', gap: spacing.xs,
  },
  sectionLine: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  offline: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  footer: { paddingVertical: spacing.lg },
});
