import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  format, formatDistanceToNow,
  startOfMonth, getDaysInMonth, getDay,
  addMonths, subMonths, isSameDay,
} from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getAllWorkouts, getAllWorkoutSets, getAllExercises, createWorkout, getWorkoutSetsForWorkout } from '../lib/database';
import { calculateTonnage } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';
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
  const { user, startWorkout } = useAppStore(useShallow(s => ({ user: s.user, startWorkout: s.startWorkout })));
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedSets, setExpandedSets] = useState({}); // workoutId -> grouped exercise data

  // Filter + view state
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // Date | null

  useEffect(() => {
    loadWorkouts();
  }, [user?.id]);

  async function loadWorkouts() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const allWorkouts = await getAllWorkouts(user.id);
      const mine = allWorkouts
        .filter(w => w.isCompleted)
        .sort((a, b) => b.startedAt - a.startedAt);

      const allSets = await getAllWorkoutSets(user.id);
      const allExercises = await getAllExercises();
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

      const withSets = mine.slice(0, 50).map(w => {
        const mySets = allSets.filter(s => s.workoutId === w.id);
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
    const newWorkout = await createWorkout(user.id, workout.routineId || null);
    startWorkout(newWorkout);
    navigation.getParent()?.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
  }

  function handleRepeatWorkout(workout) {
    Alert.alert(
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
        // Build a concise set summary: weight × reps list for working sets
        const repsStr = workingSets.map(s => s.reps).join(', ');
        const weights = [...new Set(workingSets.map(s => s.weight).filter(Boolean))];
        const weightStr = weights.length === 1 ? `${weights[0]}kg` : weights.map(w => `${w}kg`).join('/');
        const summary = workingSets.length > 0
          ? `${workingSets.length} × ${weightStr} × ${repsStr}`
          : `${g.sets.length} set${g.sets.length !== 1 ? 's' : ''} (warmup only)`;
        return { name: g.name, summary, workingSetCount: workingSets.length };
      });

      setExpandedSets(prev => ({ ...prev, [workoutId]: grouped }));
    } catch (_) {
      // silently fail — expanded view just won't show exercise breakdown
    }
  }, [expandedId, expandedSets]);

  async function handleStartNewWorkout() {
    const newWorkout = await createWorkout(user.id, null);
    startWorkout(newWorkout);
    navigation.getParent()?.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
  }

  // ─── Filtering logic ────────────────────────────────────────────────────────
  const filteredWorkouts = useMemo(() => {
    let result = workouts;

    // Calendar day selection takes priority in calendar mode
    if (viewMode === 'calendar' && selectedDay) {
      return result.filter(item => isSameDay(new Date(item.workout.startedAt), selectedDay));
    }

    const now = new Date();
    const monthStart = startOfMonth(now);

    switch (filter) {
      case 'month':
        result = result.filter(item => new Date(item.workout.startedAt) >= monthStart);
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
        const d = new Date(item.workout.startedAt);
        return d >= calMonthStart && d <= calMonthEnd;
      });
    }

    return result;
  }, [workouts, filter, viewMode, calendarDate, selectedDay]);

  // ─── Calendar helpers ────────────────────────────────────────────────────────
  const trainedDatesSet = useMemo(() => {
    return new Set(workouts.map(item => format(new Date(item.workout.startedAt), 'yyyy-MM-dd')));
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
  function renderItem({ item }) {
    const { workout, setCount, workingSetCount, exerciseCount, tonnage, exerciseNames } = item;
    const date = new Date(workout.startedAt);
    const isExpanded = expandedId === workout.id;
    const exerciseDetail = expandedSets[workout.id];

    return (
      <View style={styles.card}>
        {/* Tappable header row — toggles expansion */}
        <TouchableOpacity
          onPress={() => handleToggleExpand(workout.id)}
          activeOpacity={0.7}
          style={styles.cardHeaderTouchable}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardDate}>{format(date, 'd MMM yyyy')}</Text>
              <Text style={styles.cardTime}>{formatDistanceToNow(date, { addSuffix: true })}</Text>
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
        </TouchableOpacity>

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
                  readOnly: true,
                })
              }
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
                  readOnly: true,
                })
              }
            >
              <Text style={styles.viewBtnText}>View Details</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.repeatBtn, isExpanded && styles.repeatBtnFull]}
            onPress={() => handleRepeatWorkout(workout)}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={styles.repeatBtnText}>Repeat</Text>
          </TouchableOpacity>
        </View>
      </View>
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
            <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.clearDayBtn}>
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
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No sessions logged yet</Text>
              <Text style={styles.emptyText}>
                Completed workouts appear here. Each session is saved automatically when you finish.
              </Text>
            </View>
          ) : null
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
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
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  dayNumTrained: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  dayNumSelected: {
    color: colors.background,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMetaText: {
    fontSize: fontSize.xs,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  exerciseBreakdownSummary: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 2,
    textAlign: 'right',
  },
  loadingText: {
    fontSize: fontSize.xs,
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
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
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
  repeatBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
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
