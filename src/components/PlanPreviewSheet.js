/**
 * PlanPreviewSheet
 *
 * The one "here is what will happen before it happens" sheet for every plan
 * generation in the app (D139). It is the preview sheet PlanUpdateScreen used
 * to render inline, lifted out so the three other high-stakes generation
 * moments (first plan from Today, first plan from Plans, and a goal/phase
 * change) show the SAME facts in the SAME order instead of committing
 * silently.
 *
 * It renders only. It never generates, saves, activates or archives anything:
 * the caller runs the dry run, hands the result in, and commits on `onConfirm`.
 *
 * Props:
 *   visible          - boolean, drives the shared BottomSheet
 *   preview          - the dry-run result (generatePlanDryRun) plus:
 *                        mode        'first' | 'rebuild' | 'goal'
 *                        diff        planDiff.diffPlans view-model (rebuild/goal)
 *                        receipt     planRationale.buildChangeReceipt output
 *                        thinSessions planAutoGen.thinSessionReport output
 *                        fit         planFit assessment, already filtered by
 *                                    the caller to the states worth surfacing
 *                        blockStatus { currentWeek, totalWeeks, status } from
 *                                    planSwitch.readActiveBlockStatus, or null
 *                        keepBlock   boolean (D140): the caller's ruling from
 *                                    planDiff.keepsBlockOnRebuild; when true
 *                                    the sheet says the block carries on
 *                                    instead of restarting
 *   currentPlanName  - the plan being replaced, when there is one
 *   otherPlansCount  - how many other non-archived plans the athlete has
 *   confirmLabel     - the confirm button's title
 *   onConfirm        - commit handler
 *   onClose          - dismiss handler ("Not yet", backdrop, back button)
 *   busy             - true while the commit runs; locks both controls
 */

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import Button from './Button';
import useTheme from '../hooks/useTheme';
import { colors, fontSize, fontWeight, spacing, radius, type, letterSpacing, fontFamily } from '../styles/theme';
import { planShortfallNote } from '../lib/planAutoGen';
import { fitCopy, alternativeCopy } from '../lib/planFit';
import { demandLabel } from '../lib/capability/model';
import { structureMemoryCopy } from '../lib/programmeStructureMemory';
import { splitLabel } from '../lib/planDiff';
import { BLOCK_START_SENTENCE, blockRestartSentence, blockKeptSentence } from '../lib/blockExplain';
import { track } from '../lib/telemetry';

// D139: the three disclosures every confirm-before-commit moment owes the
// athlete, in plain words. They are constants so the same sentence reaches
// every generation surface, and so a test can pin the wording.
export function blockRestartLine(blockStatus) {
  // A block that is over and waiting on its decision is not "running": saying
  // confirming ends it would be false, and planSwitch already gives that state
  // its own dialogue.
  if (!blockStatus || blockStatus.status === 'completed_awaiting_decision') return null;
  if (!blockStatus.currentWeek || !blockStatus.totalWeeks) return null;
  return blockRestartSentence(blockStatus.currentWeek, blockStatus.totalWeeks);
}

// D140 (founder decision 2026-09-03): the line for a rebuild that keeps
// every exercise. The block carries on, so neither the "starts a block"
// sentence nor the restart line is true; this replaces both. Null whenever
// the block is not genuinely running, which is the same set of states
// planDiff.keepsBlockOnRebuild refuses to keep.
export function blockKeptLine(blockStatus) {
  if (!blockStatus || !blockStatus.currentWeek || !blockStatus.totalWeeks) return null;
  if (blockStatus.status !== 'active' && blockStatus.status !== 'recovery') return null;
  return blockKeptSentence(blockStatus.currentWeek, blockStatus.totalWeeks);
}

export function otherPlansLine(n) {
  if (!n || n < 1) return null;
  return n === 1
    ? 'Your other plan moves to Archived plans on the Train tab. Nothing is deleted.'
    : `Your other ${n} plans move to Archived plans on the Train tab. Nothing is deleted.`;
}

// No per-routine "the athlete edited this by hand" marker exists in the
// schema, so this is stated generally on the two paths that replace an
// existing plan rather than claimed about specific workouts.
export const HAND_EDITS_LINE =
  'Set, rep and note changes you made to the current workouts are not carried over.';

export default function PlanPreviewSheet({
  visible,
  preview,
  currentPlanName = null,
  otherPlansCount = 0,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
  busy = false,
  userId = null,
  source = null,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);

  // Programme funnel telemetry (D139): shown once per open, then confirmed or
  // dismissed. `source` is the surface enum ('home' | 'plans' | 'update' |
  // 'goal'); it falls back to the preview mode. Counts and enums only.
  const shownRef = useRef(false);
  const srcName = source ?? preview?.mode ?? 'unknown';
  useEffect(() => {
    if (!visible || !preview) { shownRef.current = false; return; }
    if (shownRef.current || !userId) return;
    shownRef.current = true;
    track(userId, 'plan_preview_shown', { source: srcName }).catch(() => {});
  }, [visible, preview, userId, srcName]);
  const confirm = () => {
    if (userId) track(userId, 'plan_preview_confirmed', { source: srcName }).catch(() => {});
    onConfirm?.();
  };
  const dismiss = () => {
    if (busy) return;
    if (userId) track(userId, 'plan_preview_dismissed', { source: srcName }).catch(() => {});
    onClose?.();
  };

  if (!preview) return null;

  const mode = preview.mode ?? 'rebuild';
  const isFirst = mode === 'first';
  const diff = preview.diff ?? null;
  const receipt = preview.receipt ?? null;
  const workouts = Array.isArray(preview.plan?.workouts) ? preview.plan.workouts : [];
  const memoryLine = preview.structureMemory
    ? structureMemoryCopy(preview.structureMemory, splitLabel(preview.plan?.splitType))
    : null;
  const blockLine = blockRestartLine(preview.blockStatus);
  const keptLine = preview.keepBlock ? blockKeptLine(preview.blockStatus) : null;
  const plansLine = otherPlansLine(otherPlansCount);

  return (
    <BottomSheet
      visible={visible}
      onClose={dismiss}
      accessibilityLabel={isFirst ? 'New plan preview' : 'Plan changes preview'}
      scroll
      contentContainerStyle={styles.diffSheetContent}
    >
      <Text style={[styles.diffTitle, live.diffTitle]}>
        {isFirst ? 'Before you start' : 'Before you rebuild'}
      </Text>

      {/* CAMPAIGN 18 JOB C, moved forward (D139): when the athlete's OWN
          completed blocks shaped the structure, say so BEFORE they confirm,
          not in a receipt toast afterwards. */}
      {memoryLine ? (
        <Text style={[styles.diffSub, live.diffSub]}>{memoryLine}</Text>
      ) : null}

      {isFirst ? (
        // First plan: there is nothing to diff against, so the sheet shows
        // the plan that is about to be built, in the same facts the diff
        // table uses for a rebuild.
        <>
          <Text style={[styles.diffSub, live.diffSub]}>
            Here's the plan Volyume would build from your setup. Nothing is saved until you confirm.
          </Text>
          <View style={[styles.diffTable, live.diffTable]}>
            <SummaryRow live={live} label="Training days" value={String(workouts.length)} />
            <SummaryRow live={live} label="Split" value={splitLabel(preview.plan?.splitType) ?? '-'} />
            <SummaryRow
              live={live}
              label="Session length"
              value={preview.sessionLengthMinutes != null ? `${preview.sessionLengthMinutes} min` : '-'}
            />
          </View>
          {workouts.length > 0 ? (
            <View style={styles.diffMoves}>
              <Text style={[styles.diffMovesLabel, live.diffMovesLabel]}>Your week</Text>
              {workouts.map((w, i) => {
                const count = Array.isArray(w?.exercises) ? w.exercises.length : 0;
                return (
                  <Text key={`w-${w?.name ?? 'session'}-${i}`} style={[styles.diffMoveText, live.diffMoveText]}>
                    {w?.name ?? `Session ${i + 1}`}: {count} {count === 1 ? 'exercise' : 'exercises'}
                  </Text>
                );
              })}
            </View>
          ) : null}
        </>
      ) : diff?.identical ? (
        <Text style={[styles.diffSub, live.diffSub]}>
          Your training days, split and moves already match this setup. Rebuilding refreshes your sets and volume.
        </Text>
      ) : diff ? (
        <>
          <Text style={[styles.diffSub, live.diffSub]}>
            Here's what changes. Your current plan stays until you confirm.
          </Text>
          <View style={[styles.diffTable, live.diffTable]}>
            <View style={[styles.diffHeadRow, live.diffHeadRow]}>
              <Text style={[styles.diffCell, live.diffCell, styles.diffCellLabel, live.diffCellLabel]} />
              <Text style={[styles.diffCell, live.diffCell, styles.diffHeadText, live.diffHeadText]}>Now</Text>
              <Text style={[styles.diffCell, live.diffCell, styles.diffHeadText, live.diffHeadText]}>After</Text>
            </View>
            <DiffRow live={live} label="Training days" now={diff.days.now} after={diff.days.after} changed={diff.days.changed} />
            <DiffRow live={live} label="Split" now={diff.split.now ?? '-'} after={diff.split.after ?? '-'} changed={diff.split.changed} />
            <DiffRow
              live={live}
              label="Session length"
              now={diff.sessionLength.now != null ? `${diff.sessionLength.now} min` : '-'}
              after={diff.sessionLength.after != null ? `${diff.sessionLength.after} min` : '-'}
              changed={diff.sessionLength.changed}
            />
          </View>
          {/* C16 job 11 (completion pass): the change receipt, built
              from the reasons the continuity engine actually recorded.
              WHAT STAYED is a section in its own right, not the
              leftovers, and every line carries the why. The generic
              Added/Dropped list below is the fallback for a rebuild
              that produced no decision record (a first plan, or an
              engine path that did not run continuity). */}
          {receipt ? (
            <View style={styles.diffMoves}>
              <Text style={[styles.diffMovesLabel, live.diffMovesLabel]}>
                {receipt.headline}
              </Text>
              {receipt.stays.length > 0 ? (
                <>
                  <Text style={[styles.diffReceiptHead, live.diffReceiptHead]}>What stays</Text>
                  {/* Round 6 (R6-5): the rep-target change renders
                      on the line it belongs to - the headline's
                      count needs a section, and this renderer had
                      none (PlansScreen already renders it). Keys
                      are identity + index (R5-3's law; two rows of
                      one deliberately twice-programmed lift share
                      an id). */}
                  {receipt.stays.map((l, i) => (
                    <Text key={`stay-${l.exerciseId ?? l.exerciseName}-${i}`} style={[styles.diffMoveText, live.diffMoveText]}>
                      {l.exerciseName}{l.why ? ` - ${l.why}` : ''}
                      {l.prescriptionCopy ? ` ${l.prescriptionCopy}` : ''}
                    </Text>
                  ))}
                </>
              ) : null}
              {receipt.changes.length > 0 ? (
                <>
                  <Text style={[styles.diffReceiptHead, live.diffReceiptHead]}>What changes</Text>
                  {receipt.changes.map((l, i) => (
                    <Text key={`chg-${l.exerciseId ?? l.exerciseName}-${i}`} style={[styles.diffMoveText, live.diffMoveText]}>
                      {l.previousExerciseName ? `${l.previousExerciseName} to ` : ''}{l.exerciseName}
                      {l.why ? ` - ${l.why}` : ''}
                    </Text>
                  ))}
                </>
              ) : null}
              {receipt.added.length > 0 ? (
                <>
                  <Text style={[styles.diffReceiptHead, live.diffReceiptHead]}>New in your plan</Text>
                  {receipt.added.map((l, i) => (
                    <Text key={`new-${l.exerciseId ?? l.exerciseName}-${i}`} style={[styles.diffMoveText, live.diffMoveText]}>
                      {l.exerciseName}{l.why ? ` - ${l.why}` : ''}
                    </Text>
                  ))}
                </>
              ) : null}
              {(receipt.noLongerIn?.length ?? 0) > 0 ? (
                // CC33 round 4 (Q2): the receipt's completeness
                // section. An incumbent that matched no rebuilt
                // slot used to vanish with no line anywhere -
                // every custom exercise on most muscles, on every
                // rebuild. Silence is the one outcome a change
                // receipt may never have.
                <>
                  <Text style={[styles.diffReceiptHead, live.diffReceiptHead]}>No longer in your plan</Text>
                  {/* Keys are the exercise's ID (round 5, R5-3):
                      one exercise on two days used to render two
                      identical name keys, and names are not
                      unique across custom and library lifts. */}
                  {receipt.noLongerIn.map((l, i) => (
                    <Text key={`gone-${l.previousExerciseId ?? i}`} style={[styles.diffMoveText, live.diffMoveText]}>
                      {l.exerciseName}{l.why ? ` - ${l.why}` : ''}
                    </Text>
                  ))}
                </>
              ) : null}
            </View>
          ) : (diff.movesAdded.length > 0 || diff.movesDropped.length > 0) ? (
            <View style={styles.diffMoves}>
              <Text style={[styles.diffMovesLabel, live.diffMovesLabel]}>Moves changed</Text>
              {diff.movesAdded.map(m => (
                <Text key={`add-${m}`} style={[styles.diffMoveText, live.diffMoveText]}>Added: {m}</Text>
              ))}
              {diff.movesDropped.map(m => (
                <Text key={`drop-${m}`} style={[styles.diffMoveText, live.diffMoveText]}>Dropped: {m}</Text>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {preview.partial ? (
        <Text style={[styles.diffShortfall, live.diffShortfall]}>{planShortfallNote(preview.missedCount)}</Text>
      ) : null}
      {/* C9 cosmetic patch: a slot whose candidates the user has
          set aside shows its real state instead of naming the
          exercise. Resolving it stays the job of the existing
          conflict flow; nothing is chosen or restored here. */}
      {/* CC27 (section 33.14): a session losing over a third of
          its slots to capability constraints says so up front,
          with the honest way forward - never a quiet husk. */}
      {preview.thinSessions?.length ? (
        <View style={styles.thinSessionBanner}>
          <Text style={[styles.diffShortfall, live.diffShortfall]}>
            {preview.thinSessions.map(ts => `${ts.workoutName} is unusually reduced: ${ts.omitted} of ${ts.requested} exercises have no match inside how you train.`).join(' ')}
            {' '}You can pick replacements yourself, create a custom exercise, or keep the reduced session. Volyume will not add lower-quality work to hit a number.
          </Text>
        </View>
      ) : null}
      {/* CC27 (section 33.11): near misses - movements held back
          only because an axis is UNKNOWN, each naming that axis,
          so the way forward is actionable rather than a wall. */}
      {preview.capabilityNearMisses ? (
        Object.entries(preview.capabilityNearMisses).map(([muscle, list]) => (
          <View key={muscle}>
            {list.map(nm => (
              <Text key={nm.exerciseId} style={[styles.diffShortfall, live.diffShortfall]}>
                {nm.name}: Volyume doesn't know yet whether this involves {nm.unknownAxes.map(a => demandLabel(a).toLowerCase()).join(', ')}. You can still add it yourself.
              </Text>
            ))}
          </View>
        ))
      ) : null}
      {preview.blockedCount > 0 ? (
        (() => {
          const capabilityCount = preview.capabilityBlockedCount ?? 0;
          const intentCount = Math.max(0, preview.blockedCount - capabilityCount);
          return (
            <Text style={[styles.diffShortfall, live.diffShortfall]}>
              {intentCount > 0
                ? `${intentCount === 1 ? 'One slot' : `${intentCount} slots`} would normally use exercises you have set aside. `
                : ''}
              {capabilityCount > 0
                ? `${capabilityCount === 1 ? 'One slot has' : `${capabilityCount} slots have`} no match inside how you train.`
                : ''}
            </Text>
          );
        })()
      ) : null}
      {/* Schedule fit, from the shared resolver. The caller decides whether
          the fit is worth surfacing at all (only the two states that mean
          the week cannot carry the plan comfortably); telling someone their
          week works every single time they rebuild is noise, not guidance. */}
      {preview.fit ? (
        <View style={styles.diffMoves}>
          <Text style={[styles.diffMovesLabel, live.diffMovesLabel]}>
            {fitCopy(preview.fit.state, preview.fit).title}
          </Text>
          <Text style={[styles.diffShortfall, live.diffShortfall]}>
            {fitCopy(preview.fit.state, preview.fit).body}
          </Text>
          {(preview.fit.alternatives ?? []).map((alt) => (
            <Text
              key={`${alt.kind}-${alt.daysPerWeek}-${alt.sessionLengthMinutes}`}
              style={[styles.diffMoveText, live.diffMoveText]}
            >
              {alternativeCopy(alt).label}: {alternativeCopy(alt).detail}
            </Text>
          ))}
        </View>
      ) : null}

      {/* D139: the plain consequences, always shown, never inferred from the
          diff above. What a block is, what confirming does to the block in
          progress, where the plans being replaced go, and what does not
          travel with a rebuild. */}
      <View style={styles.consequences}>
        <Text style={[styles.diffShortfall, live.diffShortfall]}>
          {keptLine ?? `${BLOCK_START_SENTENCE}${blockLine ? ` ${blockLine}` : ''}`}
        </Text>
        {plansLine ? (
          <Text style={[styles.diffShortfall, live.diffShortfall]}>{plansLine}</Text>
        ) : null}
        {!isFirst ? (
          <Text style={[styles.diffShortfall, live.diffShortfall]}>{HAND_EDITS_LINE}</Text>
        ) : null}
        {!isFirst && currentPlanName ? (
          <Text style={[styles.diffShortfall, live.diffShortfall]}>
            {`This replaces "${currentPlanName}".`}
          </Text>
        ) : null}
      </View>

      <Button
        title={confirmLabel}
        onPress={confirm}
        loading={busy}
        disabled={busy}
        accessibilityLabel={confirmLabel}
        style={styles.saveBtn}
      />
      <Button
        title="Not yet"
        variant="tertiary"
        style={styles.diffBackBtn}
        textStyle={[styles.diffBackText, live.diffBackText]}
        onPress={dismiss}
        disabled={busy}
        accessibilityLabel="Not yet"
      />
    </BottomSheet>
  );
}

// One Now/After row in the diff table. Class-neutral: a changed row is emphasised
// by weight, not a valence colour (a plan change is neither good nor bad).
// CP-10 batch G (2026-07-11): rendered directly by the parent (not a list
// row), so `live` is passed as a plain prop from the one component-level
// useTheme() call rather than a second useTheme() call here.
function DiffRow({ label, now, after, changed, live }) {
  const fmt = (v) => (v == null ? '-' : String(v));
  return (
    <View style={[styles.diffRow, live.diffRow]}>
      <Text style={[styles.diffCell, live.diffCell, styles.diffCellLabel, live.diffCellLabel]}>{label}</Text>
      <Text style={[styles.diffCell, live.diffCell, styles.diffNow, live.diffNow]}>{fmt(now)}</Text>
      <Text style={[styles.diffCell, live.diffCell, styles.diffAfter, live.diffAfter, changed && styles.diffAfterChanged]}>{fmt(after)}</Text>
    </View>
  );
}

// The first-plan twin of DiffRow: one fact per row, with no "Now" column to
// compare against, because there is no current plan.
function SummaryRow({ label, value, live }) {
  return (
    <View style={[styles.diffRow, live.diffRow]}>
      <Text style={[styles.diffCell, live.diffCell, styles.diffCellLabel, live.diffCellLabel]}>{label}</Text>
      <Text style={[styles.diffCell, live.diffCell, styles.diffAfter, live.diffAfter]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  saveBtn: { marginTop: spacing.xxl },

  diffTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  diffSub: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xs },
  diffTable: { marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  diffHeadRow: { flexDirection: 'row', backgroundColor: colors.surface2, paddingVertical: spacing.xs },
  diffRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle, alignItems: 'center' },
  diffCell: { flex: 1, paddingHorizontal: spacing.sm, fontSize: fontSize.sm, color: colors.textPrimary },
  diffCellLabel: { color: colors.textSecondary },
  diffHeadText: { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.textMuted, textTransform: 'uppercase' },
  diffNow: { color: colors.textMuted },
  diffAfter: { color: colors.textPrimary },
  diffAfterChanged: { fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  diffMoves: { marginTop: spacing.md, gap: spacing.xxs },
  diffMovesLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: letterSpacing.overline },
  diffReceiptHead: { color: colors.textPrimary, fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, marginTop: spacing.sm, marginBottom: spacing.xxs },
  diffMoveText: { color: colors.textPrimary, fontSize: fontSize.sm },
  diffShortfall: { ...type.bodySm, marginTop: spacing.md, color: colors.textSecondary },
  thinSessionBanner: { marginTop: spacing.sm },
  consequences: { marginTop: spacing.xs },
  diffBackBtn: { marginTop: spacing.sm },
  diffBackText: { color: colors.textSecondary, ...type.bodyStrong },
  diffSheetContent: { gap: spacing.md },
});

// CP-10 batch G (2026-07-11) pattern, carried over with the sheet: this
// mirrors ONLY the colour/fontSize/type-bearing sub-properties of the
// matching frozen style, at identical rest values, so the sheet carries no
// static island under a live theme toggle.
function buildLiveStyles(t) {
  return {
    diffTitle: { color: t.colors.textPrimary, fontSize: t.fontSize.lg },
    diffSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    diffTable: { borderColor: t.colors.border },
    diffHeadRow: { backgroundColor: t.colors.surface2 },
    diffRow: { borderTopColor: t.colors.borderSubtle },
    diffCell: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    diffCellLabel: { color: t.colors.textSecondary },
    diffHeadText: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    diffNow: { color: t.colors.textMuted },
    diffAfter: { color: t.colors.textPrimary },
    diffMovesLabel: { color: t.colors.textSecondary, fontSize: t.fontSize.xs },
    diffReceiptHead: { color: t.colors.textPrimary, fontSize: t.fontSize.sm },
    diffMoveText: { color: t.colors.textPrimary, fontSize: t.fontSize.sm },
    diffShortfall: { ...t.type.bodySm, color: t.colors.textSecondary },
    diffBackText: { color: t.colors.textSecondary, ...t.type.bodyStrong },
  };
}
