/**
 * Volume-insight copy -- pure judgement -> text for the per-muscle volume rows
 * on the Workout Summary screen.
 *
 * D219 (design 5.3, lane A5): these helpers used to turn the old engine status
 * ("Under the range", "Near the limit", "Too much") into guidance, against a
 * landmark table that ignored the plan. They now turn the ONE judgement every
 * surface shares (volumeJudgement.judgeWeek: the role-aware band function, the
 * muscle's role from the active plan's facts) into the two lines a row shows,
 * so a muscle the plan raised reads inside its focus range with the reason and
 * nothing here can call planned focus volume "too much". They describe and
 * never instruct (D204): the next-week advice is the plan's job, not a panel's.
 *
 * Pure. No I/O, no store, no clock.
 */

/**
 * At-a-glance insight line for a muscle row: the set count and the band's
 * words, "27 sets · Focus range". Null for a muscle with no judgement.
 *
 * @param {{ sets: number, label: string }|null} judgement  volumeJudgement.judgeWeek's result
 * @returns {string|null}
 */
export function getVolumeInsight(judgement) {
  if (!judgement) return null;
  const n = Math.round(judgement.sets);
  const count = `${n} ${n === 1 ? 'set' : 'sets'}`;
  return judgement.label ? `${count} · ${judgement.label}` : count;
}

/**
 * The longer "why this band" explanation behind a tap on a muscle row: for a
 * muscle the plan raised, the reason ("Biceps are your focus this block: 27
 * sets, inside the focus range of 20 to 30."), then the evidence sentence for
 * the band and, when the week is above it, the plan's target. Null when the
 * judgement has nothing to say.
 *
 * @param {{ why: string[] }|null} judgement
 * @returns {string|null}
 */
export function getVolumeWhy(judgement) {
  if (!judgement || !Array.isArray(judgement.why) || judgement.why.length === 0) return null;
  return judgement.why.join(' ');
}
