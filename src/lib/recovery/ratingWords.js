/**
 * ratingWords.js - the Workout Summary's fatigue scale in words (register D214
 * addendum 9, V5), the one list behind both places that print a fatigue
 * rating as a word:
 *
 *   - ReadinessCards' ratings card, for the AVERAGE of the recent sessions
 *     ("Fatigue after sessions · moderate (3.0 of 5)");
 *   - FatigueTrendCard's line, for EACH of the last two sessions' own rating
 *     ("You rated your last two sessions fresh and mild.").
 *
 * Levels 1 to 5 are the Workout Summary's own buttons: Fresh, Mild, Moderate,
 * High, Exhausted. Lower case, because the words sit inside a sentence.
 *
 * `lastTwoSessionsLine` is the card's one-line read of the last two rated
 * sessions. D204 (founder rule 2026-09-26, "They don't choose sessions!"): it
 * DESCRIBES what the athlete reported and never tells them to push, hold their
 * weights or take a lighter day. D214 addendum 9 (V5, rule 7): it used to print
 * ONE word for the AVERAGE of the two ratings, so Fresh plus Mild read "fresh"
 * and High plus Exhausted read "very tiring", words neither session was rated.
 * It now prints both ratings, each in the scale's own word ("You rated your last
 * two sessions fresh and mild."), and one word when both are the same. The words
 * come lowest first, so the sentence never implies an order of the two sessions
 * that it does not carry; the bars above it show the order.
 *
 * Pure. It lives here, not in either component, because ReadinessCards imports
 * FatigueTrendCard and the tests stub a component by module: a named constant
 * read from one component by the other is undefined the moment a test stubs it.
 */
export const FATIGUE_WORDS = Object.freeze(['fresh', 'mild', 'moderate', 'high', 'exhausted']);

/**
 * The scale's word for a rating or an average of ratings: the nearest level,
 * clamped to 1 to 5. A missing or unreadable value reads as level 1, the level
 * the trend bars draw it at.
 * @param {number} level
 * @returns {string}
 */
export function fatigueWord(level) {
  const n = Math.round(Number(level));
  return FATIGUE_WORDS[Math.min(FATIGUE_WORDS.length, Math.max(1, Number.isFinite(n) ? n : 1)) - 1];
}

/**
 * "You rated your last two sessions fresh and mild." from the sessions newest
 * first (each with `fatigueLevel` or `fatigue_level`), or '' with fewer than two.
 * @param {Array<object>} sessions
 * @returns {string}
 */
export function lastTwoSessionsLine(sessions) {
  if (!Array.isArray(sessions) || sessions.length < 2) return '';
  const words = sessions.slice(0, 2)
    .map((s) => fatigueWord(s?.fatigueLevel ?? s?.fatigue_level))
    .sort((a, b) => FATIGUE_WORDS.indexOf(a) - FATIGUE_WORDS.indexOf(b));
  const rated = words[0] === words[1] ? words[0] : `${words[0]} and ${words[1]}`;
  return `You rated your last two sessions ${rated}.`;
}
