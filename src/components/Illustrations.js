/**
 * Empty-state illustrations
 *
 * Hand-tuned SVG illustrations that replace the generic Ionicons we
 * were using on empty states. Style: dark surface, gold + textMuted
 * stroke lines, light fills. Sized small (120-160px) so they sit
 * comfortably above a one-line headline + supporting body text.
 *
 * Each illustration is a pure-React component built on react-native-svg
 * (already in our deps). No runtime cost beyond rendering the SVG, no
 * external image assets to ship.
 */

import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, G } from 'react-native-svg';
import { colors } from '../styles/theme';

const STROKE = 2.5;
const ACCENT = colors.primary;
const MUTED = colors.textMuted;

function Frame({ size = 140, children }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 140 140" fill="none">
        {children}
      </Svg>
    </View>
  );
}

/**
 * EmptyWorkoutsIllustration
 * A barbell at rest. Used on Workout History and Home "no sessions
 * yet" empty states.
 */
export function EmptyWorkoutsIllustration({ size = 140 }) {
  return (
    <Frame size={size}>
      {/* Floor line */}
      <Line x1="20" y1="110" x2="120" y2="110" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" opacity={0.4} />
      {/* Bar */}
      <Line x1="25" y1="70" x2="115" y2="70" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" />
      {/* Left plates */}
      <Rect x="25" y="50" width="6" height="40" rx="2" fill={ACCENT} />
      <Rect x="33" y="56" width="4" height="28" rx="1.5" fill={ACCENT} opacity={0.7} />
      {/* Right plates */}
      <Rect x="109" y="50" width="6" height="40" rx="2" fill={ACCENT} />
      <Rect x="103" y="56" width="4" height="28" rx="1.5" fill={ACCENT} opacity={0.7} />
      {/* Subtle "ready" shimmer above the bar */}
      <Circle cx="70" cy="40" r="2" fill={ACCENT} opacity={0.5} />
      <Circle cx="58" cy="32" r="1.5" fill={ACCENT} opacity={0.35} />
      <Circle cx="82" cy="34" r="1.5" fill={ACCENT} opacity={0.35} />
    </Frame>
  );
}

/**
 * EmptyPlanIllustration
 * A schedule / calendar with a highlighted day. Used on Plans and
 * Home empty states where the user hasn't picked a plan yet.
 */
export function EmptyPlanIllustration({ size = 140 }) {
  return (
    <Frame size={size}>
      {/* Calendar body */}
      <Rect x="30" y="40" width="80" height="70" rx="6" stroke={MUTED} strokeWidth={STROKE} fill="none" opacity={0.55} />
      {/* Top binding */}
      <Line x1="46" y1="32" x2="46" y2="48" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1="94" y1="32" x2="94" y2="48" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" />
      {/* Header strip */}
      <Line x1="30" y1="56" x2="110" y2="56" stroke={MUTED} strokeWidth={STROKE} opacity={0.55} />
      {/* Day grid dots */}
      {[68, 80, 92].map(y => (
        <G key={`row-${y}`}>
          {[42, 56, 70, 84, 98].map(x => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={2} fill={MUTED} opacity={0.5} />
          ))}
        </G>
      ))}
      {/* Highlighted "today" tile */}
      <Circle cx="70" cy="80" r="6" fill={ACCENT} />
    </Frame>
  );
}

/**
 * EmptyPRsIllustration
 * A trophy. Used on PR Wall and milestones when nothing's been
 * earned yet.
 */
export function EmptyPRsIllustration({ size = 140 }) {
  return (
    <Frame size={size}>
      {/* Cup */}
      <Path
        d="M50 38 H90 V60 C90 76 82 86 70 86 C58 86 50 76 50 60 Z"
        stroke={ACCENT} strokeWidth={STROKE} fill="none"
      />
      {/* Handles */}
      <Path d="M50 46 C42 46 38 52 42 60 C46 64 50 62 50 56" stroke={ACCENT} strokeWidth={STROKE} fill="none" />
      <Path d="M90 46 C98 46 102 52 98 60 C94 64 90 62 90 56" stroke={ACCENT} strokeWidth={STROKE} fill="none" />
      {/* Stem */}
      <Line x1="70" y1="86" x2="70" y2="100" stroke={ACCENT} strokeWidth={STROKE} strokeLinecap="round" />
      {/* Base */}
      <Rect x="56" y="100" width="28" height="6" rx="2" fill={ACCENT} />
      {/* Sparkles */}
      <Circle cx="36" cy="36" r="2" fill={ACCENT} opacity={0.6} />
      <Circle cx="104" cy="34" r="2.2" fill={ACCENT} opacity={0.6} />
      <Circle cx="44" cy="22" r="1.5" fill={ACCENT} opacity={0.45} />
    </Frame>
  );
}

/**
 * EmptyChartIllustration
 * A small chart with one dotted line and one filled segment. Used on
 * Progress / Analytics when there's no data yet.
 */
export function EmptyChartIllustration({ size = 140 }) {
  return (
    <Frame size={size}>
      {/* Axes */}
      <Line x1="26" y1="40" x2="26" y2="100" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" opacity={0.5} />
      <Line x1="26" y1="100" x2="114" y2="100" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" opacity={0.5} />
      {/* Dashed forecast line */}
      <Path
        d="M30 90 L50 78 L72 84 L94 64 L114 56"
        stroke={MUTED} strokeWidth={STROKE} strokeDasharray="4 5" fill="none" opacity={0.55}
      />
      {/* Bright trailing arrow line on top of dash */}
      <Path
        d="M30 90 L50 78 L72 84"
        stroke={ACCENT} strokeWidth={STROKE} fill="none"
      />
      {/* Pulse dot at the end of the bright segment */}
      <Circle cx="72" cy="84" r="4" fill={ACCENT} />
      <Circle cx="72" cy="84" r="8" fill={ACCENT} opacity={0.18} />
    </Frame>
  );
}

/**
 * EmptyBodyIllustration
 * A scale silhouette. Used on body metrics / morning weight empty
 * states.
 */
export function EmptyBodyIllustration({ size = 140 }) {
  return (
    <Frame size={size}>
      {/* Scale body */}
      <Rect x="30" y="62" width="80" height="50" rx="8" stroke={MUTED} strokeWidth={STROKE} fill="none" opacity={0.55} />
      {/* Display */}
      <Rect x="50" y="74" width="40" height="20" rx="4" fill={ACCENT} opacity={0.18} />
      <Line x1="58" y1="84" x2="82" y2="84" stroke={ACCENT} strokeWidth={STROKE} strokeLinecap="round" />
      {/* Feet platforms */}
      <Line x1="30" y1="112" x2="42" y2="112" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" opacity={0.55} />
      <Line x1="98" y1="112" x2="110" y2="112" stroke={MUTED} strokeWidth={STROKE} strokeLinecap="round" opacity={0.55} />
      {/* Step-on arrow */}
      <Path
        d="M70 30 L70 56 M62 48 L70 56 L78 48"
        stroke={ACCENT} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </Frame>
  );
}
