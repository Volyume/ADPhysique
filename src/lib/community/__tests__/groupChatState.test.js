/**
 * Round 3R, F1 and F2: the chat list merges the newest page by id and never
 * replaces what the person scrolled to; older pages never repeat an id.
 */
import { mergeNewestPage, appendOlderPage, dedupeById } from '../groupChatState';

const m = (n) => ({ id: `m${n}`, created_at: new Date(2026, 9, 8, 12, n).toISOString(), body: `b${n}` });
// Newest first, as the server returns.
const page = (from, to) => { const out = []; for (let i = from; i >= to; i -= 1) out.push(m(i)); return out; };

describe('mergeNewestPage (F1)', () => {
  test('older pages already on screen stay, and the cursor is kept', () => {
    const prev = page(60, 1); // two pages loaded
    const merged = mergeNewestPage(prev, 'CUR-OLD', { messages: page(61, 32), cursor: 'CUR-NEW' });
    expect(merged.messages.map((x) => x.id)).toEqual(page(61, 1).map((x) => x.id));
    expect(merged.cursor).toBe('CUR-OLD');
  });
  test('with nothing older held, the page cursor is adopted', () => {
    const merged = mergeNewestPage(page(30, 1), null, { messages: page(31, 1), cursor: 'C2' });
    expect(merged.cursor).toBe('C2');
  });
  test('a message inside the page window that the page no longer holds is dropped', () => {
    const prev = page(10, 1);
    const head = page(10, 1).filter((x) => x.id !== 'm8');
    const merged = mergeNewestPage(prev, null, { messages: head, cursor: null });
    expect(merged.messages.map((x) => x.id)).not.toContain('m8');
  });
  test('a new message arrives at the head without touching the rest', () => {
    const prev = page(5, 1);
    const merged = mergeNewestPage(prev, null, { messages: page(6, 1), cursor: null });
    expect(merged.messages[0].id).toBe('m6');
    expect(merged.messages).toHaveLength(6);
  });
  test('an empty page empties the list', () => {
    expect(mergeNewestPage(page(3, 1), 'c', { messages: [], cursor: null }).messages).toEqual([]);
  });
});

describe('appendOlderPage and dedupeById (F2)', () => {
  test('a page fetched twice appends once', () => {
    const prev = page(60, 31);
    const once = appendOlderPage(prev, page(30, 1));
    const twice = appendOlderPage(once, page(30, 1));
    expect(twice).toHaveLength(60);
    expect(new Set(twice.map((x) => x.id)).size).toBe(60);
  });
  test('dedupe keeps the first occurrence in order', () => {
    expect(dedupeById([m(2), m(1), m(2)]).map((x) => x.id)).toEqual(['m2', 'm1']);
  });
});
