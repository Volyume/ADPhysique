/**
 * The menu that runs every action does not run one twice, or fail in silence
 * (adversarial audit 2026-08-26, finding 20 items J and L).
 *
 * PeekMenu is the app's generic action dispatcher. Deleting a routine, removing
 * a set, sharing a card, signing out: they all arrive here as an item with an
 * onPress. Two problems came with that position.
 *
 * 1. IT SWALLOWED EVERYTHING. The call sat inside `try { ... } catch (_) {}`.
 *    A throw produced nothing at all: the sheet closed, the action did not
 *    happen, and there was no toast, no log and no Sentry event. A menu that
 *    silently does nothing looks exactly like a menu that worked, so the user's
 *    next move is based on a false belief about their own data.
 *
 * 2. THE DEFERRAL LEFT A WINDOW. The action runs on a timer so it lands after
 *    the close animation rather than under it. setVisible(false) only STARTS
 *    that animation, so the items stay mounted and tappable for roughly 200ms.
 *    Tapping the same item twice was already safe, because closeSheet clears
 *    the pending timer. Tapping a DIFFERENT item was not: the second tap
 *    replaced the first action and dropped it without a word.
 *
 * These are source guards. PeekMenu's behaviour lives in a timer inside an
 * imperative handle, and pinning the shape is what stops the two properties
 * being refactored away; the dispatch semantics themselves are exercised below
 * against a faithful copy of the function.
 */

const fs = require('fs');
const path = require('path');
const { dispatchPeekMenuAction } = require('../peekMenuDispatch');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'PeekMenu.js'), 'utf8');
const code = SRC.split('\n')
  .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
  .join('\n');

/** The dispatch semantics, as implemented, so the behaviour is testable. */
function makeDispatcher({ onError } = {}) {
  let dispatched = false;
  let timer = null;
  const closeSheet = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return {
    open() { dispatched = false; },
    handleItem(item) {
      if (dispatched) return;
      dispatched = true;
      closeSheet();
      timer = setTimeout(() => {
        timer = null;
        void dispatchPeekMenuAction(item, onError);
      }, 0);
    },
  };
}

const settle = () => new Promise((r) => setTimeout(r, 5));

describe('one tap, one action', () => {
  test('a second tap on a different item is ignored', async () => {
    const a = jest.fn();
    const b = jest.fn();
    const d = makeDispatcher();
    d.open();
    d.handleItem({ label: 'A', onPress: a });
    d.handleItem({ label: 'B', onPress: b });
    await settle();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  test('a double tap on the same item runs it once', async () => {
    const a = jest.fn();
    const d = makeDispatcher();
    d.open();
    d.handleItem({ label: 'Delete', onPress: a });
    d.handleItem({ label: 'Delete', onPress: a });
    await settle();
    expect(a).toHaveBeenCalledTimes(1);
  });

  test('the first tap is the one that wins, not the last', async () => {
    // Last-wins would silently discard what the user actually chose first,
    // which is the behaviour that made the drop invisible.
    const order = [];
    const d = makeDispatcher();
    d.open();
    d.handleItem({ label: 'A', onPress: () => order.push('A') });
    d.handleItem({ label: 'B', onPress: () => order.push('B') });
    await settle();
    expect(order).toEqual(['A']);
  });

  test('re-opening the menu allows another action', async () => {
    // The guard must not turn into "one action per app launch".
    const a = jest.fn();
    const d = makeDispatcher();
    d.open();
    d.handleItem({ label: 'A', onPress: a });
    await settle();
    d.open();
    d.handleItem({ label: 'A', onPress: a });
    await settle();
    expect(a).toHaveBeenCalledTimes(2);
  });
});

describe('a failing action is reported, not swallowed', () => {
  test('the error reaches the handler instead of vanishing', async () => {
    const onError = jest.fn();
    const boom = new Error('delete failed');
    const d = makeDispatcher({ onError });
    d.open();
    d.handleItem({ label: 'Delete routine', onPress: () => { throw boom; } });
    await settle();
    expect(onError).toHaveBeenCalledWith(boom, expect.objectContaining({ label: 'Delete routine' }));
  });

  test('a throw does not take the app down with it', async () => {
    // It still has to be caught: an uncaught throw inside a timer is a crash.
    const d = makeDispatcher({ onError: () => {} });
    d.open();
    expect(() => d.handleItem({ onPress: () => { throw new Error('x'); } })).not.toThrow();
    await settle();
  });

  test('a rejected async action reaches the same handler', async () => {
    const onError = jest.fn();
    const boom = new Error('async delete failed');
    const d = makeDispatcher({ onError });
    d.open();
    d.handleItem({ label: 'Delete routine', onPress: async () => { throw boom; } });
    await settle();
    expect(onError).toHaveBeenCalledWith(boom, expect.objectContaining({ label: 'Delete routine' }));
  });

  test('a slow successful promise completes without a false failure', async () => {
    const onError = jest.fn();
    let release;
    const completed = jest.fn();
    const action = new Promise((resolve) => { release = resolve; });
    const pending = dispatchPeekMenuAction({ onPress: () => action.then(completed) }, onError);
    expect(completed).not.toHaveBeenCalled();
    release('ok');
    await expect(pending).resolves.toBeUndefined();
    expect(completed).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  test('an item with no onPress at all is a clean no-op', async () => {
    const onError = jest.fn();
    const d = makeDispatcher({ onError });
    d.open();
    d.handleItem({ label: 'Nothing' });
    await settle();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('the component keeps both properties', () => {
  test('the one-shot flag guards the dispatch', () => {
    expect(code).toMatch(/if \(dispatchedRef\.current\) return;/);
    expect(code).toMatch(/dispatchedRef\.current = true;/);
  });

  test('and is re-armed when the menu opens, not left latched', () => {
    const open = code.slice(code.indexOf('open: (cfg) =>'));
    expect(open.slice(0, 200)).toMatch(/dispatchedRef\.current = false;/);
  });

  test('the empty catch is gone', () => {
    // The exact shape that made every failure invisible.
    expect(code).not.toMatch(/try \{ item\.onPress\?\.\(\); \} catch \(_\) \{\}/);
  });

  test('a failure is logged with the action, so it is diagnosable', () => {
    expect(code).toMatch(/logError\('PeekMenu\.action', e, \{ label:/);
  });

  test('and the user is told, in the calm voice, that it did not run', () => {
    expect(code).toMatch(/toast\?\.show\?\.\("That didn't work\. Please try again\."/);
    expect(code).toMatch(/variant: 'error'/);
  });

  test('the label sent to logging is only ever a string', () => {
    // Menu labels can be elements. Sending one to Sentry would be both useless
    // and a data-minimisation risk.
    expect(code).toMatch(/typeof failedItem\?\.label === 'string' \? failedItem\.label : null/);
  });

  test('the toast itself stays best-effort, so it cannot mask the real error', () => {
    const branch = code.slice(code.indexOf("logError('PeekMenu.action'"));
    expect(branch.slice(0, 400)).toMatch(/catch \(_\) \{ \/\* toast is best-effort \*\/ \}/);
  });
});
