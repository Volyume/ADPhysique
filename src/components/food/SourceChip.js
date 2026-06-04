/**
 * SourceChip: small badge showing OFF / USDA / CoFID / Custom.
 *
 * Spec: UI_FLOWS_LOCKED.md lines 18-28 (component list),
 *   line 99 ("Source chip on every result"),
 *   line 142 ("Source chip below" in food detail sheet).
 *
 * Source values match the foods.source CHECK constraint in
 * DATABASE_SCHEMA_LOCKED.md ('off', 'usda', 'cofid', 'user_ocr')
 * plus 'custom' for user-created entries from custom_foods.
 */
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, radius } from '../../styles/theme';

const LABELS = {
  off:      'OFF',
  usda:     'USDA',
  cofid:    'CoFID',
  user_ocr: 'OCR',
  custom:   'Custom',
};

export default function SourceChip({ source }) {
  const label = LABELS[source] ?? String(source ?? '').toUpperCase().slice(0, 6);
  return (
    <View style={styles.chip} accessibilityLabel={`Source: ${label}`}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 6,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
});
