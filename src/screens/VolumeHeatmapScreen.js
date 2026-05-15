import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { database } from '../lib/database';
import { supabase } from '../lib/supabase';
import {
  calculateWeeklyVolume, VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES, getVolumeStatus,
} from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

export default function VolumeHeatmapScreen() {
  const { user, units } = useAppStore();
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [customLandmarks, setCustomLandmarks] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const allSets = await database.get('workout_sets').query().fetch();
    const recentSets = allSets.filter(s => s.userId === user.id && s.createdAt >= weekAgo);
    const allExercises = await database.get('exercises').query().fetch();
    const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
    const volume = calculateWeeklyVolume(recentSets, exerciseMap);
    setWeeklyVolume(volume);

    const { data: landmarks } = await supabase
      .from('volume_landmarks')
      .select('*')
      .eq('user_id', user.id);

    if (landmarks && landmarks.length > 0) {
      const map = {};
      for (const l of landmarks) map[l.muscle_group] = { mev: l.mev, mav: l.mav, mrv: l.mrv };
      setCustomLandmarks(map);
      setEditValues(map);
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
    const rows = Object.entries(editValues).map(([muscle, vals]) => ({
      user_id: user.id,
      muscle_group: muscle,
      mev: parseInt(vals.mev) || 0,
      mav: parseInt(vals.mav) || 0,
      mrv: parseInt(vals.mrv) || 0,
    }));
    const { error } = await supabase.from('volume_landmarks').upsert(rows);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      const map = {};
      for (const r of rows) map[r.muscle_group] = { mev: r.mev, mav: r.mav, mrv: r.mrv };
      setCustomLandmarks(map);
      setEditing(false);
      Alert.alert('Saved', 'Volume landmarks updated.');
    }
  }

  async function resetToDefaults() {
    Alert.alert('Reset landmarks?', 'This will restore RP Hypertrophy defaults.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await supabase.from('volume_landmarks').delete().eq('user_id', user.id);
          setCustomLandmarks(null);
          const defaults = {};
          for (const [m, v] of Object.entries(VOLUME_LANDMARKS)) {
            defaults[m] = { ...v };
          }
          setEditValues(defaults);
          setEditing(false);
        },
      },
    ]);
  }

  const effectiveLandmarks = customLandmarks || null;
  const muscles = Object.keys(VOLUME_LANDMARKS);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Legend */}
        <View style={styles.legendRow}>
          <LegendItem color={colors.textMuted} label="Below MEV" />
          <LegendItem color={colors.success} label="Optimal (MEV–MAV)" />
          <LegendItem color={colors.warning} label="Near MRV" />
          <LegendItem color={colors.error} label="Over MRV" />
        </View>

        {/* Muscle Rows */}
        <View style={styles.heatmapCard}>
          {muscles.map(muscle => {
            const data = weeklyVolume[muscle] || { hardSets: 0 };
            const sets = Math.round(data.hardSets || 0);
            const landmarks = effectiveLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle];
            const { color, label } = getVolumeStatus(sets, muscle, effectiveLandmarks);
            const mrv = landmarks.mrv || 20;
            const fillPct = Math.min(sets / mrv, 1.2);

            return (
              <View key={muscle} style={styles.muscleRow}>
                <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
                <View style={styles.barContainer}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min(fillPct, 1) * 100}%`, backgroundColor: color }]} />
                    <View style={[styles.landmark, { left: `${(landmarks.mev / mrv) * 100}%` }]}>
                      <Text style={styles.landmarkLabel}>MEV</Text>
                    </View>
                    <View style={[styles.landmark, { left: `${(landmarks.mav / mrv) * 100}%` }]}>
                      <Text style={styles.landmarkLabel}>MAV</Text>
                    </View>
                  </View>
                  <View style={styles.barStats}>
                    <Text style={[styles.setsCount, { color }]}>{sets}</Text>
                    <Text style={styles.landmarkRange}>
                      {landmarks.mev}–{landmarks.mav}–{landmarks.mrv}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Edit Landmarks */}
        {editing ? (
          <View style={styles.editSection}>
            <Text style={styles.editTitle}>Edit Volume Landmarks</Text>
            <Text style={styles.editSubtitle}>Sets per week per muscle group</Text>
            {muscles.map(muscle => (
              <View key={muscle} style={styles.editRow}>
                <Text style={styles.editMuscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
                <View style={styles.editInputs}>
                  {['mev', 'mav', 'mrv'].map(key => (
                    <View key={key} style={styles.editInputGroup}>
                      <Text style={styles.editInputLabel}>{key.toUpperCase()}</Text>
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
              <Text style={styles.editBtnText}>Edit Landmarks</Text>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
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
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleRow: { gap: spacing.sm },
  muscleName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  barContainer: { gap: spacing.xs },
  barTrack: {
    height: 16,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    minWidth: 2,
  },
  landmark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.surface3,
    alignItems: 'center',
  },
  landmarkLabel: {
    position: 'absolute',
    top: -16,
    fontSize: 9,
    color: colors.textMuted,
  },
  barStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setsCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  landmarkRange: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
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
  editInputGroup: { flex: 1, gap: 4 },
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
