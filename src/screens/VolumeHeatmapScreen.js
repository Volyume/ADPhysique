import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, volumeStatusColor, stateColors, circle } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackHeader from '../components/BackHeader';
import InfoTooltip from '../components/InfoTooltip';
import Card from '../components/Card';
import Button from '../components/Button';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import BodyDiagramHeatmap from '../components/BodyDiagramHeatmap';
import { useToast } from '../components/Toast';
import { getCompletedWorkoutSets, getAllExercises, getWeeklyVolumeByMuscle, getLastTrainedByMuscle, getActivePlan } from '../lib/database';
import { computeDivisionDiff, fingerprintMarkers, planWearsDivision } from '../lib/divisionDiff';
import { buildPlanInputs } from '../lib/planAutoGen';
import { GOAL_LABELS } from '../lib/coachingGoals';
import { logError } from '../lib/errorLog';
import { syncUserPref } from '../lib/sync';
import {
  calculateWeeklyVolume, VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES, getVolumeStatus,
} from '../lib/algorithms';
import { useFocusEffect } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import WindowChips from '../components/WindowChips';
import VolyumeChart from '../components/VolyumeChart';
import { VOLUME_WINDOWS, windowByKey, volumeTakeaway } from '../lib/chartWindows';
import { track } from '../lib/engineTelemetry';
import { freshnessBand } from '../lib/muscleRecovery';

// Freshness band -> CVD-safe semantic colour + plain-English label. Reuses the
// shared stateColors grammar (the colour-blind-safe Okabe-Ito tokens) so the
// recovery layer never invents a new hue that fails CVD. Fully recovered reads
// as 'onTrack'/success (green = ready to train), mid-recovery as 'watch'/warning.
// "Recently trained" is the resting state, deliberately 'neutral'/muted, NOT
// 'act'/error: training a muscle today is normal and expected, so a red dot
// there wrongly read as a warning and collided with red = "too much volume" on
// the volume bar. Muted reads as "worked, now resting", with no false alarm.
const FRESHNESS_META = {
  fresh: { get color() { return stateColors.onTrack; }, label: 'Fresh' },
  recovering: { get color() { return stateColors.watch; }, label: 'Recovering' },
  fatigued: { get color() { return stateColors.neutral; }, label: 'Recently trained' },
};

const WINDOW_OPTIONS = [
  { weeks: 1, label: '1 week' },
  { weeks: 2, label: '2 weeks' },
  { weeks: 4, label: '4 weeks' },
];

export default function VolumeHeatmapScreen() {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
  })));
  const toast = useToast();
  const [weeklyVolume, setWeeklyVolume] = useState({});
  // NAV-8: first paint showed an empty diagram while sets loaded; skeleton
  // cards cover the read instead. Only the FIRST load gates the render;
  // window switches update in place.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [previousVolume, setPreviousVolume] = useState({});
  const [windowWeeks, setWindowWeeks] = useState(1);
  const [customLandmarks, setCustomLandmarks] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [lastTrainedMap, setLastTrainedMap] = useState({});
  const [hasAnyCompletedSets, setHasAnyCompletedSets] = useState(false);
  // COMP-019: the volume trend section gets its own window (4W/8W/3M/6M). Kept
  // at 4W by default to preserve the section's current shape; chips widen it.
  const [trendWindowKey, setTrendWindowKey] = useState('4W');
  // A4: division fingerprint markers ({ muscle: 'elevated'|'capped' }) + the
  // division's display label. Set only when the ACTIVE plan is the generated
  // division plan for the profile's goal; null for everyone else, so no
  // tier check is needed here (the data simply does not exist otherwise).
  const [divisionMarkers, setDivisionMarkers] = useState(null);
  const [divisionLabel, setDivisionLabel] = useState(null);
  const loadRequestRef = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { loadData(); }, [user?.id, windowWeeks, trendWindowKey, userProfile?.trainingGoal]));

  // Restore the persisted trend window on mount.
  useEffect(() => {
    (async () => {
      try { const v = await AsyncStorage.getItem('@volyume_chart_window_volume'); if (v) setTrendWindowKey(v); } catch (_) {}
    })();
  }, []);

  function selectTrendWindow(key) {
    setTrendWindowKey(key);
    AsyncStorage.setItem('@volyume_chart_window_volume', key).catch(() => {});
    try { track(user?.id, 'chart_window_changed', { chart_id: 'volume', window: key })?.catch?.(() => {}); } catch (_) {}
  }

  async function loadData() {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;
    if (!user?.id) {
      setWeeklyVolume({});
      setPreviousVolume({});
      setTrendData([]);
      setLastTrainedMap({});
      setHasAnyCompletedSets(false);
      setDivisionMarkers(null);
      setDivisionLabel(null);
      setLoadError(false);
      setLoading(false);
      return;
    }
    if (loading || loadError) setLoading(true);
    setLoadError(false);
    try {
      const windowMs = windowWeeks * 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const windowStart = now - windowMs;
      const prevWindowStart = now - 2 * windowMs;

      const allSets = await getCompletedWorkoutSets(user.id);
      if (!isCurrentRequest()) return;
      setHasAnyCompletedSets(allSets.length > 0);
      const recentSets = allSets.filter(s => s.createdAt >= windowStart);
      const prevSets = allSets.filter(s => s.createdAt >= prevWindowStart && s.createdAt < windowStart);

      const allExercises = await getAllExercises();
      if (!isCurrentRequest()) return;
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

      const volume = calculateWeeklyVolume(recentSets, exerciseMap);
      const prevVolume = calculateWeeklyVolume(prevSets, exerciseMap);
      setWeeklyVolume(volume);
      setPreviousVolume(prevVolume);

      const trendWin = windowByKey(VOLUME_WINDOWS, trendWindowKey) ?? windowByKey(VOLUME_WINDOWS, '4W');
      const trend = await getWeeklyVolumeByMuscle(user.id, trendWin.weeks);
      if (!isCurrentRequest()) return;
      setTrendData(trend);

      const lastTrained = await getLastTrainedByMuscle(user.id).catch(() => ({}));
      if (!isCurrentRequest()) return;
      setLastTrainedMap(lastTrained);

      // A4: division fingerprint. Pure re-presentation of the volume overlay
      // the plan generator already applied: diff the division plan's weekly
      // set counts against the general plan for the SAME profile inputs
      // (deterministic engine, so this recomputes exactly what was applied).
      // Only claimed when the active plan IS the generated division plan;
      // best-effort, markers simply stay absent on any failure.
      try {
        const goal = userProfile?.trainingGoal;
        const active = await getActivePlan(user.id).catch(() => null);
        if (!isCurrentRequest()) return;
        const inputs = active && planWearsDivision(active.name, goal)
          ? buildPlanInputs(userProfile)
          : null;
        if (inputs) {
          const diff = computeDivisionDiff({ ...inputs, exerciseLibrary: allExercises });
          setDivisionMarkers(fingerprintMarkers(diff));
          setDivisionLabel(GOAL_LABELS[goal] ?? null);
        } else {
          setDivisionMarkers(null);
          setDivisionLabel(null);
        }
      } catch (_) {
        if (!isCurrentRequest()) return;
        setDivisionMarkers(null);
        setDivisionLabel(null);
      }

      // Custom volume targets. Stored in AsyncStorage under an @volyume_
      // key, which the generic user_prefs sync round-trips to cloud (push
      // in bulkUploadLocalData, restore in pullFromCloud), so the setting
      // survives a reinstall or a sign-out/in on the same account. Saving
      // and resetting below also push immediately via syncUserPref so the
      // change is not stranded until the next bulk sync.
      const stored = await AsyncStorage.getItem(`@volyume_landmarks_${user.id}`).catch(() => null);
      if (!isCurrentRequest()) return;
      let parsed = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (_) {}
      }
      if (parsed) {
        setCustomLandmarks(parsed);
        setEditValues(parsed);
      } else {
        const defaults = {};
        for (const [m, v] of Object.entries(VOLUME_LANDMARKS)) {
          defaults[m] = { mev: v.mev, mav: v.mav, mrv: v.mrv };
        }
        setEditValues(defaults);
      }
    } catch (e) {
      if (!isCurrentRequest()) return;
      logError('VolumeHeatmapScreen.loadData', e, { userId: user?.id, windowWeeks });
      setWeeklyVolume({});
      setPreviousVolume({});
      setTrendData([]);
      setLastTrainedMap({});
      setHasAnyCompletedSets(false);
      setDivisionMarkers(null);
      setDivisionLabel(null);
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  async function saveLandmarks() {
    if (!user?.id) return;
    const map = {};
    for (const [muscle, vals] of Object.entries(editValues)) {
      map[muscle] = {
        mev: parseInt(vals.mev) || 0,
        mav: parseInt(vals.mav) || 0,
        mrv: parseInt(vals.mrv) || 0,
      };
    }
    const key = `@volyume_landmarks_${user.id}`;
    const json = JSON.stringify(map);
    await AsyncStorage.setItem(key, json);
    // Push straight to cloud so the targets survive a reinstall even if no
    // bulk sync runs before then. Best-effort: a failure just defers the
    // push to the next bulk sync, which still covers this key.
    syncUserPref(user.id, key, json).catch(() => {});
    setCustomLandmarks(map);
    setEditing(false);
    toast.show('Volume targets saved', { variant: 'success' });
  }

  async function resetToDefaults() {
    appAlert('Reset volume targets?', 'This will restore the default recommended values.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          const key = `@volyume_landmarks_${user.id}`;
          await AsyncStorage.removeItem(key);
          // Clear the cloud copy too. Without this the old custom targets
          // would ride pullFromCloud back onto the device on the next
          // reinstall and silently undo the reset. There is no pref-delete
          // RPC, so an empty value is the "no custom targets" sentinel:
          // loadData treats a falsy stored value as defaults.
          syncUserPref(user.id, key, '').catch(() => {});
          setCustomLandmarks(null);
          const defaults = {};
          for (const [m, v] of Object.entries(VOLUME_LANDMARKS)) defaults[m] = { ...v };
          setEditValues(defaults);
          setEditing(false);
        },
      },
    ]);
  }

  const effectiveLandmarks = customLandmarks || null;
  const muscles = Object.keys(VOLUME_LANDMARKS);

  // ScrollView + per-row refs so the body diagram can scroll the user to a
  // muscle's bar when its region is tapped.
  const scrollRef = useRef(null);
  const heatmapCardRef = useRef(null);
  const rowOffsets = useRef({});

  // Build the diagram input: for each known muscle, attach workingSets +
  // status + colour from getVolumeStatus. Muscles with no data fall through
  // to the neutral fill inside BodyDiagramHeatmap.
  const volumeByMuscle = useMemo(() => {
    const map = {};
    for (const muscle of muscles) {
      const sets = Math.round(weeklyVolume[muscle]?.workingSets || 0);
      const { status, label } = getVolumeStatus(sets, muscle, effectiveLandmarks);
      map[muscle] = { workingSets: sets, status, color: volumeStatusColor(status), label };
    }
    return map;
  }, [weeklyVolume, effectiveLandmarks, muscles]);

  // Muscles trained at least once in the 4-week trend window, in heatmap order.
  const trainedMuscles = useMemo(() => {
    if (!trendData.length) return [];
    return muscles.filter(muscle =>
      trendData.some(week => (week.volumeByMuscle[muscle] || 0) > 0),
    );
  }, [trendData, muscles]);

  // COMP-019: total weekly working sets across all muscles, for the trend
  // takeaway. Weeks with no training are dropped (the average is over training
  // weeks); leading empties signal the window reaches past the account's start.
  const volWeeklyTotals = useMemo(() => trendData
    .map(week => Math.round(Object.values(week.volumeByMuscle || {}).reduce((t, v) => t + v, 0)))
    .filter(t => t > 0), [trendData]);
  // Always use the window's canonical phrase. We can't tell "window reaches
  // past the account start" apart from "a rest week sits inside the window"
  // without the first-workout date, and the latter must not read as "All N
  // weeks", so the volume takeaway names the window, not a guessed span.
  const volTakeaway = volumeTakeaway({
    windowKey: trendWindowKey, coversAll: false, spanDays: 0, weeklySets: volWeeklyTotals,
  });
  const hasWindowVolume = useMemo(() => Object.values(weeklyVolume)
    .some(v => Math.round(v?.workingSets || 0) > 0), [weeklyVolume]);
  const showNoVolumeGuidance = !hasWindowVolume;
  const noVolumeTitle = hasAnyCompletedSets
    ? `No sets in this ${windowWeeks === 1 ? '1-week' : `${windowWeeks}-week`} view`
    : 'Volume appears after your first workout';
  const noVolumeText = hasAnyCompletedSets
    ? 'Your training history is still saved. Switch to a wider window if you want to see older volume.'
    : 'Finish a workout and this screen will show weekly set volume, recovery freshness and target ranges by muscle.';

  const handleMuscleTap = useCallback((muscleKey) => {
    const offset = rowOffsets.current[muscleKey];
    if (offset == null || !scrollRef.current) return;
    // Add a small headroom above the row so the label is visible below the diagram.
    scrollRef.current.scrollTo({ y: Math.max(offset - spacing.lg, 0), animated: true });
  }, []);

  const windowNoteText =
    windowWeeks === 1
      ? 'Showing sets from the last week'
      : windowWeeks === 2
      ? 'Showing sets from the last 2 weeks'
      : 'Showing sets from the last 4 weeks';

  function formatLastTrained(daysAgo) {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo}d ago`;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackHeader title="Volume heatmap" />
        <View style={styles.loadingStack} accessibilityLabel="Loading volume heatmap">
          <SkeletonCard height={220} />
          <SkeletonCard height={92} />
          <SkeletonCard height={160} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackHeader title="Volume heatmap" />
        <View style={styles.content}>
          <EmptyState
            icon="warning-outline"
            title="Couldn't load volume heatmap"
            text="Check your connection and try again."
            actionLabel="Try again"
            onAction={loadData}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Volume heatmap" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {/* Anatomical body heatmap, tap a muscle to jump to its bar below */}
        <BodyDiagramHeatmap
          volumeByMuscle={volumeByMuscle}
          onMuscleTap={handleMuscleTap}
          divisionMarkers={divisionMarkers}
          divisionLabel={divisionLabel}
        />

        {/* Rolling window selector */}
        <View style={styles.windowSelector}>
          {WINDOW_OPTIONS.map(opt => {
            const active = windowWeeks === opt.weeks;
            return (
              <TouchableOpacity
                key={opt.weeks}
                style={[
                  styles.windowBtn,
                  active
                    ? { backgroundColor: colors.primaryBg, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setWindowWeeks(opt.weeks)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={opt.label}
              >
                <Text
                  style={[
                    styles.windowBtnText,
                    { color: active ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rolling window note */}
        <View style={styles.windowNote}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.windowNoteText}>{windowNoteText}</Text>
        </View>

        {showNoVolumeGuidance && (
          <EmptyState
            icon={hasAnyCompletedSets ? 'time-outline' : 'barbell-outline'}
            title={noVolumeTitle}
            text={noVolumeText}
            compact
          />
        )}

        {/* Legend */}
        <Card padding="md" radius="md" style={styles.legendRow}>
          <LegendItem color={colors.textMuted} label="Below minimum" />
          <LegendItem color={colors.success} label="Optimal" />
          <LegendItem color={colors.warning} label="Getting close" />
          <LegendItem color={colors.error} label="Too much" />
          <InfoTooltip size={11} text={
            'Each bar shows weekly sets for a muscle group.\n\n' +
            'The two tick marks on each bar are:\n' +
            '  First tick: the least amount needed to maintain or grow\n' +
            '  Second tick: the sweet spot for growth\n' +
            '  End of bar: beyond this, recovery suffers\n\n' +
            'Aim to stay between the two ticks most weeks. You can customise these targets using the "Edit volume targets" button below.'
          } />
        </Card>

        {/* Recovery / freshness legend. A distinct layer from the volume bands
            above: this reads "how recently was each muscle trained", not "is it
            at target". Numbers/labels first, calm, a small dot per band. */}
        <Card padding="md" radius="md" style={styles.legendRow}>
          <LegendItem color={FRESHNESS_META.fresh.color} label="Fresh" />
          <LegendItem color={FRESHNESS_META.recovering.color} label="Recovering" />
          <LegendItem color={FRESHNESS_META.fatigued.color} label="Recently trained" />
          <InfoTooltip size={11} text={
            'A second, separate view: how recently each muscle was trained.\n\n' +
            '  Fresh: recovered and ready\n' +
            '  Recovering: part-way through its recovery window\n' +
            '  Recently trained: trained today\n\n' +
            'Each muscle has a sensible recovery window, so larger muscles take longer to read as fresh. The dot beside each bar shows its current state.'
          } />
        </Card>

        {/* Muscle Rows */}
        <View
          ref={heatmapCardRef}
          style={styles.heatmapCard}
          onLayout={(e) => {
            // Remember the card's y so per-row offsets can be added to it.
            rowOffsets.current.__cardY = e.nativeEvent.layout.y;
          }}
        >
          {muscles.map(muscle => {
            const data = weeklyVolume[muscle] || { workingSets: 0 };
            const prevData = previousVolume[muscle] || { workingSets: 0 };
            const sets = Math.round(data.workingSets || 0);
            const prevSets = Math.round(prevData.workingSets || 0);
            const landmarks = effectiveLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle];
            const { status } = getVolumeStatus(sets, muscle, effectiveLandmarks);
            const color = volumeStatusColor(status);
            const mrv = landmarks.mrv || 20;
            const fillPct = Math.min(sets / mrv, 1);
            const ghostFillPct = Math.min(prevSets / mrv, 1);

            return (
              <View
                key={muscle}
                style={styles.muscleRow}
                onLayout={(e) => {
                  // Per-row y is relative to the heatmap card; combine with the
                  // card's y to get a position inside the ScrollView.
                  const rowY = e.nativeEvent.layout.y;
                  rowOffsets.current[muscle] = (rowOffsets.current.__cardY || 0) + rowY;
                }}
              >
                <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${ghostFillPct * 100}%`,
                        backgroundColor: colors.textMuted,
                        opacity: 0.25,
                        position: 'absolute',
                      },
                    ]}
                  />
                  <View style={[styles.barFill, { width: `${fillPct * 100}%`, backgroundColor: color }]} />
                  <View style={[styles.landmark, { left: `${(landmarks.mev / mrv) * 100}%` }]} />
                  <View style={[styles.landmark, { left: `${(landmarks.mav / mrv) * 100}%` }]} />
                </View>
                <Text style={[styles.setsCount, { color }]}>{sets}</Text>
                <Text style={styles.mrvLabel}>/{mrv}</Text>
                {lastTrainedMap[muscle] != null && (() => {
                  // Reuse the already-computed days-since-trained as the
                  // freshness input. The dot is the recovery layer; the text is
                  // the existing "last trained" recency. Null band (no data)
                  // renders no dot, matching the chip's null-safety.
                  const band = freshnessBand(lastTrainedMap[muscle].daysAgo, muscle);
                  const meta = band && FRESHNESS_META[band];
                  return (
                    <View style={styles.freshnessGroup}>
                      {meta && (
                        <View
                          style={[styles.freshnessDot, { backgroundColor: meta.color }]}
                          accessibilityRole="image"
                          accessibilityLabel={`${MUSCLE_DISPLAY_NAMES[muscle]} ${meta.label}`}
                        />
                      )}
                      <Text style={[
                        styles.lastTrainedChip,
                        lastTrainedMap[muscle].daysAgo <= 1 && styles.lastTrainedRecent,
                      ]}>
                        {formatLastTrained(lastTrainedMap[muscle].daysAgo)}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            );
          })}
        </View>

        {/* Volume trend, hidden for new users with no data */}
        {trainedMuscles.length > 0 && (
          <Card style={styles.section}>
            <SectionLabel>Volume trend</SectionLabel>
            <WindowChips windows={VOLUME_WINDOWS} selectedKey={trendWindowKey} onSelect={selectTrendWindow}
              accessibilityPrefix="volume trend window" />
            {!!volTakeaway && <Text style={styles.trendTakeaway}>{volTakeaway}</Text>}
            {trainedMuscles.map(muscle => (
              <MuscleTrendRow
                key={muscle}
                muscle={muscle}
                trendData={trendData}
                customLandmarks={effectiveLandmarks}
              />
            ))}
          </Card>
        )}

        {/* Edit volume targets */}
        {editing ? (
          <Card style={styles.editSection}>
            <Text style={styles.editTitle}>Edit volume targets</Text>
            <Text style={styles.editSubtitle}>Weekly sets per muscle - minimum / target / ceiling</Text>
            {muscles.map(muscle => (
              <View key={muscle} style={styles.editRow}>
                <Text style={styles.editMuscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
                <View style={styles.editInputs}>
                  {[['mev', 'Min'], ['mav', 'Target'], ['mrv', 'Max']].map(([key, label]) => (
                    <TextField
                      key={key}
                      label={label}
                      value={String(editValues[muscle]?.[key] ?? '')}
                      onChangeText={v => setEditValues(prev => ({
                        ...prev,
                        [muscle]: { ...prev[muscle], [key]: v },
                      }))}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      accessibilityLabel={`${MUSCLE_DISPLAY_NAMES[muscle]} ${label}`}
                      containerStyle={styles.editInputGroup}
                      labelStyle={styles.editInputLabel}
                      fieldStyle={styles.editInputField}
                      inputStyle={styles.editInputText}
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.editActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setEditing(false)}
                accessibilityLabel="Cancel"
                style={styles.editActionButton}
              />
              <Button
                title="Save"
                size="sm"
                onPress={saveLandmarks}
                accessibilityLabel="Save volume targets"
                style={styles.editActionButton}
              />
            </View>
          </Card>
        ) : (
          <View style={styles.actionRow}>
            <Button
              title="Edit volume targets"
              variant="secondary"
              size="sm"
              onPress={() => setEditing(true)}
              accessibilityLabel="Edit volume targets"
              style={styles.actionButton}
            />
            <Button
              title="Reset to defaults"
              variant="outline"
              size="sm"
              onPress={resetToDefaults}
              accessibilityLabel="Reset volume targets to defaults"
              style={[styles.actionButton, styles.resetButton]}
              textStyle={styles.resetButtonText}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 10, height: 10, borderRadius: circle(10), backgroundColor: color }} />
      <Text style={{ fontSize: fontSize.micro, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const SPARK_BAR_WIDTH = 8;
const SPARK_BAR_GAP = 2;
const SPARK_MAX_HEIGHT = 24;

function MuscleTrendRow({ muscle, trendData, customLandmarks }) {
  // trendData is the window's weekly array (oldest → newest), each entry has
  // volumeByMuscle. COMP-019 Stage 1b: bars render through VolyumeChart's bar
  // variant with tap-and-hold scrub; since a 24px row has no room for a tooltip
  // card, the scrubbed week's count surfaces in the trailing label instead.
  const counts = trendData.map(w => w.volumeByMuscle[muscle] || 0);
  const [scrubIdx, setScrubIdx] = useState(null);

  const barColorFor = (count) => (count === 0
    ? colors.surface3
    : volumeStatusColor(getVolumeStatus(count, muscle, customLandmarks).status));

  const barData = counts.map(c => ({ value: c, color: barColorFor(c) }));
  const chartWidth = counts.length * SPARK_BAR_WIDTH + Math.max(0, counts.length - 1) * SPARK_BAR_GAP;

  const showIdx = scrubIdx != null && scrubIdx >= 0 && scrubIdx < counts.length
    ? scrubIdx
    : counts.length - 1;
  const showCount = counts[showIdx] ?? 0;

  return (
    <View style={trendStyles.row}>
      <Text style={trendStyles.muscleName} numberOfLines={1}>
        {MUSCLE_DISPLAY_NAMES[muscle]}
      </Text>
      <View style={trendStyles.sparkContainer}>
        <VolyumeChart
          variant="bar"
          data={barData}
          width={chartWidth}
          height={SPARK_MAX_HEIGHT}
          barWidth={SPARK_BAR_WIDTH}
          barGap={SPARK_BAR_GAP}
          color={colors.primary}
          interactive
          onScrubIndex={setScrubIdx}
          accessibilityLabel={`${MUSCLE_DISPLAY_NAMES[muscle]} weekly volume trend`}
          formatTooltip={(i) => ({
            title: MUSCLE_DISPLAY_NAMES[muscle],
            sub: `${trendData[i]?.weekLabel ?? `week ${i + 1}`}: ${counts[i]} sets`,
          })}
        />
      </View>
      <Text
        style={[
          trendStyles.currentCount,
          { color: volumeStatusColor(getVolumeStatus(showCount, muscle, customLandmarks).status) },
        ]}
      >
        {showCount}
      </Text>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  muscleName: {
    ...type.caption,
    width: 80,
    color: colors.textMuted,
  },
  sparkContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: SPARK_MAX_HEIGHT,
  },
  currentCount: {
    width: 20,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingStack: { padding: spacing.lg, gap: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  windowSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  windowBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  windowBtnText: {
    ...type.label,
  },
  windowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  windowNoteText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  heatmapCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muscleName: {
    ...type.label,
    width: 90,
    color: colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    minWidth: 2,
  },
  landmark: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  setsCount: {
    width: 22,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
  },
  mrvLabel: {
    ...type.num('caption'),
    color: colors.textMuted,
    width: 24,
  },
  freshnessGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  freshnessDot: {
    width: 8,
    height: 8,
    borderRadius: circle(8),
  },
  lastTrainedChip: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  lastTrainedRecent: {
    color: colors.warning,
  },
  section: {
    gap: spacing.sm,
  },
  trendTakeaway: { ...type.bodySm, color: colors.textSecondary },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  resetButton: { borderColor: colors.error },
  resetButtonText: { color: colors.error },
  editSection: {
    gap: spacing.lg,
  },
  editTitle: { ...type.title, color: colors.textPrimary },
  editSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: -spacing.sm },
  editRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editMuscleName: { ...type.label, color: colors.textSecondary },
  editInputs: { flexDirection: 'row', gap: spacing.sm },
  editInputGroup: { flex: 1, gap: spacing.xs },
  editInputLabel: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  editInputField: { borderRadius: radius.sm },
  editInputText: { textAlign: 'center', fontWeight: fontWeight.bold },
  editActions: { flexDirection: 'row', gap: spacing.md },
  editActionButton: {
    flex: 1,
  },
});
