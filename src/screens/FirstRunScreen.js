import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';

// First-run for Free users only. Pro signups go through ProOnboardingStack
// (profile → training → recovery → plan + nutrition generation). Free gets
// the minimum: name + units, then straight to logging. Plan choice happens
// later via the Plans tab (Library or Manual Builder).
export default function FirstRunScreen({ navigation: _navigation }) {
  const { user, units, setUnits, userProfile, saveLocalProfile, completeFirstRun } = useAppStore();
  const [localUnits, setLocalUnits] = useState(units || 'kg');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  const hasName = firstName.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  async function finish() {
    if (!hasName) return;
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      const merged = { ...(userProfile || {}), units: localUnits, firstName: firstName.trim() };
      if (user?.id) await saveLocalProfile(user.id, merged);
      await completeFirstRun();
    } catch (e) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Almost there.</Text>
        <Text style={styles.subtitle}>
          A couple of details and you're ready to start logging. Change these any time in Settings.
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

        <TouchableOpacity
          style={[styles.primaryBtn, (!hasName || busy) && styles.btnDisabled]}
          onPress={finish}
          disabled={!hasName || busy}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Start logging</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.background} />
        </TouchableOpacity>

        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.hintText}>
            When you're in, head to <Text style={styles.hintBold}>Plans</Text>{' '}
            to pick a plan from the library, or build your own from scratch.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary, marginTop: spacing.lg },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.lg, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  inputActive: { borderColor: colors.primary },
  unitRow: { flexDirection: 'row', gap: spacing.sm },
  unitBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  unitBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  unitBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  unitBtnTextActive: { color: colors.primary },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  btnDisabled: { opacity: 0.6 },
  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  hintText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17 },
  hintBold: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
});
