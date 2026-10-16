import React from 'react';
import { appAlert } from '../../AppAlert';
import { Modal, View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../../Text';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as hapticsVocab from '../../../lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, iconSize, fontFamily, colors, fontSize, fontWeight, radius, type, circle } from '../../../styles/theme';
import { workoutLoggerSize } from '../../../styles/layout';
import BottomSheet from '../../BottomSheet';
import DragReorderList from '../../DragReorderList';
import Button from '../../Button';
import Card from '../../Card';
import { SWAP_SCOPE } from '../../../lib/exercise/swapScope';
import { SWAP_SCOPE_OPTIONS, swapScopeHint, slotMuscleChange, swapMuscleNote } from '../../../lib/exercise/swapCarry';
import SegmentedControl from '../../SegmentedControl';
import { styleLabelFor } from '../../../lib/exercise/stylePools';
import { swapAdjacentBlocks } from '../../../lib/reorder';
import { MUSCLE_DISPLAY_NAMES } from '../../../lib/algorithms';
import { instructionsFor } from '../../../lib/exerciseInstructions';
import { equipmentDisplayLabel } from '../../../lib/exerciseDisplay';
import { GLOSSARY } from '../../../lib/coachGlossary';
import { DEFAULT_BAR_KG } from '../../../lib/warmupRamp';
import { warmupRamp } from '../../../lib/warmupRamp';
import { parseDecimalInput } from '../../../lib/parseDecimalInput';

// D228 item 9, monolith first cut (option E): the raw Modals and bottom
// sheets that sat after the keyboard bar in ActiveWorkoutScreen.js, moved
// here verbatim. Phase one is behaviour-identical: the screen keeps every
// handler and every piece of state and passes them in under the same names;
// this component only renders. Styles used by nothing but these sheets live
// in this file (with their live-theme mirrors); styles the rest of the
// screen shares arrive as `sharedStyles` / `sharedLive`.

const BARBELL_EQUIPMENT = /barbell/i;

// D35: scrollRef/onScroll/onContentSizeChange are optional and undefined
// for every sheet except the reorder sheet below -- they come straight
// from that sheet's useDragAutoScrollBridge() call and are otherwise a
// no-op (RN ignores undefined ref/onScroll/onContentSizeChange props), so
// every other WorkoutBottomSheet caller keeps today's plain-ScrollView
// behaviour byte for byte.
function WorkoutSheetScroll({ children, scrollRef, onScroll, onContentSizeChange }) {
  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      onContentSizeChange={onContentSizeChange}
      scrollEventThrottle={onScroll ? 16 : undefined}
      style={styles.sheetScroll}
      contentContainerStyle={styles.sheetScrollBody}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function WorkoutBottomSheet({
  visible, onClose, accessibilityLabel, keyboardAvoiding = false, children,
  scrollRef, onScroll, onContentSizeChange,
}) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding={keyboardAvoiding}
      accessibilityLabel={accessibilityLabel}
    >
      <WorkoutSheetScroll scrollRef={scrollRef} onScroll={onScroll} onContentSizeChange={onContentSizeChange}>
        {children}
      </WorkoutSheetScroll>
    </BottomSheet>
  );
}

function SessionSheets({
  supersetHeadsUp,
  reduceMotion,
  setSupersetHeadsUp,
  insets,
  headsUpIsCircuit,
  headsUpStations,
  headsUpCircuitBody,
  headsUpRestWords,
  handleTogglePair,
  handleOpenSwap,
  unilateralSuggest,
  setUnilateralSuggest,
  exercise,
  unilateralWalkthroughSeenRef,
  handleUnilateralAnswer,
  showStaleModal,
  setShowStaleModal,
  updateLastActivity,
  handleFinishWorkout,
  confirmDiscard,
  showSetTypePicker,
  setShowSetTypePicker,
  setCurrentSet,
  currentSet,
  showWarmupRamp,
  setShowWarmupRamp,
  rampAnchorRef,
  barWeight,
  setGhostSet,
  units,
  showOverflow,
  setShowOverflow,
  workAroundSwapRef,
  navigation,
  workAroundPreselect,
  openAddExercisePicker,
  currentSGI,
  setShowRestLengthFor,
  currentExerciseIndex,
  workoutExercises,
  setShowReorderSheet,
  unilateralExercises,
  cluster,
  canUseLastSession,
  handleUseLastSession,
  isLastExercise,
  isPairedWithNext,
  timeCrunchActive,
  handleTimeCrunch,
  handleRevertTimeCrunch,
  timeCrunchMsg,
  handleRemoveExercise,
  // D229 addendum 14: the door to the videos this workout holds, shown only
  // when there are any. It is NEVER withheld by calm mode or an open ED flag
  // (the logger hands it the count and the opener always): viewing, keeping
  // and deleting your own videos is never withheld; only Film is gated.
  clipCount = 0,
  onOpenClips = null,
  showReorderSheet,
  reorderSheetScroll,
  keyForWorkoutExercise,
  handleReorderWorkoutExercises,
  handleSheetMoveExercise,
  showExecution,
  setShowExecution,
  routineExercise,
  adjustedSetCount,
  sessionAdjustment,
  revertSessionAdjustment,
  readinessReduces,
  readinessTweak,
  dismissReadinessTweak,
  readinessRestoreLabel,
  showSwapModal,
  setSwapStylePoolKey,
  setSwapStyleShowAll,
  setShowSwapModal,
  swapScopeOffered,
  swapScope,
  chooseSwapScope,
  swapNarrowedCount,
  swapStylePoolKey,
  swapStyleShowAll,
  swapClosedList,
  swapCandidates,
  swapPlanFactsRef,
  activeWorkout,
  handleConfirmSwap,
  swapUnavailable,
  setPickerMode,
  setShowExercisePicker,
  t,
  UNILATERAL_WALKTHROUGH_SEEN_KEY,
  SET_TYPE_OPTIONS,
  sharedStyles,
  sharedLive,
}) {
  const live = buildLiveStyles(t);
  return (
    <>
        {/* Superset / giant-set heads-up modal, appears once per group when the
            user lands on a grouped exercise. Educational for first-timers,
            and gives a clear out (unlink or swap) if they're not set up
            for it today. Renders one numbered row per member, so a pair shows
            two and a giant set 3+. F-13 (docs/final-certification-2026-09-05/
            07-FINDINGS.md, evidence A4): a CIRCUIT forks on the group's
            stored kind, never its size - own title, own body, no Unlink. */}
        <Modal
          visible={!!supersetHeadsUp}
          transparent
          animationType={reduceMotion ? 'none' : 'fade'}
          onRequestClose={() => setSupersetHeadsUp(null)}
        >
          {supersetHeadsUp ? (
          <View style={[styles.supOverlay, live.supOverlay]}>
            <View style={[styles.supSheet, live.supSheet]}>
              <ScrollView
                style={styles.supSheetScroll}
                contentContainerStyle={[styles.supSheetContent, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.supIconRow}>
                  <Ionicons name={headsUpIsCircuit ? 'repeat' : 'link'} size={24} color={t.colors.primary} />
                  <Text style={[styles.supTitle, live.supTitle]}>
                    {headsUpIsCircuit
                      ? 'Circuit coming up'
                      : (headsUpStations > 2 ? 'Giant set coming up' : 'Superset coming up')}
                  </Text>
                </View>
                <Text style={[styles.supSubtitle, live.supSubtitle]}>
                  {headsUpIsCircuit
                    ? headsUpCircuitBody
                    : (headsUpStations > 2
                      ? `${supersetHeadsUp.memberNames.length} exercises done back-to-back with no rest between them.`
                      : 'Two exercises done back-to-back with no rest between them.')}
                </Text>

                <Card surface="surface2" radius="md" padding="md" style={[styles.supPairCard, live.supPairCard]}>
                  {(supersetHeadsUp?.memberNames ?? []).map((memberName, memberIdx) => (
                    <React.Fragment key={`${memberIdx}-${memberName}`}>
                      {memberIdx > 0 && <View style={[styles.supPairConnector, live.supPairConnector]} />}
                      <View style={styles.supPairRow}>
                        <View style={[styles.supPairChip, live.supPairChip]}><Text style={[styles.supPairChipText, live.supPairChipText]}>{memberIdx + 1}</Text></View>
                        <Text style={[styles.supPairName, live.supPairName]} numberOfLines={2}>
                          {memberName}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))}
                </Card>

                <View style={styles.supSteps}>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>1</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>Set up every station now if you can.</Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>2</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>
                      {headsUpIsCircuit ? 'Do all reps at the first station.' : 'Do all reps of the first exercise.'}
                    </Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>3</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>
                      {headsUpIsCircuit ? 'Move straight to the next station. No rest between stations.' : 'Move straight to the next. No rest between.'}
                    </Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>4</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>
                      {headsUpIsCircuit
                        ? `After the last station, rest${headsUpRestWords ? ` ${headsUpRestWords}` : ''}, then start the next round.`
                        : 'After the last one, rest the full rest period, then repeat.'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.supTip, live.supTip]}>
                  {headsUpIsCircuit
                    ? 'Tip: if a station is taken, carry on with the next one and come back to it. To change the circuit, edit it in your plan.'
                    : "Tip: if you can't grab every station right now, unlink and do them as normal sets."}
                </Text>

                <Button
                  variant="primary"
                  style={[styles.supPrimaryBtn, live.supPrimaryBtn]}
                  onPress={() => setSupersetHeadsUp(null)}
                  title="Got it, start"
                  textStyle={[styles.supPrimaryBtnText, live.supPrimaryBtnText]}
                />

                <View style={styles.supSecondaryRow}>
                  {/* F-13 (evidence A4): NO Unlink on a circuit. Unlinking a
                      circuit mid-session would leave the athlete doing
                      straight sets against a plan that still says circuit;
                      a circuit is changed in the plan, not broken apart
                      here. A superset or giant set keeps the action. */}
                  {headsUpIsCircuit ? null : (
                  <Button
                    variant="outline"
                    style={[styles.supSecondaryBtn, live.supSecondaryBtn]}
                    onPress={() => {
                      handleTogglePair(); // unpair
                      setSupersetHeadsUp(null);
                    }}
                    accessibilityLabel="Unlink the superset"
                  >
                    <Ionicons name="unlink" size={14} color={t.colors.textSecondary} />
                    <Text style={[styles.supSecondaryBtnText, live.supSecondaryBtnText]}>Unlink</Text>
                  </Button>
                  )}
                  <Button
                    variant="outline"
                    style={[styles.supSecondaryBtn, live.supSecondaryBtn]}
                    onPress={() => {
                      setSupersetHeadsUp(null);
                      handleOpenSwap();
                    }}
                    accessibilityLabel="Swap exercise"
                  >
                    <Ionicons name="swap-horizontal" size={14} color={t.colors.textSecondary} />
                    <Text style={[styles.supSecondaryBtnText, live.supSecondaryBtnText]}>Swap exercise</Text>
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
          ) : null}
        </Modal>

        {/* D9 unilateral (per-side) FULL walkthrough - shown only the very
            first time the suggestion ever fires for this user
            (unilateralWalkthroughSeenRef / UNILATERAL_WALKTHROUGH_SEEN_KEY);
            every later unilateral exercise gets a quick appAlert confirm
            only (see the suggestion effect above). Copies the superset
            heads-up's shape and styles exactly (icon, title, numbered
            steps, tip, primary CTA) - same tone, same reused pattern, not a
            new one. "No, log as normal" still counts as answered: the
            choice sticks per exercise either way, so the suggestion never
            repeats for THIS exercise regardless of which button is tapped. */}
        <Modal
          visible={!!unilateralSuggest}
          transparent
          animationType={reduceMotion ? 'none' : 'fade'}
          onRequestClose={() => setUnilateralSuggest(null)}
        >
          {unilateralSuggest ? (() => {
            const isCompound = exercise?.compoundIsolation === 'compound';
            const answerAndClose = (turnOn) => {
              const id = unilateralSuggest.exerciseId;
              setUnilateralSuggest(null);
              unilateralWalkthroughSeenRef.current = true;
              AsyncStorage.setItem(UNILATERAL_WALKTHROUGH_SEEN_KEY, 'true').catch(() => {});
              handleUnilateralAnswer(id, turnOn);
            };
            return (
          <View style={[styles.supOverlay, live.supOverlay]}>
            <View style={[styles.supSheet, live.supSheet]}>
              <ScrollView
                style={styles.supSheetScroll}
                contentContainerStyle={[styles.supSheetContent, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.supIconRow}>
                  <Ionicons name="repeat" size={24} color={t.colors.primary} />
                  <Text style={[styles.supTitle, live.supTitle]}>Log this one side at a time?</Text>
                </View>
                <Text style={[styles.supSubtitle, live.supSubtitle]}>
                  {unilateralSuggest.exerciseName} is usually trained one side at a time.
                </Text>

                <Card surface="surface2" radius="md" padding="md" style={[styles.supPairCard, live.supPairCard]}>
                  <View style={styles.supPairRow}>
                    <View style={[styles.supPairChip, live.supPairChip]}><Text style={[styles.supPairChipText, live.supPairChipText]}>1</Text></View>
                    <Text style={[styles.supPairName, live.supPairName]} numberOfLines={2}>First side</Text>
                  </View>
                  <View style={[styles.supPairConnector, live.supPairConnector]} />
                  <View style={styles.supPairRow}>
                    <View style={[styles.supPairChip, live.supPairChip]}><Text style={[styles.supPairChipText, live.supPairChipText]}>2</Text></View>
                    <Text style={[styles.supPairName, live.supPairName]} numberOfLines={2}>Other side</Text>
                  </View>
                </Card>

                <View style={styles.supSteps}>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>1</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>Do your first side, then tap the check.</Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>2</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>
                      {isCompound
                        ? 'Half your normal rest, then do the same reps on your other side.'
                        : 'Switch sides when you\'re ready, no forced timer, then do the same reps.'}
                    </Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>3</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>
                      Tap the check again to log the other side: one more tap on the same control.</Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text style={[styles.supStepNum, live.supStepNum]}>4</Text>
                    <Text style={[styles.supStepText, live.supStepText]}>
                      {isCompound
                        ? 'It logs as one set. Rest as normal, then your next set.'
                        : 'It logs as one set. Rest as normal once both sides are done.'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.supTip, live.supTip]}>
                  Tip: change your mind any time from this exercise's options menu.
                </Text>

                <Button
                  variant="primary"
                  style={[styles.supPrimaryBtn, live.supPrimaryBtn]}
                  onPress={() => answerAndClose(true)}
                  title="Yes, log per side"
                  textStyle={[styles.supPrimaryBtnText, live.supPrimaryBtnText]}
                />

                <View style={styles.supSecondaryRow}>
                  <Button
                    variant="outline"
                    style={[styles.supSecondaryBtn, live.supSecondaryBtn]}
                    onPress={() => answerAndClose(false)}
                    accessibilityLabel="No, log as normal"
                  >
                    <Text style={[styles.supSecondaryBtnText, live.supSecondaryBtnText]}>No, log as normal</Text>
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
            );
          })() : null}
        </Modal>

        {/* Stale workout recovery modal */}
        <Modal visible={showStaleModal} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => setShowStaleModal(false)}>
          {showStaleModal ? (
          <View style={[styles.staleOverlay, live.staleOverlay]}>
            <View style={[styles.staleSheet, live.staleSheet]}>
              <Ionicons name="time-outline" size={32} color={t.colors.warning} style={{ marginBottom: spacing.md }} />
              <Text style={[styles.staleTitle, live.staleTitle]}>Resume workout?</Text>
              <Text style={[styles.staleBody, live.staleBody]}>
                This workout has been inactive for a while. What would you like to do?
              </Text>
              <Button
                variant="primary"
                style={[styles.staleResume, live.staleResume]}
                onPress={() => { updateLastActivity(); setShowStaleModal(false); }}
                title="Resume"
                textStyle={[styles.staleResumeText, live.staleResumeText]}
                accessibilityLabel="Resume workout"
              />
              <Button
                variant="secondary"
                style={[styles.staleFinish, live.staleFinish]}
                onPress={() => { setShowStaleModal(false); handleFinishWorkout(); }}
                title="Finish workout"
                textStyle={[styles.staleFinishText, live.staleFinishText]}
              />
              <TouchableOpacity style={styles.staleDiscard} accessibilityRole="button" accessibilityLabel="Discard workout" onPress={() => {
                confirmDiscard('ActiveWorkoutScreen.discardStale');
              }}>
                <Text style={[styles.staleDiscardText, live.staleDiscardText]}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
          ) : null}
        </Modal>




        {/* R4 (D64): the per-side confirm sheet is RETIRED. Side one is
            captured by the "Log set" tap itself (startPerSide), and side two
            commits from the same permanent bar primary, relabelled "Log
            other side". What renders here is only the compact BETWEEN-SIDES
            banner - same visual class as the cluster banner (proper gap
            rhythm, no touching controls), never a sheet over the inputs.
            Both sides use the SAME prescribed reps (perSide.reps, D54 -
            there is only ever one number). Cancel discards the pending
            pair; nothing has been written yet. */}

        {/* Set Type Picker Bottom Sheet */}
        <WorkoutBottomSheet
          visible={showSetTypePicker}
          onClose={() => setShowSetTypePicker(false)}
          accessibilityLabel="Set type"
        >
          {showSetTypePicker ? (
            <>
              <Text style={[styles.sheetTitle, live.sheetTitle]}>Set type</Text>
              <Text style={[styles.sheetExplainer, live.sheetExplainer]}>
                Pick how this set was done. Working sets and intensity techniques count towards your training; warm-ups do not. This helps Volyume read the session correctly.
              </Text>
              {/* P9: the radios group so TalkBack announces position context
                  ("2 of 5") while each row keeps its own label and state. */}
              <View accessibilityRole="radiogroup">
              {SET_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sheetOption, live.sheetOption]}
                  onPress={() => {
                    hapticsVocab.selection();
                    setCurrentSet(s => ({ ...s, setType: opt.value }));
                    setShowSetTypePicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: currentSet.setType === opt.value }}
                  accessibilityLabel={`${opt.label}. ${opt.description}`}
                >
                  <View style={styles.sheetOptionText}>
                    <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel, currentSet.setType === opt.value && [styles.sheetOptionLabelActive, live.sheetOptionLabelActive]]}>
                      {opt.label}
                    </Text>
                    <Text style={[sharedStyles.sheetOptionDesc, sharedLive.sheetOptionDesc]}>{opt.description}</Text>
                  </View>
                  {currentSet.setType === opt.value && (
                    <Ionicons name="checkmark" size={iconSize.md} color={t.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              </View>
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* B8: warm-up set helper. Opens ONLY from the overflow menu (the
            recorded no-auto-suggest decision stands, pull, never push).
            Choosing one suggested set
            loads it into the set entry as a Warm-up via the same setType
            machinery as the manual picker. Nothing is logged for the user. */}
        <WorkoutBottomSheet
          visible={showWarmupRamp}
          onClose={() => setShowWarmupRamp(false)}
          accessibilityLabel="Warm-up sets"
        >
          {showWarmupRamp ? (
            <>
              <Text style={[styles.sheetTitle, live.sheetTitle]}>Warm-up sets</Text>
              {(() => {
                // Working weight: the entry while it holds a working set;
                // the anchor while the entry holds a ramp row (so reopening
                // mid-ramp shows the SAME ramp, not one computed from the
                // warm-up weight).
                const entryWeight = parseDecimalInput(currentSet.weight);
                const entryIsWorking = (currentSet.setType ?? 'straight') !== 'warmup';
                const working = (entryIsWorking && Number.isFinite(entryWeight) && entryWeight > 0)
                  ? entryWeight
                  : rampAnchorRef.current;
                const isBarbellLift = BARBELL_EQUIPMENT.test(exercise?.equipment || '');
                const barKg = barWeight || DEFAULT_BAR_KG;
                if (!Number.isFinite(working) || working <= 0) {
                  // C5-P13-04 (D96): this branch used to be a dead end -
                  // "Enter your working weight first, then come back" - aimed
                  // squarely at the one user who most needs a warm-up: the
                  // first-timer, whose weight IS blank, on the zero-history
                  // path. B8 stands (warm-ups are still never suggested
                  // automatically, and nothing auto-appears); this is the
                  // pulled sheet answering honestly instead of refusing. For
                  // a barbell lift the empty bar is a warm-up that needs no
                  // working weight, and it is the same first row warmupRamp
                  // itself produces, so nothing new is invented.
                  return (
                    <>
                      <Text style={[styles.sheetExplainer, live.sheetExplainer]}>
                        {isBarbellLift
                          ? `No working weight yet. Start with the empty bar, then set your working weight and come back for the rest of the ramp. Warm-ups are saved but not counted in your working-set target.`
                          : `Set your working weight on the set card and your warm-up sets appear here. Warm-ups are saved but not counted in your working-set target.`}
                      </Text>
                      {isBarbellLift ? (
                        <TouchableOpacity
                          style={[styles.sheetOption, live.sheetOption]}
                          onPress={() => {
                            hapticsVocab.selection();
                            setGhostSet(null);
                            setCurrentSet(s => ({ ...s, weight: barKg, reps: 10, setType: 'warmup', isGhost: false }));
                            setShowWarmupRamp(false);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Empty bar, ${barKg} ${units}, 10 reps. Load as a warm-up set.`}
                        >
                          <View style={styles.overflowOptionRow}>
                            <Ionicons name="flame-outline" size={16} color={t.colors.warning} />
                            <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{`${barKg} ${units} x 10`}</Text>
                          </View>
                          <Text style={[styles.rampBarTag, live.rampBarTag]}>Empty bar</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  );
                }
                const rows = warmupRamp(working, {
                  isBarbell: isBarbellLift,
                  barKg,
                });
                if (rows.length === 0) {
                  return (
                    <Text style={[styles.sheetExplainer, live.sheetExplainer]}>
                      {`This is light enough to start at ${working} ${units}. You can begin with your working set today.`}
                    </Text>
                  );
                }
                return (
                  <>
                    <Text style={[styles.sheetExplainer, live.sheetExplainer]}>
                      {`Working up to ${working} ${units}. Choose a warm-up set to load it, then tap Log warm-up. Warm-ups are saved but not counted in your working-set target.`}
                    </Text>
                    {rows.map((row) => (
                      <TouchableOpacity
                        key={`${row.weight}-${row.reps}`}
                        style={[styles.sheetOption, live.sheetOption]}
                        onPress={() => {
                          hapticsVocab.selection();
                          setGhostSet(null);
                          setCurrentSet(s => ({ ...s, weight: row.weight, reps: row.reps, setType: 'warmup', isGhost: false }));
                          setShowWarmupRamp(false);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${row.isBar ? 'Empty bar' : `${row.weight} ${units}`}, ${row.reps} reps. Load as a warm-up set.`}
                      >
                        <View style={styles.overflowOptionRow}>
                          <Ionicons name="flame-outline" size={16} color={t.colors.warning} />
                          <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{`${row.weight} ${units} x ${row.reps}`}</Text>
                        </View>
                        {row.isBar ? <Text style={[styles.rampBarTag, live.rampBarTag]}>Empty bar</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Exercise overflow sheet (COMP-001): secondary and destructive
            exercise actions, off the permanent surface. Remove keeps its
            own confirm alert inside handleRemoveExercise. */}
        <WorkoutBottomSheet
          visible={showOverflow}
          onClose={() => setShowOverflow(false)}
          accessibilityLabel="Exercise options"
        >
          {showOverflow ? (
            <>
              <Text style={[styles.sheetTitle, live.sheetTitle]}>{exercise?.name}</Text>
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleOpenSwap(); }}
                accessibilityRole="button"
                accessibilityLabel="Swap exercise"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="swap-horizontal" size={18} color={t.colors.textSecondary} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Swap exercise</Text>
                </View>
              </TouchableOpacity>
              {/* CC29 (section 17): "this movement is a problem today" -
                  substitute now via the ordinary swap sheet, and the option
                  to note a temporary change through the standard How you
                  train flow. No pain scales, no per-set questions. */}
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  // CC33 close-out: the words a person actually uses.
                  // Banked research: "I can't do this" is a first-class
                  // answer (digest pattern 5), the sharpest complaint in
                  // the whole competitive teardown was a GOWOD review
                  // asking for exactly that option ("doesn't allow for
                  // the option of 'can't get into the pose'"), and
                  // Peloton's stated principle is never to make the user
                  // translate a modification themselves. "Work around
                  // this" was our internal vocabulary on a user's button.
                  appAlert(
                    exercise?.name ? `Can't do ${exercise.name}?` : "Can't do this exercise?",
                    'Volyume will swap it for another exercise that works the same muscle group. Choose whether that is just for today, or from now on.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Just for today', onPress: () => { workAroundSwapRef.current = true; handleOpenSwap(); } },
                      {
                        text: 'From now on',
                        onPress: () => {
                          // T2-11: this used to ALSO open the swap sheet
                          // while navigating with no params, so the sheet
                          // opened orphaned underneath and Injuries & limitations
                          // landed cold. It navigates only now, pre-filled
                          // from this exercise's own driving conflict
                          // (workAroundPreselect above); "Just swap it"
                          // above opens the sheet with workAroundSwapRef
                          // set, so the swap records cause 'constraint'.
                          try {
                            navigation.navigate('HowYouTrain', workAroundPreselect ? { preselect: workAroundPreselect } : undefined);
                          } catch (_e) { /* best effort */ }
                        },
                      },
                    ],
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel={exercise?.name ? `I can't do ${exercise.name} today` : "I can't do this exercise today"}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="body-outline" size={18} color={t.colors.textSecondary} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{"I can't do this"}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  openAddExercisePicker();
                }}
                accessibilityRole="button"
                accessibilityLabel="Add exercise to workout"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="add-circle-outline" size={18} color={t.colors.textSecondary} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Add exercise</Text>
                </View>
              </TouchableOpacity>
              {/* R3 rebuild (founder ruling 2026-07-12): beginner education
                  left the set card for this named row - the card carries the
                  set, never a lesson. Same glossary copy, on demand. */}
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  appAlert(
                    'How logging works',
                    `${GLOSSARY.rep} ${GLOSSARY.set} Enter weight and reps, then tap the check when done. Use exercise options for form tips, warm-ups, swaps and session settings.`,
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel="How logging works"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="help-circle-outline" size={18} color={t.colors.textSecondary} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>How logging works</Text>
                </View>
              </TouchableOpacity>
              {/* D43 S3 (blueprint 3.8, overflow diet): Move exercise
                  up/down DELETED -- the reorder sheet below is now the ONE
                  reorder path (superseding D32's "additive" framing, which
                  kept both). handleMoveExercise/canMoveUp/canMoveDown are
                  removed as genuinely dead code (grepped: no other caller).
                  Re-pinned in ActiveWorkoutScreen.reorder.guard.test.js
                  (D43 S3). */}
              {/* D220 addendum 10: the exercise's rest length lives here,
                  off the card (a grouped station rests by the group). */}
              {currentSGI == null ? (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); setShowRestLengthFor(currentExerciseIndex); }}
                accessibilityRole="button"
                accessibilityLabel={`Rest length for ${exercise?.name ?? 'this exercise'}`}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="timer-outline" size={18} color={t.colors.textSecondary} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Rest length</Text>
                </View>
              </TouchableOpacity>
              ) : null}
              {workoutExercises.length > 1 && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); setShowReorderSheet(true); }}
                accessibilityRole="button"
                accessibilityLabel="Reorder exercises"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="reorder-three-outline" size={18} color={t.colors.textSecondary} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Reorder exercises</Text>
                </View>
              </TouchableOpacity>
              )}
              {/* R3 rebuild: notes live on the Now card's own note row
                  (the corner pencil is deleted). "Exercise info" row DELETED --
                  tapping the exercise title (exerciseNameTap above, same
                  setShowExecution(true) handler) is the one entry point now. */}
              {/* D9: per-exercise "log per side" preference. Shown only for
                  metadata-flagged unilateral exercises (exercise.laterality,
                  exerciseMetadata.js deriveLaterality) - this is the manual
                  override/escape hatch alongside the one-time suggestion
                  prompt above; flipping it here never re-shows that prompt
                  (it also marks the exercise "asked", same as answering the
                  prompt directly). */}
              {exercise?.laterality === 'unilateral' && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  const exerciseId = exercise.id;
                  const nextOn = !unilateralExercises.has(exerciseId);
                  handleUnilateralAnswer(exerciseId, nextOn);
                }}
                accessibilityRole="button"
                accessibilityLabel={unilateralExercises.has(exercise.id) ? 'Stop logging this exercise per side' : 'Log this exercise per side'}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons
                    name={unilateralExercises.has(exercise.id) ? 'repeat' : 'repeat-outline'}
                    size={18}
                    color={unilateralExercises.has(exercise.id) ? t.colors.primary : t.colors.textSecondary}
                  />
                  <View style={styles.sheetOptionText}>
                    <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{unilateralExercises.has(exercise.id) ? 'Logging per side' : 'Log per side'}</Text>
                    <Text style={[sharedStyles.sheetOptionDesc, sharedLive.sheetOptionDesc]}>One side, then the other. Still counts as one set.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {/* B8 gym basics. The warm-up helper lives here in the overflow,
                  off the permanent surface (COMP-001), and strictly
                  pull: the warm-up helper NEVER auto-appears (recorded decision
                  at the set-entry card). */}
              {/* Hidden mid-cluster: a ramp-row tap rewrites the entry's
                  weight AND set type, and finishCluster commits from the
                  live entry, the one-tap path would mislog the whole
                  cluster as a light warm-up. */}
              {!cluster && (!exercise?.exerciseType || exercise.exerciseType === 'weight_reps' || exercise.exerciseType === 'weighted_bodyweight') && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  const w = parseDecimalInput(currentSet.weight);
                  if ((currentSet.setType ?? 'straight') !== 'warmup' && Number.isFinite(w) && w > 0) {
                    rampAnchorRef.current = w;
                  }
                  setShowWarmupRamp(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Warm-up sets"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="flame-outline" size={18} color={t.colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Warm-up sets</Text>
                    <Text style={[sharedStyles.sheetOptionDesc, sharedLive.sheetOptionDesc]}>Suggested light sets up to today's working weight.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {canUseLastSession && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleUseLastSession(); }}
                accessibilityRole="button"
                accessibilityLabel="Use last session"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="time-outline" size={18} color={t.colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Use last session</Text>
                    <Text style={[sharedStyles.sheetOptionDesc, sharedLive.sheetOptionDesc]}>Fill the pending sets from last time</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {!isLastExercise && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleTogglePair(); }}
                accessibilityRole="button"
                accessibilityLabel={isPairedWithNext ? 'Unpair from next exercise' : 'Pair as superset with next exercise'}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name={isPairedWithNext ? 'link' : 'link-outline'} size={18} color={isPairedWithNext ? t.colors.primary : t.colors.textSecondary} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{isPairedWithNext ? 'Unpair superset' : 'Pair as superset'}</Text>
                </View>
              </TouchableOpacity>
              )}
              {!timeCrunchActive && workoutExercises.length > currentExerciseIndex + 1 && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleTimeCrunch(); }}
                accessibilityRole="button"
                accessibilityLabel="Shorten session"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="timer-outline" size={18} color={t.colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Shorten session</Text>
                    <Text style={[sharedStyles.sheetOptionDesc, sharedLive.sheetOptionDesc]}>Shortens the rest of today's session to fit the time you have left. Undo any time.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {timeCrunchActive && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleRevertTimeCrunch(); }}
                accessibilityRole="button"
                accessibilityLabel="Undo shortening"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="refresh-outline" size={18} color={t.colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Undo shortening</Text>
                    {!!timeCrunchMsg && <Text style={[sharedStyles.sheetOptionDesc, sharedLive.sheetOptionDesc]}>{timeCrunchMsg}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {/* D229 addendum 14 (founder: "where they can find it after"):
                  the videos this workout holds, as a door in the exercise's
                  options, present only once there is one to find. */}
              {clipCount > 0 && onOpenClips ? (
                <TouchableOpacity
                  style={[styles.sheetOption, live.sheetOption]}
                  onPress={() => { setShowOverflow(false); onOpenClips(); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Your videos, ${clipCount}`}
                  testID="volyume-row-your-videos"
                >
                  <View style={styles.overflowOptionRow}>
                    <Ionicons name="videocam-outline" size={18} color={t.colors.textSecondary} />
                    <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{`Your videos · ${clipCount}`}</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleRemoveExercise(); }}
                accessibilityRole="button"
                accessibilityLabel="Remove exercise from workout"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="trash-outline" size={18} color={t.colors.error} />
                  <Text style={[styles.sheetOptionLabel, live.sheetOptionLabel, { color: t.colors.error }]}>Remove exercise</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Reorder sheet (D32, 2026-07-10, campaign item 20): the whole
            workout as a draggable list, opened from the overflow menu
            above. NO in-view drag on the main single-exercise view (that
            view is a deliberate focus design, and in-view drag mid-training
            is ergonomically risky); this sheet is the purpose-built surface
            instead. Block-aware: a superset/giant-set group moves and lands
            whole (src/lib/reorder.js). Every row also carries its own
            up/down chevrons as the accessible move path (drag's handle is
            hidden from screen readers, see DragReorderList's own header
            comment) -- this sheet's chevrons are ADDITIONAL to, and
            distinct from, the Move exercise up/down overflow entries above
            (those still move only the current exercise one step; these move
            any row in the sheet). Both persist through the same
            setWorkoutExercises -> _persistActiveWorkout flow every other
            order-affecting action uses; completed/in-progress sets are
            untouched (order metadata only), and currentExerciseIndex is
            re-pointed at the same exercise after either path. */}
        <WorkoutBottomSheet
          visible={showReorderSheet}
          onClose={() => setShowReorderSheet(false)}
          accessibilityLabel="Reorder exercises"
          scrollRef={reorderSheetScroll.scrollRef}
          onScroll={reorderSheetScroll.onScroll}
          onContentSizeChange={reorderSheetScroll.onContentSizeChange}
        >
          {showReorderSheet ? (
            <>
              <Text style={[styles.sheetTitle, live.sheetTitle]}>Reorder exercises</Text>
              <Text style={[styles.sheetExplainer, live.sheetExplainer]}>
                Hold and drag the handle, or use the arrows. Exercises in a superset or giant set move together.
              </Text>
              <DragReorderList
                items={workoutExercises}
                keyExtractor={keyForWorkoutExercise}
                getGroupId={(e) => e.supersetGroupId ?? null}
                onReorder={handleReorderWorkoutExercises}
                handleAccessibilityLabel={(e) => `Drag to reorder ${e.exercise?.name ?? 'exercise'}`}
                gap={spacing.sm}
                scrollRef={reorderSheetScroll.scrollRef}
                scrollOffset={reorderSheetScroll.scrollOffset}
                renderRow={({ item, index }) => {
                  const gid = item.supersetGroupId ?? null;
                  // Same 2-vs-3+ naming the heads-up modal uses (item 21):
                  // "Superset" for a pair, "Giant set" for three or more.
                  const groupSize = gid != null
                    ? workoutExercises.filter((e) => (e.supersetGroupId ?? null) === gid).length
                    : 0;
                  const rowIsCircuit = item.routineExercise?.groupKind === 'circuit';
                  const canUp = swapAdjacentBlocks(workoutExercises, index, 'up', (e) => e.supersetGroupId ?? null) !== workoutExercises;
                  const canDown = swapAdjacentBlocks(workoutExercises, index, 'down', (e) => e.supersetGroupId ?? null) !== workoutExercises;
                  const setsLogged = item.sets?.length ?? 0;
                  return (
                    <View style={[styles.reorderSheetRow, live.reorderSheetRow]}>
                      <View style={styles.reorderSheetRowInfo}>
                        <Text style={[styles.reorderSheetRowName, live.reorderSheetRowName]} numberOfLines={1}>
                          {item.exercise?.name ?? 'Exercise'}
                        </Text>
                        <Text style={[styles.reorderSheetRowMeta, live.reorderSheetRowMeta]}>
                          {setsLogged} set{setsLogged !== 1 ? 's' : ''} logged
                        </Text>
                        {gid != null && (
                          // F-13 (evidence A5): a circuit station is named by
                          // its group kind here too, with the same repeat icon
                          // the live chip and the builder use.
                          <View style={[styles.reorderSheetSupersetChip, live.reorderSheetSupersetChip]}>
                            <Ionicons name={rowIsCircuit ? 'repeat' : 'link'} size={iconSize.sm} color={t.colors.textSecondary} />
                            <Text style={[styles.reorderSheetSupersetChipText, live.reorderSheetSupersetChipText]}>{rowIsCircuit ? 'Circuit' : (groupSize > 2 ? 'Giant set' : 'Superset')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.reorderSheetChevrons}>
                        <TouchableOpacity
                          onPress={() => handleSheetMoveExercise(index, 'up')}
                          disabled={!canUp}
                          style={[styles.reorderSheetChevronBtn, live.reorderSheetChevronBtn, !canUp && styles.reorderSheetChevronBtnDisabled]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !canUp }}
                          accessibilityLabel={`Move ${item.exercise?.name ?? 'exercise'} up`}
                        >
                          <Ionicons name="chevron-up" size={16} color={canUp ? t.colors.textSecondary : t.colors.border} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleSheetMoveExercise(index, 'down')}
                          disabled={!canDown}
                          style={[styles.reorderSheetChevronBtn, live.reorderSheetChevronBtn, !canDown && styles.reorderSheetChevronBtnDisabled]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !canDown }}
                          accessibilityLabel={`Move ${item.exercise?.name ?? 'exercise'} down`}
                        >
                          <Ionicons name="chevron-down" size={16} color={canDown ? t.colors.textSecondary : t.colors.border} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Info / Form Bottom Sheet */}
        <WorkoutBottomSheet
          visible={showExecution}
          onClose={() => setShowExecution(false)}
          accessibilityLabel="Exercise info"
        >
          {showExecution ? (
            <>
              <Text style={[styles.sheetTitle, live.sheetTitle]}>{exercise?.name}</Text>
              {/* D151: metadata as "Back · Cable" (display names, middle
                  dot), never the raw enum with a hyphen. */}
              {exercise?.primaryMuscle ? (
                <Text style={[styles.infoMuscle, live.infoMuscle]}>
                  {[
                    MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle] ?? ((exercise.primaryMuscle || '').charAt(0).toUpperCase() + (exercise.primaryMuscle || '').slice(1).replace('_', ' ')),
                    equipmentDisplayLabel(exercise),
                  ].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {routineExercise?.recommendedSets ? (
                <View style={styles.infoTargetRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={t.colors.primary} />
                  <Text style={[styles.infoTarget, live.infoTarget]}>
                    {adjustedSetCount || routineExercise.recommendedSets} sets of {routineExercise.recommendedRepsMin}-{routineExercise.recommendedRepsMax} reps
                  </Text>
                </View>
              ) : null}

              {/* COMP-015: Adjusted today, the reason, the plain-words signals,
                  and the one-tap revert. Shown for any visible adjustment; the
                  revert button only when there's a real set change to undo. */}
              {sessionAdjustment?.show ? (
                <View style={[styles.adjustedSection, live.adjustedSection]}>
                  <View style={styles.adjustedHeader}>
                    <Ionicons name="pulse-outline" size={14} color={t.colors.primary} />
                    <Text style={[styles.adjustedTitle, live.adjustedTitle]}>Adjusted today</Text>
                  </View>
                  <Text style={[styles.adjustedReason, live.adjustedReason]}>{sessionAdjustment.reasonText}</Text>
                  {sessionAdjustment.signals?.lastTrainedAt ? (
                    <Text style={[styles.adjustedSignal, live.adjustedSignal]}>
                      Last trained {new Date(sessionAdjustment.signals.lastTrainedAt).toLocaleDateString(undefined, { weekday: 'long' })}.
                    </Text>
                  ) : null}
                  {sessionAdjustment.setDelta !== 0 ? (
                    <TouchableOpacity
                      style={styles.adjustedRevertBtn}
                      onPress={() => { revertSessionAdjustment(exercise.id); setShowExecution(false); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Use planned sets instead. ${routineExercise?.recommendedSets ?? ''} sets as written.`}
                    >
                      <Ionicons name="arrow-undo-outline" size={15} color={t.colors.primary} />
                      <Text style={[styles.adjustedRevertText, live.adjustedRevertText]}>Use planned sets instead</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {/* B2: Eased for today, the intent-sheet answer's downward-only
                  tweak, both written whys, and a one-tap session-wide dismiss.
                  Suggestions on the targets display only; the plan and logged
                  sets are never changed. */}
              {readinessReduces ? (
                <View style={[styles.adjustedSection, live.adjustedSection]}>
                  <View style={styles.adjustedHeader}>
                    <Ionicons name="pulse-outline" size={14} color={t.colors.primary} />
                    <Text style={[styles.adjustedTitle, live.adjustedTitle]}>Eased for today</Text>
                  </View>
                  <Text style={[styles.adjustedReason, live.adjustedReason]}>{readinessTweak.whySets}</Text>
                  {readinessTweak.whyLoad ? (
                    <Text style={[styles.adjustedSignal, live.adjustedSignal]}>{readinessTweak.whyLoad}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.adjustedRevertBtn}
                    onPress={() => { dismissReadinessTweak(); setShowExecution(false); }}
                    accessibilityRole="button"
                    accessibilityLabel={`${readinessRestoreLabel}. Applies to the whole session.`}
                  >
                    <Ionicons name="arrow-undo-outline" size={15} color={t.colors.primary} />
                    <Text style={[styles.adjustedRevertText, live.adjustedRevertText]}>{readinessRestoreLabel}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* D151: structured instructions from the corpus (Setup /
                  Execution / Watch), the first layer readable in seconds.
                  A routine's own notes for this exercise render above them
                  when present; a custom exercise falls back to its notes or
                  one calm line. */}
              {(() => {
                const instructions = instructionsFor(exercise);
                const routineNotes = routineExercise?.notes || null;
                return (
                  <View style={styles.infoInstructions}>
                    {routineNotes ? (
                      <View style={styles.infoInstruction}>
                        <Text style={[styles.infoNotesLabel, live.infoNotesLabel]}>Plan note</Text>
                        <Text style={[styles.infoNotes, live.infoNotes]}>{routineNotes}</Text>
                      </View>
                    ) : null}
                    {instructions ? (
                      <>
                        <View style={styles.infoInstruction}>
                          <Text style={[styles.infoNotesLabel, live.infoNotesLabel]}>Setup</Text>
                          <Text style={[styles.infoNotes, live.infoNotes]}>{instructions.setup}</Text>
                        </View>
                        <View style={styles.infoInstruction}>
                          <Text style={[styles.infoNotesLabel, live.infoNotesLabel]}>Execution</Text>
                          <Text style={[styles.infoNotes, live.infoNotes]}>{instructions.execution}</Text>
                        </View>
                        {instructions.watch ? (
                          <View style={styles.infoInstruction}>
                            <Text style={[styles.infoNotesLabel, live.infoNotesLabel]}>Watch</Text>
                            <Text style={[styles.infoNotes, live.infoNotes]}>{instructions.watch}</Text>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <View style={styles.infoInstruction}>
                        <Text style={[styles.infoNotesLabel, live.infoNotesLabel]}>How to do it</Text>
                        <Text style={[styles.infoNotes, live.infoNotes]}>
                          {exercise?.notes || 'No instructions for this exercise yet. Start light, move with control and stop a couple of reps before you truly cannot do any more.'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Exercise Swap Modal */}
        <Modal visible={showSwapModal} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => { workAroundSwapRef.current = false; setSwapStylePoolKey(null); setSwapStyleShowAll(false); setShowSwapModal(false); }}>
          {showSwapModal ? (
            <>
          {/* Nested provider: a core RN <Modal> presents in its own window on
              iOS and would otherwise read top:0, jamming the swap list against
              the status bar / Dynamic Island. */}
          <SafeAreaProvider>
          <SafeAreaView style={[styles.swapSafe, live.swapSafe]} edges={['top', 'bottom']}>
            <View style={[styles.swapHeader, live.swapHeader]}>
              <View style={styles.swapHeaderCopy}>
                <Text style={[styles.swapTitle, live.swapTitle]}>Swap exercise</Text>
                <Text style={[styles.swapSubtitle, live.swapSubtitle]} numberOfLines={1}>
                  {exercise?.name}
                </Text>
              </View>
              <TouchableOpacity style={[styles.swapCloseBtn, live.swapCloseBtn]} onPress={() => { workAroundSwapRef.current = false; setSwapStylePoolKey(null); setSwapStyleShowAll(false); setShowSwapModal(false); }} accessibilityRole="button" accessibilityLabel="Close swap">
                <Ionicons name="close" size={20} color={t.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {/* D219 lane A4 (design 4.12): where a permanent swap is possible the sheet asks
                once, "Just this session" or "From now on"; the note keeps the
                founder's NA-wr-3 clause (logged sets count towards the new
                exercise's own muscle) in both forms, and says the plan is
                unchanged only where it cannot change. */}
            <Text style={[styles.swapNote, live.swapNote]}>{swapScopeOffered
              ? "Choose a close match. It keeps this slot's sets and reps, and sets you log count towards the new exercise's own muscle in your weekly volume."
              : "Choose a close match for today. Your plan is not changed, and sets you log count towards the new exercise's own muscle in your weekly volume."}</Text>
            {swapScopeOffered ? (
              <View style={styles.swapScopeBlock}>
                <SegmentedControl
                  options={SWAP_SCOPE_OPTIONS}
                  value={swapScope}
                  onChange={chooseSwapScope}
                  accessibilityLabel="Swap just for this session, or from now on"
                />
                <Text style={[styles.swapNote, live.swapNote, styles.swapScopeHint]}>
                  {swapScopeHint(swapScope, { fromName: exercise?.name, surface: 'workout' })}
                </Text>
              </View>
            ) : null}
            {/* T2-08 (D112 R5, closes audit T2-08): the ranked list narrows
                silently against the user's capability rules (rankPersonalised
                -> isEligibleExercise); this says so instead, visibility only -
                ranking and filtering are unchanged. */}
            {swapNarrowedCount > 0 ? (
              <Text style={[styles.swapNote, live.swapNote]}>
                {swapNarrowedCount} movement{swapNarrowedCount === 1 ? '' : 's'} left out for your limitations.
              </Text>
            ) : null}
            {/* EL-11: user intent outranks inference - the pool is a default,
                never a hidden restriction, so "Show all exercises" is always
                one tap away while it applies. */}
            {swapStylePoolKey && !swapStyleShowAll && !swapClosedList ? (
              <View style={[styles.swapNote, live.swapNote, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={[styles.swapNote, live.swapNote, { marginBottom: 0 }]}>
                  Showing {styleLabelFor(swapStylePoolKey)} exercises
                </Text>
                <TouchableOpacity onPress={() => handleOpenSwap({ relaxStyle: true })} accessibilityRole="button" accessibilityLabel="Show all exercises">
                  <Text style={[styles.swapNote, live.swapNote, { marginBottom: 0, color: t.colors.primary, fontFamily: fontFamily.bold }]}>Show all exercises</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <FlashList
              data={swapCandidates}
              extraData={swapScope}
              keyExtractor={item => item.exercise.id}
              contentContainerStyle={styles.swapListContent}
              ItemSeparatorComponent={() => <View style={styles.swapItemGap} />}
              renderItem={({ item }) => {
                // D219 lane A4 (design 4.12): choosing "From now on" for an exercise that
                // trains another primary muscle says what moves, before it is confirmed.
                const muscleMove = swapScope === SWAP_SCOPE.PROGRAMME && swapScopeOffered
                  ? slotMuscleChange({ facts: swapPlanFactsRef.current, routineId: activeWorkout?.routineId, oldExercise: exercise, newExercise: item.exercise })
                  : null;
                return (
                <TouchableOpacity style={[styles.swapItem, live.swapItem]} onPress={() => handleConfirmSwap(item.exercise)} accessibilityRole="button" accessibilityLabel={`Swap in ${item.exercise.name}`}>
                  <View style={[styles.swapItemIcon, live.swapItemIcon]}>
                    <Ionicons name="swap-horizontal" size={16} color={t.colors.textSecondary} />
                  </View>
                  <View style={styles.swapItemCopy}>
                    <Text style={[styles.swapItemName, live.swapItemName]}>{item.exercise.name}</Text>
                    {/* C9 Work 5: why this one sits here, in one short line,
                        and only when it is genuinely true of this user. */}
                    {item.personal?.tag ? (
                      <Text style={[styles.swapItemTag, live.swapItemTag]}>{item.personal.tag}</Text>
                    ) : null}
                    <Text style={[styles.swapItemReason, live.swapItemReason]}>{item.reason}</Text>
                    {muscleMove ? (
                      <Text style={[styles.swapItemReason, live.swapItemReason]}>{swapMuscleNote(muscleMove)}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
                </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.swapEmpty}>
                  {swapUnavailable ? null : (
                    <Text style={[styles.swapEmptyTitle, live.swapEmptyTitle]}>
                      {swapNarrowedCount > 0 ? 'No close matches within your limitations.' : 'No close matches yet'}
                    </Text>
                  )}
                  <Text style={[styles.swapEmptyText, live.swapEmptyText]}>
                    {swapUnavailable
                      ? 'Swaps aren\'t available right now. Try again in a moment.'
                      : (swapClosedList ? 'This plan lists no other exercise for this one here.' : 'Search the full library instead.')}
                  </Text>
                </View>
              }
              ListFooterComponent={swapClosedList ? (
                // D227 F1: an authored plan's list is closed, so there is no
                // way out to the full library from here.
                swapUnavailable ? null
                  : <Text style={[styles.swapNote, live.swapNote]}>This plan offers only the alternatives it lists for this exercise.</Text>
              ) : (
                // Escape hatch from the ranked suggestions: search the whole
                // library or add your own. Always present, so it works whether
                // or not there were candidates.
                <TouchableOpacity
                  style={[styles.swapBrowseBtn, live.swapBrowseBtn]}
                  onPress={() => {
                    // F-13 / A15: leaving the ranked slate for the FULL
                    // library is a deliberate choice from outside the style
                    // pool, so the pool no longer applies to what comes
                    // back. Without this the swap was still filed
                    // causeOverride 'style' ("staying inside the pool is
                    // not preference") and dropped from preference
                    // learning, which is the opposite of what the user did.
                    setSwapStyleShowAll(true);
                    setShowSwapModal(false);
                    setPickerMode('swap');
                    setShowExercisePicker(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Search exercise library"
                >
                  <Ionicons name="search" size={16} color={t.colors.textSecondary} />
                  <Text style={[styles.swapBrowseText, live.swapBrowseText]}>Search exercise library</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
          </SafeAreaProvider>
            </>
          ) : null}
        </Modal>
    </>
  );
}

export default SessionSheets;

const styles = StyleSheet.create({
  // D43 S2: the "N notes" accordion rail (notesRail/notesChip/notesChipText/
  // notesExpanded) is retired -- StatusStrip (src/components/workout/
  // StatusStrip.js) owns the equivalent chip-row styling now.
  // C5-P13-01: the session effort line, quiet caption weight so it orients
  // without competing with the exercise title above it.
  // R2-4 (2026-07-11): a consistent row height (the options button's own
  // 44dp) with centre alignment so the exercise title and the "..." options
  // button share one row and align on their centres at any title length.
  // D43 S3: wraps the exercise name so the whole title is the "Exercise
  // info" tap target (relocated off the overflow sheet); flex: 1 lives here
  // now, exerciseName keeps its own flex: 1 so numberOfLines={2} still wraps
  // correctly inside it.
  // Founder order 2026-08-17 (two device notes): (1) the tap target is a ROW
  // now so the details chevron hugs the name's end; (2) the name and the
  // options dots sit perfectly on one centre line - the tap row centres its
  // children on the same 44dp axis the dots box uses, and the name drops
  // Android's extra font padding, which floated its ink a couple of dp high
  // beside the icon.
  // Founder order 2026-08-17 (Campaign 27): the exercise name steps down one
  // notch, title (17) -> bodyStrong (16, same medium weight) - "ever so
  // slightly smaller", calmer against the plain header dots. flexShrink (not
  // flex: 1) so the details chevron hugs the name's end instead of parking
  // at the row's far edge; minWidth: 0 keeps two-line wrap working.
  // Founder device order 2026-08-18: the active exercise name steps down
  // once more (bodyStrong 16 -> label 13, semibold) - it was overpowering
  // the outline strip; layout position and weight keep its title role.
  swapSafe: { flex: 1, backgroundColor: colors.background },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  swapHeaderCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  swapTitle: { ...type.title, color: colors.textPrimary },
  swapSubtitle: { ...type.caption, color: colors.textMuted },
  swapCloseBtn: {
    width: workoutLoggerSize.headerButtonMin,
    height: workoutLoggerSize.headerButtonMin,
    alignItems: 'center',
    justifyContent: 'center',
    // R2 compliance: icon button -> radius.md.
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  swapNote: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  swapListContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  // D219 lane A4: the scope choice sits under the sheet's note, on the note's own gutters.
  swapScopeBlock: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  swapScopeHint: { paddingHorizontal: 0, paddingTop: spacing.xs },
  swapItemGap: { height: spacing.sm },
  swapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: workoutLoggerSize.primaryActionMinHeight,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  swapItemIcon: {
    width: 32,
    height: 32,
    // R2 compliance: small icon container -> radius.md.
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    flexShrink: 0,
  },
  swapItemCopy: { flex: 1, minWidth: 0 },
  swapItemName: { ...type.label, color: colors.textPrimary, marginBottom: spacing.xxs },
  swapItemReason: { ...type.caption, color: colors.textMuted, lineHeight: 16 },
  // C9: the personal reason, in the app's accent, above the structural one.
  swapItemTag: { ...type.caption, color: colors.primary, lineHeight: 16 },
  swapBrowseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md, minHeight: workoutLoggerSize.primaryActionMinHeight, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface },
  swapBrowseText: { ...type.label, color: colors.textPrimary },
  swapEmpty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  swapEmptyTitle: { ...type.label, color: colors.textPrimary },
  swapEmptyText: { ...type.caption, color: colors.textMuted },
  // Founder device order 2026-08-17: the rounded-square container around
  // the exercise-header "..." is retired - it made the overflow look almost
  // as important as the exercise name. The button keeps its full 44dp
  // TARGET (workoutLoggerSize.overflowButton = touchTarget.minimum) but
  // draws nothing at rest: just the muted dots, dimmed while pressed via
  // the TouchableOpacity's own feedback.
  // C5-P13-03: the one-time hinted state. The button widens to fit the
  // label rather than cropping it inside the fixed square, and returns to
  // the plain square the moment the cue retires.
  overflowOptionRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Upcoming prescribed sets: quiet read-only LINES closing the continuous
  // sequence - phase 2B retired the dashed bordered cards (an unperformed
  // future set must never carry the visual mass of the active one).
  // Phase 2B: the fold line for earlier completed sets (active-set
  // stability). One quiet row, constant height whatever it hides.
  // D43 S1: loggedSetRow/loggedSetRowWarmup/loggedSetTextWarmup/setNumBadge/
  // setNumText/loggedSetText/loggedEst1RM (LoggedSetRow-exclusive) and
  // emptyView/emptyContent/emptyTitle/emptySubtitle/addFirstBtn/
  // addFirstBtnText (EmptyExerciseView-exclusive) moved verbatim to
  // src/components/workout/LoggedSetRow.js and .../EmptyExerciseView.js --
  // no other render in this screen used them, so nothing stays behind.
  sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetExplainer: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.lg },
  sheetScroll: { flexShrink: 1, minHeight: 0 },
  sheetScrollBody: { paddingBottom: spacing.xs },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: workoutLoggerSize.compactSheetOptionMinHeight, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  // B8 gym-basics sheet
  rampBarTag: { ...type.caption, color: colors.textMuted },
  sheetOptionText: { flex: 1, gap: spacing.xxs },
  sheetOptionLabel: { ...type.bodyStrong, color: colors.textPrimary },
  sheetOptionLabelActive: { color: colors.primary },
  // D32 (2026-07-10, campaign item 20): the whole-workout reorder sheet.
  reorderSheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  reorderSheetRowInfo: { flex: 1, gap: spacing.xxs },
  reorderSheetRowName: { ...type.bodyStrong, color: colors.textPrimary },
  reorderSheetRowMeta: { ...type.caption, color: colors.textMuted },
  reorderSheetSupersetChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    // R2 compliance: chip container -> radius.md.
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignSelf: 'flex-start', marginTop: spacing.xxs,
  },
  reorderSheetSupersetChipText: { ...type.captionStrong, color: colors.textSecondary },
  reorderSheetChevrons: { flexDirection: 'column', alignItems: 'center', gap: spacing.xxs },
  reorderSheetChevronBtn: {
    // R2 compliance: icon button -> radius.md.
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md, backgroundColor: colors.surface2,
  },
  reorderSheetChevronBtnDisabled: { opacity: 0.3 },
  infoTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  infoTarget: { ...type.label, color: colors.primary },
  // D151 sheet polish: metadata one step up from muted so "Back · Cable"
  // reads as information under the title; the instruction sections are a
  // labelled stack (Setup / Execution / Watch), label in the quiet
  // captionStrong, body at bodySm in the primary ink because it IS the
  // content of the sheet; spacing.md between sections, spacing.xxs inside.
  infoMuscle: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  infoInstructions: { gap: spacing.md, marginTop: spacing.sm },
  infoInstruction: { gap: spacing.xxs },
  infoNotesLabel: { ...type.captionStrong, color: colors.textMuted },
  infoNotes: { ...type.bodySm, color: colors.textPrimary },
  // COMP-015 "Adjusted today" section in the info sheet
  // D151 accent restraint: the adjusted/eased box is a tonal surface with
  // a hairline (the sheet's one amber stays on the prescription line and
  // the section titles), not an amber-tinted card.
  adjustedSection: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  adjustedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  adjustedTitle: { ...type.captionStrong, color: colors.primary },
  adjustedReason: { ...type.bodySm, color: colors.textPrimary },
  adjustedSignal: { ...type.caption, color: colors.textMuted },
  adjustedRevertBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, paddingVertical: spacing.xs },
  adjustedRevertText: { fontSize: fontSize.sm, color: colors.primary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  // Superset heads-up modal (shared with the unilateral-suggest modal below
  // -- both use supOverlay/supSheet/supSheetContent). D36a (item 17 modal
  // tails, 2026-07-10): this stays a raw Modal (education moment with its
  // own scroll behaviour, not a candidate for BottomSheet), but the bottom
  // padding was a fixed token with no safe-area inset -- the call sites now
  // widen contentContainerStyle to
  // `Math.max(spacing.xxl, insets.bottom + spacing.lg)`, same
  // Math.max(token, insets.bottom + token) contract as bottomBar/plateBar.
  // The static paddingBottom below stays as the pre-inset floor.
  supOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  supSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '88%', borderTopWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  supSheetScroll: { flexShrink: 1, minHeight: 0 },
  supSheetContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  supIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supTitle: { ...type.h3, color: colors.textPrimary },
  supSubtitle: { ...type.bodySm, color: colors.textSecondary },
  supPairCard: { borderLeftWidth: 3, borderLeftColor: colors.primary, gap: spacing.xs },
  supPairRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supPairChip: { width: 22, height: 22, borderRadius: circle(22), backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center' },
  supPairChipText: { ...type.num('captionStrong'), color: colors.onPrimary },
  supPairName: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  supPairConnector: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 10 },
  supSteps: { gap: spacing.sm, marginTop: spacing.xs },
  supStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  supStepNum: { color: colors.primary, fontSize: fontSize.sm, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, minWidth: 14 },
  supStepText: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  supTip: { ...type.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },
  supPrimaryBtn: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  supPrimaryBtnText: { ...type.bodyStrong, color: colors.textPrimary },
  supSecondaryRow: { flexDirection: 'row', gap: spacing.sm },
  supSecondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  supSecondaryBtnText: { ...type.label, color: colors.textSecondary },
  staleOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  staleSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxHeight: '88%', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  staleTitle: { ...type.h3, color: colors.textPrimary, textAlign: 'center' },
  staleBody: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  staleResume: { width: '100%', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center' },
  staleResumeText: { ...type.bodyStrong, color: colors.textPrimary },
  staleFinish: { width: '100%', backgroundColor: colors.surface2, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  staleFinishText: { ...type.label, color: colors.textPrimary },
  staleDiscard: { width: '100%', paddingVertical: spacing.md, alignItems: 'center' },
  staleDiscardText: { ...type.label, color: colors.error },
});

// The live-theme mirrors of the styles above (see buildLiveStyles in
// ActiveWorkoutScreen.js for the pattern): colour, font and type-bearing
// sub-properties only, at identical rest values.
function buildLiveStyles(t) {
  return {
    // fontWeight is a static token table (not theme-resolved), so the live
    // mirror reads the same import the frozen block does.
    swapSafe: { backgroundColor: t.colors.background },
    swapHeader: { borderBottomColor: t.colors.borderSubtle },
    swapTitle: { ...t.type.title, color: t.colors.textPrimary },
    swapSubtitle: { ...t.type.caption, color: t.colors.textMuted },
    swapCloseBtn: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    swapNote: { ...t.type.caption, color: t.colors.textMuted },
    swapItem: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    swapItemIcon: { backgroundColor: t.colors.surface2 },
    swapItemName: { ...t.type.label, color: t.colors.textPrimary },
    swapItemReason: { ...t.type.caption, color: t.colors.textMuted },
    swapItemTag: { ...t.type.caption, color: t.colors.primary },
    swapBrowseBtn: { borderColor: t.colors.borderSubtle, backgroundColor: t.colors.surface },
    swapBrowseText: { ...t.type.label, color: t.colors.textPrimary },
    swapEmptyTitle: { ...t.type.label, color: t.colors.textPrimary },
    swapEmptyText: { ...t.type.caption, color: t.colors.textMuted },
    // Phase 2B live-theme mirrors for the sequence additions.
    // D43 S1: LoggedSetRow-exclusive (loggedSetRow/loggedSetRowWarmup/
    // loggedSetTextWarmup/setNumBadge/setNumText/loggedSetText/loggedEst1RM)
    // and EmptyExerciseView-exclusive (emptyView/emptyTitle/emptySubtitle/
    // addFirstBtn/addFirstBtnText) live overrides moved verbatim into each
    // component's own buildLiveStyles.
    sheetTitle: { ...t.type.title, color: t.colors.textPrimary },
    sheetExplainer: { ...t.type.bodySm, color: t.colors.textSecondary },
    sheetOption: { borderBottomColor: t.colors.border },
    rampBarTag: { ...t.type.caption, color: t.colors.textMuted },
    sheetOptionLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sheetOptionLabelActive: { color: t.colors.primary },
    reorderSheetRow: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    reorderSheetRowName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    reorderSheetRowMeta: { ...t.type.caption, color: t.colors.textMuted },
    reorderSheetSupersetChip: { backgroundColor: t.colors.surface2 },
    reorderSheetSupersetChipText: { ...t.type.captionStrong, color: t.colors.textSecondary },
    reorderSheetChevronBtn: { backgroundColor: t.colors.surface2 },
    infoTarget: { ...t.type.label, color: t.colors.primary },
    infoMuscle: { ...t.type.caption, color: t.colors.textSecondary },
    infoNotesLabel: { ...t.type.captionStrong, color: t.colors.textMuted },
    infoNotes: { ...t.type.bodySm, color: t.colors.textPrimary },
    adjustedSection: { backgroundColor: t.colors.surface2, borderColor: t.colors.borderSubtle },
    adjustedTitle: { ...t.type.captionStrong, color: t.colors.primary },
    adjustedReason: { ...t.type.bodySm, color: t.colors.textPrimary },
    adjustedSignal: { ...t.type.caption, color: t.colors.textMuted },
    adjustedRevertText: { fontSize: t.fontSize.sm, color: t.colors.primary },
    supOverlay: { backgroundColor: t.colors.scrim },
    supSheet: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    supTitle: { ...t.type.h3, color: t.colors.textPrimary },
    supSubtitle: { ...t.type.bodySm, color: t.colors.textSecondary },
    supPairCard: { borderLeftColor: t.colors.primary },
    supPairChip: { backgroundColor: t.colors.primaryFill },
    supPairChipText: { ...t.type.num('captionStrong'), color: t.colors.onPrimary },
    supPairName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    supPairConnector: { backgroundColor: t.colors.border },
    supStepNum: { color: t.colors.primary, fontSize: t.fontSize.sm },
    supStepText: { ...t.type.bodySm, color: t.colors.textPrimary },
    supTip: { ...t.type.caption, color: t.colors.textMuted },
    supPrimaryBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    supPrimaryBtnText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    supSecondaryBtn: { borderColor: t.colors.border },
    supSecondaryBtnText: { ...t.type.label, color: t.colors.textSecondary },
    staleOverlay: { backgroundColor: t.colors.scrim },
    staleSheet: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    staleTitle: { ...t.type.h3, color: t.colors.textPrimary },
    staleBody: { ...t.type.bodySm, color: t.colors.textSecondary },
    staleResume: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    staleResumeText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    staleFinish: { backgroundColor: t.colors.surface2, borderColor: t.colors.borderSubtle },
    staleFinishText: { ...t.type.label, color: t.colors.textPrimary },
    staleDiscardText: { ...t.type.label, color: t.colors.error },
  };
}
