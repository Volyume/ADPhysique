import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from '../components/Card';
import Button from '../components/Button';
import SectionLabel from '../components/SectionLabel';
import ModalHeader from '../components/ModalHeader';
import { useState, useEffect, useMemo } from 'react';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';
import { PROTEIN_APPROACHES } from '../lib/nutritionEngine';
import { getOpenEdPatternFlag } from '../lib/database';
import useAppStore from '../store/useAppStore';

// ─── Reasoning helpers ────────────────────────────────────────────────────────

function buildPhaseReason(prevPhase, nextPhase) {
  if (!prevPhase || prevPhase === nextPhase) return null;
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
  // The legacy general_hypertrophy / strength_hypertrophy / weak_point_spec
  // values are migrated away (coachingGoals.migrateProfileGoals) before they
  // reach this screen, so only physique categories land here.
  return `Your plan re-weights weekly volume towards the muscles judged in this category.`;
}

function buildKcalReason(prevKcal, nextKcal, nextPhase) {
  if (prevKcal == null || nextKcal == null) return null;
  const delta = nextKcal - prevKcal;
  if (Math.abs(delta) < 50) return `Your daily calories stay roughly the same.`;
  const up = delta > 0;
  const direction = up ? 'up' : 'down';
  const absDelta = Math.abs(delta);
  if (nextPhase === 'cut') {
    // Reason must track the actual direction: a deeper cut goes down, a milder
    // cut goes up. Never imply a rise sets a bigger deficit.
    return up
      ? `Calories come up by ${absDelta} kcal/day for the smaller deficit your new phase needs.`
      : `Calories come down by ${absDelta} kcal/day to set the deficit your new phase needs.`;
  }
  if (nextPhase === 'bulk' || nextPhase === 'lean_gain') {
    // A rise fuels growth; a fall is a leaner, more controlled gain. Do not say
    // a calorie cut "fuels new muscle growth": that reads as contradictory.
    return up
      ? `Calories go up by ${absDelta} kcal/day to fuel new muscle growth.`
      : `Calories come down by ${absDelta} kcal/day for a leaner, more controlled gain.`;
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

// CP-10 batch G (2026-07-11): ChangeCard is a sibling function-component
// scope (rendered directly in JSX, not prop-drilled `live`/`t` from
// GoalChangeSummaryScreen), so its own useTheme() call is cleaner than
// threading two extra props through. Same shared buildLiveStyles(t) as the
// parent screen. Zero copy/logic change: style plumbing only.
function ChangeCard({ icon, title, prev, next, reason, unchanged }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <Card style={[styles.card, unchanged && styles.cardUnchanged]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={16} color={unchanged ? t.colors.textMuted : t.colors.primary} />
        <Text style={[styles.cardTitle, live.cardTitle]}>{title}</Text>
        {unchanged && <Text style={[styles.unchangedTag, live.unchangedTag]}>unchanged</Text>}
      </View>
      {unchanged ? (
        <Text style={[styles.cardValue, live.cardValue]}>{next}</Text>
      ) : (
        <View style={styles.diffRow}>
          <Text style={[styles.diffPrev, live.diffPrev]}>{prev}</Text>
          <Ionicons name="arrow-forward" size={14} color={t.colors.textMuted} style={styles.diffArrow} />
          <Text style={[styles.diffNext, live.diffNext]}>{next}</Text>
        </View>
      )}
      {!!reason && !unchanged && (
        <Text style={[styles.cardReason, live.cardReason]}>{reason}</Text>
      )}
    </Card>
  );
}

// CP-10 batch G (2026-07-11): same rationale as ChangeCard above -- its own
// useTheme() call rather than prop-drilling, same shared buildLiveStyles(t).
function MacroRow({ label, prev, next, unit = 'g' }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const delta = (next ?? 0) - (prev ?? 0);
  const changed = Math.abs(delta) >= 1;
  const sign = delta > 0 ? '+' : '';
  return (
    <View style={styles.macroRow}>
      <Text style={[styles.macroLabel, live.macroLabel]}>{label}</Text>
      <View style={styles.macroValues}>
        {changed ? (
          <>
            <Text style={[styles.macroPrev, live.macroPrev]}>{prev ?? '-'}{unit}</Text>
            <Ionicons name="arrow-forward" size={11} color={t.colors.textMuted} style={{ marginHorizontal: spacing.xs }} />
            <Text style={[styles.macroNext, live.macroNext]}>{next ?? '-'}{unit}</Text>
            <Text style={[styles.macroDelta, live.macroDelta, delta > 0 ? [styles.macroDeltaUp, live.macroDeltaUp] : [styles.macroDeltaDown, live.macroDeltaDown]]}>
              {' '}({sign}{delta}{unit})
            </Text>
          </>
        ) : (
          <Text style={[styles.macroUnchanged, live.macroUnchanged]}>{next ?? '-'}{unit}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GoalChangeSummaryScreen({ navigation, route }) {
  const { previous = {}, next = {}, planRerolled = false } = route.params || {};
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  // D7 (founder decision, 2026-07-03): the same ED-flag check
  // ProSetupCompleteScreen performs. Under an open flag (or an unknown flag
  // state, fail closed, matching that screen) the deficit-phase framing and
  // the eight-week diet-break notice give way to the neutral register; the
  // goal-change receipt itself stays honest. Tier-blind by construction.
  const [edFlagOpen, setEdFlagOpen] = useState(true); // closed until proven clear
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userId = useAppStore.getState().user?.id;
        const flag = userId ? await getOpenEdPatternFlag(userId) : null;
        if (!cancelled) setEdFlagOpen(!!flag);
      } catch (_) { /* unknown state stays closed */ }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const phaseReason = edFlagOpen
    ? (previous.phase && next.phase && previous.phase !== next.phase
      ? 'Your nutrition targets adjust to match the new phase.'
      : null)
    : buildPhaseReason(previous.phase, next.phase);
  const goalReason = buildGoalReason(previous.goal, next.goal);
  const kcalReason = edFlagOpen
    ? (kcalChanged ? 'Your daily calories adjust to match your goal.' : null)
    : buildKcalReason(prevKcal, nextKcal, next.phase);
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <ModalHeader title="Here's what changed" onClose={handleDone} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card tone="success" style={styles.heroCard}>
          <Ionicons name="checkmark-circle" size={28} color={t.colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, live.heroTitle]}>Goals updated</Text>
            <Text style={[styles.heroBody, live.heroBody]}>
              {anyChanged
                ? `Your plan and nutrition targets have been updated to match. Here's a breakdown of what shifted and why.`
                : `Nothing meaningful changed. Your plan and nutrition stay as they were.`}
            </Text>
          </View>
        </Card>

        {(goalChanged || phaseChanged) && (
          <>
            <SectionLabel style={styles.sectionLabelSpacing}>Training</SectionLabel>
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
            <SectionLabel style={styles.sectionLabelSpacing}>Nutrition</SectionLabel>

            {kcalChanged && (
              <ChangeCard
                icon="flame-outline"
                title="Daily calories"
                prev={`${prevKcal.toLocaleString('en-GB')} kcal`}
                next={`${nextKcal.toLocaleString('en-GB')} kcal`}
                reason={kcalReason}
              />
            )}

            {(macrosChanged || (!kcalChanged && nextP != null)) && (
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="restaurant-outline" size={16} color={t.colors.primary} />
                  <Text style={[styles.cardTitle, live.cardTitle]}>Daily macros</Text>
                </View>
                <MacroRow label="Protein" prev={prevP} next={nextP} />
                <MacroRow label="Carbs"   prev={prevC} next={nextC} />
                <MacroRow label="Fat"     prev={prevF} next={nextF} />
                {!macrosChanged && (
                  <Text style={[styles.cardReason, live.cardReason]}>Your macros stay where they are. The change you made does not shift them meaningfully.</Text>
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

        <SectionLabel style={styles.sectionLabelSpacing}>What happens next</SectionLabel>
        <Card style={[styles.nextCard, live.nextCard]}>
          <View style={styles.nextRow}>
            <Ionicons name="ellipse" size={6} color={t.colors.primary} style={styles.bullet} />
            <Text style={[styles.nextText, live.nextText]}>
              {planRerolled
                ? 'A fresh plan has been built for your new goal and is now your active plan. Your next session comes from it. Review the full plan from Train.'
                : 'Your goal is saved, but the training plan didn\'t rebuild this time. Open Train and choose "Start with a plan" to retry.'}
            </Text>
          </View>
          <View style={styles.nextRow}>
            <Ionicons name="ellipse" size={6} color={t.colors.primary} style={styles.bullet} />
            <Text style={[styles.nextText, live.nextText]}>
              Nutrition targets in the Coach tab now reflect the updated numbers. Open Nutrition Targets to see the full breakdown.
            </Text>
          </View>
          {next.phase === 'cut' && !edFlagOpen && (
            <View style={styles.nextRow}>
              <Ionicons name="ellipse" size={6} color={t.colors.primary} style={styles.bullet} />
              <Text style={[styles.nextText, live.nextText]}>
                If you stay in a deficit for more than eight weeks, Volyume will suggest a short diet break to support recovery and metabolic rate.
              </Text>
            </View>
          )}
        </Card>

        <Button title="Got it" onPress={handleDone} size="lg" style={styles.doneBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  heroCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
  },
  heroTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.xs },
  heroBody: { ...type.bodySm, color: colors.textSecondary },

  sectionLabelSpacing: { marginTop: spacing.md, marginBottom: -spacing.xs },

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
    backgroundColor: colors.surface2,
    gap: spacing.sm,
  },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { marginTop: 7 },
  nextText: { ...type.bodySm, flex: 1, color: colors.textSecondary },

  doneBtn: { marginTop: spacing.md },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this screen's three function-component scopes (the main screen,
// ChangeCard and MacroRow) so they can never drift out of step with each
// other or the frozen block. Pure layout keys (flex/gap/padding/opacity/
// fontWeight, no colour/fontSize/type token) are correctly omitted -- there
// is nothing to unfreeze for them. Same pattern as CardioHistoryScreen.js's
// buildLiveStyles (batch preceding this one).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    heroTitle: { ...t.type.title, color: t.colors.textPrimary },
    heroBody: { ...t.type.bodySm, color: t.colors.textSecondary },
    cardTitle: { ...t.type.label, color: t.colors.textPrimary },
    unchangedTag: { fontSize: t.fontSize.micro, color: t.colors.textMuted },
    diffPrev: { ...t.type.body, color: t.colors.textMuted },
    diffNext: { ...t.type.bodyStrong, color: t.colors.primary },
    cardValue: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    cardReason: { fontSize: t.fontSize.xs, color: t.colors.textSecondary },
    macroLabel: { ...t.type.label, color: t.colors.textSecondary },
    macroPrev: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    macroNext: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    macroUnchanged: { ...t.type.label, color: t.colors.textPrimary },
    macroDelta: { fontSize: t.fontSize.xs },
    macroDeltaUp: { color: t.colors.primary },
    macroDeltaDown: { color: t.colors.warning },
    nextCard: { backgroundColor: t.colors.surface2 },
    nextText: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
