import { useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, Switch } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as Updates from 'expo-updates';
import useAppStore from '../store/useAppStore';
import { colors, withAlpha } from '../styles/theme';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

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

  return (
    <SettingsPage>
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
          Reduce motion takes effect immediately. Larger text, higher contrast, and the colour-blind safe palette need Volyume to reopen. You'll be prompted to reload after toggling.
        </Text>
      </View>
    </SettingsPage>
  );
}
