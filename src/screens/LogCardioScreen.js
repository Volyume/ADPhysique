/**
 * LogCardioScreen
 *
 * User-led cardio logging (audit C1/C2). Pick an activity (favourites and
 * recents first, then browse the library or search), set duration + intensity,
 * see the estimated calories as feedback, save. The estimate is never added to
 * the food target; the energy-balance model already accounts for cardio through
 * the weight trend, which the recurring footnote explains.
 *
 * Voice rules: CLAUDE.md. No em dashes, no encouragement.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import ModalHeader from '../components/ModalHeader';
import SectionLabel from '../components/SectionLabel';
import SegmentedControl from '../components/SegmentedControl';
import SearchBar from '../components/SearchBar';
import Stepper from '../components/Stepper';
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
  // Campaign 2026-07-10 item 8 (history + cardio theme migration): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <ModalHeader title={activity ? 'Log cardio' : 'Pick activity'} onClose={() => navigation.goBack()} />

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
          <Card onPress={() => setActivity(null)} surface="surface2" radius="md" padding="md" style={styles.chosenRow} accessibilityLabel="Change activity">
            <View style={styles.chosenCopy}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.chosenName, live.chosenName]} numberOfLines={1} ellipsizeMode="tail">{activity.displayName}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.chosenMeta, live.chosenMeta]}>{CATEGORY_LABELS[activity.category]} · tap to change</Text>
            </View>
            <TouchableOpacity onPress={toggleFavourite} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: isFavourite }} accessibilityLabel={isFavourite ? 'Remove from your cardio' : 'Add to your cardio'}>
              <Ionicons name={isFavourite ? 'star' : 'star-outline'} size={22} color={t.colors.primary} />
            </TouchableOpacity>
          </Card>

          <SectionLabel style={styles.fieldLabel}>Duration</SectionLabel>
          <Stepper
            value={duration}
            onChange={setDuration}
            min={5}
            max={300}
            step={5}
            unit="min"
            label="cardio duration"
            decreaseLabel="Decrease cardio duration"
            increaseLabel="Increase cardio duration"
            valueLabel={`Cardio duration ${duration} minutes`}
            style={styles.durationStepper}
          />

          <SectionLabel style={styles.fieldLabel}>Intensity</SectionLabel>
          <SegmentedControl options={INTENSITY_OPTS} value={intensity} onChange={setIntensity} accessibilityLabel="Intensity" />

          {estKcal != null && (
            <>
              <View style={styles.kcalRow}>
                <Ionicons name="flame-outline" size={16} color={t.colors.textMuted} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.kcalText, live.kcalText]}>Burned about {estKcal} kcal</Text>
              </View>
              <Text maxFontSizeMultiplier={1.3} style={[styles.footnote, live.footnote]}>
                Already counted. This isn't added to your calorie target, your weight trend includes everything you burn.
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
      <SectionLabel style={styles.sectionLabel}>{title}</SectionLabel>
      {children}
    </View>
  );
}

function ActivityList({ items, onPick }) {
  // Campaign 2026-07-10 item 8: ActivityList is a sibling function-component
  // scope, not prop-drilled `live` from LogCardioScreen (it is called from
  // several places in one render -- favourites/recents/category sections --
  // so its own useTheme() call is cleaner than threading a prop through
  // every call site). Same shared buildLiveStyles(t) as the parent screen.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View>
      {items.map((a) => (
        <TouchableOpacity key={a.id} style={[styles.activityRow, live.activityRow]} onPress={() => onPick(a)} accessibilityRole="button" accessibilityLabel={`Log ${a.displayName}`}>
          <Ionicons name={CATEGORY_ICON[a.category] || 'heart-outline'} size={18} color={t.colors.primary} style={styles.activityIcon} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.activityName, live.activityName]} numberOfLines={1} ellipsizeMode="tail">{a.displayName}</Text>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
  searchWrap: { marginBottom: spacing.sm },
  section: { marginTop: spacing.md },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  activityIcon: { marginRight: spacing.sm },
  activityName: { ...type.body, color: colors.textPrimary, flex: 1 },
  chosenCopy: { flex: 1, minWidth: 0 },
  chosenRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  chosenName: { ...type.title, color: colors.textPrimary },
  chosenMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  fieldLabel: { marginTop: spacing.lg, marginBottom: spacing.xs },
  durationStepper: { justifyContent: 'center', paddingVertical: spacing.xs },
  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  kcalText: { fontSize: fontSize.sm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  footnote: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xs },
});

// Campaign 2026-07-10 item 8 (history + cardio theme migration): the frozen
// `styles` block above stays byte-identical. This mirrors ONLY the colour/
// fontSize/type-bearing sub-properties of the matching frozen style, at
// identical rest values, shared by LogCardioScreen's two function-component
// scopes (the screen itself and ActivityList) so they can never drift out
// of step with each other or the frozen block. Pure layout keys (flex/gap/
// padding/width, no token) are correctly omitted -- there is nothing to
// unfreeze for them. Same pattern as WorkoutSummaryScreen.js's
// buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    activityRow: { borderBottomColor: t.colors.border },
    activityName: { ...t.type.body, color: t.colors.textPrimary },
    chosenName: { ...t.type.title, color: t.colors.textPrimary },
    chosenMeta: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    kcalText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    footnote: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
