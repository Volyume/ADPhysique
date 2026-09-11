/**
 * COMP-019 Stage 2 — Android home-screen widgets (react-native-android-widget).
 *
 * Widgets are DUMB renderers of the snapshot (the logic lives in
 * src/lib/widgets/snapshot.js / writer.js, shipped with the JS bundle -
 * NOT OTA-patchable: this app has no OTA channel, every change ships as
 * a store release; C7 F-11). These build the
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
 *   - WeeklyConsistency: "N of M sessions this week"; under an open ED
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

// A1 (route-graph certification 2026-09-05): the widget root carries the
// library's OPEN_APP click action, so a tap opens Volyume. Without it a
// widget is inert -- react-native-android-widget has no container default
// and requires an explicit per-element clickAction
// (node_modules/react-native-android-widget/src/widgets/utils/click-action.ts:
// `"OPEN_APP"` - this clickAction does not require clickActionData). OPEN_APP
// is handled natively (RNWidgetProvider.java:54 -> openApp) and never reaches
// the JS task handler, so widgetTaskHandler keeps its render-only behaviour.
// Shell is the root of BOTH widgets, so one declaration covers both.
//
// CR-14 (24-PHASE4-SPEC.md section 2): an optional `friends` prop renders a
// row below `children` -- 6 dp amber presence dot + the "N friends trained
// today" line, MUTED text (amber on the signal only, D148). Callers decide
// WHETHER to pass it; Shell itself does no suppression or day-matching.
function Shell({ eyebrow, friends, children }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Open Volyume"
      style={{
        height: 'match_parent', width: 'match_parent', backgroundColor: SURFACE,
        borderRadius: 20, borderWidth: 1, borderColor: HAIRLINE,
        padding: 14, flexDirection: 'column', justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{
          width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER, marginRight: 6,
        }} />
        <TextWidget text={eyebrow} style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }} />
      </FlexWidget>
      {children}
      {friends ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <FlexWidget style={{
            width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER, marginRight: 6,
          }} />
          <TextWidget text={friends.label} style={{ fontSize: 12, color: MUTED }} maxLines={1} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

// CR-14 size ruling (lead, from app.json): NextSession is 3 cells wide,
// 180 x 110 dp minimum, resizable, and has the room (brand row + name +
// week + one line under 110 dp); WeeklyConsistency is 2 cells, 110 x 110 dp
// minimum, resizeMode none, and a 23-character line neither fits its width
// in one row nor its height under the count, the dots and the "sessions"
// caption. So the friends line renders on NextSessionWidget ONLY --
// WeeklyConsistencyWidget's own "THIS WEEK" tree below never receives it;
// its ED-suppressed fallback renders the NextSession tree, which then
// carries the line as any NextSession render does.
export function NextSessionWidget({ snapshot, todayKey }) {
  const ns = snapshot?.nextSession;
  const friends = (snapshot?.friends && snapshot.friends.dayKey === todayKey) ? snapshot.friends : null;
  return (
    <Shell eyebrow="NEXT SESSION" friends={friends}>
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

export function WeeklyConsistencyWidget({ snapshot, todayKey }) {
  const c = snapshot?.consistency;
  // Suppressed (ED flag) or no data -> neutral next-session content, which
  // then carries the friends line itself (NextSessionWidget's own logic
  // above) -- this widget's OWN "THIS WEEK" tree below stays unchanged.
  if (!c) return <NextSessionWidget snapshot={snapshot} todayKey={todayKey} />;
  return (
    <Shell eyebrow="THIS WEEK">
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={c.planned != null ? `${c.completed} of ${c.planned}` : `${c.completed}`} style={{ fontSize: 28, fontWeight: 'bold', color: TEXT }} />
        <SessionDots completed={c.completed} planned={c.planned} />
        {/* Founder ruling (Today truth repair): the "N weeks running" line
            is REMOVED - the weekly run/streak construct is rejected
            product-wide. The factual "N of M" count and its dots stay. */}
        <TextWidget text="sessions" style={{ fontSize: 12, color: MUTED, marginTop: 6 }} />
      </FlexWidget>
    </Shell>
  );
}

// Tap target colour token kept beside the widgets so the native pairing is
// visible to a reviewer (amber matches theme.js primary).
export const WIDGET_AMBER = AMBER;
export const WIDGET_INK = INK;
