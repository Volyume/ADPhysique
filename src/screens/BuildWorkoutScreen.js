import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, fontSize, fontWeight, spacing, radius, type, iconSize, circle } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import ExercisePickerModal from '../components/ExercisePickerModal';
import Stepper from '../components/Stepper';
import TextField from '../components/TextField';
import BottomSheet from '../components/BottomSheet';
import Chip from '../components/Chip';
import { getAllExercises, createWorkout, getActiveBlock } from '../lib/database';
import { loadExerciseIntentState } from '../lib/exercise/intent';
import { filterLibraryForGeneration } from '../lib/exercise/generation';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { suggestRestSeconds } from '../lib/restSuggest';
import { parseDecimalInput, parseIntegerInput } from '../lib/parseDecimalInput';
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
  const { user, startWorkout, units, defaultRestSeconds, workoutPrefsLoaded, loadWorkoutPrefs } = useAppStore(useShallow(s => ({
    user: s.user,
    startWorkout: s.startWorkout,
    units: s.units,
    defaultRestSeconds: s.defaultRestSeconds,
    workoutPrefsLoaded: s.workoutPrefsLoaded,
    loadWorkoutPrefs: s.loadWorkoutPrefs,
  })));
  // Hydrate the device-local workout prefs so a cold build started before
  // visiting Settings/ActiveWorkout still picks up the user's saved default rest.
  useEffect(() => {
    if (!workoutPrefsLoaded) loadWorkoutPrefs();
  }, [workoutPrefsLoaded, loadWorkoutPrefs]);
  const [exercises, setExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [starting, setStarting] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [travelEquipment, setTravelEquipment] = useState('bodyweight');
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js). Memoised
  // to keep the exercise-row map below cheap to re-render.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  function openPicker() {
    setShowPicker(true);
  }

  function addExercise(exercise) {
    // B9 deterministic rest suggestion: when the user's global default rest
    // is still the shipped 90s, pre-fill with the fixed-table suggestion for
    // this exercise (compound 180s, isolation 90s) and label it "suggested".
    // A user-set default (anything other than 90) always wins, so nobody who
    // chose their own rest sees it change. Editable via the stepper as before.
    // D1 sweep (DD4): the shared ExercisePickerModal already fires the
    // selection haptic itself before calling onSelect, so the haptics.selection()
    // call that used to live here was dropped to match ManualBuilderScreen's
    // onSelect handler (no double-buzz on the same tap).
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

  // Raw in-progress text for the numeric fields, keyed `${exerciseKey}:${field}`
  // (pre-release sweep 2026-07-27, B2). These inputs are controlled off the
  // NUMBER, so parsing on every keystroke made them unusable: clearing the box
  // ran `parseInt('') || previous`, which restored the old value instantly, and
  // typing "2." collapsed to "2" before the next digit landed -- so a value
  // could be neither cleared and retyped nor given a decimal. Hold the raw
  // string while the user is typing and commit only what parses, exactly as
  // SetEntry.js does.
  const [numDrafts, setNumDrafts] = useState({});

  function numValue(key, field, modelValue) {
    const draft = numDrafts[`${key}:${field}`];
    return draft !== undefined ? draft : modelValue;
  }

  function onNumChange(key, field, raw, { integer = false, min = null } = {}) {
    setNumDrafts(prev => ({ ...prev, [`${key}:${field}`]: raw }));
    const parsed = integer ? parseIntegerInput(raw) : parseDecimalInput(raw);
    if (Number.isFinite(parsed) && (min === null || parsed >= min)) {
      updateField(key, field, parsed);
    }
  }

  // Drop the draft on blur so the field re-renders from the committed model
  // (and an abandoned, unparseable entry reverts rather than sticking).
  function onNumBlur(key, field) {
    setNumDrafts(prev => {
      if (!(`${key}:${field}` in prev)) return prev;
      const next = { ...prev };
      delete next[`${key}:${field}`];
      return next;
    });
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
    // CC27 (section 9.6) / D112 R3 (closes audit T1-21): travel mode
    // BUILDS a session, so it takes the same capability pre-flight as
    // every other generator - an unreadable capability state is the
    // user's explicit call, never a silent fail-open into movements
    // they cannot do.
    if (user?.id) {
      // eslint-disable-next-line global-require
      const { capabilityPreflight, offerCapabilityPreflightChoice } = require('../lib/capability/preflight');
      const preflight = await capabilityPreflight(user.id);
      if (!preflight.proceed) {
        const goAhead = await new Promise((resolve) => {
          offerCapabilityPreflightChoice({
            onHold: () => resolve(false),
            onContinue: () => resolve(true),
          });
        });
        if (!goAhead) return;
      }
    }
    const all = allExercises.length > 0 ? allExercises : await getAllExercises();
    if (allExercises.length === 0) setAllExercises(all);
    // C9 Work 7: travel mode BUILDS a session, so it is generation and must
    // respect exercise intent like every other generator. It resolves the
    // engine's exercise NAMES against the library, so the intent filter is
    // applied to the library before the match - a set-aside exercise then
    // simply has nothing to match against and the slot is dropped rather
    // than silently reinstated.
    let library = all;
    // D112 R5 (closes audit T1-23): carried out of the try block so the
    // drop-classification pass below can read it too - the exact same
    // capability state the library filter itself just used.
    let capabilityState = null;
    try {
      const block = user?.id ? await getActiveBlock(user.id) : null;
      const state = await loadExerciseIntentState(user?.id, { activeMesocycleId: block?.id ?? null });
      capabilityState = state?.capability ?? null;
      library = filterLibraryForGeneration(all, state).library;
    } catch (_) { /* additive: an intent read failure leaves the library whole */ }
    const plan = generateTravelPlan({ equipment: travelEquipment, daysPerWeek: 4, splitType: 'full_body' });
    const session = plan.sessions[0];
    // D112 R5 (closes audit T1-23): named, not silent. Counts by class -
    // capabilityBlockReason checked first, matching generationBlockReason's
    // own precedence (section 4.1), so a movement that fails both reads as
    // the capability reason and is never double counted.
    let capabilityDrops = 0;
    let preferenceDrops = 0;
    const newItems = session.exercises.map(ex => {
      const nameLower = ex.exerciseName.toLowerCase();
      const findIn = (list) => list.find(e => e.name.toLowerCase() === nameLower)
        ?? list.find(e => e.name.toLowerCase().includes(nameLower.split(' ')[0]));
      const match = findIn(library);
      // Present in the catalogue but gone from the filtered library means
      // the user set it aside. Drop the slot rather than reinstating it
      // through the unmatched-name placeholder below, which would put the
      // exercise back under its own name.
      if (!match) {
        const fullMatch = findIn(all);
        if (fullMatch) {
          try {
            // eslint-disable-next-line global-require
            const { capabilityBlockReason } = require('../lib/capability/resolve');
            if (capabilityBlockReason(capabilityState, fullMatch)) capabilityDrops += 1;
            else preferenceDrops += 1;
          } catch (_) { preferenceDrops += 1; }
          return null;
        }
      }
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
    setExercises(newItems.filter(Boolean));
    // D112 R5 (closes audit T1-23): one line per non-zero class, via the
    // screen's toast. No behaviour change to the filtering itself above.
    const dropLines = [];
    if (capabilityDrops > 0) {
      dropLines.push(`${capabilityDrops === 1 ? '1 movement' : `${capabilityDrops} movements`} left out for how you train.`);
    }
    if (preferenceDrops > 0) {
      dropLines.push(`${preferenceDrops === 1 ? '1 movement' : `${preferenceDrops} movements`} left out for your avoided movements.`);
    }
    if (dropLines.length) {
      toast.show(dropLines.join(' '), { variant: 'info', duration: 5000 });
    }
  }

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
                <Text style={[styles.controlLabel, live.controlLabel]} numberOfLines={1}>Sets</Text>
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
                <Text style={[styles.controlLabel, live.controlLabel]} numberOfLines={1}>Reps</Text>
                <View style={styles.repRow}>
                  <TextField
                    containerStyle={styles.repFieldContainer}
                    fieldStyle={styles.repField}
                    inputStyle={[styles.repInput, live.repInput]}
                    value={numValue(item.key, 'repsMin', String(item.repsMin))}
                    onChangeText={v => onNumChange(item.key, 'repsMin', v, { integer: true, min: 1 })}
                    onBlur={() => onNumBlur(item.key, 'repsMin')}
                    keyboardType="number-pad"
                    maxLength={3}
                    accessibilityLabel="Minimum reps"
                  />
                  <Text style={[styles.repSep, live.repSep]}>-</Text>
                  <TextField
                    containerStyle={styles.repFieldContainer}
                    fieldStyle={styles.repField}
                    inputStyle={[styles.repInput, live.repInput]}
                    value={numValue(item.key, 'repsMax', String(item.repsMax))}
                    onChangeText={v => onNumChange(item.key, 'repsMax', v, { integer: true, min: 1 })}
                    onBlur={() => onNumBlur(item.key, 'repsMax')}
                    keyboardType="number-pad"
                    maxLength={3}
                    accessibilityLabel="Maximum reps"
                  />
                </View>
              </View>

              {/* Rest */}
              <View style={styles.controlGroup}>
                <Text style={[styles.controlLabel, live.controlLabel]} numberOfLines={1}>{item.restSuggested ? 'Rest (suggested)' : 'Rest'}</Text>
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
                <Text style={[styles.controlLabel, live.controlLabel]} numberOfLines={1}>Weight ({units})</Text>
                <TextField
                  containerStyle={styles.weightFieldContainer}
                  fieldStyle={styles.weightField}
                  inputStyle={[styles.weightInput, live.weightInput]}
                  value={numValue(item.key, 'startingWeight', item.startingWeight > 0 ? String(item.startingWeight) : '')}
                  onChangeText={v => onNumChange(item.key, 'startingWeight', v, { min: 0 })}
                  onBlur={() => onNumBlur(item.key, 'startingWeight')}
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
        <Text style={[styles.travelSub, live.travelSub]}>Choose what equipment you've got today. Volyume will build a full-body workout that keeps you moving without changing your plan.</Text>
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
            title="Create workout"
            style={styles.travelAction}
            onPress={applyTravelMode}
            accessibilityLabel="Create session"
          />
        </View>
      </BottomSheet>

      {/* D1 sweep (DD4): the shared ExercisePickerModal replaces the local
          hand-rolled Modal/SearchBar/close-button/FlashList clone -- same
          component RoutineDetailScreen.js and ManualBuilderScreen.js already
          use, bringing equipment/muscle filter chips and inline
          custom-exercise creation this local clone lacked. */}
      <ExercisePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={addExercise}
        saveLabel="Add to workout"
      />
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
    width: 32,
    height: 32,
    borderRadius: circle(32),
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
    travelChip: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    travelChipText: { ...t.type.label, color: t.colors.textPrimary },
    travelTitle: { ...t.type.title, color: t.colors.textPrimary },
    travelSub: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
