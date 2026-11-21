import React from 'react';
import { CoachNotice, QuietNotice } from '../ui/coach-notice';

// The coach's own notices (the weekly check-in is due; a coaching decision is
// ready to review) are drawn as the kit's amber-outlined alert with an icon
// (kit trial 2, LOC-412, design rule 8). Every other occupant of the line (the
// plan, recovery, re-entry, limitation and nutrition-phase rows) is the same
// alert in the quiet neutral edge, so amber stays "act here" (rule 1). None of
// them is a safety message: the arbiter has no Beat UK, calm mode or ED
// occupant, and those keep their own surfaces.
const COACH_NOTICE_KEYS = Object.freeze(['check_in', 'coach_decision']);

/**
 * TodayLine — Campaign 22 Phase 2, Stage 1. The single P1 idiom.
 *
 * HOME-TODAY-UX-SPEC.md §16 (container findings) + §17 (region R2): one quiet
 * row, one occupant. This replaces FIVE banner idioms (coach decision, trial
 * value, deload/recovery, nutrition phase, activation) plus the bottom
 * check-in nudge card and the always-on RecoveryStateCard row with ONE
 * presentation. Which fact occupies the row on any given render is decided
 * entirely upstream by `src/lib/home/todayLineArbiter.js` (a pure resolver);
 * this component knows nothing about coaching, trials or recovery — it renders
 * whatever single `item` it is handed, or nothing.
 *
 * Presentation only, per the build brief: no data logic here.
 *
 * Kit trial 2 (LOC-412): every occupant renders through the kit's alert
 * (src/components/ui/coach-notice.tsx): CoachNotice for the coach's two,
 * QuietNotice for the rest.
 *
 * LOC-683: every occupant is shown in full, whatever its `wrap` flag says. The
 * kit's notice carries no line limit, so a long sentence or a large system
 * text size never cuts it short; the row grows in height instead.
 *
 * @param {{ item: { key: string, text: string, onPress: Function,
 *   onDismiss?: Function|null, accessibilityLabel?: string } | null,
 *   testID?: string }} props
 */
function TodayLine({ item, testID }) {
  if (!item) return null;

  const { text, onPress, onDismiss, accessibilityLabel } = item;
  const Notice = COACH_NOTICE_KEYS.includes(item.key) ? CoachNotice : QuietNotice;
  return (
    <Notice
      text={text}
      onPress={onPress}
      onDismiss={onDismiss}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}

export default React.memo(TodayLine);
