import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getAllRoutines, createRoutine, softDeleteRoutine } from '../lib/database';
import useAppStore from '../store/useAppStore';

export default function RoutineBuilderScreen({ navigation }) {
  const { user } = useAppStore();
  const [routines, setRoutines] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [splitType, setSplitType] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadRoutines(); }, [user?.id]);

  async function loadRoutines() {
    if (!user?.id) return;
    const all = await getAllRoutines(user.id);
    setRoutines(all.filter(r => r.isActive));
  }

  async function handleCreateRoutine() {
    if (!newName.trim()) { Alert.alert('Name required', 'Enter a name for the routine.'); return; }
    setCreating(true);
    await createRoutine(user.id, newName.trim(), newDesc.trim() || null, splitType || null);
    setNewName(''); setNewDesc(''); setSplitType('');
    setShowCreate(false);
    setCreating(false);
    await loadRoutines();
  }

  async function deleteRoutine(routine) {
    Alert.alert('Delete routine?', `"${routine.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await softDeleteRoutine(routine.id);
          await loadRoutines();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={routines}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle" size={22} color={colors.background} />
            <Text style={styles.createBtnText}>Create New Routine</Text>
          </TouchableOpacity>
        }
        renderItem={({ item: routine }) => (
          <View style={styles.routineCard}>
            <TouchableOpacity
              style={styles.routineMain}
              onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
            >
              <Text style={styles.routineName}>{routine.name}</Text>
              {routine.description ? <Text style={styles.routineDesc}>{routine.description}</Text> : null}
              {routine.splitType ? (
                <View style={styles.splitBadge}>
                  <Text style={styles.splitBadgeText}>{routine.splitType}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <View style={styles.routineActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => deleteRoutine(routine)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={48} color={colors.surface3} />
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyText}>Create your first training split above</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Routine</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Routine name (e.g. PPL Push Day)"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.modalInput}
              value={splitType}
              onChangeText={setSplitType}
              placeholder="Split type (PPL, Upper/Lower, etc.)"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, creating && styles.btnDisabled]}
                onPress={handleCreateRoutine}
                disabled={creating}
              >
                <Text style={styles.modalCreateText}>Create</Text>
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
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routineMain: { flex: 1, gap: spacing.xs },
  routineName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  routineDesc: { fontSize: fontSize.sm, color: colors.textSecondary },
  splitBadge: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  splitBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  routineActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
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
  modalInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  modalCancel: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: fontSize.md, color: colors.textSecondary },
  modalCreate: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  modalCreateText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
});
