/**
 * SearchBar
 *
 * The single search input: leading search glyph, text field, trailing
 * clear button. Replaces the hand-rolled search rows the audit found in 7
 * browse screens so they share one look, one clear affordance, and one
 * focus treatment.
 *
 * Controlled: pass `value` + `onChangeText`. `onClear` defaults to
 * onChangeText(''). Input font is >=16 so iOS doesn't zoom on focus.
 */

import { ActivityIndicator, View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, radius, iconSize, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

export default function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search',
  autoFocus = false,
  style,
  testID,
  accessibilityLabel,
  loading = false,
}) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const handleClear = () => (onClear ? onClear() : onChangeText?.(''));
  return (
    <View style={[styles.bar, live.bar, style]}>
      <Ionicons name="search-outline" size={iconSize.sm} color={t.colors.textMuted} />
      <TextInput
        style={[styles.input, live.input]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel || placeholder}
        testID={testID}
      />
      {loading ? (
        <ActivityIndicator size="small" color={t.colors.textMuted} />
      ) : value ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    ...type.body,
    flex: 1,
    // 16 keeps iOS from auto-zooming the field on focus.
    fontSize: Math.max(16, fontSize.md),
    color: colors.textPrimary,
    paddingVertical: 0,
  },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    bar: { backgroundColor: t.colors.inputBg, borderColor: t.colors.border },
    input: { ...t.type.body, fontSize: Math.max(16, t.fontSize.md), color: t.colors.textPrimary },
  };
}
