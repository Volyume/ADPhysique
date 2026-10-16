/**
 * CameraGuides - the lines that help a person set the camera up before a
 * video (D229 addendum 10, founder 2026-10-16: "an option / setup for
 * positioning your camera before starting ... guide lines so they set it up
 * to capture the video best").
 *
 * Drawn over the live view while the camera is idle and during the
 * countdown, never while recording (the lines are not in the video; hiding
 * them keeps the live view clean once it no longer matters):
 *   - a thirds grid, the plain framing aid every camera app uses, so the
 *     rack or machine and the person can be placed on it;
 *   - a horizon level through the middle, the SAME level the progress-photo
 *     capture has used on device since 2026-07 (ProgressGhostCapture.js):
 *     expo-sensors' accelerometer, roll from atan2(x, y), a sample that is
 *     not a number dropped (sensorSampleGuard), amber once within 1.5 deg of
 *     level, and flattened under Reduce Motion so nothing rotates on screen.
 *     expo-sensors is already installed; if it ever is not, the level is
 *     simply absent and the grid stays.
 * Decorative to a screen reader: the setup line on the camera says the same
 * thing in words.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { withAlpha, alpha } from '../../styles/theme';
import { CAM } from './cameraInk';

const LEVEL_WITHIN_DEG = 1.5;
const SAMPLE_EVERY_MS = 120;

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
      <View style={[styles.vertical, styles.oneThird]} />
      <View style={[styles.vertical, styles.twoThirds]} />
      <View style={[styles.horizontal, styles.oneThirdDown]} />
      <View style={[styles.horizontal, styles.twoThirdsDown]} />
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

const styles = StyleSheet.create({
  vertical: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: LINE },
  horizontal: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: LINE },
  oneThird: { left: '33.33%' },
  twoThirds: { left: '66.67%' },
  oneThirdDown: { top: '33.33%' },
  twoThirdsDown: { top: '66.67%' },
  // The level: a line through the middle, three fifths of the width, white
  // until the phone is level, then the amber of the drain line.
  level: {
    position: 'absolute',
    top: '50%',
    left: '20%',
    right: '20%',
    height: 2,
    marginTop: -1,
    backgroundColor: withAlpha(CAM.textPrimary, alpha.half),
  },
  levelAligned: { backgroundColor: CAM.primaryFill },
});
