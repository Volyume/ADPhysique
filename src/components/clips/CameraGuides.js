/**
 * CameraGuides - the lines that help a person set the camera up before a
 * video (D229 addendum 10, founder 2026-10-16: "an option / setup for
 * positioning your camera before starting ... guide lines so they set it up
 * to capture the video best").
 *
 * Drawn over the live view while the camera is idle and during the
 * countdown, never while recording (the lines are not in the video; hiding
 * them keeps the live view clean once it no longer matters):
 *   - the share card's word bands (addendum 12, founder: "in line with what
 *     the share shows optimally"): a light shade over the top 30% and the
 *     bottom half of the picture, where the card's words sit over the video
 *     (drawShareCard's `bands`: headBottom 0.3, bodyTop 0.5), so the clear
 *     band between them is seen for what it is, the part of the picture the
 *     share shows best. The live view then looks the way the share will;
 *   - the two vertical thirds, the plain framing aid every camera app uses,
 *     so the rack or machine and the person can be placed on them;
 *   - a horizon level through the clear band, the SAME level the
 *     progress-photo capture has used on device since 2026-07
 *     (ProgressGhostCapture.js): expo-sensors' accelerometer, roll from
 *     atan2(x, y), a sample that is not a number dropped (sensorSampleGuard),
 *     amber once within 1.5 deg of level, and flattened under Reduce Motion
 *     so nothing rotates on screen. expo-sensors is already installed; if it
 *     ever is not, the level is simply absent and the rest stays.
 * Decorative to a screen reader: the setup line on the camera says where to
 * put the phone in words, and the primer says once what the clear band is.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { withAlpha, alpha } from '../../styles/theme';
import { CAM } from './cameraInk';

// Level within this many degrees reads as level (the same band the progress
// photo capture has used on device).
const LEVEL_WITHIN_DEG = 1.5;
// The sensor is read about eight times a second: smooth enough, kind to the battery.
const SAMPLE_EVERY_MS = 120;
// The rule-of-thirds lines sit at a third and two thirds of the width.
const ONE_THIRD_AT = '33.33%';
const TWO_THIRDS_AT = '66.67%';
// The level line: three fifths of the width, centred (20% in from each side),
// as thick as the rest timer's drain line and centred on its row by half that.
const LEVEL_INSET = '20%';
const LEVEL_LINE_HEIGHT = 2;
// Where the share card's words sit over the video, as fractions of the
// picture's height (drawShareCard.js `bands` defaults: the heading band ends
// at 0.3, the body band starts at 0.5). The level sits in the middle of the
// clear band between them.
export const WORD_BAND_TOP = 0.3;
export const WORD_BAND_BOTTOM = 0.5;
const LEVEL_AT = (WORD_BAND_TOP + WORD_BAND_BOTTOM) / 2;

export default function CameraGuides({ visible, reduceMotion }) {
  const [tilt, setTilt] = useState(null); // degrees; null means no level sensor

  useEffect(() => {
    if (!visible || Platform.OS === 'web') return undefined;
    let Accelerometer;
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      Accelerometer = require('expo-sensors').Accelerometer;
    } catch (_) {
      return undefined;
    }
    if (!Accelerometer?.addListener) return undefined;
    Accelerometer.setUpdateInterval(SAMPLE_EVERY_MS);
    const sub = Accelerometer.addListener(({ x, y }) => {
      // Roll relative to portrait upright: 0 when the phone is level. A
      // sample that is not a number is dropped and the last good one kept
      // (sensorSampleGuard: NaN is not null, and would freeze the level).
      const roll = Math.atan2(x, y) * (180 / Math.PI);
      if (!Number.isFinite(roll)) return;
      setTilt(roll);
    });
    return () => { try { sub?.remove?.(); } catch (_) { /* noop */ } };
  }, [visible]);

  if (!visible) return null;
  const aligned = tilt != null && Math.abs(tilt) <= LEVEL_WITHIN_DEG;
  const levelTransform = reduceMotion || tilt == null ? [] : [{ rotate: `${-tilt}deg` }];

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="clip-camera-guides"
    >
      <View style={[styles.band, styles.bandTop]} testID="clip-camera-band-top" />
      <View style={[styles.band, styles.bandBottom]} testID="clip-camera-band-bottom" />
      <View style={[styles.vertical, styles.oneThird]} />
      <View style={[styles.vertical, styles.twoThirds]} />
      {tilt != null ? (
        <View
          style={[styles.level, aligned && styles.levelAligned, { transform: levelTransform }]}
          testID={aligned ? 'clip-camera-level-aligned' : 'clip-camera-level'}
        />
      ) : null}
    </View>
  );
}

const LINE = withAlpha(CAM.textPrimary, alpha.mid);
// The word bands: the viewfinder's black at the lightest alpha the theme
// names, so the live view reads through and the clear band reads lighter,
// the way the card's scrim sits over the video on the share.
const BAND = withAlpha(CAM.camera, alpha.soft);

const styles = StyleSheet.create({
  vertical: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: LINE },
  oneThird: { left: ONE_THIRD_AT },
  twoThirds: { left: TWO_THIRDS_AT },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: BAND },
  bandTop: { top: 0, height: `${WORD_BAND_TOP * 100}%` },
  bandBottom: { top: `${WORD_BAND_BOTTOM * 100}%`, bottom: 0 },
  // The level: a line through the clear band, three fifths of the width,
  // white until the phone is level, then the amber of the drain line.
  level: {
    position: 'absolute',
    top: `${LEVEL_AT * 100}%`,
    left: LEVEL_INSET,
    right: LEVEL_INSET,
    height: LEVEL_LINE_HEIGHT,
    marginTop: -(LEVEL_LINE_HEIGHT / 2),
    backgroundColor: withAlpha(CAM.textPrimary, alpha.half),
  },
  levelAligned: { backgroundColor: CAM.primaryFill },
});
