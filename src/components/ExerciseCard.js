import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import PressableCard from './PressableCard';

export default function ExerciseCard({ exercise, onPress, onAdd, onLongPress, lastLogged, units = 'kg', showAddButton = true }) {
  const primaryMuscle = MUSCLE_DISPLAY_NAMES[(exercise.primaryMuscle || exercise.primary_muscle || '').toLowerCase()]
    || exercise.primaryMuscle || exercise.primary_muscle || '';

  const equipment = exercise.equipment || '';
  const sfr = exercise.stimulusToFatigueRatio || exercise.stimulus_to_fatigue_ratio || 3;

  return (
    <PressableCard style={styles.card} onPress={onPress} onLongPress={onLongPress} accessibilityLabel={exercise.name}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{exercise.name}</Text>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{primaryMuscle}</Text>
            </View>
            {equipment ? (
              <View style={[styles.tag, styles.tagSecondary]}>
                <Text style={[styles.tagText, styles.tagTextSecondary]}>{equipment}</Text>
              </View>
            ) : null}
            {exercise.isCustom || exercise.is_custom ? (
              <View style={[styles.tag, styles.tagCustom]}>
                <Text style={[styles.tagText, styles.tagTextCustom]}>Custom</Text>
              </View>
            ) : null}
          </View>
          {lastLogged ? (
            <Text style={styles.lastLogged}>
              Last: {lastLogged.weight}{units} × {lastLogged.reps} reps
              {lastLogged.daysAgo ? ` · ${lastLogged.daysAgo}d ago` : ''}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          {showAddButton && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onAdd || onPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  tagSecondary: {
    backgroundColor: colors.surface2,
  },
  tagTextSecondary: {
    color: colors.textSecondary,
  },
  tagCustom: {
    backgroundColor: colors.primaryBg,
  },
  tagTextCustom: {
    color: colors.primary,
  },
  lastLogged: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
