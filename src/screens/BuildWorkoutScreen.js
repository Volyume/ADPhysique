import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, fontSize, fontWeight, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import Stepper from '../components/Stepper';
import TextField from '../components/TextField';
import BottomSheet from '../components/BottomSheet';
import Chip from '../components/Chip';
import { getAllExercises, createWorkout } from '../lib/database';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { suggestRestSeconds } from '../lib/restSuggest';
import { generateTravelPlan } from '../lib/travelMode';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { logError } from '../lib/errorLog';
import * as haptics from '../lib/haptics';

const DEFAULT_SETS = 3;
// The shipped global default rest (defaultRestSeconds starts at 90, Hevy
// teardown R1). While the user has never changed it, newly added exercises
// pre-fill from the B9 fixed suggestion table instead (restSuggest.js);
// once they set their own default it is honoured verbatim.
const DEFAULT_REST = 90;

export default function BuildWorkoutScreen({ navigation }) {
  const toast = useToast();
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, startWorkout, units, defaultRestSeconds, workoutPrefsLoaded, loadWorkoutPrefs, reduceMotion } = useAppStore(useShallow(s => ({
    user: s.user,
    startWorkout: s.startWorkout,
    units: s.units,
    defaultRestSeconds: s.defaultRestSeconds,
    workoutPrefsLoaded: s.workoutPrefsLoaded,
    loadWorkoutPrefs: s.loadWorkoutPrefs,
    reduceMotion: s.accessibility?.reduceMotion,
  })));
  // Hydrate the device-local workout prefs so a cold build started before
  // visiting Settings/ActiveWorkout still picks up the user's saved default rest.
  useEffect(() => {
    if (!workoutPrefsLoaded) loadWorkoutPrefs();
  }, [workoutPrefsLoaded, loadWorkoutPrefs]);
  const [exercises, setExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [allExercises, setAllExercises] = useState([]);
  const [starting, setStarting] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [travelEquipment, setTravelEquipment] = useState('bodyweight');
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js). Memoised
  // because this screen renders a FlashList (the picker's renderItem runs
  // once per row).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  async function openPicker() {
    if (allExercises.length === 0) {
      const all = await getAllExercises();
      setAllExercises(all);
    }
    setQuery('');
    setShowPicker(true);
  }

  function addExercise(exercise) {
    // B9 deterministic rest suggestion: when the user's global default rest
    // is still the shipped 90s, pre-fill with the fixed-table suggestion for
    // this exercise (compound 180s, isolation 90s) and label it "suggested".
    // A user-set default (anything other than 90) always wins, so nobody who
    // chose their own rest sees it change. Editable via the stepper as before.
    haptics.selection();
    const hasCustomDefault =
      Number.isFinite(defaultRestSeconds) && defaultRestSeconds !== DEFAULT_REST;
    setExercises(prev => [...prev, {
      key: `${exercise.id}-${Date.now()}`,
      exercise,
      sets: DEFAULT_SETS,
      repsMin: exercise.defaultRepMin || 8,
      repsMax: exercise.defaultRepMax || 12,
      restSeconds: hasCustomDefault ? defaultRestSeconds : suggestRestSeconds({ exercise }),
      restSuggested: !hasCustomDefault,
      startingWeight: 0,
    }]);
    setShowPicker(false);
  }

  function removeExercise(key) {
    haptics.commit();
    setExercises(prev => prev.filter(e => e.key !== key));
  }

  function updateField(key, field, value) {
    setExercises(prev => prev.map(e => e.key === key ? { ...e, [field]: value } : e));
  }

  function setExerciseSets(key, value) {
    setExercises(prev => prev.map(e => {
      if (e.key !== key) return e;
      const next = Math.max(1, Math.min(20, value));
      return { ...e, sets: next };
    }));
  }

  function setExerciseRest(key, value) {
    setExercises(prev => prev.map(e => {
      if (e.key !== key) return e;
      const next = Math.max(30, Math.min(600, value));
      // Once the user touches the stepper it is their number, not a suggestion.
      return { ...e, restSeconds: next, restSuggested: false };
    }));
  }

  async function handleStartTraining() {
    if (exercises.length === 0) {
      toast.show('Add at least one exercise, or start empty from the footer.', { variant: 'warning' });
      return;
    }
    setStarting(true);
    try {
      const workout = await createWorkout(user.id);
      const initialExercises = exercises.map(({ exercise, sets, repsMin, repsMax, restSeconds, startingWeight }) => ({
        exercise,
        routineExercise: {
          recommendedSets: sets,
          recommendedRepsMin: repsMin,
          recommendedRepsMax: repsMax,
          restSeconds,
          startingWeight,
          notes: null,
        },
        sets: [],
      }));
      startWorkout(workout, initialExercises);
      navigation.replace('ActiveWorkout');
    } catch (e) {
      logError('BuildWorkoutScreen.handleStartTraining', e, { userId: user?.id, exerciseCount: exercises.length });
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    } finally {
      setStarting(false);
    }
  }

  async function handleSkip() {
    setStarting(true);
    try {
      const workout = await createWorkout(user.id);
      startWorkout(workout, []);
      navigation.replace('ActiveWorkout');
    } catch (e) {
      logError('BuildWorkoutScreen.handleSkip', e, { userId: user?.id });
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    } finally {
      setStarting(false);
    }
  }

  async function applyTravelMode() {
    setShowTravelModal(false);
    const all = allExercises.length > 0 ? allExercises : await getAllExercises();
    if (allExercises.length === 0) setAllExercises(all);
    const plan = generateTravelPlan({ equipment: travelEquipment, daysPerWeek: 4, splitType: 'full_body' });
    const session = plan.sessions[0];
    const newItems = session.exercises.map(ex => {
      const nameLower = ex.exerciseName.toLowerCase();
      const match = all.find(e => e.name.toLowerCase() === nameLower)
        ?? all.find(e => e.name.toLowerCase().includes(nameLower.split(' ')[0]));
      const exercise = match ?? {
        id: `travel-${Date.now()}-${Math.random()}`,
        name: ex.exerciseName,
        primaryMuscle: '',
        equipment: travelEquipment,
      };
      return {
        key: `${exercise.id}-${Date.now()}-${Math.random()}`,
        exercise,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        restSeconds: ex.restSec,
        startingWeight: 0,
      };
    });
    setExercises(newItems);
  }

  // Filtering (not truncation) decides what shows: search the whole library so
  // no exercise is silently hidden. A render cap stays only as a list perf
  // guard, and it now applies AFTER the search filter (not before it), with a
  // visible "refine your search" hint when it bites, so the user is never left
  // wondering where an exercise went.
  const PICKER_RENDER_CAP = 80;
  const matches = query.trim()
    ? allExercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : allExercises;
  const filtered = matches.slice(0, PICKER_RENDER_CAP);
  const filteredTruncated = matches.length > PICKER_RENDER_CAP;

  function formatRest(secs) {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Create workout" />

      {/* L03-C5 (2026-07-09 design audit): the rep/weight TextFields sit in
          a ScrollView with the "Start training" footer below it in normal
          flex flow (not absolutely positioned). Wrapping both in the app's
          standard KeyboardAvoidingView (same behavior prop as PlansScreen /
          ManualBuilderScreen) keeps the footer above the keyboard. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, live.subtitle]}>Choose the exercises you want today. You can adjust sets, reps, rest and starting weight before you train.</Text>

        {/* Travel Mode quick-fill */}
        <TouchableOpacity style={[styles.travelChip, live.travelChip]} onPress={() => setShowTravelModal(true)} accessibilityRole="button" accessibilityLabel="Travel or hotel gym mode">
          <Ionicons name="airplane-outline" size={15} color={t.colors.textSecondary} />
          <Text style={[styles.travelChipText, live.travelChipText]}>Travel / hotel gym</Text>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>

        {exercises.map((item, index) => (
          <View key={item.key} style={[styles.exerciseCard, live.exerciseCard]}>
            <View style={styles.exerciseCardHeader}>
              <View style={[styles.indexBadge, live.indexBadge]}>
                <Text style={[styles.indexNum, live.indexNum]}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, live.exerciseName]}>{item.exercise.name}</Text>
                <Text style={[styles.exerciseMuscle, live.exerciseMuscle]}>
                  {MUSCLE_DISPLAY_NAMES[item.exercise.primaryMuscle] ||
                    (item.exercise.primaryMuscle || '').charAt(0).toUpperCase() +
                    (item.exercise.primaryMuscle || '').slice(1).replace(/_/g, ' ')}
                  {item.exercise.equipment ? ` - ${item.exercise.equipment}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeExercise(item.key)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.exercise.name}`}
              >
                <Ionicons name="close-circle-outline" size={22} color={t.colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.controls}>
              {/* Sets */}
              <View style={styles.controlGroup}>
                <Text style={[styles.controlLabel, live.controlLabel]}>Sets</Text>
                <Stepper
                  value={item.sets}
                  min={1}
                  max={20}
                  onChange={(next) => setExerciseSets(item.key, next)}
                  size="compact"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  label="sets"
                  valueLabel={`${item.sets} sets`}
                  decreaseLabel="Decrease sets"
                  increaseLabel="Increase sets"
                />
              </View>

              {/* Rep Range */}
              <View style={styles.controlGroup}>
                <Text style={[styles.controlLabel, live.controlLabel]}>Reps</Text>
                <View style={styles.repRow}>
                  <TextField
                    containerStyle={styles.repFieldContainer}
                    fieldStyle={styles.repField}
                    inputStyle={[styles.repInput, live.repInput]}
                    value={String(item.repsMin)}
                    onChangeText={v => updateField(item.key, 'repsMin', parseInt(v) || item.repsMin)}
                    keyboardType="number-pad"
                    maxLength={3}
                    accessibilityLabel="Minimum reps"
                  />
                  <Text style={[styles.repSep, live.repSep]}>-</Text>
                  <TextField
                    containerStyle={styles.repFieldContainer}
                    fieldStyle={styles.repField}
                    inputStyle={[styles.repInput, live.repInput]}
                    value={String(item.repsMax)}
                    onChangeText={v => updateField(item.key, 'repsMax', parseInt(v) || item.repsMax)}
                    keyboardType="number-pad"
                    maxLength={3}
                    accessibilityLabel="Maximum reps"
                  />
                </View>
              </View>

              {/* Rest */}
              <View style={styles.controlGroup}>
                <Text style={[styles.controlLabel, live.controlLabel]}>{item.restSuggested ? 'Rest (suggested)' : 'Rest'}</Text>
                <Stepper
                  value={item.restSeconds}
                  min={30}
                  max={600}
                  step={15}
                  onChange={(next) => setExerciseRest(item.key, next)}
                  size="compact"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  label="rest"
                  formatValue={formatRest}
                  valueLabel={`Rest ${formatRest(item.restSeconds)}`}
                  decreaseLabel="Decrease rest"
                  increaseLabel="Increase rest"
                />
              </View>

              {/* Starting Weight */}
              <View style={styles.controlGroup}>
                <Text style={[styles.controlLabel, live.controlLabel]}>Weight ({units})</Text>
                <TextField
                  containerStyle={styles.weightFieldContainer}
                  fieldStyle={styles.weightField}
                  inputStyle={[styles.weightInput, live.weightInput]}
                  value={item.startingWeight > 0 ? String(item.startingWeight) : ''}
                  onChangeText={v => updateField(item.key, 'startingWeight', parseFloat(v) || 0)}
                  placeholder="0"
                  placeholderTextColor={t.colors.textMuted}
                  accessibilityLabel={`Starting weight in ${units}`}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
              </View>
            </View>
          </View>
        ))}

        <Button
          testID="volyume-btn-add-exercise"
          title="Add exercise"
          icon="add"
          variant="tertiary"
          onPress={openPicker}
          style={[styles.addBtn, live.addBtn, { backgroundColor: 'transparent' }]}
          textStyle={[styles.addBtnText, live.addBtnText]}
          accessibilityLabel="Add exercise"
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <View style={[styles.footer, live.footer]}>
        {exercises.length === 0 ? (
          <Button
            testID="volyume-btn-start-empty"
            title="Start without a plan"
            icon="play-skip-forward-outline"
            size="lg"
            loading={starting}
            onPress={handleSkip}
            accessibilityLabel="Start a workout without a plan"
          />
        ) : (
          <Button
            testID="volyume-btn-start-training"
            title={`Start training (${exercises.length})`}
            icon="play-circle"
            size="lg"
            loading={starting}
            onPress={handleStartTraining}
          />
        )}
      </View>
      </KeyboardAvoidingView>

      {/* Travel Mode equipment picker */}
      <BottomSheet
        visible={showTravelModal}
        onClose={() => setShowTravelModal(false)}
        accessibilityLabel="Travel or hotel gym equipment picker"
      >
        <Text style={[styles.travelTitle, live.travelTitle]}>Travel / hotel gym</Text>
        <Text style={[styles.travelSub, live.travelSub]}>Choose what equipment you've got today. Volyume will create a full-body session that keeps you moving without changing your plan.</Text>
        <View style={styles.travelOptions} accessibilityRole="radiogroup" accessibilityLabel="Available equipment">
          {[
            { id: 'bodyweight', label: 'Bodyweight only', icon: 'body-outline' },
            { id: 'dumbbells',  label: 'Dumbbells',       icon: 'barbell-outline' },
            { id: 'hotel_gym',  label: 'Hotel gym',        icon: 'fitness-outline' },
          ].map(opt => (
            <Chip
              key={opt.id}
              label={opt.label}
              icon={opt.icon}
              selected={travelEquipment === opt.id}
              accessibilityRole="radio"
              onPress={() => { haptics.selection(); setTravelEquipment(opt.id); }}
              style={styles.travelOptionChip}
            />
          ))}
        </View>
        <View style={styles.travelBtns}>
          <Button
            title="Cancel"
            variant="secondary"
            style={styles.travelAction}
            onPress={() => setShowTravelModal(false)}
            accessibilityLabel="Cancel"
          />
          <Button
            title="Create session"
            style={styles.travelAction}
            onPress={applyTravelMode}
            accessibilityLabel="Create session"
          />
        </View>
      </BottomSheet>

      <Modal visible={showPicker} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => setShowPicker(false)}>
        {/* Nested provider: a core RN <Modal> presents in its own window on iOS
            and would otherwise read top:0, jamming the search field against the
            status bar / Dynamic Island. */}
        <SafeAreaProvider>
        <SafeAreaView style={[styles.pickerSafe, live.pickerSafe]} edges={['top', 'bottom']}>
          <View style={[styles.pickerHeader, live.pickerHeader]}>
            <SearchBar
              style={styles.pickerSearchBar}
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises"
              accessibilityLabel="Search exercises"
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.pickerClose} accessibilityRole="button" accessibilityLabel="Close exercise picker">
              <Ionicons name="close" size={22} color={t.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlashList
            data={filtered}
            keyExtractor={e => e.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => addExercise(item)} accessibilityRole="button" accessibilityLabel={`Add ${item.name}`}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerItemName, live.pickerItemName]}>{item.name}</Text>
                  <Text style={[styles.pickerItemMuscle, live.pickerItemMuscle]}>
                    {(item.primaryMuscle || '').charAt(0).toUpperCase() + (item.primaryMuscle || '').slice(1)}
                    {item.equipment ? ` - ${item.equipment}` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={t.colors.primary} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.colors.border }} />}
            ListEmptyComponent={query.trim() ? (
              <View style={styles.pickerEmpty}>
                <Ionicons name="search-outline" size={24} color={t.colors.textMuted} />
                <Text style={[styles.pickerEmptyTitle, live.pickerEmptyTitle]}>No matching exercises</Text>
                <Text style={[styles.pickerEmptyText, live.pickerEmptyText]}>Try a shorter search, or clear it and browse the full library.</Text>
                <Button
                  title="Clear search"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setQuery('')}
                  style={[styles.pickerEmptyBtn, live.pickerEmptyBtn]}
                  textStyle={[styles.pickerEmptyBtnText, live.pickerEmptyBtnText]}
                  accessibilityLabel="Clear exercise search"
                />
              </View>
            ) : null}
            ListFooterComponent={filteredTruncated ? (
              <View style={styles.pickerHint}>
                <Ionicons name="search-outline" size={16} color={t.colors.textMuted} />
                <Text style={[styles.pickerHintText, live.pickerHintText]}>Showing the first {PICKER_RENDER_CAP}. Refine your search to see more.</Text>
              </View>
            ) : null}
          />
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  subtitle: {
    ...type.bodySm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexNum: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  exerciseMuscle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  controlGroup: {
    gap: spacing.xs,
    alignItems: 'center',
    minWidth: 70,
  },
  controlLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  repFieldContainer: {
    width: 40,
    gap: 0,
  },
  repField: {
    borderRadius: radius.sm,
    minHeight: 34,
  },
  repInput: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  repSep: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  weightFieldContainer: {
    width: 64,
    gap: 0,
  },
  weightField: {
    borderRadius: radius.sm,
    minHeight: 34,
  },
  weightInput: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  addBtnText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerSearchBar: { flex: 1 },
  // UI-13 (end-user-polish audit, 2026-07-12): 44pt touch target, raised
  // from 40x40 which fell below the project's touch-target contract.
  pickerClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  pickerItemName: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  pickerItemMuscle: { fontSize: fontSize.sm, color: colors.textSecondary },
  pickerHint: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  pickerHintText: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  pickerEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  pickerEmptyTitle: { ...type.bodyStrong, color: colors.textPrimary, textAlign: 'center' },
  pickerEmptyText: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },
  pickerEmptyBtn: {
    marginTop: spacing.xs,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmptyBtnText: { ...type.label, color: colors.textPrimary },

  // Travel mode chip + modal
  travelChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    minHeight: 44,
    backgroundColor: colors.surface, alignSelf: 'stretch',
  },
  travelChipText: { ...type.label, color: colors.textPrimary, flex: 1 },
  travelTitle: { ...type.title, color: colors.textPrimary },
  travelSub: { ...type.bodySm, color: colors.textSecondary },
  travelOptions: { gap: spacing.sm },
  travelOptionChip: { alignSelf: 'stretch', borderRadius: radius.md },
  travelBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  travelAction: { flex: 1 },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/borderWidth/borderRadius/borderStyle, no token) and
// fontWeight/lineHeight (not part of the live theme table) are correctly
// omitted -- there is nothing to unfreeze for them. Same pattern as
// DebugLogScreen.js's buildLiveStyles (batch F).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    subtitle: { ...t.type.bodySm, color: t.colors.textMuted },
    exerciseCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    indexBadge: { backgroundColor: t.colors.surface2 },
    indexNum: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    exerciseName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    exerciseMuscle: { ...t.type.caption, color: t.colors.textMuted },
    controlLabel: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    repInput: { fontSize: t.fontSize.sm },
    repSep: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    weightInput: { fontSize: t.fontSize.sm },
    addBtn: { borderColor: t.colors.primary },
    addBtnText: { fontSize: t.fontSize.md, color: t.colors.primary },
    footer: { borderTopColor: t.colors.border },
    pickerSafe: { backgroundColor: t.colors.background },
    pickerHeader: { borderBottomColor: t.colors.border },
    pickerItemName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    pickerItemMuscle: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    pickerHintText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    pickerEmptyTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    pickerEmptyText: { ...t.type.bodySm, color: t.colors.textSecondary },
    pickerEmptyBtn: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    pickerEmptyBtnText: { ...t.type.label, color: t.colors.textPrimary },
    travelChip: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    travelChipText: { ...t.type.label, color: t.colors.textPrimary },
    travelTitle: { ...t.type.title, color: t.colors.textPrimary },
    travelSub: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
