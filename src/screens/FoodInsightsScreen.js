/**
 * FoodInsightsScreen - food adherence over a selectable window (Move #1).
 *
 * Locked in MOVE_1_FOOD_FOUNDATION_AND_FFM.md and
 * UI_FLOWS_LOCKED.md. Three blocks:
 *   1. Kcal vs target as horizontal bars over the chosen window
 *      (7/14-day per-day bars; 30/90-day weekly-aggregated bars).
 *   2. Macro hit rate over the chosen window.
 *   3. Export the diary as CSV.
 *
 * Window selector (7/14/30/90 days) added in ULTIMATE-NUT-05; default 7.
 *
 * The Insights tab in the locked nav doesn't exist yet (still on the
 * legacy four-tab layout); we surface this screen via a header
 * button on Diary so the data is visible day one of the food layer.
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import { toEnergy, energyUnitLabel, formatEnergy } from '../lib/format';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import VolyumeChart from '../components/VolyumeChart';
import { useToast } from '../components/Toast';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import {
  getRollupsForRange, getFoodEntriesForRange,
} from '../lib/food/db';
import { localDayKey, parseLocalDay } from '../lib/dayKey';
import { getNutritionTargets } from '../lib/database';
import { exportDiaryCsv, exportDiaryPdf } from '../lib/food/csvExport';
import { ADHERENCE_TOLERANCE, pctLabel, within } from '../lib/food/adherence';
import { summariseNutrients, NUTRIENT_ROWS } from '../lib/food/nutrientSummary';
import WeeklyMicronutrientsCard from '../components/food/WeeklyMicronutrientsCard';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError } from '../lib/errorLog';
import * as haptics from '../lib/haptics';

function isoDate(d) { return localDayKey(d.getTime()); } // TZ-1: local calendar day
function shift(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

// ULTIMATE-NUT-05: window-parameterised day list (was the fixed 7-day list).
function lastNDayIsoList(n) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(isoDate(shift(today, -i)));
  return out;
}

// Window options for the header selector (default 7). Above 14 days the
// per-day bar list is illegible, so 30/90 render weekly-aggregated bars
// (NA-nutrition-9, founder decision 2026-06-14: weekly-aggregated bars).
const WINDOWS = [7, 14, 30, 90];
const WEEKLY_THRESHOLD = 14; // windows beyond this aggregate into weekly bars

// Fibre has no per-user target in nutrition_targets (kcal/P/C/F only), so we
// anchor adherence to the UK public reference: NHS Eatwell advises aiming for
// 30 g of fibre a day. Fibre is a "more is fine" nutrient, a day counts when
// it lands AT OR ABOVE this aim, never an upper bound (no over-target shame).
const FIBRE_AIM_G = 30;

// Charts are drawn at the ScrollView content width (screen minus the lg padding
// on each side and the Card's lg padding on each side), mirroring BodyMetrics.

function dayLabel(iso) {
  const d = parseLocalDay(iso); // TZ-1: parse the key as local, not UTC
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

// Short calendar label for a weekly bar, keyed on the week's first day.
function weekLabel(iso) {
  const d = parseLocalDay(iso); // TZ-1: parse the key as local, not UTC
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function FoodInsightsScreen({ navigation }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const energyWord = energyUnit === 'kj' ? 'kilojoules' : 'calories';
  const userId = user?.id;
  const toast = useToast();
  // Live-subscribing so a resize (e.g. Android split-screen/freeform) picks
  // up the correct chart width, matching RestTimer.js's useWindowDimensions
  // pattern rather than a frozen module-scope Dimensions.get().
  const { width: windowWidth } = useWindowDimensions();
  const CHART_WIDTH = useMemo(() => windowWidth - spacing.lg * 2 - spacing.lg * 2, [windowWidth]);

  const [rollups, setRollups] = useState([]);
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [windowDays, setWindowDays] = useState(7); // ULTIMATE-NUT-05; default 7
  const loadRequestRef = useRef(0);
  const isWeekly = windowDays > WEEKLY_THRESHOLD;

  // L05-cross (2026-07-09 design audit): the "set a calorie target" hints
  // below named a screen ("Coach") with no way to actually get there.
  // Nutrition targets lives in the Profile tab (titled "Coach" in the tab
  // bar), a different stack from this screen, so a cross-tab jump is needed.
  const goToNutritionTargets = useCallback(() => {
    navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets');
  }, [navigation]);

  // Re-keyed on windowDays so startDate/endDate and the range queries recompute.
  const days = useMemo(() => lastNDayIsoList(windowDays), [windowDays]);
  const startDate = days[0];
  const endDate = days[days.length - 1];
  // Ultimate-Audit item 16 (MN-1), D22 16b: the weekly micronutrient average
  // is a FIXED 7-day window, independent of the window selector above (the
  // ruling calls it "Food Insights weekly average", not "windowed average").
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weeklyMicroDays = useMemo(() => lastNDayIsoList(7), []);
  const weeklyMicroStart = weeklyMicroDays[0];
  const weeklyMicroEnd = weeklyMicroDays[weeklyMicroDays.length - 1];
  // L05-FI4 (2026-07-09 design audit): the period-vs-previous-period
  // comparison below needs rollups for TWICE the selected window (the
  // window itself plus the equal span immediately before it), so the fetch
  // range is widened to match rather than only ever covering the charts'
  // narrower `days` window.
  const fetchStartDate = useMemo(() => lastNDayIsoList(windowDays * 2)[0], [windowDays]);

  const load = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;
    if (!userId) {
      setRollups([]);
      setTargets(null);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const [rs, t] = await Promise.all([
        getRollupsForRange(userId, fetchStartDate, endDate),
        getNutritionTargets(userId),
      ]);
      if (!isCurrentRequest()) return;
      setRollups(rs);
      setTargets(t);
    } catch (e) {
      if (!isCurrentRequest()) return;
      logError('FoodInsights.load', e, { userId });
      setRollups([]);
      setTargets(null);
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [userId, fetchStartDate, endDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rollupByDate = useMemo(() => {
    const out = new Map();
    for (const r of rollups) out.set(r.entry_date, r);
    return out;
  }, [rollups]);

  const adherence = useMemo(() => {
    if (!targets) return null;
    let kcalDays = 0, pDays = 0, cDays = 0, fDays = 0, fibreDays = 0, logged = 0;
    for (const d of days) {
      const r = rollupByDate.get(d);
      if (!r || r.entries_count === 0) continue;
      logged++;
      if (within(r.kcal_total, targets.targetKcal, ADHERENCE_TOLERANCE.kcal)) kcalDays++;
      if (within(r.protein_g, targets.proteinG, ADHERENCE_TOLERANCE.protein)) pDays++;
      if (within(r.carbs_g, targets.carbsG, ADHERENCE_TOLERANCE.carbs)) cDays++;
      if (within(r.fat_g, targets.fatG, ADHERENCE_TOLERANCE.fat)) fDays++;
      // Fibre is "more is fine": a day counts at or above the aim, no ceiling.
      if ((r.fibre_g ?? 0) >= FIBRE_AIM_G) fibreDays++;
    }
    return { kcalDays, pDays, cDays, fDays, fibreDays, logged };
  }, [days, rollupByDate, targets]);

  // Nutrient averages (build gap #18): factual mean grams/day of each tracked
  // macro over the window's LOGGED days. Adherence-neutral, no target, no
  // colour, no streak. Aggregates the rollups the screen already loaded for the
  // window (no extra query); macro-level only (the rollup carries no
  // sodium/sugar, and micronutrients are decision-gated).
  const nutrientAverages = useMemo(() => {
    const windowRollups = days.map((d) => rollupByDate.get(d)).filter(Boolean);
    return summariseNutrients(windowRollups);
  }, [days, rollupByDate]);

  // Calories chart rows. 7/14-day windows render one bar per day; 30/90-day
  // windows aggregate into weekly bars (avg kcal/day of the LOGGED days that
  // week) so the list stays legible (NA-nutrition-9, founder: weekly bars).
  const chartBars = useMemo(() => {
    if (!isWeekly) {
      return days.map((d) => {
        const r = rollupByDate.get(d);
        return { key: d, label: dayLabel(d), kcal: Math.round(r?.kcal_total ?? 0) };
      });
    }
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      let sum = 0, n = 0;
      for (const d of chunk) {
        const r = rollupByDate.get(d);
        if (r && r.entries_count > 0) { sum += r.kcal_total ?? 0; n++; }
      }
      weeks.push({ key: chunk[0], label: weekLabel(chunk[0]), kcal: n > 0 ? Math.round(sum / n) : 0 });
    }
    return weeks;
  }, [days, rollupByDate, isWeekly]);

  // Calorie line trend (COMP-019 / VolyumeChart): one point per day across the
  // whole window. Unlike the per-day bar list (which has to aggregate weekly
  // past 14 days to stay readable), the line x-compresses, so it stays legible
  // at 30/90 days. Only LOGGED days carry a value; unlogged days drop out so the
  // line never dips to a false zero. First/last day labelled, like BodyMetrics.
  const calorieLine = useMemo(() => {
    return days
      .map((d, i) => {
        const r = rollupByDate.get(d);
        const logged = r && r.entries_count > 0;
        return logged
          ? {
            value: Math.round(r.kcal_total ?? 0),
            label: i === 0 || i === days.length - 1 ? weekLabel(d) : '',
            iso: d,
          }
          : null;
      })
      .filter(Boolean);
  }, [days, rollupByDate]);

  // Flat target rule drawn as a faint secondary series behind the calorie line,
  // so "vs target" reads at a glance without a valence colour (data2 convention).
  const calorieTargetRule = useMemo(() => {
    const t = targets?.targetKcal;
    if (!t || calorieLine.length < 2) return null;
    return calorieLine.map(() => ({ value: t }));
  }, [calorieLine, targets]);

  // Protein-grams-over-time line (same pattern, reusing the chart). Logged days
  // only; faint flat rule at the protein target.
  const proteinLine = useMemo(() => {
    return days
      .map((d, i) => {
        const r = rollupByDate.get(d);
        const logged = r && r.entries_count > 0;
        return logged
          ? {
            value: Math.round(r.protein_g ?? 0),
            label: i === 0 || i === days.length - 1 ? weekLabel(d) : '',
            iso: d,
          }
          : null;
      })
      .filter(Boolean);
  }, [days, rollupByDate]);

  const proteinTargetRule = useMemo(() => {
    const t = targets?.proteinG;
    if (!t || proteinLine.length < 2) return null;
    return proteinLine.map(() => ({ value: t }));
  }, [proteinLine, targets]);

  // Period-average summary: avg kcal/day over the selected window vs the same
  // number of days immediately before it. Factual, no valence colour, just
  // "this period / last period / the change", so a quieter or busier spell
  // reads neutrally (locked coaching voice).
  //
  // L05-FI4 (2026-07-09 design audit): this used to be hardcoded to a 7-vs-7
  // split no matter which window (7/14/30/90) was selected, so the headline
  // stayed "THIS WEEK" even for a 90-day view. Now scoped to `windowDays` on
  // both sides of the comparison, and the headline/copy below follow suit.
  const periodAvg = useMemo(() => {
    const avgOf = (isoList) => {
      let sum = 0, n = 0;
      for (const iso of isoList) {
        const r = rollupByDate.get(iso);
        if (r && r.entries_count > 0) { sum += r.kcal_total ?? 0; n++; }
      }
      return n > 0 ? { avg: Math.round(sum / n), n } : null;
    };
    const span = lastNDayIsoList(windowDays * 2);
    const current = avgOf(span.slice(windowDays));   // the selected window
    const previous = avgOf(span.slice(0, windowDays)); // the same span before it
    if (!current) return null;
    const delta = previous ? current.avg - previous.avg : null;
    return { current, previous, delta };
  }, [rollupByDate, windowDays]);
  const periodIsWeek = windowDays === 7;
  const periodPhrase = periodIsWeek ? 'this week' : `over the last ${windowDays} days`;
  const periodHeadline = periodIsWeek ? 'THIS WEEK' : `LAST ${windowDays} DAYS`;

  async function onExport(kind = 'csv') {
    if (!userId || exporting) return;
    setExporting(true);
    try {
      const entries = await getFoodEntriesForRange(userId, startDate, endDate);
      if (!entries.length) {
        toast.show(`No entries in the last ${windowDays} days.`, { variant: 'info' });
        return;
      }
      const result = kind === 'pdf'
        ? await exportDiaryPdf({ userId, entries, startDate, endDate })
        : await exportDiaryCsv({ userId, entries, startDate, endDate });
      if (result.unavailable) {
        toast.show('PDF export is not available on this device.', { variant: 'warning' });
        return;
      }
      if (result.rowCount > 0) {
        toast.show(`${result.rowCount} ${result.rowCount === 1 ? 'entry' : 'entries'} exported to ${kind === 'pdf' ? 'PDF' : 'CSV'}.`, { variant: 'success' });
      }
    } catch (_e) {
      toast.show('Export failed. Try again.', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  }

  // Scale to the bars actually rendered (daily values, or weekly averages),
  // so longer windows scale correctly rather than against daily peaks.
  const maxKcal = useMemo(() => {
    let m = targets?.targetKcal ?? 0;
    for (const b of chartBars) m = Math.max(m, b.kcal);
    return m || 1;
  }, [chartBars, targets]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Insights" onBack={() => navigation.goBack()} />

      {/* Window selector (ULTIMATE-NUT-05). Pinned below the header so it stays
          visible while the cards scroll. Segmented pill convention from PrefRow. */}
      <View style={styles.windowBar} accessibilityRole="radiogroup">
        {WINDOWS.map((n) => {
          const selected = n === windowDays;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.windowChip, selected && styles.windowChipOn]}
              onPress={() => { if (!selected) { haptics.selection(); setWindowDays(n); } }}
              disabled={selected}
              hitSlop={8}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Last ${n} days`}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.windowChipText, selected && styles.windowChipTextOn]}>{n}d</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingStack} accessibilityLabel="Loading nutrition insights">
            <SkeletonCard height={120} />
            <SkeletonCard height={180} />
            <SkeletonCard height={140} />
          </View>
        ) : loadError ? (
          <EmptyState
            icon="warning-outline"
            title="Couldn't load nutrition insights"
            text="Something went wrong loading these. Try again."
            actionLabel="Try again"
            onAction={load}
          />
        ) : (
        <>
        {/* Period-average summary: avg kcal/day over the selected window + a
            neutral, factual "vs the period before" delta (no good/bad
            colour). Above the chart so the headline number reads first. */}
        {periodAvg ? (
          <>
            <SectionLabel style={styles.sectionLabelSpacing}>{periodHeadline}</SectionLabel>
            <Card style={styles.card}>
              <Text maxFontSizeMultiplier={1.3}
                style={styles.summaryValue}
                accessibilityLabel={`Averaging ${toEnergy(periodAvg.current.avg, energyUnit)} ${energyWord} a day ${periodPhrase}`}
              >
                {formatEnergy(periodAvg.current.avg, energyUnit)} {energyUnitLabel(energyUnit)}/day
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.summaryCaption}>
                Average over {periodAvg.current.n} {periodAvg.current.n === 1 ? 'day' : 'days'} logged{periodIsWeek ? ' this week' : ` in the last ${windowDays} days`}.
              </Text>
              {periodAvg.delta != null ? (
                <Text maxFontSizeMultiplier={1.3} style={styles.summaryDelta}>
                  {periodAvg.delta === 0
                    ? `Same as the ${periodIsWeek ? 'week' : `${windowDays} days`} before.`
                    : `${periodAvg.delta > 0 ? '+' : '−'}${formatEnergy(Math.abs(periodAvg.delta), energyUnit)} ${energyUnitLabel(energyUnit)}/day vs the ${periodIsWeek ? 'week' : `${windowDays} days`} before.`}
                </Text>
              ) : (
                <Text maxFontSizeMultiplier={1.3} style={styles.summaryDelta}>No logged days before that to compare.</Text>
              )}
            </Card>
          </>
        ) : null}

        <SectionLabel style={styles.sectionLabelSpacing}>LAST {windowDays} DAYS - CALORIE TREND</SectionLabel>
        <Card style={styles.card}>
          {calorieLine.length >= 2 ? (
            <>
              <VolyumeChart
                data={calorieLine}
                data2={calorieTargetRule}
                width={CHART_WIDTH}
                height={140}
                color={colors.primary}
                color2={withAlpha(colors.textMuted, alpha.half)}
                thickness={2}
                thickness2={1}
                curved
                showDots={calorieLine.length <= 6}
                dotRadius={3}
                sections={3}
                yAxisSuffix=""
                backgroundColor={colors.surface}
                interactive
                accessibilityLabel="Daily calories trend"
                formatTooltip={(i) => {
                  const p = calorieLine[i];
                  if (!p) return null;
                  return {
                    title: `${formatEnergy(p.value, energyUnit)} ${energyUnitLabel(energyUnit)}`,
                    sub: weekLabel(p.iso),
                  };
                }}
              />
              {targets?.targetKcal ? (
                <Text maxFontSizeMultiplier={1.3} style={styles.cardFootnote}>
                  {`Each point is a logged day. Faint line is your ${formatEnergy(targets.targetKcal, energyUnit)} ${energyUnitLabel(energyUnit)} target.`}
                </Text>
              ) : (
                <Text maxFontSizeMultiplier={1.3}
                  style={[styles.cardFootnote, styles.cardFootnoteLink]}
                  onPress={goToNutritionTargets}
                  accessibilityRole="link"
                  accessibilityLabel="Set a calorie target in Nutrition targets to see the target line"
                >
                  Each point is a logged day. Set a calorie target in Nutrition targets to see the target line.
                </Text>
              )}
            </>
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
              Log at least two days to see your calorie trend.
            </Text>
          )}
        </Card>

        <SectionLabel style={styles.sectionLabelSpacing}>LAST {windowDays} DAYS - CALORIES</SectionLabel>
        <Card style={styles.card}>
          {chartBars.map((b) => {
            const pct = Math.min(1, b.kcal / maxKcal);
            const targetMet = within(b.kcal, targets?.targetKcal, ADHERENCE_TOLERANCE.kcal);
            return (
              <View
                key={b.key}
                style={styles.barRow}
                accessible
                accessibilityLabel={`${b.label}, ${toEnergy(b.kcal, energyUnit)} ${energyUnitLabel(energyUnit)}${isWeekly ? ' average' : ''}${targetMet ? ', on target' : ''}`}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.barDay}>{b.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { width: `${Math.round(pct * 100)}%` },
                    targetMet && { backgroundColor: colors.success },
                  ]} />
                </View>
                <Text maxFontSizeMultiplier={1.3} style={styles.barValue}>{toEnergy(b.kcal, energyUnit)}</Text>
              </View>
            );
          })}
          {targets?.targetKcal ? (
            <Text maxFontSizeMultiplier={1.3} style={styles.cardFootnote}>
              {isWeekly
                ? `Target: ${toEnergy(targets.targetKcal, energyUnit)} ${energyUnitLabel(energyUnit)}/day. Each bar is a weekly average; within ${pctLabel(ADHERENCE_TOLERANCE.kcal)} turns green.`
                : `Target: ${toEnergy(targets.targetKcal, energyUnit)} ${energyUnitLabel(energyUnit)}. Bars within ${pctLabel(ADHERENCE_TOLERANCE.kcal)} turn green.`}
            </Text>
          ) : (
            <Text maxFontSizeMultiplier={1.3}
              style={[styles.cardFootnote, styles.cardFootnoteLink]}
              onPress={goToNutritionTargets}
              accessibilityRole="link"
              accessibilityLabel="Set a calorie target in Nutrition targets to see target colours"
            >
              Set your calorie target in Nutrition targets to see target colours.
            </Text>
          )}
        </Card>

        {/* Protein-consistency headline (ULTIMATE-NUT-04): the single most
            behaviour-relevant figure, surfaced above the four-row macro block.
            Derived from the existing protein-hit count (within 10% of target,
            NA-nutrition-8), pDays / logged. Hidden until a day is logged,
            mirroring the macro block's guard. */}
        {adherence && adherence.logged > 0 ? (
          <>
            <SectionLabel style={styles.sectionLabelSpacing}>PROTEIN</SectionLabel>
            <Card style={styles.card}>
              <Text maxFontSizeMultiplier={1.3} style={styles.proteinHeadline}>
                You hit your protein on {adherence.pDays} of {adherence.logged} {adherence.logged === 1 ? 'day' : 'days'} you logged.
              </Text>
              {/* Protein grams over time (reuses the calorie-trend chart pattern):
                  one point per logged day, faint flat rule at the protein target. */}
              {proteinLine.length >= 2 ? (
                <View style={styles.proteinChartWrap}>
                  <VolyumeChart
                    data={proteinLine}
                    data2={proteinTargetRule}
                    width={CHART_WIDTH}
                    height={120}
                    color={colors.primary}
                    color2={withAlpha(colors.textMuted, alpha.half)}
                    thickness={2}
                    thickness2={1}
                    curved
                    showDots={proteinLine.length <= 6}
                    dotRadius={3}
                    sections={3}
                    yAxisSuffix=""
                    backgroundColor={colors.surface}
                    interactive
                    accessibilityLabel="Daily protein trend in grams"
                    formatTooltip={(i) => {
                      const p = proteinLine[i];
                      if (!p) return null;
                      return { title: `${p.value} g protein`, sub: weekLabel(p.iso) };
                    }}
                  />
                </View>
              ) : null}
              <Text maxFontSizeMultiplier={1.3} style={styles.cardFootnote}>
                {targets?.proteinG
                  ? `Hit = within target range. Faint line is your ${targets.proteinG} g target.`
                  : 'Hit = within target range.'}
              </Text>
            </Card>
          </>
        ) : null}

        <SectionLabel style={styles.sectionLabelSpacing}>MACRO ADHERENCE</SectionLabel>
        <Card style={styles.card}>
          {adherence && adherence.logged > 0 ? (
            <>
              <AdherenceRow label="Calories" hit={adherence.kcalDays}  total={adherence.logged} />
              <AdherenceRow label="Protein"  hit={adherence.pDays}     total={adherence.logged} />
              <AdherenceRow label="Carbs"    hit={adherence.cDays}     total={adherence.logged} />
              <AdherenceRow label="Fat"      hit={adherence.fDays}     total={adherence.logged} />
              <AdherenceRow label="Fibre"    hit={adherence.fibreDays} total={adherence.logged} />
              <Text maxFontSizeMultiplier={1.3} style={styles.cardFootnote}>
                Out of {adherence.logged} {adherence.logged === 1 ? 'day' : 'days'} logged. Hit = within target range.
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.cardFootnote}>
                Fibre counts on days you reached {FIBRE_AIM_G} g or more. More is fine.
              </Text>
            </>
          ) : (
            <View style={styles.emptyActionStack}>
              <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
                Log food on a few days to see this view fill out.
              </Text>
              <Button
                title="Open diary"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Open diary"
              />
            </View>
          )}
        </Card>

        {/* Nutrient averages (build gap #18): plain mean grams/day per macro
            over the window. Adherence-NEUTRAL by design, value in textPrimary,
            label in textMuted, no good/bad colour, no target, no streak. Macro-
            level only (no sodium/sugar on the rollup; micronutrients gated). */}
        <SectionLabel style={styles.sectionLabelSpacing}>NUTRIENT AVERAGES</SectionLabel>
        <Card style={styles.card}>
          {nutrientAverages.days > 0 ? (
            <>
              {NUTRIENT_ROWS.map((row) => (
                <View
                  key={row.key}
                  style={styles.nutrientRow}
                  accessible
                  accessibilityLabel={`${row.label}, ${nutrientAverages.avg[row.key]} grams a day on average`}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.nutrientLabel}>{row.label}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.nutrientValue}>{nutrientAverages.avg[row.key]} g/day</Text>
                </View>
              ))}
              <Text maxFontSizeMultiplier={1.3} style={styles.cardFootnote}>
                Average over {nutrientAverages.days} {nutrientAverages.days === 1 ? 'day' : 'days'} logged.
              </Text>
            </>
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
              Log food on a few days to see your averages.
            </Text>
          )}
        </Card>

        {/* Ultimate-Audit item 16 (MN-1), D22 16b secondary surface: 7-day
            average, coverage-floor gated, awareness register. */}
        <WeeklyMicronutrientsCard userId={userId} startDate={weeklyMicroStart} endDate={weeklyMicroEnd} />

        <Button
          title={`Export ${windowDays} days as CSV`}
          icon="download-outline"
          onPress={() => onExport('csv')}
          loading={exporting}
          disabled={exporting}
          accessibilityLabel={`Export the last ${windowDays} days as a CSV file`}
        />
        <Button
          title="Export as PDF report"
          icon="document-text-outline"
          variant="outline"
          onPress={() => onExport('pdf')}
          disabled={exporting}
          accessibilityLabel={`Export the last ${windowDays} days as a PDF report to share with a coach or GP`}
          style={styles.exportSecondary}
        />
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AdherenceRow({ label, hit, total }) {
  const pct = total > 0 ? Math.round((hit / total) * 100) : 0;
  return (
    <View style={styles.adherenceRow} accessible accessibilityLabel={`${label}, hit ${hit} of ${total} days`}>
      <Text maxFontSizeMultiplier={1.3} style={styles.adherenceLabel}>{label}</Text>
      <View style={styles.adherenceTrack}>
        <View style={[styles.adherenceFill, { width: `${pct}%` }]} />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={styles.adherenceValue}>{hit}/{total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  loadingStack: { gap: spacing.lg },

  windowBar: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  windowChip: {
    flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  windowChipOn: { borderColor: colors.primary, backgroundColor: colors.surface2 },
  windowChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  windowChipTextOn: { color: colors.primary },

  sectionLabelSpacing: { marginBottom: spacing.sm },
  card: {
    marginBottom: spacing.lg,
  },
  cardFootnote: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
  // L05-cross (2026-07-09 design audit): the tappable variant of the
  // footnote above, used only when it links through to Nutrition targets.
  cardFootnoteLink: { color: colors.primary, textDecorationLine: 'underline' },
  proteinHeadline: { ...type.title, color: colors.textPrimary },
  proteinChartWrap: { marginTop: spacing.md },
  emptyActionStack: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },

  // Weekly-average summary: headline numeral always textPrimary, delta neutral
  // (textSecondary), never a good/bad valence colour (locked coaching voice).
  summaryValue: { ...type.title, color: colors.textPrimary },
  summaryCaption: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  summaryDelta: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semibold, marginTop: spacing.sm },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barDay: { color: colors.textSecondary, fontSize: fontSize.sm, width: 48 }, // fits weekly date labels (e.g. "30 Jun")
  barTrack: {
    flex: 1, height: 12, borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.sm },
  barValue: { color: colors.textPrimary, fontSize: fontSize.sm, width: 56, textAlign: 'right' },

  adherenceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  adherenceLabel: { color: colors.textSecondary, fontSize: fontSize.sm, width: 72 },
  adherenceTrack: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  adherenceFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  adherenceValue: { color: colors.textPrimary, fontSize: fontSize.sm, width: 44, textAlign: 'right' },

  // Nutrient averages (build gap #18): a plain two-column factual row, "Protein
  // … 146 g/day". Label textMuted, value textPrimary, deliberately NO valence
  // colour, no bar, no target (adherence-neutral, ED-safety requirement).
  nutrientRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  nutrientLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  nutrientValue: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  exportSecondary: { marginTop: spacing.sm },
});
