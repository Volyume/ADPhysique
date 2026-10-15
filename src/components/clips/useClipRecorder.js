/**
 * useClipRecorder - the one way any screen starts "Record a clip" (D229
 * addendum 5). The workout's More sheet, the summary row and (the lead's work)
 * the share screen all go through it, so the order of events is identical:
 *
 *   1. the workout already holds three clips  -> open the clips sheet, so one
 *      can be deleted (nothing is ever replaced silently, ruling 6);
 *   2. the privacy primer has never been seen -> show it, then the camera;
 *   3. otherwise                              -> straight to the camera.
 *
 * The camera is the `ClipCamera` route (src/screens/ClipCameraScreen.js).
 * The primer's seen flag (`@volyume_clip_primer_seen`) is written when the
 * person taps "Open camera", not on "Not now": the privacy line is read before
 * the first camera ever opens, and a person who declined has not yet had it
 * confirmed.
 *
 * `clips` is the workout's clips, newest first, and `count` their number (both
 * re-read on focus, so they are right after the camera closes). `sheets` is the
 * primer and the clips sheet as one element: the caller renders it once,
 * anywhere in its tree.
 *
 * openRecorder({ source, exerciseId, exerciseName, setNumber }): `setNumber` is
 * the set the clip is being recorded for (the exercise's next pending set),
 * handed to the camera as a route param and kept with the clip.
 *
 * Returns { count, clips, refreshCount, openRecorder, openClips, sheets }.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ClipPrimerSheet from './ClipPrimerSheet';
import ClipsSheet from './ClipsSheet';
import { listClipsForWorkout } from '../../lib/clips/store';
import { PRIMER_SEEN_KEY, CLIP_STRINGS, isFull } from '../../lib/clips/rules';
import { logError } from '../../lib/errorLog';

export default function useClipRecorder({ navigation, userId, workoutId }) {
  const [clips, setClips] = useState([]);
  // The camera params held back while the primer is open (null = closed).
  const [primerFor, setPrimerFor] = useState(null);
  const [clipsOpen, setClipsOpen] = useState(false);
  // True when the clips sheet opened INSTEAD of the camera because the workout
  // is full, so it says why (CLIP_STRINGS.full).
  const [clipsBecauseFull, setClipsBecauseFull] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // Re-reads the workout's clips and returns their count (null if unreadable).
  const refreshCount = useCallback(async () => {
    if (!userId || !workoutId) {
      if (aliveRef.current) setClips([]);
      return 0;
    }
    try {
      const rows = await listClipsForWorkout(userId, workoutId);
      if (aliveRef.current) setClips(rows);
      return rows.length;
    } catch (e) {
      logError('useClipRecorder.count', e, { workoutId });
      return null;
    }
  }, [userId, workoutId]);

  useEffect(() => {
    refreshCount();
    const unsubscribe = typeof navigation?.addListener === 'function'
      ? navigation.addListener('focus', () => { refreshCount(); })
      : null;
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [refreshCount, navigation]);

  const openClips = useCallback(() => {
    setClipsBecauseFull(false);
    setClipsOpen(true);
  }, []);

  const openRecorder = useCallback(async ({
    source = 'workout', exerciseId = null, exerciseName = null, setNumber = null,
  } = {}) => {
    if (!userId || !workoutId) return;
    // Read the count fresh: the number on screen may be a moment stale.
    const held = await refreshCount();
    if (isFull(held)) {
      setClipsBecauseFull(true);
      setClipsOpen(true);
      return;
    }

    const params = { workoutId, exerciseId, exerciseName, setNumber, source };
    let seen = false;
    try {
      seen = (await AsyncStorage.getItem(PRIMER_SEEN_KEY)) === 'true';
    } catch (e) {
      // Unknown means the privacy line is shown: the safe side.
      logError('useClipRecorder.primerRead', e);
    }
    if (!aliveRef.current) return;
    if (!seen) { setPrimerFor(params); return; }
    navigation?.navigate?.('ClipCamera', params);
  }, [userId, workoutId, refreshCount, navigation]);

  const handleOpenCamera = useCallback(() => {
    const params = primerFor;
    setPrimerFor(null);
    AsyncStorage.setItem(PRIMER_SEEN_KEY, 'true').catch((e) => {
      logError('useClipRecorder.primerWrite', e);
    });
    if (params) navigation?.navigate?.('ClipCamera', params);
  }, [primerFor, navigation]);

  const handleNotNow = useCallback(() => { setPrimerFor(null); }, []);

  const sheets = (
    <>
      <ClipPrimerSheet
        visible={!!primerFor}
        onOpenCamera={handleOpenCamera}
        onNotNow={handleNotNow}
      />
      <ClipsSheet
        visible={clipsOpen}
        onClose={() => setClipsOpen(false)}
        userId={userId}
        workoutId={workoutId}
        onChanged={refreshCount}
        notice={clipsBecauseFull ? CLIP_STRINGS.full : null}
      />
    </>
  );

  return { count: clips.length, clips, refreshCount, openRecorder, openClips, sheets };
}
