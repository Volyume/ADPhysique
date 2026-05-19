import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import useAppStore from '../store/useAppStore';
import { logBodyMetric } from '../lib/database';

const VALUE_BULLETS = [
  'Tracks every set and remembers exactly what you lifted last time',
  'No social feed, no ads, no streak pressure — just your training',
  'Stays on your phone. Nothing is sent anywhere.',
];

export default function FirstRunScreen({ navigation }) {
  const { user, units, setUnits, userProfile, saveLocalProfile, completeFirstRun } = useAppStore();
  const [mode, setMode] = useState('branch'); // 'branch' | 'quick'
  const [localUnits, setLocalUnits] = useState(units || 'kg');
  const [bodyWeight, setBodyWeight] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  const hasName = firstName.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  async function saveName() {
    const name = firstName.trim();
    if (!name || !user?.id) return;
    await saveLocalProfile(user.id, { ...(userProfile || {}), firstName: name });
  }

  async function startPathA() {
    await saveName();
    navigation.navigate('CoachBuilder', { firstRun: true });
  }

  async function startPathLibrary() {
    await saveName();
    navigation.navigate('PlanLibrary', { fromFirstRun: true });
  }

  async function finishPathB() {
    if (!hasName) return;
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      const merged = { ...(userProfile || {}), units: localUnits, firstName: firstName.trim() };
      if (user?.id) await saveLocalProfile(user.id, merged);
      const bw = parseFloat(bodyWeight);
      if (user?.id && !isNaN(bw) && bw > 0) {
        await logBodyMetric(user.id, { weightKg: bw, loggedAt: Date.now() });
      }
      await completeFirstRun();
    } catch (e) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
      setBusy(false);
    }
  }

  if (mode === 'quick') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => setMode('branch')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            <Text style={styles.backLinkText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Almost there.</Text>
          <Text style={styles.subtitle}>
            Just a couple of things and you're ready to go. You can update these anytime in Settings.
          </Text>

          <Text style={styles.fieldLabel}>What should we call you?</Text>
          <TextInput
            ref={nameRef}
            style={[styles.input, hasName && styles.inputActive]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Units</Text>
          <View style={styles.unitRow}>
            {['kg', 'lbs'].map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, localUnits === u && styles.unitBtnActive]}
                onPress={() => setLocalUnits(u)}
              >
                <Text style={[styles.unitBtnText, localUnits === u && styles.unitBtnTextActive]}>
                  {u.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Body weight ({localUnits}) — optional</Text>
          <TextInput
            style={styles.input}
            value={bodyWeight}
            onChangeText={setBodyWeight}
            keyboardType="decimal-pad"
            placeholder={localUnits === 'kg' ? '82.5' : '182'}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.hint}>
            Logging this once unlocks Strength Standards on your PR wall.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, (!hasName || busy) && styles.btnDisabled]}
            onPress={finishPathB}
            disabled={!hasName || busy}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Start logging</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <VolyumeMark size={48} />
          <Text style={styles.brandName}>Volyume</Text>
        </View>

        <Text style={styles.title}>Welcome.</Text>
        <Text style={styles.welcomeDesc}>
          Volyume is a training logbook for serious bodybuilders. It tracks your sessions, remembers your progress, and helps you make better decisions each time you train.
        </Text>
        <View style={styles.bullets}>
          {VALUE_BULLETS.map(b => (
            <View key={b} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={styles.nameBlock}>
          <Text style={styles.nameLabel}>What should we call you?</Text>
          <TextInput
            ref={nameRef}
            style={[styles.nameInput, hasName && styles.inputActive]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity
          style={[styles.pathCard, !hasName && styles.pathCardDisabled]}
          onPress={startPathA}
          disabled={!hasName}
          activeOpacity={0.85}
        >
          <View style={styles.pathIconWrap}>
            <Ionicons name="sparkles" size={22} color={hasName ? colors.primary : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pathTitle}>Build my plan with Coach</Text>
            <Text style={styles.pathText}>
              Answer a few questions and we'll put together a plan that fits your schedule and goals.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={hasName ? colors.textMuted : colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pathCard, !hasName && styles.pathCardDisabled]}
          onPress={startPathLibrary}
          disabled={!hasName}
          activeOpacity={0.85}
        >
          <View style={styles.pathIconWrap}>
            <Ionicons name="library-outline" size={22} color={hasName ? colors.primary : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pathTitle}>Choose a ready-made plan</Text>
            <Text style={styles.pathText}>
              Browse our library of tried-and-tested programmes — beginner to advanced.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={hasName ? colors.textMuted : colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pathCard, !hasName && styles.pathCardDisabled]}
          onPress={() => setMode('quick')}
          disabled={!hasName}
          activeOpacity={0.85}
        >
          <View style={styles.pathIconWrap}>
            <Ionicons name="create-outline" size={22} color={hasName ? colors.primary : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pathTitle}>I already have a plan</Text>
            <Text style={styles.pathText}>
              Skip setup and go straight to logging. You can always add a plan later.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={hasName ? colors.textMuted : colors.border} />
        </TouchableOpacity>

        <Text style={styles.footnote}>
          No account needed to start. Your data is yours.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  brandName: { fontSize: 26, fontWeight: fontWeight.black, color: colors.textPrimary, letterSpacing: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary, marginTop: spacing.md },
  welcomeDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21, marginTop: spacing.xs },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  bullets: { gap: spacing.sm, marginVertical: spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  pathCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  pathIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  pathTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  pathText: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  footnote: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: 'auto', paddingTop: spacing.lg },

  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLinkText: { fontSize: fontSize.sm, color: colors.textSecondary },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginTop: spacing.md },
  fieldOptional: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.textMuted },
  nameBlock: { gap: spacing.xs },
  nameLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  nameInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  inputActive: { borderColor: colors.primary },
  pathCardDisabled: { opacity: 0.35 },
  unitRow: { flexDirection: 'row', gap: spacing.sm },
  unitBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  unitBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  unitBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  unitBtnTextActive: { color: colors.primary },
  input: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.lg, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  btnDisabled: { opacity: 0.6 },

  wbGroup: { gap: spacing.md, marginTop: spacing.lg },
  wbBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  wbBtnText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  wbHelpline: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18,
    marginTop: 'auto', paddingTop: spacing.xl, textAlign: 'center',
  },
});
