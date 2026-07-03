/**
 * ProgressGhostCapture — the ghost-overlay capture guide (progress-photos B3).
 *
 * The headline differentiator (research/progress-photos/M1 §5, P2 AlignShot
 * spec): an in-app camera preview with a faint overlay of a chosen previous
 * same-pose photo, so each new shot lines up against the last one. Lining up at
 * CAPTURE is what makes every downstream comparison honest, and it quietly
 * removes the "is it me or the angle?" body-checking loop.
 *
 * What it shows:
 *   - a live camera preview (expo-camera CameraView),
 *   - a semi-transparent overlay of the reference photo at an adjustable
 *     opacity (~15-85%, AlignShot range; default a faint 30%),
 *   - a rule-of-thirds framing grid (toggleable),
 *   - a horizon level, ONLY when expo-sensors is already available (we never
 *     add a dependency for it; if it is missing the level is simply absent).
 *
 * Voice: neutral and self-paced ("Line up your last photo"). No cadence, no
 * streaks, no shame, no "before/after" framing. This is a calm alignment aid.
 *
 * Storage: capture writes through the existing device-local saveProgressPhoto
 * path (never uploaded), then records the pose on the photo's metadata row.
 *
 * Fallback: if the camera is unavailable or permission is declined we never
 * crash. We show a calm message and expose `onFallback` so the integrator can
 * reuse the existing image-picker path (we do not reimplement the picker here).
 *
 * Reduce Motion: there are no animated transitions on the overlay at all (the
 * opacity, grid and level are all direct, un-animated renders); the level's
 * live tilt is flattened when Reduce Motion is on so nothing appears to move.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  PanResponder,
  Platform,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import useAppStore from '../store/useAppStore';
import { saveProgressPhoto } from '../lib/progressPhotos';
import { upsertPhotoMeta } from '../lib/progressPhotoMeta';
import { logError } from '../lib/errorLog';
import { useToast } from './Toast';
import {
  colors,
  spacing,
  radius,
  type,
  iconSize,
  hitSlop,
  withAlpha,
} from '../styles/theme';

// expo-camera is a native module (config plugin). Lazy-require at module load
// like the image picker on the gallery screen, so a stale/rebuild-pending
// binary shows the calm fallback instead of a red screen. The permission hook
// falls back to a stable no-op so the hooks order is identical either way.
let ExpoCamera = null;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  ExpoCamera = require('expo-camera');
} catch (_) {
  ExpoCamera = null;
}
const CameraView = ExpoCamera?.CameraView || null;
function useNoCameraPermissions() {
  // Matches the [permission, requestPermission] shape; "no module" reads as an
  // unavailable camera, which routes to the fallback affordance.
  return [null, async () => null];
}
const useCameraPermissions = ExpoCamera?.useCameraPermissions || useNoCameraPermissions;

const OPACITY_MIN = 0.15;
const OPACITY_MAX = 0.85;
const OPACITY_DEFAULT = 0.3;
const OPACITY_STEP = 0.05;

function clampOpacity(v) {
  if (!Number.isFinite(v)) return OPACITY_DEFAULT;
  return Math.min(OPACITY_MAX, Math.max(OPACITY_MIN, v));
}

/**
 * Opacity control for the ghost overlay. A draggable track plus adjustable
 * accessibility actions (VoiceOver/TalkBack swipe up/down). Reports 0..1.
 */
function OpacitySlider({ value, onChange }) {
  const widthRef = useRef(0);

  const setFromX = useCallback((x) => {
    const w = widthRef.current;
    if (!w) return;
    const ratio = Math.min(1, Math.max(0, x / w));
    onChange(clampOpacity(OPACITY_MIN + ratio * (OPACITY_MAX - OPACITY_MIN)));
  }, [onChange]);

  const responder = useRef(
    PanResponder?.create
      ? PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
        onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
      })
      : { panHandlers: {} },
  ).current;

  const step = useCallback((dir) => {
    onChange(clampOpacity(value + dir * OPACITY_STEP));
  }, [value, onChange]);

  const pct = Math.round(clampOpacity(value) * 100);
  const fillRatio = (clampOpacity(value) - OPACITY_MIN) / (OPACITY_MAX - OPACITY_MIN);

  return (
    <View style={styles.sliderRow}>
      <Ionicons name="contrast-outline" size={iconSize.sm} color={colors.textSecondary} />
      <View
        style={styles.sliderTrack}
        onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Overlay strength"
        accessibilityValue={{ min: Math.round(OPACITY_MIN * 100), max: Math.round(OPACITY_MAX * 100), now: pct }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') step(1);
          else if (e.nativeEvent.actionName === 'decrement') step(-1);
        }}
        {...responder.panHandlers}
      >
        <View style={[styles.sliderFill, { width: `${Math.round(fillRatio * 100)}%` }]} />
        <View style={[styles.sliderThumb, { left: `${Math.round(fillRatio * 100)}%` }]} />
      </View>
      <Text style={styles.sliderPct} accessibilityElementsHidden>{pct}%</Text>
    </View>
  );
}

export default function ProgressGhostCapture({
  referencePhoto = null,
  pose = null,
  onCaptured,
  onClose,
  onFallback,
}) {
  const toast = useToast();
  const userId = useAppStore((s) => s.user?.id);
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [opacity, setOpacity] = useState(OPACITY_DEFAULT);
  const [showGrid, setShowGrid] = useState(true);
  const [facing, setFacing] = useState('back');
  const [capturing, setCapturing] = useState(false);
  const [tilt, setTilt] = useState(null); // degrees; null => no level sensor

  const cameraAvailable = !!CameraView;
  const granted = !!permission?.granted;

  // Ask once when we have a permission object that is not yet granted and the
  // OS still lets us ask. Denied-for-good routes to the fallback below.
  useEffect(() => {
    if (!cameraAvailable) return;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {});
    }
  }, [cameraAvailable, permission, requestPermission]);

  // Horizon level via expo-sensors IF it is already installed. We never add a
  // dependency for this: a failed require simply leaves `tilt` null and the
  // level is not rendered. Same lazy, web-guarded pattern as the shake handler.
  useEffect(() => {
    if (!granted) return undefined;
    if (Platform.OS === 'web') return undefined;
    let Accelerometer;
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      Accelerometer = require('expo-sensors').Accelerometer;
    } catch (_) {
      return undefined;
    }
    if (!Accelerometer?.addListener) return undefined;
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y }) => {
      // Roll relative to portrait upright: 0 deg when the phone is level.
      setTilt(Math.atan2(x, y) * (180 / Math.PI));
    });
    return () => { try { sub?.remove?.(); } catch (_) { /* noop */ } };
  }, [granted]);

  const capture = useCallback(async () => {
    if (capturing) return;
    // Live-tier re-check (ProgressPhotosScreen write-guard class): capture is a
    // write. If the camera is open across a pro-to-free flip, the shutter must
    // not save a photo. Mirrors the viewer-delete and library-add guards.
    if (useAppStore.getState().tier !== 'pro') return;
    const cam = cameraRef.current;
    if (!cam?.takePictureAsync) return;
    setCapturing(true);
    try {
      const pic = await cam.takePictureAsync({ quality: 0.7 });
      if (!pic?.uri) return;
      const saved = await saveProgressPhoto(pic.uri);
      if (!saved?.name) return;
      await upsertPhotoMeta(userId, saved.name, { pose });
      onCaptured?.(saved.name);
    } catch (e) {
      logError('ProgressGhostCapture.capture', e, { pose });
      toast.show('Could not save that photo. Please try again.', { variant: 'error' });
    } finally {
      setCapturing(false);
    }
  }, [capturing, userId, pose, onCaptured, toast]);

  // ── Fallback surface: no camera module or permission declined ─────────────
  if (!cameraAvailable || (permission && !permission.granted && !permission.canAskAgain)) {
    const noModule = !cameraAvailable;
    return (
      <View style={styles.fallback} accessibilityRole="summary">
        <Ionicons name="camera-outline" size={iconSize.xl} color={colors.textSecondary} />
        <Text style={styles.fallbackTitle}>
          {noModule ? 'Camera not ready on this device' : 'Camera access is off'}
        </Text>
        <Text style={styles.fallbackBody}>
          {noModule
            ? 'The in-app camera needs a fresh build here. You can still add a photo from your library, at your own pace.'
            : 'You can turn camera access on in Settings whenever you like, or add a photo from your library instead.'}
        </Text>
        {onFallback ? (
          <Pressable
            style={styles.fallbackBtn}
            onPress={() => onFallback()}
            accessibilityRole="button"
            accessibilityLabel="Add a photo from your library"
          >
            <Text style={styles.fallbackBtnLabel}>Use your photo library</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.fallbackClose}
          onPress={() => onClose?.()}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.fallbackCloseLabel}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  // Permission object not resolved yet: a calm, quiet placeholder (no spinner
  // motion needed) rather than a flash of the camera.
  if (!granted) {
    return (
      <View style={styles.loading} accessibilityRole="summary">
        <Text style={styles.loadingText}>Preparing the camera…</Text>
      </View>
    );
  }

  const hasReference = !!referencePhoto?.uri;
  // Level colouring: "aligned" when within ~1.5 deg of level. The tilt itself
  // is live sensor data, not a transition; Reduce Motion flattens the visual so
  // nothing rotates on screen.
  const level = tilt != null && Math.abs(tilt) <= 1.5;
  const levelTransform = reduceMotion || tilt == null ? [] : [{ rotate: `${-tilt}deg` }];

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        accessibilityLabel={hasReference
          ? 'Camera preview aligned against your saved photo'
          : 'Camera preview'}
      >
        {/* Ghost overlay of the previous same-pose photo. */}
        {hasReference ? (
          <Image
            source={{ uri: referencePhoto.uri }}
            style={[StyleSheet.absoluteFill, { opacity: clampOpacity(opacity) }]}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessible={false}
          />
        ) : null}

        {/* Rule-of-thirds framing grid. */}
        {showGrid ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
            <View style={[styles.gridV, { left: '33.33%' }]} />
            <View style={[styles.gridV, { left: '66.66%' }]} />
            <View style={[styles.gridH, { top: '33.33%' }]} />
            <View style={[styles.gridH, { top: '66.66%' }]} />
          </View>
        ) : null}

        {/* Horizon level (only when a sensor is present). */}
        {tilt != null ? (
          <View style={styles.levelWrap} pointerEvents="none" accessible={false}>
            <View
              style={[
                styles.levelLine,
                { transform: levelTransform, backgroundColor: level ? colors.success : withAlpha(colors.textPrimary, 0.7) },
              ]}
            />
          </View>
        ) : null}
      </CameraView>

      {/* Top bar: framing copy + close. */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.topCopy} pointerEvents="none">
          <Text style={styles.title}>
            {hasReference ? 'Line up your last photo' : 'Take your progress photo'}
          </Text>
          <Text style={styles.subtitle}>
            {hasReference
              ? 'Match the angle and distance from last time. Your own pace.'
              : 'Frame it however suits you. Your own pace.'}
          </Text>
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() => onClose?.()}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
        >
          <Ionicons name="close" size={iconSize.lg} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Controls: opacity, grid toggle, flip, capture. */}
      <View style={styles.controls} pointerEvents="box-none">
        {hasReference ? <OpacitySlider value={opacity} onChange={setOpacity} /> : null}

        <View style={styles.controlRow} pointerEvents="box-none">
          <Pressable
            style={styles.pillBtn}
            onPress={() => setShowGrid((g) => !g)}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityState={{ selected: showGrid }}
            accessibilityLabel={showGrid ? 'Hide framing grid' : 'Show framing grid'}
          >
            <Ionicons name="grid-outline" size={iconSize.md} color={showGrid ? colors.primary : colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.captureBtn}
            onPress={capture}
            disabled={capturing}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            accessibilityState={{ disabled: capturing }}
          >
            <View style={styles.captureInner} />
          </Pressable>

          <Pressable
            style={styles.pillBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
          >
            <Ionicons name="camera-reverse-outline" size={iconSize.md} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.camera,
  },

  // Grid lines (rule of thirds).
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: withAlpha(colors.textPrimary, 0.35),
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: withAlpha(colors.textPrimary, 0.35),
  },

  // Horizon level.
  levelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLine: {
    width: 80,
    height: 2,
    borderRadius: radius.hair,
  },

  // Top bar.
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  topCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...type.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.bodySm,
    color: withAlpha(colors.textPrimary, 0.85),
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.background, 0.5),
  },

  // Bottom controls.
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sliderTrack: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: radius.hair,
    backgroundColor: withAlpha(colors.primary, 0.9),
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: radius.full,
    backgroundColor: colors.textPrimary,
  },
  sliderPct: {
    ...type.caption,
    color: withAlpha(colors.textPrimary, 0.85),
    width: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  pillBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.background, 0.5),
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.textPrimary,
    backgroundColor: withAlpha(colors.textPrimary, 0.15),
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.textPrimary,
  },

  // Fallback + loading surfaces.
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  fallbackTitle: {
    ...type.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  fallbackBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fallbackBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryFill,
  },
  fallbackBtnLabel: {
    ...type.bodyStrong,
    color: colors.onPrimary,
  },
  fallbackClose: {
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  fallbackCloseLabel: {
    ...type.body,
    color: colors.textSecondary,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...type.body,
    color: colors.textSecondary,
  },
});
