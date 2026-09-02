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
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, radius, type, hitSlop } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import {
  SettingRow, settingsStyles, useSettingsStyles,
} from '../components/SettingsPrimitives';
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
  const settings = useSettingsStyles();
  const live = {
    removeBtnText: { color: t.colors.primary },
    noticeText: { color: t.colors.textMuted },
    crossLaneText: { color: t.colors.textMuted },
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
      {/* CC33 D112 R6 (closes audit T1-20): the two lanes never
          cross-referenced each other. This is a preference surface -
          things the body needs training built around belong to the
          capability lane instead, so this quiet line points there. */}
      <TouchableOpacity
        onPress={() => { haptics.selection(); navigation.navigate('HowYouTrain'); }}
        style={styles.crossLaneRow}
        accessibilityRole="button"
        accessibilityLabel="Things your body needs training built around live under How you train"
      >
        <Text style={[styles.crossLaneText, live.crossLaneText]}>
          Things your body needs training built around live under How you train.
        </Text>
        <Ionicons name="chevron-forward" size={14} color={t.colors.textMuted} />
      </TouchableOpacity>
      {unavailable ? (
        <View style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={14} color={t.colors.textMuted} />
          <Text style={[styles.noticeText, live.noticeText]}>
            Some avoided movements may not be shown right now. Nothing has been removed or changed.
          </Text>
        </View>
      ) : null}
      {/* Restyle 2026-09-02: the list had no scroll container at all, so a
          long list simply ran off the bottom of the screen with no way to
          reach it. It scrolls now, on the same content padding the Settings
          family uses. */}
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <>
            <Skeleton height={64} radius={radius.lg} />
            <Skeleton height={64} radius={radius.lg} />
          </>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="Nothing avoided"
            text="When you avoid a movement pattern from an exercise's options, it shows up here so you can see what's active and remove it any time."
          />
        ) : (
          /* Restyle 2026-09-02: each avoided movement was its own bordered
             Card, so the screen read as a stack of loose boxes rather than
             one list - and its icon chip was `surface` ON a `surface` card,
             i.e. invisible. The rows are the shared SettingRow inside one
             grouped section now, exactly like the sibling capability lane
             (How you train) this screen points at, so the two surfaces read
             as one feature. Copy, ordering and the remove action are
             unchanged. */
          <View style={[settingsStyles.section, settings.section]}>
            {rows.map(row => (
              <SettingRow
                key={row.family}
                icon="shield-outline"
                label={row.label.charAt(0).toUpperCase() + row.label.slice(1)}
                sub={untilText(row)}
                showArrow={false}
                accessibilityLabel={`${row.label}, ${untilText(row)}`}
                rightElement={(
                  <TouchableOpacity
                    onPress={() => handleRemove(row)}
                    hitSlop={hitSlop}
                    accessibilityRole="button"
                    accessibilityLabel={`Allow ${row.label} again`}
                    style={styles.removeBtn}
                  >
                    <Text style={[styles.removeBtnText, live.removeBtnText]}>Remove</Text>
                  </TouchableOpacity>
                )}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  crossLaneRow: {
    // The row is a real control (it routes to How you train), and a caption
    // between 8dp and 4dp of padding stood about 30dp tall - under the 48dp
    // floor in docs/rules/styling.md. Floored on the token; the line stays
    // exactly as quiet as T1-20 specified.
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs,
    minHeight: touchTarget.minimum,
  },
  crossLaneText: { ...type.caption, flex: 1 },
  noticeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  noticeText: { ...type.caption, flex: 1 },
  // ~26dp of box relying on hitSlop to clear the floor. Slop is invisible:
  // it does not show the user where to press and adjacent slop regions
  // steal each other's taps. The box carries the floor itself now (the
  // shape How you train's own per-row Remove uses), and hitSlop stays as
  // the belt to that braces. Pinned by capabilityTouchTargets.guard.
  removeBtn: {
    minHeight: touchTarget.minimum,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  removeBtnText: { ...type.label },
});
