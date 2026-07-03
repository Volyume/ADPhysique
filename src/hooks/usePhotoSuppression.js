/**
 * usePhotoSuppression — the shared ED-safety gate for the NEW high-risk
 * progress-photo surfaces (comparison / side-by-side / overlay, any bodyweight
 * display, the before/after share card).
 *
 * Returns a single boolean `suppressed` that is TRUE when calm mode is on OR an
 * open ED-pattern flag exists. Both are RAW, FAIL-CLOSED reads: a genuine read
 * failure of either maps to a suppressing sentinel, so a comparative / numeric /
 * sharing layer is never shown over a possibly-calm-or-flagged state.
 *
 * This is ADDITIVE and does not touch any existing gate. In particular it does
 * NOT change the base ProgressPhotosScreen's existing calm-only wellbeing read
 * (that read is byte-pinned by wellbeingFailClosed.guard.test and must stay as
 * it is). It reuses the EXACT raw wellbeing pattern that screen already uses
 * (raw AsyncStorage.getItem(WELLBEING_KEY) + isCalm, never the failure-
 * swallowing wellbeing-mode helper) and adds the same fail-closed read of the
 * open ED-pattern flag that useWeeklyStreak / YearOfLifts use.
 *
 * The building blocks: view-your-own-dated-photos and delete stay available;
 * this hook only gates the comparative / weight / share layers on top.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import { getOpenEdPatternFlag } from '../lib/database';
import useAppStore from '../store/useAppStore';

// Pure OR, exported for unit tests. Suppressed when calm mode is on, OR an open
// ED-pattern flag exists, OR either read failed. The wellbeing 'read_failed'
// sentinel is matched explicitly; the ED-flag 'read_failed' sentinel is a
// truthy string so it suppresses via !!edFlag (never null, which reads as "no
// flag"). Fails CLOSED on any ambiguity.
export function derivePhotoSuppression({ mode, edFlag }) {
  return isCalm(mode) || mode === 'read_failed' || !!edFlag;
}

export default function usePhotoSuppression(explicitUserId) {
  const storeUserId = useAppStore((s) => s.user?.id);
  const userId = explicitUserId ?? storeUserId;

  // Fail CLOSED: start suppressed and only lift once BOTH reads confirm a
  // non-calm, unflagged state. A comparative / weight / share surface must
  // never flash before that confirmation resolves.
  const [suppressed, setSuppressed] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [mode, edFlag] = await Promise.all([
        // Wellbeing: read the RAW key, not the failure-swallowing wellbeing-mode
        // helper (which maps a read error down to 'unspecified' and would fail
        // OPEN); a genuine failure becomes the suppressing 'read_failed' sentinel.
        AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
        // Open ED-pattern flag: the open row or null; a read error maps to the
        // truthy 'read_failed' sentinel (suppresses via !!edFlag), never to
        // null which would read as "no flag".
        getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
      ]);
      if (alive) setSuppressed(derivePhotoSuppression({ mode, edFlag }));
    })();
    return () => { alive = false; };
  }, [userId]);

  return suppressed;
}
