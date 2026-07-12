import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import SectionLabel from './SectionLabel';
import BottomSheet from './BottomSheet';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
//
// The Home "Change workout" / workout-options sheet: view the planned
// workout, start a blank session, or pick a different day from the active
// plan. Callback props (onClose, onSelectOverride) mirror the setState
// calls the JSX used to make directly, so behaviour is unchanged.
//
// D36a (item 17 modal tails, 2026-07-10): migrated off a hand-rolled Modal
// onto the shared BottomSheet chrome. BottomSheet owns the backdrop, drag
// handle, and bottom-inset padding itself, so `insetsBottom` (previously
// threaded in from HomeScreen's useSafeAreaInsets) is no longer accepted --
// see HomeScreen.js's call site, which now omits it.
function HomeChangeWorkoutSheet({
  visible, onClose, activePlan, displayWorkout, planAllWorkouts, nextWorkout,
  exerciseCounts, selectedWorkoutOverride, onSelectOverride, navigation,
}) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour-bearing
  // keys only.
  const t = useTheme();
  const live = {
    sheetTitle: { ...t.type.h3, color: t.colors.textPrimary },
    sheetSub: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    sheetActionIcon: { backgroundColor: t.colors.primaryBg },
    sheetActionTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sheetActionSub: { ...t.type.caption, color: t.colors.textSecondary },
    pickerRow: { borderBottomColor: t.colors.border },
    pickerRowActive: { backgroundColor: t.colors.primaryBg },
    dayBadge: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    dayBadgeActive: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.strong) },
    dayNum: { fontSize: t.fontSize.xs, color: t.colors.textSecondary },
    dayNumActive: { color: t.colors.primary },
    pickerName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    pickerMeta: { ...t.type.caption, color: t.colors.textMuted },
    nextBadge: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    nextBadgeText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    sheetCancelText: { ...t.type.body, color: t.colors.textSecondary },
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Workout options">
        <Text style={[styles.sheetTitle, live.sheetTitle]}>Workout options</Text>
        {activePlan && <Text style={[styles.sheetSub, live.sheetSub]}>{activePlan.name}</Text>}
        {/* Fixed title/sub above, fixed Cancel below, scrollable picker list
            in between -- same three-region layout the old Modal had, kept
            deliberately rather than letting BottomSheet's own `scroll` prop
            put Cancel inside the scroll area (same nested-ScrollView pattern
            ActiveWorkoutScreen's WorkoutSheetScroll already uses inside a
            non-scroll BottomSheet). */}
        <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
          {displayWorkout?.routine?.id ? (
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => {
                onClose();
                navigation.navigate('PlansTab', {
                  screen: 'RoutineDetail',
                  params: { routineId: displayWorkout.routine.id },
                  initial: false,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={`View ${displayWorkout?.routine?.name || 'workout'} before starting`}
            >
              <View style={[styles.sheetActionIcon, live.sheetActionIcon]}>
                <Ionicons name="reader-outline" size={18} color={t.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetActionTitle, live.sheetActionTitle]}>View workout</Text>
                <Text style={[styles.sheetActionSub, live.sheetActionSub]}>Review the exercises before you start.</Text>
              </View>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.sheetActionRow}
            onPress={() => {
              onClose();
              navigation.navigate('BuildWorkout');
            }}
            accessibilityRole="button"
            accessibilityLabel="Start a blank workout"
          >
            <View style={[styles.sheetActionIcon, live.sheetActionIcon]}>
              <Ionicons name="add-circle-outline" size={18} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetActionTitle, live.sheetActionTitle]}>Blank workout</Text>
              <Text style={[styles.sheetActionSub, live.sheetActionSub]}>Log freely without changing your plan.</Text>
            </View>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
          </TouchableOpacity>
          {planAllWorkouts.length > 0 ? (
            <SectionLabel tone="muted" style={styles.sheetSectionLabel}>Choose a different workout</SectionLabel>
          ) : null}
          {planAllWorkouts.map((routine, i) => {
            const isNext = i === nextWorkout?.idx && !selectedWorkoutOverride;
            const isSel = selectedWorkoutOverride?.idx === i;
            return (
              <TouchableOpacity
                key={routine.id ?? i}
                style={[styles.pickerRow, live.pickerRow, (isNext || isSel) && [styles.pickerRowActive, live.pickerRowActive]]}
                onPress={() => {
                  onSelectOverride(
                    i === nextWorkout?.idx ? null : { routine, total: planAllWorkouts.length, idx: i },
                  );
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Day ${i + 1}, ${routine.name}`}
                accessibilityState={{ selected: isNext || isSel }}
              >
                <View style={[styles.dayBadge, live.dayBadge, (isNext || isSel) && [styles.dayBadgeActive, live.dayBadgeActive]]}>
                  <Text style={[styles.dayNum, live.dayNum, (isNext || isSel) && [styles.dayNumActive, live.dayNumActive]]}>
                    D{i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerName, live.pickerName]} numberOfLines={1}>{routine.name}</Text>
                  {exerciseCounts[routine.id] ? (
                    <Text style={[styles.pickerMeta, live.pickerMeta]}>{exerciseCounts[routine.id]} exercises</Text>
                  ) : null}
                </View>
                {isNext && (
                  <View style={[styles.nextBadge, live.nextBadge]}>
                    <Text style={[styles.nextBadgeText, live.nextBadgeText]}>Next up</Text>
                  </View>
                )}
                {isSel && <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={[styles.sheetCancelText, live.sheetCancelText]}>Cancel</Text>
        </TouchableOpacity>
    </BottomSheet>
  );
}

export default React.memo(HomeChangeWorkoutSheet);

const styles = StyleSheet.create({
  // BottomSheet supplies the backdrop, panel chrome and drag handle now
  // (D36a migration) -- only the content-level styles below remain.
  pickerScroll: { flexShrink: 1, minHeight: 0 },
  sheetTitle: {
    ...type.h3,
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetActionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  sheetActionTitle: { ...type.bodyStrong, color: colors.textPrimary },
  sheetActionSub: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  sheetSectionLabel: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerRowActive: {
    backgroundColor: colors.primaryBg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  dayBadge: {
    width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  dayBadgeActive: { backgroundColor: colors.primaryBg, borderColor: withAlpha(colors.primary, alpha.strong) },
  dayNum: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary },
  dayNumActive: { color: colors.primary },
  pickerName: { ...type.bodyStrong, color: colors.textPrimary },
  pickerMeta: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  nextBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.edge),
  },
  nextBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  sheetCancel: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  sheetCancelText: { ...type.body, color: colors.textSecondary },
});
