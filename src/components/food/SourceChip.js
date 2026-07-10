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
 *
 * Wave-1 A6 (UK provenance): CoFID rows are UK government reference data,
 * so the cofid chip carries a quiet verified treatment (success-tinted
 * border + small checkmark, existing tokens only) and is paired with an
 * InfoTooltip that explains the acronym, matching how InfoTooltip sits
 * beside labels elsewhere (e.g. NutritionTargetsScreen).
 */
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import InfoTooltip from '../InfoTooltip';
import { colors, fontSize, spacing, radius, withAlpha, alpha } from '../../styles/theme';

const LABELS = {
  off:      'OFF',
  usda:     'USDA',
  cofid:    'CoFID',
  user_ocr: 'OCR',
  custom:   'Custom',
};

export const COFID_TOOLTIP =
  "CoFID is the UK government's food composition dataset. Values for generic foods come from it directly.";

export default function SourceChip({ source }) {
  const label = LABELS[source] ?? String(source ?? '').toUpperCase().slice(0, 6);
  const isCofid = source === 'cofid';
  const chip = (
    <View
      style={[styles.chip, isCofid && styles.chipVerified]}
      accessibilityLabel={isCofid ? 'Source: CoFID, UK government food data' : `Source: ${label}`}
    >
      {isCofid ? (
        <Ionicons name="checkmark-circle" size={fontSize.xs} color={colors.success} style={styles.tick} />
      ) : null}
      <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
    </View>
  );
  if (!isCofid) return chip;
  return (
    <View style={styles.verifiedRow}>
      {chip}
      <InfoTooltip size={12} text={COFID_TOOLTIP} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  chipVerified: {
    borderColor: withAlpha(colors.success, alpha.mid),
  },
  tick: { marginRight: spacing.xxs },
  text: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
});
