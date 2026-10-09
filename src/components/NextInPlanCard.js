/**
 * NextInPlanCard -- the Recovery screen's top card (register D219 lane B4;
 * design 5.1 and 5.2 of docs/audit/plan-builder-science-2026-10-04/).
 *
 *   Next in your plan: Upper B
 *   Chest, back, biceps and triceps.
 *   Every muscle in it is estimated recovered by tomorrow morning.
 *
 *     Chest     estimated recovered by tomorrow morning
 *     Back      estimated recovered now
 *     Biceps    estimated recovered now
 *               Focus: you picked biceps to bring up.
 *     Triceps   estimated recovered by this evening
 *
 * It is always the plan's own next session (founder, 2026-10-04: "Next workout
 * should be planned as the plan builds it"): built by nextInPlan.js from the
 * programme position, the one authority Home reads, never from readiness, so no
 * surface recommends another session. Each muscle line is its own estimate,
 * rounded to a part of the day because every estimate carries a band of about
 * 25%; they are forecasts of readiness, never a statement that the person
 * trains then (there are no scheduled training days). Tapping a muscle opens
 * its detail: what the plan intends for it, this week's sets and where they sit
 * against the evidence bands, its own recovery clock, the estimate with its
 * range and the spacing of its sessions (muscleDetail.js), so a muscle the plan
 * raised reads inside its focus range with the reason and "biceps recover
 * quicker than back" is shown as two estimates.
 *
 * D204: it describes, it never tells anyone to train, rest or monitor
 * themselves. Facts are ink: no amber, warning, success or error colour. Pure
 * presentation: no I/O, never imports `../lib/database`.
 *
 * Props:
 *   card          nextInPlan.buildNextInPlanCard's result (never null here)
 *   nowMs         the loader's own "now", so every clause agrees
 *   weekByMuscle  muscleDetail.weekFigures' result, or null
 */
import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, radius, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { muscleDetailRows } from '../lib/recovery/muscleDetail';
import { MuscleDetail } from './MuscleRecoveryList';

/** The minimum touch target (docs/rules/styling.md: every interactive element at least 48 dp). */
const TARGET = 48;

export default function NextInPlanCard({ card, nowMs, weekByMuscle = null }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [openMuscle, setOpenMuscle] = useState(null);
  if (!card) return null;

  return (
    <View style={[styles.card, live.card]} testID="next-in-plan-card">
      <Text style={live.title} accessibilityRole="header">{card.title}</Text>
      {card.musclesLine ? <Text style={live.body}>{card.musclesLine}</Text> : null}
      {card.sessionLine ? <Text style={live.session}>{card.sessionLine}</Text> : null}
      {card.muscles.length > 0 ? (
        <View style={styles.lines}>
          {card.muscles.map((line) => {
            const expanded = openMuscle === line.muscle;
            return (
              <View key={line.muscle}>
                <TouchableOpacity
                  style={styles.line}
                  onPress={() => setOpenMuscle(expanded ? null : line.muscle)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={line.a11y}
                  accessibilityHint={expanded ? 'Hides the detail behind this estimate' : 'Shows the detail behind this estimate'}
                >
                  <View style={styles.lineTop}>
                    <Text style={[styles.name, live.name]}>{line.name}</Text>
                    <Text style={[styles.status, live.status]}>{line.text}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={t.colors.textMuted} />
                  </View>
                  {line.roleLine ? <Text style={live.meta}>{line.roleLine}</Text> : null}
                </TouchableOpacity>
                {expanded ? (
                  <MuscleDetail
                    lines={muscleDetailRows({
                      muscle: line.muscle,
                      entry: line.entry,
                      role: line.role,
                      week: weekByMuscle?.[line.muscle] ?? null,
                      nowMs,
                    })}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// The frozen block holds layout, spacing and radius only; every colour and type
// role is read live (buildLiveStyles below), the frozen-plus-live pattern the
// tree carries (docs/rules/styling.md).
const styles = StyleSheet.create({
  card: {
    padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1,
  },
  lines: { gap: spacing.xxs, marginTop: spacing.xs },
  line: { minHeight: TARGET, justifyContent: 'center', paddingVertical: spacing.xs, gap: spacing.xxs },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // A minimum, not a fixed width: a long muscle name or a larger text size grows the column (the estimate beside it shrinks), never clips mid-word.
  name: { minWidth: 88, flexShrink: 0 },
  status: { flex: 1 },
});

function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    title: { ...t.type.h3, color: t.colors.textPrimary },
    body: { ...t.type.bodySm, color: t.colors.textSecondary },
    session: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    status: { ...t.type.bodySm, color: t.colors.textSecondary },
    meta: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
