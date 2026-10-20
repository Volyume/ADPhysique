/**
 * ChallengeScreen: the gym challenge, for an entrant (gym challenge SPEC
 * sections 3 and 4; server `supabase/migrate_201`: `gym_challenge_score`,
 * `gym_challenge_board`, `gym_challenge_mine`, `gym_challenge_set_target`,
 * `gym_challenge_withdraw`).
 *
 * Built from the Community group page's own pieces (CommunityGroupScreen):
 * `BackHeader`, a summary `Band` (label line, 2 dp neutral bar), `SectionHeader`
 * bands, `EntryRow` rows, `PersonRow` for the board and the house skeleton.
 * The coaching rows are replaced by the existing `CoachingSetupCard` while
 * coaching is not set up.
 *
 * Safety (SPEC 3.3, CLAUDE.md section 2): a withheld caller (open ED flag or
 * calm mode, decided by the server OR by this device's own gate, whichever
 * says so, each failing closed) gets no food or weigh-in row, no prompt to log
 * either, and no board and no word about why. Nothing here reads or shows what
 * anyone ate or weighs.
 *
 * Route params: { id: challengeId }.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/Text';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import CoachingSetupCard from '../components/CoachingSetupCard';
import SectionHeader from '../components/community/SectionHeader';
import Band, { BandGap, BandLine } from '../components/community/Band';
import EntryRow from '../components/community/EntryRow';
import PersonRow from '../components/community/PersonRow';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import SkeletonPostRow from '../components/community/SkeletonPostRow';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import useTheme from '../hooks/useTheme';
import useCoachingSetUp, { openCoachingSetup } from '../hooks/useCoachingSetUp';
import useAppStore from '../store/useAppStore';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { spacing, radius } from '../styles/theme';
import { logError } from '../lib/errorLog';
import {
  myChallenges, challengeScore, challengeBoard, setChallengeTarget, withdrawFromChallenge,
} from '../lib/challenges/api';
import { readPlannedPerWeek } from '../lib/challenges/plannedPerWeek';
import {
  partRows, showCoachingCard, isWithheld, termsLink, daysLeftLine, drawLines, thresholdsLine, countsLine,
  tierLabel, pointsText, challengeTelemetryFields,
} from '../lib/challenges/display';
import { datesLine } from './ChallengeJoinScreen';
import { trackNow } from '../lib/telemetry/growth';

const COACHING_CARD_BODY = 'Coaching adds up to 20 more points to your score. Without it you can still reach 80.';

export default function ChallengeScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  const challengeId = route?.params?.id ?? null;
  const userId = useAppStore((s) => s.user?.id);
  const coachingSetUp = useCoachingSetUp();
  // The device's own gate (calm mode or an open ED flag): true until it has
  // confirmed neither applies. Either this or the server withholds the person.
  const deviceWithheld = usePhotoSuppression(userId);

  const [challenge, setChallenge] = useState(null);
  const [score, setScore] = useState(null);
  const [board, setBoard] = useState(null);
  // loading | ready | notfound | error
  const [phase, setPhase] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    if (!challengeId) { setPhase('notfound'); return; }
    try {
      const [mine, s] = await Promise.all([myChallenges(), challengeScore(challengeId)]);
      const c = mine.find((row) => row?.id === challengeId) ?? null;
      if (!c) { setPhase('notfound'); return; }
      setChallenge(c);
      setScore(s);
      setPhase('ready');
      try { trackNow('challenge_viewed', { status: c.status, ...challengeTelemetryFields(s) }); } catch (_) { /* telemetry only */ }
      // The board is its own best-effort read: a failure never costs the page.
      // A withheld caller's board is null, and nothing says why.
      challengeBoard(challengeId).then(setBoard).catch((e) => {
        logError('ChallengeScreen.board', e);
        setBoard(null);
      });
      // The weekly target follows the plan (it may only rise). Best effort.
      if (c.status === 'upcoming' || c.status === 'active') {
        readPlannedPerWeek(userId)
          .then((n) => setChallengeTarget(challengeId, n))
          .catch(() => {
            // best-effort: the target set at join stands.
          });
      }
    } catch (e) {
      if (e?.code === 'not_found') { setPhase('notfound'); return; }
      logError('ChallengeScreen.load', e);
      setPhase('error');
    }
  }, [challengeId, userId]);

  useEffect(() => { load(); }, [load]);

  function openTerms() {
    const url = termsLink(challenge);
    if (!url) return;
    Linking.openURL(url).catch(() => {
      toast.show('Could not open the terms just now.', { variant: 'error' });
    });
  }

  async function doLeave() {
    if (leaving) return;
    setLeaving(true);
    try {
      await withdrawFromChallenge(challengeId);
      try { trackNow('challenge_withdrawn'); } catch (_) { /* telemetry only */ }
      toast.show('You left the challenge.');
      navigation.goBack();
    } catch (e) {
      if (e?.code === 'not_found') { navigation.goBack(); return; }
      logError('ChallengeScreen.leave', e);
      toast.show('Could not leave just now. Try again in a moment.', { variant: 'error' });
    } finally {
      setLeaving(false);
    }
  }

  function confirmLeave() {
    appAlert(
      'Leave the challenge?',
      'You stop being scored and you leave the board. Your training is untouched, and you can join again while the challenge is open.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave challenge', style: 'destructive', onPress: doLeave },
      ],
    );
  }

  const secondary = { color: t.colors.textSecondary };
  const closed = challenge?.status === 'closed';

  function renderPart(p) {
    return (
      <EntryRow
        key={p.key}
        title={p.label}
        subtitle={p.detail}
        trailing={(
          <Text style={[t.type.num('label'), { color: t.colors.textPrimary }]}>
            {`${pointsText(p.points)} of ${pointsText(p.max)}`}
          </Text>
        )}
        accessibilityLabel={`${p.label}. ${p.detail}. ${pointsText(p.points)} of ${pointsText(p.max)} points`}
      />
    );
  }

  function body() {
    if (phase === 'loading') {
      return (
        <View>
          <Band style={styles.skeletonScreen}>
            <SkeletonPersonRow />
            <SkeletonPersonRow />
          </Band>
          <BandGap />
          <Band style={styles.postCard}><SkeletonPostRow /></Band>
          <Band style={styles.postCard}><SkeletonPostRow /></Band>
        </View>
      );
    }
    if (phase === 'error') {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load the challenge"
          text="Check your connection and try again in a moment."
          actionLabel="Try again"
          onAction={() => { setPhase('loading'); load(); }}
          actionAccessibilityLabel="Try loading the challenge again"
        />
      );
    }
    if (phase === 'notfound') {
      return (
        <EmptyState
          icon="information-circle-outline"
          title="This challenge is not available"
          text="You may have left it, or it has finished."
        />
      );
    }

    const c = challenge;
    const { core, coaching } = partRows(score, { coachingSetUp, deviceWithheld });
    const coachingCard = showCoachingCard(score, coachingSetUp, deviceWithheld);
    const draws = drawLines(score, c);
    const total = Number(score?.total) || 0;
    // No board, no winners and no counts for a withheld person, whatever the
    // server sent: the device's own gate can say so when the server did not.
    const shownBoard = isWithheld(score, deviceWithheld) ? null : board;
    const topRows = Array.isArray(shownBoard?.top) ? shownBoard.top : [];
    const winners = closed && Array.isArray(shownBoard?.winners) ? shownBoard.winners : [];
    const youOffBoard = shownBoard && !shownBoard.me?.in_top;
    const terms = termsLink(c);

    return (
      <View>
        <Band style={styles.summary}>
          <Text style={[t.type.bodyStrong, { color: t.colors.textPrimary }]}>{c.title}</Text>
          <Text style={[t.type.label, secondary]}>
            {[c.gym_name, datesLine(c.starts_on, c.ends_on)].filter(Boolean).join(' · ')}
          </Text>
          <Text style={[t.type.bodySm, secondary]}>{daysLeftLine(c)}</Text>
          <View style={styles.scoreRow}>
            <Text style={[t.type.num('h1'), { color: t.colors.textPrimary }]}>{total}</Text>
            <Text style={[t.type.label, secondary]}>{closed ? 'final score, out of 100' : 'out of 100'}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: t.colors.surface2 }]}>
            <View
              style={[styles.fill, {
                backgroundColor: t.colors.textSecondary,
                width: `${Math.round(Math.min(1, total / 100) * 100)}%`,
              }]}
            />
          </View>
          {draws.map((line) => (
            <Text key={line} style={[t.type.bodySm, { color: t.colors.textPrimary }]}>{line}</Text>
          ))}
          {!closed ? <Text style={[t.type.bodySm, secondary]}>{thresholdsLine(c)}</Text> : null}
        </Band>
        <BandGap />

        <Band>
          <SectionHeader title="Your points" />
          {core.map(renderPart)}
        </Band>

        {coaching.length ? (
          <>
            <BandGap />
            <Band>
              <SectionHeader title="With coaching" />
              {coaching.map(renderPart)}
            </Band>
          </>
        ) : null}

        {coachingCard ? (
          <>
            <BandGap />
            <View style={{ marginHorizontal: t.screenPadding }}>
              <CoachingSetupCard body={COACHING_CARD_BODY} surface="challenge" onPress={() => openCoachingSetup(navigation)} />
            </View>
          </>
        ) : null}

        {shownBoard ? (
          <>
            <BandGap />
            <Band>
              <SectionHeader title={boardTitle(topRows.length)} />
              {topRows.length ? topRows.map((r, i) => (
                <PersonRow
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${i}-${r.name}`}
                  inBand
                  person={{
                    user_id: `${i}`, display_name: r.name, isYou: !!r.me, caption: r.me ? 'You' : null,
                  }}
                  metric={String(Number(r.score) || 0)}
                  rank={i + 1}
                />
              )) : (
                <BandLine text="Nobody is on the board yet." />
              )}
              {youOffBoard ? (
                <PersonRow
                  inBand
                  person={{ user_id: 'me', display_name: 'You', isYou: true }}
                  metric={String(Number(shownBoard.me?.score) || 0)}
                />
              ) : null}
              <Text style={[styles.counts, { paddingHorizontal: t.screenPadding }, t.type.bodySm, secondary]}>{countsLine(shownBoard.counts, challenge)}</Text>
            </Band>
          </>
        ) : null}

        {winners.length ? (
          <>
            <BandGap />
            <Band>
              <SectionHeader title="Winners" />
              {winners.map((w, i) => (
                <PersonRow
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${i}-${w.name}`}
                  inBand
                  person={{ user_id: `w${i}`, display_name: w.name, caption: tierLabel(w.tier) }}
                />
              ))}
            </Band>
          </>
        ) : null}

        <BandGap />
        <Band>
          {terms ? (
            <EntryRow
              icon="document-text-outline"
              title="Terms and prizes"
              onPress={openTerms}
              accessibilityLabel="Read the challenge terms and prizes"
            />
          ) : null}
          {!closed ? (
            <EntryRow
              icon="exit-outline"
              title="Leave the challenge"
              destructive
              disabled={leaving}
              onPress={confirmLeave}
            />
          ) : null}
        </Band>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Challenge" />
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={phase === 'ready' ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try { await load(); } finally { setRefreshing(false); }
            }}
            tintColor={t.colors.textMuted}
            colors={[t.colors.primary]}
          />
        ) : undefined}
      >
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}

// Item 32: the board's title counts the rows it shows. The server lists at most
// ten, so fewer than ten reads "Top 4", never "Top 10" over four names. With no
// rows the title is "Leaderboard" and the line under it says nobody is on the board.
const BOARD_SIZE = 10;
export function boardTitle(rowCount) {
  if (!rowCount) return 'Leaderboard';
  return rowCount < BOARD_SIZE ? `Top ${rowCount}` : `Top ${BOARD_SIZE}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  postCard: { marginBottom: spacing.lg },
  skeletonScreen: { paddingHorizontal: spacing.lg },
  // CommunityGroupScreen `summary`.
  summary: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  // CommunityGroupScreen `togetherTrack` / `togetherFill`: the neutral 2 dp bar.
  track: { height: radius.hair, borderRadius: radius.hair, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.hair },
  counts: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
