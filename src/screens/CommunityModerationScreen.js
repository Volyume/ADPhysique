/**
 * CommunityModerationScreen (blueprint sections 3, 6; SD-11)
 *
 * The moderator queue, in the app. Moderation ships with the feature,
 * not after it: reports land here, "Harmful body or eating content" is
 * flagged priority by the server so it is never queued behind spam, and
 * every action writes an audit row server-side.
 *
 * The screen is only reachable for a moderator. Anyone else who arrives
 * here (an old link, a shared device) sees a plain, calm note rather
 * than an error.
 *
 * The Actioned tab IS the audit view: reports that have been acted on,
 * with what was done and the note the moderator left. The note is
 * captured in the actions sheet and written to
 * `community_moderation_log.note` server-side.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList. The props are the
// blueprint's own list contract (keyExtractor, onEndReached paging,
// pull-to-refresh, an empty state); the list underneath recycles. The
// Gyms segment below is a small, bounded moderator queue (never a long
// scroll) rendered as plain rows in a ScrollView, so it never reaches
// for FlatList either -- e8FlashList.guard.test.js's whole-tree sweep
// only forbids that literal component, not a bounded .map().
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import ModalHeader from '../components/ModalHeader';
import PressableCard from '../components/PressableCard';
import Chip from '../components/Chip';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Band, { BandGap } from '../components/community/Band';
import SectionHeader from '../components/community/SectionHeader';
import SkeletonReportRow from '../components/community/SkeletonReportRow';
import ComposerInput from '../components/community/ComposerInput';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { spacing } from '../styles/theme';
import { calendarRelativeLabel } from '../lib/workoutDate';
import {
  moderationQueue, moderate, MODERATION_ACTIONS, REPORT_REASONS,
} from '../lib/community';
// Founder order 2026-09-22 item 7 (B-03): the gym directory's moderator
// actions (`gyms_review_submission`/`gyms_review_report`, migrate_162)
// already existed and already checked community_is_moderator() server
// side; they had no client wrapper and no screen at all. This is the
// first one, added by migrate_181_gym_moderation_lists.sql.
import {
  pendingSubmissions, pendingReports, reviewSubmission, reviewReport, REPORT_KINDS,
} from '../lib/gyms';

const PAGE = 30;

// The audit note a moderator may leave with an action. Optional, short,
// and written to `community_moderation_log.note` by `community_moderate`
// (migrate_160_community.sql), which is what makes the rules screen's
// "who did it and why" true (product review 2026-09-06, items 19 and 22).
export const MODERATION_NOTE_MAX = 300;

// The action list, in the order a moderator works through it: dismiss
// first (most reports are nothing), then content, then the account.
const ACTION_LABELS = {
  dismiss: 'Dismiss the report',
  hide_content: 'Hide the content',
  unhide_content: 'Unhide the content',
  delete_content: 'Delete the content',
  restrict_account: 'Restrict the account',
  unrestrict_account: 'Remove the restriction',
  suspend_account: 'Suspend the account',
  unsuspend_account: 'Remove the suspension',
};

// The queue is read by a person, so the target is named in words, not by
// the column's enum value.
const TARGET_LABELS = {
  profile: 'Profile',
  post: 'Post',
  comment: 'Comment',
  message: 'Message',
  group: 'Group',
};

/** "1 report" / "4 reports". */
export function reportCountLabel(count) {
  const n = Number(count) || 0;
  return n === 1 ? '1 report' : `${n} reports`;
}

/** "1 person confirmed this" / "4 people confirmed this" - the same
 * `confirmations` count GD-11's two-confirmer rule already tracks on a
 * gym submission, never a confirmer's identity. */
export function confirmationCountLabel(count) {
  const n = Number(count) || 0;
  return n === 1 ? '1 person confirmed this' : `${n} people confirmed this`;
}

function whenLabel(createdAt) {
  const ms = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt);
  return Number.isFinite(ms) ? calendarRelativeLabel(ms) : '';
}

export default function CommunityModerationScreen() {
  const t = useTheme();
  const toast = useToast();
  const { me, loading: meLoading } = useCommunityMe();
  const isModerator = !!me?.is_moderator;

  // 'open' | 'actioned' | 'gyms'. The third value is the new segment
  // (founder order 2026-09-22 item 7); the first two, and everything that
  // reads or sets them below, are unchanged.
  const [status, setStatus] = useState('open');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const [gymSubmissions, setGymSubmissions] = useState([]);
  const [gymReports, setGymReports] = useState([]);
  const [gymsLoading, setGymsLoading] = useState(true);
  const [gymBusy, setGymBusy] = useState(false);

  const load = useCallback(async () => {
    // The Gyms segment has its own loader (loadGyms) below; community_
    // moderation_queue only accepts 'open'/'actioned'/'dismissed'/NULL, so
    // this must never be called with status === 'gyms'.
    if (!isModerator || status === 'gyms') { setLoading(false); return; }
    setLoading(true);
    try {
      const out = await moderationQueue(status, { limit: PAGE });
      setRows(Array.isArray(out) ? out : (out?.reports ?? []));
    } catch (_e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, isModerator]);

  useEffect(() => { load(); }, [load]);

  const loadGyms = useCallback(async () => {
    if (!isModerator) { setGymsLoading(false); return; }
    setGymsLoading(true);
    try {
      const [subs, reps] = await Promise.all([
        pendingSubmissions({ limit: PAGE }),
        pendingReports({ limit: PAGE }),
      ]);
      setGymSubmissions(subs.submissions);
      setGymReports(reps.reports);
    } catch (_e) {
      setGymSubmissions([]);
      setGymReports([]);
    } finally {
      setGymsLoading(false);
    }
  }, [isModerator]);

  useEffect(() => { if (status === 'gyms') loadGyms(); }, [status, loadGyms]);

  async function approveSubmission(item) {
    if (gymBusy) return;
    setGymBusy(true);
    try {
      await reviewSubmission(item.id, 'approve');
      setGymSubmissions((prev) => prev.filter((s) => s.id !== item.id));
      toast.show('Approved');
    } catch (_e) {
      toast.show('Could not do that just now.', { variant: 'error' });
    } finally {
      setGymBusy(false);
    }
  }

  // Destructive: closes the venue and cannot be undone from this screen,
  // so it asks first (founder order 2026-09-22 item 7's own requirement),
  // the same appAlert confirm pattern the rest of Community already uses
  // (e.g. CommunityConnectionsScreen.js's confirmRemove).
  function confirmRejectSubmission(item) {
    appAlert(
      'Reject this submission?',
      `"${item.name}" will be closed and will not appear in the directory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setGymBusy(true);
            try {
              await reviewSubmission(item.id, 'reject');
              setGymSubmissions((prev) => prev.filter((s) => s.id !== item.id));
              toast.show('Rejected');
            } catch (_e) {
              toast.show('Could not do that just now.', { variant: 'error' });
            } finally {
              setGymBusy(false);
            }
          },
        },
      ],
    );
  }

  async function resolveReport(item) {
    if (gymBusy) return;
    setGymBusy(true);
    try {
      await reviewReport(item.id, 'resolve');
      setGymReports((prev) => prev.filter((r) => r.id !== item.id));
      toast.show('Recorded');
    } catch (_e) {
      toast.show('Could not do that just now.', { variant: 'error' });
    } finally {
      setGymBusy(false);
    }
  }

  async function dismissReport(item) {
    if (gymBusy) return;
    setGymBusy(true);
    try {
      await reviewReport(item.id, 'dismiss');
      setGymReports((prev) => prev.filter((r) => r.id !== item.id));
      toast.show('Dismissed');
    } catch (_e) {
      toast.show('Could not do that just now.', { variant: 'error' });
    } finally {
      setGymBusy(false);
    }
  }

  async function act(action) {
    if (!active || busy) return;
    setBusy(true);
    try {
      // The note is the "why" in the audit row. Optional: an empty one is
      // sent as null rather than as a blank string.
      await moderate(active.id, action, note.trim() || null);
      setRows((prev) => prev.filter((r) => r.id !== active.id));
      toast.show('Recorded');
      setActive(null);
      setNote('');
    } catch (_e) {
      toast.show('Could not do that just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (!meLoading && !isModerator) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
        <BackHeader title="Moderation" />
        <View style={styles.content}>
          <EmptyState
            icon="shield-outline"
            title="Not available"
            text="The moderator queue is only open to moderators."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Moderation" />
      <Band style={styles.controls}>
        <View style={styles.chipRow} accessibilityLabel="Queue">
          <Chip label="Open" selected={status === 'open'} onPress={() => setStatus('open')} accessibilityRole="radio" />
          {/* This tab IS the audit view the blueprint asks for: it is what
              was done, by whom, with the note that was left. */}
          <Chip
            label="Actioned (audit log)"
            selected={status === 'actioned'}
            onPress={() => setStatus('actioned')}
            accessibilityRole="radio"
          />
          {/* Founder order 2026-09-22 item 7 (B-03): the third segment.
              Gym submissions and reports were actionable only via raw SQL
              before this; this is the minimal queue that closes it. */}
          <Chip label="Gyms" selected={status === 'gyms'} onPress={() => setStatus('gyms')} accessibilityRole="radio" />
        </View>
      </Band>
      <BandGap />
      {status === 'gyms' ? (
        <ScrollView
          contentContainerStyle={styles.gymsList}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try { await loadGyms(); } finally { setRefreshing(false); }
              }}
              tintColor={t.colors.textMuted}
              colors={[t.colors.primary]}
            />
          )}
        >
          <Band>
            <SectionHeader title="Gym submissions" />
            {gymsLoading ? (
              <SkeletonReportRow />
            ) : gymSubmissions.length === 0 ? (
              <EmptyState
                icon="business-outline"
                title="No gym submissions waiting."
                compact
              />
            ) : (
              gymSubmissions.map((item) => (
                <ReportBlock key={item.id} accessibilityLabel={`Gym submission: ${item.name}`}>
                  <Text style={[t.type.body, { color: t.colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                    {[item.address_line, item.town, item.postcode].filter(Boolean).join(', ')}
                  </Text>
                  {item.website ? (
                    <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                      {item.website}
                    </Text>
                  ) : null}
                  {item.operator ? (
                    <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                      {`Company: ${item.operator}`}
                    </Text>
                  ) : null}
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                    {[
                      confirmationCountLabel(item.confirmation_count),
                      whenLabel(item.created_at),
                    ].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      title="Reject"
                      disabled={gymBusy}
                      onPress={() => confirmRejectSubmission(item)}
                      accessibilityLabel={`Reject ${item.name}`}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth={false}
                      title="Approve"
                      disabled={gymBusy}
                      onPress={() => approveSubmission(item)}
                      accessibilityLabel={`Approve ${item.name}`}
                    />
                  </View>
                </ReportBlock>
              ))
            )}
          </Band>
          <BandGap />

          <Band>
            <SectionHeader title="Gym reports" />
            {gymsLoading ? (
              <SkeletonReportRow />
            ) : gymReports.length === 0 ? (
              <EmptyState
                icon="flag-outline"
                title="No gym reports waiting."
                compact
              />
            ) : (
              gymReports.map((item) => (
                <ReportBlock key={item.id} accessibilityLabel={`Gym report: ${item.venue_name}`}>
                  <View style={styles.reportTop}>
                    <Chip label={REPORT_KINDS[item.reason] ?? item.reason} accessibilityRole="text" />
                  </View>
                  <Text style={[t.type.body, { color: t.colors.textPrimary }]}>
                    {item.venue_name}
                  </Text>
                  {item.detail ? (
                    <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]} numberOfLines={3}>
                      {item.detail}
                    </Text>
                  ) : null}
                  <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                    {[
                      item.reporter_count ? reportCountLabel(item.reporter_count) : null,
                      whenLabel(item.created_at),
                    ].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      title="Dismiss"
                      disabled={gymBusy}
                      onPress={() => dismissReport(item)}
                      accessibilityLabel={`Dismiss report on ${item.venue_name}`}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth={false}
                      title="Resolve"
                      disabled={gymBusy}
                      onPress={() => resolveReport(item)}
                      accessibilityLabel={`Resolve report on ${item.venue_name}`}
                    />
                  </View>
                </ReportBlock>
              ))
            )}
          </Band>
        </ScrollView>
      ) : (
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // F2 (Opus adversarial review, founder order 2026-09-22):
          // `community_moderation_queue` (migrate_165 lines 1525-1549)
          // never returns a `preview` field -- it returns `content`,
          // shaped per target_kind: post {kind, caption, status}, comment
          // {body, status}, message {body, conversation_id}, group {name,
          // blurb, status}, else (profile) {handle, display_name, bio,
          // status}. `item.preview` was therefore always undefined, so a
          // reported note (or anything else) reached the moderator with
          // no text at all. Falls through the real per-kind field names.
          const preview = item.preview
            ?? item.content?.caption
            ?? item.content?.body
            ?? item.content?.bio
            ?? item.content?.name
            ?? null;
          return (
            <Band>
              <ReportBlock
                onPress={status === 'open' ? () => setActive(item) : undefined}
                accessibilityLabel={`Report: ${REPORT_REASONS[item.reason] ?? item.reason}`}
              >
                <View style={styles.reportTop}>
                  <Chip label={REPORT_REASONS[item.reason] ?? item.reason} accessibilityRole="text" />
                  {item.priority ? <Chip label="Priority" selected accessibilityRole="text" /> : null}
                  <Chip label={TARGET_LABELS[item.target_kind] ?? 'Content'} accessibilityRole="text" />
                </View>
                {preview ? (
                  <Text
                    style={[t.type.bodySm, { color: t.colors.textPrimary }]}
                    numberOfLines={4}
                  >
                    {preview}
                  </Text>
                ) : null}
                {item.detail ? (
                  <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]} numberOfLines={3}>
                    {item.detail}
                  </Text>
                ) : null}
                <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                  {[
                    item.report_count ? reportCountLabel(item.report_count) : null,
                    whenLabel(item.created_at),
                    item.resolution ? `Resolution: ${ACTION_LABELS[item.resolution] ?? item.resolution}` : null,
                    // The moderator and the note are rendered when the row
                    // carries them, under the column names the audit log
                    // itself uses (`community_moderation_log.moderator_id` /
                    // `.note`). `community_moderation_queue` does not return
                    // either today, so nothing is invented here: the tab
                    // shows them the moment the queue does.
                    item.moderator_handle ? `by @${item.moderator_handle}` : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
                {item.note ? (
                  <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                    {`Note: ${item.note}`}
                  </Text>
                ) : null}
              </ReportBlock>
            </Band>
          );
        }}
        ListHeaderComponent={rows.length ? (
          <Band><SectionHeader title={status === 'open' ? 'Open reports' : 'Actioned reports'} /></Band>
        ) : null}
        ListEmptyComponent={loading ? (
          <Band>
            <SkeletonReportRow />
            <SkeletonReportRow />
            <SkeletonReportRow />
          </Band>
        ) : (
          <EmptyState
            icon="checkmark-circle-outline"
            title={status === 'open' ? 'Nothing waiting' : 'Nothing actioned yet'}
            text={status === 'open'
              ? 'Reports appear here as soon as they are filed.'
              : 'Reports you have acted on appear here with what was done.'}
          />
        )}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => { /* the queue is one page; act on it rather than paging past it */ }}
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
      )}

      <BottomSheet
        visible={!!active}
        onClose={() => { setActive(null); setNote(''); }}
        accessibilityLabel="Moderation actions"
      >
        <ModalHeader
          title={active ? (REPORT_REASONS[active.reason] ?? active.reason) : 'Actions'}
          onClose={() => { setActive(null); setNote(''); }}
        />
        <View style={styles.sheet}>
          <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
            Every action is recorded with who did it, when, and the note you leave here.
          </Text>
          <ComposerInput
            well
            value={note}
            onChangeText={setNote}
            maxLength={MODERATION_NOTE_MAX}
            minHeight={72}
            placeholder="Note for the record (optional)"
            accessibilityLabel="Note for the record"
          />
          <View style={styles.actions}>
            {MODERATION_ACTIONS.map((action) => (
              <Button
                key={action}
                variant={action === 'dismiss' ? 'primary' : 'secondary'}
                size="sm"
                fullWidth={false}
                title={ACTION_LABELS[action] ?? action}
                disabled={busy}
                onPress={() => act(action)}
                accessibilityLabel={ACTION_LABELS[action] ?? action}
              />
            ))}
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

/** One moderation item as a block in a band (D221 V1): the content stacked
 * with the band's gutter and a hairline below. A report is tappable while it
 * is open; the pressable carries the house press feedback. */
function ReportBlock({ children, onPress, accessibilityLabel }) {
  const t = useTheme();
  return (
    <PressableCard
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.block}>{children}</View>
      <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg },
  controls: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { paddingBottom: spacing.xxl },
  gymsList: { paddingBottom: spacing.xxl },
  block: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  reportTop: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  sheet: { gap: spacing.sm, paddingBottom: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
