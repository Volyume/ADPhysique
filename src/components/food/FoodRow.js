import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, iconSize, fontFamily } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';

// O18 (comprehension/trust audit 2026-08-06): 'OFF' read as "food gone off"
// to a first-time user (it is the Open Food Facts source code). Readable
// short form here; the rest were already plain-language.
export const SOURCE_LABEL = {
  off: 'Food Facts',
  usda: 'USDA',
  cofid: 'CoFID',
  user_ocr: 'Snapped',
  custom: 'You',
};

// Per-100g foods (curated staples, some database rows) carry no serving
// size. Fall back to a 100g basis so the row shows "100g - X kcal" rather
// than "nullg".
export function servingGrams(food) {
  return food?.serving_g && food.serving_g > 0 ? food.serving_g : 100;
}

export function kcalForServing(food) {
  if (!food) return null;
  return Math.round((food.kcal_100g ?? 0) * servingGrams(food) / 100);
}

// `preference`: 'fav' | 'dislike' | null. 'dislike' is the user's
// "don't suggest this" instruction (Campaign 17B job 8: one name for it
// across Diary, Search and Meal Plan). When set, the row
// renders muted text + a small cross-circle next to the name to
// signal "you've said you don't eat this". Tapping still works
// (the user can deliberately log a disliked food); it only
// affects coach suggestions and the Favourites surface.
export default function FoodRow({
  food,
  isFav,
  preference,
  onPress,
  onLongPress,
  onAdd,
  addLabel = 'Add',
  addAccessibilityLabel,
  longPressHint,
  // D138: a plain edit affordance for a custom food (the Custom tab only).
  // A trailing pencil, matching the house pattern of a small icon button
  // beside a row's primary control (see LoggedSetRow's edit chrome) rather
  // than overloading the existing long-press (already the favourite/exclude
  // preference cycle on every row).
  onEdit,
  editAccessibilityLabel,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const sourceTag = SOURCE_LABEL[food.source] ?? null;
  // kcalForServing stays in kcal (other callers/tests depend on the numeric
  // helper). Energy DISPLAY unit (kcal | kj) is applied here, at the render
  // sites only, leaving the helper's kcal return untouched.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const energyWord = energyUnit === 'kj' ? 'kilojoules' : 'calories';
  const kcalPerServing = kcalForServing(food);
  // Back-compat: callers that still pass `isFav` get the legacy
  // star-only behaviour. New callers pass `preference`.
  const pref = preference ?? (isFav ? 'fav' : null);
  const isDislike = pref === 'dislike';
  const a11yPref = pref === 'fav' ? 'Favourited.'
    : pref === 'dislike' ? 'Not suggested.'
    : '';
  return (
    <TouchableOpacity
      style={[styles.row, live.row]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${food.name}, ${kcalPerServing != null ? toEnergy(kcalPerServing, energyUnit) : '?'} ${energyWord} per serving. ${a11yPref}`}
      accessibilityHint={onLongPress ? (longPressHint ?? 'Long-press to cycle favourite, exclude, neutral') : undefined}
    >
      <View style={styles.rowMain}>
        <Text
          style={[styles.rowName, live.rowName, isDislike && [styles.rowNameMuted, live.rowNameMuted]]}
          numberOfLines={1}
        >
          {food.name}
          {pref === 'fav' ? '  Starred' : ''}
        </Text>
        <Text
          style={[styles.rowMeta, live.rowMeta, isDislike && [styles.rowMetaMuted, live.rowMetaMuted]]}
          numberOfLines={1}
        >
          {food.brand ? `${food.brand} - ` : ''}
          {food.serving_label || `${servingGrams(food)}g`}
          {kcalPerServing != null ? ` - ${toEnergy(kcalPerServing, energyUnit)} ${energyUnitLabel(energyUnit)}` : ''}
          {sourceTag ? `  ${sourceTag}` : ''}
        </Text>
      </View>
      {pref === 'dislike'
        ? <Ionicons name="close-circle" size={20} color={t.colors.textMuted} style={{ marginRight: spacing.sm }} />
        : null}
      {onEdit ? (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={onEdit}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={editAccessibilityLabel || `Edit ${food.name}`}
        >
          <Ionicons name="pencil-outline" size={18} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
      {onAdd ? (
        <TouchableOpacity
          style={[styles.addBtn, live.addBtn]}
          onPress={onAdd}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={addAccessibilityLabel || `Add ${food.name}`}
        >
          <Ionicons name="add" size={16} color={t.colors.primary} />
          <Text style={[styles.addBtnText, live.addBtnText]}>{addLabel}</Text>
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} style={styles.rowChevron} importantForAccessibility="no" accessibilityElementsHidden />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    minHeight: 64,
  },
  rowMain: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  rowName: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  rowNameMuted: { color: colors.textMuted, textDecorationLine: 'line-through' },
  rowMeta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xxs },
  rowMetaMuted: { color: colors.textMuted, opacity: 0.7 },
  addBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: 999,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtnText: { color: colors.primary, fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  rowChevron: { marginLeft: spacing.xs },
  editBtn: {
    minWidth: 32, minHeight: 32,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.xs,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. rowMain/rowChevron have no
// colour tokens.
function buildLiveStyles(t) {
  return {
    row: { borderBottomColor: t.colors.borderSubtle },
    rowName: { color: t.colors.textPrimary },
    rowNameMuted: { color: t.colors.textMuted },
    rowMeta: { color: t.colors.textMuted },
    rowMetaMuted: { color: t.colors.textMuted },
    addBtn: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.border },
    addBtnText: { color: t.colors.primary },
  };
}
