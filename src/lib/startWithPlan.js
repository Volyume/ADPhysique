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
  getLibraryPlans, copyPlanFromLibrary, activatePlanWithBlock,
} from './database';
import { getPlanDays } from './onboarding/freeStarter';
import { planHeadingName } from './planDisplay';
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


/* ────────────────────────────────────────────────────────────────────────────
 * F-16 REVISED: the LIBRARY route for kettlebell-only and band-only kit.
 *
 * Authority: the F-16 REVISED ruling in
 * docs/final-certification-2026-09-05/07-FINDINGS.md, on the evidence of the
 * "F-16 INVESTIGATION" appendix in
 * docs/final-certification-2026-09-05/04-TRAINING-STYLES.md. That
 * investigation measured the real generator against the real corpus and
 * found it is NOT ready for either kit:
 *   - kettlebells blended with bodyweight generate ZERO kettlebell
 *     exercises (only 2 COMMON-tier kettlebell rows exist, so bodyweight
 *     wins every slot); kept pure, `shoulders` sits at zero planned sets
 *     because the corpus carries no kettlebell shoulder-isolation row;
 *   - every band exercise is already selectable inside the shipped
 *     `bodyweight` option (PROFILES_BY_CATEGORY.band = ['bodyweight']), so a
 *     `bands` profile would generate a plan identical to a bodyweight one.
 * So answering "Kettlebells" or "Bands" does NOT run the generator. Volyume
 * installs the hand-authored library plan that fits the athlete's week,
 * through exactly the path the Plan Library's own "Add and start this plan"
 * uses (copyPlanFromLibrary -> activatePlanWithBlock), so a training block is
 * started the same way a generated plan starts one.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The two kit answers, and the equipment PROFILE each one is stored as.
 *
 * The profile matters and is not cosmetic: `kettlebells` and `bands` are not
 * values the rest of the app understands. `deriveEquipmentProfiles`
 * (exerciseMetadata.js) has a closed six-value vocabulary, and both
 * planEngine's `filterPool` and swapEngine's `rankSwaps` do a bare
 * membership test against it - an unknown string matches nothing, so every
 * swap sheet and any later generation would come back EMPTY rather than
 * filtered. Each answer is therefore stored as the profile that keeps the
 * whole of its own style pool reachable:
 *   kettlebells -> home_gym   (kettlebell rows carry
 *                              ['full_gym','dumbbells_only','home_gym'])
 *   bands       -> bodyweight (band rows carry ['bodyweight'])
 * The kit answer itself is what picks the library plan below; the installed
 * plan then carries its own `style:` tag, which is what every swap, preview
 * and Adjust-training surface reads afterwards.
 */
const LIBRARY_KIT_BY_EQUIPMENT = Object.freeze({
  kettlebells: Object.freeze({ kit: 'kettlebell', generationEquipment: 'home_gym' }),
  bands: Object.freeze({ kit: 'band', generationEquipment: 'bodyweight' }),
});

/** 'kettlebells' | 'bands' -> 'kettlebell' | 'band'; null for every other answer. */
export function libraryKitForEquipment(equipment) {
  return LIBRARY_KIT_BY_EQUIPMENT[equipment]?.kit ?? null;
}

/**
 * The equipment profile to STORE and to hand any engine, for a given
 * equipment answer. A pass-through for the six ordinary answers.
 */
export function generationEquipmentFor(equipment) {
  return LIBRARY_KIT_BY_EQUIPMENT[equipment]?.generationEquipment ?? equipment ?? null;
}

function planHasTag(plan, tag) {
  return plan && typeof plan.tags === 'string'
    ? plan.tags.toLowerCase().includes(tag.toLowerCase())
    : false;
}

/**
 * Pick the library plan that fits a kit answer. PURE: no I/O, deterministic,
 * same answers always give the same plan.
 *
 * Contract (F-16 REVISED point 1):
 *  - candidates carry `equipment:<kit>` and are NOT circuit plans (a circuit
 *    is its own style with its own rounds; onboarding never installs one
 *    silently);
 *  - kettlebells additionally match the pool the experience answer implies -
 *    `style:kettlebell_foundations` for a beginner, `style:kettlebell_
 *    experienced` for everyone else. If that pool is empty the kit's whole
 *    candidate set stands, so the pick never dead-ends;
 *  - within that set the plan whose `days:N` tag is NEAREST the athlete's
 *    training days wins. Ties break on difficulty ascending, then name
 *    ascending, so the result never depends on library row order.
 *
 * @param {{kit: string, daysPerWeek: number, experience: string}} answers
 * @param {Array<object>} plans every library plan (getLibraryPlans rows)
 * @returns {object|null} the winning plan row, or null when the kit has none
 */
export function pickLibraryPlanForKit({ kit, daysPerWeek, experience } = {}, plans) {
  if (!kit || !Array.isArray(plans) || !plans.length) return null;
  let candidates = plans.filter(p => planHasTag(p, `equipment:${kit}`) && !planHasTag(p, 'circuit'));
  if (kit === 'kettlebell') {
    const wantedPool = experience === 'beginner'
      ? 'style:kettlebell_foundations'
      : 'style:kettlebell_experienced';
    const byPool = candidates.filter(p => planHasTag(p, wantedPool));
    if (byPool.length) candidates = byPool;
  }
  if (!candidates.length) return null;
  const target = Number.isFinite(daysPerWeek) ? daysPerWeek : 3;
  const scored = candidates.map((plan) => {
    const d = getPlanDays(plan);
    // A plan with no days: tag can still be chosen, but only when nothing
    // tagged survives - never in preference to one that states its week.
    return { plan, gap: d == null ? Number.MAX_SAFE_INTEGER : Math.abs(d - target) };
  });
  scored.sort((a, b) => (a.gap - b.gap)
    || ((a.plan.difficulty ?? 0) - (b.plan.difficulty ?? 0))
    || String(a.plan.name ?? '').localeCompare(String(b.plan.name ?? '')));
  return scored[0].plan;
}

/**
 * The ONE line the athlete is shown when a kit answer installed a library
 * plan. It never claims the plan was generated for them.
 */
export function libraryKitInstalledLine(kit, planName) {
  const kitWord = kit === 'kettlebell' ? 'kettlebell' : 'band';
  return `Volyume has ${kitWord} plans built for this kit. ${planHeadingName(planName)} fits your week.`;
}

/**
 * Install and START the library plan that fits a kit answer, through the
 * Plan Library's own two-step (copyPlanFromLibrary -> activatePlanWithBlock),
 * so the athlete lands on an active plan AND a running block exactly as a
 * generated plan would leave them.
 *
 * @returns {Promise<{ok: true, programmeId: string, planName: string,
 *   libraryPlanId: string} | {ok: false, error: string}>}
 */
export async function installLibraryPlanForKit(userId, { kit, daysPerWeek, experience } = {}) {
  if (!userId) return { ok: false, error: 'no_user' };
  if (!kit) return { ok: false, error: 'no_kit' };
  try {
    const plans = await getLibraryPlans();
    const pick = pickLibraryPlanForKit({ kit, daysPerWeek, experience }, plans);
    if (!pick?.id) return { ok: false, error: 'no_library_plan_for_kit' };
    const copy = await copyPlanFromLibrary(pick.id, userId);
    if (!copy?.id) return { ok: false, error: 'library_copy_failed' };
    await activatePlanWithBlock(userId, copy.id, planHeadingName(pick.name));
    return {
      ok: true, programmeId: copy.id, planName: pick.name, libraryPlanId: pick.id,
    };
  } catch (e) {
    logError('startWithPlan.installLibraryPlanForKit', e, { userId, kit });
    return { ok: false, error: e?.message ?? 'unknown' };
  }
}
