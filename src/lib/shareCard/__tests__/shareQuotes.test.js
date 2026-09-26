/**
 * shareQuotes -- the optional quotes and lines on a share image (founder,
 * 2026-09-26: "Is there an elegant way to do bodybuilding short quotes that
 * people can insert perhaps? ... We don't want to force them on but
 * optional?").
 *
 * WHAT THIS SUITE PINS: every quote carries who said it and where its
 * wording was checked; every quote and line is short enough for the card;
 * none carries the themes the voice and the ED-safety system rule out; and
 * the athlete's own caption is tidied, never lengthened.
 */
import {
  SHARE_QUOTES, SHARE_LINES, MAX_CAPTION_LENGTH, cleanCaption,
} from '../shareQuotes';

describe('the quotes', () => {
  test('each has its words, who said them and where they were checked', () => {
    expect(SHARE_QUOTES.length).toBeGreaterThanOrEqual(4);
    for (const q of SHARE_QUOTES) {
      expect(typeof q.text).toBe('string');
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.by).toMatch(/\S/);
      expect(q.source).toMatch(/\S/);
    }
  });

  test('short enough for the card, and in typographic apostrophes', () => {
    for (const q of SHARE_QUOTES) {
      expect(q.text.length).toBeLessThanOrEqual(90);
      expect(q.text).not.toMatch(/'/);
    }
  });

  test('none glorifies pain, restriction or excess, or puts anyone down', () => {
    const banned = /\b(pain|puke|vomit|no days off|diet|starv|lean|shred|cut\b|fat|skinny|weak(ling)?s?\b|steroid|drug|beer|drunk|kill|die|death|bleed|blood)/i;
    for (const text of [...SHARE_QUOTES.map((q) => q.text), ...SHARE_LINES]) {
      expect(text).not.toMatch(banned);
    }
  });
});

describe("the athlete's own words", () => {
  test('are tidied and cut to the card\'s length, never lengthened', () => {
    expect(cleanCaption('  Back day\n\n done  ')).toBe('Back day done');
    expect(cleanCaption('x'.repeat(200))).toHaveLength(MAX_CAPTION_LENGTH);
    expect(cleanCaption(null)).toBe('');
  });
});
