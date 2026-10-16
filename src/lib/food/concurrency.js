/**
 * food/concurrency.js - D230 R17. Pure (no I/O of its own, no clock).
 *
 * mapWithConcurrency runs an async worker over a list with at most `limit`
 * calls in flight at once and returns the results in the ORDER OF THE INPUT,
 * whatever order the calls finish in. It exists for the recipe URL import:
 * thirty ingredient lines, each possibly waiting on a network timeout, used to
 * run one after another; they now run four at a time.
 *
 * A worker that throws rejects the whole call with that error once the calls
 * already started have settled (no new ones start after the failure). Callers
 * that want per-item failure handle it inside the worker and return a marker,
 * as the importer does.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit    how many may run at once (floored, at least 1)
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  const width = Math.max(1, Math.min(Math.floor(Number(limit)) || 1, list.length || 1));
  let next = 0;
  let failure = null;
  let failed = false;

  async function lane() {
    while (!failed) {
      const index = next;
      next += 1;
      if (index >= list.length) return;
      try {
        // eslint-disable-next-line no-await-in-loop
        results[index] = await worker(list[index], index);
      } catch (e) {
        if (!failed) { failed = true; failure = e; }
        return;
      }
    }
  }

  await Promise.all(Array.from({ length: width }, lane));
  if (failed) throw failure;
  return results;
}
