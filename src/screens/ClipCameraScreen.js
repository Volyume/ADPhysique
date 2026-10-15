/**
 * ClipCameraScreen - the one new screen video shares add (D229 addendum 5; the
 * design page's camera frames, as amended by the founder on 2026-10-15: the
 * camera must work hands-free for a set, the phone propped up while the person
 * walks to the bar).
 *
 * Full screen, portrait, SILENT. A close glyph top-left, a flip glyph
 * top-right, one record control centred low, a small "Countdown" control on
 * one side of it and a small "Length" control on the other, and one short line
 * under the button, always shown: "Tap to start with a countdown. Hold to
 * record while you hold."
 *
 * TWO WAYS TO RECORD (both visible, neither hidden behind a gesture):
 *   TAP the record control: a countdown (3, 5 or 10 seconds, the "Countdown"
 *     control, remembered in `@volyume_clip_leadin`, default 3) with the
 *     numerals large in the centre and one light tick each, then it records for
 *     the chosen length (5, 10 or 15 seconds, the "Length" control, remembered
 *     in `@volyume_clip_length`, default 15) and STOPS BY ITSELF. A tap during
 *     the recording stops it early.
 *   PRESS AND HOLD the record control: it records while held, with no
 *     countdown, and stops on release, capped at 15 seconds.
 * While recording, a 2 dp amber line along the very top edge fills over the
 * chosen length (always 15 for a hold), the rest timer's drain line (same
 * `primaryFill`, same 2 dp), with the running time under it
 * (RecordingProgress). A recording under 1 s is discarded silently; closing
 * during a recording discards it with no confirmation (it is 15 seconds of
 * footage). No review screen: a rest timer may be running, so the camera
 * closes and a toast says "Video saved to this workout" with Undo.
 *
 * Route params: { workoutId, exerciseId?, exerciseName?, setNumber?, source }
 *   source 'workout'  from the exercise More sheet; `setNumber` is the set the
 *                     video is recorded for (the exercise's next pending set)
 *   source 'summary'  from the workout summary row
 *   source 'share'    from the share screen's video source (the lead's work)
 *
 * WHAT HAPPENS AFTER A SAVE (all through the clip store; a fourth is refused,
 * never replaced):
 *   'workout'  go back, toast "Video saved to this workout" with Undo.
 *   'summary'  no toast here: go back to WorkoutSummary with the new clip's id
 *              merged into ITS route params as `clipId`. The summary opens the
 *              share screen with `{ ...its usual share params, clipId }`: it
 *              owns the session data the share screen needs (sessionData,
 *              prData, prList), which this screen does not have. The video is
 *              then on screen, so a toast (and an Undo under it) would be
 *              noise; when the summary has no Share to open it shows the
 *              saved toast itself.
 *   'share'    go back to ShareCard with `clipId` merged into ITS route params,
 *              so the share screen already holds its card data and only needs
 *              to choose that clip as the background. No toast: it is on screen.
 *   `clipId` is a clip id from src/lib/clips/store.js (getClip(userId, clipId)).
 *   The share screen's handling of it is the lead's work. The toast's Undo can
 *   delete the clip after the share screen has opened with it, so the share
 *   screen must treat a clipId that no longer resolves as "no clip".
 *
 * Camera access: asked for on open. A refusal is one calm warning toast
 * ("Camera access is needed to record a video") and the screen closes; there
 * is never a link to settings and never a second prompt. No microphone is asked
 * for (the view is `mute`, and expo-camera does not request audio when muted).
 *
 * The chrome is white on the black viewfinder in EVERY theme (cameraInk.js).
 * Type and sizes follow the live theme (Larger text). Haptics only through
 * src/lib/haptics.js: clipCountdown() per lead-in number, commit() on start,
 * selection() on stop.
 *
 * Not proven here (device checklist): that releasing a held press right after
 * it began stops CameraX cleanly (the stop is asked for again twice, a moment
 * later, in case the first arrived before the recorder was running).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Text from '../components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as FileSystem from 'expo-file-system/legacy';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import { useToast } from '../components/Toast';
import ClipsSheet from '../components/clips/ClipsSheet';
import RecordingProgress from '../components/clips/RecordingProgress';
import { CAM } from '../components/clips/cameraInk';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import { spacing, radius, circle, iconSize, withAlpha, alpha, fontScaleCaps } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import { saveClip, deleteClip, countClipsForWorkout } from '../lib/clips/store';
import {
  CLIP_STRINGS, LEAD_IN_KEY, LENGTH_KEY, DEFAULT_LEAD_IN_SECONDS, DEFAULT_LENGTH_SECONDS,
  MAX_CLIP_MS, MIN_CLIP_MS, isFull, nextLeadIn, nextLength, parseLeadIn,
  parseLength, leadInLabel, leadInA11yLabel, lengthLabel, lengthA11yLabel, startA11yLabel,
} from '../lib/clips/rules';

// expo-camera is a native module (config plugin). Lazy-require at module load
// like ProgressGhostCapture, so a stale or rebuild-pending binary takes the
// calm refusal path instead of a red screen.
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
  // unavailable camera, which takes the refusal path.
  return [null, async () => null];
}
const useCameraPermissions = ExpoCamera?.useCameraPermissions || useNoCameraPermissions;

// expo-keep-awake tags are a set, not ref-counted. This screen's own tag can
// never release a hold the active workout screen owns.
const KEEP_AWAKE_TAG = 'volyume-clip-camera';

const COUNTDOWN_TICK_MS = 1000;
// A press this long on the record control is a hold (record while held). A
// shorter press is a tap (countdown). Long enough that a slow tap is a tap.
const HOLD_DELAY_MS = 400;
// The stop is asked for again at these delays while the recording is still
// running, in case the first request reached the recorder before it had begun.
const STOP_RETRY_MS = [400, 900];

// One of the two small controls beside the record button: a plain word above
// its value, so nobody has to guess what a bare "3 s" or "15 s" changes.
function ValueControl({
  caption, value, onPress, disabled, accessibilityLabel, testID, captionStyle, valueStyle,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.valueControl, disabled && styles.dimmed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Tap to change"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
    >
      <Text style={captionStyle} maxFontSizeMultiplier={fontScaleCaps.chrome}>{caption}</Text>
      <Text style={valueStyle} maxFontSizeMultiplier={fontScaleCaps.chrome}>{value}</Text>
    </Pressable>
  );
}

export default function ClipCameraScreen({ navigation, route }) {
  const {
    workoutId, exerciseId = null, exerciseName = null, setNumber = null, source = 'workout',
  } = route?.params || {};
  const userId = useAppStore((s) => s.user?.id);
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState('back');
  const [leadIn, setLeadIn] = useState(DEFAULT_LEAD_IN_SECONDS);
  const [lengthSec, setLengthSec] = useState(DEFAULT_LENGTH_SECONDS);
  // ready | starting | countdown | recording | saving
  const [phase, setPhaseState] = useState('ready');
  const [countdownN, setCountdownN] = useState(0);
  const [recording, setRecording] = useState({ startedAtMs: 0, limitMs: MAX_CLIP_MS });
  const [clipsOpen, setClipsOpen] = useState(false);

  const cameraRef = useRef(null);
  // The camera that is mid-recording, kept apart from the view's own ref:
  // React detaches the view ref before an unmount cleanup runs, and a recording
  // left running must still be told to stop.
  const recordingCameraRef = useRef(null);
  const aliveRef = useRef(true);
  const phaseRef = useRef('ready');
  const leadInRef = useRef(DEFAULT_LEAD_IN_SECONDS);
  const lengthRef = useRef(DEFAULT_LENGTH_SECONDS);
  const modeRef = useRef('tap');
  const limitMsRef = useRef(MAX_CLIP_MS);
  const holdActiveRef = useRef(false);
  const askedRef = useRef(false);
  const closedRef = useRef(false);
  const discardRef = useRef(false);
  const stopFeltRef = useRef(false);
  const startedAtRef = useRef(0);
  const countdownTimer = useRef(null);
  const autoStopTimer = useRef(null);
  const stopRetryTimers = useRef([]);

  const setPhase = useCallback((next) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    if (autoStopTimer.current) { clearTimeout(autoStopTimer.current); autoStopTimer.current = null; }
    stopRetryTimers.current.forEach((id) => clearTimeout(id));
    stopRetryTimers.current = [];
  }, []);

  const dropCacheFile = useCallback((uri) => {
    if (!uri) return;
    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {
      // Best-effort: the OS clears the camera cache on its own.
    });
  }, []);

  // ── Lifetime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    aliveRef.current = true;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
      // Best-effort: the screen may sleep on a phone that refuses the hold.
    });
    return () => {
      aliveRef.current = false;
      holdActiveRef.current = false;
      clearTimers();
      // Leaving mid-recording discards it: the recorder resolves later and the
      // discard flag sends its file to the bin.
      if (phaseRef.current === 'recording') {
        discardRef.current = true;
        try { recordingCameraRef.current?.stopRecording?.(); } catch (e) { logError('ClipCamera.unmountStop', e); }
      }
      Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {
        // Best-effort release.
      });
    };
  }, [clearTimers]);

  // The remembered countdown and length.
  useEffect(() => {
    AsyncStorage.getItem(LEAD_IN_KEY).then((raw) => {
      if (!aliveRef.current || raw == null) return;
      const n = parseLeadIn(raw);
      leadInRef.current = n;
      setLeadIn(n);
    }).catch((e) => { logError('ClipCamera.leadInRead', e); });
    AsyncStorage.getItem(LENGTH_KEY).then((raw) => {
      if (!aliveRef.current || raw == null) return;
      const n = parseLength(raw);
      lengthRef.current = n;
      setLengthSec(n);
    }).catch((e) => { logError('ClipCamera.lengthRead', e); });
  }, []);

  // ── Leaving, and camera access ─────────────────────────────────────────────
  const closeOnce = useCallback((message) => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (message) toast.show(message, { variant: 'warning' });
    navigation.goBack();
  }, [toast, navigation]);

  useEffect(() => {
    // Nothing to record against: close without a word.
    if (!workoutId || !userId) { closeOnce(null); return; }
    if (!CameraView) { closeOnce(CLIP_STRINGS.permissionDenied); return; }
    if (!permission) return; // still reading the current answer
    if (permission.granted) { setReady(true); return; }
    if (askedRef.current) return;
    askedRef.current = true;
    (async () => {
      let result = null;
      try {
        result = await requestPermission();
      } catch (e) {
        logError('ClipCamera.permission', e);
      }
      if (!aliveRef.current) return;
      if (result?.granted) setReady(true); else closeOnce(CLIP_STRINGS.permissionDenied);
    })();
  }, [permission, requestPermission, workoutId, userId, closeOnce]);

  // ── Recording ──────────────────────────────────────────────────────────────
  const showFull = useCallback(() => {
    setPhase('ready');
    setClipsOpen(true);
  }, [setPhase]);

  const afterSave = useCallback((clip) => {
    const undo = {
      label: CLIP_STRINGS.undo,
      onPress: () => {
        deleteClip(clip.id).catch((e) => {
          logError('ClipCamera.undo', e, { clipId: clip.id });
          toast.show(CLIP_STRINGS.undoFailed, { variant: 'error' });
        });
      },
    };
    if (source === 'share') {
      // Back to the share screen it came from, which keeps its own card data;
      // only the video to use is handed over.
      navigation.navigate({ name: 'ShareCard', params: { clipId: clip.id }, merge: true });
      return;
    }
    if (source === 'summary') {
      // The summary builds the share screen's params and opens it with clipId
      // (and says "saved" itself when it has no Share to open).
      navigation.navigate({ name: 'WorkoutSummary', params: { clipId: clip.id }, merge: true });
      return;
    }
    // The house saved-with-Undo toast ("Quick add saved." uses the same
    // variant): 8 seconds, held open for a screen reader until Undo is heard.
    toast.show(CLIP_STRINGS.saved, { variant: 'undo', action: undo });
    navigation.goBack();
  }, [navigation, source, toast]);

  const finishRecording = useCallback(async (uri, measuredMs) => {
    clearTimers();
    if (discardRef.current || !aliveRef.current) {
      dropCacheFile(uri);
      return;
    }
    if (!stopFeltRef.current) haptics.selection();
    const durationMs = Math.min(limitMsRef.current, Math.max(0, measuredMs));
    if (!uri || durationMs < MIN_CLIP_MS) {
      // A stray tap: gone without a word, ready to try again.
      dropCacheFile(uri);
      setPhase('ready');
      return;
    }
    setPhase('saving');
    let result;
    try {
      result = await saveClip({
        userId,
        workoutId,
        exerciseId,
        exerciseName,
        setNumber,
        cacheUri: uri,
        durationMs,
        // expo-camera resolves only a uri. The real size is read by the export
        // engine's probe, so none is claimed here.
        width: null,
        height: null,
        // A video made from the share screen belongs to the workout as a whole,
        // like one made on the summary.
        source: source === 'workout' ? 'workout' : 'summary',
      });
    } catch (e) {
      logError('ClipCamera.save', e, { workoutId });
      result = { ok: false, reason: 'write_failed' };
    }
    if (!aliveRef.current) {
      // Left while saving: honour the discard.
      if (result.ok) deleteClip(result.clip.id).catch((e) => { logError('ClipCamera.lateDiscard', e); });
      else dropCacheFile(uri);
      return;
    }
    if (result.ok) {
      afterSave(result.clip);
      return;
    }
    dropCacheFile(uri);
    if (result.reason === 'full') {
      showFull();
      return;
    }
    setPhase('ready');
    toast.show(CLIP_STRINGS.saveFailed, { variant: 'error' });
  }, [
    clearTimers, dropCacheFile, setPhase, userId, workoutId, exerciseId, exerciseName,
    setNumber, source, afterSave, showFull, toast,
  ]);

  // Ask the recorder to stop. Asked again a moment later, twice, while it is
  // still running: a stop that arrives before CameraX has begun is ignored.
  const stopRecording = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    stopFeltRef.current = true;
    haptics.selection();
    const ask = () => {
      try {
        recordingCameraRef.current?.stopRecording?.();
      } catch (e) {
        logError('ClipCamera.stop', e);
      }
    };
    ask();
    stopRetryTimers.current.forEach((id) => clearTimeout(id));
    stopRetryTimers.current = STOP_RETRY_MS.map((ms) => setTimeout(() => {
      if (phaseRef.current === 'recording') ask();
    }, ms));
  }, []);

  const startRecording = useCallback(async (mode) => {
    const camera = cameraRef.current;
    if (!camera?.recordAsync) {
      setPhase('ready');
      return;
    }
    // A tap records for the chosen length; a hold for as long as it is held,
    // up to the 15 second cap.
    const limitMs = mode === 'hold' ? MAX_CLIP_MS : lengthRef.current * 1000;
    discardRef.current = false;
    stopFeltRef.current = false;
    modeRef.current = mode;
    limitMsRef.current = limitMs;
    recordingCameraRef.current = camera;
    startedAtRef.current = Date.now();
    setRecording({ startedAtMs: startedAtRef.current, limitMs });
    setPhase('recording');
    haptics.commit();
    // The recorder's own maxDuration ends the video too; this is the screen's
    // own hand on the same limit, so the length holds even if that is late.
    autoStopTimer.current = setTimeout(stopRecording, limitMs);
    let result = null;
    try {
      result = await camera.recordAsync({ maxDuration: limitMs / 1000, codec: 'avc1' });
    } catch (e) {
      logError('ClipCamera.record', e, { workoutId });
    }
    recordingCameraRef.current = null;
    await finishRecording(result?.uri ?? null, Date.now() - startedAtRef.current);
  }, [setPhase, stopRecording, finishRecording, workoutId]);

  const beginCountdown = useCallback(() => {
    let n = leadInRef.current;
    setPhase('countdown');
    setCountdownN(n);
    haptics.clipCountdown();
    countdownTimer.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        startRecording('tap');
        return;
      }
      setCountdownN(n);
      haptics.clipCountdown();
    }, COUNTDOWN_TICK_MS);
  }, [setPhase, startRecording]);

  // Is there room for another video? Read fresh: the number on screen may be old.
  const hasRoom = useCallback(async () => {
    let held = 0;
    try {
      held = await countClipsForWorkout(userId, workoutId);
    } catch (e) {
      logError('ClipCamera.count', e, { workoutId });
    }
    return !isFull(held);
  }, [userId, workoutId]);

  // A TAP: while idle, the countdown; while recording, stop early.
  const handleRecordTap = useCallback(async () => {
    if (phaseRef.current === 'recording') { stopRecording(); return; }
    if (phaseRef.current !== 'ready' || !ready) return;
    // Held back at once so a double tap cannot start two countdowns.
    setPhase('starting');
    const room = await hasRoom();
    if (!aliveRef.current || phaseRef.current !== 'starting') return;
    if (!room) { showFull(); return; }
    beginCountdown();
  }, [ready, setPhase, stopRecording, hasRoom, showFull, beginCountdown]);

  // A HOLD: records at once, no countdown, for as long as the press lasts.
  const handleHoldStart = useCallback(async () => {
    if (phaseRef.current !== 'ready' || !ready) return;
    holdActiveRef.current = true;
    setPhase('starting');
    const room = await hasRoom();
    if (!aliveRef.current || phaseRef.current !== 'starting') return;
    if (!holdActiveRef.current) { setPhase('ready'); return; } // let go while checking
    if (!room) { holdActiveRef.current = false; showFull(); return; }
    startRecording('hold');
  }, [ready, setPhase, hasRoom, showFull, startRecording]);

  // Letting go ends a hold. (A tap's release does nothing here.)
  const handleRelease = useCallback(() => {
    if (!holdActiveRef.current) return;
    holdActiveRef.current = false;
    if (modeRef.current === 'hold' && phaseRef.current === 'recording') stopRecording();
  }, [stopRecording]);

  const handleClose = useCallback(() => {
    if (phaseRef.current === 'saving') return;
    holdActiveRef.current = false;
    clearTimers();
    if (phaseRef.current === 'recording') {
      discardRef.current = true;
      try { recordingCameraRef.current?.stopRecording?.(); } catch (e) { logError('ClipCamera.closeStop', e); }
    } else if (phaseRef.current === 'starting' || phaseRef.current === 'countdown') {
      // Closed while the workout was still being checked, or mid-countdown:
      // nothing may start once the check comes back.
      setPhase('ready');
    }
    closedRef.current = true;
    navigation.goBack();
  }, [clearTimers, navigation, setPhase]);

  const handleFlip = useCallback(() => {
    if (phaseRef.current === 'recording' || phaseRef.current === 'saving') return;
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, []);

  const handleLeadIn = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const next = nextLeadIn(leadInRef.current);
    leadInRef.current = next;
    setLeadIn(next);
    AsyncStorage.setItem(LEAD_IN_KEY, String(next)).catch((e) => {
      logError('ClipCamera.leadInWrite', e);
    });
  }, []);

  const handleLength = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const next = nextLength(lengthRef.current);
    lengthRef.current = next;
    setLengthSec(next);
    AsyncStorage.setItem(LENGTH_KEY, String(next)).catch((e) => {
      logError('ClipCamera.lengthWrite', e);
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const isRecording = phase === 'recording';
  const idle = phase === 'ready';
  const counting = phase === 'countdown';
  // The record control stays pressable while a hold is being checked, so the
  // release of a hold is never lost; only the countdown and the save grey it.
  const recordDisabled = !ready || counting || phase === 'saving';
  const greyed = !ready || counting || phase === 'saving';
  const ink = greyed ? CAM.textSecondary : CAM.textPrimary;
  const innerColour = greyed ? CAM.textSecondary : CAM.primaryFill;
  const topOffset = insets.top + spacing.xs;

  return (
    <View style={styles.root}>
      {ready && CameraView ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          mode="video"
          mute
          videoQuality="1080p"
        />
      ) : null}

      {isRecording ? (
        <RecordingProgress
          startedAtMs={recording.startedAtMs}
          limitMs={recording.limitMs}
          reduceMotion={!!reduceMotion}
          topOffset={topOffset}
          clockStyle={live.clock}
        />
      ) : null}

      <View style={[styles.topBar, { top: topOffset }]}>
        <Pressable
          onPress={handleClose}
          style={styles.glyph}
          accessibilityRole="button"
          accessibilityLabel={CLIP_STRINGS.closeA11y}
          testID="clip-camera-close"
        >
          <Ionicons name="close" size={iconSize.lg} color={CAM.textPrimary} style={styles.shadow} />
        </Pressable>
        <View style={styles.topSpacer} />
        <Pressable
          onPress={handleFlip}
          disabled={isRecording || phase === 'saving'}
          style={[styles.glyph, (isRecording || phase === 'saving') && styles.dimmed]}
          accessibilityRole="button"
          accessibilityLabel={CLIP_STRINGS.flipA11y}
          accessibilityState={{ disabled: isRecording || phase === 'saving' }}
          testID="clip-camera-flip"
        >
          <Ionicons name="camera-reverse-outline" size={iconSize.lg} color={CAM.textPrimary} style={styles.shadow} />
        </Pressable>
      </View>

      {counting && countdownN > 0 ? (
        <View style={styles.countdownWrap} pointerEvents="none">
          <Text
            style={[styles.countdown, live.countdown]}
            maxFontSizeMultiplier={fontScaleCaps.numeral}
            accessibilityLiveRegion="polite"
            testID="clip-camera-countdown"
          >
            {countdownN}
          </Text>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { bottom: insets.bottom + spacing.lg }]}>
        <View style={styles.controlsRow}>
          <View style={[styles.slot, styles.slotStart]}>
            <ValueControl
              caption={CLIP_STRINGS.countdownCaption}
              value={leadInLabel(leadIn)}
              onPress={handleLeadIn}
              disabled={!idle}
              accessibilityLabel={leadInA11yLabel(leadIn)}
              testID="clip-camera-leadin"
              captionStyle={live.caption}
              valueStyle={live.value}
            />
          </View>
          <Pressable
            onPress={handleRecordTap}
            onLongPress={handleHoldStart}
            delayLongPress={HOLD_DELAY_MS}
            onPressOut={handleRelease}
            disabled={recordDisabled}
            style={[styles.recordRing, { borderColor: ink }]}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? CLIP_STRINGS.stopA11y : startA11yLabel(leadIn)}
            accessibilityState={{ disabled: recordDisabled }}
            testID="clip-camera-record"
          >
            <View style={isRecording ? [styles.stopSquare, { backgroundColor: innerColour }] : [styles.recordDot, { backgroundColor: innerColour }]} />
          </Pressable>
          <View style={[styles.slot, styles.slotEnd]}>
            <ValueControl
              caption={CLIP_STRINGS.lengthCaption}
              value={lengthLabel(lengthSec)}
              onPress={handleLength}
              disabled={!idle}
              accessibilityLabel={lengthA11yLabel(lengthSec)}
              testID="clip-camera-length"
              captionStyle={live.caption}
              valueStyle={live.value}
            />
          </View>
        </View>
        <Text
          style={[styles.hint, live.hint]}
          maxFontSizeMultiplier={fontScaleCaps.chrome}
          testID="clip-camera-hint"
        >
          {CLIP_STRINGS.recordHint}
        </Text>
      </View>

      {/* Opens INSTEAD of recording when the workout already holds three
          videos; the person deletes one and can then record. */}
      <ClipsSheet
        visible={clipsOpen}
        onClose={() => setClipsOpen(false)}
        userId={userId}
        workoutId={workoutId}
        notice={CLIP_STRINGS.full}
      />
    </View>
  );
}

const GLYPH = touchTarget.minimum;
const RECORD = 72;
const SHADOW = {
  textShadowColor: withAlpha(CAM.camera, alpha.half),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAM.camera },
  topBar: {
    position: 'absolute',
    left: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topSpacer: { flex: 1 },
  glyph: { width: GLYPH, height: GLYPH, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.4 },
  shadow: SHADOW,
  countdownWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    color: CAM.textPrimary,
    textAlign: 'center',
    textShadowColor: withAlpha(CAM.camera, alpha.half),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlsRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: { flex: 1 },
  slotStart: { alignItems: 'flex-end', paddingRight: spacing.lg },
  slotEnd: { alignItems: 'flex-start', paddingLeft: spacing.lg },
  recordRing: {
    width: RECORD,
    height: RECORD,
    borderRadius: circle(RECORD),
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDot: { width: RECORD - 20, height: RECORD - 20, borderRadius: circle(RECORD - 20) },
  stopSquare: { width: 24, height: 24, borderRadius: radius.sm },
  valueControl: { minWidth: GLYPH, minHeight: GLYPH, alignItems: 'center', justifyContent: 'center' },
  hint: { ...SHADOW, color: CAM.textPrimary, textAlign: 'center', paddingHorizontal: spacing.lg },
});

// The type follows the live scale (Larger text); the colours are the
// viewfinder's fixed ink, so only the type roles are mirrored here.
function buildLiveStyles(t) {
  return {
    clock: { ...t.type.num('label') },
    countdown: { ...t.type.num('hero') },
    caption: { ...t.type.caption, color: CAM.textSecondary, ...SHADOW },
    value: { ...t.type.label, color: CAM.textPrimary, ...SHADOW },
    hint: { ...t.type.label },
  };
}
