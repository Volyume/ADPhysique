import React, { useState } from 'react';
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
  'Volume-landmark hypertrophy intelligence',
  'No social feed, no ads, no streak guilt',
  'Yours, offline — your data never leaves the device',
];

export default function FirstRunScreen({ navigation }) {
  const { user, units, setUnits, saveLocalProfile, completeFirstRun } = useAppStore();
  const [mode, setMode] = useState('branch');   // 'branch' | 'quick'
  const [localUnits, setLocalUnits] = useState(units || 'kg');
  const [bodyWeight, setBodyWeight] = useState('');
  const [busy, setBusy] = useState(false);

  function startPathA() {
    navigation.navigate('CoachBuilder', { firstRun: true });
  }

  async function finishPathB() {
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      if (user?.id) await saveLocalProfile(user.id, { units: localUnits });
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

          <Text style={styles.title}>Quick setup</Text>
          <Text style={styles.subtitle}>
            Two things and you're logging. You can change these later in Settings.
          </Text>

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
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={finishPathB}
            disabled={busy}
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

        <Text style={styles.title}>Train with intent</Text>
        <View style={styles.bullets}>
          {VALUE_BULLETS.map(b => (
            <View key={b} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.pathCard} onPress={startPathA} activeOpacity={0.85}>
          <View style={styles.pathIconWrap}>
            <Ionicons name="sparkles" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pathTitle}>Generate my plan</Text>
            <Text style={styles.pathText}>
              Answer a few questions and Coach builds a volume-landmark plan tuned to you. ~3 minutes.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pathCard}
          onPress={() => setMode('quick')}
          activeOpacity={0.85}
        >
          <View style={styles.pathIconWrap}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pathTitle}>I have my own plan</Text>
            <Text style={styles.pathText}>
              Skip straight to logging. Just set your units and you're in.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.footnote}>
          No account needed. Everything stays on your device.
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
});
