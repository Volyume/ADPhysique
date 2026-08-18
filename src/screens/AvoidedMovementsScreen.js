/**
 * AvoidedMovementsScreen.js — D107-2 injury/constraint layer, D109-3 (list
 * home ruling): "active movement constraints are listed from an 'Avoided
 * movements' row in the Plans screen's Plan tools section, opening a simple
 * list with per-row removal; set/clear stays on the exercise long-press."
 *
 * This screen is a READ + REMOVE surface only. New constraints are set from
 * RoutineDetailScreen's exercise long-press ("Avoid this movement
 * pattern..."), never here — matching how the plain per-exercise exclusion
 * works (openAvoidSheet lives on the exercise, not on a settings screen).
 *
 * Calm, non-clinical copy throughout: no diagnosis vocabulary, no pain
 * scales. A constraint is a preference about future SUGGESTIONS, exactly
 * like the per-exercise intent layer it is built on (src/lib/exercise/
 * intent.js) — it never touches workouts, sets or PRs.
 */
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, radius, type, hitSlop } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { getActiveBlock, EXERCISE_INTENT } from '../lib/database';
import {
  loadExerciseIntentState, listActiveMovementConstraints,
} from '../lib/exercise/intent';
import { clearMovementPatternAvoid } from '../lib/exercise/movementConstraints';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { logError } from '../lib/errorLog';
import * as haptics from '../lib/haptics';

function untilText(row) {
  if (row.kind === EXERCISE_INTENT.PATTERN_AVOID && row.untilMs) {
    const date = new Date(row.untilMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Until ${date}`;
  }
  if (row.kind === EXERCISE_INTENT.AVOIDED_BLOCK) return 'Until this training block ends';
  return 'Indefinitely';
}

export default function AvoidedMovementsScreen({ navigation }) {
  const t = useTheme();
  const live = {
    rowIcon: { backgroundColor: t.colors.surface },
    rowLabel: { color: t.colors.textPrimary },
    rowSub: { color: t.colors.textMuted },
    removeBtnText: { color: t.colors.primary },
    noticeText: { color: t.colors.textMuted },
  };
  const user = useAppStore(s => s.user);
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // D109-2 fail direction: the read failed, so this list may be incomplete
  // or empty even though constraints exist. Never presented as "nothing is
  // avoided" — a visible notice instead.
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const block = await getActiveBlock(user.id).catch(() => null);
      const state = await loadExerciseIntentState(user.id, { activeMesocycleId: block?.id ?? null });
      setRows(listActiveMovementConstraints(state));
      setUnavailable(!!state?.unavailable);
    } catch (_e) {
      setRows([]);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRemove(row) {
    if (!user?.id) return;
    haptics.selection();
    // Optimistic: removal is a simple tombstone and rarely fails; the row
    // disappears immediately, matching the "Allow again" flow elsewhere in
    // the intent layer.
    const previous = rows;
    setRows(prev => prev.filter(r => r.family !== row.family));
    try {
      await clearMovementPatternAvoid(user.id, row.family);
      toast.show(`Volyume can suggest ${row.label} again.`, { variant: 'success' });
    } catch (e) {
      logError('AvoidedMovementsScreen.handleRemove', e, { userId: user.id, family: row.family });
      setRows(previous);
      toast.show('That did not save. Please try again.', { variant: 'error' });
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Avoided movements" onBack={() => navigation.goBack()} />
      {unavailable ? (
        <View style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={14} color={t.colors.textMuted} />
          <Text style={[styles.noticeText, live.noticeText]}>
            Some avoided movements may not be shown right now. Nothing has been removed or changed.
          </Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.list}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="Nothing avoided"
          text="When you avoid a movement pattern from an exercise's options, it shows up here so you can see what's active and remove it any time."
        />
      ) : (
        <View style={styles.list}>
          {rows.map(row => (
            <Card key={row.family} style={styles.row} accessibilityLabel={`${row.label}, ${untilText(row)}`}>
              <View style={[styles.rowIcon, live.rowIcon]}>
                <Ionicons name="shield-outline" size={20} color={t.colors.textSecondary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, live.rowLabel]} numberOfLines={1}>
                  {row.label.charAt(0).toUpperCase() + row.label.slice(1)}
                </Text>
                <Text style={[styles.rowSub, live.rowSub]}>{untilText(row)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(row)}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={`Allow ${row.label} again`}
                style={styles.removeBtn}
              >
                <Text style={[styles.removeBtnText, live.removeBtnText]}>Remove</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  noticeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  noticeText: { ...type.caption, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowLabel: { ...type.bodyStrong },
  rowSub: { ...type.caption },
  removeBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  removeBtnText: { ...type.label },
});
