import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, fontSize, spacing, radius, type, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';
import Button from '../Button';

// D43 S1 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
// section 5, ruled approved under D49): extracted byte-identical out of
// ActiveWorkoutScreen.js as the first decomposition slice (zero visual/
// behaviour change). Several style keys below (header/headerSide/
// headerTapTarget/headerSideRight/headerFinishButton/headerCenter/timerText/
// exerciseNav/exerciseNavContent/navTab*) are SHARED with the main screen's
// own header + exercise-nav strip, so they are duplicated here rather than
// deleted from ActiveWorkoutScreen.js's own `styles`/`buildLiveStyles` --
// the screen still renders its own header/nav using those same keys.
export default function EmptyExerciseView({ onAdd, onFinish, onCancel, elapsed, workoutExercises, setCurrentExerciseIndex, currentExerciseIndex }) {
  // CP-10 stage 3 (theming FINAL batch): live theme (src/hooks/useTheme.js).
  // See buildLiveStyles' header comment (defined further down this
  // file, after the frozen `styles` block -- see the comment there for why).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.emptyView, live.emptyView]}>
      <View style={[styles.header, live.header]}>
        <View style={styles.headerSide}>
          <TouchableOpacity onPress={onCancel} style={styles.headerTapTarget} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cancel workout">
            <Ionicons name="close" size={22} color={t.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.timerText, live.timerText]}>{elapsed}</Text>
        </View>
        <View style={styles.headerSideRight}>
          <Button
            title="Finish"
            icon="checkmark-done"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={onFinish}
            style={[styles.headerTapTarget, styles.headerFinishButton, live.headerFinishButton]}
            accessibilityLabel="Finish workout"
          />
        </View>
      </View>

      {workoutExercises.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.exerciseNav, live.exerciseNav]} contentContainerStyle={styles.exerciseNavContent}>
          {workoutExercises.map((entry, i) => (
            <TouchableOpacity key={i} style={[styles.navTab, live.navTab, i === currentExerciseIndex && [styles.navTabActive, live.navTabActive]]} onPress={() => setCurrentExerciseIndex(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} accessibilityRole="button" accessibilityState={{ selected: i === currentExerciseIndex }} accessibilityLabel={entry.exercise?.name || `Exercise ${i + 1}`}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.navTabText, live.navTabText, i === currentExerciseIndex && [styles.navTabTextActive, live.navTabTextActive]]} numberOfLines={1} ellipsizeMode="tail">
                {entry.exercise?.name}
              </Text>
              {entry.sets?.length > 0 && <View style={[styles.navTabBadge, live.navTabBadge]}><Text style={[styles.navTabBadgeText, live.navTabBadgeText]} maxFontSizeMultiplier={1.3}>{entry.sets.length}</Text></View>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.emptyContent}>
        <Ionicons name="barbell-outline" size={64} color={t.colors.surface3} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.emptyTitle, live.emptyTitle]}>Add your first exercise</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.emptySubtitle, live.emptySubtitle]}>Search the exercise library to get started</Text>
        <Button
          variant="primary"
          fullWidth={false}
          style={[styles.addFirstBtn, live.addFirstBtn]}
          onPress={onAdd}
          accessibilityLabel="Add exercise"
        >
          <Ionicons name="add" size={22} color={t.colors.onPrimary} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.addFirstBtnText, live.addFirstBtnText]}>Add exercise</Text>
        </Button>
      </View>
    </View>
  );
}

// Frozen base styles, moved verbatim from ActiveWorkoutScreen.js's `styles`
// StyleSheet (D43 S1). header/headerSide/headerTapTarget/headerSideRight/
// headerFinishButton/headerCenter/timerText/exerciseNav/exerciseNavContent/
// navTab* are DUPLICATED (not deleted) from the screen's own StyleSheet --
// see the file header comment above. emptyView/emptyContent/emptyTitle/
// emptySubtitle/addFirstBtn/addFirstBtnText are exclusive to this component
// and were deleted from ActiveWorkoutScreen.js's StyleSheet.
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerSide: { width: workoutLoggerSize.headerSide, alignItems: 'flex-start', justifyContent: 'center' },
  // CL-6.2: a real 44pt frame under the top-corner controls (plus hitSlop);
  // purely transparent, no visual change.
  headerTapTarget: { minWidth: workoutLoggerSize.headerButtonMin, minHeight: workoutLoggerSize.headerButtonMin, alignItems: 'center', justifyContent: 'center' },
  headerSideRight: { width: workoutLoggerSize.headerSide, alignItems: 'flex-end', justifyContent: 'center' },
  headerFinishButton: {
    flexDirection: 'row',
    gap: spacing.xxs,
    minWidth: workoutLoggerSize.finishButtonMinWidth,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  timerText: { ...type.num('title'), color: colors.primary },
  exerciseNav: { borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: workoutLoggerSize.exerciseNavMaxHeight },
  exerciseNavContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.sm, alignItems: 'center' },
  navTab: { minHeight: workoutLoggerSize.exerciseTabMinHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface2 },
  navTabActive: { backgroundColor: colors.primaryBg },
  navTabText: { ...type.label, color: colors.textSecondary },
  navTabTextActive: { color: colors.primary },
  navTabBadge: { width: workoutLoggerSize.exerciseTabBadge, height: workoutLoggerSize.exerciseTabBadge, borderRadius: circle(workoutLoggerSize.exerciseTabBadge), backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center' },
  navTabBadgeText: { ...type.caption, color: colors.onPrimary, fontSize: fontSize.micro },
  emptyView: { flex: 1, backgroundColor: colors.background },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: spacing.xxxl, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: workoutLoggerSize.addExerciseMinHeight, backgroundColor: colors.primaryFill, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm },
  addFirstBtnText: { ...type.label, color: colors.onPrimary },
});

// CP-10 stage 3 (theming FINAL batch, 2026-07-10): the same "frozen base +
// live override" map pattern as ActiveWorkoutScreen.js's own buildLiveStyles
// (see that function's header comment for the full rationale), moved
// verbatim (D43 S1) and scoped down to only the keys this component reads --
// every key here mirrors only the colour/fontSize/type-bearing
// sub-properties of the matching frozen style above, at identical rest
// values; pure layout keys (flex/gap/padding/width, no token) are correctly
// omitted, there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    header: { borderBottomColor: t.colors.border },
    headerFinishButton: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    timerText: { ...t.type.num('title'), color: t.colors.primary },
    exerciseNav: { borderBottomColor: t.colors.border },
    navTab: { backgroundColor: t.colors.surface2 },
    navTabActive: { backgroundColor: t.colors.primaryBg },
    navTabText: { ...t.type.label, color: t.colors.textSecondary },
    navTabTextActive: { color: t.colors.primary },
    navTabBadge: { backgroundColor: t.colors.primaryFill },
    navTabBadgeText: { ...t.type.caption, color: t.colors.onPrimary, fontSize: t.fontSize.micro },
    emptyView: { backgroundColor: t.colors.background },
    emptyTitle: { ...t.type.title, color: t.colors.textPrimary },
    emptySubtitle: { ...t.type.body, color: t.colors.textSecondary },
    addFirstBtn: { backgroundColor: t.colors.primaryFill },
    addFirstBtnText: { ...t.type.label, color: t.colors.onPrimary },
  };
}
