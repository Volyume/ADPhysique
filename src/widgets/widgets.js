/**
 * COMP-019 Stage 2 — Android home-screen widgets (react-native-android-widget).
 *
 * Widgets are DUMB renderers of the snapshot (the logic lives in
 * src/lib/widgets/snapshot.js / writer.js, OTA-patchable). These build the
 * RemoteViews via the library's JSX primitives. Free tier; NEVER weight,
 * calories or body data (the home screen is semi-public).
 *
 * Restyled to the elevated visual language (v3 sharpener, 2026-07-03): the
 * shell mirrors the app's surface ladder (surface fill, hairline border,
 * amber-dot brand row), the content sits on the raised tier, and the
 * consistency widget draws its sessions as neutral dots — count, never
 * judgement (no red, no shame; the ED-suppression fallback is unchanged).
 *
 * Two widgets, matching app.json's react-native-android-widget config:
 *   - NextSession: routine name + planned day + week-in-block chip
 *   - WeeklyConsistency: "N of M sessions this week" + weeks running; under an open ED
 *     flag the snapshot's consistency is null, so this widget falls back to the
 *     neutral next-session content (COMP-018 suppression rule).
 */
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widgets render outside the app's theme pipeline (RemoteViews), so these are
// literal copies of theme.js values (keep in step manually). D0 fix (design
// audit 03) corrected the amber; the ladder values below mirror theme.js
// background/surface/surfaceElevated/surface2/borderSubtle exactly.
const AMBER = '#F5A623';      // theme.js primary
const INK = '#0D0D0D';        // theme.js background
const SURFACE = '#191917';    // theme.js surface
const RAISED = '#222220';     // theme.js surfaceElevated
const CHIP = '#2A2A27';       // theme.js surface2
const HAIRLINE = '#2E2E2C';   // theme.js borderSubtle
const TEXT = '#FFFFFF';
const MUTED = '#9E9E9E';

function Shell({ eyebrow, children }) {
  return (
    <FlexWidget style={{
      height: 'match_parent', width: 'match_parent', backgroundColor: SURFACE,
      borderRadius: 20, borderWidth: 1, borderColor: HAIRLINE,
      padding: 14, flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{
          width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER, marginRight: 6,
        }} />
        <TextWidget text={eyebrow} style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }} />
      </FlexWidget>
      {children}
    </FlexWidget>
  );
}

export function NextSessionWidget({ snapshot }) {
  const ns = snapshot?.nextSession;
  return (
    <Shell eyebrow="NEXT SESSION">
      {ns ? (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={ns.name} style={{ fontSize: 20, fontWeight: 'bold', color: TEXT }} />
          {ns.dayLabel ? (
            <FlexWidget style={{
              backgroundColor: CHIP, borderRadius: 10,
              paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 8,
              marginTop: 6, alignSelf: 'flex-start' ,
            }}>
              <TextWidget text={ns.dayLabel} style={{ fontSize: 13, color: AMBER }} />
            </FlexWidget>
          ) : null}
          {ns.weekLabel ? <TextWidget text={ns.weekLabel} style={{ fontSize: 12, color: MUTED, marginTop: 4 }} /> : null}
        </FlexWidget>
      ) : (
        <TextWidget text="No plan scheduled. Build one in Plans." style={{ fontSize: 14, color: MUTED }} />
      )}
    </Shell>
  );
}

// Neutral session dots: completed in amber, remaining as raised-tier rings.
// A count made visible, never a judgement colour (adherence-neutral rule).
function SessionDots({ completed, planned }) {
  const total = Math.max(0, Math.min(planned ?? 0, 7));
  if (total === 0) return null;
  const done = Math.max(0, Math.min(completed ?? 0, total));
  return (
    <FlexWidget style={{ flexDirection: 'row', marginTop: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <FlexWidget
          key={String(i)}
          style={{
            width: 8, height: 8, borderRadius: 4, marginRight: 5,
            backgroundColor: i < done ? AMBER : RAISED,
            borderWidth: 1, borderColor: i < done ? AMBER : HAIRLINE,
          }}
        />
      ))}
    </FlexWidget>
  );
}

export function WeeklyConsistencyWidget({ snapshot }) {
  const c = snapshot?.consistency;
  // Suppressed (ED flag) or no data -> neutral next-session content.
  if (!c) return <NextSessionWidget snapshot={snapshot} />;
  return (
    <Shell eyebrow="THIS WEEK">
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={`${c.completed} of ${c.planned}`} style={{ fontSize: 28, fontWeight: 'bold', color: TEXT }} />
        <SessionDots completed={c.completed} planned={c.planned} />
        {c.streakWeeks > 0
          ? <TextWidget text={`${c.streakWeeks} ${c.streakWeeks === 1 ? 'week' : 'weeks'} running`} style={{ fontSize: 12, color: AMBER, marginTop: 6 }} />
          : <TextWidget text="sessions" style={{ fontSize: 12, color: MUTED, marginTop: 6 }} />}
      </FlexWidget>
    </Shell>
  );
}

// Tap target colour token kept beside the widgets so the native pairing is
// visible to a reviewer (amber matches theme.js primary).
export const WIDGET_AMBER = AMBER;
export const WIDGET_INK = INK;
