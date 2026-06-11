/**
 * Year of Lifts as a swipeable story
 *
 * Reads the same getYearOfLiftsData payload as before and turns it into
 * a stack of full-screen story cards. Each card is one stat with a big
 * hero number, an icon, and one line of context. The user advances by
 * tapping the right side (like Instagram / Snap) or by horizontal
 * swipe. Tap the left side to go back. A row of progress pips at the
 * top mirrors current position.
 *
 * Cards that don't apply (e.g. no PRs yet) are filtered out at build
 * time, so a brand-new user with two sessions doesn't get a stretched
 * empty story.
 *
 * The classic "scroll through stats" view is gone, Spotify Wrapped
 * proved that the swipe-story is the format people actually read.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TouchableOpacity, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { getYearOfLiftsData, getRecapData, getBlockReflectionData, getOpenEdPatternFlag } from '../lib/database';
import { getWellbeingMode, isCalm } from '../lib/wellbeing';
import GradientCard from '../components/GradientCard';

const { width: SCREEN_W } = Dimensions.get('window');

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Builds the story-card list from the year's data. Empty/zero-value
 * cards are dropped so the deck stays tight.
 */
function buildCards(data, units) {
  if (!data) return [];
  const cards = [];

  // 1. Intro: period framing
  cards.push({
    type: 'intro',
    icon: 'sparkles',
    tone: 'gold',
    headline: 'Your year of lifts',
    subline: `${fmtDate(data.yearStart)} to ${fmtDate(data.yearEnd)}`,
  });

  // 2. Sessions
  if (data.totalSessions > 0) {
    cards.push({
      type: 'stat',
      icon: 'barbell',
      tone: 'primary',
      value: data.totalSessions.toLocaleString('en-GB'),
      unit: data.totalSessions === 1 ? 'session' : 'sessions',
      caption: data.avgSessionsPerWeek >= 3
        ? `Roughly ${data.avgSessionsPerWeek} a week. That's consistency.`
        : `Roughly ${data.avgSessionsPerWeek} a week.`,
    });
  }

  // 3. Volume
  if (data.tonnage > 0) {
    cards.push({
      type: 'stat',
      icon: 'trending-up',
      tone: 'success',
      value: data.tonnage.toLocaleString('en-GB'),
      unit: 'kg moved',
      caption: 'Every set you logged, stacked end to end.',
    });
  }

  // 4. Sets
  if (data.totalSets > 0) {
    cards.push({
      type: 'stat',
      icon: 'layers',
      tone: 'primary',
      value: data.totalSets.toLocaleString('en-GB'),
      unit: data.totalSets === 1 ? 'set' : 'sets',
      caption: data.uniqueExercises > 0
        ? `Across ${data.uniqueExercises} different exercises.`
        : 'Logged, rep by rep.',
    });
  }

  // 5. Busiest month
  if (data.topMonth) {
    cards.push({
      type: 'stat',
      icon: 'calendar',
      tone: 'primary',
      value: data.topMonth,
      unit: 'busiest month',
      caption: 'Your highest training density of the year.',
    });
  }

  // 6. Top exercise
  if (data.topExercises?.[0]) {
    cards.push({
      type: 'list',
      icon: 'flame',
      tone: 'warning',
      headline: 'Your top lifts',
      subline: 'Most-trained exercises this year',
      rows: data.topExercises.slice(0, 5).map(ex => ({
        primary: ex.name,
        secondary: `${ex.sets.toLocaleString('en-GB')} sets`,
      })),
    });
  }

  // 7. Top PR
  if (data.topPRs?.length > 0) {
    cards.push({
      type: 'list',
      icon: 'trophy',
      tone: 'gold',
      headline: 'Personal bests',
      subline: 'Estimated max lifts logged this year',
      rows: data.topPRs.slice(0, 5).map(pr => ({
        primary: pr.exerciseName ?? pr.exercise_name,
        secondary: `${parseFloat(pr.value).toFixed(1)}${units}`,
      })),
    });
  }

  // 8. Outro
  cards.push({
    type: 'outro',
    icon: 'checkmark-circle',
    tone: 'gold',
    headline: 'Here\'s to the year ahead.',
    subline: 'Same hands, same bar, new numbers to chase.',
  });

  return cards;
}

// Parse the YYYY-MM-DD TEXT dates the mesocycle table stores into ms.
function parseDateText(t) {
  if (!t) return null;
  const ms = Date.parse(`${String(t).slice(0, 10)}T00:00:00`);
  return Number.isNaN(ms) ? null : ms;
}

// COMP-005 — monthly recap deck (max 8 cards, empty ones dropped). `neutral`
// is set under calm mode or an open ED-pattern flag: month-vs-month deltas go
// factual (comparison pressure is the calm-mode risk, never the training data).
// A down month is never negative-framed.
export function buildMonthCards(data, units, { label = 'This month', neutral = false } = {}) {
  if (!data) return [];
  const cards = [];
  cards.push({
    type: 'intro', icon: 'sparkles', tone: 'gold',
    headline: `${label}, lifted.`,
    subline: `${fmtDate(data.startMs)} to ${fmtDate(data.endMs - 86400000)}`,
  });

  const content = [];
  const prev = data.previous;

  if (data.totalSessions > 0) {
    let caption;
    if (!neutral && prev && prev.totalSessions > 0 && data.totalSessions > prev.totalSessions) {
      const diff = data.totalSessions - prev.totalSessions;
      caption = `${diff} more than the month before.`;
    } else {
      caption = data.avgSessionsPerWeek >= 3
        ? `Roughly ${data.avgSessionsPerWeek} a week. That's consistency.`
        : `Roughly ${data.avgSessionsPerWeek} a week.`;
    }
    content.push({
      type: 'stat', icon: 'barbell', tone: 'primary',
      value: data.totalSessions.toLocaleString('en-GB'),
      unit: data.totalSessions === 1 ? 'session' : 'sessions',
      caption,
    });
  }

  if (data.tonnage > 0) {
    let caption = 'Every set, stacked end to end.';
    if (!neutral && prev && prev.tonnage > 0 && data.tonnage > prev.tonnage) {
      caption = `Up ${Math.round(((data.tonnage - prev.tonnage) / prev.tonnage) * 100)}% on the month before.`;
    }
    content.push({
      type: 'stat', icon: 'trending-up', tone: 'success',
      value: data.tonnage.toLocaleString('en-GB'), unit: 'kg moved', caption,
    });
  }

  if (data.topExercises?.[0]) {
    content.push({
      type: 'list', icon: 'flame', tone: 'warning',
      headline: 'Your top lifts', subline: 'Most-trained this month',
      rows: data.topExercises.slice(0, 5).map(ex => ({ primary: ex.name, secondary: `${ex.sets.toLocaleString('en-GB')} sets` })),
    });
  }

  if (data.topPRs?.length > 0) {
    content.push({
      type: 'list', icon: 'trophy', tone: 'gold',
      headline: 'Personal bests', subline: 'Estimated max lifts this month',
      rows: data.topPRs.slice(0, 5).map(pr => ({ primary: pr.exerciseName ?? pr.exercise_name, secondary: `${parseFloat(pr.value).toFixed(1)}${units}` })),
    });
  }

  if (data.bestSession) {
    content.push({
      type: 'stat', icon: 'flash', tone: 'primary',
      value: data.bestSession.tonnage.toLocaleString('en-GB'), unit: 'kg, best session',
      caption: `Your biggest session: ${fmtDate(data.bestSession.startedAt)}.`,
    });
  }

  // Minimum-content rule: with fewer than 3 content cards the deck is just
  // intro + sessions + outro, and the sessions caption softens.
  if (content.length < 3) {
    const sessions = content.find(c => typeof c.unit === 'string' && c.unit.includes('session'));
    if (sessions) {
      if (data.totalSessions <= 2) sessions.caption = `${data.totalSessions} ${data.totalSessions === 1 ? 'session' : 'sessions'} logged. They count.`;
      cards.push(sessions);
    }
  } else {
    cards.push(...content.slice(0, 6));
  }

  cards.push({
    type: 'outro', icon: 'checkmark-circle', tone: 'gold',
    headline: 'Next month is open.', subline: 'Same bar, new numbers to chase.',
  });
  return cards;
}

// COMP-005 — block-end recap deck (3–5 cards). The "climb" slide (tonnageDelta)
// is the unreplicable one; competitors have no blocks.
export function buildBlockCards(data, units) {
  if (!data) return [];
  const cards = [];
  const name = data.meso?.name || 'Training block';
  const startMs = parseDateText(data.startDate);
  const endMs = parseDateText(data.endDate);
  const weeks = data.meso?.plannedWeeks;
  const shapeBits = [];
  if (weeks) shapeBits.push(`${weeks} week${weeks === 1 ? '' : 's'}`);
  if (startMs && endMs) shapeBits.push(`${fmtDate(startMs)} to ${fmtDate(endMs)}`);
  cards.push({ type: 'intro', icon: 'sparkles', tone: 'gold', headline: name, subline: shapeBits.join(' · ') });

  if (data.tonnageDelta != null) {
    const up = data.tonnageDelta >= 0;
    cards.push({
      type: 'stat', icon: 'trending-up', tone: 'success',
      value: `${up ? '+' : ''}${data.tonnageDelta}%`, unit: 'weekly volume',
      caption: up ? 'First week to last. That climb is the block working.' : 'Final week was lighter. That\'s the plan working.',
    });
  }

  if (data.prs?.length > 0) {
    cards.push({
      type: 'list', icon: 'trophy', tone: 'gold',
      headline: 'Personal bests', subline: 'Set this block',
      rows: data.prs.slice(0, 5).map(pr => ({ primary: pr.exerciseName ?? pr.exercise_name, secondary: `${parseFloat(pr.value).toFixed(1)}${units}` })),
    });
  }

  cards.push({
    type: 'stat', icon: 'layers', tone: 'primary',
    value: data.totalSessions.toLocaleString('en-GB'),
    unit: data.totalSessions === 1 ? 'session' : 'sessions',
    caption: `${data.totalSets.toLocaleString('en-GB')} sets · ${data.tonnage.toLocaleString('en-GB')} kg moved.`,
  });

  cards.push({
    type: 'outro', icon: 'checkmark-circle', tone: 'gold',
    headline: 'Block banked. Recover, then go again.', subline: 'Full block summary inside.',
  });
  return cards;
}

/**
 * Single card. Layout varies by type (stat = big number, list = top-5,
 * intro/outro = headline + subline only).
 */
function StoryCard({ card }) {
  return (
    <View style={styles.cardWrap}>
      <GradientCard
        tone={card.tone || 'primary'}
        intensity={0.28}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={card.icon} size={32} color={colors.textPrimary} />
        </View>

        {card.type === 'stat' && (
          <>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {card.value}
            </Text>
            <Text style={styles.statUnit}>{card.unit}</Text>
            <Text style={styles.statCaption}>{card.caption}</Text>
          </>
        )}

        {(card.type === 'intro' || card.type === 'outro') && (
          <>
            <Text style={styles.heroHeadline}>{card.headline}</Text>
            <Text style={styles.heroSubline}>{card.subline}</Text>
          </>
        )}

        {card.type === 'list' && (
          <View style={styles.listWrap}>
            <Text style={styles.listHeadline}>{card.headline}</Text>
            <Text style={styles.listSubline}>{card.subline}</Text>
            <View style={styles.listRows}>
              {card.rows.map((row, i) => (
                <View key={i} style={styles.listRow}>
                  <Text style={styles.listRank}>{i + 1}</Text>
                  <Text style={styles.listPrimary} numberOfLines={1}>{row.primary}</Text>
                  <Text style={styles.listSecondary}>{row.secondary}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </GradientCard>
    </View>
  );
}

export default function YearOfLiftsScreen({ navigation, route }) {
  // COMP-005: one renderer, three variants. Default 'year' keeps Year of Lifts
  // behaviour identical; 'month' and 'block' reuse the same card system.
  const {
    yearMs,
    variant = 'year',
    startMs, endMs, monthLabel,
    mesocycleId, blockName,
  } = route.params ?? {};
  const { user, units } = useAppStore();
  const [data, setData] = useState(null);
  const [neutral, setNeutral] = useState(false);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const load = async () => {
      try {
        if (variant === 'month') {
          // Neutral framing under calm mode or an open ED flag: factual deltas,
          // evaluated at render time so no celebratory state survives a flag.
          const [mode, edFlag, recap] = await Promise.all([
            getWellbeingMode().catch(() => null),
            getOpenEdPatternFlag(user.id).catch(() => null),
            getRecapData(user.id, { startMs, endMs, compare: true }),
          ]);
          setNeutral(isCalm(mode) || !!edFlag);
          setData(recap);
        } else if (variant === 'block') {
          setData(await getBlockReflectionData(user.id, mesocycleId));
        } else {
          setData(await getYearOfLiftsData(user.id, yearMs));
        }
      } catch (_e) { /* leave data null → graceful empty */ }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    if (variant === 'month') return buildMonthCards(data, units, { label: monthLabel, neutral });
    if (variant === 'block') return buildBlockCards(data, units);
    return buildCards(data, units);
  }, [data, units, variant, monthLabel, neutral]);

  function goTo(i) {
    if (!listRef.current || i < 0 || i >= cards.length) return;
    listRef.current.scrollToIndex({ index: i, animated: true });
  }

  function advance() {
    if (index >= cards.length - 1) {
      navigation.goBack();
      return;
    }
    goTo(index + 1);
  }
  function rewind() {
    if (index === 0) return;
    goTo(index - 1);
  }

  // Share the year as a single milestone card. Factual stats only, no
  // bodyweight or private data, same fields the deck already shows.
  function handleShareYear() {
    if (!data) return;
    // COMP-005: same milestone canvas, eyebrow/title/hero/stats vary by variant.
    // Factual training stats only — never bodyweight, measurements or notes.
    let milestoneData;
    if (variant === 'month') {
      const stats = [];
      if (data.tonnage > 0) stats.push({ value: data.tonnage.toLocaleString('en-GB'), label: 'kg lifted' });
      if (data.totalSets > 0) stats.push({ value: data.totalSets.toLocaleString('en-GB'), label: 'sets' });
      if (data.topPRs?.length > 0) stats.push({ value: data.topPRs.length.toLocaleString('en-GB'), label: data.topPRs.length === 1 ? 'PR' : 'PRs' });
      milestoneData = {
        eyebrow: 'MONTHLY RECAP',
        title: monthLabel || 'Monthly recap',
        heroValue: (data.totalSessions || 0).toLocaleString('en-GB'),
        heroUnit: data.totalSessions === 1 ? 'session' : 'sessions',
        caption: `${fmtDate(data.startMs)} to ${fmtDate(data.endMs - 86400000)}`,
        stats,
      };
    } else if (variant === 'block') {
      const stats = [];
      if (data.tonnage > 0) stats.push({ value: data.tonnage.toLocaleString('en-GB'), label: 'kg lifted' });
      if (data.totalSets > 0) stats.push({ value: data.totalSets.toLocaleString('en-GB'), label: 'sets' });
      if (data.meso?.plannedWeeks) stats.push({ value: String(data.meso.plannedWeeks), label: data.meso.plannedWeeks === 1 ? 'week' : 'weeks' });
      milestoneData = {
        eyebrow: 'BLOCK COMPLETE',
        title: data.meso?.name || blockName || 'Training block',
        heroValue: (data.totalSessions || 0).toLocaleString('en-GB'),
        heroUnit: data.totalSessions === 1 ? 'session' : 'sessions',
        caption: '',
        stats,
      };
    } else {
      const stats = [];
      if (data.tonnage > 0) stats.push({ value: data.tonnage.toLocaleString('en-GB'), label: 'kg lifted' });
      if (data.totalSets > 0) stats.push({ value: data.totalSets.toLocaleString('en-GB'), label: 'sets' });
      if (data.uniqueExercises > 0) stats.push({ value: data.uniqueExercises.toLocaleString('en-GB'), label: 'exercises' });
      milestoneData = {
        title: 'My year of lifts',
        eyebrow: '',
        heroValue: (data.totalSessions || 0).toLocaleString('en-GB'),
        heroUnit: data.totalSessions === 1 ? 'session' : 'sessions',
        caption: `${fmtDate(data.yearStart)} to ${fmtDate(data.yearEnd)}`,
        stats,
      };
    }
    navigation.navigate('ShareCard', { milestoneData });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Progress pips at the top, one per card */}
      <View style={styles.pipsRow}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              i < index && styles.pipDone,
              i === index && styles.pipCurrent,
            ]}
          />
        ))}
        {!loading && cards.length > 0 && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareYear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={variant === 'month' ? 'Share your month' : variant === 'block' ? 'Share your block' : 'Share your year'}
          >
            <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{variant === 'month' ? 'Building your recap…' : variant === 'block' ? 'Building your block story…' : 'Building your year…'}</Text>
        </View>
      )}

      {!loading && cards.length === 0 && (
        <View style={styles.loadingWrap}>
          <Ionicons name="barbell-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyBody}>
            Come back here once you've logged a few sessions.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && cards.length > 0 && (
        <>
          <FlatList
            ref={listRef}
            data={cards}
            keyExtractor={(_, i) => `s-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
              if (next !== index) setIndex(next);
            }}
            renderItem={({ item }) => <StoryCard card={item} />}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          />

          {/* Tap zones live as a narrow band ABOVE the card content
              (under the pips, above the hero). Previously they spanned
              the entire screen which meant any tap on the card body
              was consumed by the Pressables, and on Android a press-
              start anywhere on screen blocked the FlatList from
              starting a horizontal swipe. Net effect: the story
              advanced once via tap, then refused to swipe further.
              Now the swipe gesture has the full card area to itself;
              tap-to-advance is still available via a narrow strip
              under the pips. */}
          <View style={styles.tapZones} pointerEvents="box-none">
            <Pressable style={styles.tapLeft} onPress={rewind} accessibilityRole="button" accessibilityLabel="Previous card" />
            <Pressable style={styles.tapRight} onPress={advance} accessibilityRole="button" accessibilityLabel="Next card" />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  pipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  pip: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: colors.border,
  },
  pipDone: { backgroundColor: colors.textSecondary },
  pipCurrent: { backgroundColor: colors.primary },
  shareBtn: {
    marginLeft: spacing.sm,
    width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    marginLeft: spacing.xs,
    width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },

  loadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },
  emptyTitle: { ...type.bodyStrong, color: colors.textPrimary },
  emptyBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Cards
  cardWrap: {
    width: SCREEN_W,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  card: {
    flex: 1,
    minHeight: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  // Stat layout
  statValue: {
    // eslint-disable-next-line no-restricted-syntax -- Year-of-Lifts hero number, 96px by design
    fontSize: 96,
    lineHeight: 100,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  statUnit: {
    ...type.h3,
    color: colors.textPrimary,
  },
  statCaption: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Intro / outro hero
  heroHeadline: {
    // eslint-disable-next-line no-restricted-syntax -- Year-of-Lifts secondary hero number
    fontSize: 44,
    lineHeight: 48,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  heroSubline: {
    ...type.body,
    color: colors.textSecondary,
  },

  // List layout
  listWrap: { gap: spacing.md },
  listHeadline: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  listSubline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  listRows: { gap: spacing.md },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listRank: {
    width: 24,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.primary,
    textAlign: 'center',
  },
  listPrimary: {
    ...type.bodyStrong,
    flex: 1,
    color: colors.textPrimary,
  },
  listSecondary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Tap-zone band, narrow strip just under the pips, so the bulk of
  // the card area is left clean for FlatList swipe gestures. Without
  // this layout the previous full-screen overlay swallowed every
  // horizontal drag on Android.
  tapZones: {
    position: 'absolute',
    top: 50,
    height: 56,
    left: 0, right: 0,
    flexDirection: 'row',
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },

  doneBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  doneBtnText: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
});
