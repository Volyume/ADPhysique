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
 * name -> { context -> line }. Populated by the gap-closure content pass;
 * an empty map is a valid (inert) state. Names are canonical seed names.
 */
export const ADAPTED_SETUP = Object.freeze({});

/** The adapted-setup lines for one exercise name, as
 *  [{context, label, text}] in a stable order, or []. */
export function adaptedSetupFor(name) {
  const entry = ADAPTED_SETUP[name];
  if (!entry) return [];
  return Object.values(SETUP_CONTEXT)
    .filter(ctx => entry[ctx])
    .map(ctx => ({ context: ctx, label: SETUP_CONTEXT_LABELS[ctx], text: entry[ctx] }));
}
