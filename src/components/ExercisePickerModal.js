import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal,
  TouchableOpacity, ScrollView,
} from 'react-native';
// Campaign item 14 (D25): react-native-keyboard-controller outside sheets
// (this is a plain RN Modal, not a gorhom BottomSheet). Used only for the
// inline "New exercise" create form below — the horizontal filter-chip
// ScrollViews further down have no text inputs and are left as core
// ScrollView.
import { KeyboardAwareScrollView, KeyboardGestureArea } from 'react-native-keyboard-controller';
// E8 perf: the full library is ~450 rows with no render cap; FlashList
// recycles rows instead of mounting them all (audit/perf-baseline.md section 2).
import { FlashList } from '@shopify/flash-list';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getAllExercises, insertExercise, getRecentlyUsedExerciseIds, getActiveBlock, clearExerciseIntent } from '../lib/database';
import { loadExerciseIntentState, isEligible, intentFor, isFamilyBlocked, movementFamilyOf } from '../lib/exercise/intent';
import { matchesEquipmentFilter, matchesMuscleFilter } from '../lib/exerciseDisplay';
import { fuzzySearch } from '../lib/exerciseFuzzySearch';
import useAppStore from '../store/useAppStore';
import * as haptics from '../lib/haptics';
import Chip from './Chip';
import SearchBar from './SearchBar';
import SectionLabel from './SectionLabel';
import TextField from './TextField';
import { useToast } from './Toast';

// Shared exercise picker: search the library and, when the exercise you want
// isn't there, create it inline as a custom exercise. Lifted out of
// ManualBuilder so the same browse-and-create flow is available everywhere an
// exercise is chosen (plan building, plan editing, in-workout swap). Custom
// exercises are written with isCustom:1 into the exercises table, the same
// path ManualBuilder already shipped, so getAllExercises() surfaces them and
// the existing syncExercises push covers them.
const PICKER_MUSCLES = Object.keys(MUSCLE_DISPLAY_NAMES);
const PICKER_EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Bands'];

// L07-F8: the exercise TYPE axis a custom exercise can pick, matching the
// existing exercise_type CHECK constraint (supabase/migrate_091_exercise_type.sql,
// database.js exercise_type migration) so a custom exercise renders the same
// set-input schema (SetEntry.js) and joins the same duration/distance volume
// exclusions as a seeded library exercise. Defaulting to weight_reps keeps
// every exercise that never touches this row byte-identical to before.
const EXERCISE_TYPE_OPTIONS = [
  { key: 'weight_reps', label: 'Weight & reps' },
  { key: 'weighted_bodyweight', label: 'Bodyweight + added weight' },
  { key: 'reps_only', label: 'Reps only' },
  { key: 'duration', label: 'Time' },
  { key: 'distance', label: 'Distance & time' },
];

// D107-2 load semantics (LOAD-SEMANTICS-SPEC): what the entered weight
// number MEANS. Drives the logger's field label ("per hand" / "Assistance")
// and the tonnage/PR calculations in algorithms.js. Neutral copy only -
// "Assistance", never anything body-referencing.
const LOAD_SEMANTICS_OPTIONS = [
  { key: 'total', label: 'Total weight' },
  { key: 'per_hand', label: 'Per hand' },
  { key: 'assisted', label: 'Assistance' },
  { key: 'added_bodyweight', label: 'Added weight' },
];

// saveLabel / actionLabel are aliases for the create-form's save button text
// (RoutineDetail/ManualBuilder pass saveLabel, ActiveWorkout passes
// actionLabel). Either works; saveLabel wins if both are given.
export default function ExercisePickerModal({ visible, onClose, onSelect, saveLabel, actionLabel }) {
  const toast = useToast();
  const userId = useAppStore(s => s.user?.id);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour/fontSize/
  // type-bearing keys only.
  const t = useTheme();
  const live = {
    pickerSafe: { backgroundColor: t.colors.background },
    pickerHeader: { borderBottomColor: t.colors.borderSubtle },
    pickerClose: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    pickerExName: { ...t.type.label, color: t.colors.textPrimary },
    pickerMuscle: { ...t.type.caption, color: t.colors.textMuted },
    pickerSetAside: { ...t.type.caption, color: t.colors.textMuted },
    pickerAllowAgain: { ...t.type.caption, color: t.colors.primary },
    showExcludedText: { ...t.type.caption, color: t.colors.textMuted },
    constraintsUnavailableText: { ...t.type.caption, color: t.colors.textMuted },
    pickerEmptyText: { ...t.type.body, color: t.colors.textMuted },
    separator: { backgroundColor: t.colors.borderSubtle },
    createNewBtn: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    createNewBtnText: { ...t.type.label, color: t.colors.textPrimary },
    createTitle: { ...t.type.title, color: t.colors.textPrimary },
    createNameInputText: { ...t.type.bodyStrong },
    createLabel: { ...t.type.captionStrong, color: t.colors.textMuted },
    filterChipText: { ...t.type.label, color: t.colors.textSecondary },
    filterChipTextActive: { color: t.colors.primary },
    createSaveBtn: { backgroundColor: t.colors.primaryFill },
    createSaveBtnText: { ...t.type.label, color: t.colors.onPrimary },
  };
  const buttonLabel = saveLabel || actionLabel || 'Add exercise';
  const isSwapAction = buttonLabel.toLowerCase().includes('swap');
  const showBrowseFilters = !isSwapAction;
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [allExercises, setAll] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [recentIds, setRecentIds] = useState([]);
  // C9: the user's exercise intent, and whether they have asked to see
  // what they have set aside.
  const [intentState, setIntentState] = useState(null);
  const [showExcluded, setShowExcluded] = useState(false);
  // D109-2 fail direction: true only when the intent read genuinely FAILED
  // (getActiveBlock rejected), never for "no constraints recorded" - those
  // are indistinguishable in intentState itself by design, so this is
  // tracked separately.
  const [intentUnavailable, setIntentUnavailable] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMuscle, setCreateMuscle] = useState('');
  const [createEquipment, setCreateEquipment] = useState('');
  // L07-F8: secondary muscles (multi-select) + exercise type, so a custom
  // exercise carries the same fields a seeded library exercise does.
  const [createSecondaryMuscles, setCreateSecondaryMuscles] = useState([]);
  const [createExerciseType, setCreateExerciseType] = useState('weight_reps');
  // D107-2 load semantics: what the entered weight means for this exercise.
  // Smart-defaulted from equipment/type (dumbbell -> per hand, loaded
  // bodyweight -> added weight) until the user picks one themselves; an
  // explicit choice always wins.
  const [createLoadSemantics, setCreateLoadSemantics] = useState('total');
  const [createLoadSemanticsTouched, setCreateLoadSemanticsTouched] = useState(false);
  useEffect(() => {
    if (createLoadSemanticsTouched) return;
    setCreateLoadSemantics(
      createExerciseType === 'weighted_bodyweight' ? 'added_bodyweight'
        : createEquipment === 'Dumbbell' ? 'per_hand'
          : 'total',
    );
  }, [createEquipment, createExerciseType, createLoadSemanticsTouched]);
  const [creating, setCreating] = useState(false);
  // 2026-07-11 (TASKBOARD "exercise picker first-open fix", D33): on the
  // FIRST open of a session the Android Modal's native window is freshly
  // created, and FlashList's native measurement handshake races that
  // window's setup (the same class of race the SafeAreaProvider comment
  // below already documents for insets) -- the list commits a ~zero-height
  // first paint, clipping results/ListEmptyComponent/the create-custom
  // footer and the browse-filter chips into a blank gap. Second and later
  // opens self-heal because Android remounts the modal's child tree each
  // open, so the native setup is already warm. `modalShown` gates that
  // content on the Modal's onShow, which only fires after the window is
  // actually presented, so the first layout pass always runs against a
  // presented window instead of a still-forming one.
  const [modalShown, setModalShown] = useState(false);

  useEffect(() => {
    if (!visible) {
      // Reset point: this effect already re-arms every other per-open bit
      // of state (query/filters/showCreate) the moment the modal closes, so
      // resetting modalShown here too keeps the "next open starts cold"
      // gate in the same single place rather than adding a second effect.
      setModalShown(false);
      return;
    }
    setQuery('');
    setMuscleFilter('');
    setEquipmentFilter('');
    setShowCreate(false);
    getAllExercises().then(exs => {
      setAll(exs);
      setFiltered(exs);
    }).catch(() => {});
    // L07-F7: most-recently-used row, add-mode only (swap already narrows to
    // search-and-select). A read failure just leaves the row empty; browsing
    // the full library still works.
    if (!isSwapAction && userId) {
      getRecentlyUsedExerciseIds(userId).then(setRecentIds).catch(() => setRecentIds([]));
    } else {
      setRecentIds([]);
    }
    // C9 Work 2/7: this picker is the shared entry point for the workout
    // builder, the plan builder, the routine editor and the swap
    // fall-through, so honouring exercise intent HERE covers all of them
    // at once. Set aside exercises are hidden from the browse list by
    // default and reachable behind an explicit "Show set aside" toggle,
    // where they are clearly marked and can be allowed again. Restoration
    // must never be obscure.
    setShowExcluded(false);
    setIntentUnavailable(false);
    if (userId) {
      getActiveBlock(userId)
        .then(block => loadExerciseIntentState(userId, { activeMesocycleId: block?.id ?? null }))
        .then(state => {
          setIntentState(state);
          // loadExerciseIntentState fails open internally (returns an empty
          // state, never throws), so `unavailable` is how a genuine read
          // failure is told apart from "nothing set aside" - see D109-2.
          if (state?.unavailable) setIntentUnavailable(true);
        })
        .catch(() => { setIntentState(null); setIntentUnavailable(true); });
    } else {
      setIntentState(null);
    }
  }, [visible, isSwapAction, userId]);

  // Recents are an entry point into an untouched browse, not another filter:
  // once the user is searching or has a chip active, the row steps aside.
  const recentExercises = (!isSwapAction && !query.trim() && !muscleFilter && !equipmentFilter)
    ? recentIds.map(id => allExercises.find(e => String(e.id) === String(id))).filter(Boolean)
    : [];

  useEffect(() => {
    // L07-F6: fuzzy, typo-tolerant search. Muscle/equipment chips still
    // narrow the candidate list first (an AND with the text search); the
    // text search itself now tolerates typos, partial words and words typed
    // out of order (e.g. "bul garian" finds "Bulgarian Split Squat").
    const base = allExercises.filter(e =>
      matchesMuscleFilter(e, muscleFilter) &&
      matchesEquipmentFilter(e, equipmentFilter) &&
      // Hidden from SUGGESTIONS, never from the user: the toggle below
      // brings them back, marked, with an "Allow again" action.
      (showExcluded || !intentState || isEligible(intentState, e.id)) &&
      // D107-2 senior enforcement: a movement-pattern avoidance hides the
      // whole family the same way an id-level exclusion does. Kept as a
      // separate AND term (not folded into the clause above) so the
      // pre-existing id-level regression-guard string stays byte-exact
      // (campaign9.generation.test.js "the shared picker honours intent").
      (showExcluded || !intentState || !isFamilyBlocked(intentState, movementFamilyOf(e))),
    );
    setFiltered(fuzzySearch(base, query, e => e.name));
  }, [query, muscleFilter, equipmentFilter, allExercises, intentState, showExcluded]);

  async function handleCreate() {
    if (!createName.trim()) {
      toast.show('Enter a name for the exercise', { variant: 'warning' });
      return;
    }
    setCreating(true);
    try {
      const created = await insertExercise({
        name: createName.trim(),
        primaryMuscle: createMuscle || null,
        // L07-F8: secondary muscles, so a custom exercise's volume/muscle
        // tracking counts the same secondary-muscle contribution a seeded
        // exercise's secondary_muscles column already gives it.
        secondaryMuscles: createSecondaryMuscles.length ? createSecondaryMuscles : null,
        equipment: createEquipment || null,
        // L07-F8: the exercise type axis, so e.g. a custom plank or carry
        // gets the duration/distance SetEntry schema instead of always
        // defaulting to weight_reps.
        exerciseType: createExerciseType,
        // D107-2: what the entered weight means (per hand / assistance /
        // added weight / total). Only meaningful on weight-bearing schemas;
        // other types store 'total', today's de facto meaning.
        loadSemantics: (createExerciseType === 'weight_reps' || createExerciseType === 'weighted_bodyweight')
          ? createLoadSemantics : 'total',
        // SFR is left null/unknown, never a guessed midpoint: the swap and plan
        // engines treat a missing stimulus-to-fatigue ratio as "no data" and
        // skip the SFR scoring term. A hard-coded value (e.g. 3) would make a
        // brand-new custom move falsely read as a real, ranked candidate.
        stimulusToFatigueRatio: null,
        isCustom: 1,
      });
      const all = await getAllExercises();
      setAll(all);
      // WK-6: include the id from insertExercise in the fallback so onSelect
      // never hands back an id-less exercise (which would log a set against a
      // null exercise_id) if the name lookup misses.
      const newEx = all.find(e => e.name === createName.trim())
        || {
          id: created?.id,
          name: createName.trim(),
          primaryMuscle: createMuscle,
          secondaryMuscles: createSecondaryMuscles.length ? createSecondaryMuscles : null,
          equipment: createEquipment,
          exerciseType: createExerciseType,
          loadSemantics: (createExerciseType === 'weight_reps' || createExerciseType === 'weighted_bodyweight')
            ? createLoadSemantics : 'total',
        };
      onSelect(newEx);
      onClose();
    } catch (_e) {
      toast.show("Couldn't save exercise, try again", { variant: 'error' });
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setCreateName(query.trim());
    setCreateMuscle('');
    setCreateEquipment('');
    setCreateSecondaryMuscles([]);
    setCreateExerciseType('weight_reps');
    setShowCreate(true);
  }

  // Choosing a primary muscle drops it from the secondary set, so the same
  // muscle can never be both primary and secondary at once.
  function selectPrimaryMuscle(m) {
    setCreateMuscle(prev => (prev === m ? '' : m));
    setCreateSecondaryMuscles(prev => prev.filter(x => x !== m));
  }

  function toggleSecondaryMuscle(m) {
    setCreateSecondaryMuscles(prev => (
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    ));
  }

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={showCreate ? () => setShowCreate(false) : onClose}
      // 2026-07-11: onShow fires after the modal's native window is actually
      // presented on both platforms (unlike the `visible` prop, which flips
      // the instant we ask for it) -- it is the first point we can trust
      // that a first native layout pass will land against a real, presented
      // window rather than one still mid-setup.
      onShow={() => setModalShown(true)}
    >
      {/* A core RN <Modal> presents in its own window on iOS and does not
          inherit the root SafeAreaProvider's measured frame, so a bare
          SafeAreaView inside reads top:0 and the search field jams against the
          status bar / Dynamic Island. A nested provider makes the modal
          measure its own insets. */}
      <SafeAreaProvider>
      <SafeAreaView style={[styles.pickerSafe, live.pickerSafe]} edges={['top', 'bottom']}>
        {showCreate ? (
          <KeyboardGestureArea interpolator="ios" style={{ flex: 1 }}>
            <View style={[styles.pickerHeader, live.pickerHeader]}>
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel="Back to exercise search"
                onPress={() => { haptics.selection(); setShowCreate(false); }}
                style={[styles.pickerClose, live.pickerClose]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color={t.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.createTitle, live.createTitle]} numberOfLines={1} ellipsizeMode="tail">New exercise</Text>
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel="Close exercise picker"
                onPress={() => { haptics.selection(); onClose?.(); }}
                style={[styles.pickerClose, live.pickerClose]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={t.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView contentContainerStyle={styles.createContent} keyboardShouldPersistTaps="handled">
              <TextField
                accessibilityLabel="New exercise name"
                value={createName}
                onChangeText={setCreateName}
                placeholder="Exercise name"
                placeholderTextColor={t.colors.textMuted}
                autoFocus
                autoCapitalize="words"
                surface={t.colors.inputBg}
                containerStyle={styles.createNameInputContainer}
                fieldStyle={styles.createNameInputField}
                inputStyle={[styles.createNameInputText, live.createNameInputText]}
              />
              <Text style={[styles.createLabel, live.createLabel]}>Muscle group</Text>
              <View style={styles.chipRow}>
                {PICKER_MUSCLES.map(m => (
                  <Chip
                    key={m}
                    label={MUSCLE_DISPLAY_NAMES[m]}
                    selected={createMuscle === m}
                    onPress={() => { haptics.selection(); selectPrimaryMuscle(m); }}
                  />
                ))}
              </View>
              {/* L07-F8: secondary muscles, multi-select, so a custom
                  exercise's volume/muscle tracking counts a secondary
                  contribution the same way a seeded exercise's
                  secondary_muscles column already does. The current primary
                  muscle is left out of the list so the same muscle cannot be
                  picked as both. */}
              <Text style={[styles.createLabel, live.createLabel]}>Secondary muscles (optional)</Text>
              <View style={styles.chipRow}>
                {PICKER_MUSCLES.filter(m => m !== createMuscle).map(m => {
                  const selected = createSecondaryMuscles.includes(m);
                  return (
                    <Chip
                      key={m}
                      label={MUSCLE_DISPLAY_NAMES[m]}
                      selected={selected}
                      onPress={() => { haptics.selection(); toggleSecondaryMuscle(m); }}
                      accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${MUSCLE_DISPLAY_NAMES[m]} as a secondary muscle`}
                    />
                  );
                })}
              </View>
              <Text style={[styles.createLabel, live.createLabel]}>Equipment</Text>
              <View style={styles.chipRow}>
                {PICKER_EQUIPMENT.map(eq => (
                  <Chip
                    key={eq}
                    label={eq}
                    selected={createEquipment === eq}
                    onPress={() => { haptics.selection(); setCreateEquipment(prev => prev === eq ? '' : eq); }}
                  />
                ))}
              </View>
              {/* L07-F8: exercise type, matching the schema's existing
                  exercise_type enum so a custom plank/carry/sprint can get the
                  correct SetEntry input schema instead of always defaulting
                  to weight_reps. */}
              <Text style={[styles.createLabel, live.createLabel]}>Exercise type</Text>
              <View style={styles.chipRow}>
                {EXERCISE_TYPE_OPTIONS.map(opt => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    selected={createExerciseType === opt.key}
                    onPress={() => { haptics.selection(); setCreateExerciseType(opt.key); }}
                    accessibilityLabel={`Exercise type: ${opt.label}`}
                  />
                ))}
              </View>
              {/* D107-2: what the entered weight number means, smart-defaulted
                  from equipment/type. Shown only for weight-bearing schemas -
                  a timed hold or a distance entry has no weight to describe. */}
              {(createExerciseType === 'weight_reps' || createExerciseType === 'weighted_bodyweight') && (
                <>
                  <Text style={[styles.createLabel, live.createLabel]}>Weight entered as</Text>
                  <View style={styles.chipRow}>
                    {LOAD_SEMANTICS_OPTIONS.map(opt => (
                      <Chip
                        key={opt.key}
                        label={opt.label}
                        selected={createLoadSemantics === opt.key}
                        onPress={() => {
                          haptics.selection();
                          setCreateLoadSemantics(opt.key);
                          setCreateLoadSemanticsTouched(true);
                        }}
                        accessibilityLabel={`Weight entered as: ${opt.label}`}
                      />
                    ))}
                  </View>
                </>
              )}
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel={buttonLabel}
                style={[styles.createSaveBtn, live.createSaveBtn, creating && { opacity: 0.5 }]}
                onPress={() => { haptics.commit(); handleCreate(); }}
                disabled={creating}
              >
                <Ionicons name={isSwapAction ? 'swap-horizontal' : 'add-circle'} size={20} color={t.colors.onPrimary} />
                <Text style={[styles.createSaveBtnText, live.createSaveBtnText]} numberOfLines={1}>{buttonLabel}</Text>
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          </KeyboardGestureArea>
        ) : (
          <>
            <View style={[styles.pickerHeader, live.pickerHeader]}>
              <SearchBar
                style={styles.pickerSearchBar}
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises"
                autoFocus
              />
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel="Close exercise picker"
                onPress={() => { haptics.selection(); onClose?.(); }}
                style={[styles.pickerClose, live.pickerClose]}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={t.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {recentExercises.length > 0 ? (
              <View style={styles.recentSection}>
                <SectionLabel style={styles.recentLabel}>Recent</SectionLabel>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.filterRow}
                >
                  {recentExercises.map(ex => (
                    <Chip
                      key={ex.id}
                      icon="time-outline"
                      label={ex.name}
                      numberOfLines={1}
                      accessibilityLabel={`Add ${ex.name}`}
                      onPress={() => { haptics.selection(); onSelect(ex); onClose(); }}
                      style={styles.recentChip}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* D109-2: the constraints read genuinely failed. Generation and
                suggestion still proceed (the browse list simply shows
                everything, unfiltered by avoidance) - this is the visible
                notice that fact requires, not a block. */}
            {intentUnavailable ? (
              <View style={styles.constraintsUnavailableRow}>
                <Ionicons name="information-circle-outline" size={14} color={t.colors.textMuted} />
                <Text style={[styles.constraintsUnavailableText, live.constraintsUnavailableText]}>
                  Avoided movements could not be checked right now, so nothing is filtered for them.
                </Text>
              </View>
            ) : null}

            {/* C9 Work 2: restoration must not be obscure. The toggle only
                appears when the user actually has something set aside. */}
            {intentState && [...intentState.intents.keys()].length > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showExcluded ? 'Hide exercises you have set aside' : 'Show exercises you have set aside'}
                onPress={() => setShowExcluded(v => !v)}
                style={styles.showExcludedRow}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.showExcludedText, live.showExcludedText]}>
                  {showExcluded ? 'Hide what you have set aside' : 'Show what you have set aside'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {modalShown && showBrowseFilters ? (
              <>
                {/* Browse filters are for adding exercises. Swap mode stays
                    search-and-select so it does not bury the replacement list
                    under two rows of unrelated chips mid-workout.
                    2026-07-11: also gated on modalShown -- see the
                    first-open native-race comment by the modalShown
                    declaration above. Pre-show frame renders nothing here
                    (see the FlashList gate below for why). */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.filterRow}
                >
                  {PICKER_MUSCLES.map(m => (
                    <Chip
                      key={m}
                      label={MUSCLE_DISPLAY_NAMES[m]}
                      selected={muscleFilter === m}
                      onPress={() => { haptics.selection(); setMuscleFilter(prev => (prev === m ? '' : m)); }}
                      accessibilityLabel={`Filter by ${MUSCLE_DISPLAY_NAMES[m]}`}
                      style={styles.filterChip}
                      labelStyle={[styles.filterChipText, live.filterChipText]}
                      selectedLabelStyle={[styles.filterChipTextActive, live.filterChipTextActive]}
                    />
                  ))}
                </ScrollView>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.filterRow}
                >
                  {PICKER_EQUIPMENT.map(eq => (
                    <Chip
                      key={eq}
                      label={eq}
                      selected={equipmentFilter === eq}
                      onPress={() => { haptics.selection(); setEquipmentFilter(prev => (prev === eq ? '' : eq)); }}
                      accessibilityLabel={`Filter by ${eq}`}
                      style={styles.filterChip}
                      labelStyle={[styles.filterChipText, live.filterChipText]}
                      selectedLabelStyle={[styles.filterChipTextActive, live.filterChipTextActive]}
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* 2026-07-11: gated on modalShown, see the first-open
                native-race comment by the modalShown declaration above.
                Pre-show frame renders nothing rather than a placeholder
                View -- the SafeAreaView above already paints the themed
                background across this whole area, so there is no black
                void to cover, and skipping an extra element keeps this
                change to state + a condition, not a new node that could
                itself need to survive the same measurement race. */}
            {modalShown ? (
            <View style={styles.pickerListWrap}>
            <FlashList
              data={filtered}
              keyExtractor={e => String(e.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => {
                // C9: a set-aside exercise is only reachable here when the
                // user asked to see them. It says so plainly and offers the
                // way back, so restoring is never a hunt.
                const setAside = intentState ? !isEligible(intentState, item.id) : false;
                return (
                  <TouchableOpacity accessibilityRole="button"
                    accessibilityLabel={`${isSwapAction ? 'Swap in' : 'Add'} ${item.name}${setAside ? ', set aside' : ''}`}
                    style={styles.pickerRow}
                    onPress={() => { haptics.selection(); onSelect(item); onClose(); }}
                  >
                    <View style={styles.pickerRowContent}>
                      <Text style={[styles.pickerExName, live.pickerExName]}>{item.name}</Text>
                      {setAside ? (
                        <Text style={[styles.pickerSetAside, live.pickerSetAside]}>
                          {intentFor(intentState, item.id)?.kind === 'avoided_block'
                            ? 'Set aside for this block'
                            : 'You asked Volyume not to suggest this'}
                        </Text>
                      ) : item.primaryMuscle ? (
                        <Text style={[styles.pickerMuscle, live.pickerMuscle]}>{item.primaryMuscle}</Text>
                      ) : null}
                    </View>
                    {setAside ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Allow ${item.name} again`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={async () => {
                          try {
                            await clearExerciseIntent(userId, item.id);
                            const block = await getActiveBlock(userId).catch(() => null);
                            setIntentState(await loadExerciseIntentState(userId, { activeMesocycleId: block?.id ?? null }));
                          } catch (_) { /* best effort */ }
                        }}
                      >
                        <Text style={[styles.pickerAllowAgain, live.pickerAllowAgain]}>Allow again</Text>
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name={isSwapAction ? 'swap-horizontal' : 'add-circle-outline'} size={20} color={t.colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={[styles.separator, live.separator]} />}
              ListFooterComponent={!isSwapAction ? (
                // Always offer "create custom", with or without a query, so the
                // option to add your own exercise is never hidden behind an
                // empty search result.
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={query.trim().length > 0
                    ? `Create ${query.trim()} as custom exercise`
                    : 'Create a custom exercise'}
                  style={[styles.createNewBtn, live.createNewBtn, { marginTop: spacing.md }]}
                  onPress={() => { haptics.selection(); openCreate(); }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={t.colors.primary} />
                  <Text style={[styles.createNewBtnText, live.createNewBtnText]}>
                    {query.trim().length > 0
                      ? `Create "${query.trim()}" as custom exercise`
                      : 'Create a custom exercise'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Ionicons name="search-outline" size={32} color={t.colors.textMuted} style={{ marginBottom: spacing.md }} />
                  <Text style={[styles.pickerEmptyText, live.pickerEmptyText]}>
                    {isSwapAction ? 'No swaps found. Try a different search.' : 'No matches found. Try a different search.'}
                  </Text>
                </View>
              }
            />
            </View>
            ) : null}
          </>
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  // THE fix for the first-open blank picker (founder report 2026-08-19,
  // reproduced on BOTH platforms). The FlashList had no style and no flex,
  // and its parent is a Fragment, so nothing in the layout ever told it how
  // tall it was: its height was left to FlashList's own native measurement
  // handshake, which races the modal window's setup and can commit a
  // ~zero-height first paint. That is what put the results, the empty state
  // and the create-custom footer into a blank gap, and why a second open
  // "self-healed" (warm measurement) and why it looked random.
  //
  // The 2026-07-11 `modalShown` gate was a TIMING mitigation for the same
  // symptom: it delays WHEN the list mounts but never gives it a height, so
  // it narrows the race instead of closing it, which is why the bug survived
  // it. A flex:1 wrapper is laid out by Yoga on the first pass, so the list
  // is handed a definite height before it measures anything. Deterministic,
  // not timed. The gate is kept as belt and braces; it is now redundant
  // rather than load-bearing.
  pickerListWrap: { flex: 1 },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  pickerSearchBar: { flex: 1 },
  pickerClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pickerList: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54, paddingVertical: spacing.sm },
  pickerRowContent: { flex: 1, gap: spacing.xxs },
  pickerExName: { ...type.label, color: colors.textPrimary },
  pickerMuscle: { ...type.caption, color: colors.textMuted, textTransform: 'capitalize' },
  // C9: a set-aside row states its own status and offers the way back.
  pickerSetAside: { ...type.caption, color: colors.textMuted },
  pickerAllowAgain: { ...type.caption, color: colors.primary },
  showExcludedRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  showExcludedText: { ...type.caption, color: colors.textMuted },
  constraintsUnavailableRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  constraintsUnavailableText: { ...type.caption, color: colors.textMuted, flex: 1 },
  pickerEmpty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.lg, paddingHorizontal: spacing.xl },
  pickerEmptyText: { ...type.body, color: colors.textMuted },
  separator: { height: 1, backgroundColor: colors.borderSubtle },
  createNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 44,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  createNewBtnText: { ...type.label, color: colors.textPrimary, flex: 1 },
  createTitle: { ...type.title, flex: 1, color: colors.textPrimary, textAlign: 'center' },
  createContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  createNameInputContainer: { gap: 0 },
  createNameInputField: { borderRadius: radius.md },
  createNameInputText: { ...type.bodyStrong, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  createLabel: { ...type.captionStrong, color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterRow: {
    flexDirection: 'row', gap: spacing.xs, flexGrow: 0,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
  },
  filterChip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  filterChipText: { ...type.label, color: colors.textSecondary },
  filterChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  recentSection: { paddingTop: spacing.sm },
  recentLabel: { paddingHorizontal: spacing.lg },
  recentChip: { maxWidth: 180 },
  createSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 48,
    backgroundColor: colors.primaryFill, borderRadius: radius.md, paddingVertical: spacing.sm, marginTop: spacing.sm,
  },
  createSaveBtnText: { ...type.label, color: colors.onPrimary },
});
