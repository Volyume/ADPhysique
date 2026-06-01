/**
 * Builds the quiet "last synced" line shown in Settings > Your data (A2-006).
 * Reads the sync runner's getStatus() snapshot ({ status, queue_depth,
 * last_run_at, last_error }).
 *
 * This deliberately does NOT surface a red "error" state.
 * PRODUCTION_READINESS_LOCKED.md section 1: the old header badge's transient
 * red error (a pull-side blip with no pending writes, nothing lost) was
 * alarming and was removed by founder direction. The signal that actually
 * matters to the user is whether their own writes are backing up, so we
 * report the queue depth, not the pull status. Quiet, factual, no nag.
 */

// Coarse "x ago" for a quiet status line. Floor everywhere so we never
// round a recent sync up into the next bucket (31 min must not read as
// "1 h ago"). Returns null when there is no timestamp.
export function formatRelativeTime(thenMs, nowMs) {
  if (!thenMs) return null;
  const sec = Math.max(0, Math.floor((nowMs - thenMs) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? '' : 's'} ago`;
}

export function formatLastSynced(snapshot, nowMs = Date.now()) {
  const lastRunAt = snapshot?.last_run_at ?? 0;
  const queueDepth = snapshot?.queue_depth ?? 0;
  if (!lastRunAt) {
    return 'Not synced yet.';
  }
  const rel = formatRelativeTime(lastRunAt, nowMs);
  if (queueDepth > 0) {
    const noun = queueDepth === 1 ? 'change' : 'changes';
    return `Last synced ${rel}. ${queueDepth} ${noun} waiting to upload.`;
  }
  return `Last synced ${rel}.`;
}
