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
import { colors, fontSize, spacing, radius, iconSize } from '../styles/theme';

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
  const handleClear = () => (onClear ? onClear() : onChangeText?.(''));
  return (
    <View style={[styles.bar, style]}>
      <Ionicons name="search-outline" size={iconSize.sm} color={colors.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel || placeholder}
        testID={testID}
      />
      {loading ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : value ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={iconSize.sm} color={colors.textMuted} />
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
    flex: 1,
    // 16 keeps iOS from auto-zooming the field on focus.
    fontSize: Math.max(16, fontSize.md),
    color: colors.textPrimary,
    paddingVertical: 0,
  },
});
