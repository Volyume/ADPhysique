/**
 * Pure list logic for the group chat screen (round 3R, F1 and F2), kept out of
 * the screen so it can be tested as behaviour. Lists are newest first, as the
 * server returns them.
 */

const tsOf = (m) => {
  const ms = Date.parse(m?.created_at);
  return Number.isFinite(ms) ? ms : 0;
};

/** First occurrence of each id wins; order preserved. */
export function dedupeById(rows) {
  const seen = new Set();
  const out = [];
  for (const m of rows) {
    const id = String(m?.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(m);
  }
  return out;
}

/**
 * Merge the newest page into the head of what is on screen, by id. Older
 * pages the person scrolled to stay; a message inside the page's own window
 * that the page no longer holds (deleted, or its author now hidden) goes.
 * The cursor is kept while older pages are held, else the page's own.
 *
 * @returns {{messages: Array, cursor: (string|null)}}
 */
export function mergeNewestPage(prev, prevCursor, page) {
  const head = Array.isArray(page?.messages) ? page.messages : [];
  if (!head.length) return { messages: [], cursor: page?.cursor ?? null };
  const have = new Set(head.map((m) => String(m.id)));
  const oldestTs = tsOf(head[head.length - 1]);
  const older = prev.filter((m) => !have.has(String(m.id)) && tsOf(m) < oldestTs);
  return {
    messages: dedupeById([...head, ...older]),
    cursor: older.length ? prevCursor : (page.cursor ?? null),
  };
}

/** Append an older page, never repeating an id already on screen. */
export function appendOlderPage(prev, page) {
  return dedupeById([...prev, ...(Array.isArray(page) ? page : [])]);
}
