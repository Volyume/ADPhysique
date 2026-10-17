import { formatRelativeTime, formatLastSynced } from '../syncStatusLabel';

describe('formatRelativeTime', () => {
  const now = 1_700_000_000_000;

  test('null timestamp returns null', () => {
    expect(formatRelativeTime(0, now)).toBeNull();
    expect(formatRelativeTime(null, now)).toBeNull();
  });

  test('under a minute reads as just now', () => {
    expect(formatRelativeTime(now - 5 * 1000, now)).toBe('just now');
    expect(formatRelativeTime(now - 59 * 1000, now)).toBe('just now');
  });

  test('minutes floor, never rounding up into hours', () => {
    expect(formatRelativeTime(now - 60 * 1000, now)).toBe('1 minute ago');
    expect(formatRelativeTime(now - 31 * 60 * 1000, now)).toBe('31 minutes ago');
    expect(formatRelativeTime(now - 59 * 60 * 1000, now)).toBe('59 minutes ago');
  });

  test('hours', () => {
    expect(formatRelativeTime(now - 60 * 60 * 1000, now)).toBe('1 hour ago');
    expect(formatRelativeTime(now - 23 * 60 * 60 * 1000, now)).toBe('23 hours ago');
  });

  test('days, singular and plural', () => {
    expect(formatRelativeTime(now - 24 * 60 * 60 * 1000, now)).toBe('1 day ago');
    expect(formatRelativeTime(now - 3 * 24 * 60 * 60 * 1000, now)).toBe('3 days ago');
  });

  test('a clock skew (future timestamp) clamps to just now, never negative', () => {
    expect(formatRelativeTime(now + 5000, now)).toBe('just now');
  });
});

describe('formatLastSynced', () => {
  const now = 1_700_000_000_000;

  test('no snapshot / never run reads as not saved online yet', () => {
    expect(formatLastSynced(null, now)).toBe('Not saved online yet.');
    expect(formatLastSynced({ last_run_at: 0, queue_depth: 0 }, now)).toBe('Not saved online yet.');
  });

  test('synced with an empty queue shows only the time', () => {
    expect(formatLastSynced({ last_run_at: now - 5000, queue_depth: 0 }, now))
      .toBe('Last saved online just now.');
  });

  test('a backing-up queue is surfaced quietly, with correct pluralisation', () => {
    expect(formatLastSynced({ last_run_at: now - 120 * 1000, queue_depth: 1 }, now))
      .toBe('Last saved online 2 minutes ago. 1 change waiting to be saved online.');
    expect(formatLastSynced({ last_run_at: now - 120 * 1000, queue_depth: 3 }, now))
      .toBe('Last saved online 2 minutes ago. 3 changes waiting to be saved online.');
  });

  test('an error status with no pending writes does NOT alarm (lock § 1)', () => {
    // status:'error' but queue drained -> nothing at risk -> read it as a
    // normal last-synced line, no red, no "error" word. This is the exact
    // case the founder pulled the header badge over.
    const out = formatLastSynced({ status: 'error', last_run_at: now - 5000, queue_depth: 0 }, now);
    expect(out).toBe('Last saved online just now.');
    expect(out).not.toMatch(/error/i);
  });

  // Item 8 (D141): a parked (MAX_RETRIES-exhausted) op is stated plainly,
  // in the same calm register as the queue-depth line - never hidden, never
  // alarming.
  test('parked/failed ops are stated plainly alongside a normal last-synced line', () => {
    expect(formatLastSynced({ last_run_at: now - 120 * 1000, queue_depth: 0, failed: 1 }, now))
      .toBe("Last saved online 2 minutes ago. 1 change could not be saved online.");
    expect(formatLastSynced({ last_run_at: now - 120 * 1000, queue_depth: 0, failed: 3 }, now))
      .toBe("Last saved online 2 minutes ago. 3 changes could not be saved online.");
  });

  test('a pending queue AND parked ops both surface, in order', () => {
    expect(formatLastSynced({ last_run_at: now - 120 * 1000, queue_depth: 2, failed: 3 }, now))
      .toBe("Last saved online 2 minutes ago. 2 changes waiting to be saved online. 3 changes could not be saved online.");
  });

  test('never synced but something is parked still says so', () => {
    expect(formatLastSynced({ last_run_at: 0, queue_depth: 0, failed: 2 }, now))
      .toBe("Not saved online yet. 2 changes could not be saved online.");
  });

  test('no failed field at all behaves exactly as before (back-compat)', () => {
    expect(formatLastSynced({ last_run_at: now - 5000, queue_depth: 0 }, now))
      .toBe('Last saved online just now.');
  });
});
