import { cloneElement, isValidElement } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, radius, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import PressableCard from './PressableCard';
import BackHeader from './BackHeader';
import SectionLabel from './SectionLabel';

// Shared building blocks for the Settings landing page and its sub-pages.
// Pulled out of the old single-screen Settings so every sub-page renders
// rows and section cards the same way, with one source of truth for the
// row press feel and the accessibility wiring.

export function SettingRow({ icon, label, sub, value, onPress, destructive, rightElement, showArrow = true }) {
  // CP-10 stage 1: live theme (src/hooks/useTheme.js) instead of the static
  // colors/type imports, so a settings row re-renders correctly on a theme
  // change.
  const t = useTheme();
  // One press feel app-wide: tappable rows use the PressableCard spring.
  // Rows that are just a label + a Switch (rightElement, no onPress) render
  // as a static View so the row itself isn't "pressable", the Switch is.
  const Wrapper = onPress ? PressableCard : View;
  return (
    <Wrapper
      style={[styles.settingRow, { borderBottomColor: t.colors.border }]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={value ? `${label}: ${value}` : label}
    >
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: t.colors.primaryBg },
          destructive && { backgroundColor: t.colors.errorBg },
        ]}
      >
        <Ionicons name={icon} size={18} color={destructive ? t.colors.error : t.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1.3}
          style={[
            styles.settingLabel,
            { ...t.type.body, color: t.colors.textPrimary },
            destructive && { color: t.colors.error },
          ]}
        >
          {label}
        </Text>
        {sub ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.settingSub, { ...t.type.captionTight, color: t.colors.textMuted }]}>{sub}</Text>
        ) : null}
      </View>
      <View style={styles.settingRight}>
        {value ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.settingValue, { fontSize: t.fontSize.sm, color: t.colors.textSecondary }]}>
            {value}
          </Text>
        ) : null}
        {/* A Switch passed as rightElement otherwise announces only its
            on/off state with no context; lend it the row's label. */}
        {isValidElement(rightElement) && rightElement.props.accessibilityLabel == null
          ? cloneElement(rightElement, { accessibilityLabel: label })
          : rightElement}
        {showArrow && onPress && !rightElement ? (
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        ) : null}
      </View>
    </Wrapper>
  );
}

export function SectionHeader({ title }) {
  return <SectionLabel tone="muted" style={styles.sectionHeader}>{title}</SectionLabel>;
}

// Standard page chrome for a Settings sub-page. Pass `title` to render the
// canonical BackHeader (chevron + centred title) in place of the old stack
// header; the SafeAreaView then owns the top inset too, since no native bar
// is left to claim it. Screens not yet converted omit `title` and keep
// relying on the stack header, so this stays a no-op for them.
export function SettingsPage({ title, children }) {
  // CP-10 stage 3: live theme (src/hooks/useTheme.js) for the page
  // background, so every SettingsPage-hosted sub-screen's backdrop follows a
  // theme change instead of staying on the frozen boot-time colour while its
  // own (now-migrated) content flips live.
  const live = useSettingsStyles();
  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={title ? ['top', 'bottom'] : ['bottom']}>
      {title ? <BackHeader title={title} /> : null}
      {/* L03-C5 (2026-07-09 design audit): SettingsProfileScreen's first-name
          TextField has no keyboard avoidance; standardise on the app's
          KeyboardAvoidingView pattern here in the shared page chrome (same
          behavior prop as PlansScreen / ManualBuilderScreen) so it covers
          every SettingsPage sub-page consistently. A no-op for sub-pages
          with no text input. */}
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// CP-10 stage 3 (docs/ux-world-class-audit-2026-07-09/
// CP-10-restart-free-theming-plan.md, Settings-family batch): the unfreeze
// for `settingsStyles`. Stage 1 left this object on the legacy static
// `colors`/`fontSize`/`type` imports deliberately (see the removed note this
// replaces) because SettingRow's own render already overrode every colour
// key it reads with a live value positioned LATER in its style array — the
// same "frozen base + live override appended after it in the array" shape
// Card.js/Button.js/Chip.js use. `useSettingsStyles()` below is that same
// live-override object, generalised so every one of the ~14 Settings
// sub-screens that reads `settingsStyles.section`/`.settingIcon`/
// `.settingLabel`/etc. DIRECTLY (bypassing SettingRow) can append it the
// same way: `style={[settingsStyles.section, live.section]}`. The static
// `settingsStyles` StyleSheet.create below is intentionally left byte-for-
// byte unchanged — at rest (no theme change since boot) the live override
// resolves to the exact same values, so this is a zero-visual-diff addition;
// only a live theme change now reaches these screens' shared chrome.
export function useSettingsStyles() {
  const t = useTheme();
  return {
    safe: { backgroundColor: t.colors.background },
    section: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    settingRow: { borderBottomColor: t.colors.border },
    settingIcon: { backgroundColor: t.colors.primaryBg },
    settingLabel: { ...t.type.body, color: t.colors.textPrimary },
    settingSub: { ...t.type.captionTight, color: t.colors.textMuted },
    dataPrivacyNote: { ...t.type.captionTight, color: t.colors.textMuted },
    a11yNote: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}

export const settingsStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  sectionHeader: {
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
