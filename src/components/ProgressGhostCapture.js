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
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import useAppStore from '../store/useAppStore';
import { deleteProgressPhoto, saveProgressPhoto } from '../lib/progressPhotos';
import { deletePhotoMeta, upsertPhotoMeta } from '../lib/progressPhotoMeta';
import { logError } from '../lib/errorLog';
import {
  getProgressScanCapturePreferences,
  setProgressScanCameraFacingPreference,
  setProgressScanTimerPreference,
} from '../lib/progressScanPreferences';
import { getPoseCaptureGuidance } from '../lib/progressCaptureGuide';
import { useToast } from './Toast';
import {
  colors,
  spacing,
  radius,
  type,
  fontWeight,
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

const OPACITY_PRESETS = [
  { key: 'low', label: 'Low', value: 0.2 },
  { key: 'standard', label: 'Standard', value: OPACITY_DEFAULT },
  { key: 'strong', label: 'Strong', value: 0.6 },
];

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
  title,
  subtitle,
}) {
  const toast = useToast();
  const userId = useAppStore((s) => s.user?.id);
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const { height: viewportHeight } = useWindowDimensions();

  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [opacity, setOpacity] = useState(OPACITY_DEFAULT);
  const [showGrid, setShowGrid] = useState(true);
  const [facing, setFacing] = useState('back');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [tilt, setTilt] = useState(null); // degrees; null => no level sensor

  const cameraAvailable = !!CameraView;
  const granted = !!permission?.granted;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const prefs = await getProgressScanCapturePreferences();
        if (!alive) return;
        setFacing(prefs.cameraFacing);
        setTimerSeconds(prefs.timerSeconds);
      } catch (_) { /* keep defaults */ }
    })();
    return () => { alive = false; };
  }, []);

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
      if (useAppStore.getState().tier !== 'pro') return;
      const saved = await saveProgressPhoto(pic.uri, undefined, userId);
      if (!saved?.name) return;
      if (useAppStore.getState().tier !== 'pro') {
        await deleteProgressPhoto(userId, saved.uri).catch(() => false);
        return;
      }
      await upsertPhotoMeta(userId, saved.name, { pose });
      if (useAppStore.getState().tier !== 'pro') {
        await deletePhotoMeta(userId, saved.name).catch(() => false);
        await deleteProgressPhoto(userId, saved.uri).catch(() => false);
        return;
      }
      onCaptured?.(saved.name, saved);
    } catch (e) {
      logError('ProgressGhostCapture.capture', e, { pose });
      toast.show('Could not save that photo. Please try again.', { variant: 'error' });
    } finally {
      setCapturing(false);
    }
  }, [capturing, userId, pose, onCaptured, toast]);

  const startCapture = useCallback(() => {
    if (capturing || countdown != null) return;
    if (timerSeconds > 0) {
      setCountdown(timerSeconds);
      return;
    }
    capture();
  }, [capture, capturing, countdown, timerSeconds]);

  useEffect(() => {
    if (countdown == null) return undefined;
    if (countdown <= 0) {
      setCountdown(null);
      capture();
      return undefined;
    }
    const id = setTimeout(() => setCountdown((n) => (n == null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [capture, countdown]);

  const chooseTimer = useCallback((seconds) => {
    const next = [0, 5, 10].includes(seconds) ? seconds : 0;
    setTimerSeconds(next);
    setProgressScanTimerPreference(next);
  }, []);

  const flipCamera = useCallback(() => {
    setFacing((f) => {
      const next = f === 'back' ? 'front' : 'back';
      setProgressScanCameraFacingPreference(next);
      return next;
    });
  }, []);

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
        <Ionicons name="camera-outline" size={iconSize.xl} color={colors.textSecondary} />
        <Text style={styles.fallbackTitle}>Waiting for camera permission</Text>
        <Text style={styles.fallbackBody}>
          If the permission prompt does not appear, you can still add a photo from your library.
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

  const hasReference = !!referencePhoto?.uri;
  const compactOverlay = Number.isFinite(viewportHeight) && viewportHeight < 900;
  const guidance = getPoseCaptureGuidance(pose);
  const modeLabel = title ? 'Photo set' : 'Progress photo';
  const captureInstruction = subtitle || guidance.line;
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

        {countdown != null ? (
          <View style={[styles.countdownWrap, compactOverlay && styles.countdownWrapCompact]} pointerEvents="none" accessible={false}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownHint}>Step into the frame</Text>
          </View>
        ) : null}
      </CameraView>

      {/* Top bar: framing copy + close. */}
      <View style={[styles.topBar, compactOverlay && styles.topBarCompact]} pointerEvents="box-none">
        <View style={[styles.topCopy, compactOverlay && styles.topCopyCompact]} pointerEvents="none">
          <Text style={styles.modeChip}>{modeLabel}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title || guidance.title}
          </Text>
          <Text style={[styles.subtitle, compactOverlay && styles.subtitleCompact]} numberOfLines={compactOverlay ? 1 : 2}>
            {captureInstruction}
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
      <View style={[styles.controls, compactOverlay && styles.controlsCompact]} pointerEvents="box-none">
        {hasReference ? (
          <View style={[styles.overlayControls, compactOverlay && styles.overlayControlsCompact]}>
            <OpacitySlider value={opacity} onChange={setOpacity} />
            {!compactOverlay ? (
            <View style={styles.opacityPresetRow} accessibilityLabel="Overlay strength presets">
              {OPACITY_PRESETS.map((preset) => {
                const active = Math.abs(clampOpacity(opacity) - preset.value) < 0.025;
                return (
                  <Pressable
                    key={preset.key}
                    style={[styles.opacityPreset, active && styles.opacityPresetActive]}
                    onPress={() => setOpacity(preset.value)}
                    hitSlop={hitSlop}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${preset.label} overlay strength`}
                    accessibilityHint="Changes how strongly the previous photo appears over the camera preview"
                  >
                    <Text style={[styles.opacityPresetText, active && styles.opacityPresetTextActive]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.timerRow}>
          {[0, 5, 10].map((seconds) => (
            <Pressable
              key={seconds}
              style={[styles.timerChip, timerSeconds === seconds && styles.timerChipActive]}
              onPress={() => chooseTimer(seconds)}
              hitSlop={hitSlop}
              accessibilityRole="button"
              accessibilityState={{ selected: timerSeconds === seconds }}
              accessibilityLabel={seconds === 0 ? 'Timer off' : `${seconds} second timer`}
              accessibilityHint="Sets a delay before the photo is taken"
            >
              <Text style={[styles.timerChipText, timerSeconds === seconds && styles.timerChipTextActive]}>
                {seconds === 0 ? 'Off' : `${seconds}s`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.controlRow} pointerEvents="box-none">
          <Pressable
            style={styles.pillBtn}
            onPress={() => setShowGrid((g) => !g)}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityState={{ selected: showGrid }}
            accessibilityLabel={showGrid ? 'Hide framing grid' : 'Show framing grid'}
            accessibilityHint="Turns the camera framing grid on or off"
          >
            <Ionicons name="grid-outline" size={iconSize.md} color={showGrid ? colors.primary : colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.captureBtn}
            onPress={startCapture}
            disabled={capturing || countdown != null}
            accessibilityRole="button"
            accessibilityLabel={timerSeconds > 0 ? `Start ${timerSeconds} second timer` : 'Take photo'}
            accessibilityHint="Saves a private progress photo on this device"
            accessibilityState={{ disabled: capturing || countdown != null }}
          >
            <View style={styles.captureInner} />
          </Pressable>

          <Pressable
            style={styles.pillBtn}
            onPress={flipCamera}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            accessibilityHint="Switches between the front and rear camera"
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
  countdownWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '38%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  countdownWrapCompact: {
    top: '44%',
  },
  countdownText: {
    ...type.display,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  countdownHint: {
    ...type.bodySm,
    color: withAlpha(colors.textPrimary, 0.9),
    backgroundColor: withAlpha(colors.background, 0.5),
    borderRadius: radius.full,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
    zIndex: 4,
  },
  topBarCompact: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  topCopy: {
    flex: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: withAlpha(colors.background, 0.62),
    borderWidth: 1,
    borderColor: withAlpha(colors.textPrimary, 0.16),
  },
  topCopyCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  title: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  modeChip: {
    ...type.caption,
    color: withAlpha(colors.textPrimary, 0.82),
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    ...type.bodySm,
    color: withAlpha(colors.textPrimary, 0.85),
    lineHeight: 20,
  },
  subtitleCompact: {
    ...type.caption,
    lineHeight: 17,
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
    zIndex: 3,
  },
  controlsCompact: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  overlayControls: {
    gap: spacing.sm,
  },
  overlayControlsCompact: {
    gap: spacing.xs,
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
  opacityPresetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  opacityPreset: {
    minHeight: 36,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.background, 0.46),
    borderWidth: 1,
    borderColor: withAlpha(colors.textPrimary, 0.16),
  },
  opacityPresetActive: {
    backgroundColor: colors.primaryFill,
    borderColor: colors.primary,
  },
  opacityPresetText: {
    ...type.caption,
    color: withAlpha(colors.textPrimary, 0.86),
    fontWeight: fontWeight.bold,
  },
  opacityPresetTextActive: {
    color: colors.onPrimary,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  timerRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.background, 0.5),
  },
  timerChip: {
    minWidth: 48,
    minHeight: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  timerChipActive: {
    backgroundColor: colors.primaryFill,
  },
  timerChipText: {
    ...type.caption,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
  },
  timerChipTextActive: {
    color: colors.onPrimary,
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
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
