import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getActivePlan, getAllPlansForUser, getLibraryPlans,
  getWorkoutTemplates, getPlanWorkoutCounts, getAllRoutineExerciseCounts,
  setActivePlan, getRoutinesForPlan, createWorkout, getRoutineExercisesWithDetails,
  createProgramme, archivePlan, duplicatePlan, copyPlanFromLibrary,
  softDeleteRoutine,
} from '../lib/database';
import useAppStore from '../store/useAppStore';

export default function PlansScreen({ navigation }) {
  const { user, startWorkout } = useAppStore();
  const [activePlan, setActivePlanData] = useState(null);
  const [myPlans, setMyPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [libraryPlans, setLibraryPlans] = useState([]);
  const [planWorkoutCounts, setPlanWorkoutCounts] = useState({});
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id]),
  );

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [active, all, lib, tmpl, pwc, exc] = await Promise.all([
        getActivePlan(user.id),
        getAllPlansForUser(user.id),
        getLibraryPlans(),
        getWorkoutTemplates(user.id),
        getPlanWorkoutCounts(),
        getAllRoutineExerciseCounts(),
      ]);
      setActivePlanData(active || null);
      setMyPlans(all.filter(p => !active || p.id !== active.id));
      setLibraryPlans(lib);
      setTemplates(tmpl);
      setPlanWorkoutCounts(pwc);
      setExerciseCounts(exc);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleStartNextWorkout(plan) {
    const routines = await getRoutinesForPlan(plan.id);
    if (routines.length === 0) {
      Alert.alert('No workouts', 'This plan has no workouts yet. Add workouts in Plan Detail.');
      return;
    }
    const idx = (plan.nextWorkoutIndex || 0) % routines.length;
    const routine = routines[idx];
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise, routineExercise, sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout' });
  }

  async function handleSetActive(planId) {
    await setActivePlan(user.id, planId);
    await loadData();
  }

  async function handleDeactivate() {
    Alert.alert(
      'Deactivate Plan?',
      'Train will show no plan until you set another one as active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          onPress: async () => {
            await setActivePlan(user.id, null);
            await loadData();
          },
        },
      ],
    );
  }

  async function handlePlanOptions(plan) {
    Alert.alert(plan.name, undefined, [
      { text: 'View Plan', onPress: () => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false }) },
      { text: 'Set Active', onPress: () => handleSetActive(plan.id) },
      { text: 'Duplicate', onPress: async () => {
        const copy = await duplicatePlan(plan.id, user.id);
        await loadData();
        navigation.navigate('PlanDetail', { planId: copy.id, isLibrary: false });
      }},
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Archive Plan?',
          'The plan will be hidden. Your session history remains intact.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Archive', style: 'destructive', onPress: async () => { await archivePlan(plan.id); await loadData(); } },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleTemplateOptions(routine) {
    Alert.alert(routine.name, undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('RoutineDetail', { routineId: routine.id }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Delete template?',
          `"${routine.name}" will be removed.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await softDeleteRoutine(routine.id); await loadData(); } },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleStartTemplate(routine) {
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise, routineExercise, sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout' });
  }

  async function handleAddToMyPlans(libPlan) {
    Alert.alert(
      'Add to My Plans',
      `Copy "${libPlan.name}" into your plans? You can then edit and activate it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to My Plans',
          onPress: async () => {
            try {
              const copy = await copyPlanFromLibrary(libPlan.id, user.id);
              await loadData();
              Alert.alert(
                'Added to My Plans',
                'Set this as your Active Plan now?',
                [
                  { text: 'Not Now', style: 'cancel' },
                  {
                    text: 'Set Active',
                    onPress: async () => {
                      await setActivePlan(user.id, copy.id);
                      await loadData();
                    },
                  },
                ],
              );
            } catch (e) {
              Alert.alert('Error', 'Could not copy plan. Please try again.');
            }
          },
        },
      ],
    );
  }

  async function handleCreatePlan() {
    if (!newPlanName.trim()) {
      Alert.alert('Name required', 'Enter a name for the plan.');
      return;
    }
    setCreating(true);
    try {
      const plan = await createProgramme(user.id, newPlanName.trim(), null, 0);
      setNewPlanName('');
      setShowNewPlan(false);
      await loadData();
      navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: false });
    } finally {
      setCreating(false);
    }
  }

  const filteredLibrary = librarySearch.trim()
    ? libraryPlans.filter(p => p.name.toLowerCase().includes(librarySearch.toLowerCase()))
    : libraryPlans;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.pageTitle}>Training Plans</Text>

        {/* Active Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVE PLAN</Text>
          {activePlan ? (
            <View style={styles.activePlanCard}>
              <View style={styles.activePlanHeader}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
                <TouchableOpacity onPress={() => handlePlanOptions(activePlan)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.activePlanName}>{activePlan.name}</Text>
              {planWorkoutCounts[activePlan.id] ? (
                <Text style={styles.activePlanMeta}>
                  {planWorkoutCounts[activePlan.id]} workout{planWorkoutCounts[activePlan.id] !== 1 ? 's' : ''}
                </Text>
              ) : null}
              <View style={styles.activePlanActions}>
                <TouchableOpacity style={styles.startNextBtn} onPress={() => handleStartNextWorkout(activePlan)}>
                  <Ionicons name="play" size={15} color={colors.background} />
                  <Text style={styles.startNextBtnText}>Start Next Workout</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewPlanBtn}
                  onPress={() => navigation.navigate('PlanDetail', { planId: activePlan.id, isLibrary: false })}
                >
                  <Text style={styles.viewPlanBtnText}>View Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No active plan. Set a plan as active to see your next workout on Train.</Text>
            </View>
          )}
        </View>

        {/* My Plans */}
        {myPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY PLANS</Text>
            {myPlans.map(plan => (
              <View key={plan.id} style={styles.planCard}>
                <View style={styles.planCardMain}>
                  <Text style={styles.planCardName} numberOfLines={2}>{plan.name}</Text>
                  {planWorkoutCounts[plan.id] ? (
                    <Text style={styles.planCardMeta}>
                      {planWorkoutCounts[plan.id]} workout{planWorkoutCounts[plan.id] !== 1 ? 's' : ''}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.planCardActions}>
                  <TouchableOpacity style={styles.setActiveBtn} onPress={() => handleSetActive(plan.id)}>
                    <Text style={styles.setActiveBtnText}>Set Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => handlePlanOptions(plan)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Workout Templates */}
        {templates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WORKOUT TEMPLATES</Text>
            <Text style={styles.sectionSubtitle}>Saved workouts you can start directly.</Text>
            {templates.map(routine => (
              <View key={routine.id} style={styles.templateCard}>
                <View style={styles.templateMain}>
                  <Text style={styles.templateName} numberOfLines={2}>{routine.name}</Text>
                  {exerciseCounts[routine.id] ? (
                    <Text style={styles.templateMeta}>{exerciseCounts[routine.id]} exercises</Text>
                  ) : null}
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity style={styles.startTemplateBtn} onPress={() => handleStartTemplate(routine)}>
                    <Ionicons name="play" size={13} color={colors.background} />
                    <Text style={styles.startTemplateBtnText}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => handleTemplateOptions(routine)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Plan Library */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PLAN LIBRARY</Text>
          <Text style={styles.sectionSubtitle}>Built-in plans. Add to My Plans to use.</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={librarySearch}
              onChangeText={setLibrarySearch}
              placeholder="Search plans..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
          {filteredLibrary.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No plans in library yet.</Text>
            </View>
          ) : (
            filteredLibrary.map(plan => (
              <View key={plan.id} style={styles.libraryCard}>
                <TouchableOpacity
                  style={styles.libraryCardMain}
                  onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: true })}
                >
                  <View style={styles.libraryBadge}>
                    <Text style={styles.libraryBadgeText}>Library</Text>
                  </View>
                  <Text style={styles.libraryCardName} numberOfLines={2}>{plan.name}</Text>
                  {plan.description ? (
                    <Text style={styles.libraryCardDesc} numberOfLines={2}>{plan.description}</Text>
                  ) : null}
                  {planWorkoutCounts[plan.id] ? (
                    <Text style={styles.libraryCardMeta}>
                      {planWorkoutCounts[plan.id]} workout{planWorkoutCounts[plan.id] !== 1 ? 's' : ''}
                    </Text>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  testID="volyume-btn-copy-from-library"
                  style={styles.addToMyPlansBtn}
                  onPress={() => handleAddToMyPlans(plan)}
                >
                  <Text style={styles.addToMyPlansBtnText}>Add to My Plans</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Build a Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BUILD</Text>
          <TouchableOpacity style={styles.buildBtn} onPress={() => setShowNewPlan(true)}>
            <Ionicons name="add-circle" size={20} color={colors.background} />
            <Text style={styles.buildBtnText}>Build a Plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* New Plan Modal */}
      <Modal
        visible={showNewPlan}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowNewPlan(false); setNewPlanName(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Plan</Text>
            <TextInput
              style={styles.modalInput}
              value={newPlanName}
              onChangeText={setNewPlanName}
              placeholder="e.g. Men's Physique Upper/Lower"
              placeholderTextColor={colors.textMuted}
              autoFocus
              onSubmitEditing={handleCreatePlan}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowNewPlan(false); setNewPlanName(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, creating && { opacity: 0.6 }]} onPress={handleCreatePlan} disabled={creating}>
                <Text style={styles.confirmBtnText}>Create</Text>
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
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  pageTitle: { fontSize: fontSize.xxxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5,
  },
  sectionSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: -spacing.sm },
  activePlanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    gap: spacing.md,
  },
  activePlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primary + '60',
  },
  activeBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.black, letterSpacing: 1 },
  activePlanName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  activePlanMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  activePlanActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  startNextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md,
  },
  startNextBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },
  viewPlanBtn: {
    paddingHorizontal: spacing.lg, borderRadius: radius.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
  },
  viewPlanBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary },
  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  planCardMain: { flex: 1, gap: spacing.xs },
  planCardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  planCardMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  planCardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setActiveBtn: {
    backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  setActiveBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  templateCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  templateMain: { flex: 1, gap: spacing.xs },
  templateName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  templateMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  templateActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startTemplateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  startTemplateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  libraryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  libraryCardMain: { padding: spacing.lg, gap: spacing.sm },
  libraryBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: colors.border,
  },
  libraryBadgeText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold },
  libraryCardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  libraryCardDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  libraryCardMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  addToMyPlansBtn: {
    backgroundColor: colors.primaryBg, borderTopWidth: 1, borderTopColor: colors.primary + '30',
    padding: spacing.md, alignItems: 'center',
  },
  addToMyPlansBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  emptyCardText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  buildBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.lg, paddingVertical: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  buildBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  modalInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  cancelBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  confirmBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  confirmBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
});
