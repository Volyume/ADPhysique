/**
 * runInTransaction serialises SQLite transactions so two never overlap on
 * the shared connection. Regression guard for the onboarding crash
 * "cannot start a transaction within a transaction", which happened when
 * plan generation and the offline-sync queue flushed at the same time and
 * both opened a withTransactionAsync block on the one connection.
 */
import { runInTransaction } from '../database';

// A fake connection whose withTransactionAsync throws if a second
// transaction starts before the first finishes — exactly how expo-sqlite
// behaves on the shared connection. If runInTransaction serialises
// correctly, this never throws.
function makeStrictDb() {
  let inTx = false;
  return {
    inTxPeak: false,
    isInTransactionSync: () => inTx,
    withTransactionAsync: async function (task) {
      if (inTx) throw new Error('cannot start a transaction within a transaction');
      inTx = true;
      try {
        // Yield to the event loop mid-transaction so an un-serialised
        // concurrent call would interleave here.
        await new Promise(r => setTimeout(r, 0));
        await task();
      } finally {
        inTx = false;
      }
    },
  };
}

test('serialises concurrent transactions (no nested BEGIN)', async () => {
  const d = makeStrictDb();
  const order = [];
  // Fire several transactions concurrently, as onboarding does (plan-gen +
  // sync flush). Without serialisation the 2nd BEGIN throws.
  await Promise.all([
    runInTransaction(d, async () => { order.push('a'); }),
    runInTransaction(d, async () => { order.push('b'); }),
    runInTransaction(d, async () => { order.push('c'); }),
  ]);
  expect(order.sort()).toEqual(['a', 'b', 'c']);
});

test('runs the task inline when a transaction is already open (reentrancy guard)', async () => {
  let open = true;
  const d = {
    isInTransactionSync: () => open,
    withTransactionAsync: async () => { throw new Error('should not nest a BEGIN'); },
  };
  let ran = false;
  await runInTransaction(d, async () => { ran = true; });
  expect(ran).toBe(true);
  open = false;
});

test('resolves to the task return value on every path (R2-13)', async () => {
  // Production regression (build 2694, fresh-install plan generation):
  // expo-sqlite's withTransactionAsync awaits the task but DISCARDS its
  // return value — the strict fake above mirrors that. runInTransaction
  // must hand the task's result back itself, or value-consuming callers
  // (planAutoGen's writeResult) read properties off undefined AFTER the
  // commit has already landed.
  const d = makeStrictDb();
  const queued = await runInTransaction(d, async () => ({ zeroMatch: false, totalWritten: 4 }));
  expect(queued).toEqual({ zeroMatch: false, totalWritten: 4 });

  // The reentrant inline path returns the value too.
  let open = true;
  const inline = {
    isInTransactionSync: () => open,
    withTransactionAsync: async () => { throw new Error('should not nest a BEGIN'); },
  };
  const nested = await runInTransaction(inline, async () => 'inline-value');
  expect(nested).toBe('inline-value');
  open = false;
});

test('a failing transaction does not wedge the queue', async () => {
  const d = makeStrictDb();
  await expect(
    runInTransaction(d, async () => { throw new Error('boom'); }),
  ).rejects.toThrow('boom');
  // The next transaction still runs.
  let ran = false;
  await runInTransaction(d, async () => { ran = true; });
  expect(ran).toBe(true);
});
