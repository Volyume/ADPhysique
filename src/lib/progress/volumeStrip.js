/**
 * volumeStrip.js - the Progress root's weekly volume strip, as one pure model
 * (register D214, lane 3; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/00-AUDIT-AND-PLAN.md`
 * section 7.1 item 2, line 3 and the strip).
 *
 *   This week so far: 42 sets logged across 12 muscles · 2 below maintenance
 *   [ a segmented bar in three tones ]
 *   Below maintenance · Within the studied range · Beyond the studied range
 *
 * D219 (design 5.3, lane A5): the strip reads the ONE judgement every surface
 * that judges a muscle's weekly sets reads (volumeJudgement.judgeWeek: the
 * role-aware band function, the muscle's role from the active plan's facts),
 * not the old landmark table. Its old third tone, "Too much" in the error
 * colour, is gone: a focus muscle at 27 weekly sets is inside its focus range,
 * and only a total beyond what studies have tested is marked, in an
 * information colour, never a warning one.
 *
 * Nothing here defines a logged set, a window or a group. Those live ONCE in
 * `src/lib/volumeLogged.js` (the Volume heatmap reads the same functions), and
 * this module only composes them, so the strip and the heatmap it opens cannot
 * disagree:
 *   - "N sets logged" is `buildWindowView(ds, 1).loggedRows`: working-set ROWS
 *     in the Monday-anchored week so far, a compound set counted once, never
 *     the per-muscle credits summed (VH-16);
 *   - "across M muscles" is the listed muscles with any credit that week;
 *   - "N below maintenance" counts the listed muscles whose `bandGroupFor`
 *     group is `below_maintenance`, which is the heatmap's first group by
 *     construction: a muscle with sets this week below the maintenance band
 *     (whether or not the plan programmes it), or a muscle the active plan
 *     programmes with planned sets above zero and no sets yet. A muscle with no
 *     sets that the plan does not programme is in no group and is never
 *     counted. Each muscle is judged on the heatmap's own figure (the credit
 *     rounded once).
 *
 * THE THREE TONES. The strip folds the eight groups into three, named in its
 * legend: Below maintenance (`textMuted`), Within the studied range (every
 * group from maintenance up to the top of what studies have tested, `success`)
 * and Beyond the studied range (an information colour). Tones come from the one
 * `stripToneColors` so the legend swatches and the bar's segments can never
 * name different colours.
 *
 * A RECOVERY WEEK. In the block's planned recovery week sets are planned lower,
 * so no verdict is drawn and no count is printed (PR-14): the line keeps the
 * facts, the recovery sentence follows it, and the bar draws one neutral shade
 * named "Trained", exactly as the heatmap does. The week is the programme
 * position's GATED planned recovery week (`isStripRecoveryWeek`), never an
 * adaptive adjustment.
 *
 * Pure. No I/O, no store, no clock: the caller passes the loaded history, the
 * plan's roles, the plan-trained set and "now". D204: it describes what was
 * logged, it never says what to do about it.
 */
import {
  LISTED_MUSCLES, buildDataset, buildWindowView, bandGroupFor,
} from '../volumeLogged';
import { judgeWeek, roleFor, GROUP } from '../volumeJudgement';
import { RECOVERY_STATE } from '../recoveryState';

/** The three tones of the strip's bar and legend. */
export const STRIP_TONE = Object.freeze({ UNDER: 'under', IN: 'in', OVER: 'over' });

/** The strip's one recovery-week sentence (the heatmap prints the same words). */
export const RECOVERY_WEEK_LINE = 'Recovery week: sets are planned lower this week';

// The (i) behind the strip: what the count counts (and the credit rule behind
// it, the sentence the Volume heatmap's (i) carries too), what the bands are,
// why the count can include a muscle with no sets yet, and which groups the
// middle tone folds (rule 5: explain on tap). It describes, never advises.
const STRIP_OPENING = 'This week so far counts the sets you have logged since Monday.\n\n';
const STRIP_CREDIT_SENTENCE = 'A set counts once for the muscle it works most and half for each muscle that helps, so the muscle figures add up to more than the sets you logged. ';

/** The (i) behind the strip in a normal week. */
export const STRIP_TOOLTIP = STRIP_OPENING
  + STRIP_CREDIT_SENTENCE
  + 'The bands come from studies of weekly sets: under 2 is below maintenance, 2 to 6 holds the size you have, 10 to 20 is the normal growth range and 20 to 30 is the range for a muscle you picked to bring up. '
  + 'A muscle you picked to bring up in your plan reads against that range. '
  + 'A muscle your plan trains counts as below maintenance even before its first set. '
  + 'Within the studied range covers every band from maintenance up to 42 sets, and beyond that studies have little to say.';

/**
 * The same (i) in the planned recovery week: the same opening and credit
 * sentence, then why no muscle is judged (sets are planned lower) and what the
 * bar's one shade says, which is only which muscles were trained. The band
 * sentences are left out because nothing is judged against a band this week.
 */
export const STRIP_RECOVERY_TOOLTIP = STRIP_OPENING
  + STRIP_CREDIT_SENTENCE
  + 'In a recovery week sets are planned lower, so no muscle is judged against a band. '
  + 'The bar draws one shade for the muscles you trained.';

/** The legend's words, in the order the bar's tones read. */
export const STRIP_LEGEND_LABEL = Object.freeze({
  under: 'Below maintenance',
  in: 'Within the studied range',
  over: 'Beyond the studied range',
  neutral: 'Trained',
});

/**
 * The strip tone a volumeJudgement group folds into: below maintenance is
 * Under, beyond the studied range is Over, and every group from maintenance up
 * to the top of the studied range is Within. A group the strip does not know
 * reads as no verdict (Under, as an unknown status always did).
 * @param {string} group
 * @returns {'under'|'in'|'over'}
 */
export function toneForGroup(group) {
  if (group === GROUP.BEYOND) return STRIP_TONE.OVER;
  if (group === GROUP.BELOW) return STRIP_TONE.UNDER;
  return Object.values(GROUP).includes(group) ? STRIP_TONE.IN : STRIP_TONE.UNDER;
}

/**
 * The colour of each tone, from the live colour table: the ONE place the
 * legend and the bar read, so they cannot drift. `neutral` is the recovery
 * week's single shade (the heatmap's "Trained" fill).
 * @param {object} colors - a theme colour table (`t.colors`)
 * @returns {{ under: string, in: string, over: string, neutral: string }}
 */
export function stripToneColors(colors) {
  return {
    under: colors.textMuted,
    in: colors.success,
    // D219: beyond the studied range is a note, an information colour, never the
    // error token (nothing below it is a warning, and this is not one either).
    over: colors.macroCarb,
    neutral: colors.surface3,
  };
}

/**
 * The legend items for `LegendRow`: the three tones, or in a recovery week the
 * one neutral shade it draws.
 * @param {{ colors: object, recoveryWeek?: boolean }} args
 * @returns {Array<{ key: string, label: string, swatch: object }>}
 */
export function stripLegendItems({ colors, recoveryWeek = false }) {
  const tone = stripToneColors(colors);
  if (recoveryWeek) {
    return [{ key: 'trained', label: STRIP_LEGEND_LABEL.neutral, swatch: { fill: tone.neutral, outline: 'solid' } }];
  }
  return [
    { key: STRIP_TONE.UNDER, label: STRIP_LEGEND_LABEL.under, swatch: { fill: tone.under } },
    { key: STRIP_TONE.IN, label: STRIP_LEGEND_LABEL.in, swatch: { fill: tone.in } },
    { key: STRIP_TONE.OVER, label: STRIP_LEGEND_LABEL.over, swatch: { fill: tone.over } },
  ];
}

/**
 * Is this the block's planned recovery week? The programme position's GATED
 * state, exactly the plan-week card's and the Volume heatmap's reading
 * (`recoveryState.state === PLANNED_BLOCK_RECOVERY`, held back while a required
 * accumulation session is outstanding, `programmePosition.js`); an adaptive
 * recovery adjustment is never called a recovery week. The calendar flag
 * (`getCurrentMesocycleWeek().isDeload`) is read only when the position cannot
 * be read at all, and then as the heatmap reads it: a finished block that
 * clamps to its final row while it awaits the athlete's decision is no live
 * recovery week.
 *
 * @param {{ position?: ?object, currentMesoWeek?: ?object }} [args]
 * @returns {boolean}
 */
export function isStripRecoveryWeek({ position = null, currentMesoWeek = null } = {}) {
  if (position) return position.recoveryState?.state === RECOVERY_STATE.PLANNED_BLOCK_RECOVERY;
  return currentMesoWeek?.isDeload === true && currentMesoWeek?.awaitingDecision !== true;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function underClause(under) {
  return under === 0 ? 'none below maintenance' : `${under} below maintenance`;
}

/**
 * @typedef {object} VolumeStrip
 * @property {boolean} hasSetsThisWeek - at least one logged working-set row since Monday
 * @property {number} loggedSets - logged working-set rows this week (a compound set counts once)
 * @property {number} musclesWorked - listed muscles with any credit this week
 * @property {number|null} under - muscles whose group is "Below maintenance"; null in a recovery week
 * @property {boolean} recoveryWeek - the planned recovery week: no verdict, no under count
 * @property {Array<{ muscle: string, sets: number, tone: string }>} segments - one per muscle with
 *   credit, widest first; `sets` is the credit (the bar's width), `tone` a STRIP_TONE value
 * @property {string} line - "This week so far: 42 sets logged across 12 muscles · 2 below maintenance"
 * @property {string|null} recoveryLine - RECOVERY_WEEK_LINE in a recovery week, else null
 * @property {string} spoken - the line (and the recovery sentence) as one spoken sentence
 */

/**
 * Build the strip's model from the loaded history.
 *
 * @param {object} args
 * @param {Array<object>} args.allSets - every completed working-set row the account has
 * @param {object} args.exerciseMap - { [exerciseId]: exercise }
 * @param {number} args.nowMs - the caller's "now" (the week's end)
 * @param {?Object<string,string>} [args.roles] - the active plan's muscle roles
 *   (`getPlanRoles`); null reads every muscle as standard
 * @param {?Set<string>} [args.planTrained] - `planTrainedMuscles(await getPlanLandmarks(...))`;
 *   empty or null means no plan, and only muscles with sets are judged
 * @param {boolean} [args.recoveryWeek] - `isStripRecoveryWeek(...)`
 * @returns {VolumeStrip}
 */
export function buildVolumeStrip({
  allSets, exerciseMap, nowMs, roles = null, planTrained = null, recoveryWeek = false,
} = {}) {
  const ds = buildDataset(Array.isArray(allSets) ? allSets : [], exerciseMap || {}, nowMs);
  const view = buildWindowView(ds, 1);
  const loggedSets = view ? view.loggedRows : 0;
  const musclesWorked = view ? view.musclesWorked : 0;

  let under = 0;
  const segments = [];
  if (view) {
    for (const muscle of LISTED_MUSCLES) {
      const credit = view.raw[muscle]?.workingSets || 0;
      const hasCredit = credit > 0;
      // The heatmap's own figure: the week's credit, rounded once, judged by
      // the same one judgement (VolumeHeatmapScreen rowModels).
      const sets = Math.round(view.perWeek[muscle]?.workingSets || 0);
      const { group } = judgeWeek({ muscle, sets, role: roleFor(roles, muscle) });
      if (bandGroupFor({ muscle, status: group, hasCredit, planTrained }) === GROUP.BELOW) under += 1;
      if (hasCredit) segments.push({ muscle, sets: credit, tone: toneForGroup(group) });
    }
    segments.sort((a, b) => b.sets - a.sets);
  }

  const hasSetsThisWeek = loggedSets > 0;
  let line;
  let spokenLine;
  if (!hasSetsThisWeek) {
    line = 'This week so far: no sets logged';
    spokenLine = line;
  } else {
    const facts = `This week so far: ${plural(loggedSets, 'set', 'sets')} logged across ${plural(musclesWorked, 'muscle', 'muscles')}`;
    line = recoveryWeek ? facts : `${facts} · ${underClause(under)}`;
    spokenLine = recoveryWeek ? facts : `${facts}, ${underClause(under)}`;
  }
  const recoveryLine = recoveryWeek ? RECOVERY_WEEK_LINE : null;
  return {
    hasSetsThisWeek,
    loggedSets,
    musclesWorked,
    under: recoveryWeek ? null : under,
    recoveryWeek: !!recoveryWeek,
    segments,
    line,
    recoveryLine,
    spoken: recoveryLine ? `${spokenLine}. ${recoveryLine}` : spokenLine,
  };
}
