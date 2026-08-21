/**
 * capability/directory/index.js - pure accessors over the condition and
 * injury knowledge directories (GC-D1/GC-D2). No IO, no store reads, no
 * writes: the directory is a stateless lens. Consumers render profiles,
 * ask their questions through the EXISTING consent-gated constraint flow,
 * and persist nothing else.
 */

import { CONDITION_PROFILES } from './conditions';
import { INJURY_PROFILES } from './injuries';

/** The explicit OTHER / NOT LISTED path (order section 4): always
 *  present, routes straight to the generic functional flow. Not a
 *  knowledge profile - carries no evidence and asks nothing specific. */
export const OTHER_PROFILE = Object.freeze({
  id: 'other_not_listed',
  kind: 'other',
  canonicalName: 'Something else, or not listed',
  aliases: [],
  routeNote: 'You do not need a name for it. Volyume works from what you tell it about how you train.',
});

export function allConditionProfiles() {
  return CONDITION_PROFILES;
}

export function allInjuryProfiles() {
  return INJURY_PROFILES;
}

export function profileById(id) {
  if (!id) return null;
  if (id === OTHER_PROFILE.id) return OTHER_PROFILE;
  return (
    CONDITION_PROFILES.find(p => p.id === id) ??
    INJURY_PROFILES.find(p => p.id === id) ??
    null
  );
}

function matchScore(profile, needle) {
  const name = profile.canonicalName.toLowerCase();
  if (name === needle) return 0;
  const aliases = profile.aliases.map(a => a.toLowerCase());
  if (aliases.includes(needle)) return 1;
  if (name.startsWith(needle)) return 2;
  if (aliases.some(a => a.startsWith(needle))) return 3;
  if (name.includes(needle)) return 4;
  if (aliases.some(a => a.includes(needle))) return 5;
  return -1;
}

/**
 * Deterministic search over both directories by name or alias.
 * Case-insensitive; ranked exact > alias-exact > prefix > substring, then
 * alphabetical. The OTHER path is ALWAYS the final row so no search dead-
 * ends (order section 4's extensibility law).
 * @returns {Array<object>} matched profiles + OTHER_PROFILE last
 */
export function searchProfiles(query) {
  const needle = String(query ?? '').trim().toLowerCase();
  const pool = [...CONDITION_PROFILES, ...INJURY_PROFILES];
  if (!needle) return [...pool].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)).concat(OTHER_PROFILE);
  const scored = [];
  for (const p of pool) {
    const score = matchScore(p, needle);
    if (score >= 0) scored.push({ p, score });
  }
  scored.sort((a, b) => (a.score - b.score) || a.p.canonicalName.localeCompare(b.p.canonicalName));
  return scored.map(s => s.p).concat(OTHER_PROFILE);
}
