import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInWeeks } from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { database } from '../lib/database';
import useAppStore from '../store/useAppStore';

export default function MesocycleBuilderScreen({ navigation }) {
  const { user } = useAppStore();
  const [mesocycles, setMesocycles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    focus: '',
    deload_week: '4',
    auto_regulation: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadMesocycles(); }, [user?.id]);

  async function loadMesocycles() {
    if (!user?.id) return;
    const all = await database.get('mesocycles').query().fetch();
    const mine = all
      .filter(m => m.userId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt);
    setMesocycles(mine);
  }

  async function createMesocycle() {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    try {
      const startDate = new Date(form.start_date);
      const endDate = new Date(form.end_date);
      const durationWeeks = Math.max(1, differenceInWeeks(endDate, startDate));
      await database.write(async () => {
        await database.get('mesocycles').create(m => {
          m.userId = user.id;
          m.name = form.name.trim();
          m.startDate = form.start_date;
          m.endDate = form.end_date;
          m.durationWeeks = durationWeeks;
          m.focus = form.focus || null;
          m.isActive = true;
          m.deloadWeek = parseInt(form.deload_week, 10) || 4;
          m.autoRegulationEnabled = form.auto_regulation;
          m.updatedAt = Date.now();
        });
      });
      setShowCreate(false);
      await loadMesocycles();
    } finally {
      setSaving(false);
    }
  }

  function getCurrentWeek(mesocycle) {
    const start = new Date(mesocycle.startDate);
    const now = new Date();
    const week = differenceInWeeks(now, start) + 1;
    return Math.min(Math.max(week, 1), mesocycle.durationWeeks || 4);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={mesocycles}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle" size={22} color={colors.background} />
            <Text style={styles.createBtnText}>Create New Mesocycle</Text>
          </TouchableOpacity>
        }
        renderItem={({ item: meso }) => {
          const isActive = meso.isActive;
          const currentWeek = getCurrentWeek(meso);
          const totalWeeks = meso.durationWeeks || 4;
          return (
            <View style={[styles.mesoCard, isActive && styles.mesoCardActive]}>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
              <Text style={styles.mesoName}>{meso.name}</Text>
              <View style={styles.mesoMeta}>
                <Text style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} /> {' '}
                  {format(new Date(meso.startDate), 'MMM d')} — {format(new Date(meso.endDate), 'MMM d')}
                </Text>
                {meso.focus ? (
                  <Text style={styles.metaItem}>
                    <Ionicons name="flag-outline" size={13} /> {meso.focus}
                  </Text>
                ) : null}
              </View>
              {isActive && (
                <View style={styles.weekProgress}>
                  <Text style={styles.weekLabel}>Week {currentWeek} of {totalWeeks}</Text>
                  <View style={styles.weekBar}>
                    {Array.from({ length: totalWeeks }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.weekDot,
                          i < currentWeek && styles.weekDotActive,
                          i + 1 === meso.deloadWeek && styles.weekDotDeload,
                        ]}
                      />
                    ))}
                  </View>
                  {meso.deloadWeek && (
                    <Text style={styles.deloadLabel}>Deload: Week {meso.deloadWeek}</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.surface3} />
            <Text style={styles.emptyTitle}>No mesocycles yet</Text>
            <Text style={styles.emptyText}>Create your first training block</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Mesocycle</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. Chest Priority Block"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Start date</Text>
                <TextInput
                  style={styles.input}
                  value={form.start_date}
                  onChangeText={v => setForm(f => ({ ...f, start_date: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End date</Text>
                <TextInput
                  style={styles.input}
                  value={form.end_date}
                  onChangeText={v => setForm(f => ({ ...f, end_date: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <TextInput
              style={styles.input}
              value={form.focus}
              onChangeText={v => setForm(f => ({ ...f, focus: v }))}
              placeholder="Focus (e.g. Chest + Side Delts)"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.row}>
              <Text style={styles.inputLabel}>Deload week:</Text>
              {['3', '4', '5', '6'].map(w => (
                <TouchableOpacity
                  key={w}
                  style={[styles.weekChip, form.deload_week === w && styles.weekChipActive]}
                  onPress={() => setForm(f => ({ ...f, deload_week: w }))}
                >
                  <Text style={[styles.weekChipText, form.deload_week === w && styles.weekChipTextActive]}>
                    Week {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn2, saving && { opacity: 0.6 }]}
                onPress={createMesocycle}
                disabled={saving}
              >
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  createBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  mesoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mesoCardActive: {
    borderColor: colors.primary,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.primary,
    letterSpacing: 1,
  },
  mesoName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  mesoMeta: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { fontSize: fontSize.sm, color: colors.textSecondary },
  weekProgress: { gap: spacing.sm },
  weekLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  weekBar: { flexDirection: 'row', gap: spacing.sm },
  weekDot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface2,
  },
  weekDotActive: { backgroundColor: colors.primary },
  weekDotDeload: { backgroundColor: colors.warning + '80' },
  deloadLabel: { fontSize: fontSize.xs, color: colors.warning },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  inputGroup: { flex: 1, gap: spacing.xs },
  inputLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  weekChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  weekChipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  weekChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: { fontSize: fontSize.md, color: colors.textSecondary },
  createBtn2: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
});
