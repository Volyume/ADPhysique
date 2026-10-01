/**
 * RangeBar (Progress, recovery heatmap and Consistency elevation, register
 * D214; `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` sections 7.4 item 5 and 7.5).
 *
 * One bar for a count against the stretch it is meant to land in: the volume
 * heatmap's muscle rows and the plan rows on Consistency. A track from 0 to
 * `max` with
 *   - a shaded stretch from `rangeStart` to `rangeEnd` (the helpful range:
 *     "MEV to MRV" in the volume rows, the one meaning of "range" on every
 *     surface, section 7.4),
 *   - an optional stronger band inside it (`bandStart` to `bandEnd`),
 *   - a tick at the end of the track (`max`),
 *   - and the fill from 0 to `value`, in the colour the caller supplies.
 * Every number is a count in the same unit; the bar draws positions, it never
 * judges them (the caller picks `fillColor`, the band words live in the row's
 * own text).
 *
 * Inputs are clamped into 0..max. A bound that is not a finite number (NaN,
 * Infinity, a string, undefined) is ignored, so a bad value never throws and
 * never draws a misleading shape: with no usable `max` only the empty track
 * renders. A stretch whose end does not lie after its start is not drawn.
 *
 * `slim` is the 6 dp variant the plan rows use (the default is 8 dp). The
 * whole bar is hidden from assistive tech: the row's own text carries the
 * figures ("5 of 6 to 22 sets this week"), so a bar read aloud would only
 * repeat them.
 *
 * Live theme (`useTheme`): the frozen block holds only layout and radius;
 * colours come from the live theme. The track is `surface3`, the range and
 * band are `textSecondary` at the named alpha stops (`alpha.mid`,
 * `alpha.half`), the end tick is `border`, and the default fill is ink
 * (`textSecondary`): no amber, a bar is a fact, not the thing to do.
 */

import { View, StyleSheet } from 'react-native';
import { radius, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';

const TRACK_HEIGHT = 8;
const SLIM_TRACK_HEIGHT = 6;
// The end tick stands proud of the track by 3 dp above and below (slim: 2 dp),
// so the box is the track plus that overhang.
const BOX_HEIGHT = 14;
const SLIM_BOX_HEIGHT = 10;
const TICK_WIDTH = 2;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** A position as a share of the track, 0..1, or null when it cannot be placed. */
function share(v, max) {
  if (!isNum(v)) return null;
  return Math.min(1, Math.max(0, v / max));
}

/** 0..1 to a percentage string at two decimals, no trailing zeros ('50%', '33.33%'). */
function pct(f) {
  return `${Math.round(f * 10000) / 100}%`;
}

/** { from, to } shares for a stretch, or null when either bound is unusable or it is empty. */
function stretch(start, end, max) {
  const from = share(start, max);
  const to = share(end, max);
  if (from === null || to === null || to <= from) return null;
  return { from, to };
}

export default function RangeBar({
  value,
  max,
  rangeStart,
  rangeEnd,
  bandStart,
  bandEnd,
  fillColor,
  slim = false,
  style,
}) {
  const t = useTheme();
  const trackHeight = slim ? SLIM_TRACK_HEIGHT : TRACK_HEIGHT;
  const boxHeight = slim ? SLIM_BOX_HEIGHT : BOX_HEIGHT;
  const usable = isNum(max) && max > 0;

  const range = usable ? stretch(rangeStart, rangeEnd, max) : null;
  const band = usable ? stretch(bandStart, bandEnd, max) : null;
  const fillShare = usable ? share(value, max) : null;

  return (
    <View
      style={[styles.box, { height: boxHeight }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        testID="rangebar-track"
        style={[
          styles.track,
          { top: (boxHeight - trackHeight) / 2, height: trackHeight, backgroundColor: t.colors.surface3 },
        ]}
      >
        {range ? (
          <View
            testID="rangebar-range"
            style={[
              styles.layer,
              { left: pct(range.from), width: pct(range.to - range.from), backgroundColor: withAlpha(t.colors.textSecondary, alpha.mid) },
            ]}
          />
        ) : null}
        {band ? (
          <View
            testID="rangebar-band"
            style={[
              styles.layer,
              { left: pct(band.from), width: pct(band.to - band.from), backgroundColor: withAlpha(t.colors.textSecondary, alpha.half) },
            ]}
          />
        ) : null}
        {fillShare ? (
          <View
            testID="rangebar-fill"
            style={[
              styles.layer,
              styles.fill,
              { left: 0, width: pct(fillShare), backgroundColor: fillColor || t.colors.textSecondary },
            ]}
          />
        ) : null}
      </View>
      {usable ? (
        <View
          testID="rangebar-tick"
          style={[styles.tick, { height: boxHeight, backgroundColor: t.colors.border }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
  },
  // The clip: everything drawn on the track is cut to its rounded ends, so a
  // range that starts at 0 or runs to the end takes the track's own curve.
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  fill: {
    borderRadius: radius.full,
  },
  tick: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: TICK_WIDTH,
    borderRadius: radius.hair,
  },
});
