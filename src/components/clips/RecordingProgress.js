/**
 * RecordingProgress - the line and the clock while the camera records
 * (D229 addendum 5; the design page's recording frame).
 *
 * A 4 dp amber line along the very top edge fills left to right over the CHOSEN
 * length of the recording (60 seconds, 90 seconds or 2 minutes; always 2
 * minutes for press and hold),
 * with the running time under it in tabular numerals. It is the rest timer's
 * drain line: the same colour, the same `primaryFill`.
 *
 * It ticks by itself in this small component, so the camera screen does not
 * re-render twenty times a second, and it is drawn with plain styles rather
 * than the JS-thread Animated API (a frozen allowlist, motionFitRules.guard).
 * Reduce Motion: it steps once a second instead of sweeping, so the progress is
 * still shown but nothing moves continuously.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import { withAlpha, alpha, fontScaleCaps, spacing, radius, circle } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { formatClipDuration } from '../../lib/clips/rules';
import { CAM } from './cameraInk';

// The line is redrawn 20 times a second: smooth to the eye, cheap to draw.
const TICK_MS = 50;
// Reduce Motion steps the line once a second instead of sweeping.
const REDUCED_TICK_MS = 1000;
// Founder report 2026-10-19: thicker than the rest timer's 2 dp drain line (3-4 dp), so it reads on a bright picture.
const LINE_HEIGHT = 4;
// The clock's soft shadow keeps it readable over any picture.
const CLOCK_SHADOW_OFFSET_Y = 1;
const CLOCK_SHADOW_RADIUS = 3;
// The REC dot pulses once a second: full for the first half, dimmed for the
// second (read off the elapsed time, so no Animated is needed). Static under
// Reduce Motion.
const DOT_SIZE = 12;
const DOT_DIM_OPACITY = 0.35;

export default function RecordingProgress({
  startedAtMs, limitMs, reduceMotion, topOffset, clockStyle, recStyle,
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Math.min(limitMs, Math.max(0, Date.now() - startedAtMs)));
    tick();
    const id = setInterval(tick, reduceMotion ? REDUCED_TICK_MS : TICK_MS);
    return () => clearInterval(id);
  }, [startedAtMs, limitMs, reduceMotion]);

  const shown = reduceMotion ? Math.floor(elapsed / 1000) * 1000 : elapsed;
  const fraction = limitMs > 0 ? Math.min(1, shown / limitMs) : 0;
  const clock = formatClipDuration(elapsed, 'floor');
  const dotDim = !reduceMotion && elapsed % 1000 >= 500;

  return (
    <>
      {/* Decorative: the clock beside it is the readable progress. */}
      <View
        style={styles.lineTrack}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="clip-camera-line"
      >
        <View style={[styles.lineFill, { transform: [{ scaleX: fraction }] }]} testID="clip-camera-line-fill" />
      </View>
      <View style={[styles.clockRow, { top: topOffset }]} pointerEvents="none">
        <View style={styles.recPill} testID="clip-camera-rec-pill">
          <View
            style={[styles.recDot, dotDim && { opacity: DOT_DIM_OPACITY }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="clip-camera-rec-dot"
          />
          <Text style={[styles.recWord, recStyle]} maxFontSizeMultiplier={fontScaleCaps.chrome} testID="clip-camera-rec">REC</Text>
          <Text
            style={[styles.clock, clockStyle]}
            maxFontSizeMultiplier={fontScaleCaps.chrome}
            accessibilityLabel={`Recorded ${clock}`}
            testID="clip-camera-clock"
          >
            {clock}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  lineTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
    backgroundColor: withAlpha(CAM.textPrimary, alpha.soft),
    overflow: 'hidden',
  },
  lineFill: {
    height: LINE_HEIGHT,
    width: '100%',
    backgroundColor: CAM.primaryFill,
    transformOrigin: '0% 50%',
  },
  clockRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: CAM.pill,
  },
  recDot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: circle(DOT_SIZE), backgroundColor: CAM.record },
  recWord: { color: CAM.textPrimary },
  clock: {
    color: CAM.textPrimary,
    textShadowColor: withAlpha(CAM.camera, alpha.half),
    textShadowOffset: { width: 0, height: CLOCK_SHADOW_OFFSET_Y },
    textShadowRadius: CLOCK_SHADOW_RADIUS,
  },
});
