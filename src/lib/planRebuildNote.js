/**
 * planRebuildNote.js -- D219 lane C1b: the one-time "what changed" note a
 * person sees once after the plan they follow is rebuilt (design section 8:
 * "Under A and B the person sees a one-time note of what changed and why,
 * built from section 6"; register D219, founder Q1 = A).
 *
 * Pure: the facts of one rebuild in, the note out. No I/O, no clock, no
 * randomness, and it imports only constants and the muscle display name, so
 * the surface that shows it (a card with a dismiss button) holds no logic.
 *
 * What it says, by kind of plan (register D219 build ruling 5):
 *   generated  the exercises the new plan replaced, took out and added, the
 *              caps (explain.js's own cap line, so the note and the plan page
 *              say the same words), the new targets with the numbers before and
 *              after, and that the block carries on;
 *   library    (and kit) the sessions and exercises are as they were; the sets,
 *              the climb and the order changed, with explain.js's spacing line
 *              when the order moved; the caps and the new targets;
 *   manual     the plan is as built; every count is served as typed in weeks 1
 *              to 5 and at half in the recovery week; the caps bind only sets
 *              the plan adds.
 * It states only what it is given: no changed exercise, no line; no numbers,
 * no targets line; a long list is shortened with a count, never cut silently.
 *
 * Voice (D204, docs/COACHING_VOICE_SYNTHESIS_LOCKED.md): it describes and never
 * tells anyone to train more or less; British English; no em dash.
 */
import { muscleDisplayName } from './algorithms';
import { SETS_PER_EXERCISE, BLOCK } from './plan/science';

export const PLAN_REBUILD_KIND = Object.freeze({
  GENERATED: 'generated',
  LIBRARY: 'library',
  MANUAL: 'manual',
});

const MAX_LISTED = 4;
const MAX_MOVERS = 3;
const MIN_MOVE = 2;

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// The first MAX_LISTED, with a count of the rest: a list is never cut silently.
function listed(items) {
  if (items.length <= MAX_LISTED) return joinList(items);
  return `${items.slice(0, MAX_LISTED).join(', ')} and ${items.length - MAX_LISTED} more`;
}

function changesLine(changes) {
  if (!changes) return null;
  const replaced = (Array.isArray(changes.replaced) ? changes.replaced : []).filter((r) => r?.from && r?.to);
  const removed = (Array.isArray(changes.removed) ? changes.removed : []).filter(Boolean);
  const added = (Array.isArray(changes.added) ? changes.added : []).filter(Boolean);
  if (replaced.length + removed.length + added.length === 0) return null;
  const parts = [];
  if (replaced.length) parts.push(listed(replaced.map((r) => `${r.from} is now ${r.to}`)));
  if (removed.length) parts.push(`${listed(removed)} taken out`);
  if (added.length) parts.push(`${added.length} ${added.length === 1 ? 'exercise' : 'exercises'} added`);
  return {
    id: 'changes',
    text: `Exercises: ${parts.join('; ')}. The plan now chooses from the standard exercise list for your equipment, and keeps the exercises you were already training with where they fit.`,
  };
}

function targetsLine(targets) {
  if (!targets || !targets.before || !targets.after) return null;
  const week = isNumber(targets.week) ? targets.week : null;
  const muscles = Object.keys(targets.after).filter((m) => isNumber(targets.after[m]) && isNumber(targets.before[m]));
  if (week == null || muscles.length === 0) return null;
  const before = muscles.reduce((a, m) => a + targets.before[m], 0);
  const after = muscles.reduce((a, m) => a + targets.after[m], 0);
  const when = week === BLOCK.peakWeek ? `At the week ${week} peak` : `In week ${week}`;
  const movers = muscles
    .map((m) => ({ m, now: targets.after[m], was: targets.before[m], move: Math.abs(targets.after[m] - targets.before[m]) }))
    .filter((x) => x.move >= MIN_MOVE)
    .sort((a, b) => (b.move - a.move) || (a.m < b.m ? -1 : 1))
    .slice(0, MAX_MOVERS)
    .map((x) => `${muscleDisplayName(x.m)} ${x.now} (was ${x.was})`);
  const biggest = movers.length ? ` Biggest changes: ${movers.join(', ')}.` : '';
  return {
    id: 'targets',
    text: `Weekly sets are now built from your session length, the set caps and how quickly each muscle recovers. ${when} your plan now holds ${after} direct sets a week across your muscles, where it held ${before}.${biggest}`,
  };
}

function blockLine(week) {
  const where = isNumber(week) ? `You are in week ${week} of your block and it carries on from there` : 'Your block carries on from where it is';
  return {
    id: 'block',
    text: `${where}: the block, its weeks and its effort targets are as they were.`,
  };
}

/**
 * @param {object} args
 * @param {'generated'|'library'|'manual'} args.kind
 * @param {?{ replaced?: Array<{from: string, to: string}>, removed?: string[], added?: string[] }} [args.changes]
 *        a generated plan's exercise changes (continuity's receipt, by name)
 * @param {?string} [args.capLine]      explain.js's `cap` line, for the planner-built kinds
 * @param {?string} [args.spacingLine]  explain.js's `spacing` line, shown when the order changed
 * @param {?{ changed: boolean, names: string[] }} [args.order]  a library or kit plan's sessions in the new rotation order
 * @param {?{ week: number, before: Object<string, number>, after: Object<string, number> }} [args.targets]
 *        direct sets by muscle in the old plan's rows and in the new plan, for one week
 * @param {?number} [args.week]         the block week the person is in
 * @returns {{ title: string, subtitle: string, lines: Array<{ id: string, text: string }> }}
 */
export function composePlanRebuildNote({
  kind, changes = null, capLine = null, spacingLine = null, order = null, targets = null, week = null,
} = {}) {
  if (!Object.values(PLAN_REBUILD_KIND).includes(kind)) {
    throw new Error(`composePlanRebuildNote: unknown kind ${String(kind)}`);
  }
  const lines = [];
  if (kind === PLAN_REBUILD_KIND.GENERATED) {
    lines.push(changesLine(changes));
    if (capLine) lines.push({ id: 'cap', text: capLine });
    lines.push(targetsLine(targets));
  } else if (kind === PLAN_REBUILD_KIND.LIBRARY) {
    const moved = order?.changed === true;
    lines.push({ id: 'kept', text: 'Your sessions and your exercises are as they were.' });
    lines.push({
      id: 'sets',
      text: moved
        ? "What changed is each exercise's sets, how they climb over the block, and the order your sessions run in."
        : "What changed is each exercise's sets and how they climb over the block.",
    });
    if (moved && Array.isArray(order.names) && order.names.length > 0) {
      lines.push({
        id: 'order',
        text: `Your sessions now run in this order: ${order.names.join(', ')}.${spacingLine ? ` ${spacingLine}` : ''}`,
      });
    }
    if (capLine) lines.push({ id: 'cap', text: capLine });
    lines.push(targetsLine(targets));
  } else {
    lines.push({ id: 'kept', text: 'Your plan is as you built it: every exercise and every set count is yours.' });
    lines.push({
      id: 'typed',
      text: `Your set counts are served as you typed them in weeks 1 to 5, with no climb added on top, and at half in the recovery week. The ${SETS_PER_EXERCISE.capCompound}-set and ${SETS_PER_EXERCISE.capIsolation}-set limits apply to sets the plan adds, never to numbers you typed.`,
    });
  }
  lines.push(blockLine(week));
  return {
    title: 'Your plan has been updated',
    subtitle: 'What changed, and why',
    lines: lines.filter(Boolean),
  };
}

// Lines of a plan's explanation (explain.js) that claim the PLANNER chose or
// built something. A library or kit plan keeps its authored sessions, so the
// planner did not choose its split; a manual plan is the person's own, so the
// planner chose neither its split, nor its order, nor its caps (every count is
// theirs). Marking those plans version 2 lets the plan screen explain them, and
// the explanation must not say what is not true of them: these lines are left
// out for those kinds, every other line (the readiness it measured, the session
// length, the effort ladder of the block) is true of them and stays.
const NOT_CLAIMED = Object.freeze({
  [PLAN_REBUILD_KIND.LIBRARY]: Object.freeze(['structure']),
  [PLAN_REBUILD_KIND.MANUAL]: Object.freeze(['structure', 'spacing', 'cap']),
});

/**
 * @param {?Array<{ id: string }>} lines  explain.js's lines for the plan
 * @param {?string} kind                  the plan's facts.kind ('generated', 'library', 'manual', or none)
 * @returns {?Array<{ id: string }>} the lines that are true of this kind of plan; a plan of any other kind, and a
 *          null list, come back as they were given
 */
export function explainLinesForKind(lines, kind) {
  const drop = NOT_CLAIMED[kind];
  if (!drop || !Array.isArray(lines)) return lines;
  return lines.filter((l) => !drop.includes(l?.id));
}
