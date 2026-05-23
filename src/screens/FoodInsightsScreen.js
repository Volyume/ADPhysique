/**
 * FoodInsightsScreen - 7-day adherence (Move #1).
 *
 * Locked in MOVE_1_FOOD_FOUNDATION_AND_FFM.md and
 * UI_FLOWS_LOCKED.md. Three blocks:
 *   1. Seven days of kcal vs target as horizontal bars.
 *   2. Macro hit rate over those seven days.
 *   3. Export the diary as CSV.
 *
 * The Insights tab in the locked nav doesn't exist yet (still on the
 * legacy four-tab layout); we surface this screen via a header
 * button on Diary so the data is visible day one of the food layer.
 *
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getRollupsForRange, getFoodEntriesForRange,
} from '../lib/food/db';
import { getNutritionTargets } from '../lib/database';
import { exportDiaryCsv } from '../lib/food/csvExport';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

function isoDate(d) { return d.toISOString().slice(0, 10); }
function shift(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function last7DayIsoList() {
  const out = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) out.push(isoDate(shift(today, -i)));
  return out;
}

function dayLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

export default function FoodInsightsScreen({ navigation }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const [rollups, setRollups] = useState([]);
  const [targets, setTargets] = useState(null);
  const [exporting, setExporting] = useState(false);

  const days = useMemo(() => last7DayIsoList(), []);
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
  useEffect(() => { load(); }, [load]);

  const rollupByDate = useMemo(() => {
    const out = new Map();
    for (const r of rollups) out.set(r.entry_date, r);
    return out;
  }, [rollups]);

  const adherence = useMemo(() => {
    if (!targets) return null;
    let kcalDays = 0, pDays = 0, cDays = 0, fDays = 0, logged = 0;
    for (const d of days) {
      const r = rollupByDate.get(d);
      if (!r || r.entries_count === 0) continue;
      logged++;
      if (within(r.kcal_total, targets.targetKcal, 0.1)) kcalDays++;
      if (within(r.protein_g, targets.proteinG, 0.1)) pDays++;
      if (within(r.carbs_g, targets.carbsG, 0.15)) cDays++;
      if (within(r.fat_g, targets.fatG, 0.15)) fDays++;
    }
    return { kcalDays, pDays, cDays, fDays, logged };
  }, [days, rollupByDate, targets]);

  async function onExport() {
    if (!userId || exporting) return;
    setExporting(true);
    try {
      const entries = await getFoodEntriesForRange(userId, startDate, endDate);
      if (!entries.length) {
        Alert.alert('Nothing to export', 'No entries in the last seven days.');
        return;
      }
      await exportDiaryCsv({ userId, entries, startDate, endDate });
    } catch (e) {
      Alert.alert('Export failed', 'Try again.');
    } finally {
      setExporting(false);
    }
  }

  const maxKcal = useMemo(() => {
    let m = targets?.targetKcal ?? 0;
    for (const r of rollups) m = Math.max(m, r.kcal_total ?? 0);
    return m || 1;
  }, [rollups, targets]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insights</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>LAST 7 DAYS · CALORIES</Text>
        <View style={styles.card}>
          {days.map((d) => {
            const r = rollupByDate.get(d);
            const kcal = Math.round(r?.kcal_total ?? 0);
            const pct = Math.min(1, kcal / maxKcal);
            const targetMet = targets?.targetKcal
              ? Math.abs(kcal - targets.targetKcal) / targets.targetKcal <= 0.1
              : false;
            return (
              <View key={d} style={styles.barRow}>
                <Text style={styles.barDay}>{dayLabel(d)}</Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { width: `${Math.round(pct * 100)}%` },
                    targetMet && { backgroundColor: colors.success },
                  ]} />
                </View>
                <Text style={styles.barValue}>{kcal}</Text>
              </View>
            );
          })}
          {targets?.targetKcal ? (
            <Text style={styles.cardFootnote}>
              Target {targets.targetKcal} kcal. Green when within 10%.
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>MACRO ADHERENCE</Text>
        <View style={styles.card}>
          {adherence && adherence.logged > 0 ? (
            <>
              <AdherenceRow label="Calories" hit={adherence.kcalDays} total={adherence.logged} />
              <AdherenceRow label="Protein"  hit={adherence.pDays}    total={adherence.logged} />
              <AdherenceRow label="Carbs"    hit={adherence.cDays}    total={adherence.logged} />
              <AdherenceRow label="Fat"      hit={adherence.fDays}    total={adherence.logged} />
              <Text style={styles.cardFootnote}>
                {adherence.logged} of 7 days logged.
              </Text>
            </>
          ) : (
            <Text style={styles.emptyText}>
              Nothing logged in the last week.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.exportBtn}
          onPress={onExport}
          disabled={exporting}
          accessibilityLabel="Export the last seven days as a CSV file"
        >
          {exporting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color={colors.background} />
              <Text style={styles.exportBtnText}>Export 7 days as CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function within(value, target, tolerance) {
  if (target == null || target === 0) return false;
  return Math.abs(value - target) / target <= tolerance;
}

function AdherenceRow({ label, hit, total }) {
  const pct = total > 0 ? Math.round((hit / total) * 100) : 0;
  return (
    <View style={styles.adherenceRow}>
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
  headerTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  sectionLabel: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardFootnote: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barDay: { color: colors.textSecondary, fontSize: fontSize.sm, width: 36 },
  barTrack: {
    flex: 1, height: 12, borderRadius: 6,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
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

  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    minHeight: 48,
  },
  exportBtnText: { color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
