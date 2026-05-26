import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing } from '../../styles/theme';

export const SOURCE_LABEL = {
  off: 'OFF',
  usda: 'USDA',
  cofid: 'CoFID',
  user_ocr: 'Snapped',
  custom: 'You',
};

export function kcalForServing(food) {
  if (!food || !food.serving_g) return null;
  return Math.round((food.kcal_100g ?? 0) * food.serving_g / 100);
}

export default function FoodRow({ food, isFav, onPress, onLongPress }) {
  const sourceTag = SOURCE_LABEL[food.source] ?? null;
  const kcalPerServing = kcalForServing(food);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${food.name}, ${kcalPerServing ?? '?'} kcal per serving. Long-press to favourite.`}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {food.name}
          {isFav ? '  ★' : ''}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {food.serving_label || `${food.serving_g}g`}
          {kcalPerServing != null ? ` · ${kcalPerServing} kcal` : ''}
          {sourceTag ? `  ${sourceTag}` : ''}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    minHeight: 56,
  },
  rowName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  rowMeta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
});
