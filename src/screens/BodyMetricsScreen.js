import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { supabase } from '../lib/supabase';
import useAppStore from '../store/useAppStore';

const MEASUREMENTS = [
  { key: 'chest', label: 'Chest' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms (flex)' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'quads', label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'calves', label: 'Calves' },
];

export default function BodyMetricsScreen() {
  const { user, units } = useAppStore();
  const [history, setHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    body_weight: '', chest: '', shoulders: '', arms: '', forearms: '',
    waist: '', hips: '', quads: '', hamstrings: '', calves: '',
    metric_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadHistory(); }, [user?.id]);

  async function loadHistory() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('metric_date', { ascending: false })
      .limit(20);
    setHistory(data || []);
  }

  async function saveMetrics() {
    if (!form.body_weight && !form.chest) {
      Alert.alert('Missing data', 'Enter at least body weight or one measurement.');
      return;
    }
    setSaving(true);
    const payload = { user_id: user.id };
    for (const [k, v] of Object.entries(form)) {
      if (k === 'notes' || k === 'metric_date') payload[k] = v;
      else if (v !== '') payload[k] = parseFloat(v);
    }
    const { error } = await supabase.from('body_metrics').insert(payload);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setShowForm(false);
    setForm({
      body_weight: '', chest: '', shoulders: '', arms: '', forearms: '',
      waist: '', hips: '', quads: '', hamstrings: '', calves: '',
      metric_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
    });
    await loadHistory();
  }

  const latest = history[0];
  const prev = history[1];

  function getDelta(key) {
    if (!latest?.[key] || !prev?.[key]) return null;
    return (latest[key] - prev[key]).toFixed(1);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Latest Snapshot */}
        {latest && (
          <View style={styles.snapshotCard}>
            <Text style={styles.sectionTitle}>LATEST — {format(new Date(latest.metric_date), 'MMM d, yyyy')}</Text>
            {latest.body_weight && (
              <View style={styles.weightRow}>
                <Text style={styles.weightValue}>{latest.body_weight} {units}</Text>
                {getDelta('body_weight') && (
                  <DeltaBadge delta={parseFloat(getDelta('body_weight'))} units={units} />
                )}
              </View>
            )}
            <View style={styles.measureGrid}>
              {MEASUREMENTS.map(m => latest[m.key] ? (
                <View key={m.key} style={styles.measureCell}>
                  <Text style={styles.measureValue}>{latest[m.key]} cm</Text>
                  <Text style={styles.measureLabel}>{m.label}</Text>
                  {getDelta(m.key) && (
                    <DeltaBadge delta={parseFloat(getDelta(m.key))} units="cm" small />
                  )}
                </View>
              ) : null)}
            </View>
          </View>
        )}

        {/* Log Button */}
        <TouchableOpacity style={styles.logBtn} onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'chevron-up' : 'add-circle'} size={20} color={colors.background} />
          <Text style={styles.logBtnText}>{showForm ? 'Cancel' : 'Log Body Weight'}</Text>
        </TouchableOpacity>

        {/* Log Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Entry</Text>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Date</Text>
              <TextInput
                style={styles.formInput}
                value={form.metric_date}
                onChangeText={v => setForm(f => ({ ...f, metric_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Body Weight ({units})</Text>
              <TextInput
                style={styles.formInput}
                value={form.body_weight}
                onChangeText={v => setForm(f => ({ ...f, body_weight: v }))}
                keyboardType="decimal-pad"
                placeholder="82.5"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            {MEASUREMENTS.map(m => (
              <View key={m.key} style={styles.formRow}>
                <Text style={styles.formLabel}>{m.label} (cm)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form[m.key]}
                  onChangeText={v => setForm(f => ({ ...f, [m.key]: v }))}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ))}
            <TextInput
              style={[styles.formInput, styles.notesInput]}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={saveMetrics}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History */}
        {history.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HISTORY</Text>
            {history.slice(0, 10).map(entry => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{format(new Date(entry.metric_date), 'MMM d, yyyy')}</Text>
                {entry.body_weight && (
                  <Text style={styles.historyWeight}>{entry.body_weight} {units}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeltaBadge({ delta, units, small }) {
  const isUp = delta > 0;
  const color = isUp ? colors.success : colors.error;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
      <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={small ? 11 : 14} color={color} />
      <Text style={{ fontSize: small ? 10 : fontSize.xs, color, fontWeight: fontWeight.semibold }}>
        {isUp ? '+' : ''}{delta} {units}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  snapshotCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  weightValue: { fontSize: fontSize.xxxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  measureCell: {
    minWidth: '30%',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  measureValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  measureLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  logBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formLabel: { width: 130, fontSize: fontSize.sm, color: colors.textSecondary },
  formInput: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: { flex: undefined, minHeight: 60 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  section: { gap: spacing.sm },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyDate: { fontSize: fontSize.sm, color: colors.textSecondary },
  historyWeight: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
});
