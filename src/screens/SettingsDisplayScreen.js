import { useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as Updates from 'expo-updates';
import useAppStore from '../store/useAppStore';
import { colors, withAlpha, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

// COMP-029: appearance is a FREE display setting (never Pro-gated). Default
// Dark; Light is opt-in; Match phone follows the OS scheme.
const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Match phone' },
];

// Food-energy display unit. kcal is the default; kJ matches EU food labelling
// (which gives kilojoules first). Display-only — it never changes a stored
// value, a nutrition target, or anything the coaching engine computes, so it
// takes effect immediately with no reload.
const ENERGY_OPTIONS = [
  { value: 'kcal', label: 'kcal' },
  { value: 'kj', label: 'kJ' },
];

// Larger Text / Higher Contrast / Colour-Blind Safe mutate theme tokens
// that StyleSheet.create has already baked at module-evaluation time, so
// they only take effect after the app is re-launched and bootstrapAccessibility
// in App.js re-applies them before screens load. Prompt the user to reload now
// rather than leaving them confused that the toggle "did nothing".
async function promptRestartForA11y(label) {
  appAlert(
    `${label} saved`,
    `Volyume needs to reopen to apply this. Your data and current screen are safe.`,
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Reload now',
        onPress: async () => {
          try { await Updates.reloadAsync(); }
          catch (_) {
            // Dev clients / Expo Go without OTA support, fall back to a
            // soft message. The toggle is saved; next manual restart picks
            // it up.
            appAlert('Reload failed', 'Close and reopen Volyume to apply the change.');
          }
        },
      },
    ],
  );
}

// Display & accessibility: font scale, contrast, colour-blind palette,
// reduced motion. All but reduce-motion need a reload to take effect.
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

  return (
    <SettingsPage>
      <View style={styles.section}>
        <Text style={local.title}>Appearance</Text>
        <Text style={local.sub}>
          Dark is the Volyume default. Light is easier to read in daylight. Match phone follows your system setting.
        </Text>
        <View style={local.segment} accessibilityRole="radiogroup">
          {THEME_OPTIONS.map((opt) => {
            const active = currentTheme === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[local.segBtn, active && local.segBtnActive]}
                onPress={async () => {
                  if (active) return;
                  // Await the write before prompting reload (a fast tap can tear
                  // down the VM before the pref persists).
                  await setAccessibilityPref('theme', opt.value);
                  promptRestartForA11y('Appearance');
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={opt.label}
              >
                <Text style={[local.segText, active && local.segTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={local.title}>Energy units</Text>
        <Text style={local.sub}>
          How food energy is shown. kJ (kilojoules) matches the energy on EU food labels. This changes the
          display only. Your targets and coaching stay the same.
        </Text>
        <View style={local.segment} accessibilityRole="radiogroup">
          {ENERGY_OPTIONS.map((opt) => {
            const active = currentEnergy === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[local.segBtn, active && local.segBtnActive]}
                onPress={() => { if (!active) setAccessibilityPref('energyUnit', opt.value); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={opt.value === 'kj' ? 'Kilojoules' : 'Kilocalories'}
              >
                <Text style={[local.segText, active && local.segTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={local.title}>Home</Text>
        <SettingRow
          icon="restaurant-outline"
          label="Show nutrition on Home"
          sub="A remaining-calories glance and a quick way into your diary, on the Train tab."
          showArrow={false}
          rightElement={
            <Switch
              value={accessibility.showHomeNutrition !== false}
              onValueChange={(v) => setAccessibilityPref('showHomeNutrition', v)}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={(accessibility.showHomeNutrition !== false) ? colors.primary : colors.textMuted}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <SettingRow
          icon="text-outline"
          label="Larger text"
          sub="Increases font size across the app. For more granular control, use your phone's system text size. Volyume respects it too."
          showArrow={false}
          rightElement={
            <Switch
              value={!!accessibility.largerText}
              onValueChange={async v => {
                // Await the AsyncStorage write before prompting reload, otherwise
                // a fast "Reload now" tap can tear down the JS VM before the pref
                // persists, and the user sees no change on restart.
                await setAccessibilityPref('largerText', v);
                promptRestartForA11y('Larger text');
              }}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={accessibility.largerText ? colors.primary : colors.textMuted}
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
                await setAccessibilityPref('higherContrast', v);
                promptRestartForA11y('Higher contrast');
              }}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={accessibility.higherContrast ? colors.primary : colors.textMuted}
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
                await setAccessibilityPref('colorBlindSafe', v);
                promptRestartForA11y('Colour-blind safe palette');
              }}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={accessibility.colorBlindSafe ? colors.primary : colors.textMuted}
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
              value={!!accessibility.reduceMotion}
              onValueChange={v => setAccessibilityPref('reduceMotion', v)}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={accessibility.reduceMotion ? colors.primary : colors.textMuted}
            />
          }
        />
        <Text style={styles.a11yNote}>
          Reduce motion takes effect immediately. Appearance, larger text, higher contrast, and the colour-blind safe palette need Volyume to reopen. You'll be prompted to reload after changing them.
        </Text>
      </View>
    </SettingsPage>
  );
}

const local = StyleSheet.create({
  title: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  sub: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 18, marginBottom: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  segBtnActive: { backgroundColor: colors.primaryFill },
  segText: { ...type.label, color: colors.textSecondary },
  segTextActive: { color: colors.onPrimary, fontWeight: fontWeight.semibold },
});
