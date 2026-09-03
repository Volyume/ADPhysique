/**
 * startWithPlan
 *
 * D139: the shared two-step behind every "Volyume builds you a plan" moment
 * that is NOT the Adjust-training screen -- the no-plan empty state on Today,
 * the same empty state on Train, and a goal/phase change on the Coach tab.
 *
 * Step 1 `prepareStartWithPlan` runs the capability pre-flight and the
 * READ-ONLY dry run, and returns everything PlanPreviewSheet needs to show
 * the athlete what would happen. It writes nothing: no programme, no routine,
 * no activation, no archive.
 *
 * Step 2 `commitStartWithPlan` is the real generation, run only after the
 * athlete confirms in the sheet.
 *
 * The deterministic engine is untouched by both: this changes WHEN and HOW a
 * generation is confirmed, never what it generates.
 *
 * Exported signatures:
 *   prepareStartWithPlan(userId, userProfile,
 *                        { mode = 'first', currentSessionLengthMinutes = null } = {})
 *     -> Promise<{ ok: boolean, reason?: string, error?: string,
 *                  preview: object|null, otherPlansCount: number }>
 *        `preview` is the generatePlanDryRun result plus { mode, diff,
 *        currentPlanName, receipt, thinSessions, blockedCount, blockStatus }.
 *        `otherPlansCount` is how many non-archived plans the athlete has
 *        today -- every one of them is archived by the commit.
 *        `reason` on a refusal: 'no_user' | 'preflight_hold' | 'dry_run_failed'.
 *
 *   commitStartWithPlan(userId, userProfile)
 *     -> Promise<generateAndSavePlan result>  (ok, programmeId, partial,
 *        missedCount, capabilityBlockedCount, structureMemory, ...)
 *
 *   readActivePlanSummary(userId, sessionLengthMinutes)
 *     -> Promise<planDiff summary + { planName }|null>  the current active
 *        plan, normalised for diffPlans. Null when there is no active plan or
 *        the read fails.
 */

import {
  getActivePlan, getRoutinesForPlan, getRoutineExercisesWithDetails, getAllPlansForUser,
} from './database';
import { generatePlanDryRun, generateAndSavePlan, thinSessionReport } from './planAutoGen';
import { capabilityPreflight, offerCapabilityPreflightChoice } from './capability/preflight';
import { diffPlans, summariseProspectivePlan, summariseCurrentPlan } from './planDiff';
import { buildChangeReceipt } from './planRationale';
import { readActiveBlockStatus } from './planSwitch';
import { logError } from './errorLog';

/**
 * Read the current active plan into a comparable summary (NA-coaching-13:
 * getActivePlan -> getRoutinesForPlan -> getRoutineExercisesWithDetails).
 * Returns null when there is no active plan or the read fails; the preview
 * then shows the prospective plan on its own instead of a diff.
 */
export async function readActivePlanSummary(userId, sessionLengthMinutes = null) {
  try {
    const active = await getActivePlan(userId);
    if (!active?.id) return null;
    const routines = await getRoutinesForPlan(active.id);
    const withExercises = [];
    for (const r of (routines || [])) {
      const rows = await getRoutineExercisesWithDetails(r.id).catch(() => []);
      withExercises.push({ ...r, exercises: (rows || []).map(x => ({ name: x?.exercise?.name })) });
    }
    // planName rides along so a preview can name the plan it would replace.
    // summariseCurrentPlan itself stays byte-identical (its shape is pinned).
    return { ...summariseCurrentPlan(withExercises, sessionLengthMinutes), planName: active.name ?? null };
  } catch (_) {
    return null;
  }
}

export async function prepareStartWithPlan(userId, userProfile, {
  mode = 'first',
  // The session length the CURRENT plan was built at. It is a separate input
  // because `userProfile` here is the PROSPECTIVE profile: summarising the
  // existing plan with the new length would make the diff's "Now" column
  // report a change the athlete never made. Left null when unknown, which
  // renders as "-" rather than as a wrong number.
  currentSessionLengthMinutes = null,
} = {}) {
  if (!userId) return { ok: false, reason: 'no_user', preview: null, otherPlansCount: 0 };

  // CC27 (section 9.6) red-team finding 1: the pre-flight runs before the
  // generator on every generation surface. Holding leaves the athlete where
  // they were, with nothing written.
  const preflight = await capabilityPreflight(userId);
  if (!preflight.proceed) {
    const goAhead = await new Promise((resolve) => {
      offerCapabilityPreflightChoice({
        onHold: () => resolve(false),
        onContinue: () => resolve(true),
      });
    });
    if (!goAhead) return { ok: false, reason: 'preflight_hold', preview: null, otherPlansCount: 0 };
  }

  let dry;
  try {
    dry = await generatePlanDryRun(userId, userProfile);
  } catch (e) {
    logError('startWithPlan.prepare', e, { userId });
    return { ok: false, reason: 'dry_run_failed', error: e?.message ?? 'unknown', preview: null, otherPlansCount: 0 };
  }
  if (!dry?.ok) {
    return { ok: false, reason: 'dry_run_failed', error: dry?.error ?? 'unknown', preview: null, otherPlansCount: 0 };
  }

  // Everything below is read-only and best effort: a preview that loses one
  // of these facts still previews the plan, it just says less.
  const [plans, blockStatus, nowSummary] = await Promise.all([
    getAllPlansForUser(userId).catch(() => []),
    readActiveBlockStatus(userId).catch(() => null),
    readActivePlanSummary(userId, currentSessionLengthMinutes),
  ]);

  // C9 cosmetic patch: hand the summariser the dry run's own blocked list so
  // the preview never names an exercise the athlete set aside as though it
  // were about to be prescribed.
  const afterSummary = summariseProspectivePlan(dry.plan, dry.sessionLengthMinutes, {
    blockedSlots: dry.blockedSlots ?? null,
  });

  const preview = {
    ...dry,
    mode,
    diff: nowSummary ? diffPlans(nowSummary, afterSummary) : null,
    currentPlanName: nowSummary?.planName ?? null,
    blockedCount: afterSummary.blockedCount ?? 0,
    thinSessions: thinSessionReport(dry.plan, dry.blockedSlots ?? []),
    // C16 jobs 5 and 11: the reason-coded receipt, built from the SAME
    // continuity decisions the commit will act on.
    receipt: dry.continuity?.decisions?.length
      ? buildChangeReceipt(dry.continuity.decisions)
      : null,
    blockStatus,
  };

  return { ok: true, preview, otherPlansCount: Array.isArray(plans) ? plans.length : 0 };
}

export async function commitStartWithPlan(userId, userProfile) {
  return generateAndSavePlan(userId, userProfile);
}
