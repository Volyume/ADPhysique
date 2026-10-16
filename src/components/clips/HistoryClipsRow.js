/**
 * HistoryClipsRow - the "Your videos" row in a workout's expanded history
 * detail (D229 addendum 5, ruling 3).
 *
 * Shown only when the workout holds videos, with their count, and it opens the
 * Your videos sheet so any can be played, kept or deleted. It is deliberately
 * visible in EVERY state: calm mode and an open ED flag hide the places videos
 * are RECORDED and the places they are SHARED from, but a person's own videos
 * on their own phone are never withheld from them, and neither is the way to
 * delete them. So
 * there is no suppression read in this file or its body, on purpose
 * (clips.history.test.js pins that).
 *
 * This file is the light half: it only counts. The row and the sheet
 * (HistoryClipsRowBody.js: NavRow inside NavGroup, and the ClipsSheet) are
 * required on demand, when there is something to show. The history list
 * expands many cards, nearly all of them with no clips, and none of them
 * should mount a bottom sheet to say nothing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { countClipsForWorkout, subscribeClips } from '../../lib/clips/store';
import { logError } from '../../lib/errorLog';

export default function HistoryClipsRow({ userId, workoutId }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || !workoutId) return;
    try {
      const n = await countClipsForWorkout(userId, workoutId);
      if (aliveRef.current) setCount(n);
    } catch (e) {
      logError('HistoryClipsRow.count', e, { workoutId });
    }
  }, [userId, workoutId]);

  useEffect(() => { refresh(); return subscribeClips(() => { refresh(); }); }, [refresh]);

  // Nothing to show and nothing open: draw nothing, load nothing. While the
  // sheet is open the body stays, so deleting the last clip does not cut its
  // closing animation short.
  if (count === 0 && !open) return null;

  // eslint-disable-next-line global-require
  const Body = require('./HistoryClipsRowBody').default;
  return (
    <Body
      count={count}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onChanged={refresh}
      userId={userId}
      workoutId={workoutId}
    />
  );
}
