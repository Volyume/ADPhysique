/**
 * shareQuotes.js — the optional quote or caption on a share image.
 *
 * Founder, 2026-09-26: "Is there an elegant way to do bodybuilding short
 * quotes that people can insert perhaps? ... We don't want to force them on
 * but optional? The idea is people will be proud to share it and it will
 * gain more interest."
 *
 * Three sources, all optional, none on by default:
 *  - SHARE_LINES: short lines written in Volyume's own calm voice
 *    (docs/COACHING_VOICE_SYNTHESIS_LOCKED.md), with no named source.
 *  - SHARE_QUOTES: short quotes from bodybuilding and strength figures, each
 *    kept only with a checked source (the `source` field records where the
 *    wording was verified), and chosen for the same voice: consistency,
 *    patience, craft. Nothing that glorifies pain, extreme dieting or
 *    leanness, body shame, drugs, alcohol or putting others down, because
 *    the app carries an eating-disorder safety system and a no-shame voice.
 *  - The athlete's own words, up to MAX_CAPTION_LENGTH characters.
 *
 * Pure data and one pure helper.
 */

export const MAX_CAPTION_LENGTH = 60;

/** Lines in Volyume's own voice. No source is named, so none is shown. */
export const SHARE_LINES = Object.freeze([
  'Showed up. Did the work.',
  'One more session in the bank.',
  'Built one session at a time.',
  'Small wins add up.',
  'Quiet work, steady progress.',
  'Another week, another step.',
]);

/**
 * Quotes with a named source, shown in curly quotes with the name under
 * them. Each entry records where its wording was checked: kept only when the
 * exact words were seen in the person's own writing or recorded speech, or a
 * reputable reproduction of it (research lane 2026-09-26; lines found only on
 * quote-aggregator sites, and lines that glorify pain or mock others, were
 * dropped, among them many commonly credited to famous lifters).
 * @type {ReadonlyArray<{text:string, by:string, source:string}>}
 */
export const SHARE_QUOTES = Object.freeze([
  Object.freeze({
    text: 'Stimulate, don\u2019t annihilate.',
    by: 'Lee Haney',
    source: 'Lee Haney, his own Instagram post ("You\u2019ve heard me say stimulate, don\u2019t annihilate"), quoted in FitnessVolt, fitnessvolt.com/lee-haney-tips-safe-contest-prep',
  }),
  Object.freeze({
    text: 'You\u2019ve got to recover first and then you can repair.',
    by: 'Dorian Yates',
    source: 'The Tim Ferriss Show #235, official transcript, tim.blog/2018/06/05/the-tim-ferriss-show-transcripts-dorian-yates (the sentence continues "and hopefully overcompensate a little bit")',
  }),
  Object.freeze({
    text: 'Keep the goal the goal. Stay consistent. Repeat what works.',
    by: 'Dan John',
    source: 'Dan John, his own newsletter, coachdanjohn.substack.com/p/day-twenty-one-keep-the-goal-the',
  }),
  Object.freeze({
    text: 'The Iron never lies to you.',
    by: 'Henry Rollins',
    source: '"Iron and the Soul", Details magazine, 1994, its opening line (reproduced by Art of Manliness)',
  }),
  Object.freeze({
    text: 'It\u2019s about how hard you can get hit and keep moving forward.',
    by: 'Rocky Balboa',
    source: 'Rocky Balboa (2006), written and directed by Sylvester Stallone; verbatim part of the line, checked against IMDb and Wikiquote',
  }),
]);

/**
 * The athlete's own caption, tidied: trimmed, inner runs of spaces and line
 * breaks folded to one space, and cut to MAX_CAPTION_LENGTH. Characters the
 * card's typeface cannot draw (emoji) are left out at drawing time
 * (drawShareCard.js drawableText), so nothing prints as an empty box.
 */
export function cleanCaption(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION_LENGTH);
}
