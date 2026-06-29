import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, PrimaryButton, Screen, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { tanakaHrMax } from '../metrics/strain';

export function SettingsScreen({ nav }: { nav: Nav }) {
  const profile = useStoreSelector(appStore, (s) => s.profile);
  const [age, setAge] = useState(String(profile.ageYears));
  const [sex, setSex] = useState<'male' | 'female'>(profile.sex);
  const [restingHr, setRestingHr] = useState(String(profile.restingHr));
  const [maxHr, setMaxHr] = useState(profile.maxHr ? String(profile.maxHr) : '');
  const [saved, setSaved] = useState(false);

  const save = () => {
    void appStore.updateProfile({
      ageYears: Number(age) || profile.ageYears,
      sex,
      restingHr: Number(restingHr) || profile.restingHr,
      maxHr: maxHr ? Number(maxHr) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const estMax = tanakaHrMax(Number(age) || profile.ageYears);

  return (
    <Screen title="Settings &amp; Profile" onBack={nav.back}>
      <SectionLabel>Profile</SectionLabel>
      <Card>
        <Field label="Age" value={age} onChange={setAge} keyboardType="number-pad" suffix="years" />
        <View style={styles.fieldRow}>
          <Text style={styles.fLabel}>Sex</Text>
          <View style={styles.toggle}>
            {(['male', 'female'] as const).map((s) => (
              <Text
                key={s}
                onPress={() => setSex(s)}
                style={[styles.toggleOpt, sex === s && styles.toggleOptActive]}
              >
                {s === 'male' ? 'Male' : 'Female'}
              </Text>
            ))}
          </View>
        </View>
        <Field label="Resting HR" value={restingHr} onChange={setRestingHr} keyboardType="number-pad" suffix="bpm" />
        <Field
          label="Max HR"
          value={maxHr}
          onChange={setMaxHr}
          keyboardType="number-pad"
          suffix="bpm"
          placeholder={`auto ${estMax}`}
        />
        <Text style={styles.note}>
          Max HR powers your heart-rate zones &amp; strain. Leave blank to use the Tanaka estimate
          (208 − 0.7 × age = {estMax} bpm). Sex sets the calorie floors and HRV/strain coefficients.
        </Text>
        <PrimaryButton title={saved ? 'Saved ✓' : 'Save profile'} onPress={save} />
      </Card>

      <SectionLabel>Privacy</SectionLabel>
      <Card>
        <Text style={styles.privacy}>
          All your data is stored locally on this device — no cloud, no account, no analytics. Nothing
          leaves the phone. This is a private companion app and not a medical device.
        </Text>
      </Card>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  suffix,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  keyboardType?: 'number-pad' | 'default';
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  fLabel: { color: colors.text, fontSize: 15, fontFamily: fonts.textSemibold },
  inputWrap: { flexDirection: 'row', alignItems: 'center' },
  input: { color: colors.text, fontSize: 16, fontFamily: fonts.bold, minWidth: 70, textAlign: 'right', paddingVertical: 4 },
  suffix: { color: colors.textTertiary, fontSize: 12, marginLeft: 6, fontFamily: fonts.text },
  toggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, overflow: 'hidden' },
  toggleOpt: { color: colors.textSecondary, fontSize: 13, paddingHorizontal: 16, paddingVertical: 7, fontFamily: fonts.textSemibold },
  toggleOptActive: { backgroundColor: colors.white, color: '#000' },
  note: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 12, fontFamily: fonts.text },
  privacy: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: fonts.text },
});
