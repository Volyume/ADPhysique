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
  View, Text, StyleSheet, FlatList, Pressable, TouchableOpacity, Dimensions, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, circle, withAlpha } from '../styles/theme';
// M4 (audit 03b §2.2 item 1): the story tap zones were the flagship dead
// tap, no pressed state, no haptic. The tick goes through the self-gating
// vocabulary (selection = story advance, same class as a scrub tick).
import * as haptics from '../lib/haptics';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getYearOfLiftsData, getRecapData, getBlockReflectionData, getOpenEdPatternFlag } from '../lib/database';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from '../lib/engineTelemetry';
import { buildRecapMilestoneData } from '../lib/shareCard/recapPayload';
import GradientCard from '../components/GradientCard';
import { VolyumeMark } from '../components/BrandMark';

const { width: SCREEN_W } = Dimensions.get('window');
// How long each story card holds before auto-advancing (Instagram-story feel).
const STORY_MS = 5000;

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
 * cards are dropped so the deck stays tight. `neutral` (calm mode / open ED
 * flag) suppresses the year-over-year comparison, mirroring buildMonthCards.
 */
export function buildCards(data, units, { neutral = false } = {}) {
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
        ? `That's roughly ${data.avgSessionsPerWeek} sessions a week, week in and week out.`
        : `That's roughly ${data.avgSessionsPerWeek} sessions a week.`,
    });
  }

  // 3. Volume: raw number stays the hero (numbers-first); a factual
  // year-over-year anchor (ULTIMATE-WR-5, NA-wr-10: founder chose relative %)
  // is added only when there is a previous window and the year is up. A down
  // year is never negative-framed and neutral mode suppresses it; either way it
  // falls back to the generic line, never a fabricated comparison. Mirrors the
  // already-shipped buildMonthCards tonnage caption.
  if (data.tonnage > 0) {
    const prev = data.previous;
    // Round first and only surface the relative line when it reads as at least
    // 1%: a sub-0.5% rise rounds to 0, and "Up 0% on the year before." is neither
    // factual nor the intended generic fallback.
    const pct = (!neutral && prev && prev.tonnage > 0 && data.tonnage > prev.tonnage)
      ? Math.round(((data.tonnage - prev.tonnage) / prev.tonnage) * 100)
      : 0;
    const caption = pct >= 1
      ? `That's ${pct}% more than the year before.`
      : 'That\'s every set you logged this year, added together.';
    cards.push({
      type: 'stat',
      icon: 'trending-up',
      tone: 'success',
      value: data.tonnage.toLocaleString('en-GB'),
      unit: 'kg moved',
      caption,
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
        : 'You logged every one, rep by rep.',
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
      caption: 'The month you put in the most work.',
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
    subline: 'Keep turning up, keep adding a little, and the rest takes care of itself.',
  });

  return cards;
}

// Parse the YYYY-MM-DD TEXT dates the mesocycle table stores into ms.
function parseDateText(t) {
  if (!t) return null;
  const ms = Date.parse(`${String(t).slice(0, 10)}T00:00:00`);
  return Number.isNaN(ms) ? null : ms;
}

// COMP-005: monthly recap deck (max 8 cards, empty ones dropped). `neutral`
// is set under calm mode or an open ED-pattern flag: month-vs-month deltas go
// factual (comparison pressure is the calm-mode risk, never the training data).
// A down month is never negative-framed.
export function buildMonthCards(data, units, { label = 'This month', neutral = false } = {}) {
  if (!data) return [];
  const cards = [];
  cards.push({
    type: 'intro', icon: 'sparkles', tone: 'gold',
    headline: `${label}, in numbers.`,
    subline: `${fmtDate(data.startMs)} to ${fmtDate(data.endMs - 86400000)}`,
  });

  const content = [];
  const prev = data.previous;

  if (data.totalSessions > 0) {
    let caption;
    if (!neutral && prev && prev.totalSessions > 0 && data.totalSessions > prev.totalSessions) {
      const diff = data.totalSessions - prev.totalSessions;
      caption = `That's ${diff} more than the month before.`;
    } else {
      caption = data.avgSessionsPerWeek >= 3
        ? `That's roughly ${data.avgSessionsPerWeek} sessions a week, week in and week out.`
        : `That's roughly ${data.avgSessionsPerWeek} sessions a week.`;
    }
    content.push({
      type: 'stat', icon: 'barbell', tone: 'primary',
      value: data.totalSessions.toLocaleString('en-GB'),
      unit: data.totalSessions === 1 ? 'session' : 'sessions',
      caption,
    });
  }

  if (data.tonnage > 0) {
    let caption = 'That\'s every set you logged, added together.';
    if (!neutral && prev && prev.tonnage > 0 && data.tonnage > prev.tonnage) {
      caption = `That's ${Math.round(((data.tonnage - prev.tonnage) / prev.tonnage) * 100)}% more than the month before.`;
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
      caption: `Your biggest session was on ${fmtDate(data.bestSession.startedAt)}.`,
    });
  }

  // Minimum-content rule: with fewer than 3 content cards the deck is just
  // intro + sessions + outro, and the sessions caption softens.
  if (content.length < 3) {
    const sessions = content.find(c => typeof c.unit === 'string' && c.unit.includes('session'));
    if (sessions) {
      if (data.totalSessions <= 2) sessions.caption = `${data.totalSessions} ${data.totalSessions === 1 ? 'session' : 'sessions'} logged this month, and every one counts.`;
      cards.push(sessions);
    }
  } else {
    cards.push(...content.slice(0, 6));
  }

  cards.push({
    type: 'outro', icon: 'checkmark-circle', tone: 'gold',
    headline: 'A fresh month ahead.', subline: 'Keep turning up and the numbers will follow.',
  });
  return cards;
}

// S4 (world-class audit 04a: "Your week, in one card"): weekly recap deck,
// the SAME infrastructure as buildMonthCards at higher frequency. Deliberately
// NOT a thin wrapper around buildMonthCards: the delta captions must say "the
// week before" (never "the month before"), and a week that never happened
// (no sessions logged) returns an empty deck rather than a hollow intro+outro
// pair, so the caller falls back to its existing "No sessions yet" state.
// Reflective, never competitive: no ranking, no comparison to anyone else.
export function buildWeekCards(data, units, { label = 'This week', neutral = false } = {}) {
  if (!data || !(data.totalSessions > 0)) return [];
  const cards = [];
  cards.push({
    type: 'intro', icon: 'sparkles', tone: 'gold',
    headline: `${label}, in numbers.`,
    subline: `${fmtDate(data.startMs)} to ${fmtDate(data.endMs - 86400000)}`,
  });

  const content = [];
  const prev = data.previous;

  if (data.totalSessions > 0) {
    let caption;
    if (!neutral && prev && prev.totalSessions > 0 && data.totalSessions > prev.totalSessions) {
      const diff = data.totalSessions - prev.totalSessions;
      caption = `That's ${diff} more than the week before.`;
    } else {
      caption = `${data.totalSessions} session${data.totalSessions === 1 ? '' : 's'} this week.`;
    }
    content.push({
      type: 'stat', icon: 'barbell', tone: 'primary',
      value: data.totalSessions.toLocaleString('en-GB'),
      unit: data.totalSessions === 1 ? 'session' : 'sessions',
      caption,
    });
  }

  if (data.tonnage > 0) {
    let caption = 'That\'s every set you logged this week, added together.';
    if (!neutral && prev && prev.tonnage > 0 && data.tonnage > prev.tonnage) {
      caption = `That's ${Math.round(((data.tonnage - prev.tonnage) / prev.tonnage) * 100)}% more than the week before.`;
    }
    content.push({
      type: 'stat', icon: 'trending-up', tone: 'success',
      value: data.tonnage.toLocaleString('en-GB'), unit: 'kg moved', caption,
    });
  }

  if (data.topExercises?.[0]) {
    content.push({
      type: 'list', icon: 'flame', tone: 'warning',
      headline: 'Your top lifts', subline: 'Most-trained this week',
      rows: data.topExercises.slice(0, 5).map(ex => ({ primary: ex.name, secondary: `${ex.sets.toLocaleString('en-GB')} sets` })),
    });
  }

  if (data.topPRs?.length > 0) {
    content.push({
      type: 'list', icon: 'trophy', tone: 'gold',
      headline: 'Personal bests', subline: 'Estimated max lifts this week',
      rows: data.topPRs.slice(0, 5).map(pr => ({ primary: pr.exerciseName ?? pr.exercise_name, secondary: `${parseFloat(pr.value).toFixed(1)}${units}` })),
    });
  }

  if (data.bestSession) {
    content.push({
      type: 'stat', icon: 'flash', tone: 'primary',
      value: data.bestSession.tonnage.toLocaleString('en-GB'), unit: 'kg, best session',
      caption: `Your biggest session was on ${fmtDate(data.bestSession.startedAt)}.`,
    });
  }

  // Minimum-content rule, mirrored from buildMonthCards: with fewer than 3
  // content cards the deck is just intro + sessions + outro, softened.
  if (content.length < 3) {
    const sessions = content.find(c => typeof c.unit === 'string' && c.unit.includes('session'));
    if (sessions) {
      if (data.totalSessions <= 2) sessions.caption = `${data.totalSessions} ${data.totalSessions === 1 ? 'session' : 'sessions'} logged this week, and every one counts.`;
      cards.push(sessions);
    }
  } else {
    cards.push(...content.slice(0, 5));
  }

  cards.push({
    type: 'outro', icon: 'checkmark-circle', tone: 'gold',
    headline: 'A fresh week ahead.', subline: 'Keep turning up and the numbers will follow.',
  });
  return cards;
}

// COMP-005: block-end recap deck (3-5 cards). The "climb" slide (tonnageDelta)
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
  cards.push({ type: 'intro', icon: 'sparkles', tone: 'gold', headline: name, subline: shapeBits.join(' - ') });

  if (data.tonnageDelta != null) {
    const up = data.tonnageDelta >= 0;
    cards.push({
      type: 'stat', icon: 'trending-up', tone: 'success',
      value: `${up ? '+' : ''}${data.tonnageDelta}%`, unit: 'weekly volume',
      caption: up ? 'From the first week to the last, that climb is the block working.' : 'Your final week was lighter, and that\'s the plan working.',
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
    caption: `${data.totalSets.toLocaleString('en-GB')} sets - ${data.tonnage.toLocaleString('en-GB')} kg moved.`,
  });

  cards.push({
    type: 'outro', icon: 'checkmark-circle', tone: 'gold',
    headline: 'That block is done. Recover well, then go again.', subline: 'Your full block summary is inside.',
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
    startMs, endMs, monthLabel, weekLabel,
    mesocycleId, blockName,
  } = route.params ?? {};
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, units } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
  })));
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const [data, setData] = useState(null);
  const [neutral, setNeutral] = useState(false);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const load = async () => {
      try {
        if (variant === 'month' || variant === 'week') {
          // Neutral framing under calm mode or an open ED flag: factual deltas,
          // evaluated at render time so no celebratory state survives a flag.
          // S4: the weekly mini-story reuses this EXACT path (getRecapData
          // over an arbitrary [startMs, endMs) window); a 7-day window
          // instead of a calendar month is the only difference.
          // Fail CLOSED: read the raw wellbeing flag rather than getWellbeingMode()
          // (which swallows a storage read error down to 'unspecified'). A genuine
          // read failure on either flag must suppress the celebratory framing.
          const [mode, edFlag, recap] = await Promise.all([
            AsyncStorage.getItem(WELLBEING_KEY).then(v => v || 'unspecified').catch(() => 'read_failed'),
            getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
            getRecapData(user.id, { startMs, endMs, compare: true }),
          ]);
          setNeutral(isCalm(mode) || mode === 'read_failed' || !!edFlag);
          setData(recap);
        } else if (variant === 'block') {
          setData(await getBlockReflectionData(user.id, mesocycleId));
        } else {
          // Year of Lifts: raw tonnage hero + a factual year-over-year anchor
          // (ULTIMATE-WR-5, NA-wr-10). The previous-window tonnage comes from
          // getRecapData over the SAME [yearStart, yearEnd] window, so it shares
          // getYearOfLiftsData's set-filter basis and the % agrees with the
          // displayed number. Calm mode / open ED flag suppresses the comparison.
          const yd = await getYearOfLiftsData(user.id, yearMs);
          // Fail CLOSED: same raw wellbeing read as above; a genuine read
          // failure on either flag must suppress the year-over-year comparison.
          const [mode, edFlag, recap] = await Promise.all([
            AsyncStorage.getItem(WELLBEING_KEY).then(v => v || 'unspecified').catch(() => 'read_failed'),
            getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
            (yd && yd.tonnage > 0 && yd.yearStart != null)
              ? getRecapData(user.id, { startMs: yd.yearStart, endMs: yd.yearEnd, compare: true }).catch(() => null)
              : Promise.resolve(null),
          ]);
          setNeutral(isCalm(mode) || mode === 'read_failed' || !!edFlag);
          setData(recap?.previous ? { ...yd, previous: recap.previous } : yd);
        }
      } catch (_e) { /* leave data null → graceful empty */ }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    if (variant === 'month') return buildMonthCards(data, units, { label: monthLabel, neutral });
    if (variant === 'week') return buildWeekCards(data, units, { label: weekLabel, neutral });
    if (variant === 'block') return buildBlockCards(data, units);
    return buildCards(data, units, { neutral });
  }, [data, units, variant, monthLabel, weekLabel, neutral]);

  // COMP-005: open-rate telemetry for the recap surfaces (month/week/block).
  // variant only, no PII. Year of Lifts keeps its own (untracked) path unchanged.
  useEffect(() => {
    if (variant !== 'month' && variant !== 'week' && variant !== 'block') return;
    if (!user?.id) return;
    track(user.id, 'recap_opened', { variant })?.catch?.(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Instagram-style auto-advance: each card holds for STORY_MS while its pip
  // fills, then the deck moves on by itself (founder 2026-06-16: lapse in time
  // and move on, not a manual swipe). Tap/swipe still work and reset the timer
  // (the effect re-runs on index change). The last card closes the deck.
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (loading || cards.length === 0) return undefined;
    if (reduceMotion) {
      // Reduce motion: the pip shows full immediately instead of animating;
      // the card still holds for STORY_MS before auto-advancing.
      progressAnim.setValue(1);
      const hold = setTimeout(() => advance(), STORY_MS);
      return () => clearTimeout(hold);
    }
    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_MS,
      useNativeDriver: false, // animating width %
    });
    anim.start(({ finished }) => { if (finished) advance(); });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cards.length, loading, reduceMotion]);

  // Share the year as a single milestone card. Factual stats only, no
  // bodyweight or private data, same fields the deck already shows.
  function handleShareYear() {
    if (!data) return;
    // COMP-005: same milestone canvas, eyebrow/title/hero/stats vary by variant.
    // Factual training stats only: never bodyweight, measurements or notes.
    const milestoneData = buildRecapMilestoneData(data, { variant, monthLabel, weekLabel, blockName });
    navigation.navigate('ShareCard', { milestoneData });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Brand mark at the very top, like a story's account row. */}
      <View style={styles.brandRow}>
        <VolyumeMark size={18} />
      </View>

      {/* Progress pips at the top, one per card. The current card's pip fills
          over its on-screen time (Instagram-story timer). */}
      <View style={styles.pipsRow}>
        {cards.map((_, i) => (
          <View key={i} style={styles.pip}>
            {i < index ? <View style={styles.pipFillFull} /> : null}
            {i === index ? (
              <Animated.View
                style={[
                  styles.pipFill,
                  { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
            ) : null}
          </View>
        ))}
        {!loading && cards.length > 0 && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareYear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={variant === 'month' ? 'Share your month' : variant === 'week' ? 'Share your week' : variant === 'block' ? 'Share your block' : 'Share your year'}
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
          <Text style={styles.loadingText}>{variant === 'month' ? 'Building your recap...' : variant === 'week' ? 'Building your week...' : variant === 'block' ? 'Building your block story...' : 'Building your year...'}</Text>
        </View>
      )}

      {!loading && cards.length === 0 && (
        <View style={styles.loadingWrap}>
          <Ionicons name="barbell-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{variant === 'week' ? 'No sessions this week' : 'No sessions yet'}</Text>
          <Text style={styles.emptyBody}>
            {variant === 'week' ? 'Log a session and your week starts filling in.' : "Come back here once you've logged a few sessions."}
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
            {/* M4: the zones are invisible, so the pressed wash is the only
                visual acknowledgment a tap gets; the selection tick fires on
                the TAP handlers only, never on the auto-advance timer. */}
            <Pressable
              style={({ pressed }) => [styles.tapLeft, pressed && styles.tapPressed]}
              onPress={() => { haptics.selection(); rewind(); }}
              accessibilityRole="button"
              accessibilityLabel="Previous card"
            />
            <Pressable
              style={({ pressed }) => [styles.tapRight, pressed && styles.tapPressed]}
              onPress={() => { haptics.selection(); advance(); }}
              accessibilityRole="button"
              accessibilityLabel="Next card"
            />
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
  brandRow: { alignItems: 'center', paddingTop: spacing.xs },
  pip: {
    flex: 1, height: 3, borderRadius: radius.hair,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  pipFill: { height: '100%', borderRadius: radius.hair, backgroundColor: colors.primary },
  pipFillFull: { height: '100%', width: '100%', borderRadius: radius.hair, backgroundColor: colors.textSecondary },
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
  emptyBody: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },

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
    borderRadius: circle(64),
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
    letterSpacing: 0,
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
    letterSpacing: 0,
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
  // A faint light wash while pressed: enough to acknowledge the tap on an
  // otherwise invisible zone without competing with the card artwork.
  tapPressed: { backgroundColor: withAlpha(colors.textPrimary, 0.08), borderRadius: radius.md },

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
