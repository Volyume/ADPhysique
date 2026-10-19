/**
 * useScreenReady (growth brief 2026-10-19, lane D): how long a key screen
 * takes from mounting to showing its first loaded content. A screen calls
 * `useScreenReady('Diary', loaded)`; the first render with `ready` true
 * sends one `screen_ready` { screen, ms bucket } for that mount.
 *
 * `screen_ready` is a preConsent performance event (founder: "if something
 * is failing or slow before consent appears I want to know"). It carries a
 * route name and a time bucket only. Telemetry never blocks the screen.
 */
import { useEffect, useRef } from 'react';
import { toBucket } from './schema';

/** The screen_ready payload for a screen mounted at `startedAt`. */
export function screenReadyPayload(screen, startedAt, now = Date.now()) {
  return { screen, ms: toBucket('ms', now - startedAt) };
}

export default function useScreenReady(screen, ready) {
  const startedAtRef = useRef(Date.now());
  const sentRef = useRef(false);
  useEffect(() => {
    if (!ready || sentRef.current) return;
    sentRef.current = true;
    try {
      // eslint-disable-next-line global-require
      const { trackNow } = require('./growth');
      trackNow('screen_ready', screenReadyPayload(screen, startedAtRef.current));
    } catch (_) { /* telemetry never blocks the screen */ }
  }, [ready, screen]);
}
