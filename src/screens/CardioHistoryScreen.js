/**
 * CardioHistoryScreen
 *
 * The cardio log over time (audit E3). A plain reverse-chronological list of
 * sessions grouped by day, each showing activity, duration, intensity and the
 * estimated calories (feedback, not a target). Swipe-free: a small delete on
 * each row (soft delete, so it syncs). Reached from the Progress cardio card.
 *
 * Voice rules: CLAUDE.md. No em dashes, no encouragement.
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import SectionLabel from '../components/SectionLabel';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { getRecentCardioLog, deleteCardioLog, getCardioLogRange, activityDayKey } from '../lib/database';
import { summariseCardioByWeek, cardioVerdictLabel } from '../lib/cardio/cardioEngine';
import {
  buildCardioWeekWindows,
  cardioTrendAccessibilityLabel,
  cardioTrendWhenLabel,
  prettyCardioDate,
  trimEmptyTrendWeeks,
} from '../lib/cardio/cardioHistoryView';
import { isHealthAvailable, getHealthProviderLabel } from '../lib/health';
import { logError } from '../lib/errorLog';

// Campaign 2026-07-10 item 8: checked against the CP-10 plan's "18 module-
// scope const object maps baking colors.*" list (section 2.2), which names
// these two as colour-baking. On direct inspection they are NOT -- both are
// plain label-string lookups with no colour/fontSize/type token anywhere in
// their values, so there is nothing to unfreeze here; this is the plan's
// one known stale list entry. Left untouched.
const INTENSITY_LABEL = { low: 'Easy', moderate: 'Moderate', high: 'Hard' };

// Imported cardio rows carry a platform source tag (ULTIMATE-CUX-PCI, NA-cux-6);
// manual rows are 'manual' and show no tag. Map the stored tag to a label.
const CARDIO_SOURCE_LABEL = { apple_health: 'Apple Health', health_connect: 'Health Connect' };
const cardioSourceLabel = (source) => CARDIO_SOURCE_LABEL[source] || null;
const TREND_WEEKS = 8; // recent weeks shown in the "done vs planned" trend

// Campaign 2026-07-10 item 8 (history + cardio theme migration): live
// variant of the frozen markStyle(verdict) this file used to define inline
// (reading the frozen `colors.*` singleton at call time), same "build"
// pattern as WeightTrendCard's buildDotColour / FatigueTrendCard's
// buildFatigueBarColor -- resolves the SAME verdict -> tone mapping off a
// passed-in colour table (t.colors) instead of the frozen singleton, so the
// trend mark's colour stays in step with a theme flip. Wording/logic
// byte-identical (NA-cux-11: cardio trend section is founder-decided,
// style plumbing only).
function buildMarkStyle(c) {
  return function markStyle(verdict) {
    if (verdict === 'hit') return { color: c.success };
    if (verdict === 'mostly') return { color: c.textSecondary };
    return { color: c.textMuted }; // never red: a quiet marker, not a grade
  };
}

// Inline "done vs planned over time" section (ULTIMATE-CUX-CTV, NA-cux-10:
// founder wording "turn the history list into a trend" → inline, no new route).
function CardioTrend({ weeks, goal }) {
  // Campaign 2026-07-10 item 8: CardioTrend is a sibling function-component
  // scope (rendered once as FlashList's ListHeaderComponent, not prop-
  // drilled `live`/`t` from CardioHistoryScreen), so its own useTheme() call
  // is cleaner than threading two extra props through. Same shared
  // buildLiveStyles(t) as the parent screen. Zero copy/logic change here
  // (NA-cux-11): style plumbing only.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const resolveMarkStyle = buildMarkStyle(t.colors);
  return (
    <View style={[styles.trend, live.trend]}>
      <Text style={[styles.trendLabel, live.trendLabel]}>How often you did your cardio</Text>
      {weeks.map((w, idx) => {
        const when = cardioTrendWhenLabel(w, idx);
        const mark = goal > 0 ? cardioVerdictLabel(w.verdict) : null;
        return (
          <View
            key={w.fromKey}
            style={styles.trendRow}
            accessible
            accessibilityLabel={cardioTrendAccessibilityLabel({ when, sessions: w.sessions, goal, mark })}
          >
            <Text style={[styles.trendWhen, live.trendWhen]}>{when}</Text>
            <Text style={[styles.trendCount, live.trendCount]}>{goal > 0 ? `${w.sessions} of ${goal}` : `${w.sessions}`}</Text>
            {mark ? <Text style={[styles.trendMark, live.trendMark, resolveMarkStyle(w.verdict)]}>{mark}</Text> : null}
          </View>
        );
      })}
      <Text style={[styles.trendFootnote, live.trendFootnote]}>
        {goal > 0
          ? 'Sessions you logged each week, compared with your current cardio target.'
          : 'Sessions you logged each week. The coach sets a target only if a cut stalls.'}
      </Text>
    </View>
  );
}

export default function CardioHistoryScreen() {
  const navigation = useNavigation();
  const { user, userProfile, energyUnit } = useAppStore(useShallow((s) => ({
    user: s.user, userProfile: s.userProfile, energyUnit: s.accessibility?.energyUnit ?? 'kcal',
  })));
  // Campaign 2026-07-10 item 8 (history + cardio theme migration): live
  // theme (src/hooks/useTheme.js). Memoised because this is a list-heavy
  // screen (renderItem runs once per FlashList row).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const userId = user?.id;
  const toast = useToast();
  const goal = userProfile?.cardioTarget?.sessionsPerWeek ?? 0;
  const [sections, setSections] = useState([]);
  const flatRows = useMemo(
    () => sections.flatMap((sec) => [{ _kind: 'header', id: `header:${sec.title}`, title: sec.title }, ...sec.data]),
    [sections],
  );
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;
    if (!userId) {
      setSections([]);
      setWeeks([]);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const windows = buildCardioWeekWindows(TREND_WEEKS, Date.now(), activityDayKey);
      const [rows, rangeRows] = await Promise.all([
        getRecentCardioLog(userId, 200),
        getCardioLogRange(userId, windows[windows.length - 1].fromKey, windows[0].toKey),
      ]);
      if (!isCurrentRequest()) return;

      // Day-grouped list (unchanged).
      const byDay = new Map();
      for (const r of rows) {
        const key = r.entryDate;
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(r);
      }
      setSections([...byDay.entries()].map(([key, data]) => ({ title: key, data })));

      // Trend: judge every week against the current target (NA-cux-9). Trim the
      // older all-empty weeks beyond the user's history, but always keep this week.
      const byWeek = summariseCardioByWeek(rangeRows, windows, { sessionsPerWeek: goal });
      setWeeks(trimEmptyTrendWeeks(byWeek));
    } catch (e) {
      if (!isCurrentRequest()) return;
      logError('CardioHistory.load', e, { userId });
      setSections([]);
      setWeeks([]);
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [userId, goal]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(row) {
    appAlert('Remove this session?', `${row.activityName}, ${row.durationMin} min.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCardioLog(userId, row.id);
            await load();
          } catch (e) {
            logError('CardioHistory.delete', e, { hasId: !!row.id });
            toast.show('Couldn\'t remove that session.', { variant: 'error' });
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Cardio history" />

      {loading ? (
        <View style={styles.loadingList} accessibilityLabel="Loading cardio history">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : loadError ? (
        <EmptyState
          icon="warning-outline"
          title="Couldn't load cardio history"
          text="Couldn't load this on your device. Try again."
          actionLabel="Try again"
          onAction={load}
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No cardio yet"
          text={isHealthAvailable()
            ? `Sessions you log, or bring in from ${getHealthProviderLabel()}, show up here.`
            : 'Sessions you log show up here.'}
          actionLabel="Log cardio"
          onAction={() => navigation.navigate('LogCardio')}
        />
      ) : (
        <FlashList
          data={flatRows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={weeks.length > 0 ? <CardioTrend weeks={weeks} goal={goal} /> : null}
          getItemType={(item) => (item._kind === 'header' ? 'header' : 'row')}
          renderItem={({ item }) => (item._kind === 'header' ? (
            <SectionLabel style={[styles.dayHeader, live.dayHeader]}>{prettyCardioDate(item.title)}</SectionLabel>
          ) : (
            <View style={[styles.row, live.row]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activity, live.activity]}>{item.activityName}</Text>
                <Text style={[styles.meta, live.meta]}>
                  {item.durationMin} min · {INTENSITY_LABEL[item.intensity] || item.intensity}
                  {item.estKcal != null ? ` · ~${toEnergy(item.estKcal, energyUnit)} ${energyUnitLabel(energyUnit)}` : ''}
                </Text>
                {cardioSourceLabel(item.source) ? (
                  <Text style={[styles.sourceTag, live.sourceTag]}>from {cardioSourceLabel(item.source)}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.activityName} session`}>
                <Ionicons name="trash-outline" size={18} color={t.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingList: { paddingHorizontal: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  dayHeader: {
    marginTop: spacing.md, marginBottom: spacing.xs, backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  activity: { ...type.body, color: colors.textPrimary },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  sourceTag: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },

  trend: {
    marginBottom: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  trendLabel: { ...type.title, color: colors.textPrimary, marginBottom: spacing.md },
  trendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  trendWhen: { flex: 1, ...type.body, color: colors.textSecondary },
  trendCount: { width: 80, textAlign: 'right', ...type.body, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  trendMark: { width: 76, textAlign: 'right', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  trendFootnote: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
});

// Campaign 2026-07-10 item 8 (history + cardio theme migration): the frozen
// `styles` block above stays byte-identical. This mirrors ONLY the colour/
// fontSize/type-bearing sub-properties of the matching frozen style, at
// identical rest values, shared by this screen's two function-component
// scopes (CardioHistoryScreen and CardioTrend) so they can never drift out
// of step with each other or the frozen block. Pure layout keys (flex/gap/
// padding/width, no token) are correctly omitted -- there is nothing to
// unfreeze for them. Same pattern as WorkoutSummaryScreen.js's
// buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    dayHeader: { backgroundColor: t.colors.background },
    row: { borderBottomColor: t.colors.border },
    activity: { ...t.type.body, color: t.colors.textPrimary },
    meta: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    sourceTag: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    trend: { borderBottomColor: t.colors.border },
    trendLabel: { ...t.type.title, color: t.colors.textPrimary },
    trendWhen: { ...t.type.body, color: t.colors.textSecondary },
    trendCount: { ...t.type.body, color: t.colors.textPrimary },
    trendMark: { fontSize: t.fontSize.sm },
    trendFootnote: { ...t.type.caption, color: t.colors.textMuted },
  };
}
