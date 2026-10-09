/**
 * SwitchRow (D221 visual law V3, lane 2B): a line of settings with a switch,
 * in a band. The same anatomy as `EntryRow` (64 dp with a subtitle, 56 dp
 * without, a 32 dp `surface2` mark when an icon is given, a hairline below
 * spanning the band) with the platform `Switch` at the end in place of a
 * chevron. The row itself is not pressable: the switch is the control, a
 * 48 dp target, and carries the row's label so a screen reader announces
 * what it changes.
 *
 * Props:
 *   icon       optional Ionicons name for the leading mark
 *   title      the setting's name
 *   subtitle   optional second line, never truncated
 *   value      the switch's state
 *   onValueChange, disabled
 *   accessibilityLabel  overrides the title as the switch's label
 */
import { View, Switch, StyleSheet } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../../hooks/useTheme';
import { spacing, radius, iconSize, withAlpha, alpha } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';

const MARK = 32;
const ROW_ONE_LINE = 56;
const ROW_TWO_LINES = 64;

export default function SwitchRow({
  icon, title, subtitle, value, onValueChange, disabled = false, accessibilityLabel,
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.row,
        { minHeight: subtitle ? ROW_TWO_LINES : ROW_ONE_LINE, borderBottomColor: t.colors.borderSubtle },
      ]}
    >
      {icon ? (
        <View style={[styles.mark, { backgroundColor: t.colors.surface2 }]}>
          <Ionicons name={icon} size={iconSize.md} color={t.colors.textPrimary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[t.type.body, { color: t.colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.control}>
        <Switch
          value={!!value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={accessibilityLabel || title}
          trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
          thumbColor={t.colors.primary}
          ios_backgroundColor={t.colors.surface2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, minWidth: 0 },
  mark: { width: MARK, height: MARK, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  control: { minHeight: touchTarget.minimum, justifyContent: 'center' },
});
