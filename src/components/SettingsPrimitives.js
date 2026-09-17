import { cloneElement, isValidElement } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import PressableCard from './PressableCard';
import BackHeader from './BackHeader';
import SectionLabel from './SectionLabel';
import { touchTarget } from '../styles/layout';

// Shared building blocks for the Settings landing page and its sub-pages.
// Pulled out of the old single-screen Settings so every sub-page renders
// rows and section cards the same way, with one source of truth for the
// row press feel and the accessibility wiring.

export function SettingRow({ icon, label, sub, value, onPress, destructive, rightElement, showArrow = true, accessibilityLabel }) {
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
      style={[styles.settingRow, { borderBottomColor: t.colors.borderSubtle }]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      // CC33 R2-13: a pressable row is an accessibility container, so its
      // child Text (the sub) is never spoken - callers whose meaning
      // lives in the sub pass a composed label through this additive
      // override; every existing call site is byte-identical without it.
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}: ${value}` : label)}
    >
      {/* D174 (amber census, 2026-09-15): the glyph used to sit on a 34dp
          amber-tinted disc -- `primaryBg` behind a stock Ionicon on 104 rows
          across 17 screens. Plan section 3.2 forbids the accent becoming "a
          tint behind a glyph" and D174's REMOVE-decoration definition names
          "an icon in a settings list" word for word, so the fill and the disc
          geometry both go and the glyph takes the secondary ink. The
          `destructive` branch keeps `error`: that is the state-colour grammar
          section 8 protects, and it is the one thing on a settings row that a
          colour genuinely has to say. */}
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color={destructive ? t.colors.error : t.colors.textSecondary} />
      </View>
      {/* Campaign 27 Pillar A (D104): minWidth: 0 added so the label column
          uses the codebase's safe flex:1 + minWidth:0 wrapping idiom. */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            styles.settingLabel,
            { ...t.type.body, color: t.colors.textPrimary },
            destructive && { color: t.colors.error },
          ]}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.settingSub, { ...t.type.captionTight, color: t.colors.textMuted }]}>{sub}</Text>
        ) : null}
      </View>
      <View style={styles.settingRight}>
        {value ? (
          <Text style={[styles.settingValue, { fontSize: t.fontSize.sm, color: t.colors.textSecondary }]}>
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
// `scrollRef` (additive, 2026-09-03, D133): Injuries & limitations scrolls to the
// card the add wizard just made, so a flow ends on the thing it created.
export function SettingsPage({ title, children, scrollRef }) {
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
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>{children}</ScrollView>
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
    section: { borderTopColor: t.colors.borderSubtle },
    settingRow: { borderBottomColor: t.colors.borderSubtle },
    // D174: the row glyph carries no tint at all now, so this override has
    // nothing theme-dependent left to carry. Kept as an explicit empty object
    // rather than deleted because ~8 call sites outside this file append it as
    // `[settingsStyles.settingIcon, live.settingIcon]`; a missing key there
    // would read as the one-sided frozen/live defect this campaign has spent
    // itself closing, rather than as a deliberate absence.
    settingIcon: {},
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
  // D165 law 2, the founder's test, applied to the shape ~14 Settings screens
  // are made of: "a card should mean: this thing is an object", and a LIST OF
  // SETTINGS is not an object. The fill, the card radius and the outline go;
  // what is left is the rows themselves on the page's own ground, divided by
  // the borderSubtle hairline they already carried, with one more hairline
  // above the group to separate it from its heading. That is the treatment
  // Community landed under CR-17/D163 and Today, the diary and the empty
  // states have carried since D171/D172.
  //
  // The note this replaces is kept in substance because it still decides the
  // hairline COLOUR: `border` (#6E6E6E) is the WCAG 1.4.11 edge for a control
  // that needs an identifiable boundary, and a settings row is identified by
  // its own label, icon and chevron; `borderSubtle` is the token documented
  // for a hairline divider, and drawing these in `border` is what produced the
  // wireframe look.
  section: {
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    // The group's box came off with law 2, so the row stops paying a second
    // gutter inside it and sits at the page's own 16 dp edge. One gutter,
    // paid once by the page (CR-17/D163).
    paddingVertical: spacing.lg,
    // Explicit platform floor. Padding plus a 34dp icon chip already put
    // this near 66dp, so this is a no-op at rest -- but it makes the touch
    // target a GUARANTEE of the primitive rather than a side effect of its
    // content, which is what lets a surface delegate its rows here and
    // inherit the capability lane's 48dp rule (capabilityTouchTargets.guard).
    minHeight: touchTarget.minimum,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  // D174: was a 34dp `primaryBg` disc. It is now a fixed 24dp column with no
  // fill, so the glyph keeps every row's label on the same left edge (the
  // ledger alignment) without an amber ground behind it. `settingIconDestructive`
  // went with the fill: it was an `errorBg` wash for the same disc, it had no
  // consumer outside this file, and SettingRow's destructive branch says what
  // it needs to say in the glyph ink.
  settingIcon: {
    width: iconSize.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
