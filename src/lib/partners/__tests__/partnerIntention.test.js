/**
 * partnerIntention.test.js — the mutual weekly intention (D5-A) pure logic.
 *
 * Pins the copy law and the rest-safe kept-moment: each member is measured only
 * against their OWN aim; a miss HOLDS (never a red, never attribution); a resting
 * side withholds the kept-moment rather than failing it; and NO output line ever
 * compares one person's number against the other.
 */
import { resolveIntention, weekKeptTogether, clampAim, KEPT_LINE } from '../intention';

// The banned comparison vocabulary (mirrors the source-level guard).
const COMPARISON = /\b(ahead|behind|more than|less than|better|worse|beat|beats|won|winning|loser|ranked?|leading|trailing)\b/i;

describe('resolveIntention', () => {
  test('both aims set and equal -> one co-owned line, no per-person lines', () => {
    const r = resolveIntention({ myAim: 4, partnerAim: 4, partnerName: 'Sam' });
    expect(r.shared).toBe('You both aimed for 4 this week.');
    expect(r.mine).toBeNull();
    expect(r.theirs).toBeNull();
  });

  test('aims differ -> each own aim on its own line, no shared line', () => {
    const r = resolveIntention({ myAim: 4, partnerAim: 3, partnerName: 'Sam' });
    expect(r.shared).toBeNull();
    expect(r.mine).toBe('You aimed for 4 this week.');
    expect(r.theirs).toBe('Sam set an aim too.'); // ED-safe: partner's differing number withheld
  });

  test('only one side set -> only that own line', () => {
    expect(resolveIntention({ myAim: 5, partnerAim: 0 }).mine).toBe('You aimed for 5 this week.');
    expect(resolveIntention({ myAim: 5, partnerAim: 0 }).theirs).toBeNull();
    const t = resolveIntention({ myAim: 0, partnerAim: 2, partnerName: 'Sam' });
    expect(t.mine).toBeNull();
    expect(t.theirs).toBe('Sam set an aim too.');
  });

  test('neither set -> nothing', () => {
    const r = resolveIntention({ myAim: 0, partnerAim: 0 });
    expect(r).toEqual({ shared: null, mine: null, theirs: null });
  });

  test('falls back to a warm partner name', () => {
    expect(resolveIntention({ myAim: 0, partnerAim: 3 }).theirs).toBe('Your partner set an aim too.');
  });

  test('no output line ever compares the two numbers', () => {
    const cases = [
      resolveIntention({ myAim: 4, partnerAim: 4, partnerName: 'Sam' }),
      resolveIntention({ myAim: 5, partnerAim: 2, partnerName: 'Sam' }),
      resolveIntention({ myAim: 2, partnerAim: 5, partnerName: 'Sam' }),
    ];
    const text = cases.flatMap((c) => [c.shared, c.mine, c.theirs]).filter(Boolean).join(' ');
    expect(COMPARISON.test(text)).toBe(false);
    expect(/[–—]/.test(text)).toBe(false); // no em/en dash in user copy
  });
});

describe('weekKeptTogether (rest-safe)', () => {
  test('both met their own aim, neither resting -> kept', () => {
    expect(weekKeptTogether({
      myAim: 4, partnerAim: 3, myDone: 4, partnerDone: 3,
    })).toBe(true);
  });

  test('a miss HOLDS: not kept, but false is all it is (no attribution here)', () => {
    expect(weekKeptTogether({ myAim: 4, partnerAim: 3, myDone: 4, partnerDone: 2 })).toBe(false);
    expect(weekKeptTogether({ myAim: 4, partnerAim: 3, myDone: 1, partnerDone: 3 })).toBe(false);
  });

  test('a resting side withholds the kept-moment (never a fail)', () => {
    expect(weekKeptTogether({
      myAim: 4, partnerAim: 3, myDone: 4, partnerDone: 3, partnerResting: true,
    })).toBe(false);
    expect(weekKeptTogether({
      myAim: 4, partnerAim: 3, myDone: 4, partnerDone: 3, myResting: true,
    })).toBe(false);
  });

  test('needs both aims set', () => {
    expect(weekKeptTogether({ myAim: 0, partnerAim: 3, myDone: 5, partnerDone: 3 })).toBe(false);
    expect(weekKeptTogether({ myAim: 3, partnerAim: 0, myDone: 5, partnerDone: 3 })).toBe(false);
  });
});

describe('clampAim + KEPT_LINE', () => {
  test('clamps to 1..14', () => {
    expect(clampAim(0)).toBe(1);
    expect(clampAim(-5)).toBe(1);
    expect(clampAim(20)).toBe(14);
    expect(clampAim(4)).toBe(4);
  });

  test('the kept line is calm and carries no comparison or dash', () => {
    expect(KEPT_LINE).toBe('You both kept your week.');
    expect(COMPARISON.test(KEPT_LINE)).toBe(false);
    expect(/[–—]/.test(KEPT_LINE)).toBe(false);
  });
});
