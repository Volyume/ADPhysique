import { View, StyleSheet } from 'react-native';
import Text from '../components/Text';
import { useShallow } from 'zustand/react/shallow';
import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { SettingsPage, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
import Chip from '../components/Chip';
import * as haptics from '../lib/haptics';

// Stage 2 item 11 (owner answers): one Units screen. Body weight unit moved
// here from Workout and Energy units moved here from Display, with their
// stores, keys and behaviour unchanged. There is no height unit setting
// (Profile always takes feet and inches, SettingsProfileScreen.js:82-130;
// the metric/imperial switch in onboarding is form-local state only), so no
// height row. Gym weights stay in kg by design.
const BODY_WEIGHT_UNIT_OPTIONS = [
  { value: 'st', label: 'Stone' },
  { value: 'kg', label: 'Kg' },
  { value: 'lbs', label: 'Lbs' },
];
const ENERGY_OPTIONS = [
  { value: 'kcal', label: 'kcal' },
  { value: 'kj', label: 'kJ' },
];

export default function SettingsUnitsScreen() {
  const { bodyWeightUnits, setBodyWeightUnits, accessibility, setAccessibilityPref, loadAccessibility, accessibilityLoaded } = useAppStore(
    useShallow(s => ({
      bodyWeightUnits: s.bodyWeightUnits,
      setBodyWeightUnits: s.setBodyWeightUnits,
      accessibility: s.accessibility,
      setAccessibilityPref: s.setAccessibilityPref,
      loadAccessibility: s.loadAccessibility,
      accessibilityLoaded: s.accessibilityLoaded,
    })),
  );
  useEffect(() => {
    if (!accessibilityLoaded) loadAccessibility();
  }, [accessibilityLoaded, loadAccessibility]);

  const currentEnergy = accessibility.energyUnit ?? 'kcal';
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    title: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sub: { ...t.type.bodySm, color: t.colors.textMuted },
    segment: { backgroundColor: t.colors.surface2 },
  };

  return (
    <SettingsPage title="Units">
      <View style={[styles.section, live.section]}>
        <Text style={[local.title, liveText.title]}>Body weight</Text>
        <Text style={[local.sub, liveText.sub]}>
          How your own body weight is shown. Gym weights stay in kg.
        </Text>
        <View style={[local.segment, liveText.segment]} accessibilityRole="radiogroup">
          {BODY_WEIGHT_UNIT_OPTIONS.map((opt) => {
            const active = (bodyWeightUnits ?? 'st') === opt.value;
            return (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={active}
                onPress={() => { if (!active) { haptics.selection(); setBodyWeightUnits(opt.value); } }}
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
        <Text style={[local.title, liveText.title]}>Energy</Text>
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
    </SettingsPage>
  );
}

const local = StyleSheet.create({
  title: { ...type.bodyStrong, marginBottom: spacing.xs },
  sub: { marginBottom: spacing.md },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.xxs, gap: spacing.xxs },
  segChip: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', borderRadius: radius.sm },
  segLabel: { textAlign: 'center' },
});
