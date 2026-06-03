/**
 * LogCardioScreen
 *
 * User-led cardio logging (audit C1/C2). Pick an activity (favourites and
 * recents first, then browse the library or search), set duration + intensity,
 * see the estimated calories as feedback, save. The estimate is never added to
 * the food target; the energy-balance model already accounts for cardio through
 * the weight trend, which the one-time footnote explains.
 *
 * Voice rules: CLAUDE.md. No em dashes, no encouragement.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import SegmentedControl from '../components/SegmentedControl';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  CARDIO_ACTIVITIES, CARDIO_CATEGORIES, getCardioActivity, getCardioActivityByName,
} from '../lib/cardio/cardioActivities';
import { estimateActivityKcal, metFor } from '../lib/cardio/cardioMath';
import { insertCardioLog, getRecentCardioLog } from '../lib/database';

const CATEGORY_LABELS = {
  walking: 'Walking', running: 'Running', cycling: 'Cycling', rowing: 'Rowing',
  swimming: 'Swimming', machine: 'Machines', hiit: 'HIIT', conditioning: 'Conditioning',
  sport: 'Sport', other: 'Other',
};

const INTENSITY_OPTS = [
  { label: 'Easy', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Hard', value: 'high' },
];

export default function LogCardioScreen({ navigation, route }) {
  const { user, userProfile, saveLocalProfile } = useAppStore(useShallow((s) => ({
    user: s.user, userProfile: s.userProfile, saveLocalProfile: s.saveLocalProfile,
  })));
  const userId = user?.id;
  const bodyweightKg = Number(userProfile?.weightKg) > 0 ? Number(userProfile.weightKg) : 75;
  const favouriteIds = useMemo(() => userProfile?.cardioFavourites || [], [userProfile]);

  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  const [activity, setActivity] = useState(() => {
    const pre = route?.params?.activityId;
    return pre ? getCardioActivity(pre) : null;
  });
  const [intensity, setIntensity] = useState(activity?.defaultIntensity || 'moderate');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    if (!userId) return undefined;
    getRecentCardioLog(userId, 20)
      .then((rows) => {
        if (!live) return;
        const seen = new Set();
        const ids = [];
        for (const r of rows) {
          if (r.activityId && !seen.has(r.activityId)) { seen.add(r.activityId); ids.push(r.activityId); }
          if (ids.length >= 5) break;
        }
        setRecentIds(ids);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [userId]);

  const pickActivity = useCallback((a) => {
    setActivity(a);
    setIntensity(a.defaultIntensity || 'moderate');
  }, []);

  const estKcal = activity
    ? estimateActivityKcal(activity, intensity, duration, bodyweightKg)
    : null;

  const isFavourite = activity ? favouriteIds.includes(activity.id) : false;

  async function toggleFavourite() {
    if (!activity || !userId) return;
    const next = isFavourite
      ? favouriteIds.filter((id) => id !== activity.id)
      : [...favouriteIds, activity.id];
    await saveLocalProfile(userId, { ...(userProfile || {}), cardioFavourites: next });
  }

  async function onSave() {
    if (!activity || !userId || saving) return;
    setSaving(true);
    try {
      await insertCardioLog(userId, {
        entryDate: route?.params?.entryDate,
        activityId: activity.id,
        activityName: activity.displayName,
        category: activity.category,
        durationMin: duration,
        intensity,
        met: metFor(activity, intensity),
        estKcal,
        recoveryImpact: activity.recoveryImpact,
        impactType: activity.impactType,
        source: 'manual',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Couldn\'t log', 'Try again.');
      setSaving(false);
    }
  }

  // ── Activity picker (shown until one is chosen) ──────────────────────────
  const q = query.trim().toLowerCase();
  const filtered = q
    ? CARDIO_ACTIVITIES.filter((a) => a.name.toLowerCase().includes(q))
    : null;
  const favourites = favouriteIds.map(getCardioActivity).filter(Boolean);
  const recents = recentIds.map(getCardioActivity).filter(Boolean);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activity ? 'Log cardio' : 'Pick activity'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!activity ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search cardio"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
          </View>

          {filtered ? (
            <ActivityList items={filtered} onPick={pickActivity} />
          ) : (
            <>
              {favourites.length > 0 && (
                <Section title="Your cardio">
                  <ActivityList items={favourites} onPick={pickActivity} />
                </Section>
              )}
              {recents.length > 0 && (
                <Section title="Recent">
                  <ActivityList items={recents} onPick={pickActivity} />
                </Section>
              )}
              {CARDIO_CATEGORIES.map((cat) => {
                const items = CARDIO_ACTIVITIES.filter((a) => a.category === cat);
                if (!items.length) return null;
                return (
                  <Section key={cat} title={CATEGORY_LABELS[cat] || cat}>
                    <ActivityList items={items} onPick={pickActivity} />
                  </Section>
                );
              })}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.chosenRow} onPress={() => setActivity(null)} accessibilityLabel="Change activity">
            <View style={{ flex: 1 }}>
              <Text style={styles.chosenName}>{activity.displayName}</Text>
              <Text style={styles.chosenMeta}>{CATEGORY_LABELS[activity.category]} · tap to change</Text>
            </View>
            <TouchableOpacity onPress={toggleFavourite} hitSlop={10} accessibilityLabel={isFavourite ? 'Remove from your cardio' : 'Add to your cardio'}>
              <Ionicons name={isFavourite ? 'star' : 'star-outline'} size={22} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Duration</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setDuration((d) => Math.max(5, d - 5))} accessibilityLabel="Less time">
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{duration} min</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setDuration((d) => Math.min(300, d + 5))} accessibilityLabel="More time">
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Intensity</Text>
          <SegmentedControl options={INTENSITY_OPTS} value={intensity} onChange={setIntensity} accessibilityLabel="Intensity" />

          {estKcal != null && (
            <View style={styles.kcalRow}>
              <Ionicons name="flame-outline" size={16} color={colors.textMuted} />
              <Text style={styles.kcalText}>Burned about {estKcal} kcal</Text>
            </View>
          )}
          <Text style={styles.footnote}>
            An estimate. We don't add it to your food target, your weight trend already accounts for it.
          </Text>

          <Button title="Save" size="lg" loading={saving} onPress={onSave} style={{ marginTop: spacing.lg }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function ActivityList({ items, onPick }) {
  return (
    <View>
      {items.map((a) => (
        <TouchableOpacity key={a.id} style={styles.activityRow} onPress={() => onPick(a)} accessibilityLabel={`Log ${a.displayName}`}>
          <Text style={styles.activityName}>{a.displayName}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...type.title, color: colors.textPrimary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.textPrimary, ...type.body, paddingVertical: 2 },
  section: { marginTop: spacing.md },
  sectionLabel: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginBottom: spacing.xs, textTransform: 'uppercase',
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  activityName: { ...type.body, color: colors.textPrimary },
  chosenRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  chosenName: { ...type.title, color: colors.textPrimary },
  chosenMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  fieldLabel: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.lg, marginBottom: spacing.xs },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  stepBtn: { width: 56, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface3 },
  stepBtnText: { fontSize: fontSize.xxl, color: colors.primary, fontWeight: fontWeight.bold },
  stepValue: { flex: 1, textAlign: 'center', ...type.title, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  kcalText: { fontSize: fontSize.sm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  footnote: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 16 },
});
