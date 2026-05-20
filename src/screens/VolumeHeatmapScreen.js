import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InfoTooltip from '../components/InfoTooltip';
import BodyDiagramHeatmap from '../components/BodyDiagramHeatmap';
import { getCompletedWorkoutSets, getAllExercises, getWeeklyVolumeByMuscle } from '../lib/database';
import {
  calculateWeeklyVolume, VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES, getVolumeStatus,
} from '../lib/algorithms';
import { useFocusEffect } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';

const WINDOW_OPTIONS = [
  { weeks: 1, label: '1 week' },
  { weeks: 2, label: '2 weeks' },
  { weeks: 4, label: '4 weeks' },
];

export default function VolumeHeatmapScreen() {
  const { user, units } = useAppStore();
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [previousVolume, setPreviousVolume] = useState({});
  const [windowWeeks, setWindowWeeks] = useState(1);
  const [customLandmarks, setCustomLandmarks] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [trendData, setTrendData] = useState([]);

  useFocusEffect(useCallback(() => { loadData(); }, [user?.id, windowWeeks]));

  useEffect(() => { loadData(); }, [windowWeeks]);

  async function loadData() {
    if (!user?.id) return;

    const windowMs = windowWeeks * 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const windowStart = now - windowMs;
    const prevWindowStart = now - 2 * windowMs;

    const allSets = await getCompletedWorkoutSets(user.id);
    const recentSets = allSets.filter(s => s.createdAt >= windowStart);
    const prevSets = allSets.filter(s => s.createdAt >= prevWindowStart && s.createdAt < windowStart);

    const allExercises = await getAllExercises();
    const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

    const volume = calculateWeeklyVolume(recentSets, exerciseMap);
    const prevVolume = calculateWeeklyVolume(prevSets, exerciseMap);
    setWeeklyVolume(volume);
    setPreviousVolume(prevVolume);

    const trend = await getWeeklyVolumeByMuscle(user.id, 4);
    setTrendData(trend);

    // Load locally stored custom landmarks (Stage 1 — no Supabase yet)
    const stored = await AsyncStorage.getItem(`@volyume_landmarks_${user.id}`).catch(() => null);
    let parsed = null;
    if (stored) {
      try { parsed = JSON.parse(stored); } catch (_) {}
    }
    if (parsed) {
      setCustomLandmarks(parsed);
      setEditValues(parsed);
    } else {
      const defaults = {};
      for (const [m, v] of Object.entries(VOLUME_LANDMARKS)) {
        defaults[m] = { mev: v.mev, mav: v.mav, mrv: v.mrv };
      }
      setEditValues(defaults);
    }
  }

  async function saveLandmarks() {
    if (!user?.id) return;
    const map = {};
    for (const [muscle, vals] of Object.entries(editValues)) {
      map[muscle] = {
        mev: parseInt(vals.mev) || 0,
        mav: parseInt(vals.mav) || 0,
        mrv: parseInt(vals.mrv) || 0,
      };
    }
    await AsyncStorage.setItem(`@volyume_landmarks_${user.id}`, JSON.stringify(map));
    setCustomLandmarks(map);
    setEditing(false);
    Alert.alert('Saved', 'Volume targets updated.');
  }

  async function resetToDefaults() {
    Alert.alert('Reset volume targets?', 'This will restore the default recommended values.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await AsyncStorage.removeItem(`@volyume_landmarks_${user.id}`);
          setCustomLandmarks(null);
          const defaults = {};
          for (const [m, v] of Object.entries(VOLUME_LANDMARKS)) defaults[m] = { ...v };
          setEditValues(defaults);
          setEditing(false);
        },
      },
    ]);
  }

  const effectiveLandmarks = customLandmarks || null;
  const muscles = Object.keys(VOLUME_LANDMARKS);

  // ScrollView + per-row refs so the body diagram can scroll the user to a
  // muscle's bar when its region is tapped.
  const scrollRef = useRef(null);
  const heatmapCardRef = useRef(null);
  const rowOffsets = useRef({});

  // Build the diagram input: for each known muscle, attach workingSets +
  // status + colour from getVolumeStatus. Muscles with no data fall through
  // to the neutral fill inside BodyDiagramHeatmap.
  const volumeByMuscle = useMemo(() => {
    const map = {};
    for (const muscle of muscles) {
      const sets = Math.round(weeklyVolume[muscle]?.workingSets || 0);
      const { status, color, label } = getVolumeStatus(sets, muscle, effectiveLandmarks);
      map[muscle] = { workingSets: sets, status, color, label };
    }
    return map;
  }, [weeklyVolume, effectiveLandmarks, muscles]);

  // Muscles trained at least once in the 4-week trend window, in heatmap order.
  const trainedMuscles = useMemo(() => {
    if (!trendData.length) return [];
    return muscles.filter(muscle =>
      trendData.some(week => (week.volumeByMuscle[muscle] || 0) > 0),
    );
  }, [trendData, muscles]);

  const handleMuscleTap = useCallback((muscleKey) => {
    const offset = rowOffsets.current[muscleKey];
    if (offset == null || !scrollRef.current) return;
    // Add a small headroom above the row so the label is visible below the diagram.
    scrollRef.current.scrollTo({ y: Math.max(offset - spacing.lg, 0), animated: true });
  }, []);

  const windowNoteText =
    windowWeeks === 1
      ? 'Showing sets from the last week'
      : windowWeeks === 2
      ? 'Showing sets from the last 2 weeks'
      : 'Showing sets from the last 4 weeks';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {/* Anatomical body heatmap — tap a muscle to jump to its bar below */}
        <BodyDiagramHeatmap
          volumeByMuscle={volumeByMuscle}
          onMuscleTap={handleMuscleTap}
        />

        {/* Rolling window selector */}
        <View style={styles.windowSelector}>
          {WINDOW_OPTIONS.map(opt => {
            const active = windowWeeks === opt.weeks;
            return (
              <TouchableOpacity
                key={opt.weeks}
                style={[
                  styles.windowBtn,
                  active
                    ? { backgroundColor: colors.primaryBg, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setWindowWeeks(opt.weeks)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.windowBtnText,
                    { color: active ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rolling window note */}
        <View style={styles.windowNote}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.windowNoteText}>{windowNoteText}</Text>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <LegendItem color={colors.textMuted} label="Below minimum" />
          <LegendItem color={colors.success} label="Optimal" />
          <LegendItem color={colors.warning} label="Getting close" />
          <LegendItem color={colors.error} label="Too much" />
          <InfoTooltip size={11} text={
            'Each bar shows weekly sets for a muscle group.\n\n' +
            'The two tick marks on each bar are:\n' +
            '  First tick: the least amount needed to maintain or grow\n' +
            '  Second tick: the sweet spot for growth\n' +
            '  End of bar: beyond this, recovery suffers\n\n' +
            'Aim to stay between the two ticks most weeks. You can customise these targets using the "Edit Volume Targets" button below.'
          } />
        </View>

        {/* Muscle Rows */}
        <View
          ref={heatmapCardRef}
          style={styles.heatmapCard}
          onLayout={(e) => {
            // Remember the card's y so per-row offsets can be added to it.
            rowOffsets.current.__cardY = e.nativeEvent.layout.y;
          }}
        >
          {muscles.map(muscle => {
            const data = weeklyVolume[muscle] || { workingSets: 0 };
            const prevData = previousVolume[muscle] || { workingSets: 0 };
            const sets = Math.round(data.workingSets || 0);
            const prevSets = Math.round(prevData.workingSets || 0);
            const landmarks = effectiveLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle];
            const { color } = getVolumeStatus(sets, muscle, effectiveLandmarks);
            const mrv = landmarks.mrv || 20;
            const fillPct = Math.min(sets / mrv, 1);
            const ghostFillPct = Math.min(prevSets / mrv, 1);

            return (
              <View
                key={muscle}
                style={styles.muscleRow}
                onLayout={(e) => {
                  // Per-row y is relative to the heatmap card; combine with the
                  // card's y to get a position inside the ScrollView.
                  const rowY = e.nativeEvent.layout.y;
                  rowOffsets.current[muscle] = (rowOffsets.current.__cardY || 0) + rowY;
                }}
              >
                <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${ghostFillPct * 100}%`,
                        backgroundColor: colors.textMuted,
                        opacity: 0.25,
                        position: 'absolute',
                      },
                    ]}
                  />
                  <View style={[styles.barFill, { width: `${fillPct * 100}%`, backgroundColor: color }]} />
                  <View style={[styles.landmark, { left: `${(landmarks.mev / mrv) * 100}%` }]} />
                  <View style={[styles.landmark, { left: `${(landmarks.mav / mrv) * 100}%` }]} />
                </View>
                <Text style={[styles.setsCount, { color }]}>{sets}</Text>
                <Text style={styles.mrvLabel}>/{mrv}</Text>
              </View>
            );
          })}
        </View>

        {/* 4-week trend — hidden for new users with no data */}
        {trainedMuscles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4-week trend</Text>
            {trainedMuscles.map(muscle => (
              <MuscleTrendRow
                key={muscle}
                muscle={muscle}
                trendData={trendData}
                customLandmarks={effectiveLandmarks}
              />
            ))}
          </View>
        )}

        {/* Edit Volume Targets */}
        {editing ? (
          <View style={styles.editSection}>
            <Text style={styles.editTitle}>Edit Volume Targets</Text>
            <Text style={styles.editSubtitle}>Weekly sets per muscle · Minimum / Target / Ceiling</Text>
            {muscles.map(muscle => (
              <View key={muscle} style={styles.editRow}>
                <Text style={styles.editMuscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
                <View style={styles.editInputs}>
                  {[['mev', 'Min'], ['mav', 'Target'], ['mrv', 'Max']].map(([key, label]) => (
                    <View key={key} style={styles.editInputGroup}>
                      <Text style={styles.editInputLabel}>{label}</Text>
                      <TextInput
                        style={styles.editInput}
                        value={String(editValues[muscle]?.[key] ?? '')}
                        onChangeText={v => setEditValues(prev => ({
                          ...prev,
                          [muscle]: { ...prev[muscle], [key]: v },
                        }))}
                        keyboardType="number-pad"
                        selectTextOnFocus
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveLandmarks}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>Edit Volume Targets</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={resetToDefaults}>
              <Text style={styles.resetBtnText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const SPARK_BAR_WIDTH = 8;
const SPARK_BAR_GAP = 2;
const SPARK_MAX_HEIGHT = 24;
const SPARK_EMPTY_HEIGHT = 3;

function MuscleTrendRow({ muscle, trendData, customLandmarks }) {
  // trendData is the 4-week array (oldest → newest), each entry has volumeByMuscle
  const counts = trendData.map(w => w.volumeByMuscle[muscle] || 0);
  const maxCount = Math.max(...counts, 1); // avoid divide-by-zero

  return (
    <View style={trendStyles.row}>
      <Text style={trendStyles.muscleName} numberOfLines={1}>
        {MUSCLE_DISPLAY_NAMES[muscle]}
      </Text>
      <View style={trendStyles.sparkContainer}>
        {counts.map((count, idx) => {
          const isEmpty = count === 0;
          const barHeight = isEmpty
            ? SPARK_EMPTY_HEIGHT
            : Math.max(SPARK_EMPTY_HEIGHT, Math.round((count / maxCount) * SPARK_MAX_HEIGHT));
          const { color } = getVolumeStatus(count, muscle, customLandmarks);
          const barColor = isEmpty ? colors.surface3 : color;
          return (
            <View
              key={idx}
              style={[
                trendStyles.sparkBar,
                {
                  width: SPARK_BAR_WIDTH,
                  height: barHeight,
                  backgroundColor: barColor,
                  marginRight: idx < counts.length - 1 ? SPARK_BAR_GAP : 0,
                },
              ]}
            />
          );
        })}
      </View>
      <Text
        style={[
          trendStyles.currentCount,
          { color: getVolumeStatus(counts[counts.length - 1], muscle, customLandmarks).color },
        ]}
      >
        {counts[counts.length - 1]}
      </Text>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  muscleName: {
    width: 80,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sparkContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: SPARK_MAX_HEIGHT,
  },
  sparkBar: {
    borderRadius: 2,
  },
  currentCount: {
    width: 20,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  windowSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  windowBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  windowBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  windowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  windowNoteText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heatmapCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muscleName: {
    width: 90,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    minWidth: 2,
  },
  landmark: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  setsCount: {
    width: 22,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
  },
  mrvLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    width: 24,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBtnText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  resetBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  resetBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
  editSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  editSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: -spacing.sm },
  editRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editMuscleName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  editInputs: { flexDirection: 'row', gap: spacing.sm },
  editInputGroup: { flex: 1, gap: spacing.xs },
  editInputLabel: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  editInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
});
