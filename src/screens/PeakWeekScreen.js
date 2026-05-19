import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, parse, isValid } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import {
  buildPeakWeek, peakWeekToText, FEDERATIONS, PEAK_WEEK_DISCLAIMER,
} from '../lib/peakWeekEngine';
import {
  savePeakWeekPlan, getActivePeakWeekPlan, getLatestBodyWeight,
} from '../lib/database';

let FileSystem;
let Sharing;
try { FileSystem = require('expo-file-system'); } catch (_) {}
try { Sharing = require('expo-sharing'); } catch (_) {}

// Parse a UK-format date string (dd/MM/yyyy) into yyyy-MM-dd, or null.
function parseUKDate(str) {
  if (!str) return null;
  const cleaned = str.trim().replace(/[.\-]/g, '/');
  const d = parse(cleaned, 'dd/MM/yyyy', new Date());
  if (!isValid(d)) return null;
  return format(d, 'yyyy-MM-dd');
}

const PHASE_COLORS = {
  depletion: colors.textSecondary,
  load: colors.primary,
  taper: colors.warning,
  show: colors.gold,
};

export default function PeakWeekScreen({ navigation }) {
  const { user } = useAppStore();

  const [showDateText, setShowDateText] = useState('');
  const [federation, setFederation] = useState('BPA');
  const [bodyweight, setBodyweight] = useState('');
  const [lean, setLean] = useState('');
  const [prepCarbs, setPrepCarbs] = useState('3');
  const [prepSodium, setPrepSodium] = useState('3000');
  const [prepWater, setPrepWater] = useState('4');

  const [plan, setPlan] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  useFocusEffect(useCallback(() => {
    if (user?.id) hydrate();
  }, [user?.id]));

  async function hydrate() {
    try {
      const saved = await getActivePeakWeekPlan(user.id);
      if (saved) {
        if (saved.showDate) {
          const d = new Date(saved.showDate);
          if (!isNaN(d.getTime())) setShowDateText(format(d, 'dd/MM/yyyy'));
        }
        if (saved.federation) setFederation(saved.federation);
        if (saved.currentBodyweight != null) setBodyweight(String(saved.currentBodyweight));
        if (saved.leanEstimate != null) setLean(String(saved.leanEstimate));
        if (saved.prepCarbsPerKg != null) setPrepCarbs(String(saved.prepCarbsPerKg));
        if (saved.prepSodiumMg != null) setPrepSodium(String(saved.prepSodiumMg));
        if (saved.prepWaterL != null) setPrepWater(String(saved.prepWaterL));
        rebuild(saved);
      } else {
        // Pre-fill bodyweight from latest body metric if available
        const bw = await getLatestBodyWeight(user.id).catch(() => null);
        if (bw?.weightKg) setBodyweight(String(bw.weightKg));
      }
    } catch (_) {}
  }

  function rebuild(saved) {
    const built = buildPeakWeek({
      showDate: saved.showDate,
      federation: saved.federation,
      bodyweightKg: saved.currentBodyweight,
      leanKg: saved.leanEstimate,
      prepCarbsPerKg: saved.prepCarbsPerKg,
      prepSodiumMg: saved.prepSodiumMg,
      prepWaterL: saved.prepWaterL,
    });
    setPlan(built);
  }

  async function handleBuild() {
    const bw = parseFloat(bodyweight);
    if (isNaN(bw) || bw <= 0) {
      Alert.alert('Bodyweight needed', 'Enter your current bodyweight in kg.');
      return;
    }
    const leanKg = parseFloat(lean);
    const showDateISO = parseUKDate(showDateText);
    if (showDateText && !showDateISO) {
      Alert.alert('Check the date', 'Use DD/MM/YYYY, e.g. 04/10/2026.');
      return;
    }

    const inputs = {
      showDate: showDateISO,
      federation,
      bodyweightKg: bw,
      leanKg: !isNaN(leanKg) && leanKg > 0 ? leanKg : bw * 0.9,
      prepCarbsPerKg: parseFloat(prepCarbs) || 3,
      prepSodiumMg: parseFloat(prepSodium) || 3000,
      prepWaterL: parseFloat(prepWater) || 4,
    };

    const built = buildPeakWeek(inputs);
    setPlan(built);
    setShowDisclaimer(true);

    if (user?.id) {
      await savePeakWeekPlan(user.id, inputs).catch(() => {});
    }
  }

  async function handleShare() {
    if (!plan) return;
    if (!FileSystem || !Sharing) {
      Alert.alert('Sharing unavailable', 'Export is not available on this device.');
      return;
    }
    try {
      const meta = {
        showDateLabel: showDateText
          ? `${showDateText} (${federation})`
          : federation,
      };
      const text = peakWeekToText(plan, meta);
      const fileUri = `${FileSystem.cacheDirectory}volyume_peak_week.csv`;
      await FileSystem.writeAsStringAsync(fileUri, text, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share peak week with your coach',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Saved', `Peak week written to ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          A deterministic 7-day carb-deplete → load → water &amp; sodium taper,
          built from your prep numbers. Order is non-negotiable.
        </Text>

        {/* ── Inputs ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Show date</Text>
          <TextInput
            style={styles.input}
            value={showDateText}
            onChangeText={setShowDateText}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.fieldLabel}>Federation</Text>
          <View style={styles.chipRow}>
            {FEDERATIONS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, federation === f && styles.chipActive]}
                onPress={() => setFederation(f)}
              >
                <Text style={[styles.chipText, federation === f && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Bodyweight (kg)</Text>
              <TextInput
                style={styles.input}
                value={bodyweight}
                onChangeText={setBodyweight}
                keyboardType="decimal-pad"
                placeholder="80"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Lean estimate (kg)</Text>
              <TextInput
                style={styles.input}
                value={lean}
                onChangeText={setLean}
                keyboardType="decimal-pad"
                placeholder="72"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>PREP-PHASE BASELINE</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Carbs (g/kg)</Text>
              <TextInput
                style={styles.input}
                value={prepCarbs}
                onChangeText={setPrepCarbs}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Sodium (mg)</Text>
              <TextInput
                style={styles.input}
                value={prepSodium}
                onChangeText={setPrepSodium}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Water (L)</Text>
              <TextInput
                style={styles.input}
                value={prepWater}
                onChangeText={setPrepWater}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.buildBtn} onPress={handleBuild} activeOpacity={0.85}>
            <Ionicons name="construct-outline" size={18} color={colors.background} />
            <Text style={styles.buildBtnText}>Build peak week</Text>
          </TouchableOpacity>
        </View>

        {/* ── Disclaimer ─────────────────────────────────── */}
        {plan && showDisclaimer && (
          <View style={styles.disclaimer}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={styles.disclaimerText}>{PEAK_WEEK_DISCLAIMER}</Text>
            <TouchableOpacity
              onPress={() => setShowDisclaimer(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Timeline ───────────────────────────────────── */}
        {plan && (
          <>
            {plan.days.map((d, i) => (
              <View
                key={d.dayOffset}
                style={[styles.dayCard, d.isShowDay && styles.dayCardShow]}
              >
                <View style={styles.dayHeader}>
                  <View style={[styles.phaseDot, { backgroundColor: PHASE_COLORS[d.phase] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayTitle, d.isShowDay && styles.dayTitleShow]}>
                      {d.dayLabel}
                      {d.weekday ? ` · ${d.weekday}` : ''}
                    </Text>
                    <Text style={styles.daySub}>
                      {d.dateLabel ? `${d.dateLabel} · ` : ''}{d.phaseLabel}
                    </Text>
                  </View>
                  {d.isShowDay && (
                    <Ionicons name="trophy" size={18} color={colors.gold} />
                  )}
                </View>

                <Text style={styles.phaseNote}>{d.phaseNote}</Text>

                <View style={styles.macroGrid}>
                  <Metric label="kcal" value={d.kcal} />
                  <Metric label="Protein" value={`${d.proteinG}g`} />
                  <Metric label="Carbs" value={`${d.carbsG}g`} accent />
                  <Metric label="Fat" value={`${d.fatG}g`} />
                </View>
                <View style={styles.macroGrid}>
                  <Metric label="Water" value={`${d.waterL} L`} />
                  <Metric label="Sodium" value={`${d.sodiumMg} mg`} />
                  <Metric label="Posing" value={`${d.posingMin} min`} />
                </View>

                <View style={styles.trainingRow}>
                  <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.trainingText}>{d.training}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={18} color={colors.primary} />
              <Text style={styles.shareBtnText}>Send to coach (CSV)</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, accent && { color: colors.primary }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  intro: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black,
    color: colors.textMuted, letterSpacing: 1.5, marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.inputBg, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  chipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  chipTextActive: { color: colors.primary },

  buildBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, marginTop: spacing.lg,
  },
  buildBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },

  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.warningBg, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.warning + '55',
  },
  disclaimerText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17 },

  dayCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  dayCardShow: { borderColor: colors.gold, backgroundColor: 'rgba(255, 215, 0, 0.06)' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  dayTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  dayTitleShow: { color: colors.gold },
  daySub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  phaseNote: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17 },

  macroGrid: { flexDirection: 'row', gap: spacing.sm },
  metric: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingVertical: spacing.sm, alignItems: 'center', gap: 2,
  },
  metricValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
  metricLabel: { fontSize: 10, color: colors.textMuted },

  trainingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trainingText: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.lg, paddingVertical: spacing.lg,
    borderWidth: 1, borderColor: colors.primary,
  },
  shareBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
});
