/**
 * capability/directory/injuries.js - the injury / body-region knowledge
 * directory (gap-closure order section 6). Profiles select QUESTIONS
 * that establish functional constraints; they never impose bans (order
 * section 7).
 *
 * Every profile validates against validateInjuryProfile (schema.js) in
 * the directory suite; evidence cites the banked research
 * (research/R8-injury-directory-evidence.md) with source, year, URL,
 * tier and a verbatim quote. Content is populated by the gap-closure
 * Phase B adjudication; an empty array is a valid (inert) state.
 */

export const INJURY_PROFILES = Object.freeze([]);
