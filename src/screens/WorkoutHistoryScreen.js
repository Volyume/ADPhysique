import { useState, useEffect, useMemo, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  startOfMonth, getDaysInMonth, getDay,
  addMonths, subMonths, isSameDay,
} from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import PressableCard from '../components/PressableCard';
import Card from '../components/Card';
import { EmptyWorkoutsIllustration } from '../components/Illustrations';
import { getAllWorkouts, getWorkoutSetsForWorkoutIds, getAllExercises, createWorkout, getWorkoutSetsForWorkout, getRoutineExercisesWithDetails, deleteWorkoutAndSets } from '../lib/database';
import { enqueueSyncOp } from '../lib/syncQueue';
import { logError } from '../lib/errorLog';
import { calculateTonnage } from '../lib/algorithms';
import { workoutDayMs, workoutDayKey, calendarRelativeLabel } from '../lib/workoutDate';
import useAppStore from '../store/useAppStore';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import AnimatedEntrance from '../components/AnimatedEntrance';
import { useShallow } from 'zustand/react/shallow';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'month', label: 'This month' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'full', label: 'Full body' },
];

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WorkoutHistoryScreen({ navigation }) {
  const { user, startWorkout, session } = useAppStore(useShallow(s => ({ user: s.user, startWorkout: s.startWorkout, session: s.session })));
  const toast = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSets, setExpandedSets] = useState({}); // workoutId -> grouped exercise data

  // Filter + view state
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // Date | null

  useEffect(() => {
    loadWorkouts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadWorkouts() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const allWorkouts = await getAllWorkouts(user.id);
      const mine = allWorkouts
        .filter(w => w.isCompleted)
        .sort((a, b) => workoutDayMs(b) - workoutDayMs(a));

      // LB-7: the list only renders the most recent 50, so fetch only
      // those workouts' sets rather than every set ever logged.
      const page = mine.slice(0, 50);
      const [pageSets, allExercises] = await Promise.all([
        getWorkoutSetsForWorkoutIds(page.map(w => w.id)),
        getAllExercises(),
      ]);
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
      const setsByWorkout = new Map();
      for (const s of pageSets) {
        const arr = setsByWorkout.get(s.workoutId);
        if (arr) arr.push(s); else setsByWorkout.set(s.workoutId, [s]);
      }

      const withSets = page.map(w => {
        const mySets = setsByWorkout.get(w.id) || [];
        const workingSets = mySets.filter(s => s.setType !== 'warmup');
        const exerciseIds = [...new Set(mySets.map(s => s.exerciseId))];
        const exerciseNames = exerciseIds.slice(0, 4)
          .map(id => exerciseMap[id]?.name)
          .filter(Boolean);
        return {
          workout: w,
          setCount: mySets.length,
          workingSetCount: workingSets.length,
          exerciseCount: exerciseIds.length,
          tonnage: calculateTonnage(mySets),
          exerciseNames,
        };
      });
      setWorkouts(withSets);
    } finally {
      setLoading(false);
    }
  }

  async function handleRepeatAsIs(workout) {
    try {
      const newWorkout = await createWorkout(user.id, workout.routineId || null);
      // Repeat-as-is should open with the same exercises as the original
      // session, not a blank workout. Pull them from the routine if linked;
      // otherwise pull from the session's logged sets so the user still
      // sees the exercises they actually did.
      let initialExercises = [];
      if (workout.routineId) {
        const withExercises = await getRoutineExercisesWithDetails(workout.routineId);
        initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
          exercise, routineExercise, sets: [],
          supersetGroupId: routineExercise?.supersetGroupId ?? null,
        }));
      }
      startWorkout(newWorkout, initialExercises);
      navigation.getParent()?.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
    } catch (e) {
      logError('WorkoutHistoryScreen.handleRepeatAsIs', e, {
        userId: user?.id, workoutId: workout?.id, routineId: workout?.routineId,
      });
      toast.show('Couldn\'t repeat session. Try again.', { variant: 'error' });
    }
  }

  function handleRepeatWorkout(workout) {
    appAlert(
      'Repeat session',
      'How would you like to continue?',
      [
        {
          text: 'Repeat as-is',
          onPress: () => handleRepeatAsIs(workout),
        },
        {
          text: 'View in Plans',
          onPress: () => navigation.getParent()?.navigate('PlansTab'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  // Founder request 2026-06-12: delete a workout from history (a half-logged
  // session restarted, or a fresh start). Local rows go immediately and every
  // derived stat recomputes from local data; the cloud copy is removed too so
  // a restore cannot resurrect it (failure path: queued 'workout_delete' op,
  // retried with backoff on app foreground).
  function handleDeleteWorkout(workout) {
    appAlert(
      'Delete this workout?',
      'The session and all its sets are removed from your history, and your stats recalculate. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await deleteWorkoutAndSets(user.id, workout.id);
              if (!ok) { toast.show("Couldn't delete that workout. Try again.", { variant: 'error' }); return; }
              const supabaseUserId = session?.user?.id;
              if (supabaseUserId) {
                // eslint-disable-next-line global-require
                const { deleteWorkoutFromCloud } = require('../lib/sync');
                deleteWorkoutFromCloud(supabaseUserId, workout.id)
                  .then((cloudOk) => { if (!cloudOk) return enqueueSyncOp('workout_delete', workout.id, supabaseUserId); })
                  .catch(() => enqueueSyncOp('workout_delete', workout.id, supabaseUserId));
              }
              if (expandedId === workout.id) setExpandedId(null);
              toast.show('Workout deleted.', { variant: 'success' });
              loadWorkouts();
            } catch (e) {
              logError('WorkoutHistory.delete', e, { workoutId: workout.id });
              toast.show("Couldn't delete that workout. Try again.", { variant: 'error' });
            }
          },
        },
      ],
    );
  }

  const handleToggleExpand = useCallback(async (workoutId) => {
    if (expandedId === workoutId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(workoutId);
    if (expandedSets[workoutId]) return; // already loaded

    try {
      const [sets, allExercises] = await Promise.all([
        getWorkoutSetsForWorkout(workoutId),
        getAllExercises(),
      ]);
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

      // Group sets by exercise, preserving encounter order
      const order = [];
      const groups = {};
      for (const s of sets) {
        if (!groups[s.exerciseId]) {
          groups[s.exerciseId] = { name: exerciseMap[s.exerciseId]?.name || 'Unknown', sets: [] };
          order.push(s.exerciseId);
        }
        groups[s.exerciseId].sets.push(s);
      }

      const grouped = order.map(id => {
        const g = groups[id];
        const workingSets = g.sets.filter(s => s.setType !== 'warmup');
        // Build a concise set summary: weight × reps list for working sets.
        // Rows come back camelCased so the field is `actualReps`; the
        // previous read of `s.reps` produced empty strings in every summary.
        const repsStr = workingSets.map(s => s.actualReps ?? s.reps ?? '').filter(Boolean).join(', ');
        const weights = [...new Set(workingSets.map(s => s.weight).filter(Boolean))];
        const weightStr = weights.length === 1 ? `${weights[0]}kg` : weights.map(w => `${w}kg`).join('/');
        const summary = workingSets.length > 0
          ? `${workingSets.length} × ${weightStr} × ${repsStr}`
          : `${g.sets.length} set${g.sets.length !== 1 ? 's' : ''} (warmup only)`;
        return { name: g.name, summary, workingSetCount: workingSets.length };
      });

      setExpandedSets(prev => ({ ...prev, [workoutId]: grouped }));
    } catch (_) {
      // silently fail, expanded view just won't show exercise breakdown
    }
  }, [expandedId, expandedSets]);

  // ─── Filtering logic ────────────────────────────────────────────────────────
  const filteredWorkouts = useMemo(() => {
    let result = workouts;

    // Calendar day selection takes priority in calendar mode
    if (viewMode === 'calendar' && selectedDay) {
      return result.filter(item => isSameDay(new Date(workoutDayMs(item.workout)), selectedDay));
    }

    const now = new Date();
    const monthStart = startOfMonth(now);

    switch (filter) {
      case 'month':
        result = result.filter(item => new Date(workoutDayMs(item.workout)) >= monthStart);
        break;
      case 'upper':
        result = result.filter(item =>
          item.workout.name?.toLowerCase().includes('upper') ||
          item.exerciseNames.some(n => n.toLowerCase().includes('upper'))
        );
        break;
      case 'lower':
        result = result.filter(item =>
          item.workout.name?.toLowerCase().includes('lower') ||
          item.exerciseNames.some(n => n.toLowerCase().includes('lower'))
        );
        break;
      case 'full':
        result = result.filter(item =>
          item.workout.name?.toLowerCase().includes('full') ||
          item.exerciseNames.some(n => n.toLowerCase().includes('full'))
        );
        break;
      default:
        break;
    }

    // In calendar mode with no day selected, show only sessions in the displayed month
    if (viewMode === 'calendar') {
      const calMonthStart = startOfMonth(calendarDate);
      const calMonthEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0, 23, 59, 59, 999);
      result = result.filter(item => {
        const d = new Date(workoutDayMs(item.workout));
        return d >= calMonthStart && d <= calMonthEnd;
      });
    }

    return result;
  }, [workouts, filter, viewMode, calendarDate, selectedDay]);

  // ─── Calendar helpers ────────────────────────────────────────────────────────
  const trainedDatesSet = useMemo(() => {
    return new Set(workouts.map(item => workoutDayKey(item.workout)));
  }, [workouts]);

  function buildCalendarCells() {
    const firstOfMonth = startOfMonth(calendarDate);
    // getDay returns 0=Sun..6=Sat; convert to Mon-first (0=Mon..6=Sun)
    const rawDay = getDay(firstOfMonth);
    const startOffset = rawDay === 0 ? 6 : rawDay - 1;
    const totalDays = getDaysInMonth(calendarDate);
    const cells = [];
    // Leading empty cells
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  }

  // ─── Render helpers ──────────────────────────────────────────────────────────
  function renderItem({ item, index }) {
    const { workout, setCount, workingSetCount, exerciseCount, tonnage, exerciseNames } = item;
    const date = new Date(workoutDayMs(workout));
    const isExpanded = expandedId === workout.id;
    const exerciseDetail = expandedSets[workout.id];

    return (
      <AnimatedEntrance index={index}>
      <Card style={styles.card}>
        {/* Tappable header row, toggles expansion */}
        <PressableCard
          onPress={() => handleToggleExpand(workout.id)}
          style={styles.cardHeaderTouchable}
          accessibilityLabel={`Workout on ${format(date, 'd MMM yyyy')}`}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardDate}>{format(date, 'd MMM yyyy')}</Text>
              <Text style={styles.cardTime}>{calendarRelativeLabel(workoutDayMs(workout))}</Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <View style={styles.cardMeta}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.cardMetaText}>{workout.durationMinutes || 0}m</Text>
                <Text style={styles.cardMetaDivider}>·</Text>
                <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
                <Text style={styles.cardMetaText}>{workingSetCount} sets</Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
                style={{ marginTop: spacing.xs }}
              />
            </View>
          </View>
          <Text style={styles.exerciseList} numberOfLines={isExpanded ? undefined : 2}>
            {exerciseNames.join(', ') || 'No exercises logged'}
          </Text>
        </PressableCard>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Stat chips */}
            <View style={styles.statChipRow}>
              {!!workout.durationMinutes && (
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>{workout.durationMinutes} min</Text>
                </View>
              )}
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{workingSetCount} working set{workingSetCount !== 1 ? 's' : ''}</Text>
              </View>
              {tonnage > 0 && (
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>{Math.round(tonnage).toLocaleString()}kg lifted</Text>
                </View>
              )}
            </View>

            {/* Exercise breakdown */}
            {exerciseDetail ? (
              <View style={styles.exerciseBreakdown}>
                {exerciseDetail.map((ex, idx) => (
                  <View key={idx} style={styles.exerciseBreakdownRow}>
                    <Text style={styles.exerciseBreakdownName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exerciseBreakdownSummary} numberOfLines={1}>
                      {ex.summary}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.exerciseBreakdown}>
                <Text style={styles.loadingText}>Loading exercises...</Text>
              </View>
            )}

            {/* Session notes */}
            {!!workout.notes && (
              <View style={styles.notesRow}>
                <Ionicons name="document-text-outline" size={13} color={colors.textMuted} />
                <Text style={styles.notesText}>{workout.notes}</Text>
              </View>
            )}

            {/* View full summary */}
            <TouchableOpacity
              style={styles.fullSummaryBtn}
              onPress={() =>
                navigation.navigate('WorkoutSummary', {
                  workoutId: workout.id,
                  durationMinutes: workout.durationMinutes,
                  exerciseCount,
                  setCount,
                  workingSetCount,
                  tonnage,
                  exerciseNames,
                  startedAt: workout.startedAt,
                  endedAt: workout.endedAt,
                  readOnly: true,
                })
              }
              accessibilityRole="button"
              accessibilityLabel="View full summary"
            >
              <Text style={styles.fullSummaryBtnText}>View full summary</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Card actions */}
        <View style={styles.cardActions}>
          {!isExpanded && (
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() =>
                navigation.navigate('WorkoutSummary', {
                  workoutId: workout.id,
                  durationMinutes: workout.durationMinutes,
                  exerciseCount,
                  setCount,
                  workingSetCount,
                  tonnage,
                  exerciseNames,
                  startedAt: workout.startedAt,
                  endedAt: workout.endedAt,
                  readOnly: true,
                })
              }
              accessibilityRole="button"
              accessibilityLabel="View details"
            >
              <Text style={styles.viewBtnText}>View Details</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.repeatBtn, isExpanded && styles.repeatBtnFull]}
            onPress={() => handleRepeatWorkout(workout)}
            accessibilityRole="button"
            accessibilityLabel="Repeat session"
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={styles.repeatBtnText}>Repeat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteWorkout(workout)}
            accessibilityRole="button"
            accessibilityLabel="Delete workout"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Card>
      </AnimatedEntrance>
    );
  }

  const calendarCells = viewMode === 'calendar' ? buildCalendarCells() : [];
  const today = new Date();

  function renderCalendarHeader() {
    return (
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => {
            setCalendarDate(prev => subMonths(prev, 1));
            setSelectedDay(null);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.calendarMonthTitle}>{format(calendarDate, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          onPress={() => {
            setCalendarDate(prev => addMonths(prev, 1));
            setSelectedDay(null);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderCalendarGrid() {
    const rows = [];
    let row = [];

    for (let i = 0; i < calendarCells.length; i++) {
      const dayNum = calendarCells[i];
      row.push(dayNum);
      if (row.length === 7 || i === calendarCells.length - 1) {
        // Pad last row
        while (row.length < 7) row.push(null);
        rows.push([...row]);
        row = [];
      }
    }

    return rows.map((week, wi) => (
      <View key={wi} style={styles.calendarRow}>
        {week.map((dayNum, di) => {
          if (dayNum === null) {
            return <View key={di} style={styles.calendarCell} />;
          }
          const cellDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNum);
          const dateStr = format(cellDate, 'yyyy-MM-dd');
          const trained = trainedDatesSet.has(dateStr);
          const isToday = isSameDay(cellDate, today);
          const isSelected = selectedDay && isSameDay(cellDate, selectedDay);

          return (
            <TouchableOpacity
              key={di}
              style={styles.calendarCell}
              onPress={() => {
                if (!trained) return;
                setSelectedDay(prev => (prev && isSameDay(prev, cellDate) ? null : cellDate));
              }}
              activeOpacity={trained ? 0.7 : 1}
              accessibilityRole="button"
              accessibilityLabel={`${format(cellDate, 'd MMMM')}${trained ? ', trained' : ''}`}
              accessibilityState={{ selected: !!isSelected, disabled: !trained }}
            >
              <View style={[
                styles.dayCircle,
                trained && styles.dayCircleTrained,
                isToday && styles.dayCircleToday,
                isSelected && styles.dayCircleSelected,
              ]}>
                <Text style={[
                  styles.dayNum,
                  trained && styles.dayNumTrained,
                  isSelected && styles.dayNumSelected,
                ]}>
                  {dayNum}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  }

  const listHeader = (
    <View style={styles.listHeaderWrap}>
      {/* Top bar: title + toggle */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>
          {workouts.length} session{workouts.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
          onPress={() => {
            setViewMode(prev => (prev === 'list' ? 'calendar' : 'list'));
            setSelectedDay(null);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'calendar' ? 'Switch to list view' : 'Switch to calendar view'}
        >
          <Ionicons
            name={viewMode === 'calendar' ? 'list-outline' : 'calendar-outline'}
            size={18}
            color={viewMode === 'calendar' ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                setFilter(f.key);
                setSelectedDay(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter: ${f.label}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Calendar grid */}
      {viewMode === 'calendar' && (
        <View style={styles.calendarCard}>
          {renderCalendarHeader()}
          {/* Day-of-week headers */}
          <View style={styles.calendarRow}>
            {DAY_HEADERS.map((h, i) => (
              <View key={i} style={styles.calendarCell}>
                <Text style={styles.dayHeader}>{h}</Text>
              </View>
            ))}
          </View>
          {renderCalendarGrid()}
          {selectedDay && (
            <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.clearDayBtn} accessibilityRole="button" accessibilityLabel="Show all this month">
              <Text style={styles.clearDayText}>Show all this month</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={filteredWorkouts}
        keyExtractor={item => item.workout.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try { await loadWorkouts(); } finally { setRefreshing(false); }
            }}
            tintColor={colors.textMuted}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            // Skeleton rows instead of a blank screen while SQLite reads.
            // Local reads are fast but the placeholder makes the load
            // window feel instant even on a fresh database.
            <View style={{ gap: spacing.md }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : (
            <View style={styles.empty}>
              <EmptyWorkoutsIllustration size={140} />
              <Text style={styles.emptyTitle}>Your sessions will appear here</Text>
              <Text style={styles.emptyText}>
                Completed workouts appear here. Each session is saved automatically when you finish.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // ── Header ─────────────────────────────────────────────────────────────────
  listHeaderWrap: { gap: spacing.md, marginBottom: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    ...type.label,
    color: colors.textMuted,
  },
  toggleBtn: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },

  // ── Filter chips ───────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  chipText: {
    ...type.label,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // ── Calendar ───────────────────────────────────────────────────────────────
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  calendarMonthTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  calendarCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  dayHeader: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayCircleTrained: {
    backgroundColor: colors.primaryBg,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayNum: {
    ...type.num('caption'),
    color: colors.textMuted,
  },
  dayNumTrained: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  dayNumSelected: {
    color: colors.onPrimary,
    fontWeight: fontWeight.bold,
  },
  clearDayBtn: {
    marginTop: spacing.xs,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  clearDayText: {
    fontSize: fontSize.xs,
    color: colors.primaryDim,
    fontWeight: fontWeight.medium,
  },

  // ── Cards ──────────────────────────────────────────────────────────────────
  card: {
    gap: spacing.md,
  },
  cardHeaderTouchable: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  cardDate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  cardTime: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMetaText: {
    ...type.num('caption'),
    color: colors.textMuted,
  },
  cardMetaDivider: {
    color: colors.border,
  },
  exerciseList: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // ── Expanded content ───────────────────────────────────────────────────────
  expandedContent: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
  },
  statChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  exerciseBreakdown: {
    gap: spacing.sm,
  },
  exerciseBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  exerciseBreakdownName: {
    ...type.label,
    color: colors.textPrimary,
    flex: 1,
  },
  exerciseBreakdownSummary: {
    ...type.num('caption'),
    color: colors.textSecondary,
    flex: 2,
    textAlign: 'right',
  },
  loadingText: {
    ...type.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  fullSummaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fullSummaryBtnText: {
    ...type.label,
    color: colors.primary,
  },

  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  viewBtnText: {
    ...type.label,
    color: colors.textSecondary,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  repeatBtnFull: {
    flex: 1,
    justifyContent: 'center',
  },
  // Quiet destructive affordance: neutral until the confirm dialog, matching
  // the row's secondary-button treatment rather than shouting red.
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repeatBtnText: {
    ...type.label,
    color: colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...type.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
