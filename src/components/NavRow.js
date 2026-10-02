/**
 * NavRow and NavGroup: the grouped list of tappable rows the Coach tab (YouScreen)
 * has always used, extracted so the Volume heatmap's "Volume targets" door
 * (D214 lane 5) and the Progress doors (lane 3) read the same component.
 *
 * Moved verbatim from YouScreen.js: same look, same selection haptic, same
 * accessibility label (the row's label). The frozen `styles` block carries
 * layout and tokens at rest; `buildLiveStyles` mirrors only its colour- and
 * type-bearing keys so the row follows a theme change with no restart (the
 * tree's frozen-plus-live pattern).
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';
import PressableCard from './PressableCard';

// CP-10 batch G (2026-07-11): sibling function-component scope (not
// prop-drilled `live`/`t` from YouScreen, matching NutritionTargetsScreen's
// MacroCard/WhySection precedent from batch E), own useTheme() call and the
// shared buildLiveStyles(t) (same `styles` block this component reads).
// FOUNDER DECISION (fully free, no tier split): the `pro` flag (ProBadge +
// "Part of Pro" accessibility suffix) is retired -- no row on this screen
// gates on tier any more.
export function NavRow({ icon, label, sub, onPress }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // R9 (D70): the house selection() beat on every nav-row tap, added once
  // here so all consumers gain it together (haptics vocabulary rule;
  // navigation taps are never the ED diary-marking exception).
  const handlePress = onPress
    ? () => { haptics.selection(); onPress(); }
    : onPress;
  return (
    <PressableCard
      style={[styles.navRow, live.navRow]}
      onPress={handlePress}
      accessibilityLabel={label}
    >
      <View style={[styles.navRowIcon, live.navRowIcon]}>
        <Ionicons name={icon} size={18} color={t.colors.primary} />
      </View>
      <View style={styles.navRowText}>
        <View style={styles.navRowLabelRow}>
          <Text style={[styles.navRowLabel, live.navRowLabel]}>{label}</Text>
        </View>
        {sub ? <Text style={[styles.navRowSub, live.navRowSub]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </PressableCard>
  );
}

/**
 * NavGroup
 *
 * One grouped list for a run of NavRows. Each row used to be its own Card,
 * so a section of four links rendered as four separate surfaces with four
 * borders and four sets of padding -- ten near-identical boxes down the
 * screen, with the athlete's own profile card carrying exactly the same
 * weight as a link to a settings page. Nothing ranked.
 *
 * The rows now share one container and are separated by the hairline the
 * rest of the app uses, which is the same shape Settings has always had
 * (SettingsPrimitives' `section` + SettingRow), so the two nav surfaces
 * finally read as one system. The hero cards above keep the Card treatment
 * and are once again the only card-weight objects on the screen.
 */
export function NavGroup({ children }) {
  const t = useTheme();
  return (
    <View style={[styles.navGroup, { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  navGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  navRowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowText: { flex: 1 },
  navRowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navRowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  navRowSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
});

// The frozen `styles` block above stays byte-identical to the one YouScreen
// carried. This mirrors ONLY the colour/type-bearing sub-properties at
// identical rest values, so the rows carry no static island under a live
// theme toggle.
function buildLiveStyles(t) {
  return {
    navRow: { borderBottomColor: t.colors.borderSubtle },
    navRowIcon: { backgroundColor: t.colors.primaryBg },
    navRowLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    navRowSub: { ...t.type.caption, color: t.colors.textSecondary },
  };
}
