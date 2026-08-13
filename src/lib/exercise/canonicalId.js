/**
 * canonicalId.js — the deterministic exercise identity every layer agrees on.
 *
 * Extracted from seedExercises.js in Campaign 16 job 9 so that planEngine can
 * stamp an identity on a generated exercise. seedExercises.js imports
 * AsyncStorage and database.js; the engine must stay pure and free of I/O, so
 * the hash needed a home of its own. seedExercises re-exports it, and every
 * existing import path still works unchanged.
 *
 * WHY IDENTITY MATTERS HERE, not just for sync
 *
 * A generated plan used to travel as a STRING NAME and was matched to the
 * library by a lowercase lookup at save time. When a name did not match,
 * the exercise was silently dropped AFTER it had already been previewed and
 * counted in the plan's weekly volume. That is not hypothetical: the
 * engine's fallback pool carried `Abductor Machine`, no library row has
 * that name, and Bikini users previewed three sets of glute work they never
 * received.
 *
 * The hash below is deliberately the SAME function the seed uses to mint
 * row IDs, so an ID stamped by the pure engine on a device with no database
 * open is the id the seeded row will actually have.
 */

//
// Canonical exercises ship in every install. Originally their IDs were
// random UUIDs minted by uid() inside insertExercise, which meant the
// SAME exercise on two devices ended up with two different IDs.
// That broke cross-device sync as soon as a routine pushed its
// routine_exercises rows: the new device's pull saw the exercise_id
// from the old device's random seed, found no local match, and the
// INNER JOIN that powers ActiveWorkoutScreen returned zero rows even
// though the routine card showed the correct exercise count.
//
// canonicalExerciseId() hashes the exercise NAME into a UUID-shaped
// string so every device produces the same canonical ID for the same
// canonical name. New routine_exercises pushed from this build land
// in the cloud with IDs the next device's seed will produce
// independently, and the JOIN resolves naturally.
//
// Custom exercises are unaffected, they keep their random uid() and
// already round-trip via syncCustomExercises.
//
// The hash is a 128-bit MurmurHash-style mixer split across four
// lanes seeded with distinct primes so a one-character change in the
// name avalanches across the whole output. Pure JS, no crypto
// dependency.
export function canonicalExerciseId(name) {
  const s = String(name || '').toLowerCase().trim();
  // Four 32-bit lanes mixed with name bytes. Lane seeds are
  // distinct large primes chosen so even single-byte inputs (we
  // don't expect any but it's polite) produce well-distributed
  // outputs.
  let a = 0xdeadbeef, b = 0x41c6ce57, c = 0x1b873593, d = 0xcc9e2d51;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    a = Math.imul(a ^ ch, 2654435761);
    b = Math.imul(b ^ ch, 1597334677);
    c = Math.imul(c ^ ch, 2246822507);
    d = Math.imul(d ^ ch, 3266489909);
  }
  // Final avalanche so the high bits depend on every input byte.
  a = Math.imul(a ^ (a >>> 16), 2246822507);
  a ^= Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507);
  b ^= Math.imul(c ^ (c >>> 13), 3266489909);
  c = Math.imul(c ^ (c >>> 16), 2246822507);
  c ^= Math.imul(d ^ (d >>> 13), 3266489909);
  d = Math.imul(d ^ (d >>> 16), 2246822507);
  d ^= Math.imul(a ^ (a >>> 13), 3266489909);
  const h = (x) => (x >>> 0).toString(16).padStart(8, '0');
  // 32 hex chars total. Format as UUID v4: 8-4-4-4-12 with the
  // version (4) and variant (8/9/a/b) nibbles set per RFC 4122 so
  // anywhere that strictly validates a UUID still accepts it.
  const full = h(a) + h(b) + h(c) + h(d);
  const seg1 = full.substring(0, 8);
  const seg2 = full.substring(8, 12);
  const seg3 = '4' + full.substring(13, 16);
  const variantNibble = ((parseInt(full[16], 16) & 0x3) | 0x8).toString(16);
  const seg4 = variantNibble + full.substring(17, 20);
  const seg5 = full.substring(20, 32);
  return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5}`;
}