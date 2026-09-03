
import { getActiveBlock } from './database';
import { appAlert } from '../components/AppAlert';
import { getBlockStatus } from './mesocycle';
import { BLOCK_START_SENTENCE, ACTIVATION_MEANING_SENTENCE } from './blockExplain';

/**
 * D139: the athlete's block position, read exactly the way the mid-block
 * confirm below reads it, so a plan preview and the dialogue that follows it
 * can never disagree about which week the block is in. Returns null when
 * there is no user, no active block, or the read fails.
 *
 * @returns {Promise<{status: string, currentWeek: number, totalWeeks: number}|null>}
 */
export async function readActiveBlockStatus(userId) {
  if (!userId) return null;
  let block;
  try { block = await getActiveBlock(userId); }
  catch { return null; }
  if (!block) return null;
  return getBlockStatus(
    block.startDate ?? block.createdAt ?? Date.now(),
    // Wave 2 (2026-07-30): plannedWeeks is authoritative; durationWeeks is
    // kept in lockstep as a fallback only, never a hardcoded default (see
    // blockAdvisor.js's identical comment -- getBlockStatus no longer
    // accepts one).
    block.plannedWeeks ?? block.durationWeeks ?? 5,
  );
}

// Asks the user to confirm before activating a new plan when the current
// training block has meaningful progress. `activatePlanWithBlock` always
// kicks off a fresh 6-week mesocycle, so switching at week 3 of 6 silently
// resets the RIR ladder and week structure, workout history and PRs are
// kept, but the block-level plan is lost.
//
// Returns true (proceed silently) when:
//   - no userId
//   - getActiveBlock throws or returns null
//   - the block is in recovery or completed_awaiting_decision (about to roll
//     over anyway; anything not 'active' passes)
//
// D139: week 1 no longer passes silently. With a block in week 1 the athlete
// gets the first-activation dialogue PlansScreen writes ("Make this your
// active plan?"), so no plan is ever replaced without an explicit yes.
//
// Otherwise shows an Alert and resolves to the user's choice.
export async function confirmPlanSwitchMidBlock(userId, opts = {}) {
  const { newPlanName, mode = 'switch' } = opts;
  if (!userId) return true;

  const status = await readActiveBlockStatus(userId);
  if (!status) return true;

  // D139: week 1 used to pass SILENTLY, so the one moment where a plan is
  // replaced with nothing yet lost was also the one moment nothing was said.
  // Silence is now reserved for "there is no block at all" (handled above);
  // in week 1 the athlete gets the same first-activation dialogue PlansScreen
  // shows, in the same wording, so activation is always an explicit choice.
  if (status.currentWeek <= 1) {
    return new Promise(resolve => {
      appAlert(
        'Make this your active plan?',
        `${BLOCK_START_SENTENCE} ${ACTIVATION_MEANING_SENTENCE}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Set as active', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }
  // C6 P9-07 (D97): the old blanket "anything not 'active' passes" was
  // justified as "about to roll over anyway" - but nothing rolls over on
  // its own (no automatic transitions), so a switch during the recovery
  // week or the open decision window silently dropped the pending
  // decision. Those two states now get their own honest dialogue; the
  // block's evidence itself survives either way (the P9-01 backfill
  // judges switched-away finished blocks when history is next read).
  if (status.status === 'in_recovery' || status.status === 'completed_awaiting_decision') {
    const stateBody = status.status === 'in_recovery'
      ? `You're in your recovery week. Switching now starts a new block today${newPlanName ? ` on "${newPlanName}"` : ''}, and this block's results will still appear under Past blocks. Your workout history and PRs are kept.`
      : `Your finished block's decision is still open. Switching now starts a new block today${newPlanName ? ` on "${newPlanName}"` : ''} instead; what this block showed stays available under Past blocks. Your workout history and PRs are kept.`;
    return new Promise(resolve => {
      appAlert(
        status.status === 'in_recovery' ? 'Switch during your recovery week?' : 'Skip the open block decision?',
        stateBody,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Switch plan', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }
  if (status.status !== 'active') return true;

  const body =
    `You're in week ${status.currentWeek} of ${status.totalWeeks} of your current block. ` +
    (mode === 'rebuild'
      ? 'Re-running the wizard creates a new plan and starts a fresh block from week 1.'
      : `Activating ${newPlanName ? `"${newPlanName}"` : 'this plan'} starts a fresh block from week 1.`) +
    ' Your workout history and PRs are kept.';

  return new Promise(resolve => {
    appAlert(
      'Restart your training block?',
      body,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Switch plan', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
