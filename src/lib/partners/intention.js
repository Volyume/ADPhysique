/**
 * Partners D5-A — the mutual weekly intention: pure display + resolution.
 *
 * Each member optionally confirms an integer weekly session AIM against their
 * OWN plan (defaulting to the weekly planned count they already have). This
 * module turns the two aims into calm copy and resolves the shared kept-moment.
 *
 * COPY LAW (spec "D5 · Partners A + B"): intention, not obligation. Allowed:
 * "aim", "kept your week". BANNED: "must", "target you have to hit", "don't let
 * them down", "you're behind", ANY cross-person comparison, ANY number that
 * ranks one above the other. Each partner is measured only against their own
 * aim — so no line here ever says one person's number is larger/smaller than the
 * other's, and there is no "ahead"/"behind"/"more than"/"less than" construct.
 * partnerComparison.guard.test.js pins that at source level.
 *
 * Rest-safe (inherited from the shared-streak rule): a miss HOLDS. It never
 * reds, never attributes, never reads as "you let them down". A resting week on
 * either side simply withholds the kept-moment — never a fail.
 *
 * Pure and fully unit-tested. British English, no em dash.
 */

export const KEPT_LINE = 'You both kept your week.';

/** A meaningful aim is a positive integer; 0 / null / absent means "not set". */
function normAim(v) {
  const n = Math.round(Number(v) || 0);
  return n > 0 ? n : 0;
}

/** Your OWN planned-sessions line, always first person. Your own number, never comparative. */
function ownAimLine(aim) {
  return `You planned ${aim} sessions this week.`;
}

/**
 * Partner-set line when the aims DIFFER: acknowledges that the partner engaged
 * WITHOUT revealing their number, so two differing figures are never placed side
 * by side (the ED-safe default; failing toward less comparison). The equal case
 * still shows the single co-owned "You both planned {n} sessions" line.
 */
function partnerSetLine(name) {
  return `${name} set weekly sessions too.`;
}

/**
 * Resolve the intention copy for a PairCard.
 * @returns {{ shared:string|null, mine:string|null, theirs:string|null }}
 *   - shared : the single co-owned line, shown ONLY when both aims are set AND
 *              equal ("You both planned {n} sessions this week."). Never a comparison.
 *   - mine / theirs : each member's OWN planned-sessions line, shown when the aims differ or
 *              only one side has set an aim. Each is a standalone fact about that
 *              person's own plan; neither is ever framed against the other.
 */
export function resolveIntention({ myAim, partnerAim, partnerName } = {}) {
  const a = normAim(myAim);
  const b = normAim(partnerAim);
  const name = (typeof partnerName === 'string' && partnerName.trim()) ? partnerName.trim() : 'Your partner';

  if (a > 0 && b > 0 && a === b) {
    return { shared: `You both planned ${a} sessions this week.`, mine: null, theirs: null };
  }
  return {
    shared: null,
    // Your own aim shows your own number. The partner's differing aim is
    // acknowledged WITHOUT its number, so two figures are never comparable.
    mine: a > 0 ? ownAimLine(a) : null,
    theirs: b > 0 ? partnerSetLine(name) : null,
  };
}

/**
 * Whether the pair KEPT the week: both met their OWN aim, on a week neither
 * rested. Rest-safe: a resting side (deload / wellbeing hold, indistinguishable
 * by design) HOLDS — no kept-moment, never a fail. Needs both aims set.
 * A miss is simply `false`: the caller shows nothing, never a red or a blame.
 */
export function weekKeptTogether({
  myAim, partnerAim, myDone, partnerDone, myResting = false, partnerResting = false,
} = {}) {
  if (myResting || partnerResting) return false;
  const a = normAim(myAim);
  const b = normAim(partnerAim);
  if (a <= 0 || b <= 0) return false;
  const dMe = Math.max(0, Math.round(Number(myDone) || 0));
  const dThem = Math.max(0, Math.round(Number(partnerDone) || 0));
  return dMe >= a && dThem >= b;
}

/** Clamp a chosen aim to the sane 1..14 sessions-per-week range. */
export function clampAim(n) {
  const v = Math.round(Number(n) || 0);
  if (v < 1) return 1;
  if (v > 14) return 14;
  return v;
}
