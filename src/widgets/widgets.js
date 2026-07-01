/**
 * COMP-019 Stage 2 — Android home-screen widgets (react-native-android-widget).
 *
 * Widgets are DUMB renderers of the snapshot (the logic lives in
 * src/lib/widgets/snapshot.js / writer.js, OTA-patchable). These build the
 * RemoteViews via the library's JSX primitives. Free tier; NEVER weight,
 * calories or body data (the home screen is semi-public).
 *
 * Two widgets, matching app.json's react-native-android-widget config:
 *   - NextSession: routine name + planned day + week-in-block chip
 *   - WeeklyConsistency: "N of M sessions this week" + weeks running; under an open ED
 *     flag the snapshot's consistency is null, so this widget falls back to the
 *     neutral next-session content (COMP-018 suppression rule).
 */
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widgets render outside the app's theme pipeline (RemoteViews), so these are
// literal copies of theme.js values. D0 fix (design audit 03): this previously
// said #F59E0B while claiming to match the brand primary, an 8-point drift —
// the real theme.js primary is #F5A623.
const AMBER = '#F5A623';      // matches theme.js primary (keep in step manually)
const INK = '#0D0D0D';
const SURFACE = '#191917';
const TEXT = '#FFFFFF';
const MUTED = '#9E9E9E';

function Shell({ children }) {
  return (
    <FlexWidget style={{
      height: 'match_parent', width: 'match_parent', backgroundColor: SURFACE,
      borderRadius: 20, padding: 14, flexDirection: 'column', justifyContent: 'space-between',
    }}>
      {children}
    </FlexWidget>
  );
}

export function NextSessionWidget({ snapshot }) {
  const ns = snapshot?.nextSession;
  return (
    <Shell>
      <TextWidget text="NEXT SESSION" style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }} />
      {ns ? (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={ns.name} style={{ fontSize: 20, fontWeight: 'bold', color: TEXT }} />
          {ns.dayLabel ? <TextWidget text={ns.dayLabel} style={{ fontSize: 14, color: AMBER }} /> : null}
          {ns.weekLabel ? <TextWidget text={ns.weekLabel} style={{ fontSize: 12, color: MUTED }} /> : null}
        </FlexWidget>
      ) : (
        <TextWidget text="No plan scheduled. Build one in Plans." style={{ fontSize: 14, color: MUTED }} />
      )}
    </Shell>
  );
}

export function WeeklyConsistencyWidget({ snapshot }) {
  const c = snapshot?.consistency;
  // Suppressed (ED flag) or no data -> neutral next-session content.
  if (!c) return <NextSessionWidget snapshot={snapshot} />;
  return (
    <Shell>
      <TextWidget text="THIS WEEK" style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }} />
      <TextWidget text={`${c.completed} of ${c.planned}`} style={{ fontSize: 28, fontWeight: 'bold', color: TEXT }} />
      {c.streakWeeks > 0
        ? <TextWidget text={`${c.streakWeeks} ${c.streakWeeks === 1 ? 'week' : 'weeks'} running`} style={{ fontSize: 12, color: AMBER }} />
        : <TextWidget text="sessions" style={{ fontSize: 12, color: MUTED }} />}
    </Shell>
  );
}

// Tap target colour token kept beside the widgets so the native pairing is
// visible to a reviewer (amber matches theme.js primary).
export const WIDGET_AMBER = AMBER;
export const WIDGET_INK = INK;
