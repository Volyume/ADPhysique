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
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import { toEnergy, energyUnitLabel, formatEnergy } from '../lib/format';
import Card from '../components/Card';
import VolyumeChart from '../components/VolyumeChart';
import { useToast } from '../components/Toast';
import {
  getRollupsForRange, getFoodEntriesForRange,
} from '../lib/food/db';
import { localDayKey, parseLocalDay } from '../lib/dayKey';
import { getNutritionTargets } from '../lib/database';
import { exportDiaryCsv, exportDiaryPdf } from '../lib/food/csvExport';
import { ADHERENCE_TOLERANCE, pctLabel, within } from '../lib/food/adherence';
import { summariseNutrients, NUTRIENT_ROWS } from '../lib/food/nutrientSummary';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

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
const CHART_WIDTH = Dimensions.get('window').width - spacing.lg * 2 - spacing.lg * 2;

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

  const [rollups, setRollups] = useState([]);
  const [targets, setTargets] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [windowDays, setWindowDays] = useState(7); // ULTIMATE-NUT-05; default 7
  const isWeekly = windowDays > WEEKLY_THRESHOLD;

  // Re-keyed on windowDays so startDate/endDate and the range queries recompute.
  const days = useMemo(() => lastNDayIsoList(windowDays), [windowDays]);
  const startDate = days[0];
  const endDate = days[days.length - 1];

  const load = useCallback(async () => {
    if (!userId) return;
    const [rs, t] = await Promise.all([
      getRollupsForRange(userId, startDate, endDate),
      getNutritionTargets(userId),
    ]);
    setRollups(rs);
    setTargets(t);
  }, [userId, startDate, endDate]);

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

  // Weekly-average summary: avg kcal/day over the last 7 logged days vs the 7
  // before that. Factual, no valence colour, just "this week / last week / the
  // change", so a quieter or busier week reads neutrally (locked coaching voice).
  const weeklyAvg = useMemo(() => {
    const avgOf = (isoList) => {
      let sum = 0, n = 0;
      for (const iso of isoList) {
        const r = rollupByDate.get(iso);
        if (r && r.entries_count > 0) { sum += r.kcal_total ?? 0; n++; }
      }
      return n > 0 ? { avg: Math.round(sum / n), n } : null;
    };
    // Build the last 14 calendar days independently of the selected window so
    // the "this week / last week" read is stable across 7/14/30/90.
    const last14 = lastNDayIsoList(14);
    const thisWeek = avgOf(last14.slice(7));   // most recent 7 days
    const lastWeek = avgOf(last14.slice(0, 7)); // the 7 before that
    if (!thisWeek) return null;
    const delta = lastWeek ? thisWeek.avg - lastWeek.avg : null;
    return { thisWeek, lastWeek, delta };
  }, [rollupByDate]);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Window selector (ULTIMATE-NUT-05). Pinned below the header so it stays
          visible while the cards scroll. Segmented pill convention from PrefRow. */}
      <View style={styles.windowBar} accessibilityRole="radiogroup">
        {WINDOWS.map((n) => {
          const selected = n === windowDays;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.windowChip, selected && styles.windowChipOn]}
              onPress={() => !selected && setWindowDays(n)}
              disabled={selected}
              hitSlop={8}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Last ${n} days`}
            >
              <Text style={[styles.windowChipText, selected && styles.windowChipTextOn]}>{n}d</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Weekly-average summary: avg kcal/day this week + a neutral, factual
            "vs last week" delta (no good/bad colour). Above the chart so the
            headline number reads first. */}
        {weeklyAvg ? (
          <>
            <Text style={styles.sectionLabel}>THIS WEEK</Text>
            <Card style={styles.card}>
              <Text
                style={styles.summaryValue}
                accessibilityLabel={`Averaging ${toEnergy(weeklyAvg.thisWeek.avg, energyUnit)} ${energyWord} a day this week`}
              >
                {formatEnergy(weeklyAvg.thisWeek.avg, energyUnit)} {energyUnitLabel(energyUnit)}/day
              </Text>
              <Text style={styles.summaryCaption}>
                Average over {weeklyAvg.thisWeek.n} {weeklyAvg.thisWeek.n === 1 ? 'day' : 'days'} logged this week.
              </Text>
              {weeklyAvg.delta != null ? (
                <Text style={styles.summaryDelta}>
                  {weeklyAvg.delta === 0
                    ? 'Same as last week.'
                    : `${weeklyAvg.delta > 0 ? '+' : '−'}${formatEnergy(Math.abs(weeklyAvg.delta), energyUnit)} ${energyUnitLabel(energyUnit)}/day vs last week.`}
                </Text>
              ) : (
                <Text style={styles.summaryDelta}>No logged days last week to compare.</Text>
              )}
            </Card>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>LAST {windowDays} DAYS · CALORIE TREND</Text>
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
              <Text style={styles.cardFootnote}>
                {targets?.targetKcal
                  ? `Each point is a logged day. Faint line is your ${formatEnergy(targets.targetKcal, energyUnit)} ${energyUnitLabel(energyUnit)} target.`
                  : 'Each point is a logged day. Set a calorie target in Precision Coaching to see the target line.'}
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>
              Log a couple of days to see your calorie trend.
            </Text>
          )}
        </Card>

        <Text style={styles.sectionLabel}>LAST {windowDays} DAYS · CALORIES</Text>
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
                <Text style={styles.barDay}>{b.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { width: `${Math.round(pct * 100)}%` },
                    targetMet && { backgroundColor: colors.success },
                  ]} />
                </View>
                <Text style={styles.barValue}>{toEnergy(b.kcal, energyUnit)}</Text>
              </View>
            );
          })}
          {targets?.targetKcal ? (
            <Text style={styles.cardFootnote}>
              {isWeekly
                ? `Target: ${toEnergy(targets.targetKcal, energyUnit)} ${energyUnitLabel(energyUnit)}/day. Each bar is a weekly average; within ${pctLabel(ADHERENCE_TOLERANCE.kcal)} turns green.`
                : `Target: ${toEnergy(targets.targetKcal, energyUnit)} ${energyUnitLabel(energyUnit)}. Bars within ${pctLabel(ADHERENCE_TOLERANCE.kcal)} turn green.`}
            </Text>
          ) : (
            <Text style={styles.cardFootnote}>
              Set your calorie target in Precision Coaching to see adherence colours.
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
            <Text style={styles.sectionLabel}>PROTEIN</Text>
            <Card style={styles.card}>
              <Text style={styles.proteinHeadline}>
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
              <Text style={styles.cardFootnote}>
                {targets?.proteinG
                  ? `Hit = within target range. Faint line is your ${targets.proteinG} g target.`
                  : 'Hit = within target range.'}
              </Text>
            </Card>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>MACRO ADHERENCE</Text>
        <Card style={styles.card}>
          {adherence && adherence.logged > 0 ? (
            <>
              <AdherenceRow label="Calories" hit={adherence.kcalDays}  total={adherence.logged} />
              <AdherenceRow label="Protein"  hit={adherence.pDays}     total={adherence.logged} />
              <AdherenceRow label="Carbs"    hit={adherence.cDays}     total={adherence.logged} />
              <AdherenceRow label="Fat"      hit={adherence.fDays}     total={adherence.logged} />
              <AdherenceRow label="Fibre"    hit={adherence.fibreDays} total={adherence.logged} />
              <Text style={styles.cardFootnote}>
                Out of {adherence.logged} {adherence.logged === 1 ? 'day' : 'days'} logged. Hit = within target range.
              </Text>
              <Text style={styles.cardFootnote}>
                Fibre counts on days you reached {FIBRE_AIM_G} g or more. More is fine.
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>
              Log a few days to see your last {windowDays} days.
            </Text>
          )}
        </Card>

        {/* Nutrient averages (build gap #18): plain mean grams/day per macro
            over the window. Adherence-NEUTRAL by design, value in textPrimary,
            label in textMuted, no good/bad colour, no target, no streak. Macro-
            level only (no sodium/sugar on the rollup; micronutrients gated). */}
        <Text style={styles.sectionLabel}>NUTRIENT AVERAGES</Text>
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
                  <Text style={styles.nutrientLabel}>{row.label}</Text>
                  <Text style={styles.nutrientValue}>{nutrientAverages.avg[row.key]} g/day</Text>
                </View>
              ))}
              <Text style={styles.cardFootnote}>
                Average over {nutrientAverages.days} {nutrientAverages.days === 1 ? 'day' : 'days'} logged.
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>
              Log a few days to see your nutrient averages.
            </Text>
          )}
        </Card>

        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => onExport('csv')}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityState={{ disabled: exporting }}
          accessibilityLabel={`Export the last ${windowDays} days as a CSV file`}
        >
          {exporting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.exportBtnText}>Export {windowDays} days as CSV</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportBtnSecondary}
          onPress={() => onExport('pdf')}
          disabled={exporting}
          accessibilityRole="button"
          accessibilityState={{ disabled: exporting }}
          accessibilityLabel={`Export the last ${windowDays} days as a PDF report to share with a coach or GP`}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={styles.exportBtnSecondaryText}>Export as PDF report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdherenceRow({ label, hit, total }) {
  const pct = total > 0 ? Math.round((hit / total) * 100) : 0;
  return (
    <View style={styles.adherenceRow} accessible accessibilityLabel={`${label}, hit ${hit} of ${total} days`}>
      <Text style={styles.adherenceLabel}>{label}</Text>
      <View style={styles.adherenceTrack}>
        <View style={[styles.adherenceFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.adherenceValue}>{hit}/{total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...type.title, color: colors.textPrimary },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  windowBar: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  windowChip: {
    flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  windowChipOn: { borderColor: colors.primary, backgroundColor: colors.surface2 },
  windowChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  windowChipTextOn: { color: colors.primary },

  sectionLabel: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardFootnote: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
  proteinHeadline: { ...type.title, color: colors.textPrimary },
  proteinChartWrap: { marginTop: spacing.md },
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

  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    minHeight: 48,
  },
  exportBtnText: { ...type.bodyStrong, color: colors.onPrimary },
  exportBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    minHeight: 48,
    marginTop: spacing.sm,
  },
  exportBtnSecondaryText: { ...type.bodyStrong, color: colors.primary },
});
