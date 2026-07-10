import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { SettingsPage, settingsStyles, useSettingsStyles } from '../components/SettingsPrimitives';
import TextField from '../components/TextField';
import Chip from '../components/Chip';
import HeightFeetInchesField from '../components/HeightFeetInchesField';
import AgeYearsField from '../components/AgeYearsField';
import { appAlert } from '../components/AppAlert';
import { getUserBodyProfile, saveUserBodyProfile } from '../lib/database';
import { ageYearsFromDateOfBirth, dateOfBirthFromAgeYears } from '../lib/profileAge';
import { logError } from '../lib/errorLog';
import * as haptics from '../lib/haptics';

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

// Profile: the handful of things the user types or picks about themselves.
export default function SettingsProfileScreen() {
  const { user, userProfile, saveLocalProfile, setDietPreference } = useAppStore(
    useShallow(s => ({
      user: s.user,
      userProfile: s.userProfile,
      saveLocalProfile: s.saveLocalProfile,
      setDietPreference: s.setDietPreference,
    })),
  );
  const [editName, setEditName] = useState(userProfile?.firstName ?? '');
  const [diet, setDiet] = useState(userProfile?.dietPreference ?? 'omnivore');
  const [sex, setSex] = useState(userProfile?.sex ?? null);
  // CP-8 (2026-07-09 UX audit, coverage-06-competitive-hps.md): height and
  // date of birth used to be editable in exactly one place, the Pro-only
  // Nutrition Targets form. A free user (or a Pro user just fixing a typo)
  // had no direct edit path anywhere in Settings. These two fields give
  // free-tier reachability, reusing the exact same input components,
  // validation and persistence shape the Pro form uses (heightFt/heightIn ->
  // heightCm via the same conversion, age -> date of birth via the same
  // lib/profileAge helpers onboarding already uses both ways).
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [age,      setAge]      = useState('');
  // CP-10 stage 3: live theme (src/hooks/useTheme.js). `live` is the shared
  // settingsStyles override (SettingsPrimitives.js); `liveText` covers this
  // screen's own colour/type-bearing style keys the same way.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    dietBlock: { borderBottomColor: t.colors.border },
    dietChipText: { ...t.type.label },
  };

  // Prefill from the same source NutritionTargetsScreen prefills from
  // (user_body_profile), using the identical heightCm -> ft/in and
  // dateOfBirth -> age conversions, so the two surfaces always agree.
  useEffect(() => {
    async function prefill() {
      if (!user?.id) return;
      try {
        const profile = await getUserBodyProfile(user.id).catch(() => null);
        if (profile?.heightCm) {
          const totalIn = Math.round(profile.heightCm / 2.54);
          setHeightFt(String(Math.floor(totalIn / 12)));
          setHeightIn(String(totalIn % 12));
        }
        if (profile?.dateOfBirth) {
          const ageNum = ageYearsFromDateOfBirth(profile.dateOfBirth);
          if (ageNum > 0 && ageNum < 100) setAge(String(ageNum));
        }
      } catch (_) {}
    }
    prefill();
  }, [user?.id]);

  // Height feeds BMR/calorie targets same as sex, but unlike sex (a discrete
  // either/or tap) it's free text entry, so save on blur rather than behind
  // a confirmation dialog, matching the first-name field above. Validation
  // mirrors NutritionTargetsScreen's handleCalculate exactly: ft*30.48 +
  // in*2.54, blank/zero is not persisted. Persists to BOTH the profile (used
  // by blockAdvisor's masters check and the progress-photos fallback) and
  // the body profile (the engine's source, and what Nutrition Targets
  // prefills from), merging into the existing body-profile row so sex/DOB
  // are preserved.
  async function saveHeight(ft, inches) {
    if (!user?.id) return;
    const ftNum = parseInt(ft, 10) || 0;
    const inNum = parseFloat(inches) || 0;
    const heightCm = ftNum * 30.48 + inNum * 2.54;
    if (!heightCm) return;
    try {
      await saveLocalProfile(user.id, { ...(userProfile || {}), heightCm });
      const existing = await getUserBodyProfile(user.id).catch(() => null);
      await saveUserBodyProfile(user.id, { ...(existing || {}), heightCm });
    } catch (e) {
      logError('SettingsProfile.saveHeight', e, {});
    }
  }

  // Date of birth is captured as age everywhere in the app (there is no date
  // picker), converted with the same lib/profileAge helpers onboarding uses.
  // Same save-on-blur shape as height, same dual-write (profile + body
  // profile) as changeSex below.
  async function saveAge(ageStr) {
    if (!user?.id) return;
    const ageNum = parseInt(ageStr, 10);
    if (!ageNum) return;
    const dateOfBirth = dateOfBirthFromAgeYears(ageNum);
    try {
      await saveLocalProfile(user.id, { ...(userProfile || {}), age: ageNum });
      const existing = await getUserBodyProfile(user.id).catch(() => null);
      await saveUserBodyProfile(user.id, { ...(existing || {}), dateOfBirth });
    } catch (e) {
      logError('SettingsProfile.saveAge', e, {});
    }
  }

  // Changing sex moves the ED calorie floor + BMR. Persist to BOTH the profile
  // (for sync via users_profile) and the body profile (the engine's source),
  // merging into the existing body-profile row so height/DOB are preserved
  // (saveUserBodyProfile writes the whole row). Targets are not recomputed here:
  // per founder direction the next weekly check-in picks up the new sex.
  async function changeSex(value) {
    if (!user?.id || (value !== 'male' && value !== 'female')) return;
    haptics.selection();
    const previous = sex;
    setSex(value);
    try {
      await saveLocalProfile(user.id, { ...(userProfile || {}), sex: value });
      const existing = await getUserBodyProfile(user.id).catch(() => null);
      await saveUserBodyProfile(user.id, { ...(existing || {}), sex: value });
    } catch (e) {
      setSex(previous);
      logError('SettingsProfile.changeSex', e, {});
    }
  }

  function requestSexChange(value) {
    if (value === sex) return;
    const label = SEX_OPTIONS.find((opt) => opt.value === value)?.label || value;
    appAlert(
      'Change biological sex?',
      `Set biological sex to ${label}. This affects BMR, calorie floors and future nutrition targets. Your current targets are not recalculated until the next weekly check-in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => changeSex(value) },
      ],
    );
  }

  return (
    <SettingsPage title="Profile">
      <View style={[settingsStyles.section, live.section]}>
        <View style={styles.nameRow}>
          <TextField
            containerStyle={styles.nameField}
            leading={<Ionicons name="person-outline" size={18} color={t.colors.primary} />}
            value={editName}
            onChangeText={setEditName}
            placeholder="Your first name"
            placeholderTextColor={t.colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Your first name"
            onBlur={async () => {
              const name = editName.trim();
              if (user?.id) {
                await saveLocalProfile(user.id, { ...(userProfile || {}), firstName: name || undefined });
              }
            }}
          />
        </View>
        {/* Gym weight units, body weight units, and bar weight rows
            removed at user request. UK defaults: gym + bar = kg;
            body weight units come from onboarding (the morning-weight
            setup screen). The store still holds these values; they
            just aren't user-editable from Settings any more. */}
        <View style={[styles.dietBlock, liveText.dietBlock]}>
          <View style={styles.dietHeader}>
            <View style={[settingsStyles.settingIcon, live.settingIcon]}>
              <Ionicons name="male-female-outline" size={18} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[settingsStyles.settingLabel, live.settingLabel]}>Biological sex</Text>
              <Text style={[settingsStyles.settingSub, live.settingSub]}>Used for calorie floors and nutrition targets. Changes apply on your next weekly check-in.</Text>
            </View>
          </View>
          <View style={styles.dietChips}>
            {SEX_OPTIONS.map(opt => {
              const active = sex === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={active}
                  onPress={() => requestSexChange(opt.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Biological sex ${opt.label}`}
                  style={styles.dietChip}
                  labelStyle={[styles.dietChipText, liveText.dietChipText]}
                />
              );
            })}
          </View>
        </View>
        <View style={[styles.dietBlock, liveText.dietBlock]}>
          <View style={styles.dietHeader}>
            <View style={[settingsStyles.settingIcon, live.settingIcon]}>
              <Ionicons name="resize-outline" size={18} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[settingsStyles.settingLabel, live.settingLabel]}>Height</Text>
              <Text style={[settingsStyles.settingSub, live.settingSub]}>Used for calorie floors and nutrition targets.</Text>
            </View>
          </View>
          <HeightFeetInchesField
            feet={heightFt}
            onChangeFeet={setHeightFt}
            onBlurFeet={() => saveHeight(heightFt, heightIn)}
            inches={heightIn}
            onChangeInches={setHeightIn}
            onBlurInches={() => saveHeight(heightFt, heightIn)}
          />
        </View>
        <View style={[styles.dietBlock, liveText.dietBlock]}>
          <View style={styles.dietHeader}>
            <View style={[settingsStyles.settingIcon, live.settingIcon]}>
              <Ionicons name="calendar-outline" size={18} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[settingsStyles.settingLabel, live.settingLabel]}>Date of birth</Text>
              <Text style={[settingsStyles.settingSub, live.settingSub]}>Enter your age. Used for calorie floors and nutrition targets.</Text>
            </View>
          </View>
          <AgeYearsField value={age} onChangeText={setAge} onBlur={() => saveAge(age)} />
        </View>
        <View style={[styles.dietBlock, liveText.dietBlock]}>
          <View style={styles.dietHeader}>
            <View style={[settingsStyles.settingIcon, live.settingIcon]}>
              <Ionicons name="nutrition-outline" size={18} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[settingsStyles.settingLabel, live.settingLabel]}>Diet preference</Text>
              <Text style={[settingsStyles.settingSub, live.settingSub]}>Filters the meals Volyume suggests.</Text>
            </View>
          </View>
          <View style={styles.dietChips}>
            {DIET_OPTIONS.map(opt => {
              const active = diet === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={active}
                  onPress={() => { haptics.selection(); setDiet(opt.value); setDietPreference(opt.value); }}
                  accessibilityRole="radio"
                  accessibilityLabel={`Diet preference ${opt.label}`}
                  style={styles.dietChip}
                  labelStyle={[styles.dietChipText, liveText.dietChipText]}
                />
              );
            })}
          </View>
        </View>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  nameField: { flex: 1 },
  dietBlock: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  dietChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dietChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 44,
  },
  dietChipText: {
    ...type.label,
    textAlign: 'center',
  },
});
