import { useEffect } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, withAlpha, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { SettingsPage, SettingRow, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
import Chip from '../components/Chip';
import * as haptics from '../lib/haptics';

// COMP-029: appearance is a FREE display setting (never Pro-gated). Default
// Dark; Light is opt-in; Match phone follows the OS scheme.
const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Match phone' },
];

// Food-energy display unit. kcal is the default; kJ matches EU food labelling
// (which gives kilojoules first). Display-only, it never changes a stored
// value, a nutrition target, or anything the coaching engine computes, so it
// takes effect immediately with no reload.
const ENERGY_OPTIONS = [
  { value: 'kcal', label: 'kcal' },
  { value: 'kj', label: 'kJ' },
];

// CP-10 stage 5 (docs/ux-world-class-audit-2026-07-09/
// CP-10-restart-free-theming-plan.md): live theming is now complete across
// every screen (Stage 3) and Skia/chart consumer (Stage 4), so Appearance,
// larger text, higher contrast and the colour-blind safe palette all apply
// immediately, the same as reduce motion always has. There is no reload
// prompt any more.

// Display & accessibility: font scale, contrast, colour-blind palette,
// reduced motion. All changes apply immediately.
export default function SettingsDisplayScreen() {
  const { accessibility, setAccessibilityPref, loadAccessibility, accessibilityLoaded } = useAppStore(
    useShallow(s => ({
      accessibility: s.accessibility,
      setAccessibilityPref: s.setAccessibilityPref,
      loadAccessibility: s.loadAccessibility,
      accessibilityLoaded: s.accessibilityLoaded,
    })),
  );

  // Hydrate accessibility prefs once on mount so the toggles reflect the
  // user's saved state (otherwise they all read as 'off' until the user
  // touches one).
  useEffect(() => {
    if (!accessibilityLoaded) loadAccessibility();
  }, [accessibilityLoaded, loadAccessibility]);

  const currentTheme = accessibility.theme ?? 'dark';
  const currentEnergy = accessibility.energyUnit ?? 'kcal';
  // CP-10 stage 3: live theme (src/hooks/useTheme.js). This screen is where
  // the Appearance/larger-text/contrast/colour-blind toggles themselves
  // live, so its own chrome and section labels flip live the instant a
  // toggle is switched, same as every other migrated Settings screen and,
  // as of Stage 5, the same as every other screen in the app.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    title: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sub: { ...t.type.bodySm, color: t.colors.textMuted },
    segment: { backgroundColor: t.colors.surface2 },
  };

  return (
    <SettingsPage title="Display & accessibility">
      <View style={[styles.section, live.section]}>
        <Text style={[local.title, liveText.title]}>Appearance</Text>
        <Text style={[local.sub, liveText.sub]}>
          Dark is the Volyume default. Light is easier to read in daylight. Match phone follows your system setting.
        </Text>
        <View style={[local.segment, liveText.segment]} accessibilityRole="radiogroup">
          {THEME_OPTIONS.map((opt) => {
            const active = currentTheme === opt.value;
            return (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={active}
                onPress={async () => {
                  if (active) return;
                  haptics.selection();
                  await setAccessibilityPref('theme', opt.value);
                }}
                accessibilityRole="radio"
                accessibilityLabel={opt.label}
                style={local.segChip}
                labelStyle={local.segLabel}
              />
            );
          })}
        </View>
      </View>

      <View style={[styles.section, live.section]}>
        <Text style={[local.title, liveText.title]}>Energy units</Text>
        <Text style={[local.sub, liveText.sub]}>
          How food energy is shown. kJ (kilojoules) matches the energy on EU food labels. This changes the
          display only. Your targets and coaching stay the same.
        </Text>
        <View style={[local.segment, liveText.segment]} accessibilityRole="radiogroup">
          {ENERGY_OPTIONS.map((opt) => {
            const active = currentEnergy === opt.value;
            return (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={active}
                onPress={() => { if (!active) { haptics.selection(); setAccessibilityPref('energyUnit', opt.value); } }}
                accessibilityRole="radio"
                accessibilityLabel={opt.value === 'kj' ? 'Kilojoules' : 'Kilocalories'}
                style={local.segChip}
                labelStyle={local.segLabel}
              />
            );
          })}
        </View>
      </View>

      <View style={[styles.section, live.section]}>
        <Text style={[local.title, liveText.title]}>Home</Text>
        <SettingRow
          icon="restaurant-outline"
          label="Show nutrition on Home"
          sub="A remaining-calories glance and a quick way into your diary, on the Today tab."
          showArrow={false}
          rightElement={
            <Switch
              value={accessibility.showHomeNutrition !== false}
              onValueChange={(v) => { haptics.selection(); setAccessibilityPref('showHomeNutrition', v); }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={(accessibility.showHomeNutrition !== false) ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
      </View>

      <View style={[styles.section, live.section]}>
        <Text style={[local.title, liveText.title]}>Nutrients shown</Text>
        <Text style={[local.sub, liveText.sub]}>
          Which extra nutrients appear under a food's calories and macros, when the food carries them. Shown for that food only. This never changes your targets or daily totals.
        </Text>
        <SettingRow
          icon="leaf-outline"
          label="Fibre"
          sub="Show grams of fibre on a food's detail."
          showArrow={false}
          rightElement={
            <Switch
              value={accessibility.showFibre !== false}
              onValueChange={(v) => { haptics.selection(); setAccessibilityPref('showFibre', v); }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={(accessibility.showFibre !== false) ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="cube-outline"
          label="Sugars"
          sub="Show grams of sugars on a food's detail."
          showArrow={false}
          rightElement={
            <Switch
              value={accessibility.showSugar !== false}
              onValueChange={(v) => { haptics.selection(); setAccessibilityPref('showSugar', v); }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={(accessibility.showSugar !== false) ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="water-outline"
          label="Sodium"
          sub="Show milligrams of sodium on a food's detail."
          showArrow={false}
          rightElement={
            <Switch
              value={accessibility.showSodium !== false}
              onValueChange={(v) => { haptics.selection(); setAccessibilityPref('showSodium', v); }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={(accessibility.showSodium !== false) ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
      </View>

      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="text-outline"
          label="Larger text"
          sub="Increases font size across the app. For more granular control, use your phone's system text size. Volyume respects it too."
          showArrow={false}
          rightElement={
            <Switch
              value={!!accessibility.largerText}
              onValueChange={async v => {
                haptics.selection();
                await setAccessibilityPref('largerText', v);
              }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={accessibility.largerText ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="contrast-outline"
          label="Higher contrast"
          sub="Brightens secondary text and strengthens dividers. Easier to read in bright light or with low vision."
          showArrow={false}
          rightElement={
            <Switch
              value={!!accessibility.higherContrast}
              onValueChange={async v => {
                haptics.selection();
                await setAccessibilityPref('higherContrast', v);
              }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={accessibility.higherContrast ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="eye-outline"
          label="Colour-blind safe palette"
          sub="Replaces success-green and error-red with sky blue and reddish purple. Distinguishable in red-green colour blindness."
          showArrow={false}
          rightElement={
            <Switch
              value={!!accessibility.colorBlindSafe}
              onValueChange={async v => {
                haptics.selection();
                await setAccessibilityPref('colorBlindSafe', v);
              }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={accessibility.colorBlindSafe ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="pause-circle-outline"
          label="Reduce motion"
          sub="Turns off PR celebration particles, rest timer animations, and other large transitions. Useful if on-screen motion makes you feel unwell."
          showArrow={false}
          rightElement={
            <Switch
              value={!!accessibility.reduceMotionUserPref}
              onValueChange={v => { haptics.selection(); setAccessibilityPref('reduceMotionUserPref', v); }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={accessibility.reduceMotionUserPref ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <Text style={[styles.a11yNote, live.a11yNote]}>
          All these settings apply straight away. There is no need to restart or reopen Volyume.
        </Text>
      </View>
    </SettingsPage>
  );
}

const local = StyleSheet.create({
  title: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  sub: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segChip: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segLabel: { textAlign: 'center' },
});
