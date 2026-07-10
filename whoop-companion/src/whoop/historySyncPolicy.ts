export function historySyncIsDurablyComplete(input: {
  reason: 'complete' | 'timeout' | 'disconnect';
  rawRecords: number;
  durableEndChunks: number;
  acknowledgedEndChunks: number;
  failed: boolean;
}): boolean {
  if (input.reason !== 'complete' || input.failed) return false;
  if (input.rawRecords <= 0) {
    return input.durableEndChunks === 0 && input.acknowledgedEndChunks === 0;
  }
  return input.durableEndChunks > 0 && input.durableEndChunks === input.acknowledgedEndChunks;
}

/** A second immediate pass is useful only when the strap advanced its durable
 * history endpoint. Replaying the endpoint present at the start of the pass is
 * an acknowledgement retry, not new history progress. */
export function historyCursorAdvanced(startEndKey: string | null, lastAckedEndKey: string | null): boolean {
  return lastAckedEndKey != null && lastAckedEndKey !== startEndKey;
}

/** Failed auto-sync attempts back off quickly enough to recover a transient
 * link, but stop hammering the same stored range indefinitely. */
export function historyRetryDelayMs(failedAttempts: number, baseMs = 15_000, maxMs = 15 * 60_000): number {
  const attempt = Math.max(1, Math.floor(failedAttempts));
  return Math.min(maxMs, baseMs * 2 ** Math.min(6, attempt - 1));
}

export function historyEndShouldQueue(
  endKey: string,
  queuedEndKeys: ReadonlySet<string>,
  acknowledgedEndKeys: ReadonlySet<string>,
): boolean {
  return endKey.length > 0 && !queuedEndKeys.has(endKey) && !acknowledgedEndKeys.has(endKey);
}
