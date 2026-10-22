/**
 * useInjuryLines - the always-on Injuries & limitations lines for Train
 * (D231, app layout rework, batch 2). They were computed inside HomeScreen.js;
 * the logic now lives in src/lib/capability/injuryLines.js and this hook only
 * runs it on focus.
 *
 * Re-read on every focus (T2-30, D112 R6): a rule that arrived by sync while
 * the screen sat in the background, or one ended on another screen, shows on
 * the way back. A blur cancels the in-flight application (round 10, B4), so two
 * overlapping focus cycles resolving out of order can never leave the lines
 * describing the older read.
 *
 * Returns { activeConstraint, constraintSubject, rampLine, checkFailed }.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import useAppStore from '../store/useAppStore';
import { NO_INJURY_LINES, readInjuryLines, readRampLine } from '../lib/capability/injuryLines';

export default function useInjuryLines() {
  const userId = useAppStore(s => s.user?.id ?? null);
  const [lines, setLines] = useState(NO_INJURY_LINES);

  useFocusEffect(
    useCallback(() => {
      if (!userId) { setLines(NO_INJURY_LINES); return undefined; }
      let cancelled = false;
      (async () => {
        const [derived, rampLine] = await Promise.all([readInjuryLines(userId), readRampLine(userId)]);
        if (cancelled) return;
        setLines({ ...derived, rampLine });
      })();
      return () => { cancelled = true; };
    }, [userId]),
  );

  return lines;
}
