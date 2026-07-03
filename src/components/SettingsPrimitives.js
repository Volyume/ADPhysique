import { cloneElement, isValidElement } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import PressableCard from './PressableCard';

// Shared building blocks for the Settings landing page and its sub-pages.
// Pulled out of the old single-screen Settings so every sub-page renders
// rows and section cards the same way, with one source of truth for the
// row press feel and the accessibility wiring.

export function SettingRow({ icon, label, sub, value, onPress, destructive, rightElement, showArrow = true }) {
  // One press feel app-wide: tappable rows use the PressableCard spring.
  // Rows that are just a label + a Switch (rightElement, no onPress) render
  // as a static View so the row itself isn't "pressable", the Switch is.
  const Wrapper = onPress ? PressableCard : View;
  return (
    <Wrapper
      style={styles.settingRow}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={value ? `${label}: ${value}` : label}
    >
      <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
        <Ionicons name={icon} size={18} color={destructive ? colors.error : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>{label}</Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      <View style={styles.settingRight}>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        {/* A Switch passed as rightElement otherwise announces only its
            on/off state with no context; lend it the row's label. */}
        {isValidElement(rightElement) && rightElement.props.accessibilityLabel == null
          ? cloneElement(rightElement, { accessibilityLabel: label })
          : rightElement}
        {showArrow && onPress && !rightElement ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </Wrapper>
  );
}

export function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// Standard page chrome for a Settings sub-page. The stack header supplies
// the title and back button, so each page is just a scroll of rows.
export function SettingsPage({ children }) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export const settingsStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 0.5,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: { backgroundColor: colors.errorBg },
  settingLabel: { ...type.body, color: colors.textPrimary },
  settingSub: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xxs },
  settingLabelDestructive: { color: colors.error },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  dataPrivacyNote: {
    ...type.captionTight,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  a11yNote: {
    ...type.captionTight,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});

const styles = settingsStyles;
