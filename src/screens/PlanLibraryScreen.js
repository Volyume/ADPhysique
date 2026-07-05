import { useState, useCallback, useRef, useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, Pressable } from 'react-native';
// E8 perf: the vertical plans list recycles via FlashList; the small
// horizontal category chip row stays a FlatList (tiny, no gain).
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle } from '../styles/theme';
import { getLibraryPlans, getPlanWorkoutCounts, copyPlanFromLibrary, activatePlanWithBlock } from '../lib/database';
import { confirmPlanSwitchMidBlock } from '../lib/planSwitch';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import { SkeletonCard } from '../components/Skeleton';
import SearchBar from '../components/SearchBar';
import Card from '../components/Card';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';

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

// T5: stable beginner-first partition for the default (non-quiz) plan list.
// Reuses the exact predicate the "Beginner" collection chip already matches
// on (difficulty 0, or a beginner/audience:beginner tag) so there is one
// definition of "beginner-appropriate" in this file, rather than a second,
// possibly-diverging one. Array.prototype.sort is required to be stable
// (ES2019+), so plans within each half keep their existing relative order
// (created_at ASC from getLibraryPlans).
function sortBeginnerFirst(list) {
  return [...list].sort((a, b) => {
    const aBeginner = matchesCollection(a, 'beginner') ? 0 : 1;
    const bBeginner = matchesCollection(b, 'beginner') ? 0 : 1;
    return aBeginner - bBeginner;
  });
}

function getQuizRecommendation(answers, plans) {
  const { goal, equipment } = answers;
  if (!plans.length) return null;

  const scored = plans.map(p => {
    let score = 0;
    if (hasTag(p, 'category:division') && goal !== 'stage_prep') score -= 5;
    if (goal === 'build_muscle'  && hasTag(p, 'goal:build_muscle'))  score += 3;
    if (goal === 'get_stronger'  && hasTag(p, 'goal:get_stronger'))  score += 3;
    if (goal === 'conditioning'  && hasTag(p, 'goal:conditioning'))  score += 3;
    if (goal === 'stage_prep'    && hasTag(p, 'category:division'))  score += 5;
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
      {amber && <Ionicons name="sparkles" size={9} color={colors.onPrimary} style={{ marginRight: spacing.xxs }} />}
      <Text style={[styles.badgeText, amber && styles.badgeTextAmber]}>{label}</Text>
    </View>
  );
}

function DivisionGrid({ selectedDivision, onSelectDivision }) {
  return (
    <View style={styles.divisionSection}>
      <Text style={styles.divisionIntroDesc}>
        These plans are built around the specific visual priorities of each judged division. Designed for competitors, or anyone who trains with a division in mind.
      </Text>
      <Text style={styles.divisionGroupLabel}>Men's divisions</Text>
      <View style={styles.divisionChips}>
        {DIVISIONS_MEN.map(d => (
          <Chip
            key={d.key}
            label={d.label}
            selected={selectedDivision === d.key}
            onPress={() => onSelectDivision(selectedDivision === d.key ? null : d.key)}
            style={styles.divisionChip}
            labelStyle={styles.divisionChipText}
            selectedLabelStyle={styles.divisionChipTextActive}
            accessibilityLabel={d.label}
          />
        ))}
      </View>

      <Text style={[styles.divisionGroupLabel, { marginTop: spacing.md }]}>Women's divisions</Text>
      <View style={styles.divisionChips}>
        {DIVISIONS_WOMEN.map(d => (
          <Chip
            key={d.key}
            label={d.label}
            selected={selectedDivision === d.key}
            onPress={() => onSelectDivision(selectedDivision === d.key ? null : d.key)}
            style={styles.divisionChip}
            labelStyle={styles.divisionChipText}
            selectedLabelStyle={styles.divisionChipTextActive}
            accessibilityLabel={d.label}
          />
        ))}
      </View>

      {selectedDivision && (() => {
        const d = ALL_DIVISIONS.find(x => x.key === selectedDivision);
        return d ? (
          <Card surface="surface2" radius="md" padding="md" style={styles.divisionDesc}>
            <Text style={styles.divisionDescText}>{d.desc}</Text>
          </Card>
        ) : null;
      })()}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PlanLibraryScreen({ navigation, route }) {
  const toast = useToast();
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user } = useAppStore(useShallow(s => ({
    user: s.user,
  })));
  const fromFirstRun = route?.params?.fromFirstRun ?? false;

  const [plans, setPlans] = useState([]);
  const [workoutCounts, setWorkoutCounts] = useState({});
  const [query, setQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState(null);
  const listRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // FF-004: distinguish a real load/init failure from a genuinely empty library
  // so the list can offer a retry instead of a misleading "No plans found".
  const [loadError, setLoadError] = useState(false);

  // Quiz state
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => { loadData(); }, []),
  );

  // Re-load when user.id becomes available, handles the case where the user
  // reaches this screen (e.g. via "fromFirstRun") before initLocalUser has
  // finished, so seedRoutinesIfNeeded was skipped on first mount.
  useEffect(() => {
    if (user?.id) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadData() {
    try {
      if (user?.id) await seedRoutinesIfNeeded(user.id);
      const [lib, pwc] = await Promise.all([getLibraryPlans(), getPlanWorkoutCounts()]);
      setPlans(lib);
      setWorkoutCounts(pwc);
      setLoadError(false);
    } catch (e) {
      // FF-004: a real init/storage failure must not masquerade as an empty
      // library. Flag it so the list renders a retryable failure surface.
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logWarn('PlanLibrary.load', e?.message ?? 'unknown'); } catch (_) {}
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }

  // FF-004: retry a failed load.
  const handleRetry = useCallback(() => {
    setLoaded(false);
    setLoadError(false);
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleAddToMyPlans(plan) {
    if (!user?.id) {
      toast.show('Setting up your profile, try again in a second', { variant: 'info' });
      return;
    }
    // C4: one decision, one dialog. Both choices copy the plan; only what
    // happens after the copy differs, so each button owns its own copy call
    // and error handling (matches the copy-failure toast either way).
    appAlert(
      'Add this plan?',
      fromFirstRun
        ? `"${plan.name}" will be added to your plans. Start training now, or just add it for later.`
        : `Copy "${plan.name}" into your plans. Make it active now, or just add it for later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Just add',
          onPress: async () => {
            try {
              const copy = await copyPlanFromLibrary(plan.id, user.id);
              if (!copy?.id) throw new Error('Copy failed.');
              if (fromFirstRun) navigation.navigate('ProSetupComplete');
              else navigation.goBack();
            } catch (_e) {
              toast.show("Couldn't copy plan, try again", { variant: 'error' });
            }
          },
        },
        {
          text: fromFirstRun ? 'Start training' : 'Add and make active',
          onPress: async () => {
            let copy;
            try {
              copy = await copyPlanFromLibrary(plan.id, user.id);
              if (!copy?.id) throw new Error('Copy failed.');
            } catch (_e) {
              toast.show("Couldn't copy plan, try again", { variant: 'error' });
              return;
            }
            // Skip the mid-block confirm during first-run, there's no
            // prior block to disrupt (this IS their first plan).
            if (!fromFirstRun) {
              const ok = await confirmPlanSwitchMidBlock(user.id, { newPlanName: plan.name });
              if (!ok) { navigation.goBack(); return; }
            }
            await activatePlanWithBlock(user.id, copy.id, plan.name);
            if (fromFirstRun) navigation.navigate('ProSetupComplete');
            else navigation.goBack();
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

  const filteredPlans = plans.filter(p => {
    if (queryLower) {
      return [p.name, p.description, p.tags].filter(Boolean).join(' ').toLowerCase().includes(queryLower);
    }
    if (activeCollection === 'division' && selectedDivision) {
      return hasTag(p, `division:${selectedDivision}`);
    }
    return matchesCollection(p, activeCollection);
  });

  // T5: default to beginner-appropriate plans first, outside the quiz path
  // only. `quizResult` is the same "quiz answered this session" signal
  // showQuizBanner already keys off below; once it is set, the quiz has
  // given its own specific pick, so we leave the list in the order the
  // filters above produced rather than layering a generic reorder on top of
  // a targeted recommendation. Existing filters/collections are untouched,
  // this only reorders whatever they already produced.
  const filtered = quizResult ? filteredPlans : sortBeginnerFirst(filteredPlans);

  const showQuizBanner = !queryLower && activeCollection === 'all' && !quizResult;
  const showDivisionGrid = !queryLower && activeCollection === 'division';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Plan library" />

      {/* Search */}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search plans"
        style={styles.searchRow}
      />

      {/* Collection chips */}
      <FlatList
        horizontal
        data={COLLECTIONS}
        keyExtractor={c => c.key}
        showsHorizontalScrollIndicator={false}
        style={styles.chipsList}
        contentContainerStyle={styles.chipsContent}
        renderItem={({ item }) => {
          const active = activeCollection === item.key;
          return (
            <Chip
              label={item.label}
              icon={item.key === 'division' ? 'trophy-outline' : undefined}
              selected={active}
              onPress={() => {
                setActiveCollection(item.key);
                if (item.key !== 'division') setSelectedDivision(null);
                listRef.current?.scrollToOffset({ offset: 0, animated: false });
              }}
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              style={styles.collectionChip}
              labelStyle={styles.collectionChipText}
              selectedLabelStyle={styles.collectionChipTextActive}
            />
          );
        }}
      />

      {/* Division grid, shown when Division prep is selected */}
      {showDivisionGrid && (
        <DivisionGrid
          selectedDivision={selectedDivision}
          onSelectDivision={setSelectedDivision}
        />
      )}

      {/* Plans list */}
      <FlashList
        ref={listRef}
        data={filtered}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          showQuizBanner ? (
            <Card
              style={styles.quizBanner}
              onPress={openQuiz}
              accessibilityLabel="Not sure where to start? Answer 2 quick questions for a plan suggestion"
            >
              <View style={styles.quizBannerIcon}>
                <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quizBannerTitle}>Not sure where to start?</Text>
                <Text style={styles.quizBannerBody}>Answer 2 quick questions and we'll point you to the right plan.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          ) : null
        }
        ListEmptyComponent={
          loadError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load plans"
              text="Something went wrong loading the plan library."
              actionLabel="Try again"
              onAction={handleRetry}
            />
          ) : !loaded ? (
            <View style={styles.skeletonWrap}>
              <SkeletonCard height={96} />
              <SkeletonCard height={96} />
              <SkeletonCard height={96} />
            </View>
          ) : (
            <EmptyState
              icon="library-outline"
              title="No plans found"
              text={queryLower
                ? 'Try a different search term.'
                : activeCollection === 'division' && selectedDivision
                  ? 'No plans for this division yet.'
                  : 'No plans match this filter yet.'}
            />
          )
        }
        renderItem={({ item: plan }) => {
          const division = getDivisionForPlan(plan);
          const isFeatured = hasTag(plan, 'featured');
          const isWomen = hasTag(plan, 'gender:women');
          const isMen = hasTag(plan, 'gender:men');
          const wc = workoutCounts[plan.id];

          return (
            <Card padding="none" style={styles.planCard}>
              <TouchableOpacity
                style={styles.planCardMain}
                onPress={() => navigation.navigate('PlanDetail', { planId: plan.id, isLibrary: true })}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={[
                  plan.name,
                  plan.difficulty != null ? (DIFFICULTY_LABELS[plan.difficulty] ?? 'Intermediate') : null,
                  wc ? `${wc} workout${wc !== 1 ? 's' : ''}` : null,
                ].filter(Boolean).join(', ')}
                accessibilityHint="Opens plan preview"
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
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${plan.name}`}
                >
                  <Text style={styles.previewText}>Preview plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="volyume-btn-copy-from-library"
                  style={styles.addBtn}
                  onPress={() => handleAddToMyPlans(plan)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${plan.name} to my plans`}
                >
                  <Text style={styles.addBtnText}>Add to my plans</Text>
                </TouchableOpacity>
              </View>
            </Card>
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
        <Pressable accessibilityRole="button" style={styles.backdrop} onPress={dismissQuiz}>
          <Pressable style={styles.quizSheet} onPress={() => {}} accessible={false}>
            <View style={styles.sheetHandle} />

            {quizStep < QUIZ_STEPS.length ? (
              // Question step
              <>
                <View
                  style={styles.quizProgress}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
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
                    <Card
                      key={opt.key}
                      surface="surface2"
                      radius="md"
                      padding="md"
                      style={styles.quizOptionBtn}
                      onPress={() => handleQuizOption(QUIZ_STEPS[quizStep].key, opt.key)}
                      accessibilityLabel={opt.label}
                    >
                      {opt.icon && (
                        <Ionicons name={opt.icon} size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                      )}
                      <Text style={styles.quizOptionText}>{opt.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Card>
                  ))}
                </View>
                <TouchableOpacity style={styles.quizSkip} onPress={dismissQuiz} accessibilityRole="button">
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
                <Card surface="surface2" style={styles.quizResultCard}>
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
                </Card>
                <TouchableOpacity style={styles.quizStartBtn} onPress={handleQuizStartPlan} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel={`Add ${quizResult.name}`}>
                  <Text style={styles.quizStartText}>Add this plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quizBrowseBtn}
                  onPress={() => { dismissQuiz(); navigation.navigate('PlanDetail', { planId: quizResult.id, isLibrary: true }); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${quizResult.name}`}
                >
                  <Text style={styles.quizBrowseText}>Preview first</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quizSkip} onPress={handleQuizBrowse} accessibilityRole="button">
                  <Text style={styles.quizSkipText}>Browse all plans instead</Text>
                </TouchableOpacity>
              </>
            ) : (
              // No result
              <>
                <Text style={styles.quizResultTitle}>No exact match found</Text>
                <Text style={styles.quizResultDesc}>Browse all the plans below to find one that suits you.</Text>
                <TouchableOpacity style={styles.quizStartBtn} onPress={handleQuizBrowse} activeOpacity={0.88} accessibilityRole="button">
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
    margin: spacing.lg, marginBottom: spacing.sm,
  },

  chipsList: { height: 52, flexShrink: 0 },
  chipsContent: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    gap: spacing.sm, alignItems: 'center',
  },
  collectionChip: { paddingVertical: 7 },
  collectionChipText: { ...type.label, color: colors.textSecondary },
  collectionChipTextActive: { color: colors.primary, fontWeight: fontWeight.bold },

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
  },
  divisionChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  divisionChipTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
  // Card owns background/radius/padding/border here.
  divisionDesc: {
    marginTop: spacing.md,
  },
  divisionDescText: { ...type.bodySm, color: colors.textSecondary },

  // Plan list
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Quiz banner. Card owns background/radius/padding/border here.
  quizBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quizBannerIcon: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  quizBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
  quizBannerBody: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },

  // Plan card. Card owns background/radius/border; overflow clips the
  // footer's top border to the rounded corner.
  planCard: {
    overflow: 'hidden',
  },
  planCardMain: { padding: spacing.lg, gap: spacing.sm },
  planCardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', flex: 1 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: colors.border,
  },
  badgeAmber: { backgroundColor: colors.primaryBg, borderColor: withAlpha(colors.primary, 0.376) },
  badgeText: { fontSize: fontSize.micro, color: colors.textMuted, fontWeight: fontWeight.semibold },
  badgeTextAmber: { color: colors.primary },
  workoutCount: { ...type.caption, color: colors.textMuted, marginLeft: spacing.sm },
  planName: { ...type.bodyStrong, color: colors.textPrimary },
  planDesc: { ...type.bodySm, color: colors.textSecondary },
  planCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  previewText: { ...type.label, color: colors.textSecondary },
  addBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  addBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },

  skeletonWrap: { gap: spacing.md },

  // Quiz modal
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  quizSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: radius.hair,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm,
  },
  quizProgress: {
    flexDirection: 'row', gap: spacing.sm, alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  quizDot: {
    width: 8, height: 8, borderRadius: circle(8),
    backgroundColor: colors.border,
  },
  quizDotActive: { backgroundColor: colors.primary },
  quizQuestion: {
    fontSize: fontSize.lg, fontWeight: fontWeight.black,
    color: colors.textPrimary, textAlign: 'center',
    marginBottom: spacing.xs,
  },
  quizOptions: { gap: spacing.sm },
  // Card owns background/radius/padding/border here.
  quizOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
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
  // Card owns background/radius/padding/border here.
  quizResultCard: {
    gap: spacing.sm,
  },
  quizResultName: { ...type.bodyStrong, color: colors.textPrimary },
  quizResultDesc: { ...type.bodySm, color: colors.textSecondary },
  quizResultMeta: { ...type.caption, color: colors.textMuted },
  quizStartBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  quizStartText: { ...type.bodyStrong, color: colors.onPrimary },
  quizBrowseBtn: {
    backgroundColor: colors.surface2, borderRadius: radius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  quizBrowseText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
});
