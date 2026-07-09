import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns/format';
import { startOfMonth } from 'date-fns/startOfMonth';
import { getDaysInMonth } from 'date-fns/getDaysInMonth';
import { getDay } from 'date-fns/getDay';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';
import { isSameDay } from 'date-fns/isSameDay';
import { colors, fontSize, fontWeight, spacing, radius, type, circle, iconSize } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import PressableCard from '../components/PressableCard';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import { getRecentCompletedWorkouts, getWorkoutSetsForWorkoutIds, getAllExercises, createWorkout, getWorkoutSetsForWorkout, getRoutineExercisesWithDetails, deleteWorkoutAndSets } from '../lib/database';
import { enqueueSyncOp } from '../lib/syncQueue';
import { logError } from '../lib/errorLog';
import { calculateTonnage } from '../lib/algorithms';
import { workoutDayMs, workoutDayKey, calendarRelativeLabel } from '../lib/workoutDate';
import { formatLoggedSet } from '../lib/workoutHelpers';
import useAppStore from '../store/useAppStore';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
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

function hasSetValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function formatLoadValue(value, units = 'kg') {
  return `${value}${units}`;
}

export function formatHistoryExerciseSummary(sets = [], exerciseType = 'weight_reps', units = 'kg') {
  const workingSets = sets.filter(s => (s.setType ?? s.set_type ?? 'straight') !== 'warmup');
  if (workingSets.length === 0) {
    return `${sets.length} set${sets.length !== 1 ? 's' : ''} (warmup only)`;
  }
  if (exerciseType === 'duration' || exerciseType === 'distance' || exerciseType === 'reps_only') {
    const details = workingSets
      .map(s => formatLoggedSet(s, units, exerciseType).text)
      .filter(Boolean)
      .join(', ');
    return `${workingSets.length} working set${workingSets.length !== 1 ? 's' : ''}${details ? ` - ${details}` : ''}`;
  }
  const repsStr = workingSets
    .map(s => s.actualReps ?? s.actual_reps ?? s.reps)
    .filter(hasSetValue)
    .join(', ');
  const weights = [...new Set(workingSets.map(s => s.weight).filter(hasSetValue))];
  const weightStr = weights.length === 0
    ? 'bodyweight'
    : weights.length === 1
      ? formatLoadValue(weights[0], units)
      : weights.map(w => formatLoadValue(w, units)).join('/');
  return `${workingSets.length} × ${weightStr} × ${repsStr || 'reps not logged'}`;
}

export default function WorkoutHistoryScreen({ navigation }) {
  const { user, startWorkout, session, units = 'kg' } = useAppStore(useShallow(s => ({ user: s.user, startWorkout: s.startWorkout, session: s.session, units: s.units })));
  const toast = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSets, setExpandedSets] = useState({}); // workoutId -> grouped exercise data
  const loadRequestRef = useRef(0);

  // Filter + view state
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // Date | null
  // L07-F11: find a past workout by workout name, routine name, or exercise
  // name. Filters the list already loaded by loadWorkouts, no extra query -
  // routineName already comes back on each row from the getRecentCompletedWorkouts
  // JOIN in database.js, so no new database read is needed here.
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadWorkouts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadWorkouts() {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      // LB-7: the list renders only the most recent 50 completed sessions, so
      // the database query and set fan-out are both bounded to that page.
      const recentCompleted = await getRecentCompletedWorkouts(user.id, 50);
      if (!isCurrentRequest()) return;
      const page = recentCompleted.slice(0, 50);
      const [pageSets, allExercises] = await Promise.all([
        getWorkoutSetsForWorkoutIds(page.map(w => w.id)),
        getAllExercises(),
      ]);
      if (!isCurrentRequest()) return;
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
        // allExerciseNames is the FULL list (search needs every exercise in
        // the session); exerciseNames stays capped at 4 for the card summary
        // line, unchanged from before.
        const allExerciseNames = exerciseIds.map(id => exerciseMap[id]?.name).filter(Boolean);
        const exerciseNames = allExerciseNames.slice(0, 4);
        return {
          workout: w,
          setCount: mySets.length,
          workingSetCount: workingSets.length,
          exerciseCount: exerciseIds.length,
          tonnage: calculateTonnage(mySets),
          exerciseNames,
          allExerciseNames,
        };
      });
      setWorkouts(withSets);
    } catch (e) {
      if (!isCurrentRequest()) return;
      logError('WorkoutHistoryScreen.loadWorkouts', e, { userId: user?.id });
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
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
      navigateCrossTab(navigation, 'HomeTab', 'ActiveWorkout');
    } catch (e) {
      logError('WorkoutHistoryScreen.handleRepeatAsIs', e, {
        userId: user?.id, workoutId: workout?.id, routineId: workout?.routineId,
      });
      toast.show('Couldn\'t repeat workout. Try again.', { variant: 'error' });
    }
  }

  function handleRepeatWorkout(workout) {
    appAlert(
      'Repeat workout',
      'How would you like to continue?',
      [
        {
          text: 'Repeat as-is',
          onPress: () => handleRepeatAsIs(workout),
        },
        {
          text: 'View in Plans',
          onPress: () => navigateCrossTab(navigation, 'PlansTab'),
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
      'The workout and all its sets are removed from your history, and your stats recalculate. This cannot be undone.',
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
          groups[s.exerciseId] = {
            name: exerciseMap[s.exerciseId]?.name || 'Unknown',
            exerciseType: exerciseMap[s.exerciseId]?.exerciseType || exerciseMap[s.exerciseId]?.exercise_type || 'weight_reps',
            sets: [],
          };
          order.push(s.exerciseId);
        }
        groups[s.exerciseId].sets.push(s);
      }

      const grouped = order.map(id => {
        const g = groups[id];
        const workingSetCount = g.sets.filter(s => (s.setType ?? s.set_type ?? 'straight') !== 'warmup').length;
        const summary = formatHistoryExerciseSummary(g.sets, g.exerciseType, units || 'kg');
        return { exerciseId: id, name: g.name, summary, workingSetCount };
      });

      setExpandedSets(prev => ({ ...prev, [workoutId]: grouped }));
    } catch (_) {
      // silently fail, expanded view just won't show exercise breakdown
    }
  }, [expandedId, expandedSets, units]);

  // ─── Filtering logic ────────────────────────────────────────────────────────
  const filteredWorkouts = useMemo(() => {
    let result = workouts;

    // L07-F11: text search runs first, so it composes with the calendar day/
    // month narrowing and filter chips below rather than being bypassed by
    // them (a search should still narrow a selected calendar day).
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(item =>
        item.workout.name?.toLowerCase().includes(q) ||
        item.workout.routineName?.toLowerCase().includes(q) ||
        item.allExerciseNames.some(n => n.toLowerCase().includes(q)),
      );
    }

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
  }, [workouts, filter, viewMode, calendarDate, selectedDay, search]);

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
          accessibilityLabel={`Workout on ${format(date, 'd MMM yyyy')}, ${isExpanded ? 'expanded' : 'collapsed'}`}
          accessibilityHint="Double-tap to show or hide the exercise breakdown"
          accessibilityState={{ expanded: isExpanded }}
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
                <Text style={styles.cardMetaDivider}>-</Text>
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
                  <Text style={styles.statChipText}>{Math.round(tonnage).toLocaleString('en-GB')}kg lifted</Text>
                </View>
              )}
            </View>

            {/* Exercise breakdown */}
            {exerciseDetail ? (
              <View style={styles.exerciseBreakdown}>
                {exerciseDetail.map((ex, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.exerciseBreakdownRow}
                    onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'ExerciseDetail', { exerciseId: ex.exerciseId })}
                    accessibilityRole="button"
                    accessibilityLabel={`See progress for ${ex.name}`}
                  >
                    <Text style={styles.exerciseBreakdownName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exerciseBreakdownSummary} numberOfLines={1}>
                      {ex.summary}
                    </Text>
                    <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.exerciseBreakdown}>
                <Text style={styles.loadingText}>Loading exercises…</Text>
              </View>
            )}

            {/* Session notes */}
            {!!workout.notes && (
              <View style={styles.notesRow}>
                <Ionicons name="document-text-outline" size={13} color={colors.textMuted} />
                <Text style={styles.notesText}>{workout.notes}</Text>
              </View>
            )}

            {/* View summary */}
            <Button
              title="View summary"
              trailingIcon="arrow-forward"
              variant="secondary"
              size="sm"
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
              style={styles.fullSummaryBtn}
              textStyle={styles.fullSummaryBtnText}
              accessibilityLabel="View summary"
            />
          </View>
        )}

        {/* Card actions */}
        <View style={styles.cardActions}>
          {!isExpanded && (
            <Button
              title="View summary"
              variant="secondary"
              size="sm"
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
              style={styles.viewBtn}
              textStyle={styles.viewBtnText}
              accessibilityLabel="View summary"
            />
          )}
          <Button
            title="Repeat"
            icon="refresh-outline"
            variant="secondary"
            size="sm"
            onPress={() => handleRepeatWorkout(workout)}
            style={[styles.repeatBtn, isExpanded && styles.repeatBtnFull]}
            textStyle={styles.repeatBtnText}
            accessibilityLabel="Repeat workout"
          />
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
  const hasNarrowedEmpty = !loading && !loadError && workouts.length > 0 && filteredWorkouts.length === 0;
  const activeFilterLabel = FILTERS.find(f => f.key === filter)?.label || 'selected';
  const narrowedEmptyTitle = (() => {
    if (search.trim()) return `No matches for "${search.trim()}"`;
    if (viewMode === 'calendar' && selectedDay) return `No session on ${format(selectedDay, 'd MMM')}`;
    if (filter === 'month') return 'No sessions this month';
    if (filter !== 'all') return `No ${activeFilterLabel.toLowerCase()} sessions found`;
    if (viewMode === 'calendar') return `No sessions in ${format(calendarDate, 'MMMM')}`;
    return 'No sessions match this view';
  })();
  const narrowedEmptyText = (() => {
    if (search.trim()) {
      return 'Try a different exercise or workout name, or clear the search to see everything.';
    }
    if (viewMode === 'calendar' && selectedDay) {
      return 'That day has no completed workout. Show all sessions to get back to your full history.';
    }
    if (filter !== 'all') {
      return 'Your workouts are still saved. This filter just does not match any completed sessions yet.';
    }
    return 'Your workouts are still saved. This calendar month just has no completed sessions.';
  })();

  function showAllSessions() {
    setFilter('all');
    setSelectedDay(null);
    setViewMode('list');
    setSearch('');
  }

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
                ]} maxFontSizeMultiplier={1.3}>
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

      {/* L07-F11: search past workouts by exercise or workout name */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by exercise or workout name"
        accessibilityLabel="Search workout history by exercise or workout name"
      />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <Chip
              key={f.key}
              label={f.label}
              selected={active}
              onPress={() => {
                setFilter(f.key);
                setSelectedDay(null);
              }}
              accessibilityRole="radio"
              accessibilityLabel={`Filter: ${f.label}`}
              style={styles.filterChip}
              labelStyle={styles.filterChipText}
              selectedLabelStyle={styles.filterChipTextActive}
            />
          );
        })}
      </View>

      {/* Calendar grid */}
      {viewMode === 'calendar' && (
        <Card padding="md" style={styles.calendarCard}>
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
            <Button
              title="Show all this month"
              icon="calendar-clear-outline"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => setSelectedDay(null)}
              style={styles.clearDayBtn}
              textStyle={styles.clearDayText}
              accessibilityLabel="Show all this month"
            />
          )}
        </Card>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Workout history" />
      <FlashList
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
          ) : loadError ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Couldn't load workout history"
              text="Check your connection and try again. Your saved sessions have not been changed."
              actionLabel="Try again"
              onAction={loadWorkouts}
              actionAccessibilityLabel="Try loading workout history again"
            />
          ) : hasNarrowedEmpty ? (
            <EmptyState
              icon={viewMode === 'calendar' ? 'calendar-outline' : 'filter-outline'}
              title={narrowedEmptyTitle}
              text={narrowedEmptyText}
              actionLabel="Show all sessions"
              onAction={showAllSessions}
              actionAccessibilityLabel="Show all workout sessions"
            />
          ) : (
            <EmptyState
              icon="barbell-outline"
              title="Your workouts will appear here"
              text="Completed workouts appear here, saved automatically when you finish."
            />
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
  filterChip: {
    paddingVertical: spacing.xs,
  },
  filterChipText: {
    ...type.label,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // ── Calendar ───────────────────────────────────────────────────────────────
  calendarCard: {
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
    ...type.captionStrong,
    color: colors.textMuted,
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: circle(30),
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
    backgroundColor: colors.primaryFill,
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
    alignSelf: 'center',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  clearDayText: {
    ...type.label,
    color: colors.textPrimary,
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
    ...type.bodySm,
    color: colors.textSecondary,
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
    ...type.captionStrong,
    color: colors.textSecondary,
  },
  exerciseBreakdown: {
    gap: spacing.sm,
  },
  exerciseBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
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
    ...type.captionTight,
    color: colors.textSecondary,
    flex: 1,
  },
  fullSummaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  fullSummaryBtnText: {
    ...type.label,
    color: colors.textPrimary,
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
    borderColor: colors.border,
    backgroundColor: colors.surface2,
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
    color: colors.textPrimary,
  },
});
