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
 * them. Each entry records where its wording was checked.
 * @type {ReadonlyArray<{text:string, by:string, source:string}>}
 */
export const SHARE_QUOTES = Object.freeze([]);

/**
 * The athlete's own caption, tidied: trimmed, inner runs of spaces and line
 * breaks folded to one space, and cut to MAX_CAPTION_LENGTH. Characters the
 * card's typeface cannot draw (emoji) are left out at drawing time
 * (drawShareCard.js drawableText), so nothing prints as an empty box.
 */
export function cleanCaption(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION_LENGTH);
}
