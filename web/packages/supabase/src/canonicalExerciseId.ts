// Deterministic canonical exercise IDs, ported VERBATIM from the mobile app
// (src/lib/seedExercises.js canonicalExerciseId). The app hashes an exercise
// NAME into a UUID-shaped string so every device, and now the web, produces the
// same ID for the same canonical exercise. That is what lets the web resolve a
// workout_set.exercise_id (synced from the app) back to a library exercise
// without the global library living in the cloud. Pure JS, no crypto dependency.
export function canonicalExerciseId(name: string): string {
  const s = String(name || '').toLowerCase().trim();
  let a = 0xdeadbeef;
  let b = 0x41c6ce57;
  let c = 0x1b873593;
  let d = 0xcc9e2d51;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    a = Math.imul(a ^ ch, 2654435761);
    b = Math.imul(b ^ ch, 1597334677);
    c = Math.imul(c ^ ch, 2246822507);
    d = Math.imul(d ^ ch, 3266489909);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507);
  a ^= Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507);
  b ^= Math.imul(c ^ (c >>> 13), 3266489909);
  c = Math.imul(c ^ (c >>> 16), 2246822507);
  c ^= Math.imul(d ^ (d >>> 13), 3266489909);
  d = Math.imul(d ^ (d >>> 16), 2246822507);
  d ^= Math.imul(a ^ (a >>> 13), 3266489909);
  const h = (x: number) => (x >>> 0).toString(16).padStart(8, '0');
  const full = h(a) + h(b) + h(c) + h(d);
  const seg1 = full.substring(0, 8);
  const seg2 = full.substring(8, 12);
  const seg3 = '4' + full.substring(13, 16);
  const variantNibble = ((parseInt(full[16]!, 16) & 0x3) | 0x8).toString(16);
  const seg4 = variantNibble + full.substring(17, 20);
  const seg5 = full.substring(20, 32);
  return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5}`;
}
