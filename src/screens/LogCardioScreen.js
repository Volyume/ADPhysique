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
import { useState, useMemo, useEffect, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import SegmentedControl from '../components/SegmentedControl';
import SearchBar from '../components/SearchBar';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  CARDIO_ACTIVITIES, CARDIO_CATEGORIES, getCardioActivity,
} from '../lib/cardio/cardioActivities';
import { estimateActivityKcal, metFor } from '../lib/cardio/cardioMath';
import { insertCardioLog, getRecentCardioLog } from '../lib/database';

const CATEGORY_LABELS = {
  walking: 'Walking', running: 'Running', cycling: 'Cycling', rowing: 'Rowing',
  swimming: 'Swimming', machine: 'Machines', hiit: 'HIIT', conditioning: 'Conditioning',
  sport: 'Sport', other: 'Other',
};

// P8: a glyph per category so the list scans visually, the way the activity-first
// apps do. Ionicons only.
const CATEGORY_ICON = {
  walking: 'walk-outline', running: 'walk-outline', cycling: 'bicycle-outline',
  rowing: 'boat-outline', swimming: 'water-outline', machine: 'speedometer-outline',
  hiit: 'flash-outline', conditioning: 'barbell-outline', sport: 'football-outline',
  other: 'heart-outline',
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
  // P10: only estimate kcal when we actually know the bodyweight; no silent 75.
  const weightKnown = Number(userProfile?.weightKg) > 0;
  const bodyweightKg = weightKnown ? Number(userProfile.weightKg) : null;
  const favouriteIds = useMemo(() => userProfile?.cardioFavourites || [], [userProfile]);

  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState([]);
  // P6: remember the user's last log per activity so picking it prefills the
  // duration + intensity they last used, not a flat 30 min.
  const [lastByActivity, setLastByActivity] = useState({});
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
        const lastMap = {};
        for (const r of rows) {
          // rows are newest-first, so the first time we see an activity is its
          // most recent log.
          if (r.activityId && !lastMap[r.activityId]) {
            lastMap[r.activityId] = { durationMin: r.durationMin, intensity: r.intensity };
          }
          if (r.activityId && !seen.has(r.activityId)) { seen.add(r.activityId); ids.push(r.activityId); }
          if (ids.length >= 5 && Object.keys(lastMap).length >= 20) break;
        }
        setRecentIds(ids.slice(0, 5));
        setLastByActivity(lastMap);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [userId]);

  const pickActivity = useCallback((a) => {
    setActivity(a);
    const last = lastByActivity[a.id];
    setIntensity(last?.intensity || a.defaultIntensity || 'moderate');
    if (last?.durationMin > 0) setDuration(last.durationMin);
  }, [lastByActivity]);

  const estKcal = (activity && weightKnown)
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
    } catch (_e) {
      appAlert('Couldn\'t log', 'Try again.');
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
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activity ? 'Log cardio' : 'Pick activity'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!activity ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.searchWrap}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search cardio" />
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
          <TouchableOpacity style={styles.chosenRow} onPress={() => setActivity(null)} accessibilityRole="button" accessibilityLabel="Change activity">
            <View style={{ flex: 1 }}>
              <Text style={styles.chosenName}>{activity.displayName}</Text>
              <Text style={styles.chosenMeta}>{CATEGORY_LABELS[activity.category]} · tap to change</Text>
            </View>
            <TouchableOpacity onPress={toggleFavourite} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: isFavourite }} accessibilityLabel={isFavourite ? 'Remove from your cardio' : 'Add to your cardio'}>
              <Ionicons name={isFavourite ? 'star' : 'star-outline'} size={22} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Duration</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setDuration((d) => Math.max(5, d - 5))} accessibilityRole="button" accessibilityLabel="Less time">
              <Text style={styles.stepBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{duration} min</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setDuration((d) => Math.min(300, d + 5))} accessibilityRole="button" accessibilityLabel="More time">
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Intensity</Text>
          <SegmentedControl options={INTENSITY_OPTS} value={intensity} onChange={setIntensity} accessibilityLabel="Intensity" />

          {estKcal != null && (
            <>
              <View style={styles.kcalRow}>
                <Ionicons name="flame-outline" size={16} color={colors.textMuted} />
                <Text style={styles.kcalText}>Burned about {estKcal} kcal</Text>
              </View>
              <Text style={styles.footnote}>
                An estimate. We don't add it to your food target, your weight trend already accounts for it.
              </Text>
            </>
          )}

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
        <TouchableOpacity key={a.id} style={styles.activityRow} onPress={() => onPick(a)} accessibilityRole="button" accessibilityLabel={`Log ${a.displayName}`}>
          <Ionicons name={CATEGORY_ICON[a.category] || 'heart-outline'} size={18} color={colors.primary} style={styles.activityIcon} />
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
  searchWrap: { marginBottom: spacing.sm },
  section: { marginTop: spacing.md },
  sectionLabel: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 1, marginBottom: spacing.xs, textTransform: 'uppercase',
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  activityIcon: { marginRight: spacing.sm },
  activityName: { ...type.body, color: colors.textPrimary, flex: 1 },
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
