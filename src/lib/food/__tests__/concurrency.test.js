/**
 * concurrency.test.js - D230 R17 (lane 3D). Pins mapWithConcurrency, the helper
 * behind the recipe URL import: never more than `limit` calls in flight, the
 * results in the order of the input whatever order the calls finish in, and a
 * thrown worker surfaces instead of vanishing.
 */
import { mapWithConcurrency } from '../concurrency';

const tick = () => new Promise((r) => setImmediate(r));

test('runs at most four at once and preserves input order', async () => {
  let inFlight = 0; let peak = 0;
  const items = Array.from({ length: 30 }, (_, i) => i);
  const out = await mapWithConcurrency(items, 4, async (n) => {
    inFlight += 1; peak = Math.max(peak, inFlight);
    // Later items finish first, so completion order differs from input order.
    for (let i = 0; i < (30 - n) % 5; i++) await tick();
    inFlight -= 1;
    return n * 2;
  });
  expect(peak).toBe(4);
  expect(out).toEqual(items.map((n) => n * 2));
});

test('passes the index, handles an empty list and a limit larger than the list', async () => {
  expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  expect(await mapWithConcurrency(['a', 'b'], 10, async (x, i) => `${x}${i}`)).toEqual(['a0', 'b1']);
});

test('a limit below one still makes progress, one at a time', async () => {
  let inFlight = 0; let peak = 0;
  await mapWithConcurrency([1, 2, 3], 0, async () => { inFlight += 1; peak = Math.max(peak, inFlight); await tick(); inFlight -= 1; });
  expect(peak).toBe(1);
});

test('a worker that throws rejects the call and stops starting new work', async () => {
  const started = [];
  await expect(mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 2, async (n) => {
    started.push(n);
    await tick();
    if (n === 2) throw new Error('boom');
    return n;
  })).rejects.toThrow('boom');
  expect(started.length).toBeLessThan(8);
});
