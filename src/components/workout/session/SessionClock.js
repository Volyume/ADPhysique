/**
 * SessionClock
 *
 * The session's elapsed time as tabular title numerals in secondary ink,
 * placed by SessionHeader on the session title's line (the founder's render
 * verdicts 2026-10-09, D220 addendum 12: not in the toolbar), ticking from
 * `startTime`
 * (epoch ms, the store's workoutStartTime) on its OWN one-second interval, so
 * the screen that hosts it stops re-rendering once a second
 * (12-BUILD-SPEC section 1.6, register D220; the old tick lived in
 * ActiveWorkoutScreen).
 *
 * The value is always derived from `Date.now() - startTime`, never counted up,
 * so backgrounding cannot cause drift, and it re-syncs the moment the app
 * returns to the foreground, as the screen's own timer does. The interval is
 * cleared on unmount and whenever `startTime` changes. Under Jest no interval
 * is started (the house convention, see ActiveWorkoutScreen and errorLog: a
 * live timer in a test run keeps the worker open and logs after the test has
 * ended); the value still renders once.
 *
 * Format: minutes are not wrapped at an hour and seconds are padded
 * ("12:06", "75:04"), the same string the logger header showed.
 *
 * Not a live region: a screen reader must not speak every second (the P9
 * rule, pinned for the rest timer in p9Talkback.guard.test.js).
 */
import { useEffect, useMemo, useState } from 'react';
import { AppState, Text } from 'react-native';
import useTheme from '../../../hooks/useTheme';

// The readout block is as tall as the header's glyph targets.

// Read when the effect runs, not at import, so a test can switch the interval
// on to prove the tick and the cleanup.
function intervalsDisabled() {
  return typeof process !== 'undefined'
    && !!process.env
    && !!process.env.JEST_WORKER_ID;
}

function wholeSeconds(elapsedMs) {
  return Number.isFinite(elapsedMs) && elapsedMs > 0 ? Math.floor(elapsedMs / 1000) : 0;
}

/** "12:06" for 726000 ms. A missing, negative or non-finite value reads "0:00". */
export function formatClock(elapsedMs) {
  const total = wholeSeconds(elapsedMs);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Spoken as words: "12:06" is read as a time of day by a screen reader.
function spokenClock(elapsedMs) {
  const total = wholeSeconds(elapsedMs);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ${secs} ${secs === 1 ? 'second' : 'seconds'}`;
}

/**
 * The tick itself: elapsed ms since `startTime`, re-derived every second and
 * on foreground. Exported so the empty-session view (EmptyExerciseView) can
 * show the same clock in its own header without the screen ticking for it.
 */
export function useSessionClock(startTime) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startTime) return undefined;
    const sync = () => setNow(Date.now());
    sync();
    if (intervalsDisabled()) return undefined;
    const id = setInterval(sync, 1000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync();
    });
    return () => {
      clearInterval(id);
      try { sub?.remove?.(); } catch (_) { /* best effort: a stale subscription is harmless */ }
    };
  }, [startTime]);

  return startTime ? now - startTime : 0;
}

export default function SessionClock({ startTime }) {
  const t = useTheme();
  // A fact beside the session name: the numerals in secondary ink, nothing
  // drawn around them, no caption (a running clock says what it is).
  const live = useMemo(() => ({
    text: { ...t.type.num('title'), color: t.colors.textSecondary },
  }), [t]);

  const elapsedMs = useSessionClock(startTime);

  return (
    <Text
      accessibilityRole="timer"
      accessibilityLabel={`Elapsed ${spokenClock(elapsedMs)}`}
      style={live.text}
      numberOfLines={1}
    >
      {formatClock(elapsedMs)}
    </Text>
  );
}
