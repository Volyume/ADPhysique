/**
 * exercise/adaptedSetup.js - structured adapted-setup guidance (gap-closure
 * order section 23; GC-D9; closes traceability T13's shippable half).
 *
 * WHERE an exercise's setup materially differs for a way of training, this
 * module carries a short, practical line per context. It is setup and
 * accessibility content, never technique coaching and never anything
 * clinical: no loads, no ranges, no promises. Rendered on the exercise
 * surfaces as plain text (screen-reader first-class).
 *
 * Pure data + accessors. Contexts are CLOSED; content validates in
 * adaptedSetup.test.js against the live seed (names must exist) and the
 * directory wording law (R2 function terms banned, no em dash).
 */

export const SETUP_CONTEXT = Object.freeze({
  SEATED: 'seated',
  ONE_ARM: 'one_arm',
  ONE_LEG: 'one_leg',
  STRAP_CUFF: 'strap_cuff',
  SUPPORTED: 'supported',
  REDUCED_RANGE: 'reduced_range',
  PER_SIDE: 'per_side',
});

export const SETUP_CONTEXT_LABELS = Object.freeze({
  [SETUP_CONTEXT.SEATED]: 'Seated or from a chair',
  [SETUP_CONTEXT.ONE_ARM]: 'One arm',
  [SETUP_CONTEXT.ONE_LEG]: 'One leg',
  [SETUP_CONTEXT.STRAP_CUFF]: 'Straps, cuffs or hooks',
  [SETUP_CONTEXT.SUPPORTED]: 'With support',
  [SETUP_CONTEXT.REDUCED_RANGE]: 'Shorter range',
  [SETUP_CONTEXT.PER_SIDE]: 'One side at a time',
});

/**
 * name -> { context -> line }. Names are canonical seed names (validated
 * by adaptedSetup.test.js); a context appears ONLY where the setup
 * genuinely differs. Lines are practical setup notes: no technique
 * coaching, no loads, no ranges, no outcomes.
 */
export const ADAPTED_SETUP = Object.freeze({
  // ── Pulling ───────────────────────────────────────────────────────────
  'Lat Pulldown (Wide Grip)': {
    [SETUP_CONTEXT.STRAP_CUFF]: 'A lifting strap or cuff looped through the handle takes the grip out of it; the back still does the whole job.',
    [SETUP_CONTEXT.ONE_ARM]: 'A single handle on the same station works one side at a time; the free hand braces on the thigh pad.',
  },
  'Seated Cable Row': {
    [SETUP_CONTEXT.STRAP_CUFF]: 'Straps or a cuff around the handle replace the grip; a chest-height anchor and neutral wrists keep the setup simple.',
    [SETUP_CONTEXT.ONE_ARM]: 'A single D-handle turns this into one-side rowing; brace the free arm on the knee.',
    [SETUP_CONTEXT.SEATED]: 'From a wheelchair, position square-on to the low pulley and lock the brakes; the chest pad or a strap across the backrest adds a stable base.',
  },
  'Pull-Up': {
    [SETUP_CONTEXT.STRAP_CUFF]: 'Wrist straps wrapped over the bar, or hooks, carry the hang so limited grip does not end the set early.',
    [SETUP_CONTEXT.SUPPORTED]: 'A band under one knee or the assisted station takes a share of the weight without changing the movement.',
  },
  'Conventional Deadlift': {
    [SETUP_CONTEXT.STRAP_CUFF]: 'Straps close the gap when grip gives out before the legs and back do.',
    [SETUP_CONTEXT.REDUCED_RANGE]: 'Pulling from blocks or the rack pins shortens the range; the hinge stays the same.',
  },
  'Dumbbell Row': {
    [SETUP_CONTEXT.STRAP_CUFF]: 'A strap around the dumbbell handle keeps the row going when grip is the limit.',
    [SETUP_CONTEXT.PER_SIDE]: 'Already one side at a time by design; the bench takes the other hand and knee.',
  },
  'Band Row': {
    [SETUP_CONTEXT.SEATED]: 'Anchor the band at chest height in front of the chair, sit tall and row; the chair back gives all the support needed.',
    [SETUP_CONTEXT.STRAP_CUFF]: 'Tying a loop in the band, or a cuff above the wrist, works when holding the band is the hard part.',
  },
  'Face Pull (Rope)': {
    [SETUP_CONTEXT.SEATED]: 'Set the pulley to face height from the chair; everything else is unchanged.',
  },

  // ── Pressing ──────────────────────────────────────────────────────────
  'Barbell Bench Press': {
    [SETUP_CONTEXT.SUPPORTED]: 'Setting the safeties just above chest height means a missed rep rests on the pins, not on you; useful when training alone.',
    [SETUP_CONTEXT.REDUCED_RANGE]: 'A board or towel on the chest, or pressing in the rack from pins, keeps the range where it works for you.',
  },
  'Dumbbell Bench Press': {
    [SETUP_CONTEXT.PER_SIDE]: 'One dumbbell at a time works; the free hand braces flat on the bench.',
    [SETUP_CONTEXT.ONE_ARM]: 'One-sided pressing is complete training; a slightly staggered body position keeps the bench balanced.',
  },
  'Machine Chest Press': {
    [SETUP_CONTEXT.SEATED]: 'With a removable-seat station, a wheelchair rolls straight in; set the handles level with the mid chest and lock the brakes.',
    [SETUP_CONTEXT.ONE_ARM]: 'Where the machine has independent handles, pressing one side at a time is first-class training.',
  },
  'Machine Shoulder Press': {
    [SETUP_CONTEXT.REDUCED_RANGE]: 'Starting the handles higher, or stopping short of the top, keeps the press inside the range that works for your shoulders.',
  },
  'Seated Dumbbell Press': {
    [SETUP_CONTEXT.SEATED]: 'From a wheelchair, a high backrest and locked brakes replace the bench; a spotter or rack hand-off helps get the weights up.',
    [SETUP_CONTEXT.PER_SIDE]: 'One dumbbell at a time halves the balance demand; the free hand holds the chair or bench.',
  },
  'Push-Up': {
    [SETUP_CONTEXT.STRAP_CUFF]: 'Push-up handles or hexagon dumbbells keep the wrists straight instead of bent back.',
    [SETUP_CONTEXT.REDUCED_RANGE]: 'Hands on a bench or wall shortens the range and lightens the load without changing the movement.',
    [SETUP_CONTEXT.SUPPORTED]: 'Knees down is the classic support; a band under the hips from a rack works too.',
  },
  'Barbell Overhead Press': {
    [SETUP_CONTEXT.SEATED]: 'The seated version in a rack with back support presses the same muscles without asking the trunk to balance the bar.',
  },

  // ── Lower body ────────────────────────────────────────────────────────
  'Leg Press': {
    [SETUP_CONTEXT.PER_SIDE]: 'One leg on the platform at a time is standard practice; keep the working foot central.',
    [SETUP_CONTEXT.REDUCED_RANGE]: 'Setting the seat back further, or the stop higher, keeps knees and hips inside the range that works.',
  },
  'Leg Extension': {
    [SETUP_CONTEXT.PER_SIDE]: 'One leg at a time is standard on this station; drop the load accordingly.',
    [SETUP_CONTEXT.REDUCED_RANGE]: 'Most stations let the start angle come up so the knee never bends deeply.',
  },
  'Seated Leg Curl': {
    [SETUP_CONTEXT.PER_SIDE]: 'One leg at a time is standard; the pads and seat do not change.',
  },
  'Barbell Back Squat': {
    [SETUP_CONTEXT.SUPPORTED]: 'Squatting inside the rack with the safeties set means the bar always has somewhere to land.',
    [SETUP_CONTEXT.REDUCED_RANGE]: 'A box or bench behind you sets the depth; sit to it, stand up, done.',
  },
  'Romanian Deadlift': {
    [SETUP_CONTEXT.STRAP_CUFF]: 'Straps carry the bar when grip would end the set before the hamstrings.',
    [SETUP_CONTEXT.SUPPORTED]: 'A hand on the rack for balance costs nothing; the hinge does not change.',
  },
  'Barbell Hip Thrust': {
    [SETUP_CONTEXT.REDUCED_RANGE]: 'A smaller shoulder elevation shortens the range while the hips still do the work.',
    [SETUP_CONTEXT.SUPPORTED]: 'The machine version, where available, removes the bench-and-bar setup entirely.',
  },
  'Standing Calf Raise (Machine)': {
    [SETUP_CONTEXT.PER_SIDE]: 'One leg at a time is standard; hold the frame with both hands.',
    [SETUP_CONTEXT.SUPPORTED]: 'The seated station trains the same area with the machine holding the balance.',
  },
  'Goblet Squat': {
    [SETUP_CONTEXT.SUPPORTED]: 'Squatting to a box with a hand free for the rack turns this into a supported movement.',
    [SETUP_CONTEXT.REDUCED_RANGE]: 'A higher box sets a shallower depth; the pattern stays the same.',
  },

  // ── Arms and shoulders ────────────────────────────────────────────────
  'Dumbbell Curl': {
    [SETUP_CONTEXT.SEATED]: 'Seated with back support, or from the chair with brakes locked, changes nothing about the curl.',
    [SETUP_CONTEXT.STRAP_CUFF]: 'A wrist cuff with a loading loop lets the arm curl without the hand holding anything.',
  },
  'Rope Pushdown': {
    [SETUP_CONTEXT.SEATED]: 'Set the pulley lower than usual so the working range sits in front of the chest from a chair.',
    [SETUP_CONTEXT.STRAP_CUFF]: 'A cuff above the wrist replaces the grip; the elbow still does the same work.',
  },
  'Dumbbell Lateral Raise': {
    [SETUP_CONTEXT.SEATED]: 'Seated raises are the same movement with the trunk supported.',
    [SETUP_CONTEXT.STRAP_CUFF]: 'A wrist cuff on a low pulley raises without any grip at all.',
    [SETUP_CONTEXT.PER_SIDE]: 'One arm at a time with the other hand braced is steadier and just as effective.',
  },
  'Hammer Curl': {
    [SETUP_CONTEXT.SEATED]: 'Seated or from the chair, nothing about the movement changes.',
  },

  // ── Trunk ─────────────────────────────────────────────────────────────
  'Plank': {
    [SETUP_CONTEXT.REDUCED_RANGE]: 'Forearms on a bench instead of the floor lightens the load and removes the floor transfer.',
    [SETUP_CONTEXT.SEATED]: 'Seated band anti-rotation work (a Pallof hold from the chair) trains the same bracing without the floor.',
  },
  'Cable Woodchop (High to Low)': {
    [SETUP_CONTEXT.SEATED]: 'From a chair with brakes locked, set the pulley to shoulder height and rotate; the trunk work is identical.',
  },
  'Pallof Press': {
    [SETUP_CONTEXT.SEATED]: 'Sitting square-on to the anchor with the band at chest height keeps the whole exercise as it is.',
  },
});

/**
 * Class-level default lines (reconciliation 2026-08-21, GC-D11). Whole
 * movement classes share the same honest setup adaptation, so the
 * class carries one line and the per-exercise entries above override or
 * extend it. Same wording laws as the entries: setup only, no
 * technique coaching, no loads, no outcomes.
 */
export const CLASS_TEXT = Object.freeze({
  [SETUP_CONTEXT.STRAP_CUFF]: 'A lifting strap or cuff looped around the bar or handle takes firm grip out of it; the working muscles still do the whole job.',
  [SETUP_CONTEXT.ONE_ARM]: 'A single handle on the same station works one side at a time; brace the free hand on the frame or your thigh.',
  [SETUP_CONTEXT.SEATED]: 'This works from a sturdy chair or bench with the same equipment; brace against the backrest and keep the weight path clear of the seat.',
  [SETUP_CONTEXT.SUPPORTED]: 'A rail, wall or sturdy bench within reach turns balance effort into training effort; hold on as much as you need.',
  [SETUP_CONTEXT.REDUCED_RANGE]: 'Setting the rack pins or blocks higher shortens the range; the movement stays the same.',
});

const UPPER_MUSCLES = new Set(['chest', 'back', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'traps', 'forearms', 'neck']);
const SINGLE_SIDED_NAME = /single-arm|single-leg|one-arm|one-leg|\(single|unilateral|pistol|b-stance|kroc|meadows|suitcase|concentration/i;
const SUPPORT_PATTERN_NAME = /lunge|split squat|step-?up|calf raise/i;
const REDUCED_RANGE_NAME = /(^|\b)(back squat|front squat|barbell bench press|overhead press|conventional deadlift|romanian deadlift|trap bar deadlift)\b/i;
const CABLE_ROTATION_NAME = /woodchop|pallof|rotation|crunch/i;

/**
 * Which contexts materially change THIS exercise's setup, judged from
 * the row's own metadata (null-tolerant: unknown metadata earns no
 * class line - the honest floor). Mirrored by
 * scripts/adapted-setup-coverage.mjs, which audits the whole seed with
 * these same rules.
 */
export function materialContextsFor(ex) {
  if (!ex || !ex.name) return [];
  const n = String(ex.name).toLowerCase();
  const out = [];
  const singleSided = SINGLE_SIDED_NAME.test(n);
  const pullHinge = ex.movementPattern === 'pull' || ex.movementPattern === 'hinge';

  // Forearm-primary rows are excluded: where grip IS the training
  // purpose, a strap removes the exercise rather than adapting it.
  if (ex.gripDemand === 'bar'
    && ex.primaryMuscle !== 'forearms'
    && (pullHinge || ['back', 'traps'].includes(ex.primaryMuscle))
    && !/curl|reverse hyper|back extension/.test(n)) {
    out.push(SETUP_CONTEXT.STRAP_CUFF);
  }
  if (ex.equipment === 'cable' && UPPER_MUSCLES.has(ex.primaryMuscle)
    && !singleSided && !CABLE_ROTATION_NAME.test(n)) {
    out.push(SETUP_CONTEXT.ONE_ARM);
  }
  if (ex.position === 'standing'
    && (ex.equipment === 'dumbbell' || ex.equipment === 'cable' || ex.equipment === 'band')
    && UPPER_MUSCLES.has(ex.primaryMuscle) && !singleSided
    && !/seated|lying|chest-supported|prone|walk|carry|march/.test(n)) {
    out.push(SETUP_CONTEXT.SEATED);
  }
  if ((ex.balanceDemand === 'high' || (SUPPORT_PATTERN_NAME.test(n) && ex.position === 'standing'))
    && ex.impact !== true && ex.impact !== 1) {
    out.push(SETUP_CONTEXT.SUPPORTED);
  }
  if (ex.equipment === 'barbell' && REDUCED_RANGE_NAME.test(n)) {
    out.push(SETUP_CONTEXT.REDUCED_RANGE);
  }
  return out;
}

/** The adapted-setup lines for one exercise, as [{context, label,
 *  text}] in a stable order, or []. Accepts the exercise row (class
 *  rules + specific entry, specific text winning per context) or a
 *  bare name (specific entry only, kept for existing callers). */
export function adaptedSetupFor(exOrName) {
  const name = typeof exOrName === 'string' ? exOrName : exOrName?.name;
  if (!name) return [];
  const entry = ADAPTED_SETUP[name] ?? {};
  const classCtx = typeof exOrName === 'string' ? [] : materialContextsFor(exOrName);
  return Object.values(SETUP_CONTEXT)
    .filter(ctx => entry[ctx] || (classCtx.includes(ctx) && CLASS_TEXT[ctx]))
    .map(ctx => ({
      context: ctx,
      label: SETUP_CONTEXT_LABELS[ctx],
      text: entry[ctx] ?? CLASS_TEXT[ctx],
    }));
}
