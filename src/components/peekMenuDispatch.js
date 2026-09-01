/**
 * Invoke a PeekMenu action through one promise-aware failure boundary.
 * `await` deliberately assimilates plain values, synchronous throws and
 * thenables, so a rejected async onPress cannot escape the timer that launched
 * it as an unhandled rejection.
 */
export async function dispatchPeekMenuAction(item, onFailure) {
  try {
    return await item?.onPress?.();
  } catch (error) {
    try { onFailure?.(error, item); } catch (_) { /* reporting is best-effort */ }
    return undefined;
  }
}

