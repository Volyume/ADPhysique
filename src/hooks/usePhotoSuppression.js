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
import { createContext, useContext, useEffect, useState } from 'react';
import { NavigationContext } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import { getOpenEdPatternFlag } from '../lib/database';
import useAppStore from '../store/useAppStore';

// The single canonical OR: suppressed when calm mode is on OR an open
// ED-pattern flag exists. Both callers here already resolve their own inputs
// to plain booleans (or a truthy sentinel) before calling this, so it takes
// two booleans rather than the raw mode/flag shapes `derivePhotoSuppression`
// below accepts. This is the one place the OR itself lives; every other
// suppression composition in the app (the hook below, and any screen that
// cannot run the hook directly, e.g. CoachOutputScreen's existing single big
// load effect which already performs the same fail-closed raw reads for
// several other safety features beyond the photo card) should call this
// function rather than re-write `calm || edFlagOpen` inline, so a future
// change to the OR logic cannot silently drift between call sites.
export function isPhotoSuppressed(calm, edFlagOpen) {
  return !!calm || !!edFlagOpen;
}

// Pure OR, exported for unit tests. Suppressed when calm mode is on, OR an open
// ED-pattern flag exists, OR either read failed. The wellbeing 'read_failed'
// sentinel is matched explicitly; the ED-flag 'read_failed' sentinel is a
// truthy string so it suppresses via !!edFlag (never null, which reads as "no
// flag"). Fails CLOSED on any ambiguity.
export function derivePhotoSuppression({ mode, edFlag }) {
  return isPhotoSuppressed(isCalm(mode) || mode === 'read_failed', edFlag);
}

/**
 * The same fail-closed raw reads the hook below performs, factored out as
 * a plain async function for callers that are not React components (a
 * background publish triggered on workout completion or app foreground,
 * for instance) and so cannot use a hook. Suppressed when calm mode is
 * on, an open ED-pattern flag exists, or either read fails.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function readEdOrCalmSuppressed(userId) {
  const [mode, edFlag] = await Promise.all([
    AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
    getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
  ]);
  return derivePhotoSuppression({ mode, edFlag });
}

// S7-5 (progress-tab audit second pass, 2026-09-25): a test double that
// mocks '@react-navigation/native' without NavigationContext leaves the
// import undefined; reading a local empty context instead keeps the hook
// order fixed and simply means "no screen to listen to".
const NoNavigationContext = createContext(null);

export default function usePhotoSuppression(explicitUserId) {
  const storeUserId = useAppStore((s) => s.user?.id);
  const userId = explicitUserId ?? storeUserId;
  // S7-5: the enclosing screen's navigation object, when the hook runs
  // inside one (every consumer today: the photos screen, its sheets, the
  // Progress landing's visual pillar). Read through the context directly
  // rather than useNavigation(), which throws outside a navigator.
  const navigation = useContext(NavigationContext ?? NoNavigationContext);

  // Fail CLOSED: start suppressed and only lift once BOTH reads confirm a
  // non-calm, unflagged state. A comparative / weight / share surface must
  // never flash before that confirmation resolves.
  const [suppressed, setSuppressed] = useState(true);

  useEffect(() => {
    let alive = true;
    const read = async () => {
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
    };
    read();
    // S7-5 (2026-09-25): the reads used to run once per userId, so a screen
    // that stays mounted across navigation (the photos screen is a plain
    // stack screen and refreshes its own data on focus) kept a verdict
    // taken before calm mode was switched on or an ED flag was raised
    // elsewhere in the app, and its comparison, trend and share layers
    // stayed reachable until a remount. Both reads now run again every time
    // the enclosing screen regains focus; the last verdict stands while the
    // re-read resolves, and a suppressing answer applies the moment it lands.
    const unsubscribe = typeof navigation?.addListener === 'function'
      ? navigation.addListener('focus', () => { read(); })
      : null;
    return () => {
      alive = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userId, navigation]);

  return suppressed;
}
