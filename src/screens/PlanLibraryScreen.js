import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getLibraryPlans, getPlanWorkoutCounts, copyPlanFromLibrary, setActivePlan } from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';

const FILTER_CHIPS = [
  { label: 'All',                key: 'all' },
  { label: 'Beginner',           key: 'beginner' },
  { label: 'Upper / Lower',      key: 'upper_lower' },
  { label: 'Push / Pull / Legs', key: 'ppl' },
  { label: 'Full Body',          key: 'full_body' },
  { label: 'Bodybuilding',       key: 'bodybuilding' },
  { label: 'Aesthetic',          key: 'aesthetic' },
  { label: 'Weak Point',         key: 'weak_point' },
  { label: 'Short Sessions',     key: 'short' },
];

function matchesFilter(plan, key) {
  if (key === 'all') return true;
  const hay = [plan.name, plan.description, plan.splitType, plan.tags]
    .filter(Boolean).join(' ').toLowerCase();
  if (key === 'upper_lower')  return hay.includes('upper') || hay.includes('lower');
  if (key === 'ppl')          return hay.includes('ppl') || hay.includes('push pull') || hay.includes('push/pull');
  if (key === 'full_body')    return hay.includes('full body') || hay.includes('fullbody');
  if (key === 'bodybuilding') return hay.includes('bodybuilding') || hay.includes('bodybuilder');
  if (key === 'aesthetic')    return hay.includes('aesthetic') || hay.includes('v-taper') || hay.includes('symmetry');
  if (key === 'weak_point')   return hay.includes('weak point') || hay.includes('specialisation') || hay.includes('specialization');
  if (key === 'short')        return hay.includes('short') || hay.includes('45 min') || hay.includes('express');
  if (key === 'beginner')     return hay.includes('beginner') || plan.difficulty === 0;
  return hay.includes(key.replace('_', ' '));
}

const DIFFICULTY_LABELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function PlanLibraryScreen({ navigation, route }) {
  const { user, completeFirstRun } = useAppStore();
  const fromFirstRun = route?.params?.fromFirstRun ?? false;
  const [plans, setPlans] = useState([]);
  const [workoutCounts, setWorkoutCounts] = useState({});
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => { loadData(); }, []),
  );

  async function loadData() {
    try {
      if (user?.id) await seedRoutinesIfNeeded(user.id);
      const [lib, pwc] = await Promise.all([getLibraryPlans(), getPlanWorkoutCounts()]);
      setPlans(lib);
      setWorkoutCounts(pwc);
    } catch (_e) {}
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleAddToMyPlans(plan) {
    Alert.alert(
      'Add to My Plans',
      `Copy "${plan.name}" into your plans?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to My Plans',
          onPress: async () => {
            try {
              const copy = await copyPlanFromLibrary(plan.id, user.id);
              Alert.alert(
                'Added to My Plans',
                fromFirstRun
                  ? `"${plan.name}" added. Set it as your active plan and start logging?`
                  : 'Set this as your Active Plan now?',
                [
                  {
                    text: fromFirstRun ? 'Not Now' : 'Not Now',
                    style: 'cancel',
                    onPress: fromFirstRun ? () => completeFirstRun() : undefined,
                  },
                  {
                    text: fromFirstRun ? 'Start Training' : 'Set Active',
                    onPress: async () => {
                      await setActivePlan(user.id, copy.id);
                      if (fromFirstRun) await completeFirstRun();
                    },
                  },
                ],
              );
            } catch (_e) {
              Alert.alert('Error', 'Could not copy plan. Please try again.');
            }
          },
        },
      ],
    );
  }

  const filtered = plans.filter(p => {
    const matchesQuery = !query.trim() ||
      [p.name, p.description].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && matchesFilter(p, activeFilter);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search plans..."
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTER_CHIPS}
        keyExtractor={c => c.key}
        showsHorizontalScrollIndicator={false}
        style={styles.chipsList}
        contentContainerStyle={styles.chipsContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, activeFilter === item.key && styles.chipActive]}
            onPress={() => setActiveFilter(item.key)}
          >
            <Text style={[styles.chipText, activeFilter === item.key && styles.chipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Plans list */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={48} color={colors.surface3} />
            <Text style={styles.emptyTitle}>No plans found</Text>
            <Text style={styles.emptyText}>
              {query ? 'Try a different search term.' : 'No plans match this filter yet.'}
            </Text>
          </View>
        }
        renderItem={({ item: plan }) => (
          <View style={styles.planCard}>
            <TouchableOpacity
              style={styles.planCardMain}
              onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: true })}
            >
              <View style={styles.planCardTopRow}>
                <View style={styles.libraryBadge}>
                  <Text style={styles.libraryBadgeText}>Library</Text>
                </View>
                {workoutCounts[plan.id] ? (
                  <Text style={styles.workoutCount}>
                    {workoutCounts[plan.id]} workout{workoutCounts[plan.id] !== 1 ? 's' : ''}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.planName}>{plan.name}</Text>
              {plan.description ? (
                <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>
              ) : null}
              <View style={styles.tagRow}>
                {plan.splitType ? (
                  <View style={styles.tag}><Text style={styles.tagText}>{plan.splitType}</Text></View>
                ) : null}
                {plan.difficulty != null ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{DIFFICULTY_LABELS[plan.difficulty] ?? 'Intermediate'}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
            <View style={styles.planCardFooter}>
              <TouchableOpacity
                onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: true })}
              >
                <Text style={styles.previewText}>Preview Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="volyume-btn-copy-from-library"
                style={styles.addBtn}
                onPress={() => handleAddToMyPlans(plan)}
              >
                <Text style={styles.addBtnText}>Add to My Plans</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: {
    flex: 1, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.textPrimary,
  },
  chipsList: { height: 56, flexShrink: 0 },
  chipsContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary + '80' },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  planCardMain: { padding: spacing.lg, gap: spacing.sm },
  planCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  libraryBadge: {
    backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  libraryBadgeText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold },
  workoutCount: { fontSize: fontSize.xs, color: colors.textMuted },
  planName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  planDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  tagRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tag: {
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  tagText: { fontSize: fontSize.xs, color: colors.textMuted },
  planCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  previewText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  addBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  addBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
});
