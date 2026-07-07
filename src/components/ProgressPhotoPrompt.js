/**
 * ProgressPhotoPrompt (Photos LOOP-3, PHASE-2-WAVE3-DESIGN-SPEC D4).
 *
 * A calm, opt-in invitation back to a SECOND progress photo, offered ONLY on a
 * training/competence win the app already celebrates (a new PB, or a
 * session/consistency-streak milestone) inside WorkoutSummaryScreen. It is NEVER
 * offered on a weigh-in, a bodyweight change, a body-composition entry, a
 * calorie/macro event, or any schedule. The trigger is competence, full stop.
 *
 * This is an ED-safety-adjacent surface. It re-uses the shared fail-closed gate
 * (usePhotoSuppression) exactly, adds nothing parallel, and stays framed on a
 * TRAINING moment: no before/after, no transformation, no appearance or body or
 * weight language anywhere.
 *
 * Gates (all must pass, fail-closed — the card never flashes before they clear):
 *   1. usePhotoSuppression() — true (calm mode OR open ED flag OR any read
 *      failure) → NEVER render. Starts suppressed; only shows once it resolves
 *      false. Reused exactly; no parallel gate.
 *   2. Pro tier only — the caller passes the screen's live tier.
 *   3. Permanent opt-out — a one-tap "Don't ask again" persists OPTOUT_KEY
 *      ('photo_prompt_optout'); once set, never render again. A read failure of
 *      the flag fails closed (treated as opted out).
 *   4. Frequency ceiling — at most once per calendar day AND never twice for the
 *      same milestone id, persisted in SHOWN_KEY (mirrors the partner-moment
 *      ≤1/day + per-id dedupe idiom).
 *
 * The invitation is a dismissable Card appended inside the celebration surface,
 * never a modal, never a push.
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from './Card';
import Button from './Button';
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import useAppStore from '../store/useAppStore';
import {
  colors, spacing, fontSize, fontWeight, withAlpha, circle, radius,
} from '../styles/theme';
import { todayLocalKey } from '../lib/dayKey';
import { track } from '../lib/telemetry';
import { logError } from '../lib/errorLog';

// Permanent opt-out flag (spec-mandated exact key). Once set, the invitation
// never renders again.
export const OPTOUT_KEY = 'photo_prompt_optout';
// Frequency state: { day: 'YYYY-MM-DD' (last day a prompt was shown),
// ids: [milestoneId, ...] (every milestone already shown, permanent) }. The day
// enforces the ≤1/day ceiling; the ids enforce the never-twice-per-milestone
// dedupe. ids accumulate across days (per-milestone is permanent, day-blind).
export const SHOWN_KEY = '@volyume_photo_prompt_shown_v1';

// Fail-closed read of the permanent opt-out flag: any read failure suppresses.
async function readOptedOut() {
  try {
    const v = await AsyncStorage.getItem(OPTOUT_KEY);
    return v === '1' || v === 'true';
  } catch (e) {
    logError('ProgressPhotoPrompt.readOptedOut', e, {});
    return true; // fail closed: unreadable → treat as opted out
  }
}

// Fail-closed read of the frequency state: an unreadable state resolves to
// "already shown today" so the prompt is suppressed rather than shown.
async function readShownState() {
  try {
    const v = await AsyncStorage.getItem(SHOWN_KEY);
    if (!v) return { day: null, ids: [] };
    const parsed = JSON.parse(v);
    return {
      day: typeof parsed?.day === 'string' ? parsed.day : null,
      ids: Array.isArray(parsed?.ids) ? parsed.ids : [],
    };
  } catch (e) {
    logError('ProgressPhotoPrompt.readShownState', e, {});
    return { day: todayLocalKey(), ids: [] }; // fail closed
  }
}

// Record an impression: stamp today (≤1/day) and log the milestone id
// (never-twice). Best-effort local persistence; never throws. The id log is
// capped so it cannot grow unbounded on a long-lived install.
async function recordShown(milestoneId) {
  try {
    const state = await readShownState();
    const ids = state.ids.includes(milestoneId) ? state.ids : [...state.ids, milestoneId];
    await AsyncStorage.setItem(
      SHOWN_KEY,
      JSON.stringify({ day: todayLocalKey(), ids: ids.slice(-200) }),
    );
  } catch (e) {
    logError('ProgressPhotoPrompt.recordShown', e, {});
  }
}

/**
 * @param {object} props
 * @param {string|null} props.milestoneId  The competence-event id (a PB or a
 *   session-streak milestone). Falsy → never renders. The caller passes this
 *   ONLY for a competence win, never for a body/weight event.
 * @param {string} props.tier  The screen's live tier; only 'pro' renders.
 * @param {() => void} props.onAddPhoto  Routes to the existing photo add flow.
 */
export default function ProgressPhotoPrompt({ milestoneId, tier, onAddPhoto }) {
  const suppressed = usePhotoSuppression();
  const [visible, setVisible] = useState(false);
  // Guards a double-impression: once an impression is recorded for a milestone
  // this mount, a benign re-render never re-fires telemetry or re-stamps state.
  const impressedRef = useRef(null);

  // Competence + Pro + not-suppressed. Suppression starts true, so this is false
  // on first paint and the card never flashes before the gate resolves.
  const eligible = !!milestoneId && tier === 'pro' && !suppressed;

  useEffect(() => {
    let alive = true;
    // Any gate failing hides the card outright (safety wins over persistence):
    // if suppression flips true mid-view, the invitation disappears.
    if (!eligible) { setVisible(false); return undefined; }
    (async () => {
      const [optedOut, shown] = await Promise.all([readOptedOut(), readShownState()]);
      if (!alive) return;
      const alreadyToday = shown.day === todayLocalKey();
      const seenThisMilestone = shown.ids.includes(milestoneId);
      if (optedOut || alreadyToday || seenThisMilestone) {
        setVisible(false);
        return;
      }
      setVisible(true);
      if (impressedRef.current !== milestoneId) {
        impressedRef.current = milestoneId;
        recordShown(milestoneId);
        // Telemetry is best-effort and lands only once the allow-list migration
        // is applied; feature key only, no PII, no values.
        const uid = useAppStore.getState().user?.id;
        track(uid, 'photo_prompt_shown').catch(() => {});
      }
    })();
    return () => { alive = false; };
  }, [eligible, milestoneId]);

  function handleAdd() {
    const uid = useAppStore.getState().user?.id;
    track(uid, 'photo_prompt_accepted').catch(() => {});
    setVisible(false);
    onAddPhoto?.();
  }

  function handleNotNow() {
    // Dismiss this instance only (the impression is already recorded, so it does
    // not return today or for this milestone).
    setVisible(false);
  }

  async function handleOptOut() {
    setVisible(false);
    try {
      await AsyncStorage.setItem(OPTOUT_KEY, '1');
    } catch (e) {
      logError('ProgressPhotoPrompt.optOut', e, {});
    }
  }

  if (!visible) return null;

  return (
    <Card style={styles.card} accessibilityLabel="Mark the moment">
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mark the moment</Text>
          <Text style={styles.body}>
            You just hit a milestone. If you&apos;d like, add a photo to your record.
            Your own pace, always private to this phone.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          title="Add a photo"
          onPress={handleAdd}
          accessibilityLabel="Add a photo"
          fullWidth={false}
          style={styles.actionButton}
        />
        <Button
          title="Not now"
          variant="secondary"
          onPress={handleNotNow}
          accessibilityLabel="Not now"
          fullWidth={false}
          style={styles.actionButton}
        />
      </View>
      <TouchableOpacity
        style={styles.optOutBtn}
        onPress={handleOptOut}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Don't ask again"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications-off-outline" size={14} color={colors.textMuted} />
        <Text style={styles.optOutText}>Don&apos;t ask again</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: circle(36),
    backgroundColor: withAlpha(colors.primary, 0.125),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  optOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    marginTop: spacing.md,
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
  },
  optOutText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
