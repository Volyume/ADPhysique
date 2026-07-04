/**
 * Partners D5-B1 — the FIXED acknowledgement set (the cheer's words).
 *
 * The cheer used to be a single wordless tap. This is the closed, pre-written,
 * no-shame set the sender picks from instead — still one send per pair per local
 * day, still NO free text (the no-messaging lock holds). The set is authored in
 * docs/volyume-elite-audit/PHASE-2-WAVE3-DESIGN-SPEC.md ("D5 · Partners A + B")
 * and used verbatim: calm, house voice, British English, no em dash, no
 * exclamation marks, never performance-ranking.
 *
 * Keys mirror the server CHECK in supabase/migrate_106_partner_cheer_kind.sql
 * and the local mirror column exactly. This module is the ONE source of truth;
 * partnerAcknowledgements.test.js pins that it is a closed enum with no
 * free-text path, and that the copy stays inside the coaching voice.
 */

// Order is the display order in the picker. 'here' is the quiet default and is
// what an old client / the pre-106 edge function falls back to.
export const ACKNOWLEDGEMENTS = Object.freeze([
  Object.freeze({ key: 'proud', line: 'Proud of your week.' }),
  Object.freeze({ key: 'good_back', line: 'Good to see you back.' }),
  Object.freeze({ key: 'strong_both', line: 'Strong week, both of us.' }),
  Object.freeze({ key: 'here', line: 'Here with you.' }),
]);

export const DEFAULT_ACK_KEY = 'here';

const BY_KEY = ACKNOWLEDGEMENTS.reduce((acc, a) => { acc[a.key] = a; return acc; }, {});

/** True only for a key in the closed set. Anything else (incl. free text) fails. */
export function isValidAckKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(BY_KEY, key);
}

/** The line for a key, falling back to the quiet default for an unknown key. */
export function ackLine(key) {
  return (isValidAckKey(key) ? BY_KEY[key] : BY_KEY[DEFAULT_ACK_KEY]).line;
}
