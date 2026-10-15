/**
 * Props for rendering the real SessionSheets with only the exercise options
 * sheet open (shared by the clip-row suite). Not a test file.
 */
export function buildSheetProps() {
  const noop = () => {};
  return {
    reduceMotion: true,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    t: require('../../../../styles/theme').resolveTheme({ theme: 'dark' }),
    sharedStyles: {},
    sharedLive: {},
    showOverflow: true,
    setShowOverflow: noop,
    exercise: { id: 'e1', name: 'Back squat', laterality: 'bilateral', exerciseType: 'weight_reps' },
    workoutExercises: [{ exercise: { id: 'e1' }, sets: [] }, { exercise: { id: 'e2' }, sets: [] }],
    currentExerciseIndex: 0,
    currentSGI: null,
    unilateralExercises: new Set(),
    cluster: null,
    currentSet: { weight: '60', reps: '5', setType: 'straight' },
    rampAnchorRef: { current: null },
    canUseLastSession: true,
    isLastExercise: false,
    isPairedWithNext: false,
    timeCrunchActive: false,
    workAroundSwapRef: { current: false },
    navigation: { navigate: noop },
    handleOpenSwap: noop,
    handleUseLastSession: noop,
    handleTogglePair: noop,
    handleTimeCrunch: noop,
    handleRevertTimeCrunch: noop,
    handleRemoveExercise: noop,
    handleRecordClip: noop,
    openAddExercisePicker: noop,
    setShowRestLengthFor: noop,
    setShowReorderSheet: noop,
    setShowWarmupRamp: noop,
    reorderSheetScroll: { scrollRef: { current: null }, onScroll: noop, onContentSizeChange: noop, scrollOffset: { value: 0 } },
    SET_TYPE_OPTIONS: [],
    clipsSuppressed: true,
    clipCount: 0,
  };
}
