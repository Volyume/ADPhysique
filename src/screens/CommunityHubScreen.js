/**
 * CommunityHubScreen (communities revamp 2026-09-10: `docs/communities-
 * revamp-2026-09-10/21-PHASE1-SPEC.md` section 2; `20-BLUEPRINT.md`
 * section 9, "The Hub, top to bottom"). Rebuilt to the presentation law:
 * flat rows under uppercase `Eyebrow` labels, no Chip segment, no Find
 * people card, no "Lifters like you" on the Hub itself (it moved to Find
 * people), no `SectionLabel`, no `Card` except the not-joined hero and
 * the moderated-person notice (the notice is a plain styled `View`, so
 * the only literal `<Card` in this file is the hero and the legacy
 * partner card -- pinned by `community.presentation.guard.test.js`).
 *
 * One `FlashList`. Joined: a You line (`PersonRow`), PEOPLE (`CohortRow`
 * per cohort you belong to, from `community_dimensions_me`), GROUPS
 * (`GroupRow` per group from `community_group_list_mine`), ACTIVITY (the
 * Following feed, `community_feed`, as `ActivityItemRow`s). Not joined:
 * the hero and the compact `PrivacyReceipt`, then RECENT -- the existing
 * Discover stories (`community_discover_posts`, via the same `loadHub`
 * this screen always used for that state), still as `ActivityItemRow`s,
 * with Respect routed through the existing join-to-interact pattern
 * (`JoinToInteractRow` on the post detail screen already owns the
 * comment side of this; here it is one tap on the heart, which would
 * otherwise raise `no_profile`, routed to Join instead).
 *
 * Every state this screen already had keeps its place: the offline
 * caption (above the feed), the failed-read Try again, the moderated-
 * person notice and the legacy partner card (both above the hero/You
 * line), deep-link handling, the header glyphs and their badges, the
 * unseen-dot logic.
 *
 * Communities revamp (2026-09-10), task 5: PEOPLE and GROUPS now come
 * from ONE call, `community_hub_summary` (`22-MIGRATION-170A-CONTRACT.md`),
 * which already carries `member_count`, `trained_today_count` and a
 * `sample` for every cohort and every group -- the Hub's own gym board
 * call and the `community_dimensions_me` read it used for PEOPLE are both
 * gone; the roster/board pattern moves to the cohort page
 * (`CommunityDimensionScreen`). Row order: gym, each discipline, age
 * group (present only while the caller shares it), area -- style cohorts
 * are never Hub rows (Find people is where they live). `member_count`
 * being 0 already means the row was omitted server-side, so nothing here
 * re-applies a threshold of its own.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator, Pressable, AppState, TouchableOpacity, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles.
import { FlashList } from '@shopify/flash-list';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import Eyebrow from '../components/community/Eyebrow';
import PersonRow from '../components/community/PersonRow';
import CohortRow from '../components/community/CohortRow';
import GroupRow from '../components/community/GroupRow';
import ActivityItemRow from '../components/community/ActivityItemRow';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import {
  colors, spacing, type, circle, fontSize, fontWeight, radius,
} from '../styles/theme';
import {
  loadHub, hasProfile, hasUnseen, hasUnreadMessages, reactToPost,
  loadHubSummary, metricLabel, loadConsistency, consistencyGateState,
  myStatus, isModeratedStatus, REPORT_REASONS, TP_AGE_BANDS,
  getProfile, follow, COMMUNITY_HOST_HANDLE, inviteMessage, inviteLabel, firstHereLine,
  hostRowVisible, hostCaption, readHostDismissed, writeHostDismissed, GROUP_PURPOSE_LINE,
} from '../lib/community';
import { todayLocalKey } from '../lib/dayKey';

const PAGE = 20;

// The HOST row's read (26-EARLY-DAYS-SPEC.md 1.2) happens once per app
// session per reader once its answer is "no row": the reader is the host,
// already follows, or has a block or mute (review note 15). A follow made
// elsewhere in the session is picked up by the next launch.
let _hostHiddenForUid = null;
/** Test seam: the session cache above. */
export function _resetHostCacheForTests() { _hostHiddenForUid = null; }

/**
 * "3 trained today · 8 members" (task 5; `GroupRow`'s own header comment:
 * "8 members · invite only" until the server can say who trained today,
 * "then 3 trained today · 8 members"). `community_hub_summary` always
 * carries both counts now, so this is the one line every PEOPLE and
 * GROUPS row on the Hub composes from -- the same fields, the same
 * wording, whichever kind of row it is. Kept local rather than exported
 * from `lib/` (screens compose their own small copy helpers here, same
 * precedent as `normalisePostRow`).
 */
function trainedTodayLine(memberCount, trainedTodayCount) {
  const n = Number(memberCount) || 0;
  const td = Number(trainedTodayCount) || 0;
  return `${td} trained today · ${n} ${n === 1 ? 'member' : 'members'}`;
}

/** Row order for the PEOPLE cohorts (task 5): gym, each discipline, age
 * group, area -- style is never a Hub row (Find people is where it
 * lives), so it is filtered out before this even runs. */
const COHORT_KIND_ORDER = Object.freeze({ gym: 0, discipline: 1, age_band: 2, area: 3 });

/** "6 weeks in a row" / "Getting back into it": the You row's second-line
 * fallback when there are no trained days yet to draw as `DayDots` this
 * week -- the exact wording the old "This week" streak chip used, so a
 * returning reader sees the same phrase in the new spot. */
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

export default function CommunityHubScreen({ navigation, route }) {
  const t = useTheme();
  const { me, loading: meLoading, refresh: refreshMe } = useCommunityMe();
  const joined = hasProfile(me);
  const legacyPartnerCode = route?.params?.legacyPartnerCode ?? null;

  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const [legacyCardShown, setLegacyCardShown] = useState(!!legacyPartnerCode);
  const [browsing, setBrowsing] = useState(false);
  const [weekCounters, setWeekCounters] = useState(null);
  // Fails CLOSED: no You row renders until the gate explicitly clears it
  // (mirrors `consistencyGateState`'s own "fail closed" posture).
  const [consistencyGated, setConsistencyGated] = useState(true);
  // PEOPLE and GROUPS (task 5): one call, `community_hub_summary`.
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [status, setStatus] = useState(null);
  // Early days (26-EARLY-DAYS-SPEC.md 1.2): the founder's real profile,
  // shown as the host while the reader is not yet following them. Null
  // means "no row": not joined, the reader is the host, already following,
  // or the read did not answer (a missing host is never an error).
  const [host, setHost] = useState(null);
  const [hostBusy, setHostBusy] = useState(false);
  const toast = useToast();
  const listRef = useRef(null);

  const uid = me?.profile?.user_id ?? null;
  const isMinor = !!me?.is_minor;

  // The You line's own device counters (spec: "DayDots from your own
  // device counters"; lead ruling 2026-09-10, communities revamp: shown
  // whenever the ED gate allows, independent of the "Share my
  // consistency" toggle -- it is the reader's own data on their own
  // screen, and sharing governs what OTHER people see, not this).
  // Gated ONLY on `consistencyGateState` (`trainingConsistency.js`): its
  // `gated` field is `readEdOrCalmSuppressed(uid)` alone, calm mode or an
  // open ED flag, never the toggle. When it withholds, no You row renders
  // at all -- no empty row, no caption (lead ruling) -- so the row itself
  // is gated on `consistencyGated`, not merely its contents on
  // `weekCounters`.
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

  // PEOPLE and GROUPS (task 5, 22-MIGRATION-170A-CONTRACT.md
  // "community_hub_summary"): one call for both sections, counts, trained
  // today and samples all carried already -- no client-side threshold, no
  // separate board or dimensions read, no separate groups read.
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

  // The HOST row's card (spec 1.2): one read per Hub mount once joined,
  // best effort, hidden on any failure. `hostRowVisible` owns the rules
  // (not the host, not following, no block or mute, viewable).
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

  // Moderated-person notice (40-GAP-CLOSURE.md §1): best effort, own
  // request, same posture as the rest of `me` -- a failed read is silent
  // rather than blocking the rest of the Hub.
  useEffect(() => {
    if (!joined) { setStatus(null); return undefined; }
    let alive = true;
    myStatus().then((out) => { if (alive) setStatus(out); }).catch(() => { if (alive) setStatus(null); });
    return () => { alive = false; };
  }, [joined]);

  // No Chip segment any more (blueprint 9: "discovery happens on the
  // cohort pages"), so the feed is always Following once joined, and
  // always Discover before -- reading is never gated on a profile (SD-04).
  const load = useCallback(async (opts = {}) => {
    if (!opts.quiet) setLoading(true);
    const out = await loadHub(joined ? 'following' : 'discover', { limit: PAGE, joined });
    setHub(out);
    setLoading(false);
  }, [joined]);

  useEffect(() => { load(); }, [load]);

  // F5 (Opus adversarial review, founder order 2026-09-22): after Say
  // hello -> Post -> Back, the Hub still showed the zero state and the
  // door -- nothing reloaded it. Reload on every return to focus, the
  // same useFocusEffect shape CommunityPostScreen.js and
  // CommunityConversationsScreen.js already use for their own screens.
  // The ref skips the call focus fires right alongside the mount effect
  // above, so first-mount behaviour is unchanged; every later focus
  // reloads QUIETLY (`quiet: true`, the same flag pull-to-refresh already
  // passes below), never re-showing the spinner over content already on
  // screen.
  const focusedOnceRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!focusedOnceRef.current) { focusedOnceRef.current = true; return; }
    load({ quiet: true });
  }, [load]));

  // Community product audit section 1: the app-foreground trigger for the
  // consistency counters, alongside the workout-completion one in
  // ActiveWorkoutScreen. `publishConsistencyOnForeground` itself compares
  // the local week key and no-ops when it has not changed, so this can
  // safely fire on every mount and every return-to-foreground.
  //
  // Communities revamp phase 3 (spec section 2): the SAME foreground
  // trigger drains any ambient items queued while offline
  // (`flushPendingAmbientItems`, `client_ref` makes a repeat delivery
  // idempotent server-side).
  //
  // "Or reconnect": a self-contained `NetInfo.addEventListener` was tried
  // here and dropped again in the same landing -- the library's own
  // internal current-state fetch throws asynchronously, outside any
  // try/catch this effect can place around the call, and surfaced as an
  // unhandled rejection under the test renderer (a real fragility, not a
  // mock artifact: the same throw would be reachable on a device the
  // moment the native module answers slower than the listener registers).
  // Foreground already covers the overwhelmingly common "was offline, now
  // is not" case in practice: reconnecting almost always also foregrounds
  // the app, and every subsequent workout completion's own opportunistic
  // flush (`WorkoutSummaryScreen.js`) drains the queue too. A dedicated
  // reconnect listener stays open for the lead to revisit; see the lane
  // report.
  const consistencyUid = me?.profile?.user_id ?? null;
  useEffect(() => {
    if (!consistencyUid) return undefined;
    // eslint-disable-next-line global-require
    const {
      publishConsistencyOnForeground, flushPendingAmbientItems, retryPendingSharingPublish,
    } = require('../lib/community');
    publishConsistencyOnForeground(consistencyUid).catch(() => {});
    flushPendingAmbientItems(consistencyUid).catch(() => {});
    // F4 fix: retry a "Share what I did" publish left owed by a failed
    // `saveSharing` call, on the same foreground trigger.
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
  // join that could not run when it was decided (the other two are the
  // App.js reconnect edge and the daily sync trigger). Deliberately its
  // own effect, independent of `consistencyUid` above: that one requires
  // an existing Community profile, and the whole point here is to catch
  // someone who does NOT have one yet. Mount only; best effort.
  useEffect(() => {
    // eslint-disable-next-line global-require
    const { retryPendingJoin, currentUserId } = require('../lib/community');
    const pendingUid = currentUserId();
    if (pendingUid) retryPendingJoin(pendingUid).catch(() => { /* best effort: drained again next open */ });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load({ quiet: true }), refreshMe(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshMe]);

  const onEndReached = useCallback(async () => {
    if (paging || !hub?.cursor) return;
    setPaging(true);
    try {
      const next = await loadHub(joined ? 'following' : 'discover', { cursor: hub.cursor, limit: PAGE, joined });
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

  const posts = useMemo(
    () => (hub?.posts ?? []).map(normalisePostRow).filter(Boolean),
    [hub],
  );

  // The quiet line is about CACHED content: it is only true when there is
  // something on screen that was read earlier. A failure with no cache is
  // an empty state, not a caption.
  const offline = !!hub?.fromCache && !!hub?.error;
  const failed = !!hub?.error && !hub?.fromCache;

  // PEOPLE cohorts (task 5): style dropped (Find people is where it
  // lives), everything else in the fixed row order gym, discipline,
  // age_band, area. A stable sort keeps same-kind rows (up to three
  // disciplines) in the order the server sent them.
  const cohorts = useMemo(
    () => (summary?.cohorts ?? [])
      .filter((c) => c?.kind !== 'style')
      .slice()
      .sort((a, b) => (COHORT_KIND_ORDER[a.kind] ?? 99) - (COHORT_KIND_ORDER[b.kind] ?? 99)),
    [summary],
  );
  const groups = summary?.groups ?? [];
  // The zero state is a statement of fact, so it needs a summary that
  // ANSWERED and carries no cohort at all, style included (review blocker
  // 2): a failed or rate-limited read shows nothing rather than telling a
  // member of a full gym that they are the first here.
  const summaryEmpty = !!summary && Array.isArray(summary.cohorts) && summary.cohorts.length === 0;

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

  async function react(item) {
    try {
      await reactToPost(item.post.id, !item.myReaction, item.author?.user_id);
      setHub((prev) => (prev ? {
        ...prev,
        posts: (prev.posts ?? []).map((row) => {
          const n = normalisePostRow(row);
          if (n?.post?.id !== item.post.id) return row;
          const on = !item.myReaction;
          const post = {
            ...n.post,
            reaction_count: Math.max(0, Number(n.post.reaction_count ?? 0) + (on ? 1 : -1)),
          };
          return { post, author: n.author, my_reaction: on };
        }),
      } : prev));
    } catch (_e) {
      // A reaction that did not land is not worth interrupting anyone for;
      // the next refresh shows the truth.
    }
  }

  const headerRight = (
    <View style={styles.headerActions}>
      {joined ? (
        <Pressable
          onPress={() => navigation.navigate('CommunityProfile', { userId: me?.profile?.user_id })}
          hitSlop={spacing.sm}
          style={styles.headerAvatar}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
        >
          <ProfileAvatarMark
            presetKey={me?.profile?.avatar_preset ?? null}
            displayName={me?.profile?.display_name || me?.profile?.handle || ''}
            size={30}
          />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => navigation.navigate('CommunitySearch')}
        hitSlop={spacing.sm}
        style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Search Community"
      >
        <Ionicons name="search-outline" size={18} color={t.colors.primary} />
      </Pressable>
      {joined ? (
        <Pressable
          onPress={() => navigation.navigate('CommunityActivity')}
          hitSlop={spacing.sm}
          style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={hasUnseen(me) ? 'Activity, new activity' : 'Activity'}
        >
          <Ionicons name="notifications-outline" size={18} color={t.colors.primary} />
          {hasUnseen(me) ? (
            <View style={[styles.dot, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]} />
          ) : null}
        </Pressable>
      ) : null}
      {joined ? (
        <Pressable
          onPress={() => navigation.navigate('CommunityConversations')}
          hitSlop={spacing.sm}
          style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={hasUnreadMessages(me)
            ? `Messages, ${Number(me?.unseen_messages ?? 0)} unread`
            : 'Messages'}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={t.colors.primary} />
          {hasUnreadMessages(me) ? (
            <View style={[styles.badge, { backgroundColor: t.colors.primary, borderColor: t.colors.background }]}>
              <Text style={[styles.badgeText, { color: t.colors.onPrimary }]}>
                {Number(me?.unseen_messages ?? 0) > 9 ? '9+' : String(me?.unseen_messages ?? 0)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      {/* Founder order 2026-09-22, item 2 / audit A-10: CommunityPrivacy
          was reachable only from Settings, never from inside Community.
          One entry here, matching the three buttons above exactly (same
          size, background, border, icon convention) -- nothing else on
          this screen changes. */}
      {joined ? (
        <Pressable
          onPress={() => navigation.navigate('CommunityPrivacy')}
          hitSlop={spacing.sm}
          style={[styles.headerBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Community privacy"
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={t.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );

  const header = (
    <AnimatedEntrance style={styles.header}>
      {isModeratedStatus(status?.status) ? (
        <View style={[styles.statusNotice, { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle }]}>
          <Text style={[styles.statusNoticeLine, { color: t.colors.textPrimary }]}>
            {status.status === 'suspended'
              ? 'Your Community access is suspended.'
              : 'Some of your Community access is restricted.'}
            {status.reason_class && REPORT_REASONS[status.reason_class]
              ? ` Reason: ${REPORT_REASONS[status.reason_class]}.`
              : ''}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CommunityRules')}
            accessibilityRole="button"
            accessibilityLabel="Read Community rules"
          >
            <Text style={[styles.statusNoticeLink, { color: t.colors.primary }]}>Community rules</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {legacyCardShown ? (
        <Card style={styles.block}>
          <Text style={[styles.blockTitle, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
            Partner invites have moved
          </Text>
          <Text style={[styles.blockBody, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            Training partners are now part of Community. Search for the person who sent this and follow each other.
          </Text>
          <View style={styles.blockActions}>
            <Button
              variant="primary"
              size="sm"
              fullWidth={false}
              title="Find people"
              onPress={() => navigation.navigate('CommunitySearch')}
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
        </Card>
      ) : null}

      {!joined && browsing ? (
        <View style={styles.browsingRow}>
          <Text style={[styles.browsingLine, { ...t.type.caption, color: t.colors.textMuted }]}>
            Not joined yet
          </Text>
          <Button
            variant="tertiary"
            size="sm"
            fullWidth={false}
            title="Create my profile"
            onPress={() => setBrowsing(false)}
            accessibilityLabel="Show how to create my Community profile"
          />
        </View>
      ) : null}

      {!joined && !browsing ? (
        <>
          <Card style={styles.block}>
            <Text style={[styles.heroTitle, { ...t.type.h3, color: t.colors.textPrimary }]}>
              Your gym, your people
            </Text>
            <Text style={[styles.heroBody, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              See who is training around you, keep up with friends, give respect.
            </Text>
            <View style={styles.heroActions}>
              <Button
                variant="primary"
                size="sm"
                fullWidth={false}
                icon="person-add-outline"
                title="Create my profile"
                onPress={() => navigation.navigate('CommunityJoin')}
                accessibilityLabel="Create my Community profile"
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
          </Card>
          <PrivacyReceipt />
        </>
      ) : null}

      {joined && !consistencyGated ? (
        <PersonRow
          person={youPerson}
          metric={youMetric}
          days={youDays}
          trainedToday={youTrainedToday}
          metricRole="title"
          onPress={() => navigation.navigate('CommunityProfile', { userId: uid })}
        />
      ) : null}

      {joined ? (
        <>
          {/* PEOPLE and GROUPS are the same shape: an eyebrow with one
              quiet trailing action. "Find people" used to be a bare text
              row under the cohorts, which read as a second heading rather
              than a control (founder look-and-feel pass 2026-09-14). */}
          <Eyebrow trailing={{ label: 'Find people', onPress: () => navigation.navigate('CommunityFindPeople') }}>
            PEOPLE
          </Eyebrow>
          {summaryLoading ? (
            <>
              <SkeletonPersonRow />
              <SkeletonPersonRow />
            </>
          ) : cohorts.length || !summaryEmpty ? (
            cohorts.map((c) => (
              <CohortRow
                key={`${c.kind}:${c.key}`}
                title={c.kind === 'age_band' ? (TP_AGE_BANDS[c.label] ?? c.label) : c.label}
                line={trainedTodayLine(c.member_count, c.trained_today_count)}
                people={Array.isArray(c.sample) ? c.sample : []}
                onPress={() => navigation.navigate('CommunityDimension', {
                  kind: c.kind, key: c.key, label: c.kind === 'age_band' ? (TP_AGE_BANDS[c.label] ?? c.label) : c.label,
                })}
              />
            ))
          ) : (
            // Early days (spec 1.1): the summary omits every cohort with
            // nobody else in it, so an empty PEOPLE means the reader is
            // the first here. One honest line and one action.
            <View style={styles.firstHere}>
              <Text style={[styles.firstHereLine, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
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
            </View>
          )}
        </>
      ) : null}

      {joined && !(groups.length === 0 && isMinor) ? (
        <>
          <Eyebrow trailing={!isMinor ? { label: 'New group', onPress: () => navigation.navigate('CommunityGroupCreate') } : undefined}>
            GROUPS
          </Eyebrow>
          {summaryLoading ? (
            <SkeletonPersonRow />
          ) : groups.length ? (
            groups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                line={trainedTodayLine(g.member_count, g.trained_today_count)}
                people={Array.isArray(g.sample) ? g.sample : []}
                onPress={() => navigation.navigate('CommunityGroup', { id: g.id })}
              />
            ))
          ) : (
            <Text style={[styles.groupsEmptyLine, { ...t.type.bodySm, color: t.colors.textMuted }]}>
              {GROUP_PURPOSE_LINE}
            </Text>
          )}
        </>
      ) : null}

      {joined && host ? (
        <>
          <Eyebrow trailing={{ label: 'Not now', onPress: dismissHost }}>HOST</Eyebrow>
          <PersonRow
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
        </>
      ) : null}

      {offline ? (
        <Text style={[styles.offline, { ...t.type.caption, color: t.colors.textMuted }]}>
          Showing what you last saw. You are offline.
        </Text>
      ) : null}

      <Eyebrow>{joined ? 'ACTIVITY' : 'RECENT'}</Eyebrow>
    </AnimatedEntrance>
  );

  const empty = (loading || meLoading) ? (
    <View style={styles.skeletonList}>
      <SkeletonPersonRow />
      <SkeletonPersonRow />
      <SkeletonPersonRow />
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
  ) : joined ? (
    // Founder defect 2026-09-14 ("it looks rubbish"): a section with
    // nothing in it was a bordered box with a 52 dp circle icon, a title,
    // a paragraph and a "Find people" button that repeated the Find
    // people row already sitting two sections above it. GROUPS on this
    // same screen said its own emptiness in one quiet line; ACTIVITY now
    // does the same, so the Hub reads as one list rather than a list with
    // a poster stuck on the end (blueprint section 9 rule 9: one line,
    // one action, never a paragraph). The offline and failed states above
    // keep the full EmptyState: those carry a retry, and an error is not
    // an empty section.
    //
    // Founder order 2026-09-22 item 5 (audit A-05): a first post without a
    // workout. The one action stays exactly one ("Say hello", opening
    // CommunityCompose's new 'note' kind), so the section is still one
    // line, one action, never a poster -- no other Hub surface offers
    // this door.
    <View style={styles.activityEmptyWrap}>
      <Text style={[styles.sectionEmpty, { ...t.type.bodySm, color: t.colors.textMuted }]}>
        {/* F11 (Opus adversarial review, founder order 2026-09-22 item 5):
            names the action the button beneath it actually offers. */}
        Follow people to see their training, or say hello.
      </Text>
      <Button
        variant="tertiary"
        size="sm"
        fullWidth={false}
        icon="chatbubble-outline"
        title="Say hello"
        onPress={() => navigation.navigate('CommunityCompose', { kind: 'note' })}
        accessibilityLabel="Say hello"
      />
    </View>
  ) : (
    <Text style={[styles.sectionEmpty, { ...t.type.bodySm, color: t.colors.textMuted }]}>
      Training stories from Community show up here.
    </Text>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Community" right={headerRight} />
      <FlashList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.post.id}
        renderItem={({ item }) => (
          <ActivityItemRow
            item={item}
            onPress={() => navigation.navigate('CommunityPost', { id: item.post.id })}
            onRespect={joined ? () => react(item) : () => navigation.navigate('CommunityJoin')}
            onOpenPerson={(author) => openProfile(author)}
          />
        )}
        ListHeaderComponent={header}
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
            onRefresh={onRefresh}
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
  // No bottom margin: the header's last child is an Eyebrow, which already
  // carries the section rhythm, and the margin stacked under it so ACTIVITY
  // sat 20 dp above its rows while PEOPLE and GROUPS sat 8 (2026-09-14).
  header: {},
  // Founder order 2026-09-22 item 5: no vertical padding of its own --
  // sectionEmpty already pays paddingVertical: spacing.sm on its own Text.
  activityEmptyWrap: { gap: spacing.sm },
  statusNotice: {
    borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.lg,
  },
  statusNoticeLine: { ...type.bodySm },
  statusNoticeLink: { ...type.captionStrong },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAvatar: { alignItems: 'center', justifyContent: 'center' },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: circle(34),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: circle(8),
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: circle(16),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, lineHeight: 12 },
  block: { gap: spacing.md, marginBottom: spacing.lg },
  browsingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  browsingLine: { ...type.caption, color: colors.textMuted },
  blockTitle: { ...type.bodyStrong, color: colors.textPrimary },
  blockBody: { ...type.bodySm, color: colors.textSecondary },
  blockActions: { flexDirection: 'row', gap: spacing.sm },
  heroTitle: { ...type.h3, color: colors.textPrimary },
  heroBody: { ...type.bodySm, color: colors.textSecondary },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
  sectionEmpty: { ...type.bodySm, color: colors.textMuted, paddingVertical: spacing.sm },
  firstHere: { gap: spacing.sm, paddingVertical: spacing.sm, alignItems: 'flex-start' },
  firstHereLine: { ...type.bodySm, color: colors.textSecondary },
  groupsEmptyLine: { ...type.bodySm, color: colors.textMuted, paddingVertical: spacing.sm },
  offline: { ...type.caption, color: colors.textMuted, marginBottom: spacing.sm },
  skeletonList: { gap: spacing.md },
  footer: { paddingVertical: spacing.lg },
});
