import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, RefreshControl, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getLibraryPlans, getPlanWorkoutCounts, copyPlanFromLibrary, activatePlanWithBlock } from '../lib/database';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';

// ─── Collections ─────────────────────────────────────────────────────────────

const COLLECTIONS = [
  { key: 'all',       label: 'All plans' },
  { key: 'featured',  label: 'Featured' },
  { key: 'women',     label: 'For women' },
  { key: 'men',       label: 'For men' },
  { key: 'beginner',  label: 'Beginner' },
  { key: 'dumbbell',  label: 'Dumbbells only' },
  { key: 'short',     label: 'Short sessions' },
  { key: 'division',  label: 'Bodybuilding Divisions' },
];

// ─── Divisions ────────────────────────────────────────────────────────────────

const DIVISIONS_MEN = [
  {
    key: 'mens_physique',
    label: "Men's Physique",
    desc: "Wide shoulders, lean midsection, board shorts. Upper-body biased.",
  },
  {
    key: 'classic_physique',
    label: 'Classic Physique',
    desc: "Balanced golden-era build: capped shoulders, full chest, and legs.",
  },
  {
    key: 'mens_bodybuilding',
    label: "Men's Bodybuilding",
    desc: "Maximum muscular development across every group. High set count per week.",
  },
];

const DIVISIONS_WOMEN = [
  {
    key: 'bikini',
    label: 'Bikini',
    desc: "Lean and athletic with rounded glutes. The most glute-forward division.",
  },
  {
    key: 'wellness',
    label: 'Wellness',
    desc: "Developed lower body, proportionally smaller upper body.",
  },
  {
    key: 'figure',
    label: 'Figure',
    desc: "Athletic and muscular: strong shoulders and back with proportional legs.",
  },
  {
    key: 'womens_physique',
    label: "Women's Physique",
    desc: "More muscle across every group. Visible arms, back, and full legs.",
  },
  {
    key: 'womens_bodybuilding',
    label: "Women's Bodybuilding",
    desc: "Maximum female muscular development across every group.",
  },
];

const ALL_DIVISIONS = [...DIVISIONS_MEN, ...DIVISIONS_WOMEN];

// ─── Quiz ─────────────────────────────────────────────────────────────────────

const QUIZ_STEPS = [
  {
    key: 'goal',
    question: 'What is your main goal?',
    options: [
      { key: 'build_muscle', label: 'Build muscle',         icon: 'barbell-outline' },
      { key: 'get_stronger', label: 'Get stronger',         icon: 'trending-up-outline' },
      { key: 'conditioning', label: 'Improve conditioning', icon: 'heart-outline' },
      { key: 'stage_prep',   label: 'Get on stage',         icon: 'trophy-outline' },
    ],
  },
  {
    key: 'days',
    question: 'How many days per week can you train?',
    options: [
      { key: '2_3', label: '2 to 3 days', icon: 'calendar-outline' },
      { key: '4',   label: '4 days',      icon: 'calendar-outline' },
      { key: '5_6', label: '5 or 6 days', icon: 'calendar-outline' },
    ],
  },
  {
    key: 'equipment',
    question: 'What equipment do you have access to?',
    options: [
      { key: 'full_gym',   label: 'Full gym',              icon: 'fitness-outline' },
      { key: 'dumbbell',   label: 'Dumbbells only',        icon: 'barbell-outline' },
      { key: 'bodyweight', label: 'Home / no equipment',   icon: 'home-outline' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasTag(plan, tag) {
  return plan.tags ? plan.tags.toLowerCase().includes(tag.toLowerCase()) : false;
}

function matchesCollection(plan, key) {
  if (key === 'all') return true;
  if (key === 'featured') return hasTag(plan, 'featured');
  if (key === 'women') return hasTag(plan, 'gender:women');
  if (key === 'men') return hasTag(plan, 'gender:men');
  if (key === 'beginner') return plan.difficulty === 0 || hasTag(plan, 'beginner') || hasTag(plan, 'audience:beginner');
  if (key === 'dumbbell') return hasTag(plan, 'equipment:dumbbell');
  if (key === 'short') return hasTag(plan, 'short');
  if (key === 'division') return hasTag(plan, 'category:division');
  return false;
}

function getQuizRecommendation(answers, plans) {
  const { goal, days, equipment } = answers;
  if (!plans.length) return null;

  const scored = plans.map(p => {
    let score = 0;
    if (hasTag(p, 'category:division') && goal !== 'stage_prep') score -= 5;
    if (goal === 'build_muscle'  && hasTag(p, 'goal:build_muscle'))  score += 3;
    if (goal === 'get_stronger'  && hasTag(p, 'goal:get_stronger'))  score += 3;
    if (goal === 'conditioning'  && hasTag(p, 'goal:conditioning'))  score += 3;
    if (goal === 'stage_prep'    && hasTag(p, 'category:division'))  score += 5;
    if (days === '2_3' && (hasTag(p, 'days:2') || hasTag(p, 'days:3'))) score += 2;
    if (days === '4'   && hasTag(p, 'days:4')) score += 2;
    if (days === '5_6' && (hasTag(p, 'days:5') || hasTag(p, 'days:6'))) score += 2;
    if (equipment === 'full_gym'   && !hasTag(p, 'equipment:dumbbell') && !hasTag(p, 'equipment:bodyweight')) score += 1;
    if (equipment === 'dumbbell'   && hasTag(p, 'equipment:dumbbell'))  score += 4;
    if (equipment === 'bodyweight' && hasTag(p, 'equipment:bodyweight')) score += 4;
    if (hasTag(p, 'featured')) score += 1;
    return { plan: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.plan ?? null;
}

function getDivisionForPlan(plan) {
  for (const d of ALL_DIVISIONS) {
    if (hasTag(plan, `division:${d.key}`)) return d;
  }
  return null;
}

const DIFFICULTY_LABELS = ['Beginner', 'Intermediate', 'Advanced'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanBadge({ label, amber }) {
  return (
    <View style={[styles.badge, amber && styles.badgeAmber]}>
      {amber && <Ionicons name="sparkles" size={9} color={colors.background} style={{ marginRight: 2 }} />}
      <Text style={[styles.badgeText, amber && styles.badgeTextAmber]}>{label}</Text>
    </View>
  );
}

function DivisionGrid({ selectedDivision, onSelectDivision }) {
  return (
    <View style={styles.divisionSection}>
      <Text style={styles.divisionIntroDesc}>
        These programmes are built around the specific visual priorities of each judged division. Designed for competitors, or anyone who trains with a division in mind.
      </Text>
      <Text style={styles.divisionGroupLabel}>Men's divisions</Text>
      <View style={styles.divisionChips}>
        {DIVISIONS_MEN.map(d => (
          <TouchableOpacity
            key={d.key}
            style={[styles.divisionChip, selectedDivision === d.key && styles.divisionChipActive]}
            onPress={() => onSelectDivision(selectedDivision === d.key ? null : d.key)}
          >
            <Text style={[styles.divisionChipText, selectedDivision === d.key && styles.divisionChipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.divisionGroupLabel, { marginTop: spacing.md }]}>Women's divisions</Text>
      <View style={styles.divisionChips}>
        {DIVISIONS_WOMEN.map(d => (
          <TouchableOpacity
            key={d.key}
            style={[styles.divisionChip, selectedDivision === d.key && styles.divisionChipActive]}
            onPress={() => onSelectDivision(selectedDivision === d.key ? null : d.key)}
          >
            <Text style={[styles.divisionChipText, selectedDivision === d.key && styles.divisionChipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedDivision && (() => {
        const d = ALL_DIVISIONS.find(x => x.key === selectedDivision);
        return d ? (
          <View style={styles.divisionDesc}>
            <Text style={styles.divisionDescText}>{d.desc}</Text>
          </View>
        ) : null;
      })()}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PlanLibraryScreen({ navigation, route }) {
  const { user, completeFirstRun } = useAppStore();
  const fromFirstRun = route?.params?.fromFirstRun ?? false;

  const [plans, setPlans] = useState([]);
  const [workoutCounts, setWorkoutCounts] = useState({});
  const [query, setQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Quiz state
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

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
      'Add to my plans',
      `Copy "${plan.name}" into your plans?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to my plans',
          onPress: async () => {
            try {
              const copy = await copyPlanFromLibrary(plan.id, user.id);
              Alert.alert(
                'Added to my plans',
                fromFirstRun
                  ? `"${plan.name}" added. Set it as your active plan and start logging?`
                  : 'Set this as your active plan now?',
                [
                  {
                    text: 'Not now',
                    style: 'cancel',
                    onPress: fromFirstRun ? () => completeFirstRun() : () => navigation.goBack(),
                  },
                  {
                    text: fromFirstRun ? 'Start training' : 'Set active',
                    onPress: async () => {
                      await activatePlanWithBlock(user.id, copy.id, plan.name);
                      if (fromFirstRun) await completeFirstRun();
                      else navigation.goBack();
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

  // Quiz handlers
  function openQuiz() {
    setQuizStep(0);
    setQuizAnswers({});
    setQuizResult(null);
    setQuizVisible(true);
  }

  function handleQuizOption(stepKey, optionKey) {
    const newAnswers = { ...quizAnswers, [stepKey]: optionKey };
    setQuizAnswers(newAnswers);
    if (quizStep < QUIZ_STEPS.length - 1) {
      setQuizStep(s => s + 1);
    } else {
      const result = getQuizRecommendation(newAnswers, plans);
      setQuizResult(result);
      setQuizStep(QUIZ_STEPS.length);
    }
  }

  function dismissQuiz() {
    setQuizVisible(false);
    setQuizStep(0);
    setQuizAnswers({});
    setQuizResult(null);
  }

  function handleQuizStartPlan() {
    setQuizVisible(false);
    if (quizResult) handleAddToMyPlans(quizResult);
  }

  function handleQuizBrowse() {
    setQuizVisible(false);
    setActiveCollection('all');
  }

  // Filter logic
  const queryLower = query.toLowerCase().trim();

  const filtered = plans.filter(p => {
    if (queryLower) {
      return [p.name, p.description, p.tags].filter(Boolean).join(' ').toLowerCase().includes(queryLower);
    }
    if (activeCollection === 'division' && selectedDivision) {
      return hasTag(p, `division:${selectedDivision}`);
    }
    return matchesCollection(p, activeCollection);
  });

  const showQuizBanner = !queryLower && activeCollection === 'all' && !quizResult;
  const showDivisionGrid = !queryLower && activeCollection === 'division';

  // ─── Render ──────────────────────────────────────────────────────────────────

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
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Collection chips */}
      <FlatList
        horizontal
        data={COLLECTIONS}
        keyExtractor={c => c.key}
        showsHorizontalScrollIndicator={false}
        style={styles.chipsList}
        contentContainerStyle={styles.chipsContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, activeCollection === item.key && styles.chipActive]}
            onPress={() => {
              setActiveCollection(item.key);
              if (item.key !== 'division') setSelectedDivision(null);
            }}
          >
            {item.key === 'division' && (
              <Ionicons
                name="trophy-outline"
                size={12}
                color={activeCollection === 'division' ? colors.primary : colors.textMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.chipText, activeCollection === item.key && styles.chipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Division grid — shown when Division prep is selected */}
      {showDivisionGrid && (
        <DivisionGrid
          selectedDivision={selectedDivision}
          onSelectDivision={setSelectedDivision}
        />
      )}

      {/* Plans list */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          showQuizBanner ? (
            <TouchableOpacity style={styles.quizBanner} onPress={openQuiz} activeOpacity={0.88}>
              <View style={styles.quizBannerIcon}>
                <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quizBannerTitle}>Not sure where to start?</Text>
                <Text style={styles.quizBannerBody}>Answer 3 questions and we'll point you to the right plan.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={48} color={colors.surface3} />
            <Text style={styles.emptyTitle}>No plans found</Text>
            <Text style={styles.emptyText}>
              {queryLower
                ? 'Try a different search term.'
                : activeCollection === 'division' && selectedDivision
                  ? "No plans yet for this division. Check back soon."
                  : 'No plans match this filter yet.'}
            </Text>
          </View>
        }
        renderItem={({ item: plan }) => {
          const division = getDivisionForPlan(plan);
          const isFeatured = hasTag(plan, 'featured');
          const isWomen = hasTag(plan, 'gender:women');
          const isMen = hasTag(plan, 'gender:men');
          const wc = workoutCounts[plan.id];

          return (
            <View style={styles.planCard}>
              <TouchableOpacity
                style={styles.planCardMain}
                onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: true })}
                activeOpacity={0.88}
              >
                {/* Top row: badges */}
                <View style={styles.planCardTopRow}>
                  <View style={styles.badgeRow}>
                    {isFeatured && <PlanBadge label="Featured" amber />}
                    {division && <PlanBadge label={division.label} />}
                    {!division && isWomen && <PlanBadge label="For women" />}
                    {!division && isMen && <PlanBadge label="For men" />}
                    {plan.difficulty != null && (
                      <PlanBadge label={DIFFICULTY_LABELS[plan.difficulty] ?? 'Intermediate'} />
                    )}
                  </View>
                  {wc ? (
                    <Text style={styles.workoutCount}>
                      {wc} workout{wc !== 1 ? 's' : ''}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.planName}>{plan.name}</Text>

                {plan.description ? (
                  <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>
                ) : null}
              </TouchableOpacity>

              <View style={styles.planCardFooter}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: true })}
                >
                  <Text style={styles.previewText}>Preview plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="volyume-btn-copy-from-library"
                  style={styles.addBtn}
                  onPress={() => handleAddToMyPlans(plan)}
                >
                  <Text style={styles.addBtnText}>Add to my plans</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Quiz modal */}
      <Modal
        visible={quizVisible}
        transparent
        animationType="slide"
        onRequestClose={dismissQuiz}
      >
        <Pressable style={styles.backdrop} onPress={dismissQuiz}>
          <Pressable style={styles.quizSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            {quizStep < QUIZ_STEPS.length ? (
              // Question step
              <>
                <View style={styles.quizProgress}>
                  {QUIZ_STEPS.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.quizDot, i <= quizStep && styles.quizDotActive]}
                    />
                  ))}
                </View>
                <Text style={styles.quizQuestion}>{QUIZ_STEPS[quizStep].question}</Text>
                <View style={styles.quizOptions}>
                  {QUIZ_STEPS[quizStep].options.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={styles.quizOptionBtn}
                      onPress={() => handleQuizOption(QUIZ_STEPS[quizStep].key, opt.key)}
                      activeOpacity={0.82}
                    >
                      {opt.icon && (
                        <Ionicons name={opt.icon} size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                      )}
                      <Text style={styles.quizOptionText}>{opt.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.quizSkip} onPress={dismissQuiz}>
                  <Text style={styles.quizSkipText}>Skip and browse all plans</Text>
                </TouchableOpacity>
              </>
            ) : quizResult ? (
              // Result step
              <>
                <View style={styles.quizResultIcon}>
                  <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
                </View>
                <Text style={styles.quizResultTitle}>Here's our suggestion</Text>
                <View style={styles.quizResultCard}>
                  <Text style={styles.quizResultName}>{quizResult.name}</Text>
                  {quizResult.description ? (
                    <Text style={styles.quizResultDesc} numberOfLines={3}>{quizResult.description}</Text>
                  ) : null}
                  {quizResult.difficulty != null && (
                    <Text style={styles.quizResultMeta}>
                      {DIFFICULTY_LABELS[quizResult.difficulty] ?? 'Intermediate'}
                      {workoutCounts[quizResult.id] ? ` · ${workoutCounts[quizResult.id]} workouts` : ''}
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={styles.quizStartBtn} onPress={handleQuizStartPlan} activeOpacity={0.88}>
                  <Text style={styles.quizStartText}>Add this plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quizBrowseBtn}
                  onPress={() => { dismissQuiz(); navigation.navigate('PlanDetail', { planId: quizResult.id, isLibrary: true }); }}
                >
                  <Text style={styles.quizBrowseText}>Preview first</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quizSkip} onPress={handleQuizBrowse}>
                  <Text style={styles.quizSkipText}>Browse all plans instead</Text>
                </TouchableOpacity>
              </>
            ) : (
              // No result
              <>
                <Text style={styles.quizResultTitle}>No exact match found</Text>
                <Text style={styles.quizResultDesc}>Browse all plans below. Something will fit.</Text>
                <TouchableOpacity style={styles.quizStartBtn} onPress={handleQuizBrowse} activeOpacity={0.88}>
                  <Text style={styles.quizStartText}>Browse all plans</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  chipsList: { height: 52, flexShrink: 0 },
  chipsContent: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    gap: spacing.sm, alignItems: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary + '80' },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.primary, fontWeight: fontWeight.bold },

  // Division grid
  divisionSection: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  divisionGroupLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  divisionIntroDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  divisionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  divisionChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  divisionChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  divisionChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  divisionChipTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
  divisionDesc: {
    marginTop: spacing.md, backgroundColor: colors.surface2,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  divisionDescText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Plan list
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Quiz banner
  quizBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  quizBannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  quizBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
  quizBannerBody: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // Plan card
  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  planCardMain: { padding: spacing.lg, gap: spacing.sm },
  planCardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', flex: 1 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  badgeAmber: { backgroundColor: colors.primaryBg, borderColor: colors.primary + '60' },
  badgeText: { fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold },
  badgeTextAmber: { color: colors.primary },
  workoutCount: { fontSize: fontSize.xs, color: colors.textMuted, marginLeft: spacing.sm },
  planName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  planDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  planCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  previewText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  addBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  addBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },

  // Empty
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textSecondary },
  emptyText: {
    fontSize: fontSize.md, color: colors.textMuted,
    textAlign: 'center', paddingHorizontal: spacing.xl,
  },

  // Quiz modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  quizSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm,
  },
  quizProgress: {
    flexDirection: 'row', gap: spacing.sm, alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  quizDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.border,
  },
  quizDotActive: { backgroundColor: colors.primary },
  quizQuestion: {
    fontSize: fontSize.lg, fontWeight: fontWeight.black,
    color: colors.textPrimary, textAlign: 'center',
    marginBottom: spacing.xs,
  },
  quizOptions: { gap: spacing.sm },
  quizOptionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  quizOptionText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.medium },
  quizSkip: { alignSelf: 'center', paddingVertical: spacing.sm },
  quizSkipText: { fontSize: fontSize.sm, color: colors.textMuted },

  // Quiz result
  quizResultIcon: { alignSelf: 'center', marginBottom: spacing.xs },
  quizResultTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.black,
    color: colors.textPrimary, textAlign: 'center',
  },
  quizResultCard: {
    backgroundColor: colors.surface2, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.sm,
  },
  quizResultName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  quizResultDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  quizResultMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  quizStartBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  quizStartText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  quizBrowseBtn: {
    backgroundColor: colors.surface2, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  quizBrowseText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
});
