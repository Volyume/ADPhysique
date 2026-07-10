import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import SectionLabel from './SectionLabel';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
//
// The Home "Change workout" / workout-options sheet: view the planned
// workout, start a blank session, or pick a different day from the active
// plan. Callback props (onClose, onSelectOverride) mirror the setState
// calls the JSX used to make directly, so behaviour is unchanged.
function HomeChangeWorkoutSheet({
  visible, onClose, activePlan, displayWorkout, planAllWorkouts, nextWorkout,
  exerciseCounts, selectedWorkoutOverride, onSelectOverride, navigation,
  reduceMotion, insetsBottom,
}) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour-bearing
  // keys only.
  const t = useTheme();
  const live = {
    sheetBackdrop: { backgroundColor: t.colors.scrim },
    sheet: { backgroundColor: t.colors.surface },
    sheetHandle: { backgroundColor: t.colors.border },
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
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.sheetBackdrop, live.sheetBackdrop]}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, live.sheet, { paddingBottom: spacing.xxxl + insetsBottom }]}>
        <View style={[styles.sheetHandle, live.sheetHandle]} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Workout options</Text>
        {activePlan && <Text maxFontSizeMultiplier={1.3} style={[styles.sheetSub, live.sheetSub]}>{activePlan.name}</Text>}
        <ScrollView showsVerticalScrollIndicator={false}>
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
                <Text maxFontSizeMultiplier={1.3} style={[styles.sheetActionTitle, live.sheetActionTitle]}>View workout</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.sheetActionSub, live.sheetActionSub]}>Review the exercises before you start.</Text>
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
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetActionTitle, live.sheetActionTitle]}>Blank workout</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetActionSub, live.sheetActionSub]}>Log freely without changing your plan.</Text>
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
                  <Text maxFontSizeMultiplier={1.3} style={[styles.dayNum, live.dayNum, (isNext || isSel) && [styles.dayNumActive, live.dayNumActive]]}>
                    D{i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.pickerName, live.pickerName]} numberOfLines={1}>{routine.name}</Text>
                  {exerciseCounts[routine.id] ? (
                    <Text maxFontSizeMultiplier={1.3} style={[styles.pickerMeta, live.pickerMeta]}>{exerciseCounts[routine.id]} exercises</Text>
                  ) : null}
                </View>
                {isNext && (
                  <View style={[styles.nextBadge, live.nextBadge]}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.nextBadgeText, live.nextBadgeText]}>Next up</Text>
                  </View>
                )}
                {isSel && <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text maxFontSizeMultiplier={1.3} style={[styles.sheetCancelText, live.sheetCancelText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default React.memo(HomeChangeWorkoutSheet);

const styles = StyleSheet.create({
  sheetBackdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: radius.hair,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
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
