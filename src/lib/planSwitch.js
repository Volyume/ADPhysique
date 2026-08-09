
import { getActiveBlock } from './database';
import { appAlert } from '../components/AppAlert';
import { getBlockStatus } from './mesocycle';

// Asks the user to confirm before activating a new plan when the current
// training block has meaningful progress. `activatePlanWithBlock` always
// kicks off a fresh 6-week mesocycle, so switching at week 3 of 6 silently
// resets the RIR ladder and week structure, workout history and PRs are
// kept, but the block-level plan is lost.
//
// Returns true (proceed silently) when:
//   - no userId
//   - getActiveBlock throws or returns null
//   - the block is in week 1 (no real progress yet)
//   - the block is in recovery or completed_awaiting_decision (about to roll
//     over anyway; anything not 'active' passes)
//
// Otherwise shows an Alert and resolves to the user's choice.
export async function confirmPlanSwitchMidBlock(userId, opts = {}) {
  const { newPlanName, mode = 'switch' } = opts;
  if (!userId) return true;

  let block;
  try { block = await getActiveBlock(userId); }
  catch { return true; }
  if (!block) return true;

  const status = getBlockStatus(
    block.startDate ?? block.createdAt ?? Date.now(),
    // Wave 2 (2026-07-30): plannedWeeks is authoritative; durationWeeks is
    // kept in lockstep as a fallback only, never a hardcoded default (see
    // blockAdvisor.js's identical comment -- getBlockStatus no longer
    // accepts one).
    block.plannedWeeks ?? block.durationWeeks ?? 5,
  );

  if (status.currentWeek <= 1) return true;
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
