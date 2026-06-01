import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import Card from '../components/Card';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';
import { PROTEIN_APPROACHES } from '../lib/nutritionEngine';

// ─── Reasoning helpers ────────────────────────────────────────────────────────

function buildPhaseReason(prevPhase, nextPhase) {
  if (!prevPhase || prevPhase === nextPhase) return null;
  const moves = `${PHASE_LABELS[prevPhase] ?? prevPhase} → ${PHASE_LABELS[nextPhase] ?? nextPhase}`;
  if (prevPhase === 'cut' && nextPhase !== 'cut') {
    return `You're stepping out of a deficit. Calories rise so your body has the fuel to rebuild and train hard again.`;
  }
  if (prevPhase !== 'cut' && nextPhase === 'cut') {
    return `You're entering a controlled calorie deficit. Protein stays high to protect the muscle you've built while fat comes off.`;
  }
  if ((prevPhase === 'bulk' || prevPhase === 'lean_gain') && nextPhase === 'maintain') {
    return `You're moving to maintenance. Calories settle and the focus shifts to consistency and performance rather than weight change.`;
  }
  if (prevPhase === 'lean_gain' && nextPhase === 'bulk') {
    return `Bigger surplus for faster gains. Expect some fat to come with the muscle. That's the trade-off.`;
  }
  if (prevPhase === 'bulk' && nextPhase === 'lean_gain') {
    return `Pulling the surplus back so gains come on cleaner. Slower, but you stay in shape throughout.`;
  }
  if (nextPhase === 'recomp') {
    return `Eating around maintenance with a small protein lead. A slow process, but works well for beginners and people returning after a break.`;
  }
  return `Your nutrition targets adjust to match the new phase.`;
}

function buildGoalReason(prevGoal, nextGoal) {
  if (!prevGoal || prevGoal === nextGoal) return null;
  if (nextGoal === 'weak_point_spec') {
    return `Your plan will direct extra weekly volume toward the muscles you want to bring up, holding everything else at maintenance.`;
  }
  if (nextGoal === 'strength_hypertrophy') {
    return `Compounds get more sets in lower rep ranges. You'll see strength markers move alongside the size.`;
  }
  if (nextGoal === 'general_hypertrophy') {
    return `Balanced volume across all muscle groups for steady, all-round growth.`;
  }
  // Physique categories
  return `Your plan re-weights weekly volume toward the muscles judged in this category.`;
}

function buildKcalReason(prevKcal, nextKcal, nextPhase) {
  if (prevKcal == null || nextKcal == null) return null;
  const delta = nextKcal - prevKcal;
  if (Math.abs(delta) < 50) return `Your daily calories stay roughly the same.`;
  const direction = delta > 0 ? 'up' : 'down';
  const absDelta = Math.abs(delta);
  if (nextPhase === 'cut') {
    return `Calories come ${direction} by ${absDelta} kcal/day to set the deficit your new phase needs.`;
  }
  if (nextPhase === 'bulk' || nextPhase === 'lean_gain') {
    return `Calories go ${direction} by ${absDelta} kcal/day to fuel new muscle growth.`;
  }
  return `Calories shift ${direction} by ${absDelta} kcal/day to match your new phase.`;
}

function buildProteinApproachReason(prevApproach, nextApproach) {
  if (!prevApproach || prevApproach === nextApproach) return null;
  const next = PROTEIN_APPROACHES?.[nextApproach];
  if (!next) return null;
  return `Your protein approach moves to ${next.label}. ${next.description || ''}`.trim();
}

// ─── Row components ───────────────────────────────────────────────────────────

function ChangeCard({ icon, title, prev, next, reason, unchanged }) {
  return (
    <Card style={[styles.card, unchanged && styles.cardUnchanged]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={16} color={unchanged ? colors.textMuted : colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
        {unchanged && <Text style={styles.unchangedTag}>unchanged</Text>}
      </View>
      {unchanged ? (
        <Text style={styles.cardValue}>{next}</Text>
      ) : (
        <View style={styles.diffRow}>
          <Text style={styles.diffPrev}>{prev}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.textMuted} style={styles.diffArrow} />
          <Text style={styles.diffNext}>{next}</Text>
        </View>
      )}
      {!!reason && !unchanged && (
        <Text style={styles.cardReason}>{reason}</Text>
      )}
    </Card>
  );
}

function MacroRow({ label, prev, next, unit = 'g' }) {
  const delta = (next ?? 0) - (prev ?? 0);
  const changed = Math.abs(delta) >= 1;
  const sign = delta > 0 ? '+' : '';
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroValues}>
        {changed ? (
          <>
            <Text style={styles.macroPrev}>{prev ?? '-'}{unit}</Text>
            <Ionicons name="arrow-forward" size={11} color={colors.textMuted} style={{ marginHorizontal: spacing.xs }} />
            <Text style={styles.macroNext}>{next ?? '-'}{unit}</Text>
            <Text style={[styles.macroDelta, delta > 0 ? styles.macroDeltaUp : styles.macroDeltaDown]}>
              {' '}({sign}{delta}{unit})
            </Text>
          </>
        ) : (
          <Text style={styles.macroUnchanged}>{next ?? '-'}{unit}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GoalChangeSummaryScreen({ navigation, route }) {
  const { previous = {}, next = {}, planRerolled = false } = route.params || {};

  const goalChanged = previous.goal && next.goal && previous.goal !== next.goal;
  const phaseChanged = previous.phase && next.phase && previous.phase !== next.phase;
  const approachChanged = previous.approach && next.approach && previous.approach !== next.approach;

  const prevKcal = previous.kcal ?? null;
  const nextKcal = next.kcal ?? null;
  const kcalChanged = prevKcal != null && nextKcal != null && Math.abs(nextKcal - prevKcal) >= 50;

  const prevP = previous.protein ?? null;
  const nextP = next.protein ?? null;
  const prevC = previous.carbs ?? null;
  const nextC = next.carbs ?? null;
  const prevF = previous.fat ?? null;
  const nextF = next.fat ?? null;
  const macrosChanged =
    (prevP != null && nextP != null && Math.abs(nextP - prevP) >= 1) ||
    (prevC != null && nextC != null && Math.abs(nextC - prevC) >= 1) ||
    (prevF != null && nextF != null && Math.abs(nextF - prevF) >= 1);

  const anyChanged = goalChanged || phaseChanged || approachChanged || kcalChanged || macrosChanged;

  const phaseReason = buildPhaseReason(previous.phase, next.phase);
  const goalReason = buildGoalReason(previous.goal, next.goal);
  const kcalReason = buildKcalReason(prevKcal, nextKcal, next.phase);
  const approachReason = buildProteinApproachReason(previous.approach, next.approach);

  function handleDone() {
    // Pop summary off the stack and go back to You (the stack root)
    if (typeof navigation.popToTop === 'function') {
      navigation.popToTop();
    } else {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Here's what changed</Text>
        <TouchableOpacity onPress={handleDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Goals updated</Text>
            <Text style={styles.heroBody}>
              {anyChanged
                ? `Your plan and nutrition targets have been updated to match. Here's a breakdown of what shifted and why.`
                : `Nothing meaningful changed. Your plan and nutrition stay as they were.`}
            </Text>
          </View>
        </View>

        {(goalChanged || phaseChanged) && (
          <>
            <Text style={styles.sectionLabel}>Training</Text>
            {goalChanged && (
              <ChangeCard
                icon="trophy-outline"
                title="Physique goal"
                prev={GOAL_LABELS[previous.goal] ?? previous.goal}
                next={GOAL_LABELS[next.goal] ?? next.goal}
                reason={goalReason}
              />
            )}
            {phaseChanged && (
              <ChangeCard
                icon="speedometer-outline"
                title="Training phase"
                prev={PHASE_LABELS[previous.phase] ?? previous.phase}
                next={PHASE_LABELS[next.phase] ?? next.phase}
                reason={phaseReason}
              />
            )}
          </>
        )}

        {(kcalChanged || macrosChanged || approachChanged) && (
          <>
            <Text style={styles.sectionLabel}>Nutrition</Text>

            {kcalChanged && (
              <ChangeCard
                icon="flame-outline"
                title="Daily calories"
                prev={`${prevKcal.toLocaleString()} kcal`}
                next={`${nextKcal.toLocaleString()} kcal`}
                reason={kcalReason}
              />
            )}

            {(macrosChanged || (!kcalChanged && nextP != null)) && (
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
                  <Text style={styles.cardTitle}>Daily macros</Text>
                </View>
                <MacroRow label="Protein" prev={prevP} next={nextP} />
                <MacroRow label="Carbs"   prev={prevC} next={nextC} />
                <MacroRow label="Fat"     prev={prevF} next={nextF} />
                {!macrosChanged && (
                  <Text style={styles.cardReason}>Your macros stay where they are. The change you made does not shift them meaningfully.</Text>
                )}
              </Card>
            )}

            {approachChanged && (
              <ChangeCard
                icon="fitness-outline"
                title="Protein approach"
                prev={PROTEIN_APPROACHES?.[previous.approach]?.label ?? previous.approach}
                next={PROTEIN_APPROACHES?.[next.approach]?.label ?? next.approach}
                reason={approachReason}
              />
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>What happens next</Text>
        <View style={styles.nextCard}>
          <View style={styles.nextRow}>
            <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bullet} />
            <Text style={styles.nextText}>
              {planRerolled
                ? 'A fresh plan has been built for your new goal and is now your active plan. Your next session comes from it. Open Plans to see the full breakdown.'
                : 'Your goal is saved, but the training plan didn\'t reroll this time. Open Plans and tap "Build my plan" to retry.'}
            </Text>
          </View>
          <View style={styles.nextRow}>
            <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bullet} />
            <Text style={styles.nextText}>
              Nutrition targets in the You tab now reflect the updated numbers. Open Nutrition Targets to see the full breakdown.
            </Text>
          </View>
          {next.phase === 'cut' && (
            <View style={styles.nextRow}>
              <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bullet} />
              <Text style={styles.nextText}>
                If you stay in a deficit for more than eight weeks, Volyume will suggest a short diet break to support recovery and metabolic rate.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Got it</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...type.bodyStrong, color: colors.textPrimary },

  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  heroCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: withAlpha(colors.success, 0.251),
  },
  heroTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.xs },
  heroBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase',
    marginTop: spacing.md, marginBottom: -spacing.xs,
  },

  card: {
    gap: spacing.sm,
  },
  cardUnchanged: { opacity: 0.65 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { ...type.label, flex: 1, color: colors.textPrimary },
  unchangedTag: { fontSize: fontSize.micro, color: colors.textMuted, fontStyle: 'italic' },

  diffRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  diffPrev: { ...type.body, color: colors.textMuted, textDecorationLine: 'line-through' },
  diffArrow: { marginHorizontal: spacing.sm },
  diffNext: { ...type.bodyStrong, color: colors.primary },

  cardValue: { ...type.bodyStrong, color: colors.textPrimary },
  cardReason: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xxs },

  macroRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  macroLabel: { ...type.label, color: colors.textSecondary },
  macroValues: { flexDirection: 'row', alignItems: 'center' },
  macroPrev: { fontSize: fontSize.sm, color: colors.textMuted, textDecorationLine: 'line-through' },
  macroNext: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.bold },
  macroUnchanged: { ...type.label, color: colors.textPrimary },
  macroDelta: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  macroDeltaUp: { color: colors.primary },
  macroDeltaDown: { color: colors.warning },

  nextCard: {
    backgroundColor: colors.surface2, borderRadius: radius.lg, padding: spacing.lg,
    gap: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { marginTop: 7 },
  nextText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  doneBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
    marginTop: spacing.md,
  },
  doneBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background, letterSpacing: 0.4 },
});
