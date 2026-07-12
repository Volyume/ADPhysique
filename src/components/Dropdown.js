import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import InfoTooltip from './InfoTooltip';

// Inline dropdown, expands in place, no modal needed. Shared by the Pro
// onboarding wizard and the change-goal screen so both training-setup flows
// pick experience, equipment, focus and recovery the same way.
//
// options: [{ value, label, sub? }]. onChange receives the chosen value.
// tip: optional plain-English gloss (U-E-1) rendered as an InfoTooltip beside the
// label; omitted by default so existing usages are unchanged.
export default function Dropdown({ label, hint, value, options, onChange, placeholder = 'Choose…', tip }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={styles.dropdownWrap}>
      {label ? (
        tip ? (
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, live.fieldLabel]}>{label}</Text>
            <InfoTooltip text={tip} size={13} />
          </View>
        ) : (
          <Text style={[styles.fieldLabel, live.fieldLabel]}>{label}</Text>
        )
      ) : null}
      {hint ? <Text style={[styles.fieldHint, live.fieldHint]}>{hint}</Text> : null}
      <TouchableOpacity
        style={[
          styles.dropdownTrigger, live.dropdownTrigger,
          value && [styles.dropdownTriggerFilled, live.dropdownTriggerFilled],
          open && [styles.dropdownTriggerOpen, live.dropdownTriggerOpen],
        ]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.dropdownValue, live.dropdownValue, !value && [styles.dropdownPlaceholder, live.dropdownPlaceholder]]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={value ? t.colors.primary : t.colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.dropdownList, live.dropdownList]}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                value === opt.value && [styles.dropdownItemActive, live.dropdownItemActive],
                i < options.length - 1 && [styles.dropdownItemBorder, live.dropdownItemBorder],
              ]}
              onPress={() => { onChange(opt.value); setOpen(false); }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: value === opt.value }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropdownItemLabel, live.dropdownItemLabel, value === opt.value && [styles.dropdownItemLabelActive, live.dropdownItemLabelActive]]}>
                  {opt.label}
                </Text>
                {opt.sub ? <Text style={[styles.dropdownItemSub, live.dropdownItemSub]}>{opt.sub}</Text> : null}
              </View>
              {value === opt.value && <Ionicons name="checkmark" size={16} color={t.colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownWrap: { marginBottom: spacing.xl },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  fieldLabel: {
    ...type.captionStrong,
    color: colors.textMuted, marginBottom: spacing.sm,
  },
  fieldHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
  },
  dropdownTriggerFilled: { borderColor: withAlpha(colors.primary, alpha.strong) },
  dropdownTriggerOpen: { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropdownValue: { fontSize: fontSize.md, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  dropdownPlaceholder: { color: colors.textDisabled },
  dropdownList: {
    backgroundColor: colors.surface, borderWidth: 1.5,
    borderColor: colors.primary, borderTopWidth: 0,
    borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemActive: { backgroundColor: colors.primaryBg },
  dropdownItemLabel: { ...type.body, color: colors.textSecondary, marginBottom: spacing.hair },
  dropdownItemLabelActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  dropdownItemSub: { ...type.captionTight, color: colors.textMuted },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    fieldLabel: { ...t.type.captionStrong, color: t.colors.textMuted },
    fieldHint: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    dropdownTrigger: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    dropdownTriggerFilled: { borderColor: withAlpha(t.colors.primary, alpha.strong) },
    dropdownTriggerOpen: { borderColor: t.colors.primary },
    dropdownValue: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    dropdownPlaceholder: { color: t.colors.textDisabled },
    dropdownList: { backgroundColor: t.colors.surface, borderColor: t.colors.primary },
    dropdownItemBorder: { borderBottomColor: t.colors.border },
    dropdownItemActive: { backgroundColor: t.colors.primaryBg },
    dropdownItemLabel: { ...t.type.body, color: t.colors.textSecondary },
    dropdownItemLabelActive: { color: t.colors.textPrimary },
    dropdownItemSub: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
