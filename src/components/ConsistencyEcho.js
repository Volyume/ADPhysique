/**
 * ConsistencyEcho (S2 "forgiveness story", parts a + b), a compact echo of the
 * weekly consistency run near the Home hero, plus a one-time explainer that
 * states the band-not-chain promise upfront.
 *
 * It reads the SAME useWeeklyStreak resolver the Progress strip and "Your weeks"
 * section use, so the number can never disagree across surfaces, and it inherits
 * that resolver's full suppression: under an open ED flag, a positive SCOFF
 * screen, OR calm mode the whole echo is absent (a streak artefact is a pressure
 * cue for that population). No body data, ever; sessions and a run count only.
 *
 * The explainer ("one off week never breaks your run") shows once, the first
 * time there is a run to see, then never again (a device-local seen flag). It
 * fails CLOSED: a flag-read error keeps it hidden rather than flashing it.
 */
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import useWeeklyStreak from '../hooks/useWeeklyStreak';
import useTheme from '../hooks/useTheme';

const EXPLAINER_SEEN_KEY = '@volyume_consistency_explainer_seen';

export default function ConsistencyEcho({ userId, scoffScore = 0 }) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. Colour/type plumbing only -- the ED-safety suppression
  // logic below (vm.suppressed/vm.hasTarget, from useWeeklyStreak, which
  // itself reads wellbeing.js) is untouched.
  const t = useTheme();
  const live = {
    echoText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    explainer: { backgroundColor: withAlpha(t.colors.primary, 0.08) },
    explainerText: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
  const vm = useWeeklyStreak(userId, scoffScore);
  // Default hidden until the flag resolves, so the explainer never flashes on a
  // slow or failed read.
  const [explainerSeen, setExplainerSeen] = useState(true);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(EXPLAINER_SEEN_KEY)
      .then((v) => { if (active) setExplainerSeen(!!v); })
      .catch(() => { if (active) setExplainerSeen(true); });
    return () => { active = false; };
  }, []);

  // Absent entirely under suppression, before any plan-derived target, or before
  // there is a run to echo (session-count mode is the hero's own job).
  if (!vm || !vm.render || vm.suppressed || !vm.hasTarget) return null;

  const { runLength, current } = vm;
  const isResting = current?.state === 'resting';
  let line = null;
  if (isResting) line = 'Recovery week. Your run carries on.';
  else if (Number.isFinite(runLength) && runLength >= 1) {
    line = `${runLength} ${runLength === 1 ? 'week' : 'weeks'} running`;
  }
  if (!line) return null;

  function dismissExplainer() {
    setExplainerSeen(true);
    AsyncStorage.setItem(EXPLAINER_SEEN_KEY, '1').catch(() => {});
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.echoRow} accessible accessibilityLabel={line}>
        <Ionicons name="ellipse" size={9} color={t.colors.primary} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.echoText, live.echoText]}>{line}</Text>
      </View>
      {!explainerSeen ? (
        <View style={[styles.explainer, live.explainer]}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.explainerText, live.explainerText]}>
            One off week never breaks your run. Life happens, and your run carries on.
          </Text>
          <TouchableOpacity
            onPress={dismissExplainer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Got it"
          >
            <Ionicons name="close" size={16} color={t.colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, marginTop: spacing.sm },
  echoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center' },
  echoText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  explainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: withAlpha(colors.primary, 0.08),
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  explainerText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
});
